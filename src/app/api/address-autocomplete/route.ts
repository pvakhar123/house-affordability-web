import { NextRequest, NextResponse } from "next/server";

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

interface MapboxContext {
  id: string;
  text: string;
  short_code?: string;
}

interface MapboxFeature {
  place_name: string;
  text: string;
  address?: string;
  context?: MapboxContext[];
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!MAPBOX_TOKEN) {
    return NextResponse.json(
      { error: "Mapbox access token not configured" },
      { status: 500 }
    );
  }

  try {
    const encoded = encodeURIComponent(input);
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      types: "address",
      country: "us",
      autocomplete: "true",
      limit: "6",
    });

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?${params}`,
      { next: { revalidate: 0 } }
    );

    const data = await res.json();
    const features: MapboxFeature[] = data.features || [];

    const predictions = features.map((f) => {
      // Build main text: "1977 Silva Place"
      const mainText = f.address
        ? `${f.address} ${f.text}`
        : f.text;

      // Build secondary text from context: "Santa Clara, California, 95054"
      const city = f.context?.find((c) => c.id.startsWith("place"))?.text;
      const state = f.context?.find((c) => c.id.startsWith("region"))?.text;
      const postcode = f.context?.find((c) =>
        c.id.startsWith("postcode")
      )?.text;
      const secondaryText = [city, state, postcode]
        .filter(Boolean)
        .join(", ");

      return {
        mainText,
        secondaryText,
        description: f.place_name,
        placeId: f.place_name,
      };
    });

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("Address autocomplete error:", err);
    return NextResponse.json({ predictions: [] });
  }
}
