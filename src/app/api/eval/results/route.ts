import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { EvalResult, EvalRunSummary } from "@/lib/eval/types";

const RESULTS_PATH = join(process.cwd(), "data", "eval-results.jsonl");

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

export async function GET(req: NextRequest) {
  try {
    let raw: string;
    try {
      raw = await readFile(RESULTS_PATH, "utf-8");
    } catch {
      return NextResponse.json({ runs: [], results: [] });
    }

    const lines = raw.trim().split("\n").filter(Boolean);
    const allResults: EvalResult[] = lines.map((l) => JSON.parse(l));

    // Optional filter by runId
    const runId = req.nextUrl.searchParams.get("runId");
    const filtered = runId ? allResults.filter((r) => r.evalRunId === runId) : allResults;

    // Group by evalRunId to build run summaries
    const runMap = new Map<string, EvalResult[]>();
    for (const r of allResults) {
      const arr = runMap.get(r.evalRunId) || [];
      arr.push(r);
      runMap.set(r.evalRunId, arr);
    }

    const runs: EvalRunSummary[] = Array.from(runMap.entries())
      .map(([evalRunId, results]) => {
        const passed = results.filter((r) => r.overallPass).length;
        return {
          evalRunId,
          timestamp: results[0]?.timestamp ?? "",
          totalTests: results.length,
          passed,
          failed: results.length - passed,
          avgPatternScore: avg(results.map((r) => r.patternScore)),
          avgJudgeScores: {
            accuracy: avg(results.map((r) => r.judgeScores.accuracy)),
            relevance: avg(results.map((r) => r.judgeScores.relevance)),
            helpfulness: avg(results.map((r) => r.judgeScores.helpfulness)),
            safety: avg(results.map((r) => r.judgeScores.safety)),
            overall: avg(results.map((r) => r.judgeScores.overall)),
          },
          durationMs: results.reduce((s, r) => s + r.durationMs, 0),
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Return last 100 results
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100", 10);
    return NextResponse.json({
      runs,
      results: filtered.slice(-limit).reverse(),
    });
  } catch (err) {
    console.error("Eval results read error:", err);
    return NextResponse.json({ error: "Failed to read eval results" }, { status: 500 });
  }
}
