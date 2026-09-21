// Diet starting-calorie and custom deficit/surplus target calculations.
//
// Energy-equivalence constants used throughout: 1 lb of body fat ≈ 3,500
// kcal; 1 kg ≈ 7,700 kcal. These are planning approximations, not exact
// biochemistry — actual scale-weight change also reflects water,
// glycogen and gut contents, so real-world results will not track the
// arithmetic exactly.

import { KG_PER_LB, round } from "./units";

export const KCAL_PER_LB_FAT = 3500;
export const KCAL_PER_KG_FAT = 7700;

export type DeficitTargetMode =
  | "MAINTENANCE_NO_DEFICIT"
  | "LB_PER_WEEK"
  | "KG_PER_WEEK"
  | "PERCENT_BODYWEIGHT_PER_WEEK"
  | "FIXED_DAILY_DEFICIT"
  | "PERCENT_DEFICIT_FROM_MAINTENANCE"
  | "ONE_LB_PER_WEEK_SCENARIO";

export interface DeficitFlag {
  level: "warning" | "critical";
  message: string;
}

export interface DeficitResult {
  targetMode: DeficitTargetMode;
  targetValue: number | null;
  maintenanceKcalUsed: number;
  bodyWeightKgUsed: number;
  dailyTargetKcal: number;
  weeklyTargetKcal: number;
  dailyDeficitKcal: number;
  weeklyDeficitKcal: number;
  deficitPercentOfTdee: number;
  weeklyChangeKg: number;
  weeklyChangeLb: number;
  weeklyLossPercentBodyweight: number;
  flags: DeficitFlag[];
}

/** The standard "1 lb per week" scenario, shown directly below maintenance. */
export function oneLbPerWeekScenario(
  maintenanceKcal: number,
  bodyWeightKgUsed: number,
  restingKcalForReview?: number
): DeficitResult {
  return computeDeficit(
    "ONE_LB_PER_WEEK_SCENARIO",
    null,
    maintenanceKcal,
    bodyWeightKgUsed,
    restingKcalForReview
  );
}

export function computeDeficit(
  targetMode: DeficitTargetMode,
  targetValue: number | null,
  maintenanceKcal: number,
  bodyWeightKgUsed: number,
  restingKcalForReview?: number
): DeficitResult {
  let dailyDeficitKcal: number;

  switch (targetMode) {
    case "MAINTENANCE_NO_DEFICIT":
      dailyDeficitKcal = 0;
      break;
    case "ONE_LB_PER_WEEK_SCENARIO":
      dailyDeficitKcal = KCAL_PER_LB_FAT / 7; // 500
      break;
    case "LB_PER_WEEK":
      dailyDeficitKcal = ((targetValue ?? 0) * KCAL_PER_LB_FAT) / 7;
      break;
    case "KG_PER_WEEK":
      dailyDeficitKcal = ((targetValue ?? 0) * KCAL_PER_KG_FAT) / 7;
      break;
    case "PERCENT_BODYWEIGHT_PER_WEEK": {
      const weeklyLossKg = bodyWeightKgUsed * ((targetValue ?? 0) / 100);
      dailyDeficitKcal = (weeklyLossKg * KCAL_PER_KG_FAT) / 7;
      break;
    }
    case "FIXED_DAILY_DEFICIT":
      dailyDeficitKcal = targetValue ?? 0;
      break;
    case "PERCENT_DEFICIT_FROM_MAINTENANCE":
      dailyDeficitKcal = maintenanceKcal * ((targetValue ?? 0) / 100);
      break;
    default:
      dailyDeficitKcal = 0;
  }

  const dailyTargetKcal = maintenanceKcal - dailyDeficitKcal;
  const weeklyTargetKcal = dailyTargetKcal * 7;
  const weeklyDeficitKcal = dailyDeficitKcal * 7;
  const deficitPercentOfTdee = maintenanceKcal > 0 ? (dailyDeficitKcal / maintenanceKcal) * 100 : 0;
  const weeklyChangeKg = weeklyDeficitKcal / KCAL_PER_KG_FAT;
  const weeklyChangeLb = weeklyChangeKg / KG_PER_LB;
  const weeklyLossPercentBodyweight =
    bodyWeightKgUsed > 0 ? (weeklyChangeKg / bodyWeightKgUsed) * 100 : 0;

  const flags: DeficitFlag[] = [];

  if (dailyTargetKcal <= 0) {
    flags.push({
      level: "critical",
      message:
        "This target produces a zero or negative daily calorie intake and is not usable. Revise the inputs before prescribing."
    });
  }

  if (deficitPercentOfTdee > 35) {
    flags.push({
      level: "critical",
      message: `The deficit is ${round(deficitPercentOfTdee, 0)}% of maintenance — a very large deficit that is hard to sustain and increases the risk of excess muscle loss. Review before prescribing.`
    });
  } else if (deficitPercentOfTdee > 25) {
    flags.push({
      level: "warning",
      message: `The deficit is ${round(deficitPercentOfTdee, 0)}% of maintenance, which is aggressive. Consider whether this is appropriate for this client.`
    });
  } else if (deficitPercentOfTdee < 0) {
    // Surplus — informational only, not flagged as a problem.
  }

  if (weeklyLossPercentBodyweight > 1.5) {
    flags.push({
      level: "warning",
      message: `The target rate is ${round(weeklyLossPercentBodyweight, 2)}% of bodyweight per week, above the commonly-used 1% guideline. Flag for review — faster is not automatically wrong, but it warrants a deliberate decision.`
    });
  }

  if (
    restingKcalForReview != null &&
    dailyTargetKcal > 0 &&
    dailyTargetKcal < restingKcalForReview * 0.9
  ) {
    flags.push({
      level: "warning",
      message:
        "The target is set below the estimated resting expenditure. This is not automatically wrong, but review it deliberately rather than by default — resting expenditure is not a hard minimum-intake rule."
    });
  }

  return {
    targetMode,
    targetValue,
    maintenanceKcalUsed: maintenanceKcal,
    bodyWeightKgUsed,
    dailyTargetKcal,
    weeklyTargetKcal,
    dailyDeficitKcal,
    weeklyDeficitKcal,
    deficitPercentOfTdee,
    weeklyChangeKg,
    weeklyChangeLb,
    weeklyLossPercentBodyweight,
    flags
  };
}
