"use client";

import { useState } from "react";
import type { FullClient, CheckIn } from "@/types/models";
import { WEEKDAY_LABELS } from "@/lib/enums";
import { dietPlanHistory, DietPlanComparison } from "@/lib/clientCalculations";
import { calculateMacroPlan, GramsMode } from "@/lib/calculations/macros";
import { round } from "@/lib/calculations/units";

interface CheckInFormState {
  date: string;
  weightKg: string;
  reportedAverageWeightKg: string;
  planChangeNotes: string;
  steps: string;
  cardioMinutes: string;
  cardioTypeNote: string;
  trainingSessionsCompleted: string;
  trainingPerformanceNotes: string;
  hunger: string;
  energy: string;
  sleepHours: string;
  sleepQuality: string;
  recovery: string;
  digestionNotes: string;
  menstrualCycleNotes: string;
  adherencePercent: string;
  coachComment: string;
  clientComment: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function blankForm(): CheckInFormState {
  return {
    date: todayIso(),
    weightKg: "",
    reportedAverageWeightKg: "",
    planChangeNotes: "",
    steps: "",
    cardioMinutes: "",
    cardioTypeNote: "",
    trainingSessionsCompleted: "",
    trainingPerformanceNotes: "",
    hunger: "",
    energy: "",
    sleepHours: "",
    sleepQuality: "",
    recovery: "",
    digestionNotes: "",
    menstrualCycleNotes: "",
    adherencePercent: "",
    coachComment: "",
    clientComment: ""
  };
}

function checkInToForm(c: CheckIn): CheckInFormState {
  return {
    date: new Date(c.date).toISOString().slice(0, 10),
    weightKg: c.weightKg?.toString() ?? "",
    reportedAverageWeightKg: c.reportedAverageWeightKg?.toString() ?? "",
    planChangeNotes: c.planChangeNotes ?? "",
    steps: c.steps?.toString() ?? "",
    cardioMinutes: c.cardioMinutes?.toString() ?? "",
    cardioTypeNote: c.cardioTypeNote ?? "",
    trainingSessionsCompleted: c.trainingSessionsCompleted?.toString() ?? "",
    trainingPerformanceNotes: c.trainingPerformanceNotes ?? "",
    hunger: c.hunger?.toString() ?? "",
    energy: c.energy?.toString() ?? "",
    sleepHours: c.sleepHours?.toString() ?? "",
    sleepQuality: c.sleepQuality?.toString() ?? "",
    recovery: c.recovery?.toString() ?? "",
    digestionNotes: c.digestionNotes ?? "",
    menstrualCycleNotes: c.menstrualCycleNotes ?? "",
    adherencePercent: c.adherencePercent?.toString() ?? "",
    coachComment: c.coachComment ?? "",
    clientComment: c.clientComment ?? ""
  };
}

function numOrNull(v: string): number | null {
  return v === "" ? null : Number(v);
}

function NumField({
  label,
  value,
  onChange,
  min,
  max
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        className="input"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function CheckInsTab({ client, onChanged }: { client: FullClient; onChanged: () => void }) {
  const [form, setForm] = useState<CheckInFormState>(blankForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [templateEdits, setTemplateEdits] = useState<
    Record<string, { calorieKcal: string; proteinG: string; fatG: string; carbG: string }>
  >({});
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);

  function set<K extends keyof CheckInFormState>(key: K, value: CheckInFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const intake = actualIntakeForDate(form.date);
    const body = {
      date: form.date,
      weightKg: numOrNull(form.weightKg),
      reportedAverageWeightKg: numOrNull(form.reportedAverageWeightKg),
      planChangeNotes: form.planChangeNotes || null,
      actualCalorieIntake: intake.calories,
      actualProteinG: intake.protein,
      actualFatG: intake.fat,
      actualCarbG: intake.carbs,
      steps: numOrNull(form.steps),
      cardioMinutes: numOrNull(form.cardioMinutes),
      cardioTypeNote: form.cardioTypeNote || null,
      trainingSessionsCompleted: numOrNull(form.trainingSessionsCompleted),
      trainingPerformanceNotes: form.trainingPerformanceNotes || null,
      hunger: numOrNull(form.hunger),
      energy: numOrNull(form.energy),
      sleepHours: numOrNull(form.sleepHours),
      sleepQuality: numOrNull(form.sleepQuality),
      recovery: numOrNull(form.recovery),
      digestionNotes: form.digestionNotes || null,
      menstrualCycleNotes: form.menstrualCycleNotes || null,
      adherencePercent: numOrNull(form.adherencePercent),
      coachComment: form.coachComment || null,
      clientComment: form.clientComment || null
    };

    await Promise.all([
      editingId
        ? fetch(`/api/clients/${client.id}/checkins/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          })
        : fetch(`/api/clients/${client.id}/checkins`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }),
      savePendingTemplateEdits()
    ]);
    setSaving(false);
    setForm(blankForm());
    setEditingId(null);
    setShowMore(false);
    onChanged();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this check-in?")) return;
    await fetch(`/api/clients/${client.id}/checkins/${id}`, { method: "DELETE" });
    onChanged();
  }

  function loadForEdit(c: CheckIn) {
    setEditingId(c.id);
    setForm(checkInToForm(c));
    const hasExtraDetails =
      c.cardioMinutes != null ||
      c.cardioTypeNote ||
      c.trainingSessionsCompleted != null ||
      c.trainingPerformanceNotes ||
      c.hunger != null ||
      c.energy != null ||
      c.sleepHours != null ||
      c.sleepQuality != null ||
      c.recovery != null ||
      c.digestionNotes ||
      c.menstrualCycleNotes ||
      c.clientComment ||
      c.coachComment;
    setShowMore(Boolean(hasExtraDetails));
  }

  const sortedCheckIns = [...client.checkIns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const now = new Date();
  const isoWeekday = (now.getDay() + 6) % 7; // 0=Mon..6=Sun, matching checkInDays convention
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - isoWeekday);
  const loggedDatesThisWeek = new Set(client.checkIns.map((c) => new Date(c.date).toISOString().slice(0, 10)));
  const weekSchedule = client.checkInDays
    .slice()
    .sort()
    .map((weekday) => {
      const date = new Date(monday.getTime() + weekday * 86_400_000);
      return {
        weekday,
        label: WEEKDAY_LABELS[weekday],
        isPast: date.getTime() < monday.getTime() + isoWeekday * 86_400_000,
        isToday: weekday === isoWeekday,
        done: loggedDatesThisWeek.has(date.toISOString().slice(0, 10))
      };
    });

  const latestDiet = client.dietPlans[0];
  const dietHistory = dietPlanHistory(client);
  const visibleDietHistory = dietHistory.slice(0, 5);

  // Every distinct day-type currently in the weekly schedule (not just
  // today's), so the coach can see all active diets at a glance — a
  // client might be logging against a training-day or rest-day target
  // depending which day this update is for.
  const activeTemplates = Array.from(
    new Map(client.weekdayAssignments.map((a) => [a.template.id, a.template])).values()
  ).map((t) => ({
    template: t,
    macro: calculateMacroPlan({
      calorieBudgetKcal: t.calorieKcal,
      bodyWeightKg: client.currentWeightKg,
      proteinMode: t.proteinMode as GramsMode,
      proteinValue: t.proteinValue,
      fatMode: t.fatMode as GramsMode,
      fatValue: t.fatValue,
      carbOverrideG: t.carbOverrideG
    }),
    weekdaysUsed: client.weekdayAssignments.filter((a) => a.template.id === t.id).map((a) => a.weekday)
  }));

  function templateMacroForDate(dateStr: string) {
    if (!dateStr) return null;
    const weekday = (new Date(`${dateStr}T00:00:00Z`).getUTCDay() + 6) % 7;
    const entry = activeTemplates.find((t) => t.weekdaysUsed.includes(weekday));
    return entry ?? null;
  }

  // A check-in's actual intake is simply whichever diet applies on that
  // date — training day, rest day, etc. — taking any edit made to that
  // diet's own block in this same session, so adjusting a diet and
  // logging the check-in in one action records what was actually eaten.
  function actualIntakeForDate(dateStr: string) {
    const entry = templateMacroForDate(dateStr);
    if (!entry) return { calories: null, protein: null, fat: null, carbs: null };
    const edit = templateEdits[entry.template.id];
    if (edit) {
      return {
        calories: Number(edit.calorieKcal),
        protein: Number(edit.proteinG),
        fat: Number(edit.fatG),
        carbs: Number(edit.carbG)
      };
    }
    return {
      calories: Math.round(entry.template.calorieKcal),
      protein: Math.round(entry.macro.proteinG),
      fat: Math.round(entry.macro.fatG),
      carbs: Math.round(entry.macro.carbG)
    };
  }

  // Quick inline editing of each currently-deployed diet's own targets
  // (Training day, Rest day, etc.) — separate from the "actual intake for
  // this date" fields above, since a coach reviewing check-ins often wants
  // to adjust the standing plan for a whole day-type, not just log one
  // day's actual numbers.
  function getTemplateEdit(templateId: string, macro: ReturnType<typeof calculateMacroPlan>, calorieKcal: number) {
    return (
      templateEdits[templateId] ?? {
        calorieKcal: String(Math.round(calorieKcal)),
        proteinG: String(Math.round(macro.proteinG)),
        fatG: String(Math.round(macro.fatG)),
        carbG: String(Math.round(macro.carbG))
      }
    );
  }

  function setTemplateEditField(
    templateId: string,
    macro: ReturnType<typeof calculateMacroPlan>,
    calorieKcal: number,
    field: "calorieKcal" | "proteinG" | "fatG" | "carbG",
    value: string
  ) {
    setTemplateEdits((prev) => ({
      ...prev,
      [templateId]: { ...getTemplateEdit(templateId, macro, calorieKcal), [field]: value }
    }));
  }

  function persistTemplateEdit(templateId: string, edit: { calorieKcal: string; proteinG: string; fatG: string; carbG: string }) {
    return fetch(`/api/clients/${client.id}/macro-templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calorieKcal: Number(edit.calorieKcal),
        proteinMode: "g",
        proteinValue: Number(edit.proteinG),
        fatMode: "g",
        fatValue: Number(edit.fatG),
        carbOverrideG: Number(edit.carbG)
      })
    });
  }

  async function saveTemplateEdit(templateId: string) {
    const edit = templateEdits[templateId];
    if (!edit) return;
    setSavingTemplateId(templateId);
    await persistTemplateEdit(templateId, edit);
    setSavingTemplateId(null);
    setTemplateEdits((prev) => {
      const next = { ...prev };
      delete next[templateId];
      return next;
    });
    onChanged();
  }

  // Any diet-type edits still pending (not yet saved via their own Save
  // button) are saved together with the check-in itself, so "Log
  // check-in" is a single action that captures everything on the page —
  // not two separate saves the coach has to remember to trigger.
  async function savePendingTemplateEdits() {
    const entries = Object.entries(templateEdits);
    if (entries.length === 0) return;
    await Promise.all(entries.map(([templateId, edit]) => persistTemplateEdit(templateId, edit)));
    setTemplateEdits({});
  }

  return (
    <div className="space-y-6">
      {latestDiet && (
        <section className="card space-y-4">
          <h2 className="section-title">Current plan</h2>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-ink-500">Daily target</div>
              <div className="font-semibold">{Math.round(latestDiet.dailyTargetKcal)} kcal</div>
            </div>
            <div>
              <div className="text-ink-500">Weekly target</div>
              <div className="font-semibold">{Math.round(latestDiet.weeklyTargetKcal)} kcal</div>
            </div>
            <div>
              <div className="text-ink-500">Deficit</div>
              <div className="font-semibold">{round(latestDiet.deficitPercentOfTdee, 1)}% of TDEE</div>
            </div>
          </div>

          {visibleDietHistory.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Change log (most recent first)
              </div>
              {visibleDietHistory.map((c) => (
                <DietChangeRow key={c.current.id} comparison={c} />
              ))}
              {dietHistory.length > visibleDietHistory.length && (
                <p className="text-xs text-ink-400">
                  +{dietHistory.length - visibleDietHistory.length} earlier change(s) — full history on the Trends
                  tab.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {client.checkInDays.length > 0 && (
        <section className="card">
          <h2 className="section-title mb-3">This week's schedule</h2>
          <div className="flex flex-wrap gap-2">
            {weekSchedule.map((d) => (
              <span
                key={d.weekday}
                className={
                  d.done
                    ? "badge-ok"
                    : d.isPast
                      ? "badge-critical"
                      : d.isToday
                        ? "badge-info"
                        : "badge bg-ink-100 text-ink-500"
                }
              >
                {d.label.slice(0, 3)} {d.done ? "✓" : d.isPast ? "missed" : d.isToday ? "today" : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="card space-y-4">
        <h2 className="section-title">{editingId ? "Edit check-in" : "Log an update"}</h2>
        <p className="text-sm text-ink-500">
          The core fields that actually drive the trend charts, recalibration and decision support. Actual
          intake for this date is taken from whichever diet applies below — adjust any of them if the real day
          differed. Everything else is optional and tucked under "More details" below.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <NumField label="Morning weight (kg)" value={form.weightKg} onChange={(v) => set("weightKg", v)} />
          <NumField
            label="Reported average weight (kg, optional)"
            value={form.reportedAverageWeightKg}
            onChange={(v) => set("reportedAverageWeightKg", v)}
          />
          <NumField label="Steps" value={form.steps} onChange={(v) => set("steps", v)} />
          <NumField
            label="Adherence estimate (%)"
            value={form.adherencePercent}
            onChange={(v) => set("adherencePercent", v)}
            min={0}
            max={100}
          />
        </div>

        {activeTemplates.length > 0 ? (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Diets currently deployed — adjust any that need updating; this is what gets logged as this date's
              actual intake
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {activeTemplates.map(({ template, macro, weekdaysUsed }) => {
                const edit = getTemplateEdit(template.id, macro, template.calorieKcal);
                const isDirty =
                  Number(edit.calorieKcal) !== Math.round(template.calorieKcal) ||
                  Number(edit.proteinG) !== Math.round(macro.proteinG) ||
                  Number(edit.fatG) !== Math.round(macro.fatG) ||
                  Number(edit.carbG) !== Math.round(macro.carbG);
                const appliesToFormDate = templateMacroForDate(form.date)?.template.id === template.id;
                return (
                  <div
                    key={template.id}
                    className={`rounded-lg border p-3 text-sm ${
                      appliesToFormDate ? "border-apex-300 bg-apex-50" : "border-ink-100"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold">{template.name}</span>
                      <div className="flex items-center gap-2">
                        {appliesToFormDate && <span className="badge-info">applies to this date</span>}
                        <span className="text-xs text-ink-400">
                          {weekdaysUsed.map((w) => WEEKDAY_LABELS[w].slice(0, 3)).join(", ")}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(
                        [
                          ["calorieKcal", "Kcal"],
                          ["proteinG", "Protein"],
                          ["fatG", "Fat"],
                          ["carbG", "Carbs"]
                        ] as const
                      ).map(([field, label]) => (
                        <div key={field}>
                          <label className="label">{label}</label>
                          <input
                            type="number"
                            className="input"
                            value={edit[field]}
                            onChange={(e) => setTemplateEditField(template.id, macro, template.calorieKcal, field, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    {isDirty && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-apex-700">
                          Changed from {Math.round(template.calorieKcal)} kcal · P{Math.round(macro.proteinG)} F
                          {Math.round(macro.fatG)} C{Math.round(macro.carbG)}
                        </span>
                        <div className="flex gap-2">
                          <button
                            className="text-xs text-ink-500 hover:underline"
                            onClick={() =>
                              setTemplateEdits((prev) => {
                                const next = { ...prev };
                                delete next[template.id];
                                return next;
                              })
                            }
                          >
                            Revert
                          </button>
                          <button
                            className="btn-primary px-2 py-1 text-xs"
                            disabled={savingTemplateId === template.id}
                            onClick={() => saveTemplateEdit(template.id)}
                          >
                            {savingTemplateId === template.id ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-400">No day templates assigned yet — set these up on the Macros tab.</p>
        )}

        <div>
          <label className="label">Diet / cardio / plan change notes</label>
          <textarea
            className="input min-h-[60px]"
            placeholder="e.g. Reduced cardio to 20 min due to knee. Added 20g carbs on training days."
            value={form.planChangeNotes}
            onChange={(e) => set("planChangeNotes", e.target.value)}
          />
        </div>

        <button
          type="button"
          className="text-sm text-apex-600 hover:underline"
          onClick={() => setShowMore((s) => !s)}
        >
          {showMore ? "Hide more details" : "More details (macros, cardio, training, wellbeing...)"}
        </button>

        {showMore && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <NumField label="Cardio (min)" value={form.cardioMinutes} onChange={(v) => set("cardioMinutes", v)} />
              <div>
                <label className="label">Cardio type note</label>
                <input className="input" value={form.cardioTypeNote} onChange={(e) => set("cardioTypeNote", e.target.value)} />
              </div>
              <NumField
                label="Training sessions completed"
                value={form.trainingSessionsCompleted}
                onChange={(v) => set("trainingSessionsCompleted", v)}
              />
              <NumField label="Hunger (1-5)" value={form.hunger} onChange={(v) => set("hunger", v)} min={1} max={5} />
              <NumField label="Energy (1-5)" value={form.energy} onChange={(v) => set("energy", v)} min={1} max={5} />
              <NumField label="Sleep (hours)" value={form.sleepHours} onChange={(v) => set("sleepHours", v)} />
              <NumField label="Sleep quality (1-5)" value={form.sleepQuality} onChange={(v) => set("sleepQuality", v)} min={1} max={5} />
              <NumField label="Recovery (1-5)" value={form.recovery} onChange={(v) => set("recovery", v)} min={1} max={5} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Training performance notes</label>
                <textarea
                  className="input min-h-[60px]"
                  value={form.trainingPerformanceNotes}
                  onChange={(e) => set("trainingPerformanceNotes", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Digestion / bowel movement notes</label>
                <textarea className="input min-h-[60px]" value={form.digestionNotes} onChange={(e) => set("digestionNotes", e.target.value)} />
              </div>
              <div>
                <label className="label">Menstrual-cycle notes (where relevant)</label>
                <textarea
                  className="input min-h-[60px]"
                  value={form.menstrualCycleNotes}
                  onChange={(e) => set("menstrualCycleNotes", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Client comment</label>
                <textarea className="input min-h-[60px]" value={form.clientComment} onChange={(e) => set("clientComment", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Coach comment</label>
                <textarea className="input min-h-[60px]" value={form.coachComment} onChange={(e) => set("coachComment", e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button className="btn-primary" disabled={saving} onClick={handleSave}>
            {saving
              ? "Saving..."
              : editingId
                ? "Save changes"
                : Object.keys(templateEdits).length > 0
                  ? "Log check-in & save diet changes"
                  : "Log check-in"}
          </button>
          {editingId && (
            <button
              className="btn-secondary"
              onClick={() => {
                setEditingId(null);
                setForm(blankForm());
                setShowMore(false);
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </section>

      <section className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Date</th>
              <th>Weight</th>
              <th>Calories</th>
              <th>Steps</th>
              <th>Adherence</th>
              <th>Hunger/Energy/Recovery</th>
              <th>Plan change notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedCheckIns.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-ink-400">
                  No check-ins logged yet.
                </td>
              </tr>
            )}
            {sortedCheckIns.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.date).toLocaleDateString("en-GB")}</td>
                <td>
                  {c.weightKg ? `${c.weightKg} kg` : "—"}
                  {c.reportedAverageWeightKg != null && (
                    <span className="ml-1 text-xs text-ink-400">(avg {c.reportedAverageWeightKg})</span>
                  )}
                </td>
                <td>{c.actualCalorieIntake ?? "—"}</td>
                <td>{c.steps ?? "—"}</td>
                <td>{c.adherencePercent != null ? `${c.adherencePercent}%` : "—"}</td>
                <td>
                  {c.hunger ?? "-"}/{c.energy ?? "-"}/{c.recovery ?? "-"}
                </td>
                <td className="max-w-[220px] truncate" title={c.planChangeNotes ?? ""}>
                  {c.planChangeNotes || "—"}
                </td>
                <td className="whitespace-nowrap text-right">
                  <button className="mr-2 text-xs text-apex-600 hover:underline" onClick={() => loadForEdit(c)}>
                    Edit
                  </button>
                  <button className="text-xs text-red-600 hover:underline" onClick={() => handleDelete(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function DietChangeRow({ comparison: c }: { comparison: DietPlanComparison }) {
  return (
    <div className="rounded-lg bg-ink-50 p-3 text-sm">
      <div className="mb-1 font-semibold text-ink-800">
        {new Date(c.current.createdAt).toLocaleDateString("en-GB")}
        {c.current.reason ? ` — ${c.current.reason}` : ""}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <span className="text-ink-500">Daily: </span>
          {Math.round(c.previous.dailyTargetKcal)} → {Math.round(c.current.dailyTargetKcal)} kcal
          <span className={c.dailyKcalDelta < 0 ? "ml-1 text-red-600" : "ml-1 text-emerald-600"}>
            ({c.dailyKcalDelta >= 0 ? "+" : ""}
            {Math.round(c.dailyKcalDelta)})
          </span>
        </div>
        <div>
          <span className="text-ink-500">Weekly: </span>
          {Math.round(c.previous.weeklyTargetKcal)} → {Math.round(c.current.weeklyTargetKcal)} kcal
          <span className={c.weeklyKcalDelta < 0 ? "ml-1 text-red-600" : "ml-1 text-emerald-600"}>
            ({c.weeklyKcalDelta >= 0 ? "+" : ""}
            {Math.round(c.weeklyKcalDelta)})
          </span>
        </div>
        <div>
          <span className="text-ink-500">Deficit: </span>
          {round(c.previous.deficitPercentOfTdee, 1)}% → {round(c.current.deficitPercentOfTdee, 1)}%
          <span className="ml-1 text-ink-500">
            ({c.deficitPercentDelta >= 0 ? "+" : ""}
            {round(c.deficitPercentDelta, 1)}pp)
          </span>
        </div>
      </div>
    </div>
  );
}
