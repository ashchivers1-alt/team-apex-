"use client";

import { useMemo, useState } from "react";
import type { FullClient } from "@/types/models";
import { calculateMacroPlan, summariseWeeklyPlan, GramsMode } from "@/lib/calculations/macros";
import { GRAMS_MODE_VALUES, WEEKDAY_LABELS } from "@/lib/enums";
import { buildMaintenanceView } from "@/lib/clientCalculations";
import { round } from "@/lib/calculations/units";

interface TemplateFormState {
  name: string;
  calorieKcal: string;
  proteinMode: GramsMode;
  proteinValue: string;
  fatMode: GramsMode;
  fatValue: string;
  carbOverrideG: string;
}

const blankTemplate: TemplateFormState = {
  name: "",
  calorieKcal: "",
  proteinMode: "g_per_kg",
  proteinValue: "2",
  fatMode: "g_per_kg",
  fatValue: "0.8",
  carbOverrideG: ""
};

export default function MacrosTab({ client, onChanged }: { client: FullClient; onChanged: () => void }) {
  const [form, setForm] = useState<TemplateFormState>(blankTemplate);
  const [saving, setSaving] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  const latestMaintenance = client.maintenancePlans[0];
  const maintenanceView = latestMaintenance ? buildMaintenanceView(client, latestMaintenance) : null;
  const latestDiet = client.dietPlans[0];

  const previewCalories = Number(form.calorieKcal || 0);
  const preview = useMemo(
    () =>
      calculateMacroPlan({
        calorieBudgetKcal: previewCalories,
        bodyWeightKg: client.currentWeightKg,
        proteinMode: form.proteinMode,
        proteinValue: Number(form.proteinValue || 0),
        fatMode: form.fatMode,
        fatValue: Number(form.fatValue || 0),
        carbOverrideG: form.carbOverrideG === "" ? null : Number(form.carbOverrideG)
      }),
    [previewCalories, form, client.currentWeightKg]
  );

  async function saveTemplate() {
    setSaving(true);
    await fetch(`/api/clients/${client.id}/macro-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        calorieKcal: Number(form.calorieKcal),
        proteinMode: form.proteinMode,
        proteinValue: Number(form.proteinValue),
        fatMode: form.fatMode,
        fatValue: Number(form.fatValue),
        carbOverrideG: form.carbOverrideG === "" ? null : Number(form.carbOverrideG)
      })
    });
    setSaving(false);
    setForm(blankTemplate);
    onChanged();
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm("Delete this day template? Any weekday assignments using it will need reassigning.")) return;
    await fetch(`/api/clients/${client.id}/macro-templates/${templateId}`, { method: "DELETE" });
    onChanged();
  }

  const [assignments, setAssignments] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    client.weekdayAssignments.forEach((a) => {
      map[a.weekday] = a.templateId;
    });
    return map;
  });

  async function saveAssignments() {
    if (Object.keys(assignments).length < 7) {
      alert("Assign a template to every day of the week first.");
      return;
    }
    setSavingAssignments(true);
    await fetch(`/api/clients/${client.id}/weekday-assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignments: Object.entries(assignments).map(([weekday, templateId]) => ({
          weekday: Number(weekday),
          templateId
        }))
      })
    });
    setSavingAssignments(false);
    onChanged();
  }

  const weeklyDays = WEEKDAY_LABELS.map((label, weekday) => {
    const templateId = assignments[weekday];
    const template = client.macroDayTemplates.find((t) => t.id === templateId);
    return { weekday, label, calorieKcal: template?.calorieKcal ?? 0 };
  });
  const weeklySummary = summariseWeeklyPlan(weeklyDays, maintenanceView?.weeklySelectedMaintenanceKcal ?? 0);

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <h2 className="section-title">Day templates</h2>
        <p className="text-sm text-ink-500">
          Create reusable "types of day" (e.g. Training day, Rest day, Refeed day) with their own calories and
          macros, then assign one to each weekday below.
        </p>

        {client.macroDayTemplates.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {client.macroDayTemplates.map((t) => {
              const macro = calculateMacroPlan({
                calorieBudgetKcal: t.calorieKcal,
                bodyWeightKg: client.currentWeightKg,
                proteinMode: t.proteinMode as GramsMode,
                proteinValue: t.proteinValue,
                fatMode: t.fatMode as GramsMode,
                fatValue: t.fatValue,
                carbOverrideG: t.carbOverrideG
              });
              return (
                <div key={t.id} className="rounded-lg border border-ink-100 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold">{t.name}</span>
                    <button className="text-xs text-red-600 hover:underline" onClick={() => deleteTemplate(t.id)}>
                      Delete
                    </button>
                  </div>
                  <div className="text-ink-500">{Math.round(t.calorieKcal)} kcal</div>
                  <div className="mt-1 text-xs text-ink-600">
                    P {round(macro.proteinG, 0)}g · F {round(macro.fatG, 0)}g · C{" "}
                    {macro.carbG < 0 ? (
                      <span className="text-red-600">invalid ({round(macro.carbG, 0)}g)</span>
                    ) : (
                      `${round(macro.carbG, 0)}g`
                    )}
                  </div>
                  {macro.flags.length > 0 && (
                    <div className="mt-1 text-xs text-red-600">{macro.flags[0].message}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="label">Day name</label>
            <input
              className="input"
              placeholder="e.g. Training day"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <label className="label">Calorie budget (kcal)</label>
            <input
              type="number"
              className="input"
              value={form.calorieKcal}
              onChange={(e) => setForm((f) => ({ ...f, calorieKcal: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Protein mode</label>
                <select
                  className="input"
                  value={form.proteinMode}
                  onChange={(e) => setForm((f) => ({ ...f, proteinMode: e.target.value as GramsMode }))}
                >
                  {GRAMS_MODE_VALUES.map((m) => (
                    <option key={m} value={m}>
                      {m === "g" ? "grams" : "g/kg"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Protein value</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={form.proteinValue}
                  onChange={(e) => setForm((f) => ({ ...f, proteinValue: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Fat mode</label>
                <select
                  className="input"
                  value={form.fatMode}
                  onChange={(e) => setForm((f) => ({ ...f, fatMode: e.target.value as GramsMode }))}
                >
                  {GRAMS_MODE_VALUES.map((m) => (
                    <option key={m} value={m}>
                      {m === "g" ? "grams" : "g/kg"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Fat value</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={form.fatValue}
                  onChange={(e) => setForm((f) => ({ ...f, fatValue: e.target.value }))}
                />
              </div>
            </div>
            <label className="label">Carb override (g) — leave blank to use the remainder</label>
            <input
              type="number"
              className="input"
              value={form.carbOverrideG}
              onChange={(e) => setForm((f) => ({ ...f, carbOverrideG: e.target.value }))}
            />
            <button
              className="btn-primary"
              disabled={saving || !form.name || !form.calorieKcal}
              onClick={saveTemplate}
            >
              {saving ? "Saving..." : "Add day template"}
            </button>
          </div>

          <div className="space-y-2 rounded-lg border border-ink-100 p-4 text-sm">
            <h3 className="font-semibold">Preview</h3>
            <div className="flex justify-between">
              <span className="text-ink-500">Protein</span>
              <span>
                {round(preview.proteinG, 0)} g ({round(preview.proteinGPerKg, 2)} g/kg) — {Math.round(preview.proteinKcal)} kcal
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Fat</span>
              <span>
                {round(preview.fatG, 0)} g ({round(preview.fatGPerKg, 2)} g/kg) — {Math.round(preview.fatKcal)} kcal
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Carbohydrate</span>
              <span className={preview.carbG < 0 ? "font-semibold text-red-600" : ""}>
                {round(preview.carbG, 0)} g — {Math.round(preview.carbKcal)} kcal
              </span>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 font-semibold">
              <span>Total</span>
              <span>{Math.round(preview.totalKcal)} kcal</span>
            </div>
            {preview.flags.map((f, i) => (
              <div key={i} className={f.level === "critical" ? "badge-critical block" : "badge-warning block"}>
                {f.message}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Weekly schedule</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {WEEKDAY_LABELS.map((label, weekday) => (
            <div key={weekday}>
              <label className="label">{label}</label>
              <select
                className="input"
                value={assignments[weekday] ?? ""}
                onChange={(e) => setAssignments((a) => ({ ...a, [weekday]: e.target.value }))}
              >
                <option value="">—</option>
                {client.macroDayTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button className="btn-primary" disabled={savingAssignments} onClick={saveAssignments}>
          {savingAssignments ? "Saving..." : "Save weekly schedule"}
        </button>

        <div className="rounded-lg bg-ink-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-ink-800">Weekly total</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-ink-500">Weekly total</div>
              <div className="font-semibold">{Math.round(weeklySummary.weeklyTotalKcal)} kcal</div>
            </div>
            <div>
              <div className="text-ink-500">Daily average</div>
              <div className="font-semibold">{Math.round(weeklySummary.dailyAverageKcal)} kcal</div>
            </div>
            <div>
              <div className="text-ink-500">Weekly maintenance</div>
              <div className="font-semibold">{Math.round(weeklySummary.weeklyMaintenanceKcal)} kcal</div>
            </div>
            <div>
              <div className="text-ink-500">Estimated weekly deficit</div>
              <div className="font-semibold">{Math.round(weeklySummary.weeklyDeficitKcal)} kcal</div>
            </div>
          </div>
          {weeklySummary.hasVariableDays && (
            <p className="mt-2 text-xs text-apex-700">
              Day calories vary across the week — higher-calorie days reduce the weekly deficit shown above
              compared to a flat daily target.
            </p>
          )}
        </div>

        {latestDiet && (
          <TargetVsScheduledCard
            targetDailyKcal={latestDiet.dailyTargetKcal}
            targetWeeklyKcal={latestDiet.weeklyTargetKcal}
            scheduledDailyKcal={weeklySummary.dailyAverageKcal}
            scheduledWeeklyKcal={weeklySummary.weeklyTotalKcal}
          />
        )}
      </section>
    </div>
  );
}

function DeltaBadge({ deltaKcal }: { deltaKcal: number }) {
  const rounded = Math.round(deltaKcal);
  if (Math.abs(rounded) < 5) {
    return <span className="badge-ok">on target</span>;
  }
  const sign = rounded > 0 ? "+" : "";
  return (
    <span className={Math.abs(rounded) > 150 ? "badge-warning" : "badge-info"}>
      {sign}
      {rounded} kcal {rounded > 0 ? "above target" : "below target"}
    </span>
  );
}

/**
 * Puts the flat diet-plan target (set on the Maintenance & diet tab)
 * directly next to what the day-template schedule actually works out to,
 * so a mismatch between the two is visible at a glance rather than
 * requiring the coach to compare two different tabs.
 */
function TargetVsScheduledCard({
  targetDailyKcal,
  targetWeeklyKcal,
  scheduledDailyKcal,
  scheduledWeeklyKcal
}: {
  targetDailyKcal: number;
  targetWeeklyKcal: number;
  scheduledDailyKcal: number;
  scheduledWeeklyKcal: number;
}) {
  return (
    <div className="rounded-lg border border-ink-100 p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink-800">Target vs. what's actually scheduled</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-400">Daily</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm text-ink-500">Set target (Maintenance &amp; diet tab)</span>
            <span className="font-semibold">{Math.round(targetDailyKcal)} kcal</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm text-ink-500">Scheduled average (day templates)</span>
            <span className="font-semibold">{Math.round(scheduledDailyKcal)} kcal</span>
          </div>
          <div className="mt-2">
            <DeltaBadge deltaKcal={scheduledDailyKcal - targetDailyKcal} />
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-400">Weekly</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm text-ink-500">Set target (Maintenance &amp; diet tab)</span>
            <span className="font-semibold">{Math.round(targetWeeklyKcal)} kcal</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm text-ink-500">Scheduled total (day templates)</span>
            <span className="font-semibold">{Math.round(scheduledWeeklyKcal)} kcal</span>
          </div>
          <div className="mt-2">
            <DeltaBadge deltaKcal={scheduledWeeklyKcal - targetWeeklyKcal} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-500">
        These are two independent settings — the flat target on the Maintenance &amp; diet tab, and whatever your
        day templates below actually add up to. The app doesn't force them to match automatically; this card is
        just here so a mismatch is obvious rather than hidden across two tabs.
      </p>
    </div>
  );
}
