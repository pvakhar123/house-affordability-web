import { NextResponse } from "next/server";
import { OrchestratorAgent } from "@/lib/agents/orchestrator";
import type { StreamPhase } from "@/lib/agents/orchestrator";
import { config } from "@/lib/config";
import type { UserProfile } from "@/lib/types";
import { flushLangfuse } from "@/lib/langfuse";
import { getPostHogServer, flushPostHog } from "@/lib/posthog";
import { logApiError, logUsageEvent } from "@/lib/db/track";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { analyzeInputSchema } from "@/lib/schemas";
import { auth } from "@/lib/auth";
import { checkUsage, incrementUsage, type Tier } from "@/lib/tier";

export const maxDuration = 300; // 5 minutes for agent processing

export async function POST(request: Request) {
  // Rate limit: 10 reports per IP per hour
  const ip = getClientIp(request);
  const rl = checkRateLimit(`analyze:${ip}`, 10, 3600_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  // Tier-based usage gating
  const session = await auth();
  const userId = session?.user?.id;
  const tier: Tier = (session?.user?.tier as Tier) ?? "free";

  if (userId) {
    const usage = await checkUsage(userId, tier, "analyze");
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "limit_reached", message: usage.upgradeReason, usageStatus: usage.usageStatus },
        { status: 403 },
      );
    }
  } else {
    // Anonymous users: 1 report per day per IP
    const anonRl = checkRateLimit(`analyze-anon:${ip}`, 1, 86_400_000);
    if (!anonRl.allowed) {
      return NextResponse.json(
        { error: "limit_reached", message: "Sign in to get 1 free report per month, or upgrade to Pro for 20.", requiresAuth: true },
        { status: 403 },
      );
    }
  }

  try {
    config.validate();

    const body = await request.json();
    const parsed = analyzeInputSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const userProfile = parsed.data as UserProfile;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const streamStart = Date.now();
        const send = (event: StreamPhase) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        try {
          const orchestrator = new OrchestratorAgent();
          const report = await orchestrator.run(userProfile, send);
          await flushLangfuse();

          // Run report judge before closing stream to keep Vercel function alive.
          // Scores persist to DB directly — no need to send back via stream.
          if (process.env.ENABLE_REALTIME_JUDGE === "true") {
            try {
              const { judgeReportAsync } = await import("@/lib/eval/judge");
              await judgeReportAsync({ report, traceId: report.traceId });
            } catch (err) {
              console.warn("[report-judge]", err);
            }
          }

          logUsageEvent("/api/analyze", "POST", 200, Date.now() - streamStart, { location: userProfile.targetLocation });
          const ph = getPostHogServer();
          ph.capture({
            distinctId: userId || `anon_${ip}`,
            event: "analysis_completed_server",
            properties: {
              location: userProfile.targetLocation,
              tier,
              duration_ms: Date.now() - streamStart,
            },
          });
          if (userId) {
            incrementUsage(userId, "analyze").catch((err) => console.error("[tier] increment error:", err));
          }
          await flushPostHog();
          controller.close();
        } catch (error) {
          console.error("Analysis error:", error);
          logApiError("/api/analyze", "POST", error);
          logUsageEvent("/api/analyze", "POST", 500, Date.now() - streamStart);
          const msg = error instanceof Error ? error.message : String(error);
          let userMessage = "Analysis failed. Please try again.";

          if (msg.includes("overloaded") || msg.includes("529")) {
            userMessage = "Our AI service is temporarily busy. Please wait a moment and try again.";
          } else if (msg.includes("rate_limit") || msg.includes("429")) {
            userMessage = "Too many requests. Please wait a minute and try again.";
          } else if (msg.includes("authentication") || msg.includes("401")) {
            userMessage = "Service configuration error. Please contact support.";
          } else if (msg.includes("timed out") || msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
            userMessage = "The analysis took too long. Please try again — it usually works on the second attempt.";
          } else if (msg.includes("ECONNRESET") || msg.includes("network")) {
            userMessage = "A network error occurred. Please check your connection and try again.";
          }

          controller.enqueue(encoder.encode(JSON.stringify({ phase: "error", error: userMessage }) + "\n"));
          await flushLangfuse();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Request error:", error);
    logApiError("/api/analyze", "POST", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
