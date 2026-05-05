"""
Servicio de inteligencia mediática para el dashboard.

Punto de entrada único para D7_Medios.py y otros módulos.
Todas las funciones con caché TTL y modo real/demo/fallback.
"""
from __future__ import annotations
import logging
import time
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)

# TTL por función (segundos)
_TTL: dict[str, int] = {
    "cargar_estado_fuentes": 120,
    "cargar_articulos_relevantes": 60,
    "cargar_top_stories": 90,
    "cargar_narrativas_reales": 180,
    "cargar_media_kpis": 120,
    "cargar_source_health_summary": 60,
}

# Caché simple: {key: (data, timestamp)}
_CACHE: dict[str, tuple[Any, float]] = {}


def _cached(name: str, func, *args, **kwargs):
    ttl = _TTL.get(name, 60)
    key = f"{name}:{hash(str(args))}"
    if key in _CACHE:
        data, ts = _CACHE[key]
        if time.time() - ts < ttl:
            return data
    result = func(*args, **kwargs)
    _CACHE[key] = (result, time.time())
    return result


def cargar_estado_fuentes(tenant_id: str = "default") -> dict:
    """Estado completo de fuentes: activas, degradadas, caídas."""
    return _cached("cargar_estado_fuentes", _do_cargar_estado_fuentes, tenant_id)


def _do_cargar_estado_fuentes(tenant_id: str) -> dict:
    try:
        from media_intelligence.source_health import (
            list_active_sources, list_degraded_sources, list_down_sources, get_health_summary
        )
        summary = get_health_summary()
        return {
            "active": [h.model_dump() for h in list_active_sources()],
            "degraded": [h.model_dump() for h in list_degraded_sources()],
            "down": [h.model_dump() for h in list_down_sources()],
            "summary": summary,
            "mode": "real" if summary.get("total", 0) > 0 else "empty",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        log.debug("cargar_estado_fuentes error: %s", e)
        return {
            "active": [], "degraded": [], "down": [],
            "summary": {"total": 0, "active": 0, "degraded": 0, "down": 0},
            "mode": "unavailable", "error": str(e)[:200],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }


def cargar_fuentes_activas(tenant_id: str = "default") -> list[dict]:
    estado = cargar_estado_fuentes(tenant_id)
    return estado.get("active", [])


def cargar_fuentes_caidas(tenant_id: str = "default") -> list[dict]:
    estado = cargar_estado_fuentes(tenant_id)
    return estado.get("down", [])


def cargar_fuentes_degradadas(tenant_id: str = "default") -> list[dict]:
    estado = cargar_estado_fuentes(tenant_id)
    return estado.get("degraded", [])


def cargar_articulos_relevantes(tenant_id: str = "default",
                                  limit: int = 50, min_score: float = 0.2) -> list[dict]:
    """Artículos ordenados por relevance_score."""
    return _cached("cargar_articulos_relevantes", _do_cargar_articulos_relevantes,
                   tenant_id, limit, min_score)


def _do_cargar_articulos_relevantes(tenant_id: str, limit: int, min_score: float) -> list[dict]:
    try:
        from media_intelligence.repository import list_articles
        from media_intelligence.article_ranker import rank_articles
        articles = list_articles(limit=limit * 3)
        articles_dicts = [a.model_dump() for a in articles]
        ranked = rank_articles(articles_dicts)
        return [a for a in ranked if a.get("relevance_score", 0) >= min_score][:limit]
    except Exception as e:
        log.debug("cargar_articulos_relevantes error: %s", e)
        # Fallback: usar data_aggregator si está disponible
        try:
            from dashboard.services.data_aggregator import RSSAggregator
            agg = RSSAggregator()
            news = agg.fetch_latest_news(max_items=100) if hasattr(agg, 'fetch_latest_news') else []
            if news:
                from media_intelligence.article_ranker import rank_articles
                return rank_articles(news)[:limit]
        except Exception:
            pass
        return []


def cargar_top_stories(tenant_id: str = "default", n: int = 10) -> list[dict]:
    """Top N noticias por relevance_score, deduplicadas."""
    return _cached("cargar_top_stories", _do_cargar_top_stories, tenant_id, n)


def _do_cargar_top_stories(tenant_id: str, n: int) -> list[dict]:
    try:
        articles = cargar_articulos_relevantes(tenant_id, limit=n * 5)
        if not articles:
            return _demo_top_stories()
        from media_intelligence.editorial_selector import select_top_stories
        return select_top_stories(articles, n=n)
    except Exception as e:
        log.debug("cargar_top_stories error: %s", e)
        return _demo_top_stories()


def cargar_narrativas_reales(tenant_id: str = "default") -> list[dict]:
    """Narrativas reales del motor de clustering."""
    return _cached("cargar_narrativas_reales", _do_cargar_narrativas_reales, tenant_id)


def _do_cargar_narrativas_reales(tenant_id: str) -> list[dict]:
    try:
        from media_intelligence.narrative_pipeline import get_cached_narratives, _demo_narratives
        narratives = get_cached_narratives()
        return narratives if narratives else _demo_narratives()
    except Exception as e:
        log.debug("cargar_narrativas_reales error: %s", e)
        return []


def cargar_media_kpis(tenant_id: str = "default") -> dict:
    """KPIs del módulo de medios."""
    return _cached("cargar_media_kpis", _do_cargar_media_kpis, tenant_id)


def _do_cargar_media_kpis(tenant_id: str) -> dict:
    try:
        from media_intelligence.source_health import get_health_summary
        summary = get_health_summary()
        articles = cargar_articulos_relevantes(tenant_id, limit=200)
        narratives = cargar_narrativas_reales(tenant_id)
        real_narratives = [n for n in narratives if not n.get("is_demo")]
        return {
            "total_sources": summary.get("total", 0),
            "active_sources": summary.get("active", 0),
            "down_sources": summary.get("down", 0),
            "degraded_sources": summary.get("degraded", 0),
            "articles_indexed": len(articles),
            "narratives_detected": len(real_narratives),
            "avg_relevance_score": _avg([a.get("relevance_score", 0) for a in articles[:50]]),
            "mode": "real" if summary.get("total", 0) > 0 else "demo",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        return {
            "total_sources": 0, "active_sources": 0, "down_sources": 0, "degraded_sources": 0,
            "articles_indexed": 0, "narratives_detected": 0, "avg_relevance_score": 0,
            "mode": "error", "error": str(e)[:200],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }


def cargar_source_health_summary(tenant_id: str = "default") -> dict:
    """Resumen de salud de fuentes para D7."""
    estado = cargar_estado_fuentes(tenant_id)
    return estado.get("summary", {})


def _avg(values: list[float]) -> float:
    vals = [v for v in values if v is not None and v > 0]
    return round(sum(vals) / len(vals), 3) if vals else 0.0


def _demo_top_stories() -> list[dict]:
    return [
        {"title": "DEMO — Activa scrapers RSS para noticias reales",
         "source_name": "ElectSim Demo", "relevance_score": 0.0, "is_demo": True,
         "url": "", "published_at": datetime.now(timezone.utc).isoformat()}
    ]


def invalidar_cache(key_prefix: str = "") -> int:
    """Invalida entradas de caché. Retorna número de entradas eliminadas."""
    if not key_prefix:
        count = len(_CACHE)
        _CACHE.clear()
        return count
    keys_to_del = [k for k in _CACHE if k.startswith(key_prefix)]
    for k in keys_to_del:
        _CACHE.pop(k, None)
    return len(keys_to_del)
