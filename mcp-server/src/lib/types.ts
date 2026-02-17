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
