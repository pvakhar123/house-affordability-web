import { NextRequest, NextResponse } from "next/server";

const RADAR_KEY = process.env.RADAR_PUBLISHABLE_KEY;

interface RadarAddress {
  formattedAddress: string;
  addressLabel: string;
  number: string;
  street: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: string;
  countryCode: string;
  layer: string;
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!RADAR_KEY) {
    return NextResponse.json(
      { error: "Radar API key not configured" },
      { status: 500 }
    );
  }

  try {
    const params = new URLSearchParams({
      query: input,
      layers: "address",
      country: "US",
      limit: "6",
    });

    const res = await fetch(
      `https://api.radar.io/v1/search/autocomplete?${params}`,
      {
        headers: { Authorization: RADAR_KEY },
        next: { revalidate: 0 },
      }
    );

    const data = await res.json();
    const addresses: RadarAddress[] = data.addresses || [];

    const predictions = addresses.map((a) => ({
      mainText: a.addressLabel || `${a.number} ${a.street}`,
      secondaryText: [a.city, a.stateCode, a.postalCode]
        .filter(Boolean)
        .join(", "),
      description: a.formattedAddress,
      placeId: `${a.number}-${a.street}-${a.postalCode}`,
    }));

    return NextResponse.json({ predictions });
  } catch (err) {
    console.error("Address autocomplete error:", err);
    return NextResponse.json({ predictions: [] });
  }
}
