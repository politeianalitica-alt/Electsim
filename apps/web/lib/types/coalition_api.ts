// apps/web/lib/types/coalition_api.ts
import type { DataMode } from "./status";

export interface PartySeatItem {
  code: string;
  name: string;
  seats: number;
  color: string;
  pct_vote: number;
}

export interface CoalitionScenario {
  members: string[];
  total: number;
  majority: boolean;
  distance: number;
  probability: number;
  conflicts: string[];
}

export interface CoalitionOverview {
  parties: PartySeatItem[];
  coalitions: CoalitionScenario[];
  election_date: string | null;
  total_seats: number;
  majority_threshold: number;
  mode: DataMode;
}
