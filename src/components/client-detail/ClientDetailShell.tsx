"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FullClient } from "@/types/models";
import { GOAL_LABELS, GoalValue } from "@/lib/enums";
import ProfileTab from "./ProfileTab";
import MaintenanceTab from "./MaintenanceTab";
import MacrosTab from "./MacrosTab";
import CheckInsTab from "./CheckInsTab";
import TrendsTab from "./TrendsTab";
import RecalibrationTab from "./RecalibrationTab";
import ContestPrepTab from "./ContestPrepTab";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "maintenance", label: "Maintenance & diet" },
  { key: "macros", label: "Macros" },
  { key: "checkins", label: "Check-ins" },
  { key: "trends", label: "Trends" },
  { key: "decisions", label: "Recalibration & decisions" },
  { key: "contest", label: "Contest prep" }
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ClientDetailShell({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [client, setClient] = useState<FullClient | null>(null);
  const [tab, setTab] = useState<TabKey>("profile");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setClient(data.client);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleArchive() {
    if (!client) return;
    await fetch(`/api/clients/${clientId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !client.archived })
    });
    refresh();
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete ${client?.name}? This cannot be undone.`)) return;
    await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    router.push("/clients");
  }

  if (loading) return <p className="text-ink-400">Loading client...</p>;
  if (notFound || !client) return <p className="text-ink-400">Client not found.</p>;

  const visibleTabs = TABS.filter((t) => t.key !== "contest" || client.isCompetitor);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            {client.archived && <span className="badge bg-ink-200 text-ink-700">Archived</span>}
          </div>
          <p className="text-sm text-ink-500">
            {GOAL_LABELS[client.goal as GoalValue] ?? client.goal}
            {client.isCompetitor && client.division ? ` · ${client.division}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/clients/${clientId}/summary`} className="btn-secondary" target="_blank">
            Printable summary
          </Link>
          <button className="btn-secondary" onClick={toggleArchive}>
            {client.archived ? "Unarchive" : "Archive"}
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="no-print mb-6 flex flex-wrap gap-1 border-b border-ink-100">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.key ? "border-b-2 border-apex-600 text-apex-700" : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab client={client} onChanged={refresh} />}
      {tab === "maintenance" && <MaintenanceTab client={client} onChanged={refresh} />}
      {tab === "macros" && <MacrosTab client={client} onChanged={refresh} />}
      {tab === "checkins" && <CheckInsTab client={client} onChanged={refresh} />}
      {tab === "trends" && <TrendsTab client={client} />}
      {tab === "decisions" && <RecalibrationTab client={client} onChanged={refresh} />}
      {tab === "contest" && client.isCompetitor && <ContestPrepTab client={client} />}
    </div>
  );
}
