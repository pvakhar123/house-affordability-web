"use client";

import { useState } from "react";

const API_BASE = "https://aicalculator.homes";

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description: string;
  auth?: string;
  rateLimit?: string;
  body?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
}

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/analyze",
    summary: "Run full affordability analysis",
    description:
      "Streams a multi-agent AI analysis including affordability, market data, risk assessment, and recommendations. Returns NDJSON events as phases complete.",
    auth: "None (rate-limited)",
    rateLimit: "10 requests/hour per IP",
    body: [
      { name: "annualGrossIncome", type: "number", required: true, description: "Annual gross income in dollars" },
      { name: "monthlyDebtPayments", type: "number", required: true, description: "Total monthly debt payments" },
      { name: "downPaymentSavings", type: "number", required: true, description: "Down payment amount in dollars" },
      { name: "creditScore", type: "number", required: true, description: "Credit score (300-850)" },
      { name: "targetLocation", type: "string", required: false, description: "City/zip to analyze" },
      { name: "preferredLoanTerm", type: "number", required: false, description: "15, 20, or 30 years" },
      { name: "property", type: "object", required: false, description: "Specific property details (listingPrice, address, etc.)" },
    ],
    response: `// Streamed NDJSON events:
{"phase":"market_data","marketSnapshot":{...}}
{"phase":"analysis","affordability":{...},"riskAssessment":{...}}
{"phase":"summary","summary":"..."}
{"phase":"complete","disclaimers":"...","generatedAt":"..."}`,
  },
  {
    method: "POST",
    path: "/api/chat",
    summary: "Chat about your report",
    description:
      "Ask follow-up questions about a generated affordability report. Streams markdown responses.",
    auth: "None (rate-limited)",
    rateLimit: "60 requests/hour per IP",
    body: [
      { name: "message", type: "string", required: true, description: "User question (max 5000 chars)" },
      { name: "report", type: "object", required: true, description: "The FinalReport object from /api/analyze" },
      { name: "history", type: "array", required: true, description: "Previous chat messages [{role, content}]" },
    ],
    response: `// Streamed text chunks
data: "Based on your report..."`,
  },
  {
    method: "POST",
    path: "/api/extract-property",
    summary: "Extract property details from a listing URL",
    description:
      "Fetches a property listing page and uses AI to extract structured details (price, address, taxes, HOA, etc.).",
    auth: "None (rate-limited)",
    rateLimit: "20 requests/hour per IP",
    body: [
      { name: "url", type: "string", required: true, description: "Full URL of the property listing" },
    ],
    response: `{
  "success": true,
  "property": {
    "address": "123 Main St, Austin, TX",
    "listingPrice": 450000,
    "propertyTaxAnnual": 5400,
    "hoaMonthly": 250,
    "squareFootage": 2100,
    "bedrooms": 3,
    "bathrooms": 2
  }
}`,
  },
  {
    method: "POST",
    path: "/api/extract-document",
    summary: "Extract financial data from documents",
    description:
      "Upload pay stubs, tax returns, or bank statements as base64 images. AI extracts income, debts, and savings.",
    auth: "None (rate-limited)",
    rateLimit: "20 requests/hour per IP",
    body: [
      { name: "documents", type: "array", required: true, description: "Array of {data: base64, mediaType, filename} (max 5)" },
    ],
    response: `{
  "success": true,
  "extracted": {
    "annualIncome": 95000,
    "monthlyDebts": 450,
    "savings": 60000
  }
}`,
  },
  {
    method: "POST",
    path: "/api/feedback",
    summary: "Submit feedback on reports or chat",
    description: "Rate a report or chat response with thumbs up/down and optional comment.",
    auth: "None",
    body: [
      { name: "type", type: "string", required: true, description: '"chat" or "report"' },
      { name: "rating", type: "string", required: true, description: '"up" or "down"' },
      { name: "comment", type: "string", required: false, description: "Optional feedback text" },
    ],
    response: `{ "success": true }`,
  },
  {
    method: "POST",
    path: "/api/gpt/calculate-affordability",
    summary: "Calculate max affordable home price",
    description:
      "Pure math calculation — no AI. Returns max price, monthly payment breakdown, DTI analysis, and amortization summary.",
    auth: "None",
    body: [
      { name: "annual_gross_income", type: "number", required: true, description: "Annual gross income" },
      { name: "down_payment_amount", type: "number", required: true, description: "Down payment savings" },
      { name: "monthly_debt_payments", type: "number", required: false, description: "Monthly debts (default: 0)" },
      { name: "interest_rate", type: "number", required: false, description: "Rate as decimal (default: 0.0675)" },
      { name: "loan_term_years", type: "number", required: false, description: "15, 20, or 30 (default: 30)" },
    ],
    response: `{
  "maxHomePrice": 485000,
  "recommendedHomePrice": 436500,
  "monthlyPayment": {
    "principalAndInterest": 2350,
    "propertyTax": 445,
    "homeInsurance": 125,
    "totalMonthly": 2920
  },
  "dtiAnalysis": { "frontEndDTI": 0.28, "backEndDTI": 0.36 }
}`,
  },
  {
    method: "POST",
    path: "/api/gpt/current-rates",
    summary: "Get live mortgage rates from FRED",
    description: "Returns today's 30-year fixed, 15-year fixed, and 5/1 ARM rates from the Federal Reserve.",
    auth: "None",
    body: [],
    response: `{
  "asOf": "2025-01-15",
  "thirtyYearFixed": 6.62,
  "fifteenYearFixed": 5.89,
  "fiveOneArm": 6.08,
  "source": "Federal Reserve (FRED)"
}`,
  },
];

