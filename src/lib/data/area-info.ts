/**
 * Curated area data for top 50 US metro areas.
 *
 * Sources:
 * - Property tax rates: Tax Foundation, county assessor offices (2024)
 * - Median home prices: NAR, Zillow Home Value Index (2024)
 * - School ratings: GreatSchools, Niche aggregated metro ratings
 * - Cost of living: BEA Regional Price Parities, C2ER index (100 = national average)
 */

export interface AreaInfo {
  propertyTaxRate: number;
  medianHomePrice: number;
  schoolRating: string;
  costOfLivingIndex: number;
  state: string;
  notes?: string;
}

export const AREA_DATA: Record<string, AreaInfo> = {
  // ── SOUTH ──
  "austin, tx": { propertyTaxRate: 0.0167, medianHomePrice: 450000, schoolRating: "Above Average", costOfLivingIndex: 103, state: "TX" },
  "dallas, tx": { propertyTaxRate: 0.0180, medianHomePrice: 380000, schoolRating: "Average", costOfLivingIndex: 100, state: "TX" },
  "houston, tx": { propertyTaxRate: 0.0181, medianHomePrice: 320000, schoolRating: "Average", costOfLivingIndex: 96, state: "TX" },
  "san antonio, tx": { propertyTaxRate: 0.0173, medianHomePrice: 280000, schoolRating: "Average", costOfLivingIndex: 91, state: "TX" },
  "fort worth, tx": { propertyTaxRate: 0.0178, medianHomePrice: 340000, schoolRating: "Average", costOfLivingIndex: 97, state: "TX" },
  "atlanta, ga": { propertyTaxRate: 0.0092, medianHomePrice: 380000, schoolRating: "Average", costOfLivingIndex: 98, state: "GA" },
  "charlotte, nc": { propertyTaxRate: 0.0084, medianHomePrice: 370000, schoolRating: "Above Average", costOfLivingIndex: 97, state: "NC" },
  "raleigh, nc": { propertyTaxRate: 0.0082, medianHomePrice: 410000, schoolRating: "Above Average", costOfLivingIndex: 100, state: "NC" },
  "nashville, tn": { propertyTaxRate: 0.0066, medianHomePrice: 420000, schoolRating: "Average", costOfLivingIndex: 101, state: "TN" },
  "miami, fl": { propertyTaxRate: 0.0089, medianHomePrice: 550000, schoolRating: "Below Average", costOfLivingIndex: 118, state: "FL" },
  "tampa, fl": { propertyTaxRate: 0.0083, medianHomePrice: 360000, schoolRating: "Average", costOfLivingIndex: 99, state: "FL" },
  "orlando, fl": { propertyTaxRate: 0.0086, medianHomePrice: 380000, schoolRating: "Average", costOfLivingIndex: 100, state: "FL" },
  "jacksonville, fl": { propertyTaxRate: 0.0081, medianHomePrice: 330000, schoolRating: "Average", costOfLivingIndex: 96, state: "FL" },
  "richmond, va": { propertyTaxRate: 0.0082, medianHomePrice: 340000, schoolRating: "Above Average", costOfLivingIndex: 99, state: "VA" },
  "virginia beach, va": { propertyTaxRate: 0.0080, medianHomePrice: 320000, schoolRating: "Above Average", costOfLivingIndex: 100, state: "VA" },
  "new orleans, la": { propertyTaxRate: 0.0055, medianHomePrice: 260000, schoolRating: "Below Average", costOfLivingIndex: 95, state: "LA" },
  "birmingham, al": { propertyTaxRate: 0.0040, medianHomePrice: 230000, schoolRating: "Below Average", costOfLivingIndex: 88, state: "AL" },
  "charleston, sc": { propertyTaxRate: 0.0057, medianHomePrice: 420000, schoolRating: "Above Average", costOfLivingIndex: 107, state: "SC" },

  // ── WEST ──
  "denver, co": { propertyTaxRate: 0.0055, medianHomePrice: 550000, schoolRating: "Above Average", costOfLivingIndex: 112, state: "CO" },
  "colorado springs, co": { propertyTaxRate: 0.0052, medianHomePrice: 440000, schoolRating: "Above Average", costOfLivingIndex: 100, state: "CO" },
  "phoenix, az": { propertyTaxRate: 0.0062, medianHomePrice: 430000, schoolRating: "Average", costOfLivingIndex: 102, state: "AZ" },
  "tucson, az": { propertyTaxRate: 0.0073, medianHomePrice: 310000, schoolRating: "Average", costOfLivingIndex: 93, state: "AZ" },
  "las vegas, nv": { propertyTaxRate: 0.0053, medianHomePrice: 400000, schoolRating: "Below Average", costOfLivingIndex: 102, state: "NV" },
  "salt lake city, ut": { propertyTaxRate: 0.0058, medianHomePrice: 520000, schoolRating: "Above Average", costOfLivingIndex: 104, state: "UT" },
  "boise, id": { propertyTaxRate: 0.0063, medianHomePrice: 440000, schoolRating: "Above Average", costOfLivingIndex: 100, state: "ID" },
  "portland, or": { propertyTaxRate: 0.0093, medianHomePrice: 510000, schoolRating: "Above Average", costOfLivingIndex: 113, state: "OR" },
  "seattle, wa": { propertyTaxRate: 0.0092, medianHomePrice: 750000, schoolRating: "Above Average", costOfLivingIndex: 126, state: "WA" },
  "san francisco, ca": { propertyTaxRate: 0.0073, medianHomePrice: 1200000, schoolRating: "Above Average", costOfLivingIndex: 145, state: "CA" },
  "san jose, ca": { propertyTaxRate: 0.0070, medianHomePrice: 1350000, schoolRating: "Above Average", costOfLivingIndex: 150, state: "CA" },
  "los angeles, ca": { propertyTaxRate: 0.0072, medianHomePrice: 900000, schoolRating: "Average", costOfLivingIndex: 136, state: "CA" },
  "san diego, ca": { propertyTaxRate: 0.0073, medianHomePrice: 850000, schoolRating: "Above Average", costOfLivingIndex: 130, state: "CA" },
  "sacramento, ca": { propertyTaxRate: 0.0070, medianHomePrice: 520000, schoolRating: "Average", costOfLivingIndex: 112, state: "CA" },
  "riverside, ca": { propertyTaxRate: 0.0098, medianHomePrice: 540000, schoolRating: "Average", costOfLivingIndex: 108, state: "CA" },
  "honolulu, hi": { propertyTaxRate: 0.0028, medianHomePrice: 820000, schoolRating: "Average", costOfLivingIndex: 143, state: "HI", notes: "Lowest property tax rate in the US" },

  // ── MIDWEST ──
  "chicago, il": { propertyTaxRate: 0.0197, medianHomePrice: 330000, schoolRating: "Average", costOfLivingIndex: 105, state: "IL" },
  "minneapolis, mn": { propertyTaxRate: 0.0112, medianHomePrice: 360000, schoolRating: "Above Average", costOfLivingIndex: 103, state: "MN" },
  "columbus, oh": { propertyTaxRate: 0.0153, medianHomePrice: 280000, schoolRating: "Average", costOfLivingIndex: 94, state: "OH" },
  "cincinnati, oh": { propertyTaxRate: 0.0157, medianHomePrice: 260000, schoolRating: "Average", costOfLivingIndex: 91, state: "OH" },
  "cleveland, oh": { propertyTaxRate: 0.0168, medianHomePrice: 210000, schoolRating: "Below Average", costOfLivingIndex: 89, state: "OH" },
  "indianapolis, in": { propertyTaxRate: 0.0085, medianHomePrice: 260000, schoolRating: "Average", costOfLivingIndex: 92, state: "IN" },
  "kansas city, mo": { propertyTaxRate: 0.0112, medianHomePrice: 280000, schoolRating: "Average", costOfLivingIndex: 93, state: "MO" },
  "detroit, mi": { propertyTaxRate: 0.0162, medianHomePrice: 230000, schoolRating: "Below Average", costOfLivingIndex: 90, state: "MI" },
  "milwaukee, wi": { propertyTaxRate: 0.0185, medianHomePrice: 260000, schoolRating: "Average", costOfLivingIndex: 93, state: "WI" },
  "st. louis, mo": { propertyTaxRate: 0.0100, medianHomePrice: 240000, schoolRating: "Average", costOfLivingIndex: 90, state: "MO" },

  // ── NORTHEAST ──
  "new york, ny": { propertyTaxRate: 0.0168, medianHomePrice: 680000, schoolRating: "Average", costOfLivingIndex: 140, state: "NY" },
  "boston, ma": { propertyTaxRate: 0.0112, medianHomePrice: 700000, schoolRating: "Above Average", costOfLivingIndex: 132, state: "MA" },
  "philadelphia, pa": { propertyTaxRate: 0.0134, medianHomePrice: 320000, schoolRating: "Average", costOfLivingIndex: 102, state: "PA" },
  "pittsburgh, pa": { propertyTaxRate: 0.0136, medianHomePrice: 220000, schoolRating: "Average", costOfLivingIndex: 89, state: "PA" },
  "washington, dc": { propertyTaxRate: 0.0085, medianHomePrice: 600000, schoolRating: "Above Average", costOfLivingIndex: 125, state: "DC" },
  "baltimore, md": { propertyTaxRate: 0.0101, medianHomePrice: 350000, schoolRating: "Average", costOfLivingIndex: 105, state: "MD" },
  "hartford, ct": { propertyTaxRate: 0.0198, medianHomePrice: 310000, schoolRating: "Above Average", costOfLivingIndex: 106, state: "CT", notes: "Among the highest property tax rates in the US" },
  "providence, ri": { propertyTaxRate: 0.0146, medianHomePrice: 380000, schoolRating: "Average", costOfLivingIndex: 103, state: "RI" },
};

/**
 * Look up area info by location string.
 * Tries exact match first, then fuzzy match on city name.
 */
export function lookupAreaInfo(location: string): { city: string; data: AreaInfo } | null {
  const normalized = location.toLowerCase().trim();

  // Exact match
  if (AREA_DATA[normalized]) {
    return { city: normalized, data: AREA_DATA[normalized] };
  }

  // Try matching just the city name
  const cityOnly = normalized.split(",")[0].trim();
  for (const [key, data] of Object.entries(AREA_DATA)) {
    const keyCity = key.split(",")[0].trim();
    if (keyCity === cityOnly) {
      return { city: key, data };
    }
  }

  // Try partial match
  for (const [key, data] of Object.entries(AREA_DATA)) {
    if (key.includes(cityOnly) || cityOnly.includes(key.split(",")[0].trim())) {
      return { city: key, data };
    }
  }

  return null;
}
