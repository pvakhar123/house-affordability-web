"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SavedReportsList from "@/components/SavedReportsList";
import type { FinalReport } from "@/lib/types";

export default function SavedReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLoad = (report: FinalReport, userLocation?: string) => {
    // Store report in sessionStorage and navigate to home to display it
    sessionStorage.setItem("loadReport", JSON.stringify({ report, userLocation }));
    router.push("/");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view saved reports</h2>
          <p className="text-sm text-gray-500">Sign in with Google to access your saved home reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Saved Home Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your saved analysis reports</p>
          </div>
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            New Analysis
          </a>
        </div>
        <SavedReportsList onLoad={handleLoad} />
      </div>
    </div>
  );
}
