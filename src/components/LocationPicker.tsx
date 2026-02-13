"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  value: string[];
  onChange: (locations: string[]) => void;
}

const SUGGESTIONS = [
  { label: "New York, NY", icon: "city" },
  { label: "Los Angeles, CA", icon: "city" },
  { label: "Chicago, IL", icon: "city" },
  { label: "Houston, TX", icon: "city" },
  { label: "Miami, FL", icon: "city" },
  { label: "Seattle, WA", icon: "city" },
  { label: "Denver, CO", icon: "city" },
  { label: "Austin, TX", icon: "city" },
  { label: "San Francisco, CA", icon: "city" },
  { label: "Phoenix, AZ", icon: "city" },
  { label: "Atlanta, GA", icon: "city" },
  { label: "Boston, MA", icon: "city" },
  { label: "Nashville, TN", icon: "city" },
  { label: "Charlotte, NC", icon: "city" },
  { label: "Portland, OR", icon: "city" },
  { label: "Raleigh, NC", icon: "city" },
];

function isZipCode(s: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(s.trim());
}

function getTagType(s: string): "zip" | "city" {
  return isZipCode(s) ? "zip" : "city";
}

export default function LocationPicker({ value, onChange }: Props) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLocation = useCallback(
    (loc: string) => {
      const trimmed = loc.trim();
      if (!trimmed) return;
      // Avoid duplicates (case-insensitive)
      if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
      onChange([...value, trimmed]);
      setInput("");
    },
    [value, onChange]
  );

  const removeLocation = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLocation(input);
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeLocation(value.length - 1);
    }
  };

  const filtered = SUGGESTIONS.filter(
    (s) =>
      !value.some((v) => v.toLowerCase() === s.label.toLowerCase()) &&
      (input === "" || s.label.toLowerCase().includes(input.toLowerCase()))
  );

  return (
    <div className="space-y-2">
      {/* Input area with tags */}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((loc, i) => {
          const type = getTagType(loc);
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                type === "zip"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {type === "zip" ? (
                <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
                </svg>
              )}
              {loc}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLocation(i);
                }}
                className="ml-0.5 hover:text-red-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[140px] outline-none text-sm bg-transparent placeholder:text-gray-400"
          placeholder={
            value.length === 0
              ? "Type a city, zip code, or neighborhood..."
              : "Add another location..."
          }
        />
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-400">
        Press Enter or comma to add. Try zip codes (e.g. 90210), cities, or neighborhoods.
      </p>

      {/* Quick-pick suggestions */}
      {showSuggestions && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-md overflow-hidden">
          <p className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
            Popular cities
          </p>
          <div className="p-2 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {filtered.slice(0, 12).map((s) => (
              <button
                key={s.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  addLocation(s.label);
                  inputRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
              >
                <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
                </svg>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
