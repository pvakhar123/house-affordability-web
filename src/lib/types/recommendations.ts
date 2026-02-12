export interface RecommendationsResult {
  loanOptions: LoanOption[];
  savingsStrategies: SavingsStrategy[];
  closingCostEstimate: ClosingCostEstimate;
  generalAdvice: string[];
}

export interface LoanOption {
  type: "conventional" | "fha" | "va" | "usda";
  eligible: boolean;
  eligibilityReason?: string;
  minDownPaymentPercent: number;
  estimatedRate: number;
  monthlyPayment: number;
  pmiRequired: boolean;
  pmiMonthlyEstimate: number;
  totalCostOver30Years: number;
  pros: string[];
  cons: string[];
}

export interface SavingsStrategy {
  title: string;
  description: string;
  potentialSavings: number;
  timeframeMonths: number;
  difficulty: "easy" | "moderate" | "hard";
}

export interface ClosingCostEstimate {
  lowEstimate: number;
  highEstimate: number;
  breakdown: { item: string; amount: number }[];
}
