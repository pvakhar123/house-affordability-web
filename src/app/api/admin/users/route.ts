import { NextRequest, NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { users, savedReports, userUsage } from "@/lib/db/schema";
import { eq, sql, and, ilike, or } from "drizzle-orm";
import { getMonthStart, getDayStart } from "@/lib/tier";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const db = getDb();
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const monthStart = getMonthStart();
    const dayStart = getDayStart();

    // Get users, optionally filtered by search query
    const where = q
      ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`))
      : undefined;

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        tier: users.tier,
        tierUpdatedAt: users.tierUpdatedAt,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(where)
      .orderBy(users.email)
      .limit(100);

    // Get usage data
    const analyzeUsage = await db
      .select({ userId: userUsage.userId, count: userUsage.count })
      .from(userUsage)
      .where(and(eq(userUsage.action, "analyze"), eq(userUsage.periodStart, monthStart)));

    const chatUsage = await db
      .select({ userId: userUsage.userId, count: userUsage.count })
      .from(userUsage)
      .where(and(eq(userUsage.action, "chat"), eq(userUsage.periodStart, dayStart)));

    // Saved report counts
    const reportCounts = await db
      .select({ userId: savedReports.userId, count: sql<number>`count(*)::int` })
      .from(savedReports)
      .groupBy(savedReports.userId);

    const analyzeMap = new Map(analyzeUsage.map((u) => [u.userId, u.count]));
    const chatMap = new Map(chatUsage.map((u) => [u.userId, u.count]));
    const reportMap = new Map(reportCounts.map((r) => [r.userId, r.count]));

    const data = allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      tier: u.tier,
      tierUpdatedAt: u.tierUpdatedAt?.toISOString() ?? null,
      hasStripe: !!u.stripeCustomerId,
      analysesThisMonth: analyzeMap.get(u.id) ?? 0,
      chatToday: chatMap.get(u.id) ?? 0,
      savedHomes: reportMap.get(u.id) ?? 0,
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("Admin users query error:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
