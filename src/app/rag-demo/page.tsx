"use client";

import { useState } from "react";

interface Source {
  title: string;
  source: string;
  relevanceScore: number;
}

interface RagResult {
  answer: string;
  sources: Source[];
  debug?: {
    retrievedDocs: number;
    augmentedPromptLength: number;
  };
}

const EXAMPLE_QUESTIONS = [
  "What is the minimum down payment for an FHA loan?",
  "How does my credit score affect mortgage rates?",
  "What's the difference between PMI and MIP?",
  "Should I get an ARM or fixed rate mortgage?",
  "What are closing costs and how much should I expect?",
  "What programs exist for first-time homebuyers?",
  "What is DTI and what ratio do lenders want?",
  "How can I avoid paying PMI?",
];

export default function RagDemoPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<RagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDebug, setShowDebug] = useState(false);

  const askQuestion = async (q: string) => {
    setQuestion(q);
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/rag-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to get response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">RAG Demo</h1>
              <p className="text-xs text-gray-500">Retrieval-Augmented Generation — Ask mortgage questions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* How it works */}
        <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-violet-900 mb-2">How RAG Works</h2>
          <div className="flex items-center gap-2 text-xs text-violet-700 flex-wrap">
            <span className="bg-white px-2.5 py-1 rounded-full border border-violet-200 font-medium">
              1. Your question
            </span>
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="bg-white px-2.5 py-1 rounded-full border border-violet-200 font-medium">
              2. Search 14 docs (TF-IDF)
            </span>
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="bg-white px-2.5 py-1 rounded-full border border-violet-200 font-medium">
              3. Top 3 docs + question → Claude
            </span>
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="bg-white px-2.5 py-1 rounded-full border border-violet-200 font-medium">
              4. Grounded answer + sources
            </span>
          </div>
        </div>

        {/* Input */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ask a mortgage question
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && question.trim() && askQuestion(question)}
              placeholder="e.g. What is the minimum down payment for FHA?"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-sm"
            />
            <button
              onClick={() => askQuestion(question)}
              disabled={loading || !question.trim()}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Searching..." : "Ask"}
            </button>
          </div>

          {/* Example questions */}
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Try these:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => askQuestion(q)}
                  disabled={loading}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-violet-200 rounded-full" />
                <div className="absolute inset-0 w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Retrieving & generating...</p>
                <p className="text-xs text-gray-400">Searching knowledge base → Sending context to Claude</p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Answer */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-violet-100 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">RAG Answer</span>
                </div>
                <span className="text-xs text-gray-400">
                  {result.sources.length} source{result.sources.length !== 1 ? "s" : ""} used
                </span>
              </div>
              <div className="p-5">
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {result.answer}
                </div>
              </div>
            </div>

            {/* Sources - THE KEY RAG FEATURE: showing where info came from */}
            {result.sources.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-900">Retrieved Sources</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Documents found by the retriever, ranked by relevance
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {result.sources.map((source, i) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-violet-100 text-violet-700" :
                        i === 1 ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{source.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{source.source}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                source.relevanceScore > 0.3 ? "bg-violet-500" :
                                source.relevanceScore > 0.15 ? "bg-blue-400" :
                                "bg-gray-300"
                              }`}
                              style={{ width: `${Math.min(source.relevanceScore * 200, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">
                            {source.relevanceScore.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug info */}
            {result.debug && (
              <div>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <svg className={`w-3 h-3 transition-transform ${showDebug ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Debug info
                </button>
                {showDebug && (
                  <div className="mt-2 bg-gray-900 text-gray-300 rounded-lg p-4 text-xs font-mono">
                    <p>Documents retrieved: {result.debug.retrievedDocs}</p>
                    <p>Augmented prompt length: {result.debug.augmentedPromptLength.toLocaleString()} chars</p>
                    <p className="mt-2 text-gray-500">
                      // In production, this would show: embedding model, vector DB query time,
                      // similarity scores, chunk overlap, reranking steps, etc.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Learning guide */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Code Walkthrough</h3>
          <div className="space-y-3 text-xs text-gray-600">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                <p className="font-medium text-gray-800">Knowledge Base</p>
                <p className="text-gray-500 mt-0.5"><code className="bg-gray-100 px-1 rounded">src/lib/rag/knowledge-base.ts</code> — 14 mortgage docs, each with title, content, source, and category. In production: load from database, PDFs, or web scraping.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                <p className="font-medium text-gray-800">Retriever (TF-IDF)</p>
                <p className="text-gray-500 mt-0.5"><code className="bg-gray-100 px-1 rounded">src/lib/rag/retriever.ts</code> — Converts text → vectors using TF-IDF, then cosine similarity to find relevant docs. Upgrade path: swap for Voyage AI embeddings + Pinecone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <p className="font-medium text-gray-800">Pipeline</p>
                <p className="text-gray-500 mt-0.5"><code className="bg-gray-100 px-1 rounded">src/lib/rag/pipeline.ts</code> — Orchestrates: retrieve top-3 docs → inject into system prompt → call Claude → return answer with sources.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                <p className="font-medium text-gray-800">API Route</p>
                <p className="text-gray-500 mt-0.5"><code className="bg-gray-100 px-1 rounded">src/app/api/rag-demo/route.ts</code> — POST endpoint that accepts a question and returns the RAG result.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>To upgrade to production RAG:</strong> Replace TF-IDF with Voyage AI embeddings (<code className="bg-amber-100 px-1 rounded">voyage-3</code>), store vectors in Pinecone or Supabase pgvector, add a reranker for better accuracy, and implement chunking with overlap for longer documents.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
            &larr; Back to Calculator
          </a>
        </div>
      </main>
    </div>
  );
}
