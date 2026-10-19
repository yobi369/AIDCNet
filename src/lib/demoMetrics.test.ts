import { describe, expect, it } from 'vitest';
import { clampMetric } from './demoMetrics';

describe('clampMetric', () => {
  it('keeps values within the inclusive range', () => {
    expect(clampMetric(85, 75, 99)).toBe(85);
  });

  it('clamps values below and above the range', () => {
    expect(clampMetric(20, 75, 99)).toBe(75);
    expect(clampMetric(120, 75, 99)).toBe(99);
  });

  it('accepts a value exactly on either bound', () => {
    expect(clampMetric(75, 75, 99)).toBe(75);
    expect(clampMetric(99, 75, 99)).toBe(99);
  });

  it('rejects non-finite values', () => {
    expect(() => clampMetric(Number.NaN, 0, 1)).toThrow(TypeError);
    expect(() => clampMetric(Number.POSITIVE_INFINITY, 0, 1)).toThrow(TypeError);
  });

  it('rejects reversed bounds', () => {
    expect(() => clampMetric(5, 10, 1)).toThrow(RangeError);
  });
});
