import { describe, it, expect } from "vitest";
import { calculateMacroPlan, summariseWeeklyPlan } from "../macros";

describe("macro arithmetic", () => {
  it("computes carbs from the remainder", () => {
    // budget 2000, protein 150g (600kcal), fat 60g (540kcal) -> remainder 860kcal -> 215g carbs
    const r = calculateMacroPlan({
      calorieBudgetKcal: 2000,
      bodyWeightKg: 75,
      proteinMode: "g",
      proteinValue: 150,
      fatMode: "g",
      fatValue: 60
    });
    expect(r.proteinKcal).toBe(600);
    expect(r.fatKcal).toBe(540);
    expect(r.carbG).toBeCloseTo(215, 6);
    expect(r.totalKcal).toBeCloseTo(2000, 6);
    expect(r.isOverBudget).toBe(false);
  });

  it("resolves g/kg modes using bodyweight", () => {
    const r = calculateMacroPlan({
      calorieBudgetKcal: 2500,
      bodyWeightKg: 80,
      proteinMode: "g_per_kg",
      proteinValue: 2,
      fatMode: "g_per_kg",
      fatValue: 0.8
    });
    expect(r.proteinG).toBeCloseTo(160, 6);
    expect(r.fatG).toBeCloseTo(64, 6);
  });

  it("flags negative carbohydrates as an invalid plan rather than displaying them as valid", () => {
    // protein 300g (1200kcal) + fat 150g (1350kcal) = 2550kcal > 2000 budget
    const r = calculateMacroPlan({
      calorieBudgetKcal: 2000,
      bodyWeightKg: 80,
      proteinMode: "g",
      proteinValue: 300,
      fatMode: "g",
      fatValue: 150
    });
    expect(r.carbG).toBeLessThan(0);
    expect(r.flags.some((f) => f.level === "critical" && f.message.includes("negative"))).toBe(true);
  });

  it("flags manual macro overrides that exceed the calorie budget", () => {
    const r = calculateMacroPlan({
      calorieBudgetKcal: 2000,
      bodyWeightKg: 80,
      proteinMode: "g",
      proteinValue: 150,
      fatMode: "g",
      fatValue: 60,
      carbOverrideG: 300 // 1200kcal carbs + 600 protein + 540 fat = 2340 > 2000
    });
    expect(r.isOverBudget).toBe(true);
    expect(r.flags.some((f) => f.level === "critical")).toBe(true);
  });

  it("reports grams per kg alongside absolute grams", () => {
    const r = calculateMacroPlan({
      calorieBudgetKcal: 2000,
      bodyWeightKg: 100,
      proteinMode: "g",
      proteinValue: 200,
      fatMode: "g",
      fatValue: 50
    });
    expect(r.proteinGPerKg).toBeCloseTo(2, 6);
  });
});

describe("weekly training/rest day totals", () => {
  it("sums mixed training/rest day calories correctly", () => {
    const days = [
      { weekday: 0, label: "Mon (training)", calorieKcal: 2200 },
      { weekday: 1, label: "Tue (rest)", calorieKcal: 1900 },
      { weekday: 2, label: "Wed (training)", calorieKcal: 2200 },
      { weekday: 3, label: "Thu (rest)", calorieKcal: 1900 },
      { weekday: 4, label: "Fri (training)", calorieKcal: 2200 },
      { weekday: 5, label: "Sat (rest)", calorieKcal: 1900 },
      { weekday: 6, label: "Sun (higher-cal)", calorieKcal: 2500 }
    ];
    const summary = summariseWeeklyPlan(days, 2450 * 7);
    expect(summary.weeklyTotalKcal).toBe(2200 * 3 + 1900 * 3 + 2500);
    expect(summary.dailyAverageKcal).toBeCloseTo(summary.weeklyTotalKcal / 7, 6);
    expect(summary.hasVariableDays).toBe(true);
    expect(summary.weeklyDeficitKcal).toBeCloseTo(2450 * 7 - summary.weeklyTotalKcal, 6);
  });

  it("shows an unchanged weekly deficit when every day is identical", () => {
    const days = Array.from({ length: 7 }, (_, i) => ({
      weekday: i,
      label: `Day ${i}`,
      calorieKcal: 2000
    }));
    const summary = summariseWeeklyPlan(days, 2500 * 7);
    expect(summary.hasVariableDays).toBe(false);
    expect(summary.weeklyDeficitKcal).toBe(3500);
  });

  it("makes it obvious that adding a higher-calorie day changes the weekly deficit", () => {
    const flatDays = Array.from({ length: 7 }, (_, i) => ({
      weekday: i,
      label: `Day ${i}`,
      calorieKcal: 2000
    }));
    const withRefeed = [...flatDays.slice(0, 6), { weekday: 6, label: "Refeed", calorieKcal: 2800 }];

    const flatSummary = summariseWeeklyPlan(flatDays, 17500);
    const refeedSummary = summariseWeeklyPlan(withRefeed, 17500);

    expect(refeedSummary.weeklyDeficitKcal).toBeLessThan(flatSummary.weeklyDeficitKcal);
  });
});
