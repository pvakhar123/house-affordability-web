"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  value: string;
  onChange: (address: string) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    county?: string;
  };
}

function formatAddress(result: NominatimResult): string {
  const a = result.address;
  const parts: string[] = [];

  if (a.house_number && a.road) {
    parts.push(`${a.house_number} ${a.road}`);
  } else if (a.road) {
    parts.push(a.road);
  }

  const city = a.city || a.town || a.village;
  if (city) parts.push(city);
  if (a.state) parts.push(a.state);
  if (a.postcode) parts.push(a.postcode);

  return parts.join(", ");
}

function scoreResult(result: NominatimResult, query: string): number {
  const formatted = formatAddress(result).toLowerCase();
  const q = query.toLowerCase().trim();
  const queryHouseNum = q.match(/^\d+/)?.[0];
  const a = result.address;

  let score = 0;

  // Exact house number match is most important
  if (queryHouseNum && a.house_number === queryHouseNum) score += 200;

  // Has both house number and road (specific address)
  if (a.house_number && a.road) score += 100;

  // Has a road at least (street-level)
  if (a.road) score += 40;

  // Has a house number at all
  if (a.house_number) score += 30;

  // Penalize results that are just city/county/state (no road)
  if (!a.road && !a.house_number) score -= 50;

  // Formatted address starts with the query
  if (formatted.startsWith(q)) score += 50;

  // Contains the full query
  if (formatted.includes(q)) score += 10;

  return score;
}

export default function AddressPicker({ value, onChange }: Props) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync input when parent value changes
  useEffect(() => {
    setInput(value);
  }, [value]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    // If query starts with a number (house number), wait until the street
    // name portion also has at least 2 characters so Nominatim can match
    const startsWithNum = /^\d/.test(query);
    if (startsWithNum) {
      const streetPart = query.replace(/^\d+\s*/, "");
      if (streetPart.length < 2) {
        setSuggestions([]);
        return;
      }
    }

    setIsLoading(true);
    try {
      const baseParams = {
        format: "json",
        addressdetails: "1",
        countrycodes: "us",
        limit: "6",
      };
      const headers = { "Accept-Language": "en" };
      const base = "https://nominatim.openstreetmap.org/search?";

      // Always do free-text search
      const freeTextReq = fetch(
        base + new URLSearchParams({ ...baseParams, q: query }),
        { headers }
      );

      // If query starts with a number, also do structured street search
      let structuredReq: Promise<Response> | null = null;
      if (startsWithNum) {
        const parts = query.split(",").map((p) => p.trim());
        const structured: Record<string, string> = {
          ...baseParams,
          street: parts[0],
        };
        if (parts[1]) structured.city = parts[1];
        if (parts[2]) structured.state = parts[2];
        structuredReq = fetch(base + new URLSearchParams(structured), {
          headers,
        });
      }

      // Run in parallel, merge results
      const responses = await Promise.all(
        [freeTextReq, structuredReq].filter(Boolean)
      );
      const allResults: NominatimResult[] = [];
      const seenIds = new Set<number>();
      for (const res of responses) {
        const data: NominatimResult[] = await res!.json();
        for (const r of data) {
          if (!seenIds.has(r.place_id)) {
            seenIds.add(r.place_id);
            allResults.push(r);
          }
        }
      }

      // Sort so specific address matches rank above city/area results
      allResults.sort((a, b) => scoreResult(b, query) - scoreResult(a, query));
      setSuggestions(allResults.slice(0, 5));
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    onChange(val); // Keep parent form state in sync immediately
    setHighlightIndex(-1);
    setShowDropdown(true);

    // Debounce API calls
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const selectAddress = (result: NominatimResult) => {
    const formatted = formatAddress(result);
    setInput(formatted);
    onChange(formatted);
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
      // Commit the current input value
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
          {suggestions.map((result, i) => {
            const formatted = formatAddress(result);
            return (
              <button
                key={result.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectAddress(result)}
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
                  <p className="truncate">
                    {highlightMatch(formatted, input)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-1.5 text-xs text-gray-400">
        Type at least 3 characters to see suggestions
      </p>
    </div>
  );
}
