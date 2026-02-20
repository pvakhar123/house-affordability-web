import type { PaymentBreakdown, DTIAnalysis, AmortizationYear, InvestmentProjectionYear } from "../types/index";

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

// ── Investment Property Functions ──

export function estimateMonthlyRent(params: {
  purchasePrice: number;
  areaMedianRent?: number | null;
  areaMedianHomePrice?: number | null;
}): { estimatedRent: number; method: "area_ratio" | "fallback_ratio" } {
  if (params.areaMedianRent && params.areaMedianHomePrice && params.areaMedianHomePrice > 0) {
    const areaRentToPrice = params.areaMedianRent / params.areaMedianHomePrice;
    return { estimatedRent: Math.round(params.purchasePrice * areaRentToPrice), method: "area_ratio" };
  }
  // Fallback: 0.8% of purchase price (conservative national average)
  return { estimatedRent: Math.round(params.purchasePrice * 0.008), method: "fallback_ratio" };
}

export function calculateInvestmentMetrics(params: {
  purchasePrice: number;
  downPaymentAmount: number;
  closingCostPercent: number;
  monthlyGrossRent: number;
  monthlyMortgagePI: number;
  monthlyPMI: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  maintenanceRate: number;
  propertyManagementPercent: number;
  vacancyRatePercent: number;
  capexReservePercent: number;
}): {
  monthlyOperatingExpenses: {
    propertyManagement: number; vacancy: number; capexReserve: number;
    propertyTax: number; insurance: number; hoa: number; maintenance: number;
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
} {
  const rent = params.monthlyGrossRent;
  const propertyManagement = round(rent * params.propertyManagementPercent / 100);
  const vacancy = round(rent * params.vacancyRatePercent / 100);
  const capexReserve = round(rent * params.capexReservePercent / 100);
  const propertyTax = round(params.propertyTaxAnnual / 12);
  const insurance = round(params.insuranceAnnual / 12);
  const hoa = round(params.hoaMonthly);
  const maintenance = round((params.purchasePrice * params.maintenanceRate) / 12);

  const totalOpex = propertyManagement + vacancy + capexReserve + propertyTax + insurance + hoa + maintenance;
  const monthlyNOI = round(rent - totalOpex);
  const monthlyCashFlow = round(monthlyNOI - params.monthlyMortgagePI - params.monthlyPMI);
  const annualNOI = round(monthlyNOI * 12);
  const annualCashFlow = round(monthlyCashFlow * 12);
  const totalCashInvested = round(params.downPaymentAmount + params.purchasePrice * params.closingCostPercent);

  return {
    monthlyOperatingExpenses: { propertyManagement, vacancy, capexReserve, propertyTax, insurance, hoa, maintenance },
    monthlyNOI,
    monthlyCashFlow,
    annualNOI,
    annualCashFlow,
    capRate: params.purchasePrice > 0 ? round((annualNOI / params.purchasePrice) * 100) : 0,
    cashOnCashReturn: totalCashInvested > 0 ? round((annualCashFlow / totalCashInvested) * 100) : 0,
    grossRentMultiplier: rent > 0 ? round(params.purchasePrice / (rent * 12)) : 0,
    rentToPrice: params.purchasePrice > 0 ? round((rent / params.purchasePrice) * 100) : 0,
    totalCashInvested,
  };
}

export function projectInvestmentReturns(params: {
  purchasePrice: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  annualCashFlowYear1: number;
  baseAnnualRent: number;
  totalCashInvested: number;
  annualHomeAppreciation: number;
  annualRentGrowth: number;
  years: number;
}): InvestmentProjectionYear[] {
  const monthlyRate = params.interestRate / 12;
  const numPayments = params.loanTermYears * 12;
  const monthlyPI = params.loanAmount > 0
    ? (params.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    : 0;

  let balance = params.loanAmount;
  let propertyValue = params.purchasePrice;
  let cumulativeCashFlow = 0;
  const projections: InvestmentProjectionYear[] = [];

  for (let year = 1; year <= params.years; year++) {
    // Amortize for this year
    for (let month = 0; month < 12; month++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPI - interest;
      balance = Math.max(0, balance - principal);
    }

    // Appreciate property
    propertyValue = propertyValue * (1 + params.annualHomeAppreciation);
    const equity = propertyValue - balance;

    // Grow rent and cash flow
    const annualRent = params.baseAnnualRent * Math.pow(1 + params.annualRentGrowth, year - 1);
    const annualCashFlow = params.annualCashFlowYear1 * Math.pow(1 + params.annualRentGrowth, year - 1);
    cumulativeCashFlow += annualCashFlow;

    const totalReturn = equity + cumulativeCashFlow - params.totalCashInvested;
    const totalReturnPercent = params.totalCashInvested > 0
      ? (totalReturn / params.totalCashInvested) * 100
      : 0;
    const annualizedReturn = year > 0
      ? (Math.pow(1 + Math.max(0, totalReturnPercent) / 100, 1 / year) - 1) * 100
      : 0;

    projections.push({
      year,
      propertyValue: Math.round(propertyValue),
      equity: Math.round(equity),
      annualRent: Math.round(annualRent),
      annualCashFlow: Math.round(annualCashFlow),
      cumulativeCashFlow: Math.round(cumulativeCashFlow),
      totalReturn: Math.round(totalReturn),
      totalReturnPercent: round(totalReturnPercent),
      annualizedReturn: round(annualizedReturn),
    });
  }

  return projections;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
