import { desc, eq, gte, avg, count, sql } from "drizzle-orm";
import { getDb } from "./index";
import * as schema from "./schema";
import type { JudgeScoreEntry, EvalResult, EvalRunSummary } from "@/lib/eval/types";

// ── Judge Scores ────────────────────────────────────────────

export async function insertJudgeScore(entry: JudgeScoreEntry) {
  const db = getDb();
  await db.insert(schema.judgeScores).values({
    id: entry.id,
    timestamp: new Date(entry.timestamp),
    source: entry.source,
    question: entry.question,
    responsePreview: entry.responsePreview,
    accuracy: entry.scores.accuracy,
    relevance: entry.scores.relevance,
    helpfulness: entry.scores.helpfulness,
    safety: entry.scores.safety,
    overall: entry.scores.overall,
    reasons: entry.scores.reasons,
    testCaseId: entry.testCaseId ?? null,
    evalRunId: entry.evalRunId ?? null,
  });
}

export async function queryJudgeScores(opts?: {
  source?: "realtime" | "batch" | "report";
  since?: string;
  limit?: number;
}) {
  const db = getDb();
  const limit = opts?.limit ?? 100;

  // Build conditions
  const conditions = [];
  if (opts?.source) conditions.push(eq(schema.judgeScores.source, opts.source));
  if (opts?.since) conditions.push(gte(schema.judgeScores.timestamp, new Date(opts.since)));

  const where = conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : sql`${conditions[0]} AND ${conditions[1]}`
    : undefined;

  // Fetch entries
  const rows = await db
    .select()
    .from(schema.judgeScores)
    .where(where)
    .orderBy(desc(schema.judgeScores.timestamp))
    .limit(limit);

  // Map rows back to JudgeScoreEntry shape for API compatibility
  const entries: JudgeScoreEntry[] = rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    source: r.source as JudgeScoreEntry["source"],
    question: r.question,
    responsePreview: r.responsePreview,
    scores: {
      accuracy: r.accuracy,
      relevance: r.relevance,
      helpfulness: r.helpfulness,
      safety: r.safety,
      overall: r.overall,
      reasons: r.reasons as JudgeScoreEntry["scores"]["reasons"],
    },
    testCaseId: r.testCaseId ?? undefined,
    evalRunId: r.evalRunId ?? undefined,
  }));

  // Aggregates (over filtered set, excluding zero scores)
  const whereWithValid = where
    ? sql`${where} AND ${schema.judgeScores.overall} > 0`
    : sql`${schema.judgeScores.overall} > 0`;

  const [agg] = await db
    .select({
      total: count(),
      avgAccuracy: avg(schema.judgeScores.accuracy),
      avgRelevance: avg(schema.judgeScores.relevance),
      avgHelpfulness: avg(schema.judgeScores.helpfulness),
      avgSafety: avg(schema.judgeScores.safety),
      avgOverall: avg(schema.judgeScores.overall),
    })
    .from(schema.judgeScores)
    .where(whereWithValid);

  // Source counts (always over full dataset)
  const sourceCounts = await db
    .select({
      source: schema.judgeScores.source,
      cnt: count(),
    })
    .from(schema.judgeScores)
    .groupBy(schema.judgeScores.source);

  const countMap: Record<string, number> = {};
  for (const sc of sourceCounts) countMap[sc.source] = sc.cnt;

  return {
    entries,
    aggregates: {
      total: agg.total,
      avgAccuracy: Number(agg.avgAccuracy) || 0,
      avgRelevance: Number(agg.avgRelevance) || 0,
      avgHelpfulness: Number(agg.avgHelpfulness) || 0,
      avgSafety: Number(agg.avgSafety) || 0,
      avgOverall: Number(agg.avgOverall) || 0,
    },
    realtimeCount: countMap["realtime"] ?? 0,
    batchCount: countMap["batch"] ?? 0,
    reportCount: countMap["report"] ?? 0,
  };
}

// ── Eval Results ────────────────────────────────────────────

export async function insertEvalResult(result: EvalResult) {
  const db = getDb();
  await db.insert(schema.evalResults).values({
    evalRunId: result.evalRunId,
    timestamp: new Date(result.timestamp),
    testCaseId: result.testCaseId,
    category: result.category,
    question: result.question,
    response: result.response,
    toolsCalled: result.toolsCalled,
    mustIncludeResults: result.mustIncludeResults,
    mustNotIncludeResults: result.mustNotIncludeResults,
    patternResults: result.patternResults,
    toolCallResults: result.toolCallResults,
    patternScore: result.patternScore,
    judgeScores: result.judgeScores,
    overallPass: result.overallPass,
    durationMs: result.durationMs,
  });
}

