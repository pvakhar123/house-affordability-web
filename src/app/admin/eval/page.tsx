"use client";

import { useEffect, useState, useCallback } from "react";
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
  durationMs?: number;
}
interface TestCaseInfo { id: string; category: string; question: string }

interface ReportScoreEntry {
  id: string; timestamp: string; source: string;
  question: string; responsePreview: string;
  scores: JudgeScores;
}
interface ReportAggregates {
  total: number; avgAccuracy: number; avgRelevance: number; avgHelpfulness: number; avgSafety: number; avgOverall: number;
}

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
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
  const [progress, setProgress] = useState<{ current: number; total: number; currentCase: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportScores, setReportScores] = useState<ReportScoreEntry[]>([]);
  const [reportAggregates, setReportAggregates] = useState<ReportAggregates | null>(null);

  const fetchResults = useCallback(() => {
    setLoading(true);
    fetch("/api/eval/results")
      .then((r) => r.json())
      .then((data) => {
        const apiRuns = data.runs ?? [];
        const apiResults = data.results ?? [];
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
        const cached = getCachedEvalData();
        setRuns(cached.runs as unknown as RunSummary[]);
        setResults(cached.results as unknown as EvalResult[]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(fetchResults, [fetchResults]);

  // Fetch report quality scores
  useEffect(() => {
    fetch("/api/judge/scores?source=report")
      .then((r) => r.json())
      .then((data) => {
        setReportScores(data.entries ?? []);
        setReportAggregates(data.aggregates ?? null);
      })
      .catch(() => {});
  }, []);

  // Run eval cases one-by-one to stay within Vercel function timeout
  const runEval = useCallback(async () => {
    setRunning(true);
    setError(null);
    setProgress(null);

    try {
      // Step 1: Fetch test case IDs
      const casesRes = await fetch("/api/eval/cases");
      const casesData = await casesRes.json();
      if (casesData.error) { setError(casesData.error); setRunning(false); return; }
      const cases: TestCaseInfo[] = casesData.cases ?? [];
      if (cases.length === 0) { setError("No test cases found"); setRunning(false); return; }

      // Step 2: Run each case individually
      const allResults: EvalResult[] = [];
      for (let i = 0; i < cases.length; i++) {
        const tc = cases[i];
        setProgress({ current: i + 1, total: cases.length, currentCase: tc.id });

        try {
          const res = await fetch("/api/eval/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ testCaseIds: [tc.id] }),
          });
          const data = await res.json();
          if (data.results?.length > 0) {
            allResults.push(...data.results);
          } else if (data.error) {
            console.warn(`[eval] ${tc.id} failed:`, data.error);
          }
        } catch (err) {
          console.warn(`[eval] ${tc.id} fetch failed:`, err);
        }
      }

      // Step 3: Build run summary from collected results
      if (allResults.length > 0) {
        const passed = allResults.filter((r) => r.overallPass).length;
        const evalRunId = allResults[0].evalRunId;
        const runSummary: RunSummary = {
          evalRunId,
          timestamp: new Date().toISOString(),
          totalTests: allResults.length,
          passed,
          failed: allResults.length - passed,
          avgPatternScore: avg(allResults.map((r) => r.patternScore)),
          avgJudgeScores: {
            accuracy: avg(allResults.map((r) => r.judgeScores.accuracy)),
            relevance: avg(allResults.map((r) => r.judgeScores.relevance)),
            helpfulness: avg(allResults.map((r) => r.judgeScores.helpfulness)),
            safety: avg(allResults.map((r) => r.judgeScores.safety)),
            overall: avg(allResults.map((r) => r.judgeScores.overall)),
          },
          durationMs: allResults.reduce((s, r) => s + r.durationMs, 0),
        };

        setRuns((prev) => [runSummary, ...prev]);
        setResults((prev) => [...allResults, ...prev]);

        // Cache for persistence + quality page
        cacheEvalRun(runSummary, allResults);
        const judgeEntries = allResults
          .filter((r) => r.judgeScores.overall > 0)
          .map((r) => ({
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
      } else {
        setError("All test cases failed to execute");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eval run failed");
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }, []);

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

      {/* Progress bar during eval run */}
      {progress && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-blue-700">
              Running: <span className="font-mono">{progress.currentCase}</span>
            </p>
            <p className="text-xs text-blue-500">{progress.current}/{progress.total}</p>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

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

      {!loading && !running && runs.length === 0 && (
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

      {/* Report Quality Section */}
      <div className="mt-10 pt-8 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Quality</h2>

        {reportAggregates && reportAggregates.total > 0 ? (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <ScoreCard label="Accuracy" value={reportAggregates.avgAccuracy} max={5} />
              <ScoreCard label="Completeness" value={reportAggregates.avgRelevance} max={5} />
              <ScoreCard label="Clarity" value={reportAggregates.avgHelpfulness} max={5} />
              <ScoreCard label="Safety" value={reportAggregates.avgSafety} max={5} />
            </div>

            <p className="text-sm text-gray-500 mb-3">{reportAggregates.total} report{reportAggregates.total !== 1 ? "s" : ""} scored &middot; {reportAggregates.avgOverall.toFixed(1)}/5 avg</p>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-center">Acc</th>
                    <th className="px-3 py-2 text-center">Comp</th>
                    <th className="px-3 py-2 text-center">Clar</th>
                    <th className="px-3 py-2 text-center">Safe</th>
                    <th className="px-3 py-2 text-center">Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportScores.map((e) => {
                    const scoreColor = (s: number) => s >= 4 ? "text-green-600" : s >= 3 ? "text-yellow-600" : "text-red-500";
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(e.timestamp).toLocaleString()}
                        </td>
                        <td className={`px-3 py-2 text-center font-medium ${scoreColor(e.scores.accuracy)}`}>{e.scores.accuracy}</td>
                        <td className={`px-3 py-2 text-center font-medium ${scoreColor(e.scores.relevance)}`}>{e.scores.relevance}</td>
                        <td className={`px-3 py-2 text-center font-medium ${scoreColor(e.scores.helpfulness)}`}>{e.scores.helpfulness}</td>
                        <td className={`px-3 py-2 text-center font-medium ${scoreColor(e.scores.safety)}`}>{e.scores.safety}</td>
                        <td className={`px-3 py-2 text-center font-bold ${scoreColor(e.scores.overall)}`}>{e.scores.overall.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-center py-8 text-gray-400 text-sm">
            No report quality scores yet. Generate a report with ENABLE_REALTIME_JUDGE=true to see scores here.
          </p>
        )}
      </div>
    </div>
  );
}
