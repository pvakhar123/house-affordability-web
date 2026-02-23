"use client";

import { useState } from "react";

type Section = {
  id: string;
  title: string;
  icon: string;
};

const sections: Section[] = [
  { id: "overview", title: "Overview", icon: "M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" },
  { id: "getting-started", title: "Getting Started", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  { id: "input-form", title: "Input Form", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15" },
  { id: "smart-fill", title: "Smart Fill", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { id: "property-import", title: "Property Import", icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.561a4.5 4.5 0 00-6.364-6.364L4.5 8.5" },
  { id: "results", title: "Results Dashboard", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
  { id: "ai-agents", title: "AI Agents", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" },
  { id: "chat", title: "AI Chat", icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
  { id: "saved-reports", title: "Reports & Sharing", icon: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" },
  { id: "knowledge-base", title: "Knowledge Base", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { id: "api", title: "API Reference", icon: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" },
];

export default function DocsPage() {
  const [active, setActive] = useState("overview");

  const currentIndex = sections.findIndex((s) => s.id === active);
  const prev = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const next = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Left sidebar nav ── */}
      <aside className="sticky top-0 h-screen w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col z-30">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            App
          </a>
          <span className="text-xs text-gray-400">v1.0</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all text-left ${
                active === s.id
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 ${active === s.id ? "text-blue-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
              </svg>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / sections.length) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">{currentIndex + 1} of {sections.length}</p>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-8 py-3">
          <h1 className="text-sm font-bold text-gray-900">Documentation</h1>
        </header>
        <main className="px-8 py-8 max-w-4xl">
          {active === "overview" && <OverviewSection />}
          {active === "getting-started" && <GettingStartedSection />}
          {active === "input-form" && <InputFormSection />}
          {active === "smart-fill" && <SmartFillSection />}
          {active === "property-import" && <PropertyImportSection />}
          {active === "results" && <ResultsSection />}
          {active === "ai-agents" && <AiAgentsSection />}
          {active === "chat" && <ChatSection />}
          {active === "saved-reports" && <SavedReportsSection />}
          {active === "knowledge-base" && <KnowledgeBaseSection />}
          {active === "api" && <ApiSection />}

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-200">
            {prev ? (
              <button onClick={() => setActive(prev.id)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors group">
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span>{prev.title}</span>
              </button>
            ) : <div />}
            {next ? (
              <button onClick={() => setActive(next.id)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors group">
                <span>{next.title}</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ) : <div />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Section components — one per topic
   ════════════════════════════════════════════════════════════ */

function OverviewSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Overview</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          HomeIQ is an AI-powered home affordability platform that provides personalized, data-driven analysis for homebuyers. The app combines <strong>4 specialized AI agents</strong>, <strong>real-time market data</strong> from federal sources (FRED, BLS), and <strong>financial modeling</strong> to deliver comprehensive reports.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "AI Agents", value: "4" },
            { label: "Analysis Cards", value: "12+" },
            { label: "Loan Programs", value: "4" },
            { label: "Market Sources", value: "Live" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="pt-2 text-sm text-gray-600 leading-relaxed">
          <p><strong>Key capabilities:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-500">
            <li>Maximum home price and monthly payment calculation</li>
            <li>Risk assessment with stress testing</li>
            <li>Rent vs. buy comparison</li>
            <li>Investment property ROI analysis</li>
            <li>Loan program eligibility (Conventional, FHA, VA, USDA)</li>
            <li>Neighborhood quality scores and cost of living</li>
            <li>Matching property listings from Realtor.com</li>
            <li>Interactive budget simulator with readiness score</li>
            <li>AI chat for follow-up questions</li>
            <li>Document upload for auto-filling financial data</li>
            <li>Property import from listing URLs</li>
            <li>Section-based dashboard with left navigation</li>
            <li>Dark mode support</li>
          </ul>
        </div>
      </div>
    </>
  );
}

function GettingStartedSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <p className="text-sm text-gray-600">Follow these steps to generate your first affordability report:</p>
        <div className="space-y-4">
          {[
            { step: "1", title: "Choose a location", desc: "Search by specific address (with autocomplete) or enter one or more neighborhoods/zip codes to compare." },
            { step: "2", title: "Enter your finances", desc: "Provide your annual income, monthly debts, down payment savings, and credit score. Optionally upload documents (pay stubs, tax returns) to auto-fill." },
            { step: "3", title: "Add property details (optional)", desc: "Paste a listing URL to auto-import price, taxes, and HOA, or enter them manually." },
            { step: "4", title: "Run analysis", desc: "Click \"Analyze My Affordability\" and watch results stream in. Market data appears first, then affordability, risk, and recommendations." },
            { step: "5", title: "Explore your report", desc: "Review 12+ analysis cards. Ask follow-up questions via AI Chat. Save, share, download PDF, or email your report." },
          ].map((item) => (
            <div key={item.step} className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center">{item.step}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function InputFormSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Input Form</h2>
      <div className="space-y-4">
        <Card title="Location">
          <ul className="space-y-2 text-sm text-gray-600">
            <li><strong>Specific Address mode</strong> &mdash; Search for a single property address with Mapbox-powered autocomplete. Recent searches are remembered for quick access.</li>
            <li><strong>Neighborhood mode</strong> &mdash; Enter multiple cities, zip codes, or neighborhoods as tags. Type to search from 250+ US cities or add custom locations.</li>
            <li><strong>Loan type</strong> &mdash; Choose from 30-year fixed (default), 15-year fixed, 20-year fixed, 5/1 ARM, or 7/1 ARM.</li>
            <li><strong>Special buyer flags</strong> &mdash; Check &quot;Military Veteran&quot; to unlock VA loan analysis. Check &quot;First-Time Buyer&quot; for FHA and first-time buyer program eligibility.</li>
          </ul>
        </Card>

        <Card title="Financial Profile">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b"><th className="pb-2 pr-4">Field</th><th className="pb-2">Description</th></tr></thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-50"><td className="py-2 pr-4 font-medium">Annual Gross Income *</td><td className="py-2">Pre-tax household income</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2 pr-4 font-medium">Additional Income</td><td className="py-2">Bonuses, side income, rental income</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2 pr-4 font-medium">Down Payment Savings *</td><td className="py-2">Total available for down payment</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2 pr-4 font-medium">Emergency Fund</td><td className="py-2">Additional savings beyond down payment</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2 pr-4 font-medium">Monthly Debt Payments *</td><td className="py-2">Total of all monthly obligations (loans, credit cards)</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2 pr-4 font-medium">Monthly Expenses</td><td className="py-2">Non-debt living expenses</td></tr>
              <tr className="border-b border-gray-50"><td className="py-2 pr-4 font-medium">Current Rent</td><td className="py-2">Used for rent vs. buy comparison (defaults to $2,500)</td></tr>
              <tr><td className="py-2 pr-4 font-medium">Credit Score *</td><td className="py-2">300&ndash;850 range, affects loan eligibility and rates</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">* Required fields</p>
        </Card>

        <Card title="Property Details (Address mode only)">
          <p className="text-sm text-gray-600 mb-3">When using Specific Address mode, you can optionally provide property details to get a property-specific affordability verdict:</p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li><strong>Listing price</strong> &mdash; The asking price of the property</li>
            <li><strong>Annual property tax</strong> &mdash; Estimated if not provided</li>
            <li><strong>Monthly HOA</strong> &mdash; Homeowners association fees</li>
            <li><strong>Square footage</strong> &mdash; For price-per-sqft analysis</li>
          </ul>
        </Card>

        <Card title="Investment Property Toggle">
          <p className="text-sm text-gray-600 mb-3">Enable the &quot;Investment Property&quot; toggle to get ROI, cash flow, and cap rate analysis. Additional fields appear:</p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li><strong>Expected monthly rent</strong> &mdash; Estimated rental income (can auto-estimate based on area)</li>
            <li><strong>Property management %</strong> &mdash; Fee for professional management (default: 10%)</li>
            <li><strong>Vacancy rate %</strong> &mdash; Expected vacancy (default: 5%)</li>
            <li><strong>CapEx reserve %</strong> &mdash; Capital expenditure reserve (default: 5%)</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function SmartFillSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Smart Fill (Document Upload)</h2>
      <Card>
        <p className="text-sm text-gray-600 mb-4">Upload financial documents and let AI extract your income, debts, and savings automatically.</p>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Supported documents</p>
            <div className="flex flex-wrap gap-2">
              {["Pay Stubs", "W-2 Forms", "Tax Returns", "Bank Statements"].map((doc) => (
                <span key={doc} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{doc}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">How it works</p>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Drag-and-drop or click to upload files (PDF or image, max 10MB each, up to 5 files)</li>
              <li>AI identifies the document type and extracts relevant financial data</li>
              <li>Each extracted field shows a confidence score (High / Medium / Low)</li>
              <li>Review the extracted values and choose which to apply to your form</li>
            </ol>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-700"><strong>Privacy:</strong> Documents are processed in-memory and never stored. They are sent directly to the AI model for extraction and discarded immediately.</p>
          </div>
        </div>
      </Card>
    </>
  );
}

function PropertyImportSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Import</h2>
      <Card>
        <p className="text-sm text-gray-600 mb-4">Paste a property listing URL to automatically extract details instead of entering them manually.</p>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">What gets extracted</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <span>Listing price</span>
              <span>Property address</span>
              <span>Annual property tax</span>
              <span>Monthly HOA fees</span>
              <span>Square footage</span>
              <span>Bedrooms / Bathrooms</span>
              <span>Year built</span>
              <span>Property type</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">Works with most real estate listing sites. If extraction fails, you can enter details manually.</p>
        </div>
      </Card>
    </>
  );
}

function ResultsSection() {
  const cards = [
    { title: "Property Affordability Verdict", desc: "If you provided a specific property, see whether it's Comfortable, Tight, Stretch, or Over Budget relative to your finances, with key metrics compared to the asking price." },
    { title: "Core Affordability", desc: "Your maximum affordable home price, maximum loan amount, full monthly payment breakdown (principal & interest, property tax, homeowner's insurance, PMI if applicable), down payment percentage, and debt-to-income analysis." },
    { title: "Investment Analysis", desc: "When investment property mode is enabled: monthly operating expenses, cash flow, cash-on-cash return, cap rate, ROI, and 5-10 year equity projection chart with a Strong/Moderate/Marginal/Negative verdict." },
    { title: "Pre-Approval Readiness", desc: "A 0-100 readiness score broken into components (DTI, Credit, Down Payment, Debt Health) with action items. Includes an interactive budget simulator to adjust income, down payment, and debt to see how changes affect your readiness." },
    { title: "Market Snapshot", desc: "Live mortgage rates (30-year and 15-year fixed), federal funds rate, national median home prices, shelter and general inflation rates, and a 10-year historical price/rate trends chart." },
    { title: "Neighborhood Info", desc: "School ratings, public transit access, safety metrics, parks and recreation, walkability score, cost of living index, and community vibe description for your target area." },
    { title: "Risk Assessment", desc: "Overall risk score (Low/Moderate/High/Very High) with specific risk flags categorized by severity (Info/Warning/Critical). Includes emergency fund adequacy and stress test scenarios for rate increases and income drops." },
    { title: "Rent vs. Buy", desc: "5-year and 10-year cost comparison, break-even analysis, equity buildup, and a clear verdict: Buy Clearly, Slight Buy, Toss-Up, or Renting Wins." },
    { title: "Loan Programs", desc: "Eligibility analysis for Conventional, FHA, VA, and USDA loans. Each shows minimum down payment, PMI requirements, and estimated monthly payment." },
    { title: "5-Year Equity Buildup", desc: "Year-by-year amortization table showing principal paid, interest paid, remaining balance, and equity percentage." },
    { title: "Matching Properties", desc: "Real listings in your area within your budget, with prices, photos, bedroom/bathroom counts, and links to full property details." },
    { title: "AI Summary", desc: "A detailed natural-language analysis covering your financial strengths, areas of concern, strategic recommendations, and personalized next steps." },
  ];

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Results Dashboard</h2>
      <p className="text-sm text-gray-600 mb-3">After running an analysis, results stream in progressively. The dashboard uses a <strong>section-based left navigation</strong> so each analysis area is its own view. The <strong>Analysis</strong> (home) view shows affordability, readiness, and the budget simulator together. Other sections are accessed via the sidebar.</p>
      <p className="text-sm text-gray-600 mb-6">The dashboard contains <strong>{cards.length} sections</strong>:</p>
      <div className="space-y-3">
        {cards.map((card, i) => (
          <div key={card.title} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AiAgentsSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Agents</h2>
      <p className="text-sm text-gray-600 mb-6">Your report is generated by 4 specialized AI agents that run in sequence, each focused on a specific domain:</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { name: "Market Data Agent", desc: "Fetches live mortgage rates from the Federal Reserve (FRED), national home prices, Case-Shiller index, and inflation data from the Bureau of Labor Statistics. Also retrieves regional housing data for your target location.", badge: "bg-blue-50 text-blue-700" },
          { name: "Affordability Agent", desc: "Calculates your maximum home price, monthly payment breakdown (PITI + PMI), debt-to-income ratios, and amortization schedule. Considers loan type, term, and down payment.", badge: "bg-green-50 text-green-700" },
          { name: "Risk Assessment Agent", desc: "Evaluates financial risk flags (DTI concerns, credit score issues, emergency fund gaps). Runs stress tests simulating rate increases and income drops. Rates overall risk level.", badge: "bg-amber-50 text-amber-700" },
          { name: "Recommendations Agent", desc: "Determines loan program eligibility (Conventional, FHA, VA, USDA). Generates savings strategies, closing cost estimates, rent vs. buy analysis, and personalized advice.", badge: "bg-purple-50 text-purple-700" },
        ].map((agent) => (
          <div key={agent.name} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${agent.badge}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI Agent
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{agent.desc}</p>
          </div>
        ))}
      </div>
      <div className="bg-gray-50 rounded-lg p-4 mt-4">
        <p className="text-xs text-gray-500">After all agents complete, a fifth synthesis step generates a personalized natural-language summary using a more capable model (Sonnet) for high-quality prose.</p>
      </div>
    </>
  );
}

function ChatSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Chat</h2>
      <Card>
        <p className="text-sm text-gray-600 mb-4">After your report is generated, an AI chat panel appears at the bottom of the dashboard. Ask any follow-up question about your results.</p>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">What you can ask</p>
            <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
              <li>&quot;What happens if I put down 20% instead of 10%?&quot;</li>
              <li>&quot;Am I better off with a 15-year mortgage?&quot;</li>
              <li>&quot;What are closing costs typically in my area?&quot;</li>
              <li>&quot;How would paying off my car loan change things?&quot;</li>
              <li>&quot;Explain my risk flags in more detail&quot;</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Features</p>
            <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
              <li>Context-aware: the AI has access to your full report</li>
              <li>Quick-start suggestions based on your location and results</li>
              <li>Follow-up prompt suggestions after each answer</li>
              <li>Thumbs up/down feedback on individual responses</li>
              <li>Streaming responses for fast interaction</li>
            </ul>
          </div>
        </div>
      </Card>
    </>
  );
}

function SavedReportsSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Saved Reports & Sharing</h2>
      <div className="space-y-4">
        <Card title="Report Actions">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              { name: "Download PDF", desc: "Generate a full-page PDF of your entire report including charts and data tables." },
              { name: "Save Report", desc: "Save to your account (requires Google sign-in). Access anytime from the Saved Reports page." },
              { name: "Copy Share Link", desc: "Generate a shareable URL with your report data compressed into the link. No sign-in required." },
              { name: "Email Report", desc: "Send the report to any email address. Great for sharing with a partner, realtor, or financial advisor." },
            ].map((action) => (
              <div key={action.name} className="bg-gray-50 rounded-lg p-3">
                <p className="font-semibold text-gray-900">{action.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{action.desc}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Saved Reports Page">
          <p className="text-sm text-gray-600">
            Sign in with Google to access your <a href="/" className="text-blue-600 hover:underline">Dashboard</a> where you can view, rename, add notes to, or delete any previously saved report. Click any report to reload it in the full dashboard view.
          </p>
        </Card>
      </div>
    </>
  );
}

function KnowledgeBaseSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Mortgage Knowledge Base</h2>
      <Card>
        <p className="text-sm text-gray-600 mb-4">
          The <a href="/rag-demo" className="text-blue-600 hover:underline">Knowledge Base</a> is a retrieval-augmented generation (RAG) system for answering mortgage questions. It searches a curated document database and generates answers grounded in authoritative sources.
        </p>
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Example questions</p>
          <div className="flex flex-wrap gap-2">
            {[
              "What is the minimum down payment for an FHA loan?",
              "How does my credit score affect mortgage rates?",
              "What's the difference between PMI and MIP?",
              "ARM vs fixed-rate: which is better?",
              "What are typical closing costs?",
              "What first-time buyer programs exist?",
            ].map((q) => (
              <span key={q} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{q}</span>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}

function ApiSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">API Reference</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 mb-4">
        <p className="text-sm text-gray-600">
          All API routes accept and return JSON. Streaming endpoints return NDJSON (newline-delimited JSON). Responses include an <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">X-API-Version: 1.0</code> header. Rate limits are per-IP with a sliding window; exceeding returns <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">429</code> with a <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">Retry-After</code> header.
        </p>
        <a
          href="/openapi.json"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          OpenAPI Spec (JSON)
        </a>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Core</h3>
        <ApiRow method="POST" path="/api/analyze" desc="Run full affordability analysis (streamed)" rate="10/hr" />
        <ApiRow method="POST" path="/api/chat" desc="Chat about your report (streamed)" rate="60/hr" />
        <ApiRow method="POST" path="/api/extract-property" desc="Extract property details from listing URL" rate="20/hr" />
        <ApiRow method="POST" path="/api/extract-document" desc="Extract financials from uploaded documents" rate="20/hr" />
        <ApiRow method="POST" path="/api/feedback" desc="Submit thumbs up/down feedback" />

        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-4">Calculator Tools</h3>
        <ApiRow method="POST" path="/api/gpt/calculate-affordability" desc="Calculate max affordable price (math only)" />
        <ApiRow method="POST" path="/api/gpt/analyze-property" desc="Analyze a specific property's affordability" />
        <ApiRow method="POST" path="/api/gpt/compare-scenarios" desc="Compare two loan scenarios side-by-side" />
        <ApiRow method="POST" path="/api/gpt/stress-test" desc="Stress test: rate hikes and income loss" />
        <ApiRow method="POST" path="/api/gpt/rent-vs-buy" desc="Rent vs. buy cost comparison" />

        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-4">Data</h3>
        <ApiRow method="POST" path="/api/gpt/current-rates" desc="Live mortgage rates from FRED" />
        <ApiRow method="POST" path="/api/gpt/search-properties" desc="Search homes for sale by location" />
        <ApiRow method="POST" path="/api/gpt/area-info" desc="Property taxes, schools, cost of living" />
        <ApiRow method="POST" path="/api/gpt/lookup-mortgage-info" desc="Search mortgage knowledge base" />
      </div>
    </>
  );
}

/* ── Shared helper components ── */

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {title && <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>}
      {children}
    </div>
  );
}

function ApiRow({ method, path, desc, rate }: { method: string; path: string; desc: string; rate?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3 text-sm">
      <span className="shrink-0 px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700">{method}</span>
      <code className="font-mono text-gray-800 text-xs">{path}</code>
      <span className="text-gray-500 ml-auto hidden sm:inline text-xs">{desc}</span>
      {rate && <span className="shrink-0 px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-700">{rate}</span>}
    </div>
  );
}
