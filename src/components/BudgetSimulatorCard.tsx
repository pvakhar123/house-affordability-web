"use client";

import { useState, useMemo } from "react";
import type { AffordabilityResult, MarketDataResult, RecommendationsResult, PreApprovalReadinessScore } from "@/lib/types";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
} from "@/lib/utils/financial-math";

interface Props {
  affordability: AffordabilityResult;
  marketSnapshot: MarketDataResult;
  recommendations: RecommendationsResult;
  preApprovalReadiness?: PreApprovalReadinessScore;
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

/* ── Dynamic readiness score calculation (mirrors orchestrator logic) ── */
function calcReadinessScores(
  backEndDTI: number,
  dpPercent: number,
  debtToIncomeRaw: number,
  emergencyMonths: number,
  originalCreditScore: number,
) {
  let dtiScore: number;
  if (backEndDTI <= 28) dtiScore = 25;
  else if (backEndDTI <= 36) dtiScore = 20;
  else if (backEndDTI <= 43) dtiScore = 12;
  else if (backEndDTI <= 50) dtiScore = 5;
  else dtiScore = 0;

  const creditScore = originalCreditScore; // can't change client-side

  let downPaymentScore: number;
  if (dpPercent >= 20) downPaymentScore = 25;
  else if (dpPercent >= 10) downPaymentScore = 18;
  else if (dpPercent >= 5) downPaymentScore = 12;
  else if (dpPercent >= 3) downPaymentScore = 6;
  else downPaymentScore = 0;

  let debtHealthScore: number;
  if (debtToIncomeRaw <= 10 && emergencyMonths >= 6) debtHealthScore = 25;
  else if (debtToIncomeRaw <= 15 && emergencyMonths >= 3) debtHealthScore = 18;
  else if (debtToIncomeRaw <= 20 && emergencyMonths >= 1) debtHealthScore = 12;
  else if (debtToIncomeRaw <= 30 || emergencyMonths >= 1) debtHealthScore = 5;
  else debtHealthScore = 0;

  const overallScore = dtiScore + creditScore + downPaymentScore + debtHealthScore;
  const level: PreApprovalReadinessScore["level"] =
    overallScore >= 80 ? "highly_prepared"
      : overallScore >= 60 ? "ready"
        : overallScore >= 40 ? "needs_work"
          : "not_ready";

  return { overallScore, level, dtiScore, creditScore, downPaymentScore, debtHealthScore };
}

/* ── Score display components ── */
const levelConfig: Record<string, { label: string; bg: string; text: string; border: string; ring: string }> = {
  not_ready: { label: "Not Ready", bg: "bg-red-100", text: "text-red-800", border: "border-red-300", ring: "text-red-500" },
  needs_work: { label: "Needs Work", bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", ring: "text-orange-500" },
  ready: { label: "Ready", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", ring: "text-yellow-500" },
  highly_prepared: { label: "Highly Prepared", bg: "bg-green-100", text: "text-green-800", border: "border-green-300", ring: "text-green-500" },
};

const componentLabels: Record<string, string> = {
  dtiScore: "Debt-to-Income",
  creditScore: "Credit Score",
  downPaymentScore: "Down Payment",
  debtHealthScore: "Debt Health",
};

function ScoreBar({ label, score, max, changed }: { label: string; score: number; max: number; changed?: boolean }) {
  const pct = Math.round((score / max) * 100);
  const color =
    pct >= 80 ? "bg-green-500"
      : pct >= 60 ? "bg-yellow-500"
        : pct >= 40 ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-900">{score}/{max}</span>
          {changed && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" title="Changed by simulator" />
          )}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Slider, badge, and icon components ── */
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

/* ── Action item types ── */
interface ActionItem {
  priority: "high" | "medium" | "low";
  icon: string;
  text: string;
  category: string;
}

const priorityOrder = { high: 0, medium: 1, low: 2 };

const priorityStyle: Record<string, { color: string; bg: string; badge: string }> = {
  high: { color: "text-red-700", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700" },
  medium: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", badge: "bg-yellow-100 text-yellow-700" },
  low: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700" },
};

function generateActionItems(
  sim: {
    maxHomePrice: number;
    maxLoanAmount: number;
    payment: { totalMonthly: number; pmi: number };
    dti: { backEndRatio: number; frontEndRatio: number };
  },
  original: AffordabilityResult,
  income: number,
  debt: number,
  downPayment: number,
  emergencyFund: number,
  closingCostBudget: number,
  originals: { annualIncome: number; monthlyDebt: number; downPayment: number; emergencyFund: number; closingCostBudget: number },
): ActionItem[] {
  const items: ActionItem[] = [];
  const dpPercent = sim.maxHomePrice > 0 ? (downPayment / sim.maxHomePrice) * 100 : 0;
  const monthlyObligations = sim.payment.totalMonthly + debt;
  const emergencyMonths = monthlyObligations > 0 ? emergencyFund / monthlyObligations : 0;
  const closingCostLow = Math.round(sim.maxHomePrice * 0.02);
  const closingCostHigh = Math.round(sim.maxHomePrice * 0.05);
  const closingCostMid = Math.round(sim.maxHomePrice * 0.03);

  /* ── DTI ── */
  if (sim.dti.backEndRatio > 43) {
    items.push({
      priority: "high", icon: "alert", category: "dti",
      text: `Back-end DTI of ${sim.dti.backEndRatio}% exceeds the 43% qualified mortgage limit. Most lenders will not approve this. Reduce debt or increase income.`,
    });
  } else if (sim.dti.backEndRatio > 36) {
    items.push({
      priority: "medium", icon: "warn", category: "dti",
      text: `Back-end DTI of ${sim.dti.backEndRatio}% is above the ideal 36%. You may face higher rates or stricter underwriting.`,
    });
  } else {
    items.push({
      priority: "low", icon: "check", category: "dti",
      text: `DTI of ${sim.dti.backEndRatio}% is in the safe zone. Lenders will view this favorably.`,
    });
  }

  /* ── Emergency Fund ── */
  if (emergencyMonths < 2) {
    items.push({
      priority: "high", icon: "alert", category: "emergency fund",
      text: `Emergency fund covers only ${emergencyMonths.toFixed(1)} months of obligations (${fmt(monthlyObligations)}/mo). Build to at least 3 months before purchasing.`,
    });
  } else if (emergencyMonths < 4) {
    items.push({
      priority: "medium", icon: "warn", category: "emergency fund",
      text: `Emergency fund covers ${emergencyMonths.toFixed(1)} months. Aim for 6 months (${fmt(monthlyObligations * 6)}) for a strong safety net.`,
    });
  } else if (emergencyMonths < 6) {
    items.push({
      priority: "low", icon: "info", category: "emergency fund",
      text: `Emergency fund covers ${emergencyMonths.toFixed(1)} months — acceptable, but 6+ months (${fmt(monthlyObligations * 6)}) is recommended.`,
    });
  } else {
    items.push({
      priority: "low", icon: "check", category: "emergency fund",
      text: `Emergency fund covers ${emergencyMonths.toFixed(1)} months of obligations. You have a strong financial cushion.`,
    });
  }

  /* ── Closing Cost Budget ── */
  if (closingCostBudget < closingCostLow) {
    items.push({
      priority: "high", icon: "alert", category: "closing costs",
      text: `Budget of ${fmt(closingCostBudget)} is below the typical minimum of ${fmt(closingCostLow)} (2% of home price). You may need ${fmt(closingCostLow - closingCostBudget)} more.`,
    });
  } else if (closingCostBudget < closingCostMid) {
    items.push({
      priority: "medium", icon: "warn", category: "closing costs",
      text: `Budget of ${fmt(closingCostBudget)} covers the low end. Typical closing costs run ${fmt(closingCostLow)} – ${fmt(closingCostHigh)}. Consider budgeting ${fmt(closingCostMid)} to be safe.`,
    });
  } else {
    items.push({
      priority: "low", icon: "check", category: "closing costs",
      text: `Closing cost budget of ${fmt(closingCostBudget)} is well within the typical ${fmt(closingCostLow)} – ${fmt(closingCostHigh)} range.`,
    });
  }

  /* ── PMI / Down Payment ── */
  if (sim.payment.pmi > 0) {
    const neededDp = Math.ceil(sim.maxHomePrice * 0.2);
    const gap = neededDp - downPayment;
    if (dpPercent < 10) {
      items.push({
        priority: "high", icon: "target", category: "down payment",
        text: `Down payment is only ${dpPercent.toFixed(0)}% — PMI costs ${fmt(sim.payment.pmi)}/mo (${fmt(sim.payment.pmi * 12)}/yr). Save ${fmt(gap)} more to reach 20% and eliminate it.`,
      });
    } else {
      items.push({
        priority: "medium", icon: "target", category: "down payment",
        text: `PMI of ${fmt(sim.payment.pmi)}/mo required at ${dpPercent.toFixed(0)}% down. Save ${fmt(gap)} more to reach 20% and save ${fmt(sim.payment.pmi * 12)}/yr.`,
      });
    }
  } else if (dpPercent >= 20) {
    if (original.monthlyPayment.pmi > 0) {
      items.push({
        priority: "low", icon: "check", category: "down payment",
        text: `PMI eliminated! You save ${fmt(original.monthlyPayment.pmi)}/mo by reaching 20% down. Stronger positioning for sellers too.`,
      });
    } else {
      items.push({
        priority: "low", icon: "check", category: "down payment",
        text: `Down payment at ${dpPercent.toFixed(0)}% — no PMI required. Strong offer positioning.`,
      });
    }
  }

  /* ── Debt Impact ── */
  if (debt > 0 && debt < originals.monthlyDebt) {
    const debtReduction = originals.monthlyDebt - debt;
    const priceGain = sim.maxHomePrice - original.maxHomePrice;
    if (priceGain > 1000) {
      items.push({
        priority: "low", icon: "up", category: "debt",
        text: `Reducing debt by ${fmt(debtReduction)}/mo unlocks ${fmt(priceGain)} more in buying power.`,
      });
    }
  } else if (debt > 0 && sim.dti.backEndRatio > 36) {
    items.push({
      priority: "medium", icon: "warn", category: "debt",
      text: `${fmt(debt)}/mo in debt is pushing your DTI above 36%. Paying down debt is the fastest way to improve affordability.`,
    });
  }

  /* ── Income Impact ── */
  if (income > originals.annualIncome) {
    const priceGain = sim.maxHomePrice - original.maxHomePrice;
    if (priceGain > 1000 && debt === originals.monthlyDebt && downPayment === originals.downPayment) {
      items.push({
        priority: "low", icon: "up", category: "income",
        text: `A ${fmt(income - originals.annualIncome)} income increase adds ${fmt(priceGain)} to your max home price.`,
      });
    }
  }

  /* ── Loan Program Hints ── */
  if (dpPercent < 3.5) {
    items.push({
      priority: "medium", icon: "info", category: "loan programs",
      text: `At ${dpPercent.toFixed(1)}% down, FHA loans (3.5% min) are not available. Increase down payment to ${fmt(Math.ceil(sim.maxHomePrice * 0.035))}.`,
    });
  } else if (dpPercent >= 3.5 && dpPercent < 5) {
    items.push({
      priority: "low", icon: "info", category: "loan programs",
      text: `FHA loans available at ${dpPercent.toFixed(1)}% down. Conventional loans typically need 5%+ (${fmt(Math.ceil(sim.maxHomePrice * 0.05))}).`,
    });
  }

  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return items;
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
    case "alert":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
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
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      );
  }
}

/* ═══════════════════════════════════════════════ */
/* ── Main Component                           ── */
/* ═══════════════════════════════════════════════ */

export default function BudgetSimulatorCard({ affordability: a, marketSnapshot: m, recommendations, preApprovalReadiness }: Props) {
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
    const emergencyFund = Math.round((a.monthlyPayment.totalMonthly + monthlyDebt) * 6);
    const closingCostBudget = recommendations.closingCostEstimate?.lowEstimate
      ? Math.round((recommendations.closingCostEstimate.lowEstimate + recommendations.closingCostEstimate.highEstimate) / 2)
      : Math.round(a.maxHomePrice * 0.03);
    return { annualIncome, monthlyDebt, downPayment, emergencyFund, closingCostBudget };
  }, [a, recommendations]);

