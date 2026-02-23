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

const PROPERTY_TAX_RATE = 0.011;
const INSURANCE_ANNUAL = 1500;
const PMI_RATE = 0.005;
const MAX_FRONT_END_DTI = 0.28;
const MAX_BACK_END_DTI = 0.36;
const LOAN_TERM = 30;

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n > 0 ? "+" : "-") + "$" + Math.round(abs / 1000) + "K";
  return (n > 0 ? "+" : "") + "$" + Math.round(n);
}

/* ── Readiness score calculation (mirrors orchestrator) ── */
function calcReadiness(
  backEndDTI: number,
  dpPercent: number,
  debtToIncomeRaw: number,
  emergencyMonths: number,
  creditScore: number,
) {
  const dti = backEndDTI <= 28 ? 25 : backEndDTI <= 36 ? 20 : backEndDTI <= 43 ? 12 : backEndDTI <= 50 ? 5 : 0;
  const dp = dpPercent >= 20 ? 25 : dpPercent >= 10 ? 18 : dpPercent >= 5 ? 12 : dpPercent >= 3 ? 6 : 0;
  const dh = (debtToIncomeRaw <= 10 && emergencyMonths >= 6) ? 25
    : (debtToIncomeRaw <= 15 && emergencyMonths >= 3) ? 18
      : (debtToIncomeRaw <= 20 && emergencyMonths >= 1) ? 12
        : (debtToIncomeRaw <= 30 || emergencyMonths >= 1) ? 5 : 0;
  const total = dti + creditScore + dp + dh;
  const level = total >= 80 ? "highly_prepared" : total >= 60 ? "ready" : total >= 40 ? "needs_work" : "not_ready";
  return { overallScore: total, level };
}

const levelStyle: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  not_ready: { label: "Not Ready", color: "text-red-700", bg: "bg-red-100", ring: "text-red-500" },
  needs_work: { label: "Needs Work", color: "text-orange-700", bg: "bg-orange-100", ring: "text-orange-500" },
  ready: { label: "Ready", color: "text-yellow-700", bg: "bg-yellow-100", ring: "text-yellow-500" },
  highly_prepared: { label: "Highly Prepared", color: "text-green-700", bg: "bg-green-100", ring: "text-green-500" },
};

/* ── Action item generation ── */
interface Tip {
  severity: "error" | "warn" | "ok";
  text: string;
}

function generateTips(
  sim: { maxHomePrice: number; payment: { totalMonthly: number; pmi: number }; dti: { backEndRatio: number } },
  income: number, debt: number, downPayment: number, emergencyFund: number, closingCostBudget: number,
  original: AffordabilityResult,
  originals: { annualIncome: number; monthlyDebt: number; downPayment: number },
): Tip[] {
  const tips: Tip[] = [];
  const dpPct = sim.maxHomePrice > 0 ? (downPayment / sim.maxHomePrice) * 100 : 0;
  const monthlyOb = sim.payment.totalMonthly + debt;
  const eMo = monthlyOb > 0 ? emergencyFund / monthlyOb : 0;
  const ccLow = Math.round(sim.maxHomePrice * 0.02);
  const ccMid = Math.round(sim.maxHomePrice * 0.03);

  // DTI
  if (sim.dti.backEndRatio > 43)
    tips.push({ severity: "error", text: `DTI ${sim.dti.backEndRatio}% exceeds 43% limit — most lenders will decline. Reduce debt or increase income.` });
  else if (sim.dti.backEndRatio > 36)
    tips.push({ severity: "warn", text: `DTI ${sim.dti.backEndRatio}% above ideal 36% — may face stricter underwriting.` });

  // Emergency fund
  if (eMo < 2)
    tips.push({ severity: "error", text: `Emergency fund covers ${eMo.toFixed(1)} months — need at least 3 months (${fmt(monthlyOb * 3)}).` });
  else if (eMo < 4)
    tips.push({ severity: "warn", text: `Emergency fund covers ${eMo.toFixed(1)} months — aim for 6 months (${fmt(monthlyOb * 6)}).` });

  // Closing costs
  if (closingCostBudget < ccLow)
    tips.push({ severity: "error", text: `Closing cost budget ${fmt(closingCostBudget)} below 2% minimum (${fmt(ccLow)}). Need ${fmt(ccLow - closingCostBudget)} more.` });
  else if (closingCostBudget < ccMid)
    tips.push({ severity: "warn", text: `Closing cost budget covers the low end — consider ${fmt(ccMid)} (3%) to be safe.` });

  // PMI
  if (sim.payment.pmi > 0) {
    const gap = Math.ceil(sim.maxHomePrice * 0.2) - downPayment;
    tips.push({
      severity: dpPct < 10 ? "error" : "warn",
      text: `PMI ${fmt(sim.payment.pmi)}/mo at ${dpPct.toFixed(0)}% down. Save ${fmt(gap)} more to reach 20% and eliminate it.`,
    });
  }

  // Debt impact
  if (debt > 0 && debt < originals.monthlyDebt) {
    const gain = sim.maxHomePrice - original.maxHomePrice;
    if (gain > 1000)
      tips.push({ severity: "ok", text: `Reducing debt by ${fmt(originals.monthlyDebt - debt)}/mo unlocks ${fmt(gain)} more buying power.` });
  } else if (debt > 0 && sim.dti.backEndRatio > 36) {
    tips.push({ severity: "warn", text: `${fmt(debt)}/mo in debt pushing DTI above 36%. Paying down debt is the fastest fix.` });
  }

  // Income impact
  if (income > originals.annualIncome) {
    const gain = sim.maxHomePrice - original.maxHomePrice;
    if (gain > 1000 && debt === originals.monthlyDebt && downPayment === originals.downPayment)
      tips.push({ severity: "ok", text: `+${fmt(income - originals.annualIncome)} income adds ${fmt(gain)} buying power.` });
  }

  // Loan hints
  if (dpPct < 3.5)
    tips.push({ severity: "warn", text: `At ${dpPct.toFixed(1)}% down, FHA (3.5% min) not available.` });

  // Sort: errors first, then warnings, then ok
  tips.sort((a, b) => {
    const order = { error: 0, warn: 1, ok: 2 };
    return order[a.severity] - order[b.severity];
  });
  return tips;
}

