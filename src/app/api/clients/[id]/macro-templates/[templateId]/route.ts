import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { macroDayTemplateInputSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { templateId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = macroDayTemplateInputSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const template = await prisma.macroDayTemplate.update({ where: { id: templateId }, data: parsed.data });
    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { templateId } = await params;
  try {
    await prisma.macroDayTemplate.delete({ where: { id: templateId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}
