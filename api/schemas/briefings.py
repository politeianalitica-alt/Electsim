"""
Briefing schemas for Sprint 3.
Reutiliza DataMode/ModeMeta de Sprint 1 en api/schemas/status.py.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

from api.schemas.status import DataMode, ModeMeta

BriefingType = Literal[
    "morning", "client", "legislative", "crisis", "media", "geopolitical", "sectorial",
]

BriefingAudience = Literal[
    "consultor_politico", "periodista", "candidato",
    "empresa_ibex", "unidad_inteligencia", "general",
]


class BriefingEvidence(BaseModel):
    id: str
    title: str
    source_id: str | None = None
    source_name: str | None = None
    url: str | None = None
    published_at: datetime | None = None
    excerpt: str | None = None
    confidence: float | None = None
    mode: DataMode = "real"


class BriefingSection(BaseModel):
    id: str
    type: str
    title: str
    body: str
    bullets: list[str] = Field(default_factory=list)
    signals: list[str] = Field(default_factory=list)
    evidence: list[BriefingEvidence] = Field(default_factory=list)
    recommended_action: str | None = None
    target_route: str | None = None
    confidence: float | None = None
    mode: DataMode = "real"


class BriefingRequest(BaseModel):
    briefing_type: BriefingType = "morning"
    audience: BriefingAudience = "general"
    workspace_id: str = "default"
    client_id: str | None = None
    sector: str | None = None
    topic: str | None = None
    period: str = "24h"
    force_refresh: bool = False
    include_methodology: bool = True
    include_evidence: bool = True
    language: Literal["es", "en"] = "es"


class BriefingDocument(BaseModel):
    id: str
    title: str
    briefing_type: BriefingType
    audience: BriefingAudience
    workspace_id: str = "default"
    client_id: str | None = None
    sector: str | None = None
    topic: str | None = None
    period: str = "24h"
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    mode: DataMode = "real"
    model_used: str | None = None
    latency_ms: int | None = None
    executive_summary: str
    sections: list[BriefingSection] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    signal_ids: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    methodology_note: str | None = None


class BriefingListItem(BaseModel):
    id: str
    title: str
    briefing_type: BriefingType
    audience: BriefingAudience
    generated_at: datetime
    mode: DataMode
    workspace_id: str
    client_id: str | None = None
    period: str = "24h"
    summary_preview: str
