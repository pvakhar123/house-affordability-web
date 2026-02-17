import type { RecommendationsResult } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function RecommendationsCard({ data }: { data: RecommendationsResult }) {
  return (
    <div>
      {/* Savings Strategies */}
      {data.savingsStrategies?.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Savings Strategies</p>
          <div className="space-y-2">
            {data.savingsStrategies.map((strategy, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">{strategy.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    strategy.difficulty === "easy"
                      ? "bg-green-100 text-green-700"
                      : strategy.difficulty === "moderate"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                  }`}>
                    {strategy.difficulty}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closing Costs */}
      {data.closingCostEstimate && data.closingCostEstimate.lowEstimate > 0 && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm font-medium text-amber-800 mb-1">Estimated Closing Costs</p>
          <p className="text-lg font-bold text-amber-900">
            {fmt(data.closingCostEstimate.lowEstimate)} - {fmt(data.closingCostEstimate.highEstimate)}
          </p>
        </div>
      )}

      {/* General Advice */}
      {data.generalAdvice?.length > 0 && (
        <div className="mt-4">
          <ul className="space-y-1">
            {data.generalAdvice.map((advice, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">&#8226;</span>
                {advice}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
