import Anthropic from "@anthropic-ai/sdk";
import { MarketDataAgent } from "./market-data";
import { AffordabilityAgent } from "./affordability";
import { RiskAssessmentAgent } from "./risk-assessment";
import { RecommendationsAgent } from "./recommendations";
import { config } from "../config";
import { PROMPTS } from "../utils/prompts";
import type {
  UserProfile,
  OrchestratorState,
  FinalReport,
  MarketDataResult,
} from "../types/index";

export class OrchestratorAgent {
  private client: Anthropic;
  private marketAgent: MarketDataAgent;
  private affordabilityAgent: AffordabilityAgent;
  private riskAgent: RiskAssessmentAgent;
  private recsAgent: RecommendationsAgent;

  constructor() {
    this.client = new Anthropic();
    this.marketAgent = new MarketDataAgent(this.client);
    this.affordabilityAgent = new AffordabilityAgent(this.client);
    this.riskAgent = new RiskAssessmentAgent(this.client);
    this.recsAgent = new RecommendationsAgent(this.client);
  }

  async run(userProfile: UserProfile): Promise<FinalReport> {
    const state: OrchestratorState = {
      userProfile,
      errors: [],
      executionLog: [],
    };

    // Phase 1: Market Data (independent)
    console.log("\n[1/4] Fetching current market data...");
    const t1 = Date.now();
    try {
      state.marketData = await this.marketAgent.run({
        location: userProfile.targetLocation,
      });
      console.log(
        `      Done (${((Date.now() - t1) / 1000).toFixed(1)}s) - 30yr rate: ${state.marketData.mortgageRates.thirtyYearFixed}%`
      );
    } catch (err) {
      console.log(`      Warning: Market data fetch failed, using fallback data`);
      state.errors.push({
        agent: "MarketDataAgent",
        error: String(err),
        timestamp: new Date().toISOString(),
        recoverable: true,
      });
      state.marketData = this.getFallbackMarketData();
    }
    state.executionLog.push({
      agent: "MarketDataAgent",
      action: "fetch_all_market_data",
      durationMs: Date.now() - t1,
      timestamp: new Date().toISOString(),
    });

    // Phase 2: Affordability (depends on market data)
    console.log("[2/4] Calculating affordability...");
    const t2 = Date.now();
    try {
      state.affordability = await this.affordabilityAgent.run({
        userProfile,
        marketData: state.marketData,
      });
      console.log(
        `      Done (${((Date.now() - t2) / 1000).toFixed(1)}s) - Max price: $${state.affordability.maxHomePrice.toLocaleString()}`
      );
    } catch (err) {
      console.error("      Affordability calculation failed:", err);
      throw new Error(`Affordability agent failed: ${err}`);
    }
    state.executionLog.push({
      agent: "AffordabilityAgent",
      action: "calculate_affordability",
      durationMs: Date.now() - t2,
      timestamp: new Date().toISOString(),
    });

    // Phase 3: Risk + Recommendations (parallel)
    console.log("[3/4] Assessing risk and generating recommendations...");
    const t3 = Date.now();
    const [riskReport, recommendations] = await Promise.allSettled([
      this.riskAgent.run({
        userProfile,
        marketData: state.marketData,
        affordability: state.affordability,
      }),
      this.recsAgent.run({
        userProfile,
        marketData: state.marketData,
        affordability: state.affordability,
      }),
    ]);

    if (riskReport.status === "fulfilled") {
      state.riskReport = riskReport.value;
    } else {
      console.log("      Warning: Risk assessment failed, using defaults");
      state.errors.push({
        agent: "RiskAssessmentAgent",
        error: String(riskReport.reason),
        timestamp: new Date().toISOString(),
        recoverable: true,
      });
      state.riskReport = this.getDefaultRiskReport();
    }

    if (recommendations.status === "fulfilled") {
      state.recommendations = recommendations.value;
    } else {
      console.log("      Warning: Recommendations failed, using defaults");
      state.errors.push({
        agent: "RecommendationsAgent",
        error: String(recommendations.reason),
        timestamp: new Date().toISOString(),
        recoverable: true,
      });
      state.recommendations = this.getDefaultRecommendations();
    }

    console.log(`      Done (${((Date.now() - t3) / 1000).toFixed(1)}s)`);
    state.executionLog.push({
      agent: "RiskAgent+RecsAgent",
      action: "parallel_analysis",
      durationMs: Date.now() - t3,
      timestamp: new Date().toISOString(),
    });

    // Phase 4: Synthesize final report
    console.log("[4/4] Synthesizing final report...");
    const t4 = Date.now();
    const finalReport = await this.synthesize(state);
    console.log(`      Done (${((Date.now() - t4) / 1000).toFixed(1)}s)`);

    return finalReport;
  }

  private async synthesize(state: OrchestratorState): Promise<FinalReport> {
    const response = await this.client.messages.create({
      model: config.model,
      max_tokens: 4096,
      system: PROMPTS.orchestrator,
      messages: [
        {
          role: "user",
          content: `Synthesize this data into a clear, actionable narrative report for the home buyer.
Focus on the key takeaways, what they can afford, major risks, and top recommendations.
Be specific with numbers and direct with advice.

${JSON.stringify(state, null, 2)}`,
        },
      ],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );

    return {
      summary: textBlock?.text ?? "Report generation failed.",
      affordability: state.affordability!,
      marketSnapshot: state.marketData!,
      riskAssessment: state.riskReport!,
      recommendations: state.recommendations!,
      disclaimers: [
        "This analysis is for informational purposes only and does not constitute financial advice.",
        "Consult a licensed mortgage professional before making any home purchase decisions.",
        "Market data is based on the most recent available figures and may not reflect real-time conditions.",
      ],
      generatedAt: new Date().toISOString(),
    };
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

  private getDefaultRiskReport() {
    return {
      overallRiskLevel: "moderate" as const,
      overallScore: 50,
      stressTests: [],
      riskFlags: [
        {
          category: "market" as const,
          severity: "info" as const,
          message: "Risk assessment could not be completed fully",
          recommendation: "Consult a financial advisor for detailed risk analysis",
        },
      ],
      emergencyFundAnalysis: {
        currentEmergencyFund: 0,
        postPurchaseEmergencyFund: 0,
        monthlyExpenses: 0,
        monthsCovered: 0,
        adequate: false,
        recommendation: "Unable to assess - please consult a financial advisor",
      },
      rentVsBuy: {
        fiveYear: { buyTotalCost: 0, rentTotalCost: 0, buyEquity: 0, verdict: "Unable to assess" },
        tenYear: { buyTotalCost: 0, rentTotalCost: 0, buyEquity: 0, verdict: "Unable to assess" },
        breakEvenYears: 0,
      },
    };
  }

  private getDefaultRecommendations() {
    return {
      loanOptions: [],
      savingsStrategies: [],
      closingCostEstimate: { lowEstimate: 0, highEstimate: 0, breakdown: [] },
      generalAdvice: [
        "Consult a mortgage professional for personalized loan recommendations.",
      ],
    };
  }
}
