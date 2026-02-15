"use client";

import { useState } from "react";
import AffordabilityForm from "@/components/AffordabilityForm";
import LoadingState from "@/components/LoadingState";
import ResultsDashboard from "@/components/ResultsDashboard";
import type { UserProfile, FinalReport } from "@/lib/types";

type AppState = "form" | "loading" | "results";

export default function Home() {
  const [state, setState] = useState<AppState>("form");
  const [report, setReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (profile: UserProfile) => {
    setState("loading");
    setError("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min client timeout

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

      const data: FinalReport = await res.json();
      setReport(data);
      setState("results");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("The analysis took too long. Please try again — it usually works on the second attempt.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
      setState("form");
    }
  };

  const handleReset = () => {
    setState("form");
    setReport(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              House Affordability Calculator
            </h1>
            <p className="text-xs text-gray-500">Powered by 4 AI Agents</p>
            <p className="text-sm text-gray-600 mt-1">Enter your information to simulate your home affordability scenario</p>
          </div>
          {state !== "form" && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Start Over
            </button>
          )}
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
        </div>

        {state === "loading" && <LoadingState />}

        {state === "results" && report && (
          <ResultsDashboard report={report} onReset={handleReset} />
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
