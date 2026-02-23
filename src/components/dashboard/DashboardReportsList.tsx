"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ReportItem {
  id: string;
  name: string;
  savedAt: string;
  maxPrice: number | null;
  location: string | null;
}

interface Props {
  reports: ReportItem[];
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
  { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-500", badge: "bg-blue-100 text-blue-700" },
  { bg: "bg-indigo-50", border: "border-indigo-100", icon: "text-indigo-500", badge: "bg-indigo-100 text-indigo-700" },
  { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-500", badge: "bg-violet-100 text-violet-700" },
  { bg: "bg-purple-50", border: "border-purple-100", icon: "text-purple-500", badge: "bg-purple-100 text-purple-700" },
  { bg: "bg-teal-50", border: "border-teal-100", icon: "text-teal-500", badge: "bg-teal-100 text-teal-700" },
];

export default function DashboardReportsList({ reports }: Props) {
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

              {/* Top row: icon + time */}
              <div className="flex items-center justify-between mb-2.5">
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

              {/* Arrow indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
