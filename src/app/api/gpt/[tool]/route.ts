import { NextResponse } from "next/server";
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
import { FredApiClient } from "@/lib/services/fred-api";
import { CacheService } from "@/lib/services/cache";
import { searchProperties } from "@/lib/services/property-search";
import { lookupAreaInfo } from "@/lib/data/area-info";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tool: string }> }
) {
  const { tool } = await params;

  try {
    const body = await request.json().catch(() => ({}));

    switch (tool) {
      case "calculate-affordability": {
        const {
          annual_gross_income,
          down_payment_amount,
          monthly_debt_payments = 0,
          interest_rate = 0.0675,
          loan_term_years = 30,
        } = body;

        if (!annual_gross_income || !down_payment_amount) {
          return json({ error: "annual_gross_income and down_payment_amount are required" }, 400);
        }

        const propertyTaxRate = 0.011;
        const insuranceAnnual = 1500;

        const maxPrice = calculateMaxHomePrice({
          annualGrossIncome: annual_gross_income,
          monthlyDebtPayments: monthly_debt_payments,
          downPaymentAmount: down_payment_amount,
          interestRate: interest_rate,
          loanTermYears: loan_term_years,
          propertyTaxRate,
          insuranceAnnual,
          maxFrontEndDTI: 0.28,
          maxBackEndDTI: 0.36,
        });

        const recommendedPrice = Math.round(maxPrice.maxHomePrice * 0.85);

        const payment = calculateMonthlyPayment({
          homePrice: maxPrice.maxHomePrice,
          downPaymentAmount: down_payment_amount,
          interestRate: interest_rate,
          loanTermYears: loan_term_years,
          propertyTaxRate,
          insuranceAnnual,
          pmiRate: 0.005,
        });

        const dti = calculateDTI({
          grossMonthlyIncome: annual_gross_income / 12,
          proposedHousingPayment: payment.totalMonthly,
          existingMonthlyDebts: monthly_debt_payments,
        });

        const amortization = generateAmortizationSummary({
          loanAmount: maxPrice.maxLoanAmount,
          interestRate: interest_rate,
          loanTermYears: loan_term_years,
        });

        const downPaymentPercent = (down_payment_amount / maxPrice.maxHomePrice) * 100;

        return json({
          maxHomePrice: maxPrice.maxHomePrice,
          recommendedHomePrice: recommendedPrice,
          maxLoanAmount: maxPrice.maxLoanAmount,
          downPayment: {
            amount: down_payment_amount,
            percentOfMaxPrice: Math.round(downPaymentPercent * 10) / 10,
          },
          limitingFactor: maxPrice.limitingFactor,
          monthlyPayment: payment,
          dtiAnalysis: dti,
          amortizationSummary: amortization,
        });
      }

      case "analyze-property": {
        const {
          home_price,
          annual_gross_income,
          down_payment_amount,
          monthly_debt_payments = 0,
          interest_rate = 0.0675,
          loan_term_years = 30,
          hoa_monthly = 0,
          property_tax_annual,
        } = body;

        if (!home_price || !annual_gross_income || !down_payment_amount) {
          return json({ error: "home_price, annual_gross_income, and down_payment_amount are required" }, 400);
        }

        const propertyTaxRate = property_tax_annual
          ? property_tax_annual / home_price
          : 0.011;
        const insuranceAnnual = 1500;

        const payment = calculateMonthlyPayment({
          homePrice: home_price,
          downPaymentAmount: down_payment_amount,
          interestRate: interest_rate,
          loanTermYears: loan_term_years,
          propertyTaxRate,
          insuranceAnnual,
          pmiRate: 0.005,
        });

        const totalMonthlyWithHoa = payment.totalMonthly + hoa_monthly;

        const dti = calculateDTI({
          grossMonthlyIncome: annual_gross_income / 12,
          proposedHousingPayment: totalMonthlyWithHoa,
          existingMonthlyDebts: monthly_debt_payments,
        });

        const maxPrice = calculateMaxHomePrice({
          annualGrossIncome: annual_gross_income,
          monthlyDebtPayments: monthly_debt_payments,
          downPaymentAmount: down_payment_amount,
          interestRate: interest_rate,
          loanTermYears: loan_term_years,
          propertyTaxRate,
          insuranceAnnual,
          maxFrontEndDTI: 0.28,
          maxBackEndDTI: 0.36,
        });

        const recommendedPrice = Math.round(maxPrice.maxHomePrice * 0.85);
        const stretchFactor = home_price / maxPrice.maxHomePrice;

        let verdict: string;
        if (stretchFactor <= 0.85) verdict = "comfortable";
        else if (stretchFactor <= 1.0) verdict = "tight but affordable";
        else if (stretchFactor <= 1.15) verdict = "stretch - over budget";
        else verdict = "significantly over budget";

        return json({
          property: { askingPrice: home_price, hoaMonthly: hoa_monthly },
          monthlyPayment: { ...payment, hoa: hoa_monthly, totalWithHoa: totalMonthlyWithHoa },
          dtiAnalysis: dti,
          comparison: {
            maxAffordablePrice: maxPrice.maxHomePrice,
            recommendedPrice,
            percentOfMax: Math.round(stretchFactor * 100),
            differenceFromRecommended: home_price - recommendedPrice,
          },
          verdict,
        });
      }

      case "compare-scenarios": {
        const { home_price, down_payment_amount, scenario_a, scenario_b } = body;

        if (!home_price || !down_payment_amount || !scenario_a || !scenario_b) {
          return json({ error: "home_price, down_payment_amount, scenario_a, and scenario_b are required" }, 400);
        }

        const propertyTaxRate = 0.011;
        const insuranceAnnual = 1500;

        const paymentA = calculateMonthlyPayment({
          homePrice: home_price,
          downPaymentAmount: down_payment_amount,
          interestRate: scenario_a.interest_rate,
          loanTermYears: scenario_a.loan_term_years,
          propertyTaxRate,
          insuranceAnnual,
          pmiRate: 0.005,
        });

        const paymentB = calculateMonthlyPayment({
          homePrice: home_price,
          downPaymentAmount: down_payment_amount,
          interestRate: scenario_b.interest_rate,
          loanTermYears: scenario_b.loan_term_years,
          propertyTaxRate,
          insuranceAnnual,
          pmiRate: 0.005,
        });

        const totalCostA = paymentA.totalMonthly * scenario_a.loan_term_years * 12;
        const totalCostB = paymentB.totalMonthly * scenario_b.loan_term_years * 12;
        const loanAmount = home_price - down_payment_amount;
        const totalInterestA = totalCostA - loanAmount - (paymentA.propertyTax + paymentA.homeInsurance + paymentA.pmi) * scenario_a.loan_term_years * 12;
        const totalInterestB = totalCostB - loanAmount - (paymentB.propertyTax + paymentB.homeInsurance + paymentB.pmi) * scenario_b.loan_term_years * 12;

        return json({
          homePrice: home_price,
          downPayment: down_payment_amount,
          loanAmount,
          scenarioA: {
            label: scenario_a.label || "Scenario A",
            rate: scenario_a.interest_rate,
            termYears: scenario_a.loan_term_years,
            monthlyPayment: paymentA,
            totalCost: Math.round(totalCostA),
            totalInterest: Math.round(totalInterestA),
          },
          scenarioB: {
            label: scenario_b.label || "Scenario B",
            rate: scenario_b.interest_rate,
            termYears: scenario_b.loan_term_years,
            monthlyPayment: paymentB,
            totalCost: Math.round(totalCostB),
            totalInterest: Math.round(totalInterestB),
          },
          comparison: {
            monthlyDifference: Math.round((paymentA.totalMonthly - paymentB.totalMonthly) * 100) / 100,
            totalCostDifference: Math.round(totalCostA - totalCostB),
            totalInterestDifference: Math.round(totalInterestA - totalInterestB),
          },
        });
      }

      case "stress-test": {
        const {
          test_type,
          loan_amount,
          current_rate,
          loan_term_years = 30,
          gross_monthly_income,
          existing_monthly_debts = 0,
          property_tax_monthly = 0,
          insurance_monthly = 125,
          rate_increase = 0.02,
          income_reduction_percent = 20,
          monthly_housing_payment,
          remaining_savings = 10000,
          monthly_expenses = 2000,
        } = body;

        if (!test_type || !loan_amount || !current_rate || !gross_monthly_income) {
          return json({ error: "test_type, loan_amount, current_rate, and gross_monthly_income are required" }, 400);
        }

        const results: Record<string, unknown> = {};

        if (test_type === "rate_hike" || test_type === "both") {
          results.rateHike = stressTestRateHike({
            loanAmount: loan_amount,
            baseRate: current_rate,
            rateIncrease: rate_increase,
            loanTermYears: loan_term_years,
            grossMonthlyIncome: gross_monthly_income,
            existingMonthlyDebts: existing_monthly_debts,
            propertyTaxMonthly: property_tax_monthly,
            insuranceMonthly: insurance_monthly,
          });
        }

        if (test_type === "income_loss" || test_type === "both") {
          const monthlyRate = current_rate / 12;
          const numPayments = loan_term_years * 12;
          const monthlyPI =
            (loan_amount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
            (Math.pow(1 + monthlyRate, numPayments) - 1);
          const housingPayment = monthly_housing_payment ??
            (monthlyPI + property_tax_monthly + insurance_monthly);

          results.incomeLoss = stressTestIncomeLoss({
            grossMonthlyIncome: gross_monthly_income,
            incomeReductionPercent: income_reduction_percent,
            monthlyHousingPayment: housingPayment,
            existingMonthlyDebts: existing_monthly_debts,
            remainingSavings: remaining_savings,
            monthlyExpenses: monthly_expenses,
          });
        }

        return json(results);
      }

      case "rent-vs-buy": {
        const {
          home_price,
          down_payment_amount,
          monthly_rent,
          interest_rate = 0.0675,
          loan_term_years = 30,
          years = 7,
          rent_growth_rate = 0.03,
          home_appreciation_rate = 0.03,
        } = body;

        if (!home_price || !down_payment_amount || !monthly_rent) {
          return json({ error: "home_price, down_payment_amount, and monthly_rent are required" }, 400);
        }

        const result = calculateRentVsBuy({
          homePrice: home_price,
          downPaymentAmount: down_payment_amount,
          interestRate: interest_rate,
          loanTermYears: loan_term_years,
          propertyTaxRate: 0.011,
          insuranceAnnual: 1500,
          maintenanceRate: 0.01,
          monthlyRent: monthly_rent,
          rentGrowthRate: rent_growth_rate,
          homeAppreciationRate: home_appreciation_rate,
          years,
        });

        return json({
          comparison: { years, homePrice: home_price, downPayment: down_payment_amount, monthlyRent: monthly_rent },
          results: {
            totalRentCost: result.rentTotalCost,
            totalBuyCost: result.buyTotalCost,
            equityBuilt: result.buyEquity,
            netBuyCost: result.buyTotalCost - result.buyEquity,
          },
          verdict: result.verdict,
        });
      }

      case "lookup-mortgage-info": {
        const { question } = body;
        if (!question) {
          return json({ error: "question is required" }, 400);
        }

        const results = retrieve(question, 3);
        if (results.length === 0) {
          return json({ documentsFound: 0, results: [], message: "No relevant documents found." });
        }

        return json({
          documentsFound: results.length,
          results: results.map((r) => ({
            title: r.document.title,
            source: r.document.source,
            relevanceScore: Math.round(r.score * 100) / 100,
            content: r.document.content,
          })),
        });
      }

      case "current-rates": {
        try {
          const fred = new FredApiClient(process.env.FRED_API_KEY!, new CacheService());
          const [thirty, fifteen, arm] = await Promise.all([
            fred.getLatestObservation("MORTGAGE30US"),
            fred.getLatestObservation("MORTGAGE15US"),
            fred.getLatestObservation("MORTGAGE5US"),
          ]);
          return json({
            asOf: thirty.date,
            thirtyYearFixed: thirty.value,
            fifteenYearFixed: fifteen.value,
            fiveOneArm: arm.value,
            source: "Federal Reserve Economic Data (FRED)",
          });
        } catch {
          return json({ error: "Unable to fetch current rates" }, 503);
        }
      }

      case "search-properties": {
        const { location, max_price, min_beds } = body;
        if (!location) {
          return json({ error: "location is required (e.g., 'Austin, TX')" }, 400);
        }

        try {
          const listings = await searchProperties({
            location,
            maxPrice: max_price,
            minBeds: min_beds,
          });
          return json({
            location,
            resultCount: listings.length,
            listings,
            source: "Zillow via RapidAPI",
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Property search failed";
          return json({ error: msg }, 503);
        }
      }

      case "area-info": {
        const { location } = body;
        if (!location) {
          return json({ error: "location is required (e.g., 'Denver, CO')" }, 400);
        }

        const result = lookupAreaInfo(location);
        if (!result) {
          return json({
            error: `No data available for "${location}". Covers top 50 US metro areas.`,
            hint: "Try cities like Austin TX, Denver CO, Seattle WA, etc.",
          }, 404);
        }

        const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
        return json({
          location: result.city,
          state: result.data.state,
          propertyTaxRate: (result.data.propertyTaxRate * 100).toFixed(2) + "%",
          estimatedAnnualTaxOn400K: fmt(400000 * result.data.propertyTaxRate),
          medianHomePrice: fmt(result.data.medianHomePrice),
          schoolRating: result.data.schoolRating,
          costOfLivingIndex: result.data.costOfLivingIndex,
          costOfLivingNote: result.data.costOfLivingIndex > 100
            ? `${result.data.costOfLivingIndex - 100}% above national average`
            : `${100 - result.data.costOfLivingIndex}% below national average`,
          ...(result.data.notes ? { notes: result.data.notes } : {}),
        });
      }

      default:
        return json({ error: `Unknown tool: ${tool}`, availableTools: [
          "calculate-affordability", "analyze-property", "compare-scenarios",
          "stress-test", "rent-vs-buy", "lookup-mortgage-info",
          "current-rates", "search-properties", "area-info",
        ]}, 404);
    }
  } catch (error) {
    console.error(`GPT tool error (${tool}):`, error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
}
