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
    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingClient() {
  const { data: session } = useSession();
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
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
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
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
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            Checkout was cancelled. You can try again anytime.
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
          <p className="text-gray-600 mt-2">Start free. Upgrade when you need more.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${interval === "monthly" ? "text-gray-900" : "text-gray-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setInterval(interval === "monthly" ? "annual" : "monthly")}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              interval === "annual" ? "bg-blue-600" : "bg-gray-300"
            }`}
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
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              Save 20%
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Free</h3>
              <p className="text-sm text-gray-500 mt-1">Get started with basic home research</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900">$0</span>
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
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 cursor-default"
            >
              {isPro ? "Free Plan" : "Current Plan"}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-lg shadow-blue-100 relative p-6 space-y-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
              Recommended
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Pro</h3>
              <p className="text-sm text-gray-500 mt-1">For serious home buyers and professionals</p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900">{proPrice}</span>
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
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Manage Subscription"}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : isAuthenticated ? "Upgrade to Pro" : "Sign in to upgrade"}
              </button>
            )}
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-gray-500">
            Have questions?{" "}
            <a href="mailto:pareshv23@gmail.com" className="text-blue-600 hover:text-blue-800 underline">
              Contact us
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
