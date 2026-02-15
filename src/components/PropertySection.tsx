"use client";

import { useState } from "react";

interface PropertyFormData {
  propertyUrl: string;
  propertyAddress: string;
  propertyListingPrice: string;
  propertyTaxAnnual: string;
  propertyHoaMonthly: string;
  propertySquareFootage: string;
}

interface Props {
  data: PropertyFormData;
  onChange: (field: string, value: string) => void;
}

export default function PropertySection({ data, onChange }: Props) {
  const [isActive, setIsActive] = useState(
    Boolean(data.propertyListingPrice || data.propertyUrl)
  );
  const [mode, setMode] = useState<"url" | "manual">("manual");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractSuccess, setExtractSuccess] = useState(false);

  const handleExtract = async () => {
    if (!data.propertyUrl.trim()) return;

    setIsExtracting(true);
    setExtractError("");
    setExtractSuccess(false);

    try {
      const res = await fetch("/api/extract-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.propertyUrl.trim() }),
      });

      const result = await res.json();

      if (!result.success) {
        setExtractError(result.error || "Could not extract property details.");
        setMode("manual");
        return;
      }

      // Auto-fill fields from extraction
      const p = result.property;
      if (p.listingPrice) onChange("propertyListingPrice", String(p.listingPrice));
      if (p.address) onChange("propertyAddress", p.address);
      if (p.propertyTaxAnnual) onChange("propertyTaxAnnual", String(p.propertyTaxAnnual));
      if (p.hoaMonthly) onChange("propertyHoaMonthly", String(p.hoaMonthly));
      if (p.squareFootage) onChange("propertySquareFootage", String(p.squareFootage));

      setExtractSuccess(true);
      setMode("manual"); // Switch to manual so user can review/edit
    } catch {
      setExtractError("Failed to extract property details. Please enter them manually.");
      setMode("manual");
    } finally {
      setIsExtracting(false);
    }
  };

  const clearAll = () => {
    onChange("propertyUrl", "");
    onChange("propertyAddress", "");
    onChange("propertyListingPrice", "");
    onChange("propertyTaxAnnual", "");
    onChange("propertyHoaMonthly", "");
    onChange("propertySquareFootage", "");
    setIsActive(false);
    setExtractError("");
    setExtractSuccess(false);
  };

  if (!isActive) {
    return (
      <section>
        <button
          type="button"
          onClick={() => setIsActive(true)}
          className="w-full flex items-center justify-between px-4 py-3 border border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            <div className="text-left">
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                Have a specific property in mind?
              </span>
              <span className="block text-xs text-gray-500">
                Add listing details for a personalized analysis
              </span>
            </div>
          </div>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            Specific Property
          </h2>
          <p className="text-xs text-gray-500">Optional - for personalized property analysis</p>
        </div>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>

      {/* URL mode */}
      {mode === "url" && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Listing URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={data.propertyUrl}
                onChange={(e) => onChange("propertyUrl", e.target.value)}
                placeholder="https://www.zillow.com/homedetails/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting || !data.propertyUrl.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {isExtracting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Extracting
                  </>
                ) : (
                  "Extract"
                )}
              </button>
            </div>
          </div>

          {extractError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">{extractError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode("manual")}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Or enter details manually
          </button>
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div className="space-y-3">
          {extractSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-700">
                Details extracted from listing. Review and edit below.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Listing Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  min={0}
                  value={data.propertyListingPrice}
                  onChange={(e) => onChange("propertyListingPrice", e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="450,000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={data.propertyAddress}
                onChange={(e) => onChange("propertyAddress", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main St, Austin TX"
              />
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
                  value={data.propertyTaxAnnual}
                  onChange={(e) => onChange("propertyTaxAnnual", e.target.value)}
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
                  value={data.propertyHoaMonthly}
                  onChange={(e) => onChange("propertyHoaMonthly", e.target.value)}
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
                value={data.propertySquareFootage}
                onChange={(e) => onChange("propertySquareFootage", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="2,100"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode("url")}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Paste a listing URL instead
          </button>
        </div>
      )}
    </section>
  );
}
