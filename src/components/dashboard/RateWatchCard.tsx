"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  current30yr: number | null;
  current15yr: number | null;
  history30yr: { date: string; value: number }[];
}

export default function RateWatchCard({ current30yr, current15yr, history30yr }: Props) {
  const chartData = history30yr.map((h) => ({
    date: new Date(h.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    rate: h.value,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900">Rate Watch</h3>
      </div>

      {current30yr != null || current15yr != null ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">30-Year Fixed</p>
              <p className="text-xl font-bold text-gray-900">
                {current30yr != null ? `${current30yr.toFixed(2)}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">15-Year Fixed</p>
              <p className="text-xl font-bold text-gray-900">
                {current15yr != null ? `${current15yr.toFixed(2)}%` : "—"}
              </p>
            </div>
          </div>

          {chartData.length > 2 && (
            <div className="h-32 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={["dataMin - 0.5", "dataMax + 0.5"]}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(2)}%`, "30yr Rate"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#rateGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="text-[10px] text-gray-400 mt-2">Updated hourly via FRED</p>
        </>
      ) : (
        <p className="text-sm text-gray-400 py-4 text-center">Rate data unavailable</p>
      )}
    </div>
  );
}
