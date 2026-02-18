/**
 * Context Engineering utilities for the chat API.
 *
 * Five features:
 * 1. Token-aware context management (truncation)
 * 2. Conversation summarization (compress old messages)
 * 3. Adaptive system prompt (persona hints from report)
 * 4. Session memory (facts extracted from tool results)
 * 5. Tool result caching (cache keys + TTL config)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { FinalReport } from "@/lib/types";
import { CacheService } from "@/lib/services/cache";

// ── Types ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionMemory {
  facts: Record<string, unknown>;
  toolsUsed: string[];
}

// ── Feature 1: Token-Aware Context Management ──────────────────

const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_TOKENS = 200_000;
const TOKEN_BUDGET = Math.floor(MAX_CONTEXT_TOKENS * 0.8); // 160K
const RESERVED_FOR_OUTPUT = 4096;
const RESERVED_FOR_TOOLS = 6000;
const MIN_KEEP_MESSAGES = 6; // always keep last 3 exchanges

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function estimateMessagesTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
}

export function truncateToFitBudget(
  systemTokens: number,
  messages: ChatMessage[]
): { messages: ChatMessage[]; wasTruncated: boolean; droppedCount: number } {
  const available = TOKEN_BUDGET - systemTokens - RESERVED_FOR_OUTPUT - RESERVED_FOR_TOOLS;

  let totalTokens = estimateMessagesTokens(messages);
  if (totalTokens <= available) {
    return { messages, wasTruncated: false, droppedCount: 0 };
  }

  // Drop oldest pairs until we fit
  let trimmed = [...messages];
  let droppedCount = 0;

  while (estimateMessagesTokens(trimmed) > available && trimmed.length > MIN_KEEP_MESSAGES) {
    trimmed = trimmed.slice(2); // drop one user+assistant pair
    droppedCount += 2;
  }

  return { messages: trimmed, wasTruncated: true, droppedCount };
}

// ── Feature 2: Conversation Summarization ──────────────────────

const SUMMARIZE_THRESHOLD = 8; // summarize after 4 exchanges

export function splitForSummarization(
  history: ChatMessage[],
  existingSummary: string | null
): { recentMessages: ChatMessage[]; messagesToSummarize: ChatMessage[] | null } {
  if (history.length < SUMMARIZE_THRESHOLD) {
    return { recentMessages: history, messagesToSummarize: null };
  }

  const keepCount = SUMMARIZE_THRESHOLD;
  return {
    recentMessages: history.slice(-keepCount),
    messagesToSummarize: history.slice(0, -keepCount),
  };
}

export async function summarizeOlderMessages(
  olderMessages: ChatMessage[],
  existingSummary: string | null
): Promise<string> {
  const client = new Anthropic();

  const conversationText = olderMessages
    .map((m) => `${m.role}: ${m.content.slice(0, 500)}`) // truncate long messages
    .join("\n\n");

  const prompt = existingSummary
    ? `Previous summary:\n${existingSummary}\n\nNew messages to incorporate:\n${conversationText}\n\nUpdate the summary. Include key facts, specific numbers from calculations, and user preferences. Under 200 words, bullet points.`
    : `Summarize this mortgage advisor conversation. Extract: key financial facts (income, prices, rates), calculation results (specific numbers), and user preferences.\n\n${conversationText}\n\nUnder 200 words, bullet points.`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? existingSummary ?? "";
  } catch {
    // If summarization fails, return existing summary
    return existingSummary ?? "";
  }
}

// ── Feature 3: Adaptive System Prompt ──────────────────────────

export function buildPersonaHints(report: FinalReport): string {
  const hints: string[] = [];

  // Loan type eligibility
  const loanOptions = report.recommendations?.loanOptions ?? [];
  const fhaEligible = loanOptions.some((l) => l.type === "fha" && l.eligible);
  const vaEligible = loanOptions.some((l) => l.type === "va" && l.eligible);

  if (vaEligible) {
    hints.push(
      "Buyer is eligible for VA loans. Highlight VA benefits: no down payment, no PMI, competitive rates. Compare VA vs conventional when relevant."
    );
  }

  if (fhaEligible && !vaEligible) {
    hints.push(
      "Buyer may be a first-time buyer (FHA eligible). Emphasize FHA benefits, lower down payment options, and down payment assistance programs. Explain mortgage jargon simply."
    );
  }

  // DTI analysis
  const backEndDTI = report.affordability?.dtiAnalysis?.backEndRatio;
  if (backEndDTI != null) {
    if (backEndDTI > 36) {
      hints.push(
        `Back-end DTI is ${backEndDTI.toFixed(1)}% (above 36%). Suggest debt reduction strategies and note which debts to pay down first for maximum buying power.`
      );
    } else if (backEndDTI <= 28) {
      hints.push(
        "Excellent DTI ratios — room for a more expensive home. Focus on optimizing rate and loan terms."
      );
    }
  }

  // Risk level
  const riskLevel = report.riskAssessment?.overallRiskLevel;
  if (riskLevel === "high" || riskLevel === "very_high") {
    hints.push(
      "Risk assessment is HIGH. Be cautious with recommendations. Emphasize emergency fund adequacy and stress test results."
    );
  }

  // Property analyzed
  if (report.propertyAnalysis) {
    hints.push(
      "A specific property has been analyzed. Reference it in comparisons and suggest using compare_scenarios for alternatives."
    );
  }

  if (hints.length === 0) return "";
  return `\n\nPERSONA HINTS (tailor responses accordingly):\n${hints.map((h) => `- ${h}`).join("\n")}`;
}

// ── Feature 4: Session Memory ──────────────────────────────────

export function extractFactsFromToolResult(
  toolName: string,
  input: Record<string, unknown>,
  result: string
): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(result);

    switch (toolName) {
      case "recalculate_affordability":
        return {
          recalculated: {
            maxPrice: parsed.maxHomePrice,
            payment: parsed.payment?.totalMonthly,
            income: input.annualGrossIncome,
            rate: input.interestRate,
          },
        };

      case "calculate_payment_for_price":
        return {
          [`payment_${input.homePrice}`]: parsed.totalMonthly,
        };

      case "get_current_rates":
        return {
          liveRates: {
            thirtyYear: parsed.thirtyYearFixed,
            fifteenYear: parsed.fifteenYearFixed,
            asOf: parsed.asOf,
          },
        };

      case "compare_scenarios":
        return {
          lastComparison: {
            monthlyDiff: parsed.comparison?.monthlyDifference,
            totalInterestDiff: parsed.comparison?.totalInterestDifference,
          },
        };

      case "rent_vs_buy":
        return { rentVsBuyVerdict: parsed.verdict };

      case "search_properties":
        return {
          propertySearch: {
            location: parsed.location,
            count: parsed.resultCount,
          },
        };

      case "stress_test":
        return {
          stressTest: {
            rateHikeAffordable: parsed.rateHike?.canStillAfford,
            incomeLossMonths: parsed.incomeLoss?.monthsOfRunway,
          },
        };

      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function formatMemoryForPrompt(memory: SessionMemory): string {
  if (Object.keys(memory.facts).length === 0) return "";

  const lines = Object.entries(memory.facts).map(
    ([key, val]) => `- ${key}: ${JSON.stringify(val)}`
  );

  return `\n\nSESSION MEMORY (facts from previous tool calls — avoid re-calling tools for known values):\n${lines.join("\n")}`;
}

// ── Feature 5: Tool Result Caching ─────────────────────────────

const TOOL_CACHE_TTL: Record<string, number> = {
  recalculate_affordability: 3600_000,
  calculate_payment_for_price: 3600_000,
  compare_scenarios: 3600_000,
  stress_test: 3600_000,
  rent_vs_buy: 3600_000,
  analyze_property: 3600_000,
  lookup_mortgage_info: 3600_000,
  get_current_rates: 300_000,
  search_properties: 300_000,
  get_area_info: 1800_000,
};

export function buildToolCacheKey(toolName: string, input: Record<string, unknown>): string {
  const sortedInput = JSON.stringify(input, Object.keys(input).sort());
  return `tool:${toolName}:${sortedInput}`;
}

export function getToolTTL(toolName: string): number {
  return TOOL_CACHE_TTL[toolName] ?? 300_000;
}

// Module-level cache instance (persists across requests in same process)
export const toolCache = new CacheService();
