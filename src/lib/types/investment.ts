export interface InvestmentInputs {
  isInvestmentProperty: boolean;
  expectedMonthlyRent?: number;
  propertyManagementPercent: number;
  vacancyRatePercent: number;
  capexReservePercent: number;
}

export interface InvestmentAnalysis {
  monthlyGrossRent: number;
  rentSource: "auto_estimate" | "user_override";
  monthlyOperatingExpenses: {
    propertyManagement: number;
    vacancy: number;
    capexReserve: number;
    propertyTax: number;
    insurance: number;
    hoa: number;
    maintenance: number;
  };
  monthlyNOI: number;
  monthlyCashFlow: number;
  annualNOI: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  grossRentMultiplier: number;
  rentToPrice: number;
  totalCashInvested: number;
  purchasePrice: number;
  projections: InvestmentProjectionYear[];
  verdict: "strong_investment" | "moderate_investment" | "marginal" | "negative_cash_flow";
  verdictExplanation: string;
}

export interface InvestmentProjectionYear {
  year: number;
  propertyValue: number;
  equity: number;
  annualRent: number;
  annualCashFlow: number;
  cumulativeCashFlow: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
}
