// apps/web/lib/types/legislative.ts
import type { DataMode } from "./status";

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
