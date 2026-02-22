import { describe, it, expect } from "vitest";
import { calculateLlmCost } from "./track";

describe("calculateLlmCost", () => {
  it("calculates Haiku cost correctly", () => {
    // 1000 input tokens @ $1/MTok + 500 output tokens @ $5/MTok
    const cost = calculateLlmCost("claude-haiku-4-5-20251001", 1000, 500);
    expect(cost).toBeCloseTo((1000 * 1 + 500 * 5) / 1_000_000, 6);
  });

  it("calculates Sonnet cost correctly", () => {
    // 1000 input @ $3/MTok + 500 output @ $15/MTok
    const cost = calculateLlmCost("claude-sonnet-4-5-20250929", 1000, 500);
    expect(cost).toBeCloseTo((1000 * 3 + 500 * 15) / 1_000_000, 6);
  });

  it("includes cache write and read costs", () => {
    const withoutCache = calculateLlmCost("claude-haiku-4-5", 1000, 500, 0, 0);
    const withCacheWrite = calculateLlmCost("claude-haiku-4-5", 1000, 500, 2000, 0);
    const withCacheRead = calculateLlmCost("claude-haiku-4-5", 1000, 500, 0, 2000);

    expect(withCacheWrite).toBeGreaterThan(withoutCache);
    expect(withCacheRead).toBeGreaterThan(withoutCache);
    // Cache read should be cheaper than cache write
    expect(withCacheRead).toBeLessThan(withCacheWrite);
  });

  it("uses default pricing for unknown models", () => {
    const cost = calculateLlmCost("unknown-model-v1", 1000, 500);
    // Should use default (same as Haiku pricing)
    expect(cost).toBeCloseTo((1000 * 1 + 500 * 5) / 1_000_000, 6);
  });

  it("returns 0 for 0 tokens", () => {
    expect(calculateLlmCost("claude-haiku-4-5", 0, 0)).toBe(0);
  });
});
