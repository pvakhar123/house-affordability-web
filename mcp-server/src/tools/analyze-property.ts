import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
} from "../lib/financial-math.js";

export function registerAnalyzeProperty(server: McpServer) {
  server.tool(
    "analyze_property",
    "Analyze whether a buyer can afford a specific property at a given price. Returns monthly payment, DTI, and a verdict (comfortable, tight, stretch, over budget).",
    {
      home_price: z.number().describe("Asking price of the property"),
      annual_gross_income: z.number().describe("Annual gross income before taxes"),
      monthly_debt_payments: z.number().default(0).describe("Total monthly debt payments"),
      down_payment_amount: z.number().describe("Available down payment in dollars"),
      interest_rate: z.number().default(0.0675).describe("Annual interest rate as decimal"),
      loan_term_years: z.number().default(30).describe("Loan term in years"),
      hoa_monthly: z.number().default(0).describe("Monthly HOA fees"),
      property_tax_annual: z.number().optional().describe("Annual property tax (defaults to 1.1% of price)"),
    },
    async (params) => {
      const propertyTaxRate = params.property_tax_annual
        ? params.property_tax_annual / params.home_price
        : 0.011;
      const insuranceAnnual = 1500;

      const payment = calculateMonthlyPayment({
        homePrice: params.home_price,
        downPaymentAmount: params.down_payment_amount,
        interestRate: params.interest_rate,
        loanTermYears: params.loan_term_years,
        propertyTaxRate,
        insuranceAnnual,
        pmiRate: 0.005,
      });

      const totalMonthlyWithHoa = payment.totalMonthly + params.hoa_monthly;

      const dti = calculateDTI({
        grossMonthlyIncome: params.annual_gross_income / 12,
        proposedHousingPayment: totalMonthlyWithHoa,
        existingMonthlyDebts: params.monthly_debt_payments,
      });

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
      const stretchFactor = params.home_price / maxPrice.maxHomePrice;

      let verdict: string;
      if (stretchFactor <= 0.85) verdict = "comfortable";
      else if (stretchFactor <= 1.0) verdict = "tight but affordable";
      else if (stretchFactor <= 1.15) verdict = "stretch - over budget";
      else verdict = "significantly over budget";

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            property: {
              askingPrice: params.home_price,
              hoaMonthly: params.hoa_monthly,
            },
            monthlyPayment: {
              ...payment,
              hoa: params.hoa_monthly,
              totalWithHoa: totalMonthlyWithHoa,
            },
            dtiAnalysis: dti,
            comparison: {
              maxAffordablePrice: maxPrice.maxHomePrice,
              recommendedPrice,
              percentOfMax: Math.round(stretchFactor * 100),
              differenceFromRecommended: params.home_price - recommendedPrice,
            },
            verdict,
          }, null, 2),
        }],
      };
    }
  );
}
