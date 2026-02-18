"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { HistoricalData } from "@/lib/types";

interface Props {
  data: HistoricalData;
}

function mergeTimelines(data: HistoricalData) {
  const rateMap = new Map<string, number>();
  for (const d of data.mortgageRates ?? []) {
    rateMap.set(d.date.substring(0, 7), d.value);
  }

  return data.medianHomePrices.map((d) => {
    const ym = d.date.substring(0, 7);
    return {
      date: d.date,
      label: formatQuarter(d.date),
      price: d.value,
      rate: rateMap.get(ym) ?? null,
    };
  });
}

function formatQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} '${String(d.getFullYear()).slice(2)}`;
}

function formatPrice(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value / 1000)}K`;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name === "Median Home Price"
            ? `${entry.name}: $${Math.round(entry.value).toLocaleString()}`
            : `${entry.name}: ${entry.value.toFixed(2)}%`}
        </p>
      ))}
    </div>
  );
}

export default function HistoricalPriceChart({ data }: Props) {
  const [showRates, setShowRates] = useState(true);
  const chartData = mergeTimelines(data);
  const hasRates = data.mortgageRates && data.mortgageRates.length > 0;

  if (chartData.length < 2) return null;

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const totalChange = ((last.price - first.price) / first.price) * 100;

  return (
    <div>
      {hasRates && (
        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRates}
              onChange={(e) => setShowRates(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show Mortgage Rates
          </label>
        </div>
      )}

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: showRates && hasRates ? 10 : 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              yAxisId="price"
              tickFormatter={formatPrice}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            {showRates && hasRates && (
              <YAxis
                yAxisId="rate"
                orientation="right"
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={["auto", "auto"]}
              />
            )}
            <Tooltip content={<ChartTooltip />} />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              name="Median Home Price"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#priceGrad)"
            />
            {showRates && hasRates && (
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="rate"
                name="30-Yr Mortgage Rate"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
        <span>
          {first.label}: <strong className="text-gray-700">${Math.round(first.price).toLocaleString()}</strong>
        </span>
        <span className="text-gray-300">&rarr;</span>
        <span>
          {last.label}: <strong className="text-gray-700">${Math.round(last.price).toLocaleString()}</strong>
        </span>
        <span className="ml-auto">
          <span className={totalChange >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
            {totalChange >= 0 ? "+" : ""}{totalChange.toFixed(1)}%
          </span>{" "}
          over {chartData.length > 4 ? Math.round(chartData.length / 4) : chartData.length} years
        </span>
      </div>
    </div>
  );
}
