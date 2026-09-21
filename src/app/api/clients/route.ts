import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientInputSchema } from "@/lib/validation";
import { ACTIVITY_MULTIPLIERS, calculateRestingEnergy, calculateTdee, suggestActivityCategory } from "@/lib/calculations/energy";
import { oneLbPerWeekScenario } from "@/lib/calculations/deficit";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const archived = searchParams.get("archived") === "true";

  const clients = await prisma.client.findMany({
    where: {
      archived,
      ...(q ? { name: { contains: q } } : {})
    },
    orderBy: { name: "asc" },
    include: {
      maintenancePlans: { orderBy: { createdAt: "desc" }, take: 1 },
      dietPlans: { orderBy: { createdAt: "desc" }, take: 1 },
      checkIns: { orderBy: { date: "desc" }, take: 1 }
    }
  });

  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = clientInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const client = await prisma.client.create({ data });

  // Seed an initial maintenance plan using a suggested activity category,
  // and an initial 1 lb/week diet-plan scenario, so every new client has a
  // usable starting point the coach can immediately review and adjust.
  const suggestedCategory = suggestActivityCategory({
    avgDailySteps: data.avgDailySteps,
    resistanceFreqPerWk: data.resistanceFreqPerWk,
    cardioFreqPerWk: data.cardioFreqPerWk
  });
  const multiplierInfo = ACTIVITY_MULTIPLIERS[suggestedCategory];

  const restingResult = calculateRestingEnergy("MIFFLIN_ST_JEOR", {
    sex: data.sex,
    weightKg: data.currentWeightKg,
    heightCm: data.heightCm,
    age: data.age
  });
  const tdeeResult = calculateTdee(restingResult, multiplierInfo.multiplier);

  await prisma.maintenancePlan.create({
    data: {
      clientId: client.id,
      method: "MIFFLIN_ST_JEOR",
      activityMultiplier: multiplierInfo.multiplier,
      multiplierLabel: `${multiplierInfo.label} (${multiplierInfo.multiplier}x) — suggested starting point`,
      calculatedRestingKcal: restingResult.restingKcal,
      calculatedTdeeKcal: tdeeResult.tdeeKcal,
      changeType: "INITIAL"
    }
  });

  const scenario = oneLbPerWeekScenario(tdeeResult.tdeeKcal, data.currentWeightKg, restingResult.restingKcal);
  await prisma.dietPlan.create({
    data: {
      clientId: client.id,
      targetMode: "ONE_LB_PER_WEEK_SCENARIO",
      targetValue: null,
      maintenanceKcalUsed: scenario.maintenanceKcalUsed,
      bodyWeightKgUsed: scenario.bodyWeightKgUsed,
      dailyTargetKcal: scenario.dailyTargetKcal,
      weeklyTargetKcal: scenario.weeklyTargetKcal,
      dailyDeficitKcal: scenario.dailyDeficitKcal,
      deficitPercentOfTdee: scenario.deficitPercentOfTdee,
      weeklyLossPercentBodyweight: scenario.weeklyLossPercentBodyweight,
      isFlagged: scenario.flags.length > 0,
      flagReasons: JSON.stringify(scenario.flags),
      changeType: "INITIAL",
      reason: "Initial plan created automatically at intake using the standard 1 lb/week scenario. Review and adjust as needed."
    }
  });

  return NextResponse.json({ client }, { status: 201 });
}
