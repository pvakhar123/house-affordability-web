"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  tier: string;
  tierUpdatedAt: string | null;
  hasStripe: boolean;
  analysesThisMonth: number;
  chatToday: number;
  savedHomes: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/admin/users${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(debouncedSearch);
  }, [debouncedSearch, fetchUsers]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? "Loading..." : `${users.length} users`}
            {!loading && users.filter((u) => u.tier === "pro").length > 0 &&
              ` \u00b7 ${users.filter((u) => u.tier === "pro").length} Pro`}
          </p>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-72"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Analyses</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Chat</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Homes</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    {search ? "No users match your search" : "No users found"}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 group">
                        {u.image ? (
                          <img src={u.image} alt="" className="w-7 h-7 rounded-full" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                            {u.name?.[0] ?? "?"}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-blue-600">{u.name ?? "\u2014"}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </Link>
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
                    <td className="px-4 py-3 text-right text-gray-700">{u.analysesThisMonth}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{u.chatToday}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{u.savedHomes}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs px-3 py-1 rounded-md font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
