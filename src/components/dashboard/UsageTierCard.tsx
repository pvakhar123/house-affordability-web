"use client";

import Link from "next/link";
import type { UsageStatus } from "@/lib/tier";

interface Props {
  usage: UsageStatus | null;
  tier: "free" | "pro";
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = limit === Infinity || !isFinite(limit);
  const pct = isUnlimited ? Math.min((used / 100) * 100, 100) : Math.min((used / limit) * 100, 100);
  const isHigh = !isUnlimited && used / limit > 0.7;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={isHigh ? "text-amber-600 font-medium" : "text-gray-500"}>
          {used}{isUnlimited ? " used" : ` / ${limit}`}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isHigh ? "bg-amber-500" : "bg-blue-500"
          }`}
          style={{ width: isUnlimited ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function UsageTierCard({ usage, tier }: Props) {
  const showUpgrade = tier === "free" && usage && (
    usage.analyze.used / usage.analyze.limit > 0.7 ||
    usage.chat.used / usage.chat.limit > 0.7 ||
    usage.savedReports.used / usage.savedReports.limit > 0.7
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Plan & Usage</h3>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          tier === "pro"
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-600"
        }`}>
          {tier === "pro" ? "Pro" : "Free"}
        </span>
      </div>

      {usage ? (
        <div className="space-y-3">
          <UsageBar
            label="Analyses"
            used={usage.analyze.used}
            limit={usage.analyze.limit}
          />
          <UsageBar
            label="Chat messages"
            used={usage.chat.used}
            limit={usage.chat.limit}
          />
          <UsageBar
            label="Saved reports"
            used={usage.savedReports.used}
            limit={usage.savedReports.limit}
          />

          {tier === "pro" && (
            <p className="text-xs text-gray-400 pt-1">Unlimited analyses, chat & reports</p>
          )}

          {showUpgrade && (
            <div className="pt-2 border-t border-gray-100">
              <Link
                href="/pricing"
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upgrade to Pro
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Usage data unavailable</p>
      )}
    </div>
  );
}
