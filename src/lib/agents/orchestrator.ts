import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { PROMPTS } from "../utils/prompts";
import { traceGeneration, getLangfuse } from "../langfuse";
import { FredApiClient } from "../services/fred-api";
import { BlsApiClient } from "../services/bls-api";
import { HousingApiClient } from "../services/housing-api";
import { CacheService } from "../services/cache";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
  generateAmortizationSummary,
  stressTestRateHike,
  stressTestIncomeLoss,
  evaluateEmergencyFund,
  calculateRentVsBuy,
} from "../utils/financial-math";
import { handleRecommendationToolCall } from "../tools/recommendation-tools";
import type {
  UserProfile,
  FinalReport,
  MarketDataResult,
  AffordabilityResult,
  RiskReport,
  RecommendationsResult,
  PropertyAnalysis,
  RentVsBuyReport,
  StressTestResult,
  RiskFlag,
  PreApprovalReadinessScore,
  ReadinessActionItem,
} from "../types/index";

const cache = new CacheService();

export type StreamPhase =
  | { phase: "market_data"; marketSnapshot: MarketDataResult }
  | { phase: "analysis"; affordability: AffordabilityResult; riskAssessment: RiskReport; recommendations: RecommendationsResult; propertyAnalysis?: PropertyAnalysis; rentVsBuy?: RentVsBuyReport }
  | { phase: "summary"; summary: string }
  | { phase: "complete"; disclaimers: string[]; generatedAt: string };

export class OrchestratorAgent {
  private client: Anthropic;
  private traceId?: string;

  constructor() {
    this.client = new Anthropic();
  }

