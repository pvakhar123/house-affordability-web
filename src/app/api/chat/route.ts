/**
 * STREAMING CHAT API WITH PROMPT CACHING
 *
 * Two AI concepts implemented here:
 *
 * 1. STREAMING (Server-Sent Events / SSE)
 *    Instead of waiting for the full response, we stream tokens as Claude
 *    generates them. The client sees text appear word-by-word, like ChatGPT.
 *
 *    How it works:
 *    - Server returns a ReadableStream with Content-Type: text/event-stream
 *    - Each token is sent as: data: {"text":"word"}\n\n
 *    - Client reads with fetch().body.getReader() and updates UI per chunk
 *    - Stream ends with: data: [DONE]\n\n
 *
 * 2. PROMPT CACHING
 *    The system prompt (with the full report) is identical across all messages
 *    in a conversation. Without caching, we re-process ~2000 tokens every time.
 *
 *    With cache_control: { type: "ephemeral" }:
 *    - First message: full processing (cache write)
 *    - Subsequent messages: cache hit → ~90% cheaper, ~80% faster
 *    - Cache lasts ~5 minutes (auto-refreshed on each use)
 *
 *    We cache both the system prompt AND the tools definition.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/lib/config";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
  stressTestRateHike,
  stressTestIncomeLoss,
  calculateRentVsBuy,
} from "@/lib/utils/financial-math";
import { retrieve } from "@/lib/rag/retriever";
import { FredApiClient } from "@/lib/services/fred-api";
import { CacheService } from "@/lib/services/cache";
import { searchProperties } from "@/lib/services/property-search";
import { lookupAreaInfo } from "@/lib/data/area-info";
import type { FinalReport } from "@/lib/types";
import { createStreamTrace, flushLangfuse } from "@/lib/langfuse";
import { logApiError, logUsageEvent } from "@/lib/db/track";
import {
  type ChatMessage,
  type SessionMemory,
  estimateTokens,
  truncateToFitBudget,
  splitForSummarization,
  summarizeOlderMessages,
  buildPersonaHints,
  extractFactsFromToolResult,
  formatMemoryForPrompt,
  buildToolCacheKey,
  getToolTTL,
  toolCache,
} from "@/lib/chat-context";
import {
  validateInput,
  validateToolParams,
  checkOutputNumbers,
  GUARDRAIL_SYSTEM_PROMPT_SUFFIX,
} from "@/lib/guardrails";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { chatInputSchema } from "@/lib/schemas";
import { auth } from "@/lib/auth";
import { checkUsage, incrementUsage, type Tier } from "@/lib/tier";

interface ChatRequest {
  message: string;
  report: FinalReport;
  history: ChatMessage[];
  conversationSummary?: string;
  sessionMemory?: SessionMemory;
}

function buildKnownFactsBlock(report: FinalReport): string {
  const a = report.affordability;
  const m = report.marketSnapshot;
  const r = report.riskAssessment;
  return `=== KNOWN FACTS (use these exact numbers, never approximate) ===
MAX_HOME_PRICE: $${Math.round(a.maxHomePrice).toLocaleString()}
RECOMMENDED_PRICE: $${Math.round(a.recommendedHomePrice).toLocaleString()}
DOWN_PAYMENT: $${Math.round(a.downPaymentAmount).toLocaleString()} (${a.downPaymentPercent}%)
LOAN_AMOUNT: $${Math.round(a.loanAmount).toLocaleString()}
MONTHLY_PAYMENT: $${Math.round(a.monthlyPayment.totalMonthly).toLocaleString()}
FRONT_END_DTI: ${a.dtiAnalysis.frontEndRatio}% (${a.dtiAnalysis.frontEndStatus})
BACK_END_DTI: ${a.dtiAnalysis.backEndRatio}% (${a.dtiAnalysis.backEndStatus})
RATE_30YR: ${m.mortgageRates.thirtyYearFixed}%
RATE_15YR: ${m.mortgageRates.fifteenYearFixed}%
RISK_LEVEL: ${r.overallRiskLevel} (score: ${r.overallScore}/100)
=== END KNOWN FACTS ===`;
}

const tools: Anthropic.Messages.Tool[] = [
  {
    name: "recalculate_affordability",
    description:
      "Recalculate max home price and monthly payments with different parameters (e.g. different income, down payment, rate, or loan term)",
    input_schema: {
      type: "object" as const,
      properties: {
        annualGrossIncome: { type: "number" },
        monthlyDebtPayments: { type: "number" },
        downPaymentAmount: { type: "number" },
        interestRate: {
          type: "number",
          description: "Annual rate as decimal, e.g. 0.065",
        },
        loanTermYears: { type: "number" },
      },
      required: [
        "annualGrossIncome",
        "monthlyDebtPayments",
        "downPaymentAmount",
        "interestRate",
        "loanTermYears",
      ],
    },
  },
  {
    name: "calculate_payment_for_price",
    description:
      "Calculate the monthly payment breakdown for a specific home price",
    input_schema: {
      type: "object" as const,
      properties: {
        homePrice: { type: "number" },
        downPaymentAmount: { type: "number" },
        interestRate: { type: "number" },
        loanTermYears: { type: "number" },
      },
      required: [
        "homePrice",
        "downPaymentAmount",
        "interestRate",
        "loanTermYears",
      ],
    },
  },
  {
    name: "compare_scenarios",
    description:
      "Compare two home buying scenarios side-by-side (e.g. different prices, rates, or loan terms)",
    input_schema: {
      type: "object" as const,
      properties: {
        scenario_a: {
          type: "object",
          properties: {
            label: { type: "string" },
            homePrice: { type: "number" },
            downPaymentAmount: { type: "number" },
            interestRate: { type: "number" },
            loanTermYears: { type: "number" },
          },
          required: [
            "label",
            "homePrice",
            "downPaymentAmount",
            "interestRate",
            "loanTermYears",
          ],
        },
        scenario_b: {
          type: "object",
          properties: {
            label: { type: "string" },
            homePrice: { type: "number" },
            downPaymentAmount: { type: "number" },
            interestRate: { type: "number" },
            loanTermYears: { type: "number" },
          },
          required: [
            "label",
            "homePrice",
            "downPaymentAmount",
            "interestRate",
            "loanTermYears",
          ],
        },
      },
      required: ["scenario_a", "scenario_b"],
    },
  },
  {
    name: "stress_test",
    description:
      "Run a stress test: what happens if rates increase or income drops",
    input_schema: {
      type: "object" as const,
      properties: {
        test_type: {
          type: "string",
          enum: ["rate_hike", "income_loss"],
        },
        loanAmount: { type: "number" },
        currentRate: {
          type: "number",
          description: "As decimal",
        },
        rateIncrease: {
          type: "number",
          description: "For rate_hike: increase as decimal (e.g. 0.02 for 2%)",
        },
        incomeReductionPercent: {
          type: "number",
          description: "For income_loss: percent reduction (e.g. 50)",
        },
        loanTermYears: { type: "number" },
        grossMonthlyIncome: { type: "number" },
        existingMonthlyDebts: { type: "number" },
        monthlyHousingPayment: { type: "number" },
        remainingSavings: { type: "number" },
        monthlyExpenses: { type: "number" },
        propertyTaxMonthly: { type: "number" },
        insuranceMonthly: { type: "number" },
      },
      required: ["test_type"],
    },
  },
  {
    name: "rent_vs_buy",
    description: "Compare renting vs buying for a given number of years",
    input_schema: {
      type: "object" as const,
      properties: {
        homePrice: { type: "number" },
        downPaymentAmount: { type: "number" },
        interestRate: { type: "number" },
        loanTermYears: { type: "number" },
        monthlyRent: { type: "number" },
        years: { type: "number" },
      },
      required: [
        "homePrice",
        "downPaymentAmount",
        "interestRate",
        "loanTermYears",
        "monthlyRent",
        "years",
      ],
    },
  },
  {
    name: "analyze_property",
    description:
      "Analyze whether the buyer can afford a specific property at a given listing price. Returns monthly payment, DTI, stretch factor, and affordability verdict.",
    input_schema: {
      type: "object" as const,
      properties: {
        listingPrice: {
          type: "number",
          description: "Property listing price",
        },
        address: {
          type: "string",
          description: "Property address (optional)",
        },
        propertyTaxAnnual: {
          type: "number",
          description:
            "Annual property tax amount (optional, defaults to 1.1% of price)",
        },
        hoaMonthly: {
          type: "number",
          description: "Monthly HOA dues (optional, defaults to 0)",
        },
      },
      required: ["listingPrice"],
    },
  },
  {
    name: "lookup_mortgage_info",
    description:
      "Search the mortgage knowledge base for information about loan types (FHA, VA, conventional, ARM), down payments, PMI, DTI ratios, closing costs, credit score impacts, first-time buyer programs, property taxes, and home inspections. Use this when the user asks general mortgage or homebuying questions.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The mortgage/homebuying topic to look up",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_current_rates",
    description:
      "Get today's live mortgage interest rates (30-year fixed, 15-year fixed, 5/1 ARM) from the Federal Reserve. Use this when the user asks about current or today's mortgage rates.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_properties",
    description:
      "Search for homes currently for sale in a specific US city. Returns up to 5 listings with prices, beds, baths, sqft, and addresses. Use this when the user asks to find or search for homes/houses in an area.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "City and state (e.g., 'Austin, TX')",
        },
        max_price: {
          type: "number",
          description: "Maximum listing price (optional)",
        },
        min_beds: {
          type: "number",
          description: "Minimum number of bedrooms (optional)",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "get_area_info",
    description:
      "Get property tax rates, median home prices, school ratings, and cost of living index for a US metro area. Covers top 50 US metros. Use this when the user asks about taxes, schools, or cost of living in a specific area.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "City and state (e.g., 'Denver, CO')",
        },
      },
      required: ["location"],
    },
  },
];

async function handleToolCall(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "recalculate_affordability": {
      const result = calculateMaxHomePrice({
        annualGrossIncome: input.annualGrossIncome as number,
        monthlyDebtPayments: input.monthlyDebtPayments as number,
        downPaymentAmount: input.downPaymentAmount as number,
        interestRate: input.interestRate as number,
        loanTermYears: input.loanTermYears as number,
        propertyTaxRate: 0.011,
        insuranceAnnual: 1500,
        maxFrontEndDTI: 0.28,
        maxBackEndDTI: 0.36,
      });
      const payment = calculateMonthlyPayment({
        homePrice: result.maxHomePrice,
        downPaymentAmount: input.downPaymentAmount as number,
        interestRate: input.interestRate as number,
        loanTermYears: input.loanTermYears as number,
        propertyTaxRate: 0.011,
        insuranceAnnual: 1500,
        pmiRate: 0.005,
      });
      const dti = calculateDTI({
        grossMonthlyIncome: (input.annualGrossIncome as number) / 12,
        proposedHousingPayment: payment.totalMonthly,
        existingMonthlyDebts: input.monthlyDebtPayments as number,
      });
      return JSON.stringify({ ...result, payment, dti });
    }

    case "calculate_payment_for_price": {
      const payment = calculateMonthlyPayment({
        homePrice: input.homePrice as number,
        downPaymentAmount: input.downPaymentAmount as number,
        interestRate: input.interestRate as number,
        loanTermYears: input.loanTermYears as number,
        propertyTaxRate: 0.011,
        insuranceAnnual: 1500,
        pmiRate: 0.005,
      });
      return JSON.stringify(payment);
    }

    case "compare_scenarios": {
      const a = input.scenario_a as Record<string, unknown>;
      const b = input.scenario_b as Record<string, unknown>;
      const paymentA = calculateMonthlyPayment({
        homePrice: a.homePrice as number,
        downPaymentAmount: a.downPaymentAmount as number,
        interestRate: a.interestRate as number,
        loanTermYears: a.loanTermYears as number,
        propertyTaxRate: 0.011,
        insuranceAnnual: 1500,
        pmiRate: 0.005,
      });
      const paymentB = calculateMonthlyPayment({
        homePrice: b.homePrice as number,
        downPaymentAmount: b.downPaymentAmount as number,
        interestRate: b.interestRate as number,
        loanTermYears: b.loanTermYears as number,
        propertyTaxRate: 0.011,
        insuranceAnnual: 1500,
        pmiRate: 0.005,
      });
      return JSON.stringify({
        scenario_a: { label: a.label, payment: paymentA, totalCost: Math.round(paymentA.totalMonthly * (a.loanTermYears as number) * 12) },
        scenario_b: { label: b.label, payment: paymentB, totalCost: Math.round(paymentB.totalMonthly * (b.loanTermYears as number) * 12) },
        difference: Math.round(Math.abs(paymentA.totalMonthly - paymentB.totalMonthly)),
      });
    }

    case "stress_test": {
      if (input.test_type === "rate_hike") {
        return JSON.stringify(
          stressTestRateHike({
            loanAmount: input.loanAmount as number,
            baseRate: input.currentRate as number,
            rateIncrease: input.rateIncrease as number,
            loanTermYears: (input.loanTermYears as number) ?? 30,
            grossMonthlyIncome: input.grossMonthlyIncome as number,
            existingMonthlyDebts: input.existingMonthlyDebts as number,
            propertyTaxMonthly: (input.propertyTaxMonthly as number) ?? 0,
            insuranceMonthly: (input.insuranceMonthly as number) ?? 125,
          })
        );
      } else {
        return JSON.stringify(
          stressTestIncomeLoss({
            grossMonthlyIncome: input.grossMonthlyIncome as number,
            incomeReductionPercent: input.incomeReductionPercent as number,
            monthlyHousingPayment: input.monthlyHousingPayment as number,
            existingMonthlyDebts: input.existingMonthlyDebts as number,
            remainingSavings: (input.remainingSavings as number) ?? 0,
            monthlyExpenses: (input.monthlyExpenses as number) ?? 3000,
          })
        );
      }
    }

    case "rent_vs_buy": {
      return JSON.stringify(
        calculateRentVsBuy({
          homePrice: input.homePrice as number,
          downPaymentAmount: input.downPaymentAmount as number,
          interestRate: input.interestRate as number,
          loanTermYears: input.loanTermYears as number,
          propertyTaxRate: 0.011,
          insuranceAnnual: 1500,
          maintenanceRate: 0.01,
          monthlyRent: input.monthlyRent as number,
          rentGrowthRate: 0.03,
          homeAppreciationRate: 0.035,
          years: input.years as number,
        })
      );
    }

    case "lookup_mortgage_info": {
      const results = retrieve(input.query as string, 3);
      return JSON.stringify({
        documents: results.map((r) => ({
          title: r.document.title,
          content: r.document.content,
          source: r.document.source,
          relevance: Math.round(r.score * 100) / 100,
        })),
      });
    }

    case "get_current_rates": {
      try {
        const fred = new FredApiClient(process.env.FRED_API_KEY!, new CacheService());
        const [thirty, fifteen, arm] = await Promise.all([
          fred.getLatestObservation("MORTGAGE30US"),
          fred.getLatestObservation("MORTGAGE15US"),
          fred.getLatestObservation("MORTGAGE5US"),
        ]);
        return JSON.stringify({
          asOf: thirty.date,
          thirtyYearFixed: thirty.value,
          fifteenYearFixed: fifteen.value,
          fiveOneArm: arm.value,
          source: "Federal Reserve Economic Data (FRED)",
        });
      } catch (error) {
        return JSON.stringify({ error: "Unable to fetch current rates. Using report rates instead.", fallback: true });
      }
    }

    case "search_properties": {
      try {
        const listings = await searchProperties({
          location: input.location as string,
          maxPrice: input.max_price as number | undefined,
          minBeds: input.min_beds as number | undefined,
        });
        if (listings.length === 0) {
          return JSON.stringify({ message: "No listings found matching your criteria.", results: [] });
        }
        return JSON.stringify({
          location: input.location,
          resultCount: listings.length,
          listings,
          source: "Zillow via RapidAPI",
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Property search failed";
        return JSON.stringify({ error: msg, hint: "Property search requires a RAPIDAPI_KEY. The user can still use analyze_property to check affordability for a specific price." });
      }
    }

    case "get_area_info": {
      const result = lookupAreaInfo(input.location as string);
      if (!result) {
        return JSON.stringify({
          error: `No data available for "${input.location}". This tool covers the top 50 US metro areas.`,
          availableExample: "Try cities like Austin TX, Denver CO, Seattle WA, etc.",
        });
      }
      const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
      return JSON.stringify({
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
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function handleAnalyzeProperty(
  input: Record<string, unknown>,
  report: FinalReport
): string {
  const listingPrice = input.listingPrice as number;
  const hoaMonthly = (input.hoaMonthly as number) ?? 0;
  const propertyTaxAnnual = input.propertyTaxAnnual as number | undefined;
  const propertyTaxRate = propertyTaxAnnual
    ? propertyTaxAnnual / listingPrice
    : 0.011;

  const downPayment = Math.min(
    report.affordability.downPaymentAmount,
    listingPrice
  );
  const downPaymentPercent = (downPayment / listingPrice) * 100;
  const rate = report.marketSnapshot.mortgageRates.thirtyYearFixed / 100;

  const payment = calculateMonthlyPayment({
    homePrice: listingPrice,
    downPaymentAmount: downPayment,
    interestRate: rate,
    loanTermYears: 30,
    propertyTaxRate,
    insuranceAnnual: 1500,
    pmiRate: downPaymentPercent >= 20 ? 0 : 0.005,
  });

  const totalMonthly = Math.round((payment.totalMonthly + hoaMonthly) * 100) / 100;
  const grossMonthlyIncome =
    (report.affordability.monthlyPayment.totalMonthly /
      (report.affordability.dtiAnalysis.frontEndRatio / 100));

  const dti = calculateDTI({
    grossMonthlyIncome,
    proposedHousingPayment: totalMonthly,
    existingMonthlyDebts:
      grossMonthlyIncome *
      (report.affordability.dtiAnalysis.backEndRatio / 100) -
      report.affordability.monthlyPayment.totalMonthly,
  });

  const stretchFactor =
    Math.round((listingPrice / report.affordability.maxHomePrice) * 100) / 100;

  let verdict: string;
  if (stretchFactor <= 0.85) verdict = "comfortable";
  else if (stretchFactor <= 1.0) verdict = "tight but affordable";
  else if (stretchFactor <= 1.15) verdict = "stretch - over budget";
  else verdict = "significantly over budget";

  const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

  return JSON.stringify({
    address: (input.address as string) || "Specified property",
    listingPrice: fmt(listingPrice),
    monthlyPayment: fmt(totalMonthly),
    paymentBreakdown: {
      principalAndInterest: fmt(payment.principal + payment.interest),
      propertyTax: fmt(payment.propertyTax),
      insurance: fmt(payment.homeInsurance),
      pmi: payment.pmi > 0 ? fmt(payment.pmi) : "N/A",
      hoa: hoaMonthly > 0 ? fmt(hoaMonthly) : "N/A",
    },
    dti: {
      frontEnd: dti.frontEndRatio + "%",
      backEnd: dti.backEndRatio + "%",
      status: dti.backEndStatus,
    },
    stretchFactor: stretchFactor,
    percentOfMax: Math.round(stretchFactor * 100) + "%",
    verdict,
    maxHomePrice: fmt(report.affordability.maxHomePrice),
    recommendedPrice: fmt(report.affordability.recommendedHomePrice),
    differenceFromRecommended: fmt(
      listingPrice - report.affordability.recommendedHomePrice
    ),
  });
}

export async function POST(request: Request) {
  // Rate limit: 60 chat messages per IP per hour
  const ip = getClientIp(request);
  const rl = checkRateLimit(`chat:${ip}`, 60, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  // Tier-based usage gating
  const session = await auth();
  const userId = session?.user?.id;
  const tier: Tier = (session?.user?.tier as Tier) ?? "free";

  if (userId) {
    const usage = await checkUsage(userId, tier, "chat");
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "limit_reached", message: usage.upgradeReason, usageStatus: usage.usageStatus },
        { status: 403 },
      );
    }
  } else {
    // Anonymous users: 20 chat messages per day per IP
    const anonRl = checkRateLimit(`chat-anon:${ip}`, 20, 86_400_000);
    if (!anonRl.allowed) {
      return NextResponse.json(
        { error: "limit_reached", message: "Sign in to continue chatting, or upgrade to Pro for unlimited messages.", requiresAuth: true },
        { status: 403 },
      );
    }
  }

  try {
    config.validate();
    const body = await request.json();
    const parsed = chatInputSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const {
      message,
      report,
      history,
      conversationSummary: existingSummary = null,
      sessionMemory: existingMemory = null,
    } = body as ChatRequest;

    // ── INPUT GUARDRAIL ──────────────────────────────────────
    // Fast check: length → injection regex → Haiku topic classifier.
    // If blocked, return a canned response without hitting the main model.
    const inputCheck = await validateInput(message);
    if (!inputCheck.allowed) {
      console.log(`[guardrail] Input blocked: ${inputCheck.reason}`);
      const enc = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              enc.encode(`data: ${JSON.stringify({ text: inputCheck.cannedResponse })}\n\n`)
            );
            controller.enqueue(enc.encode(`data: [DONE]\n\n`));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
    }

    const client = new Anthropic();

    // ── CONTEXT ENGINEERING ───────────────────────────────────
    // Five layers compose the context sent to Claude:
    // 1. Token-aware truncation (drop oldest messages if over budget)
    // 2. Conversation summarization (compress old messages via Haiku)
    // 3. Adaptive persona hints (tailor advice based on report profile)
    // 4. Session memory (facts from previous tool calls)
    // 5. Tool result caching (skip re-execution on cache hit)

    // Feature 3: Adaptive persona hints from report profile
    const personaHints = buildPersonaHints(report);

    // Feature 2: Conversation summarization
    const { recentMessages, messagesToSummarize } = splitForSummarization(
      history,
      existingSummary
    );
    let updatedSummary = existingSummary;
    if (messagesToSummarize) {
      updatedSummary = await summarizeOlderMessages(
        messagesToSummarize,
        existingSummary
      );
    }

    // Feature 4: Restore session memory
    const memory: SessionMemory = existingMemory ?? {
      facts: {},
      toolsUsed: [],
    };
    const memoryPrompt = formatMemoryForPrompt(memory);

    // ── PROMPT CACHING ────────────────────────────────────────
    // The system prompt contains the full report — identical across all
    // messages in a conversation. By marking it with cache_control,
    // subsequent messages reuse the cached prompt instead of re-processing it.
    //
    // First message:  cache MISS → normal price, writes to cache
    // Second message: cache HIT  → ~90% cheaper input tokens, ~80% faster
    // Cache TTL: 5 minutes (refreshed on each use)

    const knownFacts = buildKnownFactsBlock(report);

    const systemPromptText = `${knownFacts}

You are a helpful home research advisor following up on a home buying analysis.

Here is the buyer's complete analysis report:

BUYING POWER:
- Max Home Price: $${report.affordability.maxHomePrice.toLocaleString()}
- Recommended Price: $${report.affordability.recommendedHomePrice.toLocaleString()}
- Down Payment: $${report.affordability.downPaymentAmount.toLocaleString()} (${report.affordability.downPaymentPercent}%)
- Loan Amount: $${report.affordability.loanAmount.toLocaleString()}
- Monthly Payment: $${report.affordability.monthlyPayment.totalMonthly.toLocaleString()}/mo
- Front-End DTI: ${report.affordability.dtiAnalysis.frontEndRatio}% (${report.affordability.dtiAnalysis.frontEndStatus})
- Back-End DTI: ${report.affordability.dtiAnalysis.backEndRatio}% (${report.affordability.dtiAnalysis.backEndStatus})

MARKET DATA:
- 30yr Rate: ${report.marketSnapshot.mortgageRates.thirtyYearFixed}%
- 15yr Rate: ${report.marketSnapshot.mortgageRates.fifteenYearFixed}%
- National Median: $${report.marketSnapshot.medianHomePrices.national.toLocaleString()}

RISK: ${report.riskAssessment.overallRiskLevel} (score: ${report.riskAssessment.overallScore}/100)

LOAN OPTIONS: ${report.recommendations.loanOptions.map((l) => `${l.type}(${l.eligible ? "eligible" : "not eligible"})`).join(", ")}
${report.propertyAnalysis ? `
PROPERTY ANALYZED: ${report.propertyAnalysis.property.address || "Specific property"}
- Listing Price: $${report.propertyAnalysis.property.listingPrice.toLocaleString()}
- Monthly Payment: $${report.propertyAnalysis.totalMonthlyWithHoa.toLocaleString()}/mo
- Stretch Factor: ${Math.round(report.propertyAnalysis.stretchFactor * 100)}% of max
- Verdict: ${report.propertyAnalysis.verdict}` : ""}
${updatedSummary ? `\n\nCONVERSATION SUMMARY (older messages compressed):\n${updatedSummary}` : ""}${personaHints}${memoryPrompt}

Use the tools to run calculations when the user asks "what if" questions. Use the analyze_property tool when a user asks about a specific property or home price. Use the lookup_mortgage_info tool when the user asks general questions about mortgage types (FHA, VA, conventional, ARM), PMI, DTI, closing costs, credit scores, first-time buyer programs, or other homebuying topics — it searches a curated knowledge base and returns relevant documents.

You also have live data tools:
- get_current_rates: Fetch today's actual mortgage rates from the Federal Reserve. Use when users ask about current/today's rates.
- search_properties: Search for real homes for sale in any US city. Use when users want to see actual listings.
- get_area_info: Get property tax rates, school ratings, median prices, and cost of living for a metro area. Use when discussing a specific area's housing market.

Be specific with numbers. Keep responses concise. Do not provide legal or binding financial advice.${GUARDRAIL_SYSTEM_PROMPT_SUFFIX}`;

    // System prompt with cache control — cached for the duration of the conversation
    const system: Anthropic.Messages.TextBlockParam[] = [
      {
        type: "text",
        text: systemPromptText,
        cache_control: { type: "ephemeral" },
      },
    ];

    // Tools with cache control on the last tool — tools are identical across ALL requests
    const cachedTools = tools.map((tool, i) =>
      i === tools.length - 1
        ? { ...tool, cache_control: { type: "ephemeral" as const } }
        : tool
    );

    // Build messages from recent history + new message
    // Feature 1: Token-aware truncation — drop oldest pairs if over budget
    const systemTokens = estimateTokens(systemPromptText);
    const allMessages: ChatMessage[] = [
      ...recentMessages,
      { role: "user", content: message },
    ];
    const { messages: fittedMessages, wasTruncated } = truncateToFitBudget(
      systemTokens,
      allMessages
    );

    const messages: Anthropic.Messages.MessageParam[] = fittedMessages.map(
      (m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })
    );

    // ── STREAMING (SSE) ───────────────────────────────────────
    // Instead of waiting for the full response, we stream tokens
    // as Claude generates them using Server-Sent Events.
    //
    // Flow with tool use:
    //   1. Stream starts → text deltas sent to client as they arrive
    //   2. If Claude calls a tool → we process it locally (fast, ~1ms)
    //   3. New stream starts with tool results → more text deltas
    //   4. Final text streamed → send [DONE]
    //
    // The client sees text appearing word-by-word for the final answer.

    const encoder = new TextEncoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          const chatStart = Date.now();
          const send = (data: string) => {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };
          let ragSources: {title: string; source: string; relevance: number}[] = [];

          try {
            let iterations = 0;
            const maxIterations = 5;

            const chatTrace = createStreamTrace({
              name: "chat",
              model: config.model,
              maxTokens: 2048,
              sessionId: `chat-${Date.now()}`,
              metadata: {
                messageCount: history.length + 1,
                wasTruncated,
                hasSummary: !!updatedSummary,
                memoryFactCount: Object.keys(memory.facts).length,
              },
            });

            while (iterations < maxIterations) {
              iterations++;
              let accumulatedText = "";

              const gen = chatTrace.createGeneration(`chat-turn-${iterations}`, {
                toolCount: cachedTools.length,
                messageCount: messages.length,
              });

              // Create a streaming request to Claude
              const stream = client.messages.stream(
                {
                  model: config.model,
                  max_tokens: 2048,
                  system,
                  messages,
                  tools: cachedTools,
                },
                { timeout: 60000 },
              );

              // Stream text deltas to the client as they arrive
              stream.on("text", (text) => {
                accumulatedText += text;
                send(JSON.stringify({ text }));
              });

              // Wait for the complete message to check for tool use
              const finalMessage = await stream.finalMessage();
              gen.end(finalMessage);

              const toolUseBlocks = finalMessage.content.filter(
                (b): b is Anthropic.Messages.ToolUseBlock =>
                  b.type === "tool_use"
              );

              if (toolUseBlocks.length === 0) {
                // ── OUTPUT GUARDRAIL ─────────────────────────────
                // Non-blocking: check numerical accuracy against report
                const outputCheck = checkOutputNumbers(accumulatedText, report);
                if (outputCheck.flagged) {
                  console.warn(
                    `[guardrail] Output numerical discrepancy:`,
                    outputCheck.discrepancies
                  );
                  send(JSON.stringify({ text: outputCheck.correctionNote }));
                }

                // Send context meta (summary + memory + tools + traceId + RAG sources) for client to persist
                send(JSON.stringify({
                  meta: {
                    ...(updatedSummary ? { conversationSummary: updatedSummary } : {}),
                    sessionMemory: memory,
                    toolsCalled: memory.toolsUsed,
                    traceId: chatTrace.traceId,
                    ...(ragSources.length > 0 ? { sources: ragSources } : {}),
                  },
                }));
                send("[DONE]");
                logUsageEvent("/api/chat", "POST", 200, Date.now() - chatStart);
                if (userId) {
                  incrementUsage(userId, "chat").catch((err) => console.error("[tier] increment error:", err));
                }
                await flushLangfuse();
                controller.close();

                // Non-blocking LLM-as-judge: score response quality after stream closes
                if (process.env.ENABLE_REALTIME_JUDGE === "true") {
                  import("@/lib/eval/judge").then(({ judgeResponseAsync }) =>
                    judgeResponseAsync({ question: message, response: accumulatedText, report, toolsCalled: memory.toolsUsed, traceId: chatTrace.traceId })
                      .catch((err) => console.warn("[judge]", err))
                  ).catch(() => {});
                }
                return;
              }

              // Tool use detected — notify client, process tools, then loop
              const toolNames = toolUseBlocks.map((t) => t.name);
              send(JSON.stringify({ thinking: true, tools: toolNames }));

              messages.push({
                role: "assistant",
                content: finalMessage.content,
              });

              // Feature 5: Tool result caching + Feature 4: Memory extraction
              const toolResults: Anthropic.Messages.ToolResultBlockParam[] =
                await Promise.all(toolUseBlocks.map(async (toolUse) => {
                  const toolInput = toolUse.input as Record<string, unknown>;

                  // ── TOOL PARAMETER GUARDRAIL ─────────────────
                  const validation = validateToolParams(toolUse.name, toolInput);
                  if (!validation.valid) {
                    console.log(
                      `[guardrail] Tool validation failed: ${toolUse.name}`,
                      validation.errors
                    );
                    return {
                      type: "tool_result" as const,
                      tool_use_id: toolUse.id,
                      content: JSON.stringify({
                        error: "Parameter validation failed",
                        details: validation.errors,
                        hint: "Please adjust the parameters and try again.",
                      }),
                      is_error: true,
                    };
                  }

                  const cacheKey = buildToolCacheKey(toolUse.name, toolInput);

                  // Check cache first
                  const cached = toolCache.get<string>(cacheKey);
                  let result: string;

                  if (cached) {
                    result = cached;
                  } else if (toolUse.name === "analyze_property") {
                    result = handleAnalyzeProperty(toolInput, report);
                    toolCache.set(cacheKey, result, getToolTTL(toolUse.name));
                  } else {
                    result = await handleToolCall(toolUse.name, toolInput);
                    toolCache.set(cacheKey, result, getToolTTL(toolUse.name));
                  }

                  // Extract facts into session memory
                  const facts = extractFactsFromToolResult(toolUse.name, toolInput, result);
                  if (facts) {
                    Object.assign(memory.facts, facts);
                  }
                  if (!memory.toolsUsed.includes(toolUse.name)) {
                    memory.toolsUsed.push(toolUse.name);
                  }

                  return {
                    type: "tool_result" as const,
                    tool_use_id: toolUse.id,
                    content: result,
                  };
                }));

              // Extract RAG sources from lookup_mortgage_info results
              for (let ti = 0; ti < toolUseBlocks.length; ti++) {
                if (toolUseBlocks[ti].name === "lookup_mortgage_info") {
                  try {
                    const parsed = JSON.parse(toolResults[ti].content as string);
                    if (parsed.documents) {
                      ragSources = parsed.documents.map((d: { title: string; source: string; relevance: number }) => ({
                        title: d.title,
                        source: d.source,
                        relevance: d.relevance,
                      }));
                    }
                  } catch { /* ignore */ }
                }
              }

              messages.push({ role: "user", content: toolResults });
              // Loop again — next iteration streams the text response
            }

            // Max iterations reached
            send(
              JSON.stringify({
                text: "I ran into an issue processing that request. Could you try rephrasing?",
              })
            );
            send("[DONE]");
            await flushLangfuse();
            controller.close();
          } catch (error) {
            console.error("Chat streaming error:", error);
            logApiError("/api/chat", "POST", error);
            logUsageEvent("/api/chat", "POST", 500, Date.now() - chatStart);
            send(
              JSON.stringify({
                error:
                  error instanceof Error ? error.message : "Chat failed",
              })
            );
            send("[DONE]");
            await flushLangfuse();
            controller.close();
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    logApiError("/api/chat", "POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
