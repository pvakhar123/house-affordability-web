import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
  generateAmortizationSummary,
  stressTestRateHike,
  stressTestIncomeLoss,
  calculateRentVsBuy,
} from "@/lib/utils/financial-math";
import { retrieve } from "@/lib/rag/retriever";

const handler = createMcpHandler(
  (server) => {
    // Tool 1: Calculate Affordability
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
      { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

        const downPaymentPercent = (params.down_payment_amount / maxPrice.maxHomePrice) * 100;

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

    // Tool 2: Analyze Property
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
      { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

    // Tool 3: Compare Scenarios
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
      { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

    // Tool 4: Stress Test
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
      { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

    // Tool 5: Rent vs Buy
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
      { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

    // Tool 6: Lookup Mortgage Info
    server.tool(
      "lookup_mortgage_info",
      "Search a curated mortgage knowledge base for information about loan types (FHA, VA, conventional), PMI, DTI ratios, closing costs, credit scores, down payment strategies, and first-time buyer programs. Returns relevant documents with source citations.",
      {
        question: z.string().describe("Question about mortgages, loan types, homebuying, etc."),
      },
      { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      async (params) => {
        const results = retrieve(params.question, 3);

        if (results.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No relevant documents found in the knowledge base for this query.",
            }],
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              documentsFound: results.length,
              results: results.map((r) => ({
                title: r.document.title,
                source: r.document.source,
                relevanceScore: Math.round(r.score * 100) / 100,
                content: r.document.content,
              })),
            }, null, 2),
          }],
        };
      }
    );
  },
  {
    serverInfo: {
      name: "home-affordability",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
