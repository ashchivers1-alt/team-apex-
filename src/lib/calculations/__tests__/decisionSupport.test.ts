import { describe, it, expect } from "vitest";
import { buildDecisionSupport, previewAdjustment } from "../decisionSupport";

describe("buildDecisionSupport", () => {
  it("suggests gathering more data when coverage is too low", () => {
    const result = buildDecisionSupport({
      plannedWeeklyChangeKg: -0.5,
      observedWeeklyChangeKg: null,
      trendIsReliable: false,
      trendWarning: "too little data",
      adherencePercentAvg: null,
      avgIntakeVsPrescribedPercent: null,
      stepsChangePercent: null,
      hungerTrend: "unknown",
      energyTrend: "unknown",
      recoveryTrend: "unknown",
      daysOfDataInPeriod: 3
    });
    expect(result.suggestions[0].code).toBe("GATHER_MORE_DATA");
    expect(result.canJustifyAdjustment).toBe(false);
  });

  it("suggests holding the plan when observed rate matches planned rate", () => {
    const result = buildDecisionSupport({
      plannedWeeklyChangeKg: -0.5,
      observedWeeklyChangeKg: -0.48,
      trendIsReliable: true,
      trendWarning: null,
      adherencePercentAvg: 90,
      avgIntakeVsPrescribedPercent: 97,
      stepsChangePercent: 2,
      hungerTrend: "stable",
      energyTrend: "stable",
      recoveryTrend: "stable",
      daysOfDataInPeriod: 21
    });
    expect(result.suggestions.some((s) => s.code === "HOLD")).toBe(true);
  });

  it("suggests reviewing adherence rather than jumping to a calorie change when adherence is poor", () => {
    const result = buildDecisionSupport({
      plannedWeeklyChangeKg: -0.5,
      observedWeeklyChangeKg: -0.1,
      trendIsReliable: true,
      trendWarning: null,
      adherencePercentAvg: 55,
      avgIntakeVsPrescribedPercent: 120,
      stepsChangePercent: 0,
      hungerTrend: "rising",
      energyTrend: "stable",
      recoveryTrend: "stable",
      daysOfDataInPeriod: 21
    });
    expect(result.suggestions.some((s) => s.code === "REVIEW_ADHERENCE")).toBe(true);
    expect(result.suggestions.some((s) => s.code === "CONSIDER_SMALL_DECREASE")).toBe(false);
  });

  it("suggests a small adjustment when progress is genuinely slower than planned with good adherence", () => {
    const result = buildDecisionSupport({
      plannedWeeklyChangeKg: -0.5,
      observedWeeklyChangeKg: -0.15,
      trendIsReliable: true,
      trendWarning: null,
      adherencePercentAvg: 92,
      avgIntakeVsPrescribedPercent: 98,
      stepsChangePercent: 1,
      hungerTrend: "stable",
      energyTrend: "stable",
      recoveryTrend: "stable",
      daysOfDataInPeriod: 21
    });
    expect(result.suggestions.some((s) => s.code === "CONSIDER_SMALL_DECREASE")).toBe(true);
    expect(result.canJustifyAdjustment).toBe(true);
  });

  it("flags faster-than-planned loss for review rather than treating it as automatically good", () => {
    const result = buildDecisionSupport({
      plannedWeeklyChangeKg: -0.5,
      observedWeeklyChangeKg: -1.1,
      trendIsReliable: true,
      trendWarning: null,
      adherencePercentAvg: 95,
      avgIntakeVsPrescribedPercent: 100,
      stepsChangePercent: 0,
      hungerTrend: "rising",
      energyTrend: "falling",
      recoveryTrend: "falling",
      daysOfDataInPeriod: 21
    });
    expect(result.suggestions.some((s) => s.code === "CONSIDER_SMALL_INCREASE")).toBe(true);
  });
});

describe("previewAdjustment", () => {
  it("previews the daily-calorie and weekly-deficit effect of a proposed change", () => {
    const preview = previewAdjustment(1900, -150, 2400);
    expect(preview.proposedDailyKcal).toBe(1750);
    expect(preview.currentWeeklyDeficitKcal).toBe(3500);
    expect(preview.proposedWeeklyDeficitKcal).toBe(4550);
  });
});
