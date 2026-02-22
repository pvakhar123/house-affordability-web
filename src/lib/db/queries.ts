import { desc, eq, gte, avg, count, sql, and } from "drizzle-orm";
import { getDb } from "./index";
import * as schema from "./schema";
import type { JudgeScoreEntry, EvalResult, EvalRunSummary } from "@/lib/eval/types";
import type { FinalReport } from "@/lib/types";

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

// ── Usage Events ────────────────────────────────────────────

export async function insertUsageEvent(event: {
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(schema.usageEvents).values({
    route: event.route,
    method: event.method,
    statusCode: event.statusCode,
    durationMs: event.durationMs,
    metadata: event.metadata ?? null,
  });
}

export async function queryUsageStats(opts?: {
  since?: string;
  route?: string;
  limit?: number;
}) {
  const db = getDb();
  const limit = opts?.limit ?? 100;

  // Build conditions
  const conditions = [];
  if (opts?.route) conditions.push(eq(schema.usageEvents.route, opts.route));
  if (opts?.since) conditions.push(gte(schema.usageEvents.timestamp, new Date(opts.since)));

  const where = conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : sql`${conditions[0]} AND ${conditions[1]}`
    : undefined;

  // Recent events
  const events = await db
    .select()
    .from(schema.usageEvents)
    .where(where)
    .orderBy(desc(schema.usageEvents.timestamp))
    .limit(limit);

  // By route
  const byRoute = await db
    .select({
      route: schema.usageEvents.route,
      count: count(),
    })
    .from(schema.usageEvents)
    .where(where)
    .groupBy(schema.usageEvents.route)
    .orderBy(desc(count()));

  // By status code
  const byStatus = await db
    .select({
      statusCode: schema.usageEvents.statusCode,
      count: count(),
    })
    .from(schema.usageEvents)
    .where(where)
    .groupBy(schema.usageEvents.statusCode);

  // By day (time series)
  const byDay = await db
    .select({
      day: sql<string>`DATE_TRUNC('day', ${schema.usageEvents.timestamp})::text`,
      count: count(),
    })
    .from(schema.usageEvents)
    .where(where)
    .groupBy(sql`DATE_TRUNC('day', ${schema.usageEvents.timestamp})`)
    .orderBy(sql`DATE_TRUNC('day', ${schema.usageEvents.timestamp})`);

  // Totals
  const [totals] = await db
    .select({
      total: count(),
      avgDurationMs: avg(schema.usageEvents.durationMs),
    })
    .from(schema.usageEvents)
    .where(where);

  return {
    events: events.map((e) => ({
      id: e.id,
      route: e.route,
      method: e.method,
      statusCode: e.statusCode,
      durationMs: e.durationMs,
      timestamp: e.timestamp.toISOString(),
      metadata: e.metadata,
    })),
    byRoute: byRoute.map((r) => ({ route: r.route, count: r.count })),
    byStatus: byStatus.map((s) => ({ statusCode: s.statusCode, count: s.count })),
    byDay: byDay.map((d) => ({ day: d.day, count: d.count })),
    totals: {
      total: totals.total,
      avgDurationMs: Number(totals.avgDurationMs) || 0,
    },
  };
}

// ── Error Logs ──────────────────────────────────────────────

export async function insertErrorLog(entry: {
  route: string;
  method: string;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(schema.errorLogs).values({
    route: entry.route,
    method: entry.method,
    message: entry.message,
    stack: entry.stack ?? null,
    metadata: entry.metadata ?? null,
  });
}

export async function queryErrorLogs(opts?: {
  since?: string;
  route?: string;
  limit?: number;
}) {
  const db = getDb();
  const limit = opts?.limit ?? 50;

  const conditions = [];
  if (opts?.route) conditions.push(eq(schema.errorLogs.route, opts.route));
  if (opts?.since) conditions.push(gte(schema.errorLogs.timestamp, new Date(opts.since)));

  const where = conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : sql`${conditions[0]} AND ${conditions[1]}`
    : undefined;

  const errors = await db
    .select()
    .from(schema.errorLogs)
    .where(where)
    .orderBy(desc(schema.errorLogs.timestamp))
    .limit(limit);

  const byRoute = await db
    .select({
      route: schema.errorLogs.route,
      count: count(),
    })
    .from(schema.errorLogs)
    .where(where)
    .groupBy(schema.errorLogs.route)
    .orderBy(desc(count()));

  const [totals] = await db
    .select({ total: count() })
    .from(schema.errorLogs)
    .where(where);

  return {
    errors: errors.map((e) => ({
      id: e.id,
      route: e.route,
      method: e.method,
      message: e.message,
      stack: e.stack,
      timestamp: e.timestamp.toISOString(),
      metadata: e.metadata,
    })),
    byRoute: byRoute.map((r) => ({ route: r.route, count: r.count })),
    total: totals.total,
  };
}

// ── LLM Costs ──────────────────────────────────────────────

export async function insertLlmCost(entry: {
  traceName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalCost: number;
}) {
  const db = getDb();
  await db.insert(schema.llmCosts).values({
    traceName: entry.traceName,
    model: entry.model,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    cacheCreationTokens: entry.cacheCreationTokens,
    cacheReadTokens: entry.cacheReadTokens,
    totalCost: entry.totalCost,
  });
}

export async function queryLlmCosts(opts?: { since?: string }) {
  const db = getDb();

  const where = opts?.since
    ? gte(schema.llmCosts.timestamp, new Date(opts.since))
    : undefined;

  // Totals
  const [totals] = await db
    .select({
      callCount: count(),
      totalCost: sql<string>`COALESCE(SUM(${schema.llmCosts.totalCost}), 0)`,
      totalInputTokens: sql<string>`COALESCE(SUM(${schema.llmCosts.inputTokens}), 0)`,
      totalOutputTokens: sql<string>`COALESCE(SUM(${schema.llmCosts.outputTokens}), 0)`,
    })
    .from(schema.llmCosts)
    .where(where);

  // By model
  const byModel = await db
    .select({
      model: schema.llmCosts.model,
      callCount: count(),
      cost: sql<string>`COALESCE(SUM(${schema.llmCosts.totalCost}), 0)`,
    })
    .from(schema.llmCosts)
    .where(where)
    .groupBy(schema.llmCosts.model)
    .orderBy(desc(sql`SUM(${schema.llmCosts.totalCost})`));

  // By day
  const byDay = await db
    .select({
      day: sql<string>`DATE_TRUNC('day', ${schema.llmCosts.timestamp})::text`,
      cost: sql<string>`COALESCE(SUM(${schema.llmCosts.totalCost}), 0)`,
      callCount: count(),
    })
    .from(schema.llmCosts)
    .where(where)
    .groupBy(sql`DATE_TRUNC('day', ${schema.llmCosts.timestamp})`)
    .orderBy(sql`DATE_TRUNC('day', ${schema.llmCosts.timestamp})`);

  // By trace name (endpoint)
  const byTrace = await db
    .select({
      traceName: schema.llmCosts.traceName,
      callCount: count(),
      cost: sql<string>`COALESCE(SUM(${schema.llmCosts.totalCost}), 0)`,
    })
    .from(schema.llmCosts)
    .where(where)
    .groupBy(schema.llmCosts.traceName)
    .orderBy(desc(sql`SUM(${schema.llmCosts.totalCost})`));

  // Recent calls
  const recentCalls = await db
    .select()
    .from(schema.llmCosts)
    .where(where)
    .orderBy(desc(schema.llmCosts.timestamp))
    .limit(50);

  return {
    totals: {
      callCount: totals.callCount,
      totalCost: Number(totals.totalCost),
      totalInputTokens: Number(totals.totalInputTokens),
      totalOutputTokens: Number(totals.totalOutputTokens),
    },
    byModel: byModel.map((r) => ({ model: r.model, callCount: r.callCount, cost: Number(r.cost) })),
    byDay: byDay.map((r) => ({ day: r.day, cost: Number(r.cost), callCount: r.callCount })),
    byTrace: byTrace.map((r) => ({ traceName: r.traceName, callCount: r.callCount, cost: Number(r.cost) })),
    recentCalls: recentCalls.map((r) => ({
      id: r.id,
      timestamp: r.timestamp.toISOString(),
      traceName: r.traceName,
      model: r.model,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      cacheCreationTokens: r.cacheCreationTokens,
      cacheReadTokens: r.cacheReadTokens,
      totalCost: r.totalCost,
    })),
  };
}

// ── Saved Reports ────────────────────────────────────────────

export async function getUserSavedReports(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.savedReports)
    .where(eq(schema.savedReports.userId, userId))
    .orderBy(desc(schema.savedReports.savedAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    savedAt: r.savedAt.toISOString(),
    report: r.report as FinalReport,
    userLocation: r.userLocation,
  }));
}

