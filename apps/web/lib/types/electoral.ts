// apps/web/lib/types/electoral.ts
import type { DataMode } from "./status";

// Type aliases
export type ElectionType = "congreso" | "senado" | "europeas" | "autonomicas" | "municipales";
export type SeatTrend = "gaining" | "stable" | "losing";

export interface PartyProjection {
  code: string;
  name: string;
  seats: number;
  seats_low: number;
  seats_high: number;
  pct_vote: number;
  pct_vote_prev?: number | null;
  seat_trend: SeatTrend;
  color: string;
  ideology_score: number;
  is_governing: boolean;
  bloc?: string | null;
}

export interface CoalitionScenarioRich {
  id: string;
  name: string;
  members: string[];
  total_seats: number;
  majority_threshold: number;
  has_majority: boolean;
  probability: number;
  stability_score: number;
  ideological_distance: number;
  conflicts: string[];
  enablers: string[];
  scenario_type: string;
  seats_above_majority: number;
}

export interface KingmakerParty {
  code: string;
  name: string;
  seats: number;
  color: string;
  coalition_appearances: number;
  leverage_score: number;
  key_demands: string[];
  compatible_blocs: string[];
}

export interface VotingRecord {
  id: string;
  topic: string;
  date?: string | null;
  votes: Record<string, string>;  // party_code -> "S" | "N" | "A"
  result?: string | null;
  category?: string | null;
}

export interface HemicycleSeat {
  idx: number;
  ring: number;
  position: number;
  party_code: string;
  color: string;
  x: number;
  y: number;
}

export interface ElectoralKpiItem {
  label: string;
  value: number | string;
  unit?: string | null;
  color?: string | null;
  trend?: string | null;
}

export interface ElectoralOverviewResponse {
  parties: PartyProjection[];
  coalitions: CoalitionScenarioRich[];
  kingmakers: KingmakerParty[];
  voting_records: VotingRecord[];
  kpis: ElectoralKpiItem[];
  total_seats: number;
  majority_threshold: number;
  election_date?: string | null;
  election_type: ElectionType;
  governing_parties: string[];
  mode: DataMode;
}

export interface SwingSimInput {
  party_code: string;
  delta_pct: number;
}

export interface SwingSimulateRequest {
  swings: SwingSimInput[];
  base_parties?: PartyProjection[] | null;
}

export interface SwingSimResult {
  parties: PartyProjection[];
  seat_changes: Record<string, number>;
  coalition_impact: string[];
}

export interface ElectoralBriefingRequest {
  focus: string;
  workspace_id?: string | null;
  extra_context?: string | null;
}

export interface ElectoralBriefingResponse {
  briefing: string;
  key_points: string[];
  risk_indicators: string[];
  mode: DataMode;
}
