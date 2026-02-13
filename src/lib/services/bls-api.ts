interface BlsSeriesData {
  year: string;
  period: string;
  periodName: string;
  value: string;
}

interface BlsResponse {
  status: string;
  Results: {
    series: Array<{
      seriesID: string;
      data: BlsSeriesData[];
    }>;
  };
}

const BLS_BASE = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

export class BlsApiClient {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async getSeries(
    seriesIds: string[],
    startYear: number,
    endYear: number
  ): Promise<Map<string, BlsSeriesData[]>> {
    const body: Record<string, unknown> = {
      seriesid: seriesIds,
      startyear: String(startYear),
      endyear: String(endYear),
    };
    if (this.apiKey) {
      body.registrationkey = this.apiKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let response: Response;
    try {
      response = await fetch(BLS_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const data = (await response.json()) as BlsResponse;
    const result = new Map<string, BlsSeriesData[]>();
    for (const series of data.Results.series) {
      result.set(series.seriesID, series.data);
    }
    return result;
  }

  async getShelterInflation(): Promise<{
    current: number;
    yearAgo: number;
    rate: number;
  }> {
    const currentYear = new Date().getFullYear();
    const data = await this.getSeries(
      ["CUSR0000SAH1"],
      currentYear - 1,
      currentYear
    );
    const series = data.get("CUSR0000SAH1") ?? [];
    const current = parseFloat(series[0]?.value ?? "0");
    const yearAgo = parseFloat(
      series[12]?.value ?? series[series.length - 1]?.value ?? "0"
    );
    const rate = yearAgo > 0 ? ((current - yearAgo) / yearAgo) * 100 : 0;
    return {
      current,
      yearAgo,
      rate: Math.round(rate * 100) / 100,
    };
  }

  async getGeneralInflation(): Promise<number> {
    const currentYear = new Date().getFullYear();
    const data = await this.getSeries(
      ["CUSR0000SA0"],
      currentYear - 1,
      currentYear
    );
    const series = data.get("CUSR0000SA0") ?? [];
    const current = parseFloat(series[0]?.value ?? "0");
    const yearAgo = parseFloat(
      series[12]?.value ?? series[series.length - 1]?.value ?? "0"
    );
    return yearAgo > 0
      ? Math.round(((current - yearAgo) / yearAgo) * 10000) / 100
      : 0;
  }
}
