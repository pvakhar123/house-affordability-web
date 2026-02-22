"use client";

import Link from "next/link";

interface Props {
  buyingPower: {
    latestMaxPrice: number | null;
    rateDelta: number | null;
    currentRate: number | null;
  };
  latestReportSavedAt: string | null;
  onChatPrompt: (prompt: string) => void;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

interface Insight {
  icon: string; // SVG path
  text: string;
  color: "green" | "amber" | "blue";
  action?: { label: string; href?: string; prompt?: string };
}

function buildInsights(
  buyingPower: Props["buyingPower"],
  latestReportSavedAt: string | null,
): Insight[] {
  const insights: Insight[] = [];

  const delta = buyingPower.rateDelta;
  if (delta != null && Math.abs(delta) >= 0.15) {
    const priceDelta = buyingPower.latestMaxPrice
      ? Math.round(buyingPower.latestMaxPrice * Math.abs(delta) * 0.1)
      : null;

    if (delta <= -0.15) {
      insights.push({
        icon: "M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181",
        text: `Rates dropped ${Math.abs(delta).toFixed(2)}%${priceDelta ? ` — your buying power may have increased ~${fmt(priceDelta)}` : ""}. Re-run your analysis to see updated numbers.`,
        color: "green",
        action: { label: "Re-analyze", href: "/analyze" },
      });
    } else {
      insights.push({
        icon: "M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941",
        text: `Rates rose ${delta.toFixed(2)}% since your last analysis. Consider locking in or exploring shorter loan terms.`,
        color: "amber",
        action: { label: "Compare loan terms", prompt: "Compare a 15-year vs 30-year mortgage for my budget at current rates" },
      });
    }
  }

  if (latestReportSavedAt) {
    const days = daysSince(latestReportSavedAt);
    if (days >= 14) {
      insights.push({
        icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
        text: `It's been ${days} days since your last analysis. Market conditions may have changed.`,
        color: "blue",
        action: { label: "Update analysis", href: "/analyze" },
      });
    }
  }

  return insights;
}

const quickActions = [
  { label: "Run a stress test", prompt: "Run a stress test on my mortgage — what happens if rates rise 2%?" },
  { label: "Compare 15yr vs 30yr", prompt: "Compare a 15-year vs 30-year mortgage for my budget" },
  { label: "Rent vs buy analysis", prompt: "Should I rent or buy? Compare the costs over 7 years" },
  { label: "Loan programs", prompt: "What loan programs am I eligible for? Explain FHA, VA, and conventional options" },
];

const colorMap = {
  green: { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600", text: "text-green-800" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", text: "text-amber-800" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", text: "text-blue-800" },
};

export default function DashboardRecommendationsCard({ buyingPower, latestReportSavedAt, onChatPrompt }: Props) {
  const insights = buildInsights(buyingPower, latestReportSavedAt);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900">Insights & Quick Actions</h3>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Data-driven insights */}
        {insights.map((insight, i) => {
          const c = colorMap[insight.color];
          return (
            <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${c.bg} ${c.border} border`}>
              <svg className={`w-5 h-5 ${c.icon} flex-shrink-0 mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={insight.icon} />
              </svg>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${c.text}`}>{insight.text}</p>
                {insight.action && (
                  insight.action.href ? (
                    <Link href={insight.action.href} className={`inline-block mt-1.5 text-xs font-medium ${c.icon} hover:underline`}>
                      {insight.action.label} &rarr;
                    </Link>
                  ) : (
                    <button
                      onClick={() => onChatPrompt(insight.action!.prompt!)}
                      className={`mt-1.5 text-xs font-medium ${c.icon} hover:underline`}
                    >
                      {insight.action.label} &rarr;
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}

        {/* Quick action pills */}
        <div>
          <p className="text-xs text-gray-400 mb-2">{insights.length > 0 ? "Quick actions" : "Ask the AI assistant"}</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => onChatPrompt(action.prompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
