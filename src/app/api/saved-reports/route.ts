import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withTracking } from "@/lib/db/track";
import { getUserSavedReports, insertSavedReport } from "@/lib/db/queries";

export const GET = withTracking("/api/saved-reports", async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await getUserSavedReports(session.user.id);
  return NextResponse.json(reports);
});

export const POST = withTracking("/api/saved-reports", async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, report, userLocation } = body;

  if (!report) {
    return NextResponse.json({ error: "Missing report data" }, { status: 400 });
  }

  const saved = await insertSavedReport({
    userId: session.user.id,
    name: name || `Report – ${new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    })}`,
    report,
    userLocation,
  });

  return NextResponse.json(saved, { status: 201 });
});
