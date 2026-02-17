import type { AffordabilityResult, RentVsBuyReport } from "./affordability";
import type { MarketDataResult } from "./market-data";
import type { PropertyAnalysis } from "./property";
import type { RecommendationsResult } from "./recommendations";
import type { RiskReport } from "./risk-assessment";
import type { UserProfile } from "./user-profile";

export interface OrchestratorState {
  userProfile: UserProfile;
  marketData?: MarketDataResult;
  affordability?: AffordabilityResult;
  riskReport?: RiskReport;
  recommendations?: RecommendationsResult;
  errors: AgentError[];
  executionLog: ExecutionLogEntry[];
}

export interface AgentError {
  agent: string;
  error: string;
  timestamp: string;
  recoverable: boolean;
}

export interface ExecutionLogEntry {
  agent: string;
  action: string;
  durationMs: number;
  timestamp: string;
}

export interface FinalReport {
  summary: string;
  affordability: AffordabilityResult;
  marketSnapshot: MarketDataResult;
  riskAssessment: RiskReport;
  recommendations: RecommendationsResult;
  propertyAnalysis?: PropertyAnalysis;
  rentVsBuy?: RentVsBuyReport;
  disclaimers: string[];
  generatedAt: string;
}
