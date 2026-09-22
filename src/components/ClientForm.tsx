"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GOAL_VALUES,
  GOAL_LABELS,
  BODY_FAT_METHOD_VALUES,
  BODY_FAT_METHOD_LABELS,
  ACTIVITY_CATEGORY_VALUES,
  UnitPreferenceValue,
  WEEKDAY_LABELS
} from "@/lib/enums";
import { ACTIVITY_MULTIPLIERS } from "@/lib/calculations/energy";
import { kgToLb, lbToKg, cmToFeetInches, feetInchesToCm, round } from "@/lib/calculations/units";

export interface ClientFormValues {
  id?: string;
  name: string;
  sex: "MALE" | "FEMALE";
  age: number;
  heightCm: number;
  currentWeightKg: number;
  preferredUnits: UnitPreferenceValue;
  bodyFatPercent: number | null;
  bodyFatMethod: string | null;
  bodyFatDate: string | null;
  goal: string;
  targetWeightKg: number | null;
  targetDate: string | null;
  isCompetitor: boolean;
  division: string | null;
  showDate: string | null;
  occupation: string | null;
  generalActivityLevel: string | null;
  avgDailySteps: number | null;
  resistanceFreqPerWk: number | null;
  resistanceSessionMin: number | null;
  cardioType: string | null;
  cardioFreqPerWk: number | null;
  cardioSessionMin: number | null;
  currentCalorieIntake: number | null;
  currentProteinG: number | null;
  currentFatG: number | null;
  currentCarbG: number | null;
  dietHistoryNotes: string | null;
  coachNotes: string | null;
  checkInDays: number[];
}

const emptyValues: ClientFormValues = {
  name: "",
  sex: "MALE",
  age: 30,
  heightCm: 175,
  currentWeightKg: 80,
  preferredUnits: "METRIC",
  bodyFatPercent: null,
  bodyFatMethod: null,
  bodyFatDate: null,
  goal: "FAT_LOSS",
  targetWeightKg: null,
  targetDate: null,
  isCompetitor: false,
  division: null,
  showDate: null,
  occupation: null,
  generalActivityLevel: null,
  avgDailySteps: null,
  resistanceFreqPerWk: null,
  resistanceSessionMin: null,
  cardioType: null,
  cardioFreqPerWk: null,
  cardioSessionMin: null,
  currentCalorieIntake: null,
  currentProteinG: null,
  currentFatG: null,
  currentCarbG: null,
  dietHistoryNotes: null,
  coachNotes: null,
  checkInDays: [0, 3]
};