export default function ApiDocsPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <a href="/" className="text-sm text-blue-600 hover:text-blue-800">&larr; Back to app</a>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI Home Research API v1.0 &middot; Base URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{API_BASE}</code>
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* Overview */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>All API routes accept and return JSON. Streaming endpoints return NDJSON (newline-delimited JSON).</p>
            <p>Responses include an <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">X-API-Version: 1.0</code> header.</p>
            <p>Rate limits are per-IP using a sliding window. Exceeding the limit returns <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">429 Too Many Requests</code> with a <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">Retry-After</code> header.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <a
              href="/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              OpenAPI Spec
            </a>
          </div>
        </section>

        {/* Endpoints */}
        <h2 className="text-lg font-semibold text-gray-900 pt-4">Endpoints</h2>
        {endpoints.map((ep, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="shrink-0 px-2 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-700">
                {ep.method}
              </span>
              <code className="text-sm font-mono text-gray-800">{ep.path}</code>
              <span className="text-sm text-gray-500 ml-auto hidden sm:inline">{ep.summary}</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${expanded === i ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded === i && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                <p className="text-sm text-gray-600">{ep.description}</p>

                <div className="flex gap-4 text-xs">
                  {ep.auth && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">Auth: {ep.auth}</span>
                  )}
                  {ep.rateLimit && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">Rate limit: {ep.rateLimit}</span>
                  )}
                </div>

                {ep.body && ep.body.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Request Body</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 border-b">
                            <th className="pb-2 pr-4">Field</th>
                            <th className="pb-2 pr-4">Type</th>
                            <th className="pb-2 pr-4">Required</th>
                            <th className="pb-2">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ep.body.map((field) => (
                            <tr key={field.name} className="border-b border-gray-50">
                              <td className="py-2 pr-4 font-mono text-xs text-gray-800">{field.name}</td>
                              <td className="py-2 pr-4 text-xs text-gray-500">{field.type}</td>
                              <td className="py-2 pr-4 text-xs">
                                {field.required ? (
                                  <span className="text-red-600 font-medium">Yes</span>
                                ) : (
                                  <span className="text-gray-400">No</span>
                                )}
                              </td>
                              <td className="py-2 text-xs text-gray-600">{field.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {ep.response && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Response Example</h4>
                    <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-lg overflow-x-auto">
                      <code>{ep.response}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
