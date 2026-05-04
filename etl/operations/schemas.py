"""
Data Operations Schemas — Bloque 8.

Modelos Pydantic para el sistema operativo de ElectSim.
Todos los modelos son inmutables (model_config frozen=False para actualización).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


# ── Source ─────────────────────────────────────────────────────────────────────

class SourceDefinition(BaseModel):
    """Definición de una fuente de datos externa."""
    source_id: str
    name: str
    domain: Literal[
        "legislative",
        "media",
        "economy",
        "electoral",
        "osint",
        "geospatial",
        "documents",
        "campaign",
        "system",
    ]
    source_type: Literal[
        "api",
        "rss",
        "scraper",
        "file",
        "database",
        "manual",
        "mcp",
        "llm",
    ]

    base_url: str | None = None
    owner: str | None = None

    refresh_interval_minutes: int | None = None
    expected_latency_minutes: int | None = None

    requires_credentials: bool = False
    robots_policy: str | None = None

    active: bool = True
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] = "LOW"

    metadata: dict[str, Any] = Field(default_factory=dict)


# ── Pipeline ───────────────────────────────────────────────────────────────────

class PipelineDefinition(BaseModel):
    """Definición de un pipeline ETL."""
    pipeline_id: str
    name: str
    domain: str

    entrypoint: str
    schedule: str | None = None

    sources: list[str] = Field(default_factory=list)
    output_tables: list[str] = Field(default_factory=list)

    owner: str | None = None
    active: bool = True

    retry_policy: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── Pipeline Run ───────────────────────────────────────────────────────────────

class PipelineRun(BaseModel):
    """Registro de una ejecución de pipeline."""
    run_id: str
    pipeline_id: str
    source_id: str | None = None

    status: Literal["running", "success", "failed", "partial", "skipped"]
    started_at: datetime
    finished_at: datetime | None = None

    records_extracted: int = 0
    records_loaded: int = 0
    records_updated: int = 0
    records_duplicate: int = 0
    records_failed: int = 0

    duration_seconds: float | None = None
    error_message: str | None = None
    error_type: str | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)


# ── Data Quality ───────────────────────────────────────────────────────────────

class DataQualityCheck(BaseModel):
    """Definición de un check de calidad de datos."""
    check_id: str
    name: str
    table_name: str
    domain: str

    check_type: Literal[
        "not_null",
        "unique",
        "freshness",
        "range",
        "schema",
        "referential_integrity",
        "volume",
        "custom",
    ]

    severity: Literal["INFO", "WARNING", "CRITICAL"]
    query: str | None = None
    rule: dict[str, Any] = Field(default_factory=dict)

    active: bool = True


class DataQualityResult(BaseModel):
    """Resultado de un check de calidad."""
    check_id: str
    run_id: str | None = None

    status: Literal["passed", "warning", "failed", "skipped"]
    checked_at: datetime

    records_checked: int | None = None
    records_failed: int | None = None

    metric_value: float | None = None
    threshold: float | None = None

    details: dict[str, Any] = Field(default_factory=dict)


# ── Source Health ──────────────────────────────────────────────────────────────

class SourceHealth(BaseModel):
    """Estado de salud de una fuente."""
    source_id: str
    status: Literal["healthy", "degraded", "down", "unknown"]

    last_success_at: datetime | None = None
    last_failure_at: datetime | None = None

    freshness_lag_minutes: int | None = None
    consecutive_failures: int = 0

    avg_latency_ms: float | None = None
    last_error: str | None = None

    checked_at: datetime


# ── Raw Data Manifest ─────────────────────────────────────────────────────────

class RawDataManifest(BaseModel):
    """Registro de un archivo bruto ingestado."""
    manifest_id: str

    source_id: str
    run_id: str | None = None

    path: str
    file_format: str
    size_bytes: int
    checksum: str

    record_count: int | None = None
    extracted_at: datetime

    immutable: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── Data Lineage ───────────────────────────────────────────────────────────────

class DataLineage(BaseModel):
    """Relación de linaje entre dos objetos."""
    lineage_id: str

    source_object_type: str
    source_object_id: str

    target_object_type: str
    target_object_id: str

    transformation: str
    pipeline_id: str | None = None
    run_id: str | None = None

    confidence: float = 1.0
    created_at: datetime


# ── Backfill ──────────────────────────────────────────────────────────────────

class BackfillRequest(BaseModel):
    """Solicitud de backfill para una fuente o pipeline."""
    request_id: str
    pipeline_id: str | None = None
    source_id: str | None = None

    start_date: str          # ISO date string
    end_date: str            # ISO date string

    status: Literal["pending", "running", "success", "failed"] = "pending"
    created_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── Retry Policy ──────────────────────────────────────────────────────────────

class RetryPolicy(BaseModel):
    """Política de reintentos para un pipeline."""
    max_retries: int = 3
    backoff_seconds: int = 60
    backoff_multiplier: float = 2.0
    max_backoff_seconds: int = 3600
    retry_on: list[str] = Field(default_factory=lambda: ["failed"])
