"""
Modelos Pydantic de output para la Intelligence Layer.

Cada servicio produce uno de estos objetos:
  BriefingEngine    -> MorningBriefing
  RiskScorer        -> RiskScore
  NarrativeTracker  -> NarrativeLabel
  ImpactAssessor    -> ImpactAssessment

Todos los objetos se persisten como ontology_object de tipo 'analysis_result'
y se relacionan con el cliente y los objetos fuente a traves del grafo.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Briefing
# ---------------------------------------------------------------------------

class BriefingSection(BaseModel):
    """Seccion de un briefing con titulo y cuerpo en markdown."""
    title: str
    body_markdown: str


class MorningBriefing(BaseModel):
    """
    Briefing matutino de inteligencia politica para un cliente.

    Generado diariamente a las 06:30 UTC por el BriefingEngine.
    """
    client_id: str
    date: str                               # YYYY-MM-DD
    key_changes: List[str] = Field(default_factory=list)
    sections: List[BriefingSection] = Field(default_factory=list)
    risk_delta: Optional[float] = None      # cambio en risk_index vs dia anterior
    executive_summary: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        import re
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError(f"date debe ser YYYY-MM-DD, recibido: {v!r}")
        return v

    @field_validator("risk_delta")
    @classmethod
    def clamp_risk_delta(cls, v: float | None) -> float | None:
        if v is not None:
            return max(-100.0, min(100.0, v))
        return v


# ---------------------------------------------------------------------------
# Risk Score
# ---------------------------------------------------------------------------

class RiskScore(BaseModel):
    """
    Score de riesgo politico para un cliente en un momento dado.

    risk_index: 0-100 (0 = sin riesgo, 100 = riesgo maximo).
    components: desagregacion por dimension.
    """
    client_id: str
    risk_index: float                       # 0 - 100
    components: Dict[str, float] = Field(default_factory=dict)
    narrative: Optional[str] = None         # explicacion breve del score
    computed_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("risk_index")
    @classmethod
    def clamp_risk_index(cls, v: float) -> float:
        return max(0.0, min(100.0, v))

    @field_validator("components")
    @classmethod
    def clamp_components(cls, v: Dict[str, float]) -> Dict[str, float]:
        return {k: max(0.0, min(1.0, val)) for k, val in v.items()}

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "client_id": "cliente-001",
            "risk_index": 42.5,
            "components": {
                "coalition_stability": 0.6,
                "media_sentiment": 0.3,
                "legislative_activity": 0.5,
                "ideological_distance": 0.4,
            },
            "narrative": "Riesgo moderado por tension en la coalicion de gobierno.",
        }
    })


# ---------------------------------------------------------------------------
# Narrative Label
# ---------------------------------------------------------------------------

class NarrativeLabel(BaseModel):
    """
    Etiqueta semantica asignada por IA a un cluster de narrativas.

    threat_level: "ruido" | "emergente" | "crisis"
    """
    cluster_id: str
    label: str                              # nombre corto de la narrativa
    description: str
    threat_level: str = "ruido"             # ruido | emergente | crisis
    supporting_examples: List[str] = Field(default_factory=list)
    entity_mentions: List[str] = Field(default_factory=list)
    labeled_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("threat_level")
    @classmethod
    def validate_threat(cls, v: str) -> str:
        allowed = {"ruido", "emergente", "crisis"}
        if v not in allowed:
            raise ValueError(f"threat_level debe ser uno de {allowed}, recibido: {v!r}")
        return v


# ---------------------------------------------------------------------------
# Impact Assessment
# ---------------------------------------------------------------------------

class ImpactAssessment(BaseModel):
    """
    Evaluacion de impacto de un objeto (norma, evento, narrativa) sobre un cliente.

    impact_score: 0.0 - 1.0 (1 = impacto maximo).
    impact_dimension: desagregacion por tipo de impacto.
    """
    client_id: str
    object_type: str                        # e.g. 'legislation', 'narrative', 'event'
    object_id: str                          # UUID o ID del objeto evaluado
    impact_score: float                     # 0.0 - 1.0
    impact_dimension: Dict[str, float] = Field(default_factory=dict)
    rationale_markdown: str = ""
    assessed_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("impact_score")
    @classmethod
    def clamp_impact(cls, v: float) -> float:
        return max(0.0, min(1.0, v))

    @field_validator("impact_dimension")
    @classmethod
    def clamp_dimensions(cls, v: Dict[str, float]) -> Dict[str, float]:
        return {k: max(0.0, min(1.0, val)) for k, val in v.items()}

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "client_id": "cliente-001",
            "object_type": "legislation",
            "object_id": "BOE-A-2026-001",
            "impact_score": 0.75,
            "impact_dimension": {
                "regulatory": 0.8,
                "media": 0.4,
                "financial": 0.6,
                "reputational": 0.3,
            },
            "rationale_markdown": "La norma afecta directamente al sector energetico...",
        }
    })


# ---------------------------------------------------------------------------
# Evento para el event bus (Redis Streams)
# ---------------------------------------------------------------------------

class IntelligenceEvent(BaseModel):
    """
    Evento que el ETL publica en el stream Redis para la Intelligence Layer.
    """
    market_code: str
    object_type: str          # 'legislation' | 'article' | 'narrative_cluster' | 'alert'
    ontology_object_id: str   # UUID del objeto en el grafo
    event_type: str           # 'new_cluster' | 'new_norm' | 'critical_alert' | 'sentiment_spike'
    source_id: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)
    published_at: datetime = Field(default_factory=datetime.utcnow)
