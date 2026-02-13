import { CacheService } from "./cache";
import type { RegionalPrice } from "../types/index";

const RAPIDAPI_HOST = "us-housing-market-data.p.rapidapi.com";

export class HousingApiClient {
  private apiKey: string;
  private cache: CacheService;

  constructor(apiKey: string, cache: CacheService) {
    this.apiKey = apiKey;
    this.cache = cache;
  }

  async getRegionalData(zipOrCounty: string): Promise<RegionalPrice | null> {
    const cacheKey = `housing:${zipOrCounty}`;
    const cached = this.cache.get<RegionalPrice>(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://${RAPIDAPI_HOST}/housing?zip=${encodeURIComponent(zipOrCounty)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            "x-rapidapi-key": this.apiKey,
            "x-rapidapi-host": RAPIDAPI_HOST,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) return null;

      const data = (await response.json()) as Record<string, unknown>;
      const result: RegionalPrice = {
        location: zipOrCounty,
        medianPrice: (data.median_sale_price as number) ?? (data.medianPrice as number) ?? 0,
        medianPricePerSqFt: (data.median_price_per_sqft as number) ?? undefined,
        inventoryMonths: (data.months_of_supply as number) ?? undefined,
        yearOverYearChange: (data.year_over_year_change as number) ?? undefined,
      };

      this.cache.set(cacheKey, result, 3600_000);
      return result;
    } catch {
      return null;
    }
  }
}
