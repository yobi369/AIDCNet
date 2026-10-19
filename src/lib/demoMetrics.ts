/**
 * Clamp a simulated dashboard metric to its display range.
 * This is presentation logic only; it is not a measurement or an AI score.
 */
export function clampMetric(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    throw new TypeError('Metric bounds and value must be finite numbers');
  }
  if (min > max) {
    throw new RangeError('Minimum metric bound cannot exceed maximum bound');
  }
  return Math.min(max, Math.max(min, value));
}
