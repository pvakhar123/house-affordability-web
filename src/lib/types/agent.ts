import type { AffordabilityResult, RentVsBuyReport } from "./affordability";
import type { MarketDataResult } from "./market-data";
import type { PropertyAnalysis } from "./property";
import type { RecommendationsResult } from "./recommendations";
import type { RiskReport } from "./risk-assessment";
import type { UserProfile } from "./user-profile";
import type { NeighborhoodInfo } from "../data/area-info";

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

export interface ReadinessActionItem {
  category: "dti" | "credit" | "down_payment" | "debt_health" | "emergency_fund";
  priority: "high" | "medium" | "low";
  action: string;
  impact: string;
}

export interface PreApprovalReadinessScore {
  overallScore: number;
  level: "not_ready" | "needs_work" | "ready" | "highly_prepared";
  components: {
    dtiScore: number;
    creditScore: number;
    downPaymentScore: number;
    debtHealthScore: number;
  };
  actionItems: ReadinessActionItem[];
}

export interface FinalReport {
  summary: string;
  affordability: AffordabilityResult;
  marketSnapshot: MarketDataResult;
  riskAssessment: RiskReport;
  recommendations: RecommendationsResult;
  propertyAnalysis?: PropertyAnalysis;
  rentVsBuy?: RentVsBuyReport;
  preApprovalReadiness?: PreApprovalReadinessScore;
  neighborhoodInfo?: NeighborhoodInfo;
  disclaimers: string[];
  generatedAt: string;
  traceId?: string;
}
