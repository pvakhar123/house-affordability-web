import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateMonthlyPayment } from "../lib/financial-math.js";

export function registerCompareScenarios(server: McpServer) {
  server.tool(
    "compare_scenarios",
    "Compare two loan scenarios side-by-side (e.g., 15-year vs 30-year, different rates, different down payments). Shows monthly payment difference and total cost over the loan term.",
    {
      home_price: z.number().describe("Home price"),
      down_payment_amount: z.number().describe("Down payment amount"),
      scenario_a: z.object({
        interest_rate: z.number().describe("Interest rate as decimal"),
        loan_term_years: z.number().describe("Loan term in years"),
        label: z.string().optional().describe("Label for this scenario"),
      }),
      scenario_b: z.object({
        interest_rate: z.number().describe("Interest rate as decimal"),
        loan_term_years: z.number().describe("Loan term in years"),
        label: z.string().optional().describe("Label for this scenario"),
      }),
    },
    async (params) => {
      const propertyTaxRate = 0.011;
      const insuranceAnnual = 1500;

      const paymentA = calculateMonthlyPayment({
        homePrice: params.home_price,
        downPaymentAmount: params.down_payment_amount,
        interestRate: params.scenario_a.interest_rate,
        loanTermYears: params.scenario_a.loan_term_years,
        propertyTaxRate,
        insuranceAnnual,
        pmiRate: 0.005,
      });

      const paymentB = calculateMonthlyPayment({
        homePrice: params.home_price,
        downPaymentAmount: params.down_payment_amount,
        interestRate: params.scenario_b.interest_rate,
        loanTermYears: params.scenario_b.loan_term_years,
        propertyTaxRate,
        insuranceAnnual,
        pmiRate: 0.005,
      });

      const totalCostA = paymentA.totalMonthly * params.scenario_a.loan_term_years * 12;
      const totalCostB = paymentB.totalMonthly * params.scenario_b.loan_term_years * 12;

      const loanAmount = params.home_price - params.down_payment_amount;
      const totalInterestA = totalCostA - loanAmount - (paymentA.propertyTax + paymentA.homeInsurance + paymentA.pmi) * params.scenario_a.loan_term_years * 12;
      const totalInterestB = totalCostB - loanAmount - (paymentB.propertyTax + paymentB.homeInsurance + paymentB.pmi) * params.scenario_b.loan_term_years * 12;

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            homePrice: params.home_price,
            downPayment: params.down_payment_amount,
            loanAmount,
            scenarioA: {
              label: params.scenario_a.label || "Scenario A",
              rate: params.scenario_a.interest_rate,
              termYears: params.scenario_a.loan_term_years,
              monthlyPayment: paymentA,
              totalCost: Math.round(totalCostA),
              totalInterest: Math.round(totalInterestA),
            },
            scenarioB: {
              label: params.scenario_b.label || "Scenario B",
              rate: params.scenario_b.interest_rate,
              termYears: params.scenario_b.loan_term_years,
              monthlyPayment: paymentB,
              totalCost: Math.round(totalCostB),
              totalInterest: Math.round(totalInterestB),
            },
            comparison: {
              monthlyDifference: Math.round((paymentA.totalMonthly - paymentB.totalMonthly) * 100) / 100,
              totalCostDifference: Math.round(totalCostA - totalCostB),
              totalInterestDifference: Math.round(totalInterestA - totalInterestB),
            },
          }, null, 2),
        }],
      };
    }
  );
}
