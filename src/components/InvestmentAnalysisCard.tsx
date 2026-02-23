"use client";

import { useState } from "react";
import type { InvestmentAnalysis } from "@/lib/types";
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

interface Props {
  data: InvestmentAnalysis;
}

const verdictConfig = {
  strong_investment: { label: "Strong Investment", color: "bg-green-100 text-green-800 border-green-200", icon: "text-green-500" },
  moderate_investment: { label: "Moderate Investment", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "text-blue-500" },
  marginal: { label: "Marginal", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "text-yellow-500" },
  negative_cash_flow: { label: "Negative Cash Flow", color: "bg-red-100 text-red-800 border-red-200", icon: "text-red-500" },
};

const fmt = (n: number) => "$" + Math.round(Math.abs(n)).toLocaleString("en-US");
const fmtSigned = (n: number) => (n < 0 ? "-" : "") + fmt(n);

export default function InvestmentAnalysisCard({ data }: Props) {
  const [showAllYears, setShowAllYears] = useState(false);
  const v = verdictConfig[data.verdict];

  const opex = data.monthlyOperatingExpenses;
  const totalOpex = opex.propertyManagement + opex.vacancy + opex.capexReserve +
    opex.propertyTax + opex.insurance + opex.hoa + opex.maintenance;

  const chartData = data.projections.map((p) => ({
    year: `Yr ${p.year}`,
    equity: p.equity,
    cashFlow: p.cumulativeCashFlow,
    totalReturn: p.totalReturn,
  }));

  return (
    <div className="space-y-6">
      {/* Verdict Banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${v.color}`}>
        <div className={`flex-shrink-0 mt-0.5 ${v.icon}`}>
          {data.verdict === "strong_investment" && (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {data.verdict === "moderate_investment" && (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )}
          {data.verdict === "marginal" && (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          )}
          {data.verdict === "negative_cash_flow" && (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div>
          <p className="font-semibold">{v.label}</p>
          <p className="text-sm mt-0.5 opacity-90">{data.verdictExplanation}</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricBox
          label="Monthly Cash Flow"
          value={fmtSigned(data.monthlyCashFlow)}
          sub="/mo"
          positive={data.monthlyCashFlow >= 0}
        />
        <MetricBox
          label="Cap Rate"
          value={`${data.capRate.toFixed(1)}%`}
          sub={data.capRate >= 5 ? "Good" : data.capRate >= 3 ? "Moderate" : "Low"}
          positive={data.capRate >= 5}
        />
        <MetricBox
          label="Cash-on-Cash"
          value={`${data.cashOnCashReturn.toFixed(1)}%`}
          sub="annual"
          positive={data.cashOnCashReturn >= 4}
        />
        <MetricBox
          label="Rent-to-Price"
          value={`${data.rentToPrice.toFixed(2)}%`}
          sub={data.rentToPrice >= 1 ? "Meets 1% rule" : "Below 1% rule"}
          positive={data.rentToPrice >= 1}
        />
      </div>

      {/* Monthly Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Cash Flow Breakdown</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <FlowLine label="Gross Rent" value={data.monthlyGrossRent} isIncome />
          {data.rentSource === "auto_estimate" && (
            <p className="text-xs text-gray-400 ml-4">Auto-estimated from area data</p>
          )}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Operating Expenses</p>
            <FlowLine label="Property Management" value={-opex.propertyManagement} />
            <FlowLine label="Vacancy Reserve" value={-opex.vacancy} />
            <FlowLine label="CapEx Reserve" value={-opex.capexReserve} />
            <FlowLine label="Property Tax" value={-opex.propertyTax} />
            <FlowLine label="Insurance" value={-opex.insurance} />
            {opex.hoa > 0 && <FlowLine label="HOA" value={-opex.hoa} />}
            <FlowLine label="Maintenance" value={-opex.maintenance} />
          </div>
          <div className="border-t border-gray-200 pt-2">
            <FlowLine label="Net Operating Income (NOI)" value={data.monthlyNOI} bold />
          </div>
          <div className="border-t border-gray-200 pt-2">
            <FlowLine label="Mortgage Payment (P&I)" value={-(data.monthlyNOI - data.monthlyCashFlow)} />
          </div>
          <div className="border-t-2 border-gray-300 pt-2">
            <FlowLine label="Monthly Cash Flow" value={data.monthlyCashFlow} bold isResult />
          </div>
        </div>
      </div>

      {/* 10-Year Projection Chart */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">10-Year Investment Projection</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`}
              />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip
                formatter={(value: any, name: any) => [
                  fmtSigned(Number(value) || 0),
                  name === "equity" ? "Equity" : name === "cashFlow" ? "Cumulative Cash Flow" : "Total Return",
                ]}
              />
              <Legend />
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0071e3" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="equity"
                name="Equity"
                fill="url(#equityGrad)"
                stroke="#0071e3"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="cashFlow"
                name="Cumulative Cash Flow"
                stroke="#34c759"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="totalReturn"
                name="Total Return"
                stroke="#af52de"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-Year Table */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Year-by-Year Projections</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 font-medium text-gray-500">Year</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Property Value</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Equity</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Annual Cash Flow</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Cumulative CF</th>
                <th className="text-right py-2 pl-3 font-medium text-gray-500">Total Return</th>
              </tr>
            </thead>
            <tbody>
              {(showAllYears ? data.projections : data.projections.filter(p => [1, 3, 5, 7, 10].includes(p.year))).map((p) => (
                <tr key={p.year} className="border-b border-gray-100">
                  <td className="py-2 pr-3 text-gray-700">{p.year}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{fmt(p.propertyValue)}</td>
                  <td className="py-2 px-3 text-right text-blue-600">{fmt(p.equity)}</td>
                  <td className={`py-2 px-3 text-right ${p.annualCashFlow >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmtSigned(p.annualCashFlow)}
                  </td>
                  <td className={`py-2 px-3 text-right ${p.cumulativeCashFlow >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmtSigned(p.cumulativeCashFlow)}
                  </td>
                  <td className="py-2 pl-3 text-right font-medium text-purple-600">
                    {p.totalReturnPercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!showAllYears && (
            <button
              onClick={() => setShowAllYears(true)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Show all years
            </button>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Purchase Price</p>
          <p className="font-medium text-gray-900">{fmt(data.purchasePrice)}</p>
        </div>
        <div>
          <p className="text-gray-500">Cash Invested</p>
          <p className="font-medium text-gray-900">{fmt(data.totalCashInvested)}</p>
        </div>
        <div>
          <p className="text-gray-500">Gross Rent Multiplier</p>
          <p className="font-medium text-gray-900">{data.grossRentMultiplier.toFixed(1)}x</p>
        </div>
      </div>

      {/* Assumptions */}
      <p className="text-xs text-gray-400">
        Assumes 3% annual appreciation, 3% annual rent growth, closing costs at 3% of purchase price, 1% annual maintenance.
      </p>
    </div>
  );
}

function MetricBox({ label, value, sub, positive }: { label: string; value: string; sub: string; positive: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${positive ? "text-green-600" : "text-red-500"}`}>{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function FlowLine({ label, value, bold, isIncome, isResult }: {
  label: string;
  value: number;
  bold?: boolean;
  isIncome?: boolean;
  isResult?: boolean;
}) {
  const color = isResult
    ? value >= 0 ? "text-green-700" : "text-red-600"
    : isIncome
      ? "text-green-600"
      : value < 0
        ? "text-gray-600"
        : "text-gray-800";
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-gray-600">{label}</span>
      <span className={color}>{fmtSigned(value)}</span>
    </div>
  );
}
