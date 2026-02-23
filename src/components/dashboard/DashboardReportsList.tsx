"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { compressReport } from "@/lib/share-report";
import type { FinalReport } from "@/lib/types";

interface ReportItem {
  id: string;
  name: string;
  savedAt: string;
  maxPrice: number | null;
  location: string | null;
}

interface Props {
  reports: ReportItem[];
  onRefresh?: () => void;
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

const cardColors = [
  { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-500" },
  { bg: "bg-indigo-50", border: "border-indigo-100", icon: "text-indigo-500" },
  { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-500" },
  { bg: "bg-purple-50", border: "border-purple-100", icon: "text-purple-500" },
  { bg: "bg-teal-50", border: "border-teal-100", icon: "text-teal-500" },
];

function CardMenu({ reportId, reportName, onRefresh }: { reportId: string; reportName: string; onRefresh?: () => void }) {
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
    onRefresh?.();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    await fetch(`/api/saved-reports/${reportId}`, { method: "DELETE" });
    setOpen(false);
    onRefresh?.();
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
      <div className="absolute inset-0 bg-white/95 rounded-xl z-20 flex items-center justify-center p-3" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setRenaming(false); setNameInput(reportName); } }}
          onBlur={handleRename}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Report name"
        />
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute top-3 right-3 z-20" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/80 transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30">
          <button
            onClick={() => { setRenaming(true); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
            Rename
          </button>
          <button
            onClick={handleShare}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            {shareStatus === "copied" ? "Copied!" : shareStatus === "loading" ? "..." : "Share"}
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardReportsList({ reports, onRefresh }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleClick = async (id: string) => {
    if (loadingId) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/saved-reports/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      sessionStorage.setItem("loadReport", JSON.stringify({
        report: data.report,
        userLocation: data.userLocation,
      }));
      router.push("/analyze");
    } catch {
      setLoadingId(null);
    }
  };

  if (reports.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">No saved reports yet</p>
        <p className="text-xs text-gray-400 mb-4">Your analysis results will appear here</p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Run Your First Analysis
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">My Reports</h3>
          <span className="text-xs text-gray-400">{reports.length}</span>
        </div>
        <Link href="/analyze" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          + New Analysis
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report, i) => {
          const color = cardColors[i % cardColors.length];
          const isLoading = loadingId === report.id;

          return (
            <button
              key={report.id}
              onClick={() => handleClick(report.id)}
              disabled={loadingId !== null}
              className={`relative text-left p-4 rounded-xl border ${color.border} ${color.bg} hover:shadow-md transition-all duration-200 cursor-pointer disabled:opacity-60 group`}
            >
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center z-10">
                  <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )}

              {/* Actions menu */}
              <CardMenu reportId={report.id} reportName={report.name} onRefresh={onRefresh} />

              {/* Top row: icon + time */}
              <div className="flex items-center justify-between mb-2.5 pr-6">
                <div className={`w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center ${color.icon}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                </div>
                <span className="text-[11px] text-gray-400">{timeAgo(report.savedAt)}</span>
              </div>

              {/* Max price */}
              {report.maxPrice != null && (
                <p className="text-lg font-bold text-gray-900 mb-0.5">{fmt(report.maxPrice)}</p>
              )}

              {/* Location */}
              {report.location ? (
                <p className="text-xs text-gray-500 truncate">{report.location}</p>
              ) : (
                <p className="text-xs text-gray-400">General analysis</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
