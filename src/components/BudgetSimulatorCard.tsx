"use client";

import { useState, useMemo } from "react";
import type { AffordabilityResult, MarketDataResult } from "@/lib/types";
import {
  calculateMaxHomePrice,
  calculateMonthlyPayment,
  calculateDTI,
} from "@/lib/utils/financial-math";

interface Props {
  affordability: AffordabilityResult;
  marketSnapshot: MarketDataResult;
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

export default function BudgetSimulatorCard({ affordability: a, marketSnapshot: m }: Props) {
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
        Adjust income, debt, or down payment to see how it affects your affordability in real-time.
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
        <div className="space-y-2">
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
    </div>
  );
}
