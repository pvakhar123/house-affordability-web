/**
 * State-by-state closing cost data for all 50 US states + DC.
 *
 * Sources (2024):
 * - Transfer tax rates: Tax Foundation, state statutes
 * - Title insurance: ALTA industry averages
 * - Home insurance: NAIC, Insurance Information Institute
 * - Attorney requirements: CFPB, state bar associations
 * - Property tax rates: Tax Foundation, Census Bureau
 */

export interface StateClosingCostRates {
  transferTaxRate: number;       // decimal of sale price (buyer portion)
  transferTaxNotes?: string;
  recordingFees: number;         // flat dollar estimate
  attorneyRequired: boolean;
  attorneyFeeEstimate: number;   // 0 if not required
  titleInsuranceRate: number;    // decimal of home price
  avgHomeInsuranceAnnual: number;
  avgPropertyTaxRate: number;    // fallback if area-info unavailable
}

export const STATE_CLOSING_COSTS: Record<string, StateClosingCostRates> = {
  AL: { transferTaxRate: 0.001,   recordingFees: 250, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1800, avgPropertyTaxRate: 0.0040 },
  AK: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1200, avgPropertyTaxRate: 0.0119 },
  AZ: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1900, avgPropertyTaxRate: 0.0062 },
  AR: { transferTaxRate: 0.0033,  recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2100, avgPropertyTaxRate: 0.0062 },
  CA: { transferTaxRate: 0.0011,  recordingFees: 250, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1500, avgPropertyTaxRate: 0.0076 },
  CO: { transferTaxRate: 0.0001,  recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2400, avgPropertyTaxRate: 0.0055 },
  CT: { transferTaxRate: 0.0075,  recordingFees: 300, attorneyRequired: true,  attorneyFeeEstimate: 1200, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1800, avgPropertyTaxRate: 0.0198 },
  DE: { transferTaxRate: 0.02,    recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 1500, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1000, avgPropertyTaxRate: 0.0056 },
  DC: { transferTaxRate: 0.011,   recordingFees: 300, attorneyRequired: true,  attorneyFeeEstimate: 1200, titleInsuranceRate: 0.0045, avgHomeInsuranceAnnual: 1300, avgPropertyTaxRate: 0.0085 },
  FL: { transferTaxRate: 0.006,   recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.006,  avgHomeInsuranceAnnual: 4000, avgPropertyTaxRate: 0.0089 },
  GA: { transferTaxRate: 0.001,   recordingFees: 250, attorneyRequired: true,  attorneyFeeEstimate: 1000, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1800, avgPropertyTaxRate: 0.0092 },
  HI: { transferTaxRate: 0.001,   recordingFees: 250, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1200, avgPropertyTaxRate: 0.0028 },
  ID: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1400, avgPropertyTaxRate: 0.0063 },
  IL: { transferTaxRate: 0.001,   recordingFees: 250, attorneyRequired: true,  attorneyFeeEstimate: 1000, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1700, avgPropertyTaxRate: 0.0197 },
  IN: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1400, avgPropertyTaxRate: 0.0085 },
  IA: { transferTaxRate: 0.0016,  recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1500, avgPropertyTaxRate: 0.0153 },
  KS: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2400, avgPropertyTaxRate: 0.0139 },
  KY: { transferTaxRate: 0.001,   recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 800,  titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1800, avgPropertyTaxRate: 0.0083 },
  LA: { transferTaxRate: 0,       recordingFees: 300, attorneyRequired: true,  attorneyFeeEstimate: 1000, titleInsuranceRate: 0.006,  avgHomeInsuranceAnnual: 3500, avgPropertyTaxRate: 0.0055 },
  ME: { transferTaxRate: 0.0044,  recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 1000, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1200, avgPropertyTaxRate: 0.0130 },
  MD: { transferTaxRate: 0.005,   recordingFees: 300, attorneyRequired: true,  attorneyFeeEstimate: 1200, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1500, avgPropertyTaxRate: 0.0101 },
  MA: { transferTaxRate: 0.00456, recordingFees: 300, attorneyRequired: true,  attorneyFeeEstimate: 1500, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1700, avgPropertyTaxRate: 0.0112 },
  MI: { transferTaxRate: 0.0075,  recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1600, avgPropertyTaxRate: 0.0162 },
  MN: { transferTaxRate: 0.0033,  recordingFees: 300, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1800, avgPropertyTaxRate: 0.0112 },
  MS: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 800,  titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2400, avgPropertyTaxRate: 0.0079 },
  MO: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1700, avgPropertyTaxRate: 0.0100 },
  MT: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1800, avgPropertyTaxRate: 0.0083 },
  NE: { transferTaxRate: 0.00225, recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2200, avgPropertyTaxRate: 0.0163 },
  NV: { transferTaxRate: 0.00195, recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1400, avgPropertyTaxRate: 0.0053 },
  NH: { transferTaxRate: 0.0075,  recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 1000, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1200, avgPropertyTaxRate: 0.0186 },
  NJ: { transferTaxRate: 0.004,   recordingFees: 300, attorneyRequired: true,  attorneyFeeEstimate: 1500, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1400, avgPropertyTaxRate: 0.0241 },
  NM: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1600, avgPropertyTaxRate: 0.0079 },
  NY: { transferTaxRate: 0.004,   recordingFees: 400, attorneyRequired: true,  attorneyFeeEstimate: 2000, titleInsuranceRate: 0.006,  avgHomeInsuranceAnnual: 1600, avgPropertyTaxRate: 0.0168 },
  NC: { transferTaxRate: 0.002,   recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 800,  titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1800, avgPropertyTaxRate: 0.0082 },
  ND: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1800, avgPropertyTaxRate: 0.0098 },
  OH: { transferTaxRate: 0.001,   recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1400, avgPropertyTaxRate: 0.0153 },
  OK: { transferTaxRate: 0.00075, recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2800, avgPropertyTaxRate: 0.0087 },
  OR: { transferTaxRate: 0.001,   recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1200, avgPropertyTaxRate: 0.0093 },
  PA: { transferTaxRate: 0.01,    recordingFees: 300, attorneyRequired: true,  attorneyFeeEstimate: 1200, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1300, avgPropertyTaxRate: 0.0134 },
  RI: { transferTaxRate: 0.0046,  recordingFees: 250, attorneyRequired: true,  attorneyFeeEstimate: 1000, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1700, avgPropertyTaxRate: 0.0146 },
  SC: { transferTaxRate: 0.00185, recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 800,  titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2000, avgPropertyTaxRate: 0.0057 },
  SD: { transferTaxRate: 0.001,   recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2200, avgPropertyTaxRate: 0.0122 },
  TN: { transferTaxRate: 0.0037,  recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 2000, avgPropertyTaxRate: 0.0066 },
  TX: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.006,  avgHomeInsuranceAnnual: 3200, avgPropertyTaxRate: 0.0167 },
  UT: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1200, avgPropertyTaxRate: 0.0058 },
  VT: { transferTaxRate: 0.0125,  recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 1000, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 800,  avgPropertyTaxRate: 0.0183 },
  VA: { transferTaxRate: 0.0025,  recordingFees: 250, attorneyRequired: true,  attorneyFeeEstimate: 1000, titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1300, avgPropertyTaxRate: 0.0080 },
  WA: { transferTaxRate: 0.011,   recordingFees: 250, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1300, avgPropertyTaxRate: 0.0092 },
  WV: { transferTaxRate: 0.0033,  recordingFees: 200, attorneyRequired: true,  attorneyFeeEstimate: 800,  titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1300, avgPropertyTaxRate: 0.0058 },
  WI: { transferTaxRate: 0.003,   recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1200, avgPropertyTaxRate: 0.0185 },
  WY: { transferTaxRate: 0,       recordingFees: 200, attorneyRequired: false, attorneyFeeEstimate: 0,    titleInsuranceRate: 0.005,  avgHomeInsuranceAnnual: 1400, avgPropertyTaxRate: 0.0057 },
};

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida",
  GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana",
  IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
  MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin",
  WY: "Wyoming",
};

export function getStateClosingCosts(stateAbbr: string): StateClosingCostRates | null {
  return STATE_CLOSING_COSTS[stateAbbr.toUpperCase()] ?? null;
}
