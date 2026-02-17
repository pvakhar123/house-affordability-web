import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { calculateRentVsBuy } from "../lib/financial-math.js";

export function registerRentVsBuy(server: McpServer) {
  server.tool(
    "rent_vs_buy",
    "Compare renting vs buying over a specified number of years. Accounts for rent growth, home appreciation, mortgage payments, taxes, insurance, and equity buildup.",
    {
      home_price: z.number().describe("Home purchase price"),
      down_payment_amount: z.number().describe("Down payment amount"),
      monthly_rent: z.number().describe("Current or comparable monthly rent"),
      interest_rate: z.number().default(0.0675).describe("Mortgage interest rate as decimal"),
      loan_term_years: z.number().default(30).describe("Loan term in years"),
      years: z.number().default(7).describe("Number of years to compare"),
      rent_growth_rate: z.number().default(0.03).describe("Annual rent increase rate (e.g., 0.03 for 3%)"),
      home_appreciation_rate: z.number().default(0.03).describe("Annual home price appreciation rate"),
    },
    async (params) => {
      const result = calculateRentVsBuy({
        homePrice: params.home_price,
        downPaymentAmount: params.down_payment_amount,
        interestRate: params.interest_rate,
        loanTermYears: params.loan_term_years,
        propertyTaxRate: 0.011,
        insuranceAnnual: 1500,
        maintenanceRate: 0.01,
        monthlyRent: params.monthly_rent,
        rentGrowthRate: params.rent_growth_rate,
        homeAppreciationRate: params.home_appreciation_rate,
        years: params.years,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            comparison: {
              years: params.years,
              homePrice: params.home_price,
              downPayment: params.down_payment_amount,
              monthlyRent: params.monthly_rent,
            },
            results: {
              totalRentCost: result.rentTotalCost,
              totalBuyCost: result.buyTotalCost,
              equityBuilt: result.buyEquity,
              netBuyCost: result.buyTotalCost - result.buyEquity,
            },
            verdict: result.verdict,
          }, null, 2),
        }],
      };
    }
  );
}
