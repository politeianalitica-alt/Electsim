from __future__ import annotations
from pydantic import BaseModel


class GeoEventItem(BaseModel):
    event_id: str
    country: str
    country_iso3: str = ""
    event_date: str            # "YYYY-MM-DD"
    event_type: str
    severity: str              # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    description: str
    fatalities: int = 0
    impact: int = 0            # 0-100


class CountryRiskItem(BaseModel):
    code: str                  # ISO2 (e.g. "UA")
    iso3: str = ""             # ISO3 (e.g. "UKR")
    name: str
    risk: int                  # 0-100
    status: str                # "war" | "tense" | "watch" | "stable"
    trend: str = "stable"      # "rising" | "stable" | "falling"


class PresenceItem(BaseModel):
    territory: str
    status: str
    level: str                 # "high" | "medium" | "low"
    category: str = "diplomatic"


class GeoKpiItem(BaseModel):
    label: str
    value: int
    color: str


class GeoOverview(BaseModel):
    kpis: list[GeoKpiItem]
    events: list[GeoEventItem]
    countries: list[CountryRiskItem]
    presence: list[PresenceItem]
    mode: str                  # "real" | "fallback" | "demo"
