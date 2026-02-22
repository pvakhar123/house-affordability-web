"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getRecentSearches } from "@/lib/recent-searches";

interface Props {
  value: string;
  onChange: (address: string) => void;
}

interface Prediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export default function AddressPicker({ value, onChange }: Props) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync input when parent value changes
  useEffect(() => {
    setInput(value);
  }, [value]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/address-autocomplete?input=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setSuggestions(data.predictions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    onChange(val);
    setHighlightIndex(-1);
    setShowDropdown(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 200);
  };

  const selectAddress = (prediction: Prediction) => {
    // Use mainText + secondaryText without ", USA" suffix
    const full = prediction.secondaryText
      ? `${prediction.mainText}, ${prediction.secondaryText.replace(/, USA$/, "")}`
      : prediction.mainText;
    setInput(full);
    onChange(full);
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        selectAddress(suggestions[highlightIndex]);
      } else if (input.trim()) {
        onChange(input.trim());
        setShowDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowDropdown(false);
      setHighlightIndex(-1);
      if (input.trim() && input.trim() !== value) {
        onChange(input.trim());
      }
    }, 200);
  };

  // Highlight matching text
  function highlightMatch(text: string, query: string) {
    if (!query || query.length < 2) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong className="text-blue-700 font-semibold">
          {text.slice(idx, idx + query.length)}
        </strong>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="Start typing an address..."
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <svg
              className="animate-spin w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden">
          {suggestions.map((prediction, i) => (
            <button
              key={prediction.placeId}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectAddress(prediction)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`w-full flex items-start gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                i === highlightIndex
                  ? "bg-blue-50 text-blue-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  i === highlightIndex ? "text-blue-500" : "text-gray-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {highlightMatch(prediction.mainText, input)}
                </p>
                {prediction.secondaryText && (
                  <p className="truncate text-xs text-gray-500">
                    {prediction.secondaryText}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-xs text-gray-400">
        Type an address, street, or neighborhood
      </p>

      {/* Recent searches */}
      {recentSearches.length > 0 && !input && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-400 mr-0.5 self-center">Recent:</span>
          {recentSearches.map((addr) => (
            <button
              key={addr}
              type="button"
              onClick={() => {
                setInput(addr);
                onChange(addr);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors truncate max-w-[200px]"
              title={addr}
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {addr.length > 30 ? addr.slice(0, 30) + "..." : addr}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
