"""
Document Core Service — Bloque 9.

Funciones para el dashboard:
  cargar_documentos_recientes, cargar_documento,
  cargar_chunks_documento, buscar_documentos,
  cargar_evidencias_recientes, cargar_borradores_informes,
  cargar_kpis_documentos.

Patrón ElectSim: nunca lanza excepciones al caller,
devuelve DataFrame/dict vacío si no hay datos.
"""
from __future__ import annotations

import logging
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def _get_engine() -> Any:
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


def cargar_kpis_documentos(engine: Any = None) -> dict:
    """
    KPIs globales del módulo documental.

    Returns:
        dict con total_docs, docs_parseados, total_chunks,
        total_tablas, total_evidencias, total_borradores.
    """
    eng = engine or _get_engine()
    base: dict = {
        "total_docs": 0,
        "docs_parseados": 0,
        "docs_pendientes": 0,
        "total_chunks": 0,
        "total_tablas": 0,
        "total_evidencias": 0,
        "total_borradores": 0,
    }

    if eng is None:
        return base

    try:
        from sqlalchemy import text as sa_text
        with eng.connect() as conn:
            row = conn.execute(sa_text("""
                SELECT
                    (SELECT COUNT(*) FROM source_documents)                        AS total_docs,
                    (SELECT COUNT(*) FROM source_documents WHERE parse_status='parsed') AS docs_parseados,
                    (SELECT COUNT(*) FROM source_documents WHERE parse_status='pending') AS docs_pendientes,
                    (SELECT COUNT(*) FROM document_chunks)                         AS total_chunks,
                    (SELECT COUNT(*) FROM extracted_tables)                        AS total_tablas,
                    (SELECT COUNT(*) FROM evidence_citations)                      AS total_evidencias,
                    (SELECT COUNT(*) FROM draft_reports)                           AS total_borradores
            """)).fetchone()
        if row:
            base = {
                "total_docs": row[0] or 0,
                "docs_parseados": row[1] or 0,
                "docs_pendientes": row[2] or 0,
                "total_chunks": row[3] or 0,
                "total_tablas": row[4] or 0,
                "total_evidencias": row[5] or 0,
                "total_borradores": row[6] or 0,
            }
    except Exception as exc:
        logger.debug("cargar_kpis_documentos: %s", exc)

    return base


def cargar_documentos_recientes(
    limit: int = 20,
    source_type: str | None = None,
    engine: Any = None,
) -> pd.DataFrame:
    """
    Lista los documentos registrados más recientes.

    Returns:
        DataFrame con document_id, title, source, source_type,
        parse_status, fetched_at, chunk_count.
    """
    eng = engine or _get_engine()

    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            df = pd.read_sql(sa_text("""
                SELECT
                    sd.document_id,
                    sd.title,
                    sd.source,
                    sd.source_type,
                    sd.parse_status,
                    sd.language,
                    sd.fetched_at,
                    COALESCE(dc.n_chunks, 0) AS chunk_count
                FROM source_documents sd
                LEFT JOIN (
                    SELECT document_id, COUNT(*) AS n_chunks
                    FROM document_chunks
                    GROUP BY document_id
                ) dc ON sd.document_id = dc.document_id
                WHERE (:source_type IS NULL OR sd.source_type = :source_type)
                ORDER BY sd.fetched_at DESC
                LIMIT :limit
            """), eng, params={"source_type": source_type, "limit": limit})
            return df
        except Exception as exc:
            logger.debug("cargar_documentos_recientes: %s", exc)

    # Fallback: caché en memoria
    try:
        from etl.sources.documents.document_registry import _DOC_CACHE
        docs = list(_DOC_CACHE.values())
        if source_type:
            docs = [d for d in docs if d.source_type == source_type]
        docs = docs[-limit:]
        return pd.DataFrame([{
            "document_id": d.document_id,
            "title": d.title or d.source,
            "source": d.source,
            "source_type": d.source_type,
            "parse_status": d.parse_status,
            "language": d.language,
            "fetched_at": d.fetched_at,
            "chunk_count": 0,
        } for d in docs])
    except Exception:
        pass

    return pd.DataFrame()


def cargar_documento(
    document_id: str,
    engine: Any = None,
) -> dict:
    """
    Carga los metadatos completos de un documento.

    Returns:
        dict con todos los campos del SourceDocument + stats.
    """
    eng = engine or _get_engine()
    try:
        from services.documents.document_service import get_document
        return get_document(document_id, engine=eng)
    except Exception as exc:
        logger.debug("cargar_documento: %s", exc)
        return {}


def cargar_chunks_documento(
    document_id: str,
    engine: Any = None,
) -> pd.DataFrame:
    """
    Carga los chunks de un documento para visualización.

    Returns:
        DataFrame con chunk_id, chunk_index, section_title,
        page_start, text_preview, token_count.
    """
    eng = engine or _get_engine()
    try:
        from services.documents.document_service import get_document_chunks
        return get_document_chunks(document_id, engine=eng)
    except Exception as exc:
        logger.debug("cargar_chunks_documento: %s", exc)
        return pd.DataFrame()


def buscar_documentos(
    query: str,
    limit: int = 20,
    engine: Any = None,
) -> pd.DataFrame:
    """
    Búsqueda semántica/full-text en el corpus documental.

    Returns:
        DataFrame con document_id, title, source, source_type,
        chunk_text, page_number, section_title, score.
    """
    eng = engine or _get_engine()
    try:
        from services.documents.document_service import search_documents
        return search_documents(query, limit=limit, engine=eng)
    except Exception as exc:
        logger.debug("buscar_documentos: %s", exc)
        return pd.DataFrame()


