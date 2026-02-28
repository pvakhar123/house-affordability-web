import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import type { NearbyAmenity } from "@/lib/types";

const RATE_LIMIT = new Map<string, { count: number; reset: number }>();
const MAX_PER_HOUR = 10;
const CACHE = new Map<string, { data: NearbyAmenity[]; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000;

const CATEGORIES: { type: string; label: string }[] = [
  { type: "grocery_or_supermarket", label: "Grocery" },
  { type: "restaurant", label: "Restaurants" },
  { type: "school", label: "Schools" },
  { type: "park", label: "Parks" },
  { type: "transit_station", label: "Transit" },
  { type: "hospital", label: "Medical" },
  { type: "gym", label: "Fitness" },
];

const CATEGORY_KEY_MAP: Record<string, string> = {
  grocery_or_supermarket: "grocery",
  restaurant: "restaurants",
  school: "schools",
  park: "parks",
  transit_station: "transit",
  hospital: "medical",
  gym: "fitness",
};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (!entry || now > entry.reset) {
    RATE_LIMIT.set(ip, { count: 1, reset: now + 3600_000 });
    return true;
  }
  if (entry.count >= MAX_PER_HOUR) return false;
  entry.count++;
  return true;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Missing or invalid lat/lng" }, { status: 400 });
  }

  if (!config.googleMapsApiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 503 });
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ amenities: cached.data });
  }

  try {
    const apiKey = config.googleMapsApiKey;
    const radius = 2414; // 1.5 miles in meters

    const results = await Promise.all(
      CATEGORIES.map(async ({ type, label }) => {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`,
            { signal: AbortSignal.timeout(10000) },
          );
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const places: any[] = data.results || [];
          const categoryKey = CATEGORY_KEY_MAP[type] || type;

          return places.slice(0, 3).map((p): NearbyAmenity => {
            const pLat = p.geometry?.location?.lat ?? lat;
            const pLng = p.geometry?.location?.lng ?? lng;
            const dist = haversineDistance(lat, lng, pLat, pLng);
            return {
              name: p.name || "Unknown",
              category: categoryKey,
              categoryLabel: label,
              rating: p.rating || 0,
              userRatingsTotal: p.user_ratings_total || 0,
              address: p.vicinity || "",
              distance: dist < 0.1 ? `${Math.round(dist * 5280)} ft` : `${dist.toFixed(1)} mi`,
              lat: pLat,
              lng: pLng,
            };
          });
        } catch {
          return [];
        }
      }),
    );

    const amenities = results.flat();
    CACHE.set(cacheKey, { data: amenities, expires: Date.now() + CACHE_TTL });

    return NextResponse.json({ amenities });
  } catch (err) {
    console.error("Nearby places error:", err);
    return NextResponse.json({ error: "Failed to fetch nearby places" }, { status: 500 });
  }
}