  async run(userProfile: UserProfile, onProgress?: (event: StreamPhase) => void): Promise<FinalReport> {
    const t0 = Date.now();
    const langfuseTrace = getLangfuse().trace({
      name: "full-analysis",
      metadata: {
        income: userProfile.annualGrossIncome,
        location: userProfile.targetLocation,
        creditScore: userProfile.creditScore,
        hasProperty: !!userProfile.property,
      },
    });
    this.traceId = langfuseTrace.id;

    // ── Phase 1: Fetch market data directly (parallel APIs, ~2-5s) ──
    console.log("\n[1/3] Fetching market data...");
    const marketData = await this.fetchMarketData(userProfile.targetLocation);
    console.log(`      Done (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    onProgress?.({ phase: "market_data", marketSnapshot: marketData });

    // ── Phase 2: Compute everything directly (instant — pure JS math) ──
    console.log("[2/3] Computing analysis...");
    const t2 = Date.now();
    const affordability = this.computeAffordability(userProfile, marketData);
    const riskReport = this.computeRiskAssessment(userProfile, marketData, affordability);
    const recommendations = await this.computeRecommendations(userProfile, marketData, affordability, riskReport);

    // Property-specific analysis (if a property was provided)
    let propertyAnalysis: PropertyAnalysis | undefined;
    if (userProfile.property) {
      propertyAnalysis = this.computePropertyAnalysis(userProfile, marketData, affordability);
    }

    // Rent vs Buy analysis (if current rent was provided)
    let rentVsBuy: RentVsBuyReport | undefined;
    if (userProfile.currentMonthlyRent && userProfile.currentMonthlyRent > 0) {
      rentVsBuy = this.computeRentVsBuy(userProfile, marketData, affordability);
    }

    // Pre-approval readiness score
    const preApprovalReadiness = this.computePreApprovalReadiness(userProfile, affordability, riskReport);

    console.log(`      Done (${((Date.now() - t2) / 1000).toFixed(1)}s)`);
    onProgress?.({ phase: "analysis", affordability, riskAssessment: riskReport, recommendations, propertyAnalysis, rentVsBuy });

    // ── Phase 3: Single Claude call for narrative summary (~3-5s) ──
    console.log("[3/3] Generating AI summary...");
    const t3 = Date.now();
    const summary = await this.synthesize(userProfile, marketData, affordability, riskReport, recommendations, propertyAnalysis);
    console.log(`      Done (${((Date.now() - t3) / 1000).toFixed(1)}s)`);
    onProgress?.({ phase: "summary", summary });

    const disclaimers = [
      "This analysis is for informational purposes only and does not constitute financial advice.",
      "Consult a licensed mortgage professional before making any home purchase decisions.",
      "Market data is based on the most recent available figures and may not reflect real-time conditions.",
    ];
    const generatedAt = new Date().toISOString();
    onProgress?.({ phase: "complete", disclaimers, generatedAt });

    console.log(`\nTotal: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    return {
      summary,
      affordability,
      marketSnapshot: marketData,
      riskAssessment: riskReport,
      recommendations,
      propertyAnalysis,
      rentVsBuy,
      preApprovalReadiness,
      disclaimers,
      generatedAt,
    };
  }

  // ─────────────────────────────────────────────
  // Phase 1: Direct market data fetching
  // ─────────────────────────────────────────────

  private async fetchMarketData(location?: string): Promise<MarketDataResult> {
    const fredClient = new FredApiClient(config.fredApiKey, cache);
    const blsClient = new BlsApiClient(config.blsApiKey);
    const housingClient = config.rapidApiKey
      ? new HousingApiClient(config.rapidApiKey, cache)
      : null;

    // Fire all API calls in parallel
    const [ratesResult, pricesResult, inflationResult, regionalResult] =
      await Promise.allSettled([
        // Mortgage rates
        Promise.all([
          fredClient.getMortgage30YRate(),
          fredClient.getMortgage15YRate(),
          fredClient.getFedFundsRate(),
        ]),
        // Home prices
        Promise.all([
          fredClient.getMedianHomePrice(),
          fredClient.getMedianNewHomePrice(),
          fredClient.getCaseShillerIndex(),
        ]),
        // Inflation
        Promise.all([
          blsClient.getShelterInflation(),
          blsClient.getGeneralInflation(),
        ]),
        // Regional (optional)
        location && housingClient
          ? housingClient.getRegionalData(location)
          : Promise.resolve(null),
      ]);

    // Assemble with fallbacks
    const fallback = this.getFallbackMarketData();

    let mortgageRates = fallback.mortgageRates;
    if (ratesResult.status === "fulfilled") {
      const [r30, r15, ff] = ratesResult.value;
      mortgageRates = {
        thirtyYearFixed: r30.value,
        fifteenYearFixed: r15.value,
        federalFundsRate: ff.value,
        dataDate: r30.date,
        source: "FRED (Federal Reserve Economic Data)",
      };
    } else {
      console.log("      Warning: Rates fetch failed, using fallback");
    }

    let medianHomePrices = fallback.medianHomePrices;
    if (pricesResult.status === "fulfilled") {
      const [med, medNew, cs] = pricesResult.value;
      medianHomePrices = {
        national: med.value * 1000,
        nationalNew: medNew.value * 1000,
        caseShillerIndex: cs.value,
        dataDate: med.date,
      };
    } else {
      console.log("      Warning: Prices fetch failed, using fallback");
    }

    let inflationData = fallback.inflationData;
    if (inflationResult.status === "fulfilled") {
      const [shelter, general] = inflationResult.value;
      inflationData = {
        shelterCpiCurrent: shelter.current,
        shelterCpiYearAgo: shelter.yearAgo,
        shelterInflationRate: shelter.rate,
        generalInflationRate: general,
      };
    } else {
      console.log("      Warning: Inflation fetch failed, using fallback");
    }

    // Regional is optional — not a failure if missing
    const regional =
      regionalResult.status === "fulfilled" && regionalResult.value
        ? [regionalResult.value]
        : undefined;
    if (regional) {
      medianHomePrices.regional = regional;
    }

    return {
      mortgageRates,
      medianHomePrices,
      marketTrends: [],
      inflationData,
      fetchedAt: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────
  // Phase 2a: Direct affordability computation
  // ─────────────────────────────────────────────

  private computeAffordability(
    profile: UserProfile,
    market: MarketDataResult
  ): AffordabilityResult {
    const totalIncome = profile.annualGrossIncome + (profile.additionalIncome ?? 0);
    const loanTerm = profile.preferredLoanTerm ?? 30;
    const rate = market.mortgageRates.thirtyYearFixed / 100;
    const downPayment = profile.downPaymentSavings;
    const propertyTaxRate = 0.011;
    const insuranceAnnual = 1500;
    const pmiRate = 0.005;

    // Max home price
    const { maxHomePrice, limitingFactor } = calculateMaxHomePrice({
      annualGrossIncome: totalIncome,
      monthlyDebtPayments: profile.monthlyDebtPayments,
      downPaymentAmount: downPayment,
      interestRate: rate,
      loanTermYears: loanTerm,
      propertyTaxRate,
      insuranceAnnual,
      maxFrontEndDTI: 0.28,
      maxBackEndDTI: 0.36,
    });

    // Recommended = 85% of max
    const recommendedHomePrice = Math.round(maxHomePrice * 0.85);
    const downPaymentPercent =
      recommendedHomePrice > 0
        ? Math.round((downPayment / recommendedHomePrice) * 100)
        : 0;
    const loanAmount = Math.max(0, recommendedHomePrice - downPayment);

    // Monthly payment at recommended price
    const monthlyPayment = calculateMonthlyPayment({
      homePrice: recommendedHomePrice,
      downPaymentAmount: downPayment,
      interestRate: rate,
      loanTermYears: loanTerm,
      propertyTaxRate,
      insuranceAnnual,
      pmiRate,
    });

    // DTI
    const dtiAnalysis = calculateDTI({
      grossMonthlyIncome: totalIncome / 12,
      proposedHousingPayment: monthlyPayment.totalMonthly,
      existingMonthlyDebts: profile.monthlyDebtPayments,
    });

    // Amortization
    const amortizationSummary = generateAmortizationSummary({
      loanAmount,
      interestRate: rate,
      loanTermYears: loanTerm,
    });

    return {
      maxHomePrice,
      recommendedHomePrice,
      downPaymentAmount: downPayment,
      downPaymentPercent,
      loanAmount,
      monthlyPayment,
      dtiAnalysis,
      amortizationSummary,
    };
  }

  // ─────────────────────────────────────────────
  // Phase 2b: Direct risk assessment
  // ─────────────────────────────────────────────

  private computeRiskAssessment(
    profile: UserProfile,
    market: MarketDataResult,
    afford: AffordabilityResult
  ): RiskReport {
    const totalIncome = profile.annualGrossIncome + (profile.additionalIncome ?? 0);
    const grossMonthly = totalIncome / 12;
    const rate = market.mortgageRates.thirtyYearFixed / 100;
    const totalSavings = profile.downPaymentSavings + (profile.additionalSavings ?? 0);
    const monthlyExpenses = profile.monthlyExpenses ?? 3000;
    const estimatedClosingCosts = afford.recommendedHomePrice * 0.03;
    const postPurchaseSavings = totalSavings - afford.downPaymentAmount - estimatedClosingCosts;

    // Stress tests: rate hikes
    const stressTests: StressTestResult[] = [];
    for (const hike of [1, 2, 3]) {
      const result = stressTestRateHike({
        loanAmount: afford.loanAmount,
        baseRate: rate,
        rateIncrease: hike / 100,
        loanTermYears: profile.preferredLoanTerm ?? 30,
        grossMonthlyIncome: grossMonthly,
        existingMonthlyDebts: profile.monthlyDebtPayments,
        propertyTaxMonthly: afford.monthlyPayment.propertyTax,
        insuranceMonthly: afford.monthlyPayment.homeInsurance,
      });
      stressTests.push({
        scenario: `Rate +${hike}%`,
        description: `If rates rise from ${(rate * 100).toFixed(1)}% to ${(result.newRate * 100).toFixed(1)}%`,
        newMonthlyPayment: result.newMonthlyPayment,
        newDTI: result.newDTI,
        canAfford: result.canAfford,
        severity: result.severity,
      });
    }

    // Stress tests: income loss
    for (const loss of [20, 50]) {
      const result = stressTestIncomeLoss({
        grossMonthlyIncome: grossMonthly,
        incomeReductionPercent: loss,
        monthlyHousingPayment: afford.monthlyPayment.totalMonthly,
        existingMonthlyDebts: profile.monthlyDebtPayments,
        remainingSavings: Math.max(0, postPurchaseSavings),
        monthlyExpenses,
      });
      stressTests.push({
        scenario: `Income -${loss}%`,
        description: `If income drops by ${loss}%`,
        newDTI: result.newDTI,
        canAfford: result.canAfford,
        monthsOfRunway: result.monthsOfRunway,
        severity: result.severity,
      });
    }

    // Emergency fund
    const emergencyResult = evaluateEmergencyFund({
      totalSavings,
      downPaymentAmount: afford.downPaymentAmount,
      estimatedClosingCosts,
      monthlyExpenses,
      monthlyHousingPayment: afford.monthlyPayment.totalMonthly,
    });

    const emergencyFundAnalysis = {
      currentEmergencyFund: totalSavings,
      postPurchaseEmergencyFund: emergencyResult.postPurchaseSavings,
      monthlyExpenses: emergencyResult.monthlyNeed,
      monthsCovered: emergencyResult.monthsCovered,
      adequate: emergencyResult.adequate,
      recommendation: emergencyResult.recommendation,
    };

    // Rent vs Buy (estimate monthly rent from expenses or use a proxy)
    const estimatedRent = monthlyExpenses * 0.4; // rough proxy
    const fiveYear = calculateRentVsBuy({
      homePrice: afford.recommendedHomePrice,
      downPaymentAmount: afford.downPaymentAmount,
      interestRate: rate,
      loanTermYears: profile.preferredLoanTerm ?? 30,
      propertyTaxRate: 0.011,
      insuranceAnnual: 1500,
      maintenanceRate: 0.01,
      monthlyRent: estimatedRent,
      rentGrowthRate: 0.03,
      homeAppreciationRate: 0.035,
      years: 5,
    });

    const tenYear = calculateRentVsBuy({
      homePrice: afford.recommendedHomePrice,
      downPaymentAmount: afford.downPaymentAmount,
      interestRate: rate,
      loanTermYears: profile.preferredLoanTerm ?? 30,
      propertyTaxRate: 0.011,
      insuranceAnnual: 1500,
      maintenanceRate: 0.01,
      monthlyRent: estimatedRent,
      rentGrowthRate: 0.03,
      homeAppreciationRate: 0.035,
      years: 10,
    });

    // Risk flags
    const riskFlags: RiskFlag[] = [];

    if (afford.dtiAnalysis.backEndRatio > 43) {
      riskFlags.push({
        category: "debt",
        severity: "critical",
        message: `Back-end DTI of ${afford.dtiAnalysis.backEndRatio}% exceeds 43% threshold`,
        recommendation: "Pay down debts or increase income before buying",
      });
    } else if (afford.dtiAnalysis.backEndRatio > 36) {
      riskFlags.push({
        category: "debt",
        severity: "warning",
        message: `Back-end DTI of ${afford.dtiAnalysis.backEndRatio}% is above ideal 36%`,
        recommendation: "Consider a lower-priced home or pay down some debts",
      });
    }

    if (profile.creditScore < 620) {
      riskFlags.push({
        category: "credit",
        severity: "critical",
        message: `Credit score of ${profile.creditScore} limits loan options`,
        recommendation: "Focus on improving credit score before applying. Consider FHA (min 580 for 3.5% down)",
      });
    } else if (profile.creditScore < 700) {
      riskFlags.push({
        category: "credit",
        severity: "warning",
        message: `Credit score of ${profile.creditScore} may result in higher rates`,
        recommendation: "A score above 740 gets the best rates. Consider credit improvement strategies",
      });
    }

    if (!emergencyResult.adequate) {
      riskFlags.push({
        category: "savings",
        severity: emergencyResult.monthsCovered < 3 ? "critical" : "warning",
        message: `Only ${emergencyResult.monthsCovered} months of reserves after purchase`,
        recommendation:
          emergencyResult.monthsCovered < 3
            ? "This is risky. Save more or target a lower-priced home"
            : "Try to build up to 6 months of reserves",
      });
    }

    if (afford.downPaymentPercent < 20) {
      riskFlags.push({
        category: "savings",
        severity: "info",
        message: `Down payment of ${afford.downPaymentPercent}% requires PMI ($${Math.round(afford.monthlyPayment.pmi)}/mo)`,
        recommendation: "PMI adds to monthly costs. It drops off at 20% equity",
      });
    }

    // Overall risk score (0-100, lower is better)
    let score = 30; // base
    if (afford.dtiAnalysis.backEndRatio > 43) score += 25;
    else if (afford.dtiAnalysis.backEndRatio > 36) score += 10;
    if (profile.creditScore < 620) score += 20;
    else if (profile.creditScore < 700) score += 10;
    if (emergencyResult.monthsCovered < 3) score += 20;
    else if (emergencyResult.monthsCovered < 6) score += 10;
    if (stressTests.some((t) => t.severity === "unsustainable")) score += 10;

    const overallRiskLevel: RiskReport["overallRiskLevel"] =
      score <= 30 ? "low" : score <= 50 ? "moderate" : score <= 70 ? "high" : "very_high";

    return {
      overallRiskLevel,
      overallScore: Math.min(score, 100),
      stressTests,
      riskFlags,
      emergencyFundAnalysis,
      rentVsBuy: {
        fiveYear,
        tenYear,
        breakEvenYears: fiveYear.buyEquity > 0 ? 5 : 10,
      },
    };
  }

  // ─────────────────────────────────────────────
  // Phase 2c: Direct recommendations
  // ─────────────────────────────────────────────

  private async computeRecommendations(
    profile: UserProfile,
    market: MarketDataResult,
    afford: AffordabilityResult,
    risk: RiskReport
  ): Promise<RecommendationsResult> {
    const totalIncome = profile.annualGrossIncome + (profile.additionalIncome ?? 0);
    const rate = market.mortgageRates.thirtyYearFixed / 100;

    // Loan programs
    const programsJson = await handleRecommendationToolCall("lookup_loan_programs", {
      creditScore: profile.creditScore,
      downPaymentPercent: afford.downPaymentPercent,
      firstTimeBuyer: profile.firstTimeBuyer ?? false,
      militaryVeteran: profile.militaryVeteran ?? false,
      annualIncome: totalIncome,
      homePrice: afford.recommendedHomePrice,
      location: profile.targetLocation,
    });
    const rawPrograms = JSON.parse(programsJson) as Array<{
      type: string;
      eligible: boolean;
      eligibilityReason: string;
      minDownPaymentPercent: number;
      pmiRequired: boolean;
      pros: string[];
      cons: string[];
    }>;

    // Enrich loan options with payment calculations
    const loanOptions = rawPrograms.map((prog) => {
      const dpPercent = Math.max(prog.minDownPaymentPercent, afford.downPaymentPercent);
      const dpAmount = Math.round(afford.recommendedHomePrice * (dpPercent / 100));
      const pmiRate = prog.pmiRequired ? 0.005 : 0;
      const payment = calculateMonthlyPayment({
        homePrice: afford.recommendedHomePrice,
        downPaymentAmount: dpAmount,
        interestRate: rate,
        loanTermYears: profile.preferredLoanTerm ?? 30,
        propertyTaxRate: 0.011,
        insuranceAnnual: 1500,
        pmiRate,
      });
      return {
        type: prog.type as "conventional" | "fha" | "va" | "usda",
        eligible: prog.eligible,
        eligibilityReason: prog.eligibilityReason,
        minDownPaymentPercent: prog.minDownPaymentPercent,
        estimatedRate: market.mortgageRates.thirtyYearFixed,
        monthlyPayment: payment.totalMonthly,
        pmiRequired: prog.pmiRequired,
        pmiMonthlyEstimate: payment.pmi,
        totalCostOver30Years: Math.round(payment.totalMonthly * 360),
        pros: prog.pros,
        cons: prog.cons,
      };
    });

    // Closing costs
    const closingJson = await handleRecommendationToolCall("estimate_closing_costs", {
      homePrice: afford.recommendedHomePrice,
      loanAmount: afford.loanAmount,
    });
    const closingCostEstimate = JSON.parse(closingJson);

    // Savings strategies
    const idealDownPayment = Math.round(afford.recommendedHomePrice * 0.2);
    const strategiesJson = await handleRecommendationToolCall("suggest_savings_strategies", {
      currentSavings: profile.downPaymentSavings + (profile.additionalSavings ?? 0),
      targetDownPayment: idealDownPayment,
      monthlyIncome: totalIncome / 12,
      monthlyExpenses: profile.monthlyExpenses ?? 3000,
      monthlyDebt: profile.monthlyDebtPayments,
    });
    const savingsStrategies = JSON.parse(strategiesJson);

    // Build risk-aware general advice
    const generalAdvice: string[] = [
      "Get pre-approved before shopping to strengthen your offers.",
      "Budget for closing costs (2-5% of home price) on top of down payment.",
    ];

    // Add risk mitigation advice based on identified risk flags
    for (const flag of risk.riskFlags) {
      if (flag.recommendation) {
        generalAdvice.push(flag.recommendation);
      }
    }

    // DTI-specific mitigation
    if (afford.dtiAnalysis.backEndRatio > 36) {
      generalAdvice.push(
        `Your DTI is ${afford.dtiAnalysis.backEndRatio}%. Pay off smallest debts first to lower monthly obligations before applying.`
      );
    }

    // Credit score mitigation
    if (profile.creditScore < 700) {
      generalAdvice.push(
        `A credit score of ${profile.creditScore} means higher rates. Paying down credit card balances below 30% utilization can boost your score quickly.`
      );
    }

    // Emergency fund mitigation
    if (risk.emergencyFundAnalysis.monthsCovered < 6) {
      const deficit = Math.round(
        risk.emergencyFundAnalysis.monthlyExpenses * 6 -
          risk.emergencyFundAnalysis.postPurchaseEmergencyFund
      );
      if (deficit > 0) {
        generalAdvice.push(
          `After purchase, you'd have only ${risk.emergencyFundAnalysis.monthsCovered} months of reserves. Consider saving an additional $${deficit.toLocaleString()} or choosing a lower-priced home.`
        );
      }
    }

    // Stress test mitigation
    const failedStress = risk.stressTests.filter((t) => !t.canAfford);
    if (failedStress.length > 0) {
      generalAdvice.push(
        `Stress tests show risk under ${failedStress.map((t) => t.scenario).join(" and ")} scenarios. Consider a fixed-rate mortgage and building a larger financial buffer.`
      );
    }

    // PMI mitigation
    if (afford.downPaymentPercent < 20) {
      const neededFor20 = Math.round(afford.recommendedHomePrice * 0.2) - afford.downPaymentAmount;
      if (neededFor20 > 0) {
        generalAdvice.push(
          `Saving an additional $${neededFor20.toLocaleString()} would reach 20% down and eliminate PMI ($${Math.round(afford.monthlyPayment.pmi)}/mo savings).`
        );
      }
    }

    generalAdvice.push(
      "Consider a home inspection contingency to protect your investment."
    );

    return {
      loanOptions,
      savingsStrategies,
      closingCostEstimate,
      generalAdvice,
    };
  }

  // ─────────────────────────────────────────────
  // Phase 2d: Property-specific analysis
  // ─────────────────────────────────────────────

  private computePropertyAnalysis(
    profile: UserProfile,
    market: MarketDataResult,
    afford: AffordabilityResult
  ): PropertyAnalysis {
    const property = profile.property!;
    const totalIncome = profile.annualGrossIncome + (profile.additionalIncome ?? 0);
    const rate = market.mortgageRates.thirtyYearFixed / 100;
    const loanTerm = profile.preferredLoanTerm ?? 30;
    const downPayment = Math.min(profile.downPaymentSavings, property.listingPrice);

    const propertyTaxRate = property.propertyTaxAnnual
      ? property.propertyTaxAnnual / property.listingPrice
      : 0.011;

    const hoaMonthly = property.hoaMonthly ?? 0;
    const downPaymentPercent = (downPayment / property.listingPrice) * 100;

    const monthlyPayment = calculateMonthlyPayment({
      homePrice: property.listingPrice,
      downPaymentAmount: downPayment,
      interestRate: rate,
      loanTermYears: loanTerm,
      propertyTaxRate,
      insuranceAnnual: 1500,
      pmiRate: downPaymentPercent >= 20 ? 0 : 0.005,
    });

    const totalMonthlyWithHoa = Math.round(
      (monthlyPayment.totalMonthly + hoaMonthly) * 100
    ) / 100;

    const dtiWithProperty = calculateDTI({
      grossMonthlyIncome: totalIncome / 12,
      proposedHousingPayment: totalMonthlyWithHoa,
      existingMonthlyDebts: profile.monthlyDebtPayments,
    });

    const stretchFactor =
      Math.round((property.listingPrice / afford.maxHomePrice) * 100) / 100;

    let verdict: PropertyAnalysis["verdict"];
    let verdictExplanation: string;

    const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

    if (stretchFactor <= 0.85) {
      verdict = "comfortable";
      verdictExplanation = `This property at ${fmt(property.listingPrice)} is well within your budget at ${Math.round(stretchFactor * 100)}% of your maximum (${fmt(afford.maxHomePrice)}). You'll have a comfortable financial cushion.`;
    } else if (stretchFactor <= 1.0) {
      verdict = "tight";
      verdictExplanation = `This property at ${fmt(property.listingPrice)} is ${Math.round(stretchFactor * 100)}% of your maximum (${fmt(afford.maxHomePrice)}). It's affordable but leaves less financial cushion than recommended.`;
    } else if (stretchFactor <= 1.15) {
      verdict = "stretch";
      verdictExplanation = `This property at ${fmt(property.listingPrice)} is ${Math.round((stretchFactor - 1) * 100)}% over your calculated maximum (${fmt(afford.maxHomePrice)}). You'd need to stretch your budget, which increases financial risk.`;
    } else {
      verdict = "over_budget";
      verdictExplanation = `This property at ${fmt(property.listingPrice)} is ${Math.round((stretchFactor - 1) * 100)}% over your maximum (${fmt(afford.maxHomePrice)}). It's not recommended at your current financial position.`;
    }

    return {
      property,
      canAfford: stretchFactor <= 1.0,
      monthlyPayment: { ...monthlyPayment, hoa: hoaMonthly },
      totalMonthlyWithHoa,
      dtiWithProperty,
      stretchFactor,
      vsRecommended: {
        priceDifference: property.listingPrice - afford.recommendedHomePrice,
        paymentDifference: totalMonthlyWithHoa - afford.monthlyPayment.totalMonthly,
      },
      verdict,
      verdictExplanation,
    };
  }

  private computeRentVsBuy(
    profile: UserProfile,
    market: MarketDataResult,
    afford: AffordabilityResult
  ): RentVsBuyReport {
    const rent = profile.currentMonthlyRent!;
    const buyCost = afford.monthlyPayment.totalMonthly;
    const monthlyCostDifference = Math.round(buyCost - rent);

    const homePrice = afford.recommendedHomePrice;
    const downPayment = afford.downPaymentAmount;
    const loanAmount = afford.loanAmount;
    const rate = market.mortgageRates.thirtyYearFixed / 100;
    const monthlyRate = rate / 12;
    const loanTermMonths = (profile.preferredLoanTerm ?? 30) * 12;

    // Assumptions
    const annualHomeAppreciation = 0.03;   // 3% per year
    const annualRentIncrease = 0.035;      // 3.5% per year
    const annualMaintenance = 0.01;        // 1% of home value per year
    const closingCostPercent = 0.03;       // 3% of home price (upfront)
    const opportunityCostRate = 0.06;      // 6% annual return on invested down payment

    const closingCosts = homePrice * closingCostPercent;
    const downPaymentOpportunityCost = downPayment + closingCosts;

    const yearByYear: Array<{
      year: number;
      rentCumulative: number;
      buyCumulative: number;
      equityBuilt: number;
      netBuyAdvantage: number;
    }> = [];

    let rentCumulative = 0;
    let buyCumulative = closingCosts; // upfront closing costs
    let currentRent = rent;
    let remainingBalance = loanAmount;
    let homeValue = homePrice;
    let investedAlternative = downPaymentOpportunityCost; // what the down payment could earn
    let breakEvenMonth: number | null = null;

    for (let month = 1; month <= Math.min(loanTermMonths, 360); month++) {
      // Rent side: monthly rent (increases annually)
      if (month > 1 && (month - 1) % 12 === 0) {
        currentRent *= (1 + annualRentIncrease);
      }
      rentCumulative += currentRent;

      // Buy side: mortgage payment + maintenance - equity gain
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = (buyCost - afford.monthlyPayment.propertyTax - afford.monthlyPayment.homeInsurance - afford.monthlyPayment.pmi) - interestPayment;
      remainingBalance = Math.max(0, remainingBalance - principalPayment);

      // Monthly maintenance cost
      if (month > 1 && (month - 1) % 12 === 0) {
        homeValue *= (1 + annualHomeAppreciation);
      }
      const monthlyMaintenance = (homeValue * annualMaintenance) / 12;

      buyCumulative += buyCost + monthlyMaintenance;

      // Opportunity cost: the down payment could have been invested
      if (month % 12 === 0) {
        investedAlternative *= (1 + opportunityCostRate);
      }

      // Equity = home value - remaining balance
      const equity = homeValue - remainingBalance;

      // Net buy cost = total paid - equity built + opportunity cost of down payment
      const netBuyCost = buyCumulative - equity + (investedAlternative - downPaymentOpportunityCost);

      // Break-even: when net buy cost < rent cumulative
      if (breakEvenMonth === null && rentCumulative > netBuyCost) {
        breakEvenMonth = month;
      }

      // Yearly snapshot
      if (month % 12 === 0) {
        const year = month / 12;
        yearByYear.push({
          year,
          rentCumulative: Math.round(rentCumulative),
          buyCumulative: Math.round(buyCumulative - equity + (investedAlternative - downPaymentOpportunityCost)),
          equityBuilt: Math.round(equity),
          netBuyAdvantage: Math.round(rentCumulative - (buyCumulative - equity + (investedAlternative - downPaymentOpportunityCost))),
        });
      }
    }

    const yr5 = yearByYear.find(y => y.year === 5);
    const yr10 = yearByYear.find(y => y.year === 10);

    const fiveYearRentTotal = yr5?.rentCumulative ?? 0;
    const fiveYearBuyTotal = yr5?.buyCumulative ?? 0;
    const fiveYearEquity = yr5?.equityBuilt ?? 0;
    const fiveYearNetAdvantage = yr5?.netBuyAdvantage ?? 0;
    const tenYearNetAdvantage = yr10?.netBuyAdvantage ?? 0;

    const fmt = (n: number) => "$" + Math.round(Math.abs(n)).toLocaleString("en-US");

    let verdict: RentVsBuyReport["verdict"];
    let verdictExplanation: string;

    if (fiveYearNetAdvantage > 20000) {
      verdict = "buy_clearly";
      verdictExplanation = `Buying is clearly the better financial move. Over 5 years, buying saves you ${fmt(fiveYearNetAdvantage)} compared to renting, even accounting for maintenance, opportunity cost of your down payment, and closing costs.`;
    } else if (fiveYearNetAdvantage > 0) {
      verdict = "buy_slightly";
      verdictExplanation = `Buying has a slight financial edge. Over 5 years, buying saves you ${fmt(fiveYearNetAdvantage)} compared to renting. The advantage grows significantly over 10+ years.`;
    } else if (fiveYearNetAdvantage > -15000) {
      verdict = "toss_up";
      verdictExplanation = `It's roughly a toss-up over 5 years. Renting is ${fmt(fiveYearNetAdvantage)} cheaper in the short term, but buying likely wins over 10+ years as you build equity and rent keeps rising.`;
    } else {
      verdict = "rent_better";
      verdictExplanation = `Renting may be the better financial choice for now. Over 5 years, renting saves you ${fmt(fiveYearNetAdvantage)}. Consider buying when home prices drop, rates decrease, or you have a larger down payment.`;
    }

    return {
      currentRent: rent,
      monthlyBuyCost: buyCost,
      monthlyCostDifference,
      breakEvenMonth,
      breakEvenYear: breakEvenMonth ? Math.ceil(breakEvenMonth / 12) : null,
      fiveYearRentTotal,
      fiveYearBuyTotal,
      fiveYearEquity,
      fiveYearNetAdvantage,
      tenYearNetAdvantage,
      yearByYear: yearByYear.slice(0, 10), // first 10 years
      verdict,
      verdictExplanation,
    };
  }

  // ─────────────────────────────────────────────
  // Phase 2e: Pre-approval readiness score
  // ─────────────────────────────────────────────

  private computePreApprovalReadiness(
    profile: UserProfile,
    afford: AffordabilityResult,
    risk: RiskReport
  ): PreApprovalReadinessScore {
    const totalIncome = profile.annualGrossIncome + (profile.additionalIncome ?? 0);
    const grossMonthly = totalIncome / 12;
    const totalSavings = profile.downPaymentSavings + (profile.additionalSavings ?? 0);
    const emergencyMonths = risk.emergencyFundAnalysis.monthsCovered;

    // ── DTI Score (0-25) ──
    const backEndDTI = afford.dtiAnalysis.backEndRatio;
    let dtiScore: number;
    if (backEndDTI <= 28) dtiScore = 25;
    else if (backEndDTI <= 36) dtiScore = 20;
    else if (backEndDTI <= 43) dtiScore = 12;
    else if (backEndDTI <= 50) dtiScore = 5;
    else dtiScore = 0;

    // ── Credit Score (0-25) ──
    const credit = profile.creditScore;
    let creditScore: number;
    if (credit >= 760) creditScore = 25;
    else if (credit >= 700) creditScore = 20;
    else if (credit >= 660) creditScore = 15;
    else if (credit >= 620) creditScore = 8;
    else creditScore = 0;

    // ── Down Payment Score (0-25) ──
    const dpPercent = afford.maxHomePrice > 0
      ? (afford.downPaymentAmount / afford.maxHomePrice) * 100
      : 0;
    let downPaymentScore: number;
    if (dpPercent >= 20) downPaymentScore = 25;
    else if (dpPercent >= 10) downPaymentScore = 18;
    else if (dpPercent >= 5) downPaymentScore = 12;
    else if (dpPercent >= 3) downPaymentScore = 6;
    else downPaymentScore = 0;

    // ── Debt Health Score (0-25) ──
    const debtToIncomeRaw = grossMonthly > 0
      ? (profile.monthlyDebtPayments / grossMonthly) * 100
      : 100;
    let debtHealthScore: number;
    if (debtToIncomeRaw <= 10 && emergencyMonths >= 6) debtHealthScore = 25;
    else if (debtToIncomeRaw <= 15 && emergencyMonths >= 3) debtHealthScore = 18;
    else if (debtToIncomeRaw <= 20 && emergencyMonths >= 1) debtHealthScore = 12;
    else if (debtToIncomeRaw <= 30 || emergencyMonths >= 1) debtHealthScore = 5;
    else debtHealthScore = 0;

    const overallScore = dtiScore + creditScore + downPaymentScore + debtHealthScore;

    const level: PreApprovalReadinessScore["level"] =
      overallScore >= 80 ? "highly_prepared"
        : overallScore >= 60 ? "ready"
        : overallScore >= 40 ? "needs_work"
        : "not_ready";

    // ── Generate action items for weak areas ──
    const actionItems: ReadinessActionItem[] = [];

    if (dtiScore < 20) {
      actionItems.push({
        category: "dti",
        priority: dtiScore < 12 ? "high" : "medium",
        action: `Reduce monthly debts by $${Math.round(profile.monthlyDebtPayments * 0.3).toLocaleString()}/mo to lower your DTI from ${backEndDTI.toFixed(1)}% toward 36%`,
        impact: `Could improve score by ~${20 - dtiScore} points`,
      });
    }

    if (creditScore < 20) {
      const targetScore = credit < 620 ? 620 : credit < 660 ? 700 : 760;
      actionItems.push({
        category: "credit",
        priority: creditScore < 8 ? "high" : "medium",
        action: `Improve credit score from ${credit} toward ${targetScore}. Pay down credit card balances below 30% utilization and avoid new hard inquiries`,
        impact: `Could improve score by ~${20 - creditScore} points and unlock better rates`,
      });
    }

    if (downPaymentScore < 25) {
      const neededFor20 = Math.round(afford.maxHomePrice * 0.2) - afford.downPaymentAmount;
      if (neededFor20 > 0) {
        actionItems.push({
          category: "down_payment",
          priority: downPaymentScore < 12 ? "high" : "low",
          action: `Save an additional $${neededFor20.toLocaleString()} to reach 20% down payment and eliminate PMI`,
          impact: `Could improve score by ~${25 - downPaymentScore} points and save $${Math.round(afford.monthlyPayment.pmi)}/mo on PMI`,
        });
      }
    }

    if (debtHealthScore < 18) {
      if (emergencyMonths < 6) {
        const monthlyNeed = risk.emergencyFundAnalysis.monthlyExpenses;
        const deficit = Math.round(monthlyNeed * 6 - risk.emergencyFundAnalysis.postPurchaseEmergencyFund);
        if (deficit > 0) {
          actionItems.push({
            category: "emergency_fund",
            priority: emergencyMonths < 3 ? "high" : "medium",
            action: `Build emergency fund by $${deficit.toLocaleString()} to reach 6 months of reserves after purchase`,
            impact: `Could improve score by ~${18 - debtHealthScore} points`,
          });
        }
      }
      if (debtToIncomeRaw > 15) {
        actionItems.push({
          category: "debt_health",
          priority: debtToIncomeRaw > 25 ? "high" : "medium",
          action: `Pay off smallest debts first to reduce debt-to-income from ${debtToIncomeRaw.toFixed(0)}% toward 15%`,
          impact: "Improves both readiness score and mortgage approval odds",
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return {
      overallScore,
      level,
      components: {
        dtiScore,
        creditScore,
        downPaymentScore,
        debtHealthScore,
      },
      actionItems,
    };
  }

  // ─────────────────────────────────────────────
  // Phase 3: Single Claude call for narrative
  // ─────────────────────────────────────────────

  private async synthesize(
    profile: UserProfile,
    market: MarketDataResult,
    afford: AffordabilityResult,
    risk: RiskReport,
    recs: RecommendationsResult,
    propAnalysis?: PropertyAnalysis
  ): Promise<string> {
    // Build a compact data summary for Claude (not the full state object)
    const data: Record<string, unknown> = {
      income: profile.annualGrossIncome + (profile.additionalIncome ?? 0),
      debts: profile.monthlyDebtPayments,
      creditScore: profile.creditScore,
      location: profile.targetLocation,
      maxPrice: afford.maxHomePrice,
      recommendedPrice: afford.recommendedHomePrice,
      downPayment: afford.downPaymentAmount,
      downPaymentPercent: afford.downPaymentPercent,
      monthlyPayment: afford.monthlyPayment.totalMonthly,
      paymentBreakdown: afford.monthlyPayment,
      dti: afford.dtiAnalysis,
      rate30yr: market.mortgageRates.thirtyYearFixed,
      rate15yr: market.mortgageRates.fifteenYearFixed,
      medianPrice: market.medianHomePrices.national,
      riskLevel: risk.overallRiskLevel,
      riskScore: risk.overallScore,
      riskFlags: risk.riskFlags.map((f) => f.message),
      emergencyMonths: risk.emergencyFundAnalysis.monthsCovered,
      emergencyAdequate: risk.emergencyFundAnalysis.adequate,
      eligibleLoans: recs.loanOptions.filter((l) => l.eligible).map((l) => l.type),
      closingCosts: recs.closingCostEstimate,
    };

    if (propAnalysis) {
      data.propertyAnalysis = {
        address: propAnalysis.property.address,
        listingPrice: propAnalysis.property.listingPrice,
        canAfford: propAnalysis.canAfford,
        totalMonthly: propAnalysis.totalMonthlyWithHoa,
        stretchFactor: propAnalysis.stretchFactor,
        verdict: propAnalysis.verdict,
        verdictExplanation: propAnalysis.verdictExplanation,
      };
    }

    try {
      const response = await traceGeneration({
        client: this.client,
        params: {
          model: config.model,
          max_tokens: 1500,
          system: PROMPTS.orchestrator,
          messages: [
            {
              role: "user",
              content: `Synthesize this data into a clear, actionable narrative report for the home buyer.
Focus on the key takeaways, what they can afford, major risks, and top recommendations.
Be specific with numbers and direct with advice. Keep it concise.

${JSON.stringify(data)}`,
            },
          ],
        },
        options: { timeout: 15000 },
        trace: { name: "orchestrator-synthesize", traceId: this.traceId },
        metadata: { maxHomePrice: afford.maxHomePrice, riskLevel: risk.overallRiskLevel },
      });

      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      if (textBlock?.text) return textBlock.text;
    } catch (err) {
      console.log("      Warning: AI synthesis failed, using template summary:", err);
    }

    // Fallback: template summary (guaranteed to work)
    return this.buildTemplateSummary(afford, market, risk, recs);
  }

  private buildTemplateSummary(
    a: AffordabilityResult,
    m: MarketDataResult,
    r: RiskReport,
    recs: RecommendationsResult
  ): string {
    const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
    const eligible = recs.loanOptions.filter((l) => l.eligible).map((l) => l.type);

    return `## Summary
Based on your financial profile, you can afford a home up to ${fmt(a.maxHomePrice)}. We recommend targeting ${fmt(a.recommendedHomePrice)} for a comfortable financial cushion. Your overall risk level is **${r.overallRiskLevel}**.

## What You Can Afford
- **Maximum home price**: ${fmt(a.maxHomePrice)}
- **Recommended price**: ${fmt(a.recommendedHomePrice)} (85% of max)
- **Down payment**: ${fmt(a.downPaymentAmount)} (${a.downPaymentPercent}%)
- **Monthly payment**: ${fmt(a.monthlyPayment.totalMonthly)}/mo (P&I: ${fmt(a.monthlyPayment.principal + a.monthlyPayment.interest)}, Tax: ${fmt(a.monthlyPayment.propertyTax)}, Insurance: ${fmt(a.monthlyPayment.homeInsurance)}${a.monthlyPayment.pmi > 0 ? `, PMI: ${fmt(a.monthlyPayment.pmi)}` : ""})
- **DTI**: Front-end ${a.dtiAnalysis.frontEndRatio}% (${a.dtiAnalysis.frontEndStatus}), Back-end ${a.dtiAnalysis.backEndRatio}% (${a.dtiAnalysis.backEndStatus})

## Current Market Conditions
- **30-year fixed rate**: ${m.mortgageRates.thirtyYearFixed}%
- **15-year fixed rate**: ${m.mortgageRates.fifteenYearFixed}%
- **National median home price**: ${fmt(m.medianHomePrices.national)}

## Risk Factors
${r.riskFlags.map((f) => `- **${f.severity.toUpperCase()}**: ${f.message} — ${f.recommendation}`).join("\n")}
- Emergency fund: ${r.emergencyFundAnalysis.monthsCovered} months of reserves (${r.emergencyFundAnalysis.adequate ? "adequate" : "needs improvement"})

## Recommendations
- **Eligible loan programs**: ${eligible.length > 0 ? eligible.join(", ").toUpperCase() : "Consult a lender for options"}
- **Estimated closing costs**: ${fmt(recs.closingCostEstimate.lowEstimate)} - ${fmt(recs.closingCostEstimate.highEstimate)}
- Get pre-approved before shopping to strengthen your offers
- Budget for closing costs on top of your down payment
- Consider a home inspection contingency to protect your investment`;
  }

  private getFallbackMarketData(): MarketDataResult {
    return {
      mortgageRates: {
        thirtyYearFixed: 6.5,
        fifteenYearFixed: 5.8,
        federalFundsRate: 4.33,
        dataDate: new Date().toISOString().split("T")[0],
        source: "fallback (API unavailable)",
      },
      medianHomePrices: {
        national: 420400,
        nationalNew: 400500,
        caseShillerIndex: 328.0,
        dataDate: "2025-Q3",
      },
      marketTrends: [],
      inflationData: {
        shelterCpiCurrent: 340.0,
        shelterCpiYearAgo: 325.0,
        shelterInflationRate: 4.6,
        generalInflationRate: 2.9,
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}
