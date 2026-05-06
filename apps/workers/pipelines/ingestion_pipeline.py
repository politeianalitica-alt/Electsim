"""
Block 1 — Pipeline maestro de ingesta.

Orquesta todos los conectores con APScheduler + Celery.
Planificación:
  - RSS medios:       cada 15 min
  - BOE:              08:05 cada día
  - EUR-Lex:          09:00 lun/mie/vie
  - CCAA boletines:   09:30 cada día
  - Tier-1 nacionales: cada 5 min (alta frecuencia)
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import text

from apps.workers.connectors.media_sources import MEDIA_SOURCES, get_all_rss_sources
from apps.workers.connectors.rss_connector import ingest_source, build_article_record
from apps.workers.connectors.boe_connector import (
    ingest_boe_today,
    ingest_eurlex_recent,
    ingest_ccaa_all,
)
from observability.logging import get_logger
from observability.metrics import ETLMetrics

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

log = get_logger(__name__)


# ──────────────────────────────────────────────────────────────────────
# Persistencia de artículos
# ──────────────────────────────────────────────────────────────────────
async def _save_articles(articles: list[dict], db: "AsyncSession") -> dict:
    """Persiste lista de artículos en la tabla `article` con deduplicación."""
    stats = {"total": 0, "nuevos": 0, "duplicados": 0, "errores": 0}

    for art in articles:
        stats["total"] += 1
        record = build_article_record(art)

        try:
            # Deduplicación por hash_id
            existing = await db.execute(
                text("SELECT id FROM article WHERE hash_id = :h"),
                {"h": record["hash_id"]},
            )
            if existing.scalar():
                stats["duplicados"] += 1
                continue

            await db.execute(text("""
                INSERT INTO article (
                    hash_id, titulo, url, texto, fuente, fuente_url,
                    region, pais, familia_fuente, tier_fuente,
                    lat_fuente, lon_fuente, lat_evento, lon_evento, lugar_evento,
                    temas, entidades, sentiment, resumen, relevancia_cliente,
                    embedding, publicado_en, ingerido_en
                ) VALUES (
                    :hash_id, :titulo, :url, :texto, :fuente, :fuente_url,
                    :region, :pais, :familia_fuente, :tier_fuente,
                    :lat_fuente, :lon_fuente, :lat_evento, :lon_evento, :lugar_evento,
                    :temas::jsonb, :entidades::jsonb, :sentiment, :resumen, :relevancia_cliente,
                    :embedding::vector, :publicado_en, :ingerido_en
                ) ON CONFLICT (hash_id) DO NOTHING
            """), {
                **record,
                "temas":      str(record["temas"]),
                "entidades":  str(record["entidades"]),
                "embedding":  str(record["embedding"]) if record["embedding"] else None,
            })
            stats["nuevos"] += 1

        except Exception as e:
            log.warning(f"Error guardando artículo {record.get('url')}: {e}")
            stats["errores"] += 1
            await db.rollback()
            continue

    await db.commit()
    return stats


async def _save_legislation(docs: list[dict], db: "AsyncSession") -> dict:
    """Persiste normas legislativas enriquecidas."""
    stats = {"total": 0, "nuevos": 0, "duplicados": 0}

    for doc in docs:
        stats["total"] += 1
        numero = doc.get("numero_boe") or doc.get("numero_eur_lex") or ""
        titulo = doc.get("titulo", "")

        if not titulo:
            continue

        try:
            # Deduplicar por número_boe o título
            if numero:
                ex = await db.execute(
                    text("SELECT id FROM legislation WHERE numero_boe = :n OR numero_eur_lex = :n"),
                    {"n": numero},
                )
            else:
                ex = await db.execute(
                    text("SELECT id FROM legislation WHERE titulo = :t"),
                    {"t": titulo},
                )

            if ex.scalar():
                stats["duplicados"] += 1
                continue

            await db.execute(text("""
                INSERT INTO legislation (
                    tipo, titulo, titulo_corto, numero_boe, numero_eur_lex,
                    fuente, url_fuente, rango, departamento, ministerio, ccaa,
                    texto_completo, resumen_llm, resumen_ejecutivo,
                    temas, sectores_afectados,
                    score_impacto_economico, score_impacto_social,
                    score_impacto_empresas, score_urgencia_cliente,
                    estado, fecha_publicacion
                ) VALUES (
                    :tipo, :titulo, :titulo_corto, :numero_boe, :numero_eur_lex,
                    :fuente, :url_fuente, :rango, :departamento, :ministerio, :ccaa,
                    :texto_completo, :resumen_llm, :resumen_ejecutivo,
                    :temas::jsonb, :sectores_afectados::jsonb,
                    :score_impacto_economico, :score_impacto_social,
                    :score_impacto_empresas, :score_urgencia_cliente,
                    :estado, :fecha_publicacion
                )
            """), {
                "tipo":                    doc.get("tipo", "otro"),
                "titulo":                  titulo,
                "titulo_corto":            doc.get("titulo_corto", titulo[:120]),
                "numero_boe":              doc.get("numero_boe") or None,
                "numero_eur_lex":          doc.get("numero_eur_lex") or None,
                "fuente":                  doc.get("fuente", "BOE"),
                "url_fuente":              doc.get("url_fuente", ""),
                "rango":                   doc.get("rango", ""),
                "departamento":            doc.get("departamento", ""),
                "ministerio":              doc.get("ministerio", ""),
                "ccaa":                    doc.get("ccaa") or None,
                "texto_completo":          doc.get("texto_completo", "")[:50000],
                "resumen_llm":             doc.get("resumen_llm", ""),
                "resumen_ejecutivo":       doc.get("resumen_ejecutivo", ""),
                "temas":                   str(doc.get("temas", [])),
                "sectores_afectados":      str(doc.get("sectores_afectados", [])),
                "score_impacto_economico": doc.get("score_impacto_economico", 0.0),
                "score_impacto_social":    doc.get("score_impacto_social", 0.0),
                "score_impacto_empresas":  doc.get("score_impacto_empresas", 0.0),
                "score_urgencia_cliente":  doc.get("score_urgencia_cliente", 0.0),
                "estado":                  doc.get("estado", "publicado"),
                "fecha_publicacion":       doc.get("fecha_publicacion"),
            })
            stats["nuevos"] += 1

        except Exception as e:
            log.warning(f"Error guardando legislación {titulo[:60]}: {e}")
            await db.rollback()

    await db.commit()
    return stats


# ──────────────────────────────────────────────────────────────────────
# Trabajos de ingesta por familia
# ──────────────────────────────────────────────────────────────────────
async def run_rss_ingestion(
    db: "AsyncSession",
    *,
    familia: str | None = None,
    tier_max: int = 3,
    skip_llm: bool = False,
) -> dict:
    """
    Corre la ingesta RSS para las fuentes indicadas.
    `familia=None` → todas las familias con RSS.
    """
    sources = get_all_rss_sources()
    if familia:
        sources = [s for s in sources if s.get("familia") == familia]
    sources = [s for s in sources if s.get("tier", 3) <= tier_max]

    log.info(f"[Pipeline] Iniciando ingesta RSS: {len(sources)} fuentes (tier≤{tier_max})")
    total_stats = {"total": 0, "nuevos": 0, "duplicados": 0, "errores": 0, "fuentes": 0}

    for source in sources:
        try:
            articles = await ingest_source(source, skip_llm=skip_llm)
            if articles:
                stats = await _save_articles(articles, db)
                for k in ("total", "nuevos", "duplicados", "errores"):
                    total_stats[k] += stats[k]
                total_stats["fuentes"] += 1
        except Exception as e:
            log.error(f"Error procesando fuente {source.get('name')}: {e}")

    log.info(f"[Pipeline] RSS completado: {total_stats}")
    ETLMetrics.record_ingestion(
        source_type="rss",
        items=total_stats["nuevos"],
        errors=total_stats["errores"],
    )
    return total_stats


async def run_boe_ingestion(db: "AsyncSession") -> dict:
    """Ingesta diaria del BOE."""
    log.info("[Pipeline] Iniciando ingesta BOE")
    docs = await ingest_boe_today()
    stats = await _save_legislation(docs, db)
    log.info(f"[Pipeline] BOE: {stats}")
    ETLMetrics.record_ingestion(source_type="boe", items=stats["nuevos"], errors=0)
    return stats


async def run_eurlex_ingestion(db: "AsyncSession", days: int = 3) -> dict:
    """Ingesta EUR-Lex reciente."""
    log.info("[Pipeline] Iniciando ingesta EUR-Lex")
    docs = await ingest_eurlex_recent(days)
    stats = await _save_legislation(docs, db)
    log.info(f"[Pipeline] EUR-Lex: {stats}")
    ETLMetrics.record_ingestion(source_type="eurlex", items=stats["nuevos"], errors=0)
    return stats


async def run_ccaa_ingestion(db: "AsyncSession") -> dict:
    """Ingesta boletines autonómicos."""
    log.info("[Pipeline] Iniciando ingesta CCAA")
    docs = await ingest_ccaa_all()
    stats = await _save_legislation(docs, db)
    log.info(f"[Pipeline] CCAA: {stats}")
    ETLMetrics.record_ingestion(source_type="ccaa", items=stats["nuevos"], errors=0)
    return stats


# ──────────────────────────────────────────────────────────────────────
# APScheduler — orquestación temporal
# ──────────────────────────────────────────────────────────────────────
def _run_async(coro):
    """Ejecuta una corutina desde un contexto síncrono (APScheduler)."""
    from db.session import AsyncSessionLocal
    async def _inner():
        async with AsyncSessionLocal() as db:
            await coro(db)
    asyncio.run(_inner())


def start_ingestion_scheduler() -> BackgroundScheduler:
    """Arranca el scheduler de ingesta y retorna la instancia."""
    scheduler = BackgroundScheduler(timezone="Europe/Madrid")

    # Tier-1 nacionales: cada 5 min
    scheduler.add_job(
        lambda: _run_async(lambda db: run_rss_ingestion(db, familia="regional_spain", tier_max=1)),
        IntervalTrigger(minutes=5),
        id="rss_tier1", max_instances=1, coalesce=True,
    )

    # Medios locales españoles: cada 30 min
    scheduler.add_job(
        lambda: _run_async(lambda db: run_rss_ingestion(db, familia="local_spain", tier_max=2)),
        IntervalTrigger(minutes=30),
        id="rss_local", max_instances=1, coalesce=True,
    )

    # Think tanks + Europa + LATAM: cada hora
    scheduler.add_job(
        lambda: _run_async(lambda db: run_rss_ingestion(db, tier_max=3, skip_llm=False)),
        IntervalTrigger(minutes=60),
        id="rss_global", max_instances=1,
    )

    # BOE: 08:05 cada día
    scheduler.add_job(
        lambda: _run_async(run_boe_ingestion),
        CronTrigger(hour=8, minute=5, timezone="Europe/Madrid"),
        id="boe_daily", max_instances=1,
    )

    # EUR-Lex: 09:00 lun/mie/vie
    scheduler.add_job(
        lambda: _run_async(lambda db: run_eurlex_ingestion(db, days=3)),
        CronTrigger(day_of_week="mon,wed,fri", hour=9, minute=0, timezone="Europe/Madrid"),
        id="eurlex", max_instances=1,
    )

    # CCAA boletines: 09:30 cada día
    scheduler.add_job(
        lambda: _run_async(run_ccaa_ingestion),
        CronTrigger(hour=9, minute=30, timezone="Europe/Madrid"),
        id="ccaa_boletines", max_instances=1,
    )

    scheduler.start()
    log.info("✅ Ingestion scheduler iniciado")
    return scheduler
