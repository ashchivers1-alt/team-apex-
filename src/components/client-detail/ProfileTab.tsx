"use client";

import Link from "next/link";
import type { FullClient } from "@/types/models";
import {
  GOAL_LABELS,
  GoalValue,
  BODY_FAT_METHOD_LABELS,
  BodyFatMethodValue
} from "@/lib/enums";
import { ACTIVITY_MULTIPLIERS } from "@/lib/calculations/energy";
import { kgToLb, cmToFeetInches } from "@/lib/calculations/units";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-sm text-ink-900">{value ?? <span className="text-ink-300">—</span>}</div>
    </div>
  );
}

export default function ProfileTab({ client }: { client: FullClient; onChanged: () => void }) {
  const feetInches = cmToFeetInches(client.heightCm);
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href={`/clients/${client.id}/edit`} className="btn-primary">
          Edit profile
        </Link>
      </div>

      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Sex" value={client.sex === "MALE" ? "Male" : "Female"} />
        <Field label="Age" value={`${client.age} years`} />
        <Field
          label="Height"
          value={`${client.heightCm} cm (${feetInches.feet}'${Math.round(feetInches.inches)}")`}
        />
        <Field
          label="Current weight"
          value={`${client.currentWeightKg.toFixed(1)} kg (${kgToLb(client.currentWeightKg).toFixed(1)} lb)`}
        />
        <Field label="Goal" value={GOAL_LABELS[client.goal as GoalValue] ?? client.goal} />
        <Field
          label="Target weight"
          value={client.targetWeightKg ? `${client.targetWeightKg.toFixed(1)} kg` : null}
        />
        <Field
          label="Target date"
          value={client.targetDate ? new Date(client.targetDate).toLocaleDateString("en-GB") : null}
        />
        <Field
          label="Body fat"
          value={
            client.bodyFatPercent
              ? `${client.bodyFatPercent}% (${
                  client.bodyFatMethod
                    ? BODY_FAT_METHOD_LABELS[client.bodyFatMethod as BodyFatMethodValue]
                    : "method not recorded"
                }${client.bodyFatDate ? `, ${new Date(client.bodyFatDate).toLocaleDateString("en-GB")}` : ""})`
              : null
          }
        />
        {client.isCompetitor && (
          <>
            <Field label="Division" value={client.division} />
            <Field
              label="Show date"
              value={client.showDate ? new Date(client.showDate).toLocaleDateString("en-GB") : null}
            />
          </>
        )}
      </section>

      <section className="card grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Occupation" value={client.occupation} />
        <Field
          label="General activity level"
          value={
            client.generalActivityLevel
              ? ACTIVITY_MULTIPLIERS[client.generalActivityLevel as keyof typeof ACTIVITY_MULTIPLIERS]?.label ??
                client.generalActivityLevel
              : null
          }
        />
        <Field label="Average daily steps" value={client.avgDailySteps} />
        <Field
          label="Resistance training"
          value={
            client.resistanceFreqPerWk
              ? `${client.resistanceFreqPerWk}x/week${
                  client.resistanceSessionMin ? `, ${client.resistanceSessionMin} min` : ""
                }`
              : null
          }
        />
        <Field
          label="Cardio"
          value={
            client.cardioFreqPerWk
              ? `${client.cardioType ?? "General"} — ${client.cardioFreqPerWk}x/week${
                  client.cardioSessionMin ? `, ${client.cardioSessionMin} min` : ""
                }`
              : null
          }
        />
        <Field
          label="Known current intake"
          value={
            client.currentCalorieIntake
              ? `${client.currentCalorieIntake} kcal/day (P${client.currentProteinG ?? "?"} F${
                  client.currentFatG ?? "?"
                } C${client.currentCarbG ?? "?"})`
              : null
          }
        />
      </section>

      <section className="card space-y-3">
        <h3 className="section-title">Recent dieting history</h3>
        <p className="whitespace-pre-wrap text-sm text-ink-700">
          {client.dietHistoryNotes || <span className="text-ink-300">None recorded.</span>}
        </p>
      </section>

      <section className="card space-y-3">
        <h3 className="section-title">Coach notes (private)</h3>
        <p className="whitespace-pre-wrap text-sm text-ink-700">
          {client.coachNotes || <span className="text-ink-300">None recorded.</span>}
        </p>
      </section>
    </div>
  );
}
