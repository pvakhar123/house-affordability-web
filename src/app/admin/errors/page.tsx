"use client";

import { useEffect, useState } from "react";

interface ErrorEntry {
  id: string;
  route: string;
  method: string;
  message: string;
  stack: string | null;
  timestamp: string;
}

interface RouteBreakdown { route: string; count: number }

interface ErrorData {
  errors: ErrorEntry[];
  byRoute: RouteBreakdown[];
  total: number;
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

export default function ErrorsDashboard() {
  const [data, setData] = useState<ErrorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState("7d");
  const [routeFilter, setRouteFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    const since = sinceParam(timeFilter);
    if (since) params.set("since", since);
    if (routeFilter) params.set("route", routeFilter);
    const qs = params.toString();

    fetch(`/api/admin/errors${qs ? `?${qs}` : ""}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load error logs"));
  }, [timeFilter, routeFilter]);

  if (error) return <div className="max-w-5xl mx-auto p-8 text-red-600">{error}</div>;
  if (!data) return <div className="max-w-5xl mx-auto p-8 text-gray-400">Loading...</div>;

  const routes = data.byRoute.map((r) => r.route);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Error Logs</h1>
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
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Errors</p>
          <p className="text-2xl font-bold text-red-600">{data.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-500 mb-1">Affected Routes</p>
          <p className="text-2xl font-bold text-gray-900">{data.byRoute.length}</p>
        </div>
      </div>

      {/* Errors by Route */}
      {data.byRoute.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Errors by Route</h2>
          <div className="flex gap-3 flex-wrap">
            {data.byRoute.map((r) => (
              <button
                key={r.route}
                onClick={() => setRouteFilter(routeFilter === r.route ? "" : r.route)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                  routeFilter === r.route
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {r.route} <span className="font-sans font-bold ml-1">{r.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Error Log</h2>
          {routeFilter && (
            <button
              onClick={() => setRouteFilter("")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filter
            </button>
          )}
        </div>
        {data.errors.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No errors recorded</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.errors.map((err) => (
              <div key={err.id}>
                <button
                  onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
                  className="w-full px-5 py-3 flex items-start gap-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-500">{err.route}</span>
                      <span className="text-xs text-gray-300">{err.method}</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{err.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(err.timestamp).toLocaleString()}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === err.id ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedId === err.id && err.stack && (
                  <div className="px-5 pb-4">
                    <pre className="bg-gray-900 text-gray-200 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                      {err.stack}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
