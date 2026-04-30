"""
DTOs del pipeline de ingesta y procesamiento.
Cada paso del pipeline transforma o enriquece estos objetos.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IngestionEvent(BaseModel):
    """Evento producido por un conector al obtener un item crudo de una fuente."""

    market_code: str
    source_id: str
    payload: Dict[str, Any]
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class NormalizedDocument(BaseModel):
    """Item normalizado al esquema comun tras extraccion de texto."""

    market_code: str
    source_id: str
    external_id: str          # id de la fuente (url, id BOE, etc.)
    url: Optional[str] = None
    title: Optional[str] = None
    raw_text: str = ""
    published_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EntityAnnotation(BaseModel):
    """Entidad extraida por NER, opcionalmente resuelta a un objeto de la ontologia."""

    text: str
    label: str             # PER | ORG | LOC | GPE | MISC
    start: int = 0
    end: int = 0
    score: float = 1.0
    resolved_object_id: Optional[str] = None  # UUID del ontology_object si se resuelve


class TopicAnnotation(BaseModel):
    label: str
    score: float


class SentimentAnnotation(BaseModel):
    target: str = "global"   # 'global' o nombre de entidad
    label: str               # 'positive' | 'negative' | 'neutral'
    score: float


class NLPAnnotations(BaseModel):
    """Todas las anotaciones NLP de un documento."""

    entities: List[EntityAnnotation] = Field(default_factory=list)
    topics: List[TopicAnnotation] = Field(default_factory=list)
    sentiment: List[SentimentAnnotation] = Field(default_factory=list)
    summary: Optional[str] = None


class VectorInfo(BaseModel):
    embedding: List[float]
    dim: int
    model_name: str


class ClusterInfo(BaseModel):
    cluster_id: Optional[int] = None
    cluster_label: Optional[str] = None
    is_new_cluster: bool = False


class AlertTriggered(BaseModel):
    client_id: int
    rule_type: str    # 'entity_watch' | 'topic_watch' | 'sentiment_spike' | 'fimi'
    description: str
    severity: str     # 'low' | 'medium' | 'high' | 'critical'


class PipelineResult(BaseModel):
    """Resultado completo del pipeline para un item."""

    normalized: NormalizedDocument
    nlp: NLPAnnotations
    vector: Optional[VectorInfo] = None
    cluster: Optional[ClusterInfo] = None
    alerts_triggered: List[AlertTriggered] = Field(default_factory=list)
    # UUID del ontology_object creado/actualizado
    ontology_object_id: Optional[str] = None
    # Estadisticas de ejecucion
    steps_completed: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
