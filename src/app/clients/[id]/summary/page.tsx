import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildMaintenanceView } from "@/lib/clientCalculations";
import { calculateMacroPlan, GramsMode } from "@/lib/calculations/macros";
import { GOAL_LABELS, GoalValue, WEEKDAY_LABELS } from "@/lib/enums";
import PrintButton from "@/components/PrintButton";

export default async function ClientSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      maintenancePlans: { orderBy: { createdAt: "desc" }, take: 1 },
      dietPlans: { orderBy: { createdAt: "desc" }, take: 1 },
      macroDayTemplates: true,
      weekdayAssignments: { include: { template: true } }
    }
  });

  if (!client) notFound();

  const maintenance = client.maintenancePlans[0] ? buildMaintenanceView(client, client.maintenancePlans[0]) : null;
  const diet = client.dietPlans[0] ?? null;

  const scheduleByDay = WEEKDAY_LABELS.map((label, weekday) => {
    const assignment = client.weekdayAssignments.find((a) => a.weekday === weekday);
    return { label, template: assignment?.template ?? null };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Apexx — Client Plan Summary</h1>
        <PrintButton />
      </div>

      <section className="card">
        <h2 className="section-title mb-2">{client.name}</h2>
        <p className="text-sm text-ink-600">
          Goal: {GOAL_LABELS[client.goal as GoalValue] ?? client.goal}
          {client.isCompetitor && client.showDate
            ? ` · Show date: ${new Date(client.showDate).toLocaleDateString("en-GB")}`
            : ""}
        </p>
      </section>

      {maintenance && (
        <section className="card">
          <h3 className="section-title mb-2">Calorie targets</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-ink-500">Estimated maintenance</div>
              <div className="font-semibold">{Math.round(maintenance.selectedMaintenanceKcal)} kcal/day</div>
            </div>
            <div>
              <div className="text-ink-500">Current daily target</div>
              <div className="font-semibold">{diet ? Math.round(diet.dailyTargetKcal) : "—"} kcal/day</div>
            </div>
            <div>
              <div className="text-ink-500">Weekly target</div>
              <div className="font-semibold">{diet ? Math.round(diet.weeklyTargetKcal) : "—"} kcal/week</div>
            </div>
          </div>
        </section>
      )}

      {client.macroDayTemplates.length > 0 && (
        <section className="card">
          <h3 className="section-title mb-2">Macro schedule</h3>
          <table className="table-base">
            <thead>
              <tr>
                <th>Day</th>
                <th>Plan</th>
                <th>Calories</th>
                <th>Protein</th>
                <th>Fat</th>
                <th>Carbs</th>
              </tr>
            </thead>
            <tbody>
              {scheduleByDay.map(({ label, template }) => {
                const macro = template
                  ? calculateMacroPlan({
                      calorieBudgetKcal: template.calorieKcal,
                      bodyWeightKg: client.currentWeightKg,
                      proteinMode: template.proteinMode as GramsMode,
                      proteinValue: template.proteinValue,
                      fatMode: template.fatMode as GramsMode,
                      fatValue: template.fatValue,
                      carbOverrideG: template.carbOverrideG
                    })
                  : null;
                return (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{template?.name ?? "—"}</td>
                    <td>{template ? Math.round(template.calorieKcal) : "—"}</td>
                    <td>{macro ? `${Math.round(macro.proteinG)}g` : "—"}</td>
                    <td>{macro ? `${Math.round(macro.fatG)}g` : "—"}</td>
                    <td>{macro ? `${Math.round(macro.carbG)}g` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h3 className="section-title mb-2">Activity targets</h3>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-ink-500">Daily steps</div>
            <div className="font-semibold">{client.avgDailySteps ?? "—"}</div>
          </div>
          <div>
            <div className="text-ink-500">Resistance training</div>
            <div className="font-semibold">
              {client.resistanceFreqPerWk ? `${client.resistanceFreqPerWk}x/week` : "—"}
            </div>
          </div>
          <div>
            <div className="text-ink-500">Cardio</div>
            <div className="font-semibold">
              {client.cardioFreqPerWk ? `${client.cardioType ?? "General"} ${client.cardioFreqPerWk}x/week` : "—"}
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-ink-400">
        Generated by Team Apexx coaching. Estimates only — actual results vary by adherence, training response
        and individual variation.
      </p>
    </div>
  );
}
