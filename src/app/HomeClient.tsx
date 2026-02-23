"use client";

import { useSession } from "next-auth/react";
import DashboardClient from "./saved-reports/DashboardClient";
import AffordabilityCard from "@/components/AffordabilityCard";
import RiskAssessmentCard from "@/components/RiskAssessmentCard";
import RentVsBuyCard from "@/components/RentVsBuyCard";
import PreApprovalReadinessCard from "@/components/PreApprovalReadinessCard";
import {
  mockAffordability,
  mockRisk,
  mockRentVsBuy,
  mockReadiness,
  MOCK_MORTGAGE_RATE,
} from "@/lib/data/mock-landing-data";

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "4 AI Agents",
    description: "Market analyst, financial advisor, risk assessor, and research specialist work together on your analysis.",
    icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z",
  },
  {
    title: "Real-Time Rates",
    description: "Live mortgage rates from the Federal Reserve, updated hourly. See how rates affect your buying power.",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  },
  {
    title: "Risk Analysis",
    description: "Stress tests, DTI analysis, and personalized risk flags so you buy with confidence.",
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
  {
    title: "Interactive Chat",
    description: "Ask follow-up questions about your results. Get personalized answers from AI trained on mortgage data.",
    icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
  },
];

/* ── Static preview: Market Rates ── */
function MarketRatesPreview() {
  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Market Snapshot</h3>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500 mb-0.5">30-Year Fixed</p>
            <p className="text-lg font-bold text-gray-900">6.65%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500 mb-0.5">15-Year Fixed</p>
            <p className="text-lg font-bold text-gray-900">5.89%</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500 mb-0.5">Fed Funds Rate</p>
            <p className="text-lg font-bold text-gray-900">4.33%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-500 mb-0.5">Median Home Price</p>
            <p className="text-lg font-bold text-gray-900">$412K</p>
          </div>
        </div>
        {/* Mini sparkline decoration */}
        <div className="pt-2">
          <p className="text-[11px] text-gray-400 mb-2">30-Year Rate Trend (12 months)</p>
          <svg viewBox="0 0 200 40" className="w-full h-10 text-blue-500">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,28 20,30 40,25 60,20 80,22 100,18 120,15 140,18 160,12 180,10 200,14"
            />
            <polyline
              fill="url(#sparkFill)"
              stroke="none"
              points="0,28 20,30 40,25 60,20 80,22 100,18 120,15 140,18 160,12 180,10 200,14 200,40 0,40"
            />
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="text-[10px] text-gray-400">Source: Federal Reserve Economic Data (FRED)</p>
      </div>
    </div>
  );
}

/* ── Static preview: Investment Analysis ── */
function InvestmentPreview() {
  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-gray-900">Investment Analysis</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full">Strong Investment</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Cap Rate</p>
            <p className="text-sm font-bold text-gray-900">5.8%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Cash-on-Cash</p>
            <p className="text-sm font-bold text-gray-900">8.2%</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-[10px] text-gray-500 mb-1">Monthly Cash Flow</p>
          <p className="text-sm font-bold text-emerald-600">+$342/mo</p>
        </div>
      </div>
    </div>
  );
}

/* ── Static preview: Budget Simulator ── */
function BudgetSimulatorPreview() {
  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-gray-900">Budget Simulator</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {/* Mock slider */}
        {[
          { label: "Annual Income", value: "$133K", pct: 70 },
          { label: "Down Payment", value: "$97K", pct: 48 },
          { label: "Monthly Debt", value: "$450", pct: 25 },
        ].map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">{s.label}</span>
              <span className="text-[10px] font-semibold text-gray-700">{s.value}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div
                className="h-full bg-violet-500 rounded-full"
                style={{ width: `${s.pct}%` }}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-center pt-1">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#7c3aed" strokeWidth="3" strokeDasharray="97.4" strokeDashoffset="21.4" strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900">78</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Powered by 4 AI Agents
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
            Home<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">IQ</span>
          </h1>
          <p className="mt-2 text-lg font-medium text-gray-500">AI-Powered Home Affordability Research</p>

          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Get a comprehensive affordability analysis using real-time mortgage rates,
            market data, and risk assessment — all in under 2 minutes.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              Start Your Free Analysis
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              How it works
            </a>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            No sign-up required for your first analysis
          </p>
        </div>
      </section>

      {/* Preview Showcase */}
      <section className="max-w-5xl mx-auto px-4 pb-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">See what you&apos;ll get</h2>
          <p className="mt-1 text-sm text-gray-500">Real components from an actual analysis — powered by your data</p>
        </div>

        <div className="relative">
          {/* Preview cards container */}
          <div className="space-y-4 preview-slide-up">
            {/* Row 1: Affordability Card (full width, real component) */}
            <div className="pointer-events-none">
              <AffordabilityCard data={mockAffordability} risk={mockRisk} mortgageRate={MOCK_MORTGAGE_RATE} />
            </div>

            {/* Row 2: Market Rates + Risk Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pointer-events-none">
              <MarketRatesPreview />
              <RiskAssessmentCard data={mockRisk} />
            </div>

            {/* Row 3: Rent vs Buy + Readiness + Investment/Budget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pointer-events-none">
              <RentVsBuyCard data={mockRentVsBuy} />
              <PreApprovalReadinessCard data={mockReadiness} />
              <div className="space-y-4">
                <InvestmentPreview />
                <BudgetSimulatorPreview />
              </div>
            </div>
          </div>

          {/* Gradient fade overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent flex items-end justify-center pb-8">
            <a
              href="/analyze"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 pointer-events-auto"
            >
              Get Your Personalized Analysis
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-y border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: "12+", label: "Analysis Cards" },
              { value: "<2 min", label: "Full Report" },
              { value: "4", label: "AI Agents" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
          <p className="mt-1 text-sm text-gray-500">Four specialized AI agents collaborate on your analysis</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-2">
          <p className="text-xs text-gray-400 text-center">
            We do not store any personal data or information. This is not financial advice. Use at your own risk.
          </p>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} HomeIQ</span>
            <div className="flex items-center gap-3">
              <a href="/privacy" className="text-gray-500 hover:text-blue-600 transition-colors">Privacy</a>
              <a href="/terms" className="text-gray-500 hover:text-blue-600 transition-colors">Terms</a>
              <a href="/docs" className="text-gray-500 hover:text-blue-600 transition-colors">Docs</a>
              <a href="mailto:pareshv23@gmail.com" className="text-gray-500 hover:text-blue-600 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomeClient() {
  const { status } = useSession();

  if (status === "loading") {
    return <Skeleton />;
  }

  if (status === "authenticated") {
    return <DashboardClient />;
  }

  return <LandingPage />;
}
