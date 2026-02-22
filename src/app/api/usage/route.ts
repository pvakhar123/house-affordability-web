import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFullUsageStatus, type Tier } from "@/lib/tier";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({
      authenticated: false,
      tier: "free" as const,
      usage: null,
    });
  }

  const tier: Tier = (session.user.tier as Tier) ?? "free";
  const usage = await getFullUsageStatus(session.user.id, tier);

  return NextResponse.json({
    authenticated: true,
    tier,
    usage,
  });
}
