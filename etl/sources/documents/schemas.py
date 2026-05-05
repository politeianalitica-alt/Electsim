"""
Schemas — Bloque 9: Document Intelligence Core.

Modelos Pydantic para el sistema documental:
  SourceDocument, ParsedDocument, DocumentPage, DocumentChunk,
  ExtractedTable, EvidenceCitation, DraftReport,
  DocumentParseResult, DocumentSearchResult.
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


# ── SourceDocument ─────────────────────────────────────────────────────────────

class SourceDocument(BaseModel):
    """Documento fuente registrado en el sistema."""

    document_id: str = Field(default_factory=_uuid)

    title: str | None = None
    source: str
    source_type: Literal[
        "boe",
        "congreso",
        "senado",
        "eurlex",
        "media",
        "tender",
        "client_upload",
        "manifesto",
        "economic_report",
        "internal_note",
        "other",
    ]

    file_name: str | None = None
    file_path: str | None = None
    source_url: str | None = None

    mime_type: str | None = None
    file_hash: str = ""
    file_size_bytes: int | None = None

    language: str = "es"
    published_at: datetime | None = None
    fetched_at: datetime | None = Field(default_factory=_now)

    parser_used: str | None = None
    parse_status: Literal["pending", "parsed", "failed", "partial"] = "pending"

    tenant_id: str = "default"
    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── ParsedDocument ─────────────────────────────────────────────────────────────

class ParsedDocument(BaseModel):
    """Resultado del parsing de un documento."""

    document_id: str

    title: str | None = None
    markdown: str | None = None
    plain_text: str | None = None
    structured_json: dict[str, Any] = Field(default_factory=dict)

    page_count: int | None = None
    word_count: int | None = None
    table_count: int = 0

    parser_used: str = "unknown"
    parser_version: str | None = None

    quality_score: float | None = None
    warnings: list[str] = Field(default_factory=list)

    parsed_at: datetime = Field(default_factory=_now)


# ── DocumentPage ───────────────────────────────────────────────────────────────

class DocumentPage(BaseModel):
    """Página extraída de un documento."""

    document_id: str
    page_number: int

    text: str | None = None
    markdown: str | None = None

    bbox: dict[str, Any] | None = None
    images: list[dict[str, Any]] = Field(default_factory=list)
    tables: list[str] = Field(default_factory=list)

    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── DocumentChunk ──────────────────────────────────────────────────────────────

class DocumentChunk(BaseModel):
    """Fragmento citable de un documento."""

    chunk_id: str = Field(default_factory=_uuid)
    document_id: str

    chunk_index: int
    section_title: str | None = None
    page_start: int | None = None
    page_end: int | None = None

    text: str
    token_count: int | None = None

    object_type: str | None = None
    object_id: str | None = None

    topics: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    sectors: list[str] = Field(default_factory=list)

    embedding_id: str | None = None
    citation_ref: str | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)


# ── ExtractedTable ─────────────────────────────────────────────────────────────

class ExtractedTable(BaseModel):
    """Tabla extraída de un documento."""

    table_id: str = Field(default_factory=_uuid)
    document_id: str

    page_number: int | None = None
    table_index: int = 0

    title: str | None = None
    dataframe_json: dict[str, Any] = Field(default_factory=dict)
    markdown: str | None = None
    csv_path: str | None = None

    confidence: float | None = None
    extraction_method: str = "unknown"

    metadata: dict[str, Any] = Field(default_factory=dict)


# ── EvidenceCitation ───────────────────────────────────────────────────────────

class EvidenceCitation(BaseModel):
    """Cita de evidencia de un documento para briefings o informes."""

    citation_id: str = Field(default_factory=_uuid)

    document_id: str
    chunk_id: str | None = None
    table_id: str | None = None

    source_label: str = ""
    title: str = ""
    source_url: str | None = None

    page_number: int | None = None
    section_title: str | None = None

    quote: str
    citation_style: Literal["short", "academic", "internal"] = "short"

    created_at: datetime = Field(default_factory=_now)


# ── DraftReport ────────────────────────────────────────────────────────────────

class DraftReport(BaseModel):
    """Borrador de informe generado en ElectSim."""

    report_id: str = Field(default_factory=_uuid)
    title: str

    report_type: Literal[
        "daily_briefing",
        "client_report",
        "legislative_note",
        "media_analysis",
        "risk_profile",
        "electoral_report",
        "custom",
    ]

    client_id: str | None = None
    tenant_id: str = "default"

    status: Literal["draft", "review", "approved", "exported"] = "draft"

    sections: list[dict[str, Any]] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)
    source_objects: list[dict[str, Any]] = Field(default_factory=list)

    created_by: str | None = None
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── DocumentParseResult ────────────────────────────────────────────────────────

class DocumentParseResult(BaseModel):
    """Resultado completo del procesamiento de un documento."""

    document_id: str
    source_document: SourceDocument | None = None
    parsed_document: ParsedDocument | None = None
    pages: list[DocumentPage] = Field(default_factory=list)
    chunks: list[DocumentChunk] = Field(default_factory=list)
    tables: list[ExtractedTable] = Field(default_factory=list)
    citations: list[EvidenceCitation] = Field(default_factory=list)

    success: bool = False
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    processed_at: datetime = Field(default_factory=_now)


# ── DocumentSearchResult ───────────────────────────────────────────────────────

class DocumentSearchResult(BaseModel):
    """Resultado de búsqueda documental."""

    document_id: str
    title: str | None = None
    source: str = ""
    source_type: str = ""
    source_url: str | None = None

    chunk_id: str | None = None
    chunk_text: str | None = None
    page_number: int | None = None
    section_title: str | None = None

    score: float | None = None
    citation: EvidenceCitation | None = None
