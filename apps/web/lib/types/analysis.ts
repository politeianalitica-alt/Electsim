import type { DataMode, ModeMeta } from "./status";

export type SignalSeverity = "low" | "medium" | "high" | "critical";
export type SignalTrend = "up" | "down" | "stable" | "new";
export type SignalDomain =
  | "electoral" | "legislative" | "media" | "economic"
  | "risk" | "geopolitical" | "actors" | "workspace" | "system";

export interface AnalysisSignal {
  id: string;
  title: string;
  summary: string;
  domain: SignalDomain;
  severity: SignalSeverity;
  trend: SignalTrend;
  score: number | null;
  confidence: number | null;
  source_ids: string[];
  evidence_count: number;
  created_at: string;
  updated_at: string | null;
  recommended_action: string | null;
  target_route: string | null;
  mode: DataMode;
}

export interface AnalysisHubResponse {
  mode: DataMode;
  meta?: ModeMeta;
  generated_at: string;
  period: string;
  executive_summary: string;
  top_signals: AnalysisSignal[];
  changed_24h: AnalysisSignal[];
  risks: AnalysisSignal[];
  opportunities: AnalysisSignal[];
  source_health_summary: Record<string, unknown>;
  recommended_next_actions: string[];
}

export interface AnalysisSignalsResponse {
  mode: DataMode;
  items: AnalysisSignal[];
  total: number;
}
