"use client";

import { useState } from "react";
import type { FinalReport } from "@/lib/types";
import AffordabilityCard from "./AffordabilityCard";
import MarketSnapshotCard from "./MarketSnapshotCard";
import RiskAssessmentCard from "./RiskAssessmentCard";
import RecommendationsCard from "./RecommendationsCard";
import LoanProgramsCard from "./LoanProgramsCard";
import AmortizationTable from "./AmortizationTable";
import ChatInterface from "./ChatInterface";
import ReportActions from "./ReportActions";
import AISummaryCard from "./AISummaryCard";
import PropertyAffordabilityCard from "./PropertyAffordabilityCard";
import RentVsBuyCard from "./RentVsBuyCard";
import MatchingPropertiesCard from "./MatchingPropertiesCard";
import PreApprovalReadinessCard from "./PreApprovalReadinessCard";
import NeighborhoodInfoCard from "./NeighborhoodInfoCard";
import BudgetSimulatorCard from "./BudgetSimulatorCard";

interface Props {
  report: FinalReport;
  onReset: () => void;
  summaryLoading?: boolean;
  userLocation?: string;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function SummaryHero({ report }: { report: FinalReport }) {
  const a = report.affordability;
  const m = report.marketSnapshot;
  const r = report.riskAssessment;
  const mp = a.monthlyPayment;

  const riskStyle: Record<string, { bg: string; text: string; dot: string }> = {
    low: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    moderate: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
    high: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    very_high: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-600" },
  };
  const risk = riskStyle[r.overallRiskLevel] ?? riskStyle.moderate;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      <div className="p-6 sm:p-8">
        {/* Key numbers row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Max Price</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-900">{fmt(a.maxHomePrice)}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Max Loan Amount</p>
            <p className="text-xl sm:text-2xl font-bold text-green-900">{fmt(a.loanAmount)}</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-xl">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">Monthly</p>
            <p className="text-xl sm:text-2xl font-bold text-indigo-900">{fmt(mp.totalMonthly)}</p>
          </div>
          <div className={`text-center p-4 rounded-xl ${risk.bg}`}>
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${risk.text}`}>Risk</p>
            <div className="flex items-center justify-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${risk.dot}`} />
              <p className={`text-xl sm:text-2xl font-bold ${risk.text}`}>
                {r.overallRiskLevel.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 justify-center">
          <span>Down: <strong className="text-gray-900">{fmt(a.downPaymentAmount)}</strong> ({a.downPaymentPercent}%)</span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>Loan: <strong className="text-gray-900">{fmt(a.loanAmount)}</strong></span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>30yr Rate: <strong className="text-gray-900">{m.mortgageRates.thirtyYearFixed}%</strong></span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span>DTI: <strong className="text-gray-900">{a.dtiAnalysis.backEndRatio}%</strong> ({a.dtiAnalysis.backEndStatus})</span>
        </div>
      </div>
    </div>
  );
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

export default function ResultsDashboard({ report, onReset, summaryLoading, userLocation }: Props) {
  const hasCore = report.affordability && report.riskAssessment && report.recommendations;
  const hasSummary = !!report.summary && !summaryLoading;

  return (
    <>
      {/* Main content */}
      <div className="space-y-6" style={{ marginRight: "clamp(0px, calc(100vw - 1280px + 400px), 400px)" }}>
        {/* Header */}
        <StreamFadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Affordability Report</h2>
              {report.generatedAt && (
                <p className="text-sm text-gray-500">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              New Analysis
            </button>
          </div>
        </StreamFadeIn>

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

        {/* Summary Hero */}
        {hasCore && (
          <StreamFadeIn delay={report.propertyAnalysis ? 200 : 100}>
            <SummaryHero report={report} />
          </StreamFadeIn>
        )}

        {/* Data Cards */}
        {hasCore && (
          <div className="space-y-4">
            <StreamFadeIn delay={200}>
              <ExpandableSection title="Affordability Details" defaultOpen>
                <AffordabilityCard data={report.affordability} />
              </ExpandableSection>
            </StreamFadeIn>

            <StreamFadeIn delay={250}>
              <ExpandableSection title="Budget Simulator">
                <BudgetSimulatorCard
                  affordability={report.affordability}
                  marketSnapshot={report.marketSnapshot}
                />
              </ExpandableSection>
            </StreamFadeIn>

            {report.preApprovalReadiness && (
              <StreamFadeIn delay={300}>
                <ExpandableSection title="Pre-Approval Readiness" defaultOpen>
                  <PreApprovalReadinessCard data={report.preApprovalReadiness} />
                </ExpandableSection>
              </StreamFadeIn>
            )}

            <StreamFadeIn delay={350}>
              <ExpandableSection title="Recommendations" defaultOpen>
                <RecommendationsCard data={report.recommendations} />
              </ExpandableSection>
            </StreamFadeIn>

            <StreamFadeIn delay={400}>
              <ExpandableSection title="Market Snapshot">
                <MarketSnapshotCard data={report.marketSnapshot} />
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
        style={{ zIndex: 40 }}
        className="fixed right-0 top-0 bottom-0 w-[390px] p-4 pl-0 max-xl:hidden"
      >
        <ChatInterface report={report} userLocation={userLocation} />
      </div>
    </>
  );
}
