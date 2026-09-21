import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { weekdayAssignmentInputSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assignments = await prisma.weekdayAssignment.findMany({
    where: { clientId: id },
    include: { template: true }
  });
  return NextResponse.json({ assignments });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = weekdayAssignmentInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.assignments.map((a) =>
      prisma.weekdayAssignment.upsert({
        where: { clientId_weekday: { clientId: id, weekday: a.weekday } },
        create: { clientId: id, weekday: a.weekday, templateId: a.templateId },
        update: { templateId: a.templateId }
      })
    )
  );

  const assignments = await prisma.weekdayAssignment.findMany({
    where: { clientId: id },
    include: { template: true }
  });
  return NextResponse.json({ assignments });
}
