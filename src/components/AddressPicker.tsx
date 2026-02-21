"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  value: string;
  onChange: (address: string) => void;
}

interface PhotonProperties {
  osm_id: number;
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  county?: string;
  type?: string;
}

interface PhotonFeature {
  properties: PhotonProperties;
}

function formatAddress(props: PhotonProperties): string {
  const parts: string[] = [];

  if (props.housenumber && props.street) {
    parts.push(`${props.housenumber} ${props.street}`);
  } else if (props.street) {
    parts.push(props.street);
  } else if (props.name) {
    parts.push(props.name);
  }

  if (props.city) parts.push(props.city);
  if (props.state) parts.push(props.state);
  if (props.postcode) parts.push(props.postcode);

  return parts.join(", ");
}

function scoreResult(feature: PhotonFeature, query: string): number {
  const props = feature.properties;
  const formatted = formatAddress(props).toLowerCase();
  const q = query.toLowerCase().trim();
  const queryHouseNum = q.match(/^\d+/)?.[0];

  let score = 0;

  // Exact house number match
  if (queryHouseNum && props.housenumber === queryHouseNum) score += 200;

  // Has both house number and street (specific address)
  if (props.housenumber && props.street) score += 100;

  // Has a street at least
  if (props.street) score += 40;

  // Has a house number
  if (props.housenumber) score += 30;

  // Penalize results with no street and no house number (city/state level)
  if (!props.street && !props.housenumber) score -= 50;

  // Formatted address starts with the query
  if (formatted.startsWith(q)) score += 50;

  // Contains the full query
  if (formatted.includes(q)) score += 10;

  return score;
}

export default function AddressPicker({ value, onChange }: Props) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
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

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?` +
          new URLSearchParams({
            q: query,
            limit: "7",
            lang: "en",
            lat: "39.8",
            lon: "-98.5",
          })
      );
      const data = await res.json();
      const features: PhotonFeature[] = data.features || [];

      // Filter to US only
      const usResults = features.filter(
        (f) => f.properties.country === "United States"
      );

      // Sort: specific addresses first, city-level results last
      usResults.sort((a, b) => scoreResult(b, query) - scoreResult(a, query));
      setSuggestions(usResults.slice(0, 5));
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

    // Fast debounce for responsive autocomplete
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 200);
  };

  const selectAddress = (feature: PhotonFeature) => {
    const formatted = formatAddress(feature.properties);
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
          {suggestions.map((feature, i) => {
            const props = feature.properties;
            const formatted = formatAddress(props);
            // Show street line + city/state line separately
            const streetLine = props.housenumber && props.street
              ? `${props.housenumber} ${props.street}`
              : props.street || props.name || "";
            const cityLine = [props.city, props.state, props.postcode]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={`${props.osm_id}-${i}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectAddress(feature)}
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
                    {highlightMatch(streetLine, input)}
                  </p>
                  {cityLine && (
                    <p className="truncate text-xs text-gray-500">{cityLine}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-1.5 text-xs text-gray-400">
        Type an address, street, or neighborhood
      </p>
    </div>
  );
}
