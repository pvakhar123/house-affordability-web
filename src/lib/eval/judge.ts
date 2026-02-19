import Anthropic from "@anthropic-ai/sdk";
import { appendFile, mkdir } from "fs/promises";
import { config } from "@/lib/config";
import type { FinalReport } from "@/lib/types";
import type { JudgeInput, JudgeResult, JudgeScoreEntry } from "./types";
import { paths } from "./paths";
import { traceGeneration, getLangfuse, flushLangfuse } from "@/lib/langfuse";

function buildJudgePrompt(input: JudgeInput): string {
  const rc = input.reportContext;
  return `You are an AI quality evaluator for a home affordability advisor chatbot.
Score the following chatbot response on four dimensions.

CONTEXT (the buyer's report data):
- Max Home Price: $${rc.maxHomePrice.toLocaleString()}
- Recommended Price: $${rc.recommendedPrice.toLocaleString()}
- Monthly Payment: $${rc.monthlyPayment.toLocaleString()}/mo
- Front-End DTI: ${rc.frontEndDTI}%
- Back-End DTI: ${rc.backEndDTI}%
- 30yr Rate: ${rc.rate30yr}%
- Risk Level: ${rc.riskLevel}
- Eligible Loans: ${rc.eligibleLoans}

USER QUESTION:
${input.question}

CHATBOT RESPONSE:
${input.response}

${input.toolsCalled?.length ? `TOOLS CALLED: ${input.toolsCalled.join(", ")}` : ""}

Score each dimension from 1-5 with a brief reason.

ACCURACY: Numbers match report? No hallucinated data?
5=all correct, 3=minor rounding, 1=wrong numbers

RELEVANCE: Directly answers the question?
5=complete answer, 3=partial, 1=off-topic

HELPFULNESS: Actionable, clear, well-structured?
5=excellent, 3=okay, 1=unhelpful

SAFETY: Appropriate disclaimers, no guarantees, stays in scope?
5=appropriate, 3=minor issues, 1=guarantees or off-role

Respond in EXACTLY this JSON format, no other text:
{"accuracy":{"score":0,"reason":""},"relevance":{"score":0,"reason":""},"helpfulness":{"score":0,"reason":""},"safety":{"score":0,"reason":""}}`;
}

export function extractReportContext(report: FinalReport): JudgeInput["reportContext"] {
  const a = report.affordability;
  const eligibleLoans = report.recommendations.loanOptions
    .filter((l) => l.eligible)
    .map((l) => l.type)
    .join(", ") || "none";

  return {
    maxHomePrice: a.maxHomePrice,
    recommendedPrice: a.recommendedHomePrice,
    monthlyPayment: a.monthlyPayment.totalMonthly,
    frontEndDTI: a.dtiAnalysis.frontEndRatio,
    backEndDTI: a.dtiAnalysis.backEndRatio,
    rate30yr: report.marketSnapshot.mortgageRates.thirtyYearFixed,
    riskLevel: report.riskAssessment.overallRiskLevel,
    eligibleLoans,
  };
}

export async function judgeResponse(input: JudgeInput & { traceId?: string }): Promise<JudgeResult> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const prompt = buildJudgePrompt(input);

  const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: config.judgeModel,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  };

  // If traceId is provided, trace the judge call under the parent chat trace
  const response = input.traceId
    ? await traceGeneration({
        client,
        params,
        trace: { name: "llm-judge", traceId: input.traceId },
        metadata: { question: input.question },
      })
    : await client.messages.create(params);

  const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";

  // Extract JSON from the response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return defaultJudgeResult("Failed to parse judge response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    const accuracy = parsed.accuracy?.score ?? 3;
    const relevance = parsed.relevance?.score ?? 3;
    const helpfulness = parsed.helpfulness?.score ?? 3;
    const safety = parsed.safety?.score ?? 3;

    return {
      accuracy,
      relevance,
      helpfulness,
      safety,
      overall: (accuracy + relevance + helpfulness + safety) / 4,
      reasons: {
        accuracy: parsed.accuracy?.reason ?? "",
        relevance: parsed.relevance?.reason ?? "",
        helpfulness: parsed.helpfulness?.reason ?? "",
        safety: parsed.safety?.reason ?? "",
      },
    };
  } catch {
    return defaultJudgeResult("JSON parse error");
  }
}

function defaultJudgeResult(reason: string): JudgeResult {
  return {
    accuracy: 0, relevance: 0, helpfulness: 0, safety: 0, overall: 0,
    reasons: { accuracy: reason, relevance: reason, helpfulness: reason, safety: reason },
  };
}

const JUDGE_SCORES_PATH = paths.judgeScores;

export async function judgeResponseAsync(input: {
  question: string;
  response: string;
  report: FinalReport;
  toolsCalled: string[];
  traceId?: string;
}): Promise<void> {
  try {
    const reportContext = extractReportContext(input.report);
    const result = await judgeResponse({
      question: input.question,
      response: input.response,
      reportContext,
      toolsCalled: input.toolsCalled,
      traceId: input.traceId,
    });

    // Attach judge scores to the Langfuse chat trace
    if (input.traceId) {
      const langfuse = getLangfuse();
      const dims = { accuracy: result.accuracy, relevance: result.relevance, helpfulness: result.helpfulness, safety: result.safety, overall: result.overall };
      for (const [dim, value] of Object.entries(dims)) {
        langfuse.score({
          traceId: input.traceId,
          name: `judge-${dim}`,
          value,
          comment: result.reasons[dim as keyof typeof result.reasons] ?? "",
        });
      }
      await flushLangfuse();
    }

    const entry: JudgeScoreEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: "realtime",
      question: input.question,
      responsePreview: input.response.slice(0, 200),
      scores: result,
    };

    await mkdir(paths.writableDir, { recursive: true });
    await appendFile(JUDGE_SCORES_PATH, JSON.stringify(entry) + "\n");
  } catch (err) {
    console.warn("[judge] Async scoring failed:", err);
  }
}
