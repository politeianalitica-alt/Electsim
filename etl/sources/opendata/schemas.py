"""
Schemas — Bloque 10: Open Data & Institutional APIs Core.

Modelos Pydantic para el catálogo de datos abiertos:
  OpenDataPortal, OpenDataset, OpenDatasetResource,
  InstitutionalAPIEndpoint, DatasetIngestionPlan,
  DatasetProfile, DataLicenseAssessment,
  PortalHarvestResult, ResourceProfileResult.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── OpenDataPortal ─────────────────────────────────────────────────────────────

class OpenDataPortal(BaseModel):
    """Portal de datos abiertos registrado en el catálogo."""

    portal_id: str = Field(default_factory=_uuid)
    name: str

    administration_level: Literal[
        "eu", "national", "autonomous", "provincial",
        "municipal", "agency", "other",
    ] = "other"

    country: str = "ES"
    region: str | None = None
    municipality: str | None = None

    portal_type: Literal[
        "ckan", "socrata", "custom_api", "rss",
        "sparql", "bulk_files", "html_catalog", "unknown",
    ] = "unknown"

    base_url: str
    api_url: str | None = None

    language: str = "es"
    active: bool = True

    metadata: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── OpenDataset ────────────────────────────────────────────────────────────────

class OpenDataset(BaseModel):
    """Dataset catalogado de un portal de datos abiertos."""

    dataset_id: str = Field(default_factory=_uuid)
    portal_id: str

    title: str
    description: str | None = None

    themes: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)

    publisher: str | None = None
    organization: str | None = None

    license_id: str | None = None
    license_title: str | None = None
    license_url: str | None = None

    landing_page: str | None = None

    issued_at: datetime | None = None
    modified_at: datetime | None = None

    update_frequency: str | None = None
    spatial_coverage: list[str] = Field(default_factory=list)
    temporal_coverage: dict[str, Any] | None = None

    applicable_modules: list[str] = Field(default_factory=list)
    applicable_sectors: list[str] = Field(default_factory=list)
    applicable_markets: list[str] = Field(default_factory=list)

    quality_score: float | None = None
    usability_score: float | None = None

    raw_payload: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── OpenDatasetResource ────────────────────────────────────────────────────────

class OpenDatasetResource(BaseModel):
    """Recurso (fichero, endpoint, API) de un dataset."""

    resource_id: str = Field(default_factory=_uuid)
    dataset_id: str

    title: str | None = None
    description: str | None = None

    url: str
    format: str | None = None
    mime_type: str | None = None

    size_bytes: int | None = None
    checksum: str | None = None

    api_endpoint: str | None = None
    download_url: str | None = None

    last_modified: datetime | None = None

    is_machine_readable: bool = False
    is_geospatial: bool = False
    is_tabular: bool = False
    is_document: bool = False

    raw_payload: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── InstitutionalAPIEndpoint ───────────────────────────────────────────────────

class InstitutionalAPIEndpoint(BaseModel):
    """Endpoint de API institucional catalogado."""

    endpoint_id: str = Field(default_factory=_uuid)
    source_id: str

    name: str
    description: str | None = None

    method: Literal["GET", "POST"] = "GET"
    url_template: str

    protocol: Literal[
        "rest_json", "rest_xml", "sparql", "rss",
        "csv", "xlsx", "bulk", "html",
    ] = "rest_json"

    parameters_schema: dict[str, Any] = Field(default_factory=dict)
    response_schema: dict[str, Any] = Field(default_factory=dict)

    auth_required: bool = False
    api_key_env_var: str | None = None

    rate_limit_per_minute: int | None = None
    timeout_seconds: int = 30

    applicable_modules: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=_now)


# ── DatasetIngestionPlan ───────────────────────────────────────────────────────

class DatasetIngestionPlan(BaseModel):
    """Plan de ingesta recomendado para un dataset."""

    plan_id: str = Field(default_factory=_uuid)
    dataset_id: str
    resource_id: str | None = None

    target_domain: Literal[
        "legislative", "media", "economy", "electoral",
        "osint", "geospatial", "documents", "contracting",
        "regulatory", "other",
    ] = "other"

    target_table: str | None = None
    target_pipeline: str | None = None

    ingestion_mode: Literal["manual", "scheduled", "on_demand"] = "manual"

    transform_strategy: Literal[
        "raw_only", "tabular", "document", "geospatial",
        "api_adapter", "custom",
    ] = "raw_only"

    schedule_cron: str | None = None

    enabled: bool = False
    review_status: Literal["candidate", "approved", "rejected"] = "candidate"

    notes: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── DatasetProfile ─────────────────────────────────────────────────────────────

class DatasetProfile(BaseModel):
    """Perfil estadístico y semántico de un dataset."""

    dataset_id: str
    resource_id: str | None = None

    rows_count: int | None = None
    columns_count: int | None = None

    columns: list[dict[str, Any]] = Field(default_factory=list)
    detected_types: dict[str, str] = Field(default_factory=dict)

    null_ratio: dict[str, float] = Field(default_factory=dict)
    sample_rows: list[dict[str, Any]] = Field(default_factory=list)

    detected_geographies: list[str] = Field(default_factory=list)
    detected_dates: list[str] = Field(default_factory=list)

    detected_topics: list[str] = Field(default_factory=list)
    detected_sectors: list[str] = Field(default_factory=list)

    quality_warnings: list[str] = Field(default_factory=list)
    profiled_at: datetime = Field(default_factory=_now)


# ── DataLicenseAssessment ──────────────────────────────────────────────────────

class DataLicenseAssessment(BaseModel):
    """Evaluación de licencia de un dataset."""

    license_id: str | None = None
    license_title: str | None = None
    license_url: str | None = None

    commercial_use_allowed: bool | None = None
    attribution_required: bool | None = None
    redistribution_allowed: bool | None = None

    risk_level: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"] = "UNKNOWN"
    notes: str | None = None


# ── PortalHarvestResult ────────────────────────────────────────────────────────

class PortalHarvestResult(BaseModel):
    """Resultado de la cosecha de un portal."""

    portal_id: str
    datasets_found: int = 0
    datasets_new: int = 0
    datasets_updated: int = 0
    resources_found: int = 0
    errors: list[str] = Field(default_factory=list)
    harvested_at: datetime = Field(default_factory=_now)
    success: bool = False


# ── ResourceProfileResult ──────────────────────────────────────────────────────

class ResourceProfileResult(BaseModel):
    """Resultado del perfilado de un recurso."""

    resource_id: str
    profile: DatasetProfile | None = None
    license_assessment: DataLicenseAssessment | None = None
    ingestion_plan: DatasetIngestionPlan | None = None
    errors: list[str] = Field(default_factory=list)
    success: bool = False
