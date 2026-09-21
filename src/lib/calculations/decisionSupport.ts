// Coaching decision support. Every suggestion here is conditional and
// evidence-labelled — this module never issues a diagnosis, never claims
// to detect "metabolic damage", and never applies a change on its own.
// The coach reviews the evidence and explicitly approves any adjustment.

export interface DecisionInputs {
  plannedWeeklyChangeKg: number; // negative = planned loss
  observedWeeklyChangeKg: number | null; // from the logged weight trend, or null if unreliable
  trendIsReliable: boolean;
  trendWarning: string | null;
  adherencePercentAvg: number | null; // average coach-rated adherence over the review period
  avgIntakeVsPrescribedPercent: number | null; // actual/prescribed * 100
  stepsChangePercent: number | null; // vs prior equivalent period
  hungerTrend: "rising" | "stable" | "falling" | "unknown";
  energyTrend: "rising" | "stable" | "falling" | "unknown";
  recoveryTrend: "rising" | "stable" | "falling" | "unknown";
  daysOfDataInPeriod: number;
}

export type SuggestionCode =
  | "HOLD"
  | "GATHER_MORE_DATA"
  | "REVIEW_ADHERENCE"
  | "REVIEW_ACTIVITY"
  | "CONSIDER_SMALL_DECREASE"
  | "CONSIDER_SMALL_INCREASE";

export interface Suggestion {
  code: SuggestionCode;
  label: string;
  rationale: string;
  evidence: string[];
}

export interface DecisionSupportResult {
  suggestions: Suggestion[];
  canJustifyAdjustment: boolean;
  summaryLine: string;
}

const MIN_DAYS_FOR_ANY_JUDGEMENT = 10;
const RATE_TOLERANCE_PERCENT = 20;
const LOW_ADHERENCE_THRESHOLD = 80;

export function buildDecisionSupport(input: DecisionInputs): DecisionSupportResult {
  const suggestions: Suggestion[] = [];
  const evidenceBase: string[] = [];

  if (input.adherencePercentAvg != null) {
    evidenceBase.push(`Average logged adherence: ${Math.round(input.adherencePercentAvg)}%.`);
  }
  if (input.avgIntakeVsPrescribedPercent != null) {
    evidenceBase.push(
      `Actual intake averaged ${Math.round(input.avgIntakeVsPrescribedPercent)}% of the prescribed target.`
    );
  }
  if (input.stepsChangePercent != null) {
    evidenceBase.push(`Steps changed ${input.stepsChangePercent >= 0 ? "+" : ""}${Math.round(input.stepsChangePercent)}% vs. the prior equivalent period.`);
  }

  if (input.daysOfDataInPeriod < MIN_DAYS_FOR_ANY_JUDGEMENT || !input.trendIsReliable) {
    suggestions.push({
      code: "GATHER_MORE_DATA",
      label: "Gather more consistent data",
      rationale: `Only ${input.daysOfDataInPeriod} day(s) of usable data are available${
        input.trendWarning ? ` (${input.trendWarning})` : ""
      }. Recommendations based on this would be unreliable — ask for more consistent weigh-ins and logging before drawing conclusions.`,
      evidence: evidenceBase
    });
    return {
      suggestions,
      canJustifyAdjustment: false,
      summaryLine: "Not enough reliable data yet to justify a plan change."
    };
  }

  if (input.adherencePercentAvg != null && input.adherencePercentAvg < LOW_ADHERENCE_THRESHOLD) {
    suggestions.push({
      code: "REVIEW_ADHERENCE",
      label: "Review adherence before changing the plan",
      rationale:
        "Logged adherence is low enough that the plan itself may not have been properly tested yet. Addressing adherence barriers is likely to be more useful than changing calorie targets.",
      evidence: evidenceBase
    });
  }

  if (input.stepsChangePercent != null && input.stepsChangePercent < -15) {
    suggestions.push({
      code: "REVIEW_ACTIVITY",
      label: "Review reduced activity",
      rationale:
        "Steps have dropped noticeably versus the comparison period, which reduces expenditure independent of the diet. Consider whether this explains a slower-than-planned rate before adjusting calories.",
      evidence: evidenceBase
    });
  }

  const planned = input.plannedWeeklyChangeKg;
  const observed = input.observedWeeklyChangeKg;

  if (observed != null && planned !== 0) {
    const percentOfPlan = (observed / planned) * 100; // e.g. 100% = exactly on plan
    const deviation = percentOfPlan - 100;

    evidenceBase.push(
      `Planned weekly change: ${planned.toFixed(2)} kg. Observed weekly change: ${observed.toFixed(2)} kg (${Math.round(percentOfPlan)}% of plan).`
    );

    if (Math.abs(deviation) <= RATE_TOLERANCE_PERCENT) {
      suggestions.push({
        code: "HOLD",
        label: "Hold the current plan",
        rationale: `Observed rate is within ${RATE_TOLERANCE_PERCENT}% of the planned rate. No adjustment is indicated on rate alone.`,
        evidence: evidenceBase
      });
    } else if (deviation < -RATE_TOLERANCE_PERCENT) {
      // Losing/gaining slower than planned (in the intended direction)
      if (!suggestions.some((s) => s.code === "REVIEW_ADHERENCE" || s.code === "REVIEW_ACTIVITY")) {
        suggestions.push({
          code: "CONSIDER_SMALL_DECREASE",
          label:
            planned < 0 ? "Consider a small calorie or activity adjustment" : "Consider a small calorie or activity increase",
          rationale:
            "The observed rate is meaningfully slower than planned and adherence/activity look reasonable, so a small, deliberate adjustment may be warranted. Preview the effect before approving it.",
          evidence: evidenceBase
        });
      }
    } else {
      // Faster than planned
      suggestions.push({
        code: "CONSIDER_SMALL_INCREASE",
        label: planned < 0 ? "Consider a small calorie increase" : "Consider a small calorie decrease",
        rationale:
          "The observed rate is meaningfully faster than planned. Sustained large deficits raise the risk of excess muscle loss and poor adherence — review whether to moderate the target.",
        evidence: evidenceBase
      });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      code: "HOLD",
      label: "Hold the current plan",
      rationale: "No evidence currently points to a needed change.",
      evidence: evidenceBase
    });
  }

  return {
    suggestions,
    canJustifyAdjustment: suggestions.some(
      (s) => s.code === "CONSIDER_SMALL_DECREASE" || s.code === "CONSIDER_SMALL_INCREASE"
    ),
    summaryLine: suggestions.map((s) => s.label).join(" · ")
  };
}

export interface AdjustmentPreview {
  currentDailyKcal: number;
  proposedDailyKcal: number;
  deltaKcal: number;
  currentWeeklyDeficitKcal: number;
  proposedWeeklyDeficitKcal: number;
  maintenanceKcal: number;
}

export function previewAdjustment(
  currentDailyKcal: number,
  deltaKcal: number,
  maintenanceKcal: number
): AdjustmentPreview {
  const proposedDailyKcal = currentDailyKcal + deltaKcal;
  return {
    currentDailyKcal,
    proposedDailyKcal,
    deltaKcal,
    currentWeeklyDeficitKcal: (maintenanceKcal - currentDailyKcal) * 7,
    proposedWeeklyDeficitKcal: (maintenanceKcal - proposedDailyKcal) * 7,
    maintenanceKcal
  };
}
