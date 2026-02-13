import Anthropic from "@anthropic-ai/sdk";
import { BaseAgent, type ToolDefinition } from "./base-agent";
import {
  createAffordabilityTools,
  handleAffordabilityToolCall,
} from "../tools/affordability-tools";
import { config } from "../config";
import { PROMPTS } from "../utils/prompts";
import type {
  AffordabilityResult,
  MarketDataResult,
  UserProfile,
} from "../types/index";

interface AffordabilityInput {
  userProfile: UserProfile;
  marketData: MarketDataResult;
}

export class AffordabilityAgent extends BaseAgent<
  AffordabilityInput,
  AffordabilityResult
> {
  constructor(client: Anthropic) {
    super(client, config.model);
  }

  get systemPrompt(): string {
    return PROMPTS.affordability;
  }

  get tools(): ToolDefinition[] {
    return createAffordabilityTools();
  }

  protected buildUserMessage(input: AffordabilityInput): string {
    const { userProfile: u, marketData: m } = input;
    return `Analyze this buyer's affordability using the available tools.

Current Market Data:
- 30-Year Fixed Rate: ${m.mortgageRates.thirtyYearFixed}%
- 15-Year Fixed Rate: ${m.mortgageRates.fifteenYearFixed}%
- National Median Home Price: $${m.medianHomePrices.national.toLocaleString()}

Buyer Profile:
- Annual Gross Income: $${u.annualGrossIncome.toLocaleString()}${u.additionalIncome ? ` (+ $${u.additionalIncome.toLocaleString()} additional)` : ""}
- Monthly Debt Payments: $${u.monthlyDebtPayments.toLocaleString()}
- Down Payment Savings: $${u.downPaymentSavings.toLocaleString()}
- Credit Score: ${u.creditScore}
- Preferred Loan Term: ${u.preferredLoanTerm ?? 30} years
- Loan Type: ${u.loanType === "5/1_arm" ? "5/1 ARM (fixed for 5 years, then adjusts annually)" : u.loanType === "7/1_arm" ? "7/1 ARM (fixed for 7 years, then adjusts annually)" : "Fixed Rate"}
- First-Time Buyer: ${u.firstTimeBuyer ? "Yes" : "No"}
- Military Veteran: ${u.militaryVeteran ? "Yes" : "No"}

Steps:
1. Use calculate_max_home_price with the ${u.preferredLoanTerm ?? 30}-year rate (as decimal, e.g., ${m.mortgageRates.thirtyYearFixed}% = ${m.mortgageRates.thirtyYearFixed / 100})${u.loanType?.includes("arm") ? ". Note: For ARM loans, use a rate ~0.5-1% lower than the 30-year fixed rate for the initial period." : ""}
2. Use calculate_monthly_payment for the max home price
3. Use calculate_dti_ratio with the calculated payment
4. Use generate_amortization_summary for the loan

Return the complete analysis as a JSON object matching this structure:
{
  "maxHomePrice": number,
  "recommendedHomePrice": number (80% of max),
  "downPaymentAmount": number,
  "downPaymentPercent": number,
  "loanAmount": number,
  "monthlyPayment": { "principal": number, "interest": number, "propertyTax": number, "homeInsurance": number, "pmi": number, "totalMonthly": number },
  "dtiAnalysis": { "frontEndRatio": number, "backEndRatio": number, "frontEndStatus": string, "backEndStatus": string, "maxFrontEnd": number, "maxBackEnd": number },
  "amortizationSummary": [{ "year": number, "principalPaid": number, "interestPaid": number, "remainingBalance": number, "equityPercent": number }]
}`;
  }

  protected async handleToolCall(
    name: string,
    input: Record<string, unknown>
  ): Promise<string> {
    return handleAffordabilityToolCall(name, input);
  }

  parseResult(rawText: string): AffordabilityResult {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AffordabilityResult;
    }
    throw new Error("Failed to parse AffordabilityResult from agent response");
  }
}
