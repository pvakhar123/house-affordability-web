import type { GeoCoordinates } from "@/lib/types/maps";

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

// In-memory cache with 5-minute TTL
const cache = new Map<string, { coords: GeoCoordinates; expires: number }>();
const TTL = 5 * 60 * 1000;

export async function geocodeLocation(
  location: string,
): Promise<GeoCoordinates | null> {
  if (!MAPBOX_TOKEN) return null;

  const key = location.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.coords;

  try {
    const encoded = encodeURIComponent(location);
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=us&limit=1`,
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.center;
    const coords: GeoCoordinates = { lat, lng };
    cache.set(key, { coords, expires: Date.now() + TTL });
    return coords;
  } catch {
    return null;
  }
}
