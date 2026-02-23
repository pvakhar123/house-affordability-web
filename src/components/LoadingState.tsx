"use client";

import { useState, useEffect } from "react";

const FACTS = [
  { icon: "🏠", text: "The average American spends 6 months searching for a home before making an offer." },
  { icon: "📊", text: "A 1% difference in mortgage rate on a $400K home changes your payment by ~$240/month." },
  { icon: "💰", text: "First-time buyers make up roughly 32% of all home purchases in the US." },
  { icon: "🔑", text: "The 28/36 rule says housing costs shouldn't exceed 28% of gross income." },
  { icon: "📈", text: "US home values have appreciated an average of 3-5% annually over the past 30 years." },
  { icon: "🏦", text: "FHA loans allow down payments as low as 3.5% with a credit score of 580+." },
  { icon: "⚡", text: "VA loans offer 0% down payment and no PMI for eligible military veterans." },
  { icon: "🗓️", text: "Closing costs typically run 2-5% of the home's purchase price." },
  { icon: "🛡️", text: "Financial experts recommend keeping 3-6 months of expenses as an emergency fund after buying." },
  { icon: "📉", text: "Paying just one extra mortgage payment per year can shave 4-5 years off a 30-year loan." },
  { icon: "🏘️", text: "Property taxes vary wildly — from 0.3% in Hawaii to 2.2% in New Jersey." },
  { icon: "💡", text: "A higher credit score can save you tens of thousands in interest over the life of a loan." },
  { icon: "🔍", text: "PMI typically costs 0.5-1% of the loan amount annually and drops off at 20% equity." },
  { icon: "🌎", text: "Median US home price has increased over 40% in the last 5 years." },
  { icon: "⏰", text: "The best time to lock in a mortgage rate is typically 30-45 days before closing." },
];

const STEPS = [
  "Fetching live market data",
  "Analyzing your home buying power",
  "Running risk stress tests",
  "Finding best loan options",
  "Writing your personalized report",
];

export default function LoadingState() {
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * FACTS.length));
  const [fadeIn, setFadeIn] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Rotate facts every 5 seconds with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % FACTS.length);
        setFadeIn(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Step progression
  useEffect(() => {
    const timings = [0, 4000, 10000, 16000, 24000];
    const timers = timings.map((delay, i) =>
      setTimeout(() => setCurrentStep(i), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Smooth progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // never quite reaches 100 until done
        // Slow down as it progresses
        const increment = prev < 40 ? 1.8 : prev < 70 ? 1.0 : prev < 85 ? 0.5 : 0.2;
        return Math.min(prev + increment, 95);
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const fact = FACTS[factIndex];

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      {/* Animated orb — Apple-clean */}
      <div className="flex justify-center mb-8">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full opacity-15 animate-ping" style={{ background: "#0071e3", animationDuration: "2s" }} />
          <div className="absolute inset-1 rounded-full opacity-20" style={{ background: "#0071e3", animation: "spin 3s linear infinite" }} />
          <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ background: "#0071e3", boxShadow: "0 8px 24px rgba(0, 113, 227, 0.3)" }}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div className="absolute inset-0" style={{ animation: "spin 2s linear infinite" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ background: "#5856d6", boxShadow: "0 0 6px rgba(88,86,214,0.5)" }} />
          </div>
        </div>
      </div>

      {/* Current step */}
      <div className="text-center mb-6">
        <p className="text-sm font-semibold mb-1" style={{ color: "#0071e3" }}>
          {STEPS[currentStep]}...
        </p>
        <div className="max-w-xs mx-auto h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%`, background: "linear-gradient(to right, #0071e3, #5856d6)" }}
          />
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < currentStep
                  ? "w-1.5"
                  : i === currentStep
                    ? "w-6"
                    : "w-1.5 bg-gray-300"
              }`}
              style={i <= currentStep ? { background: "#0071e3" } : undefined}
            />
          ))}
        </div>
      </div>

      {/* Fact card */}
      <div
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 transition-all duration-400 ${
          fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{fact.icon}</span>
          <div>
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Did you know?</p>
            <p className="text-sm text-gray-600 leading-relaxed">{fact.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
