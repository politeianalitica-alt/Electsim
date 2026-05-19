"""Schemas Pydantic de analyst_memory."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


MemoryKind = Literal[
    "note",                # nota manual del analista
    "brain_query",         # pregunta del analista al copiloto
    "brain_response",      # respuesta del brain (con tool_trace)
    "investigation_event", # evento auditado en una investigación
    "artifact_snapshot",   # snapshot de un artifact (notebook, brief…)
    "workflow_output",     # output de un workflow ejecutado
    "external_doc",        # documento externo ingestado (BOE, PDF…)
]


class MemoryCreate(BaseModel):
    """Payload de creación de memoria."""
    user_id: str = Field(min_length=1, max_length=120)
    kind: MemoryKind = "note"
    title: str = ""
    content: str = Field(min_length=1, max_length=20000)
    content_summary: str = ""
    tags: list[str] = Field(default_factory=list)
    entity_refs: list[int] = Field(default_factory=list)
    investigation_id: int | None = None
    source: str = "manual"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    payload: dict[str, Any] = Field(default_factory=dict)


class MemoryEntry(BaseModel):
    """Memoria persistida."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: str
    kind: MemoryKind
    title: str
    content: str
    content_summary: str
    tags: list[str] = Field(default_factory=list)
    entity_refs: list[int] = Field(default_factory=list)
    investigation_id: int | None = None
    source: str
    confidence: float
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    last_accessed: datetime
    access_count: int = 0


class MemorySearchResult(BaseModel):
    """Resultado de búsqueda híbrida."""
    entry: MemoryEntry
    score: float = Field(ge=0.0, le=1.0)
    matched_via: list[Literal["trigram", "tags", "entity_refs", "recency", "investigation"]] = Field(default_factory=list)


class MemoryStats(BaseModel):
    """Stats agregadas para mostrar al analista."""
    user_id: str
    total_memories: int
    by_kind: dict[str, int]
    oldest: datetime | None = None
    newest: datetime | None = None
