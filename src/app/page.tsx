"use client";

import { useState } from "react";
import AffordabilityForm from "@/components/AffordabilityForm";
import LoadingState from "@/components/LoadingState";
import ResultsDashboard from "@/components/ResultsDashboard";
import type { UserProfile, FinalReport } from "@/lib/types";

type AppState = "form" | "loading" | "results" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("form");
  const [report, setReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (profile: UserProfile) => {
    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data: FinalReport = await res.json();
      setReport(data);
      setState("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        {state === "form" && (
          <AffordabilityForm onSubmit={handleSubmit} isLoading={false} />
        )}

        {state === "loading" && <LoadingState />}

        {state === "results" && report && (
          <ResultsDashboard report={report} onReset={handleReset} />
        )}

        {state === "error" && (
          <div className="max-w-lg mx-auto py-16 text-center">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-800 font-semibold mb-2">Analysis Failed</p>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} AI Calculator</span>
          <a
            href="mailto:pareshv23@gmail.com"
            className="text-gray-500 hover:text-blue-600 transition-colors"
          >
            Contact Me
          </a>
        </div>
      </footer>
    </div>
  );
}
