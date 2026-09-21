import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientInputSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      maintenancePlans: { orderBy: { createdAt: "desc" } },
      dietPlans: { orderBy: { createdAt: "desc" } },
      macroDayTemplates: { orderBy: { createdAt: "asc" } },
      weekdayAssignments: { include: { template: true } },
      checkIns: { orderBy: { date: "desc" } }
    }
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  return NextResponse.json({ client });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = clientInputSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const client = await prisma.client.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ client });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}
