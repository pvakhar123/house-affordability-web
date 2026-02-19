"use client";

import { useEffect, useState } from "react";

interface Entry {
  type: string;
  rating: string;
  messageIndex?: number;
  comment?: string;
  timestamp: string;
}

interface Stats {
  chat: { up: number; down: number };
  report: { up: number; down: number };
  total: number;
}

export default function FeedbackAdmin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats ?? { chat: { up: 0, down: 0 }, report: { up: 0, down: 0 }, total: 0 });
        setEntries(data.entries ?? []);
      })
      .catch(() => {
        setError("Failed to load feedback data");
      });
  }, []);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!stats) return <div className="p-8 text-gray-500">Loading...</div>;

  const chatTotal = stats.chat.up + stats.chat.down;
  const reportTotal = stats.report.up + stats.report.down;
  const chatPct = chatTotal > 0 ? Math.round((stats.chat.up / chatTotal) * 100) : 0;
  const reportPct = reportTotal > 0 ? Math.round((stats.report.up / reportTotal) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Feedback Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-500 mb-3">Chat Responses</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">{chatPct}%</span>
            <span className="text-sm text-gray-400">positive</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">{stats.chat.up} up</span>
            <span className="text-red-500">{stats.chat.down} down</span>
            <span className="text-gray-400">{chatTotal} total</span>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-medium text-gray-500 mb-3">Report Ratings</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900">{reportPct}%</span>
            <span className="text-sm text-gray-400">positive</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">{stats.report.up} up</span>
            <span className="text-red-500">{stats.report.down} down</span>
            <span className="text-gray-400">{reportTotal} total</span>
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Feedback ({stats.total} total)</h2>
      {entries.length === 0 ? (
        <p className="text-gray-400 text-sm">No feedback yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Rating</th>
                <th className="px-4 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      e.type === "chat" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    }`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {e.rating === "up" ? (
                      <span className="text-green-600">thumbs up</span>
                    ) : e.rating === "down" ? (
                      <span className="text-red-500">thumbs down</span>
                    ) : (
                      <span className="text-gray-400">{e.rating}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {e.messageIndex != null && `msg #${e.messageIndex}`}
                    {e.comment && <span className="ml-2">{e.comment}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
