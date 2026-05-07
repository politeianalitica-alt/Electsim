import type { DataMode } from "./status";

export type SourceDomain =
  | "electoral" | "legislative" | "media" | "economic"
  | "regulatory" | "geopolitical" | "osint" | "territorial"
  | "contracts" | "workspace" | "system";

export type SourceStatus = "active" | "degraded" | "down" | "unknown" | "disabled";
export type SourceIngestionMode = "api" | "rss" | "scraper" | "file" | "manual" | "database" | "pipeline";

export interface SourceDefinition {
  id: string;
  name: string;
  domain: SourceDomain;
  mode: SourceIngestionMode;
  description: string;
  url: string | null;
  owner: string | null;
  refresh_policy: string | null;
  enabled: boolean;
  tags: string[];
  legal_notes: string | null;
}

export interface SourceHealth {
  source_id: string;
  status: SourceStatus;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  latency_ms: number | null;
  records_last_run: number;
  records_24h: number;
  quality_score: number | null;
  freshness_score: number | null;
  coverage_score: number | null;
  mode: DataMode;
}

export interface SourceWithHealth {
  definition: SourceDefinition;
  health: SourceHealth;
}

export interface SourceHealthSummary {
  total: number;
  active: number;
  degraded: number;
  down: number;
  unknown: number;
  disabled: number;
}

export interface SourceCoverage {
  domain: SourceDomain;
  total: number;
  active: number;
  degraded: number;
  down: number;
  unknown: number;
  coverage_score?: number | null;
}

export interface IngestionRunRequest {
  source_id: string;
  dry_run: boolean;
  limit?: number | null;
  force?: boolean;
}

export interface IngestionRunResult {
  run_id: string;
  source_id: string;
  dry_run: boolean;
  status: "queued" | "running" | "success" | "warning" | "error" | "skipped";
  started_at: string;
  finished_at: string | null;
  records_seen: number;
  records_new: number;
  records_updated: number;
  records_failed: number;
  message: string;
  error: string | null;
  mode: DataMode;
}

// API response shapes
export interface SourcesCatalogResponse {
  mode: DataMode;
  sources: SourceDefinition[];
  total: number;
}

export interface SourcesHealthResponse {
  mode: DataMode;
  items: SourceWithHealth[];
  summary: SourceHealthSummary;
}

export interface SourcesCoverageResponse {
  mode: DataMode;
  domains: SourceCoverage[];
}

export interface SourcesRunsResponse {
  mode: DataMode;
  items: IngestionRunResult[];
  total: number;
}
