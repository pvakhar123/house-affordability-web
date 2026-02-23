"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BuyingPowerCard from "@/components/dashboard/BuyingPowerCard";
import UsageTierCard from "@/components/dashboard/UsageTierCard";
import RateWatchCard from "@/components/dashboard/RateWatchCard";
import AffordabilityTrendChart from "@/components/dashboard/AffordabilityTrendChart";
import DashboardReportsList from "@/components/dashboard/DashboardReportsList";
import DashboardRecommendationsCard from "@/components/dashboard/DashboardRecommendationsCard";
import ChatInterface from "@/components/ChatInterface";
import type { FinalReport } from "@/lib/types";
import type { UsageStatus } from "@/lib/tier";

interface DashboardData {
  user: { name: string; tier: "free" | "pro"; memberSince: string };
  usage: UsageStatus | null;
  rates: {
    current30yr: number | null;
    current15yr: number | null;
    history30yr: { date: string; value: number }[];
  };
  reports: {
    id: string;
    name: string;
    savedAt: string;
    maxPrice: number | null;
    monthlyPayment: number | null;
    location: string | null;
  }[];
  buyingPower: {
    latestMaxPrice: number | null;
    latestMonthlyPayment: number | null;
    rateDelta: number | null;
    currentRate: number | null;
  };
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-40 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function buildInsightText(data: DashboardData | null): { headline: string; icon?: string } | null {
  if (!data) return null;
  const { buyingPower, reports } = data;
  const delta = buyingPower.rateDelta;
  const maxPrice = buyingPower.latestMaxPrice;

  // Rate dropped significantly
  if (delta != null && delta <= -0.15 && maxPrice) {
    const gain = Math.round(maxPrice * Math.abs(delta) * 0.1);
    return { headline: `Rates dropped ${Math.abs(delta).toFixed(2)}% — your buying power is up ~${fmt$(gain)}`, icon: "trending-up" };
  }

  // Rate rose significantly
  if (delta != null && delta >= 0.15) {
    return { headline: `Rates rose ${delta.toFixed(2)}% since your last analysis — consider re-running`, icon: "trending-down" };
  }

  // Stale analysis
  if (reports.length > 0) {
    const days = Math.floor((Date.now() - new Date(reports[0].savedAt).getTime()) / 86_400_000);
    if (days >= 14) {
      return { headline: `It's been ${days} days — market conditions may have changed`, icon: "clock" };
    }
  }

  // Has reports with location
  if (reports.length > 0 && reports[0].location && maxPrice) {
    return { headline: `Tracking ${reports[0].location} — max budget ${fmt$(maxPrice)}`, icon: "map" };
  }

  // No reports
  if (reports.length === 0) {
    return { headline: "Run your first analysis to get started", icon: "sparkle" };
  }

  return null;
}

function ChatPlaceholder() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full items-center justify-center px-6">
      <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
      <p className="text-sm font-medium text-gray-600 mb-1">AI Chat Assistant</p>
      <p className="text-xs text-gray-400 text-center mb-3">Run an analysis to unlock chat with AI-powered calculators</p>
      <Link
        href="/analyze"
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Start Analysis
      </Link>
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-500">Loading your analysis...</p>
    </div>
  );
}

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>();

  // Chat report state
  const [chatReport, setChatReport] = useState<FinalReport | null>(null);
  const [chatLocation, setChatLocation] = useState<string | undefined>();
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgrade") === "success") {
      setShowUpgradeBanner(true);
    }
  }, [searchParams]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboard();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, fetchDashboard]);

  // Fetch the full report for chat once we know the latest report ID
  useEffect(() => {
    const latestId = data?.reports[0]?.id;
    if (!latestId || chatReport || chatLoading) return;

    setChatLoading(true);
    fetch(`/api/saved-reports/${latestId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result) {
          setChatReport(result.report);
          setChatLocation(result.userLocation ?? undefined);
        }
      })
      .catch(() => {})
      .finally(() => setChatLoading(false));
  }, [data?.reports, chatReport, chatLoading]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return <Skeleton />;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your dashboard</h2>
          <p className="text-sm text-gray-500">Sign in with Google to access your saved reports and dashboard.</p>
        </div>
      </div>
    );
  }

  const hasReports = (data?.reports.length ?? 0) > 0;

  return (
    <>
      <div className="min-h-screen bg-gray-50" style={{ marginRight: hasReports ? "clamp(0px, calc(100vw - 1280px + 400px), 400px)" : undefined }}>
        {/* Page header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              {(() => {
                const insight = buildInsightText(data);
                if (insight) {
                  return (
                    <>
                      <h1 className="text-lg font-bold text-gray-900">{insight.headline}</h1>
                      {data?.user.name && (
                        <p className="text-xs text-gray-400 mt-0.5">Welcome back, {data.user.name.split(" ")[0]}</p>
                      )}
                    </>
                  );
                }
                return (
                  <>
                    <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                    {data?.user.name && (
                      <p className="text-sm text-gray-500">Welcome back, {data.user.name.split(" ")[0]}</p>
                    )}
                  </>
                );
              })()}
            </div>
            <a
              href="/analyze"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Analysis
            </a>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          {showUpgradeBanner && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-800 font-medium">
                  Welcome to Pro! Your upgrade is active.
                </p>
              </div>
              <button onClick={() => setShowUpgradeBanner(false)} className="text-green-600 hover:text-green-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Row 1: Buying Power + Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BuyingPowerCard
              latestMaxPrice={data?.buyingPower.latestMaxPrice ?? null}
              latestMonthlyPayment={data?.buyingPower.latestMonthlyPayment ?? null}
              rateDelta={data?.buyingPower.rateDelta ?? null}
              currentRate={data?.buyingPower.currentRate ?? null}
            />
            <UsageTierCard
              usage={data?.usage ?? null}
              tier={data?.user.tier ?? "free"}
            />
          </div>

          {/* Row 2: Recommendations & Quick Actions */}
          {data && hasReports && (
            <DashboardRecommendationsCard
              buyingPower={data.buyingPower}
              latestReportSavedAt={data.reports[0]?.savedAt ?? null}
              onChatPrompt={(prompt) => setChatPrompt(prompt)}
            />
          )}

          {/* Row 3: Rate Watch + Affordability Trend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RateWatchCard
              current30yr={data?.rates.current30yr ?? null}
              current15yr={data?.rates.current15yr ?? null}
              history30yr={data?.rates.history30yr ?? []}
            />
            <AffordabilityTrendChart
              reports={data?.reports ?? []}
            />
          </div>

          {/* Row 4: Saved Reports */}
          <DashboardReportsList
            reports={data?.reports ?? []}
            onRefresh={fetchDashboard}
          />

          {/* Chat - below content on smaller screens */}
          <div className="block xl:hidden" style={{ height: "500px" }}>
            {chatLoading ? (
              <ChatLoading />
            ) : chatReport ? (
              <ChatInterface report={chatReport} userLocation={chatLocation} initialPrompt={chatPrompt} reportId={data?.reports[0]?.id} />
            ) : (
              <ChatPlaceholder />
            )}
          </div>
        </div>
      </div>

      {/* Chat - fixed right column on xl+ */}
      <div
        style={{ zIndex: 30 }}
        className="fixed right-0 top-14 bottom-0 w-[390px] p-4 pl-0 max-xl:hidden"
      >
        {chatLoading ? (
          <ChatLoading />
        ) : chatReport ? (
          <ChatInterface report={chatReport} userLocation={chatLocation} initialPrompt={chatPrompt} reportId={data?.reports[0]?.id} />
        ) : (
          <ChatPlaceholder />
        )}
      </div>
    </>
  );
}
