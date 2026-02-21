import { NextRequest, NextResponse } from "next/server";

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get("location");

  if (!location || !MAPBOX_TOKEN) {
    return NextResponse.json({ imageUrl: null, coords: null });
  }

  try {
    // Geocode location to get coordinates
    const encoded = encodeURIComponent(location);
    const geoRes = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&country=us&limit=1`
    );
    const geoData = await geoRes.json();
    const feature = geoData.features?.[0];

    if (!feature) {
      return NextResponse.json({ imageUrl: null, coords: null });
    }

    const [lng, lat] = feature.center;

    // Build Mapbox Static Image URL — satellite with labels
    const imageUrl =
      `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/` +
      `pin-s+3b82f6(${lng},${lat})/${lng},${lat},14,0/1200x400@2x` +
      `?access_token=${MAPBOX_TOKEN}`;

    return NextResponse.json({ imageUrl, coords: { lat, lng } });
  } catch {
    return NextResponse.json({ imageUrl: null, coords: null });
  }
}
