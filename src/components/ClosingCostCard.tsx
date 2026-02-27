"use client";

import { useState } from "react";
import type { ClosingCostEstimate, ClosingCostItem } from "@/lib/types";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  lender:       { label: "Lender Fees",      color: "bg-blue-500",   bg: "bg-blue-50" },
  title_escrow: { label: "Title & Escrow",   color: "bg-indigo-500", bg: "bg-indigo-50" },
  government:   { label: "Government Fees",  color: "bg-amber-500",  bg: "bg-amber-50" },
  prepaid:      { label: "Prepaid Items",    color: "bg-green-500",  bg: "bg-green-50" },
};

const CATEGORIES = ["lender", "title_escrow", "government", "prepaid"] as const;

export default function ClosingCostCard({ data }: { data: ClosingCostEstimate }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Legacy reports may have breakdown items without a `category` field
  const hasCategories = data.breakdown.some((i) => i.category);
  const total = data.breakdown.reduce((s, i) => s + i.amount, 0);

  const categoryTotals = data.categoryTotals ?? (hasCategories
    ? CATEGORIES.reduce((acc, cat) => {
        acc[cat] = data.breakdown
          .filter((i: ClosingCostItem) => i.category === cat)
          .reduce((s: number, i: ClosingCostItem) => s + i.amount, 0);
        return acc;
      }, {} as Record<string, number>)
    : ({} as Record<string, number>));

  const grouped = hasCategories
    ? CATEGORIES.reduce((acc, cat) => {
        acc[cat] = data.breakdown.filter((i: ClosingCostItem) => i.category === cat);
        return acc;
      }, {} as Record<string, ClosingCostItem[]>)
    : ({} as Record<string, ClosingCostItem[]>);

  return (
    <div className="space-y-5">
      {/* Total banner */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">
            {fmt(data.lowEstimate)} &ndash; {fmt(data.highEstimate)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.isStateSpecific && data.stateName
              ? `Based on ${data.stateName} rates`
              : "Based on national averages"}
          </p>
        </div>
        {data.isStateSpecific && data.state && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
            {data.state}-specific
          </span>
        )}
      </div>

      {hasCategories ? (
        <>
          {/* Proportional bar */}
          <div>
            <div className="flex h-3 rounded-full overflow-hidden">
              {CATEGORIES.map((cat) => {
                const pct = total > 0 ? ((categoryTotals[cat] ?? 0) / total) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={cat}
                    className={`${CATEGORY_META[cat].color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {CATEGORIES.map((cat) => {
                if (!categoryTotals[cat]) return null;
                return (
                  <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_META[cat].color}`} />
                    <span>{CATEGORY_META[cat].label}</span>
                    <span className="font-medium text-gray-800">{fmt(categoryTotals[cat])}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Itemized breakdown by category */}
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const items = grouped[cat];
              if (!items?.length) return null;
              const isOpen = expanded === cat;
              const meta = CATEGORY_META[cat];

              return (
                <div key={cat} className={`rounded-xl border border-gray-100 overflow-hidden`}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : cat)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${meta.color}`} />
                      <span className="text-sm font-medium text-gray-800">{meta.label}</span>
                      <span className="text-xs text-gray-400">({items.length} items)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{fmt(categoryTotals[cat])}</span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>
                  {isOpen && (
                    <div className={`px-4 pb-3 ${meta.bg}`}>
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="text-gray-600">{item.item}</span>
                          <span className="font-medium text-gray-800 tabular-nums">{fmt(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Legacy flat list (no categories) */
        <div className="space-y-1">
          {data.breakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-600">{item.item}</span>
              <span className="font-medium text-gray-800 tabular-nums">{fmt(item.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
            <span className="font-medium text-gray-800">Total Estimate</span>
            <span className="font-semibold text-gray-900 tabular-nums">{fmt(total)}</span>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-gray-400">
        Estimates based on {data.isStateSpecific ? "state" : "national"} averages. Actual costs vary by lender, county, and negotiation.
      </p>
    </div>
  );
}
