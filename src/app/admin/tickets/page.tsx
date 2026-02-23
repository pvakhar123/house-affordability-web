"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Ticket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  userId: string | null;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTickets(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function updateTicket(ticketId: string, updates: { status?: string; adminNotes?: string }) {
    setUpdating(ticketId);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, ...updates }),
      });
      if (!res.ok) throw new Error("Failed to update");

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                ...(updates.status ? { status: updates.status, resolvedAt: updates.status === "resolved" ? new Date().toISOString() : null } : {}),
                ...(updates.adminNotes !== undefined ? { adminNotes: updates.adminNotes } : {}),
              }
            : t,
        ),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === "open").length;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
          <p className="text-sm text-gray-500 mt-1">
            {tickets.length} total &middot; {openCount} open
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          {filter === "all" ? "No tickets yet" : `No ${filter} tickets`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => { setExpandedId(expandedId === t.id ? null : t.id); setNoteInput(t.adminNotes ?? ""); }}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{t.subject}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      t.status === "open" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.name} ({t.email}) &middot; {timeAgo(t.createdAt)}
                  </p>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === t.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedId === t.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Message</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.message}</p>
                  </div>

                  {t.userId && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">User</p>
                      <Link href={`/admin/users/${t.userId}`} className="text-sm text-blue-600 hover:underline">
                        View user profile
                      </Link>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Admin Notes</p>
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-vertical"
                      placeholder="Add internal notes..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateTicket(t.id, { adminNotes: noteInput })}
                      disabled={updating === t.id}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-md transition-colors disabled:opacity-50"
                    >
                      Save Notes
                    </button>
                    {t.status === "open" ? (
                      <button
                        onClick={() => updateTicket(t.id, { status: "resolved", adminNotes: noteInput })}
                        disabled={updating === t.id}
                        className="px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 border border-green-200 rounded-md transition-colors disabled:opacity-50"
                      >
                        {updating === t.id ? "..." : "Resolve"}
                      </button>
                    ) : (
                      <button
                        onClick={() => updateTicket(t.id, { status: "open" })}
                        disabled={updating === t.id}
                        className="px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-md transition-colors disabled:opacity-50"
                      >
                        {updating === t.id ? "..." : "Reopen"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
