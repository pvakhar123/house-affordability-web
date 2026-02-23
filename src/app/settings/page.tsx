"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import type { UsageStatus } from "@/lib/tier";

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 100 : Math.min((used / limit) * 100, 100);
  const isHigh = !isUnlimited && pct > 70;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {isUnlimited ? `${used} used` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? "bg-amber-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.usage) setUsage(data.usage); })
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, [status]);

  async function handleManageBilling() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingError(data.error || "Could not open billing portal. Please try again.");
    } catch {
      setBillingError("Network error. Please try again.");
    } finally {
      setBillingLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Sign in to view settings.</p>
      </div>
    );
  }

  const isPro = session.user.tier === "pro";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>

        {/* Account */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Account</h2>
          <div className="flex items-center gap-4">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-12 h-12 rounded-full border border-gray-200" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-medium">
                {session.user.name?.[0] || "?"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{session.user.name}</p>
              <p className="text-sm text-gray-500">{session.user.email}</p>
            </div>
            <span className={`ml-auto inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${
              isPro ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}>
              {isPro ? "PRO" : "FREE"}
            </span>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Usage</h2>
          {usageLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-2 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : usage ? (
            <div className="space-y-4">
              <UsageBar label="Analyses" used={usage.analyze.used} limit={usage.analyze.limit} />
              <UsageBar label="Chat messages" used={usage.chat.used} limit={usage.chat.limit} />
              <UsageBar label="Saved homes" used={usage.savedReports.used} limit={usage.savedReports.limit} />
              <p className="text-xs text-gray-400 mt-2">
                {isPro ? "Resets monthly for analyses, daily for chat." : "Upgrade to Pro for higher limits."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Could not load usage data.</p>
          )}
        </div>

        {/* Billing */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Billing</h2>
          {isPro ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                You&apos;re on the <strong>Pro</strong> plan. Manage your subscription, update payment method, or view invoices.
              </p>
              {billingError && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {billingError}
                </div>
              )}
              <button
                onClick={handleManageBilling}
                disabled={billingLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                {billingLoading ? "Opening..." : "Manage Subscription"}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                You&apos;re on the <strong>Free</strong> plan. Upgrade to Pro for unlimited analyses and chat.
              </p>
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Upgrade to Pro
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
