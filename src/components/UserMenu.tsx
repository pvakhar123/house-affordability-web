"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import type { UsageStatus } from "@/lib/tier";

function UsageMiniBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isHigh = !isUnlimited && pct > 70;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 w-14 truncate">{label}</span>
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isHigh ? "bg-amber-500" : "bg-blue-400"}`} style={{ width: isUnlimited ? "100%" : `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 w-10 text-right">
        {isUnlimited ? `${used}` : `${used}/${limit}`}
      </span>
    </div>
  );
}

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Lazy-load usage when dropdown opens
  useEffect(() => {
    if (!open || usage) return;
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.usage) setUsage(data.usage); })
      .catch(() => {});
  }, [open, usage]);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!session) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="w-8 h-8 rounded-full border border-gray-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            {session.user.name?.[0] || "?"}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-[60] space-y-2">
          {/* User info */}
          <div className="flex items-center gap-3 px-1 pb-2 border-b border-gray-100">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-9 h-9 rounded-full border border-gray-200" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                {session.user.name?.[0] || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-900 truncate">{session.user.name}</p>
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  session.user.tier === "pro"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {session.user.tier === "pro" ? "PRO" : "FREE"}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>

          {/* My Analysis card */}
          <a
            href="/"
            className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">My Analysis</p>
              <p className="text-xs text-gray-400">View saved reports & dashboard</p>
            </div>
          </a>

          {/* Usage indicator */}
          {usage && (
            <div className="px-2 py-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Usage</p>
              <UsageMiniBar label="Analyses" used={usage.analyze.used} limit={usage.analyze.limit} />
              <UsageMiniBar label="Chat" used={usage.chat.used} limit={usage.chat.limit} />
              <UsageMiniBar label="Reports" used={usage.savedReports.used} limit={usage.savedReports.limit} />
            </div>
          )}

          {/* Plan & Usage card */}
          {session.user.tier !== "pro" ? (
            <a
              href="/pricing"
              className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-purple-50 hover:border-purple-200 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700">Upgrade to Pro</p>
                <p className="text-xs text-gray-400">Unlimited analyses & chat</p>
              </div>
            </a>
          ) : (
            <button
              onClick={async () => {
                const res = await fetch("/api/stripe/portal", { method: "POST" });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-colors group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-300 transition-colors">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Manage Subscription</p>
                <p className="text-xs text-gray-400">Billing & plan details</p>
              </div>
            </button>
          )}

          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
