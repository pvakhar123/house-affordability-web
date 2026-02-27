import type Anthropic from "@anthropic-ai/sdk";
import { calculateMonthlyPayment } from "../utils/financial-math";
import { getStateClosingCosts, STATE_NAMES } from "../data/state-closing-costs";
import type { ClosingCostItem } from "../types/recommendations";

export function createRecommendationTools(): Anthropic.Messages.Tool[] {
  return [
    {
      name: "lookup_loan_programs",
      description:
        "Evaluate eligibility for FHA, VA, USDA, and Conventional loan programs based on buyer profile",
      input_schema: {
        type: "object" as const,
        properties: {
          creditScore: { type: "number" },
          downPaymentPercent: { type: "number" },
          firstTimeBuyer: { type: "boolean" },
          militaryVeteran: { type: "boolean" },
          annualIncome: { type: "number" },
          homePrice: { type: "number" },
          location: {
            type: "string",
            description: "Target location (for USDA eligibility)",
          },
        },
        required: [
          "creditScore",
          "downPaymentPercent",
          "firstTimeBuyer",
          "militaryVeteran",
          "annualIncome",
          "homePrice",
        ],
      },
    },
    {
      name: "compare_loan_scenarios",
      description:
        "Compare two loan options side-by-side (e.g., 30yr vs 15yr, or conventional vs FHA)",
      input_schema: {
        type: "object" as const,
        properties: {
          homePrice: { type: "number" },
          scenarios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                downPaymentAmount: { type: "number" },
                interestRate: { type: "number" },
                loanTermYears: { type: "number" },
                pmiRate: { type: "number" },
              },
              required: [
                "label",
                "downPaymentAmount",
                "interestRate",
                "loanTermYears",
              ],
            },
          },
        },
        required: ["homePrice", "scenarios"],
      },
    },
    {
      name: "suggest_savings_strategies",
      description:
        "Suggest savings strategies based on gap between current savings and ideal down payment",
      input_schema: {
        type: "object" as const,
        properties: {
          currentSavings: { type: "number" },
          targetDownPayment: { type: "number" },
          monthlyIncome: { type: "number" },
          monthlyExpenses: { type: "number" },
          monthlyDebt: { type: "number" },
        },
        required: [
          "currentSavings",
          "targetDownPayment",
          "monthlyIncome",
          "monthlyExpenses",
          "monthlyDebt",
        ],
      },
    },
    {
      name: "estimate_closing_costs",
      description:
        "Estimate closing costs as a breakdown based on home price and location",
      input_schema: {
        type: "object" as const,
        properties: {
          homePrice: { type: "number" },
          loanAmount: { type: "number" },
          state: {
            type: "string",
            description: "US state abbreviation (e.g., CA, TX)",
          },
          propertyTaxRate: {
            type: "number",
            description: "Local property tax rate as decimal (e.g., 0.0167 for 1.67%)",
          },
        },
        required: ["homePrice", "loanAmount"],
      },
    },
  ];
}

