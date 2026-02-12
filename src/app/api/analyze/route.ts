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
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Analysis failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
