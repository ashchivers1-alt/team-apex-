"use client";

import { useState } from "react";
import type { FullClient, CheckIn } from "@/types/models";

interface CheckInFormState {
  date: string;
  weightKg: string;
  actualCalorieIntake: string;
  actualProteinG: string;
  actualFatG: string;
  actualCarbG: string;
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
    actualCalorieIntake: "",
    actualProteinG: "",
    actualFatG: "",
    actualCarbG: "",
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
    actualCalorieIntake: c.actualCalorieIntake?.toString() ?? "",
    actualProteinG: c.actualProteinG?.toString() ?? "",
    actualFatG: c.actualFatG?.toString() ?? "",
    actualCarbG: c.actualCarbG?.toString() ?? "",
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

  function set<K extends keyof CheckInFormState>(key: K, value: CheckInFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      date: form.date,
      weightKg: numOrNull(form.weightKg),
      actualCalorieIntake: numOrNull(form.actualCalorieIntake),
      actualProteinG: numOrNull(form.actualProteinG),
      actualFatG: numOrNull(form.actualFatG),
      actualCarbG: numOrNull(form.actualCarbG),
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

    if (editingId) {
      await fetch(`/api/clients/${client.id}/checkins/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } else {
      await fetch(`/api/clients/${client.id}/checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }
    setSaving(false);
    setForm(blankForm());
    setEditingId(null);
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
  }

  const sortedCheckIns = [...client.checkIns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <h2 className="section-title">{editingId ? "Edit check-in" : "Log a check-in"}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <NumField label="Morning weight (kg)" value={form.weightKg} onChange={(v) => set("weightKg", v)} />
          <NumField label="Actual calories" value={form.actualCalorieIntake} onChange={(v) => set("actualCalorieIntake", v)} />
          <NumField label="Steps" value={form.steps} onChange={(v) => set("steps", v)} />
          <NumField label="Actual protein (g)" value={form.actualProteinG} onChange={(v) => set("actualProteinG", v)} />
          <NumField label="Actual fat (g)" value={form.actualFatG} onChange={(v) => set("actualFatG", v)} />
          <NumField label="Actual carbs (g)" value={form.actualCarbG} onChange={(v) => set("actualCarbG", v)} />
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
          <NumField
            label="Adherence estimate (%)"
            value={form.adherencePercent}
            onChange={(v) => set("adherencePercent", v)}
            min={0}
            max={100}
          />
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

        <div className="flex gap-2">
          <button className="btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : editingId ? "Save changes" : "Log check-in"}
          </button>
          {editingId && (
            <button
              className="btn-secondary"
              onClick={() => {
                setEditingId(null);
                setForm(blankForm());
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedCheckIns.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-ink-400">
                  No check-ins logged yet.
                </td>
              </tr>
            )}
            {sortedCheckIns.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.date).toLocaleDateString("en-GB")}</td>
                <td>{c.weightKg ? `${c.weightKg} kg` : "—"}</td>
                <td>{c.actualCalorieIntake ?? "—"}</td>
                <td>{c.steps ?? "—"}</td>
                <td>{c.adherencePercent != null ? `${c.adherencePercent}%` : "—"}</td>
                <td>
                  {c.hunger ?? "-"}/{c.energy ?? "-"}/{c.recovery ?? "-"}
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
