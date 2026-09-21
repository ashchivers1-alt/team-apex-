"use client";

import { useMemo, useState } from "react";
import type { FullClient } from "@/types/models";
import { ACTIVITY_MULTIPLIERS, suggestActivityCategory, calculateRestingEnergy } from "@/lib/calculations/energy";
import { buildMaintenanceView } from "@/lib/clientCalculations";
import { computeDeficit, oneLbPerWeekScenario, DeficitTargetMode } from "@/lib/calculations/deficit";
import { DEFICIT_TARGET_MODE_VALUES, DEFICIT_TARGET_MODE_LABELS, DeficitTargetModeValue } from "@/lib/enums";
import { round } from "@/lib/calculations/units";

function FlagList({ flags }: { flags: { level: "warning" | "critical"; message: string }[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="space-y-2">
      {flags.map((f, i) => (
        <div key={i} className={f.level === "critical" ? "badge-critical block px-3 py-2" : "badge-warning block px-3 py-2"}>
          {f.message}
        </div>
      ))}
    </div>
  );
}

export default function MaintenanceTab({ client, onChanged }: { client: FullClient; onChanged: () => void }) {
  const latestMaintenance = client.maintenancePlans[0] ?? null;
  const latestDiet = client.dietPlans[0] ?? null;

  const maintenanceView = latestMaintenance ? buildMaintenanceView(client, latestMaintenance) : null;

  // --- Maintenance editor state ---
  const suggestedCategory = suggestActivityCategory({
    avgDailySteps: client.avgDailySteps,
    resistanceFreqPerWk: client.resistanceFreqPerWk,
    cardioFreqPerWk: client.cardioFreqPerWk
  });
  const [method, setMethod] = useState<"MIFFLIN_ST_JEOR" | "LEAN_MASS_KATCH_MCARDLE">(
    (latestMaintenance?.method as "MIFFLIN_ST_JEOR" | "LEAN_MASS_KATCH_MCARDLE") ?? "MIFFLIN_ST_JEOR"
  );
  const [category, setCategory] = useState<keyof typeof ACTIVITY_MULTIPLIERS>(
    (Object.keys(ACTIVITY_MULTIPLIERS) as (keyof typeof ACTIVITY_MULTIPLIERS)[]).find(
      (k) => ACTIVITY_MULTIPLIERS[k].multiplier === latestMaintenance?.activityMultiplier
    ) ?? suggestedCategory
  );
  const [customMultiplier, setCustomMultiplier] = useState<number>(
    latestMaintenance?.activityMultiplier ?? ACTIVITY_MULTIPLIERS[suggestedCategory].multiplier
  );
  const [useCustomMultiplier, setUseCustomMultiplier] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  const activityMultiplier = useCustomMultiplier ? customMultiplier : ACTIVITY_MULTIPLIERS[category].multiplier;

  const previewResting = useMemo(() => {
    if (method === "LEAN_MASS_KATCH_MCARDLE" && client.bodyFatPercent == null) return null;
    return calculateRestingEnergy(method, {
      sex: client.sex as "MALE" | "FEMALE",
      weightKg: client.currentWeightKg,
      heightCm: client.heightCm,
      age: client.age,
      bodyFatPercent: client.bodyFatPercent
    });
  }, [method, client]);

  const previewTdeeKcal = previewResting
    ? previewResting.restingKcal * activityMultiplier
    : maintenanceView?.equationTdeeKcal ?? 0;

  async function saveMaintenancePlan() {
    setSavingMaintenance(true);
    await fetch(`/api/clients/${client.id}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        activityMultiplier,
        multiplierLabel: useCustomMultiplier
          ? `Custom (${activityMultiplier}x)`
          : `${ACTIVITY_MULTIPLIERS[category].label} (${activityMultiplier}x)`,
        changeType: "COACH_ADJUSTMENT",
        notes: "Updated method/activity multiplier."
      })
    });
    setSavingMaintenance(false);
    onChanged();
  }

  // --- Override state ---
  const [overrideKcal, setOverrideKcal] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideDate, setOverrideDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingOverride, setSavingOverride] = useState(false);

  async function saveOverride() {
    if (!overrideKcal || !overrideReason) return;
    setSavingOverride(true);
    await fetch(`/api/clients/${client.id}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        activityMultiplier,
        multiplierLabel: latestMaintenance?.multiplierLabel ?? `${category}`,
        overrideKcal: Number(overrideKcal),
        overrideReason,
        overrideDate: new Date(overrideDate).toISOString(),
        changeType: "COACH_ADJUSTMENT",
        notes: "Coach override entered."
      })
    });
    setSavingOverride(false);
    setOverrideKcal("");
    setOverrideReason("");
    onChanged();
  }

  // --- Diet plan editor state ---
  const [targetMode, setTargetMode] = useState<DeficitTargetModeValue>("ONE_LB_PER_WEEK_SCENARIO");
  const [targetValue, setTargetValue] = useState<string>("");
  const [dietReason, setDietReason] = useState("");
  const [savingDiet, setSavingDiet] = useState(false);

  const selectedMaintenanceKcal = maintenanceView?.selectedMaintenanceKcal ?? previewTdeeKcal;
  const restingKcal = maintenanceView?.restingKcal ?? previewResting?.restingKcal;

  const oneLbScenario = useMemo(
    () => oneLbPerWeekScenario(selectedMaintenanceKcal, client.currentWeightKg, restingKcal),
    [selectedMaintenanceKcal, client.currentWeightKg, restingKcal]
  );

  const customPreview = useMemo(() => {
    if (targetMode === "ONE_LB_PER_WEEK_SCENARIO") return oneLbScenario;
    return computeDeficit(
      targetMode as DeficitTargetMode,
      targetValue === "" ? null : Number(targetValue),
      selectedMaintenanceKcal,
      client.currentWeightKg,
      restingKcal
    );
  }, [targetMode, targetValue, selectedMaintenanceKcal, client.currentWeightKg, restingKcal, oneLbScenario]);

  async function saveDietPlan() {
    setSavingDiet(true);
    await fetch(`/api/clients/${client.id}/diet-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetMode,
        targetValue: targetMode === "ONE_LB_PER_WEEK_SCENARIO" || targetMode === "MAINTENANCE_NO_DEFICIT" ? null : Number(targetValue),
        changeType: "COACH_ADJUSTMENT",
        reason: dietReason || "Diet target set by coach."
      })
    });
    setSavingDiet(false);
    setDietReason("");
    onChanged();
  }

  if (!maintenanceView) {
    return <p className="text-ink-400">No maintenance plan yet.</p>;
  }

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <div>
          <h2 className="section-title">Maintenance / TDEE</h2>
          <p className="text-sm text-ink-500">
            "Maintenance" and "TDEE" describe the same estimated daily energy requirement — the calories needed
            to keep bodyweight stable at current activity levels. This is a <strong>starting estimate</strong>,
            not a measurement — refine it later using logged data (see Recalibration tab).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="label">Resting-energy equation</label>
              <select
                className="input"
                value={method}
                onChange={(e) => setMethod(e.target.value as "MIFFLIN_ST_JEOR" | "LEAN_MASS_KATCH_MCARDLE")}
              >
                <option value="MIFFLIN_ST_JEOR">Mifflin–St Jeor (default)</option>
                <option value="LEAN_MASS_KATCH_MCARDLE" disabled={client.bodyFatPercent == null}>
                  Katch–McArdle (lean-mass based){client.bodyFatPercent == null ? " — requires body-fat %" : ""}
                </option>
              </select>
            </div>

            <div>
              <label className="label">Activity multiplier</label>
              <select
                className="input"
                disabled={useCustomMultiplier}
                value={category}
                onChange={(e) => setCategory(e.target.value as keyof typeof ACTIVITY_MULTIPLIERS)}
              >
                {Object.entries(ACTIVITY_MULTIPLIERS).map(([key, m]) => (
                  <option key={key} value={key}>
                    {m.label} ({m.multiplier}x)
                  </option>
                ))}
              </select>
              <p className="field-hint">{ACTIVITY_MULTIPLIERS[category].description}</p>
              {suggestedCategory === category && !useCustomMultiplier && (
                <p className="field-hint text-apex-600">Suggested from steps/training frequency on the profile.</p>
              )}
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                <input
                  type="checkbox"
                  checked={useCustomMultiplier}
                  onChange={(e) => setUseCustomMultiplier(e.target.checked)}
                />
                Use a custom multiplier instead
              </label>
              {useCustomMultiplier && (
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  max={2.2}
                  className="input mt-1"
                  value={customMultiplier}
                  onChange={(e) => setCustomMultiplier(Number(e.target.value))}
                />
              )}
              <p className="field-hint">
                This multiplier already accounts for structured exercise — don't add separate exercise calories
                on top of it.
              </p>
            </div>

            <button className="btn-primary" disabled={savingMaintenance} onClick={saveMaintenancePlan}>
              {savingMaintenance ? "Saving..." : "Save method / multiplier"}
            </button>
          </div>

          <div className="space-y-2 rounded-lg bg-ink-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Estimated resting expenditure</span>
              <span className="font-semibold">{Math.round(previewResting ? previewResting.restingKcal : maintenanceView.restingKcal)} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Estimated daily maintenance (TDEE)</span>
              <span className="font-semibold">{Math.round(previewTdeeKcal)} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Estimated weekly maintenance</span>
              <span className="font-semibold">{Math.round(previewTdeeKcal * 7)} kcal</span>
            </div>
            <hr className="border-ink-200" />
            <div className="text-xs text-ink-500">
              Method: {previewResting?.equationLabel}. Assumptions:
              <ul className="mt-1 list-disc pl-4">
                {previewResting?.assumptions.map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-ink-100 p-4">
          <h3 className="mb-2 text-sm font-semibold text-ink-800">Currently selected maintenance</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-2xl font-bold text-apex-700">
                {Math.round(maintenanceView.selectedMaintenanceKcal)} kcal/day
              </div>
              <div className="text-sm text-ink-500">
                {Math.round(maintenanceView.weeklySelectedMaintenanceKcal)} kcal/week
              </div>
              {maintenanceView.overrideActive ? (
                <p className="mt-1 text-xs text-ink-500">
                  Coach override — equation estimate is {Math.round(maintenanceView.equationTdeeKcal)} kcal/day.
                  Reason: {maintenanceView.overrideReason || "—"}.{" "}
                  {maintenanceView.overrideDate &&
                    `Set ${new Date(maintenanceView.overrideDate).toLocaleDateString("en-GB")}.`}
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink-500">Using the equation estimate directly (no override).</p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <label className="label">Enter coach override</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input"
                  placeholder="kcal/day"
                  value={overrideKcal}
                  onChange={(e) => setOverrideKcal(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                />
              </div>
              <input
                className="input"
                placeholder="Reason (required)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
              <button
                className="btn-secondary"
                disabled={savingOverride || !overrideKcal || !overrideReason}
                onClick={saveOverride}
              >
                {savingOverride ? "Saving..." : "Save override"}
              </button>
              <p className="field-hint">The original equation estimate is always preserved and shown alongside any override.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <h2 className="section-title">Diet starting calories</h2>
          <p className="text-sm text-ink-500">
            An energy-equivalent planning estimate, not a guarantee of exact fat loss — the scale also reflects
            water, glycogen and gut contents.
          </p>
        </div>

        <div className="rounded-lg bg-ink-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-ink-800">Standard scenario: 1 lb/week</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-ink-500">Weekly deficit</div>
              <div className="font-semibold">{Math.round(oneLbScenario.weeklyDeficitKcal)} kcal</div>
            </div>
            <div>
              <div className="text-ink-500">Daily deficit</div>
              <div className="font-semibold">{Math.round(oneLbScenario.dailyDeficitKcal)} kcal</div>
            </div>
            <div>
              <div className="text-ink-500">Daily starting intake</div>
              <div className="font-semibold">{Math.round(oneLbScenario.dailyTargetKcal)} kcal</div>
            </div>
            <div>
              <div className="text-ink-500">Weekly diet intake</div>
              <div className="font-semibold">{Math.round(oneLbScenario.weeklyTargetKcal)} kcal</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="label">Target mode</label>
            <select className="input" value={targetMode} onChange={(e) => setTargetMode(e.target.value as DeficitTargetModeValue)}>
              {DEFICIT_TARGET_MODE_VALUES.map((m) => (
                <option key={m} value={m}>
                  {DEFICIT_TARGET_MODE_LABELS[m]}
                </option>
              ))}
            </select>
            {targetMode !== "ONE_LB_PER_WEEK_SCENARIO" && targetMode !== "MAINTENANCE_NO_DEFICIT" && (
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="Value"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            )}
            <input
              className="input"
              placeholder="Reason for this plan (recorded in history)"
              value={dietReason}
              onChange={(e) => setDietReason(e.target.value)}
            />
            <button className="btn-primary" disabled={savingDiet} onClick={saveDietPlan}>
              {savingDiet ? "Saving..." : "Save as current diet plan"}
            </button>
          </div>

          <div className="space-y-2 rounded-lg border border-ink-100 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Daily deficit</span>
              <span className="font-semibold">{Math.round(customPreview.dailyDeficitKcal)} kcal ({round(customPreview.deficitPercentOfTdee, 1)}% of TDEE)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Daily target intake</span>
              <span className="font-semibold">{Math.round(customPreview.dailyTargetKcal)} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Weekly target intake</span>
              <span className="font-semibold">{Math.round(customPreview.weeklyTargetKcal)} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Target weekly change</span>
              <span className="font-semibold">
                {customPreview.weeklyChangeKg >= 0 ? "-" : "+"}
                {Math.abs(round(customPreview.weeklyChangeKg, 2))} kg ({round(Math.abs(customPreview.weeklyLossPercentBodyweight), 2)}% of bodyweight)
              </span>
            </div>
            <FlagList flags={customPreview.flags} />
          </div>
        </div>

        {latestDiet && (
          <div className="rounded-lg bg-apex-50 p-4 text-sm">
            <strong>Current active diet plan:</strong> {Math.round(latestDiet.dailyTargetKcal)} kcal/day,{" "}
            {Math.round(latestDiet.weeklyTargetKcal)} kcal/week. Set {new Date(latestDiet.createdAt).toLocaleDateString("en-GB")}.{" "}
            {latestDiet.reason && <>Reason: {latestDiet.reason}</>}
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="section-title mb-3">Plan history (maintenance)</h3>
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Multiplier</th>
              <th>Calculated TDEE</th>
              <th>Override</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {client.maintenancePlans.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.createdAt).toLocaleDateString("en-GB")}</td>
                <td>{p.method === "MIFFLIN_ST_JEOR" ? "Mifflin-St Jeor" : "Katch-McArdle"}</td>
                <td>{p.activityMultiplier}x</td>
                <td>{Math.round(p.calculatedTdeeKcal)} kcal</td>
                <td>{p.overrideKcal ? `${Math.round(p.overrideKcal)} kcal — ${p.overrideReason}` : "—"}</td>
                <td>{p.changeType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h3 className="section-title mb-3">Plan history (diet target)</h3>
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mode</th>
              <th>Daily target</th>
              <th>Weekly target</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {client.dietPlans.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.createdAt).toLocaleDateString("en-GB")}</td>
                <td>{DEFICIT_TARGET_MODE_LABELS[p.targetMode as DeficitTargetModeValue] ?? p.targetMode}</td>
                <td>{Math.round(p.dailyTargetKcal)} kcal</td>
                <td>{Math.round(p.weeklyTargetKcal)} kcal</td>
                <td>{p.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