export async function handleRecommendationToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "lookup_loan_programs": {
      const credit = input.creditScore as number;
      const dp = input.downPaymentPercent as number;
      const veteran = input.militaryVeteran as boolean;
      const homePrice = input.homePrice as number;

      const programs = [];

      // Conventional
      programs.push({
        type: "conventional",
        eligible: credit >= 620 && dp >= 3,
        eligibilityReason:
          credit < 620
            ? `Credit score ${credit} below 620 minimum`
            : dp < 3
              ? "Need at least 3% down payment"
              : "Meets all requirements",
        minDownPaymentPercent: credit >= 740 ? 3 : 5,
        pmiRequired: dp < 20,
        pros: [
          "No upfront mortgage insurance premium",
          "PMI removable at 80% LTV",
          "Flexible property types",
          credit >= 740 ? "Best rates with excellent credit" : "Widely available",
        ],
        cons: [
          dp < 20 ? "PMI required until 20% equity" : null,
          credit < 700 ? "Higher rates with lower credit" : null,
          "Stricter DTI requirements",
        ].filter(Boolean),
      });

      // FHA
      programs.push({
        type: "fha",
        eligible: credit >= 500,
        eligibilityReason:
          credit < 500
            ? `Credit score ${credit} below 500 minimum`
            : credit < 580
              ? "Eligible but requires 10% down payment"
              : "Meets all requirements",
        minDownPaymentPercent: credit >= 580 ? 3.5 : 10,
        pmiRequired: true,
        pros: [
          "Lower credit score requirements (500+)",
          credit >= 580 ? "Only 3.5% down payment" : "Available with 10% down",
          "More lenient DTI ratios (up to 43%)",
          "Good for first-time buyers",
        ],
        cons: [
          "Mortgage insurance for life of loan (if < 10% down)",
          "Upfront MIP of 1.75% of loan amount",
          "Property must meet FHA standards",
          "Loan limits may restrict options in high-cost areas",
        ],
      });

      // VA
      programs.push({
        type: "va",
        eligible: veteran,
        eligibilityReason: veteran
          ? "Eligible as military veteran/active duty"
          : "Not eligible - requires military service",
        minDownPaymentPercent: 0,
        pmiRequired: false,
        pros: [
          "No down payment required",
          "No PMI",
          "Competitive interest rates",
          "No loan limits for qualified buyers",
        ],
        cons: [
          "VA funding fee (1.25-3.3% of loan)",
          "Property must be primary residence",
          "Must meet VA appraisal requirements",
        ],
      });

      // USDA
      const eligibleForUSDA = (input.annualIncome as number) <= 115000; // simplified
      programs.push({
        type: "usda",
        eligible: eligibleForUSDA,
        eligibilityReason: eligibleForUSDA
          ? "May be eligible (income within limits, must verify rural area)"
          : "Income exceeds USDA limits for most areas",
        minDownPaymentPercent: 0,
        pmiRequired: true,
        pros: [
          "No down payment required",
          "Below-market interest rates",
          "Low mortgage insurance rates",
        ],
        cons: [
          "Property must be in USDA-eligible rural area",
          "Income limits apply",
          "Guarantee fee required (1% upfront + 0.35% annual)",
          "Primary residence only",
        ],
      });

      return JSON.stringify(programs);
    }

    case "compare_loan_scenarios": {
      const homePrice = input.homePrice as number;
      const scenarios = input.scenarios as Array<{
        label: string;
        downPaymentAmount: number;
        interestRate: number;
        loanTermYears: number;
        pmiRate?: number;
      }>;

      const comparisons = scenarios.map((s) => {
        const payment = calculateMonthlyPayment({
          homePrice,
          downPaymentAmount: s.downPaymentAmount,
          interestRate: s.interestRate,
          loanTermYears: s.loanTermYears,
          propertyTaxRate: 0.011,
          insuranceAnnual: 1500,
          pmiRate: s.pmiRate ?? 0.005,
        });
        const totalCost = payment.totalMonthly * s.loanTermYears * 12;
        return {
          label: s.label,
          monthlyPayment: payment.totalMonthly,
          totalCost: Math.round(totalCost),
          breakdown: payment,
        };
      });

      return JSON.stringify(comparisons);
    }

    case "suggest_savings_strategies": {
      const current = input.currentSavings as number;
      const target = input.targetDownPayment as number;
      const income = input.monthlyIncome as number;
      const expenses = input.monthlyExpenses as number;
      const debt = input.monthlyDebt as number;
      const gap = Math.max(0, target - current);
      const monthlySurplus = income - expenses - debt;

      const strategies = [];

      if (gap > 0 && monthlySurplus > 0) {
        const aggressiveMonths = Math.ceil(gap / (monthlySurplus * 0.7));
        const moderateMonths = Math.ceil(gap / (monthlySurplus * 0.4));

        strategies.push({
          title: "Aggressive Savings Plan",
          description: `Save 70% of monthly surplus ($${Math.round(monthlySurplus * 0.7).toLocaleString()}/mo)`,
          potentialSavings: gap,
          timeframeMonths: aggressiveMonths,
          difficulty: "hard" as const,
        });

        strategies.push({
          title: "Moderate Savings Plan",
          description: `Save 40% of monthly surplus ($${Math.round(monthlySurplus * 0.4).toLocaleString()}/mo)`,
          potentialSavings: gap,
          timeframeMonths: moderateMonths,
          difficulty: "moderate" as const,
        });
      }

      if (gap > 0) {
        strategies.push({
          title: "Consider Lower Down Payment",
          description: `FHA allows 3.5% down ($${Math.round(target * 0.175).toLocaleString()} instead of $${target.toLocaleString()} at 20%)`,
          potentialSavings: Math.round(target * 0.825),
          timeframeMonths: 0,
          difficulty: "easy" as const,
        });

        strategies.push({
          title: "Down Payment Assistance Programs",
          description:
            "Research state and local DPA programs. Many offer grants or forgivable loans for first-time buyers.",
          potentialSavings: Math.min(gap, 25000),
          timeframeMonths: 2,
          difficulty: "moderate" as const,
        });
      }

      return JSON.stringify(strategies);
    }

    case "estimate_closing_costs": {
      const homePrice = input.homePrice as number;
      const loanAmount = input.loanAmount as number;
      const stateAbbr = input.state as string | undefined;
      const propertyTaxRateOverride = input.propertyTaxRate as number | undefined;

      const stateData = stateAbbr ? getStateClosingCosts(stateAbbr) : null;
      const isStateSpecific = !!stateData;

      const transferTaxRate = stateData?.transferTaxRate ?? 0;
      const recordingFees = stateData?.recordingFees ?? 200;
      const attorneyFee = stateData?.attorneyRequired ? (stateData.attorneyFeeEstimate || 1000) : 0;
      const titleInsuranceRate = stateData?.titleInsuranceRate ?? 0.005;
      const insuranceAnnual = stateData?.avgHomeInsuranceAnnual ?? 1500;
      const propertyTaxRate = propertyTaxRateOverride ?? stateData?.avgPropertyTaxRate ?? 0.011;

      const breakdown: ClosingCostItem[] = [
        { item: "Loan origination fee (1%)", amount: Math.round(loanAmount * 0.01), category: "lender" },
        { item: "Appraisal", amount: 500, category: "lender" },
        { item: "Credit report", amount: 50, category: "lender" },
        { item: "Underwriting fee", amount: 750, category: "lender" },
        { item: "Title insurance", amount: Math.round(homePrice * titleInsuranceRate), category: "title_escrow" },
        { item: "Title search", amount: 300, category: "title_escrow" },
        { item: "Escrow/settlement fee", amount: 500, category: "title_escrow" },
        ...(attorneyFee > 0 ? [{ item: "Attorney fee (required)", amount: attorneyFee, category: "title_escrow" as const }] : []),
        { item: "Recording fees", amount: recordingFees, category: "government" },
        ...(transferTaxRate > 0 ? [{ item: `Transfer tax (${(transferTaxRate * 100).toFixed(2)}%)`, amount: Math.round(homePrice * transferTaxRate), category: "government" as const }] : []),
        { item: "Prepaid property taxes (3 months)", amount: Math.round((homePrice * propertyTaxRate) / 4), category: "prepaid" },
        { item: `Prepaid homeowners insurance (1 year)`, amount: insuranceAnnual, category: "prepaid" },
        { item: "Prepaid interest (15 days est.)", amount: Math.round((loanAmount * 0.065 * 15) / 365), category: "prepaid" },
        { item: "Home inspection", amount: 400, category: "prepaid" },
      ];

      const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
      const categoryTotals = {
        lender: breakdown.filter(i => i.category === "lender").reduce((s, i) => s + i.amount, 0),
        title_escrow: breakdown.filter(i => i.category === "title_escrow").reduce((s, i) => s + i.amount, 0),
        government: breakdown.filter(i => i.category === "government").reduce((s, i) => s + i.amount, 0),
        prepaid: breakdown.filter(i => i.category === "prepaid").reduce((s, i) => s + i.amount, 0),
      };

      return JSON.stringify({
        lowEstimate: Math.round(total * 0.85),
        highEstimate: Math.round(total * 1.15),
        breakdown,
        state: stateAbbr ?? null,
        stateName: stateAbbr ? STATE_NAMES[stateAbbr.toUpperCase()] ?? null : null,
        isStateSpecific,
        categoryTotals,
      });
    }

    default:
      throw new Error(`Unknown recommendation tool: ${name}`);
  }
}
