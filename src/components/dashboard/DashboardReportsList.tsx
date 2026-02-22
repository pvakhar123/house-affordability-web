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
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Saved Reports</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">No saved reports yet</p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Run Your First Analysis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Saved Reports</h3>
          <span className="text-xs text-gray-400">{reports.length} total</span>
        </div>
        <Link href="/analyze" className="text-xs text-blue-600 hover:text-blue-800">
          New Analysis
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => handleClick(report.id)}
            disabled={loadingId !== null}
            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left cursor-pointer disabled:opacity-60"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{report.name}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                <span>
                  {new Date(report.savedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {report.maxPrice != null && (
                  <span className="text-gray-500 font-medium">Max: {fmt(report.maxPrice)}</span>
                )}
                {report.location && (
                  <span className="truncate max-w-[150px]">{report.location}</span>
                )}
              </div>
            </div>
            {loadingId === report.id ? (
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
            ) : (
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
