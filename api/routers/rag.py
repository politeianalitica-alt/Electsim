"""
Router /api/rag — controles del RAG (Retrieval-Augmented Generation).

Endpoints:
  GET  /api/rag/status                → estado vector store + último reindex
  POST /api/rag/reindex               → trigger manual de reindex completo
  POST /api/rag/reindex/legal         → reindex BOE solo
  POST /api/rag/reindex/parliament    → reindex Congreso solo
  POST /api/rag/reindex/eurlex        → reindex EUR-Lex solo
  POST /api/rag/reindex/media         → reindex medios solo
  POST /api/rag/search                → búsqueda semántica
  GET  /api/rag/scheduler             → estado del scheduler APScheduler
  POST /api/rag/scheduler/start       → arrancar scheduler
  POST /api/rag/scheduler/stop        → parar scheduler

Para activar el scheduler automático:
  RAG_SCHEDULER_ENABLED=1
  RAG_REINDEX_HOUR=3
  RAG_REINDEX_MINUTE=30
  RAG_HOURLY_BOE_ENABLED=1   # opcional, reindex BOE cada hora
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rag", tags=["rag"])


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=2000)
    domains: Optional[list[str]] = None
    k: int = Field(8, ge=1, le=50)


@router.get("/status")
def status():
    """Estado del RAG: vector store, conteo, último reindex."""
    try:
        from agents.brain.rag_indexer import rag_status
        result = rag_status()
        # Añadir info del scheduler también
        try:
            from agents.brain.rag_scheduler import scheduler_status
            result["scheduler"] = scheduler_status()
        except ImportError:
            result["scheduler"] = {"running": False, "warning": "rag_scheduler_not_importable"}
        return result
    except ImportError:
        return {"available": False, "warning": "rag_indexer_not_importable"}


@router.post("/reindex")
def reindex_all(
    legal: bool = True,
    parliament: bool = True,
    eurlex: bool = True,
    media: bool = True,
    narratives: bool = True,
):
    """Trigger manual de reindex completo."""
    try:
        from agents.brain.rag_indexer import index_all
        result = index_all(
            legal=legal, parliament=parliament, eurlex=eurlex,
            media=media, narratives=narratives,
        )
        return {"ok": True, "indexed": result, "total": sum(result.values())}
    except ImportError as e:
        raise HTTPException(503, f"rag_indexer_not_importable: {e}")
    except Exception as e:
        logger.exception("reindex_all failed")
        raise HTTPException(500, f"reindex_failed: {e}")


@router.post("/reindex/legal")
def reindex_legal(limit: int = 500):
    """Reindex solo BOE."""
    try:
        from agents.brain.rag_indexer import index_legal_items
        n = index_legal_items(limit=limit)
        return {"ok": True, "indexed": n, "domain": "legal_boe"}
    except ImportError as e:
        raise HTTPException(503, f"rag_indexer_not_importable: {e}")


@router.post("/reindex/parliament")
def reindex_parliament(limit: int = 500):
    """Reindex solo Congreso."""
    try:
        from agents.brain.rag_indexer import index_parliamentary_initiatives
        n = index_parliamentary_initiatives(limit=limit)
        return {"ok": True, "indexed": n, "domain": "parliament"}
    except ImportError as e:
        raise HTTPException(503, f"rag_indexer_not_importable: {e}")


@router.post("/reindex/eurlex")
def reindex_eurlex(limit: int = 200):
    """Reindex solo EUR-Lex."""
    try:
        from agents.brain.rag_indexer import index_eurlex_items
        n = index_eurlex_items(limit=limit)
        return {"ok": True, "indexed": n, "domain": "eurlex"}
    except ImportError as e:
        raise HTTPException(503, f"rag_indexer_not_importable: {e}")


@router.post("/reindex/media")
def reindex_media(limit: int = 1000):
    """Reindex solo medios."""
    try:
        from agents.brain.rag_indexer import index_media_items
        n = index_media_items(limit=limit)
        return {"ok": True, "indexed": n, "domain": "media"}
    except ImportError as e:
        raise HTTPException(503, f"rag_indexer_not_importable: {e}")


@router.post("/search")
def search(req: SemanticSearchRequest):
    """Búsqueda semántica en el vector store."""
    try:
        from agents.brain.rag_indexer import semantic_search
        results = semantic_search(query=req.query, domains=req.domains, k=req.k)
        items = []
        for ev in results:
            if hasattr(ev, "model_dump"):
                items.append(ev.model_dump())
            elif isinstance(ev, dict):
                items.append(ev)
            else:
                items.append({"raw": str(ev)})
        return {"query": req.query, "items": items, "total": len(items)}
    except ImportError as e:
        raise HTTPException(503, f"rag_indexer_not_importable: {e}")


# ─── Scheduler controls ──────────────────────────────────────────────────────


@router.get("/scheduler")
def scheduler_get_status():
    """Estado del scheduler APScheduler."""
    try:
        from agents.brain.rag_scheduler import scheduler_status
        return scheduler_status()
    except ImportError as e:
        return {"running": False, "warning": f"rag_scheduler_not_importable: {e}"}


@router.post("/scheduler/start")
def scheduler_start():
    """Arranca el scheduler (requiere RAG_SCHEDULER_ENABLED=1)."""
    try:
        from agents.brain.rag_scheduler import start_scheduler
        started = start_scheduler()
        return {"ok": started, "running": started}
    except ImportError as e:
        raise HTTPException(503, f"rag_scheduler_not_importable: {e}")


@router.post("/scheduler/stop")
def scheduler_stop():
    """Para el scheduler."""
    try:
        from agents.brain.rag_scheduler import stop_scheduler
        stopped = stop_scheduler()
        return {"ok": stopped, "running": False}
    except ImportError as e:
        raise HTTPException(503, f"rag_scheduler_not_importable: {e}")
