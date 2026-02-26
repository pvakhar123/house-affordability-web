"use client";

import { useState, useCallback, useEffect } from "react";
import type { FinalReport } from "@/lib/types";
import AffordabilityCard from "./AffordabilityCard";
import MarketSnapshotCard from "./MarketSnapshotCard";
import RiskAssessmentCard from "./RiskAssessmentCard";
import LoanProgramsCard from "./LoanProgramsCard";
import AmortizationTable from "./AmortizationTable";
import ChatInterface from "./ChatInterface";
import ReportActions from "./ReportActions";
import AISummaryCard from "./AISummaryCard";
import PropertyAffordabilityCard from "./PropertyAffordabilityCard";
import RentVsBuyCard from "./RentVsBuyCard";
import MatchingPropertiesCard from "./MatchingPropertiesCard";
import NeighborhoodInfoCard from "./NeighborhoodInfoCard";
import BudgetSimulatorCard from "./BudgetSimulatorCard";
import InvestmentAnalysisCard from "./InvestmentAnalysisCard";
import ConfidenceBadge from "./ConfidenceBadge";

interface Props {
  report: FinalReport;
  onReset: () => void;
  summaryLoading?: boolean;
  userLocation?: string;
  traceId?: string;
}

function StreamFadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="animate-[streamFadeIn_0.6s_ease-out_both]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SummaryLoadingSkeleton() {
  return (
    <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <button className="w-full flex items-center justify-between px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900">AI Detailed Analysis</h3>
        <div className="flex items-center gap-2 text-sm" style={{ color: "#5856d6" }}>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Writing your personalized report...
        </div>
      </button>
      <div className="px-6 pb-6 space-y-3">
        <div className="h-4 bg-gray-100 rounded-full animate-pulse w-full" />
        <div className="h-4 bg-gray-100 rounded-full animate-pulse w-5/6" />
        <div className="h-4 bg-gray-100 rounded-full animate-pulse w-4/6" />
        <div className="h-4 bg-gray-100 rounded-full animate-pulse w-full" />
        <div className="h-4 bg-gray-100 rounded-full animate-pulse w-3/4" />
      </div>
    </div>
  );
}

function ReportFeedback({ traceId }: { traceId?: string }) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [showThanks, setShowThanks] = useState(false);

  const submit = useCallback((value: "up" | "down") => {
    const next = rating === value ? null : value;
    setRating(next);
    setShowThanks(!!next);
    const entry = { type: "report", rating: next ?? "retracted", traceId, timestamp: new Date().toISOString() };
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
    if (next) setTimeout(() => setShowThanks(false), 2000);
  }, [rating, traceId]);

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <span className="text-sm text-gray-500">Was this report helpful?</span>
      <div className="flex gap-1">
        {(["up", "down"] as const).map((type) => {
          const active = rating === type;
          const isUp = type === "up";
          return (
            <button
              key={type}
              onClick={() => submit(type)}
              className={`p-1.5 rounded-lg transition-colors ${
                active
                  ? isUp
                    ? "text-green-600 bg-green-50"
                    : "text-red-500 bg-red-50"
                  : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
              }`}
              title={isUp ? "Yes, helpful" : "Not helpful"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={isUp ? "" : "rotate-180"}
              >
                <path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
              </svg>
            </button>
          );
        })}
      </div>
      {showThanks && (
        <span className="text-xs text-green-600 animate-[streamFadeIn_0.3s_ease-out_both]">Thanks for your feedback!</span>
      )}
    </div>
  );
}

function AISummarySnippet({ summary }: { summary: string }) {
  const lines = summary.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstParagraph = lines.find(
    (l) => !l.startsWith("#") && !l.startsWith("**") && !/^[-*•]\s/.test(l) && l.length > 40
  ) || lines[0] || "";

  const parts = firstParagraph.split(/(\$[\d,]+(?:\.\d+)?(?:\s*(?:\/mo|per month))?|\d+(?:\.\d+)?%)/g);

  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-100 px-6 py-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">AI Summary</p>
          <p className="text-sm leading-relaxed text-gray-700">
            {parts.map((part, i) =>
              /^\$[\d,]/.test(part) || /^\d+(?:\.\d+)?%$/.test(part) ? (
                <span key={i} className="font-semibold text-indigo-700">{part}</span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Nav Icons ──────────────────────────────────────────
const navIcons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  investment: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  market: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  neighborhood: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  risk: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  "rent-vs-buy": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  ),
  loans: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  ),
  equity: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  ),
  properties: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  ),
  ai: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
};

