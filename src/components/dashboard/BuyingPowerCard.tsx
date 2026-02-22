"use client";

import Link from "next/link";

interface Props {
  latestMaxPrice: number | null;
  latestMonthlyPayment: number | null;
  rateDelta: number | null;
  currentRate: number | null;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function BuyingPowerCard({ latestMaxPrice, latestMonthlyPayment, rateDelta, currentRate }: Props) {
  if (latestMaxPrice == null) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Your Buying Power</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">Run your first analysis to see your buying power</p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Analysis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Your Buying Power</h3>
        </div>
        <Link href="/analyze" className="text-xs text-blue-600 hover:text-blue-800">
          Re-analyze
        </Link>
      </div>

      <p className="text-xs text-gray-400 mb-4">Based on your latest analysis</p>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500">Max Affordable Price</p>
          <p className="text-2xl font-bold text-gray-900">{fmt(latestMaxPrice)}</p>
        </div>

        {latestMonthlyPayment != null && (
          <div>
            <p className="text-xs text-gray-500">Est. Monthly Payment</p>
            <p className="text-lg font-semibold text-gray-700">{fmt(latestMonthlyPayment)}/mo</p>
          </div>
        )}

        {rateDelta != null && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                rateDelta <= 0
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {rateDelta <= 0 ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {Math.abs(rateDelta).toFixed(2)}%
            </span>
            <span className="text-xs text-gray-500">
              Rates {rateDelta <= 0 ? "down" : "up"} since your last analysis
              {currentRate != null && ` (now ${currentRate.toFixed(2)}%)`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
