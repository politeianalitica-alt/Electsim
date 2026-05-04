"""
Electoral Schemas — Bloque 6.

Modelos Pydantic para el módulo de Inteligencia Electoral y Campaña.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


# ── Election ──────────────────────────────────────────────────────────────────

class Election(BaseModel):
    """Metadatos de una elección."""

    source: str
    election_id: str

    country: str = "ES"
    election_type: Literal["general", "autonomica", "municipal", "europea"]
    election_date: date
    name: str

    geography: str | None = None
    legislature: str | None = None

    total_seats: int | None = None
    majority_threshold: int | None = None

    status: Literal["past", "upcoming", "active"] = "past"
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    def to_db_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "election_id": self.election_id,
            "country": self.country,
            "election_type": self.election_type,
            "election_date": self.election_date,
            "name": self.name,
            "geography": self.geography,
            "legislature": self.legislature,
            "total_seats": self.total_seats,
            "majority_threshold": self.majority_threshold,
            "status": self.status,
        }


# ── Party ─────────────────────────────────────────────────────────────────────

class Party(BaseModel):
    """Partido político."""

    party_id: str
    name: str
    siglas: str

    ideology_score: float | None = None   # -10 (izquierda) a +10 (derecha)
    family: str | None = None
    color: str | None = None

    aliases: list[str] = Field(default_factory=list)
    active: bool = True
    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── ElectionResult ────────────────────────────────────────────────────────────

class ElectionResult(BaseModel):
    """Resultado de un partido en una elección y geografía."""

    election_id: str
    geography_id: str
    geography_type: Literal["country", "ccaa", "province", "municipality", "district"]

    party_id: str
    votes: int | None = None
    vote_share: float | None = None   # porcentaje 0-100
    seats: int | None = None

    turnout: float | None = None      # porcentaje 0-100
    abstention: float | None = None   # porcentaje 0-100

    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validate_shares(self) -> "ElectionResult":
        if self.vote_share is not None and not (0 <= self.vote_share <= 100):
            self.vote_share = max(0.0, min(100.0, self.vote_share))
        return self


# ── Poll ──────────────────────────────────────────────────────────────────────

class Poll(BaseModel):
    """Encuesta electoral (metadatos)."""

    source: str
    poll_id: str

    pollster: str
    fieldwork_start: date | None = None
    fieldwork_end: date | None = None
    publication_date: date

    geography: str = "ES"
    sample_size: int | None = None
    methodology: str | None = None

    client: str | None = None
    raw_url: str | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @property
    def days_old(self) -> int:
        ref = self.fieldwork_end or self.publication_date
        return (date.today() - ref).days


# ── PollEstimate ──────────────────────────────────────────────────────────────

class PollEstimate(BaseModel):
    """Estimación de voto por partido en una encuesta."""

    poll_id: str
    party_id: str
    vote_share: float   # porcentaje 0-100

    lower_bound: float | None = None
    upper_bound: float | None = None
    seats_estimate: int | None = None

    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── PollQualityScore ──────────────────────────────────────────────────────────

class PollQualityScore(BaseModel):
    """Score de calidad de una encuesta (0-1)."""

    poll_id: str
    pollster: str

    recency_score: float = 0.0       # 40% peso en total
    sample_size_score: float = 0.0   # 25%
    transparency_score: float = 0.0  # 20%
    house_effect_score: float = 0.0  # 15%
    total_score: float = 0.0

    @model_validator(mode="after")
    def _compute_total(self) -> "PollQualityScore":
        self.total_score = round(
            0.40 * self.recency_score
            + 0.25 * self.sample_size_score
            + 0.20 * self.transparency_score
            + 0.15 * self.house_effect_score,
            4,
        )
        return self


# ── NowcastSnapshot ───────────────────────────────────────────────────────────

class NowcastSnapshot(BaseModel):
    """Snapshot del nowcasting electoral en un momento dado."""

    snapshot_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_name: str
    model_version: str = "1.0"
    geography: str = "ES"

    party_estimates: dict[str, float]   # {partido: % estimado}
    seat_estimates: dict[str, int] = Field(default_factory=dict)
    uncertainty: dict[str, dict[str, float]] = Field(default_factory=dict)

    leading_party: str | None = None
    majority_probability: dict[str, float] = Field(default_factory=dict)

    inputs_summary: dict[str, Any] = Field(default_factory=dict)
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _set_leading(self) -> "NowcastSnapshot":
        if self.party_estimates and not self.leading_party:
            self.leading_party = max(self.party_estimates, key=lambda k: self.party_estimates[k])
        return self


# ── CoalitionScenario ─────────────────────────────────────────────────────────

class CoalitionScenario(BaseModel):
    """Escenario de coalición calculado a partir de un snapshot."""

    snapshot_id: int | None = None
    name: str
    parties: list[str]

    seats_total: int = 0
    has_majority: bool = False
    majority_margin: int = 0

    ideological_compatibility: float = 0.0   # 0-1
    historical_plausibility: float = 0.0     # 0-1
    negotiation_complexity: float = 0.0      # 0-1 (1=muy complejo)
    probability: float = 0.0                 # 0-1

    scenario_type: Literal[
        "government", "blocking", "minority", "grand_coalition", "impossible"
    ] = "minority"

    explanation: str = ""


# ── VoterSegment ──────────────────────────────────────────────────────────────

class VoterSegment(BaseModel):
    """Segmento de votante con características y preferencias."""

    segment_id: str
    label: str

    ideology_mean: float | None = None     # -10 a +10
    age_group: str | None = None           # "18-34", "35-54", "55+"
    geography: str | None = None
    income_group: str | None = None
    education_group: str | None = None

    top_concerns: list[tuple[str, float]] = Field(default_factory=list)
    party_preference: dict[str, float] = Field(default_factory=dict)

    persuadability: float = 0.5            # 0-1 (1 = muy persuadible)
    turnout_probability: float = 0.7       # 0-1

    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── SoftVoteEstimate ──────────────────────────────────────────────────────────

class SoftVoteEstimate(BaseModel):
    """Estimación de voto blando (decidido vs. blando) por partido."""

    estimate_date: date
    party_id: str
    geography: str = "ES"

    decided_pct: float | None = None    # % votantes decididos
    soft_pct: float | None = None       # % votantes blandos (pueden cambiar)
    switchable_to: dict[str, float] = Field(default_factory=dict)

    source: str = "manual"
    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── PartyManifesto ────────────────────────────────────────────────────────────

class PartyManifesto(BaseModel):
    """Programa electoral de un partido."""

    manifesto_id: str
    party_id: str
    election_id: str | None = None

    title: str
    text: str = ""
    source_url: str | None = None

    topics: list[str] = Field(default_factory=list)
    policy_positions: dict[str, float] = Field(default_factory=dict)
    promises: list[str] = Field(default_factory=list)

    ideology_estimate: float | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── CampaignMessage ───────────────────────────────────────────────────────────

class CampaignMessage(BaseModel):
    """Mensaje de campaña electoral."""

    message_id: str
    party_id: str | None = None

    theme: str
    frame: str = ""
    target_segment: str | None = None
    target_geography: str | None = None

    text: str | None = None
    source: Literal["manual", "media", "manifesto", "llm", "campaign"] = "manual"

    expected_effect: dict[str, Any] = Field(default_factory=dict)
    risk_flags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── CampaignSimulation ────────────────────────────────────────────────────────

class CampaignSimulation(BaseModel):
    """Resultado de una simulación de campaña."""

    simulation_id: str
    message_id: str
    party_id: str
    geography: str | None = None

    week_of_campaign: int = 1
    saturation_count: int = 1

    expected_vote_shift: dict[str, float] = Field(default_factory=dict)
    expected_seat_shift: dict[str, int] = Field(default_factory=dict)

    affected_segments: list[str] = Field(default_factory=list)
    transfer_flows: list[dict[str, Any]] = Field(default_factory=list)
    confidence: float = 0.5
    narrative: str = ""

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── ElectoralAlert ────────────────────────────────────────────────────────────

ELECTORAL_ALERT_TYPES = [
    "electoral_poll_shift",
    "electoral_majority_change",
    "electoral_seat_tipping_point",
    "electoral_coalition_flip",
    "electoral_volatility_spike",
    "electoral_soft_vote_opportunity",
    "campaign_message_opportunity",
    "campaign_message_risk",
    "campaign_saturation_warning",
    "campaign_segment_shift",
]

class ElectoralAlert(BaseModel):
    """Alerta electoral generada por el módulo."""

    alert_type: str
    severity: Literal["INFO", "WARNING", "CRITICAL"] = "WARNING"
    title: str
    description: str
    datos: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Constantes ────────────────────────────────────────────────────────────────

TOTAL_ESCANOS_CONGRESO = 350
MAYORIA_ABSOLUTA = 176

# Partidos principales y sus colores oficiales
PARTY_COLORS: dict[str, str] = {
    "PP":        "#1E90FF",
    "PSOE":      "#FF3333",
    "VOX":       "#63BE21",
    "SUMAR":     "#A855F7",
    "JUNTS":     "#00C4B4",
    "ERC":       "#FFCC00",
    "PNV":       "#2B8A3E",
    "EH Bildu":  "#00B050",
    "CC":        "#FF8C00",
    "BNG":       "#0070C0",
    "CUP":       "#FFDD00",
    "NA+":       "#1E90FF",
}

# Scores ideológicos estimados (-10 izquierda, +10 derecha)
IDEOLOGY_SCORES: dict[str, float] = {
    "PP":        5.5,
    "PSOE":     -2.5,
    "VOX":       8.5,
    "SUMAR":    -6.5,
    "JUNTS":     2.0,
    "ERC":      -3.5,
    "PNV":       1.5,
    "EH Bildu": -5.0,
    "CC":        3.0,
    "BNG":      -5.5,
}

# Alias de partidos para normalización
PARTY_ALIASES: dict[str, str] = {
    "Partido Popular": "PP",
    "Partido Socialista Obrero Español": "PSOE",
    "PSOE-A": "PSOE",
    "PSC": "PSOE",
    "Vox": "VOX",
    "Sumar": "SUMAR",
    "Unidas Podemos": "SUMAR",
    "UP": "SUMAR",
    "IU": "SUMAR",
    "Junts per Catalunya": "JUNTS",
    "JxCat": "JUNTS",
    "Esquerra Republicana": "ERC",
    "Partido Nacionalista Vasco": "PNV",
    "EAJ-PNV": "PNV",
    "EH Bildu": "EH Bildu",
    "Coalición Canaria": "CC",
    "Bloque Nacionalista Galego": "BNG",
    "Candidatura d'Unitat Popular": "CUP",
}
