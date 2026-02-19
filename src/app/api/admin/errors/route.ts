import { NextRequest, NextResponse } from "next/server";
import { isDbAvailable } from "@/lib/db";
import { queryErrorLogs } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const since = req.nextUrl.searchParams.get("since");
    const route = req.nextUrl.searchParams.get("route");

    const data = await queryErrorLogs({
      since: since ?? undefined,
      route: route ?? undefined,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error logs query error:", err);
    return NextResponse.json({ error: "Failed to load error logs" }, { status: 500 });
  }
}
