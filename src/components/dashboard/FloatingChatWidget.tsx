"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ChatInterface from "@/components/ChatInterface";
import type { FinalReport } from "@/lib/types";

interface Props {
  latestReportId: string | null;
  initialPrompt: string | null;
  onPromptConsumed: () => void;
}

export default function FloatingChatWidget({ latestReportId, initialPrompt, onPromptConsumed }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [userLocation, setUserLocation] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchReport = useCallback(async (id: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/saved-reports/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setReport(data.report);
      setUserLocation(data.userLocation ?? undefined);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-open when a prompt comes in from recommendations
  useEffect(() => {
    if (initialPrompt) {
      setIsOpen(true);
    }
  }, [initialPrompt]);

  // Fetch report when widget opens for the first time
  useEffect(() => {
    if (isOpen && latestReportId && !report && !loading && !error) {
      fetchReport(latestReportId);
    }
  }, [isOpen, latestReportId, report, loading, error, fetchReport]);

  // Clear the consumed prompt after it's been passed down
  useEffect(() => {
    if (initialPrompt && isOpen && report) {
      const timer = setTimeout(() => onPromptConsumed(), 100);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, isOpen, report, onPromptConsumed]);

  return (
    <>
      {/* Expanded chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[520px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-4.5 h-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Loading your analysis...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full px-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-3">Failed to load report data.</p>
                  <button
                    onClick={() => latestReportId && fetchReport(latestReportId)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && !report && (
              <div className="flex items-center justify-center h-full px-6">
                <div className="text-center">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-sm text-gray-600 font-medium mb-1">No analysis yet</p>
                  <p className="text-xs text-gray-400 mb-3">Run an analysis to unlock AI chat</p>
                  <Link
                    href="/analyze"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Analysis
                  </Link>
                </div>
              </div>
            )}

            {!loading && !error && report && (
              <ChatInterface
                report={report}
                userLocation={userLocation}
                initialPrompt={initialPrompt ?? undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 sm:right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? "bg-gray-600 hover:bg-gray-700 rotate-0"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
        }`}
      >
        {isOpen ? (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </button>
    </>
  );
}
