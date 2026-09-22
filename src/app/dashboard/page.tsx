"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FullClient } from "@/types/models";
import { GOAL_LABELS, GoalValue } from "@/lib/enums";
import { buildMaintenanceView } from "@/lib/clientCalculations";
import { trendSlope, rollingAverage } from "@/lib/calculations/trends";
import { calculateObservedTdee } from "@/lib/calculations/recalibration";
import { daysUntil } from "@/lib/calculations/contestPrep";
import { round } from "@/lib/calculations/units";

export default function DashboardPage() {
  const [clients, setClients] = useState<FullClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const listRes = await fetch("/api/clients?archived=false");
      const listData = await listRes.json();
      const full = await Promise.all(
        listData.clients.map((c: { id: string }) => fetch(`/api/clients/${c.id}`).then((r) => r.json()))
      );
      setClients(full.map((f) => f.client));
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-ink-400">Loading dashboard...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      {clients.length === 0 ? (
        <p className="text-ink-400">
          No active clients yet.{" "}
          <Link href="/clients/new" className="text-apex-600 hover:underline">
            Create your first client
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <DashboardCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardCard({ client }: { client: FullClient }) {
  const maintenancePlan = client.maintenancePlans[0];
  const maintenance = maintenancePlan ? buildMaintenanceView(client, maintenancePlan) : null;
  const diet = client.dietPlans[0];

  const weightEntriesAll = [...client.checkIns]
    .filter((c) => c.weightKg != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((c) => ({ date: new Date(c.date), value: c.weightKg as number }));
  const weightEntries = weightEntriesAll.slice(-28);
  const slope = trendSlope(weightEntries);
  const observedWeeklyKg = slope.slopePerDay != null ? slope.slopePerDay * 7 : null;
  const plannedWeeklyKg = diet ? -((diet.dailyDeficitKcal * 7) / 7700) : null;

  const latestCheckIn = [...client.checkIns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  const referenceDate = latestCheckIn ? new Date(latestCheckIn.date) : new Date();

  const intakeEntries = client.checkIns
    .filter((c) => c.actualCalorieIntake != null)
    .map((c) => ({ date: new Date(c.date), value: c.actualCalorieIntake as number }));
  const actualIntake = rollingAverage(intakeEntries, referenceDate, 7);

  const periodStart = new Date(referenceDate.getTime() - 20 * 86_400_000);
  const recalibration = calculateObservedTdee({
    periodStart,
    periodEnd: referenceDate,
    intakeEntries: intakeEntries.filter((e) => e.date >= periodStart && e.date <= referenceDate),
    weightEntries: weightEntriesAll.filter((e) => e.date >= periodStart && e.date <= referenceDate)
  });
  const daysSinceCheckIn = latestCheckIn
    ? Math.round((Date.now() - new Date(latestCheckIn.date).getTime()) / 86_400_000)
    : null;

  const flags: string[] = [];
  if (daysSinceCheckIn == null) flags.push("No check-ins logged yet");
  else if (daysSinceCheckIn > 9) flags.push(`No check-in in ${daysSinceCheckIn} days`);
  if (diet?.isFlagged) flags.push("Current diet plan was flagged for review");
  if (slope.warning) flags.push("Weight trend: insufficient data for a reliable slope");

  return (
    <Link href={`/clients/${client.id}`} className="card block space-y-3 hover:border-apex-300">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-ink-900">{client.name}</h3>
        {client.archived && <span className="badge bg-ink-200 text-ink-700">Archived</span>}
      </div>
      <p className="text-xs text-ink-500">{GOAL_LABELS[client.goal as GoalValue] ?? client.goal}</p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-400">
            <th className="text-left font-normal"></th>
            <th className="text-right font-normal">Planned</th>
            <th className="text-right font-normal">Actual</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-ink-500">Maintenance</td>
            <td className="text-right font-medium">
              {maintenance ? `${Math.round(maintenance.selectedMaintenanceKcal)}` : "—"}
            </td>
            <td className="text-right font-medium">
              {recalibration.observedTdeeKcal != null && recalibration.isReliable
                ? Math.round(recalibration.observedTdeeKcal)
                : "—"}
            </td>
          </tr>
          <tr>
            <td className="text-ink-500">Calories/day</td>
            <td className="text-right font-medium">{diet ? Math.round(diet.dailyTargetKcal) : "—"}</td>
            <td className="text-right font-medium">
              {actualIntake.average != null ? Math.round(actualIntake.average) : "—"}
              {actualIntake.average != null && (
                <span className="ml-1 text-xs text-ink-400">({actualIntake.count}/7d)</span>
              )}
            </td>
          </tr>
          <tr>
            <td className="text-ink-500">Weekly change</td>
            <td className="text-right font-medium">{plannedWeeklyKg != null ? `${round(plannedWeeklyKg, 2)} kg` : "—"}</td>
            <td className="text-right font-medium">
              {observedWeeklyKg != null ? `${round(observedWeeklyKg, 2)} kg` : "—"}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="text-xs text-ink-500">
        Latest check-in: {latestCheckIn ? new Date(latestCheckIn.date).toLocaleDateString("en-GB") : "None yet"}
      </div>

      {client.isCompetitor && client.showDate && (
        <div className="text-xs font-medium text-apex-700">
          {Math.max(daysUntil(new Date(client.showDate), new Date()), 0)} days to show
        </div>
      )}

      {flags.length > 0 && (
        <div className="space-y-1">
          {flags.map((f, i) => (
            <div key={i} className="badge-warning block px-2 py-1 text-xs">
              {f}
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
