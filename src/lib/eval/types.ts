import type { FinalReport } from "@/lib/types";

// ── Golden Dataset ──────────────────────────────────────────

export interface GoldenTestCase {
  id: string;
  category: string;
  question: string;
  mustInclude: string[];
  mustNotInclude: string[];
  expectedPatterns: string[];
  expectedToolCalls?: string[];
}

export interface GoldenDataset {
  version: string;
  fixtureReport: FinalReport;
  testCases: GoldenTestCase[];
}

// ── LLM Judge ───────────────────────────────────────────────

export interface JudgeInput {
  question: string;
  response: string;
  reportContext: {
    maxHomePrice: number;
    recommendedPrice: number;
    monthlyPayment: number;
    frontEndDTI: number;
    backEndDTI: number;
    rate30yr: number;
    riskLevel: string;
    eligibleLoans: string;
  };
  toolsCalled?: string[];
}

export interface JudgeResult {
  accuracy: number;
  relevance: number;
  helpfulness: number;
  safety: number;
  overall: number;
  reasons: {
    accuracy: string;
    relevance: string;
    helpfulness: string;
    safety: string;
  };
}

export interface JudgeScoreEntry {
  id: string;
  timestamp: string;
  source: "realtime" | "batch";
  question: string;
  responsePreview: string;
  scores: JudgeResult;
  testCaseId?: string;
  evalRunId?: string;
}

// ── Eval Results ────────────────────────────────────────────

export interface PatternCheckResult {
  pattern: string;
  passed: boolean;
}

export interface EvalResult {
  evalRunId: string;
  timestamp: string;
  testCaseId: string;
  category: string;
  question: string;
  response: string;
  toolsCalled: string[];
  mustIncludeResults: PatternCheckResult[];
  mustNotIncludeResults: PatternCheckResult[];
  patternResults: PatternCheckResult[];
  toolCallResults: PatternCheckResult[];
  patternScore: number;
  judgeScores: JudgeResult;
  overallPass: boolean;
  durationMs: number;
}

export interface EvalRunSummary {
  evalRunId: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  avgPatternScore: number;
  avgJudgeScores: {
    accuracy: number;
    relevance: number;
    helpfulness: number;
    safety: number;
    overall: number;
  };
  durationMs: number;
}
