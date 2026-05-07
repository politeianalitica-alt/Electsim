// apps/web/lib/types/risk_rich.ts
export type RiskDomain = "legislative" | "media" | "actors" | "coalition" | "economic" | "geopolitical" | "territorial" | "system";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskTrend = "rising" | "stable" | "falling";
export type RiskVelocity = "surging" | "fast" | "moderate" | "slow";
export type TimeHorizon = "24h" | "7d" | "30d" | "90d";
export type IndicatorStatus = "green" | "yellow" | "red" | "grey";
export type DataMode = "real" | "demo" | "fallback" | "error";

export interface RiskEvidence {
  source: string;
  excerpt: string;
  date: string;
  confidence: number;
}

export interface RiskDriver {
  label: string;
  contribution: number;
  trend: RiskTrend;
  description: string;
}

export interface RiskDimension {
  domain: RiskDomain;
  label: string;
  score: number;
  weight: number;
  trend: RiskTrend;
  velocity: RiskVelocity;
  severity: RiskSeverity;
  drivers: RiskDriver[];
  evidence: RiskEvidence[];
  mode: DataMode;
}

export interface RiskSignal {
  signal_id: string;
  title: string;
  description: string;
  domain: RiskDomain;
  severity: RiskSeverity;
  probability: number;
  impact: number;
  velocity: RiskVelocity;
  time_horizon: TimeHorizon;
  evidence: RiskEvidence[];
  actors_involved: string[];
  created_at: string;
  mode: DataMode;
}

export interface CrisisSignal {
  crisis_id: string;
  title: string;
  description: string;
  severity: RiskSeverity;
  probability: number;
  domains_affected: RiskDomain[];
  time_to_impact: string;
  recommended_action: string;
  evidence_count: number;
}

export interface EarlyWarningIndicator {
  indicator_id: string;
  label: string;
  status: IndicatorStatus;
  value: number;
  threshold: number;
  domain: RiskDomain;
  description: string;
  trend: RiskTrend;
  last_updated: string;
}

export interface RiskScenario {
  scenario_id: string;
  title: string;
  description: string;
  probability: number;
  impact: number;
  time_horizon: TimeHorizon;
  risk_score: number;
  domains: RiskDomain[];
  triggers: string[];
  mitigations: string[];
}

export interface RiskTimelinePoint {
  date: string;
  score: number;
  event?: string;
  severity: RiskSeverity;
}

export interface RiskKpiItem {
  label: string;
  value: number;
  color: string;
  delta: number;
  trend: RiskTrend;
}

export interface RiskOverviewResponse {
  global_score: number;
  level: RiskSeverity;
  trend: RiskTrend;
  trend_delta: number;
  kpis: RiskKpiItem[];
  dimensions: RiskDimension[];
  crisis_signals: CrisisSignal[];
  top_signals: RiskSignal[];
  early_warnings: EarlyWarningIndicator[];
  spark: number[];
  mode: DataMode;
}

export interface RiskSignalsResponse {
  signals: RiskSignal[];
  total: number;
  domain?: string;
  severity?: string;
  mode: DataMode;
}

export interface RiskAnalysisRequest {
  question: string;
  context?: string;
  domain?: RiskDomain;
  time_horizon?: TimeHorizon;
}

export interface RiskAnalysisResponse {
  question: string;
  answer: string;
  global_score: number;
  key_risks: string[];
  recommendations: string[];
  model_used: string;
  mode: DataMode;
}
