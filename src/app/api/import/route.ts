import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Deliberately loose validation here (this only accepts the app's own
// export format) — the goal is structural sanity, not re-deriving every
// business rule a second time.
const importSchema = z.object({
  version: z.number(),
  data: z.object({
    clients: z.array(z.record(z.any())),
    maintenancePlans: z.array(z.record(z.any())),
    dietPlans: z.array(z.record(z.any())),
    macroDayTemplates: z.array(z.record(z.any())),
    weekdayAssignments: z.array(z.record(z.any())),
    checkIns: z.array(z.record(z.any()))
  })
});

function toDate(value: unknown): Date | null {
  return value ? new Date(value as string) : null;
}

/**
 * Full restore: replaces ALL current data with the contents of the
 * uploaded backup file. This is destructive and irreversible from within
 * the app — the UI must get explicit confirmation before calling this.
 */
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = importSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "This does not look like a Team Apexx backup file.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { data } = parsed.data;

  await prisma.$transaction(async (tx) => {
    // Delete in dependency order.
    await tx.checkIn.deleteMany();
    await tx.weekdayAssignment.deleteMany();
    await tx.macroDayTemplate.deleteMany();
    await tx.dietPlan.deleteMany();
    await tx.maintenancePlan.deleteMany();
    await tx.client.deleteMany();

    // This route only ever receives the app's own export format (validated
    // structurally above, not against every Prisma field) — cast past
    // Prisma's strict input types rather than re-declaring them here.
    for (const c of data.clients) {
      await tx.client.create({
        data: {
          ...c,
          createdAt: toDate(c.createdAt) ?? undefined,
          updatedAt: toDate(c.updatedAt) ?? undefined,
          bodyFatDate: toDate(c.bodyFatDate),
          targetDate: toDate(c.targetDate),
          showDate: toDate(c.showDate)
        } as unknown as Parameters<typeof tx.client.create>[0]["data"]
      });
    }
    for (const m of data.maintenancePlans) {
      await tx.maintenancePlan.create({
        data: { ...m, createdAt: toDate(m.createdAt) ?? undefined, overrideDate: toDate(m.overrideDate) } as unknown as Parameters<
          typeof tx.maintenancePlan.create
        >[0]["data"]
      });
    }
    for (const d of data.dietPlans) {
      await tx.dietPlan.create({
        data: { ...d, createdAt: toDate(d.createdAt) ?? undefined } as unknown as Parameters<typeof tx.dietPlan.create>[0]["data"]
      });
    }
    for (const t of data.macroDayTemplates) {
      await tx.macroDayTemplate.create({
        data: {
          ...t,
          createdAt: toDate(t.createdAt) ?? undefined,
          updatedAt: toDate(t.updatedAt) ?? undefined
        } as unknown as Parameters<typeof tx.macroDayTemplate.create>[0]["data"]
      });
    }
    for (const w of data.weekdayAssignments) {
      await tx.weekdayAssignment.create({ data: w as unknown as Parameters<typeof tx.weekdayAssignment.create>[0]["data"] });
    }
    for (const ci of data.checkIns) {
      await tx.checkIn.create({
        data: { ...ci, date: toDate(ci.date) ?? new Date(), createdAt: toDate(ci.createdAt) ?? undefined } as unknown as Parameters<
          typeof tx.checkIn.create
        >[0]["data"]
      });
    }
  });

  return NextResponse.json({ ok: true });
}
