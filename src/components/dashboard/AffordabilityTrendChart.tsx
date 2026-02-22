"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ReportSummary {
  savedAt: string;
  maxPrice: number | null;
  name: string;
}

interface Props {
  reports: ReportSummary[];
}

function fmtPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

export default function AffordabilityTrendChart({ reports }: Props) {
  // Filter to reports that have maxPrice, sort oldest first
  const data = reports
    .filter((r): r is ReportSummary & { maxPrice: number } => r.maxPrice != null)
    .sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime())
    .map((r) => ({
      date: new Date(r.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      maxPrice: r.maxPrice,
      name: r.name,
    }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900">Affordability Trend</h3>
      </div>

      {data.length >= 2 ? (
        <div className="h-40 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtPrice(Number(v))}
                width={50}
              />
              <Tooltip
                formatter={(value) => [`$${Math.round(Number(value)).toLocaleString()}`, "Max Price"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Line
                type="monotone"
                dataKey="maxPrice"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: "#6366f1", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8">
          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
          <p className="text-sm text-gray-500">Save more analyses to see trends</p>
          <p className="text-xs text-gray-400 mt-1">Need at least 2 saved reports</p>
        </div>
      )}
    </div>
  );
}
