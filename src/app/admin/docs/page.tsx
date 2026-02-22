"use client";

import { useState } from "react";

type Section = { id: string; title: string; icon: string };

const sections: Section[] = [
  { id: "product", title: "Product", icon: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" },
  { id: "architecture", title: "Architecture", icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" },
  { id: "agents", title: "Agent Pipeline", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" },
  { id: "math", title: "Financial Math", icon: "M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" },
  { id: "market", title: "Market Data", icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" },
  { id: "rag", title: "RAG System", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { id: "chat", title: "Chat System", icon: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" },
  { id: "guardrails", title: "Guardrails", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
  { id: "database", title: "Database", icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" },
  { id: "auth", title: "Auth & Security", icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" },
  { id: "tiers", title: "Tier System", icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
  { id: "eval", title: "Eval & Quality", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "observability", title: "Observability", icon: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "mcp", title: "MCP Server", icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.561a4.5 4.5 0 00-6.364-6.364L4.5 8.5" },
];

export default function InternalDocsPage() {
  const [active, setActive] = useState("architecture");
  const currentIndex = sections.findIndex((s) => s.id === active);
  const prev = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const next = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Section sidebar */}
      <div className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Docs</h2>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg text-left transition-colors ${
                active === s.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <svg className={`w-3.5 h-3.5 shrink-0 ${active === s.id ? "text-blue-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
              </svg>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / sections.length) * 100}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-center">{currentIndex + 1} / {sections.length}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 max-w-4xl">
        {active === "product" && <ProductDocSection />}
        {active === "architecture" && <ArchitectureSection />}
        {active === "agents" && <AgentPipelineSection />}
        {active === "math" && <FinancialMathSection />}
        {active === "market" && <MarketDataSection />}
        {active === "rag" && <RagSection />}
        {active === "chat" && <ChatSystemSection />}
        {active === "guardrails" && <GuardrailsSection />}
        {active === "database" && <DatabaseSection />}
        {active === "auth" && <AuthSection />}
        {active === "tiers" && <TierSection />}
        {active === "eval" && <EvalSection />}
        {active === "observability" && <ObservabilitySection />}
        {active === "mcp" && <McpSection />}

        <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
          {prev ? (
            <button onClick={() => setActive(prev.id)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              {prev.title}
            </button>
          ) : <div />}
          {next ? (
            <button onClick={() => setActive(next.id)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600">
              {next.title}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      {title && <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>}
      {children}
    </div>
  );
}

function Code({ children }: { children: string }) {
  return <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>;
}

function FilePath({ children }: { children: string }) {
  return <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{children}</span>;
}

function Info({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
      {children}
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4">
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left">{headers.map((h) => <th key={h} className="pb-2 pr-4 text-xs text-gray-500 font-medium">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-gray-50">{row.map((cell, j) => <td key={j} className="py-2 pr-4 text-gray-700">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Section components
   ═══════════════════════════════════════════ */

function ProductDocSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Documentation</h2>
      <Info>Complete feature inventory covering all user-facing capabilities, interactions, and requirements.</Info>

      <Card title="Core Analysis Form">
        <p className="text-sm text-gray-600 mb-3">The main page (<Code>/</Code>) collects financial and property data, then streams a full affordability analysis in three phases.</p>
        <p className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">Location Fields</p>
        <Table
          headers={["Field", "Type", "Notes"]}
          rows={[
            ["Location Mode", "Toggle", "\"Specific Address\" or \"Neighborhood\""],
            ["Specific Address", "Autocomplete", "Mapbox-powered, up to 6 US address suggestions"],
            ["Neighborhood Tags", "Multi-tag input", "Search 250+ US cities or add custom"],
            ["Include 5-mile radius", "Checkbox", "Appends \"surrounding areas\" context"],
            ["Loan Type", "Select", "30yr fixed (default), 15yr, 20yr, 5/1 ARM, 7/1 ARM"],
            ["Military Veteran", "Checkbox", "Unlocks VA loan analysis"],
            ["First-Time Buyer", "Checkbox", "Enables FHA / first-time programs"],
          ]}
        />
        <p className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">Financial Profile (* = required)</p>
        <Table
          headers={["Field", "Required", "Default"]}
          rows={[
            ["Annual Gross Income*", "Yes", "$120,000"],
            ["Additional Annual Income", "No", "—"],
            ["Down Payment Savings*", "Yes", "$60,000"],
            ["Emergency Fund", "No", "$20,000"],
            ["Monthly Debt Payments*", "Yes", "$500"],
            ["Monthly Living Expenses", "No", "$3,000"],
            ["Current Rent", "No", "$2,500"],
            ["Credit Score*", "Yes", "740 (range 300–850)"],
          ]}
        />
        <p className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">Property Details (address mode only, all optional)</p>
        <Table
          headers={["Field", "Notes"]}
          rows={[
            ["Listing Price", "Triggers property-specific verdict"],
            ["Annual Property Tax", "Defaults to ~1.1% of price"],
            ["Monthly HOA", "Included in payment calculation"],
            ["Square Footage", "Used for price/sqft display"],
          ]}
        />
        <p className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">Investment Analysis (toggle)</p>
        <Table
          headers={["Field", "Default"]}
          rows={[
            ["Expected Monthly Rent", "Auto-estimate from area data"],
            ["Property Management %", "10%"],
            ["Vacancy Rate %", "8%"],
            ["CapEx Reserve %", "5%"],
          ]}
        />
      </Card>

      <Card title="Results Dashboard">
        <p className="text-sm text-gray-600 mb-3">After analysis, results stream in progressively. The dashboard renders these cards in order:</p>
        <Table
          headers={["#", "Card", "Condition"]}
          rows={[
            ["1", "Hero Banner — Location photo or satellite map", "Always"],
            ["2", "Report Feedback — Thumbs up/down", "Always"],
            ["3", "Report Actions — PDF, Save, Share Link, Email", "Always"],
            ["4", "Property Verdict — Comfortable / Tight / Stretch / Over Budget", "Specific property analyzed"],
            ["5", "Core Affordability — Max price, recommended, PITI, DTI", "Always"],
            ["6", "Investment Analysis — Cash flow, cap rate, CoC, 10-yr projections", "Investment toggle on"],
            ["7", "Budget Simulator — Interactive sliders for what-if scenarios", "Always"],
            ["8", "Market Snapshot — Live rates, prices, inflation, 10-yr charts", "Always"],
            ["9", "Neighborhood Info — Schools, transit, safety, walkability", "Recognized metro area"],
            ["10", "Risk Assessment — Risk flags, stress tests, emergency fund", "Always"],
            ["11", "Rent vs. Buy — 5/10-yr cost comparison, break-even year", "Current rent provided"],
            ["12", "Loan Programs — Conventional, FHA, VA, USDA eligibility", "Always"],
            ["13", "5-Year Equity Buildup — Amortization table", "Always"],
            ["14", "Matching Properties — Up to 3 real listings within budget", "RapidAPI key configured"],
            ["15", "AI Summary — Narrative analysis from Claude Sonnet", "Always"],
            ["16", "AI Chat — Contextual follow-up Q&A", "Always"],
          ]}
        />
      </Card>

      <Card title="Smart Fill — Document Upload">
        <p className="text-sm text-gray-600 mb-3">Users upload pay stubs, W-2s, bank statements, or tax returns. AI extracts financial fields with confidence scores (High/Medium/Low).</p>
        <Table
          headers={["Document Type", "Extraction"]}
          rows={[
            ["Pay Stubs", "Annualizes per-period gross (biweekly ×26, semi-monthly ×24, monthly ×12)"],
            ["W-2 Forms", "Uses Box 1 wages"],
            ["Bank Statements", "Account balances, monthly expenses"],
            ["Tax Returns (1040)", "Reported income figures"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">Extracted fields: income, additional income, debt payments, savings, credit score, expenses. Users can apply individually or bulk-apply. Files: PNG, JPG, WebP, GIF, PDF. Max 10MB/file, up to 5 files in parallel. Documents are processed in-memory only, never stored.</p>
      </Card>

      <Card title="Property Import from URL">
        <p className="text-sm text-gray-600">Paste a real estate listing URL → AI extracts address, price, tax, HOA, sqft, beds, baths, year built, and property type. Endpoint: <Code>POST /api/extract-property</Code>. Fetches page HTML (10s timeout), strips scripts, truncates to 50K chars, sends to Claude for JSON extraction.</p>
      </Card>

      <Card title="AI Chat">
        <p className="text-sm text-gray-600 mb-3">Context-aware chat with full report embedded in system prompt. Token-by-token SSE streaming with tool use.</p>
        <Table
          headers={["Tool", "Source", "Purpose"]}
          rows={[
            ["recalculate_affordability", "JS math", "Recalculate with different income/debt/rate"],
            ["calculate_payment_for_price", "JS math", "Full PITI breakdown for any price"],
            ["compare_scenarios", "JS math", "Side-by-side loan comparison"],
            ["stress_test", "JS math", "Rate hike / income loss simulation"],
            ["rent_vs_buy", "JS math", "Rent vs. buy over N years"],
            ["analyze_property", "JS math", "Verdict for a specific listing price"],
            ["lookup_mortgage_info", "RAG", "Search curated mortgage knowledge base"],
            ["get_current_rates", "FRED API", "Live 30yr/15yr/ARM rates"],
            ["search_properties", "Zillow API", "Real listings by city/price/beds"],
            ["get_area_info", "Static data", "Tax rates, schools, cost of living"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">Max 5 tool-use iterations per request. Quick-start suggestion chips and follow-up prompts generated dynamically. Thumbs up/down on each response.</p>
      </Card>

      <Card title="Report Actions">
        <Table
          headers={["Action", "How It Works"]}
          rows={[
            ["Download PDF", "Client-side via jsPDF — generates and downloads affordability-report.pdf"],
            ["Save Report", "Signed-in: saves to DB via POST /api/saved-reports. Anonymous: localStorage (max 10)"],
            ["Copy Share Link", "Compresses report via CompressionStream + base64url into ?report= URL param"],
            ["Email Report", "POST /api/email-report — formatted HTML email via Resend transactional service"],
          ]}
        />
      </Card>

      <Card title="Saved Reports">
        <p className="text-sm text-gray-600 mb-3">Page: <Code>/saved-reports</Code>. Users can view, rename, delete, and reload saved analyses.</p>
        <Table
          headers={["Endpoint", "Method", "Purpose"]}
          rows={[
            ["/api/saved-reports", "GET", "List user's saved reports"],
            ["/api/saved-reports", "POST", "Save a new report"],
            ["/api/saved-reports/[id]", "PATCH", "Rename a report"],
            ["/api/saved-reports/[id]", "DELETE", "Delete a report (ownership verified)"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">Tier limits: Free = 3 saved, Pro = unlimited. Click a report → loads into the full dashboard via sessionStorage.</p>
      </Card>

      <Card title="Budget Simulator">
        <p className="text-sm text-gray-600 mb-3">Interactive sliders in the results dashboard. No API calls — pure client-side recalculation using the same financial math library.</p>
        <Table
          headers={["Slider", "Range", "Step"]}
          rows={[
            ["Annual Income", "$30K–$500K", "$5K"],
            ["Monthly Debt", "$0–$5K", "$50"],
            ["Down Payment", "$0–$500K", "$5K"],
            ["Emergency Fund", "$0–$200K", "$5K"],
            ["Closing Costs Budget", "$0–$50K", "$1K"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">Live outputs: readiness score (0–100), max price delta, monthly payment delta, DTI, contextual tips. Reset button returns to original values.</p>
      </Card>

      <Card title="Matching Properties">
        <p className="text-sm text-gray-600 mb-3">Up to 3 real listings from Realtor API, categorized by budget fit:</p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li><strong>Below budget</strong> — &lt;95% of recommended price</li>
          <li><strong>Sweet spot</strong> — 90–110% of recommended price</li>
          <li><strong>Stretch buy</strong> — 85–105% of max affordable price</li>
        </ul>
        <p className="text-sm text-gray-600 mt-3">Each card shows: photo, address, price, beds/baths, sqft, estimated monthly payment, and highlight tags (new listing, price cut, new build). Requires <Code>RAPIDAPI_KEY</Code>.</p>
      </Card>

      <Card title="RAG Knowledge Base Demo">
        <p className="text-sm text-gray-600 mb-3">Standalone page at <Code>/rag-demo</Code>. Users ask general mortgage questions, answered via BM25 retrieval over 14 curated documents. Shows answer with cited sources and relevance scores.</p>
        <p className="text-xs font-semibold text-gray-500 uppercase mt-3 mb-2">Example Questions</p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Minimum down payment for FHA loan?</li>
          <li>How does credit score affect mortgage rates?</li>
          <li>Difference between PMI and MIP?</li>
          <li>ARM vs. fixed rate mortgage?</li>
          <li>What are closing costs?</li>
          <li>First-time homebuyer programs?</li>
          <li>What is DTI?</li>
          <li>How to avoid PMI?</li>
        </ul>
      </Card>

      <Card title="MCP Server & GPT-Compatible API">
        <p className="text-sm text-gray-600 mb-3">6 calculator tools exposed via Model Context Protocol (stdio + SSE) for Claude Desktop and other MCP clients. Same tools available as REST endpoints at <Code>/api/gpt/[tool]</Code> for GPT Actions and other integrations.</p>
        <Table
          headers={["Tool / Endpoint", "Function"]}
          rows={[
            ["calculate_affordability", "Max price + payment breakdown from income/debts/savings"],
            ["analyze_property", "Property-specific verdict at a given price"],
            ["compare_scenarios", "Side-by-side loan comparison"],
            ["stress_test", "Rate hike + income loss simulations"],
            ["rent_vs_buy", "Rent vs. buy over N years"],
            ["lookup_mortgage_info", "RAG knowledge base search"],
          ]}
        />
      </Card>

      <Card title="All User-Facing Routes">
        <Table
          headers={["Route", "Description", "Auth"]}
          rows={[
            ["/", "Main affordability analysis form + results", "No"],
            ["/saved-reports", "View / manage saved reports", "Yes"],
            ["/docs", "In-app documentation (11 sections)", "No"],
            ["/pricing", "Free vs. Pro plan comparison", "No"],
            ["/rag-demo", "Mortgage knowledge base Q&A", "No"],
            ["/privacy", "Privacy policy", "No"],
            ["/terms", "Terms of service", "No"],
          ]}
        />
      </Card>

      <Card title="Tier Limits Summary">
        <Table
          headers={["Feature", "Free", "Pro"]}
          rows={[
            ["Reports / month", "1", "20"],
            ["Chat messages / day", "20", "Unlimited"],
            ["Saved reports", "3", "Unlimited"],
            ["Anonymous (no sign-in)", "1 report/day/IP", "—"],
            ["AI agents & tools", "All", "All"],
            ["Real-time market data", "Yes", "Yes"],
            ["Shareable report links", "Yes", "Yes"],
            ["Priority support", "No", "Yes"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">When a limit is hit, the client receives a <Code>403 limit_reached</Code> response and shows the <Code>UpgradePrompt</Code> modal — either &quot;Sign in&quot; (anonymous) or &quot;View Pro Plans&quot; (free tier).</p>
      </Card>

      <Card title="Rate Limits (abuse prevention)">
        <Table
          headers={["Endpoint", "Limit", "Window"]}
          rows={[
            ["/api/analyze", "10 requests", "per hour per IP"],
            ["/api/chat", "60 messages", "per hour per IP"],
            ["/api/extract-document", "20 requests", "per hour per IP"],
            ["/api/extract-property", "20 requests", "per hour per IP"],
          ]}
        />
        <Warn>Rate limits are per-process (in-memory sliding window). Each serverless cold start gets its own map — not shared across instances.</Warn>
      </Card>
    </>
  );
}

function ArchitectureSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Architecture Overview</h2>
      <Card title="Tech Stack">
        <Table
          headers={["Layer", "Technology", "Notes"]}
          rows={[
            ["Framework", "Next.js 16 (App Router)", "Turbopack, RSC + client components"],
            ["AI", "Anthropic Claude (Haiku + Sonnet)", "Via @anthropic-ai/sdk, prompt caching"],
            ["Database", "Neon Postgres + Drizzle ORM", "Serverless, graceful degradation if unavailable"],
            ["Auth", "NextAuth v5 (Auth.js)", "Google OAuth, JWT strategy"],
            ["Observability", "Langfuse + Sentry", "LLM tracing + error monitoring"],
            ["Styling", "Tailwind CSS", "Utility-first, no component library"],
            ["Deployment", "Vercel", "Edge middleware, serverless functions"],
          ]}
        />
      </Card>

      <Card title="Request Flow: /api/analyze">
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li>IP rate limit check (sliding window, 10/hr)</li>
          <li>Auth session check → tier usage check (<Code>checkUsage</Code>)</li>
          <li>Zod input validation (<Code>analyzeInputSchema</Code>)</li>
          <li><Code>OrchestratorAgent.run()</Code> starts streaming NDJSON phases</li>
          <li>Phase 1: Parallel data fetch — FRED rates, BLS inflation, area info</li>
          <li>Phase 2: JS computations — affordability, risk, recommendations, rent-vs-buy, investment</li>
          <li>Phase 3: Claude Sonnet synthesis → narrative summary</li>
          <li>Stream complete → <Code>incrementUsage</Code> + Langfuse flush</li>
          <li>Optional: LLM-as-judge scores the report asynchronously</li>
        </ol>
      </Card>

      <Card title="Environment Variables">
        <Table
          headers={["Variable", "Required", "Purpose"]}
          rows={[
            ["ANTHROPIC_API_KEY", "Yes", "All Claude API calls"],
            ["FRED_API_KEY", "Yes", "Federal Reserve mortgage data"],
            ["POSTGRES_URL", "Recommended", "All DB persistence (degrades gracefully)"],
            ["AUTH_SECRET", "Recommended", "NextAuth session signing"],
            ["AUTH_GOOGLE_ID / SECRET", "Recommended", "Google OAuth"],
            ["ADMIN_EMAILS", "Recommended", "Comma-separated admin allowlist"],
            ["LANGFUSE_PUBLIC_KEY / SECRET_KEY", "Optional", "LLM observability"],
            ["MAPBOX_ACCESS_TOKEN", "Optional", "Address autocomplete"],
            ["RAPIDAPI_KEY", "Optional", "Zillow property search"],
            ["ENCRYPTION_KEY", "Optional", "AES-GCM-256 token encryption (64-char hex)"],
            ["SENTRY_DSN", "Optional", "Error monitoring"],
            ["ENABLE_REALTIME_JUDGE", "Optional", "Enable LLM-as-judge on live requests"],
          ]}
        />
      </Card>
    </>
  );
}

function AgentPipelineSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Agent Pipeline</h2>
      <Info>The orchestrator has been refactored from 4 separate Claude agent calls to a single-call architecture: parallel API fetch → deterministic JS math → one Sonnet synthesis call.</Info>

      <Card title="OrchestratorAgent">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/agents/orchestrator.ts</FilePath></p>
        <p className="text-sm text-gray-600 mb-3">The main entry point. Three phases:</p>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li><strong>Data Fetch</strong> — Parallel calls to FRED (rates, prices, Case-Shiller), BLS (CPI), area info. All cached with TTL.</li>
          <li><strong>Compute</strong> — Pure JS functions: <Code>computeAffordability()</Code>, <Code>computeRiskAssessment()</Code>, <Code>computeRecommendations()</Code>, <Code>computePropertyAnalysis()</Code>, <Code>computeRentVsBuy()</Code>, <Code>computeInvestmentAnalysis()</Code>, <Code>computePreApprovalReadiness()</Code></li>
          <li><strong>Synthesis</strong> — Single Claude Sonnet call with full report context → 1,500 token narrative summary. 15s timeout with template fallback.</li>
        </ol>
      </Card>

      <Card title="BaseAgent (legacy)">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/agents/base-agent.ts</FilePath></p>
        <p className="text-sm text-gray-600">Abstract base class used by the legacy per-agent architecture. Features: tool-use loop (max 3 iterations), exponential backoff retry (1 retry), fallback to cheaper model on overload, prompt caching via <Code>cache_control: ephemeral</Code>.</p>
      </Card>

      <Card title="Model Configuration">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/config.ts</FilePath></p>
        <Table
          headers={["Role", "Default Model", "Env Override"]}
          rows={[
            ["Agents / Chat", "claude-haiku-4-5-20251001", "CLAUDE_MODEL"],
            ["Synthesis", "claude-sonnet-4-5-20250929", "CLAUDE_SUMMARY_MODEL"],
            ["Judge", "claude-haiku-4-5-20251001", "CLAUDE_JUDGE_MODEL"],
          ]}
        />
      </Card>

      <Card title="Langfuse Tracing">
        <p className="text-sm text-gray-600"><FilePath>src/lib/langfuse.ts</FilePath> — Every Claude call is traced. <Code>traceGeneration()</Code> for non-streaming, <Code>createStreamTrace()</Code> for streaming. Both auto-log to <Code>llm_costs</Code> DB table. <strong>Must call <Code>flushLangfuse()</Code> at end of every serverless route.</strong></p>
      </Card>
    </>
  );
}

function FinancialMathSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Financial Math</h2>
      <Info>All computations are pure JS — no AI calls. Deterministic and unit-tested with Vitest.</Info>
      <Card>
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/utils/financial-math.ts</FilePath></p>
        <Table
          headers={["Function", "Purpose"]}
          rows={[
            ["calculateMaxHomePrice()", "Max price from income, debts, DTI limits (28% front / 36% back)"],
            ["calculateMonthlyPayment()", "PITI + PMI breakdown for a given home price"],
            ["calculateDTI()", "Front-end and back-end DTI ratios with status labels"],
            ["generateAmortizationSummary()", "5-year year-by-year principal, interest, balance, equity %"],
            ["stressTestRateHike()", "Payment impact of +1%, +2%, +3% rate increases"],
            ["stressTestIncomeLoss()", "DTI and emergency runway at -20%, -50% income"],
            ["evaluateEmergencyFund()", "Months of coverage, adequacy rating"],
            ["calculateRentVsBuy()", "30-year month-by-month simulation, break-even month"],
            ["estimateMonthlyRent()", "Rent estimate from area data (fallback: 0.8% of price / 12)"],
            ["calculateInvestmentMetrics()", "NOI, cap rate, CoC return, GRM, cash flow"],
            ["projectInvestmentReturns()", "10-year projections with appreciation + rent growth"],
          ]}
        />
      </Card>
    </>
  );
}

function MarketDataSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Data Services</h2>

      <Card title="FRED API Client">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/services/fred-api.ts</FilePath></p>
        <p className="text-sm text-gray-600 mb-3">Fetches live data from the Federal Reserve Economic Data API. Series used:</p>
        <Table
          headers={["Series ID", "Data"]}
          rows={[
            ["MORTGAGE30US", "30-year fixed mortgage rate (weekly)"],
            ["MORTGAGE15US", "15-year fixed mortgage rate (weekly)"],
            ["MORTGAGE5US", "5/1 ARM rate (weekly)"],
            ["DFF", "Federal funds effective rate (daily)"],
            ["MSPUS", "Median sales price of existing homes (quarterly)"],
            ["ASPNHSUS", "Average sales price of new homes (monthly)"],
            ["CSUSHPINSA", "Case-Shiller US National Home Price Index (monthly)"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">Uses <Code>CacheService</Code> with configurable TTL. Also fetches 10-year historical data for charts.</p>
      </Card>

      <Card title="BLS API Client">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/services/bls-api.ts</FilePath></p>
        <p className="text-sm text-gray-600">Bureau of Labor Statistics. Shelter CPI (<Code>CUSR0000SAH1</Code>) and general CPI (<Code>CUSR0000SA0</Code>) for inflation data. Free tier works without API key.</p>
      </Card>

      <Card title="Property Search (Zillow)">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/services/property-search.ts</FilePath></p>
        <p className="text-sm text-gray-600">Via RapidAPI <Code>zillow-com1</Code> endpoint. <Code>searchProperties(&#123; location, maxPrice, minBeds &#125;)</Code> returns <Code>PropertyListing[]</Code>. Free tier: 50 requests/month. Requires <Code>RAPIDAPI_KEY</Code>.</p>
      </Card>

      <Card title="Area Info (Static)">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/data/area-info.ts</FilePath></p>
        <p className="text-sm text-gray-600">Curated static data for 250+ US cities. Includes median home prices, median rents, school ratings, walkability, cost of living index, property tax rates, and neighborhood vibe descriptions. Used by the orchestrator and chat tools.</p>
      </Card>
    </>
  );
}

function RagSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">RAG Knowledge Base</h2>
      <Warn>No vector database — uses BM25-style keyword matching. Good enough for a curated corpus but does not scale to large document collections.</Warn>

      <Card title="Architecture">
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li><strong>Knowledge Base</strong> <FilePath>src/lib/rag/knowledge-base.ts</FilePath> — Static curated documents on FHA, VA, PMI, DTI, closing costs, first-time buyer programs, credit scores, etc.</li>
          <li><strong>Retriever</strong> <FilePath>src/lib/rag/retriever.ts</FilePath> — BM25-style keyword retrieval. <Code>retrieve(query, topK)</Code> returns scored documents.</li>
          <li><strong>Pipeline</strong> <FilePath>src/lib/rag/pipeline.ts</FilePath> — Full flow: retrieve top-3 docs → build augmented prompt → call Claude Haiku → return answer + source citations + optional debug info.</li>
        </ol>
      </Card>

      <Card title="Usage Points">
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Chat tool: <Code>lookup_mortgage_info</Code> — invoked when users ask general mortgage questions</li>
          <li>RAG demo page: <Code>/rag-demo</Code> with <Code>/api/rag-demo</Code></li>
          <li>MCP server: <Code>lookup_mortgage_info</Code> tool</li>
        </ul>
      </Card>
    </>
  );
}

function ChatSystemSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Chat System</h2>
      <Card title="Streaming Architecture">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/app/api/chat/route.ts</FilePath> (~1000 lines)</p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>SSE (Server-Sent Events) with <Code>text/event-stream</Code></li>
          <li>Token-by-token streaming via <Code>client.messages.stream()</Code></li>
          <li>Tool-use loop: max 5 iterations (stream text → detect tool_use → execute → loop)</li>
          <li>Prompt caching: system prompt + tools marked with <Code>cache_control: ephemeral</Code> (5-min TTL)</li>
          <li>Full report context embedded in system prompt</li>
        </ul>
      </Card>

      <Card title="9 Chat Tools">
        <Table
          headers={["Tool", "Source"]}
          rows={[
            ["recalculate_affordability", "JS math"],
            ["calculate_payment_for_price", "JS math"],
            ["compare_scenarios", "JS math"],
            ["stress_test", "JS math"],
            ["rent_vs_buy", "JS math"],
            ["analyze_property", "JS math (uses report data)"],
            ["lookup_mortgage_info", "RAG retriever"],
            ["get_current_rates", "FRED API"],
            ["search_properties", "Zillow/RapidAPI"],
          ]}
        />
      </Card>

      <Card title="5 Context Engineering Layers">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/chat-context.ts</FilePath></p>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li><strong>Token-aware truncation</strong> — Drops oldest message pairs if total exceeds 200K token budget</li>
          <li><strong>Conversation summarization</strong> — Haiku compresses older messages into a summary after 6+ messages</li>
          <li><strong>Adaptive persona hints</strong> — Tailors advice tone based on report profile (first-time buyer, veteran, investor, etc.)</li>
          <li><strong>Session memory</strong> — Extracts facts from tool results into a persistent memory object</li>
          <li><strong>Tool result caching</strong> — Per-tool TTL cache avoids re-execution on identical params</li>
        </ol>
      </Card>
    </>
  );
}

function GuardrailsSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Guardrails</h2>
      <p className="text-sm text-gray-600 mb-4"><FilePath>src/lib/guardrails.ts</FilePath></p>

      <Card title="Layer 1: Input Validation">
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Length check: rejects messages over 2,000 characters</li>
          <li>Injection regex: detects prompt injection patterns (ignore instructions, system prompt, etc.)</li>
          <li>Claude Haiku topic classifier: fast binary check if the message is on-topic (mortgage/housing). Returns canned response if off-topic.</li>
        </ul>
      </Card>

      <Card title="Layer 2: System Prompt Hardening">
        <p className="text-sm text-gray-600"><Code>GUARDRAIL_SYSTEM_PROMPT_SUFFIX</Code> appended to the chat system prompt. Instructs Claude to stay on topic, refuse non-housing questions, and never reveal system prompts.</p>
      </Card>

      <Card title="Layer 3: Tool Parameter Validation">
        <p className="text-sm text-gray-600">Range checks on numeric inputs (income 0-10M, rates 0-1, etc.). Cross-field validation (e.g., down payment cannot exceed home price). Returns structured error to Claude if invalid.</p>
      </Card>

      <Card title="Layer 4: Output Fact-Checking">
        <p className="text-sm text-gray-600"><Code>checkOutputNumbers(text, report)</Code> — Extracts dollar amounts from Claude&apos;s response and compares against the report. If any number differs by &gt;10%, appends a correction note to the stream.</p>
      </Card>
    </>
  );
}

function DatabaseSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Database</h2>
      <Info>DB is optional — <Code>isDbAvailable</Code> flag enables graceful degradation. All DB writes are fire-and-forget (non-blocking).</Info>

      <Card title="Schema">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/db/schema.ts</FilePath> — Drizzle ORM with <Code>pgTable</Code></p>
        <Table
          headers={["Table", "Purpose", "Key Fields"]}
          rows={[
            ["users", "Auth users", "id, email, tier, stripeCustomerId"],
            ["accounts", "OAuth accounts (Google)", "userId, provider, access_token (encrypted)"],
            ["saved_reports", "User-saved analysis reports", "userId, name, report (JSONB)"],
            ["user_usage", "Tier usage counters", "userId, action, periodStart, count (unique idx)"],
            ["tier_change_log", "Audit trail for tier changes", "userId, previousTier, newTier, changedBy"],
            ["usage_events", "API call analytics", "route, method, statusCode, durationMs"],
            ["llm_costs", "Per-LLM-call costs", "model, inputTokens, outputTokens, totalCost"],
            ["error_logs", "API route errors", "route, message, stack"],
            ["feedback", "User thumbs up/down", "type, rating, traceId"],
            ["judge_scores", "LLM judge scores", "accuracy, relevance, helpfulness, safety, overall"],
            ["eval_results", "Eval run results", "testCaseId, patternScore, judgeScores, overallPass"],
          ]}
        />
      </Card>

      <Card title="Connection">
        <p className="text-sm text-gray-600"><FilePath>src/lib/db/index.ts</FilePath> — <Code>getDb()</Code> lazy singleton. Uses <Code>@vercel/postgres</Code> driver for Neon websocket connections. Connection pooling handled by Neon serverless driver.</p>
      </Card>

      <Card title="Key Patterns">
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li><Code>logApiError()</Code>, <Code>logUsageEvent()</Code>, <Code>logLlmCost()</Code> — fire-and-forget DB writes in <FilePath>src/lib/db/track.ts</FilePath></li>
          <li><Code>withTracking()</Code> — HOF that wraps API handlers with auto usage event logging</li>
          <li>Retention: <Code>purgeExpiredData()</Code> deletes records older than 90-365 days per table</li>
        </ul>
      </Card>
    </>
  );
}

function AuthSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Auth & Security</h2>

      <Card title="NextAuth v5 Configuration">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/auth.ts</FilePath></p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Provider: Google OAuth</li>
          <li>Adapter: <Code>DrizzleAdapter</Code> wrapped with <Code>withEncryptedTokens()</Code></li>
          <li>Strategy: JWT (not database sessions)</li>
          <li>JWT callback: embeds <Code>tier</Code> from DB on sign-in, re-checks every 5 minutes via <Code>tierCheckedAt</Code></li>
          <li>Session callback: passes <Code>token.tier</Code> → <Code>session.user.tier</Code></li>
        </ul>
      </Card>

      <Card title="Token Encryption">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/encryption.ts</FilePath></p>
        <p className="text-sm text-gray-600">AES-256-GCM via Web Crypto API (edge-compatible). Encrypts <Code>access_token</Code>, <Code>refresh_token</Code>, <Code>id_token</Code> in the accounts table. Key: <Code>ENCRYPTION_KEY</Code> (64-char hex). Generate with: <Code>openssl rand -hex 32</Code></p>
      </Card>

      <Card title="Admin Auth">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/admin-auth.ts</FilePath></p>
        <p className="text-sm text-gray-600"><Code>requireAdmin()</Code> — checks session + email against <Code>ADMIN_EMAILS</Code> env var. Returns 401/403 or null (allowed). Called inside admin API route handlers. If <Code>ADMIN_EMAILS</Code> is unset, any authenticated user passes.</p>
      </Card>

      <Card title="Rate Limiting">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/rate-limit.ts</FilePath></p>
        <p className="text-sm text-gray-600">In-memory sliding window per IP. <Code>checkRateLimit(key, limit, windowMs)</Code>. Per-process only (not shared across serverless instances). Limits: analyze 10/hr, chat 60/hr, extract 20/hr.</p>
        <Warn>Per-process limitation: each serverless cold start gets its own rate limit map. Consider Upstash Redis for production-grade limiting.</Warn>
      </Card>

      <Card title="CSP Header">
        <p className="text-sm text-gray-600 mb-3"><FilePath>next.config.ts</FilePath></p>
        <p className="text-sm text-gray-600">Content Security Policy set via security headers. Allowlists: self, Sentry, Mapbox, Langfuse, Google. <Code>frame-ancestors &apos;none&apos;</Code>, <Code>base-uri &apos;self&apos;</Code>.</p>
      </Card>
    </>
  );
}

function TierSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Tier System</h2>

      <Card title="Limits">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/tier.ts</FilePath></p>
        <Table
          headers={["", "Free", "Pro"]}
          rows={[
            ["Reports / month", "1", "20"],
            ["Chat / day", "20", "Unlimited"],
            ["Saved reports", "3", "Unlimited"],
          ]}
        />
      </Card>

      <Card title="Enforcement Flow">
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li>API route calls <Code>auth()</Code> → gets <Code>session.user.tier</Code> from JWT</li>
          <li><Code>checkUsage(userId, tier, action)</Code> reads counter from <Code>user_usage</Code> table</li>
          <li>If over limit → returns <Code>&#123; error: &quot;limit_reached&quot;, message, usageStatus &#125;</Code> with 403</li>
          <li>If allowed → proceeds with request → <Code>incrementUsage(userId, action)</Code> on success</li>
          <li>Client detects 403 <Code>limit_reached</Code> → shows <Code>UpgradePrompt</Code> modal</li>
        </ol>
      </Card>

      <Card title="Counter Storage">
        <p className="text-sm text-gray-600"><Code>user_usage</Code> table with unique index on <Code>(userId, action, periodStart)</Code>. Upsert via Drizzle <Code>onConflictDoUpdate</Code>: <Code>INSERT ... ON CONFLICT DO UPDATE SET count = count + 1</Code>. Period boundaries: <Code>getMonthStart()</Code> (analyze), <Code>getDayStart()</Code> (chat).</p>
      </Card>

      <Card title="Admin Management">
        <p className="text-sm text-gray-600"><Code>PATCH /api/admin/subscriptions</Code> — changes tier and records in <Code>tier_change_log</Code>. The <Code>/admin/subscriptions</Code> page shows all users with usage stats and upgrade/downgrade buttons.</p>
      </Card>
    </>
  );
}

function EvalSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Eval & Quality</h2>

      <Card title="Eval Runner">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/eval/eval-runner.ts</FilePath></p>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
          <li>Loads golden dataset (<Code>data/golden-dataset.json</Code>, 20+ test cases)</li>
          <li>For each case: sends message to <Code>/api/chat</Code> with a mock report</li>
          <li>Scores response: pattern matching (mustInclude, mustNotInclude, expectedPatterns, expectedToolCalls)</li>
          <li>LLM-as-judge: Claude Haiku scores accuracy, relevance, helpfulness, safety (1-5 each)</li>
          <li>Pass threshold: pattern score ≥ 0.8 AND judge overall ≥ 3.5</li>
          <li>Persists to DB (<Code>eval_results</Code> + <Code>judge_scores</Code>) and syncs to Langfuse dataset</li>
        </ol>
      </Card>

      <Card title="LLM-as-Judge">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/eval/judge.ts</FilePath></p>
        <p className="text-sm text-gray-600">Two modes: <Code>judgeResponse()</Code> for chat responses, <Code>judgeReportAsync()</Code> for full reports. Both use Claude Haiku with structured output. Dimensions: accuracy, relevance, helpfulness, safety. Each 1-5 with text reasons.</p>
      </Card>

      <Card title="Real-time Judging">
        <p className="text-sm text-gray-600">When <Code>ENABLE_REALTIME_JUDGE=true</Code>, every chat response and report is scored asynchronously after the stream closes. Scores persist to <Code>judge_scores</Code> table with <Code>source: &quot;realtime&quot;</Code>. Viewable in <Code>/admin/quality</Code>.</p>
      </Card>
    </>
  );
}

function ObservabilitySection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Observability</h2>

      <Card title="Langfuse (LLM Tracing)">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/langfuse.ts</FilePath></p>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Every Claude call creates a Langfuse generation with model, tokens, cost</li>
          <li>Streaming traces: <Code>createStreamTrace()</Code> groups multiple tool-call iterations</li>
          <li>Auto-logs to <Code>llm_costs</Code> table: model, input/output/cache tokens, USD cost</li>
          <li><strong>Critical:</strong> <Code>flushLangfuse()</Code> must be called before serverless function returns</li>
        </ul>
      </Card>

      <Card title="Sentry (Error Monitoring)">
        <p className="text-sm text-gray-600">Three config files: <Code>sentry.client.config.ts</Code>, <Code>sentry.server.config.ts</Code>, <Code>sentry.edge.config.ts</Code>. Captures unhandled errors, API failures, and slow transactions.</p>
      </Card>

      <Card title="DB-backed Logging">
        <p className="text-sm text-gray-600 mb-3"><FilePath>src/lib/db/track.ts</FilePath></p>
        <Table
          headers={["Function", "Table", "Data"]}
          rows={[
            ["logUsageEvent()", "usage_events", "Route, method, status, duration, metadata"],
            ["logLlmCost()", "llm_costs", "Model, tokens, cache tokens, USD cost"],
            ["logApiError()", "error_logs", "Route, method, error message, stack trace"],
          ]}
        />
        <p className="text-sm text-gray-600 mt-3">All are fire-and-forget (catch errors silently). Admin pages query these tables directly.</p>
      </Card>

      <Card title="Admin Dashboard Pages">
        <Table
          headers={["Page", "Shows"]}
          rows={[
            ["/admin", "Overview: total reports, chats, errors, costs, avg quality"],
            ["/admin/quality", "Judge scores: accuracy, relevance, helpfulness, safety trends"],
            ["/admin/eval", "Eval runs: pass/fail rates, test case results"],
            ["/admin/feedback", "User thumbs up/down with comments"],
            ["/admin/usage", "API call volume by route over time"],
            ["/admin/costs", "LLM spend by model, daily/weekly totals"],
            ["/admin/errors", "Error log with route, message, stack, timestamp"],
            ["/admin/subscriptions", "User list with tiers, usage, upgrade/downgrade"],
          ]}
        />
      </Card>
    </>
  );
}

function McpSection() {
  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">MCP Server</h2>
      <Card title="Overview">
        <p className="text-sm text-gray-600 mb-3"><FilePath>mcp-server/</FilePath></p>
        <p className="text-sm text-gray-600 mb-3">Model Context Protocol server exposing the calculator tools to any MCP-compatible client (Claude Desktop, Cursor, etc.).</p>
        <Table
          headers={["Tool", "Function"]}
          rows={[
            ["calculate_affordability", "Max price + monthly payment from income/debts/savings"],
            ["analyze_property", "Property-specific verdict at a given price"],
            ["compare_scenarios", "Side-by-side loan comparison (e.g., 15yr vs 30yr)"],
            ["stress_test", "Rate hike + income loss simulations"],
            ["rent_vs_buy", "Rent vs. buy cost comparison over N years"],
            ["lookup_mortgage_info", "RAG knowledge base search"],
          ]}
        />
      </Card>

      <Card title="Transport">
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li><strong>stdio</strong> — For local Claude Desktop integration. Run via <Code>node mcp-server/dist/index.js</Code></li>
          <li><strong>SSE</strong> — Via <Code>/api/[transport]</Code> route for remote MCP clients</li>
        </ul>
      </Card>

      <Card title="Documentation">
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li><FilePath>mcp-server/docs/MCP-IMPLEMENTATION.md</FilePath> — Full implementation guide</li>
          <li><FilePath>mcp-server/docs/CHATGPT-GPT-SETUP.md</FilePath> — GPT Actions setup (compatible endpoints)</li>
        </ul>
      </Card>
    </>
  );
}
