import { NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";
import { count, avg, desc, eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

export async function GET() {
  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const db = getDb();

    const [
      [usageTotal],
      [feedbackTotal],
      [qualityAvg],
      recentErrors,
      [analyzeCount],
      [chatCount],
      [emailCount],
    ] = await Promise.all([
      db.select({ cnt: count() }).from(schema.usageEvents),
      db.select({ cnt: count() }).from(schema.feedback),
      db.select({ avgOverall: avg(schema.judgeScores.overall) }).from(schema.judgeScores),
      db.select({
        id: schema.errorLogs.id,
        route: schema.errorLogs.route,
        message: schema.errorLogs.message,
        timestamp: schema.errorLogs.timestamp,
      }).from(schema.errorLogs).orderBy(desc(schema.errorLogs.timestamp)).limit(5),
      db.select({ cnt: count() }).from(schema.usageEvents).where(eq(schema.usageEvents.route, "/api/analyze")),
      db.select({ cnt: count() }).from(schema.usageEvents).where(eq(schema.usageEvents.route, "/api/chat")),
      db.select({ cnt: count() }).from(schema.usageEvents).where(eq(schema.usageEvents.route, "/api/email-report")),
    ]);

    return NextResponse.json({
      totalApiCalls: usageTotal.cnt,
      totalFeedback: feedbackTotal.cnt,
      avgQualityScore: Number(qualityAvg.avgOverall) || 0,
      reportsGenerated: analyzeCount.cnt,
      chatMessages: chatCount.cnt,
      emailsSent: emailCount.cnt,
      recentErrors: recentErrors.map((e) => ({
        id: e.id,
        route: e.route,
        message: e.message,
        timestamp: e.timestamp.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Overview stats error:", err);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
