"""
Citation Manager — Bloque 9.

Genera citas verificables para chunks documentales en tres estilos:
  short    → BOE-A-2026-1234, art. 3
  internal → Documento X, p. 14, sección "Impacto regulatorio"
  academic → Boletín Oficial del Estado, BOE-A-2026-1234, p. 14.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from etl.sources.documents.schemas import (
        DocumentChunk, SourceDocument, EvidenceCitation,
    )

logger = logging.getLogger(__name__)


def build_citation_for_chunk(
    chunk: "DocumentChunk",
    document: "SourceDocument",
    style: str = "short",
) -> "EvidenceCitation":
    """
    Construye una EvidenceCitation para un chunk específico.

    Args:
        chunk: El chunk del que extraer la cita.
        document: El documento fuente.
        style: Estilo de cita ('short', 'internal', 'academic').
    """
    from etl.sources.documents.schemas import EvidenceCitation

    quote = quote_from_chunk(chunk)
    source_label = _build_source_label(document, style)
    title = document.title or document.file_name or document.document_id

    return EvidenceCitation(
        document_id=document.document_id,
        chunk_id=chunk.chunk_id,
        source_label=source_label,
        title=title,
        source_url=document.source_url,
        page_number=chunk.page_start,
        section_title=chunk.section_title,
        quote=quote,
        citation_style=style,
        created_at=datetime.now(timezone.utc),
    )


def build_citation_text(
    citation: "EvidenceCitation",
    style: str | None = None,
) -> str:
    """
    Genera el texto de la cita en el estilo especificado.

    Args:
        citation: La EvidenceCitation.
        style: Override del estilo ('short', 'internal', 'academic').
              Si None, usa citation.citation_style.

    Returns:
        Texto de la cita formateado.
    """
    effective_style = style or citation.citation_style

    if effective_style == "short":
        return _format_short(citation)
    elif effective_style == "academic":
        return _format_academic(citation)
    else:  # internal
        return _format_internal(citation)


def quote_from_chunk(chunk: "DocumentChunk", max_chars: int = 400) -> str:
    """
    Extrae una cita representativa del chunk.
    Devuelve las primeras N palabras completas hasta max_chars.
    """
    text = (chunk.text or "").strip()
    if not text:
        return ""

    if len(text) <= max_chars:
        return text

    # Cortar en el último espacio antes del límite
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")
    if last_space > max_chars // 2:
        truncated = truncated[:last_space]
    return truncated + "…"


def save_citation(
    citation: "EvidenceCitation",
    engine: Any = None,
) -> None:
    """Persiste una EvidenceCitation en la BD."""
    if engine is None:
        return

    try:
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO evidence_citations (
                    citation_id, document_id, chunk_id, table_id,
                    source_label, title, source_url,
                    page_number, section_title,
                    quote, citation_style
                ) VALUES (
                    :citation_id, :document_id, :chunk_id, :table_id,
                    :source_label, :title, :source_url,
                    :page_number, :section_title,
                    :quote, :citation_style
                )
                ON CONFLICT (citation_id) DO NOTHING
            """), {
                "citation_id": citation.citation_id,
                "document_id": citation.document_id,
                "chunk_id": citation.chunk_id,
                "table_id": citation.table_id,
                "source_label": citation.source_label,
                "title": citation.title,
                "source_url": citation.source_url,
                "page_number": citation.page_number,
                "section_title": citation.section_title,
                "quote": citation.quote,
                "citation_style": citation.citation_style,
            })
    except Exception as exc:
        logger.debug("save_citation: %s", exc)


def build_citations_for_chunks(
    chunks: list,
    document: "SourceDocument",
    style: str = "short",
    engine: Any = None,
) -> list["EvidenceCitation"]:
    """
    Construye y persiste citas para todos los chunks de un documento.

    Returns:
        Lista de EvidenceCitation generadas.
    """
    citations = []
    for chunk in chunks:
        try:
            citation = build_citation_for_chunk(chunk, document, style=style)
            citations.append(citation)
            save_citation(citation, engine=engine)
        except Exception as exc:
            logger.debug("build_citations_for_chunks: %s", exc)
    return citations


# ── Helpers de formato ─────────────────────────────────────────────────────────

def _build_source_label(document: "SourceDocument", style: str) -> str:
    """Construye la etiqueta de fuente según el tipo de documento."""
    source_type = document.source_type
    title = document.title or document.file_name or document.document_id

    _source_labels = {
        "boe": "BOE",
        "congreso": "Congreso de los Diputados",
        "senado": "Senado de España",
        "eurlex": "EUR-Lex",
        "media": document.source or "Medio",
        "tender": "Licitación Pública",
        "client_upload": "Documento de Cliente",
        "manifesto": "Programa Electoral",
        "economic_report": "Informe Económico",
        "internal_note": "Nota Interna",
        "other": document.source or "Fuente",
    }

    base = _source_labels.get(source_type, document.source or source_type)

    if style == "short":
        return base
    else:
        return f"{base}: {title[:100]}"


def _format_short(citation: "EvidenceCitation") -> str:
    """BOE-A-2026-1234, art. 3"""
    parts = [citation.source_label or citation.title or citation.document_id]
    if citation.section_title:
        parts.append(citation.section_title[:60])
    elif citation.page_number:
        parts.append(f"p. {citation.page_number}")
    return ", ".join(parts)


def _format_internal(citation: "EvidenceCitation") -> str:
    """Documento X, p. 14, sección "Impacto regulatorio" """
    parts = [citation.title or citation.source_label or citation.document_id]
    if citation.page_number:
        parts.append(f"p. {citation.page_number}")
    if citation.section_title:
        parts.append(f'sección "{citation.section_title[:60]}"')
    return ", ".join(parts)


def _format_academic(citation: "EvidenceCitation") -> str:
    """Boletín Oficial del Estado, BOE-A-2026-1234, p. 14."""
    parts = [citation.source_label or citation.title or citation.document_id]
    if citation.page_number:
        parts.append(f"p. {citation.page_number}")
    if citation.source_url:
        parts.append(f"[en línea: {citation.source_url[:80]}]")
    return ", ".join(parts) + "."
