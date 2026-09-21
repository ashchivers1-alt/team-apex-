// Observed-data maintenance recalibration.
//
// Observed TDEE ≈ average daily intake − (weight-trend slope in kg/day × 7,700)
//
// This is an approximation, not a measurement: it is only as accurate as
// the logged intake (which is commonly under-reported) and the weight
// trend (which includes water, glycogen and gut-content changes as well
// as fat/lean tissue). It must never overwrite the coach's selected
// maintenance automatically — it is a second data point for the coach to
// weigh against the equation estimate.

import { DatedValue, trendSlope } from "./trends";

export const KCAL_PER_KG_FAT_RECALIBRATION = 7700;

export interface RecalibrationInput {
  periodStart: Date;
  periodEnd: Date;
  intakeEntries: DatedValue[]; // actual reported daily intake within the period
  weightEntries: DatedValue[]; // logged weight within the period
  menstrualNoteDates?: Date[];
  minCoveragePercent?: number; // default 0.6
}

export interface RecalibrationResult {
  observedTdeeKcal: number | null;
  averageDailyIntakeKcal: number | null;
  weightTrendKgPerDay: number | null;
  periodDays: number;
  intakeDaysLogged: number;
  weightDaysLogged: number;
  intakeCoverage: number;
  isReliable: boolean;
  warnings: string[];
  method: string;
  assumptions: string[];
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function calculateObservedTdee(input: RecalibrationInput): RecalibrationResult {
  const periodDays = daysBetween(input.periodStart, input.periodEnd);
  const minCoverage = input.minCoveragePercent ?? 0.6;

  const intakeDaysLogged = input.intakeEntries.length;
  const weightDaysLogged = input.weightEntries.length;
  const intakeCoverage = periodDays > 0 ? intakeDaysLogged / periodDays : 0;

  const warnings: string[] = [];

  const averageDailyIntakeKcal =
    intakeDaysLogged > 0
      ? input.intakeEntries.reduce((s, e) => s + e.value, 0) / intakeDaysLogged
      : null;

  const slope = trendSlope(input.weightEntries);
  const weightTrendKgPerDay = slope.slopePerDay;

  if (periodDays < 14) {
    warnings.push(
      `The selected period is only ${periodDays} day(s). 14-28 days is recommended so day-to-day noise (water, glycogen, gut contents) averages out.`
    );
  }

  if (intakeCoverage < minCoverage) {
    warnings.push(
      `Only ${intakeDaysLogged}/${periodDays} days have logged intake (${Math.round(
        intakeCoverage * 100
      )}%). Below this coverage, the average intake figure may not represent real eating patterns.`
    );
  }

  if (slope.warning) {
    warnings.push(slope.warning);
  }

  if (input.menstrualNoteDates && input.menstrualNoteDates.length > 0) {
    warnings.push(
      "Menstrual-cycle notes were logged during this period — water retention across the cycle can shift scale weight independent of energy balance. Consider this before treating the trend as purely fat/lean mass change."
    );
  }

  if (intakeDaysLogged > 1) {
    const values = input.intakeEntries.map((e) => e.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max - min > 1200) {
      warnings.push(
        "Reported intake varies widely across the period (possible travel, refeeds, or irregular logging). Review individual days before trusting the average."
      );
    }
  }

  const isReliable =
    intakeCoverage >= minCoverage &&
    weightTrendKgPerDay != null &&
    periodDays >= 14 &&
    warnings.filter((w) => w.includes("too little data")).length === 0;

  const observedTdeeKcal =
    averageDailyIntakeKcal != null && weightTrendKgPerDay != null
      ? averageDailyIntakeKcal - weightTrendKgPerDay * KCAL_PER_KG_FAT_RECALIBRATION
      : null;

  if (!isReliable) {
    warnings.push(
      "Adequate intake and weight coverage was not met — treat this figure (if shown at all) as indicative only, not a basis for changing the plan on its own."
    );
  }

  return {
    observedTdeeKcal,
    averageDailyIntakeKcal,
    weightTrendKgPerDay,
    periodDays,
    intakeDaysLogged,
    weightDaysLogged,
    intakeCoverage,
    isReliable,
    warnings,
    method:
      "Observed TDEE ≈ average daily reported intake − (weight-trend slope in kg/day × 7,700)",
    assumptions: [
      "Assumes logged intake is reasonably complete and accurate — under-reporting is common and will bias this estimate upward (i.e. true expenditure may be lower than shown).",
      "Assumes the weight-trend slope reflects the whole period evenly, rather than being skewed by a single large swing (e.g. one heavy travel weekend).",
      "7,700 kcal per kg is an approximation of energy tissue density and does not separate fat from lean mass or water changes.",
      "This is an approximate, retrospective estimate — not a direct measurement of metabolism — and can be affected by logging errors, non-fat weight changes, illness, travel and menstrual-cycle water fluctuations."
    ]
  };
}
