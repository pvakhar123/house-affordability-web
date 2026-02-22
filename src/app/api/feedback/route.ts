import { NextResponse } from "next/server";
import { appendFile, mkdir, readFile } from "fs/promises";
import { paths } from "@/lib/eval/paths";
import { isDbAvailable } from "@/lib/db";
import { insertFeedback, queryFeedback } from "@/lib/db/queries";
import { withTracking } from "@/lib/db/track";
import { feedbackInputSchema } from "@/lib/schemas";

async function _GET() {
  try {
    if (isDbAvailable) {
      const data = await queryFeedback();
      return NextResponse.json(data);
    }

    // JSONL fallback
    let raw: string;
    try {
      raw = await readFile(paths.feedback, "utf-8");
    } catch {
      return NextResponse.json({ entries: [], stats: { chat: { up: 0, down: 0 }, report: { up: 0, down: 0 }, total: 0 } });
    }

    const lines = raw.trim().split("\n").filter(Boolean);
    const entries = lines.map((l) => JSON.parse(l));

    const stats = { chat: { up: 0, down: 0 }, report: { up: 0, down: 0 }, total: entries.length };
    for (const e of entries) {
      const t = e.type as string;
      const r = e.rating as string;
      if ((t === "chat" || t === "report") && (r === "up" || r === "down")) {
        stats[t][r]++;
      }
    }

    return NextResponse.json({ entries: entries.slice(-50).reverse(), stats });
  } catch (err) {
    console.error("Feedback read error:", err);
    return NextResponse.json({ error: "Failed to read feedback" }, { status: 500 });
  }
}

async function _POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = feedbackInputSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { type, rating, messageIndex, comment, timestamp } = parsed.data;

    const entry = {
      type, // "chat" | "report"
      rating, // "up" | "down"
      messageIndex, // for chat messages
      comment, // optional text feedback
      traceId: body.traceId,
      timestamp: timestamp || new Date().toISOString(),
      userAgent: req.headers.get("user-agent") || "",
    };

    if (isDbAvailable) {
      await insertFeedback(entry);
    } else {
      await mkdir(paths.writableDir, { recursive: true });
      await appendFile(paths.feedback, JSON.stringify(entry) + "\n");
    }

    // Attach user feedback to Langfuse trace (if traceId provided)
    if (body.traceId) {
      try {
        const { getLangfuse, flushLangfuse } = await import("@/lib/langfuse");
        const langfuse = getLangfuse();
        langfuse.score({
          traceId: body.traceId,
          name: "user-feedback",
          value: rating === "up" ? 1 : 0,
          comment: comment || undefined,
        });
        await flushLangfuse();
      } catch (e) {
        console.warn("[feedback] Langfuse score failed:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

export const GET = withTracking("/api/feedback", _GET);
export const POST = withTracking("/api/feedback", _POST);
