import { describe, it, expect } from "vitest";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
} from "./financial-math";

describe("calculateMaxHomePrice", () => {
  it("returns a reasonable max price for $100k income", () => {
    const result = calculateMaxHomePrice({
      annualGrossIncome: 100_000,
      monthlyDebtPayments: 500,
      downPaymentAmount: 50_000,
      interestRate: 0.065,
      loanTermYears: 30,
      propertyTaxRate: 0.012,
      insuranceAnnual: 1500,
      maxFrontEndDTI: 0.28,
      maxBackEndDTI: 0.36,
    });

    expect(result.maxHomePrice).toBeGreaterThan(200_000);
    expect(result.maxHomePrice).toBeLessThan(600_000);
    expect(result.maxLoanAmount).toBe(result.maxHomePrice - 50_000);
    expect(["front-end DTI", "back-end DTI"]).toContain(result.limitingFactor);
  });

  it("debt payments reduce affordable price", () => {
    const base = {
      annualGrossIncome: 100_000,
      downPaymentAmount: 50_000,
      interestRate: 0.065,
      loanTermYears: 30,
      propertyTaxRate: 0.012,
      insuranceAnnual: 1500,
      maxFrontEndDTI: 0.28,
      maxBackEndDTI: 0.36,
    };

    const noDebt = calculateMaxHomePrice({ ...base, monthlyDebtPayments: 0 });
    const withDebt = calculateMaxHomePrice({ ...base, monthlyDebtPayments: 2000 });

    expect(noDebt.maxHomePrice).toBeGreaterThan(withDebt.maxHomePrice);
  });

  it("higher down payment increases max price", () => {
    const base = {
      annualGrossIncome: 100_000,
      monthlyDebtPayments: 500,
      interestRate: 0.065,
      loanTermYears: 30,
      propertyTaxRate: 0.012,
      insuranceAnnual: 1500,
      maxFrontEndDTI: 0.28,
      maxBackEndDTI: 0.36,
    };

    const low = calculateMaxHomePrice({ ...base, downPaymentAmount: 20_000 });
    const high = calculateMaxHomePrice({ ...base, downPaymentAmount: 100_000 });

    expect(high.maxHomePrice).toBeGreaterThan(low.maxHomePrice);
  });
});

describe("calculateMonthlyPayment", () => {
  it("computes payment breakdown for $400k home", () => {
    const result = calculateMonthlyPayment({
      homePrice: 400_000,
      downPaymentAmount: 80_000,
      interestRate: 0.065,
      loanTermYears: 30,
      propertyTaxRate: 0.012,
      insuranceAnnual: 1500,
      pmiRate: 0.005,
    });

    // Principal + interest should be the bulk
    expect(result.principal).toBeGreaterThan(0);
    expect(result.interest).toBeGreaterThan(0);
    expect(result.propertyTax).toBeGreaterThan(0);
    expect(result.homeInsurance).toBeGreaterThan(0);
    // 20% down = no PMI
    expect(result.pmi).toBe(0);
    // Total should be sum of components
    expect(result.totalMonthly).toBeCloseTo(
      result.principal + result.interest + result.propertyTax + result.homeInsurance + result.pmi,
      0,
    );
  });

  it("includes PMI when down payment < 20%", () => {
    const result = calculateMonthlyPayment({
      homePrice: 400_000,
      downPaymentAmount: 40_000, // 10%
      interestRate: 0.065,
      loanTermYears: 30,
      propertyTaxRate: 0.012,
      insuranceAnnual: 1500,
      pmiRate: 0.005,
    });

    expect(result.pmi).toBeGreaterThan(0);
  });
});

describe("calculateDTI", () => {
  it("classifies safe DTI ratios correctly", () => {
    const result = calculateDTI({
      grossMonthlyIncome: 8000,
      proposedHousingPayment: 2000, // 25% front-end
      existingMonthlyDebts: 500, // 31.25% back-end
    });

    expect(result.frontEndRatio).toBeCloseTo(25, 0);
    expect(result.backEndRatio).toBeCloseTo(31.25, 0);
    expect(result.frontEndStatus).toBe("safe");
    expect(result.backEndStatus).toBe("safe");
  });

  it("flags risky DTI when housing payment is too high", () => {
    const result = calculateDTI({
      grossMonthlyIncome: 5000,
      proposedHousingPayment: 2000, // 40% front-end
      existingMonthlyDebts: 500,
    });

    expect(result.frontEndStatus).toBe("risky");
  });

  it("flags risky back-end DTI with high debts", () => {
    const result = calculateDTI({
      grossMonthlyIncome: 5000,
      proposedHousingPayment: 1200, // 24% front-end (safe)
      existingMonthlyDebts: 1500, // 54% back-end (risky)
    });

    expect(result.frontEndStatus).toBe("safe");
    expect(result.backEndStatus).toBe("risky");
  });
});