export async function queryEvalResults(opts?: {
  runId?: string;
  limit?: number;
}) {
  const db = getDb();
  const limit = opts?.limit ?? 100;

  const where = opts?.runId ? eq(schema.evalResults.evalRunId, opts.runId) : undefined;

  const rows = await db
    .select()
    .from(schema.evalResults)
    .where(where)
    .orderBy(desc(schema.evalResults.timestamp))
    .limit(limit);

  // Map to EvalResult shape
  const results: EvalResult[] = rows.map((r) => ({
    evalRunId: r.evalRunId,
    timestamp: r.timestamp.toISOString(),
    testCaseId: r.testCaseId,
    category: r.category,
    question: r.question,
    response: r.response,
    toolsCalled: r.toolsCalled as string[],
    mustIncludeResults: r.mustIncludeResults as { pattern: string; passed: boolean }[],
    mustNotIncludeResults: r.mustNotIncludeResults as { pattern: string; passed: boolean }[],
    patternResults: r.patternResults as { pattern: string; passed: boolean }[],
    toolCallResults: r.toolCallResults as { pattern: string; passed: boolean }[],
    patternScore: r.patternScore,
    judgeScores: r.judgeScores as EvalResult["judgeScores"],
    overallPass: r.overallPass,
    durationMs: r.durationMs,
  }));

  // Build run summaries from ALL results (not just filtered)
  const allRows = opts?.runId
    ? await db.select().from(schema.evalResults).orderBy(desc(schema.evalResults.timestamp))
    : rows;

  const allResults: EvalResult[] = (opts?.runId ? allRows : rows).map((r) => ({
    evalRunId: r.evalRunId,
    timestamp: r.timestamp.toISOString(),
    testCaseId: r.testCaseId,
    category: r.category,
    question: r.question,
    response: r.response,
    toolsCalled: r.toolsCalled as string[],
    mustIncludeResults: r.mustIncludeResults as { pattern: string; passed: boolean }[],
    mustNotIncludeResults: r.mustNotIncludeResults as { pattern: string; passed: boolean }[],
    patternResults: r.patternResults as { pattern: string; passed: boolean }[],
    toolCallResults: r.toolCallResults as { pattern: string; passed: boolean }[],
    patternScore: r.patternScore,
    judgeScores: r.judgeScores as EvalResult["judgeScores"],
    overallPass: r.overallPass,
    durationMs: r.durationMs,
  }));

  // Group by evalRunId
  const runMap = new Map<string, EvalResult[]>();
  for (const r of allResults) {
    const arr = runMap.get(r.evalRunId) || [];
    arr.push(r);
    runMap.set(r.evalRunId, arr);
  }

  const avgN = (nums: number[]) => nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;

  const runs: EvalRunSummary[] = Array.from(runMap.entries())
    .map(([evalRunId, res]) => {
      const passed = res.filter((r) => r.overallPass).length;
      return {
        evalRunId,
        timestamp: res[0]?.timestamp ?? "",
        totalTests: res.length,
        passed,
        failed: res.length - passed,
        avgPatternScore: avgN(res.map((r) => r.patternScore)),
        avgJudgeScores: {
          accuracy: avgN(res.map((r) => r.judgeScores.accuracy)),
          relevance: avgN(res.map((r) => r.judgeScores.relevance)),
          helpfulness: avgN(res.map((r) => r.judgeScores.helpfulness)),
          safety: avgN(res.map((r) => r.judgeScores.safety)),
          overall: avgN(res.map((r) => r.judgeScores.overall)),
        },
        durationMs: res.reduce((s, r) => s + r.durationMs, 0),
      };
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return { runs, results };
}

// ── Feedback ────────────────────────────────────────────────

export async function insertFeedback(entry: {
  type: string;
  rating: string;
  messageIndex?: number;
  comment?: string;
  traceId?: string;
  timestamp?: string;
  userAgent?: string;
}) {
  const db = getDb();
  await db.insert(schema.feedback).values({
    type: entry.type,
    rating: entry.rating,
    messageIndex: entry.messageIndex ?? null,
    comment: entry.comment ?? null,
    traceId: entry.traceId ?? null,
    timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    userAgent: entry.userAgent ?? null,
  });
}

export async function queryFeedback() {
  const db = getDb();

  const rows = await db
    .select()
    .from(schema.feedback)
    .orderBy(desc(schema.feedback.timestamp))
    .limit(50);

  const entries = rows.map((r) => ({
    type: r.type,
    rating: r.rating,
    messageIndex: r.messageIndex,
    comment: r.comment,
    timestamp: r.timestamp.toISOString(),
    userAgent: r.userAgent,
  }));

  // Compute stats from all feedback (not just last 50)
  const statsRows = await db
    .select({
      type: schema.feedback.type,
      rating: schema.feedback.rating,
      cnt: count(),
    })
    .from(schema.feedback)
    .groupBy(schema.feedback.type, schema.feedback.rating);

  const stats = { chat: { up: 0, down: 0 }, report: { up: 0, down: 0 }, total: 0 };
  for (const row of statsRows) {
    const t = row.type as "chat" | "report";
    const r = row.rating as "up" | "down";
    if ((t === "chat" || t === "report") && (r === "up" || r === "down")) {
      stats[t][r] = row.cnt;
    }
    stats.total += row.cnt;
  }

  return { entries, stats };
}
