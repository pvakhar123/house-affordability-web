import { z } from "zod";

// ── /api/analyze ─────────────────────────────────────────────

export const analyzeInputSchema = z.object({
  annualGrossIncome: z.number().min(1).max(10_000_000),
  additionalIncome: z.number().min(0).max(10_000_000).optional(),
  monthlyDebtPayments: z.number().min(0).max(500_000),
  debtBreakdown: z
    .array(
      z.object({
        type: z.enum(["student_loan", "car_loan", "credit_card", "personal_loan", "other"]),
        monthlyPayment: z.number().min(0),
        balance: z.number().min(0).optional(),
        interestRate: z.number().min(0).max(1).optional(),
      }),
    )
    .optional(),
  downPaymentSavings: z.number().min(0).max(100_000_000),
  additionalSavings: z.number().min(0).max(100_000_000).optional(),
  creditScore: z.number().min(300).max(850),
  targetLocation: z.string().max(500).optional(),
  preferredLoanTerm: z.union([z.literal(15), z.literal(20), z.literal(30)]).optional(),
  loanType: z.enum(["fixed", "5/1_arm", "7/1_arm"]).optional(),
  militaryVeteran: z.boolean().optional(),
  firstTimeBuyer: z.boolean().optional(),
  householdSize: z.number().int().min(1).max(20).optional(),
  monthlyExpenses: z.number().min(0).max(500_000).optional(),
  currentMonthlyRent: z.number().min(0).max(100_000).optional(),
  property: z
    .object({
      source: z.string(),
      sourceUrl: z.string().optional(),
      address: z.string().optional(),
      listingPrice: z.number().min(0),
      propertyTaxAnnual: z.number().min(0).optional(),
      hoaMonthly: z.number().min(0).optional(),
      squareFootage: z.number().min(0).optional(),
      bedrooms: z.number().min(0).optional(),
      bathrooms: z.number().min(0).optional(),
      yearBuilt: z.number().min(1800).max(2030).optional(),
      propertyType: z.string().optional(),
    })
    .optional(),
  investmentInputs: z
    .object({
      expectedRent: z.number().min(0).optional(),
      vacancyRate: z.number().min(0).max(1).optional(),
      managementFeeRate: z.number().min(0).max(1).optional(),
      maintenanceRate: z.number().min(0).max(1).optional(),
      appreciationRate: z.number().min(-0.5).max(0.5).optional(),
      holdingPeriodYears: z.number().min(1).max(50).optional(),
    })
    .optional(),
});

// ── /api/chat ────────────────────────────────────────────────

export const chatInputSchema = z.object({
  message: z.string().min(1).max(5000),
  report: z.record(z.string(), z.unknown()), // FinalReport is complex, validate top-level shape
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  conversationSummary: z.string().nullable().optional(),
  sessionMemory: z.record(z.string(), z.unknown()).nullable().optional(),
});

// ── /api/feedback ────────────────────────────────────────────

export const feedbackInputSchema = z.object({
  type: z.enum(["chat", "report"]),
  rating: z.enum(["up", "down"]),
  messageIndex: z.number().int().min(0).optional(),
  comment: z.string().max(2000).optional(),
  traceId: z.string().optional(),
  timestamp: z.string().optional(),
});

// ── /api/extract-property ────────────────────────────────────

export const extractPropertyInputSchema = z.object({
  url: z.string().url().max(2000),
});

// ── /api/extract-document ────────────────────────────────────

export const extractDocumentInputSchema = z.object({
  documents: z
    .array(
      z.object({
        data: z.string().min(1),
        mediaType: z.string(),
        filename: z.string(),
      }),
    )
    .min(1)
    .max(5),
});
