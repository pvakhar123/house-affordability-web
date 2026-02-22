import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withTracking } from "@/lib/db/track";
import { deleteSavedReport, renameSavedReport, getSavedReportById } from "@/lib/db/queries";

export const GET = withTracking("/api/saved-reports/[id]", async (_request, ...args) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { params } = args[0] as { params: Promise<{ id: string }> };
  const { id } = await params;

  const saved = await getSavedReportById(id, session.user.id);
  if (!saved) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    report: saved.report,
    userLocation: saved.userLocation,
  });
});

export const DELETE = withTracking("/api/saved-reports/[id]", async (_request, ...args) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { params } = args[0] as { params: Promise<{ id: string }> };
  const { id } = await params;

  await deleteSavedReport(id, session.user.id);
  return NextResponse.json({ ok: true });
});

export const PATCH = withTracking("/api/saved-reports/[id]", async (request, ...args) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { params } = args[0] as { params: Promise<{ id: string }> };
  const { id } = await params;
  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await renameSavedReport(id, session.user.id, name.trim());
  return NextResponse.json({ ok: true });
});
