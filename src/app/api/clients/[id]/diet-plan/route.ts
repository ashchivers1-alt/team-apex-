import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dietPlanInputSchema } from "@/lib/validation";
import { computeDeficit, DeficitTargetMode } from "@/lib/calculations/deficit";
import { buildMaintenanceView } from "@/lib/clientCalculations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plans = await prisma.dietPlan.findMany({ where: { clientId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = dietPlanInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const latestMaintenance = await prisma.maintenancePlan.findFirst({
    where: { clientId: id },
    orderBy: { createdAt: "desc" }
  });
  if (!latestMaintenance) {
    return NextResponse.json({ error: "No maintenance plan exists yet for this client." }, { status: 400 });
  }

  const maintenanceView = buildMaintenanceView(client, latestMaintenance);
  const result = computeDeficit(
    data.targetMode as DeficitTargetMode,
    data.targetValue ?? null,
    maintenanceView.selectedMaintenanceKcal,
    client.currentWeightKg,
    maintenanceView.restingKcal
  );

  const plan = await prisma.dietPlan.create({
    data: {
      clientId: id,
      targetMode: data.targetMode,
      targetValue: data.targetValue ?? null,
      maintenanceKcalUsed: result.maintenanceKcalUsed,
      bodyWeightKgUsed: result.bodyWeightKgUsed,
      dailyTargetKcal: result.dailyTargetKcal,
      weeklyTargetKcal: result.weeklyTargetKcal,
      dailyDeficitKcal: result.dailyDeficitKcal,
      deficitPercentOfTdee: result.deficitPercentOfTdee,
      weeklyLossPercentBodyweight: result.weeklyLossPercentBodyweight,
      isFlagged: result.flags.length > 0,
      flagReasons: JSON.stringify(result.flags),
      changeType: data.changeType,
      reason: data.reason ?? null
    }
  });

  return NextResponse.json({ plan, result }, { status: 201 });
}
