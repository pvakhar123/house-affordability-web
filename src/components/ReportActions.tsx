"use client";

import { useState } from "react";
import type { FinalReport } from "@/lib/types";
import { generateReportPDF } from "@/lib/utils/generate-pdf";

interface Props {
  report: FinalReport;
}

export default function ReportActions({ report }: Props) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [downloading, setDownloading] = useState(false);

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

      {emailStatus === "error" && emailError && (
        <p className="text-xs text-red-500 w-full">{emailError}</p>
      )}
    </div>
  );
}
