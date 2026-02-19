"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AffordabilityForm from "@/components/AffordabilityForm";
import LoadingState from "@/components/LoadingState";
import ResultsDashboard from "@/components/ResultsDashboard";
import SavedReportsList from "@/components/SavedReportsList";
import type { UserProfile, FinalReport } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import { decompressReport } from "@/lib/share-report";
type AppState = "form" | "loading" | "results";

// Partial report that builds up as phases stream in
type PartialReport = Partial<FinalReport> & { _summaryLoading?: boolean };

function HomeContent() {
  const [state, setState] = useState<AppState>("form");
  const [report, setReport] = useState<PartialReport | null>(null);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [reportTraceId, setReportTraceId] = useState<string | undefined>();
  const [sharedLoading, setSharedLoading] = useState(false);
  const searchParams = useSearchParams();

  // Load shared report from URL param
  useEffect(() => {
    const encoded = searchParams.get("report");
    if (!encoded) return;

    setSharedLoading(true);
    decompressReport(encoded)
      .then((shared) => {
        setReport(shared);
        setState("results");
        // Clean URL without reload
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch((err) => {
        console.error("Failed to load shared report:", err);
        setError("Could not load the shared report. The link may be invalid or expired.");
      })
      .finally(() => setSharedLoading(false));
  }, [searchParams]);

  const handleLoadSaved = useCallback((savedReport: FinalReport, location?: string) => {
    setReport(savedReport);
    setUserLocation(location || "");
    setState("results");
  }, []);

  const handleSubmit = useCallback(async (profile: UserProfile) => {
    setState("loading");
    setError("");
    setReport(null);
    setUserLocation(profile.targetLocation || "");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.phase === "error") {
            throw new Error(event.error);
          }

          if (event.phase === "market_data") {
            setReport((prev) => ({
              ...prev,
              marketSnapshot: event.marketSnapshot,
            }));
          }

          if (event.phase === "analysis") {
            setReport((prev) => ({
              ...prev,
              affordability: event.affordability,
              riskAssessment: event.riskAssessment,
              recommendations: event.recommendations,
              propertyAnalysis: event.propertyAnalysis,
              rentVsBuy: event.rentVsBuy,
              preApprovalReadiness: event.preApprovalReadiness,
              neighborhoodInfo: event.neighborhoodInfo,
              _summaryLoading: true,
            }));
            // Transition to results view once we have the core data
            setState("results");
          }

          if (event.phase === "summary") {
            setReport((prev) => ({
              ...prev,
              summary: event.summary,
              _summaryLoading: false,
            }));
          }

          if (event.phase === "complete") {
            setReport((prev) => ({
              ...prev,
              disclaimers: event.disclaimers,
              generatedAt: event.generatedAt,
              _summaryLoading: false,
            }));
            if (event.traceId) setReportTraceId(event.traceId);
          }

        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("The analysis took too long. Please try again — it usually works on the second attempt.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
      setState("form");
    }
  }, []);

  const handleReset = () => {
    setState("form");
    setReport(null);
    setError("");
    setReportTraceId(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* AI Logo */}
            <div className="relative flex-shrink-0 w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl rotate-3 opacity-90" />
              <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                  {/* House shape */}
                  <path d="M3.5 11L12 4l8.5 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  {/* AI sparkle dots */}
                  <circle cx="9.5" cy="14.5" r="1" fill="currentColor" opacity="0.9" />
                  <circle cx="14.5" cy="14.5" r="1" fill="currentColor" opacity="0.9" />
                  <path d="M9.5 14.5c0 1.5 1.5 2.5 2.5 2.5s2.5-1 2.5-2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
                  {/* Sparkle */}
                  <path d="M17 3l.5 1.5L19 5l-1.5.5L17 7l-.5-1.5L15 5l1.5-.5L17 3z" fill="currentColor" opacity="0.8" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AI Home Calculator
              </h1>
              <p className="text-xs text-gray-500">Powered by 4 AI Agents &middot; Real-time market data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {state !== "form" && (
              <button
                onClick={handleReset}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Start Over
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`${state === "results" ? "px-6" : "max-w-5xl px-4"} mx-auto py-8`}>
        {/* Form - stays mounted during form & loading states to preserve data */}
        <div className={state === "form" ? "" : "hidden"}>
          {/* Error banner */}
          {error && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-800 font-semibold text-sm">Analysis Failed</p>
                  <p className="text-red-600 text-sm mt-0.5">{error}</p>
                </div>
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <AffordabilityForm onSubmit={handleSubmit} isLoading={false} />
          <SavedReportsList onLoad={handleLoadSaved} />
        </div>

        {sharedLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading shared report...</p>
            </div>
          </div>
        )}

        {state === "loading" && <LoadingState />}

        {state === "results" && report && (
          <ResultsDashboard
            report={report as FinalReport}
            onReset={handleReset}
            summaryLoading={report._summaryLoading}
            userLocation={userLocation}
            traceId={reportTraceId}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-2">
          <p className="text-xs text-gray-400 text-center">
            We do not store any personal data or information. This is not financial advice. Use at your own risk.
          </p>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} AI Calculator</span>
            <a
              href="mailto:pareshv23@gmail.com"
              className="text-gray-500 hover:text-blue-600 transition-colors"
            >
              Contact Me
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
