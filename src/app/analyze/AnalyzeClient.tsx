"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AffordabilityForm from "@/components/AffordabilityForm";
import LoadingState from "@/components/LoadingState";
import ResultsDashboard from "@/components/ResultsDashboard";
import type { UserProfile, FinalReport } from "@/lib/types";
import UpgradePrompt from "@/components/UpgradePrompt";
import { decompressReport } from "@/lib/share-report";
import { addRecentSearch } from "@/lib/recent-searches";

type AppState = "form" | "loading" | "results";
type PartialReport = Partial<FinalReport> & { _summaryLoading?: boolean };

export default function AnalyzeClient() {
  const [state, setState] = useState<AppState>("form");
  const [report, setReport] = useState<PartialReport | null>(null);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [reportTraceId, setReportTraceId] = useState<string | undefined>();
  const [sharedLoading, setSharedLoading] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState<{ message: string; requiresAuth?: boolean } | null>(null);
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
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch((err) => {
        console.error("Failed to load shared report:", err);
        setError("Could not load the shared report. The link may be invalid or expired.");
      })
      .finally(() => setSharedLoading(false));
  }, [searchParams]);

  // Load report from saved reports page (via sessionStorage)
  useEffect(() => {
    const stored = sessionStorage.getItem("loadReport");
    if (!stored) return;
    sessionStorage.removeItem("loadReport");
    try {
      const { report: savedReport, userLocation: loc } = JSON.parse(stored);
      setReport(savedReport);
      setUserLocation(loc || "");
      setState("results");
    } catch (err) {
      console.error("Failed to load saved report:", err);
    }
  }, []);

  const handleSubmit = useCallback(async (profile: UserProfile) => {
    setState("loading");
    setError("");
    setReport(null);
    setUserLocation(profile.targetLocation || "");

    if (profile.targetLocation) {
      addRecentSearch(profile.targetLocation);
    }

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
        if (data.error === "limit_reached") {
          setUpgradePrompt({ message: data.message, requiresAuth: data.requiresAuth });
          setState("form");
          return;
        }
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
              investmentAnalysis: event.investmentAnalysis,
              preApprovalReadiness: event.preApprovalReadiness,
              neighborhoodInfo: event.neighborhoodInfo,
              _summaryLoading: true,
            }));
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
      <main id="main-content" className={`${state === "results" ? "px-6" : "max-w-5xl px-4"} mx-auto py-8`}>
        {/* Start Over button when in results */}
        {state !== "form" && (
          <div className="max-w-5xl mx-auto mb-4">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Start New Analysis
            </button>
          </div>
        )}

        {/* Form - stays mounted during form & loading states to preserve data */}
        <div className={state === "form" ? "" : "hidden"}>
          {error && (
            <div className="max-w-2xl mx-auto mb-6">
              <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
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
            <span>&copy; {new Date().getFullYear()} HomeIQ</span>
            <div className="flex items-center gap-3">
              <a href="/privacy" className="text-gray-500 hover:text-blue-600 transition-colors">Privacy</a>
              <a href="/terms" className="text-gray-500 hover:text-blue-600 transition-colors">Terms</a>
              <a href="/docs" className="text-gray-500 hover:text-blue-600 transition-colors">Docs</a>
              <a
                href="mailto:pareshv23@gmail.com"
                className="text-gray-500 hover:text-blue-600 transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {upgradePrompt && (
        <UpgradePrompt
          message={upgradePrompt.message}
          requiresAuth={upgradePrompt.requiresAuth}
          onDismiss={() => setUpgradePrompt(null)}
        />
      )}
    </div>
  );
}
