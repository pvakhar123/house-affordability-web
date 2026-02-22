"use client";

import { useState, useRef, useCallback, useMemo } from "react";

interface Props {
  value: string[];
  onChange: (locations: string[]) => void;
}

// Comprehensive US cities list for autocomplete
const US_CITIES = [
  // Top 50 metros
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
  "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
  "Dallas, TX", "Austin, TX", "San Jose, CA", "Jacksonville, FL",
  "Fort Worth, TX", "Columbus, OH", "Charlotte, NC", "Indianapolis, IN",
  "San Francisco, CA", "Seattle, WA", "Denver, CO", "Nashville, TN",
  "Oklahoma City, OK", "Washington, DC", "El Paso, TX", "Las Vegas, NV",
  "Boston, MA", "Portland, OR", "Memphis, TN", "Louisville, KY",
  "Baltimore, MD", "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ",
  "Fresno, CA", "Mesa, AZ", "Sacramento, CA", "Atlanta, GA",
  "Kansas City, MO", "Omaha, NE", "Colorado Springs, CO", "Raleigh, NC",
  "Long Beach, CA", "Virginia Beach, VA", "Miami, FL", "Oakland, CA",
  "Minneapolis, MN", "Tampa, FL", "Tulsa, OK", "Arlington, TX",
  "New Orleans, LA", "Cleveland, OH",
  // Additional popular cities
  "Pittsburgh, PA", "Cincinnati, OH", "St. Louis, MO", "Orlando, FL",
  "Honolulu, HI", "Salt Lake City, UT", "Boise, ID", "Richmond, VA",
  "Spokane, WA", "Des Moines, IA", "Madison, WI", "Lexington, KY",
  "Anchorage, AK", "Durham, NC", "Chattanooga, TN", "Savannah, GA",
  "Charleston, SC", "Greenville, SC", "Asheville, NC", "Knoxville, TN",
  "Scottsdale, AZ", "Gilbert, AZ", "Chandler, AZ", "Tempe, AZ",
  "Plano, TX", "Frisco, TX", "McKinney, TX", "Irving, TX",
  "Irvine, CA", "Pasadena, CA", "Santa Monica, CA", "Burbank, CA",
  "Glendale, CA", "Huntington Beach, CA", "Anaheim, CA", "Santa Ana, CA",
  "Riverside, CA", "San Bernardino, CA", "Ontario, CA", "Rancho Cucamonga, CA",
  "Bakersfield, CA", "Stockton, CA", "Modesto, CA", "Santa Clara, CA",
  "Sunnyvale, CA", "Fremont, CA", "Hayward, CA", "Concord, CA",
  "Bellevue, WA", "Tacoma, WA", "Everett, WA", "Redmond, WA",
  "Brooklyn, NY", "Manhattan, NY", "Queens, NY", "Bronx, NY",
  "Staten Island, NY", "Jersey City, NJ", "Newark, NJ", "Hoboken, NJ",
  "Stamford, CT", "New Haven, CT", "Hartford, CT", "Providence, RI",
  "Cambridge, MA", "Somerville, MA", "Worcester, MA", "Springfield, MA",
  "Ann Arbor, MI", "Detroit, MI", "Grand Rapids, MI", "Lansing, MI",
  "Naperville, IL", "Evanston, IL", "Aurora, IL", "Schaumburg, IL",
  "St. Paul, MN", "Bloomington, MN", "Plymouth, MN", "Duluth, MN",
  "Overland Park, KS", "Wichita, KS", "Topeka, KS",
  "Fort Collins, CO", "Boulder, CO", "Aurora, CO", "Lakewood, CO",
  "Provo, UT", "Ogden, UT", "Sandy, UT", "Layton, UT",
  "Henderson, NV", "Reno, NV", "North Las Vegas, NV",
  "Fort Lauderdale, FL", "West Palm Beach, FL", "St. Petersburg, FL",
  "Clearwater, FL", "Sarasota, FL", "Naples, FL", "Cape Coral, FL",
  "Tallahassee, FL", "Gainesville, FL", "Pensacola, FL",
  "Wilmington, NC", "Fayetteville, NC", "Winston-Salem, NC", "Greensboro, NC",
  "Columbia, SC", "Myrtle Beach, SC",
  "Alexandria, VA", "Arlington, VA", "Norfolk, VA", "Chesapeake, VA",
  "Bethesda, MD", "Silver Spring, MD", "Rockville, MD", "Annapolis, MD",
  "Birmingham, AL", "Huntsville, AL", "Montgomery, AL", "Mobile, AL",
  "Jackson, MS", "Little Rock, AR", "Fayetteville, AR", "Bentonville, AR",
  // Extended US cities
  "Coral Springs, FL", "Pembroke Pines, FL", "Hollywood, FL", "Miramar, FL",
  "Hialeah, FL", "Pompano Beach, FL", "Boca Raton, FL", "Delray Beach, FL",
  "Daytona Beach, FL", "Lakeland, FL", "Palm Bay, FL", "Melbourne, FL",
  "Ocala, FL", "Port St. Lucie, FL", "Kissimmee, FL", "Brandon, FL",
  "Coral Gables, FL", "Coconut Creek, FL", "Doral, FL", "Homestead, FL",
  "Santa Clarita, CA", "Palmdale, CA", "Lancaster, CA", "Elk Grove, CA",
  "Roseville, CA", "Visalia, CA", "Thousand Oaks, CA", "Simi Valley, CA",
  "Carlsbad, CA", "Escondido, CA", "Murrieta, CA", "Temecula, CA",
  "Ventura, CA", "Santa Barbara, CA", "San Luis Obispo, CA", "Santa Cruz, CA",
  "Redding, CA", "Chico, CA", "Napa, CA", "Vacaville, CA",
  "Walnut Creek, CA", "San Mateo, CA", "Daly City, CA", "Mountain View, CA",
  "Palo Alto, CA", "Cupertino, CA", "Milpitas, CA", "Pleasanton, CA",
  "Laredo, TX", "Lubbock, TX", "Amarillo, TX", "Brownsville, TX",
  "McAllen, TX", "Corpus Christi, TX", "Midland, TX", "Odessa, TX",
  "Beaumont, TX", "Round Rock, TX", "Sugar Land, TX", "Pearland, TX",
  "College Station, TX", "Tyler, TX", "Waco, TX", "Killeen, TX",
  "Denton, TX", "Lewisville, TX", "Allen, TX", "Carrollton, TX",
  "Pflugerville, TX", "Georgetown, TX", "New Braunfels, TX", "San Marcos, TX",
  "Tacoma, WA", "Olympia, WA", "Vancouver, WA", "Kent, WA",
  "Renton, WA", "Federal Way, WA", "Kirkland, WA", "Bothell, WA",
  "Bend, OR", "Eugene, OR", "Salem, OR", "Medford, OR",
  "Beaverton, OR", "Hillsboro, OR", "Gresham, OR", "Lake Oswego, OR",
  "Peoria, AZ", "Surprise, AZ", "Goodyear, AZ", "Avondale, AZ",
  "Flagstaff, AZ", "Yuma, AZ", "Lake Havasu City, AZ", "Maricopa, AZ",
  "Sparks, NV", "Carson City, NV", "Elko, NV",
  "Nampa, ID", "Meridian, ID", "Idaho Falls, ID", "Pocatello, ID",
  "Missoula, MT", "Billings, MT", "Great Falls, MT", "Bozeman, MT",
  "Cheyenne, WY", "Casper, WY", "Laramie, WY",
  "Sioux Falls, SD", "Rapid City, SD",
  "Fargo, ND", "Bismarck, ND",
  "Lincoln, NE", "Bellevue, NE",
  "Cedar Rapids, IA", "Davenport, IA", "Iowa City, IA", "Waterloo, IA",
  "Springfield, IL", "Rockford, IL", "Peoria, IL", "Champaign, IL",
  "Joliet, IL", "Elgin, IL", "Waukegan, IL", "Cicero, IL",
  "Green Bay, WI", "Kenosha, WI", "Racine, WI", "Appleton, WI",
  "Rochester, MN", "Mankato, MN", "St. Cloud, MN",
  "Akron, OH", "Dayton, OH", "Toledo, OH", "Youngstown, OH",
  "Canton, OH", "Parma, OH", "Lakewood, OH", "Lorain, OH",
  "Fort Wayne, IN", "Evansville, IN", "South Bend, IN", "Carmel, IN",
  "Fishers, IN", "Bloomington, IN", "Muncie, IN", "Terre Haute, IN",
  "Warren, MI", "Sterling Heights, MI", "Dearborn, MI", "Livonia, MI",
  "Troy, MI", "Farmington Hills, MI", "Kalamazoo, MI", "Muskegon, MI",
  "Rochester, NY", "Syracuse, NY", "Buffalo, NY", "Albany, NY",
  "Yonkers, NY", "White Plains, NY", "New Rochelle, NY", "Ithaca, NY",
  "Saratoga Springs, NY", "Schenectady, NY", "Utica, NY",
  "Edison, NJ", "Woodbridge, NJ", "Toms River, NJ", "Cherry Hill, NJ",
  "Trenton, NJ", "Camden, NJ", "Paterson, NJ", "Elizabeth, NJ",
  "Princeton, NJ", "Morristown, NJ", "Red Bank, NJ",
  "Bridgeport, CT", "Danbury, CT", "Norwalk, CT", "Waterbury, CT",
  "Burlington, VT", "South Burlington, VT", "Montpelier, VT",
  "Manchester, NH", "Nashua, NH", "Concord, NH", "Portsmouth, NH",
  "Portland, ME", "Bangor, ME", "Lewiston, ME",
  "Warwick, RI", "Cranston, RI", "Newport, RI",
  "Wilmington, DE", "Dover, DE", "Newark, DE",
  "Frederick, MD", "Gaithersburg, MD", "Bowie, MD", "Columbia, MD",
  "Hampton, VA", "Roanoke, VA", "Lynchburg, VA", "Charlottesville, VA",
  "Blacksburg, VA", "Manassas, VA", "Fairfax, VA", "Leesburg, VA",
  "Fayetteville, NC", "Cary, NC", "High Point, NC", "Concord, NC",
  "Gastonia, NC", "Jacksonville, NC", "Chapel Hill, NC", "Apex, NC",
  "Rock Hill, SC", "Mount Pleasant, SC", "Hilton Head Island, SC",
  "Spartanburg, SC", "Summerville, SC", "North Charleston, SC",
  "Augusta, GA", "Macon, GA", "Athens, GA", "Roswell, GA",
  "Alpharetta, GA", "Johns Creek, GA", "Marietta, GA", "Decatur, GA",
  "Clarksville, TN", "Murfreesboro, TN", "Franklin, TN", "Hendersonville, TN",
  "Johnson City, TN", "Jackson, TN", "Bartlett, TN", "Smyrna, TN",
  "Tuscaloosa, AL", "Hoover, AL", "Auburn, AL", "Dothan, AL",
  "Shreveport, LA", "Baton Rouge, LA", "Lafayette, LA", "Lake Charles, LA",
  "Gulfport, MS", "Hattiesburg, MS", "Biloxi, MS", "Southaven, MS",
  "Conway, AR", "Rogers, AR", "Springdale, AR", "Jonesboro, AR",
  "Broken Arrow, OK", "Norman, OK", "Edmond, OK", "Lawton, OK",
  "Olathe, KS", "Lawrence, KS", "Shawnee, KS", "Manhattan, KS",
  "Columbia, MO", "Springfield, MO", "Independence, MO", "Lee's Summit, MO",
  "Santa Fe, NM", "Las Cruces, NM", "Rio Rancho, NM", "Roswell, NM",
];

