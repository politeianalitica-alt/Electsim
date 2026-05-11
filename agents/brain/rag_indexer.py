"""
RAG Indexer — indexa datos de Bloques 1 y 2 en el vector store.

Usa AIEngine.upsert_documents como backend (Chroma por defecto).
Registra documentos indexados en tabla rag_documents si existe.
No falla si las tablas BD o Chroma no están disponibles.

Colecciones:
    electsim_legal          — BOE + iniciativas parlamentarias
    electsim_media          — artículos de medios
    electsim_narratives     — clusters narrativos
    electsim_briefings      — briefings generados
    electsim_actors         — perfiles de actores
    electsim_electoral      — datos electorales
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from .schemas import EvidenceItem, RAGDocumentRef

logger = logging.getLogger(__name__)

# ── Colecciones ───────────────────────────────────────────────────────────────

COLLECTION_LEGAL       = "electsim_legal"
COLLECTION_PARLIAMENT  = "electsim_legal"   # mismo índice que BOE
COLLECTION_MEDIA       = "electsim_media"
COLLECTION_NARRATIVES  = "electsim_narratives"
COLLECTION_BRIEFINGS   = "electsim_briefings"
COLLECTION_ACTORS      = "electsim_actors"
COLLECTION_ELECTORAL   = "electsim_electoral"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_ai_engine() -> Any:
    try:
        from agents.ai_engine import get_ai_engine
        return get_ai_engine()
    except Exception as exc:
        logger.debug("rag_indexer: AIEngine no disponible: %s", exc)
        return None


def _get_engine() -> Any:
    try:
        from db.database import get_engine
        return get_engine()
    except Exception:
        try:
            from database import get_engine  # type: ignore
            return get_engine()
        except Exception:
            return None


def _sha256_short(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()[:16]


def _register_rag_doc(ref: RAGDocumentRef) -> None:
    """Registra en la tabla rag_documents (si existe). No falla si no existe."""
    try:
        from sqlalchemy import text as sa_text
        engine = _get_engine()
        if engine is None:
            return
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO rag_documents
                    (object_type, object_id, domain, collection, title, source, url, text_hash, metadata, indexed_at)
                VALUES
                    (:object_type, :object_id, :domain, :collection, :title, :source, :url, :text_hash,
                     CAST(:metadata AS JSONB), :indexed_at)
                ON CONFLICT (object_type, object_id, collection) DO UPDATE
                    SET indexed_at = EXCLUDED.indexed_at,
                        text_hash  = EXCLUDED.text_hash
            """), {
                "object_type": ref.object_type,
                "object_id": ref.object_id,
                "domain": ref.domain,
                "collection": ref.collection,
                "title": (ref.title or "")[:400],
                "source": ref.source,
                "url": ref.url,
                "text_hash": ref.text_hash,
                "metadata": __import__("json").dumps(ref.metadata, default=str),
                "indexed_at": ref.indexed_at,
            })
    except Exception as exc:
        logger.debug("_register_rag_doc: %s", exc)


# ── Funciones de indexación ───────────────────────────────────────────────────

def index_legal_items(limit: int = 500) -> int:
    """
    Indexa ítems BOE recientes en el vector store.

    Returns:
        Número de documentos indexados (0 si no hay datos o AIEngine no disponible).
    """
    ai = _get_ai_engine()
    if ai is None:
        return 0

    try:
        from dashboard.services.legislative_core import cargar_boe_reciente
        df = cargar_boe_reciente(limit=limit, days=30)
        if df.empty:
            return 0
    except Exception as exc:
        logger.debug("index_legal_items: sin datos BOE: %s", exc)
        return 0

    docs: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        title = str(row.get("title") or row.get("titulo") or "")
        summary = str(row.get("summary") or row.get("resumen") or "")
        text = f"{title}. {summary}".strip()
        if not text:
            continue
        source_id = str(row.get("source_id") or row.get("id") or "")
        docs.append({
            "id": f"boe:{source_id}",
            "text": text,
            "domain": "legislativo",
            "metadata": {
                "object_type": "legal_item",
                "object_id": source_id,
                "source": "boe",
                "domain": "legislativo",
                "title": title[:200],
                "url": str(row.get("url_html") or row.get("url") or ""),
                "published_at": str(row.get("publication_date") or row.get("fecha") or ""),
                "impact_level": str(row.get("impact_level") or row.get("impacto") or ""),
                "sectors": row.get("sectors") or [],
            },
        })

    n = ai.upsert_documents(docs)
    logger.info("index_legal_items: %d BOE documentos indexados", n)

    # Registrar en rag_documents
    for doc in docs:
        _register_rag_doc(RAGDocumentRef(
            object_type="legal_item",
            object_id=doc["id"],
            domain="legislativo",
            collection=COLLECTION_LEGAL,
            title=doc["metadata"].get("title"),
            source="boe",
            url=doc["metadata"].get("url"),
            text_hash=_sha256_short(doc["text"]),
            metadata=doc["metadata"],
        ))

    return n


