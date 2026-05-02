const POINTS_PER_INCH = 72;
const CM_PER_INCH = 2.54;

export function cmToPdfPoints(cm: number): number {
  return (cm / CM_PER_INCH) * POINTS_PER_INCH;
}

export function pdfPointsToCm(points: number): number {
  return (points / POINTS_PER_INCH) * CM_PER_INCH;
}

export function formatCmForPlaywright(cm: number): string {
  return `${cm}cm`;
}

export function isWithinTolerance(
  actualCm: number,
  expectedCm: number,
  toleranceCm: number = 0.05,
): boolean {
  return Math.abs(actualCm - expectedCm) <= toleranceCm;
}

export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
