export interface HistoricalDataPoint {
  date: string;
  value: number;
}

export interface HistoricalData {
  medianHomePrices: HistoricalDataPoint[];
  mortgageRates?: HistoricalDataPoint[];
}

export interface MarketDataResult {
  mortgageRates: MortgageRates;
  medianHomePrices: MedianHomePrices;
  marketTrends: MarketTrend[];
  inflationData: InflationData;
  historicalData?: HistoricalData;
  fetchedAt: string;
}

export interface MortgageRates {
  thirtyYearFixed: number;
  fifteenYearFixed: number;
  federalFundsRate: number;
  dataDate: string;
  source: string;
}

export interface MedianHomePrices {
  national: number;
  nationalNew: number;
  regional?: RegionalPrice[];
  caseShillerIndex: number;
  dataDate: string;
}

export interface RegionalPrice {
  location: string;
  medianPrice: number;
  medianPricePerSqFt?: number;
  inventoryMonths?: number;
  yearOverYearChange?: number;
}

export interface MarketTrend {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  period: string;
}

export interface InflationData {
  shelterCpiCurrent: number;
  shelterCpiYearAgo: number;
  shelterInflationRate: number;
  generalInflationRate: number;
}
