import type Anthropic from "@anthropic-ai/sdk";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
  generateAmortizationSummary,
} from "../utils/financial-math";

export function createAffordabilityTools(): Anthropic.Messages.Tool[] {
  return [
    {
      name: "calculate_max_home_price",
      description:
        "Calculate the maximum affordable home price given income, debts, rate, and down payment using the 28/36 DTI rule",
      input_schema: {
        type: "object" as const,
        properties: {
          annualGrossIncome: { type: "number" },
          monthlyDebtPayments: { type: "number" },
          downPaymentAmount: { type: "number" },
          interestRate: {
            type: "number",
            description: "Annual rate as decimal, e.g. 0.0611 for 6.11%",
          },
          loanTermYears: { type: "number", default: 30 },
          propertyTaxRate: { type: "number", default: 0.011 },
          insuranceAnnual: { type: "number", default: 1500 },
          maxFrontEndDTI: { type: "number", default: 0.28 },
          maxBackEndDTI: { type: "number", default: 0.36 },
        },
        required: [
          "annualGrossIncome",
          "monthlyDebtPayments",
          "downPaymentAmount",
          "interestRate",
        ],
      },
    },
    {
      name: "calculate_monthly_payment",
      description:
        "Calculate full monthly PITI payment breakdown for a given home price and loan terms",
      input_schema: {
        type: "object" as const,
        properties: {
          homePrice: { type: "number" },
          downPaymentAmount: { type: "number" },
          interestRate: {
            type: "number",
            description: "Annual rate as decimal",
          },
          loanTermYears: { type: "number", default: 30 },
          propertyTaxRate: { type: "number", default: 0.011 },
          insuranceAnnual: { type: "number", default: 1500 },
          pmiRate: {
            type: "number",
            default: 0.005,
            description: "Annual PMI rate if down payment < 20%",
          },
        },
        required: ["homePrice", "downPaymentAmount", "interestRate"],
      },
    },
    {
      name: "calculate_dti_ratio",
      description: "Calculate front-end and back-end DTI ratios",
      input_schema: {
        type: "object" as const,
        properties: {
          grossMonthlyIncome: { type: "number" },
          proposedHousingPayment: { type: "number" },
          existingMonthlyDebts: { type: "number" },
        },
        required: [
          "grossMonthlyIncome",
          "proposedHousingPayment",
          "existingMonthlyDebts",
        ],
      },
    },
    {
      name: "generate_amortization_summary",
      description: "Generate year-by-year amortization summary for first 5 years",
      input_schema: {
        type: "object" as const,
        properties: {
          loanAmount: { type: "number" },
          interestRate: {
            type: "number",
            description: "Annual rate as decimal",
          },
          loanTermYears: { type: "number" },
        },
        required: ["loanAmount", "interestRate", "loanTermYears"],
      },
    },
  ];
}

export async function handleAffordabilityToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "calculate_max_home_price":
      return JSON.stringify(
        calculateMaxHomePrice({
          annualGrossIncome: input.annualGrossIncome as number,
          monthlyDebtPayments: input.monthlyDebtPayments as number,
          downPaymentAmount: input.downPaymentAmount as number,
          interestRate: input.interestRate as number,
          loanTermYears: (input.loanTermYears as number) ?? 30,
          propertyTaxRate: (input.propertyTaxRate as number) ?? 0.011,
          insuranceAnnual: (input.insuranceAnnual as number) ?? 1500,
          maxFrontEndDTI: (input.maxFrontEndDTI as number) ?? 0.28,
          maxBackEndDTI: (input.maxBackEndDTI as number) ?? 0.36,
        })
      );

    case "calculate_monthly_payment":
      return JSON.stringify(
        calculateMonthlyPayment({
          homePrice: input.homePrice as number,
          downPaymentAmount: input.downPaymentAmount as number,
          interestRate: input.interestRate as number,
          loanTermYears: (input.loanTermYears as number) ?? 30,
          propertyTaxRate: (input.propertyTaxRate as number) ?? 0.011,
          insuranceAnnual: (input.insuranceAnnual as number) ?? 1500,
          pmiRate: (input.pmiRate as number) ?? 0.005,
        })
      );

    case "calculate_dti_ratio":
      return JSON.stringify(
        calculateDTI({
          grossMonthlyIncome: input.grossMonthlyIncome as number,
          proposedHousingPayment: input.proposedHousingPayment as number,
          existingMonthlyDebts: input.existingMonthlyDebts as number,
        })
      );

    case "generate_amortization_summary":
      return JSON.stringify(
        generateAmortizationSummary({
          loanAmount: input.loanAmount as number,
          interestRate: input.interestRate as number,
          loanTermYears: input.loanTermYears as number,
        })
      );

    default:
      throw new Error(`Unknown affordability tool: ${name}`);
  }
}
