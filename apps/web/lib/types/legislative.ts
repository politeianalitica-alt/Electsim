// apps/web/lib/types/legislative.ts
import type { DataMode } from "./status";

// ── Existing types (kept for compatibility) ──────────────────────────────────

export interface BoeItem {
  boe_no: string | null;
  title: string;
  section: string;
  department: string;
  date: string;
  url: string | null;
  type: string;
  relevance: string;
}

export interface BoeResponse {
  items: BoeItem[];
  date: string;
  mode: DataMode;
  total: number;
}

export interface Initiative {
  id: string;
  title: string;
  type: string;
  proponent: string;
  status: string;
  submitted_at: string | null;
  urgency: "low" | "medium" | "high";
}

export interface InitiativesResponse {
  items: Initiative[];
  mode: DataMode;
  total: number;
  active: number;
  critical: number;
}

export interface LegislativeKpis {
  active_initiatives: number;
  approved_this_month: number;
  critical_tramitation: number;
  upcoming_votes: number;
  mode: DataMode;
}

// ── New rich types ────────────────────────────────────────────────────────────

export type Jurisdiction = "congreso" | "senado" | "boe" | "ue" | "comunidad_autonoma";
export type InstitutionType = "camara_baja" | "camara_alta" | "gobierno" | "ue" | "ue_comision" | "ccaa";
export type ProcedureType =
  | "proyecto_ley" | "proposicion_ley" | "real_decreto_ley" | "real_decreto"
  | "orden_ministerial" | "proposicion_no_ley" | "mocion" | "interpelacion"
  | "pregunta_oral" | "pregunta_escrita" | "reglamento_ue" | "directiva_ue";
export type LegislativeStage =
  | "presentacion" | "comision" | "ponencia" | "pleno_debate" | "enmiendas"
  | "votacion" | "senado_revision" | "promulgacion" | "boe_publicacion" | "vigor";
export type UrgencyLevel = "critical" | "high" | "medium" | "low";
export type ImpactLevel = "alto" | "medio" | "bajo";
export type SectorCode =
  | "energia" | "banca" | "inmobiliario" | "tecnologia" | "salud" | "defensa"
  | "transporte" | "agroalimentario" | "turismo" | "telecomunicaciones" | "educacion" | "general";

export interface LegislativeEvidence {
  source: string;
  excerpt: string;
  date: string;
  url?: string | null;
}

export interface LegislativeEvent {
  date: string;
  description: string;
  institution: InstitutionType;
  stage: LegislativeStage;
  outcome?: string | null;
}

export interface SectorImpact {
  sector: SectorCode;
  sector_label: string;
  impact_level: ImpactLevel;
  impact_score: number;
  summary: string;
  affected_companies: string[];
}

export interface ActorLegislativePosition {
  actor_id?: string | null;
  actor_name: string;
  party: string;
  party_color: string;
  position: "favor" | "contra" | "abstencion" | "neutro" | "pendiente";
  statement: string;
  date?: string | null;
}

export interface LegislativeItem {
  id: string;
  title: string;
  short_title: string;
  procedure_type: ProcedureType;
  procedure_label: string;
  jurisdiction: Jurisdiction;
  institution: InstitutionType;
  proponent: string;
  proponent_party: string;
  proponent_color: string;
  current_stage: LegislativeStage;
  stage_label: string;
  urgency: UrgencyLevel;
  submitted_at?: string | null;
  expected_vote?: string | null;
  last_activity?: string | null;
  impact_score: number;
  primary_sector: SectorCode;
  tags: string[];
  status: string;
  is_government: boolean;
  ue_origin: boolean;
  boe_url?: string | null;
}

export interface LegislativeItemDetail extends LegislativeItem {
  full_title: string;
  summary: string;
  objetivos: string[];
  timeline: LegislativeEvent[];
  sector_impacts: SectorImpact[];
  actor_positions: ActorLegislativePosition[];
  evidence: LegislativeEvidence[];
  related_ids: string[];
  analyst_note: string;
}

export interface CalendarItem {
  date: string;
  day_label: string;
  time?: string | null;
  title: string;
  institution: InstitutionType;
  event_type: "pleno" | "comision" | "ponencia" | "votacion" | "otro";
  event_type_label: string;
  commission?: string | null;
  related_item_id?: string | null;
}

export interface LegislativeHeatmapCell {
  sector: SectorCode;
  sector_label: string;
  urgency: UrgencyLevel;
  count: number;
  score: number;
}

export interface LegislativeOverviewResponse {
  kpis: LegislativeKpis;
  critical_items: LegislativeItem[];
  calendar_week: CalendarItem[];
  boe_today: BoeItem[];
  heatmap: LegislativeHeatmapCell[];
  mode: DataMode;
}

export interface LegislativeItemsResponse {
  items: LegislativeItem[];
  total: number;
  page: number;
  page_size: number;
  mode: DataMode;
}

export interface LegislativeAnalysisRequest {
  item_id?: string | null;
  query: string;
  context?: string | null;
  sector?: SectorCode | null;
}

export interface LegislativeAnalysisResponse {
  item_id?: string | null;
  query: string;
  answer: string;
  sector_impacts: SectorImpact[];
  key_actors: ActorLegislativePosition[];
  risk_level: UrgencyLevel;
  confidence: number;
  model_used: string;
  mode: DataMode;
}
