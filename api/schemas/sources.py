"""
Pydantic schemas for Sources & Ingestion (Sprint 2).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

from api.schemas.status import DataMode

SourceDomain = Literal[
    "electoral", "legislative", "media", "economic",
    "regulatory", "geopolitical", "osint", "territorial",
    "contracts", "workspace", "system",
]

SourceStatus = Literal["active", "degraded", "down", "unknown", "disabled"]
SourceMode = Literal["api", "rss", "scraper", "file", "manual", "database", "pipeline"]


class SourceDefinition(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    name: str
    domain: SourceDomain
    mode: SourceMode
    description: str = ""
    url: str | None = None
    owner: str | None = None
    refresh_policy: str | None = None
    enabled: bool = True
    tags: list[str] = Field(default_factory=list)
    legal_notes: str | None = None


class SourceHealth(BaseModel):
    source_id: str
    status: SourceStatus
    last_success_at: datetime | None = None
    last_attempt_at: datetime | None = None
    last_error: str | None = None
    latency_ms: int | None = None
    records_last_run: int = 0
    records_24h: int = 0
    quality_score: float | None = None
    freshness_score: float | None = None
    coverage_score: float | None = None
    mode: DataMode = "real"


class SourceWithHealth(BaseModel):
    definition: SourceDefinition
    health: SourceHealth


class IngestionRunRequest(BaseModel):
    source_id: str
    dry_run: bool = True
    limit: int | None = 100
    force: bool = False


class IngestionRunResult(BaseModel):
    run_id: str
    source_id: str
    dry_run: bool
    status: Literal["queued", "running", "success", "warning", "error", "skipped"]
    started_at: datetime
    finished_at: datetime | None = None
    records_seen: int = 0
    records_new: int = 0
    records_updated: int = 0
    records_failed: int = 0
    message: str = ""
    error: str | None = None
    mode: DataMode = "real"
