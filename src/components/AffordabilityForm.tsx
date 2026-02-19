"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/types";
import LocationPicker from "./LocationPicker";
import AddressPicker from "./AddressPicker";

interface Props {
  onSubmit: (profile: UserProfile) => void;
  isLoading: boolean;
}

export default function AffordabilityForm({ onSubmit, isLoading }: Props) {
  const [locationMode, setLocationMode] = useState<"neighborhood" | "address">("address");
  const [form, setForm] = useState({
    annualGrossIncome: "120000",
    additionalIncome: "",
    monthlyDebtPayments: "500",
    currentMonthlyRent: "",
    downPaymentSavings: "60000",
    additionalSavings: "20000",
    creditScore: "740",
    monthlyExpenses: "3000",
    targetLocations: [] as string[],
    specificAddress: "",
    includeRadius: false,
    preferredLoanTerm: "30",
    militaryVeteran: false,
    firstTimeBuyer: true,
    // Property fields (used in address mode)
    propertyListingPrice: "",
    propertyTaxAnnual: "",
    propertyHoaMonthly: "",
    propertySquareFootage: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isArm = form.preferredLoanTerm === "5/1_arm" || form.preferredLoanTerm === "7/1_arm";
    const profile: UserProfile = {
      annualGrossIncome: Number(form.annualGrossIncome),
      additionalIncome: Number(form.additionalIncome) || undefined,
      monthlyDebtPayments: Number(form.monthlyDebtPayments),
      downPaymentSavings: Number(form.downPaymentSavings),
      additionalSavings: Number(form.additionalSavings) || undefined,
      creditScore: Number(form.creditScore),
      monthlyExpenses: Number(form.monthlyExpenses),
      targetLocation: locationMode === "address"
        ? (form.specificAddress || undefined)
        : (form.targetLocations.length > 0
          ? form.targetLocations.join(", ") + (form.includeRadius ? " (and surrounding areas within 5 miles)" : "")
          : undefined),
      preferredLoanTerm: isArm ? 30 : (Number(form.preferredLoanTerm) as 15 | 20 | 30),
      loanType: isArm ? (form.preferredLoanTerm as "5/1_arm" | "7/1_arm") : "fixed",
      militaryVeteran: form.militaryVeteran,
      firstTimeBuyer: form.firstTimeBuyer,
      currentMonthlyRent: Number(form.currentMonthlyRent) || undefined,
    };

    // Add property if listing price is provided (only in address mode)
    if (form.propertyListingPrice && locationMode === "address") {
      profile.property = {
        source: "manual",
        address: form.specificAddress || undefined,
        listingPrice: Number(form.propertyListingPrice),
        propertyTaxAnnual: Number(form.propertyTaxAnnual) || undefined,
        hoaMonthly: Number(form.propertyHoaMonthly) || undefined,
        squareFootage: Number(form.propertySquareFootage) || undefined,
      };
    }

    onSubmit(profile);
  };

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      {/* Location & Property - moved to top */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Where are you looking?
        </h2>
        <div className="space-y-4">
          <div>
            {/* Toggle - Specific Address first */}
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 mb-3">
              <button
                type="button"
                onClick={() => setLocationMode("address")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  locationMode === "address"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Specific Address
              </button>
              <button
                type="button"
                onClick={() => setLocationMode("neighborhood")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  locationMode === "neighborhood"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
                </svg>
                Neighborhood
              </button>
            </div>

            {/* Specific address mode */}
            {locationMode === "address" && (
              <div className="space-y-4">
                <AddressPicker
                  value={form.specificAddress}
                  onChange={(address) =>
                    setForm((prev) => ({ ...prev, specificAddress: address }))
                  }
                />

                {/* Property details (optional) */}
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Property Details (Optional)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Listing Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="number"
                          min={0}
                          value={form.propertyListingPrice}
                          onChange={(e) => update("propertyListingPrice", e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="450,000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Annual Property Tax
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="number"
                          min={0}
                          value={form.propertyTaxAnnual}
                          onChange={(e) => update("propertyTaxAnnual", e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="5,400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monthly HOA
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input
                          type="number"
                          min={0}
                          value={form.propertyHoaMonthly}
                          onChange={(e) => update("propertyHoaMonthly", e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="250"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Square Footage
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={form.propertySquareFootage}
                        onChange={(e) => update("propertySquareFootage", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="2,100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Neighborhood mode */}
            {locationMode === "neighborhood" && (
              <>
                <LocationPicker
                  value={form.targetLocations}
                  onChange={(locations) =>
                    setForm((prev) => ({ ...prev, targetLocations: locations }))
                  }
                />
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={form.includeRadius}
                    onChange={(e) => update("includeRadius", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Also include homes within 5 mile radius</span>
                </label>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Loan Type
            </label>
            <select
              value={form.preferredLoanTerm}
              onChange={(e) => update("preferredLoanTerm", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <optgroup label="Fixed Rate">
                <option value="30">30-year fixed</option>
                <option value="15">15-year fixed</option>
                <option value="20">20-year fixed</option>
              </optgroup>
              <optgroup label="Adjustable Rate (ARM)">
                <option value="5/1_arm">5/1 ARM (fixed 5 yrs, then adjusts)</option>
                <option value="7/1_arm">7/1 ARM (fixed 7 yrs, then adjusts)</option>
              </optgroup>
            </select>
            {(form.preferredLoanTerm === "5/1_arm" || form.preferredLoanTerm === "7/1_arm") && (
              <p className="mt-1 text-xs text-amber-600">
                ARM loans have a lower initial rate but can adjust annually after the fixed period.
              </p>
            )}
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

      {/* Debts & Rent */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Monthly Debts & Rent
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Monthly Debt Payments *
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Car loans, student loans, credit cards, etc.
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Monthly Rent
            </label>
            <p className="text-xs text-gray-500 mb-1">
              For rent vs. buy comparison
            </p>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                min={0}
                value={form.currentMonthlyRent}
                onChange={(e) => update("currentMonthlyRent", e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="2,000"
              />
            </div>
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

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Analyzing..." : "Analyze My Home Purchase"}
      </button>
    </form>
  );
}
