import { describe, it, expect } from "vitest";
import { lbToKg, kgToLb, feetInchesToCm, cmToFeetInches, round } from "../units";

describe("unit conversions", () => {
  it("converts lb to kg accurately", () => {
    expect(lbToKg(200)).toBeCloseTo(90.7185, 3);
  });

  it("round-trips lb <-> kg", () => {
    const lb = 165.3;
    expect(kgToLb(lbToKg(lb))).toBeCloseTo(lb, 6);
  });

  it("converts feet/inches to cm", () => {
    // 5'10" = 70 inches = 177.8 cm
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 1);
  });

  it("round-trips cm -> feet/inches", () => {
    const { feet, inches } = cmToFeetInches(180.34);
    expect(feet).toBe(5);
    expect(inches).toBeCloseTo(11, 0);
  });

  it("rounds to given decimals", () => {
    expect(round(123.456, 1)).toBe(123.5);
    expect(round(123.456, 0)).toBe(123);
  });
});