const sevStyle = {
  error: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  warn: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  ok: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-50" },
};

export default function BudgetSimulatorCard({ affordability: a, marketSnapshot: m, recommendations, preApprovalReadiness }: Props) {
  const originals = useMemo(() => {
    const gmi = a.dtiAnalysis.frontEndRatio > 0
      ? a.monthlyPayment.totalMonthly / (a.dtiAnalysis.frontEndRatio / 100) : 0;
    const annualIncome = Math.round(gmi * 12);
    const downPayment = a.downPaymentAmount;
    const monthlyDebt = Math.max(0, Math.round(gmi * (a.dtiAnalysis.backEndRatio / 100) - a.monthlyPayment.totalMonthly));
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

  const sim = useMemo(() => {
    const { maxHomePrice, maxLoanAmount } = calculateMaxHomePrice({
      annualGrossIncome: income, monthlyDebtPayments: debt, downPaymentAmount: downPayment,
      interestRate: rate, loanTermYears: LOAN_TERM, propertyTaxRate: PROPERTY_TAX_RATE,
      insuranceAnnual: INSURANCE_ANNUAL, maxFrontEndDTI: MAX_FRONT_END_DTI, maxBackEndDTI: MAX_BACK_END_DTI,
    });
    const payment = calculateMonthlyPayment({
      homePrice: maxHomePrice, downPaymentAmount: downPayment, interestRate: rate,
      loanTermYears: LOAN_TERM, propertyTaxRate: PROPERTY_TAX_RATE, insuranceAnnual: INSURANCE_ANNUAL, pmiRate: PMI_RATE,
    });
    const dti = calculateDTI({ grossMonthlyIncome: income / 12, proposedHousingPayment: payment.totalMonthly, existingMonthlyDebts: debt });
    return { maxHomePrice, maxLoanAmount, payment, dti };
  }, [income, debt, downPayment, rate]);

  const creditScore = preApprovalReadiness?.components.creditScore ?? 15;
  const readiness = useMemo(() => {
    const dpPct = sim.maxHomePrice > 0 ? (downPayment / sim.maxHomePrice) * 100 : 0;
    const gm = income / 12;
    const dtiRaw = gm > 0 ? (debt / gm) * 100 : 100;
    const mo = sim.payment.totalMonthly + debt;
    const eMo = mo > 0 ? emergencyFund / mo : 0;
    return calcReadiness(sim.dti.backEndRatio, dpPct, dtiRaw, eMo, creditScore);
  }, [sim, income, debt, downPayment, emergencyFund, creditScore]);

  const tips = useMemo(
    () => generateTips(sim, income, debt, downPayment, emergencyFund, closingCostBudget, a, originals),
    [sim, income, debt, downPayment, emergencyFund, closingCostBudget, a, originals],
  );

  const isReset =
    income === originals.annualIncome && debt === originals.monthlyDebt &&
    downPayment === originals.downPayment && emergencyFund === originals.emergencyFund &&
    closingCostBudget === originals.closingCostBudget;

  const priceDelta = sim.maxHomePrice - a.maxHomePrice;
  const monthlyDelta = sim.payment.totalMonthly - a.monthlyPayment.totalMonthly;
  const scoreDelta = readiness.overallScore - (preApprovalReadiness?.overallScore ?? readiness.overallScore);
  const hasChange = Math.abs(priceDelta) > 100 || Math.abs(monthlyDelta) > 1 || Math.abs(scoreDelta) > 0;

  const lvl = levelStyle[readiness.level] ?? levelStyle.needs_work;

  // Readiness checklist items (reactive to simulator values)
  const dpPct = sim.maxHomePrice > 0 ? (downPayment / sim.maxHomePrice) * 100 : 0;
  const monthlyOb = sim.payment.totalMonthly + debt;
  const eMo = monthlyOb > 0 ? emergencyFund / monthlyOb : 0;
  const ccLow = Math.round(sim.maxHomePrice * 0.02);

  const checklistItems = [
    { label: "DTI under 36%", passed: sim.dti.backEndRatio < 36, detail: `${sim.dti.backEndRatio}%` },
    { label: "Credit score 740+", passed: creditScore >= 20, detail: `${creditScore}/25` },
    { label: "Down payment 20%+", passed: dpPct >= 20, detail: `${dpPct.toFixed(0)}%` },
    { label: "Emergency fund 3+ mo", passed: eMo >= 3, detail: `${eMo.toFixed(1)} mo` },
    { label: "Closing costs covered", passed: closingCostBudget >= ccLow, detail: fmt(closingCostBudget) },
  ];

  const errCount = tips.filter((t) => t.severity === "error").length;
  const warnCount = tips.filter((t) => t.severity === "warn").length;
  const allClear = errCount === 0 && warnCount === 0;

  function handleReset() {
    setIncome(originals.annualIncome);
    setDebt(originals.monthlyDebt);
    setDownPayment(originals.downPayment);
    setEmergencyFund(originals.emergencyFund);
    setClosingCostBudget(originals.closingCostBudget);
  }

  return (
    <div>
      {/* ── Score + Impact row ── */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray={`${readiness.overallScore * 0.9735} 97.35`} strokeLinecap="round"
              className={`${lvl.ring} transition-all duration-500`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{readiness.overallScore}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold px-2 py-0.5 rounded-lg ${lvl.bg} ${lvl.color}`}>{lvl.label}</span>
            {!isReset && scoreDelta !== 0 && (
              <span className={`text-xs font-medium ${scoreDelta > 0 ? "text-green-600" : "text-red-600"}`}>
                {scoreDelta > 0 ? "+" : ""}{scoreDelta} pts
              </span>
            )}
            {allClear && (
              <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">All clear</span>
            )}
            {errCount > 0 && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{errCount} issue{errCount > 1 ? "s" : ""}</span>
            )}
            {warnCount > 0 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{warnCount} to improve</span>
            )}
          </div>
          {/* Compact impact line - only when sliders moved */}
          {hasChange && !isReset && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
              {Math.abs(priceDelta) > 100 && (
                <span>Max price <strong className={priceDelta > 0 ? "text-green-600" : "text-red-600"}>{fmtCompact(priceDelta)}</strong></span>
              )}
              {Math.abs(monthlyDelta) > 1 && (
                <span>Monthly <strong className={monthlyDelta < 0 ? "text-green-600" : "text-red-600"}>{fmtCompact(monthlyDelta)}</strong></span>
              )}
              <span>DTI <strong className={sim.dti.backEndRatio <= 36 ? "text-green-600" : sim.dti.backEndRatio <= 43 ? "text-amber-600" : "text-red-600"}>
                {sim.dti.backEndRatio}%
              </strong></span>
            </div>
          )}
        </div>
      </div>

      {/* ── Readiness Checklist ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
        {checklistItems.map((item) => (
          <div key={item.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${item.passed ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
            {item.passed ? (
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-gray-300 flex-shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
            <span className="ml-auto font-medium flex-shrink-0">{item.detail}</span>
          </div>
        ))}
      </div>

      {/* ── Sliders ── */}
      <div className="space-y-4 mb-4">
        <Slider label="Annual Income" value={income} orig={originals.annualIncome} min={30000} max={500000} step={5000} onChange={setIncome} />
        <Slider label="Monthly Debt" value={debt} orig={originals.monthlyDebt} min={0} max={5000} step={50} onChange={setDebt} />
        <Slider label="Down Payment" value={downPayment} orig={originals.downPayment} min={0} max={500000} step={5000} onChange={setDownPayment} />
        <Slider label="Emergency Fund" value={emergencyFund} orig={originals.emergencyFund} min={0} max={200000} step={5000} onChange={setEmergencyFund} />
        <Slider label="Closing Costs" value={closingCostBudget} orig={originals.closingCostBudget} min={0} max={50000} step={1000} onChange={setClosingCostBudget} />
      </div>

      {!isReset && (
        <button onClick={handleReset} className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-4">
          Reset to original
        </button>
      )}

      {/* ── Tips ── */}
      {tips.length > 0 && (
        <div className="space-y-1.5">
          {tips.map((tip, i) => {
            const s = sevStyle[tip.severity];
            return (
              <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${s.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                <p className={`text-sm ${s.text}`}>{tip.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Methodology */}
      <p className="text-xs text-gray-400 mt-4">
        Recalculates affordability in real-time as you adjust inputs. Same methodology as main analysis: 1.1% property tax, $1,500/yr insurance, 28/36% DTI limits. Closing costs estimated at 3% of home price.
      </p>
    </div>
  );
}

/* ── Compact slider ── */
function Slider({ label, value, orig, min, max, step, onChange }: {
  label: string; value: number; orig: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  const delta = value - orig;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-900">{fmt(value)}</span>
          {Math.abs(delta) >= step && (
            <span className={`text-xs font-medium ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
              {delta > 0 ? "+" : ""}{fmt(delta)}
            </span>
          )}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
        style={{ accentColor: "#0071e3" }} />
    </div>
  );
}
