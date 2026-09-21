import { describe, it, expect } from "vitest";
import { rollingAverage, trendSlope, compareEquivalentPeriods } from "../trends";

function d(dayOffset: number, base = new Date("2026-01-01T00:00:00Z")): Date {
  return new Date(base.getTime() + dayOffset * 86_400_000);
}

describe("rollingAverage", () => {
  it("averages only logged entries and reports the count", () => {
    const entries = [
      { date: d(0), value: 90 },
      { date: d(2), value: 89.4 },
      { date: d(5), value: 88.9 }
    ];
    const result = rollingAverage(entries, d(6), 7);
    expect(result.count).toBe(3);
    expect(result.average).toBeCloseTo((90 + 89.4 + 88.9) / 3, 6);
    expect(result.isLowData).toBe(true); // 3/7 logged
  });

  it("handles a fully missing window explicitly", () => {
    const result = rollingAverage([], d(10), 7);
    expect(result.average).toBeNull();
    expect(result.count).toBe(0);
    expect(result.isLowData).toBe(true);
  });

  it("is not flagged low-data with strong coverage", () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({ date: d(i), value: 80 - i * 0.1 }));
    const result = rollingAverage(entries, d(6), 7);
    expect(result.count).toBe(7);
    expect(result.isLowData).toBe(false);
  });
});

describe("trendSlope", () => {
  it("requires a minimum span and point count before returning a slope", () => {
    const entries = [
      { date: d(0), value: 90 },
      { date: d(1), value: 89.8 }
    ];
    const result = trendSlope(entries);
    expect(result.slopePerDay).toBeNull();
    expect(result.warning).toMatch(/too little data/);
  });

  it("computes a negative slope for a steadily losing trend", () => {
    const entries = Array.from({ length: 14 }, (_, i) => ({ date: d(i), value: 90 - i * 0.1 }));
    const result = trendSlope(entries);
    expect(result.slopePerDay).toBeCloseTo(-0.1, 3);
    expect(result.warning).toBeNull();
  });

  it("computes a positive slope for a gaining trend", () => {
    const entries = Array.from({ length: 14 }, (_, i) => ({ date: d(i), value: 70 + i * 0.05 }));
    const result = trendSlope(entries);
    expect(result.slopePerDay).toBeCloseTo(0.05, 3);
  });
});

describe("compareEquivalentPeriods", () => {
  it("flags unreliable comparisons when a period is under-logged", () => {
    const entries = [{ date: d(6), value: 90 }]; // only 1 entry total
    const result = compareEquivalentPeriods(entries, d(6), 7);
    expect(result.bothPeriodsReliable).toBe(false);
    expect(result.note).toMatch(/unreliable/);
  });

  it("compares two well-logged equivalent windows", () => {
    const entries = [
      ...Array.from({ length: 7 }, (_, i) => ({ date: d(i), value: 90 - i * 0.05 })),
      ...Array.from({ length: 7 }, (_, i) => ({ date: d(i + 7), value: 89.6 - i * 0.05 }))
    ];
    const result = compareEquivalentPeriods(entries, d(13), 7);
    expect(result.bothPeriodsReliable).toBe(true);
    expect(result.changeInAverage).not.toBeNull();
    expect(result.changeInAverage!).toBeLessThan(0);
  });
});
