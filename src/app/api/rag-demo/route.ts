/**
 * RAG Demo API Endpoint
 *
 * POST /api/rag-demo
 * Body: { question: string }
 * Returns: { answer, sources, debug }
 */

import { NextResponse } from "next/server";
import { ragQuery } from "@/lib/rag/pipeline";
import { flushLangfuse } from "@/lib/langfuse";

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Please provide a question" },
        { status: 400 }
      );
    }

    const result = await ragQuery(question, true); // true = include debug info

    await flushLangfuse();
    return NextResponse.json(result);
  } catch (err) {
    console.error("RAG error:", err);
    await flushLangfuse();
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
