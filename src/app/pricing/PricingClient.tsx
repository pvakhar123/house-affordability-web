"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

const features = {
  free: [
    { text: "1 report per month", included: true },
    { text: "20 chat messages per day", included: true },
    { text: "3 saved reports", included: true },
    { text: "All AI agents & tools", included: true },
    { text: "Real-time market data", included: true },
    { text: "Shareable report links", included: true },
    { text: "Priority support", included: false },
  ],
  pro: [
    { text: "20 reports per month", included: true },
    { text: "Unlimited chat messages", included: true },
    { text: "Unlimited saved reports", included: true },
    { text: "All AI agents & tools", included: true },
    { text: "Real-time market data", included: true },
    { text: "Shareable report links", included: true },
    { text: "Priority support", included: true },
  ],
};

function CheckIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#34c759" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#d1d1d6" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingClient() {
  const { data: session } = useSession();
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("upgrade") === "cancelled";

  const isPro = session?.user?.tier === "pro";
  const isAuthenticated = !!session?.user;

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      signIn("google");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start checkout. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to open billing portal.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error("Portal error:", err);
    } finally {
      setLoading(false);
    }
  };

  const proPrice = interval === "monthly" ? "$1" : "$0.80";
  const proPeriod = interval === "monthly" ? "/month" : "/mo (billed yearly)";

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-12">
        {cancelled && (
          <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "#fff3cd", color: "#856404", border: "1px solid #ffeaa7" }}>
            Checkout was cancelled. You can try again anytime.
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Simple, transparent pricing</h2>
          <p className="text-gray-500 mt-2">Start free. Upgrade when you need more.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${interval === "monthly" ? "text-gray-900" : "text-gray-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setInterval(interval === "monthly" ? "annual" : "monthly")}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: interval === "annual" ? "#0071e3" : "#d1d1d6" }}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                interval === "annual" ? "translate-x-6" : ""
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${interval === "annual" ? "text-gray-900" : "text-gray-500"}`}>
            Annual
          </span>
          {interval === "annual" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(52,199,89,0.12)", color: "#248a3d" }}>
              Save 20%
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl p-6 space-y-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Free</h3>
              <p className="text-sm text-gray-500 mt-1">Get started with basic home research</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-semibold text-gray-900 tracking-tight">$0</span>
              <span className="text-gray-500 text-sm">forever</span>
            </div>

            <ul className="space-y-3">
              {features.free.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5">
                  {f.included ? <CheckIcon /> : <XIcon />}
                  <span className={f.included ? "text-gray-700" : "text-gray-400"}>{f.text}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-2.5 px-4 rounded-full text-sm font-medium bg-gray-100 text-gray-500 cursor-default"
            >
              {isPro ? "Free Plan" : "Current Plan"}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl relative p-6 space-y-6" style={{ boxShadow: "0 2px 20px rgba(0,113,227,0.12), 0 2px 12px rgba(0,0,0,0.06)" }}>
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-white text-xs font-medium rounded-full"
              style={{ background: "#0071e3" }}
            >
              Recommended
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900">Pro</h3>
              <p className="text-sm text-gray-500 mt-1">For serious home buyers and professionals</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-semibold text-gray-900 tracking-tight">{proPrice}</span>
              <span className="text-gray-500 text-sm">{proPeriod}</span>
            </div>

            {interval === "annual" && (
              <p className="text-xs text-gray-500 -mt-4">$9.60 billed annually</p>
            )}

            <ul className="space-y-3">
              {features.pro.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5">
                  {f.included ? <CheckIcon /> : <XIcon />}
                  <span className={f.included ? "text-gray-700" : "text-gray-400"}>{f.text}</span>
                </li>
              ))}
            </ul>

            {isPro ? (
              <button
                onClick={handleManage}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Manage Subscription"}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-full text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#0071e3", boxShadow: "0 4px 14px rgba(0,113,227,0.25)" }}
              >
                {loading ? "Loading..." : isAuthenticated ? "Upgrade to Pro" : "Sign in to upgrade"}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mt-4 rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">
            Have questions?{" "}
            <a href="mailto:pareshv23@gmail.com" className="hover:underline" style={{ color: "#0071e3" }}>
              Contact us
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