  const [income, setIncome] = useState(originals.annualIncome);
  const [debt, setDebt] = useState(originals.monthlyDebt);
  const [downPayment, setDownPayment] = useState(originals.downPayment);
  const [emergencyFund, setEmergencyFund] = useState(originals.emergencyFund);
  const [closingCostBudget, setClosingCostBudget] = useState(originals.closingCostBudget);

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

  /* ── Dynamic readiness scores ── */
  const originalCreditScore = preApprovalReadiness?.components.creditScore ?? 15;
  const readinessScores = useMemo(() => {
    const dpPercent = simulated.maxHomePrice > 0 ? (downPayment / simulated.maxHomePrice) * 100 : 0;
    const grossMonthly = income / 12;
    const debtToIncomeRaw = grossMonthly > 0 ? (debt / grossMonthly) * 100 : 100;
    const monthlyObligations = simulated.payment.totalMonthly + debt;
    const emergencyMonths = monthlyObligations > 0 ? emergencyFund / monthlyObligations : 0;
    return calcReadinessScores(simulated.dti.backEndRatio, dpPercent, debtToIncomeRaw, emergencyMonths, originalCreditScore);
  }, [simulated, income, debt, downPayment, emergencyFund, originalCreditScore]);

  const priceChanged = Math.abs(simulated.maxHomePrice - a.maxHomePrice) > 100;

