import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkInInputSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checkIns = await prisma.checkIn.findMany({
    where: { clientId: id },
    orderBy: { date: "desc" }
  });
  return NextResponse.json({ checkIns });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = checkInInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, ...rest } = parsed.data;

  const checkIn = await prisma.checkIn.upsert({
    where: { clientId_date: { clientId: id, date: new Date(date) } },
    create: { clientId: id, date: new Date(date), ...rest },
    update: rest
  });

  if (rest.weightKg != null) {
    // Only update the client's "current weight" (used in live calculations)
    // if this check-in is the most recent one logged — a backdated entry
    // shouldn't override a more recent weigh-in.
    const mostRecent = await prisma.checkIn.findFirst({
      where: { clientId: id },
      orderBy: { date: "desc" }
    });
    if (mostRecent?.id === checkIn.id) {
      await prisma.client.update({ where: { id }, data: { currentWeightKg: rest.weightKg } });
    }
  }

  return NextResponse.json({ checkIn }, { status: 201 });
}
