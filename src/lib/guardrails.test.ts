import { describe, it, expect } from "vitest";
import { validateToolParams } from "./guardrails";

describe("validateToolParams", () => {
  it("accepts valid parameters", () => {
    const result = validateToolParams("calculate_affordability", {
      annualGrossIncome: 100_000,
      downPaymentAmount: 50_000,
      interestRate: 0.065,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects income below minimum", () => {
    const result = validateToolParams("calculate_affordability", {
      annualGrossIncome: -5000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Annual income");
  });

  it("rejects income above maximum", () => {
    const result = validateToolParams("calculate_affordability", {
      annualGrossIncome: 999_999_999,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects interest rate above 30%", () => {
    const result = validateToolParams("calculate_affordability", {
      interestRate: 0.50,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Interest rate");
  });

  it("catches down payment exceeding home price", () => {
    const result = validateToolParams("analyze_property", {
      homePrice: 300_000,
      downPaymentAmount: 500_000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("exceed");
  });

  it("validates nested scenarios for compare_scenarios", () => {
    const result = validateToolParams("compare_scenarios", {
      homePrice: 400_000,
      scenario_a: { interestRate: 0.99 }, // invalid
      scenario_b: { interestRate: 0.065 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("scenario_a"))).toBe(true);
  });

  it("ignores non-numeric fields", () => {
    const result = validateToolParams("tool", {
      label: "test",
      description: "some text",
      annualGrossIncome: 80_000,
    });
    expect(result.valid).toBe(true);
  });
});
