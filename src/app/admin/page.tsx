"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OverviewData {
  totalApiCalls: number;
  totalFeedback: number;
  avgQualityScore: number;
  reportsGenerated: number;
  chatMessages: number;
  emailsSent: number;
  recentErrors: { id: string; route: string; message: string; timestamp: string }[];
}

function MetricCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
  if (href) {
    return <Link href={href} className="block hover:ring-2 hover:ring-blue-200 rounded-xl transition-shadow">{content}</Link>;
  }
  return content;
}

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load overview data"));
  }, []);

  if (error) return <div className="max-w-4xl mx-auto p-8 text-red-600">{error}</div>;
  if (!data) return <div className="max-w-4xl mx-auto p-8 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard label="Reports Generated" value={data.reportsGenerated} href="/admin/usage" />
        <MetricCard label="Chat Messages" value={data.chatMessages} href="/admin/usage" />
        <MetricCard label="Emails Sent" value={data.emailsSent} href="/admin/usage" />
        <MetricCard label="Total API Calls" value={data.totalApiCalls} href="/admin/usage" />
        <MetricCard label="Feedback Received" value={data.totalFeedback} href="/admin/feedback" />
        <MetricCard label="Avg Quality Score" value={data.avgQualityScore > 0 ? data.avgQualityScore.toFixed(1) + "/5" : "—"} href="/admin/quality" />
      </div>

      {/* Recent Errors */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent Errors</h2>
          <Link href="/admin/errors" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            View all
          </Link>
        </div>
        {data.recentErrors.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No errors recorded</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-5 py-2 font-medium">Route</th>
                <th className="px-5 py-2 font-medium">Message</th>
                <th className="px-5 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentErrors.map((err) => (
                <tr key={err.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{err.route}</td>
                  <td className="px-5 py-3 text-gray-700 truncate max-w-xs">{err.message}</td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(err.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