def index_parliamentary_initiatives(limit: int = 500) -> int:
    """Indexa iniciativas parlamentarias en el vector store."""
    ai = _get_ai_engine()
    if ai is None:
        return 0

    try:
        from dashboard.services.legislative_core import cargar_iniciativas_recientes
        df = cargar_iniciativas_recientes(limit=limit, days=90)
        if df.empty:
            return 0
    except Exception as exc:
        logger.debug("index_parliamentary_initiatives: sin datos: %s", exc)
        return 0

    docs: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        title = str(row.get("title") or "")
        text = f"{title} [{row.get('initiative_type', '')}] {row.get('status', '')}".strip()
        if not text:
            continue
        source_id = str(row.get("source_id") or "")
        docs.append({
            "id": f"congreso:{source_id}",
            "text": text,
            "domain": "legislativo",
            "metadata": {
                "object_type": "parliamentary_initiative",
                "object_id": source_id,
                "source": "congreso",
                "domain": "legislativo",
                "title": title[:200],
                "url": str(row.get("raw_url") or ""),
                "impact_level": str(row.get("impact_level") or ""),
                "sectors": row.get("sectors") or [],
            },
        })

    n = ai.upsert_documents(docs)
    logger.info("index_parliamentary_initiatives: %d documentos indexados", n)
    return n


def index_media_items(limit: int = 1000) -> int:
    """Indexa artículos de medios en el vector store."""
    ai = _get_ai_engine()
    if ai is None:
        return 0

    try:
        from dashboard.services.media_core import cargar_media_items_recientes
        df = cargar_media_items_recientes(limit=limit, hours=48)
        if df.empty:
            return 0
    except Exception as exc:
        logger.debug("index_media_items: sin datos: %s", exc)
        return 0

    docs: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        title = str(row.get("title") or "")
        summary = str(row.get("summary") or "")
        text = f"{title}. {summary}"[:1000].strip()
        if not text:
            continue
        content_hash = str(row.get("content_hash") or _sha256_short(title))
        docs.append({
            "id": f"media:{content_hash}",
            "text": text,
            "domain": "medios",
            "metadata": {
                "object_type": "media_item",
                "object_id": content_hash,
                "source": str(row.get("source") or ""),
                "domain": "medios",
                "title": title[:200],
                "url": str(row.get("url") or ""),
                "published_at": str(row.get("published_at") or ""),
                "sentiment_label": str(row.get("sentiment_label") or ""),
                "narrative_cluster_id": str(row.get("narrative_cluster_id") or ""),
                "topics": list(row.get("topics") or []),
            },
        })

    n = ai.upsert_documents(docs)
    logger.info("index_media_items: %d documentos indexados", n)
    return n


def index_narrative_clusters(limit: int = 100) -> int:
    """Indexa clusters narrativos activos."""
    ai = _get_ai_engine()
    if ai is None:
        return 0

    try:
        from dashboard.services.media_core import cargar_narrativas_activas
        from etl.sources.media.narrative_clusterer import NARRATIVA_FINGERPRINTS
        fp_map = {fp["id"]: fp for fp in NARRATIVA_FINGERPRINTS}

        df = cargar_narrativas_activas(hours=72, limit=limit)
        docs: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            cid = str(row.get("cluster_id", ""))
            fp = fp_map.get(cid, {})
            nombre = str(row.get("nombre") or fp.get("nombre") or cid)
            top_terms = list(fp.get("keywords", {}).keys())[:10]
            text = f"Narrativa: {nombre}. Términos: {', '.join(top_terms)}. Marco: {fp.get('marco','')}."
            docs.append({
                "id": f"narrative:{cid}",
                "text": text,
                "domain": "medios",
                "metadata": {
                    "object_type": "narrative_cluster",
                    "object_id": cid,
                    "source": "narrative_engine",
                    "domain": "medios",
                    "title": nombre,
                    "volume": int(row.get("volume", 0)),
                    "tension": str(row.get("tension") or ""),
                    "marco": str(fp.get("marco") or ""),
                },
            })
        n = ai.upsert_documents(docs)
        logger.info("index_narrative_clusters: %d documentos indexados", n)
        return n
    except Exception as exc:
        logger.debug("index_narrative_clusters: %s", exc)
        return 0


def index_briefings(limit: int = 100) -> int:
    """Indexa briefings del día si existen en la BD."""
    # Placeholder — se implementa cuando se añada tabla de briefings
    return 0


