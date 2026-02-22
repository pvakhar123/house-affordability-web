import { NextRequest, NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { users, savedReports, userUsage, tierChangeLog } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getMonthStart, getDayStart } from "@/lib/tier";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const db = getDb();
    const monthStart = getMonthStart();
    const dayStart = getDayStart();

    // Get all users with their tier info
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        tier: users.tier,
        tierUpdatedAt: users.tierUpdatedAt,
      })
      .from(users)
      .orderBy(users.email);

    // Get usage data for all users
    const analyzeUsage = await db
      .select({ userId: userUsage.userId, count: userUsage.count })
      .from(userUsage)
      .where(and(eq(userUsage.action, "analyze"), eq(userUsage.periodStart, monthStart)));

    const chatUsage = await db
      .select({ userId: userUsage.userId, count: userUsage.count })
      .from(userUsage)
      .where(and(eq(userUsage.action, "chat"), eq(userUsage.periodStart, dayStart)));

    // Get saved report counts per user
    const reportCounts = await db
      .select({ userId: savedReports.userId, count: sql<number>`count(*)::int` })
      .from(savedReports)
      .groupBy(savedReports.userId);

    // Build lookup maps
    const analyzeMap = new Map(analyzeUsage.map((u) => [u.userId, u.count]));
    const chatMap = new Map(chatUsage.map((u) => [u.userId, u.count]));
    const reportMap = new Map(reportCounts.map((r) => [r.userId, r.count]));

    const data = allUsers.map((u) => ({
      ...u,
      reportsThisMonth: analyzeMap.get(u.id) ?? 0,
      chatToday: chatMap.get(u.id) ?? 0,
      savedReports: reportMap.get(u.id) ?? 0,
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("Subscriptions query error:", err);
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const session = await auth();
    const adminId = session?.user?.id ?? "unknown";
    const { userId, tier } = await req.json();

    if (!userId || !["free", "pro"].includes(tier)) {
      return NextResponse.json({ error: "Invalid userId or tier" }, { status: 400 });
    }

    const db = getDb();

    // Get current tier
    const [current] = await db.select({ tier: users.tier }).from(users).where(eq(users.id, userId));
    if (!current) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (current.tier === tier) {
      return NextResponse.json({ message: "No change needed" });
    }

    // Update tier
    await db
      .update(users)
      .set({ tier, tierUpdatedAt: new Date(), tierUpdatedBy: adminId })
      .where(eq(users.id, userId));

    // Log the change
    await db.insert(tierChangeLog).values({
      userId,
      previousTier: current.tier,
      newTier: tier,
      reason: "admin_manual",
      changedBy: adminId,
    });

    return NextResponse.json({ success: true, previousTier: current.tier, newTier: tier });
  } catch (err) {
    console.error("Tier update error:", err);
    return NextResponse.json({ error: "Failed to update tier" }, { status: 500 });
  }
}
