"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { generateReportPDF } from "@/lib/utils/generate-pdf";
import { compressReport } from "@/lib/share-report";
import AffordabilityCard from "@/components/AffordabilityCard";
import MarketSnapshotCard from "@/components/MarketSnapshotCard";
import RiskAssessmentCard from "@/components/RiskAssessmentCard";
import LoanProgramsCard from "@/components/LoanProgramsCard";
import AmortizationTable from "@/components/AmortizationTable";
import PropertyAffordabilityCard from "@/components/PropertyAffordabilityCard";
import RentVsBuyCard from "@/components/RentVsBuyCard";
import MatchingPropertiesCard from "@/components/MatchingPropertiesCard";
import NeighborhoodInfoCard from "@/components/NeighborhoodInfoCard";
import BudgetSimulatorCard from "@/components/BudgetSimulatorCard";
import InvestmentAnalysisCard from "@/components/InvestmentAnalysisCard";
import AISummaryCard from "@/components/AISummaryCard";
import ChatInterface from "@/components/ChatInterface";
import type { FinalReport } from "@/lib/types";

interface DashboardData {
  user: { name: string; tier: "free" | "pro"; memberSince: string };
  rates: {
    current30yr: number | null;
    current15yr: number | null;
  };
  reports: {
    id: string;
    name: string;
    savedAt: string;
    maxPrice: number | null;
    monthlyPayment: number | null;
    location: string | null;
    rateAtAnalysis: number | null;
  }[];
  buyingPower: {
    latestMaxPrice: number | null;
    latestMonthlyPayment: number | null;
    rateDelta: number | null;
    currentRate: number | null;
  };
}

// ── Action Bar ──────────────────────────────────────────

function ActionBar({ report, reportId, reportName, location, onDelete, onRename }: {
  report: FinalReport;
  reportId: string;
  reportName: string;
  location?: string;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [renaming, setRenaming] = useState(false);
  const [editName, setEditName] = useState(reportName);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handlePDF() {
    setDownloading(true);
    try {
      const doc = generateReportPDF(report);
      doc.save("home-analysis.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    try {
      const encoded = await compressReport(report);
      const url = `${window.location.origin}/analyze?report=${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      setShareStatus("error");
      setTimeout(() => setShareStatus("idle"), 3000);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setEmailStatus("sending");
    try {
      const res = await fetch("/api/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, report }),
      });
      if (!res.ok) { setEmailStatus("error"); return; }
      setEmailStatus("sent");
      setTimeout(() => { setEmailOpen(false); setEmailStatus("idle"); setEmail(""); }, 2500);
    } catch {
      setEmailStatus("error");
    }
  }

  async function handleRename() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === reportName) { setRenaming(false); return; }
    try {
      const res = await fetch(`/api/saved-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) onRename(trimmed);
    } catch {}
    setRenaming(false);
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/saved-reports/${reportId}`, { method: "DELETE" });
      if (res.ok) onDelete();
    } catch {}
    setConfirmDelete(false);
  }

  const btnClass = "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors";
  const defaultBtn = `${btnClass} text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* PDF */}
      <button onClick={handlePDF} disabled={downloading} className={defaultBtn} title="Download PDF">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {downloading ? "..." : "PDF"}
      </button>

      {/* Share */}
      <button onClick={handleShare} className={shareStatus === "copied" ? `${btnClass} text-green-700 bg-green-50 border border-green-200` : defaultBtn} title="Copy share link">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.048a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 8.688" />
        </svg>
        {shareStatus === "copied" ? "Copied!" : shareStatus === "error" ? "Too large" : "Share"}
      </button>

      {/* Email */}
      {!emailOpen ? (
        <button onClick={() => setEmailOpen(true)} className={defaultBtn} title="Email report">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email
        </button>
      ) : (
        <form onSubmit={handleEmail} className="flex items-center gap-1.5">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required autoFocus
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none w-40" />
          <button type="submit" disabled={emailStatus === "sending" || emailStatus === "sent"}
            className={`${btnClass} ${emailStatus === "sent" ? "text-green-700 bg-green-50 border border-green-200" : "text-white bg-blue-600 hover:bg-blue-700"}`}>
            {emailStatus === "idle" ? "Send" : emailStatus === "sending" ? "..." : emailStatus === "sent" ? "Sent!" : "Retry"}
          </button>
          <button type="button" onClick={() => { setEmailOpen(false); setEmailStatus("idle"); setEmail(""); }} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      )}

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Rename */}
      {!renaming ? (
        <button onClick={() => { setEditName(reportName); setRenaming(true); }} className={defaultBtn} title="Rename">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          Rename
        </button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); handleRename(); }} className="flex items-center gap-1.5">
          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none w-40"
            onKeyDown={(e) => { if (e.key === "Escape") setRenaming(false); }} />
          <button type="submit" className={`${btnClass} text-white bg-blue-600 hover:bg-blue-700`}>Save</button>
          <button type="button" onClick={() => setRenaming(false)} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      )}

      {/* Delete */}
      {!confirmDelete ? (
        <button onClick={() => setConfirmDelete(true)} className={`${btnClass} text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 bg-white border border-gray-200`} title="Delete">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-red-600 font-medium">Delete?</span>
          <button onClick={handleDelete} className={`${btnClass} text-white bg-red-600 hover:bg-red-700`}>Yes</button>
          <button onClick={() => setConfirmDelete(false)} className={`${btnClass} text-gray-600 bg-white border border-gray-200 hover:bg-gray-50`}>No</button>
        </div>
      )}

      {/* Re-run analysis */}
      <a href={location ? `/analyze?location=${encodeURIComponent(location)}` : "/analyze"}
        className={`${btnClass} text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100`} title="Re-run with current rates">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
        Re-run
      </a>
    </div>
  );
}

