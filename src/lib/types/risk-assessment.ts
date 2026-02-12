export interface RiskReport {
  overallRiskLevel: "low" | "moderate" | "high" | "very_high";
  overallScore: number;
  stressTests: StressTestResult[];
  riskFlags: RiskFlag[];
  emergencyFundAnalysis: EmergencyFundAnalysis;
  rentVsBuy: RentVsBuyAnalysis;
}

export interface StressTestResult {
  scenario: string;
  description: string;
  newMonthlyPayment?: number;
  newDTI?: number;
  canAfford: boolean;
  monthsOfRunway?: number;
  severity: "manageable" | "strained" | "unsustainable";
}

export interface RiskFlag {
  category: "income" | "debt" | "savings" | "credit" | "market";
  severity: "info" | "warning" | "critical";
  message: string;
  recommendation: string;
}

export interface EmergencyFundAnalysis {
  currentEmergencyFund: number;
  postPurchaseEmergencyFund: number;
  monthlyExpenses: number;
  monthsCovered: number;
  adequate: boolean;
  recommendation: string;
}

export interface RentVsBuyAnalysis {
  fiveYear: RentVsBuyPeriod;
  tenYear: RentVsBuyPeriod;
  breakEvenYears: number;
}

export interface RentVsBuyPeriod {
  buyTotalCost: number;
  rentTotalCost: number;
  buyEquity: number;
  verdict: string;
}
