"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AffordabilityCard from "@/components/AffordabilityCard";
import MarketSnapshotCard from "@/components/MarketSnapshotCard";
import RiskAssessmentCard from "@/components/RiskAssessmentCard";
import LoanProgramsCard from "@/components/LoanProgramsCard";
import AmortizationTable from "@/components/AmortizationTable";
import PropertyAffordabilityCard from "@/components/PropertyAffordabilityCard";
import RentVsBuyCard from "@/components/RentVsBuyCard";
import MatchingPropertiesCard from "@/components/MatchingPropertiesCard";
import NeighborhoodInfoCard from "@/components/NeighborhoodInfoCard";
import BudgetSimulatorCard from "@/components/BudgetSimulatorCard";
import InvestmentAnalysisCard from "@/components/InvestmentAnalysisCard";
import AISummaryCard from "@/components/AISummaryCard";
import ChatInterface from "@/components/ChatInterface";
import type { FinalReport } from "@/lib/types";

interface DashboardData {
  user: { name: string; tier: "free" | "pro"; memberSince: string };
  rates: {
    current30yr: number | null;
    current15yr: number | null;
  };
  reports: {
    id: string;
    name: string;
    savedAt: string;
    maxPrice: number | null;
    monthlyPayment: number | null;
    location: string | null;
    rateAtAnalysis: number | null;
  }[];
  buyingPower: {
    latestMaxPrice: number | null;
    latestMonthlyPayment: number | null;
    rateDelta: number | null;
    currentRate: number | null;
  };
}

// ── Shared UI utilities ─────────────────────────────────

function ExpandableSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${open ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

// ── Home Switcher Dropdown ──────────────────────────────

function HomeSwitcher({ homes, activeId, onSwitch }: {
  homes: DashboardData["reports"];
  activeId: string | null;
  onSwitch: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const active = homes.find((h) => h.id === activeId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm max-w-[280px]"
      >
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <span className="truncate">{active?.location || active?.name || "Select home"}</span>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
          {homes.map((home) => {
            const isActive = home.id === activeId;
            const days = Math.floor((Date.now() - new Date(home.savedAt).getTime()) / 86_400_000);
            const timeLabel = days === 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days} days ago` : days < 30 ? `${Math.floor(days / 7)}w ago` : new Date(home.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <button
                key={home.id}
                onClick={() => { onSwitch(home.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : "text-gray-900"}`}>
                    {home.location || home.name}
                  </p>
                  <p className="text-xs text-gray-400">{timeLabel}</p>
                </div>
                {isActive && (
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <a href="/analyze" className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Analysis
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Loading / Empty states ──────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-44 bg-gray-200 rounded-xl animate-pulse mb-4" />
        <div className="space-y-4">
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AnalysisLoading() {
  return (
    <div className="space-y-4">
      <div className="h-44 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
    </div>
  );
}

function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function buildInsightText(data: DashboardData | null): { headline: string } | null {
  if (!data) return null;
  const { buyingPower, reports } = data;
  const delta = buyingPower.rateDelta;
  const maxPrice = buyingPower.latestMaxPrice;

  if (delta != null && delta <= -0.15 && maxPrice) {
    const gain = Math.round(maxPrice * Math.abs(delta) * 0.1);
    return { headline: `Rates dropped ${Math.abs(delta).toFixed(2)}% — your buying power is up ~${fmt$(gain)}` };
  }
  if (delta != null && delta >= 0.15) {
    return { headline: `Rates rose ${delta.toFixed(2)}% since your last analysis — consider re-running` };
  }
  if (reports.length > 0) {
    const days = Math.floor((Date.now() - new Date(reports[0].savedAt).getTime()) / 86_400_000);
    if (days >= 14) return { headline: `It's been ${days} days — market conditions may have changed` };
  }
  if (reports.length > 0 && reports[0].location && maxPrice) {
    return { headline: `Tracking ${reports[0].location} — max budget ${fmt$(maxPrice)}` };
  }
  if (reports.length === 0) return { headline: "Run your first analysis to get started" };
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
      <Link href="/analyze" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
        Start Analysis
      </Link>
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 shadow-sm text-center">
      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">No homes saved yet</h3>
      <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
        Run your first home affordability analysis to see detailed metrics, simulators, and AI-powered insights.
      </p>
      <Link href="/analyze" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Run Your First Analysis
      </Link>
    </div>
  );
}

// ── Hero Banner ─────────────────────────────────────────

function HeroBanner({ report, location }: { report: FinalReport; location?: string }) {
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const displayLocation = report.propertyAnalysis?.property.address || location || "";

  useEffect(() => {
    if (!displayLocation) return;
    fetch(`/api/location-image?location=${encodeURIComponent(displayLocation)}`)
      .then((r) => r.json())
      .then((data) => { if (data.propertyImage) setHeroImage(data.propertyImage); })
      .catch(() => {});
  }, [displayLocation]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-sm h-40 sm:h-48 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900">
      {!heroImage && (
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />
      )}
      {heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImage} alt={displayLocation} className="absolute inset-0 w-full h-full object-cover" onError={() => setHeroImage(null)} />
      )}
      <div className={`absolute inset-0 ${heroImage ? "bg-gradient-to-t from-black/70 via-black/30 to-transparent" : "bg-gradient-to-t from-black/40 to-transparent"}`} />
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
          {displayLocation ? displayLocation : "Home Analysis"}
        </h2>
        {report.generatedAt && (
          <p className="text-sm text-white/80 mt-1">
            Analyzed {new Date(report.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Full Analysis View ──────────────────────────────────

function FullAnalysisView({ report, location }: { report: FinalReport; location?: string }) {
  const hasCore = report.affordability && report.riskAssessment && report.recommendations;
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const displayLocation = report.propertyAnalysis?.property.address || location || "";

  useEffect(() => {
    if (!displayLocation) return;
    fetch(`/api/location-image?location=${encodeURIComponent(displayLocation)}`)
      .then((r) => r.json())
      .then((data) => { if (data.satelliteUrl) setSatelliteUrl(data.satelliteUrl); })
      .catch(() => {});
  }, [displayLocation]);

  if (!hasCore) return null;

  return (
    <div className="space-y-4">
      <HeroBanner report={report} location={location} />

      {report.propertyAnalysis && (
        <PropertyAffordabilityCard data={report.propertyAnalysis} affordability={report.affordability} />
      )}

      <AffordabilityCard
        data={report.affordability}
        risk={report.riskAssessment}
        mortgageRate={report.marketSnapshot.mortgageRates.thirtyYearFixed}
      />

      {report.investmentAnalysis && (
        <ExpandableSection title="Investment Property Analysis" defaultOpen>
          <InvestmentAnalysisCard data={report.investmentAnalysis} />
        </ExpandableSection>
      )}

      <ExpandableSection title="Financial Readiness & Simulator" defaultOpen>
        <BudgetSimulatorCard
          affordability={report.affordability}
          marketSnapshot={report.marketSnapshot}
          recommendations={report.recommendations}
          preApprovalReadiness={report.preApprovalReadiness}
        />
      </ExpandableSection>

      <ExpandableSection title="Market Snapshot">
        <MarketSnapshotCard data={report.marketSnapshot} satelliteUrl={satelliteUrl} />
      </ExpandableSection>

      {report.neighborhoodInfo && (
        <ExpandableSection title="Neighborhood Info">
          <NeighborhoodInfoCard data={report.neighborhoodInfo} />
        </ExpandableSection>
      )}

      <ExpandableSection title="Risk Assessment">
        <RiskAssessmentCard data={report.riskAssessment} />
      </ExpandableSection>

      {report.rentVsBuy && (
        <ExpandableSection title="Rent vs. Buy Analysis">
          <RentVsBuyCard data={report.rentVsBuy} />
        </ExpandableSection>
      )}

      {report.recommendations.loanOptions?.length > 0 && (
        <ExpandableSection title="Loan Programs">
          <LoanProgramsCard data={report.recommendations.loanOptions} />
        </ExpandableSection>
      )}

      <ExpandableSection title="5-Year Equity Buildup">
        <AmortizationTable data={report.affordability.amortizationSummary} />
      </ExpandableSection>

      {location && (
        <MatchingPropertiesCard
          affordability={report.affordability}
          marketData={report.marketSnapshot}
          location={location}
        />
      )}

      {report.summary && (
        <ExpandableSection title="AI Detailed Analysis">
          <AISummaryCard summary={report.summary} />
        </ExpandableSection>
      )}

      {report.disclaimers && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-2">Disclaimers</p>
          <ul className="space-y-1">
            {report.disclaimers.map((d, i) => (
              <li key={i} className="text-xs text-gray-400">{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>();

  // Active home state — single fetch feeds both analysis view AND chat
  const [activeHomeId, setActiveHomeId] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<FinalReport | null>(null);
  const [activeLocation, setActiveLocation] = useState<string | undefined>();
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgrade") === "success") setShowUpgradeBanner(true);
  }, [searchParams]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchDashboard();
    else if (status === "unauthenticated") setLoading(false);
  }, [status, fetchDashboard]);

  // Set initial active home to latest
  useEffect(() => {
    if (data?.reports[0]?.id && !activeHomeId) setActiveHomeId(data.reports[0].id);
  }, [data?.reports, activeHomeId]);

  // Fetch full report when active home changes
  useEffect(() => {
    if (!activeHomeId) return;
    setReportLoading(true);
    setActiveReport(null);
    fetch(`/api/saved-reports/${activeHomeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result) {
          setActiveReport(result.report);
          setActiveLocation(result.userLocation ?? undefined);
        }
      })
      .catch(() => {})
      .finally(() => setReportLoading(false));
  }, [activeHomeId]);

  if (status === "loading" || (status === "authenticated" && loading)) return <Skeleton />;

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your homes</h2>
          <p className="text-sm text-gray-500">Sign in with Google to access your saved home analyses.</p>
        </div>
      </div>
    );
  }

  const hasHomes = (data?.reports.length ?? 0) > 0;
  const activeHomeName = data?.reports.find((r) => r.id === activeHomeId)?.location
    || data?.reports.find((r) => r.id === activeHomeId)?.name;

  return (
    <>
      <div className="min-h-screen bg-gray-50" style={{ marginRight: hasHomes ? "clamp(0px, calc(100vw - 1280px + 400px), 400px)" : undefined }}>
        {/* Page header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {hasHomes && data && (
                <HomeSwitcher
                  homes={data.reports}
                  activeId={activeHomeId}
                  onSwitch={(id) => setActiveHomeId(id)}
                />
              )}
              {!hasHomes && (
                <div>
                  {(() => {
                    const insight = buildInsightText(data);
                    if (insight) return <h1 className="text-lg font-bold text-gray-900">{insight.headline}</h1>;
                    return <h1 className="text-xl font-bold text-gray-900">My Homes</h1>;
                  })()}
                  {data?.user.name && (
                    <p className="text-xs text-gray-400 mt-0.5">Welcome back, {data.user.name.split(" ")[0]}</p>
                  )}
                </div>
              )}
            </div>
            <a
              href="/analyze"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
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
                <p className="text-sm text-green-800 font-medium">Welcome to Pro! Your upgrade is active.</p>
              </div>
              <button onClick={() => setShowUpgradeBanner(false)} className="text-green-600 hover:text-green-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Full analysis view or empty state */}
          {hasHomes ? (
            reportLoading ? (
              <AnalysisLoading />
            ) : activeReport ? (
              <FullAnalysisView report={activeReport} location={activeLocation} />
            ) : null
          ) : (
            <EmptyState />
          )}

          {/* Chat - below content on smaller screens */}
          {hasHomes && (
            <div className="block xl:hidden" style={{ height: "500px" }}>
              {reportLoading ? (
                <ChatLoading />
              ) : activeReport && activeHomeId ? (
                <div className="h-full flex flex-col">
                  <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-t-xl border border-b-0 border-gray-200 truncate">
                    Chatting about: <span className="font-medium text-gray-700">{activeHomeName ?? "Home"}</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ChatInterface key={activeHomeId} report={activeReport} userLocation={activeLocation} initialPrompt={chatPrompt} reportId={activeHomeId} />
                  </div>
                </div>
              ) : (
                <ChatPlaceholder />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat - fixed right column on xl+ */}
      {hasHomes && (
        <div style={{ zIndex: 30 }} className="fixed right-0 top-14 bottom-0 w-[390px] p-4 pl-0 max-xl:hidden flex flex-col">
          {reportLoading ? (
            <ChatLoading />
          ) : activeReport && activeHomeId ? (
            <div className="flex flex-col h-full">
              <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 rounded-t-xl border border-b-0 border-gray-200 truncate">
                Chatting about: <span className="font-medium text-gray-700">{activeHomeName ?? "Home"}</span>
              </div>
              <div className="flex-1 min-h-0">
                <ChatInterface key={activeHomeId} report={activeReport} userLocation={activeLocation} initialPrompt={chatPrompt} reportId={activeHomeId} />
              </div>
            </div>
          ) : (
            <ChatPlaceholder />
          )}
        </div>
      )}
    </>
  );
}
