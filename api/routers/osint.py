"""
Block 5 — FastAPI endpoints para OSINT, Narrativas y Desinformación.

Provee acceso a: posts sociales, narrativas activas, propagación,
alertas de coordinación, búsqueda y KPIs del dashboard.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db

router = APIRouter(prefix="/api/v1/osint", tags=["osint"])


# ──────────────────────────────────────────────────────────────────────
# Posts sociales
# ──────────────────────────────────────────────────────────────────────
@router.get("/posts")
async def list_social_posts(
    platform:    str   = Query(None, description="twitter | telegram | youtube | mastodon"),
    hashtag:     str   = Query(None),
    min_toxicidad: float = Query(0.0, ge=0.0, le=1.0),
    min_engagement: float = Query(0.0),
    horas:       int   = Query(24, ge=1, le=168),
    limit:       int   = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista posts sociales recientes con filtros opcionales."""
    filters = [
        "ingerido_en >= NOW() - :horas * INTERVAL '1 hour'",
        "toxicidad >= :min_tox",
        "engagement_rate >= :min_eng",
    ]
    params: dict[str, Any] = {
        "horas":   horas,
        "min_tox": min_toxicidad,
        "min_eng": min_engagement,
        "limit":   limit,
    }

    if platform:
        filters.append("platform = :platform")
        params["platform"] = platform
    if hashtag:
        filters.append("hashtags::text ILIKE :hashtag")
        params["hashtag"] = f"%{hashtag.lstrip('#').lower()}%"

    where = " AND ".join(filters)
    r = await db.execute(text(f"""
        SELECT id, platform, external_id, url,
               texto, hashtags, menciones,
               autor_handle, autor_nombre, autor_seguidores, autor_verificado, autor_tipo,
               n_likes, n_shares, n_replies, n_views,
               sentiment, toxicidad, emocion,
               engagement_rate, relevancia_politica,
               narrativa_id, publicado_en, ingerido_en
        FROM social_post
        WHERE {where}
        ORDER BY engagement_rate DESC, ingerido_en DESC
        LIMIT :limit
    """), params)
    return [dict(row) for row in r.mappings()]


