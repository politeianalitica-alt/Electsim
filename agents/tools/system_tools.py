"""
System tools para el Politeia Brain.

get_ai_status()       — estado del gateway LLM y Chroma
get_rag_status()      — estado del RAG indexer
get_recent_alerts()   — alertas activas (legislativo + medios)
get_pipeline_status() — estado de los pipelines ETL
get_data_health()     — health check de las tablas de datos
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def get_ai_status() -> dict[str, Any]:
    """
    Estado del gateway LLM (Ollama, Chroma, embeddings, LiteLLM…).

    Returns:
        dict con provider, ollama_available, model, chroma_count, etc.
    """
    try:
        from agents.brain.llm_gateway import get_gateway
        return get_gateway().status()
    except Exception as exc:
        logger.debug("get_ai_status: %s", exc)
        return {"available": False, "error": str(exc)}


def get_rag_status() -> dict[str, Any]:
    """
    Estado del RAG indexer (Chroma, documentos indexados, colecciones).

    Returns:
        dict con chroma_available, chroma_count, embedding_model, collections.
    """
    try:
        from agents.brain.rag_indexer import rag_status
        return rag_status()
    except Exception as exc:
        logger.debug("get_rag_status: %s", exc)
        return {"available": False, "chroma_count": 0, "error": str(exc)}


def get_recent_alerts(hours: int = 24, limit: int = 20) -> list[dict[str, Any]]:
    """
    Retorna alertas activas del sistema (legislativas + medios).

    Args:
        hours: ventana temporal.
        limit: máximo de alertas.

    Returns:
        list[dict] con: tipo, nivel, titulo, fuente, created_at.
    """
    alerts: list[dict[str, Any]] = []

    try:
        from dashboard.services.legislative_core import cargar_alertas_legislativas
        import pandas as pd
        df = cargar_alertas_legislativas()
        if not df.empty:
            for _, row in df.head(limit // 2).iterrows():
                alerts.append({
                    "tipo": "legislativa",
                    "nivel": row.get("impact_level", row.get("impacto", "—")),
                    "titulo": str(row.get("title", row.get("titulo", "")))[:100],
                    "fuente": "boe/congreso",
                })
    except Exception:
        pass

    try:
        from dashboard.services.media_core import cargar_alertas_medios
        df = cargar_alertas_medios(hours=hours)
        if not df.empty:
            for _, row in df.head(limit // 2).iterrows():
                alerts.append({
                    "tipo": "medios",
                    "nivel": "ALTO" if (row.get("toxicity_score") or 0) >= 0.7 else "MEDIO",
                    "titulo": str(row.get("title", ""))[:100],
                    "fuente": str(row.get("source", "")),
                })
    except Exception:
        pass

    return alerts[:limit]


def get_pipeline_status() -> dict[str, Any]:
    """
    Estado de los pipelines ETL (última ejecución, errores).

    Returns:
        dict con pipelines BOE, Congreso, Media y su estado.
    """
    status: dict[str, Any] = {
        "boe": {"available": False},
        "congreso": {"available": False},
        "media": {"available": False},
    }

    try:
        from etl.sources.legislative.boe_client import BOEClient
        client = BOEClient()
        # Comprobar si la API del BOE responde (dry check)
        status["boe"] = {
            "available": True,
            "base_url": client.base_url if hasattr(client, "base_url") else "https://www.boe.es",
        }
    except Exception as exc:
        status["boe"] = {"available": False, "error": str(exc)[:80]}

    try:
        from etl.sources.media.rss_client import RSSMediaClient
        client = RSSMediaClient()
        status["media"] = {
            "available": True,
            "n_sources": len(client.sources),
        }
    except Exception as exc:
        status["media"] = {"available": False, "error": str(exc)[:80]}

    return status


def get_data_health() -> dict[str, Any]:
    """
    Health check de las tablas principales de datos.

    Returns:
        dict con tabla → {exists, count, last_updated}.
    """
    health: dict[str, Any] = {}
    tables = ["legal_items", "parliamentary_initiatives", "media_items", "narrative_clusters", "agent_runs"]

    try:
        from sqlalchemy import text as sa_text
        from db.database import get_engine
        engine = get_engine()
        if engine is None:
            return {"error": "no_db"}

        with engine.connect() as conn:
            for table in tables:
                try:
                    row = conn.execute(sa_text(
                        f"SELECT COUNT(*) as n, MAX(created_at) as last_update FROM {table}"
                        if table == "agent_runs" else
                        f"SELECT COUNT(*) as n, MAX(fetched_at) as last_update FROM {table}"
                    )).fetchone()
                    health[table] = {
                        "exists": True,
                        "count": int(row[0]) if row else 0,
                        "last_updated": str(row[1])[:19] if row and row[1] else None,
                    }
                except Exception:
                    health[table] = {"exists": False, "count": 0}
    except Exception as exc:
        health["_error"] = str(exc)

    return health
