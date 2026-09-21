// Resting energy expenditure and TDEE/maintenance estimation.
//
// IMPORTANT: these are population-average equations. They estimate a
// starting point for coaching, not a measured value. Individual metabolic
// rate can vary from the equation estimate by a meaningful margin in
// either direction — see `assumptions` strings below, which are meant to
// be surfaced in the UI next to every number.

export type Sex = "MALE" | "FEMALE";

export interface RestingEnergyInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}

export interface LeanMassRestingEnergyInput {
  weightKg: number;
  bodyFatPercent: number;
}

/**
 * Mifflin–St Jeor resting energy expenditure.
 *
 * Male:   10 * kg + 6.25 * cm - 5 * age + 5
 * Female: 10 * kg + 6.25 * cm - 5 * age - 161
 *
 * The equation needs a sex input because, on average and independent of
 * measured lean mass, women tend to have a lower resting metabolic rate
 * than men of the same weight/height/age (largely due to differing average
 * body composition). It is a population-average correction, not a
 * statement about any individual.
 */
export function mifflinStJeor(input: RestingEnergyInput): number {
  const { sex, weightKg, heightCm, age } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "MALE" ? base + 5 : base - 161;
}

/**
 * Katch–McArdle resting energy expenditure, based on estimated lean body
 * mass rather than sex/age. Only as reliable as the body-fat estimate
 * feeding it — caliper, bioimpedance and visual estimates can each carry
 * several percentage points of error, which shifts this number
 * accordingly. Offered as an optional alternative, not a default, because
 * body-fat percentage is itself an estimate.
 *
 * RMR = 370 + 21.6 * lean mass (kg)
 */
export function katchMcArdle(input: LeanMassRestingEnergyInput): number {
  const { weightKg, bodyFatPercent } = input;
  const leanMassKg = weightKg * (1 - bodyFatPercent / 100);
  return 370 + 21.6 * leanMassKg;
}

export type RestingEnergyMethod = "MIFFLIN_ST_JEOR" | "LEAN_MASS_KATCH_MCARDLE";

export interface RestingEnergyResult {
  restingKcal: number;
  method: RestingEnergyMethod;
  equationLabel: string;
  assumptions: string[];
}

export function calculateRestingEnergy(
  method: RestingEnergyMethod,
  input: RestingEnergyInput & { bodyFatPercent?: number | null }
): RestingEnergyResult {
  if (method === "LEAN_MASS_KATCH_MCARDLE") {
    if (input.bodyFatPercent == null) {
      throw new Error("Katch-McArdle requires a body-fat percentage estimate.");
    }
    return {
      restingKcal: katchMcArdle({ weightKg: input.weightKg, bodyFatPercent: input.bodyFatPercent }),
      method,
      equationLabel: "Katch–McArdle (lean-mass based)",
      assumptions: [
        "Assumes the body-fat percentage entered is accurate — caliper, bioimpedance and visual estimates can each be off by several percentage points, which shifts this estimate by a similar margin.",
        "Uses RMR = 370 + 21.6 x lean mass (kg).",
        "Best used to sanity-check the Mifflin-St Jeor figure, not to replace it, unless you trust the body-fat input."
      ]
    };
  }
  return {
    restingKcal: mifflinStJeor(input),
    method,
    equationLabel: "Mifflin–St Jeor",
    assumptions: [
      "Population-average equation derived from indirect calorimetry studies; individual resting metabolic rate commonly varies from this estimate by roughly ±10%.",
      "Sex is used because it is a strong average predictor of resting metabolic rate independent of measured body composition, not a judgement about any individual.",
      "Does not directly account for muscle mass, thyroid function, medication or other individual metabolic factors."
    ]
  };
}

export const ACTIVITY_MULTIPLIERS: Record<
  string,
  { label: string; multiplier: number; description: string }
> = {
  SEDENTARY: {
    label: "Sedentary",
    multiplier: 1.2,
    description: "Desk-based occupation, little to no purposeful exercise, low daily steps (roughly under 5,000/day)."
  },
  LIGHTLY_ACTIVE: {
    label: "Lightly active",
    multiplier: 1.375,
    description: "Desk-based occupation with light exercise or walking 1-3 days/week, or a moderately active daily routine (roughly 5,000-7,500 steps/day)."
  },
  MODERATELY_ACTIVE: {
    label: "Moderately active",
    multiplier: 1.55,
    description: "Moderate structured exercise 3-5 days/week and/or an on-your-feet occupation (roughly 7,500-10,000 steps/day)."
  },
  VERY_ACTIVE: {
    label: "Very active",
    multiplier: 1.725,
    description: "Hard structured exercise 6-7 days/week and/or a physically demanding occupation (roughly 10,000-12,500 steps/day)."
  },
  EXTREMELY_ACTIVE: {
    label: "Extremely active",
    multiplier: 1.9,
    description: "Very hard daily training plus a physically demanding job, or high daily steps (12,500+/day) — uncommon outside manual-labour athletes."
  }
};

export interface TdeeResult {
  restingKcal: number;
  tdeeKcal: number;
  weeklyMaintenanceKcal: number;
  activityMultiplier: number;
  restingResult: RestingEnergyResult;
}

export function calculateTdee(
  restingResult: RestingEnergyResult,
  activityMultiplier: number
): TdeeResult {
  const restingKcal = restingResult.restingKcal;
  const tdeeKcal = restingKcal * activityMultiplier;
  return {
    restingKcal,
    tdeeKcal,
    weeklyMaintenanceKcal: tdeeKcal * 7,
    activityMultiplier,
    restingResult
  };
}

/**
 * Guidance only — never a hard rule. Steps and exercise both already
 * inform the multiplier category; they should not additionally be added
 * on top of the multiplier-derived TDEE, or exercise energy would be
 * double-counted.
 */
export function suggestActivityCategory(input: {
  avgDailySteps?: number | null;
  resistanceFreqPerWk?: number | null;
  cardioFreqPerWk?: number | null;
}): keyof typeof ACTIVITY_MULTIPLIERS {
  const steps = input.avgDailySteps ?? 0;
  const sessions = (input.resistanceFreqPerWk ?? 0) + (input.cardioFreqPerWk ?? 0);
  const score = steps / 2500 + sessions * 0.6;
  if (score < 2) return "SEDENTARY";
  if (score < 3.2) return "LIGHTLY_ACTIVE";
  if (score < 4.6) return "MODERATELY_ACTIVE";
  if (score < 6) return "VERY_ACTIVE";
  return "EXTREMELY_ACTIVE";
}