// ── Home Switcher Dropdown ──────────────────────────────

function HomeSwitcher({ homes, activeId, onSwitch }: {
  homes: DashboardData["reports"];
  activeId: string | null;
  onSwitch: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const active = homes.find((h) => h.id === activeId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm max-w-[280px]"
      >
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <span className="truncate">{active?.location || active?.name || "Select home"}</span>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
          {homes.map((home) => {
            const isActive = home.id === activeId;
            const days = Math.floor((Date.now() - new Date(home.savedAt).getTime()) / 86_400_000);
            const timeLabel = days === 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days} days ago` : days < 30 ? `${Math.floor(days / 7)}w ago` : new Date(home.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <button
                key={home.id}
                onClick={() => { onSwitch(home.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : "text-gray-900"}`}>
                    {home.location || home.name}
                  </p>
                  <p className="text-xs text-gray-400">{timeLabel}</p>
                </div>
                {isActive && (
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <a href="/analyze" className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Analysis
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Loading / Empty states ──────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-44 bg-gray-200 rounded-xl animate-pulse mb-4" />
        <div className="space-y-4">
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AnalysisLoading() {
  return (
    <div className="space-y-4">
      <div className="h-44 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
    </div>
  );
}

function fmt$(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function buildInsightText(data: DashboardData | null): { headline: string } | null {
  if (!data) return null;
  const { buyingPower, reports } = data;
  const delta = buyingPower.rateDelta;
  const maxPrice = buyingPower.latestMaxPrice;

  if (delta != null && delta <= -0.15 && maxPrice) {
    const gain = Math.round(maxPrice * Math.abs(delta) * 0.1);
    return { headline: `Rates dropped ${Math.abs(delta).toFixed(2)}% — your buying power is up ~${fmt$(gain)}` };
  }
  if (delta != null && delta >= 0.15) {
    return { headline: `Rates rose ${delta.toFixed(2)}% since your last analysis — consider re-running` };
  }
  if (reports.length > 0) {
    const days = Math.floor((Date.now() - new Date(reports[0].savedAt).getTime()) / 86_400_000);
    if (days >= 14) return { headline: `It's been ${days} days — market conditions may have changed` };
  }
  if (reports.length > 0 && reports[0].location && maxPrice) {
    return { headline: `Tracking ${reports[0].location} — max budget ${fmt$(maxPrice)}` };
  }
  if (reports.length === 0) return { headline: "Run your first analysis to get started" };
  return null;
}

function ChatContextLabel({ name, report }: { name?: string; report: FinalReport }) {
  const maxPrice = report.affordability?.recommendedHomePrice;
  return (
    <div className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl border border-b-0 border-gray-200 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
        <span className="font-medium text-gray-700 truncate">{name ?? "Home"}</span>
      </div>
      {maxPrice && (
        <span className="text-[10px] text-blue-600 font-medium flex-shrink-0">
          Budget: {fmt$(maxPrice)}
        </span>
      )}
    </div>
  );
}

function ChatPlaceholder() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full items-center justify-center px-6">
      <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
      <p className="text-sm font-medium text-gray-600 mb-1">AI Chat Assistant</p>
      <p className="text-xs text-gray-400 text-center mb-3">Run an analysis to unlock chat with AI-powered calculators</p>
      <Link href="/analyze" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
        Start Analysis
      </Link>
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-12 shadow-sm text-center">
      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">No homes saved yet</h3>
      <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
        Run your first home affordability analysis to see detailed metrics, simulators, and AI-powered insights.
      </p>
      <Link href="/analyze" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Run Your First Analysis
      </Link>
    </div>
  );
}

// ── Hero Banner ─────────────────────────────────────────

function HeroBanner({ report, location }: { report: FinalReport; location?: string }) {
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const displayLocation = report.propertyAnalysis?.property.address || location || "";

  useEffect(() => {
    if (!displayLocation) return;
    fetch(`/api/location-image?location=${encodeURIComponent(displayLocation)}`)
      .then((r) => r.json())
      .then((data) => { if (data.propertyImage) setHeroImage(data.propertyImage); })
      .catch(() => {});
  }, [displayLocation]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-sm h-40 sm:h-48 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900">
      {!heroImage && (
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }} />
      )}
      {heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImage} alt={displayLocation} className="absolute inset-0 w-full h-full object-cover" onError={() => setHeroImage(null)} />
      )}
      <div className={`absolute inset-0 ${heroImage ? "bg-gradient-to-t from-black/70 via-black/30 to-transparent" : "bg-gradient-to-t from-black/40 to-transparent"}`} />
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
          {displayLocation ? displayLocation : "Home Analysis"}
        </h2>
        {report.generatedAt && (
          <p className="text-sm text-white/80 mt-1">
            Analyzed {new Date(report.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Nav Icons (inline SVGs) ─────────────────────────────

const navIcons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  investment: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  market: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  neighborhood: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
  risk: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  "rent-vs-buy": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  ),
  loans: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  ),
  equity: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  ),
  properties: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  ),
  ai: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
};

// ── Full Analysis View ──────────────────────────────────

function FullAnalysisView({ report, location }: { report: FinalReport; location?: string }) {
  const hasCore = report.affordability && report.riskAssessment && report.recommendations;
  const [satelliteUrl, setSatelliteUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("home");
  const displayLocation = report.propertyAnalysis?.property.address || location || "";

  useEffect(() => {
    if (!displayLocation) return;
    fetch(`/api/location-image?location=${encodeURIComponent(displayLocation)}`)
      .then((r) => r.json())
      .then((data) => { if (data.satelliteUrl) setSatelliteUrl(data.satelliteUrl); })
      .catch(() => {});
  }, [displayLocation]);

  if (!hasCore) return null;

  // Build nav items dynamically based on available data
  const navItems: { key: string; label: string }[] = [
    { key: "home", label: "Home" },
    ...(report.investmentAnalysis ? [{ key: "investment", label: "Investment" }] : []),
    { key: "market", label: "Market" },
    ...(report.neighborhoodInfo ? [{ key: "neighborhood", label: "Area" }] : []),
    { key: "risk", label: "Risk" },
    ...(report.rentVsBuy ? [{ key: "rent-vs-buy", label: "Rent vs Buy" }] : []),
    ...(report.recommendations.loanOptions?.length > 0 ? [{ key: "loans", label: "Loans" }] : []),
    { key: "equity", label: "Equity" },
    ...(location ? [{ key: "properties", label: "Properties" }] : []),
    ...(report.summary ? [{ key: "ai", label: "AI" }] : []),
  ];

  return (
    <div>
      {/* Mobile horizontal tabs (<lg) */}
      <div className="flex gap-1.5 pb-3 -mx-4 px-4 overflow-x-auto scrollbar-hide lg:!hidden">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveSection(item.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeSection === item.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            }`}
          >
            <span className="w-4 h-4 [&>svg]:w-4 [&>svg]:h-4">{navIcons[item.key]}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Desktop: sidebar + content row */}
      <div className="flex gap-4">
        {/* Desktop sidebar nav (lg+) */}
        <nav className="flex-col gap-1 sticky top-4 self-start w-12 flex-shrink-0 pt-1 hidden! lg:flex!">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`group relative w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                activeSection === item.key
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              {navIcons[item.key]}
              <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Section content */}
        <div className="flex-1 min-w-0 space-y-4">
        {activeSection === "home" && (
          <>
            <HeroBanner report={report} location={location} />
            {report.propertyAnalysis && (
              <PropertyAffordabilityCard data={report.propertyAnalysis} affordability={report.affordability} />
            )}
            <AffordabilityCard
              data={report.affordability}
              risk={report.riskAssessment}
              mortgageRate={report.marketSnapshot.mortgageRates.thirtyYearFixed}
            />
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Readiness & Budget Simulator</h3>
              <BudgetSimulatorCard
                affordability={report.affordability}
                marketSnapshot={report.marketSnapshot}
                recommendations={report.recommendations}
                preApprovalReadiness={report.preApprovalReadiness}
              />
            </div>
          </>
        )}

        {activeSection === "investment" && report.investmentAnalysis && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Investment Property Analysis</h3>
            <InvestmentAnalysisCard data={report.investmentAnalysis} />
          </div>
        )}

        {activeSection === "market" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Market Snapshot</h3>
            <MarketSnapshotCard data={report.marketSnapshot} satelliteUrl={satelliteUrl} />
          </div>
        )}

        {activeSection === "neighborhood" && report.neighborhoodInfo && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Neighborhood Info</h3>
            <NeighborhoodInfoCard data={report.neighborhoodInfo} />
          </div>
        )}

        {activeSection === "risk" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Risk Assessment</h3>
            <RiskAssessmentCard data={report.riskAssessment} />
          </div>
        )}

        {activeSection === "rent-vs-buy" && report.rentVsBuy && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Rent vs. Buy Analysis</h3>
            <RentVsBuyCard data={report.rentVsBuy} />
          </div>
        )}

        {activeSection === "loans" && report.recommendations.loanOptions?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Loan Programs</h3>
            <LoanProgramsCard data={report.recommendations.loanOptions} />
          </div>
        )}

        {activeSection === "equity" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">5-Year Equity Buildup</h3>
            <AmortizationTable data={report.affordability.amortizationSummary} />
          </div>
        )}

        {activeSection === "properties" && location && (
          <MatchingPropertiesCard
            affordability={report.affordability}
            marketData={report.marketSnapshot}
            location={location}
          />
        )}

        {activeSection === "ai" && report.summary && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">AI Detailed Analysis</h3>
            <AISummaryCard summary={report.summary} />
          </div>
        )}

        {report.disclaimers && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">Disclaimers</p>
            <ul className="space-y-1">
              {report.disclaimers.map((d, i) => (
                <li key={i} className="text-xs text-gray-400">{d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | undefined>();

  // Active home state — single fetch feeds both analysis view AND chat
  const [activeHomeId, setActiveHomeId] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<FinalReport | null>(null);
  const [activeLocation, setActiveLocation] = useState<string | undefined>();
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgrade") === "success") setShowUpgradeBanner(true);
  }, [searchParams]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchDashboard();
    else if (status === "unauthenticated") setLoading(false);
  }, [status, fetchDashboard]);

  // Set initial active home to latest
  useEffect(() => {
    if (data?.reports[0]?.id && !activeHomeId) setActiveHomeId(data.reports[0].id);
  }, [data?.reports, activeHomeId]);

  // Fetch full report when active home changes
  useEffect(() => {
    if (!activeHomeId) return;
    setReportLoading(true);
    setActiveReport(null);
    fetch(`/api/saved-reports/${activeHomeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (result) {
          setActiveReport(result.report);
          setActiveLocation(result.userLocation ?? undefined);
        }
      })
      .catch(() => {})
      .finally(() => setReportLoading(false));
  }, [activeHomeId]);

  const handleDeleteHome = useCallback(() => {
    if (!data || !activeHomeId) return;
    const remaining = data.reports.filter((r) => r.id !== activeHomeId);
    setData({ ...data, reports: remaining });
    setActiveHomeId(remaining[0]?.id ?? null);
    setActiveReport(null);
    setActiveLocation(undefined);
  }, [data, activeHomeId]);

  const handleRenameHome = useCallback((newName: string) => {
    if (!data || !activeHomeId) return;
    setData({
      ...data,
      reports: data.reports.map((r) => r.id === activeHomeId ? { ...r, name: newName } : r),
    });
  }, [data, activeHomeId]);

  if (status === "loading" || (status === "authenticated" && loading)) return <Skeleton />;

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your homes</h2>
          <p className="text-sm text-gray-500">Sign in with Google to access your saved home analyses.</p>
        </div>
      </div>
    );
  }

  const hasHomes = (data?.reports.length ?? 0) > 0;
  const activeHome = data?.reports.find((r) => r.id === activeHomeId);
  const activeHomeName = activeHome?.location || activeHome?.name;

  return (
    <>
      <div className="min-h-screen bg-gray-50" style={{ marginRight: hasHomes ? "clamp(0px, calc(100vw - 1280px + 400px), 400px)" : undefined }}>
        {/* Page header */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {hasHomes && data && (
                <HomeSwitcher
                  homes={data.reports}
                  activeId={activeHomeId}
                  onSwitch={(id) => setActiveHomeId(id)}
                />
              )}
              {!hasHomes && (
                <div>
                  {(() => {
                    const insight = buildInsightText(data);
                    if (insight) return <h1 className="text-lg font-bold text-gray-900">{insight.headline}</h1>;
                    return <h1 className="text-xl font-bold text-gray-900">My Homes</h1>;
                  })()}
                  {data?.user.name && (
                    <p className="text-xs text-gray-400 mt-0.5">Welcome back, {data.user.name.split(" ")[0]}</p>
                  )}
                </div>
              )}
            </div>
            <a
              href="/analyze"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Analysis
            </a>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          {showUpgradeBanner && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-800 font-medium">Welcome to Pro! Your upgrade is active.</p>
              </div>
              <button onClick={() => setShowUpgradeBanner(false)} className="text-green-600 hover:text-green-800">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Action bar */}
          {hasHomes && activeReport && activeHomeId && !reportLoading && (
            <ActionBar
              report={activeReport}
              reportId={activeHomeId}
              reportName={activeHome?.name ?? "Home"}
              location={activeLocation}
              onDelete={handleDeleteHome}
              onRename={handleRenameHome}
            />
          )}

          {/* Full analysis view or empty state */}
          {hasHomes ? (
            reportLoading ? (
              <AnalysisLoading />
            ) : activeReport ? (
              <FullAnalysisView report={activeReport} location={activeLocation} />
            ) : null
          ) : (
            <EmptyState />
          )}

          {/* Chat - below content on smaller screens */}
          {hasHomes && (
            <div className="block xl:hidden" style={{ height: "500px" }}>
              {reportLoading ? (
                <ChatLoading />
              ) : activeReport && activeHomeId ? (
                <div className="h-full flex flex-col">
                  <ChatContextLabel name={activeHomeName} report={activeReport} />
                  <div className="flex-1 min-h-0">
                    <ChatInterface key={activeHomeId} report={activeReport} userLocation={activeLocation} initialPrompt={chatPrompt} reportId={activeHomeId} />
                  </div>
                </div>
              ) : (
                <ChatPlaceholder />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat - fixed right column on xl+ */}
      {hasHomes && (
        <div style={{ zIndex: 30 }} className="fixed right-0 top-14 bottom-0 w-[390px] p-4 pl-0 max-xl:hidden flex flex-col">
          {reportLoading ? (
            <ChatLoading />
          ) : activeReport && activeHomeId ? (
            <div className="flex flex-col h-full">
              <ChatContextLabel name={activeHomeName} report={activeReport} />
              <div className="flex-1 min-h-0">
                <ChatInterface key={activeHomeId} report={activeReport} userLocation={activeLocation} initialPrompt={chatPrompt} reportId={activeHomeId} />
              </div>
            </div>
          ) : (
            <ChatPlaceholder />
          )}
        </div>
      )}
    </>
  );
}
