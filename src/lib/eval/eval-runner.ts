import { readFile, appendFile, mkdir } from "fs/promises";
import type { FinalReport } from "@/lib/types";
import type { GoldenDataset, GoldenTestCase, EvalResult, EvalRunSummary, JudgeResult, JudgeScoreEntry } from "./types";
import { judgeResponse, extractReportContext } from "./judge";
import { paths } from "./paths";
import { getLangfuse, flushLangfuse } from "@/lib/langfuse";
import { isDbAvailable } from "@/lib/db";
import { insertEvalResult, insertJudgeScore } from "@/lib/db/queries";

// ── Load golden dataset ─────────────────────────────────────

async function loadGoldenDataset(): Promise<GoldenDataset> {
  const raw = await readFile(paths.goldenDataset, "utf-8");
  return JSON.parse(raw) as GoldenDataset;
}

// ── SSE consumer: call chat API and collect full response ───

async function callChatAndCollect(
  question: string,
  report: FinalReport,
  baseUrl: string,
): Promise<{ fullText: string; toolsCalled: string[]; durationMs: number }> {
  const start = Date.now();

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: question,
      report,
      history: [],
      conversationSummary: null,
      sessionMemory: null,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chat API returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let toolsCalled: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        if (parsed.text) fullText += parsed.text;
        if (parsed.meta?.toolsCalled) toolsCalled = parsed.meta.toolsCalled;
      } catch {
        // Ignore parse errors from incomplete chunks
      }
    }
  }

  return { fullText, toolsCalled, durationMs: Date.now() - start };
}

// ── Pattern matching scorer ─────────────────────────────────

function scorePatterns(testCase: GoldenTestCase, response: string, toolsCalled: string[]) {
  const lower = response.toLowerCase();

  const mustIncludeResults = testCase.mustInclude.map((p) => ({
    pattern: p,
    passed: lower.includes(p.toLowerCase()),
  }));

  const mustNotIncludeResults = testCase.mustNotInclude.map((p) => ({
    pattern: p,
    passed: !lower.includes(p.toLowerCase()),
  }));

  const patternResults = testCase.expectedPatterns.map((p) => ({
    pattern: p,
    passed: new RegExp(p, "i").test(response),
  }));

  const toolCallResults = (testCase.expectedToolCalls ?? []).map((t) => ({
    pattern: t,
    passed: toolsCalled.includes(t),
  }));

  const checks = [
    ...mustIncludeResults.map((r) => r.passed),
    ...mustNotIncludeResults.map((r) => r.passed),
    ...patternResults.map((r) => r.passed),
    ...toolCallResults.map((r) => r.passed),
  ];

  const score = checks.length > 0 ? checks.filter(Boolean).length / checks.length : 1;

  return { mustIncludeResults, mustNotIncludeResults, patternResults, toolCallResults, score };
}

// ── JSONL helper ────────────────────────────────────────────

async function appendJsonl(filename: string, data: unknown) {
  await mkdir(paths.writableDir, { recursive: true });
  const filepath = filename === "eval-results.jsonl" ? paths.evalResults : paths.judgeScores;
  await appendFile(filepath, JSON.stringify(data) + "\n");
}

// ── Main eval runner ────────────────────────────────────────

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

