import { describe, it, expect } from "vitest";
import { daysUntil, weeksRemaining, calculateTargetWeightScenario } from "../contestPrep";

describe("show countdown", () => {
  it("computes days and weeks remaining", () => {
    const today = new Date("2026-01-01T00:00:00Z");
    const show = new Date("2026-02-01T00:00:00Z"); // 31 days later
    expect(daysUntil(show, today)).toBe(31);
    expect(weeksRemaining(show, today)).toBeCloseTo(31 / 7, 6);
  });
});

describe("target weight scenario", () => {
  it("computes the required weekly rate to hit a target by a date", () => {
    const today = new Date("2026-01-01T00:00:00Z");
    const show = new Date("2026-03-12T00:00:00Z"); // 70 days = 10 weeks
    const result = calculateTargetWeightScenario(95, 88, show, today);
    expect(result.weightToLoseKg).toBeCloseTo(7, 6);
    expect(result.weeksRemaining).toBeCloseTo(10, 1);
    expect(result.requiredWeeklyChangeKg).toBeCloseTo(0.7, 2);
  });

  it("flags an aggressive required rate", () => {
    const today = new Date("2026-01-01T00:00:00Z");
    const show = new Date("2026-01-15T00:00:00Z"); // 2 weeks
    const result = calculateTargetWeightScenario(100, 90, show, today);
    expect(result.isAggressive).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("does not flag a modest, achievable rate", () => {
    const today = new Date("2026-01-01T00:00:00Z");
    const show = new Date("2026-05-01T00:00:00Z"); // ~17 weeks
    const result = calculateTargetWeightScenario(90, 85, show, today);
    expect(result.isAggressive).toBe(false);
  });
});
