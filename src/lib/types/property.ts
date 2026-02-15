import type { PaymentBreakdown, DTIAnalysis } from "./affordability";

export interface PropertyInfo {
  source: "manual" | "url_extracted";
  sourceUrl?: string;
  address?: string;
  listingPrice: number;
  propertyTaxAnnual?: number;
  hoaMonthly?: number;
  squareFootage?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  propertyType?:
    | "single_family"
    | "condo"
    | "townhouse"
    | "multi_family"
    | "other";
}

export interface PropertyAnalysis {
  property: PropertyInfo;
  canAfford: boolean;
  monthlyPayment: PaymentBreakdown & { hoa: number };
  totalMonthlyWithHoa: number;
  dtiWithProperty: DTIAnalysis;
  stretchFactor: number;
  vsRecommended: {
    priceDifference: number;
    paymentDifference: number;
  };
  verdict: "comfortable" | "tight" | "stretch" | "over_budget";
  verdictExplanation: string;
}
