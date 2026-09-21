"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FullClient } from "@/types/models";
import { GOAL_LABELS, GoalValue } from "@/lib/enums";
import { buildMaintenanceView } from "@/lib/clientCalculations";
import { trendSlope } from "@/lib/calculations/trends";
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

  const weightEntries = [...client.checkIns]
    .filter((c) => c.weightKg != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-28)
    .map((c) => ({ date: new Date(c.date), value: c.weightKg as number }));
  const slope = trendSlope(weightEntries);
  const observedWeeklyKg = slope.slopePerDay != null ? slope.slopePerDay * 7 : null;
  const plannedWeeklyKg = diet ? -((diet.dailyDeficitKcal * 7) / 7700) : null;

  const latestCheckIn = [...client.checkIns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
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

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-ink-400">Selected maintenance</div>
          <div className="font-medium">{maintenance ? `${Math.round(maintenance.selectedMaintenanceKcal)} kcal` : "—"}</div>
        </div>
        <div>
          <div className="text-ink-400">Current target</div>
          <div className="font-medium">{diet ? `${Math.round(diet.dailyTargetKcal)} kcal` : "—"}</div>
        </div>
        <div>
          <div className="text-ink-400">Planned weekly</div>
          <div className="font-medium">{plannedWeeklyKg != null ? `${round(plannedWeeklyKg, 2)} kg` : "—"}</div>
        </div>
        <div>
          <div className="text-ink-400">Observed weekly</div>
          <div className="font-medium">{observedWeeklyKg != null ? `${round(observedWeeklyKg, 2)} kg` : "Not enough data"}</div>
        </div>
      </div>

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
