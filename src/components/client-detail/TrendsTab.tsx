"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import type { FullClient, MacroChangeLog } from "@/types/models";
import { rollingAverage, compareEquivalentPeriods } from "@/lib/calculations/trends";
import { round } from "@/lib/calculations/units";
import { KCAL_PER_KG_FAT } from "@/lib/calculations/deficit";
import { activeDietPlanForDate, dietPlanHistory, DietPlanComparison } from "@/lib/clientCalculations";

const COLORS = {
  weight: "#2740d6",
  rollingAvg: "#f59e0b",
  calories: "#10b981",
  target: "#94a3b8"
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function TrendsTab({ client }: { client: FullClient }) {
  const checkIns = useMemo(
    () => [...client.checkIns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [client.checkIns]
  );

  const weightEntries = checkIns
    .filter((c) => c.weightKg != null)
    .map((c) => ({ date: new Date(c.date), value: c.weightKg as number }));

  // One combined series keyed by check-in date, so weight and actual
  // calories sit on the same timeline — the point being to see intake
  // changes and the bodyweight response to them together, not on two
  // separate charts the coach has to mentally line up by eye.
  const combinedSeries = checkIns.map((c) => {
    const date = new Date(c.date);
    const rolling = rollingAverage(weightEntries, date, 7);
    return {
      date: formatDate(date),
      weight: c.weightKg != null ? round(c.weightKg, 2) : null,
      rollingAvg: rolling.average != null ? round(rolling.average, 2) : null,
      calories: c.actualCalorieIntake ?? null,
      target: activeDietPlanForDate(client, date)?.dailyTargetKcal ?? null
    };
  });

  const hasWeightData = weightEntries.length > 0;
  const hasCalorieData = checkIns.some((c) => c.actualCalorieIntake != null);

  const latestDate = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].date : new Date();
  const weightComparison = compareEquivalentPeriods(weightEntries, latestDate, 7);

  const timelineEvents = useMemo(() => buildTimelineEvents(client), [client]);

  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="section-title mb-1">Weight &amp; calorie trend</h2>
        <p className="mb-3 text-sm text-ink-500">
          Bodyweight and actual calorie intake on the same timeline, so you can see the two lines move against
          each other — intake drops here, weight follows a bit later.
        </p>
        {!hasWeightData && !hasCalorieData ? (
          <p className="text-sm text-ink-400">No weight or intake data logged yet.</p>
        ) : (
          <>
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <ComposedChart data={combinedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="weight"
                    domain={["dataMin - 2", "dataMax + 2"]}
                    tick={{ fontSize: 12 }}
                    width={45}
                    label={{ value: "kg", angle: -90, position: "insideLeft", fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="calories"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    width={55}
                    label={{ value: "kcal", angle: 90, position: "insideRight", fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weight"
                    name="Weight (kg)"
                    stroke={COLORS.weight}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="rollingAvg"
                    name="7-day average weight"
                    stroke={COLORS.rollingAvg}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="calories"
                    type="monotone"
                    dataKey="calories"
                    name="Actual intake (kcal)"
                    stroke={COLORS.calories}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                  <Line
                    yAxisId="calories"
                    type="stepAfter"
                    dataKey="target"
                    name="Prescribed target (kcal)"
                    stroke={COLORS.target}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-ink-50 p-3">
                <div className="text-ink-500">This 7-day average weight</div>
                <div className="font-semibold">
                  {weightComparison.current.average != null ? `${round(weightComparison.current.average, 1)} kg` : "—"}{" "}
                  <span className="text-xs text-ink-400">({weightComparison.current.count}/7 weigh-ins)</span>
                </div>
              </div>
              <div className="rounded-lg bg-ink-50 p-3">
                <div className="text-ink-500">Previous 7-day average weight</div>
                <div className="font-semibold">
                  {weightComparison.previous.average != null ? `${round(weightComparison.previous.average, 1)} kg` : "—"}{" "}
                  <span className="text-xs text-ink-400">({weightComparison.previous.count}/7 weigh-ins)</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-500">{weightComparison.note}</p>
          </>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Diet &amp; macro changes</h2>
        <p className="text-sm text-ink-500">
          Every change to the diet target or a diet type's own macros, most recent first — what it was before,
          what it became, and the deficit/estimated rate of loss that comes with it.
        </p>
        {timelineEvents.length === 0 ? (
          <p className="text-sm text-ink-400">No diet or macro changes recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {timelineEvents.map((event, i) =>
              event.kind === "diet" ? (
                <DietTimelineCard key={`diet-${i}`} comparison={event.comparison} />
              ) : event.kind === "macro" ? (
                <MacroTimelineCard key={`macro-${i}`} log={event.log} />
              ) : (
                <NoteTimelineCard key={`note-${i}`} date={event.date} note={event.note} />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

type TimelineEvent =
  | { kind: "diet"; date: Date; comparison: DietPlanComparison }
  | { kind: "macro"; date: Date; log: MacroChangeLog }
  | { kind: "note"; date: Date; note: string };

function buildTimelineEvents(client: FullClient): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...dietPlanHistory(client).map((c) => ({ kind: "diet" as const, date: new Date(c.current.createdAt), comparison: c })),
    ...client.macroChangeLogs.map((log) => ({ kind: "macro" as const, date: new Date(log.createdAt), log })),
    ...client.checkIns
      .filter((c) => c.planChangeNotes)
      .map((c) => ({ kind: "note" as const, date: new Date(c.date), note: c.planChangeNotes as string }))
  ];
  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** One "before → after (delta)" line within a timeline diff card. */
function TimelineDiffRow({
  label,
  before,
  after,
  unit,
  decimals = 0
}: {
  label: string;
  before: number;
  after: number;
  unit: string;
  decimals?: number;
}) {
  const beforeR = round(before, decimals);
  const afterR = round(after, decimals);
  const delta = round(after - before, decimals);
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-sm">
        {beforeR} → <span className="font-semibold">{afterR}</span> {unit}
        {Math.abs(delta) > (decimals === 0 ? 0.5 : 0.005) && (
          <span className={delta > 0 ? "ml-1 text-emerald-600" : "ml-1 text-red-600"}>
            ({delta > 0 ? "+" : ""}
            {delta})
          </span>
        )}
      </div>
    </div>
  );
}

function DietTimelineCard({ comparison: c }: { comparison: DietPlanComparison }) {
  const prevWeeklyLossKg = (c.previous.dailyDeficitKcal * 7) / KCAL_PER_KG_FAT;
  const newWeeklyLossKg = (c.current.dailyDeficitKcal * 7) / KCAL_PER_KG_FAT;
  return (
    <div className="rounded-lg border border-ink-100 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-ink-800">{new Date(c.current.createdAt).toLocaleDateString("en-GB")}</span>
        <span className="badge-info">Diet target{c.current.reason ? ` — ${c.current.reason}` : ""}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TimelineDiffRow label="Calories" before={c.previous.dailyTargetKcal} after={c.current.dailyTargetKcal} unit="kcal/day" />
        <TimelineDiffRow
          label="Deficit"
          before={c.previous.deficitPercentOfTdee}
          after={c.current.deficitPercentOfTdee}
          unit="% of TDEE"
          decimals={1}
        />
        <TimelineDiffRow
          label="Estimated rate of loss"
          before={prevWeeklyLossKg}
          after={newWeeklyLossKg}
          unit="kg/wk"
          decimals={2}
        />
      </div>
    </div>
  );
}

function MacroTimelineCard({ log }: { log: MacroChangeLog }) {
  return (
    <div className="rounded-lg border border-ink-100 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-ink-800">{new Date(log.createdAt).toLocaleDateString("en-GB")}</span>
        <span className="badge-info">{log.templateName}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TimelineDiffRow label="Calories" before={log.previousCalorieKcal} after={log.newCalorieKcal} unit="kcal" />
        <TimelineDiffRow label="Protein" before={log.previousProteinG} after={log.newProteinG} unit="g" />
        <TimelineDiffRow label="Fat" before={log.previousFatG} after={log.newFatG} unit="g" />
        <TimelineDiffRow label="Carbs" before={log.previousCarbG} after={log.newCarbG} unit="g" />
      </div>
    </div>
  );
}

function NoteTimelineCard({ date, note }: { date: Date; note: string }) {
  return (
    <div className="rounded-lg bg-ink-50 p-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-ink-800">{date.toLocaleDateString("en-GB")}</span>
        <span className="badge bg-ink-100 text-ink-500">Note</span>
      </div>
      <div className="text-ink-600">{note}</div>
    </div>
  );
}
