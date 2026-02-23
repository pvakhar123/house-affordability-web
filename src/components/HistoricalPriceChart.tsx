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
  Legend,
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

  const localMap = new Map<string, number>();
  for (const d of data.localPriceIndex ?? []) {
    localMap.set(d.date.substring(0, 7), d.value);
  }

  return data.medianHomePrices.map((d) => {
    const ym = d.date.substring(0, 7);
    // Find closest local value (Case-Shiller is monthly, prices are quarterly)
    let localVal: number | null = localMap.get(ym) ?? null;
    if (!localVal) {
      // Try nearby months within the quarter
      const [y, m] = ym.split("-").map(Number);
      for (const offset of [1, -1, 2, -2]) {
        const tryM = m + offset;
        const tryKey = tryM > 12
          ? `${y + 1}-${String(tryM - 12).padStart(2, "0")}`
          : tryM < 1
          ? `${y - 1}-${String(tryM + 12).padStart(2, "0")}`
          : `${y}-${String(tryM).padStart(2, "0")}`;
        if (localMap.has(tryKey)) {
          localVal = localMap.get(tryKey)!;
          break;
        }
      }
    }

    return {
      date: d.date,
      label: formatQuarter(d.date),
      price: d.value,
      localPrice: localVal,
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
          {entry.name.includes("Rate")
            ? `${entry.name}: ${entry.value.toFixed(2)}%`
            : `${entry.name}: $${Math.round(entry.value).toLocaleString()}`}
        </p>
      ))}
    </div>
  );
}

export default function HistoricalPriceChart({ data }: Props) {
  const [showRates, setShowRates] = useState(true);
  const chartData = mergeTimelines(data);
  const hasRates = data.mortgageRates && data.mortgageRates.length > 0;
  const hasLocal = data.localPriceIndex && data.localPriceIndex.length > 0;
  const localLabel = data.localLabel || "Local";

  if (chartData.length < 2) return null;

  const first = chartData[0];
  const last = chartData[chartData.length - 1];

  // National stats
  const nationalChange = ((last.price - first.price) / first.price) * 100;

  // Local stats (if available)
  const firstLocal = chartData.find((d) => d.localPrice != null);
  const lastLocal = [...chartData].reverse().find((d) => d.localPrice != null);
  const localChange =
    firstLocal?.localPrice && lastLocal?.localPrice
      ? ((lastLocal.localPrice - firstLocal.localPrice) / firstLocal.localPrice) * 100
      : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {hasRates && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRates}
              onChange={(e) => setShowRates(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Mortgage Rates
          </label>
        )}
        {hasLocal && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-0.5 bg-green-500 rounded" />
            {localLabel} (estimated)
          </span>
        )}
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: showRates && hasRates ? 10 : 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0071e3" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="localGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34c759" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#34c759" stopOpacity={0} />
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
            {(hasLocal || hasRates) && (
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
                iconSize={10}
              />
            )}
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              name="National Median"
              stroke="#0071e3"
              strokeWidth={2}
              fill="url(#priceGrad)"
            />
            {hasLocal && (
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="localPrice"
                name={`${localLabel} Median`}
                stroke="#34c759"
                strokeWidth={2}
                fill="url(#localGrad)"
                connectNulls
              />
            )}
            {showRates && hasRates && (
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="rate"
                name="30-Yr Rate"
                stroke="#ff9500"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-1 mt-3 text-xs text-gray-500">
        <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            National:
          </span>
          <span>
            {first.label}: <strong className="text-gray-700">${Math.round(first.price).toLocaleString()}</strong>
          </span>
          <span className="text-gray-300">&rarr;</span>
          <span>
            {last.label}: <strong className="text-gray-700">${Math.round(last.price).toLocaleString()}</strong>
          </span>
          <span className="ml-auto">
            <span className={nationalChange >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {nationalChange >= 0 ? "+" : ""}{nationalChange.toFixed(1)}%
            </span>
          </span>
        </div>
        {hasLocal && firstLocal?.localPrice && lastLocal?.localPrice && localChange !== null && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {localLabel}:
            </span>
            <span>
              {firstLocal.label}: <strong className="text-gray-700">${Math.round(firstLocal.localPrice).toLocaleString()}</strong>
            </span>
            <span className="text-gray-300">&rarr;</span>
            <span>
              {lastLocal.label}: <strong className="text-gray-700">${Math.round(lastLocal.localPrice).toLocaleString()}</strong>
            </span>
            <span className="ml-auto">
              <span className={localChange >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {localChange >= 0 ? "+" : ""}{localChange.toFixed(1)}%
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
