"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Client, MaintenancePlan, DietPlan, CheckIn } from "@prisma/client";
import { GOAL_LABELS, GoalValue } from "@/lib/enums";
import { buildMaintenanceView } from "@/lib/clientCalculations";

type ClientRow = Client & {
  maintenancePlans: MaintenancePlan[];
  dietPlans: DietPlan[];
  checkIns: CheckIn[];
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ archived: String(archived) });
    if (q) params.set("q", q);
    const res = await fetch(`/api/clients?${params.toString()}`);
    const data = await res.json();
    setClients(data.clients ?? []);
    setLoading(false);
  }, [q, archived]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Link href="/clients/new" className="btn-primary">
          + New client
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Goal</th>
              <th>Selected maintenance</th>
              <th>Current target</th>
              <th>Latest check-in</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && clients.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-400">
                  No clients found.
                </td>
              </tr>
            )}
            {clients.map((c) => {
              const plan = c.maintenancePlans[0];
              const maintenance = plan ? buildMaintenanceView(c, plan) : null;
              const diet = c.dietPlans[0];
              const lastCheckIn = c.checkIns[0];
              return (
                <tr key={c.id} className="hover:bg-ink-50">
                  <td>
                    <Link href={`/clients/${c.id}`} className="font-medium text-apex-700 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td>{GOAL_LABELS[c.goal as GoalValue] ?? c.goal}</td>
                  <td>{maintenance ? `${Math.round(maintenance.selectedMaintenanceKcal)} kcal` : "—"}</td>
                  <td>{diet ? `${Math.round(diet.dailyTargetKcal)} kcal/day` : "—"}</td>
                  <td>{lastCheckIn ? new Date(lastCheckIn.date).toLocaleDateString("en-GB") : "None yet"}</td>
                  <td className="text-right">
                    <Link href={`/clients/${c.id}`} className="text-sm text-apex-600 hover:underline">
                      Open →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
