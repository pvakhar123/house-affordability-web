import { NextResponse } from "next/server";
import { isDbAvailable } from "@/lib/db";
import { purgeExpiredData } from "@/lib/db/queries";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const purged = await purgeExpiredData();
    return NextResponse.json({
      message: "Data retention purge completed",
      purged,
      retentionPolicy: {
        usageEvents: "90 days",
        errorLogs: "90 days",
        llmCosts: "90 days",
        feedback: "365 days",
        evalResults: "180 days",
        judgeScores: "180 days",
      },
    });
  } catch (err) {
    console.error("Purge error:", err);
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}
