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
    currentMonthlyRent: "2500",
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
    // Investment analysis fields
    isInvestmentProperty: false,
    investmentExpectedRent: "",
    investmentPropertyMgmt: "10",
    investmentVacancyRate: "8",
    investmentCapexReserve: "5",
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

    // Add investment analysis inputs if toggle is on
    if (form.isInvestmentProperty) {
      profile.investmentInputs = {
        isInvestmentProperty: true,
        expectedMonthlyRent: Number(form.investmentExpectedRent) || undefined,
        propertyManagementPercent: Number(form.investmentPropertyMgmt) || 10,
        vacancyRatePercent: Number(form.investmentVacancyRate) || 8,
        capexReservePercent: Number(form.investmentCapexReserve) || 5,
      };
    }

    onSubmit(profile);
  };

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* Location & Property - moved to top */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
          Where are you looking?
        </h2>
        <div className="space-y-4">
          <div>
            {/* Toggle - Specific Address first */}
            <div className="flex rounded-full border border-gray-200 p-0.5 bg-gray-50 mb-3">
              <button
                type="button"
                onClick={() => setLocationMode("address")}
                aria-pressed={locationMode === "address"}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                aria-pressed={locationMode === "neighborhood"}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Type
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
                  <option value="5/1_arm">5/1 ARM</option>
                  <option value="7/1_arm">7/1 ARM</option>
                </optgroup>
              </select>
            </div>
            <div className="flex gap-4 sm:pb-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.militaryVeteran}
                  onChange={(e) => update("militaryVeteran", e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Veteran</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
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
          {(form.preferredLoanTerm === "5/1_arm" || form.preferredLoanTerm === "7/1_arm") && (
            <p className="text-xs text-amber-600">
              ARM loans have a lower initial rate but can adjust annually after the fixed period.
            </p>
          )}
        </div>
      </section>

      {/* Your Finances — compact grid */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          Your Finances
        </h2>
        <div className="space-y-4">
          {/* Income row */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Income</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Gross *
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
                  Additional Annual
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
          </div>

          {/* Savings row */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Savings</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Down Payment *
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
                  Emergency Fund
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
          </div>

          {/* Debts & Expenses row */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly Obligations</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Debt Payments *
                </label>
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
                  Living Expenses
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Rent
                </label>
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
          </div>

          {/* Credit Score — inline */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit</span>
            </div>
            <div className="sm:w-1/3">
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
          </div>
        </div>
      </section>

      {/* Investment Property Toggle */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Investment Analysis
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Analyze as a rental investment property</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isInvestmentProperty}
            onClick={() => update("isInvestmentProperty", !form.isInvestmentProperty)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{ background: form.isInvestmentProperty ? "#0071e3" : "#d1d1d6" }}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                form.isInvestmentProperty ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {form.isInvestmentProperty && (
          <div className="space-y-4 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Monthly Rent
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Leave blank to auto-estimate based on area data
              </p>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  min={0}
                  value={form.investmentExpectedRent}
                  onChange={(e) => update("investmentExpectedRent", e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="Auto-estimate"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Mgmt %
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.investmentPropertyMgmt}
                  onChange={(e) => update("investmentPropertyMgmt", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vacancy Rate %
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.investmentVacancyRate}
                  onChange={(e) => update("investmentVacancyRate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CapEx Reserve %
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.investmentCapexReserve}
                  onChange={(e) => update("investmentCapexReserve", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-6 text-white font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        style={{ background: "#0071e3", boxShadow: "0 4px 14px rgba(0,113,227,0.25)" }}
      >
        {isLoading ? "Analyzing..." : "Analyze My Home Purchase"}
      </button>
    </form>
  );
}
