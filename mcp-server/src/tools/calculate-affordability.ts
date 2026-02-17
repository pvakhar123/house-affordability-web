import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
  generateAmortizationSummary,
} from "../lib/financial-math.js";

export function registerCalculateAffordability(server: McpServer) {
  server.tool(
    "calculate_affordability",
    "Calculate maximum affordable home price based on income, debts, and savings. Returns max price, recommended price, monthly payment breakdown, DTI analysis, and 5-year amortization summary.",
    {
      annual_gross_income: z.number().describe("Annual gross income before taxes"),
      monthly_debt_payments: z.number().default(0).describe("Total monthly debt payments (car loans, student loans, credit cards)"),
      down_payment_amount: z.number().describe("Available down payment in dollars"),
      interest_rate: z.number().default(0.0675).describe("Annual interest rate as decimal (e.g., 0.0675 for 6.75%)"),
      loan_term_years: z.number().default(30).describe("Loan term in years (15 or 30)"),
    },
    async (params) => {
      const propertyTaxRate = 0.011;
      const insuranceAnnual = 1500;

      const maxPrice = calculateMaxHomePrice({
        annualGrossIncome: params.annual_gross_income,
        monthlyDebtPayments: params.monthly_debt_payments,
        downPaymentAmount: params.down_payment_amount,
        interestRate: params.interest_rate,
        loanTermYears: params.loan_term_years,
        propertyTaxRate,
        insuranceAnnual,
        maxFrontEndDTI: 0.28,
        maxBackEndDTI: 0.36,
      });

      const recommendedPrice = Math.round(maxPrice.maxHomePrice * 0.85);

      const payment = calculateMonthlyPayment({
        homePrice: maxPrice.maxHomePrice,
        downPaymentAmount: params.down_payment_amount,
        interestRate: params.interest_rate,
        loanTermYears: params.loan_term_years,
        propertyTaxRate,
        insuranceAnnual,
        pmiRate: 0.005,
      });

      const dti = calculateDTI({
        grossMonthlyIncome: params.annual_gross_income / 12,
        proposedHousingPayment: payment.totalMonthly,
        existingMonthlyDebts: params.monthly_debt_payments,
      });

      const amortization = generateAmortizationSummary({
        loanAmount: maxPrice.maxLoanAmount,
        interestRate: params.interest_rate,
        loanTermYears: params.loan_term_years,
      });

      const downPaymentPercent = params.down_payment_amount / maxPrice.maxHomePrice * 100;

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            maxHomePrice: maxPrice.maxHomePrice,
            recommendedHomePrice: recommendedPrice,
            maxLoanAmount: maxPrice.maxLoanAmount,
            downPayment: {
              amount: params.down_payment_amount,
              percentOfMaxPrice: Math.round(downPaymentPercent * 10) / 10,
            },
            limitingFactor: maxPrice.limitingFactor,
            monthlyPayment: payment,
            dtiAnalysis: dti,
            amortizationSummary: amortization,
          }, null, 2),
        }],
      };
    }
  );
}
