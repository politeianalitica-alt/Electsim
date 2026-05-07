"""
Block 5 — Pipeline OSINT: redes sociales + narrativas.

Scheduling:
  - Social ingestion:   cada 30 min (todas las plataformas)
  - Narrative clustering: cada 60 min
  - Propagation metrics:  cada 15 min
  - Coordination detection: cada 6 h
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import text

from apps.workers.connectors.social_ingester import (
    ingest_twitter_stream,
    ingest_telegram_channels,
    ingest_youtube_comments,
    ingest_mastodon,
    enrich_posts,
)
from apps.workers.connectors.narrative_engine import (
    run_narrative_clustering,
    save_social_posts,
    detect_coordinated_behavior,
    compute_propagation_metrics,
)
from observability.logging import get_logger
from observability.metrics import ETLMetrics

log = get_logger(__name__)


# ──────────────────────────────────────────────────────────────────────
# Job: ingesta social completa
# ──────────────────────────────────────────────────────────────────────
async def run_social_ingestion(db, *, skip_nlp: bool = False) -> dict:
    """Ingiere de todas las plataformas y persiste posts enriquecidos."""
    log.info("[OSINT] Iniciando ingesta social")
    all_posts: list[dict] = []

    # Recolectar de todas las plataformas
    results = await asyncio.gather(
        ingest_twitter_stream(),
        ingest_youtube_comments(),
        ingest_mastodon(instance="mastodon.social", hashtag="España"),
        ingest_mastodon(instance="mastodon.social", hashtag="Congreso"),
        return_exceptions=True,
    )

    for r in results:
        if isinstance(r, list):
            all_posts.extend(r)
        elif isinstance(r, Exception):
            log.warning(f"[OSINT] Plataforma falló: {r}")

    # Telegram se ejecuta separado (requiere auth diferente)
    try:
        tg_posts = await ingest_telegram_channels()
        all_posts.extend(tg_posts)
    except Exception as e:
        log.warning(f"[OSINT] Telegram falló: {e}")

    if not all_posts:
        log.info("[OSINT] Sin posts nuevos")
        return {"total": 0, "nuevos": 0}

    # Enriquecer con NLP
    enriched = await enrich_posts(all_posts, skip_nlp=skip_nlp)

    # Persistir
    stats = await save_social_posts(enriched, db)

    ETLMetrics.record_ingestion(
        source_type="social",
        items=stats["nuevos"],
        errors=0,
    )
    log.info(f"[OSINT] Social: {stats}")
    return stats


# ──────────────────────────────────────────────────────────────────────
# Job: clustering de narrativas
# ──────────────────────────────────────────────────────────────────────
async def run_narrative_job(db) -> dict:
    """Lee posts recientes (últimas 2h) y agrupa en narrativas."""
    log.info("[OSINT] Clustering de narrativas")
    try:
        r = await db.execute(text("""
            SELECT platform, external_id, hash_id, url,
                   texto, texto_norm, hashtags, menciones,
                   autor_id, autor_handle, autor_nombre,
                   autor_seguidores, autor_verificado, autor_tipo,
                   n_likes, n_shares, n_replies, n_views,
                   sentiment, toxicidad, emocion, entidades_ner,
                   engagement_rate, publicado_en
            FROM social_post
            WHERE ingerido_en >= NOW() - INTERVAL '2 hours'
              AND relevancia_politica >= 3
            ORDER BY ingerido_en DESC
            LIMIT 500
        """))
        posts = [dict(row) for row in r.mappings()]
    except Exception as e:
        log.error(f"[OSINT] Error cargando posts para clustering: {e}")
        return {}

    if not posts:
        return {"posts": 0, "clusters": 0}

    stats = await run_narrative_clustering(posts, db)
    log.info(f"[OSINT] Narrativas: {stats}")
    return stats


# ──────────────────────────────────────────────────────────────────────
# Job: propagación en tiempo real (15 min)
# ──────────────────────────────────────────────────────────────────────
async def run_propagation_job(db) -> dict:
    """Actualiza métricas de propagación para narrativas activas."""
    log.info("[OSINT] Actualizando propagación")
    try:
        r = await db.execute(text("""
            SELECT n.id, array_agg(sp.hash_id) AS post_hashes
            FROM narrativa n
            JOIN social_post sp ON sp.narrativa_id = n.id
            WHERE n.actualizado_en >= NOW() - INTERVAL '6 hours'
            GROUP BY n.id
            LIMIT 50
        """))
        rows = r.mappings().fetchall()
    except Exception as e:
        log.warning(f"[OSINT] Error en propagation job: {e}")
        return {}

    updated = 0
    for row in rows:
        nar_id = row["id"]
        try:
            r2 = await db.execute(text("""
                SELECT n_views, n_shares, n_likes, autor_handle,
                       autor_nombre, autor_seguidores, publicado_en,
                       platform, hashtags, texto_norm
                FROM social_post
                WHERE narrativa_id = :id
                  AND ingerido_en >= NOW() - INTERVAL '6 hours'
            """), {"id": nar_id})
            posts = [dict(row) for row in r2.mappings()]
            if not posts:
                continue

            prop  = compute_propagation_metrics(posts)
            coord = detect_coordinated_behavior(posts)

            await db.execute(text("""
                UPDATE propagacion_narrativa
                SET velocidad_por_hora = :vel,
                    score_coordinacion = :cs,
                    calculado_en = NOW()
                WHERE narrativa_id = :id
            """), {
                "vel": prop["velocidad_por_hora"],
                "cs":  coord["score_coordinacion"],
                "id":  nar_id,
            })
            updated += 1
        except Exception as e:
            log.warning(f"[OSINT] Error actualizando propagación {nar_id}: {e}")

    await db.commit()
    log.info(f"[OSINT] Propagación: {updated} narrativas actualizadas")
    return {"actualizadas": updated}


# ──────────────────────────────────────────────────────────────────────
# Job: detección de coordinación profunda (6h)
# ──────────────────────────────────────────────────────────────────────
async def run_coordination_scan(db) -> dict:
    """Escanea posts de las últimas 12h en busca de coordinación inorgánica."""
    log.info("[OSINT] Escaneo de coordinación")
    try:
        r = await db.execute(text("""
            SELECT platform, hash_id, texto_norm, hashtags,
                   autor_handle, autor_seguidores,
                   n_likes, n_shares, n_views,
                   engagement_rate, publicado_en
            FROM social_post
            WHERE ingerido_en >= NOW() - INTERVAL '12 hours'
            ORDER BY ingerido_en DESC
            LIMIT 2000
        """))
        posts = [dict(row) for row in r.mappings()]
    except Exception as e:
        log.error(f"[OSINT] Error en coordination scan: {e}")
        return {}

    if not posts:
        return {"posts": 0}

    result = detect_coordinated_behavior(posts)

    if result["es_coordinada"]:
        log.warning(
            f"[OSINT] COORDINACIÓN DETECTADA "
            f"(score={result['score_coordinacion']}, "
            f"señales={len(result['señales'])})"
        )
        # Registrar alerta en BD
        try:
            await db.execute(text("""
                INSERT INTO alerta_osint (
                    tipo, severidad, descripcion, metadata, creado_en
                ) VALUES (
                    'coordinacion_inorganica', 'alta',
                    :desc, :meta::jsonb, NOW()
                )
            """), {
                "desc": f"Comportamiento coordinado detectado: {len(result['señales'])} señales",
                "meta": __import__("json").dumps(result),
            })
            await db.commit()
        except Exception as e:
            await db.rollback()
            log.warning(f"[OSINT] Error guardando alerta coordinación: {e}")

    log.info(f"[OSINT] Coordinación: score={result['score_coordinacion']}")
    return result


# ──────────────────────────────────────────────────────────────────────
# APScheduler — orquestación
# ──────────────────────────────────────────────────────────────────────
def _run_async(coro):
    from db.session import AsyncSessionLocal
    async def _inner():
        async with AsyncSessionLocal() as db:
            await coro(db)
    asyncio.run(_inner())


def start_osint_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="Europe/Madrid")

    # Ingesta social: cada 30 min
    scheduler.add_job(
        lambda: _run_async(run_social_ingestion),
        IntervalTrigger(minutes=30),
        id="social_ingest", max_instances=1, coalesce=True,
    )

    # Clustering narrativas: cada 60 min
    scheduler.add_job(
        lambda: _run_async(run_narrative_job),
        IntervalTrigger(minutes=60),
        id="narrative_cluster", max_instances=1, coalesce=True,
    )

    # Propagación: cada 15 min
    scheduler.add_job(
        lambda: _run_async(run_propagation_job),
        IntervalTrigger(minutes=15),
        id="propagation_metrics", max_instances=1, coalesce=True,
    )

    # Detección coordinación: cada 6 h
    scheduler.add_job(
        lambda: _run_async(run_coordination_scan),
        IntervalTrigger(hours=6),
        id="coordination_scan", max_instances=1,
    )

    scheduler.start()
    log.info("OSINT scheduler iniciado")
    return scheduler
