import { pgTable, text, timestamp, real, jsonb, boolean, integer, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

// ── Auth: users ─────────────────────────────────────────────
// Required by @auth/drizzle-adapter for NextAuth v5

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Tier system
  tier: text("tier").notNull().default("free"),
  tierUpdatedAt: timestamp("tier_updated_at", { withTimezone: true }),
  tierUpdatedBy: text("tier_updated_by"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
});

// ── Auth: accounts ──────────────────────────────────────────
// OAuth provider accounts linked to users

export const accounts = pgTable("accounts", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (account) => [
  primaryKey({ columns: [account.provider, account.providerAccountId] }),
]);

// ── saved_reports ───────────────────────────────────────────
// User-saved analysis reports (DB persistence for authenticated users)

export const savedReports = pgTable("saved_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  report: jsonb("report").notNull(),
  userLocation: text("user_location"),
  chatHistory: jsonb("chat_history"),
});

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

// ── usage_events ────────────────────────────────────────────
// Tracks every API call for usage analytics

export const usageEvents = pgTable("usage_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  route: text("route").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// ── llm_costs ──────────────────────────────────────────────
// Per-LLM-call token usage and computed dollar cost

export const llmCosts = pgTable("llm_costs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  traceName: text("trace_name").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cacheCreationTokens: integer("cache_creation_tokens").notNull().default(0),
  cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
  totalCost: real("total_cost").notNull(), // USD
});

// ── error_logs ──────────────────────────────────────────────
// Persists API route errors for operational visibility

export const errorLogs = pgTable("error_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  route: text("route").notNull(),
  method: text("method").notNull(),
  message: text("message").notNull(),
  stack: text("stack"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// ── user_usage ──────────────────────────────────────────────
// Per-user usage counters for tier enforcement (one row per user/action/period)

export const userUsage = pgTable("user_usage", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),           // "analyze" | "chat"
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_usage_unique_idx").on(table.userId, table.action, table.periodStart),
]);

// ── tier_change_log ─────────────────────────────────────────
// Audit trail for tier changes (admin upgrades, future Stripe webhooks)

export const tierChangeLog = pgTable("tier_change_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  previousTier: text("previous_tier").notNull(),
  newTier: text("new_tier").notNull(),
  reason: text("reason").notNull(),            // "admin_manual" | "stripe_webhook" | "system_downgrade"
  changedBy: text("changed_by"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});
