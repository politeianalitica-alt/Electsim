import type { DataMode } from "./status";

export type BriefingType =
  | "morning" | "client" | "legislative" | "crisis"
  | "media" | "geopolitical" | "sectorial";

export type BriefingAudience =
  | "consultor_politico" | "periodista" | "candidato"
  | "empresa_ibex" | "unidad_inteligencia" | "general";

export interface BriefingEvidence {
  id: string;
  title: string;
  source_id?: string | null;
  source_name?: string | null;
  url?: string | null;
  published_at?: string | null;
  excerpt?: string | null;
  confidence?: number | null;
  mode: DataMode;
}

export interface BriefingSection {
  id: string;
  type: string;
  title: string;
  body: string;
  bullets: string[];
  signals: string[];
  evidence: BriefingEvidence[];
  recommended_action?: string | null;
  target_route?: string | null;
  confidence?: number | null;
  mode: DataMode;
}

export interface BriefingRequest {
  briefing_type: BriefingType;
  audience: BriefingAudience;
  workspace_id?: string;
  client_id?: string | null;
  sector?: string | null;
  topic?: string | null;
  period?: string;
  force_refresh?: boolean;
  include_methodology?: boolean;
  include_evidence?: boolean;
  language?: "es" | "en";
}

export interface BriefingDocument {
  id: string;
  title: string;
  briefing_type: BriefingType;
  audience: BriefingAudience;
  workspace_id: string;
  client_id?: string | null;
  sector?: string | null;
  topic?: string | null;
  period: string;
  generated_at: string;
  mode: DataMode;
  model_used?: string | null;
  latency_ms?: number | null;
  executive_summary: string;
  sections: BriefingSection[];
  source_ids: string[];
  signal_ids: string[];
  warnings: string[];
  methodology_note?: string | null;
}

export interface BriefingListItem {
  id: string;
  title: string;
  briefing_type: BriefingType;
  audience: BriefingAudience;
  generated_at: string;
  mode: DataMode;
  workspace_id: string;
  client_id?: string | null;
  period: string;
  summary_preview: string;
}

export interface BriefingMarkdownResponse {
  mode: DataMode;
  briefing_id: string;
  markdown: string;
  filename: string;
}

export interface BriefingPdfResponse {
  mode: DataMode;
  briefing_id: string;
  format: "pdf" | "markdown";
  bytes_b64?: string;
  filename?: string;
  size?: number;
  markdown?: string;
  message?: string;
}

export interface BriefingsListResponse {
  mode: DataMode;
  items: BriefingListItem[];
  total: number;
}
