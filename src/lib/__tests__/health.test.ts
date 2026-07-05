import { describe, it, expect } from "vitest";
import {
  convertWeight,
  bmi,
  bmiCategory,
  cmToFeetInches,
  feetInchesToCm,
} from "../health";

describe("convertWeight", () => {
  it("returns the same value when units match", () => {
    expect(convertWeight(180, "lb", "lb")).toBe(180);
    expect(convertWeight(80, "kg", "kg")).toBe(80);
  });

  it("converts kg to lb and back (round-trip)", () => {
    const lb = convertWeight(100, "kg", "lb");
    expect(lb).toBeCloseTo(220.462, 2);
    expect(convertWeight(lb, "lb", "kg")).toBeCloseTo(100, 6);
  });
});

describe("bmi", () => {
  it("computes BMI from lb + height in cm", () => {
    // 176 lb ≈ 79.83 kg at 180 cm → ~24.6
    expect(bmi(176, "lb", 180)).toBeCloseTo(24.64, 1);
  });

  it("computes BMI from kg directly", () => {
    expect(bmi(70, "kg", 175)).toBeCloseTo(22.86, 2);
  });

  it("returns null without a usable height", () => {
    expect(bmi(180, "lb", null)).toBeNull();
    expect(bmi(180, "lb", 0)).toBeNull();
  });
});

describe("bmiCategory", () => {
  it("labels each band at its boundary", () => {
    expect(bmiCategory(18.4)).toBe("Underweight");
    expect(bmiCategory(18.5)).toBe("Healthy");
    expect(bmiCategory(24.9)).toBe("Healthy");
    expect(bmiCategory(25)).toBe("Overweight");
    expect(bmiCategory(29.9)).toBe("Overweight");
    expect(bmiCategory(30)).toBe("Obese");
  });
});

describe("height conversion", () => {
  it("round-trips feet/inches ↔ cm", () => {
    expect(feetInchesToCm(5, 10)).toBe(177.8);
    expect(cmToFeetInches(177.8)).toEqual({ feet: 5, inches: 10 });
  });

  it("rolls 12 rounded inches up to the next foot", () => {
    // 181.9 cm ≈ 71.6 in → 5 ft 11.6 in, which rounds to 6 ft 0 in.
    expect(cmToFeetInches(181.9)).toEqual({ feet: 6, inches: 0 });
  });
});
