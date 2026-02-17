/**
 * Property search service using RapidAPI Zillow endpoint.
 *
 * Free tier: 50 requests/month at rapidapi.com
 * Sign up at: https://rapidapi.com/s.mahmoud97/api/zillow-com1
 */

export interface PropertyListing {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number | null;
  homeType: string;
  listingUrl: string | null;
}

interface ZillowResult {
  address?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingArea?: number;
  homeType?: string;
  detailUrl?: string;
}

interface ZillowResponse {
  props?: ZillowResult[];
}

export async function searchProperties(params: {
  location: string;
  maxPrice?: number;
  minPrice?: number;
  minBeds?: number;
}): Promise<PropertyListing[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY environment variable is not set. Sign up at https://rapidapi.com/s.mahmoud97/api/zillow-com1");
  }

  const url = new URL("https://zillow-com1.p.rapidapi.com/propertyExtendedSearch");
  url.searchParams.set("location", params.location);
  url.searchParams.set("status_type", "ForSale");
  url.searchParams.set("sort", "Newest");
  url.searchParams.set("home_type", "Houses");

  if (params.maxPrice) {
    url.searchParams.set("maxPrice", params.maxPrice.toString());
  }
  if (params.minPrice) {
    url.searchParams.set("minPrice", params.minPrice.toString());
  }
  if (params.minBeds) {
    url.searchParams.set("bedsMin", params.minBeds.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "zillow-com1.p.rapidapi.com",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zillow API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ZillowResponse;
  const results = data.props ?? [];

  // Filter and map to our format, return top 5
  return results
    .filter((r) => r.price && r.address)
    .slice(0, 5)
    .map((r) => ({
      address: r.address ?? "Unknown",
      price: r.price ?? 0,
      beds: r.bedrooms ?? 0,
      baths: r.bathrooms ?? 0,
      sqft: r.livingArea ?? null,
      homeType: r.homeType ?? "House",
      listingUrl: r.detailUrl ? `https://www.zillow.com${r.detailUrl}` : null,
    }));
}
