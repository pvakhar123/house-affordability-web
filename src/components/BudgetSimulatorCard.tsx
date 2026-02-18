"use client";

import { useState, useMemo } from "react";
import type { AffordabilityResult, MarketDataResult, RecommendationsResult, ReadinessActionItem } from "@/lib/types";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
} from "@/lib/utils/financial-math";

interface Props {
  affordability: AffordabilityResult;
  marketSnapshot: MarketDataResult;
  recommendations: RecommendationsResult;
  actionItems?: ReadinessActionItem[];
}

/* ── Constants matching the orchestrator ── */
const PROPERTY_TAX_RATE = 0.011;
const INSURANCE_ANNUAL = 1500;
const PMI_RATE = 0.005;
const MAX_FRONT_END_DTI = 0.28;
const MAX_BACK_END_DTI = 0.36;
const LOAN_TERM = 30;

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function DeltaBadge({ current, original }: { current: number; original: number }) {
  const delta = current - original;
  if (Math.abs(delta) < 1) return null;
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${
        positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {positive ? "+" : ""}
      {fmt(delta)}
    </span>
  );
}

function DtiBadge({ ratio }: { ratio: number }) {
  const color =
    ratio <= 36 ? "text-green-600" : ratio <= 43 ? "text-yellow-600" : "text-red-600";
  const bg =
    ratio <= 36 ? "bg-green-50" : ratio <= 43 ? "bg-yellow-50" : "bg-red-50";
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full ${bg} ${color}`}>
      {ratio <= 36 ? "Safe" : ratio <= 43 ? "Moderate" : "Risky"}
    </span>
  );
}

function SliderRow({
  label,
  value,
  original,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  original: number;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  onChange: (v: number) => void;
}) {
  const delta = value - original;
  const deltaStr =
    Math.abs(delta) < step
      ? ""
      : `${delta > 0 ? "+" : ""}${format(delta)}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{format(value)}</span>
          {deltaStr && (
            <span
              className={`text-xs font-medium ${
                delta > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {deltaStr}
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-gray-200"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

interface Tip {
  icon: string;
  color: string;
  bg: string;
  text: string;
}

function generateDynamicTips(
  originals: { annualIncome: number; monthlyDebt: number; downPayment: number },
  simulated: {
    maxHomePrice: number;
    maxLoanAmount: number;
    payment: { totalMonthly: number; pmi: number };
    dti: { backEndRatio: number; frontEndRatio: number };
  },
  original: AffordabilityResult,
  income: number,
  debt: number,
  downPayment: number,
  recommendations: RecommendationsResult,
): Tip[] {
  const tips: Tip[] = [];
  const origPmi = original.monthlyPayment.pmi;
  const simPmi = simulated.payment.pmi;
  const dpPercent = simulated.maxHomePrice > 0 ? (downPayment / simulated.maxHomePrice) * 100 : 0;
  const origDpPercent = original.maxHomePrice > 0 ? (original.downPaymentAmount / original.maxHomePrice) * 100 : 0;

  // PMI elimination
  if (origPmi > 0 && simPmi === 0) {
    tips.push({
      icon: "check",
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
      text: `PMI eliminated! You save ${fmt(origPmi)}/mo (${fmt(origPmi * 12)}/yr) by reaching 20% down.`,
    });
  } else if (origPmi === 0 && simPmi > 0) {
    tips.push({
      icon: "warn",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      text: `PMI now required at ${fmt(simPmi)}/mo (${fmt(simPmi * 12)}/yr). Increase down payment to 20% to avoid it.`,
    });
  } else if (simPmi > 0 && dpPercent < 20) {
    const neededDp = Math.ceil(simulated.maxHomePrice * 0.2);
    const gap = neededDp - downPayment;
    if (gap > 0) {
      tips.push({
        icon: "target",
        color: "text-blue-700",
        bg: "bg-blue-50 border-blue-200",
        text: `Save ${fmt(gap)} more for a 20% down payment to eliminate ${fmt(simPmi)}/mo in PMI.`,
      });
    }
  }

  // DTI warnings
  if (simulated.dti.backEndRatio > 43) {
    tips.push({
      icon: "alert",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      text: `Back-end DTI of ${simulated.dti.backEndRatio}% exceeds the 43% qualified mortgage limit. Most lenders will not approve this.`,
    });
  } else if (simulated.dti.backEndRatio > 36) {
    tips.push({
      icon: "warn",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      text: `Back-end DTI of ${simulated.dti.backEndRatio}% is above the ideal 36% threshold. You may face higher rates or stricter underwriting.`,
    });
  } else if (original.dtiAnalysis.backEndRatio > 36 && simulated.dti.backEndRatio <= 36) {
    tips.push({
      icon: "check",
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
      text: `DTI improved to ${simulated.dti.backEndRatio}% — now in the safe zone under 36%. This significantly improves your approval odds.`,
    });
  }

  // Debt payoff impact
  if (debt < originals.monthlyDebt && originals.monthlyDebt > 0) {
    const debtReduction = originals.monthlyDebt - debt;
    const priceGain = simulated.maxHomePrice - original.maxHomePrice;
    if (priceGain > 1000) {
      tips.push({
        icon: "up",
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
        text: `Reducing debt by ${fmt(debtReduction)}/mo unlocks ${fmt(priceGain)} more in home buying power.`,
      });
    }
  }

  // Income increase impact
  if (income > originals.annualIncome) {
    const incomeGain = income - originals.annualIncome;
    const priceGain = simulated.maxHomePrice - original.maxHomePrice;
    if (priceGain > 1000 && debt === originals.monthlyDebt && downPayment === originals.downPayment) {
      tips.push({
        icon: "up",
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
        text: `A ${fmt(incomeGain)} income increase adds ${fmt(priceGain)} to your max home price.`,
      });
    }
  }

  // Down payment as percentage insight
  if (dpPercent >= 20 && origDpPercent < 20) {
    tips.push({
      icon: "check",
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
      text: `Down payment is now ${dpPercent.toFixed(0)}% of the home price — no PMI and stronger offer positioning.`,
    });
  }

  // Closing cost estimate
  const closingLow = Math.round(simulated.maxHomePrice * 0.02);
  const closingHigh = Math.round(simulated.maxHomePrice * 0.05);
  tips.push({
    icon: "info",
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    text: `Estimated closing costs: ${fmt(closingLow)} – ${fmt(closingHigh)} (2-5% of ${fmt(simulated.maxHomePrice)}).`,
  });

  // Loan program eligibility hints
  if (dpPercent < 3.5) {
    tips.push({
      icon: "info",
      color: "text-gray-600",
      bg: "bg-gray-50 border-gray-200",
      text: `With ${dpPercent.toFixed(1)}% down, FHA loans (3.5% min) may not be available. Increase down payment to ${fmt(Math.ceil(simulated.maxHomePrice * 0.035))}.`,
    });
  } else if (dpPercent >= 3.5 && dpPercent < 5) {
    tips.push({
      icon: "info",
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
      text: `FHA loans available at ${dpPercent.toFixed(1)}% down. Conventional loans typically require 5%+ (${fmt(Math.ceil(simulated.maxHomePrice * 0.05))}).`,
    });
  }

  // Savings strategies from original report (contextually relevant ones)
  if (recommendations.savingsStrategies?.length > 0 && simPmi > 0) {
    const topStrategy = recommendations.savingsStrategies[0];
    tips.push({
      icon: "bulb",
      color: "text-purple-700",
      bg: "bg-purple-50 border-purple-200",
      text: `${topStrategy.title}: ${topStrategy.description}`,
    });
  }

  return tips;
}

function TipIcon({ type }: { type: string }) {
  switch (type) {
    case "check":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "warn":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case "alert":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008zm9.303-3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
        </svg>
      );
    case "up":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      );
    case "target":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "bulb":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      );
  }
}

const priorityIcon: Record<string, string> = {
  high: "alert",
  medium: "warn",
  low: "info",
};

const priorityColor: Record<string, { color: string; bg: string }> = {
  high: { color: "text-red-700", bg: "bg-red-50 border-red-200" },
  medium: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  low: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
};

function fmt2(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function BudgetSimulatorCard({ affordability: a, marketSnapshot: m, recommendations, actionItems = [] }: Props) {
  /* ── Reverse-engineer original inputs from the report ── */
  const originals = useMemo(() => {
    const grossMonthlyIncome =
      a.dtiAnalysis.frontEndRatio > 0
        ? a.monthlyPayment.totalMonthly / (a.dtiAnalysis.frontEndRatio / 100)
        : 0;
    const annualIncome = Math.round(grossMonthlyIncome * 12);
    const downPayment = a.downPaymentAmount;
    const monthlyDebt = Math.max(
      0,
      Math.round(grossMonthlyIncome * (a.dtiAnalysis.backEndRatio / 100) - a.monthlyPayment.totalMonthly)
    );
    return { annualIncome, monthlyDebt, downPayment };
  }, [a]);

  const [income, setIncome] = useState(originals.annualIncome);
  const [debt, setDebt] = useState(originals.monthlyDebt);
  const [downPayment, setDownPayment] = useState(originals.downPayment);

  const rate = m.mortgageRates.thirtyYearFixed / 100;

  /* ── Recalculate on every slider change ── */
  const simulated = useMemo(() => {
    const { maxHomePrice, maxLoanAmount, limitingFactor } = calculateMaxHomePrice({
      annualGrossIncome: income,
      monthlyDebtPayments: debt,
      downPaymentAmount: downPayment,
      interestRate: rate,
      loanTermYears: LOAN_TERM,
      propertyTaxRate: PROPERTY_TAX_RATE,
      insuranceAnnual: INSURANCE_ANNUAL,
      maxFrontEndDTI: MAX_FRONT_END_DTI,
      maxBackEndDTI: MAX_BACK_END_DTI,
    });

    const payment = calculateMonthlyPayment({
      homePrice: maxHomePrice,
      downPaymentAmount: downPayment,
      interestRate: rate,
      loanTermYears: LOAN_TERM,
      propertyTaxRate: PROPERTY_TAX_RATE,
      insuranceAnnual: INSURANCE_ANNUAL,
      pmiRate: PMI_RATE,
    });

    const dti = calculateDTI({
      grossMonthlyIncome: income / 12,
      proposedHousingPayment: payment.totalMonthly,
      existingMonthlyDebts: debt,
    });

    return { maxHomePrice, maxLoanAmount, limitingFactor, payment, dti };
  }, [income, debt, downPayment, rate]);

  const priceChanged = Math.abs(simulated.maxHomePrice - a.maxHomePrice) > 100;

  /* ── Dynamic recommendations ── */
  const tips = useMemo(
    () => generateDynamicTips(originals, simulated, a, income, debt, downPayment, recommendations),
    [originals, simulated, a, income, debt, downPayment, recommendations]
  );

  /* ── Visual comparison bar ── */
  const barMax = Math.max(a.maxHomePrice, simulated.maxHomePrice) * 1.1;
  const origWidth = (a.maxHomePrice / barMax) * 100;
  const simWidth = (simulated.maxHomePrice / barMax) * 100;

  function handleReset() {
    setIncome(originals.annualIncome);
    setDebt(originals.monthlyDebt);
    setDownPayment(originals.downPayment);
  }

  const isReset =
    income === originals.annualIncome &&
    debt === originals.monthlyDebt &&
    downPayment === originals.downPayment;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Adjust income, debt, or down payment to see how it affects your affordability and recommendations in real-time.
      </p>

      {/* Sliders */}
      <div className="space-y-5 mb-6">
        <SliderRow
          label="Annual Income"
          value={income}
          original={originals.annualIncome}
          min={30000}
          max={500000}
          step={5000}
          format={fmt}
          onChange={setIncome}
        />
        <SliderRow
          label="Monthly Debt"
          value={debt}
          original={originals.monthlyDebt}
          min={0}
          max={5000}
          step={50}
          format={fmt}
          onChange={setDebt}
        />
        <SliderRow
          label="Down Payment"
          value={downPayment}
          original={originals.downPayment}
          min={0}
          max={500000}
          step={5000}
          format={fmt}
          onChange={setDownPayment}
        />
      </div>

      {/* Reset button */}
      {!isReset && (
        <button
          onClick={handleReset}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-4"
        >
          Reset to original values
        </button>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-medium mb-1">Max Home Price</p>
          <p className="text-lg font-bold text-blue-900">{fmt(simulated.maxHomePrice)}</p>
          <DeltaBadge current={simulated.maxHomePrice} original={a.maxHomePrice} />
        </div>
        <div className="p-3 bg-indigo-50 rounded-lg">
          <p className="text-xs text-indigo-600 font-medium mb-1">Monthly Payment</p>
          <p className="text-lg font-bold text-indigo-900">{fmt(simulated.payment.totalMonthly)}</p>
          <DeltaBadge current={simulated.payment.totalMonthly} original={a.monthlyPayment.totalMonthly} />
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 font-medium mb-1">Loan Amount</p>
          <p className="text-lg font-bold text-gray-900">{fmt(simulated.maxLoanAmount)}</p>
          <DeltaBadge current={simulated.maxLoanAmount} original={a.loanAmount} />
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 font-medium mb-1">Back-End DTI</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-bold text-gray-900">{simulated.dti.backEndRatio}%</p>
            <DtiBadge ratio={simulated.dti.backEndRatio} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Limited by {simulated.limitingFactor}
          </p>
        </div>
      </div>

      {/* Comparison bar */}
      {priceChanged && (
        <div className="space-y-2 mb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Max Price Comparison
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">Original</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-gray-400 rounded-full transition-all duration-300"
                  style={{ width: `${origWidth}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 w-24 text-right">{fmt(a.maxHomePrice)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-500 w-16 shrink-0">Simulated</span>
              <div className="flex-1 bg-blue-50 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    simulated.maxHomePrice >= a.maxHomePrice ? "bg-blue-500" : "bg-red-400"
                  }`}
                  style={{ width: `${simWidth}%` }}
                />
              </div>
              <span className="text-xs font-medium text-blue-700 w-24 text-right">{fmt(simulated.maxHomePrice)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Recommendations ── */}
      <div className="space-y-5">
        {/* Dynamic simulator tips */}
        {tips.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Simulator Insights
            </p>
            <div className="space-y-2">
              {tips.map((tip, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border ${tip.bg} transition-all duration-200`}
                >
                  <span className={`mt-0.5 shrink-0 ${tip.color}`}>
                    <TipIcon type={tip.icon} />
                  </span>
                  <p className={`text-sm ${tip.color}`}>{tip.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items from Pre-Approval Readiness */}
        {actionItems.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Action Items to Improve Your Score
            </p>
            <div className="space-y-2">
              {actionItems.map((item, i) => {
                const pc = priorityColor[item.priority] ?? priorityColor.low;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border ${pc.bg}`}
                  >
                    <span className={`mt-0.5 shrink-0 ${pc.color}`}>
                      <TipIcon type={priorityIcon[item.priority] ?? "info"} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          item.priority === "high" ? "bg-red-100 text-red-700"
                            : item.priority === "medium" ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {item.priority}
                        </span>
                        <span className="text-xs text-gray-400 uppercase">{item.category.replace("_", " ")}</span>
                      </div>
                      <p className={`text-sm ${pc.color}`}>{item.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.impact}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Savings Strategies */}
        {recommendations.savingsStrategies?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Savings Strategies
            </p>
            <div className="space-y-2">
              {recommendations.savingsStrategies.map((strategy, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">{strategy.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      strategy.difficulty === "easy"
                        ? "bg-green-100 text-green-700"
                        : strategy.difficulty === "moderate"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}>
                      {strategy.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{strategy.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Closing Costs */}
        {recommendations.closingCostEstimate && recommendations.closingCostEstimate.lowEstimate > 0 && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-1">Estimated Closing Costs</p>
            <p className="text-lg font-bold text-amber-900">
              {fmt2(recommendations.closingCostEstimate.lowEstimate)} - {fmt2(recommendations.closingCostEstimate.highEstimate)}
            </p>
          </div>
        )}

        {/* General Advice */}
        {recommendations.generalAdvice?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              General Advice
            </p>
            <ul className="space-y-1">
              {recommendations.generalAdvice.map((advice, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&#8226;</span>
                  {advice}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
