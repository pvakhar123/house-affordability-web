import type Anthropic from "@anthropic-ai/sdk";
import {
  stressTestRateHike,
  stressTestIncomeLoss,
  evaluateEmergencyFund,
  calculateRentVsBuy,
} from "../utils/financial-math";

export function createRiskTools(): Anthropic.Messages.Tool[] {
  return [
    {
      name: "stress_test_rate_hike",
      description:
        "Recalculate affordability if interest rates increase by a given percentage",
      input_schema: {
        type: "object" as const,
        properties: {
          loanAmount: { type: "number" },
          baseRate: {
            type: "number",
            description: "Current rate as decimal (e.g. 0.0611)",
          },
          rateIncrease: {
            type: "number",
            description: "Rate increase as decimal (e.g. 0.01 for 1%)",
          },
          loanTermYears: { type: "number" },
          grossMonthlyIncome: { type: "number" },
          existingMonthlyDebts: { type: "number" },
          propertyTaxMonthly: { type: "number" },
          insuranceMonthly: { type: "number" },
        },
        required: [
          "loanAmount",
          "baseRate",
          "rateIncrease",
          "loanTermYears",
          "grossMonthlyIncome",
          "existingMonthlyDebts",
          "propertyTaxMonthly",
          "insuranceMonthly",
        ],
      },
    },
    {
      name: "stress_test_income_loss",
      description:
        "Model scenario where buyer loses a percentage of income",
      input_schema: {
        type: "object" as const,
        properties: {
          grossMonthlyIncome: { type: "number" },
          incomeReductionPercent: {
            type: "number",
            description: "Percentage of income lost (e.g. 25 for 25%)",
          },
          monthlyHousingPayment: { type: "number" },
          existingMonthlyDebts: { type: "number" },
          remainingSavings: { type: "number" },
          monthlyExpenses: {
            type: "number",
            description: "Non-debt monthly living expenses",
          },
        },
        required: [
          "grossMonthlyIncome",
          "incomeReductionPercent",
          "monthlyHousingPayment",
          "existingMonthlyDebts",
          "remainingSavings",
          "monthlyExpenses",
        ],
      },
    },
    {
      name: "evaluate_emergency_fund",
      description:
        "Check if remaining savings after purchase cover 3-6 months of expenses",
      input_schema: {
        type: "object" as const,
        properties: {
          totalSavings: { type: "number" },
          downPaymentAmount: { type: "number" },
          estimatedClosingCosts: { type: "number" },
          monthlyExpenses: { type: "number" },
          monthlyHousingPayment: { type: "number" },
        },
        required: [
          "totalSavings",
          "downPaymentAmount",
          "estimatedClosingCosts",
          "monthlyExpenses",
          "monthlyHousingPayment",
        ],
      },
    },
    {
      name: "calculate_rent_vs_buy",
      description:
        "Compare total cost of renting vs buying over a specified number of years",
      input_schema: {
        type: "object" as const,
        properties: {
          homePrice: { type: "number" },
          downPaymentAmount: { type: "number" },
          interestRate: { type: "number" },
          loanTermYears: { type: "number" },
          propertyTaxRate: { type: "number", default: 0.011 },
          insuranceAnnual: { type: "number", default: 1500 },
          maintenanceRate: {
            type: "number",
            default: 0.01,
            description: "Annual maintenance as fraction of home price",
          },
          monthlyRent: { type: "number" },
          rentGrowthRate: { type: "number", default: 0.03 },
          homeAppreciationRate: { type: "number", default: 0.035 },
          years: { type: "number" },
        },
        required: [
          "homePrice",
          "downPaymentAmount",
          "interestRate",
          "loanTermYears",
          "monthlyRent",
          "years",
        ],
      },
    },
  ];
}

export async function handleRiskToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "stress_test_rate_hike":
      return JSON.stringify(
        stressTestRateHike({
          loanAmount: input.loanAmount as number,
          baseRate: input.baseRate as number,
          rateIncrease: input.rateIncrease as number,
          loanTermYears: input.loanTermYears as number,
          grossMonthlyIncome: input.grossMonthlyIncome as number,
          existingMonthlyDebts: input.existingMonthlyDebts as number,
          propertyTaxMonthly: input.propertyTaxMonthly as number,
          insuranceMonthly: input.insuranceMonthly as number,
        })
      );

    case "stress_test_income_loss":
      return JSON.stringify(
        stressTestIncomeLoss({
          grossMonthlyIncome: input.grossMonthlyIncome as number,
          incomeReductionPercent: input.incomeReductionPercent as number,
          monthlyHousingPayment: input.monthlyHousingPayment as number,
          existingMonthlyDebts: input.existingMonthlyDebts as number,
          remainingSavings: input.remainingSavings as number,
          monthlyExpenses: input.monthlyExpenses as number,
        })
      );

    case "evaluate_emergency_fund":
      return JSON.stringify(
        evaluateEmergencyFund({
          totalSavings: input.totalSavings as number,
          downPaymentAmount: input.downPaymentAmount as number,
          estimatedClosingCosts: input.estimatedClosingCosts as number,
          monthlyExpenses: input.monthlyExpenses as number,
          monthlyHousingPayment: input.monthlyHousingPayment as number,
        })
      );

    case "calculate_rent_vs_buy":
      return JSON.stringify(
        calculateRentVsBuy({
          homePrice: input.homePrice as number,
          downPaymentAmount: input.downPaymentAmount as number,
          interestRate: input.interestRate as number,
          loanTermYears: input.loanTermYears as number,
          propertyTaxRate: (input.propertyTaxRate as number) ?? 0.011,
          insuranceAnnual: (input.insuranceAnnual as number) ?? 1500,
          maintenanceRate: (input.maintenanceRate as number) ?? 0.01,
          monthlyRent: input.monthlyRent as number,
          rentGrowthRate: (input.rentGrowthRate as number) ?? 0.03,
          homeAppreciationRate:
            (input.homeAppreciationRate as number) ?? 0.035,
          years: input.years as number,
        })
      );

    default:
      throw new Error(`Unknown risk tool: ${name}`);
  }
}