export async function getSavedReportById(id: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.savedReports)
    .where(and(eq(schema.savedReports.id, id), eq(schema.savedReports.userId, userId)));

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    savedAt: row.savedAt.toISOString(),
    report: row.report as FinalReport,
    userLocation: row.userLocation,
  };
}

export async function insertSavedReport(entry: {
  userId: string;
  name: string;
  report: FinalReport;
  userLocation?: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(schema.savedReports)
    .values({
      userId: entry.userId,
      name: entry.name,
      report: entry.report,
      userLocation: entry.userLocation ?? null,
    })
    .returning();
  return {
    id: row.id,
    name: row.name,
    savedAt: row.savedAt.toISOString(),
    userLocation: row.userLocation,
  };
}

export async function deleteSavedReport(id: string, userId: string) {
  const db = getDb();
  await db
    .delete(schema.savedReports)
    .where(and(eq(schema.savedReports.id, id), eq(schema.savedReports.userId, userId)));
}

export async function renameSavedReport(id: string, userId: string, name: string) {
  const db = getDb();
  await db
    .update(schema.savedReports)
    .set({ name })
    .where(and(eq(schema.savedReports.id, id), eq(schema.savedReports.userId, userId)));
}

// ── Data Retention — Automated Purge ─────────────────────────
// Retention periods (SOC 2 compliance):
//   usage_events, error_logs, llm_costs: 90 days
//   feedback: 365 days
//   eval_results, judge_scores: 180 days

export async function purgeExpiredData() {
  const db = getDb();
  const now = new Date();

  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

  const results = await Promise.all([
    db.delete(schema.usageEvents).where(
      sql`${schema.usageEvents.timestamp} < ${daysAgo(90)}`
    ),
    db.delete(schema.errorLogs).where(
      sql`${schema.errorLogs.timestamp} < ${daysAgo(90)}`
    ),
    db.delete(schema.llmCosts).where(
      sql`${schema.llmCosts.timestamp} < ${daysAgo(90)}`
    ),
    db.delete(schema.feedback).where(
      sql`${schema.feedback.timestamp} < ${daysAgo(365)}`
    ),
    db.delete(schema.evalResults).where(
      sql`${schema.evalResults.timestamp} < ${daysAgo(180)}`
    ),
    db.delete(schema.judgeScores).where(
      sql`${schema.judgeScores.timestamp} < ${daysAgo(180)}`
    ),
  ]);

  return {
    usageEvents: results[0].rowCount ?? 0,
    errorLogs: results[1].rowCount ?? 0,
    llmCosts: results[2].rowCount ?? 0,
    feedback: results[3].rowCount ?? 0,
    evalResults: results[4].rowCount ?? 0,
    judgeScores: results[5].rowCount ?? 0,
  };
}
