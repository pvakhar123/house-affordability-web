import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { geocodeLocation } from "@/lib/services/geocode";

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const REALTOR_HOST = "realty-in-us.p.rapidapi.com";

export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get("location");

  if (!location || !MAPBOX_TOKEN) {
    return NextResponse.json({ propertyImage: null, satelliteUrl: null, lat: null, lng: null });
  }

  try {
    // Geocode first — we need coords for both satellite URL and response
    const coords = await geocodeLocation(location);

    // Run satellite URL build and property photo search in parallel
    const [satelliteUrl, propertyImage] = await Promise.all([
      // 1. Build satellite map URL from coords
      (async (): Promise<string | null> => {
        if (!coords) return null;
        const { lat, lng } = coords;
        return (
          `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/` +
          `pin-s+3b82f6(${lng},${lat})/${lng},${lat},14,0/800x300@2x` +
          `?access_token=${MAPBOX_TOKEN}`
        );
      })(),

      // 2. Property photo from RealtyInUS
      (async (): Promise<string | null> => {
        if (!config.rapidApiKey) return null;
        try {
          const parts = location.split(",").map((p) => p.trim());
          let city = "";
          let stateCode = "";

          for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            if (/^\d{5}/.test(part)) continue;
            const sm = part.match(/^([A-Za-z]{2,})(?:\s+\d{5})?$/);
            if (sm && !stateCode) {
              const candidate = sm[1];
              stateCode =
                candidate.length === 2
                  ? candidate.toUpperCase()
                  : stateToCode(candidate);
              continue;
            }
            if (!city && stateCode) {
              city = part;
              break;
            }
          }

          const streetAddress = parts[0] || "";
          if (!city || !stateCode || !streetAddress) return null;

          const searchRes = await fetch(
            `https://${REALTOR_HOST}/properties/v3/list`,
            {
              method: "POST",
              headers: {
                "x-rapidapi-key": config.rapidApiKey,
                "x-rapidapi-host": REALTOR_HOST,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                city,
                state_code: stateCode,
                limit: 5,
                offset: 0,
                status: ["for_sale", "sold", "ready_to_build"],
              }),
              signal: AbortSignal.timeout(8000),
            },
          );

          if (!searchRes.ok) return null;
          const data = await searchRes.json();
          const results = data?.data?.home_search?.results || [];

          const houseNum = streetAddress.match(/^\d+/)?.[0] || "";
          const streetWords = streetAddress.toLowerCase().replace(/^\d+\s*/, "").split(/\s+/).slice(0, 2).join(" ");

          const match = results.find(
            (r: { location?: { address?: { line?: string } } }) => {
              const line = r.location?.address?.line?.toLowerCase() || "";
              return houseNum && line.startsWith(houseNum) && line.includes(streetWords);
            },
          );

          if (match?.primary_photo?.href) {
            return match.primary_photo.href.replace(/s\.jpg$/, "od.jpg");
          }
          return null;
        } catch {
          return null;
        }
      })(),
    ]);

    return NextResponse.json({
      propertyImage,
      satelliteUrl,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });
  } catch {
    return NextResponse.json({ propertyImage: null, satelliteUrl: null, lat: null, lng: null });
  }
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
