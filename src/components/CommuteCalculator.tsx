"use client";

import { useState, useEffect } from "react";
import type { CommuteResult } from "@/lib/types";

interface Props {
  originAddress: string;
}

const LS_KEY = "commute-destination";

export default function CommuteCalculator({ originAddress }: Props) {
  const [destination, setDestination] = useState("");
  const [result, setResult] = useState<CommuteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) setDestination(saved);
  }, []);

  async function handleCalculate() {
    if (!destination.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    localStorage.setItem(LS_KEY, destination.trim());

    try {
      const res = await fetch("/api/commute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originAddress,
          destinationAddress: destination.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to calculate commute");
      }

      const data: CommuteResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCalculate()}
          placeholder="Enter work address..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleCalculate}
          disabled={loading || !destination.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            "Calculate"
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {loading && !result && (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-16 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-14" />
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-2 gap-3">
          {/* Driving */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Driving</span>
            </div>
            {result.driving ? (
              <>
                <p className="text-xl font-semibold text-gray-900">{result.driving.duration}</p>
                <p className="text-xs text-gray-500 mt-0.5">{result.driving.distance}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Not available</p>
            )}
          </div>

          {/* Transit */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
              </svg>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Transit</span>
            </div>
            {result.transit ? (
              <>
                <p className="text-xl font-semibold text-gray-900">{result.transit.duration}</p>
                <p className="text-xs text-gray-500 mt-0.5">{result.transit.distance}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Not available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
