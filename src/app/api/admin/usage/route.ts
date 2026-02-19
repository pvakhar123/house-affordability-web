import { NextRequest, NextResponse } from "next/server";
import { isDbAvailable } from "@/lib/db";
import { queryUsageStats } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const since = req.nextUrl.searchParams.get("since");
    const route = req.nextUrl.searchParams.get("route");

    const data = await queryUsageStats({
      since: since ?? undefined,
      route: route ?? undefined,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Usage stats error:", err);
    return NextResponse.json({ error: "Failed to load usage stats" }, { status: 500 });
  }
}
