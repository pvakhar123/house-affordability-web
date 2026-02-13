"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/types";
import LocationPicker from "./LocationPicker";

interface Props {
  onSubmit: (profile: UserProfile) => void;
  isLoading: boolean;
}

export default function AffordabilityForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState({
    annualGrossIncome: "",
    additionalIncome: "",
    monthlyDebtPayments: "",
    downPaymentSavings: "",
    additionalSavings: "",
    creditScore: "",
    monthlyExpenses: "3000",
    targetLocations: [] as string[],
    preferredLoanTerm: "30",
    militaryVeteran: false,
    firstTimeBuyer: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile: UserProfile = {
      annualGrossIncome: Number(form.annualGrossIncome),
      additionalIncome: Number(form.additionalIncome) || undefined,
      monthlyDebtPayments: Number(form.monthlyDebtPayments),
      downPaymentSavings: Number(form.downPaymentSavings),
      additionalSavings: Number(form.additionalSavings) || undefined,
      creditScore: Number(form.creditScore),
      monthlyExpenses: Number(form.monthlyExpenses),
      targetLocation: form.targetLocations.length > 0 ? form.targetLocations.join(", ") : undefined,
      preferredLoanTerm: Number(form.preferredLoanTerm) as 15 | 20 | 30,
      militaryVeteran: form.militaryVeteran,
      firstTimeBuyer: form.firstTimeBuyer,
    };
    onSubmit(profile);
  };

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      {/* Income */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Income
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Annual Gross Income *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                required
                min={0}
                value={form.annualGrossIncome}
                onChange={(e) => update("annualGrossIncome", e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="120,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Annual Income
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                min={0}
                value={form.additionalIncome}
                onChange={(e) => update("additionalIncome", e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Debts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Monthly Debts
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Monthly Debt Payments *
          </label>
          <p className="text-xs text-gray-500 mb-1">
            Car loans, student loans, credit card minimums, etc.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
            <input
              type="number"
              required
              min={0}
              value={form.monthlyDebtPayments}
              onChange={(e) => update("monthlyDebtPayments", e.target.value)}
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="500"
            />
          </div>
        </div>
      </section>

      {/* Savings */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Savings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Down Payment Savings *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                required
                min={0}
                value={form.downPaymentSavings}
                onChange={(e) => update("downPaymentSavings", e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="60,000"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Savings / Emergency Fund
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                min={0}
                value={form.additionalSavings}
                onChange={(e) => update("additionalSavings", e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="20,000"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Profile */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Financial Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credit Score *
            </label>
            <input
              type="number"
              required
              min={300}
              max={850}
              value={form.creditScore}
              onChange={(e) => update("creditScore", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="740"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Living Expenses
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                min={0}
                value={form.monthlyExpenses}
                onChange={(e) => update("monthlyExpenses", e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="3,000"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Preferences
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Locations
            </label>
            <LocationPicker
              value={form.targetLocations}
              onChange={(locations) =>
                setForm((prev) => ({ ...prev, targetLocations: locations }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Loan Term
            </label>
            <select
              value={form.preferredLoanTerm}
              onChange={(e) => update("preferredLoanTerm", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="30">30-year fixed</option>
              <option value="15">15-year fixed</option>
              <option value="20">20-year fixed</option>
            </select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.militaryVeteran}
                onChange={(e) => update("militaryVeteran", e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Military Veteran</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.firstTimeBuyer}
                onChange={(e) => update("firstTimeBuyer", e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">First-Time Buyer</span>
            </label>
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Analyzing..." : "Analyze My Affordability"}
      </button>
    </form>
  );
}
