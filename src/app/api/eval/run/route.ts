import { NextRequest, NextResponse } from "next/server";
import { runEvaluation } from "@/lib/eval/eval-runner";

export const maxDuration = 300; // 5 minutes for full eval run

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { testCaseIds, skipJudge } = body as {
      testCaseIds?: string[];
      skipJudge?: boolean;
    };

    // Derive base URL from the request
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    const baseUrl = `${proto}://${host}`;

    const summary = await runEvaluation({ testCaseIds, skipJudge, baseUrl });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("Eval run error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Eval run failed" },
      { status: 500 },
    );
  }
}
