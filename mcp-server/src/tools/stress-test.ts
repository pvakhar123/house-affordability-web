import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { stressTestRateHike, stressTestIncomeLoss } from "../lib/financial-math.js";

export function registerStressTest(server: McpServer) {
  server.tool(
    "stress_test",
    "Run financial stress tests: what happens if mortgage rates increase or income drops? Tests rate hikes, income loss, or both.",
    {
      test_type: z.enum(["rate_hike", "income_loss", "both"]).describe("Type of stress test to run"),
      loan_amount: z.number().describe("Current loan amount"),
      current_rate: z.number().describe("Current interest rate as decimal (e.g., 0.0675)"),
      loan_term_years: z.number().default(30).describe("Loan term in years"),
      gross_monthly_income: z.number().describe("Gross monthly income"),
      existing_monthly_debts: z.number().default(0).describe("Monthly debt payments excluding mortgage"),
      property_tax_monthly: z.number().default(0).describe("Monthly property tax"),
      insurance_monthly: z.number().default(125).describe("Monthly homeowner's insurance"),
      rate_increase: z.number().default(0.02).describe("Rate increase to test (e.g., 0.02 for +2%)"),
      income_reduction_percent: z.number().default(20).describe("Percent income reduction to test"),
      monthly_housing_payment: z.number().optional().describe("Current total monthly housing payment (for income loss test)"),
      remaining_savings: z.number().default(10000).describe("Remaining savings after purchase"),
      monthly_expenses: z.number().default(2000).describe("Monthly non-housing, non-debt expenses"),
    },
    async (params) => {
      const results: Record<string, unknown> = {};

      if (params.test_type === "rate_hike" || params.test_type === "both") {
        results.rateHike = stressTestRateHike({
          loanAmount: params.loan_amount,
          baseRate: params.current_rate,
          rateIncrease: params.rate_increase,
          loanTermYears: params.loan_term_years,
          grossMonthlyIncome: params.gross_monthly_income,
          existingMonthlyDebts: params.existing_monthly_debts,
          propertyTaxMonthly: params.property_tax_monthly,
          insuranceMonthly: params.insurance_monthly,
        });
      }

      if (params.test_type === "income_loss" || params.test_type === "both") {
        // Calculate current housing payment if not provided
        const monthlyRate = params.current_rate / 12;
        const numPayments = params.loan_term_years * 12;
        const monthlyPI =
          (params.loan_amount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
          (Math.pow(1 + monthlyRate, numPayments) - 1);
        const housingPayment = params.monthly_housing_payment ??
          (monthlyPI + params.property_tax_monthly + params.insurance_monthly);

        results.incomeLoss = stressTestIncomeLoss({
          grossMonthlyIncome: params.gross_monthly_income,
          incomeReductionPercent: params.income_reduction_percent,
          monthlyHousingPayment: housingPayment,
          existingMonthlyDebts: params.existing_monthly_debts,
          remainingSavings: params.remaining_savings,
          monthlyExpenses: params.monthly_expenses,
        });
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        }],
      };
    }
  );
}
