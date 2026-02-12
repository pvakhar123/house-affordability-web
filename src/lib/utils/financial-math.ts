import type { PaymentBreakdown, DTIAnalysis, AmortizationYear } from "../types/index";

export function calculateMaxHomePrice(params: {
  annualGrossIncome: number;
  monthlyDebtPayments: number;
  downPaymentAmount: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
  maxFrontEndDTI: number;
  maxBackEndDTI: number;
}): { maxHomePrice: number; maxLoanAmount: number; limitingFactor: string } {
  const monthlyIncome = params.annualGrossIncome / 12;
  const maxHousingFrontEnd = monthlyIncome * params.maxFrontEndDTI;
  const maxHousingBackEnd =
    monthlyIncome * params.maxBackEndDTI - params.monthlyDebtPayments;

  const maxHousingPayment = Math.min(maxHousingFrontEnd, maxHousingBackEnd);
  const limitingFactor =
    maxHousingFrontEnd < maxHousingBackEnd ? "front-end DTI" : "back-end DTI";

  const monthlyRate = params.interestRate / 12;
  const numPayments = params.loanTermYears * 12;

  // Binary search for max home price
  let lo = 0;
  let hi = 3_000_000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const loanAmount = mid - params.downPaymentAmount;
    if (loanAmount <= 0) {
      lo = mid;
      continue;
    }
    const pi =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    const monthlyTax = (mid * params.propertyTaxRate) / 12;
    const monthlyInsurance = params.insuranceAnnual / 12;
    const pmi =
      params.downPaymentAmount / mid < 0.2 ? (loanAmount * 0.005) / 12 : 0;
    const totalPayment = pi + monthlyTax + monthlyInsurance + pmi;

    if (totalPayment < maxHousingPayment) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const maxHomePrice = Math.floor(lo);
  return {
    maxHomePrice,
    maxLoanAmount: Math.max(0, maxHomePrice - params.downPaymentAmount),
    limitingFactor,
  };
}

