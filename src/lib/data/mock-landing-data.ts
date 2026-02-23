import type { AffordabilityResult } from "@/lib/types/affordability";
import type { RiskReport } from "@/lib/types/risk-assessment";
import type { RentVsBuyReport } from "@/lib/types/affordability";
import type { PreApprovalReadinessScore } from "@/lib/types/agent";

export const MOCK_MORTGAGE_RATE = 6.65;

export const mockAffordability: AffordabilityResult = {
  maxHomePrice: 485000,
  recommendedHomePrice: 440000,
  downPaymentAmount: 97000,
  downPaymentPercent: 20,
  loanAmount: 388000,
  monthlyPayment: {
    principal: 842,
    interest: 1710,
    propertyTax: 445,
    homeInsurance: 125,
    pmi: 0,
    totalMonthly: 3122,
  },
  dtiAnalysis: {
    frontEndRatio: 28.1,
    backEndRatio: 34.5,
    frontEndStatus: "safe",
    backEndStatus: "safe",
    maxFrontEnd: 28,
    maxBackEnd: 36,
  },
  amortizationSummary: [
    { year: 1, principalPaid: 5304, interestPaid: 24516, remainingBalance: 382696, equityPercent: 22.1 },
    { year: 2, principalPaid: 5664, interestPaid: 24156, remainingBalance: 377032, equityPercent: 23.3 },
    { year: 3, principalPaid: 6048, interestPaid: 23772, remainingBalance: 370984, equityPercent: 24.5 },
    { year: 4, principalPaid: 6456, interestPaid: 23364, remainingBalance: 364528, equityPercent: 25.8 },
    { year: 5, principalPaid: 6888, interestPaid: 22932, remainingBalance: 357640, equityPercent: 27.2 },
  ],
};

export const mockRisk: RiskReport = {
  overallRiskLevel: "moderate",
  overallScore: 72,
  riskFlags: [
    {
      severity: "info",
      category: "debt",
      message: "Your debt-to-income ratio is within healthy limits at 34.5%",
      recommendation: "Maintain current debt levels and avoid taking on new obligations before closing.",
    },
    {
      severity: "warning",
      category: "savings",
      message: "Emergency fund covers only 4 months of expenses after purchase",
      recommendation: "Build up to 6 months of reserves before or shortly after closing.",
    },
    {
      severity: "info",
      category: "market",
      message: "Local market showing stable appreciation trends of 3-4% annually",
      recommendation: "Current market conditions are favorable for long-term buyers.",
    },
  ],
  emergencyFundAnalysis: {
    currentEmergencyFund: 35000,
    postPurchaseEmergencyFund: 18000,
    monthlyExpenses: 4500,
    monthsCovered: 4,
    adequate: false,
    recommendation: "Aim to rebuild your emergency fund to $27,000 (6 months) within the first year.",
  },
  stressTests: [
    {
      scenario: "Interest rate increases 2%",
      description: "If rates rose to 8.65%, your payment would increase by $520/month",
      newMonthlyPayment: 3642,
      newDTI: 40.2,
      canAfford: true,
      severity: "manageable",
    },
    {
      scenario: "Income drops 20%",
      description: "A job loss or pay cut would push your DTI above 43%",
      newMonthlyPayment: 3122,
      newDTI: 43.1,
      canAfford: false,
      monthsOfRunway: 8,
      severity: "strained",
    },
  ],
  rentVsBuy: {
    fiveYear: {
      buyTotalCost: 187320,
      rentTotalCost: 156000,
      buyEquity: 127360,
      verdict: "Buying builds $127K in equity over 5 years",
    },
    tenYear: {
      buyTotalCost: 374640,
      rentTotalCost: 336000,
      buyEquity: 291000,
      verdict: "Buying is clearly advantageous over 10 years",
    },
    breakEvenYears: 4,
  },
};

export const mockRentVsBuy: RentVsBuyReport = {
  currentRent: 2400,
  monthlyBuyCost: 3122,
  monthlyCostDifference: 722,
  breakEvenMonth: 48,
  breakEvenYear: 4,
  fiveYearRentTotal: 156000,
  fiveYearBuyTotal: 60240,
  fiveYearEquity: 127360,
  fiveYearNetAdvantage: 95760,
  tenYearNetAdvantage: 245000,
  yearByYear: [
    { year: 1, rentCumulative: 28800, buyCumulative: 37464, equityBuilt: 22304, netBuyAdvantage: -15160 },
    { year: 2, rentCumulative: 59136, buyCumulative: 74928, equityBuilt: 47968, netBuyAdvantage: -14792 },
    { year: 3, rentCumulative: 91050, buyCumulative: 112392, equityBuilt: 76016, netBuyAdvantage: -12342 },
    { year: 4, rentCumulative: 124582, buyCumulative: 149856, equityBuilt: 106472, netBuyAdvantage: -4902 },
    { year: 5, rentCumulative: 156000, buyCumulative: 187320, equityBuilt: 127360, netBuyAdvantage: 95760 },
  ],
  verdict: "buy_clearly",
  verdictExplanation:
    "Buying is clearly the better financial decision. You'll break even in about 4 years and build significant equity over time.",
};

export const mockReadiness: PreApprovalReadinessScore = {
  overallScore: 78,
  level: "ready",
  components: {
    dtiScore: 21,
    creditScore: 22,
    downPaymentScore: 20,
    debtHealthScore: 15,
  },
  actionItems: [
    {
      category: "debt_health",
      priority: "medium",
      action: "Pay down credit card balance to below 30% utilization",
      impact: "Could improve your score by 5-8 points",
    },
    {
      category: "emergency_fund",
      priority: "high",
      action: "Build emergency fund to 6 months of expenses",
      impact: "Provides safety net for unexpected costs after purchase",
    },
  ],
};
