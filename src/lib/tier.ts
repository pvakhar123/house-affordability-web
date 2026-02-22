import { eq, and, count, sql } from "drizzle-orm";
import { getDb, isDbAvailable } from "./db";
import * as schema from "./db/schema";

// ── Types ────────────────────────────────────────────────────

export type Tier = "free" | "pro";

export interface UsageStatus {
  tier: Tier;
  analyze: { used: number; limit: number; remaining: number };
  chat: { used: number; limit: number; remaining: number };
  savedReports: { used: number; limit: number; remaining: number };
}

export interface UsageCheckResult {
  allowed: boolean;
  usageStatus: UsageStatus;
  upgradeReason?: string;
}

// ── Tier limits ──────────────────────────────────────────────

const LIMITS = {
  free: { analyze: 1, chat: 20, savedReports: 3 },
  pro: { analyze: 20, chat: Infinity, savedReports: Infinity },
} as const;

// ── Period helpers ────────────────────────────────────────────

export function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function getDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// ── Check usage ──────────────────────────────────────────────

export async function checkUsage(
  userId: string,
  tier: Tier,
  action: "analyze" | "chat" | "save_report",
): Promise<UsageCheckResult> {
  if (!isDbAvailable) return { allowed: true, usageStatus: buildStatus(tier, 0, 0, 0) };

  const db = getDb();
  const limits = LIMITS[tier];

  if (action === "save_report") {
    const [row] = await db
      .select({ cnt: count() })
      .from(schema.savedReports)
      .where(eq(schema.savedReports.userId, userId));
    const used = row.cnt;
    const limit = limits.savedReports;
    return {
      allowed: limit === Infinity || used < limit,
      usageStatus: buildStatus(tier, 0, 0, used),
      upgradeReason: limit !== Infinity && used >= limit
        ? `You've reached the ${limit} saved report limit on the Free plan.`
        : undefined,
    };
  }

  const periodStart = action === "analyze" ? getMonthStart() : getDayStart();
  const [row] = await db
    .select({ count: schema.userUsage.count })
    .from(schema.userUsage)
    .where(
      and(
        eq(schema.userUsage.userId, userId),
        eq(schema.userUsage.action, action),
        eq(schema.userUsage.periodStart, periodStart),
      ),
    );

  const used = row?.count ?? 0;
  const limit = action === "analyze" ? limits.analyze : limits.chat;

  return {
    allowed: limit === Infinity || used < limit,
    usageStatus: buildStatus(tier, action === "analyze" ? used : 0, action === "chat" ? used : 0, 0),
    upgradeReason: limit !== Infinity && used >= limit
      ? action === "analyze"
        ? `You've used your ${limit} report${limit === 1 ? "" : "s"} for this month.`
        : `You've used your ${limit} chat messages for today.`
      : undefined,
  };
}

// ── Increment usage ──────────────────────────────────────────

export async function incrementUsage(
  userId: string,
  action: "analyze" | "chat",
): Promise<void> {
  if (!isDbAvailable) return;

  const db = getDb();
  const periodStart = action === "analyze" ? getMonthStart() : getDayStart();

  await db
    .insert(schema.userUsage)
    .values({ userId, action, periodStart, count: 1 })
    .onConflictDoUpdate({
      target: [schema.userUsage.userId, schema.userUsage.action, schema.userUsage.periodStart],
      set: {
        count: sql`${schema.userUsage.count} + 1`,
        updatedAt: new Date(),
      },
    });
}

// ── Full status (for client display) ─────────────────────────

export async function getFullUsageStatus(userId: string, tier: Tier): Promise<UsageStatus> {
  if (!isDbAvailable) return buildStatus(tier, 0, 0, 0);

  const db = getDb();
  const limits = LIMITS[tier];

  const [analyzeRow, chatRow, reportsRow] = await Promise.all([
    db.select({ count: schema.userUsage.count }).from(schema.userUsage).where(
      and(eq(schema.userUsage.userId, userId), eq(schema.userUsage.action, "analyze"), eq(schema.userUsage.periodStart, getMonthStart())),
    ),
    db.select({ count: schema.userUsage.count }).from(schema.userUsage).where(
      and(eq(schema.userUsage.userId, userId), eq(schema.userUsage.action, "chat"), eq(schema.userUsage.periodStart, getDayStart())),
    ),
    db.select({ cnt: count() }).from(schema.savedReports).where(eq(schema.savedReports.userId, userId)),
  ]);

  return buildStatus(
    tier,
    analyzeRow[0]?.count ?? 0,
    chatRow[0]?.count ?? 0,
    reportsRow[0].cnt,
  );
}

// ── Internal helper ──────────────────────────────────────────

function buildStatus(tier: Tier, analyzeUsed: number, chatUsed: number, savedUsed: number): UsageStatus {
  const limits = LIMITS[tier];
  return {
    tier,
    analyze: { used: analyzeUsed, limit: limits.analyze, remaining: Math.max(0, limits.analyze - analyzeUsed) },
    chat: { used: chatUsed, limit: limits.chat, remaining: limits.chat === Infinity ? Infinity : Math.max(0, limits.chat - chatUsed) },
    savedReports: { used: savedUsed, limit: limits.savedReports, remaining: limits.savedReports === Infinity ? Infinity : Math.max(0, limits.savedReports - savedUsed) },
  };
}
