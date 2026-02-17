import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import type { MatchingProperty } from "@/lib/types";

interface RequestBody {
  location: string;
  maxPrice: number;
  recommendedPrice: number;
  downPaymentPercent: number;
  interestRate: number;
}

// Realty in US v3 API result shape (partial)
interface V3Result {
  property_id?: string;
  status?: string;
  list_price?: number;
  primary_photo?: { href?: string };
  href?: string;
  description?: {
    type?: string;
    sub_type?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    lot_sqft?: number;
  };
  location?: {
    address?: {
      line?: string;
      city?: string;
      state_code?: string;
      postal_code?: string;
    };
  };
  flags?: {
    is_new_listing?: boolean;
    is_price_reduced?: boolean;
    is_foreclosure?: boolean;
    is_new_construction?: boolean;
  };
  price_reduced_amount?: number;
  list_date?: string;
}

const REALTOR_HOST = "realty-in-us.p.rapidapi.com";

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { location, maxPrice, recommendedPrice, downPaymentPercent, interestRate } = body;

    if (!location || !maxPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!config.rapidApiKey) {
      return NextResponse.json({ properties: [], error: "RAPIDAPI_KEY not configured" });
    }

    // Parse location into city+state or postal_code
    const locParams = parseLocation(location);

    const reqBody: Record<string, unknown> = {
      ...locParams,
      limit: 20,
      offset: 0,
      status: ["for_sale"],
      price: {
        min: Math.round(recommendedPrice * 0.7),
        max: Math.round(maxPrice * 1.05),
      },
      sort: { direction: "desc", field: "list_date" },
    };

    const response = await fetch(
      `https://${REALTOR_HOST}/properties/v3/list`,
      {
        method: "POST",
        headers: {
          "x-rapidapi-key": config.rapidApiKey,
          "x-rapidapi-host": REALTOR_HOST,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      console.error("Realtor API error:", response.status, await response.text());
      return NextResponse.json({ properties: [] });
    }

    const data = await response.json();
    const rawResults: V3Result[] = data?.data?.home_search?.results || [];

    if (rawResults.length === 0) {
      return NextResponse.json({ properties: [] });
    }

    // Filter and sort by price
    const sorted = rawResults
      .filter((r) => r.list_price && r.list_price > 0)
      .sort((a, b) => (a.list_price || 0) - (b.list_price || 0));

    const picked = pickThreeProperties(sorted, recommendedPrice, maxPrice);

    const properties: MatchingProperty[] = picked.map((p) => {
      const price = p.list_price || 0;
      const sqft = p.description?.sqft || 0;

      // Build highlight tags
      const highlights: string[] = [];
      if (price < recommendedPrice * 0.9) highlights.push("Below budget");
      else if (price <= recommendedPrice * 1.1) highlights.push("Sweet spot");
      else highlights.push("Stretch buy");

      if (p.flags?.is_new_listing) highlights.push("New listing");
      if (p.flags?.is_price_reduced) highlights.push("Price cut");
      if (p.flags?.is_new_construction) highlights.push("New build");

      // Estimate monthly payment
      const loanAmount = price * (1 - downPaymentPercent / 100);
      const monthlyRate = interestRate / 100 / 12;
      const numPayments = 360;
      const pni =
        monthlyRate > 0
          ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1)
          : loanAmount / numPayments;
      const tax = (price * 0.011) / 12;
      const insurance = 150;
      const estimatedMonthly = Math.round(pni + tax + insurance);

      // Photo — upgrade to larger size
      let imageUrl = p.primary_photo?.href || undefined;
      if (imageUrl) {
        imageUrl = imageUrl.replace(/s\.jpg$/, "od.jpg");
      }

      return {
        zpid: p.property_id || undefined,
        address: p.location?.address?.line || "Address unavailable",
        city: p.location?.address?.city || "",
        state: p.location?.address?.state_code || "",
        zipCode: p.location?.address?.postal_code || "",
        price,
        bedrooms: p.description?.beds || 0,
        bathrooms: p.description?.baths || 0,
        squareFootage: sqft,
        propertyType: formatPropertyType(p.description?.type, p.description?.sub_type),
        pricePerSqFt: sqft > 0 ? Math.round(price / sqft) : undefined,
        highlights,
        imageUrl,
        listingUrl: p.href || undefined,
        listingStatus: p.status || undefined,
        estimatedMonthlyPayment: estimatedMonthly,
      };
    });

    return NextResponse.json({ properties });
  } catch (err) {
    console.error("Matching properties error:", err);
    return NextResponse.json({ properties: [] });
  }
}

