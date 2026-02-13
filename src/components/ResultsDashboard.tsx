"use client";

import { useState } from "react";
import type { FinalReport } from "@/lib/types";
import AffordabilityCard from "./AffordabilityCard";
import MarketSnapshotCard from "./MarketSnapshotCard";
import RiskAssessmentCard from "./RiskAssessmentCard";
import RecommendationsCard from "./RecommendationsCard";
import AmortizationTable from "./AmortizationTable";
import ChatInterface from "./ChatInterface";
import ReportActions from "./ReportActions";
import AISummaryCard from "./AISummaryCard";

interface Props {
  report: FinalReport;
  onReset: () => void;
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
            <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Recommended</p>
            <p className="text-xl sm:text-2xl font-bold text-green-900">{fmt(a.recommendedHomePrice)}</p>
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

export default function ResultsDashboard({ report, onReset }: Props) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Affordability Report</h2>
          <p className="text-sm text-gray-500">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          New Analysis
        </button>
      </div>

      {/* Download / Email Actions */}
      <ReportActions report={report} />

      {/* Summary Hero */}
      <SummaryHero report={report} />

      {/* Data Cards */}
      <div className="space-y-4">
        <ExpandableSection title="Affordability Details" defaultOpen>
          <AffordabilityCard data={report.affordability} />
        </ExpandableSection>

        <ExpandableSection title="Market Snapshot" defaultOpen>
          <MarketSnapshotCard data={report.marketSnapshot} />
        </ExpandableSection>

        <ExpandableSection title="Risk Assessment" defaultOpen>
          <RiskAssessmentCard data={report.riskAssessment} />
        </ExpandableSection>

        <ExpandableSection title="Recommendations" defaultOpen>
          <RecommendationsCard data={report.recommendations} />
        </ExpandableSection>

        <ExpandableSection title="5-Year Equity Buildup">
          <AmortizationTable data={report.affordability.amortizationSummary} />
        </ExpandableSection>
      </div>

      {/* AI Detailed Analysis */}
      <AISummaryCard summary={report.summary} title="AI Detailed Analysis" />

      {/* Chat Follow-up */}
      <ChatInterface report={report} />

      {/* Disclaimers */}
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
    </div>
  );
}
