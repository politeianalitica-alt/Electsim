"""
Pydantic schemas for Analysis Hub (Sprint 2).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

from api.schemas.status import DataMode, ModeMeta

SignalSeverity = Literal["low", "medium", "high", "critical"]
SignalTrend = Literal["up", "down", "stable", "new"]
SignalDomain = Literal[
    "electoral", "legislative", "media", "economic",
    "risk", "geopolitical", "actors", "workspace", "system",
]


class AnalysisSignal(BaseModel):
    id: str
    title: str
    summary: str
    domain: SignalDomain
    severity: SignalSeverity
    trend: SignalTrend
    score: float | None = None
    confidence: float | None = None
    source_ids: list[str] = Field(default_factory=list)
    evidence_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    recommended_action: str | None = None
    target_route: str | None = None
    mode: DataMode = "real"


class AnalysisHubResponse(BaseModel):
    mode: DataMode
    meta: ModeMeta
    generated_at: datetime
    period: str
    executive_summary: str
    top_signals: list[AnalysisSignal]
    changed_24h: list[AnalysisSignal]
    risks: list[AnalysisSignal]
    opportunities: list[AnalysisSignal]
    source_health_summary: dict[str, Any]
    recommended_next_actions: list[str]
