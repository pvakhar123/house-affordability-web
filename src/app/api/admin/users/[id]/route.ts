import { NextRequest, NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import {
  users,
  savedReports,
  userUsage,
  tierChangeLog,
  feedback,
  supportTickets,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getMonthStart, getDayStart } from "@/lib/tier";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id: userId } = await params;
    const db = getDb();
    const monthStart = getMonthStart();
    const dayStart = getDayStart();

    // 1. User profile
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parallel fetch all related data
    const [
      analyzeUsageRows,
      chatUsageRows,
      reportRows,
      tierHistory,
      feedbackRows,
      ticketRows,
    ] = await Promise.all([
      // Usage: analyses this month
      db
        .select({ count: userUsage.count })
        .from(userUsage)
        .where(
          and(
            eq(userUsage.userId, userId),
            eq(userUsage.action, "analyze"),
            eq(userUsage.periodStart, monthStart),
          ),
        ),
      // Usage: chat today
      db
        .select({ count: userUsage.count })
        .from(userUsage)
        .where(
          and(
            eq(userUsage.userId, userId),
            eq(userUsage.action, "chat"),
            eq(userUsage.periodStart, dayStart),
          ),
        ),
      // Saved reports (just metadata)
      db
        .select({
          id: savedReports.id,
          name: savedReports.name,
          savedAt: savedReports.savedAt,
          userLocation: savedReports.userLocation,
        })
        .from(savedReports)
        .where(eq(savedReports.userId, userId))
        .orderBy(desc(savedReports.savedAt)),
      // Tier change history
      db
        .select()
        .from(tierChangeLog)
        .where(eq(tierChangeLog.userId, userId))
        .orderBy(desc(tierChangeLog.timestamp)),
      // Feedback
      db
        .select({
          id: feedback.id,
          type: feedback.type,
          rating: feedback.rating,
          comment: feedback.comment,
          timestamp: feedback.timestamp,
        })
        .from(feedback)
        .where(eq(feedback.userId, userId))
        .orderBy(desc(feedback.timestamp))
        .limit(20),
      // Support tickets
      db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.userId, userId))
        .orderBy(desc(supportTickets.createdAt)),
    ]);

    // Build activity timeline from all sources
    type TimelineEntry = { type: string; label: string; timestamp: string; meta?: Record<string, unknown> };
    const timeline: TimelineEntry[] = [];

    for (const r of reportRows) {
      timeline.push({
        type: "saved_home",
        label: `Saved home analysis: ${r.name}`,
        timestamp: r.savedAt.toISOString(),
        meta: { location: r.userLocation },
      });
    }

    for (const t of tierHistory) {
      timeline.push({
        type: "tier_change",
        label: `Tier changed: ${t.previousTier} \u2192 ${t.newTier} (${t.reason})`,
        timestamp: t.timestamp.toISOString(),
        meta: { changedBy: t.changedBy },
      });
    }

    for (const f of feedbackRows) {
      timeline.push({
        type: "feedback",
        label: `Feedback: ${f.rating === "up" ? "\ud83d\udc4d" : "\ud83d\udc4e"} on ${f.type}${f.comment ? ` \u2014 "${f.comment}"` : ""}`,
        timestamp: f.timestamp.toISOString(),
      });
    }

    for (const t of ticketRows) {
      timeline.push({
        type: "ticket",
        label: `Support ticket: ${t.subject}`,
        timestamp: t.createdAt.toISOString(),
        meta: { status: t.status },
      });
    }

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        tier: user.tier,
        tierUpdatedAt: user.tierUpdatedAt?.toISOString() ?? null,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      },
      usage: {
        analysesThisMonth: analyzeUsageRows[0]?.count ?? 0,
        chatToday: chatUsageRows[0]?.count ?? 0,
        savedHomes: reportRows.length,
      },
      savedHomes: reportRows.map((r) => ({
        id: r.id,
        name: r.name,
        savedAt: r.savedAt.toISOString(),
        location: r.userLocation,
      })),
      tierHistory: tierHistory.map((t) => ({
        id: t.id,
        previousTier: t.previousTier,
        newTier: t.newTier,
        reason: t.reason,
        changedBy: t.changedBy,
        timestamp: t.timestamp.toISOString(),
      })),
      feedback: feedbackRows.map((f) => ({
        id: f.id,
        type: f.type,
        rating: f.rating,
        comment: f.comment,
        timestamp: f.timestamp.toISOString(),
      })),
      tickets: ticketRows.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        message: t.message,
        adminNotes: t.adminNotes,
        createdAt: t.createdAt.toISOString(),
        resolvedAt: t.resolvedAt?.toISOString() ?? null,
      })),
      timeline: timeline.slice(0, 50),
    });
  } catch (err) {
    console.error("Admin user detail error:", err);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}
