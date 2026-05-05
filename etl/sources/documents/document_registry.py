"""
Document Registry — Bloque 9.

Registro de documentos fuente: creación, deduplicación por hash,
actualización de estado de parsing.

Deduplicación:
  Si ya existe un documento con el mismo file_hash, devuelve el existente
  sin crear duplicado.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Caché en memoria (fallback sin BD)
_DOC_CACHE: dict[str, Any] = {}  # document_id → SourceDocument
_HASH_INDEX: dict[str, str] = {}  # file_hash → document_id


def register_document(
    source_document,
    engine: Any = None,
) -> tuple:
    """
    Registra un SourceDocument. Deduplica por file_hash.

    Returns:
        (source_document, created: bool)
    """
    from etl.sources.documents.schemas import SourceDocument

    # Dedup por hash en caché
    if source_document.file_hash and source_document.file_hash in _HASH_INDEX:
        existing_id = _HASH_INDEX[source_document.file_hash]
        if existing_id in _DOC_CACHE:
            logger.debug("document_registry: dedup hash=%s → %s",
                         source_document.file_hash[:16], existing_id)
            return _DOC_CACHE[existing_id], False

    # Guardar en caché
    _DOC_CACHE[source_document.document_id] = source_document
    if source_document.file_hash:
        _HASH_INDEX[source_document.file_hash] = source_document.document_id

    # Persistir en BD
    if engine is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with engine.begin() as conn:
                # Dedup por hash en BD
                if source_document.file_hash:
                    existing = conn.execute(sa_text("""
                        SELECT document_id FROM source_documents
                        WHERE file_hash = :hash LIMIT 1
                    """), {"hash": source_document.file_hash}).fetchone()
                    if existing:
                        return get_document(existing[0], engine=engine) or source_document, False

                conn.execute(sa_text("""
                    INSERT INTO source_documents (
                        document_id, title, source, source_type,
                        file_name, file_path, source_url, mime_type,
                        file_hash, file_size_bytes, language,
                        published_at, fetched_at, parser_used,
                        parse_status, tenant_id, raw_payload
                    ) VALUES (
                        :document_id, :title, :source, :source_type,
                        :file_name, :file_path, :source_url, :mime_type,
                        :file_hash, :file_size_bytes, :language,
                        :published_at, :fetched_at, :parser_used,
                        :parse_status, :tenant_id, :raw_payload::jsonb
                    )
                    ON CONFLICT (document_id) DO NOTHING
                """), {
                    "document_id": source_document.document_id,
                    "title": source_document.title,
                    "source": source_document.source,
                    "source_type": source_document.source_type,
                    "file_name": source_document.file_name,
                    "file_path": source_document.file_path,
                    "source_url": source_document.source_url,
                    "mime_type": source_document.mime_type,
                    "file_hash": source_document.file_hash,
                    "file_size_bytes": source_document.file_size_bytes,
                    "language": source_document.language,
                    "published_at": source_document.published_at,
                    "fetched_at": source_document.fetched_at,
                    "parser_used": source_document.parser_used,
                    "parse_status": source_document.parse_status,
                    "tenant_id": source_document.tenant_id,
                    "raw_payload": json.dumps(source_document.raw_payload),
                })
        except Exception as exc:
            logger.debug("register_document DB: %s", exc)

    logger.info("document_registry: registered %s (%s)",
                source_document.document_id, source_document.source_type)
    return source_document, True


def get_document(
    document_id: str,
    engine: Any = None,
):
    """Recupera un SourceDocument por ID."""
    from etl.sources.documents.schemas import SourceDocument

    # Caché
    if document_id in _DOC_CACHE:
        return _DOC_CACHE[document_id]

    # BD
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                row = conn.execute(sa_text("""
                    SELECT document_id, title, source, source_type,
                           file_name, file_path, source_url, mime_type,
                           file_hash, file_size_bytes, language,
                           published_at, fetched_at, parser_used,
                           parse_status, tenant_id, raw_payload
                    FROM source_documents
                    WHERE document_id = :id
                """), {"id": document_id}).fetchone()
            if row:
                import json as _json
                doc = SourceDocument(
                    document_id=row[0], title=row[1], source=row[2],
                    source_type=row[3], file_name=row[4], file_path=row[5],
                    source_url=row[6], mime_type=row[7], file_hash=row[8] or "",
                    file_size_bytes=row[9], language=row[10] or "es",
                    published_at=row[11], fetched_at=row[12],
                    parser_used=row[13], parse_status=row[14] or "pending",
                    tenant_id=row[15] or "default",
                    raw_payload=_json.loads(row[16]) if row[16] else {},
                )
                _DOC_CACHE[document_id] = doc
                return doc
        except Exception as exc:
            logger.debug("get_document DB: %s", exc)

    return None


def update_parse_status(
    document_id: str,
    status: str,
    parser_used: str | None = None,
    engine: Any = None,
) -> None:
    """Actualiza el estado de parsing de un documento."""
    if document_id in _DOC_CACHE:
        doc = _DOC_CACHE[document_id]
        doc = doc.model_copy(update={
            "parse_status": status,
            "parser_used": parser_used or doc.parser_used,
        })
        _DOC_CACHE[document_id] = doc

    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.begin() as conn:
                conn.execute(sa_text("""
                    UPDATE source_documents
                    SET parse_status = :status,
                        parser_used = COALESCE(:parser, parser_used),
                        updated_at = NOW()
                    WHERE document_id = :id
                """), {"status": status, "parser": parser_used, "id": document_id})
        except Exception as exc:
            logger.debug("update_parse_status: %s", exc)


def list_pending_documents(engine: Any = None) -> list:
    """Devuelve documentos con parse_status = 'pending'."""
    from etl.sources.documents.schemas import SourceDocument

    # BD primero
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                rows = conn.execute(sa_text("""
                    SELECT document_id, title, source, source_type,
                           file_name, file_path, source_url, mime_type,
                           file_hash, file_size_bytes, language,
                           published_at, fetched_at, parser_used,
                           parse_status, tenant_id
                    FROM source_documents
                    WHERE parse_status = 'pending'
                    ORDER BY fetched_at DESC
                    LIMIT 100
                """)).fetchall()
            if rows:
                return [
                    SourceDocument(
                        document_id=r[0], title=r[1], source=r[2],
                        source_type=r[3], file_name=r[4], file_path=r[5],
                        source_url=r[6], mime_type=r[7], file_hash=r[8] or "",
                        file_size_bytes=r[9], language=r[10] or "es",
                        published_at=r[11], fetched_at=r[12],
                        parser_used=r[13], parse_status=r[14] or "pending",
                        tenant_id=r[15] or "default",
                    )
                    for r in rows
                ]
        except Exception as exc:
            logger.debug("list_pending_documents DB: %s", exc)

    # Caché
    return [d for d in _DOC_CACHE.values() if d.parse_status == "pending"]


def list_documents(
    source_type: str | None = None,
    parse_status: str | None = None,
    limit: int = 50,
    engine: Any = None,
) -> list:
    """Devuelve lista de documentos registrados."""
    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                rows = conn.execute(sa_text("""
                    SELECT document_id, title, source, source_type,
                           file_name, source_url, mime_type, file_hash,
                           file_size_bytes, parse_status, fetched_at
                    FROM source_documents
                    WHERE (:source_type IS NULL OR source_type = :source_type)
                      AND (:parse_status IS NULL OR parse_status = :parse_status)
                    ORDER BY fetched_at DESC
                    LIMIT :limit
                """), {
                    "source_type": source_type,
                    "parse_status": parse_status,
                    "limit": limit,
                }).fetchall()
            return rows
        except Exception as exc:
            logger.debug("list_documents DB: %s", exc)

    # Caché
    docs = list(_DOC_CACHE.values())
    if source_type:
        docs = [d for d in docs if d.source_type == source_type]
    if parse_status:
        docs = [d for d in docs if d.parse_status == parse_status]
    return docs[:limit]
