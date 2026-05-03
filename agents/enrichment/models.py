"""
Modelos de datos para Bloque 3 — Enriquecimiento y grafo.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Tipos de relacion en el grafo
# ---------------------------------------------------------------------------

class RelationType(str, Enum):
    ALIANZA        = "ALIANZA"
    CONFLICTO      = "CONFLICTO"
    SUBORDINACION  = "SUBORDINACION"
    COALICION      = "COALICION"
    ACUSACION      = "ACUSACION"
    NEGOCIACION    = "NEGOCIACION"
    COAUTORIA      = "COAUTORIA"
    NEUTRAL        = "NEUTRAL"


# ---------------------------------------------------------------------------
# Perfil de entidad enriquecida
# ---------------------------------------------------------------------------

@dataclass
class EntityProfile:
    """Perfil completo de una entidad canonical tras enriquecimiento."""
    qid:            str
    nombre_oficial: str
    tipo:           str
    cargo_actual:   Optional[str] = None

    # Menciones recientes
    mention_count_24h:  int   = 0
    mention_count_7d:   int   = 0
    avg_sentiment_24h:  float = 0.0
    avg_sentiment_7d:   float = 0.0
    tone_primary:       str   = "neutral"

    # Contextos mas frecuentes (keywords)
    top_keywords:       list[str] = field(default_factory=list)

    # Co-entidades mas frecuentes
    top_co_entities:    list[str] = field(default_factory=list)  # lista de QIDs

    # Perfil narrativo generado por Ollama
    perfil_narrativo:   str = ""

    # Anomalias detectadas
    is_anomaly:         bool  = False
    anomaly_score:      float = 0.0
    anomaly_reason:     str   = ""

    # Timestamp del ultimo enriquecimiento
    enriched_at:        Optional[datetime] = None


# ---------------------------------------------------------------------------
# Arista del grafo
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GraphEdge:
    """Relacion entre dos entidades en el grafo Neo4j."""
    source_qid:     str
    target_qid:     str
    relation_type:  RelationType
    article_url:    str
    published_at:   Optional[datetime] = None
    sentiment:      float = 0.0
    context:        str = ""       # oracion que genera la relacion
    weight:         float = 1.0    # peso acumulado en MERGE


# ---------------------------------------------------------------------------
# Alerta de anomalia
# ---------------------------------------------------------------------------

@dataclass
class AnomalyAlert:
    """Alerta generada por el detector de anomalias."""
    qid:            str
    nombre_oficial: str
    alert_type:     str   # 'spike_menciones' | 'cambio_tono' | 'nueva_relacion'
    z_score:        float
    value_current:  float
    value_baseline: float
    hypothesis:     str   # generada por Ollama
    generated_at:   datetime = field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Briefing de cliente
# ---------------------------------------------------------------------------

@dataclass
class ClientBriefing:
    """Briefing en markdown generado para un cliente o tema."""
    briefing_id:    str     # UUID o slug
    titulo:         str
    entidades_qids: list[str]
    periodo:        str     # '24h' | '7d' | 'custom'
    contenido_md:   str     # markdown completo
    resumen_ejecutivo: str  # 2-3 lineas para email
    alertas_incluidas: list[str] = field(default_factory=list)
    generated_at:   datetime = field(default_factory=datetime.utcnow)
