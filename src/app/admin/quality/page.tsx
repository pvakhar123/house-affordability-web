"use client";

import { useEffect, useState } from "react";

interface JudgeScores { accuracy: number; relevance: number; helpfulness: number; safety: number; overall: number; reasons: Record<string, string> }
interface ScoreEntry {
  id: string; timestamp: string; source: "realtime" | "batch";
  question: string; responsePreview: string; scores: JudgeScores;
  testCaseId?: string; evalRunId?: string;
}
interface Aggregates {
  total: number; avgAccuracy: number; avgRelevance: number; avgHelpfulness: number; avgSafety: number; avgOverall: number;
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const color = value >= 4 ? "text-green-600" : value >= 3 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toFixed(1)}<span className="text-sm text-gray-400">/5</span></p>
    </div>
  );
}

export default function QualityDashboard() {
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [realtimeCount, setRealtimeCount] = useState(0);
  const [batchCount, setBatchCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "realtime" | "batch">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = filter !== "all" ? `?source=${filter}` : "";
    fetch(`/api/judge/scores${params}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setAggregates(data.aggregates ?? null);
        setRealtimeCount(data.realtimeCount ?? 0);
        setBatchCount(data.batchCount ?? 0);
      })
      .catch(() => setError("Failed to load quality data"));
  }, [filter]);

  if (error) return <div className="max-w-4xl mx-auto p-8 text-red-600">{error}</div>;
  if (!aggregates) return <div className="max-w-4xl mx-auto p-8 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Chat Quality Metrics</h1>

      {/* Score cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <ScoreCard label="Accuracy" value={aggregates.avgAccuracy} />
        <ScoreCard label="Relevance" value={aggregates.avgRelevance} />
        <ScoreCard label="Helpfulness" value={aggregates.avgHelpfulness} />
        <ScoreCard label="Safety" value={aggregates.avgSafety} />
      </div>

      {/* Counts + filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{aggregates.total} scored</span>
          <span>{realtimeCount} realtime</span>
          <span>{batchCount} batch</span>
        </div>
        <div className="flex gap-1">
          {(["all", "realtime", "batch"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Scores table */}
      {entries.length === 0 ? (
        <p className="text-center py-8 text-gray-400 text-sm">No judge scores yet. Enable real-time judging or run a batch evaluation.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Question</th>
                <th className="px-3 py-2 text-center">Acc</th>
                <th className="px-3 py-2 text-center">Rel</th>
                <th className="px-3 py-2 text-center">Help</th>
                <th className="px-3 py-2 text-center">Safe</th>
                <th className="px-3 py-2 text-center">Avg</th>
                <th className="px-4 py-2 text-center">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => {
                const scoreColor = (s: number) => s >= 4 ? "text-green-600" : s >= 3 ? "text-yellow-600" : "text-red-500";
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-700 max-w-[200px] truncate" title={e.question}>
                      {e.question}
                    </td>
                    <td className={`px-3 py-2 text-center font-medium ${scoreColor(e.scores.accuracy)}`}>{e.scores.accuracy}</td>
                    <td className={`px-3 py-2 text-center font-medium ${scoreColor(e.scores.relevance)}`}>{e.scores.relevance}</td>
                    <td className={`px-3 py-2 text-center font-medium ${scoreColor(e.scores.helpfulness)}`}>{e.scores.helpfulness}</td>
                    <td className={`px-3 py-2 text-center font-medium ${scoreColor(e.scores.safety)}`}>{e.scores.safety}</td>
                    <td className={`px-3 py-2 text-center font-bold ${scoreColor(e.scores.overall)}`}>{e.scores.overall.toFixed(1)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        e.source === "realtime" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      }`}>
                        {e.source}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
