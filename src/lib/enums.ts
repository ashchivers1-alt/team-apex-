// Canonical value lists for the "enum-like" string fields stored in
// SQLite (which has no native enum type). Used for both server-side (zod)
// and client-side (<select>) validation so there is a single source of
// truth for allowed values.

export const SEX_VALUES = ["MALE", "FEMALE"] as const;
export type SexValue = (typeof SEX_VALUES)[number];

export const GOAL_VALUES = ["FAT_LOSS", "CONTEST_PREP", "MAINTENANCE", "MUSCLE_GAIN"] as const;
export type GoalValue = (typeof GOAL_VALUES)[number];

export const GOAL_LABELS: Record<GoalValue, string> = {
  FAT_LOSS: "Fat loss",
  CONTEST_PREP: "Contest prep",
  MAINTENANCE: "Maintenance",
  MUSCLE_GAIN: "Muscle gain"
};

export const UNIT_PREFERENCE_VALUES = ["METRIC", "IMPERIAL"] as const;
export type UnitPreferenceValue = (typeof UNIT_PREFERENCE_VALUES)[number];

export const BODY_FAT_METHOD_VALUES = [
  "CALIPERS",
  "DEXA",
  "BIOIMPEDANCE",
  "US_NAVY_TAPE",
  "VISUAL_ESTIMATE",
  "OTHER"
] as const;
export type BodyFatMethodValue = (typeof BODY_FAT_METHOD_VALUES)[number];

export const BODY_FAT_METHOD_LABELS: Record<BodyFatMethodValue, string> = {
  CALIPERS: "Skinfold callipers",
  DEXA: "DEXA scan",
  BIOIMPEDANCE: "Bioimpedance (BIA) scale/handheld",
  US_NAVY_TAPE: "US Navy tape-measurement method",
  VISUAL_ESTIMATE: "Visual/photo estimate",
  OTHER: "Other"
};

export const ACTIVITY_CATEGORY_VALUES = [
  "SEDENTARY",
  "LIGHTLY_ACTIVE",
  "MODERATELY_ACTIVE",
  "VERY_ACTIVE",
  "EXTREMELY_ACTIVE"
] as const;
export type ActivityCategoryValue = (typeof ACTIVITY_CATEGORY_VALUES)[number];

export const RESTING_ENERGY_METHOD_VALUES = ["MIFFLIN_ST_JEOR", "LEAN_MASS_KATCH_MCARDLE"] as const;
export type RestingEnergyMethodValue = (typeof RESTING_ENERGY_METHOD_VALUES)[number];

export const DEFICIT_TARGET_MODE_VALUES = [
  "MAINTENANCE_NO_DEFICIT",
  "LB_PER_WEEK",
  "KG_PER_WEEK",
  "PERCENT_BODYWEIGHT_PER_WEEK",
  "FIXED_DAILY_DEFICIT",
  "PERCENT_DEFICIT_FROM_MAINTENANCE",
  "ONE_LB_PER_WEEK_SCENARIO"
] as const;
export type DeficitTargetModeValue = (typeof DEFICIT_TARGET_MODE_VALUES)[number];

export const DEFICIT_TARGET_MODE_LABELS: Record<DeficitTargetModeValue, string> = {
  MAINTENANCE_NO_DEFICIT: "No deficit (maintenance)",
  LB_PER_WEEK: "Target rate: lb per week",
  KG_PER_WEEK: "Target rate: kg per week",
  PERCENT_BODYWEIGHT_PER_WEEK: "Target rate: % of bodyweight per week",
  FIXED_DAILY_DEFICIT: "Fixed daily deficit (kcal)",
  PERCENT_DEFICIT_FROM_MAINTENANCE: "Percentage deficit from maintenance",
  ONE_LB_PER_WEEK_SCENARIO: "Standard scenario: 1 lb per week (500 kcal/day)"
};

export const PLAN_CHANGE_TYPE_VALUES = ["INITIAL", "COACH_ADJUSTMENT", "RECALIBRATION"] as const;
export type PlanChangeTypeValue = (typeof PLAN_CHANGE_TYPE_VALUES)[number];

export const GRAMS_MODE_VALUES = ["g", "g_per_kg"] as const;
export type GramsModeValue = (typeof GRAMS_MODE_VALUES)[number];

export const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
