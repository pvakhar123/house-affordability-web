"use client";

import { useState, useRef, useEffect } from "react";
import { compressReport } from "@/lib/share-report";
import type { FinalReport } from "@/lib/types";

interface ReportSummary {
  id: string;
  name: string;
  savedAt: string;
  maxPrice: number | null;
  monthlyPayment: number | null;
  location: string | null;
  rateAtAnalysis: number | null;
  backEndRatio: number | null;
  downPaymentPercent: number | null;
  loanAmount: number | null;
  riskLevel: string | null;
  propertyVerdict: string | null;
  rentVsBuyVerdict: string | null;
  breakEvenYear: number | null;
}

interface Props {
  report: ReportSummary;
  currentRate: number | null;
  isLatest: boolean;
  isActiveChat: boolean;
  onChatAbout: (reportId: string) => void;
  onRefresh: () => void;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const riskColors: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-green-100", text: "text-green-700" },
  moderate: { bg: "bg-amber-100", text: "text-amber-700" },
  high: { bg: "bg-red-100", text: "text-red-700" },
  very_high: { bg: "bg-red-200", text: "text-red-800" },
};

const verdictLabels: Record<string, string> = {
  comfortable: "Comfortable",
  tight: "Tight fit",
  stretch: "Stretch",
  over_budget: "Over budget",
  buy_clearly: "Buying wins",
  buy_slightly: "Slight buy edge",
  toss_up: "Toss-up",
  rent_better: "Renting wins",
};

// ── Card Menu (rename / share / delete) ─────────────────
function CardMenu({ reportId, reportName, onRefresh }: { reportId: string; reportName: string; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(reportName);
  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "copied">("idle");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleRename = async () => {
    if (!nameInput.trim() || nameInput.trim() === reportName) {
      setRenaming(false);
      setNameInput(reportName);
      return;
    }
    await fetch(`/api/saved-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    setRenaming(false);
    setOpen(false);
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    await fetch(`/api/saved-reports/${reportId}`, { method: "DELETE" });
    setOpen(false);
    onRefresh();
  };

  const handleShare = async () => {
    setShareStatus("loading");
    try {
      const res = await fetch(`/api/saved-reports/${reportId}`);
      if (!res.ok) throw new Error("Failed");
      const { report } = await res.json() as { report: FinalReport };
      const encoded = await compressReport(report);
      const url = `${window.location.origin}/analyze?report=${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => { setShareStatus("idle"); setOpen(false); }, 1500);
    } catch {
      setShareStatus("idle");
    }
  };

  if (renaming) {
    return (
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setRenaming(false); setNameInput(reportName); } }}
          onBlur={handleRename}
          className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          placeholder="Report name"
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30">
          <button onClick={() => { setRenaming(true); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" /></svg>
            Rename
          </button>
          <button onClick={handleShare} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
            {shareStatus === "copied" ? "Copied!" : shareStatus === "loading" ? "..." : "Share"}
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Metric Cell ─────────────────────────────────────────
function MetricCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

// ── Main ReportCard ─────────────────────────────────────
export default function ReportCard({ report, currentRate, isLatest, isActiveChat, onChatAbout, onRefresh }: Props) {
  const rateDelta = report.rateAtAnalysis != null && currentRate != null
    ? +(currentRate - report.rateAtAnalysis).toFixed(3)
    : null;
  const showBanner = rateDelta != null && Math.abs(rateDelta) >= 0.05;
  const rateDropped = rateDelta != null && rateDelta < 0;
  const buyingPowerDelta = showBanner && report.maxPrice
    ? Math.round(report.maxPrice * Math.abs(rateDelta!) * 0.1)
    : null;

  const risk = report.riskLevel ?? "unknown";
  const riskStyle = riskColors[risk] ?? { bg: "bg-gray-100", text: "text-gray-600" };

  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${isLatest ? "ring-2 ring-blue-200 border-blue-100" : "border-gray-200"}`}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900 truncate">{report.name}</h3>
            {isLatest && (
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Latest</span>
            )}
            {isActiveChat && (
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">In chat</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {report.location ? (
              <span className="truncate">{report.location}</span>
            ) : (
              <span>General analysis</span>
            )}
            <span>&middot;</span>
            <span className="flex-shrink-0">{timeAgo(report.savedAt)}</span>
          </div>
        </div>
        <CardMenu reportId={report.id} reportName={report.name} onRefresh={onRefresh} />
      </div>

      {/* Metrics */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {report.maxPrice != null && (
            <MetricCell
              label="Max Price"
              value={fmt(report.maxPrice)}
              sub={report.downPaymentPercent != null ? `${Math.round(report.downPaymentPercent)}% down` : undefined}
            />
          )}
          {report.monthlyPayment != null && (
            <MetricCell label="Monthly" value={`${fmt(report.monthlyPayment)}/mo`} />
          )}
          {report.backEndRatio != null && (
            <MetricCell
              label="DTI"
              value={`${report.backEndRatio.toFixed(1)}%`}
              sub={report.backEndRatio <= 36 ? "Healthy" : report.backEndRatio <= 43 ? "Moderate" : "High"}
            />
          )}
          {risk !== "unknown" && (
            <div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">Risk</p>
              <span className={`inline-flex items-center px-2 py-1 text-sm font-semibold rounded-lg ${riskStyle.bg} ${riskStyle.text}`}>
                {risk === "very_high" ? "Very High" : risk.charAt(0).toUpperCase() + risk.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Optional badges */}
      {(report.propertyVerdict || report.rentVsBuyVerdict) && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {report.propertyVerdict && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              Property: {verdictLabels[report.propertyVerdict] ?? report.propertyVerdict}
            </span>
          )}
          {report.rentVsBuyVerdict && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              Rent vs Buy: {verdictLabels[report.rentVsBuyVerdict] ?? report.rentVsBuyVerdict}
              {report.breakEvenYear != null ? ` (break-even yr ${report.breakEvenYear})` : ""}
            </span>
          )}
        </div>
      )}

      {/* What's changed banner */}
      {showBanner && (
        <div className={`mx-5 mb-3 px-3 py-2.5 rounded-lg border ${rateDropped ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 flex-shrink-0 ${rateDropped ? "text-green-600" : "text-amber-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {rateDropped ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
              )}
            </svg>
            <p className={`text-sm ${rateDropped ? "text-green-800" : "text-amber-800"}`}>
              Rates {rateDropped ? "dropped" : "rose"} {Math.abs(rateDelta!).toFixed(2)}% since this analysis
              {buyingPowerDelta ? ` — buying power ${rateDropped ? "up" : "down"} ~${fmt(buyingPowerDelta)}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onChatAbout(report.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isActiveChat
              ? "bg-blue-100 text-blue-700 border border-blue-200"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          {isActiveChat ? "Chatting" : "Chat about this"}
        </button>
        <a
          href="/analyze"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Re-analyze
        </a>
        {report.rateAtAnalysis != null && currentRate != null && (
          <span className="text-[11px] text-gray-400 ml-auto hidden sm:inline">
            Rate then: {report.rateAtAnalysis.toFixed(2)}% &rarr; now: {currentRate.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
