import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { macroDayTemplateInputSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const templates = await prisma.macroDayTemplate.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = macroDayTemplateInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const template = await prisma.macroDayTemplate.create({
    data: { clientId: id, ...parsed.data }
  });
  return NextResponse.json({ template }, { status: 201 });
}
