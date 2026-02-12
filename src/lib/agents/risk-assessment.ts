import Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type ToolDefinition } from "./base-agent";
import { createRiskTools, handleRiskToolCall } from "../tools/risk-tools";
import { config } from "../config";
import { PROMPTS } from "../utils/prompts";
import type {
  AffordabilityResult,
  MarketDataResult,
  RiskReport,
  UserProfile,
} from "../types/index";

interface RiskInput {
  userProfile: UserProfile;
  marketData: MarketDataResult;
  affordability: AffordabilityResult;
}

export class RiskAssessmentAgent extends BaseAgent<RiskInput, RiskReport> {
  constructor(client: Anthropic) {
    super(client, config.model);
  }

  get systemPrompt(): string {
    return PROMPTS.riskAssessment;
  }

  get tools(): ToolDefinition[] {
    return createRiskTools();
  }

  protected buildUserMessage(input: RiskInput): string {
    const { userProfile: u, marketData: m, affordability: a } = input;
    const totalSavings =
      u.downPaymentSavings + (u.additionalSavings ?? 0);
    const monthlyExpenses = u.monthlyExpenses ?? 3000;
    const estimatedRent = monthlyExpenses * 0.4; // rough estimate if not provided

    return `Assess the financial risk of this home purchase.

Buyer Profile:
- Annual Gross Income: $${u.annualGrossIncome.toLocaleString()}
- Monthly Gross Income: $${Math.round(u.annualGrossIncome / 12).toLocaleString()}
- Monthly Debt Payments: $${u.monthlyDebtPayments.toLocaleString()}
- Total Savings: $${totalSavings.toLocaleString()}
- Credit Score: ${u.creditScore}
- Monthly Expenses (non-debt): $${monthlyExpenses.toLocaleString()}

Affordability Results:
- Recommended Home Price: $${a.recommendedHomePrice.toLocaleString()}
- Down Payment: $${a.downPaymentAmount.toLocaleString()} (${a.downPaymentPercent}%)
- Loan Amount: $${a.loanAmount.toLocaleString()}
- Monthly Payment (PITI): $${a.monthlyPayment.totalMonthly.toLocaleString()}
- Current DTI - Front: ${a.dtiAnalysis.frontEndRatio}%, Back: ${a.dtiAnalysis.backEndRatio}%

Market Data:
- Current 30yr Rate: ${m.mortgageRates.thirtyYearFixed}%
- Shelter Inflation: ${m.inflationData.shelterInflationRate}%

Tasks:
1. stress_test_rate_hike at +1%, +2%, +3% increases
2. stress_test_income_loss at 25%, 50%, and 100% (job loss)
3. evaluate_emergency_fund with estimated closing costs of ${Math.round(a.recommendedHomePrice * 0.03)} (3% of home price)
4. calculate_rent_vs_buy for 5 years and 10 years (use monthly rent estimate of $${Math.round(estimatedRent)})

After running all tools, return a JSON object matching this structure:
{
  "overallRiskLevel": "low"|"moderate"|"high"|"very_high",
  "overallScore": number (0-100, higher is better),
  "stressTests": [{ "scenario": string, "description": string, "newMonthlyPayment": number, "newDTI": number, "canAfford": boolean, "monthsOfRunway": number, "severity": string }],
  "riskFlags": [{ "category": string, "severity": "info"|"warning"|"critical", "message": string, "recommendation": string }],
  "emergencyFundAnalysis": { "currentEmergencyFund": number, "postPurchaseEmergencyFund": number, "monthlyExpenses": number, "monthsCovered": number, "adequate": boolean, "recommendation": string },
  "rentVsBuy": { "fiveYear": { "buyTotalCost": number, "rentTotalCost": number, "buyEquity": number, "verdict": string }, "tenYear": { ... }, "breakEvenYears": number }
}`;
  }

  protected async handleToolCall(
    name: string,
    input: Record<string, unknown>
  ): Promise<string> {
    return handleRiskToolCall(name, input);
  }

  parseResult(rawText: string): RiskReport {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as RiskReport;
    }
    throw new Error("Failed to parse RiskReport from agent response");
  }
}
