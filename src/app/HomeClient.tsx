"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useFeatureFlagVariantKey, usePostHog } from "posthog-js/react";
import DashboardClient from "./saved-reports/DashboardClient";
import AffordabilityCard from "@/components/AffordabilityCard";
import RiskAssessmentCard from "@/components/RiskAssessmentCard";
import RentVsBuyCard from "@/components/RentVsBuyCard";
import {
  mockAffordability,
  mockRisk,
  mockRentVsBuy,
  MOCK_MORTGAGE_RATE,
} from "@/lib/data/mock-landing-data";

const CTA_VARIANTS: Record<string, string> = {
  control: "Start Free Analysis",
  "variant-a": "See What You Can Afford",
  "variant-b": "Get Your Free Report",
};

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: "4 AI Agents",
    description: "Market analyst, financial advisor, risk assessor, and research specialist collaborate on your analysis.",
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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Market Snapshot</h3>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "30-Year Fixed", value: "6.65%" },
            { label: "15-Year Fixed", value: "5.89%" },
            { label: "Fed Funds Rate", value: "4.33%" },
            { label: "Median Home Price", value: "$412K" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-gray-500 mb-0.5">{item.label}</p>
              <p className="text-lg font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <p className="text-[11px] text-gray-400 mb-2">30-Year Rate Trend (12 months)</p>
          <svg viewBox="0 0 200 40" className="w-full h-10" style={{ color: "#0071e3" }}>
            <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              points="0,28 20,30 40,25 60,20 80,22 100,18 120,15 140,18 160,12 180,10 200,14" />
            <polyline fill="url(#sparkFill)" stroke="none"
              points="0,28 20,30 40,25 60,20 80,22 100,18 120,15 140,18 160,12 180,10 200,14 200,40 0,40" />
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0071e3" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0071e3" stopOpacity="0" />
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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-50 rounded-xl flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-gray-900">Investment Analysis</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full">Strong Investment</span>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-50 rounded-xl p-2">
            <p className="text-[10px] text-gray-500">Cap Rate</p>
            <p className="text-sm font-semibold text-gray-900">5.8%</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2">
            <p className="text-[10px] text-gray-500">Cash-on-Cash</p>
            <p className="text-sm font-semibold text-gray-900">8.2%</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-[10px] text-gray-500 mb-1">Monthly Cash Flow</p>
          <p className="text-sm font-semibold text-emerald-600">+$342/mo</p>
        </div>
      </div>
    </div>
  );
}

