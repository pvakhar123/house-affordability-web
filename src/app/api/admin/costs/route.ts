import { NextRequest, NextResponse } from "next/server";
import { isDbAvailable } from "@/lib/db";
import { queryLlmCosts } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const since = req.nextUrl.searchParams.get("since");
    const data = await queryLlmCosts({
      since: since ?? undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("LLM costs error:", err);
    return NextResponse.json({ error: "Failed to load LLM costs" }, { status: 500 });
  }
}
