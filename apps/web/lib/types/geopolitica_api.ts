// apps/web/lib/types/geopolitica_api.ts
import type { DataMode } from "./status";

export interface GeoEventItem {
  event_id: string;
  country: string;
  country_iso3: string;
  event_date: string; // "YYYY-MM-DD"
  event_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  fatalities: number;
  impact: number; // 0-100
}

export interface CountryRiskItem {
  code: string; // ISO2
  iso3: string; // ISO3
  name: string;
  risk: number; // 0-100
  status: "war" | "tense" | "watch" | "stable";
  trend: "rising" | "stable" | "falling";
}

export interface PresenceItem {
  territory: string;
  status: string;
  level: "high" | "medium" | "low";
  category: string;
}

export interface GeoKpiItem {
  label: string;
  value: number;
  color: string;
}

export interface GeoOverview {
  kpis: GeoKpiItem[];
  events: GeoEventItem[];
  countries: CountryRiskItem[];
  presence: PresenceItem[];
  mode: DataMode;
}
