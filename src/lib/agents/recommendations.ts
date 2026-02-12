import Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type ToolDefinition } from "./base-agent";
import {
  createRecommendationTools,
  handleRecommendationToolCall,
} from "../tools/recommendation-tools";
import { config } from "../config";
import { PROMPTS } from "../utils/prompts";
import type {
  AffordabilityResult,
  MarketDataResult,
  RecommendationsResult,
  UserProfile,
} from "../types/index";

interface RecommendationsInput {
  userProfile: UserProfile;
  marketData: MarketDataResult;
  affordability: AffordabilityResult;
}

export class RecommendationsAgent extends BaseAgent<
  RecommendationsInput,
  RecommendationsResult
> {
  constructor(client: Anthropic) {
    super(client, config.model);
  }

  get systemPrompt(): string {
    return PROMPTS.recommendations;
  }

  get tools(): ToolDefinition[] {
    return createRecommendationTools();
  }

  protected buildUserMessage(input: RecommendationsInput): string {
    const { userProfile: u, marketData: m, affordability: a } = input;
    return `Generate recommendations for this home buyer.

Buyer Profile:
- Annual Income: $${u.annualGrossIncome.toLocaleString()}
- Monthly Debts: $${u.monthlyDebtPayments.toLocaleString()}
- Down Payment Available: $${u.downPaymentSavings.toLocaleString()}
- Additional Savings: $${(u.additionalSavings ?? 0).toLocaleString()}
- Credit Score: ${u.creditScore}
- First-Time Buyer: ${u.firstTimeBuyer ? "Yes" : "No"}
- Military Veteran: ${u.militaryVeteran ? "Yes" : "No"}
- Target Location: ${u.targetLocation ?? "Not specified"}
- Monthly Expenses: $${(u.monthlyExpenses ?? 3000).toLocaleString()}

Affordability Results:
- Recommended Home Price: $${a.recommendedHomePrice.toLocaleString()}
- Down Payment: $${a.downPaymentAmount.toLocaleString()} (${a.downPaymentPercent}%)
- Loan Amount: $${a.loanAmount.toLocaleString()}
- Monthly PITI: $${a.monthlyPayment.totalMonthly.toLocaleString()}

Current Rates:
- 30yr: ${m.mortgageRates.thirtyYearFixed}%
- 15yr: ${m.mortgageRates.fifteenYearFixed}%

Tasks:
1. lookup_loan_programs to check eligibility for all 4 programs
2. compare_loan_scenarios for the top 2-3 eligible options
3. suggest_savings_strategies if down payment < 20%
4. estimate_closing_costs

Return a JSON object matching:
{
  "loanOptions": [{ "type": string, "eligible": boolean, "eligibilityReason": string, "minDownPaymentPercent": number, "estimatedRate": number, "monthlyPayment": number, "pmiRequired": boolean, "pmiMonthlyEstimate": number, "totalCostOver30Years": number, "pros": string[], "cons": string[] }],
  "savingsStrategies": [{ "title": string, "description": string, "potentialSavings": number, "timeframeMonths": number, "difficulty": string }],
  "closingCostEstimate": { "lowEstimate": number, "highEstimate": number, "breakdown": [{ "item": string, "amount": number }] },
  "generalAdvice": string[]
}`;
  }

  protected async handleToolCall(
    name: string,
    input: Record<string, unknown>
  ): Promise<string> {
    return handleRecommendationToolCall(name, input);
  }

  parseResult(rawText: string): RecommendationsResult {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.generalAdvice = parsed.generalAdvice ?? [];
      return parsed as RecommendationsResult;
    }
    throw new Error(
      "Failed to parse RecommendationsResult from agent response"
    );
  }
}
