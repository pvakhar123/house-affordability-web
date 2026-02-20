"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import type { FinalReport } from "@/lib/types";
import { generateReportPDF } from "@/lib/utils/generate-pdf";
import { saveReport } from "@/lib/saved-reports";
import { compressReport } from "@/lib/share-report";

interface Props {
  report: FinalReport;
  userLocation?: string;
}

export default function ReportActions({ report, userLocation }: Props) {
  const { data: session } = useSession();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const [shareError, setShareError] = useState("");

  async function handleDownload() {
    setDownloading(true);
    try {
      const doc = generateReportPDF(report);
      doc.save("affordability-report.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  async function handleSave() {
    if (session?.user?.id) {
      try {
        await fetch("/api/saved-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report, userLocation }),
        });
      } catch (err) {
        console.error("Failed to save report to DB:", err);
      }
    } else {
      saveReport(report, undefined, userLocation);
    }
    setSaved(true);
  }

  async function handleShare() {
    setShareError("");
    try {
      const encoded = await compressReport(report);
      const url = `${window.location.origin}?report=${encoded}`;
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch (err) {
      setShareStatus("error");
      setShareError(
        err instanceof Error ? err.message : "Failed to generate share link"
      );
      setTimeout(() => setShareStatus("idle"), 4000);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;

    setEmailStatus("sending");
    setEmailError("");

    try {
      const res = await fetch("/api/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, report }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEmailStatus("error");
        setEmailError(data.error || "Failed to send");
        return;
      }

      setEmailStatus("sent");
      setTimeout(() => {
        setEmailOpen(false);
        setEmailStatus("idle");
        setEmail("");
      }, 3000);
    } catch {
      setEmailStatus("error");
      setEmailError("Network error. Please try again.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Download PDF */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {downloading ? "Generating..." : "Download PDF"}
      </button>

      {/* Save Report */}
      <button
        onClick={handleSave}
        disabled={saved}
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          saved
            ? "bg-green-600 text-white"
            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        {saved ? "Saved!" : "Save Report"}
      </button>

      {/* Share Link */}
      <button
        onClick={handleShare}
        disabled={shareStatus === "copied"}
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
          shareStatus === "copied"
            ? "bg-green-600 text-white"
            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.048a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.5 8.688" />
        </svg>
        {shareStatus === "copied" ? "Copied!" : "Copy Link"}
      </button>

      {/* Email Toggle */}
      {!emailOpen ? (
        <button
          onClick={() => setEmailOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email Report
        </button>
      ) : (
        <form onSubmit={handleEmail} className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-56"
            autoFocus
          />
          <button
            type="submit"
            disabled={emailStatus === "sending" || emailStatus === "sent"}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              emailStatus === "sent"
                ? "bg-green-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            }`}
          >
            {emailStatus === "idle" && "Send"}
            {emailStatus === "sending" && "Sending..."}
            {emailStatus === "sent" && "Sent!"}
            {emailStatus === "error" && "Retry"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEmailOpen(false);
              setEmailStatus("idle");
              setEmail("");
              setEmailError("");
            }}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      )}

      {/* Error messages */}
      {emailStatus === "error" && emailError && (
        <p className="text-xs text-red-500 w-full">{emailError}</p>
      )}
      {shareStatus === "error" && shareError && (
        <p className="text-xs text-red-500 w-full">{shareError}</p>
      )}
    </div>
  );
}
