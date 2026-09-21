// Glue between stored Client/MaintenancePlan/DietPlan records and the
// pure calculation library. Kept separate from API route handlers so the
// composition logic is unit-testable independent of Prisma/Next.

import type { Client, MaintenancePlan, DietPlan } from "@prisma/client";
import type { FullClient } from "@/types/models";
import { calculateRestingEnergy, calculateTdee, RestingEnergyMethod, Sex } from "./calculations/energy";
import { computeDeficit, DeficitTargetMode } from "./calculations/deficit";

export interface MaintenanceView {
  method: RestingEnergyMethod;
  equationLabel: string;
  assumptions: string[];
  activityMultiplier: number;
  multiplierLabel: string;
  restingKcal: number;
  equationTdeeKcal: number;
  weeklyEquationTdeeKcal: number;
  overrideActive: boolean;
  overrideKcal: number | null;
  overrideReason: string | null;
  overrideDate: Date | null;
  selectedMaintenanceKcal: number;
  weeklySelectedMaintenanceKcal: number;
  planCreatedAt: Date;
  planId: string;
}

/**
 * Builds the live maintenance view from the client's CURRENT stats and
 * the most recent MaintenancePlan's method/multiplier/override. Recomputes
 * resting/TDEE live (rather than trusting the plan's stored snapshot) so
 * the figure always reflects the client's latest weight/age/height —
 * while the override, if any, remains a fixed coach-entered number until
 * explicitly changed.
 */
export function buildMaintenanceView(client: Client, plan: MaintenancePlan): MaintenanceView {
  const restingResult = calculateRestingEnergy(plan.method as RestingEnergyMethod, {
    sex: client.sex as Sex,
    weightKg: client.currentWeightKg,
    heightCm: client.heightCm,
    age: client.age,
    bodyFatPercent: client.bodyFatPercent ?? undefined
  });
  const tdeeResult = calculateTdee(restingResult, plan.activityMultiplier);

  const overrideActive = plan.overrideKcal != null;
  const selectedMaintenanceKcal = overrideActive ? (plan.overrideKcal as number) : tdeeResult.tdeeKcal;

  return {
    method: plan.method as RestingEnergyMethod,
    equationLabel: restingResult.equationLabel,
    assumptions: restingResult.assumptions,
    activityMultiplier: plan.activityMultiplier,
    multiplierLabel: plan.multiplierLabel,
    restingKcal: restingResult.restingKcal,
    equationTdeeKcal: tdeeResult.tdeeKcal,
    weeklyEquationTdeeKcal: tdeeResult.weeklyMaintenanceKcal,
    overrideActive,
    overrideKcal: plan.overrideKcal,
    overrideReason: plan.overrideReason,
    overrideDate: plan.overrideDate,
    selectedMaintenanceKcal,
    weeklySelectedMaintenanceKcal: selectedMaintenanceKcal * 7,
    planCreatedAt: plan.createdAt,
    planId: plan.id
  };
}

/**
 * Recomputes a stored DietPlan's outputs "live" against a given current
 * maintenance figure — used to show how a historical prescription compares
 * to today's equation estimate, without mutating the stored (snapshotted)
 * plan values that were prescribed at the time.
 */
export function recomputeDietPlanAgainst(
  dietPlan: Pick<DietPlan, "targetMode" | "targetValue">,
  maintenanceKcal: number,
  bodyWeightKg: number,
  restingKcalForReview?: number
) {
  return computeDeficit(
    dietPlan.targetMode as DeficitTargetMode,
    dietPlan.targetValue,
    maintenanceKcal,
    bodyWeightKg,
    restingKcalForReview
  );
}

/**
 * The diet-plan prescription that was in force on a given historical date
 * (the most recent plan created on or before that date), used to compare
 * "actual vs. prescribed" on charts and in decision support. Falls back to
 * the earliest plan for dates before any plan existed, purely for display
 * continuity — it was not actually prescribed yet at that point.
 */
export function activeDietPlanForDate(client: FullClient, date: Date): DietPlan | null {
  const candidates = client.dietPlans
    .filter((p) => new Date(p.createdAt).getTime() <= date.getTime())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (candidates.length > 0) return candidates[0];
  const earliest = [...client.dietPlans].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )[0];
  return earliest ?? null;
}