# ──────────────────────────────────────────────────────────────────────
# Narrativas activas
# ──────────────────────────────────────────────────────────────────────
@router.get("/narrativas")
async def list_narrativas(
    tipo:        str   = Query(None, description="desinformacion|polarizacion|protesta|..."),
    min_riesgo:  float = Query(0.0, ge=0.0, le=10.0),
    coordinadas: bool  = Query(None),
    horas:       int   = Query(48, ge=1, le=720),
    limit:       int   = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista narrativas detectadas con métricas de propagación."""
    filters = ["n.fecha_deteccion >= NOW() - :horas * INTERVAL '1 hour'"]
    params: dict[str, Any] = {"horas": horas, "min_riesgo": min_riesgo, "limit": limit}

    if tipo:
        filters.append("n.tipo = :tipo")
        params["tipo"] = tipo
    if min_riesgo > 0:
        filters.append("n.riesgo_narrativo >= :min_riesgo")
    if coordinadas is not None:
        filters.append("n.es_coordinada = :coordinada")
        params["coordinada"] = coordinadas

    where = " AND ".join(filters)
    r = await db.execute(text(f"""
        SELECT n.id, n.titulo, n.descripcion, n.tipo, n.tono,
               n.actores_mencionados, n.hashtags_clave,
               n.riesgo_narrativo, n.es_coordinada,
               n.n_posts, n.alcance_total,
               n.fecha_deteccion, n.actualizado_en,
               p.velocidad_por_hora,
               p.score_coordinacion,
               p.plataformas
        FROM narrativa n
        LEFT JOIN propagacion_narrativa p ON p.narrativa_id = n.id
        WHERE {where}
        ORDER BY n.riesgo_narrativo DESC, n.alcance_total DESC
        LIMIT :limit
    """), params)
    return [dict(row) for row in r.mappings()]


# ──────────────────────────────────────────────────────────────────────
# Detalle de narrativa
# ──────────────────────────────────────────────────────────────────────
@router.get("/narrativas/{nar_id}")
async def get_narrativa_detail(
    nar_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Detalle completo con posts más relevantes y métricas de propagación."""
    r_nar = await db.execute(text("""
        SELECT n.*,
               p.velocidad_por_hora, p.super_difusores,
               p.score_coordinacion, p.señales_coordinacion,
               p.plataformas
        FROM narrativa n
        LEFT JOIN propagacion_narrativa p ON p.narrativa_id = n.id
        WHERE n.id = :id
    """), {"id": nar_id})
    row = r_nar.mappings().fetchone()
    if not row:
        return {}

    result = dict(row)

    # Top posts de esta narrativa
    r_posts = await db.execute(text("""
        SELECT platform, url, texto, autor_handle,
               n_views, n_shares, engagement_rate,
               sentiment, toxicidad, publicado_en
        FROM social_post
        WHERE narrativa_id = :id
        ORDER BY engagement_rate DESC
        LIMIT 10
    """), {"id": nar_id})
    result["top_posts"] = [dict(p) for p in r_posts.mappings()]

    return result


# ──────────────────────────────────────────────────────────────────────
# Alertas de coordinación
# ──────────────────────────────────────────────────────────────────────
@router.get("/alertas")
async def list_alertas_osint(
    tipo:      str = Query(None),
    severidad: str = Query(None, description="alta|media|baja"),
    horas:     int = Query(72, ge=1, le=720),
    limit:     int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista alertas OSINT recientes (coordinación, spikes, desinformación)."""
    filters = ["creado_en >= NOW() - :horas * INTERVAL '1 hour'"]
    params: dict[str, Any] = {"horas": horas, "limit": limit}

    if tipo:
        filters.append("tipo = :tipo")
        params["tipo"] = tipo
    if severidad:
        filters.append("severidad = :sev")
        params["sev"] = severidad

    where = " AND ".join(filters)
    r = await db.execute(text(f"""
        SELECT id, tipo, severidad, descripcion, metadata, creado_en
        FROM alerta_osint
        WHERE {where}
        ORDER BY creado_en DESC
        LIMIT :limit
    """), params)
    return [dict(row) for row in r.mappings()]


# ──────────────────────────────────────────────────────────────────────
# Análisis de hashtag
# ──────────────────────────────────────────────────────────────────────
@router.get("/hashtag/{tag}")
async def analyze_hashtag(
    tag:   str,
    horas: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Análisis de tendencia y sentimiento de un hashtag."""
    tag_clean = tag.lstrip("#").lower()
    r = await db.execute(text("""
        SELECT
            COUNT(*)                           AS n_posts,
            SUM(n_views)                       AS alcance_total,
            SUM(n_shares)                      AS n_shares,
            AVG(sentiment)                     AS sentiment_medio,
            AVG(toxicidad)                     AS toxicidad_media,
            COUNT(DISTINCT autor_handle)       AS n_autores,
            array_agg(DISTINCT platform)       AS plataformas,
            MIN(publicado_en)                  AS primera_aparicion,
            MAX(publicado_en)                  AS ultima_aparicion
        FROM social_post
        WHERE hashtags::text ILIKE :tag
          AND ingerido_en >= NOW() - :horas * INTERVAL '1 hour'
    """), {"tag": f"%{tag_clean}%", "horas": horas})
    row = r.mappings().fetchone()
    return dict(row) if row else {}


# ──────────────────────────────────────────────────────────────────────
# Actores más activos
# ──────────────────────────────────────────────────────────────────────
@router.get("/actores/top")
async def get_top_actores(
    horas:  int = Query(24, ge=1, le=168),
    limit:  int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Top actores por alcance en redes sociales."""
    r = await db.execute(text("""
        SELECT
            autor_handle,
            autor_nombre,
            autor_seguidores,
            autor_tipo,
            platform,
            COUNT(*)                         AS n_posts,
            SUM(n_views + n_shares * 2)      AS alcance_ponderado,
            AVG(engagement_rate)             AS engagement_medio,
            AVG(toxicidad)                   AS toxicidad_media
        FROM social_post
        WHERE ingerido_en >= NOW() - :horas * INTERVAL '1 hour'
          AND autor_handle IS NOT NULL
        GROUP BY autor_handle, autor_nombre, autor_seguidores, autor_tipo, platform
        ORDER BY alcance_ponderado DESC
        LIMIT :limit
    """), {"horas": horas, "limit": limit})
    return [dict(row) for row in r.mappings()]


# ──────────────────────────────────────────────────────────────────────
# KPIs del dashboard
# ──────────────────────────────────────────────────────────────────────
@router.get("/estadisticas/dashboard")
async def get_osint_dashboard_kpis(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """KPIs consolidados para el panel OSINT."""
    r = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE ingerido_en >= NOW() - INTERVAL '1 hour') AS posts_ultima_hora,
            COUNT(*) FILTER (WHERE ingerido_en >= NOW() - INTERVAL '24 hours') AS posts_hoy,
            COUNT(*) FILTER (WHERE toxicidad >= 0.7 AND ingerido_en >= NOW() - INTERVAL '24 hours') AS posts_toxicos,
            AVG(sentiment) FILTER (WHERE ingerido_en >= NOW() - INTERVAL '24 hours') AS sentiment_medio,
            COUNT(DISTINCT autor_handle) FILTER (WHERE ingerido_en >= NOW() - INTERVAL '24 hours') AS autores_unicos,
            COUNT(*) FILTER (WHERE platform = 'twitter' AND ingerido_en >= NOW() - INTERVAL '24 hours') AS n_twitter,
            COUNT(*) FILTER (WHERE platform = 'telegram' AND ingerido_en >= NOW() - INTERVAL '24 hours') AS n_telegram,
            COUNT(*) FILTER (WHERE platform = 'youtube' AND ingerido_en >= NOW() - INTERVAL '24 hours') AS n_youtube,
            COUNT(*) FILTER (WHERE platform = 'mastodon' AND ingerido_en >= NOW() - INTERVAL '24 hours') AS n_mastodon
        FROM social_post
    """))
    posts_kpis = dict(r.mappings().fetchone() or {})

    r2 = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE fecha_deteccion >= NOW() - INTERVAL '24 hours') AS narrativas_hoy,
            COUNT(*) FILTER (WHERE es_coordinada AND fecha_deteccion >= NOW() - INTERVAL '24 hours') AS coordinadas_hoy,
            COUNT(*) FILTER (WHERE riesgo_narrativo >= 7 AND fecha_deteccion >= NOW() - INTERVAL '24 hours') AS alto_riesgo
        FROM narrativa
    """))
    nar_kpis = dict(r2.mappings().fetchone() or {})

    r3 = await db.execute(text("""
        SELECT COUNT(*) FILTER (WHERE creado_en >= NOW() - INTERVAL '24 hours') AS alertas_hoy
        FROM alerta_osint
    """))
    alerta_kpis = dict(r3.mappings().fetchone() or {})

    return {**posts_kpis, **nar_kpis, **alerta_kpis}


# ──────────────────────────────────────────────────────────────────────
# Triggers manuales (desarrollo)
# ──────────────────────────────────────────────────────────────────────
@router.post("/ingest/trigger")
async def trigger_osint_ingestion(
    fuente:   str  = Query("all", description="twitter | telegram | youtube | mastodon | all"),
    skip_nlp: bool = Query(False),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dispara manualmente la ingesta social y clustering."""
    from apps.workers.connectors.social_ingester import (
        ingest_twitter_stream, ingest_telegram_channels,
        ingest_youtube_comments, ingest_mastodon, enrich_posts,
    )
    from apps.workers.connectors.narrative_engine import save_social_posts

    ingester_map = {
        "twitter":  ingest_twitter_stream,
        "telegram": ingest_telegram_channels,
        "youtube":  ingest_youtube_comments,
        "mastodon": lambda: ingest_mastodon(),
    }

    posts: list[dict] = []
    if fuente == "all":
        for fn in ingester_map.values():
            try:
                posts.extend(await fn())
            except Exception as e:
                pass
    elif fuente in ingester_map:
        posts = await ingester_map[fuente]()
    else:
        return {"error": f"Fuente desconocida: {fuente}"}

    if not posts:
        return {"posts": 0}

    enriched = await enrich_posts(posts, skip_nlp=skip_nlp)
    stats = await save_social_posts(enriched, db)
    return stats


@router.post("/narrativas/cluster")
async def trigger_narrative_clustering(
    horas:     int  = Query(2, ge=1, le=24),
    skip_llm:  bool = Query(False),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dispara manualmente el clustering de narrativas."""
    from apps.workers.connectors.narrative_engine import run_narrative_clustering
    from sqlalchemy import text

    r = await db.execute(text("""
        SELECT platform, hash_id, texto_norm, hashtags,
               autor_handle, autor_seguidores,
               n_likes, n_shares, n_views,
               sentiment, toxicidad, engagement_rate,
               publicado_en
        FROM social_post
        WHERE ingerido_en >= NOW() - :h * INTERVAL '1 hour'
          AND relevancia_politica >= 3
        LIMIT 500
    """), {"h": horas})
    posts = [dict(row) for row in r.mappings()]
    if not posts:
        return {"posts": 0, "clusters": 0}

    return await run_narrative_clustering(posts, db, skip_llm=skip_llm)
