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
  militaryVeteran?: boolean;
  firstTimeBuyer?: boolean;
  householdSize?: number;
  monthlyExpenses?: number;
}

export interface DebtItem {
  type: "student_loan" | "car_loan" | "credit_card" | "personal_loan" | "other";
  monthlyPayment: number;
  balance?: number;
  interestRate?: number;
}
