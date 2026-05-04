"""
Schemas Pydantic del módulo OSINT / Risk Graph — Bloque 4.

Modelos:
  RiskEntity              Persona, empresa, organización o activo con perfil de riesgo
  RiskRelation            Relación entre dos RiskEntity
  RiskFlag                Alerta de riesgo asociada a una entidad
  SocialIdentityCandidate Candidato de identidad social no verificado
  EntityMatchCandidate    Resultado del resolver: posible duplicado
  RiskProfile             Vista consolidada de riesgo de una entidad
  GraphExport             Snapshot del grafo para visualización
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── RiskEntity ────────────────────────────────────────────────────────────────

class RiskEntity(BaseModel):
    """Entidad (persona, empresa, org, activo…) con perfil de riesgo."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    source: str                              # "opensanctions" | "spiderfoot_import" | "manual"
    source_id: str                           # id original en la fuente

    entity_type: Literal[
        "person", "company", "organization",
        "public_body", "political_party", "asset",
        "country", "unknown",
    ]

    name: str
    aliases: list[str] = Field(default_factory=list)
    countries: list[str] = Field(default_factory=list)       # ISO-3166-1 alpha-2
    identifiers: list[dict[str, Any]] = Field(default_factory=list)  # [{scheme, id}]

    birth_date: date | None = None
    incorporation_date: date | None = None

    pep_status: bool = False
    sanctions_status: bool = False
    risk_flags: list[str] = Field(default_factory=list)  # slugs de RiskFlag.flag_type

    risk_score: float = 0.0                  # [0, 100]
    confidence: float = 0.0                  # [0, 1]

    source_url: str | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    first_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"from_attributes": True}

    def to_db_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "source_id": self.source_id,
            "entity_type": self.entity_type,
            "name": self.name,
            "aliases": self.aliases or [],
            "countries": self.countries or [],
            "identifiers": self.identifiers,
            "birth_date": self.birth_date,
            "incorporation_date": self.incorporation_date,
            "pep_status": self.pep_status,
            "sanctions_status": self.sanctions_status,
            "risk_flags": self.risk_flags or [],
            "risk_score": self.risk_score,
            "confidence": self.confidence,
            "source_url": self.source_url,
            "raw_payload": self.raw_payload,
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
        }


# ── RiskRelation ──────────────────────────────────────────────────────────────

class RiskRelation(BaseModel):
    """Relación tipada entre dos RiskEntity."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    source: str
    source_id: str

    subject_entity_id: str    # RiskEntity.id o id de BD
    object_entity_id: str

    relation_type: str        # ver RELATION_TYPES abajo

    start_date: date | None = None
    end_date: date | None = None

    confidence: float = 0.0
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


# Relaciones soportadas (no exhaustivo, extensible)
RELATION_TYPES = {
    "PERSON_HELD_POSITION",
    "PERSON_MEMBER_OF_PARTY",
    "PERSON_DIRECTOR_OF_COMPANY",
    "COMPANY_OWNED_BY",
    "COMPANY_AWARDED_CONTRACT",
    "ENTITY_SANCTIONED_BY",
    "ENTITY_OPERATES_IN_COUNTRY",
    "ENTITY_MENTIONED_IN_MEDIA",
    "ENTITY_LINKED_TO_LEGAL_ITEM",
    "ENTITY_LINKED_TO_PARLIAMENTARY_INITIATIVE",
    "ENTITY_RELATED_TO_ENTITY",
    "ENTITY_HAS_RISK_FLAG",
    # FollowTheMoney nativo
    "DIRECTORSHIP",
    "OWNERSHIP",
    "MEMBERSHIP",
    "FAMILY",
    "ASSOCIATE",
    "SANCTION",
    "UNKNOWN",
}


# ── RiskFlag ──────────────────────────────────────────────────────────────────

class RiskFlag(BaseModel):
    """Señal de riesgo asociada a una entidad."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_id: str                            # RiskEntity.id o id de BD

    flag_type: Literal[
        "sanctioned",
        "pep",
        "adverse_media",
        "jurisdiction_risk",
        "contracting_risk",
        "conflict_of_interest",
        "ownership_opacity",
        "social_identity_unverified",
        "osint_candidate",
        "regulatory_exposure",
    ]

    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    description: str
    source: str
    evidence_url: str | None = None
    confidence: float = 0.0

    raw_payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"from_attributes": True}


# ── SocialIdentityCandidate ───────────────────────────────────────────────────

class SocialIdentityCandidate(BaseModel):
    """
    Candidato de identidad social NO verificado.

    ¡IMPORTANTE! Estos registros son candidatos de investigación, NO verdades.
    verified=False por defecto. Requiere revisión humana antes de uso en informes.
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    actor_id: str | None = None         # id de actor del dashboard (D2)
    entity_id: str | None = None        # id de RiskEntity (BD)

    platform: str                        # "twitter" | "linkedin" | "github" | …
    handle: str
    profile_url: str = ""

    discovery_method: Literal[
        "official_source",
        "website_parse",
        "maigret_candidate",
        "whatsmyname_candidate",
        "manual",
    ]

    confidence: float = 0.0
    verified: bool = False               # SIEMPRE False hasta revisión humana
    verified_by: str | None = None
    verified_at: datetime | None = None

    risk_notes: list[str] = Field(default_factory=list)
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"from_attributes": True}


# ── EntityMatchCandidate ──────────────────────────────────────────────────────

class EntityMatchCandidate(BaseModel):
    """Resultado del entity resolver: posible match entre dos entidades."""

    entity_a_id: str
    entity_b_id: str
    score: float                          # [0, 1]
    match_status: Literal[
        "AUTO_MATCH",          # score >= 0.90 y tipo compatible
        "CANDIDATE_MATCH",     # score 0.60–0.89
        "NEEDS_REVIEW",        # score 0.40–0.59 o ambigüedad
        "NO_MATCH",            # score < 0.40
    ]
    score_breakdown: dict[str, float] = Field(default_factory=dict)
    requires_human_review: bool = True


# ── RiskProfile ──────────────────────────────────────────────────────────────

class RiskProfile(BaseModel):
    """Vista consolidada de riesgo de una entidad para la UI."""

    entity: RiskEntity
    flags: list[RiskFlag] = Field(default_factory=list)
    relations: list[RiskRelation] = Field(default_factory=list)
    social_identities: list[SocialIdentityCandidate] = Field(default_factory=list)

    risk_score: float = 0.0
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "LOW"
    score_breakdown: dict[str, float] = Field(default_factory=dict)

    media_mentions: int = 0
    legal_mentions: int = 0

    @property
    def risk_level_label(self) -> str:
        if self.risk_score <= 20:
            return "LOW"
        if self.risk_score <= 45:
            return "MEDIUM"
        if self.risk_score <= 70:
            return "HIGH"
        return "CRITICAL"


# ── GraphExport ───────────────────────────────────────────────────────────────

class GraphExport(BaseModel):
    """Snapshot del grafo de entidades para visualización (Plotly/Pyvis)."""

    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)
