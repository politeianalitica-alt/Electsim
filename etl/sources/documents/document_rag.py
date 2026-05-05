"""
Document RAG — Bloque 9.

Indexa chunks documentales en el sistema RAG (Bloque 3):
  - Usa RAGIndexer si está disponible
  - Fallback a búsqueda full-text en BD
  - Fallback a búsqueda en caché en memoria

Colecciones:
  electsim_documents      → documentos generales
  electsim_legal_docs     → BOE, BOCG, leyes
  electsim_tenders        → licitaciones
  electsim_manifestos     → programas electorales
  electsim_client_docs    → documentos de cliente
  electsim_reports        → informes económicos
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Colecciones por source_type
_COLLECTION_MAP = {
    "boe": "electsim_legal_docs",
    "congreso": "electsim_legal_docs",
    "senado": "electsim_legal_docs",
    "eurlex": "electsim_legal_docs",
    "tender": "electsim_tenders",
    "manifesto": "electsim_manifestos",
    "client_upload": "electsim_client_docs",
    "economic_report": "electsim_reports",
}

# Caché en memoria para búsqueda de fallback
_CHUNK_INDEX: dict[str, Any] = {}  # chunk_id → DocumentChunk


def get_collection_for_type(source_type: str) -> str:
    """Devuelve la colección RAG para un source_type."""
    return _COLLECTION_MAP.get(source_type, "electsim_documents")


def index_document_chunks(
    document_id: str,
    engine: Any = None,
) -> int:
    """
    Indexa los chunks de un documento en el sistema RAG.

    Returns:
        Número de chunks indexados.
    """
    chunks = _get_chunks_for_document(document_id, engine)
    if not chunks:
        logger.debug("index_document_chunks: no chunks for %s", document_id)
        return 0

    # Guardar en caché en memoria para búsqueda fallback
    for chunk in chunks:
        _CHUNK_INDEX[chunk.chunk_id] = chunk

    # Intentar RAGIndexer del Bloque 3
    indexed = _try_rag_indexer(chunks, document_id, engine)
    if indexed > 0:
        return indexed

    # Contar los guardados en caché
    logger.debug("index_document_chunks: %d chunks en caché para %s", len(chunks), document_id)
    return len(chunks)


def search_document_chunks(
    query: str,
    filters: dict | None = None,
    k: int = 10,
    engine: Any = None,
) -> list["DocumentSearchResult"]:
    """
    Busca chunks relevantes para una consulta.
    Estrategia:
      1. RAGIndexer Bloque 3
      2. Full-text search en BD
      3. Búsqueda simple en caché en memoria
    """
    from etl.sources.documents.schemas import DocumentSearchResult

    # Intentar RAG
    rag_results = _try_rag_search(query, filters, k)
    if rag_results:
        return rag_results

    # Full-text en BD
    if engine is not None:
        db_results = _fulltext_search_db(query, k, engine)
        if db_results:
            return db_results

    # Búsqueda en caché en memoria
    return _memory_search(query, k)


def sync_document_to_brain(
    document_id: str,
    engine: Any = None,
) -> dict:
    """
    Sincroniza un documento completo al sistema RAG del Brain.
    """
    n_indexed = index_document_chunks(document_id, engine=engine)

    return {
        "document_id": document_id,
        "chunks_indexed": n_indexed,
        "status": "indexed" if n_indexed > 0 else "no_chunks",
    }


def update_chunk_embedding_id(
    chunk_id: str,
    embedding_id: str,
    engine: Any = None,
) -> None:
    """Actualiza el embedding_id de un chunk."""
    if chunk_id in _CHUNK_INDEX:
        chunk = _CHUNK_INDEX[chunk_id]
        _CHUNK_INDEX[chunk_id] = chunk.model_copy(update={"embedding_id": embedding_id})

    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.begin() as conn:
                conn.execute(sa_text("""
                    UPDATE document_chunks
                    SET embedding_id = :emb_id
                    WHERE chunk_id = :chunk_id
                """), {"emb_id": embedding_id, "chunk_id": chunk_id})
        except Exception as exc:
            logger.debug("update_chunk_embedding_id: %s", exc)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_chunks_for_document(document_id: str, engine: Any) -> list:
    """Recupera chunks de un documento."""
    from etl.sources.documents.schemas import DocumentChunk

    if engine is not None:
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                rows = conn.execute(sa_text("""
                    SELECT chunk_id, document_id, chunk_index, section_title,
                           page_start, page_end, text, token_count, citation_ref
                    FROM document_chunks
                    WHERE document_id = :doc_id
                    ORDER BY chunk_index
                """), {"doc_id": document_id}).fetchall()
            if rows:
                return [
                    DocumentChunk(
                        chunk_id=r[0], document_id=r[1], chunk_index=r[2],
                        section_title=r[3], page_start=r[4], page_end=r[5],
                        text=r[6] or "", token_count=r[7], citation_ref=r[8],
                    )
                    for r in rows
                ]
        except Exception as exc:
            logger.debug("_get_chunks_for_document DB: %s", exc)

    # Caché en memoria
    return [c for c in _CHUNK_INDEX.values() if c.document_id == document_id]


def _try_rag_indexer(chunks: list, document_id: str, engine: Any) -> int:
    """Intenta indexar usando RAGIndexer del Bloque 3."""
    try:
        # Primero intentar con el indexador de ChromaDB del Bloque 3
        from services.intelligence.briefing_engine import BriefingEngine
        # Si existe RAGIndexer en el proyecto
        from etl.rag_indexer import RAGIndexer  # type: ignore
        indexer = RAGIndexer()
        texts = [c.text for c in chunks]
        ids = [c.chunk_id for c in chunks]
        collection = get_collection_for_type("other")
        n = indexer.upsert_batch(texts, ids, collection=collection)
        for i, chunk in enumerate(chunks):
            update_chunk_embedding_id(chunk.chunk_id, f"rag:{ids[i]}", engine)
        return n
    except (ImportError, Exception):
        pass
    return 0


def _try_rag_search(query: str, filters: dict | None, k: int) -> list:
    """Intenta buscar usando RAGIndexer del Bloque 3."""
    try:
        from etl.rag_indexer import RAGIndexer  # type: ignore
        indexer = RAGIndexer()
        results = indexer.search(query, k=k)
        return _convert_rag_results(results)
    except (ImportError, Exception):
        pass
    return []


def _fulltext_search_db(query: str, k: int, engine: Any) -> list:
    """Búsqueda full-text en document_chunks."""
    from etl.sources.documents.schemas import DocumentSearchResult
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            rows = conn.execute(sa_text("""
                SELECT dc.chunk_id, dc.document_id, dc.section_title,
                       dc.page_start, dc.text,
                       sd.title, sd.source, sd.source_type, sd.source_url,
                       ts_rank(to_tsvector('spanish', dc.text),
                               plainto_tsquery('spanish', :query)) AS score
                FROM document_chunks dc
                LEFT JOIN source_documents sd ON dc.document_id = sd.document_id
                WHERE to_tsvector('spanish', dc.text) @@ plainto_tsquery('spanish', :query)
                ORDER BY score DESC
                LIMIT :k
            """), {"query": query, "k": k}).fetchall()

        return [
            DocumentSearchResult(
                document_id=r[1],
                title=r[5],
                source=r[6] or "",
                source_type=r[7] or "",
                source_url=r[8],
                chunk_id=r[0],
                chunk_text=r[4],
                page_number=r[3],
                section_title=r[2],
                score=float(r[9]) if r[9] else None,
            )
            for r in rows
        ]
    except Exception as exc:
        logger.debug("_fulltext_search_db: %s", exc)
        return []


def _memory_search(query: str, k: int) -> list:
    """Búsqueda simple en caché de memoria (substring matching)."""
    from etl.sources.documents.schemas import DocumentSearchResult
    query_lower = query.lower()
    results = []

    for chunk in _CHUNK_INDEX.values():
        if query_lower in (chunk.text or "").lower():
            results.append(DocumentSearchResult(
                document_id=chunk.document_id,
                chunk_id=chunk.chunk_id,
                chunk_text=chunk.text[:500],
                page_number=chunk.page_start,
                section_title=chunk.section_title,
                score=1.0,
            ))
        if len(results) >= k:
            break

    return results


def _convert_rag_results(raw_results) -> list:
    """Convierte resultados del RAGIndexer a DocumentSearchResult."""
    from etl.sources.documents.schemas import DocumentSearchResult
    results = []
    for r in raw_results:
        try:
            chunk_id = getattr(r, "id", None) or str(r)
            text = getattr(r, "text", None) or ""
            doc_id = chunk_id.split(":chunk:")[0] if ":chunk:" in str(chunk_id) else ""
            results.append(DocumentSearchResult(
                document_id=doc_id,
                chunk_id=str(chunk_id),
                chunk_text=str(text)[:500],
                score=getattr(r, "score", None),
            ))
        except Exception:
            pass
    return results
