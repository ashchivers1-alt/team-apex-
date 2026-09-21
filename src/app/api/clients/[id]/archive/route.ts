import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({ archived: z.boolean() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "archived (boolean) is required" }, { status: 400 });
  }
  try {
    const client = await prisma.client.update({ where: { id }, data: { archived: parsed.data.archived } });
    return NextResponse.json({ client });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}
