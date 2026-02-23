"use client";

import type { RentVsBuyReport } from "@/lib/types";

interface Props {
  data: RentVsBuyReport;
}

function fmt(n: number): string {
  return "$" + Math.round(Math.abs(n)).toLocaleString("en-US");
}

const verdictConfig = {
  buy_clearly: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    badge: "bg-green-100 text-green-700",
    label: "Buying Wins",
    icon: (
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  buy_slightly: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    badge: "bg-green-100 text-green-700",
    label: "Slight Edge: Buy",
    icon: (
      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
  toss_up: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    badge: "bg-yellow-100 text-yellow-700",
    label: "Toss-Up",
    icon: (
      <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  rent_better: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-700",
    label: "Renting Wins",
    icon: (
      <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
};

export default function RentVsBuyCard({ data }: Props) {
  const v = verdictConfig[data.verdict];

  return (
    <div className="space-y-5">
      {/* Verdict banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl ${v.bg} ${v.border} border`}>
        {v.icon}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${v.text}`}>{v.label}</span>
            {data.breakEvenYear && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-gray-600">
                Break-even: ~{data.breakEvenYear} {data.breakEvenYear === 1 ? "year" : "years"}
              </span>
            )}
          </div>
          <p className={`text-sm ${v.text} opacity-80`}>{data.verdictExplanation}</p>
        </div>
      </div>

      {/* Monthly comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Current Rent</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(data.currentRent)}<span className="text-sm font-normal text-gray-500">/mo</span></p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl text-center">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Buying Cost</p>
          <p className="text-xl font-semibold text-blue-900">{fmt(data.monthlyBuyCost)}<span className="text-sm font-normal text-blue-500">/mo</span></p>
        </div>
      </div>

      {data.monthlyCostDifference !== 0 && (
        <p className="text-sm text-gray-600 text-center">
          {data.monthlyCostDifference > 0
            ? `Buying costs ${fmt(data.monthlyCostDifference)}/mo more, but you build equity`
            : `Buying is actually ${fmt(data.monthlyCostDifference)}/mo cheaper than renting`}
        </p>
      )}

      {/* 5-year summary */}
      <div className="rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900">5-Year Comparison</h4>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total rent paid</span>
            <span className="font-semibold text-gray-900">{fmt(data.fiveYearRentTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Net cost of buying</span>
            <span className="font-semibold text-gray-900">{fmt(data.fiveYearBuyTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Equity built</span>
            <span className="font-semibold text-green-700">{fmt(data.fiveYearEquity)}</span>
          </div>
          <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
            <span className="font-medium text-gray-700">Net advantage (buying)</span>
            <span className={`font-bold ${data.fiveYearNetAdvantage >= 0 ? "text-green-700" : "text-orange-600"}`}>
              {data.fiveYearNetAdvantage >= 0 ? "+" : "-"}{fmt(data.fiveYearNetAdvantage)}
            </span>
          </div>
        </div>
      </div>

      {/* Year-by-year table */}
      {data.yearByYear.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">Year-by-Year Breakdown</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-4 py-2 text-left font-medium">Year</th>
                  <th className="px-4 py-2 text-right font-medium">Rent Total</th>
                  <th className="px-4 py-2 text-right font-medium">Buy Net Cost</th>
                  <th className="px-4 py-2 text-right font-medium">Equity</th>
                  <th className="px-4 py-2 text-right font-medium">Buy Advantage</th>
                </tr>
              </thead>
              <tbody>
                {data.yearByYear.map((row) => (
                  <tr key={row.year} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-900 font-medium">{row.year}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{fmt(row.rentCumulative)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{fmt(row.buyCumulative)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{fmt(row.equityBuilt)}</td>
                    <td className={`px-4 py-2 text-right font-medium ${row.netBuyAdvantage >= 0 ? "text-green-700" : "text-orange-600"}`}>
                      {row.netBuyAdvantage >= 0 ? "+" : "-"}{fmt(row.netBuyAdvantage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assumptions */}
      <p className="text-xs text-gray-400">
        Assumes 3% annual home appreciation, 3.5% annual rent increase, 1% annual maintenance, 3% closing costs, 6% opportunity cost on down payment.
      </p>
    </div>
  );
}
