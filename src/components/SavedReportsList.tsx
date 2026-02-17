"use client";

import { useState, useEffect } from "react";
import type { FinalReport } from "@/lib/types";
import {
  getSavedReports,
  deleteReport,
  renameReport,
  type SavedReport,
} from "@/lib/saved-reports";

interface Props {
  onLoad: (report: FinalReport, userLocation?: string) => void;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function SavedReportsList({ onLoad }: Props) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    setReports(getSavedReports());
  }, []);

  if (reports.length === 0) return null;

  const handleDelete = (id: string) => {
    deleteReport(id);
    setReports(getSavedReports());
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameReport(id, editName.trim());
      setReports(getSavedReports());
    }
    setEditingId(null);
  };

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Saved Reports</h3>
          <span className="text-xs text-gray-400 ml-auto">{reports.length}/10</span>
        </div>

        <div className="divide-y divide-gray-100">
          {reports.map((saved) => (
            <div
              key={saved.id}
              className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
            >
              {/* Click to load */}
              <button
                onClick={() => onLoad(saved.report, saved.userLocation)}
                className="flex-1 text-left min-w-0"
              >
                {editingId === saved.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(saved.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(saved.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm font-medium text-gray-900 border border-blue-400 rounded px-2 py-0.5 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {saved.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span>
                        {new Date(saved.savedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {saved.report.affordability && (
                        <span>
                          Max: {fmt(saved.report.affordability.maxHomePrice)}
                        </span>
                      )}
                      {saved.userLocation && (
                        <span className="truncate max-w-[120px]">
                          {saved.userLocation}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Rename */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(saved.id);
                    setEditName(saved.name);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                  title="Rename"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </button>
                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(saved.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
