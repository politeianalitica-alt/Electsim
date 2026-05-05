"""
Document Service — Bloque 9.

API de servicio para operaciones documentales:
  register_document, parse_registered_document, get_document,
  get_document_chunks, search_documents, get_document_evidence.

Todas las funciones siguen el patrón de ElectSim:
  - Nunca lanzan excepciones al caller
  - Devuelven DataFrame/dict seguro aunque no haya tablas
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def _get_engine() -> Any:
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


def register_document(
    path: str,
    source: str,
    source_type: str,
    metadata: dict | None = None,
    title: str | None = None,
    source_url: str | None = None,
    language: str = "es",
    engine: Any | None = None,
) -> dict:
    """
    Registra un archivo local en el sistema documental.

    Returns:
        dict con document_id, status, created.
    """
    eng = engine or _get_engine()
    try:
        from etl.sources.documents.file_ingestor import ingest_local_file
        doc, created = ingest_local_file(
            path=path, source=source, source_type=source_type,
            metadata=metadata, title=title, source_url=source_url,
            language=language, engine=eng,
        )
        return {
            "document_id": doc.document_id,
            "parse_status": doc.parse_status,
            "created": created,
            "file_hash": doc.file_hash,
        }
    except Exception as exc:
        logger.debug("register_document: %s", exc)
        return {"error": str(exc), "status": "failed"}


def parse_registered_document(
    document_id: str,
    engine: Any | None = None,
) -> dict:
    """
    Parsea un documento ya registrado.

    Returns:
        dict con document_id, status, chunks, tables.
    """
    eng = engine or _get_engine()
    try:
        from etl.sources.documents.document_registry import get_document
        from etl.sources.documents.document_monitor import DocumentMonitor

        doc = get_document(document_id, engine=eng)
        if not doc:
            return {"error": f"Documento no encontrado: {document_id}"}

        if not doc.file_path or not Path(doc.file_path).exists():
            return {"error": f"Archivo no encontrado: {doc.file_path}"}

        monitor = DocumentMonitor(engine=eng)
        result = monitor.process_file(
            path=doc.file_path,
            source=doc.source,
            source_type=doc.source_type,
        )

        return {
            "document_id": result.document_id,
            "success": result.success,
            "chunks": len(result.chunks),
            "tables": len(result.tables),
            "citations": len(result.citations),
            "errors": result.errors,
        }
    except Exception as exc:
        logger.debug("parse_registered_document: %s", exc)
        return {"error": str(exc), "document_id": document_id}


def get_document(
    document_id: str,
    engine: Any | None = None,
) -> dict:
    """
    Recupera metadata de un documento.

    Returns:
        dict con campos del SourceDocument + stats de chunks.
    """
    eng = engine or _get_engine()
    try:
        from etl.sources.documents.document_registry import get_document as _get_doc
        doc = _get_doc(document_id, engine=eng)
        if not doc:
            return {}
        result = doc.model_dump()

        # Añadir stats
        if eng is not None:
            try:
                from sqlalchemy import text as sa_text
                with eng.connect() as conn:
                    row = conn.execute(sa_text("""
                        SELECT chunk_count, table_count FROM (
                            SELECT
                                (SELECT COUNT(*) FROM document_chunks WHERE document_id = :id) AS chunk_count,
                                (SELECT COUNT(*) FROM extracted_tables WHERE document_id = :id) AS table_count
                        ) stats
                    """), {"id": document_id}).fetchone()
                if row:
                    result["chunk_count"] = row[0]
                    result["table_count"] = row[1]
            except Exception:
                pass

        return result
    except Exception as exc:
        logger.debug("get_document: %s", exc)
        return {}


def get_document_chunks(
    document_id: str,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Devuelve los chunks de un documento como DataFrame.
    """
    eng = engine or _get_engine()
    if eng is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        df = pd.read_sql(sa_text("""
            SELECT chunk_id, chunk_index, section_title, page_start, page_end,
                   LEFT(text, 300) AS text_preview, token_count,
                   topics, entities, sectors, citation_ref
            FROM document_chunks
            WHERE document_id = :id
            ORDER BY chunk_index
        """), eng, params={"id": document_id})
        return df
    except Exception as exc:
        logger.debug("get_document_chunks: %s", exc)
        return pd.DataFrame()


def search_documents(
    query: str,
    limit: int = 20,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Busca documentos por texto.
    Primero intenta full-text en chunks, luego en metadata.
    """
    eng = engine or _get_engine()

    try:
        from etl.sources.documents.document_rag import search_document_chunks
        results = search_document_chunks(query, k=limit, engine=eng)

        if results:
            return pd.DataFrame([{
                "document_id": r.document_id,
                "title": r.title,
                "source": r.source,
                "source_type": r.source_type,
                "chunk_text": (r.chunk_text or "")[:300],
                "page_number": r.page_number,
                "section_title": r.section_title,
                "score": r.score,
            } for r in results])
    except Exception as exc:
        logger.debug("search_documents RAG: %s", exc)

    # Fallback: buscar en títulos de source_documents
    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            df = pd.read_sql(sa_text("""
                SELECT document_id, title, source, source_type, source_url,
                       parse_status, fetched_at
                FROM source_documents
                WHERE title ILIKE :q OR source ILIKE :q
                ORDER BY fetched_at DESC
                LIMIT :limit
            """), eng, params={"q": f"%{query}%", "limit": limit})
            return df
        except Exception as exc:
            logger.debug("search_documents fallback: %s", exc)

    return pd.DataFrame()


def get_document_evidence(
    document_id: str,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Devuelve las evidencias/citas de un documento.
    """
    eng = engine or _get_engine()
    if eng is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        df = pd.read_sql(sa_text("""
            SELECT citation_id, chunk_id, table_id, source_label,
                   title, page_number, section_title,
                   LEFT(quote, 300) AS quote, citation_style, created_at
            FROM evidence_citations
            WHERE document_id = :id
            ORDER BY created_at DESC
        """), eng, params={"id": document_id})
        return df
    except Exception as exc:
        logger.debug("get_document_evidence: %s", exc)
        return pd.DataFrame()
