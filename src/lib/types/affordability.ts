export interface AffordabilityResult {
  maxHomePrice: number;
  recommendedHomePrice: number;
  downPaymentAmount: number;
  downPaymentPercent: number;
  loanAmount: number;
  monthlyPayment: PaymentBreakdown;
  dtiAnalysis: DTIAnalysis;
  amortizationSummary: AmortizationYear[];
}

export interface PaymentBreakdown {
  principal: number;
  interest: number;
  propertyTax: number;
  homeInsurance: number;
  pmi: number;
  totalMonthly: number;
}

export interface DTIAnalysis {
  frontEndRatio: number;
  backEndRatio: number;
  frontEndStatus: "safe" | "moderate" | "risky";
  backEndStatus: "safe" | "moderate" | "risky";
  maxFrontEnd: number;
  maxBackEnd: number;
}

export interface AmortizationYear {
  year: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  equityPercent: number;
}

export interface RentVsBuyYear {
  year: number;
  rentCumulative: number;
  buyCumulative: number;       // total out-of-pocket (mortgage + tax + ins + PMI - equity)
  equityBuilt: number;
  netBuyAdvantage: number;     // positive = buying is ahead
}

export interface RentVsBuyReport {
  currentRent: number;
  monthlyBuyCost: number;
  monthlyCostDifference: number;  // buy - rent (positive = buying costs more)
  breakEvenMonth: number | null;  // month when buying becomes cheaper (null = never in 30 yrs)
  breakEvenYear: number | null;
  fiveYearRentTotal: number;
  fiveYearBuyTotal: number;       // net cost (payments - equity built)
  fiveYearEquity: number;
  fiveYearNetAdvantage: number;   // positive = buying wins at 5 years
  tenYearNetAdvantage: number;
  yearByYear: RentVsBuyYear[];
  verdict: "buy_clearly" | "buy_slightly" | "toss_up" | "rent_better";
  verdictExplanation: string;
}
