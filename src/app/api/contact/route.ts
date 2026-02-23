import { NextResponse } from "next/server";
import { z } from "zod";
import { isDbAvailable, getDb } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { withTracking } from "@/lib/db/track";

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  subject: z.enum(["Bug Report", "Feature Request", "Billing Question", "Other"]),
  message: z.string().min(10).max(5000),
});

async function _POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!isDbAvailable) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    const { name, email, subject, message } = parsed.data;
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const db = getDb();
    await db.insert(supportTickets).values({
      name,
      email,
      subject,
      message,
      userId,
    });

    // Send admin notification email (best-effort)
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const adminEmail = process.env.ADMIN_EMAILS?.split(",")[0]?.trim();
      if (resendKey && adminEmail) {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "HomeIQ <onboarding@resend.dev>",
          to: adminEmail,
          subject: `[Support] ${subject} — from ${name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2 style="color: #1f2937;">New Support Ticket</h2>
              <p><strong>From:</strong> ${name} (${email})</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>User ID:</strong> ${userId ?? "anonymous"}</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
              <p style="white-space: pre-wrap; color: #374151;">${message}</p>
            </div>
          `,
        });
      }
    } catch (e) {
      console.warn("[contact] Admin email notification failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}

export const POST = withTracking("/api/contact", _POST);
