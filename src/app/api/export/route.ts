import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [clients, maintenancePlans, dietPlans, macroDayTemplates, weekdayAssignments, checkIns, macroChangeLogs] =
    await Promise.all([
      prisma.client.findMany(),
      prisma.maintenancePlan.findMany(),
      prisma.dietPlan.findMany(),
      prisma.macroDayTemplate.findMany(),
      prisma.weekdayAssignment.findMany(),
      prisma.checkIn.findMany(),
      prisma.macroChangeLog.findMany()
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: { clients, maintenancePlans, dietPlans, macroDayTemplates, weekdayAssignments, checkIns, macroChangeLogs }
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="team-apexx-backup-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
}
