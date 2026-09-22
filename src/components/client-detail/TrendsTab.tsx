"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import type { FullClient } from "@/types/models";
import { rollingAverage, compareEquivalentPeriods } from "@/lib/calculations/trends";
import { round } from "@/lib/calculations/units";
import { activeDietPlanForDate } from "@/lib/clientCalculations";

const COLORS = {
  weight: "#2740d6",
  rollingAvg: "#f59e0b",
  calories: "#10b981",
  target: "#94a3b8",
  steps: "#7c3aed"
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

  const weightSeries = weightEntries.map((e) => {
    const rolling = rollingAverage(weightEntries, e.date, 7);
    return {
      date: formatDate(e.date),
      weight: round(e.value, 2),
      rollingAvg: rolling.average != null ? round(rolling.average, 2) : null,
      rollingCount: rolling.count
    };
  });

  const calorieSeries = checkIns
    .filter((c) => c.actualCalorieIntake != null)
    .map((c) => ({
      date: formatDate(new Date(c.date)),
      calories: c.actualCalorieIntake as number,
      target: activeDietPlanForDate(client, new Date(c.date))?.dailyTargetKcal ?? null
    }));

  const stepsSeries = checkIns
    .filter((c) => c.steps != null)
    .map((c) => ({ date: formatDate(new Date(c.date)), steps: c.steps as number }));

  const latestDate = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].date : new Date();
  const weightComparison = compareEquivalentPeriods(weightEntries, latestDate, 7);

  const timeline = buildPlanTimeline(client);

  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="section-title mb-1">Weight trend</h2>
        <p className="mb-3 text-sm text-ink-500">
          Daily weigh-ins with a trailing 7-day rolling average. The average shown is only as reliable as the
          number of contributing weigh-ins, shown alongside it.
        </p>
        {weightSeries.length === 0 ? (
          <p className="text-sm text-ink-400">No weight data logged yet.</p>
        ) : (
          <>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={weightSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 12 }} width={40} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke={COLORS.weight} dot={{ r: 2 }} />
                  <Line
                    type="monotone"
                    dataKey="rollingAvg"
                    name="7-day average"
                    stroke={COLORS.rollingAvg}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-ink-50 p-3">
                <div className="text-ink-500">This 7-day average</div>
                <div className="font-semibold">
                  {weightComparison.current.average != null ? `${round(weightComparison.current.average, 1)} kg` : "—"}{" "}
                  <span className="text-xs text-ink-400">({weightComparison.current.count}/7 weigh-ins)</span>
                </div>
              </div>
              <div className="rounded-lg bg-ink-50 p-3">
                <div className="text-ink-500">Previous 7-day average</div>
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

      <section className="card">
        <h2 className="section-title mb-1">Calorie intake</h2>
        <p className="mb-3 text-sm text-ink-500">Reported actual intake vs. the prescribed target on each date.</p>
        {calorieSeries.length === 0 ? (
          <p className="text-sm text-ink-400">No intake data logged yet.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={calorieSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={50} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calories" name="Actual (kcal)" stroke={COLORS.calories} dot={{ r: 2 }} />
                <Line
                  type="stepAfter"
                  dataKey="target"
                  name="Prescribed target (kcal)"
                  stroke={COLORS.target}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="section-title mb-1">Steps</h2>
        {stepsSeries.length === 0 ? (
          <p className="text-sm text-ink-400">No step data logged yet.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={stepsSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={50} />
                <Tooltip />
                <Bar dataKey="steps" name="Steps" fill={COLORS.steps} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="section-title mb-3">Plan-change timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-ink-400">No plan changes recorded yet.</p>
        ) : (
          <ol className="space-y-3 border-l-2 border-ink-100 pl-4">
            {timeline.map((item, i) => (
              <li key={i} className="text-sm">
                <div className="font-medium text-ink-800">
                  {item.date.toLocaleDateString("en-GB")} — {item.label}
                </div>
                <div className="text-ink-500">{item.detail}</div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function buildPlanTimeline(client: FullClient) {
  const items: { date: Date; label: string; detail: string }[] = [];
  client.maintenancePlans.forEach((p) => {
    items.push({
      date: new Date(p.createdAt),
      label: `Maintenance ${p.changeType === "INITIAL" ? "set" : "changed"}`,
      detail: `${Math.round(p.overrideKcal ?? p.calculatedTdeeKcal)} kcal/day${
        p.overrideKcal ? ` (override: ${p.overrideReason})` : ""
      }`
    });
  });
  client.dietPlans.forEach((p) => {
    items.push({
      date: new Date(p.createdAt),
      label: `Diet target ${p.changeType === "INITIAL" ? "set" : "changed"}`,
      detail: `${Math.round(p.dailyTargetKcal)} kcal/day${p.reason ? ` — ${p.reason}` : ""}`
    });
  });
  client.checkIns
    .filter((c) => c.planChangeNotes)
    .forEach((c) => {
      items.push({
        date: new Date(c.date),
        label: "Diet/cardio/plan change noted at check-in",
        detail: c.planChangeNotes as string
      });
    });
  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}
