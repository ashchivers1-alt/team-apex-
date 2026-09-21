import { describe, it, expect } from "vitest";
import { computeDeficit, oneLbPerWeekScenario } from "../deficit";

describe("acceptance example: 2400 kcal/day maintenance", () => {
  const result = oneLbPerWeekScenario(2400, 90);

  it("weekly maintenance = 16,800 kcal", () => {
    expect(result.maintenanceKcalUsed * 7).toBe(16800);
  });

  it("approximate weekly deficit for 1 lb/week = 3,500 kcal", () => {
    expect(result.weeklyDeficitKcal).toBe(3500);
  });

  it("daily deficit = 500 kcal", () => {
    expect(result.dailyDeficitKcal).toBe(500);
  });

  it("diet starting intake = 1,900 kcal/day", () => {
    expect(result.dailyTargetKcal).toBe(1900);
  });

  it("weekly diet intake = 13,300 kcal", () => {
    expect(result.weeklyTargetKcal).toBe(13300);
  });
});

describe("custom deficit targets", () => {
  it("lb per week", () => {
    const r = computeDeficit("LB_PER_WEEK", 2, 2500, 100);
    expect(r.weeklyDeficitKcal).toBe(7000);
    expect(r.dailyDeficitKcal).toBe(1000);
    expect(r.dailyTargetKcal).toBe(1500);
  });

  it("kg per week", () => {
    const r = computeDeficit("KG_PER_WEEK", 0.5, 2500, 100);
    expect(r.weeklyDeficitKcal).toBe(3850);
    expect(r.dailyDeficitKcal).toBeCloseTo(550, 6);
  });

  it("percent of bodyweight per week", () => {
    // 1% of 100kg = 1kg/week loss target
    const r = computeDeficit("PERCENT_BODYWEIGHT_PER_WEEK", 1, 2500, 100);
    expect(r.weeklyChangeKg).toBeCloseTo(1, 6);
    expect(r.weeklyLossPercentBodyweight).toBeCloseTo(1, 6);
  });

  it("fixed daily deficit", () => {
    const r = computeDeficit("FIXED_DAILY_DEFICIT", 300, 2200, 80);
    expect(r.dailyTargetKcal).toBe(1900);
  });

  it("percent deficit from maintenance", () => {
    const r = computeDeficit("PERCENT_DEFICIT_FROM_MAINTENANCE", 20, 2000, 80);
    expect(r.dailyDeficitKcal).toBe(400);
    expect(r.dailyTargetKcal).toBe(1600);
    expect(r.deficitPercentOfTdee).toBeCloseTo(20, 6);
  });

  it("maintenance / no deficit", () => {
    const r = computeDeficit("MAINTENANCE_NO_DEFICIT", null, 2600, 80);
    expect(r.dailyTargetKcal).toBe(2600);
    expect(r.dailyDeficitKcal).toBe(0);
  });
});

describe("plausibility flags", () => {
  it("never silently produces a negative target — flags it as critical instead", () => {
    const r = computeDeficit("FIXED_DAILY_DEFICIT", 3000, 2200, 80);
    expect(r.dailyTargetKcal).toBeLessThan(0);
    expect(r.flags.some((f) => f.level === "critical")).toBe(true);
  });

  it("flags an aggressive percent-of-bodyweight rate", () => {
    const r = computeDeficit("PERCENT_BODYWEIGHT_PER_WEEK", 2, 2500, 100);
    expect(r.flags.some((f) => f.message.includes("bodyweight per week"))).toBe(true);
  });

  it("flags a very large percent deficit", () => {
    const r = computeDeficit("PERCENT_DEFICIT_FROM_MAINTENANCE", 40, 2500, 100);
    expect(r.flags.some((f) => f.level === "critical")).toBe(true);
  });

  it("does not flag a moderate, standard 500 kcal deficit", () => {
    const r = oneLbPerWeekScenario(2400, 90);
    expect(r.flags.length).toBe(0);
  });

  it("advisory-only flag when target dips under resting expenditure (not a hard block)", () => {
    const r = computeDeficit("FIXED_DAILY_DEFICIT", 900, 2200, 80, 1600);
    expect(r.dailyTargetKcal).toBe(1300);
    expect(r.flags.some((f) => f.message.includes("resting expenditure"))).toBe(true);
    // still usable — not critical
    expect(r.flags.find((f) => f.message.includes("resting expenditure"))?.level).toBe("warning");
  });
});