/* ── Static preview: Readiness & Budget ── */
function ReadinessBudgetPreview() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Readiness & Budget Simulator</h3>
        </div>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e8e8ed" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#af52de" strokeWidth="3" strokeDasharray="97.4" strokeDashoffset="21.4" strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-gray-900">78</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Ready</p>
                <p className="text-xs text-gray-500">Pre-Approval Score</p>
              </div>
            </div>
            {[
              { label: "DTI Score", score: 21, max: 25, color: "bg-green-500" },
              { label: "Credit Score", score: 22, max: 25, color: "bg-green-500" },
              { label: "Down Payment", score: 20, max: 25, color: "bg-blue-500" },
              { label: "Debt Health", score: 15, max: 25, color: "bg-yellow-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs font-semibold text-gray-700">{item.score}/{item.max}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.score / item.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-700">Adjust your budget</p>
            {[
              { label: "Annual Income", value: "$133K", pct: 70 },
              { label: "Down Payment", value: "$97K", pct: 48 },
              { label: "Monthly Debt", value: "$450", pct: 25 },
              { label: "Emergency Fund", value: "$35K", pct: 58 },
              { label: "Closing Costs", value: "$12K", pct: 40 },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className="text-xs font-semibold text-gray-700">{s.value}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
            <div className="bg-violet-50 rounded-xl p-3 text-center">
              <p className="text-[11px] text-gray-500 mb-0.5">Estimated Max Price</p>
              <p className="text-lg font-semibold text-violet-700">$485,000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Static preview: AI Chat ── */
function ChatPreview() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">AI Chat</h3>
          <span className="text-[10px] text-gray-400 ml-auto">Powered by your analysis data</span>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-end">
          <div className="text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]" style={{ background: "#0071e3" }}>
            <p className="text-sm">Can I afford a $500K home if I put down 25%?</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-gray-50 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] space-y-2">
            <p className="text-sm text-gray-800">Based on your income of $133K and current debts, here&apos;s the breakdown for a $500K home with 25% down:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Down Payment", value: "$125,000", color: "text-gray-900" },
                { label: "Monthly Payment", value: "$3,280", color: "text-gray-900" },
                { label: "DTI Ratio", value: "37.2%", color: "text-amber-600" },
                { label: "Verdict", value: "Stretch", color: "text-amber-600" },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl p-2">
                  <p className="text-[10px] text-gray-500">{item.label}</p>
                  <p className={`text-xs font-semibold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-800">Your DTI would be 37.2%, which is above the recommended 36%. I&apos;d recommend staying closer to your max of <strong>$485K</strong>.</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]" style={{ background: "#0071e3" }}>
            <p className="text-sm">What if I pay off my car loan first?</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-sm text-gray-400 flex-1">Ask a follow-up question...</span>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#0071e3" }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Static preview: Property Recommendations ── */
function PropertyRecommendationsPreview() {
  const listings = [
    { address: "1247 Oak Valley Dr", city: "Austin, TX", price: "$465,000", beds: 3, baths: 2, sqft: "1,850", tag: "Within Budget", tagColor: "bg-green-50 text-green-700" },
    { address: "892 Maple Creek Ln", city: "Round Rock, TX", price: "$439,000", beds: 4, baths: 2.5, sqft: "2,100", tag: "Best Value", tagColor: "bg-blue-50 text-blue-700" },
    { address: "3156 Sunset Ridge Blvd", city: "Cedar Park, TX", price: "$478,000", beds: 3, baths: 2, sqft: "1,920", tag: "New Listing", tagColor: "bg-amber-50 text-amber-700" },
  ];
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Matching Properties</h3>
          <span className="text-[10px] text-gray-400 ml-auto">Based on your budget & location</span>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {listings.map((listing) => (
          <div key={listing.address} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-20 h-20 bg-gray-200 rounded-xl flex-shrink-0 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{listing.price}</p>
                <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${listing.tagColor}`}>{listing.tag}</span>
              </div>
              <p className="text-xs text-gray-700 truncate">{listing.address}</p>
              <p className="text-xs text-gray-500">{listing.city}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                <span>{listing.beds} bed</span>
                <span>{listing.baths} bath</span>
                <span>{listing.sqft} sqft</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Privacy Trust Card ── */
function PrivacyCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(52,199,89,0.1)" }}>
            <svg className="w-4 h-4" style={{ color: "#34c759" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Privacy & Security</h3>
        </div>
      </div>
      <div className="p-6 space-y-5">
        {[
          { icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z", title: "No data stored", desc: "Your financial details are processed in real-time and never saved to any database." },
          { icon: "M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88", title: "Minimal first-party analytics", desc: "No ads, no third-party trackers. Only anonymized usage patterns to improve the product." },
          { icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z", title: "AI-processed only", desc: "Your inputs go directly to our AI agents for analysis and are discarded after." },
        ].map((item) => (
          <div key={item.title} className="flex gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
        <div className="pt-2 flex items-center gap-2 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" style={{ color: "#34c759" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Not financial advice. Use at your own discretion.
        </div>
      </div>
    </div>
  );
}

const carouselSlides = [
  {
    title: "Affordability Analysis",
    description: "See your max home price, monthly payment breakdown, and DTI ratios at a glance.",
    content: <AffordabilityCard data={mockAffordability} risk={mockRisk} mortgageRate={MOCK_MORTGAGE_RATE} />,
  },
  {
    title: "Live Market Snapshot",
    description: "Real-time mortgage rates from the Federal Reserve with historical trend data.",
    content: <MarketRatesPreview />,
  },
  {
    title: "Risk Assessment",
    description: "Personalized risk score with stress tests and actionable recommendations.",
    content: <RiskAssessmentCard data={mockRisk} />,
  },
  {
    title: "Rent vs Buy Comparison",
    description: "Year-by-year financial comparison to see when buying beats renting.",
    content: <RentVsBuyCard data={mockRentVsBuy} />,
  },
  {
    title: "Readiness & Budget Simulator",
    description: "Pre-approval readiness score with interactive budget sliders.",
    content: <ReadinessBudgetPreview />,
  },
  {
    title: "Investment Analysis",
    description: "Cap rate, cash-on-cash return, and monthly cash flow projections.",
    content: <InvestmentPreview />,
  },
  {
    title: "Matching Properties",
    description: "Real listings from Realtor.com that match your budget and preferred location.",
    content: <PropertyRecommendationsPreview />,
  },
  {
    title: "AI Chat",
    description: "Ask follow-up questions about your results and get personalized answers instantly.",
    content: <ChatPreview />,
  },
  {
    title: "Your Privacy, Protected",
    description: "No personal data is collected or stored — ever.",
    content: <PrivacyCard />,
  },
];

function PreviewCarousel({ onCtaClick }: { onCtaClick: (location: string) => void }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const posthog = usePostHog();
  const total = carouselSlides.length;

  const trackSlide = useCallback((from: number, to: number, direction: string) => {
    posthog.capture("carousel_slide_changed", {
      from_slide: from,
      to_slide: to,
      slide_title: carouselSlides[to].title,
      direction,
    });
  }, [posthog]);

  const next = useCallback(() => setCurrent((i) => { const to = (i + 1) % total; trackSlide(i, to, "next"); return to; }), [total, trackSlide]);
  const prev = useCallback(() => setCurrent((i) => { const to = (i - 1 + total) % total; trackSlide(i, to, "prev"); return to; }), [total, trackSlide]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = carouselSlides[current];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="text-center mb-6">
        <p className="text-xs font-medium text-blue-600 tracking-wide mb-1">
          {current + 1} / {total}
        </p>
        <h3 className="text-xl font-semibold text-gray-900 tracking-tight">{slide.title}</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-lg mx-auto">{slide.description}</p>
      </div>

      <div className="relative max-w-3xl mx-auto">
        <button
          onClick={prev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-12 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 shadow-sm transition-all"
          aria-label="Previous slide"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button
          onClick={next}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-12 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 shadow-sm transition-all"
          aria-label="Next slide"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <div key={current} className="relative pointer-events-none preview-slide-up h-[460px] overflow-hidden">
          {slide.content}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f5f5f7] dark:from-[#0d1117] to-transparent" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-6">
        {carouselSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => { trackSlide(current, i, "dot_click"); setCurrent(i); }}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? "w-7 h-2"
                : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
            }`}
            style={i === current ? { background: "#0071e3" } : undefined}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="text-center mt-10">
        <a
          href="/analyze"
          onClick={() => onCtaClick("carousel")}
          className="inline-flex items-center gap-2 px-8 py-3.5 text-white text-sm font-medium rounded-full transition-all"
          style={{ background: "#0071e3", boxShadow: "0 4px 14px rgba(0, 113, 227, 0.3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#0077ed"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#0071e3"; }}
        >
          Get Your Personalized Analysis
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function LandingPage() {
  const posthog = usePostHog();
  const ctaVariant = useFeatureFlagVariantKey("landing-hero-cta");
  const ctaCopy = CTA_VARIANTS[ctaVariant as string] ?? "Start Free Analysis";

  const handleCtaClick = useCallback((location: string) => {
    posthog.capture("cta_clicked", {
      variant: ctaVariant ?? "control",
      cta_text: location === "hero" ? ctaCopy : "Get Your Personalized Analysis",
      location,
    });
  }, [posthog, ctaVariant, ctaCopy]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero — compact so previews are visible above the fold */}
      <section className="relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 pt-10 pb-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-tight">
            Home<span style={{ color: "#0071e3" }}>IQ</span>
          </h1>
          <p className="mt-2 text-base text-gray-500">
            AI-powered affordability analysis with real-time rates, market data, and risk assessment.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/analyze"
              onClick={() => handleCtaClick("hero")}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-white text-sm font-medium rounded-full transition-all"
              style={{ background: "#0071e3", boxShadow: "0 4px 14px rgba(0, 113, 227, 0.25)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#0077ed"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#0071e3"; }}
            >
              {ctaCopy}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-all"
            >
              How it works
            </a>
          </div>
          <p className="mt-2.5 text-[11px] text-gray-400">No sign-up required</p>
        </div>
      </section>

      {/* Preview Carousel */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="text-center mb-5">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">See what you&apos;ll get</h2>
          <p className="text-xs text-gray-500 mt-0.5">Real components from an actual analysis — powered by your data</p>
        </div>
        <PreviewCarousel onCtaClick={handleCtaClick} />
      </section>

      {/* Stats Strip */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: "12+", label: "Analysis Cards" },
              { value: "<2 min", label: "Full Report" },
              { value: "4", label: "AI Agents" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">How it works</h2>
          <p className="mt-2 text-sm text-gray-500">Four specialized AI agents collaborate on your analysis</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 shadow-sm hover:scale-[1.02] transition-transform duration-200"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
          <p className="text-xs text-gray-400 text-center">
            We do not store any personal data or information. This is not financial advice. Use at your own risk.
          </p>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} HomeIQ</span>
            <div className="flex items-center gap-4">
              <a href="/pricing" className="text-gray-500 hover:text-blue-600 transition-colors">Pricing</a>
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
