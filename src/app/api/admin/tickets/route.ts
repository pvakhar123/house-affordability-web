import { NextRequest, NextResponse } from "next/server";
import { isDbAvailable, getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { supportTickets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt))
      .limit(200);

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        subject: r.subject,
        message: r.message,
        status: r.status,
        userId: r.userId,
        adminNotes: r.adminNotes,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
    );
  } catch (err) {
    console.error("Admin tickets query error:", err);
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!isDbAvailable) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { ticketId, status, adminNotes } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });
    }

    const db = getDb();
    const updates: Record<string, unknown> = {};

    if (status === "resolved") {
      updates.status = "resolved";
      updates.resolvedAt = new Date();
    } else if (status === "open") {
      updates.status = "open";
      updates.resolvedAt = null;
    }

    if (adminNotes !== undefined) {
      updates.adminNotes = adminNotes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    await db
      .update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin ticket update error:", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
