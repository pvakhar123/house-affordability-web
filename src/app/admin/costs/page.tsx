"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LlmCall {
  id: string;
  timestamp: string;
  traceName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalCost: number;
}

interface CostData {
  totals: { callCount: number; totalCost: number; totalInputTokens: number; totalOutputTokens: number };
  byModel: { model: string; callCount: number; cost: number }[];
  byDay: { day: string; cost: number; callCount: number }[];
  byTrace: { traceName: string; callCount: number; cost: number }[];
  recentCalls: LlmCall[];
}

const TIME_FILTERS = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All", value: "" },
];

function sinceParam(value: string): string {
  if (!value) return "";
  const now = new Date();
  if (value === "24h") now.setHours(now.getHours() - 24);
  else if (value === "7d") now.setDate(now.getDate() - 7);
  else if (value === "30d") now.setDate(now.getDate() - 30);
  return now.toISOString();
}

function fmtCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortModel(model: string): string {
  return model.replace(/^claude-/, "").replace(/-\d{8}$/, "");
}

export default function CostsDashboard() {
  const [data, setData] = useState<CostData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState("7d");

  useEffect(() => {
    const since = sinceParam(timeFilter);
    const params = since ? `?since=${encodeURIComponent(since)}` : "";
    fetch(`/api/admin/costs${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load cost data"));
  }, [timeFilter]);

  if (error) return <div className="max-w-5xl mx-auto p-8 text-red-600">{error}</div>;
  if (!data) return <div className="max-w-5xl mx-auto p-8 text-gray-400">Loading...</div>;

  const avgCost = data.totals.callCount > 0 ? data.totals.totalCost / data.totals.callCount : 0;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LLM Costs</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TIME_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTimeFilter(f.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                timeFilter === f.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-gray-900">{fmtCost(data.totals.totalCost)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">LLM Calls</p>
          <p className="text-2xl font-bold text-gray-900">{data.totals.callCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Avg Cost/Call</p>
          <p className="text-2xl font-bold text-gray-900">{fmtCost(avgCost)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Tokens</p>
          <p className="text-2xl font-bold text-gray-900">
            {fmtTokens(data.totals.totalInputTokens + data.totals.totalOutputTokens)}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cost per Day */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Cost per Day</h2>
          {data.byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.byDay} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${v < 1 ? v.toFixed(2) : v.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  formatter={(v) => [fmtCost(Number(v)), "Cost"]}
                />
                <Line type="monotone" dataKey="cost" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          )}
        </div>

        {/* Cost by Model */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Cost by Model</h2>
          {data.byModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.byModel.map((m) => ({ ...m, model: shortModel(m.model) }))}
                layout="vertical"
                margin={{ left: 80, right: 16, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${v < 1 ? v.toFixed(2) : v.toFixed(0)}`}
                />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v) => [fmtCost(Number(v)), "Cost"]}
                />
                <Bar dataKey="cost" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Cost by Endpoint */}
      {data.byTrace.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Cost by Endpoint</h2>
          <div className="space-y-2">
            {data.byTrace.map((t) => {
              const pct = data.totals.totalCost > 0 ? (t.cost / data.totals.totalCost) * 100 : 0;
              return (
                <div key={t.traceName} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-600 w-48 truncate" title={t.traceName}>
                    {t.traceName}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{fmtCost(t.cost)}</span>
                  <span className="text-xs text-gray-400 w-12 text-right">{t.callCount} calls</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent LLM Calls Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Recent LLM Calls</h2>
        </div>
        {data.recentCalls.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No LLM calls recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-2 font-medium">Trace</th>
                  <th className="px-5 py-2 font-medium">Model</th>
                  <th className="px-5 py-2 font-medium text-right">Input</th>
                  <th className="px-5 py-2 font-medium text-right">Output</th>
                  <th className="px-5 py-2 font-medium text-right">Cost</th>
                  <th className="px-5 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600 max-w-[200px] truncate" title={call.traceName}>
                      {call.traceName}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{shortModel(call.model)}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 text-right font-mono">{fmtTokens(call.inputTokens)}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 text-right font-mono">{fmtTokens(call.outputTokens)}</td>
                    <td className="px-5 py-3 text-xs font-medium text-emerald-600 text-right">{fmtCost(call.totalCost)}</td>
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(call.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