  /* ── Dynamic action items ── */
  const actionItems = useMemo(
    () => generateActionItems(simulated, a, income, debt, downPayment, emergencyFund, closingCostBudget, originals),
    [simulated, a, income, debt, downPayment, emergencyFund, closingCostBudget, originals]
  );

  /* ── Visual comparison bar ── */
  const barMax = Math.max(a.maxHomePrice, simulated.maxHomePrice) * 1.1;
  const origWidth = (a.maxHomePrice / barMax) * 100;
  const simWidth = (simulated.maxHomePrice / barMax) * 100;

  function handleReset() {
    setIncome(originals.annualIncome);
    setDebt(originals.monthlyDebt);
    setDownPayment(originals.downPayment);
    setEmergencyFund(originals.emergencyFund);
    setClosingCostBudget(originals.closingCostBudget);
  }

  const isReset =
    income === originals.annualIncome &&
    debt === originals.monthlyDebt &&
    downPayment === originals.downPayment &&
    emergencyFund === originals.emergencyFund &&
    closingCostBudget === originals.closingCostBudget;

  const highCount = actionItems.filter((i) => i.priority === "high").length;
  const medCount = actionItems.filter((i) => i.priority === "medium").length;

  const config = levelConfig[readinessScores.level];
  const origScores = preApprovalReadiness?.components;

