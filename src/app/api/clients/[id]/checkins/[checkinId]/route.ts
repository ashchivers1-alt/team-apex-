import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkInInputSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checkinId: string }> }
) {
  const { checkinId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = checkInInputSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, ...rest } = parsed.data;
  try {
    const checkIn = await prisma.checkIn.update({
      where: { id: checkinId },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) }
    });
    return NextResponse.json({ checkIn });
  } catch {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; checkinId: string }> }
) {
  const { checkinId } = await params;
  try {
    await prisma.checkIn.delete({ where: { id: checkinId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
  }
}