def cargar_evidencias_recientes(
    limit: int = 20,
    engine: Any = None,
) -> pd.DataFrame:
    """
    Carga las citas/evidencias más recientes del sistema.

    Returns:
        DataFrame con citation_id, source_label, title,
        page_number, section_title, quote, citation_style.
    """
    eng = engine or _get_engine()

    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            df = pd.read_sql(sa_text("""
                SELECT
                    citation_id,
                    document_id,
                    source_label,
                    title,
                    page_number,
                    section_title,
                    LEFT(quote, 300) AS quote,
                    citation_style,
                    created_at
                FROM evidence_citations
                ORDER BY created_at DESC
                LIMIT :limit
            """), eng, params={"limit": limit})
            return df
        except Exception as exc:
            logger.debug("cargar_evidencias_recientes: %s", exc)

    # Fallback: caché en memoria
    try:
        from etl.sources.documents.evidence_store import _EVIDENCE_CACHE
        cits = sorted(
            _EVIDENCE_CACHE.values(),
            key=lambda c: c.created_at or "",
            reverse=True,
        )[:limit]
        return pd.DataFrame([{
            "citation_id": c.citation_id,
            "document_id": c.document_id,
            "source_label": c.source_label,
            "title": c.title,
            "page_number": c.page_number,
            "section_title": c.section_title,
            "quote": (c.quote or "")[:300],
            "citation_style": c.citation_style,
            "created_at": c.created_at,
        } for c in cits])
    except Exception:
        pass

    return pd.DataFrame()


def cargar_borradores_informes(
    report_type: str | None = None,
    status: str | None = None,
    limit: int = 20,
    engine: Any = None,
) -> pd.DataFrame:
    """
    Lista los borradores de informes.

    Returns:
        DataFrame con report_id, title, report_type, status,
        client_id, created_at, updated_at, n_sections.
    """
    eng = engine or _get_engine()

    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            df = pd.read_sql(sa_text("""
                SELECT
                    report_id,
                    title,
                    report_type,
                    status,
                    client_id,
                    tenant_id,
                    jsonb_array_length(sections) AS n_sections,
                    created_at,
                    updated_at
                FROM draft_reports
                WHERE (:report_type IS NULL OR report_type = :report_type)
                  AND (:status IS NULL OR status = :status)
                ORDER BY updated_at DESC
                LIMIT :limit
            """), eng, params={
                "report_type": report_type,
                "status": status,
                "limit": limit,
            })
            return df
        except Exception as exc:
            logger.debug("cargar_borradores_informes DB: %s", exc)

    # Fallback: caché en memoria
    try:
        from services.documents.draft_service import _REPORT_CACHE
        reports = list(_REPORT_CACHE.values())
        if report_type:
            reports = [r for r in reports if r.report_type == report_type]
        if status:
            reports = [r for r in reports if r.status == status]
        reports.sort(key=lambda r: r.updated_at or "", reverse=True)
        reports = reports[:limit]
        return pd.DataFrame([{
            "report_id": r.report_id,
            "title": r.title,
            "report_type": r.report_type,
            "status": r.status,
            "client_id": r.client_id,
            "tenant_id": r.tenant_id,
            "n_sections": len(r.sections),
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        } for r in reports])
    except Exception:
        pass

    return pd.DataFrame()


def cargar_tablas_extraidas(
    document_id: str | None = None,
    limit: int = 20,
    engine: Any = None,
) -> pd.DataFrame:
    """
    Lista tablas extraídas de documentos.

    Returns:
        DataFrame con table_id, document_id, table_title,
        row_count, col_count, page_number, confidence_score.
    """
    eng = engine or _get_engine()

    if eng is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        df = pd.read_sql(sa_text("""
            SELECT
                table_id,
                document_id,
                table_title,
                row_count,
                col_count,
                page_number,
                confidence_score,
                created_at
            FROM extracted_tables
            WHERE (:doc_id IS NULL OR document_id = :doc_id)
            ORDER BY created_at DESC
            LIMIT :limit
        """), eng, params={"doc_id": document_id, "limit": limit})
        return df
    except Exception as exc:
        logger.debug("cargar_tablas_extraidas: %s", exc)
        return pd.DataFrame()


def cargar_stats_por_tipo(engine: Any = None) -> pd.DataFrame:
    """
    Distribución de documentos por source_type.

    Returns:
        DataFrame con source_type, total, parseados, chunks.
    """
    eng = engine or _get_engine()
    if eng is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        df = pd.read_sql(sa_text("""
            SELECT
                sd.source_type,
                COUNT(*) AS total,
                SUM(CASE WHEN sd.parse_status='parsed' THEN 1 ELSE 0 END) AS parseados,
                COALESCE(SUM(dc.n_chunks), 0) AS chunks
            FROM source_documents sd
            LEFT JOIN (
                SELECT document_id, COUNT(*) AS n_chunks
                FROM document_chunks
                GROUP BY document_id
            ) dc ON sd.document_id = dc.document_id
            GROUP BY sd.source_type
            ORDER BY total DESC
        """), eng)
        return df
    except Exception as exc:
        logger.debug("cargar_stats_por_tipo: %s", exc)
        return pd.DataFrame()