  return (
    <div>
      {/* ── Readiness Score ── */}
      <div className="flex flex-col sm:flex-row gap-6 mb-6">
        {/* Score ring */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gray-100"
              />
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${readinessScores.overallScore * 0.9735} 97.35`}
                strokeLinecap="round"
                className={`${config.ring} transition-all duration-500`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-900">{readinessScores.overallScore}</span>
            </div>
          </div>
          <div>
            <div className={`inline-block px-3 py-1 rounded-lg border font-semibold text-sm ${config.bg} ${config.text} ${config.border} transition-all duration-300`}>
              {config.label}
            </div>
            <p className="text-sm text-gray-500 mt-1">Pre-Approval Readiness</p>
            {!isReset && preApprovalReadiness && (
              <p className="text-xs text-blue-500 mt-0.5">
                {readinessScores.overallScore > preApprovalReadiness.overallScore
                  ? `+${readinessScores.overallScore - preApprovalReadiness.overallScore} from original`
                  : readinessScores.overallScore < preApprovalReadiness.overallScore
                    ? `${readinessScores.overallScore - preApprovalReadiness.overallScore} from original`
                    : ""}
              </p>
            )}
          </div>
        </div>

        {/* Component bars */}
        <div className="flex-1 space-y-2">
          <ScoreBar
            label={componentLabels.dtiScore}
            score={readinessScores.dtiScore}
            max={25}
            changed={origScores ? readinessScores.dtiScore !== origScores.dtiScore : false}
          />
          <ScoreBar
            label={componentLabels.creditScore}
            score={readinessScores.creditScore}
            max={25}
          />
          <ScoreBar
            label={componentLabels.downPaymentScore}
            score={readinessScores.downPaymentScore}
            max={25}
            changed={origScores ? readinessScores.downPaymentScore !== origScores.downPaymentScore : false}
          />
          <ScoreBar
            label={componentLabels.debtHealthScore}
            score={readinessScores.debtHealthScore}
            max={25}
            changed={origScores ? readinessScores.debtHealthScore !== origScores.debtHealthScore : false}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5 mb-5" />

      {/* ── Sliders ── */}
      <p className="text-sm text-gray-500 mb-4">
        Adjust inputs to see how they impact your readiness score and action items in real-time.
      </p>
      <div className="space-y-5 mb-6">
        <SliderRow label="Annual Income" value={income} original={originals.annualIncome} min={30000} max={500000} step={5000} format={fmt} onChange={setIncome} />
        <SliderRow label="Monthly Debt" value={debt} original={originals.monthlyDebt} min={0} max={5000} step={50} format={fmt} onChange={setDebt} />
        <SliderRow label="Down Payment" value={downPayment} original={originals.downPayment} min={0} max={500000} step={5000} format={fmt} onChange={setDownPayment} />
        <SliderRow label="Emergency Fund" value={emergencyFund} original={originals.emergencyFund} min={0} max={200000} step={5000} format={fmt} onChange={setEmergencyFund} />
        <SliderRow label="Closing Cost Budget" value={closingCostBudget} original={originals.closingCostBudget} min={0} max={50000} step={1000} format={fmt} onChange={setClosingCostBudget} />
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

      {/* ── Results grid ── */}
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

      {/* ── Comparison bar ── */}
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

      {/* ── Dynamic Action Items ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Action Items
          </p>
          {highCount > 0 && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
              {highCount} urgent
            </span>
          )}
          {medCount > 0 && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              {medCount} to improve
            </span>
          )}
          {highCount === 0 && medCount === 0 && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
              All clear
            </span>
          )}
        </div>
        <div className="space-y-2">
          {actionItems.map((item, i) => {
            const style = priorityStyle[item.priority];
            return (
              <div
                key={`${item.category}-${i}`}
                className={`flex items-start gap-2.5 p-3 rounded-lg border ${style.bg} transition-all duration-200`}
              >
                <span className={`mt-0.5 shrink-0 ${style.color}`}>
                  <TipIcon type={item.icon} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${style.badge}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-gray-400 uppercase">{item.category}</span>
                  </div>
                  <p className={`text-sm ${style.color}`}>{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
