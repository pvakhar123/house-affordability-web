"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import BuyingPowerCard from "@/components/dashboard/BuyingPowerCard";
import UsageTierCard from "@/components/dashboard/UsageTierCard";
import RateWatchCard from "@/components/dashboard/RateWatchCard";
import AffordabilityTrendChart from "@/components/dashboard/AffordabilityTrendChart";
import DashboardReportsList from "@/components/dashboard/DashboardReportsList";
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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            {data?.user.name && (
              <p className="text-sm text-gray-500">Welcome back, {data.user.name.split(" ")[0]}</p>
            )}
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            data?.user.tier === "pro"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {data?.user.tier === "pro" ? "Pro" : "Free"}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
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

        {/* Row 2: Rate Watch + Affordability Trend */}
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

        {/* Row 3: Saved Reports */}
        <DashboardReportsList
          reports={data?.reports ?? []}
        />
      </div>
    </div>
  );
}
