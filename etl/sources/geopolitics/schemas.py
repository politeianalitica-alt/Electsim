"""
Geopolitics Schemas — Bloque 14.

Modelos Pydantic para el core geopolítico de ElectSim.
Todos los campos no críticos son opcionales para soportar
fuentes con datos incompletos (ACLED, GDELT, UCDP difieren).
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class GeoEvent(BaseModel):
    """Evento geopolítico normalizado de ACLED, GDELT o UCDP."""

    event_id: str
    source: str  # "acled", "gdelt", "ucdp", "manual"

    event_type: str
    event_subtype: str | None = None

    country: str
    country_iso3: str | None = None
    region: str | None = None
    location_name: str | None = None

    lat: float | None = None
    lon: float | None = None

    event_date: date
    actor_1: str | None = None
    actor_2: str | None = None

    fatalities: int | None = None
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "LOW"

    source_url: str | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("event_date", mode="before")
    @classmethod
    def parse_event_date(cls, v: Any) -> date:
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"):
                try:
                    return datetime.strptime(v[:10], fmt).date()
                except ValueError:
                    continue
        raise ValueError(f"No se puede parsear fecha: {v}")


class CountryRiskProfile(BaseModel):
    """Perfil de riesgo país calculado por geo_risk_scorer."""

    country_iso3: str
    country_name: str

    date: date

    conflict_risk: float = 0.0
    political_risk: float = 0.0
    economic_risk: float = 0.0
    energy_risk: float = 0.0
    migration_risk: float = 0.0
    defense_risk: float = 0.0
    reputation_risk: float = 0.0

    total_score: float = 0.0
    trend: Literal["rising", "stable", "falling"] = "stable"

    interest_for_spain: float = 0.0
    interest_for_eu: float = 0.0
    interest_for_nato: float = 0.0

    explanation: str = ""
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("total_score", "conflict_risk", "political_risk",
                     "economic_risk", "energy_risk", "migration_risk",
                     "defense_risk", "reputation_risk",
                     "interest_for_spain", "interest_for_eu", "interest_for_nato",
                     mode="before")
    @classmethod
    def clamp_score(cls, v: Any) -> float:
        try:
            return max(0.0, min(100.0, float(v)))
        except (TypeError, ValueError):
            return 0.0


class SpanishPresence(BaseModel):
    """Presencia española en un país (militar, energética, empresarial, etc.)."""

    presence_id: str
    country_iso3: str
    country_name: str

    category: Literal[
        "military", "energy", "business", "diplomatic",
        "diaspora", "development", "trade", "security",
    ]

    actor_name: str | None = None
    description: str = ""

    value: float | None = None
    unit: str | None = None

    source: str = ""
    source_url: str | None = None

    relevance_score: float = 0.5
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class GeoNarrativeSignal(BaseModel):
    """Señal narrativa geopolítica extraída de GDELT u otras fuentes."""

    signal_id: str

    country_iso3: str | None = None
    region: str | None = None

    topic: str = ""
    narrative_label: str = ""

    volume_24h: int = 0
    volume_7d: int = 0
    growth_rate: float = 0.0

    avg_tone: float | None = None
    dominant_sources: list[str] = Field(default_factory=list)

    domestic_relevance: float = 0.0
    affected_modules: list[str] = Field(default_factory=list)

    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "LOW"
    explanation: str = ""
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class DomesticImpact(BaseModel):
    """Impacto doméstico español derivado de un evento o señal geopolítica."""

    impact_id: str

    country_iso3: str | None = None
    event_id: str | None = None
    signal_id: str | None = None

    impact_domain: Literal[
        "energy", "defense", "migration", "trade", "inflation",
        "public_opinion", "party_politics", "security",
        "corporate_exposure", "diplomacy",
    ]

    affected_sector: str | None = None
    affected_actor: str | None = None
    affected_territory: str | None = None

    impact_score: float = 0.0
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "LOW"

    time_horizon: Literal["immediate", "short_term", "medium_term", "long_term"] = "short_term"

    explanation: str = ""
    recommended_action: str | None = None

    raw_payload: dict[str, Any] = Field(default_factory=dict)


class GeoAlert(BaseModel):
    """Alerta estratégica geopolítica."""

    alert_id: str

    alert_type: Literal[
        "conflict_escalation", "country_risk_spike", "spanish_exposure",
        "energy_security", "migration_pressure", "defense_mission_risk",
        "diplomatic_crisis", "corporate_exposure", "narrative_spike",
        "domestic_political_impact",
    ]

    country_iso3: str | None = None
    title: str = ""
    description: str = ""

    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"

    affected_modules: list[str] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class GeoBriefing(BaseModel):
    """Briefing geopolítico estructurado para un país o región."""

    briefing_id: str
    country_iso3: str | None = None
    region: str | None = None

    titulo: str = ""
    fecha: date = Field(default_factory=date.today)

    situacion: str = ""
    eventos_clave: list[str] = Field(default_factory=list)
    impacto_espana: str = ""
    riesgos: list[str] = Field(default_factory=list)
    escenarios: list[str] = Field(default_factory=list)
    recomendaciones: list[str] = Field(default_factory=list)
    fuentes: list[str] = Field(default_factory=list)

    raw_payload: dict[str, Any] = Field(default_factory=dict)


class GeoSourceHealth(BaseModel):
    """Estado de salud de una fuente geopolítica."""

    source_name: str
    available: bool = False
    last_fetch: datetime | None = None
    record_count: int = 0
    error: str | None = None
    api_key_required: bool = False
    api_key_present: bool = False