function isZipCode(s: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(s.trim());
}

function getTagType(s: string): "zip" | "city" {
  return isZipCode(s) ? "zip" : "city";
}

export default function LocationPicker({ value, onChange }: Props) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const addLocation = useCallback(
    (loc: string) => {
      const trimmed = loc.trim();
      if (!trimmed) return;
      if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
      onChange([...value, trimmed]);
      setInput("");
      setHighlightIndex(-1);
    },
    [value, onChange]
  );

  const removeLocation = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  // Filter cities based on input — only show when user has typed something
  const matches = useMemo(() => {
    if (input.length < 1) return [];
    const q = input.toLowerCase();
    return US_CITIES.filter(
      (city) =>
        city.toLowerCase().includes(q) &&
        !value.some((v) => v.toLowerCase() === city.toLowerCase())
    ).slice(0, 8);
  }, [input, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < matches.length) {
        addLocation(matches[highlightIndex]);
      } else {
        addLocation(input);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeLocation(value.length - 1);
    }
  };

  // Highlight matching text in suggestion
  function highlightMatch(text: string, query: string) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong className="text-blue-700 font-semibold">{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div className="relative space-y-2">
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
                aria-label={`Remove ${loc}`}
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
            setShowDropdown(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => {
            setTimeout(() => {
              setShowDropdown(false);
              setHighlightIndex(-1);
            }, 200);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-label="Search locations"
          aria-expanded={showDropdown && matches.length > 0}
          aria-autocomplete="list"
          aria-controls="location-listbox"
          aria-activedescendant={highlightIndex >= 0 ? `location-option-${highlightIndex}` : undefined}
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
        Type to search cities, or enter zip codes. Press Enter to add.
      </p>

      {/* Autocomplete dropdown */}
      {showDropdown && matches.length > 0 && (
        <div
          ref={dropdownRef}
          id="location-listbox"
          role="listbox"
          aria-label="Location suggestions"
          className="absolute z-50 left-0 right-0 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden"
        >
          {matches.map((city, i) => (
            <button
              key={city}
              id={`location-option-${i}`}
              type="button"
              role="option"
              aria-selected={i === highlightIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                addLocation(city);
                inputRef.current?.focus();
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                i === highlightIndex
                  ? "bg-blue-50 text-blue-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg
                className={`w-4 h-4 flex-shrink-0 ${i === highlightIndex ? "text-blue-500" : "text-gray-400"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>{highlightMatch(city, input)}</span>
            </button>
          ))}
          {input.trim() && !matches.some((m) => m.toLowerCase() === input.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                addLocation(input.trim());
                inputRef.current?.focus();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-500 hover:bg-gray-50 border-t border-gray-100"
            >
              <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Add &quot;{input.trim()}&quot; as custom location</span>
            </button>
          )}
        </div>
      )}

      {/* Show "add custom" when typing with no matches */}
      {showDropdown && input.trim().length > 0 && matches.length === 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              addLocation(input.trim());
              inputRef.current?.focus();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add &quot;{input.trim()}&quot;</span>
          </button>
        </div>
      )}
    </div>
  );
}
