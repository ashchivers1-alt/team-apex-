// Unit conversions. Internal storage is always metric (kg, cm); these
// helpers exist purely for UI input/display in imperial units.

export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

/** Height entered as feet + inches -> cm */
export function feetInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * 12 + inches);
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches - feet * 12;
  return { feet, inches };
}

export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
