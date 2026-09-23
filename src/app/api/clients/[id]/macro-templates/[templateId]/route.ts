import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { macroDayTemplateInputSchema } from "@/lib/validation";
import { calculateMacroPlan, GramsMode } from "@/lib/calculations/macros";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id, templateId } = await params;
  const json = await request.json().catch(() => null);
  const parsed = macroDayTemplateInputSchema.partial().safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing, client] = await Promise.all([
    prisma.macroDayTemplate.findUnique({ where: { id: templateId } }),
    prisma.client.findUnique({ where: { id } })
  ]);
  if (!existing || !client) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const merged = { ...existing, ...parsed.data };
  const before = calculateMacroPlan({
    calorieBudgetKcal: existing.calorieKcal,
    bodyWeightKg: client.currentWeightKg,
    proteinMode: existing.proteinMode as GramsMode,
    proteinValue: existing.proteinValue,
    fatMode: existing.fatMode as GramsMode,
    fatValue: existing.fatValue,
    carbOverrideG: existing.carbOverrideG
  });
  const after = calculateMacroPlan({
    calorieBudgetKcal: merged.calorieKcal,
    bodyWeightKg: client.currentWeightKg,
    proteinMode: merged.proteinMode as GramsMode,
    proteinValue: merged.proteinValue,
    fatMode: merged.fatMode as GramsMode,
    fatValue: merged.fatValue,
    carbOverrideG: merged.carbOverrideG
  });

  // Only worth a history entry when the actual numbers moved — a rename or
  // a no-op save shouldn't clutter the Trends timeline.
  const changed =
    Math.round(before.totalKcal) !== Math.round(after.totalKcal) ||
    Math.round(before.proteinG) !== Math.round(after.proteinG) ||
    Math.round(before.fatG) !== Math.round(after.fatG) ||
    Math.round(before.carbG) !== Math.round(after.carbG);

  try {
    const template = await prisma.$transaction(async (tx) => {
      const updated = await tx.macroDayTemplate.update({ where: { id: templateId }, data: parsed.data });
      if (changed) {
        await tx.macroChangeLog.create({
          data: {
            clientId: id,
            templateId,
            templateName: merged.name,
            previousCalorieKcal: before.totalKcal,
            previousProteinG: before.proteinG,
            previousFatG: before.fatG,
            previousCarbG: before.carbG,
            newCalorieKcal: after.totalKcal,
            newProteinG: after.proteinG,
            newFatG: after.fatG,
            newCarbG: after.carbG
          }
        });
      }
      return updated;
    });
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
