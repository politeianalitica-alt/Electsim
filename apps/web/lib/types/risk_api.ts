// apps/web/lib/types/risk_api.ts
import type { DataMode } from "./status";

export interface RiskKpiItem {
  label: string;
  value: number;
  color: string;
}

export interface RiskSignalItem {
  title: string;
  description: string;
  probability: number;
  impact: "Alto" | "Medio" | "Bajo";
}

export interface RiskOverview {
  global_score: number;
  level: string;
  kpis: RiskKpiItem[];
  signals: RiskSignalItem[];
  spark: number[];
  trend_delta: number;
  mode: DataMode;
}
