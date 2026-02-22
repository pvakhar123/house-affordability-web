"use client";

import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  tier: string;
  tierUpdatedAt: string | null;
  reportsThisMonth: number;
  chatToday: number;
  savedReports: number;
}

export default function SubscriptionsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/subscriptions")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUsers(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleTier(userId: string, currentTier: string) {
    const newTier = currentTier === "pro" ? "free" : "pro";
    setToggling(userId);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: newTier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tier: newTier } : u)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update tier");
    } finally {
      setToggling(null);
    }
  }

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscriptions</h2>
        <p className="text-sm text-gray-500 mt-1">
          {users.length} users &middot; {users.filter((u) => u.tier === "pro").length} Pro
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Reports (month)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Chat (today)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Saved</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        <img src={u.image} alt="" className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                          {u.name?.[0] ?? "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{u.name ?? "—"}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                        u.tier === "pro"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {u.tier.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{u.reportsThisMonth}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{u.chatToday}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{u.savedReports}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleTier(u.id, u.tier)}
                      disabled={toggling === u.id}
                      className={`text-xs px-3 py-1 rounded-md font-medium transition-colors disabled:opacity-50 ${
                        u.tier === "pro"
                          ? "text-red-600 hover:bg-red-50 border border-red-200"
                          : "text-blue-600 hover:bg-blue-50 border border-blue-200"
                      }`}
                    >
                      {toggling === u.id
                        ? "..."
                        : u.tier === "pro"
                          ? "Downgrade"
                          : "Upgrade"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
