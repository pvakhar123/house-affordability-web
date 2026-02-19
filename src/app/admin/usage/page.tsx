"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UsageEvent {
  id: string;
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}

interface RouteBreakdown { route: string; count: number }
interface StatusBreakdown { statusCode: number; count: number }
interface DayBreakdown { day: string; count: number }

interface UsageData {
  events: UsageEvent[];
  byRoute: RouteBreakdown[];
  byStatus: StatusBreakdown[];
  byDay: DayBreakdown[];
  totals: { count: number; avgDuration: number };
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

function statusColor(code: number): string {
  if (code < 300) return "text-green-600";
  if (code < 500) return "text-yellow-600";
  return "text-red-600";
}

export default function UsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState("7d");

  useEffect(() => {
    const since = sinceParam(timeFilter);
    const params = since ? `?since=${encodeURIComponent(since)}` : "";
    fetch(`/api/admin/usage${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load usage data"));
  }, [timeFilter]);

  if (error) return <div className="max-w-5xl mx-auto p-8 text-red-600">{error}</div>;
  if (!data) return <div className="max-w-5xl mx-auto p-8 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900">{data.totals.count}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-gray-900">{data.totals.avgDuration > 0 ? `${Math.round(data.totals.avgDuration)}ms` : "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Error Rate</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.totals.count > 0
              ? `${((data.byStatus.filter((s) => s.statusCode >= 500).reduce((sum, s) => sum + s.count, 0) / data.totals.count) * 100).toFixed(1)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Requests by Route */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Requests by Route</h2>
          {data.byRoute.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byRoute} layout="vertical" margin={{ left: 80, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="route" tick={{ fontSize: 11 }} width={80} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          )}
        </div>

        {/* Requests per Day */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Requests per Day</h2>
          {data.byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.byDay} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Status Code Breakdown */}
      {data.byStatus.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Status Code Breakdown</h2>
          <div className="flex gap-4 flex-wrap">
            {data.byStatus.map((s) => (
              <div key={s.statusCode} className="flex items-center gap-2">
                <span className={`font-mono text-sm font-bold ${statusColor(s.statusCode)}`}>{s.statusCode}</span>
                <span className="text-sm text-gray-500">{s.count} requests</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Requests Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Recent Requests</h2>
        </div>
        {data.events.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No requests recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-2 font-medium">Route</th>
                  <th className="px-5 py-2 font-medium">Method</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Duration</th>
                  <th className="px-5 py-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.events.slice(0, 50).map((evt) => (
                  <tr key={evt.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{evt.route}</td>
                    <td className="px-5 py-3 text-gray-500">{evt.method}</td>
                    <td className={`px-5 py-3 font-mono font-medium ${statusColor(evt.statusCode)}`}>{evt.statusCode}</td>
                    <td className="px-5 py-3 text-gray-500">{evt.durationMs}ms</td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(evt.timestamp).toLocaleString()}</td>
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
