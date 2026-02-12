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
import type { FinalReport } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  report: FinalReport;
  history: ChatMessage[];
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
];

function handleToolCall(
  name: string,
  input: Record<string, unknown>
): string {
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

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function POST(request: Request) {
  try {
    config.validate();
    const { message, report, history } = (await request.json()) as ChatRequest;

    const client = new Anthropic();

    const systemPrompt = `You are a helpful home buying advisor following up on an affordability analysis.

Here is the buyer's complete analysis report:

AFFORDABILITY:
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

Use the tools to run calculations when the user asks "what if" questions. Be specific with numbers. Keep responses concise. Do not provide legal or binding financial advice.`;

    // Build messages from history + new message
    const messages: Anthropic.Messages.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Tool-use loop
    let iterations = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;

      const response = await client.messages.create({
        model: config.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        tools,
      });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
      );
      const textBlocks = response.content.filter(
        (b): b is Anthropic.Messages.TextBlock => b.type === "text"
      );

      if (toolUseBlocks.length === 0) {
        const text = textBlocks.map((b) => b.text).join("\n");
        return NextResponse.json({ response: text });
      }

      // Process tool calls
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] =
        toolUseBlocks.map((toolUse) => ({
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: handleToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          ),
        }));

      messages.push({ role: "user", content: toolResults });

      if (response.stop_reason === "end_turn" && textBlocks.length > 0) {
        const text = textBlocks.map((b) => b.text).join("\n");
        return NextResponse.json({ response: text });
      }
    }

    return NextResponse.json({
      response: "I ran into an issue processing that request. Could you try rephrasing?",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
