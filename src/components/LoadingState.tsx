"use client";

import { useState, useEffect } from "react";

const STEPS = [
  { label: "Fetching market data", detail: "Mortgage rates, home prices, inflation..." },
  { label: "Calculating affordability", detail: "Max price, monthly payments, DTI ratios..." },
  { label: "Assessing risk", detail: "Stress tests, emergency fund, rent vs buy..." },
  { label: "Generating recommendations", detail: "Loan options, savings strategies..." },
  { label: "Synthesizing report", detail: "AI is writing your personalized analysis..." },
];

export default function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timings = [0, 8000, 18000, 22000, 35000];
    const timers = timings.map((delay, i) =>
      setTimeout(() => setCurrentStep(i), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="max-w-lg mx-auto py-16">
      <div className="text-center mb-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">
          4 AI agents are analyzing your profile...
        </h2>
        <p className="text-sm text-gray-500 mt-1">This typically takes 30-60 seconds</p>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <div
              key={step.label}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                isCurrent
                  ? "bg-blue-50 border border-blue-200"
                  : isDone
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-100"
              }`}
            >
              <div className="mt-0.5">
                {isDone ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${isCurrent ? "text-blue-900" : isDone ? "text-green-900" : "text-gray-500"}`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-blue-600 mt-0.5">{step.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
