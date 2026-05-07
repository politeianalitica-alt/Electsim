"""
Router /api/news — capa de inteligencia sobre `news_articles`.

Consume las funciones de `dashboard.services.news_ingestion` que ya hacen el
scraping multi-fuente (414 medios), análisis con Ollama (resumen, sentiment,
topics, entidades, impacto sobre España, geo) y persistencia en `news_articles`.

Endpoints:
  GET /api/news/feed             — feed paginado con filtros
  GET /api/news/sentiment-map    — agregaciones geo para mapa mundial
  GET /api/news/topics           — top temas en ventana
  GET /api/news/spain-impact     — top noticias con alto impacto España
  GET /api/news/stats            — estadísticas globales del scraper
  GET /api/news/timeline         — volumen + sentimiento por hora
  POST /api/news/scrape          — dispara ingesta on-demand (admin)
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Query, BackgroundTasks
from pydantic import BaseModel

router = APIRouter(prefix="/api/news", tags=["news-intelligence"])


def _safe_import():
    """Lazy import: si el módulo dashboard.services no carga, devolvemos None."""
    try:
        from dashboard.services import news_ingestion as ni  # type: ignore
        from dashboard.services.media_sources import MEDIA_SOURCES, build_feeds_list  # type: ignore
        return ni, MEDIA_SOURCES, build_feeds_list
    except Exception as exc:
        return None, None, None


@router.get("/feed")
def news_feed(
    limit: int = Query(50, ge=1, le=200),
    region: Optional[str] = Query(None, description="local_spain|regional_spain|europe|north_america|latin_america|africa|asia"),
    category: Optional[str] = Query(None),
    min_relevance: int = Query(1, ge=1, le=10),
    hours_back: int = Query(24, ge=1, le=720),
):
    """Feed de artículos analizados por Ollama."""
    ni, _, _ = _safe_import()
    if not ni:
        return {"articles": [], "warning": "news_ingestion no disponible"}
    rows = ni.get_recent_articles(
        limit=limit, region=region, category=category,
        min_relevance=min_relevance, hours_back=hours_back,
    )
    # Serializar fechas + arrays
    articles = []
    for r in rows:
        d = dict(r)
        for k in ("published_at", "scraped_at"):
            if d.get(k) and hasattr(d[k], "isoformat"):
                d[k] = d[k].isoformat()
        articles.append(d)
    return {"articles": articles, "count": len(articles), "filters": {"region": region, "category": category, "min_relevance": min_relevance, "hours_back": hours_back}}


@router.get("/sentiment-map")
def sentiment_map(hours_back: int = Query(24, ge=1, le=168)):
    """Agregación de sentiment por (país, lat, lon) para el mapa mundial."""
    ni, _, _ = _safe_import()
    if not ni:
        return {"points": []}
    try:
        sql = """
            SELECT
                source_country,
                source_region,
                ROUND(AVG(source_lat)::numeric, 2)                       AS lat,
                ROUND(AVG(source_lon)::numeric, 2)                       AS lon,
                COUNT(*)                                                  AS volume,
                ROUND(AVG(ai_relevance)::numeric, 1)                     AS avg_relevance,
                COUNT(*) FILTER (WHERE ai_sentiment='positivo')           AS pos,
                COUNT(*) FILTER (WHERE ai_sentiment='negativo')           AS neg,
                COUNT(*) FILTER (WHERE ai_sentiment='neutro')             AS neu,
                COUNT(*) FILTER (WHERE ai_spain_impact IN ('alto','critico')) AS spain_high
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL %(h)s
              AND source_lat IS NOT NULL AND source_lon IS NOT NULL
            GROUP BY source_country, source_region
            ORDER BY volume DESC
        """
        with ni._get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {"h": f"{hours_back} hours"})
                cols = [d.name for d in cur.description]
                rows = [dict(zip(cols, r)) for r in cur.fetchall()]
        # Convert to floats
        for r in rows:
            for k in ("lat", "lon", "avg_relevance"):
                if r.get(k) is not None:
                    r[k] = float(r[k])
        return {"points": rows, "hours_back": hours_back}
    except Exception as exc:
        return {"points": [], "error": str(exc)}


@router.get("/topics")
def top_topics(hours_back: int = Query(24, ge=1, le=168), limit: int = Query(15, ge=1, le=50)):
    """Top temas detectados por Ollama en la ventana."""
    ni, _, _ = _safe_import()
    if not ni:
        return {"topics": []}
    rows = ni.get_top_topics(hours_back=hours_back, limit=limit)
    return {"topics": rows, "hours_back": hours_back}


@router.get("/spain-impact")
def spain_impact(limit: int = Query(10, ge=1, le=30), hours_back: int = Query(48, ge=1, le=168)):
    """Top artículos con alto/crítico impacto sobre España."""
    ni, _, _ = _safe_import()
    if not ni:
        return {"articles": []}
    try:
        sql = """
            SELECT id, title, url, source_name, source_country,
                   ai_summary, ai_analysis, ai_sentiment, ai_relevance,
                   ai_urgency, ai_spain_impact, ai_topics, ai_geo_location,
                   ai_geo_lat, ai_geo_lon, scraped_at, ai_category
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL %(h)s
              AND ai_spain_impact IN ('alto', 'critico')
            ORDER BY
              CASE ai_spain_impact WHEN 'critico' THEN 0 WHEN 'alto' THEN 1 ELSE 2 END,
              ai_relevance DESC,
              scraped_at DESC
            LIMIT %(l)s
        """
        with ni._get_conn() as conn:
            from psycopg.rows import dict_row
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, {"h": f"{hours_back} hours", "l": limit})
                rows = list(cur.fetchall())
        for r in rows:
            for k in ("scraped_at",):
                if r.get(k) and hasattr(r[k], "isoformat"):
                    r[k] = r[k].isoformat()
        return {"articles": rows, "count": len(rows)}
    except Exception as exc:
        return {"articles": [], "error": str(exc)}


@router.get("/stats")
def news_stats():
    """Estadísticas globales del scraper para panel de control."""
    ni, MEDIA_SOURCES, build_feeds_list = _safe_import()
    if not ni:
        return {"warning": "news_ingestion no disponible"}
    stats = ni.get_ingestion_stats()
    # Serializar timestamp
    if stats.get("last_scraped") and hasattr(stats["last_scraped"], "isoformat"):
        stats["last_scraped"] = stats["last_scraped"].isoformat()
    if stats.get("avg_relevance") is not None:
        stats["avg_relevance"] = float(stats["avg_relevance"])
    # Catalog info
    try:
        all_feeds = build_feeds_list() if callable(build_feeds_list) else []
        stats["catalog"] = {
            "total_sources": len(all_feeds),
            "by_region": {k: len(v) for k, v in (MEDIA_SOURCES or {}).items()},
        }
    except Exception:
        stats["catalog"] = {"total_sources": 0, "by_region": {}}
    return stats


@router.get("/timeline")
def news_timeline(hours_back: int = Query(48, ge=1, le=168)):
    """Volumen y sentiment medio por hora — para el chart de pulso."""
    ni, _, _ = _safe_import()
    if not ni:
        return {"buckets": []}
    try:
        sql = """
            SELECT
                date_trunc('hour', scraped_at)                              AS hour,
                COUNT(*)                                                     AS volume,
                COUNT(*) FILTER (WHERE ai_sentiment='positivo')              AS pos,
                COUNT(*) FILTER (WHERE ai_sentiment='negativo')              AS neg,
                COUNT(*) FILTER (WHERE ai_relevance >= 7)                    AS high_rel
            FROM news_articles
            WHERE scraped_at > NOW() - INTERVAL %(h)s
            GROUP BY hour
            ORDER BY hour ASC
        """
        with ni._get_conn() as conn:
            from psycopg.rows import dict_row
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, {"h": f"{hours_back} hours"})
                rows = list(cur.fetchall())
        for r in rows:
            if r.get("hour") and hasattr(r["hour"], "isoformat"):
                r["hour"] = r["hour"].isoformat()
        return {"buckets": rows, "hours_back": hours_back}
    except Exception as exc:
        return {"buckets": [], "error": str(exc)}


# ── Ingest on-demand ──────────────────────────────────────────────────────────
class ScrapeRequest(BaseModel):
    region: Optional[str] = None        # "local_spain" | "europe" | etc.
    max_sources: int = 5                # límite para evitar timeouts
    use_ollama: bool = True


@router.post("/scrape")
def scrape_now(req: ScrapeRequest, background_tasks: BackgroundTasks):
    """Dispara una ingesta on-demand (asíncrona vía BackgroundTasks)."""
    ni, MEDIA_SOURCES, _ = _safe_import()
    if not ni or not MEDIA_SOURCES:
        return {"started": False, "warning": "news_ingestion no disponible"}

    if req.region and req.region in MEDIA_SOURCES:
        sources = MEDIA_SOURCES[req.region][: req.max_sources]
    else:
        # Default: top fuentes de varias regiones
        sources = []
        for region in ["local_spain", "europe", "latin_america"]:
            if region in MEDIA_SOURCES:
                sources.extend(MEDIA_SOURCES[region][: max(2, req.max_sources // 3)])

    def _run():
        try:
            ni.ingest_all_sources(sources=sources, use_ollama=req.use_ollama, delay_between_sources=0.4)
        except Exception:
            pass

    background_tasks.add_task(_run)
    return {
        "started": True,
        "n_sources": len(sources),
        "region": req.region,
        "use_ollama": req.use_ollama,
        "started_at": datetime.utcnow().isoformat() + "Z",
    }
