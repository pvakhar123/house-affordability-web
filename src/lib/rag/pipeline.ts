/**
 * STEP 4: THE RAG PIPELINE
 *
 * This orchestrates the full Retrieval-Augmented Generation flow:
 *
 *   ┌──────────┐     ┌───────────┐     ┌───────────┐     ┌──────────┐
 *   │  User    │────→│ RETRIEVE  │────→│ AUGMENT   │────→│ GENERATE │
 *   │ Question │     │ (search   │     │ (build    │     │ (call    │
 *   │          │     │  top-K    │     │  prompt   │     │  Claude) │
 *   │          │     │  docs)    │     │  with     │     │          │
 *   │          │     │           │     │  context) │     │          │
 *   └──────────┘     └───────────┘     └───────────┘     └──────────┘
 *
 * WITHOUT RAG:
 *   User: "What's the FHA MIP rate?"
 *   Claude: *relies on training data, might be outdated or wrong*
 *
 * WITH RAG:
 *   User: "What's the FHA MIP rate?"
 *   Retriever: finds "FHA Loan Limits and MIP" document
 *   Prompt: "Based on these documents: [doc content]... answer: ..."
 *   Claude: "The FHA MIP is 1.75% upfront + 0.55% annual" ← grounded in source
 */

import Anthropic from "@anthropic-ai/sdk";
import { retrieve } from "./retriever";
import { config } from "../config";
import { traceGeneration } from "../langfuse";

export interface RagResult {
  answer: string;
  // These let the UI show WHERE the answer came from — key RAG feature!
  sources: Array<{
    title: string;
    source: string;
    relevanceScore: number;
  }>;
  // For debugging: shows the augmented prompt sent to Claude
  debug?: {
    retrievedDocs: number;
    queryTokens?: string[];
    augmentedPromptLength: number;
  };
}

/**
 * The main RAG function. This is what you'd call from an API route.
 *
 * @param question - The user's natural language question
 * @param showDebug - Include debug info in response
 */
export async function ragQuery(
  question: string,
  showDebug: boolean = false
): Promise<RagResult> {
  // ── STEP 1: RETRIEVE ──────────────────────────────────────
  // Find the most relevant documents for this question.
  // In production with vector DB: retriever.search(embed(question), topK=3)
  const retrieved = retrieve(question, 3);

  // ── STEP 2: AUGMENT ───────────────────────────────────────
  // Build the prompt by injecting retrieved documents as context.
  // This is the "augmented" part — we're enhancing the prompt with real data.

  const contextBlock = retrieved.length > 0
    ? retrieved
        .map(
          (r, i) =>
            `--- Source ${i + 1}: ${r.document.title} (${r.document.source}) ---\n${r.document.content}`
        )
        .join("\n\n")
    : "No relevant documents found in the knowledge base.";

  // The system prompt tells Claude HOW to use the retrieved context
  const systemPrompt = `You are a helpful mortgage and homebuying advisor.
Answer the user's question based ONLY on the provided reference documents below.

RULES:
- If the answer is in the documents, cite which source you used
- If the documents don't contain the answer, say "I don't have specific information about that in my knowledge base" and give a general response
- Keep answers concise (2-4 paragraphs max)
- Use specific numbers and facts from the documents when available
- Format currency values clearly

REFERENCE DOCUMENTS:
${contextBlock}`;

  // ── STEP 3: GENERATE ──────────────────────────────────────
  // Send the augmented prompt to Claude. The LLM now has
  // real, retrieved context to base its answer on.

  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  const response = await traceGeneration({
    client,
    params: {
      model: "claude-haiku-4-5-20251001", // Fast + cheap for RAG answers
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    },
    trace: { name: "rag-query" },
    metadata: {
      question,
      retrievedDocCount: retrieved.length,
      topDocScore: retrieved[0]?.score,
    },
  });

  const answer =
    response.content[0].type === "text"
      ? response.content[0].text
      : "Unable to generate response.";

  // ── BUILD RESULT ──────────────────────────────────────────
  return {
    answer,
    sources: retrieved.map((r) => ({
      title: r.document.title,
      source: r.document.source,
      relevanceScore: Math.round(r.score * 100) / 100,
    })),
    ...(showDebug
      ? {
          debug: {
            retrievedDocs: retrieved.length,
            augmentedPromptLength: systemPrompt.length,
          },
        }
      : {}),
  };
}
