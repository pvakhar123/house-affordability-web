import { NextRequest, NextResponse } from "next/server";
import { appendFile, mkdir, readFile } from "fs/promises";
import { join } from "path";

const FEEDBACK_PATH = join(process.cwd(), "data", "feedback.jsonl");

export async function GET() {
  try {
    let raw: string;
    try {
      raw = await readFile(FEEDBACK_PATH, "utf-8");
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, rating, messageIndex, comment, timestamp } = body;

    if (!type || !rating) {
      return NextResponse.json({ error: "type and rating required" }, { status: 400 });
    }

    const entry = {
      type, // "chat" | "report"
      rating, // "up" | "down"
      messageIndex, // for chat messages
      comment, // optional text feedback
      timestamp: timestamp || new Date().toISOString(),
      userAgent: req.headers.get("user-agent") || "",
    };

    // Append to a JSONL log file
    const dir = join(process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    await appendFile(join(dir, "feedback.jsonl"), JSON.stringify(entry) + "\n");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
