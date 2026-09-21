import { z } from "zod";
import {
  SEX_VALUES,
  GOAL_VALUES,
  UNIT_PREFERENCE_VALUES,
  BODY_FAT_METHOD_VALUES,
  ACTIVITY_CATEGORY_VALUES,
  RESTING_ENERGY_METHOD_VALUES,
  DEFICIT_TARGET_MODE_VALUES,
  PLAN_CHANGE_TYPE_VALUES,
  GRAMS_MODE_VALUES
} from "./enums";

const optionalNumber = z.number().finite().nullable().optional();
const optionalInt = z.number().int().nullable().optional();
const optionalString = z.string().trim().nullable().optional();
const optionalDate = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ? new Date(v) : null));

export const clientInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  sex: z.enum(SEX_VALUES),
  age: z.number().int().min(10).max(100),
  heightCm: z.number().positive().max(260),
  currentWeightKg: z.number().positive().max(400),
  preferredUnits: z.enum(UNIT_PREFERENCE_VALUES).default("METRIC"),

  bodyFatPercent: z.number().min(2).max(70).nullable().optional(),
  bodyFatMethod: z.enum(BODY_FAT_METHOD_VALUES).nullable().optional(),
  bodyFatDate: optionalDate,

  goal: z.enum(GOAL_VALUES),
  targetWeightKg: z.number().positive().max(400).nullable().optional(),
  targetDate: optionalDate,

  isCompetitor: z.boolean().default(false),
  division: optionalString,
  showDate: optionalDate,

  occupation: optionalString,
  generalActivityLevel: z.enum(ACTIVITY_CATEGORY_VALUES).nullable().optional(),
  avgDailySteps: optionalInt,
  resistanceFreqPerWk: optionalInt,
  resistanceSessionMin: optionalInt,
  cardioType: optionalString,
  cardioFreqPerWk: optionalInt,
  cardioSessionMin: optionalInt,

  currentCalorieIntake: optionalInt,
  currentProteinG: optionalNumber,
  currentFatG: optionalNumber,
  currentCarbG: optionalNumber,

  dietHistoryNotes: optionalString,
  coachNotes: optionalString
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export const maintenancePlanInputSchema = z.object({
  method: z.enum(RESTING_ENERGY_METHOD_VALUES),
  activityMultiplier: z.number().min(1).max(2.2),
  multiplierLabel: z.string().min(1),
  overrideKcal: z.number().positive().nullable().optional(),
  overrideReason: optionalString,
  overrideDate: optionalDate,
  changeType: z.enum(PLAN_CHANGE_TYPE_VALUES).default("COACH_ADJUSTMENT"),
  notes: optionalString
});

export const dietPlanInputSchema = z.object({
  targetMode: z.enum(DEFICIT_TARGET_MODE_VALUES),
  targetValue: z.number().nullable().optional(),
  changeType: z.enum(PLAN_CHANGE_TYPE_VALUES).default("COACH_ADJUSTMENT"),
  reason: optionalString
});

export const macroDayTemplateInputSchema = z.object({
  name: z.string().min(1),
  calorieKcal: z.number().positive(),
  proteinMode: z.enum(GRAMS_MODE_VALUES),
  proteinValue: z.number().min(0),
  fatMode: z.enum(GRAMS_MODE_VALUES),
  fatValue: z.number().min(0),
  carbOverrideG: z.number().nullable().optional()
});

export const weekdayAssignmentInputSchema = z.object({
  assignments: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        templateId: z.string().min(1)
      })
    )
    .length(7)
});

export const checkInInputSchema = z.object({
  date: z.string().min(1),
  weightKg: optionalNumber,
  actualCalorieIntake: optionalInt,
  actualProteinG: optionalNumber,
  actualFatG: optionalNumber,
  actualCarbG: optionalNumber,
  steps: optionalInt,
  cardioMinutes: optionalInt,
  cardioTypeNote: optionalString,
  trainingSessionsCompleted: optionalInt,
  trainingPerformanceNotes: optionalString,
  hunger: optionalInt,
  energy: optionalInt,
  sleepHours: optionalNumber,
  sleepQuality: optionalInt,
  recovery: optionalInt,
  digestionNotes: optionalString,
  menstrualCycleNotes: optionalString,
  adherencePercent: optionalInt,
  coachComment: optionalString,
  clientComment: optionalString
});

export type CheckInInput = z.infer<typeof checkInInputSchema>;
