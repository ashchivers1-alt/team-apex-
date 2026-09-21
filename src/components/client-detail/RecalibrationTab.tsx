"use client";

import { useMemo, useState } from "react";
import type { FullClient } from "@/types/models";
import { calculateObservedTdee } from "@/lib/calculations/recalibration";
import { trendSlope } from "@/lib/calculations/trends";
import { buildDecisionSupport, previewAdjustment } from "@/lib/calculations/decisionSupport";
import { buildMaintenanceView, activeDietPlanForDate } from "@/lib/clientCalculations";
import { round } from "@/lib/calculations/units";

function daysAgo(n: number, from: Date): Date {
  return new Date(from.getTime() - n * 86_400_000);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function classifyTrend(first: number | null, second: number | null): "rising" | "stable" | "falling" | "unknown" {
  if (first == null || second == null) return "unknown";
  const diff = second - first;
  if (Math.abs(diff) < 0.3) return "stable";
  return diff > 0 ? "rising" : "falling";
}

export default function RecalibrationTab({ client, onChanged }: { client: FullClient; onChanged: () => void }) {
  const [periodDays, setPeriodDays] = useState(21);
  const latestMaintenance = client.maintenancePlans[0];
  const latestDiet = client.dietPlans[0];
  const maintenanceView = latestMaintenance ? buildMaintenanceView(client, latestMaintenance) : null;

  const today = client.checkIns.length > 0
    ? new Date(Math.max(...client.checkIns.map((c) => new Date(c.date).getTime())))
    : new Date();
  const periodStart = daysAgo(periodDays - 1, today);

  const checkInsInPeriod = client.checkIns.filter((c) => {
    const t = new Date(c.date).getTime();
    return t >= periodStart.getTime() && t <= today.getTime();
  });

  const intakeEntries = checkInsInPeriod
    .filter((c) => c.actualCalorieIntake != null)
    .map((c) => ({ date: new Date(c.date), value: c.actualCalorieIntake as number }));
  const weightEntries = checkInsInPeriod
    .filter((c) => c.weightKg != null)
    .map((c) => ({ date: new Date(c.date), value: c.weightKg as number }));
  const menstrualDates = checkInsInPeriod.filter((c) => c.menstrualCycleNotes).map((c) => new Date(c.date));

  const recalibration = useMemo(
    () =>
      calculateObservedTdee({
        periodStart,
        periodEnd: today,
        intakeEntries,
        weightEntries,
        menstrualNoteDates: menstrualDates
      }),
    [periodStart, today, intakeEntries, weightEntries, menstrualDates]
  );

  // --- Decision support inputs ---
  const weightTrend = trendSlope(weightEntries);
  const plannedWeeklyChangeKg = latestDiet ? -((latestDiet.dailyDeficitKcal * 7) / 7700) : 0;
  const observedWeeklyChangeKg = weightTrend.slopePerDay != null ? weightTrend.slopePerDay * 7 : null;

  const adherenceValues = checkInsInPeriod
    .filter((c) => c.adherencePercent != null)
    .map((c) => c.adherencePercent as number);
  const adherencePercentAvg = average(adherenceValues);

  const intakeVsPrescribed = checkInsInPeriod
    .filter((c) => c.actualCalorieIntake != null)
    .map((c) => {
      const prescribed = activeDietPlanForDate(client, new Date(c.date))?.dailyTargetKcal;
      return prescribed ? ((c.actualCalorieIntake as number) / prescribed) * 100 : null;
    })
    .filter((v): v is number => v != null);
  const avgIntakeVsPrescribedPercent = average(intakeVsPrescribed);

  const stepsThisPeriod = average(checkInsInPeriod.filter((c) => c.steps != null).map((c) => c.steps as number));
  const previousPeriodCheckIns = client.checkIns.filter((c) => {
    const t = new Date(c.date).getTime();
    return t >= daysAgo(periodDays * 2 - 1, today).getTime() && t < periodStart.getTime();
  });
  const stepsPreviousPeriod = average(
    previousPeriodCheckIns.filter((c) => c.steps != null).map((c) => c.steps as number)
  );
  const stepsChangePercent =
    stepsThisPeriod != null && stepsPreviousPeriod != null && stepsPreviousPeriod > 0
      ? ((stepsThisPeriod - stepsPreviousPeriod) / stepsPreviousPeriod) * 100
      : null;

  const midpoint = new Date((periodStart.getTime() + today.getTime()) / 2);
  const firstHalf = checkInsInPeriod.filter((c) => new Date(c.date).getTime() < midpoint.getTime());
  const secondHalf = checkInsInPeriod.filter((c) => new Date(c.date).getTime() >= midpoint.getTime());
  const hungerTrend = classifyTrend(
    average(firstHalf.filter((c) => c.hunger != null).map((c) => c.hunger as number)),
    average(secondHalf.filter((c) => c.hunger != null).map((c) => c.hunger as number))
  );
  const energyTrend = classifyTrend(
    average(firstHalf.filter((c) => c.energy != null).map((c) => c.energy as number)),
    average(secondHalf.filter((c) => c.energy != null).map((c) => c.energy as number))
  );
  const recoveryTrend = classifyTrend(
    average(firstHalf.filter((c) => c.recovery != null).map((c) => c.recovery as number)),
    average(secondHalf.filter((c) => c.recovery != null).map((c) => c.recovery as number))
  );

  const decisionSupport = buildDecisionSupport({
    plannedWeeklyChangeKg,
    observedWeeklyChangeKg,
    trendIsReliable: weightTrend.warning == null,
    trendWarning: weightTrend.warning,
    adherencePercentAvg,
    avgIntakeVsPrescribedPercent,
    stepsChangePercent,
    hungerTrend,
    energyTrend,
    recoveryTrend,
    daysOfDataInPeriod: checkInsInPeriod.length
  });

  // --- Adjustment preview + approval ---
  const [deltaKcal, setDeltaKcal] = useState("");
  const [reason, setReason] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  const currentDailyKcal = latestDiet?.dailyTargetKcal ?? 0;
  const maintenanceKcal = maintenanceView?.selectedMaintenanceKcal ?? 0;
  const preview =
    deltaKcal !== ""
      ? previewAdjustment(currentDailyKcal, Number(deltaKcal), maintenanceKcal)
      : null;

  async function approveAdjustment() {
    if (!preview || !reason) return;
    setSavingAdjustment(true);
    const newDailyDeficit = maintenanceKcal - preview.proposedDailyKcal;
    await fetch(`/api/clients/${client.id}/diet-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetMode: "FIXED_DAILY_DEFICIT",
        targetValue: newDailyDeficit,
        changeType: "COACH_ADJUSTMENT",
        reason
      })
    });
    setSavingAdjustment(false);
    setDeltaKcal("");
    setReason("");
    onChanged();
  }

  async function applyRecalibrationAsOverride() {
    if (!latestMaintenance || recalibration.observedTdeeKcal == null) return;
    if (
      !confirm(
        `Set the coach override to ${Math.round(
          recalibration.observedTdeeKcal
        )} kcal/day based on this recalibration? The equation estimate will still be preserved and shown alongside it.`
      )
    )
      return;
    await fetch(`/api/clients/${client.id}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: latestMaintenance.method,
        activityMultiplier: latestMaintenance.activityMultiplier,
        multiplierLabel: latestMaintenance.multiplierLabel,
        overrideKcal: Math.round(recalibration.observedTdeeKcal),
        overrideReason: `Recalibrated from ${recalibration.intakeDaysLogged} days of logged intake and the weight trend over ${recalibration.periodDays} days.`,
        overrideDate: new Date().toISOString(),
        changeType: "RECALIBRATION",
        notes: "Coach reviewed the observed-data estimate before applying."
      })
    });
    onChanged();
  }

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Recalibrate maintenance from real data</h2>
            <p className="text-sm text-ink-500">
              Observed TDEE ≈ average daily intake − (weight-trend slope × 7,700 kcal/kg). Approximate and
              retrospective — never a direct measurement, and never applied automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-ink-500">Period (days)</label>
            <input
              type="number"
              className="input w-20"
              min={7}
              max={60}
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-ink-50 p-4 text-sm">
            <div className="text-ink-500">Equation estimate (current)</div>
            <div className="text-xl font-bold">
              {maintenanceView ? Math.round(maintenanceView.selectedMaintenanceKcal) : "—"} kcal/day
            </div>
          </div>
          <div className="rounded-lg bg-apex-50 p-4 text-sm">
            <div className="text-ink-500">Observed-data estimate</div>
            <div className="text-xl font-bold">
              {recalibration.observedTdeeKcal != null ? `${Math.round(recalibration.observedTdeeKcal)} kcal/day` : "Not enough data"}
            </div>
            {recalibration.observedTdeeKcal != null && (
              <button className="btn-secondary mt-2 text-xs" onClick={applyRecalibrationAsOverride}>
                Review &amp; apply as maintenance override
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-ink-600 sm:grid-cols-4">
          <div>
            <div className="text-ink-400">Period</div>
            {periodStart.toLocaleDateString("en-GB")} – {today.toLocaleDateString("en-GB")}
          </div>
          <div>
            <div className="text-ink-400">Intake days logged</div>
            {recalibration.intakeDaysLogged}/{recalibration.periodDays} ({Math.round(recalibration.intakeCoverage * 100)}%)
          </div>
          <div>
            <div className="text-ink-400">Weight days logged</div>
            {recalibration.weightDaysLogged}
          </div>
          <div>
            <div className="text-ink-400">Data adequate?</div>
            {recalibration.isReliable ? "Yes" : "No — treat as indicative only"}
          </div>
        </div>

        {recalibration.warnings.length > 0 && (
          <div className="space-y-1">
            {recalibration.warnings.map((w, i) => (
              <div key={i} className="badge-warning block px-3 py-2 text-xs">
                {w}
              </div>
            ))}
          </div>
        )}

        <details className="text-xs text-ink-500">
          <summary className="cursor-pointer font-medium">Method &amp; assumptions</summary>
          <p className="mt-1">{recalibration.method}</p>
          <ul className="mt-1 list-disc pl-4">
            {recalibration.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Check-in summary &amp; coaching suggestions</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-ink-500">Planned weekly change</div>
            <div className="font-semibold">{round(plannedWeeklyChangeKg, 2)} kg</div>
          </div>
          <div>
            <div className="text-ink-500">Observed weekly change</div>
            <div className="font-semibold">{observedWeeklyChangeKg != null ? round(observedWeeklyChangeKg, 2) : "—"} kg</div>
          </div>
          <div>
            <div className="text-ink-500">Adherence (avg)</div>
            <div className="font-semibold">{adherencePercentAvg != null ? `${Math.round(adherencePercentAvg)}%` : "—"}</div>
          </div>
          <div>
            <div className="text-ink-500">Steps vs. prior period</div>
            <div className="font-semibold">
              {stepsChangePercent != null ? `${stepsChangePercent >= 0 ? "+" : ""}${Math.round(stepsChangePercent)}%` : "—"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-ink-500">Hunger trend</div>
            <div className="font-semibold capitalize">{hungerTrend}</div>
          </div>
          <div>
            <div className="text-ink-500">Energy trend</div>
            <div className="font-semibold capitalize">{energyTrend}</div>
          </div>
          <div>
            <div className="text-ink-500">Recovery trend</div>
            <div className="font-semibold capitalize">{recoveryTrend}</div>
          </div>
        </div>

        <div className="space-y-3">
          {decisionSupport.suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-ink-100 p-3">
              <div className="font-semibold text-apex-700">{s.label}</div>
              <p className="mt-1 text-sm text-ink-600">{s.rationale}</p>
              {s.evidence.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-ink-500">
                  {s.evidence.map((e, j) => (
                    <li key={j}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-400">
          This is decision support, not a diagnosis — it does not detect metabolic damage or medical issues.
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Preview &amp; approve a plan adjustment</h2>
        <p className="text-sm text-ink-500">
          Any change requires an explicit reason and coach approval — nothing here is saved automatically.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="label">Proposed daily calorie change (kcal, +/-)</label>
            <input type="number" className="input" value={deltaKcal} onChange={(e) => setDeltaKcal(e.target.value)} />
            <label className="label">Reason (required)</label>
            <textarea className="input min-h-[70px]" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="btn-primary" disabled={!preview || !reason || savingAdjustment} onClick={approveAdjustment}>
              {savingAdjustment ? "Saving..." : "Approve and save adjustment"}
            </button>
          </div>
          {preview && (
            <div className="space-y-2 rounded-lg bg-ink-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Current daily target</span>
                <span className="font-semibold">{Math.round(preview.currentDailyKcal)} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Proposed daily target</span>
                <span className="font-semibold">{Math.round(preview.proposedDailyKcal)} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Current weekly deficit</span>
                <span className="font-semibold">{Math.round(preview.currentWeeklyDeficitKcal)} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Proposed weekly deficit</span>
                <span className="font-semibold">{Math.round(preview.proposedWeeklyDeficitKcal)} kcal</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
