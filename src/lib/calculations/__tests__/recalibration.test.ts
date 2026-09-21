import { describe, it, expect } from "vitest";
import { calculateObservedTdee } from "../recalibration";

function d(dayOffset: number, base = new Date("2026-01-01T00:00:00Z")): Date {
  return new Date(base.getTime() + dayOffset * 86_400_000);
}

describe("calculateObservedTdee", () => {
  it("increases estimated expenditure above intake for a losing (negative-slope) trend", () => {
    // 21 days, avg intake 2000, losing 0.05kg/day
    const intake = Array.from({ length: 21 }, (_, i) => ({ date: d(i), value: 2000 }));
    const weight = Array.from({ length: 21 }, (_, i) => ({ date: d(i), value: 90 - i * 0.05 }));
    const result = calculateObservedTdee({
      periodStart: d(0),
      periodEnd: d(20),
      intakeEntries: intake,
      weightEntries: weight
    });
    expect(result.weightTrendKgPerDay).toBeCloseTo(-0.05, 3);
    // observed = 2000 - (-0.05 * 7700) = 2000 + 385 = 2385
    expect(result.observedTdeeKcal).toBeCloseTo(2385, 3);
    expect(result.observedTdeeKcal!).toBeGreaterThan(result.averageDailyIntakeKcal!);
    expect(result.isReliable).toBe(true);
  });

  it("decreases estimated expenditure below intake for a gaining (positive-slope) trend", () => {
    const intake = Array.from({ length: 21 }, (_, i) => ({ date: d(i), value: 2800 }));
    const weight = Array.from({ length: 21 }, (_, i) => ({ date: d(i), value: 80 + i * 0.03 }));
    const result = calculateObservedTdee({
      periodStart: d(0),
      periodEnd: d(20),
      intakeEntries: intake,
      weightEntries: weight
    });
    // observed = 2800 - (0.03*7700) = 2800 - 231 = 2569
    expect(result.observedTdeeKcal).toBeCloseTo(2569, 3);
    expect(result.observedTdeeKcal!).toBeLessThan(result.averageDailyIntakeKcal!);
  });

  it("flags insufficient intake coverage rather than presenting an unreliable figure as sound", () => {
    const intake = [
      { date: d(0), value: 2000 },
      { date: d(1), value: 1900 }
    ]; // only 2/21 days
    const weight = Array.from({ length: 21 }, (_, i) => ({ date: d(i), value: 90 - i * 0.05 }));
    const result = calculateObservedTdee({
      periodStart: d(0),
      periodEnd: d(20),
      intakeEntries: intake,
      weightEntries: weight
    });
    expect(result.isReliable).toBe(false);
    expect(result.warnings.some((w) => w.includes("logged intake"))).toBe(true);
  });

  it("flags a period shorter than 14 days", () => {
    const intake = Array.from({ length: 7 }, (_, i) => ({ date: d(i), value: 2000 }));
    const weight = Array.from({ length: 7 }, (_, i) => ({ date: d(i), value: 90 - i * 0.05 }));
    const result = calculateObservedTdee({
      periodStart: d(0),
      periodEnd: d(6),
      intakeEntries: intake,
      weightEntries: weight
    });
    expect(result.warnings.some((w) => w.includes("14-28 days"))).toBe(true);
  });

  it("returns null observed TDEE when weight data is inadequate", () => {
    const intake = Array.from({ length: 21 }, (_, i) => ({ date: d(i), value: 2000 }));
    const weight = [{ date: d(0), value: 90 }];
    const result = calculateObservedTdee({
      periodStart: d(0),
      periodEnd: d(20),
      intakeEntries: intake,
      weightEntries: weight
    });
    expect(result.observedTdeeKcal).toBeNull();
    expect(result.isReliable).toBe(false);
  });
});
