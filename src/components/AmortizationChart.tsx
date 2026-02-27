"use client";

import { useState, useMemo } from "react";
import type { AmortizationYear } from "@/lib/types";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import AmortizationTable from "./AmortizationTable";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${(v / 1000).toFixed(0)}K`;
}

export default function AmortizationChart({ data }: { data: AmortizationYear[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [showAllYears, setShowAllYears] = useState(false);

  const chartData = useMemo(
    () =>
      data.map((yr) => ({
        year: `Yr ${yr.year}`,
        principal: yr.principalPaid,
        interest: yr.interestPaid,
        balance: yr.remainingBalance,
      })),
    [data]
  );

  const totals = useMemo(() => {
    const totalPrincipal = data.reduce((s, yr) => s + yr.principalPaid, 0);
    const totalInterest = data.reduce((s, yr) => s + yr.interestPaid, 0);
    const ratio = totalPrincipal > 0 ? (totalInterest / totalPrincipal).toFixed(2) : "0";
    return { totalPrincipal, totalInterest, ratio };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-gray-500">{data.length <= 5 ? `${data.length}-Year` : "Total"} Interest</p>
          <p className="text-lg font-semibold text-red-500 tabular-nums">{fmt(totals.totalInterest)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-gray-500">{data.length <= 5 ? `${data.length}-Year` : "Total"} Principal</p>
          <p className="text-lg font-semibold text-green-600 tabular-nums">{fmt(totals.totalPrincipal)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-[11px] text-gray-500">Interest-to-Principal</p>
          <p className="text-lg font-semibold text-gray-800 tabular-nums">{totals.ratio}x</p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setView("chart")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              view === "chart" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            Chart
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              view === "table" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            Table
          </button>
        </div>
        {data.length > 5 && (
          <p className="text-xs text-gray-400">{data.length}-year schedule</p>
        )}
      </div>

      {/* Chart view */}
      {view === "chart" && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="amortPrincipalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34c759" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34c759" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="amortInterestGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff3b30" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11 }}
                interval={data.length > 15 ? 4 : data.length > 8 ? 2 : 0}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickFormatter={fmtAxis}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickFormatter={fmtAxis}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip
                formatter={(value: any, name: any) => [
                  fmt(Number(value) || 0),
                  name === "principal"
                    ? "Principal Paid"
                    : name === "interest"
                      ? "Interest Paid"
                      : "Remaining Balance",
                ]}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="principal"
                name="Principal Paid"
                stackId="payment"
                fill="url(#amortPrincipalGrad)"
                stroke="#34c759"
                strokeWidth={2}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="interest"
                name="Interest Paid"
                stackId="payment"
                fill="url(#amortInterestGrad)"
                stroke="#ff3b30"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="balance"
                name="Remaining Balance"
                stroke="#0071e3"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table view */}
      {view === "table" && (
        <div>
          <AmortizationTable data={showAllYears ? data : data.slice(0, 5)} />
          {data.length > 5 && !showAllYears && (
            <button
              type="button"
              onClick={() => setShowAllYears(true)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Show all {data.length} years
            </button>
          )}
          {showAllYears && data.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllYears(false)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Show first 5 years
            </button>
          )}
        </div>
      )}
    </div>
  );
}
