import type { WeightUnit } from "./types";

const LB_PER_KG = 2.2046226218;

/** Convert a weight value between lb and kg. */
export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) return value;
  return from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
}

/** Body Mass Index from a weight (in `unit`) and height in cm. */
export function bmi(
  weight: number,
  unit: WeightUnit,
  heightCm: number | null,
): number | null {
  if (!heightCm || heightCm <= 0) return null;
  const kg = unit === "kg" ? weight : weight / LB_PER_KG;
  const m = heightCm / 100;
  return kg / (m * m);
}

/** Plain-English BMI category. */
export function bmiCategory(value: number): string {
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Healthy";
  if (value < 30) return "Overweight";
  return "Obese";
}

/** cm ↔ feet/inches for imperial display. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  // handle rounding up to 12"
  if (inches === 12) return { feet: feet + 1, inches: 0 };
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
}