def index_eurlex_items(limit: int = 200) -> int:
    """
    Indexa normativa EUR-Lex (directivas, reglamentos, decisiones de la UE)
    en el vector store.
    """
    ai = _get_ai_engine()
    if ai is None:
        return 0

    items: list[dict[str, Any]] = []

    # Intento 1: connector SPARQL nuevo
    try:
        from etl.sources.opendata.eurlex_sparql_connector import buscar_recientes  # type: ignore
        items = buscar_recientes(limit=limit) or []
    except Exception as exc:
        logger.debug("index_eurlex_items: eurlex_sparql_connector no disponible: %s", exc)

    # Intento 2: servicio legacy
    if not items:
        try:
            from dashboard.services import eurlex_service  # type: ignore
            if hasattr(eurlex_service, "buscar_normas_recientes"):
                items = eurlex_service.buscar_normas_recientes(limit=limit) or []
        except Exception as exc:
            logger.debug("index_eurlex_items: eurlex_service no disponible: %s", exc)

    if not items:
        return 0

    docs: list[dict[str, Any]] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        title = str(it.get("title") or it.get("titulo") or "")
        summary = str(it.get("summary") or it.get("resumen") or it.get("text", ""))[:1200]
        celex = str(it.get("celex_id") or it.get("celex") or "")
        text = f"{title}. {summary}".strip()
        if not text or not celex:
            continue
        docs.append({
            "id": f"eurlex:{celex}",
            "text": text,
            "domain": "legislativo_ue",
            "metadata": {
                "object_type": "eurlex_norm",
                "object_id": celex,
                "source": "eur-lex",
                "domain": "legislativo_ue",
                "title": title[:300],
                "url": str(it.get("url") or f"https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:{celex}"),
                "norm_type": str(it.get("type") or ""),
                "published_at": str(it.get("date") or it.get("published_at") or ""),
            },
        })

    if not docs:
        return 0
    n = ai.upsert_documents(docs)
    logger.info("index_eurlex_items: %d documentos indexados", n)
    return n


def index_all(
    legal: bool = True,
    parliament: bool = True,
    eurlex: bool = True,
    media: bool = True,
    narratives: bool = True,
) -> dict[str, int]:
    """Indexa todos los dominios y devuelve conteos."""
    result: dict[str, int] = {}
    if legal:
        result["legal"] = index_legal_items()
    if parliament:
        result["parliament"] = index_parliamentary_initiatives()
    if eurlex:
        result["eurlex"] = index_eurlex_items()
    if media:
        result["media"] = index_media_items()
    if narratives:
        result["narratives"] = index_narrative_clusters()
    total = sum(result.values())
    logger.info("index_all: %d documentos en total (%s)", total, result)
    return result


# ── Búsqueda semántica ────────────────────────────────────────────────────────

def semantic_search(
    query: str,
    domains: list[str] | None = None,
    k: int = 8,
    filters: dict[str, Any] | None = None,
) -> list[EvidenceItem]:
    """
    Busca en el vector store y devuelve EvidenceItems.

    Args:
        query: consulta en lenguaje natural.
        domains: filtrar por dominio ("legislativo", "medios", …).
        k: número de resultados.
        filters: filtros adicionales de metadata (Chroma where clause).

    Returns:
        list[EvidenceItem] ordenada por relevancia.
    """
    from .evidence_pack import evidence_from_rag_result
    ai = _get_ai_engine()
    if ai is None:
        return []

    try:
        domain_filter = domains[0] if domains and len(domains) == 1 else None
        raw_results = ai.semantic_search(query, k=k, domain=domain_filter)

        if domains and len(domains) > 1:
            raw_results = [
                r for r in raw_results
                if (r.get("metadata") or {}).get("domain") in domains
            ]

        evidence = []
        for r in raw_results:
            try:
                evidence.append(evidence_from_rag_result(r))
            except Exception:
                pass
        return evidence[:k]
    except Exception as exc:
        logger.debug("semantic_search error: %s", exc)
        return []


def rag_status() -> dict[str, Any]:
    """Devuelve estado del RAG indexer."""
    ai = _get_ai_engine()
    if ai is None:
        return {"available": False, "chroma_count": 0}
    ai_status = ai.status()
    return {
        "available": True,
        "chroma_available": ai_status.get("chroma_available", False),
        "chroma_count": ai_status.get("chroma_count", 0),
        "embedding_model": ai_status.get("embedding_model", "—"),
        "collections": [
            COLLECTION_LEGAL, COLLECTION_MEDIA,
            COLLECTION_NARRATIVES, COLLECTION_BRIEFINGS,
        ],
    }
