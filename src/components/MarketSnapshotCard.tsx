import type { MarketDataResult } from "@/lib/types";
import HistoricalPriceChart from "./HistoricalPriceChart";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function MarketSnapshotCard({ data, satelliteUrl }: { data: MarketDataResult; satelliteUrl?: string | null }) {
  const { mortgageRates: r, medianHomePrices: p, inflationData: inf } = data;
  const isFallback = r.source.includes("fallback");

  return (
    <div>
      {isFallback && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-800">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <span>Live rate data unavailable. Using estimated rates — actual rates may differ.</span>
        </div>
      )}
      {satelliteUrl && (
        <div className="mb-4 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={satelliteUrl}
            alt="Satellite view of the area"
            className="w-full h-40 object-cover"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500">30-Year Fixed</p>
          <p className="text-xl font-semibold text-gray-900">{r.thirtyYearFixed}%</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500">15-Year Fixed</p>
          <p className="text-xl font-semibold text-gray-900">{r.fifteenYearFixed}%</p>
        </div>
      </div>

      {data.historicalData && data.historicalData.medianHomePrices.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            10-Year Price & Rate Trends
            {data.historicalData.localLabel && (
              <span className="text-emerald-600"> — {data.historicalData.localLabel} vs National</span>
            )}
          </p>
          <HistoricalPriceChart data={data.historicalData} />
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">National Median Price</span>
          <span className="font-semibold">{fmt(p.national)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">New Construction Median</span>
          <span className="font-semibold">{fmt(p.nationalNew)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Federal Funds Rate</span>
          <span className="font-semibold">{r.federalFundsRate}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Shelter Inflation</span>
          <span className="font-semibold">{inf.shelterInflationRate}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">General Inflation</span>
          <span className="font-semibold">{inf.generalInflationRate}%</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Source: {r.source} | As of {r.dataDate}
      </p>
    </div>
  );
}
