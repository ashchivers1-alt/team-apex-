// Contest-prep specific calculations. Deliberately limited to arithmetic
// about weight and time — never dehydration, sodium/potassium
// manipulation, diuretics, drugs or insulin protocols, and never a
// judgement of stage readiness (which cannot be determined from body
// weight alone).

import { KCAL_PER_KG_FAT } from "./deficit";
import { KG_PER_LB } from "./units";

export function daysUntil(showDate: Date, today: Date): number {
  const days = Math.ceil((showDate.getTime() - today.getTime()) / 86_400_000);
  return days;
}

export function weeksRemaining(showDate: Date, today: Date): number {
  return daysUntil(showDate, today) / 7;
}

export interface TargetWeightScenario {
  currentWeightKg: number;
  targetWeightKg: number;
  weightToLoseKg: number;
  weeksRemaining: number;
  requiredWeeklyChangeKg: number;
  requiredWeeklyChangeLb: number;
  requiredDailyDeficitKcal: number;
  requiredDeficitPercentBodyweightPerWeek: number;
  isAggressive: boolean;
  warnings: string[];
}

/**
 * Purely the mathematics of "how fast would this client need to lose (or
 * gain) weight to hit a target by a target date". This is a planning
 * scenario, not a prediction — real progress depends on adherence,
 * training response and individual variation, and stage readiness must
 * still be judged by eye and experience, not this number.
 */
export function calculateTargetWeightScenario(
  currentWeightKg: number,
  targetWeightKg: number,
  showDate: Date,
  today: Date
): TargetWeightScenario {
  const weightToLoseKg = currentWeightKg - targetWeightKg; // positive = needs to lose
  const weeks = Math.max(weeksRemaining(showDate, today), 0.01);
  const requiredWeeklyChangeKg = weightToLoseKg / weeks;
  const requiredWeeklyChangeLb = requiredWeeklyChangeKg / KG_PER_LB;
  const requiredDailyDeficitKcal = (requiredWeeklyChangeKg * KCAL_PER_KG_FAT) / 7;
  const requiredDeficitPercentBodyweightPerWeek =
    currentWeightKg > 0 ? (requiredWeeklyChangeKg / currentWeightKg) * 100 : 0;

  const warnings: string[] = [];
  const isAggressive = requiredDeficitPercentBodyweightPerWeek > 1.0;

  if (isAggressive) {
    warnings.push(
      `This requires losing ${requiredDeficitPercentBodyweightPerWeek.toFixed(
        2
      )}% of bodyweight per week on average, above commonly-sustainable rates. Treat this as a warning sign to revisit the target, the date, or the plan — not as a target to force.`
    );
  }
  if (weeks < 4 && weightToLoseKg > 0) {
    warnings.push("Fewer than 4 weeks remain — large, rushed changes this close to a show carry more risk and are harder to judge safely.");
  }
  if (requiredWeeklyChangeKg < 0) {
    warnings.push("The target requires a weight increase, not a decrease — check the target weight and current weight are correct for this scenario.");
  }

  return {
    currentWeightKg,
    targetWeightKg,
    weightToLoseKg,
    weeksRemaining: weeks,
    requiredWeeklyChangeKg,
    requiredWeeklyChangeLb,
    requiredDailyDeficitKcal,
    requiredDeficitPercentBodyweightPerWeek,
    isAggressive,
    warnings
  };
}