function parseLocation(location: string): Record<string, string> {
  const trimmed = location.trim();

  // Check if it's a zip code (5 digits)
  if (/^\d{5}$/.test(trimmed)) {
    return { postal_code: trimmed };
  }

  // Extract zip code if present anywhere in the string
  const zipMatch = trimmed.match(/(\d{5})(?:\s*$|-\d{4})/);

  // Split by commas and work backwards: last parts are state/zip, earlier parts are street/city
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 3) {
    // Full address: "123 Main St, Austin, TX 78701" or "123 Main St, Apt 4, Austin, TX 78701"
    // Last part has state (+ optional zip), second-to-last is city
    const lastPart = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    const stateMatch = lastPart.match(/^([A-Za-z]{2,})/);
    const state = stateMatch
      ? (stateMatch[1].length === 2 ? stateMatch[1].toUpperCase() : stateToCode(stateMatch[1]))
      : "";
    const result: Record<string, string> = { city, state_code: state };
    if (zipMatch) result.postal_code = zipMatch[1];
    return result;
  }

  if (parts.length === 2) {
    // "City, ST" or "City, State 78701"
    const city = parts[0];
    const stateMatch = parts[1].match(/^([A-Za-z]{2,})/);
    const state = stateMatch
      ? (stateMatch[1].length === 2 ? stateMatch[1].toUpperCase() : stateToCode(stateMatch[1]))
      : "";
    const result: Record<string, string> = { city, state_code: state };
    if (zipMatch) result.postal_code = zipMatch[1];
    return result;
  }

  // Single word/phrase — if it has a zip, use that; otherwise treat as city
  if (zipMatch) {
    return { postal_code: zipMatch[1] };
  }
  return { city: trimmed, state_code: "" };
}

function stateToCode(name: string): string {
  const states: Record<string, string> = {
    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
    colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
    hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
    kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
    massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
    montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
    ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
    "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
    vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
    wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
  };
  return states[name.toLowerCase()] || name.slice(0, 2).toUpperCase();
}

function pickThreeProperties(
  sorted: V3Result[],
  recommendedPrice: number,
  maxPrice: number
): V3Result[] {
  if (sorted.length <= 3) return sorted;

  const below = sorted.find((p) => (p.list_price || 0) < recommendedPrice * 0.95);
  const near = sorted.find(
    (p) =>
      (p.list_price || 0) >= recommendedPrice * 0.9 &&
      (p.list_price || 0) <= recommendedPrice * 1.1 &&
      p !== below
  );
  const stretch = [...sorted].reverse().find(
    (p) =>
      (p.list_price || 0) >= maxPrice * 0.85 &&
      (p.list_price || 0) <= maxPrice * 1.05 &&
      p !== below &&
      p !== near
  );

  const picks = [below, near, stretch].filter(Boolean) as V3Result[];

  for (const p of sorted) {
    if (picks.length >= 3) break;
    if (!picks.includes(p)) picks.push(p);
  }

  return picks.slice(0, 3);
}

function formatPropertyType(type?: string, subType?: string): string {
  const t = subType || type || "";
  if (!t) return "Home";
  const map: Record<string, string> = {
    single_family: "Single Family",
    condo: "Condo",
    condos: "Condo",
    townhome: "Townhouse",
    townhouse: "Townhouse",
    multi_family: "Multi Family",
    apartment: "Apartment",
    mobile: "Mobile Home",
    land: "Land",
    farm: "Farm",
  };
  return map[t.toLowerCase()] || t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