// ── Section card wrapper ──────────────────────────────
function SectionCard({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function ResultsDashboard({ report, onReset, summaryLoading, userLocation, traceId }: Props) {
  const hasCore = report.affordability && report.riskAssessment && report.recommendations;
  const hasSummary = !!report.summary && !summaryLoading;
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("home");

  const displayLocation = report.propertyAnalysis?.property.address || userLocation || "";

  useEffect(() => {
    if (!displayLocation) return;
    fetch(`/api/location-image?location=${encodeURIComponent(displayLocation)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.propertyImage) setHeroImage(data.propertyImage);
        if (data.satelliteUrl) setSatelliteUrl(data.satelliteUrl);
      })
      .catch(() => {});
  }, [displayLocation]);

  // Build nav items dynamically based on available data
  const navItems: { key: string; label: string }[] = [
    { key: "home", label: "Overview" },
    ...(report.investmentAnalysis ? [{ key: "investment", label: "Investment" }] : []),
    { key: "market", label: "Market" },
    ...(report.neighborhoodInfo ? [{ key: "neighborhood", label: "Area" }] : []),
    { key: "risk", label: "Risk" },
    ...(report.rentVsBuy ? [{ key: "rent-vs-buy", label: "Rent vs Buy" }] : []),
    ...(report.recommendations?.loanOptions?.length > 0 ? [{ key: "loans", label: "Loans" }] : []),
    { key: "equity", label: "Equity" },
    ...(userLocation ? [{ key: "properties", label: "Properties" }] : []),
    ...(hasSummary ? [{ key: "ai", label: "AI" }] : []),
  ];

  return (
    <>
      {/* Main content */}
      <div style={{ marginRight: "clamp(0px, calc(100vw - 1280px + 400px), 400px)" }}>

        {/* Mobile horizontal pill tabs (below lg) */}
        <div className="dash-nav-mobile gap-1.5 pb-3 -mx-4 px-4 overflow-x-auto scrollbar-hide mb-4">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeSection === item.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              }`}
            >
              <span className="w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">{navIcons[item.key]}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Desktop: sidebar + content row */}
        <div className="flex gap-6">

          {/* Desktop sidebar nav (lg+) */}
          <nav className="dash-nav-desktop flex-col gap-0.5 sticky top-4 self-start w-40 flex-shrink-0 pt-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeSection === item.key
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                {navIcons[item.key]}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Section content */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* === OVERVIEW (HOME) === */}
            {activeSection === "home" && (
              <>
                {/* Hero Banner */}
                <StreamFadeIn>
                  <div className="relative rounded-2xl overflow-hidden h-44 sm:h-52" style={{ background: "linear-gradient(135deg, #1d1d1f 0%, #0071e3 60%, #5856d6 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                    {!heroImage && (
                      <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                      }} />
                    )}
                    {heroImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroImage}
                        alt={displayLocation}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={() => setHeroImage(null)}
                      />
                    )}
                    <div className={`absolute inset-0 ${heroImage ? "bg-gradient-to-t from-black/70 via-black/30 to-transparent" : "bg-gradient-to-t from-black/40 to-transparent"}`} />
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex items-end justify-between">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-semibold text-white drop-shadow-lg">
                          {displayLocation
                            ? `Report for ${displayLocation}`
                            : "Your Home Research Report"}
                        </h2>
                        {report.generatedAt && (
                          <p className="text-sm text-white/80 mt-1">
                            Generated {new Date(report.generatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={onReset}
                        className="px-4 py-2 text-sm font-medium text-white bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors border border-white/30 flex-shrink-0"
                      >
                        New Analysis
                      </button>
                    </div>
                  </div>
                </StreamFadeIn>

                {/* Report Feedback */}
                {hasCore && (
                  <StreamFadeIn delay={50}>
                    <ReportFeedback traceId={traceId} />
                  </StreamFadeIn>
                )}

                {/* Download / Email Actions */}
                {!summaryLoading && report.generatedAt && (
                  <StreamFadeIn delay={100}>
                    <ReportActions report={report} userLocation={userLocation} />
                  </StreamFadeIn>
                )}

                {/* Property Analysis */}
                {report.propertyAnalysis && hasCore && (
                  <StreamFadeIn delay={100}>
                    <PropertyAffordabilityCard
                      data={report.propertyAnalysis}
                      affordability={report.affordability}
                    />
                  </StreamFadeIn>
                )}

                {/* AI Quick Summary */}
                {hasSummary && (
                  <StreamFadeIn delay={150}>
                    <AISummarySnippet summary={report.summary} />
                  </StreamFadeIn>
                )}
                {summaryLoading && (
                  <StreamFadeIn delay={50}>
                    <div className="rounded-2xl bg-white px-6 py-5 flex items-center gap-3" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-3/4" />
                        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
                      </div>
                    </div>
                  </StreamFadeIn>
                )}

                {/* Affordability Overview */}
                {hasCore && (
                  <StreamFadeIn delay={200}>
                    <AffordabilityCard
                      data={report.affordability}
                      risk={report.riskAssessment}
                      mortgageRate={report.marketSnapshot.mortgageRates.thirtyYearFixed}
                    />
                  </StreamFadeIn>
                )}

                {/* Budget Simulator */}
                {hasCore && (
                  <StreamFadeIn delay={300}>
                    <SectionCard title="Financial Readiness & Simulator">
                      <BudgetSimulatorCard
                        affordability={report.affordability}
                        marketSnapshot={report.marketSnapshot}
                        recommendations={report.recommendations}
                        preApprovalReadiness={report.preApprovalReadiness}
                      />
                    </SectionCard>
                  </StreamFadeIn>
                )}
              </>
            )}

            {/* === INVESTMENT === */}
            {activeSection === "investment" && report.investmentAnalysis && (
              <StreamFadeIn>
                <SectionCard title="Investment Property Analysis">
                  <InvestmentAnalysisCard data={report.investmentAnalysis} />
                </SectionCard>
              </StreamFadeIn>
            )}

            {/* === MARKET === */}
            {activeSection === "market" && (
              <StreamFadeIn>
                <SectionCard title={
                  <span className="flex items-center gap-2">
                    Market Snapshot
                    {report.dataConfidence && <ConfidenceBadge level={report.dataConfidence.rates} />}
                  </span>
                }>
                  <MarketSnapshotCard data={report.marketSnapshot} satelliteUrl={satelliteUrl} />
                </SectionCard>
              </StreamFadeIn>
            )}

            {/* === NEIGHBORHOOD === */}
            {activeSection === "neighborhood" && report.neighborhoodInfo && (
              <StreamFadeIn>
                <SectionCard title="Neighborhood Info">
                  <NeighborhoodInfoCard data={report.neighborhoodInfo} />
                </SectionCard>
              </StreamFadeIn>
            )}

            {/* === RISK === */}
            {activeSection === "risk" && (
              <StreamFadeIn>
                <SectionCard title="Risk Assessment">
                  <RiskAssessmentCard data={report.riskAssessment} />
                </SectionCard>
              </StreamFadeIn>
            )}

            {/* === RENT VS BUY === */}
            {activeSection === "rent-vs-buy" && report.rentVsBuy && (
              <StreamFadeIn>
                <SectionCard title="Rent vs. Buy Analysis">
                  <RentVsBuyCard data={report.rentVsBuy} />
                </SectionCard>
              </StreamFadeIn>
            )}

            {/* === LOANS === */}
            {activeSection === "loans" && report.recommendations.loanOptions?.length > 0 && (
              <StreamFadeIn>
                <SectionCard title="Loan Programs">
                  <LoanProgramsCard data={report.recommendations.loanOptions} />
                </SectionCard>
              </StreamFadeIn>
            )}

            {/* === EQUITY === */}
            {activeSection === "equity" && (
              <StreamFadeIn>
                <SectionCard title="5-Year Equity Buildup">
                  <AmortizationTable data={report.affordability.amortizationSummary} />
                </SectionCard>
              </StreamFadeIn>
            )}

            {/* === PROPERTIES === */}
            {activeSection === "properties" && userLocation && (
              <StreamFadeIn>
                <MatchingPropertiesCard
                  affordability={report.affordability}
                  marketData={report.marketSnapshot}
                  location={userLocation}
                />
              </StreamFadeIn>
            )}

            {/* === AI DETAILED ANALYSIS === */}
            {activeSection === "ai" && hasSummary && (
              <StreamFadeIn>
                <SectionCard title="AI Detailed Analysis">
                  <AISummaryCard summary={report.summary} />
                </SectionCard>
              </StreamFadeIn>
            )}
            {activeSection === "ai" && summaryLoading && (
              <StreamFadeIn>
                <SummaryLoadingSkeleton />
              </StreamFadeIn>
            )}

            {/* Disclaimers (visible on every section) */}
            {report.disclaimers && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-2">Disclaimers</p>
                <ul className="space-y-1">
                  {report.disclaimers.map((d, i) => (
                    <li key={i} className="text-xs text-gray-400">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chat - below content on smaller screens */}
            <div className="block xl:hidden" style={{ height: "500px" }}>
              <ChatInterface report={report} userLocation={userLocation} />
            </div>
          </div>
        </div>
      </div>

      {/* Chat - fixed right column on xl+ */}
      <div
        style={{ zIndex: 30 }}
        className="fixed right-0 top-16 bottom-4 w-[390px] p-4 pl-0 max-xl:hidden"
      >
        <ChatInterface report={report} userLocation={userLocation} />
      </div>
    </>
  );
}
