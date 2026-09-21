"use client";

import { useMemo, useState } from "react";
import type { FullClient } from "@/types/models";
import { daysUntil, weeksRemaining, calculateTargetWeightScenario } from "@/lib/calculations/contestPrep";
import { round, kgToLb } from "@/lib/calculations/units";

export default function ContestPrepTab({ client }: { client: FullClient }) {
  const [targetWeightKg, setTargetWeightKg] = useState(client.targetWeightKg ?? client.currentWeightKg);

  if (!client.showDate) {
    return <p className="text-ink-400">No show date set. Add one on the client&apos;s profile to see the countdown.</p>;
  }

  const showDate = new Date(client.showDate);
  const today = new Date();
  const days = daysUntil(showDate, today);
  const weeks = weeksRemaining(showDate, today);

  const scenario = useMemo(
    () => calculateTargetWeightScenario(client.currentWeightKg, targetWeightKg, showDate, today),
    [client.currentWeightKg, targetWeightKg, showDate, today]
  );

  const weightHistory = [...client.checkIns]
    .filter((c) => c.weightKg != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8">
      <section className="card space-y-2">
        <h2 className="section-title">Show countdown</h2>
        <div className="text-3xl font-bold text-apex-700">
          {days >= 0 ? `${days} days` : "Show date has passed"}
        </div>
        <div className="text-sm text-ink-500">
          {round(weeks, 1)} weeks remaining · {client.division ?? "Division not set"} · {showDate.toLocaleDateString("en-GB")}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">Target-weight scenario</h2>
        <p className="text-sm text-ink-500">
          The mathematical rate required to reach a target weight by the show date. This is planning
          arithmetic, not a prediction — and stage readiness cannot be judged from body weight alone.
        </p>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Target weight (kg)</label>
            <input
              type="number"
              step="0.1"
              className="input w-40"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(Number(e.target.value))}
            />
          </div>
          <div className="pb-2 text-xs text-ink-400">({round(kgToLb(targetWeightKg), 1)} lb)</div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-ink-500">Weight to lose</div>
            <div className="font-semibold">{round(scenario.weightToLoseKg, 2)} kg</div>
          </div>
          <div>
            <div className="text-ink-500">Weeks remaining</div>
            <div className="font-semibold">{round(scenario.weeksRemaining, 1)}</div>
          </div>
          <div>
            <div className="text-ink-500">Required weekly rate</div>
            <div className="font-semibold">
              {round(scenario.requiredWeeklyChangeKg, 2)} kg ({round(scenario.requiredWeeklyChangeLb, 2)} lb)
            </div>
          </div>
          <div>
            <div className="text-ink-500">≈ Required daily deficit</div>
            <div className="font-semibold">{Math.round(scenario.requiredDailyDeficitKcal)} kcal</div>
          </div>
        </div>

        {scenario.warnings.map((w, i) => (
          <div key={i} className={scenario.isAggressive ? "badge-critical block px-3 py-2 text-sm" : "badge-warning block px-3 py-2 text-sm"}>
            {w}
          </div>
        ))}
      </section>

      <section className="card space-y-2">
        <h2 className="section-title">Weight across prep</h2>
        {weightHistory.length === 0 ? (
          <p className="text-sm text-ink-400">No weigh-ins logged yet.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {weightHistory.slice(-10).map((c) => (
                <tr key={c.id}>
                  <td>{new Date(c.date).toLocaleDateString("en-GB")}</td>
                  <td>{c.weightKg} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-ink-400">
          Full weight, calorie and performance trends are on the Trends tab. Stage readiness is judged in
          person, not from these numbers.
        </p>
      </section>
    </div>
  );
}