export async function runEvaluation(options?: {
  testCaseIds?: string[];
  skipJudge?: boolean;
  baseUrl?: string;
}): Promise<EvalRunSummary & { results: EvalResult[] }> {
  const dataset = await loadGoldenDataset();
  const cases = options?.testCaseIds
    ? dataset.testCases.filter((tc) => options.testCaseIds!.includes(tc.id))
    : dataset.testCases;

  const baseUrl = options?.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const evalRunId = `eval-${Date.now()}`;
  const results: EvalResult[] = [];

  // Sync golden test cases to Langfuse as a Dataset
  const langfuse = getLangfuse();
  const datasetName = "golden-dataset-v1";
  try {
    await langfuse.createDataset({ name: datasetName });
    for (const tc of cases) {
      await langfuse.createDatasetItem({
        datasetName,
        id: tc.id,
        input: { question: tc.question, report: dataset.fixtureReport },
        expectedOutput: {
          mustInclude: tc.mustInclude,
          mustNotInclude: tc.mustNotInclude,
          expectedPatterns: tc.expectedPatterns,
          expectedToolCalls: tc.expectedToolCalls,
        },
        metadata: { category: tc.category },
      });
    }
  } catch (e) {
    console.warn("[eval] Langfuse dataset sync failed:", e);
  }

  for (const testCase of cases) {
    const report = dataset.fixtureReport;

    let fullText = "";
    let toolsCalled: string[] = [];
    let durationMs = 0;

    try {
      const chatResult = await callChatAndCollect(testCase.question, report, baseUrl);
      fullText = chatResult.fullText;
      toolsCalled = chatResult.toolsCalled;
      durationMs = chatResult.durationMs;
    } catch (err) {
      fullText = `[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`;
      durationMs = 0;
    }

    const patternScoring = scorePatterns(testCase, fullText, toolsCalled);

    // Create a Langfuse trace for this eval case so judge calls are traced
    const evalTrace = langfuse.trace({
      name: `eval-${testCase.id}`,
      metadata: { evalRunId, category: testCase.category },
    });

    let judgeScores: JudgeResult;
    if (!options?.skipJudge && !fullText.startsWith("[ERROR]")) {
      const reportContext = extractReportContext(report);
      judgeScores = await judgeResponse({
        question: testCase.question,
        response: fullText,
        reportContext,
        toolsCalled,
        traceId: evalTrace.id,
      });
    } else {
      judgeScores = {
        accuracy: 0, relevance: 0, helpfulness: 0, safety: 0, overall: 0,
        reasons: { accuracy: "skipped", relevance: "skipped", helpfulness: "skipped", safety: "skipped" },
      };
    }

    const overallPass = patternScoring.score >= 0.8 && (options?.skipJudge || judgeScores.overall >= 3.5);

    const result: EvalResult = {
      evalRunId,
      timestamp: new Date().toISOString(),
      testCaseId: testCase.id,
      category: testCase.category,
      question: testCase.question,
      response: fullText,
      toolsCalled,
      mustIncludeResults: patternScoring.mustIncludeResults,
      mustNotIncludeResults: patternScoring.mustNotIncludeResults,
      patternResults: patternScoring.patternResults,
      toolCallResults: patternScoring.toolCallResults,
      patternScore: patternScoring.score,
      judgeScores,
      overallPass,
      durationMs,
    };

    results.push(result);
    if (isDbAvailable) {
      await insertEvalResult(result);
    } else {
      await appendJsonl("eval-results.jsonl", result);
    }

    // Link result as a Langfuse dataset run item
    try {
      langfuse.createDatasetRunItem({
        datasetItemId: testCase.id,
        runName: evalRunId,
        runDescription: `Eval run ${evalRunId}`,
        metadata: {
          patternScore: patternScoring.score,
          overallPass,
          judgeScores,
          durationMs,
        },
      });
    } catch (e) {
      console.warn("[eval] Langfuse dataset run item failed:", e);
    }

    // Also persist judge score in shared file
    if (!options?.skipJudge && !fullText.startsWith("[ERROR]")) {
      const entry: JudgeScoreEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        source: "batch",
        question: testCase.question,
        responsePreview: fullText.slice(0, 200),
        scores: judgeScores,
        testCaseId: testCase.id,
        evalRunId,
      };
      if (isDbAvailable) {
        await insertJudgeScore(entry);
      } else {
        await appendJsonl("judge-scores.jsonl", entry);
      }
    }
  }

  const passed = results.filter((r) => r.overallPass).length;

  // Flush all Langfuse events before returning
  await flushLangfuse();

  return {
    evalRunId,
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed: results.length - passed,
    avgPatternScore: avg(results.map((r) => r.patternScore)),
    avgJudgeScores: {
      accuracy: avg(results.map((r) => r.judgeScores.accuracy)),
      relevance: avg(results.map((r) => r.judgeScores.relevance)),
      helpfulness: avg(results.map((r) => r.judgeScores.helpfulness)),
      safety: avg(results.map((r) => r.judgeScores.safety)),
      overall: avg(results.map((r) => r.judgeScores.overall)),
    },
    durationMs: results.reduce((s, r) => s + r.durationMs, 0),
    results,
  };
}
