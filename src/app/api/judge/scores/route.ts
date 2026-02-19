import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { JudgeScoreEntry } from "@/lib/eval/types";

const SCORES_PATH = join(process.cwd(), "data", "judge-scores.jsonl");

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

export async function GET(req: NextRequest) {
  try {
    let raw: string;
    try {
      raw = await readFile(SCORES_PATH, "utf-8");
    } catch {
      return NextResponse.json({
        entries: [],
        aggregates: { total: 0, avgAccuracy: 0, avgRelevance: 0, avgHelpfulness: 0, avgSafety: 0, avgOverall: 0 },
        realtimeCount: 0,
        batchCount: 0,
      });
    }

    const lines = raw.trim().split("\n").filter(Boolean);
    const allEntries: JudgeScoreEntry[] = lines.map((l) => JSON.parse(l));

    // Filters
    const source = req.nextUrl.searchParams.get("source") as "realtime" | "batch" | null;
    const since = req.nextUrl.searchParams.get("since");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100", 10);

    let filtered = allEntries;
    if (source) filtered = filtered.filter((e) => e.source === source);
    if (since) filtered = filtered.filter((e) => e.timestamp >= since);

    const realtimeCount = allEntries.filter((e) => e.source === "realtime").length;
    const batchCount = allEntries.filter((e) => e.source === "batch").length;

    // Aggregates over filtered set
    const validScores = filtered.filter((e) => e.scores.overall > 0);
    const aggregates = {
      total: filtered.length,
      avgAccuracy: avg(validScores.map((e) => e.scores.accuracy)),
      avgRelevance: avg(validScores.map((e) => e.scores.relevance)),
      avgHelpfulness: avg(validScores.map((e) => e.scores.helpfulness)),
      avgSafety: avg(validScores.map((e) => e.scores.safety)),
      avgOverall: avg(validScores.map((e) => e.scores.overall)),
    };

    return NextResponse.json({
      entries: filtered.slice(-limit).reverse(),
      aggregates,
      realtimeCount,
      batchCount,
    });
  } catch (err) {
    console.error("Judge scores read error:", err);
    return NextResponse.json({ error: "Failed to read judge scores" }, { status: 500 });
  }
}
