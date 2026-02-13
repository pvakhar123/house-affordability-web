import { NextResponse } from "next/server";
import { OrchestratorAgent } from "@/lib/agents/orchestrator";
import { config } from "@/lib/config";
import type { UserProfile } from "@/lib/types";

export const maxDuration = 300; // 5 minutes for agent processing

export async function POST(request: Request) {
  try {
    config.validate();

    const body = await request.json();
    const userProfile = body as UserProfile;

    // Basic validation
    if (!userProfile.annualGrossIncome || !userProfile.creditScore) {
      return NextResponse.json(
        { error: "Annual gross income and credit score are required." },
        { status: 400 }
      );
    }

    const orchestrator = new OrchestratorAgent();
    const report = await orchestrator.run(userProfile);

    return NextResponse.json(report);
  } catch (error) {
    console.error("Analysis error:", error);

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

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
