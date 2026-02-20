import type { PropertyInfo } from "./property";
import type { InvestmentInputs } from "./investment";

export interface UserProfile {
  annualGrossIncome: number;
  additionalIncome?: number;
  monthlyDebtPayments: number;
  debtBreakdown?: DebtItem[];
  downPaymentSavings: number;
  additionalSavings?: number;
  creditScore: number;
  targetLocation?: string;
  preferredLoanTerm?: 15 | 20 | 30;
  loanType?: "fixed" | "5/1_arm" | "7/1_arm";
  militaryVeteran?: boolean;
  firstTimeBuyer?: boolean;
  householdSize?: number;
  monthlyExpenses?: number;
  currentMonthlyRent?: number;
  property?: PropertyInfo;
  investmentInputs?: InvestmentInputs;
}

export interface DebtItem {
  type: "student_loan" | "car_loan" | "credit_card" | "personal_loan" | "other";
  monthlyPayment: number;
  balance?: number;
  interestRate?: number;
}
