import { CacheService } from "./cache";

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

export class FredApiClient {
  private apiKey: string;
  private cache: CacheService;

  constructor(apiKey: string, cache: CacheService) {
    this.apiKey = apiKey;
    this.cache = cache;
  }

  async getLatestObservation(
    seriesId: string
  ): Promise<{ date: string; value: number }> {
    const cacheKey = `fred:${seriesId}`;
    const cached = this.cache.get<{ date: string; value: number }>(cacheKey);
    if (cached) return cached;

    const url = new URL(FRED_BASE);
    url.searchParams.set("series_id", seriesId);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", "5");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      throw new Error(
        `FRED API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as FredResponse;
    const obs = data.observations.find((o) => o.value !== ".");
    if (!obs) throw new Error(`No valid data for FRED series ${seriesId}`);

    const result = { date: obs.date, value: parseFloat(obs.value) };
    this.cache.set(cacheKey, result, 3600_000); // 1 hour TTL
    return result;
  }

  async getMortgage30YRate(): Promise<{ date: string; value: number }> {
    return this.getLatestObservation("MORTGAGE30US");
  }

  async getMortgage15YRate(): Promise<{ date: string; value: number }> {
    return this.getLatestObservation("MORTGAGE15US");
  }

  async getMedianHomePrice(): Promise<{ date: string; value: number }> {
    return this.getLatestObservation("MSPUS");
  }

  async getMedianNewHomePrice(): Promise<{ date: string; value: number }> {
    return this.getLatestObservation("MSPNHSUS");
  }

  async getFedFundsRate(): Promise<{ date: string; value: number }> {
    return this.getLatestObservation("FEDFUNDS");
  }

  async getCaseShillerIndex(): Promise<{ date: string; value: number }> {
    return this.getLatestObservation("CSUSHPINSA");
  }
}