export function calculateMonthlyPayment(params: {
  homePrice: number;
  downPaymentAmount: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
  pmiRate: number;
}): PaymentBreakdown {
  const loanAmount = params.homePrice - params.downPaymentAmount;
  const monthlyRate = params.interestRate / 12;
  const numPayments = params.loanTermYears * 12;

  const monthlyPI =
    (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const firstMonthInterest = loanAmount * monthlyRate;
  const firstMonthPrincipal = monthlyPI - firstMonthInterest;

  const propertyTax = (params.homePrice * params.propertyTaxRate) / 12;
  const homeInsurance = params.insuranceAnnual / 12;
  const downPaymentPercent = params.downPaymentAmount / params.homePrice;
  const pmi =
    downPaymentPercent < 0.2 ? (loanAmount * params.pmiRate) / 12 : 0;

  return {
    principal: round(firstMonthPrincipal),
    interest: round(firstMonthInterest),
    propertyTax: round(propertyTax),
    homeInsurance: round(homeInsurance),
    pmi: round(pmi),
    totalMonthly: round(monthlyPI + propertyTax + homeInsurance + pmi),
  };
}

export function calculateDTI(params: {
  grossMonthlyIncome: number;
  proposedHousingPayment: number;
  existingMonthlyDebts: number;
}): DTIAnalysis {
  const frontEnd = params.proposedHousingPayment / params.grossMonthlyIncome;
  const backEnd =
    (params.proposedHousingPayment + params.existingMonthlyDebts) /
    params.grossMonthlyIncome;

  return {
    frontEndRatio: round(frontEnd * 100),
    backEndRatio: round(backEnd * 100),
    frontEndStatus:
      frontEnd <= 0.28 ? "safe" : frontEnd <= 0.32 ? "moderate" : "risky",
    backEndStatus:
      backEnd <= 0.36 ? "safe" : backEnd <= 0.43 ? "moderate" : "risky",
    maxFrontEnd: 28,
    maxBackEnd: 36,
  };
}

export function generateAmortizationSummary(params: {
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
}): AmortizationYear[] {
  const monthlyRate = params.interestRate / 12;
  const numPayments = params.loanTermYears * 12;
  const monthlyPayment =
    (params.loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  let balance = params.loanAmount;
  const summary: AmortizationYear[] = [];

  for (let year = 1; year <= 5; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    for (let month = 0; month < 12; month++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      yearPrincipal += principal;
      yearInterest += interest;
      balance -= principal;
    }
    summary.push({
      year,
      principalPaid: Math.round(yearPrincipal),
      interestPaid: Math.round(yearInterest),
      remainingBalance: Math.round(balance),
      equityPercent: round(
        ((params.loanAmount - balance) / params.loanAmount) * 100
      ),
    });
  }

  return summary;
}

export function stressTestRateHike(params: {
  loanAmount: number;
  baseRate: number;
  rateIncrease: number;
  loanTermYears: number;
  grossMonthlyIncome: number;
  existingMonthlyDebts: number;
  propertyTaxMonthly: number;
  insuranceMonthly: number;
}): {
  newRate: number;
  newMonthlyPayment: number;
  newDTI: number;
  canAfford: boolean;
  severity: "manageable" | "strained" | "unsustainable";
} {
  const newRate = params.baseRate + params.rateIncrease;
  const monthlyRate = newRate / 12;
  const numPayments = params.loanTermYears * 12;
  const newPI =
    (params.loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const newMonthlyPayment =
    newPI + params.propertyTaxMonthly + params.insuranceMonthly;
  const newDTI =
    ((newMonthlyPayment + params.existingMonthlyDebts) /
      params.grossMonthlyIncome) *
    100;
  const canAfford = newDTI <= 43;
  const severity =
    newDTI <= 36
      ? "manageable"
      : newDTI <= 43
        ? "strained"
        : "unsustainable";

  return {
    newRate: round(newRate * 100) / 100,
    newMonthlyPayment: round(newMonthlyPayment),
    newDTI: round(newDTI),
    canAfford,
    severity,
  };
}

export function stressTestIncomeLoss(params: {
  grossMonthlyIncome: number;
  incomeReductionPercent: number;
  monthlyHousingPayment: number;
  existingMonthlyDebts: number;
  remainingSavings: number;
  monthlyExpenses: number;
}): {
  reducedIncome: number;
  newDTI: number;
  monthlySurplusOrDeficit: number;
  monthsOfRunway: number;
  canAfford: boolean;
  severity: "manageable" | "strained" | "unsustainable";
} {
  const reducedIncome =
    params.grossMonthlyIncome * (1 - params.incomeReductionPercent / 100);
  const totalObligations =
    params.monthlyHousingPayment +
    params.existingMonthlyDebts +
    params.monthlyExpenses;
  const monthlySurplusOrDeficit = reducedIncome - totalObligations;
  const newDTI =
    reducedIncome > 0
      ? ((params.monthlyHousingPayment + params.existingMonthlyDebts) /
          reducedIncome) *
        100
      : 999;
  const monthsOfRunway =
    monthlySurplusOrDeficit < 0
      ? Math.floor(params.remainingSavings / Math.abs(monthlySurplusOrDeficit))
      : 999;

  return {
    reducedIncome: round(reducedIncome),
    newDTI: round(newDTI),
    monthlySurplusOrDeficit: round(monthlySurplusOrDeficit),
    monthsOfRunway: Math.min(monthsOfRunway, 999),
    canAfford: newDTI <= 50,
    severity:
      newDTI <= 36
        ? "manageable"
        : newDTI <= 50
          ? "strained"
          : "unsustainable",
  };
}

export function evaluateEmergencyFund(params: {
  totalSavings: number;
  downPaymentAmount: number;
  estimatedClosingCosts: number;
  monthlyExpenses: number;
  monthlyHousingPayment: number;
}): {
  postPurchaseSavings: number;
  monthlyNeed: number;
  monthsCovered: number;
  adequate: boolean;
  recommendation: string;
} {
  const postPurchaseSavings =
    params.totalSavings -
    params.downPaymentAmount -
    params.estimatedClosingCosts;
  const monthlyNeed = params.monthlyExpenses + params.monthlyHousingPayment;
  const monthsCovered =
    postPurchaseSavings > 0
      ? Math.floor(postPurchaseSavings / monthlyNeed)
      : 0;
  const adequate = monthsCovered >= 6;

  let recommendation: string;
  if (monthsCovered >= 6) {
    recommendation =
      "Your emergency fund is adequate. You have a solid financial cushion.";
  } else if (monthsCovered >= 3) {
    recommendation = `You have ${monthsCovered} months of reserves. Consider building to 6 months before buying, or ensure stable income.`;
  } else {
    recommendation = `Only ${monthsCovered} months of reserves after purchase. This is risky. Consider saving more or reducing your target home price.`;
  }

  return {
    postPurchaseSavings: round(postPurchaseSavings),
    monthlyNeed: round(monthlyNeed),
    monthsCovered,
    adequate,
    recommendation,
  };
}

export function calculateRentVsBuy(params: {
  homePrice: number;
  downPaymentAmount: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
  maintenanceRate: number;
  monthlyRent: number;
  rentGrowthRate: number;
  homeAppreciationRate: number;
  years: number;
}): {
  buyTotalCost: number;
  rentTotalCost: number;
  buyEquity: number;
  verdict: string;
} {
  const loanAmount = params.homePrice - params.downPaymentAmount;
  const monthlyRate = params.interestRate / 12;
  const numPayments = params.loanTermYears * 12;
  const monthlyPI =
    (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  let buyTotalCost = params.downPaymentAmount;
  let balance = loanAmount;
  for (let yr = 0; yr < params.years; yr++) {
    const yearlyTax = params.homePrice * params.propertyTaxRate;
    const yearlyMaintenance = params.homePrice * params.maintenanceRate;
    buyTotalCost += monthlyPI * 12 + yearlyTax + params.insuranceAnnual + yearlyMaintenance;
    for (let m = 0; m < 12; m++) {
      const interest = balance * monthlyRate;
      balance -= monthlyPI - interest;
    }
  }

  let rentTotalCost = 0;
  let currentRent = params.monthlyRent;
  for (let yr = 0; yr < params.years; yr++) {
    rentTotalCost += currentRent * 12;
    currentRent *= 1 + params.rentGrowthRate;
  }

  const futureHomeValue =
    params.homePrice * Math.pow(1 + params.homeAppreciationRate, params.years);
  const buyEquity = futureHomeValue - Math.max(0, balance);

  const buyNetCost = buyTotalCost - buyEquity;
  const verdict =
    buyNetCost < rentTotalCost
      ? `Buying saves $${Math.round(rentTotalCost - buyNetCost).toLocaleString()} over ${params.years} years`
      : `Renting saves $${Math.round(buyNetCost - rentTotalCost).toLocaleString()} over ${params.years} years`;

  return {
    buyTotalCost: Math.round(buyTotalCost),
    rentTotalCost: Math.round(rentTotalCost),
    buyEquity: Math.round(buyEquity),
    verdict,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
