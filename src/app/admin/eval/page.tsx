"use client";

import { useEffect, useState } from "react";
import { cacheEvalRun, cacheJudgeEntries, getCachedEvalData } from "@/lib/eval/client-cache";

interface PatternCheck { pattern: string; passed: boolean }
interface JudgeScores { accuracy: number; relevance: number; helpfulness: number; safety: number; overall: number; reasons: Record<string, string> }
interface EvalResult {
  evalRunId: string; timestamp: string; testCaseId: string; category: string; question: string; response: string;
  toolsCalled: string[]; mustIncludeResults: PatternCheck[]; mustNotIncludeResults: PatternCheck[];
  patternResults: PatternCheck[]; toolCallResults: PatternCheck[];
  patternScore: number; judgeScores: JudgeScores; overallPass: boolean; durationMs: number;
}
interface RunSummary {
  evalRunId: string; timestamp: string; totalTests: number; passed: number; failed: number;
  avgPatternScore: number; avgJudgeScores: { accuracy: number; relevance: number; helpfulness: number; safety: number; overall: number };
}

function ScoreCard({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toFixed(1)}<span className="text-sm text-gray-400">/{max}</span></p>
    </div>
  );
}

export default function EvalDashboard() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = () => {
    setLoading(true);
    fetch("/api/eval/results")
      .then((r) => r.json())
      .then((data) => {
        const apiRuns = data.runs ?? [];
        const apiResults = data.results ?? [];
        // If API returned empty (Vercel /tmp lost), fall back to localStorage cache
        if (apiRuns.length === 0) {
          const cached = getCachedEvalData();
          setRuns(cached.runs as unknown as RunSummary[]);
          setResults(cached.results as unknown as EvalResult[]);
        } else {
          setRuns(apiRuns);
          setResults(apiResults);
        }
      })
      .catch(() => {
        // API failed — try localStorage
        const cached = getCachedEvalData();
        setRuns(cached.runs as unknown as RunSummary[]);
        setResults(cached.results as unknown as EvalResult[]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchResults, []);

  const runEval = () => {
    setRunning(true);
    setError(null);
    fetch("/api/eval/run", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          // Use the POST response directly — JSONL in /tmp doesn't persist across Vercel invocations
          const runSummary: RunSummary = {
            evalRunId: data.evalRunId,
            timestamp: data.timestamp,
            totalTests: data.totalTests,
            passed: data.passed,
            failed: data.failed,
            avgPatternScore: data.avgPatternScore,
            avgJudgeScores: data.avgJudgeScores,
          };
          setRuns((prev) => [runSummary, ...prev]);
          setResults((prev) => [...(data.results ?? []), ...prev]);
          // Cache to localStorage for quality page + persistence across Vercel invocations
          cacheEvalRun(runSummary, data.results ?? []);
          // Also cache judge entries so the quality page can read them
          const judgeEntries = (data.results ?? [])
            .filter((r: EvalResult) => r.judgeScores.overall > 0)
            .map((r: EvalResult) => ({
              id: `${r.evalRunId}-${r.testCaseId}`,
              timestamp: r.timestamp ?? new Date().toISOString(),
              source: "batch" as const,
              question: r.question,
              responsePreview: r.response.slice(0, 200),
              scores: r.judgeScores,
              testCaseId: r.testCaseId,
              evalRunId: r.evalRunId,
            }));
          cacheJudgeEntries(judgeEntries);
        }
      })
      .catch(() => setError("Eval run failed"))
      .finally(() => setRunning(false));
  };

  const latestRun = runs[0];
  const latestResults = latestRun ? results.filter((r) => r.evalRunId === latestRun.evalRunId) : [];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Evaluation Dashboard</h1>
        <button
          onClick={runEval}
          disabled={running}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {running ? "Running..." : "Run Evaluation"}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

      {loading && <p className="text-gray-400">Loading...</p>}

      {/* Latest run summary */}
      {latestRun && (
        <>
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-500">Latest Run</p>
              <p className="text-xs text-gray-400">{new Date(latestRun.timestamp).toLocaleString()}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <span className="text-2xl font-bold text-gray-900">{latestRun.passed}</span>
                <span className="text-sm text-green-600 ml-1">passed</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">{latestRun.failed}</span>
                <span className="text-sm text-red-500 ml-1">failed</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">{(latestRun.avgPatternScore * 100).toFixed(0)}%</span>
                <span className="text-sm text-gray-400 ml-1">pattern</span>
              </div>
            </div>
          </div>

          {/* Judge dimension scores */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <ScoreCard label="Accuracy" value={latestRun.avgJudgeScores.accuracy} max={5} />
            <ScoreCard label="Relevance" value={latestRun.avgJudgeScores.relevance} max={5} />
            <ScoreCard label="Helpfulness" value={latestRun.avgJudgeScores.helpfulness} max={5} />
            <ScoreCard label="Safety" value={latestRun.avgJudgeScores.safety} max={5} />
          </div>

          {/* Results table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Test Case</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-center">Pattern</th>
                  <th className="px-4 py-2 text-center">Judge</th>
                  <th className="px-4 py-2 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {latestResults.map((r) => (
                  <tr key={r.testCaseId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <button
                        onClick={() => setExpandedId(expandedId === r.testCaseId ? null : r.testCaseId)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-left"
                      >
                        {r.testCaseId}
                      </button>
                      {expandedId === r.testCaseId && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                          <div>
                            <p className="font-semibold text-gray-600">Question:</p>
                            <p className="text-gray-500">{r.question}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-600">Response ({r.response.length} chars):</p>
                            <p className="text-gray-500 max-h-32 overflow-auto whitespace-pre-wrap">{r.response.slice(0, 500)}{r.response.length > 500 ? "..." : ""}</p>
                          </div>
                          {r.toolsCalled.length > 0 && (
                            <div>
                              <p className="font-semibold text-gray-600">Tools called:</p>
                              <p className="text-gray-500">{r.toolsCalled.join(", ")}</p>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-600">Pattern checks:</p>
                            <div className="space-y-0.5">
                              {[...r.mustIncludeResults.map((c) => ({ ...c, type: "must include" })),
                                ...r.mustNotIncludeResults.map((c) => ({ ...c, type: "must NOT include" })),
                                ...r.patternResults.map((c) => ({ ...c, type: "pattern" })),
                                ...r.toolCallResults.map((c) => ({ ...c, type: "tool call" })),
                              ].map((c, i) => (
                                <p key={i} className={c.passed ? "text-green-600" : "text-red-500"}>
                                  {c.passed ? "\u2713" : "\u2717"} {c.type}: {c.pattern}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-600">Judge reasons:</p>
                            {Object.entries(r.judgeScores.reasons).map(([dim, reason]) => (
                              <p key={dim} className="text-gray-500"><strong>{dim}:</strong> {reason}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{r.category}</span>
                    </td>
                    <td className="px-4 py-2 text-center">{(r.patternScore * 100).toFixed(0)}%</td>
                    <td className="px-4 py-2 text-center">{r.judgeScores.overall.toFixed(1)}/5</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.overallPass ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                        {r.overallPass ? "PASS" : "FAIL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && runs.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No evaluation runs yet.</p>
          <p className="text-sm mt-1">Click &quot;Run Evaluation&quot; to test your golden dataset.</p>
        </div>
      )}

      {/* Run history */}
      {runs.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Run History</h2>
          <div className="space-y-2">
            {runs.map((run) => (
              <div key={run.evalRunId} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg text-sm">
                <span className="text-gray-500">{new Date(run.timestamp).toLocaleString()}</span>
                <div className="flex gap-4">
                  <span className="text-green-600">{run.passed} pass</span>
                  <span className="text-red-500">{run.failed} fail</span>
                  <span className="text-gray-400">{run.avgJudgeScores.overall.toFixed(1)}/5 avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