export default function ClientForm({ initial }: { initial?: Partial<ClientFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<ClientFormValues>({ ...emptyValues, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImperial = values.preferredUnits === "IMPERIAL";
  const heightFeetInches = cmToFeetInches(values.heightCm || 0);
  const weightLb = kgToLb(values.currentWeightKg || 0);

  function set<K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const method = values.id ? "PATCH" : "POST";
    const url = values.id ? `/api/clients/${values.id}` : "/api/clients";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Please check the fields and try again.");
      return;
    }
    const data = await res.json();
    router.push(`/clients/${data.client.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="card space-y-4">
        <h2 className="section-title">Required calculation inputs</h2>
        <p className="text-sm text-ink-500">
          These feed directly into the resting-energy and TDEE equations. Everything else on this form is
          optional coaching context.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div>
            <label className="label">Units</label>
            <select
              className="input"
              value={values.preferredUnits}
              onChange={(e) => set("preferredUnits", e.target.value as UnitPreferenceValue)}
            >
              <option value="METRIC">Metric (kg / cm)</option>
              <option value="IMPERIAL">Imperial (lb / ft-in)</option>
            </select>
            <p className="field-hint">Only affects input/display — everything is stored and calculated in metric.</p>
          </div>

          <div>
            <label className="label">Sex (used by the energy equation)</label>
            <select className="input" value={values.sex} onChange={(e) => set("sex", e.target.value as "MALE" | "FEMALE")}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            <p className="field-hint">
              Mifflin-St Jeor uses sex as a population-average correction for resting metabolic rate at a given
              weight/height/age — not a judgement about any individual.
            </p>
          </div>

          <div>
            <label className="label">Age (years)</label>
            <input
              type="number"
              className="input"
              required
              min={10}
              max={100}
              value={values.age}
              onChange={(e) => set("age", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="label">Height {isImperial ? "(ft / in)" : "(cm)"}</label>
            {isImperial ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input"
                  value={heightFeetInches.feet}
                  onChange={(e) =>
                    set("heightCm", round(feetInchesToCm(Number(e.target.value), heightFeetInches.inches), 1))
                  }
                />
                <input
                  type="number"
                  className="input"
                  value={round(heightFeetInches.inches, 1)}
                  onChange={(e) =>
                    set("heightCm", round(feetInchesToCm(heightFeetInches.feet, Number(e.target.value)), 1))
                  }
                />
              </div>
            ) : (
              <input
                type="number"
                className="input"
                required
                value={values.heightCm}
                onChange={(e) => set("heightCm", Number(e.target.value))}
              />
            )}
          </div>

          <div>
            <label className="label">Current bodyweight {isImperial ? "(lb)" : "(kg)"}</label>
            {isImperial ? (
              <input
                type="number"
                step="0.1"
                className="input"
                value={round(weightLb, 1)}
                onChange={(e) => set("currentWeightKg", round(lbToKg(Number(e.target.value)), 2))}
              />
            ) : (
              <input
                type="number"
                step="0.1"
                className="input"
                required
                value={values.currentWeightKg}
                onChange={(e) => set("currentWeightKg", Number(e.target.value))}
              />
            )}
          </div>

          <div>
            <label className="label">Goal</label>
            <select className="input" value={values.goal} onChange={(e) => set("goal", e.target.value)}>
              {GOAL_VALUES.map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Optional body composition</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Body-fat estimate (%)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={values.bodyFatPercent ?? ""}
              onChange={(e) => set("bodyFatPercent", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Method</label>
            <select
              className="input"
              value={values.bodyFatMethod ?? ""}
              onChange={(e) => set("bodyFatMethod", e.target.value || null)}
            >
              <option value="">—</option>
              {BODY_FAT_METHOD_VALUES.map((m) => (
                <option key={m} value={m}>
                  {BODY_FAT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date estimated</label>
            <input
              type="date"
              className="input"
              value={values.bodyFatDate ?? ""}
              onChange={(e) => set("bodyFatDate", e.target.value || null)}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Goal targets</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Target weight {isImperial ? "(lb)" : "(kg)"} (optional)</label>
            <input
              type="number"
              step="0.1"
              className="input"
              value={
                values.targetWeightKg == null ? "" : isImperial ? round(kgToLb(values.targetWeightKg), 1) : values.targetWeightKg
              }
              onChange={(e) => {
                if (e.target.value === "") return set("targetWeightKg", null);
                const n = Number(e.target.value);
                set("targetWeightKg", isImperial ? round(lbToKg(n), 2) : n);
              }}
            />
          </div>
          <div>
            <label className="label">Target date (optional)</label>
            <input
              type="date"
              className="input"
              value={values.targetDate ?? ""}
              onChange={(e) => set("targetDate", e.target.value || null)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isCompetitor"
            type="checkbox"
            checked={values.isCompetitor}
            onChange={(e) => set("isCompetitor", e.target.checked)}
          />
          <label htmlFor="isCompetitor" className="text-sm font-medium text-ink-700">
            This client is a competitor (contest prep)
          </label>
        </div>

        {values.isCompetitor && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Division</label>
              <input
                className="input"
                value={values.division ?? ""}
                onChange={(e) => set("division", e.target.value || null)}
              />
            </div>
            <div>
              <label className="label">Show date</label>
              <input
                type="date"
                className="input"
                value={values.showDate ?? ""}
                onChange={(e) => set("showDate", e.target.value || null)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Check-in schedule</h2>
        <p className="text-sm text-ink-500">
          Which days this client is expected to submit an update. Usually fixed, but change it anytime — there's
          no history kept, just the current setting.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const active = values.checkInDays.includes(weekday);
            return (
              <button
                key={weekday}
                type="button"
                onClick={() =>
                  set(
                    "checkInDays",
                    active
                      ? values.checkInDays.filter((d) => d !== weekday)
                      : [...values.checkInDays, weekday].sort()
                  )
                }
                className={active ? "badge-info px-3 py-1.5 text-sm" : "badge bg-ink-100 px-3 py-1.5 text-sm text-ink-500"}
              >
                {label.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Activity context</h2>
        <p className="text-sm text-ink-500">
          These guide (not directly set) the TDEE activity multiplier — steps and exercise are already reflected
          in the multiplier category, so they should not additionally be added on top of it.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Occupation</label>
            <input
              className="input"
              value={values.occupation ?? ""}
              onChange={(e) => set("occupation", e.target.value || null)}
            />
          </div>
          <div>
            <label className="label">General activity level</label>
            <select
              className="input"
              value={values.generalActivityLevel ?? ""}
              onChange={(e) => set("generalActivityLevel", e.target.value || null)}
            >
              <option value="">—</option>
              {ACTIVITY_CATEGORY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {ACTIVITY_MULTIPLIERS[c].label} ({ACTIVITY_MULTIPLIERS[c].multiplier}x)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Average daily steps</label>
            <input
              type="number"
              className="input"
              value={values.avgDailySteps ?? ""}
              onChange={(e) => set("avgDailySteps", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div />
          <div>
            <label className="label">Resistance training: sessions/week</label>
            <input
              type="number"
              className="input"
              value={values.resistanceFreqPerWk ?? ""}
              onChange={(e) => set("resistanceFreqPerWk", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Resistance training: session duration (min)</label>
            <input
              type="number"
              className="input"
              value={values.resistanceSessionMin ?? ""}
              onChange={(e) => set("resistanceSessionMin", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Cardio type</label>
            <input
              className="input"
              value={values.cardioType ?? ""}
              onChange={(e) => set("cardioType", e.target.value || null)}
            />
          </div>
          <div />
          <div>
            <label className="label">Cardio: sessions/week</label>
            <input
              type="number"
              className="input"
              value={values.cardioFreqPerWk ?? ""}
              onChange={(e) => set("cardioFreqPerWk", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Cardio: session duration (min)</label>
            <input
              type="number"
              className="input"
              value={values.cardioSessionMin ?? ""}
              onChange={(e) => set("cardioSessionMin", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Current intake (if known)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Calories/day</label>
            <input
              type="number"
              className="input"
              value={values.currentCalorieIntake ?? ""}
              onChange={(e) => set("currentCalorieIntake", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Protein (g)</label>
            <input
              type="number"
              className="input"
              value={values.currentProteinG ?? ""}
              onChange={(e) => set("currentProteinG", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Fat (g)</label>
            <input
              type="number"
              className="input"
              value={values.currentFatG ?? ""}
              onChange={(e) => set("currentFatG", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Carbs (g)</label>
            <input
              type="number"
              className="input"
              value={values.currentCarbG ?? ""}
              onChange={(e) => set("currentCarbG", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Coaching context (free text, not used in calculations)</h2>
        <div>
          <label className="label">Recent dieting history / weight change</label>
          <textarea
            className="input min-h-[80px]"
            value={values.dietHistoryNotes ?? ""}
            onChange={(e) => set("dietHistoryNotes", e.target.value || null)}
          />
        </div>
        <div>
          <label className="label">Coach notes — medication, medical conditions, menstrual-cycle context (private)</label>
          <textarea
            className="input min-h-[80px]"
            value={values.coachNotes ?? ""}
            onChange={(e) => set("coachNotes", e.target.value || null)}
          />
          <p className="field-hint">Private: never included in the client-facing printable summary.</p>
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving..." : values.id ? "Save changes" : "Create client"}
        </button>
      </div>
    </form>
  );
}
