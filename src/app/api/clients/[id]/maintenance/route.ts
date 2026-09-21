import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { maintenancePlanInputSchema } from "@/lib/validation";
import { calculateRestingEnergy, Sex } from "@/lib/calculations/energy";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plans = await prisma.maintenancePlan.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = maintenancePlanInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (data.method === "LEAN_MASS_KATCH_MCARDLE" && client.bodyFatPercent == null) {
    return NextResponse.json(
      { error: "The lean-mass method requires a body-fat percentage estimate on the client profile." },
      { status: 400 }
    );
  }

  const restingResult = calculateRestingEnergy(data.method, {
    sex: client.sex as Sex,
    weightKg: client.currentWeightKg,
    heightCm: client.heightCm,
    age: client.age,
    bodyFatPercent: client.bodyFatPercent
  });
  const tdeeKcal = restingResult.restingKcal * data.activityMultiplier;

  const plan = await prisma.maintenancePlan.create({
    data: {
      clientId: id,
      method: data.method,
      activityMultiplier: data.activityMultiplier,
      multiplierLabel: data.multiplierLabel,
      calculatedRestingKcal: restingResult.restingKcal,
      calculatedTdeeKcal: tdeeKcal,
      overrideKcal: data.overrideKcal ?? null,
      overrideReason: data.overrideReason ?? null,
      overrideDate: data.overrideDate ?? null,
      changeType: data.changeType,
      notes: data.notes ?? null
    }
  });

  return NextResponse.json({ plan }, { status: 201 });
}
