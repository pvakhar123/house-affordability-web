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

interface Props {
  report: FinalReport;
  onReset: () => void;
  summaryLoading?: boolean;
  userLocation?: string;
  traceId?: string;
}

function ExpandableSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          open ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
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
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <button className="w-full flex items-center justify-between px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900">AI Detailed Analysis</h3>
        <div className="flex items-center gap-2 text-sm text-indigo-500">
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

export default function ResultsDashboard({ report, onReset, summaryLoading, userLocation, traceId }: Props) {
  const hasCore = report.affordability && report.riskAssessment && report.recommendations;
  const hasSummary = !!report.summary && !summaryLoading;
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);

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

  return (
    <>
      {/* Main content */}
      <div className="space-y-6" style={{ marginRight: "clamp(0px, calc(100vw - 1280px + 400px), 400px)" }}>
        {/* Hero Banner */}
        <StreamFadeIn>
          <div className="relative rounded-xl overflow-hidden shadow-sm h-44 sm:h-52 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900">
            {/* Subtle pattern when no image */}
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
            {/* Gradient overlay */}
            <div className={`absolute inset-0 ${heroImage ? "bg-gradient-to-t from-black/70 via-black/30 to-transparent" : "bg-gradient-to-t from-black/40 to-transparent"}`} />
            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 flex items-end justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
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
                className="px-4 py-2 text-sm font-medium text-white bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors border border-white/30 flex-shrink-0"
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

        {/* Property Analysis (when a specific property was analyzed) — show first */}
        {report.propertyAnalysis && hasCore && (
          <StreamFadeIn delay={100}>
            <PropertyAffordabilityCard
              data={report.propertyAnalysis}
              affordability={report.affordability}
            />
          </StreamFadeIn>
        )}

        {/* Affordability Overview */}
        {hasCore && (
          <StreamFadeIn delay={report.propertyAnalysis ? 200 : 100}>
            <AffordabilityCard
              data={report.affordability}
              risk={report.riskAssessment}
              mortgageRate={report.marketSnapshot.mortgageRates.thirtyYearFixed}
            />
          </StreamFadeIn>
        )}

        {/* Data Cards */}
        {hasCore && (
          <div className="space-y-4">

            {report.investmentAnalysis && (
              <StreamFadeIn delay={300}>
                <ExpandableSection title="Investment Property Analysis" defaultOpen>
                  <InvestmentAnalysisCard data={report.investmentAnalysis} />
                </ExpandableSection>
              </StreamFadeIn>
            )}

            <StreamFadeIn delay={report.investmentAnalysis ? 350 : 300}>
              <ExpandableSection title="Financial Readiness & Simulator" defaultOpen>
                <BudgetSimulatorCard
                  affordability={report.affordability}
                  marketSnapshot={report.marketSnapshot}
                  recommendations={report.recommendations}
                  preApprovalReadiness={report.preApprovalReadiness}
                />
              </ExpandableSection>
            </StreamFadeIn>

            <StreamFadeIn delay={report.investmentAnalysis ? 450 : 400}>
              <ExpandableSection title="Market Snapshot">
                <MarketSnapshotCard data={report.marketSnapshot} satelliteUrl={satelliteUrl} />
              </ExpandableSection>
            </StreamFadeIn>

            {report.neighborhoodInfo && (
              <StreamFadeIn delay={420}>
                <ExpandableSection title="Neighborhood Info">
                  <NeighborhoodInfoCard data={report.neighborhoodInfo} />
                </ExpandableSection>
              </StreamFadeIn>
            )}

            <StreamFadeIn delay={450}>
              <ExpandableSection title="Risk Assessment">
                <RiskAssessmentCard data={report.riskAssessment} />
              </ExpandableSection>
            </StreamFadeIn>

            {report.rentVsBuy && (
              <StreamFadeIn delay={500}>
                <ExpandableSection title="Rent vs. Buy Analysis">
                  <RentVsBuyCard data={report.rentVsBuy} />
                </ExpandableSection>
              </StreamFadeIn>
            )}

            {report.recommendations.loanOptions?.length > 0 && (
              <StreamFadeIn delay={550}>
                <ExpandableSection title="Loan Programs">
                  <LoanProgramsCard data={report.recommendations.loanOptions} />
                </ExpandableSection>
              </StreamFadeIn>
            )}

            <StreamFadeIn delay={600}>
              <ExpandableSection title="5-Year Equity Buildup">
                <AmortizationTable data={report.affordability.amortizationSummary} />
              </ExpandableSection>
            </StreamFadeIn>
          </div>
        )}

        {/* Matching Properties */}
        {hasCore && userLocation && (
          <StreamFadeIn delay={650}>
            <MatchingPropertiesCard
              affordability={report.affordability}
              marketData={report.marketSnapshot}
              location={userLocation}
            />
          </StreamFadeIn>
        )}

        {/* AI Detailed Analysis - shows skeleton while loading, then fades in */}
        {summaryLoading && (
          <StreamFadeIn delay={700}>
            <SummaryLoadingSkeleton />
          </StreamFadeIn>
        )}
        {hasSummary && (
          <StreamFadeIn>
            <ExpandableSection title="AI Detailed Analysis">
              <AISummaryCard summary={report.summary} />
            </ExpandableSection>
          </StreamFadeIn>
        )}

        {/* Disclaimers */}
        {report.disclaimers && (
          <StreamFadeIn delay={100}>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Disclaimers</p>
              <ul className="space-y-1">
                {report.disclaimers.map((d, i) => (
                  <li key={i} className="text-xs text-gray-400">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </StreamFadeIn>
        )}

        {/* Chat - below content on smaller screens */}
        <div className="block xl:hidden" style={{ height: "500px" }}>
          <ChatInterface report={report} userLocation={userLocation} />
        </div>
      </div>

      {/* Chat - fixed right column on xl+ */}
      <div
        style={{ zIndex: 30 }}
        className="fixed right-0 top-14 bottom-0 w-[390px] p-4 pl-0 max-xl:hidden"
      >
        <ChatInterface report={report} userLocation={userLocation} />
      </div>
    </>
  );
}
