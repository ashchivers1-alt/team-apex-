// Macro planning: protein/fat set in grams or g/kg, carbohydrate from the
// calorie remainder. Kcal-per-gram constants are fixed (Atwater factors).

export const KCAL_PER_G_PROTEIN = 4;
export const KCAL_PER_G_CARB = 4;
export const KCAL_PER_G_FAT = 9;

export type GramsMode = "g" | "g_per_kg";

export interface MacroFlag {
  level: "warning" | "critical";
  message: string;
}

export interface MacroPlanInput {
  calorieBudgetKcal: number;
  bodyWeightKg: number;
  proteinMode: GramsMode;
  proteinValue: number;
  fatMode: GramsMode;
  fatValue: number;
  /** Manual override for carbs; if omitted, carbs = remainder of budget. */
  carbOverrideG?: number | null;
}

export interface MacroPlanResult {
  proteinG: number;
  proteinGPerKg: number;
  proteinKcal: number;
  fatG: number;
  fatGPerKg: number;
  fatKcal: number;
  carbG: number;
  carbGPerKg: number;
  carbKcal: number;
  totalKcal: number;
  calorieBudgetKcal: number;
  overBudgetKcal: number;
  isOverBudget: boolean;
  isCarbOverridden: boolean;
  flags: MacroFlag[];
}

export function resolveGrams(mode: GramsMode, value: number, bodyWeightKg: number): number {
  return mode === "g_per_kg" ? value * bodyWeightKg : value;
}

export function calculateMacroPlan(input: MacroPlanInput): MacroPlanResult {
  const { calorieBudgetKcal, bodyWeightKg } = input;

  const proteinG = resolveGrams(input.proteinMode, input.proteinValue, bodyWeightKg);
  const fatG = resolveGrams(input.fatMode, input.fatValue, bodyWeightKg);
  const proteinKcal = proteinG * KCAL_PER_G_PROTEIN;
  const fatKcal = fatG * KCAL_PER_G_FAT;

  const isCarbOverridden = input.carbOverrideG != null;
  const remainderKcal = calorieBudgetKcal - proteinKcal - fatKcal;
  const carbG = isCarbOverridden ? (input.carbOverrideG as number) : remainderKcal / KCAL_PER_G_CARB;
  const carbKcal = carbG * KCAL_PER_G_CARB;

  const totalKcal = proteinKcal + fatKcal + carbKcal;
  const overBudgetKcal = totalKcal - calorieBudgetKcal;
  const isOverBudget = overBudgetKcal > 0.5; // small float tolerance

  const flags: MacroFlag[] = [];

  if (carbG < 0) {
    flags.push({
      level: "critical",
      message:
        "Protein and fat targets alone exceed the calorie budget, which would require negative carbohydrates. This is not a valid plan — reduce protein/fat or raise the calorie budget."
    });
  }

  if (!isCarbOverridden && isOverBudget) {
    // Should not normally happen since carbs are the remainder, but guard
    // against float edge cases.
    flags.push({
      level: "warning",
      message: "Rounding caused the macro total to slightly exceed the calorie budget."
    });
  }

  if (isCarbOverridden && isOverBudget) {
    flags.push({
      level: "critical",
      message: `The manually entered macros total ${Math.round(totalKcal)} kcal, which is ${Math.round(
        overBudgetKcal
      )} kcal over the ${Math.round(calorieBudgetKcal)} kcal budget. Adjust before prescribing.`
    });
  }

  return {
    proteinG,
    proteinGPerKg: bodyWeightKg > 0 ? proteinG / bodyWeightKg : 0,
    proteinKcal,
    fatG,
    fatGPerKg: bodyWeightKg > 0 ? fatG / bodyWeightKg : 0,
    fatKcal,
    carbG, // sign is preserved deliberately; UI must never render a negative value as a valid plan
    carbGPerKg: bodyWeightKg > 0 ? carbG / bodyWeightKg : 0,
    carbKcal,
    totalKcal,
    calorieBudgetKcal,
    overBudgetKcal,
    isOverBudget,
    isCarbOverridden,
    flags
  };
}

export interface DayCalorieEntry {
  weekday: number; // 0=Mon..6=Sun
  label: string;
  calorieKcal: number;
}

export interface WeeklyPlanSummary {
  days: DayCalorieEntry[];
  weeklyTotalKcal: number;
  dailyAverageKcal: number;
  weeklyMaintenanceKcal: number;
  weeklyDeficitKcal: number;
  averageDailyDeficitKcal: number;
  hasVariableDays: boolean;
}

export function summariseWeeklyPlan(
  days: DayCalorieEntry[],
  weeklyMaintenanceKcal: number
): WeeklyPlanSummary {
  const weeklyTotalKcal = days.reduce((sum, d) => sum + d.calorieKcal, 0);
  const dailyAverageKcal = days.length > 0 ? weeklyTotalKcal / days.length : 0;
  const weeklyDeficitKcal = weeklyMaintenanceKcal - weeklyTotalKcal;
  const distinctCalorieValues = new Set(days.map((d) => Math.round(d.calorieKcal)));

  return {
    days,
    weeklyTotalKcal,
    dailyAverageKcal,
    weeklyMaintenanceKcal,
    weeklyDeficitKcal,
    averageDailyDeficitKcal: weeklyDeficitKcal / 7,
    hasVariableDays: distinctCalorieValues.size > 1
  };
}
