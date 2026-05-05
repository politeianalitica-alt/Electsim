"""
Evidence Store — Bloque 9.

Gestión de evidencias documentales para briefings, informes y alertas.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Caché en memoria
_EVIDENCE_CACHE: dict[str, Any] = {}  # citation_id → EvidenceCitation
_OBJECT_EVIDENCE: dict[str, list[str]] = {}  # f"{type}:{id}" → [citation_ids]


def create_evidence_from_chunk(
    chunk_id: str,
    reason: str = "",
    document_id: str | None = None,
    engine: Any = None,
) -> "EvidenceCitation | None":
    """
    Crea una EvidenceCitation a partir de un chunk existente.

    Args:
        chunk_id: ID del chunk (formato: {document_id}:chunk:{index}).
        reason: Motivo por el que se crea la evidencia.
        document_id: ID del documento (inferido del chunk_id si no se proporciona).
        engine: SQLAlchemy engine.
    """
    from etl.sources.documents.schemas import EvidenceCitation

    doc_id = document_id or chunk_id.split(":chunk:")[0] if ":chunk:" in chunk_id else chunk_id

    # Intentar recuperar chunk de BD
    chunk = _get_chunk(chunk_id, engine)
    document = _get_document(doc_id, engine)

    if chunk and document:
        try:
            from etl.sources.documents.citation_manager import build_citation_for_chunk
            citation = build_citation_for_chunk(chunk, document)
            _EVIDENCE_CACHE[citation.citation_id] = citation
            return citation
        except Exception as exc:
            logger.debug("create_evidence_from_chunk builder: %s", exc)

    # Fallback: crear cita básica
    from datetime import datetime, timezone
    citation = EvidenceCitation(
        document_id=doc_id,
        chunk_id=chunk_id,
        source_label=doc_id,
        title=doc_id,
        quote=reason or f"Chunk {chunk_id}",
    )
    _EVIDENCE_CACHE[citation.citation_id] = citation
    return citation


def get_evidence_for_object(
    object_type: str,
    object_id: str,
    engine: Any = None,
) -> list["EvidenceCitation"]:
    """
    Devuelve evidencias asociadas a un objeto (actor, norma, briefing, etc.).
    """
    from etl.sources.documents.schemas import EvidenceCitation
    key = f"{object_type}:{object_id}"
    ids = _OBJECT_EVIDENCE.get(key, [])

    if not ids and engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                rows = conn.execute(sa_text("""
                    SELECT citation_id, document_id, chunk_id, table_id,
                           source_label, title, source_url, page_number,
                           section_title, quote, citation_style, created_at
                    FROM evidence_citations
                    WHERE chunk_id LIKE :prefix
                       OR document_id = :obj_id
                    ORDER BY created_at DESC
                    LIMIT 20
                """), {
                    "prefix": f"%{object_id}%",
                    "obj_id": object_id,
                }).fetchall()
            return [_row_to_citation(r) for r in rows]
        except Exception as exc:
            logger.debug("get_evidence_for_object DB: %s", exc)

    return [_EVIDENCE_CACHE[cid] for cid in ids if cid in _EVIDENCE_CACHE]


def attach_evidence_to_report(
    report_id: str,
    evidence_ids: list[str],
    engine: Any = None,
) -> None:
    """
    Asocia evidencias a un borrador de informe.
    """
    if not evidence_ids:
        return

    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.begin() as conn:
                conn.execute(sa_text("""
                    UPDATE draft_reports
                    SET evidence_ids = array(
                        SELECT DISTINCT unnest(evidence_ids || :new_ids::text[])
                    ),
                    updated_at = NOW()
                    WHERE report_id = :report_id
                """), {
                    "report_id": report_id,
                    "new_ids": evidence_ids,
                })
        except Exception as exc:
            logger.debug("attach_evidence_to_report: %s", exc)


def get_citation(
    citation_id: str,
    engine: Any = None,
) -> "EvidenceCitation | None":
    """Recupera una EvidenceCitation por ID."""
    if citation_id in _EVIDENCE_CACHE:
        return _EVIDENCE_CACHE[citation_id]

    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                row = conn.execute(sa_text("""
                    SELECT citation_id, document_id, chunk_id, table_id,
                           source_label, title, source_url, page_number,
                           section_title, quote, citation_style, created_at
                    FROM evidence_citations
                    WHERE citation_id = :id
                """), {"id": citation_id}).fetchone()
            if row:
                return _row_to_citation(row)
        except Exception as exc:
            logger.debug("get_citation: %s", exc)

    return None


def list_recent_citations(
    limit: int = 50,
    engine: Any = None,
) -> list["EvidenceCitation"]:
    """Devuelve las citas más recientes."""
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                rows = conn.execute(sa_text("""
                    SELECT citation_id, document_id, chunk_id, table_id,
                           source_label, title, source_url, page_number,
                           section_title, quote, citation_style, created_at
                    FROM evidence_citations
                    ORDER BY created_at DESC
                    LIMIT :limit
                """), {"limit": limit}).fetchall()
            return [_row_to_citation(r) for r in rows]
        except Exception as exc:
            logger.debug("list_recent_citations: %s", exc)

    return list(_EVIDENCE_CACHE.values())[:limit]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_chunk(chunk_id: str, engine: Any):
    """Recupera un DocumentChunk por ID."""
    try:
        from etl.sources.documents.schemas import DocumentChunk
        if engine is not None:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                row = conn.execute(sa_text("""
                    SELECT chunk_id, document_id, chunk_index, section_title,
                           page_start, page_end, text, token_count, citation_ref
                    FROM document_chunks WHERE chunk_id = :id
                """), {"id": chunk_id}).fetchone()
            if row:
                return DocumentChunk(
                    chunk_id=row[0], document_id=row[1],
                    chunk_index=row[2], section_title=row[3],
                    page_start=row[4], page_end=row[5],
                    text=row[6] or "", token_count=row[7],
                    citation_ref=row[8],
                )
    except Exception as exc:
        logger.debug("_get_chunk: %s", exc)
    return None


def _get_document(document_id: str, engine: Any):
    """Recupera un SourceDocument por ID."""
    try:
        from etl.sources.documents.document_registry import get_document
        return get_document(document_id, engine=engine)
    except Exception:
        return None


def _row_to_citation(row) -> "EvidenceCitation":
    """Convierte fila de BD a EvidenceCitation."""
    from etl.sources.documents.schemas import EvidenceCitation
    return EvidenceCitation(
        citation_id=row[0],
        document_id=row[1],
        chunk_id=row[2],
        table_id=row[3],
        source_label=row[4] or "",
        title=row[5] or "",
        source_url=row[6],
        page_number=row[7],
        section_title=row[8],
        quote=row[9] or "",
        citation_style=row[10] or "short",
        created_at=row[11],
    )
