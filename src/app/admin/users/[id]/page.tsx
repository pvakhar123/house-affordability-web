"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface UserDetail {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    tier: string;
    tierUpdatedAt: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };
  usage: {
    analysesThisMonth: number;
    chatToday: number;
    savedHomes: number;
  };
  savedHomes: { id: string; name: string; savedAt: string; location: string | null }[];
  tierHistory: { id: string; previousTier: string; newTier: string; reason: string; changedBy: string | null; timestamp: string }[];
  feedback: { id: string; type: string; rating: string; comment: string | null; timestamp: string }[];
  tickets: { id: string; subject: string; status: string; message: string; adminNotes: string | null; createdAt: string; resolvedAt: string | null }[];
  timeline: { type: string; label: string; timestamp: string; meta?: Record<string, unknown> }[];
}

interface BillingData {
  subscription: {
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAt: string | null;
  } | null;
  invoices: { id: string; date: string; amount: number; status: string; url: string | null }[];
  paymentMethod: { brand: string; last4: string } | null;
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

function Section({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {count !== undefined && (
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const timelineIcons: Record<string, string> = {
  saved_home: "\ud83c\udfe0",
  tier_change: "\u2b50",
  feedback: "\ud83d\udcac",
  ticket: "\ud83c\udfa7",
};

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDetail | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        // Fetch billing if user has Stripe
        if (d.user.stripeCustomerId) {
          fetch(`/api/admin/users/${id}/billing`)
            .then((r) => r.json())
            .then((b) => { if (!b.error) setBilling(b); })
            .catch(() => {});
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleTier = useCallback(async () => {
    if (!data) return;
    const newTier = data.user.tier === "pro" ? "free" : "pro";
    setToggling(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id, tier: newTier }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData((prev) => prev ? { ...prev, user: { ...prev.user, tier: newTier } } : prev);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update tier");
    } finally {
      setToggling(false);
    }
  }, [data]);

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

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  const { user, usage, savedHomes, tierHistory, feedback: feedbackList, tickets, timeline } = data;

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/users" className="hover:text-gray-700">Users</Link>
        <span>/</span>
        <span className="text-gray-900">{user.name || user.email}</span>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          {user.image ? (
            <img src={user.image} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-medium text-gray-500">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{user.name ?? "\u2014"}</h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                  user.tier === "pro" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {user.tier.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1">ID: {user.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigator.clipboard.writeText(user.email); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="text-xs px-3 py-1.5 rounded-md font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              {copied ? "Copied!" : "Copy Email"}
            </button>
            <button
              onClick={toggleTier}
              disabled={toggling}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50 ${
                user.tier === "pro"
                  ? "text-red-600 hover:bg-red-50 border border-red-200"
                  : "text-blue-600 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              {toggling ? "..." : user.tier === "pro" ? "Downgrade" : "Upgrade"}
            </button>
          </div>
        </div>

        {/* Usage stats */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{usage.analysesThisMonth}</p>
            <p className="text-xs text-gray-500">Analyses (month)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{usage.chatToday}</p>
            <p className="text-xs text-gray-500">Chat (today)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{usage.savedHomes}</p>
            <p className="text-xs text-gray-500">Saved Homes</p>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      {timeline.length > 0 && (
        <Section title="Activity Timeline" count={timeline.length}>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {timeline.map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-base mt-0.5">{timelineIcons[entry.type] ?? "\u25cf"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{entry.label}</p>
                  <p className="text-xs text-gray-400">{timeAgo(entry.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Stripe Billing */}
      {user.stripeCustomerId && (
        <Section title="Stripe Billing">
          {billing ? (
            <div className="space-y-4">
              {billing.subscription && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                        billing.subscription.status === "active" ? "bg-green-100 text-green-700"
                        : billing.subscription.status === "canceled" ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                      }`}>
                        {billing.subscription.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current Period</p>
                    <p className="font-medium text-gray-900">
                      {new Date(billing.subscription.currentPeriodStart).toLocaleDateString()} &ndash; {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  {billing.paymentMethod && (
                    <div>
                      <p className="text-gray-500">Payment Method</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {billing.paymentMethod.brand} &bull;&bull;&bull;&bull; {billing.paymentMethod.last4}
                      </p>
                    </div>
                  )}
                  {billing.subscription.cancelAt && (
                    <div>
                      <p className="text-gray-500">Cancels At</p>
                      <p className="font-medium text-red-600">
                        {new Date(billing.subscription.cancelAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {billing.invoices.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Invoices</p>
                  <div className="space-y-1">
                    {billing.invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between text-sm py-1.5">
                        <span className="text-gray-600">{new Date(inv.date).toLocaleDateString()}</span>
                        <span className="font-medium text-gray-900">${(inv.amount / 100).toFixed(2)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {inv.status}
                        </span>
                        {inv.url && (
                          <a href={inv.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!billing.subscription && (
                <p className="text-sm text-gray-500">No active subscription found.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading billing data...</p>
          )}
        </Section>
      )}

      {/* Tier Change History */}
      {tierHistory.length > 0 && (
        <Section title="Tier History" count={tierHistory.length}>
          <div className="space-y-2">
            {tierHistory.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    t.previousTier === "pro" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {t.previousTier.toUpperCase()}
                  </span>
                  <span className="mx-1.5 text-gray-400">&rarr;</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    t.newTier === "pro" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {t.newTier.toUpperCase()}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">({t.reason})</span>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(t.timestamp)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Saved Homes */}
      {savedHomes.length > 0 && (
        <Section title="Saved Homes" count={savedHomes.length}>
          <div className="space-y-2">
            {savedHomes.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{h.name}</p>
                  {h.location && <p className="text-xs text-gray-400">{h.location}</p>}
                </div>
                <span className="text-xs text-gray-400">{timeAgo(h.savedAt)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Feedback */}
      {feedbackList.length > 0 && (
        <Section title="Feedback" count={feedbackList.length}>
          <div className="space-y-2">
            {feedbackList.map((f) => (
              <div key={f.id} className="flex items-start gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-base">{f.rating === "up" ? "\ud83d\udc4d" : "\ud83d\udc4e"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700">
                    <span className="capitalize">{f.type}</span>
                    {f.comment && ` \u2014 "${f.comment}"`}
                  </p>
                  <p className="text-xs text-gray-400">{timeAgo(f.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Support Tickets */}
      {tickets.length > 0 && (
        <Section title="Support Tickets" count={tickets.length}>
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-start justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{t.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.message}</p>
                  {t.adminNotes && <p className="text-xs text-blue-600 mt-1">Note: {t.adminNotes}</p>}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                    t.status === "open" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                  }`}>
                    {t.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(t.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
