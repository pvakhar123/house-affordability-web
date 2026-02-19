import { pgTable, text, timestamp, real, jsonb, boolean, integer } from "drizzle-orm/pg-core";

// ── judge_scores ────────────────────────────────────────────
// Maps to: JudgeScoreEntry (src/lib/eval/types.ts)
// Sources: realtime (chat), batch (eval runner), report (report judge)

export const judgeScores = pgTable("judge_scores", {
  id: text("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull(), // "realtime" | "batch" | "report"
  question: text("question").notNull(),
  responsePreview: text("response_preview").notNull(),
  // Flattened scores for SQL AVG()
  accuracy: real("accuracy").notNull(),
  relevance: real("relevance").notNull(),
  helpfulness: real("helpfulness").notNull(),
  safety: real("safety").notNull(),
  overall: real("overall").notNull(),
  // Reasons as JSONB (never filtered on)
  reasons: jsonb("reasons").notNull().$type<Record<string, string>>(),
  testCaseId: text("test_case_id"),
  evalRunId: text("eval_run_id"),
});

// ── eval_results ────────────────────────────────────────────
// Maps to: EvalResult (src/lib/eval/types.ts)
// Source: eval-runner.ts runEvaluation()

export const evalResults = pgTable("eval_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  evalRunId: text("eval_run_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  testCaseId: text("test_case_id").notNull(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  response: text("response").notNull(),
  toolsCalled: jsonb("tools_called").notNull().$type<string[]>(),
  mustIncludeResults: jsonb("must_include_results").notNull().$type<{ pattern: string; passed: boolean }[]>(),
  mustNotIncludeResults: jsonb("must_not_include_results").notNull().$type<{ pattern: string; passed: boolean }[]>(),
  patternResults: jsonb("pattern_results").notNull().$type<{ pattern: string; passed: boolean }[]>(),
  toolCallResults: jsonb("tool_call_results").notNull().$type<{ pattern: string; passed: boolean }[]>(),
  patternScore: real("pattern_score").notNull(),
  judgeScores: jsonb("judge_scores").notNull().$type<{
    accuracy: number; relevance: number; helpfulness: number; safety: number; overall: number;
    reasons: Record<string, string>;
  }>(),
  overallPass: boolean("overall_pass").notNull(),
  durationMs: integer("duration_ms").notNull(),
});

// ── feedback ────────────────────────────────────────────────
// Maps to: feedback entry shape in src/app/api/feedback/route.ts

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(), // "chat" | "report"
  rating: text("rating").notNull(), // "up" | "down"
  messageIndex: integer("message_index"),
  comment: text("comment"),
  traceId: text("trace_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  userAgent: text("user_agent"),
});
