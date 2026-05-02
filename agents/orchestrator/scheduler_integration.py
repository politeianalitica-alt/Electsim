"""
Integracion del orchestrator con APScheduler.

Registra los playbooks como jobs programados. Diseñado para integrarse
con el APScheduler ya presente en el proyecto (via etl/sources/agendas_dinamicas.py).

Uso (en el worker principal):
    from agents.orchestrator.scheduler_integration import register_jobs
    register_jobs(scheduler)

Tambien compatible con Celery Beat via task_routes.

Nota: el engine Ollama se crea dentro de cada tarea async para
garantizar aislamiento entre ejecuciones.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

MARKET_ID = os.getenv("DEFAULT_MARKET_ID", "ES")


# ---------------------------------------------------------------------------
# Funciones de tarea (llamadas por el scheduler)
# ---------------------------------------------------------------------------

def run_morning_briefing_job() -> None:
    """Job sincrono para APScheduler."""
    asyncio.run(_async_morning_briefing())


async def _async_morning_briefing() -> None:
    """Implementacion async del morning briefing job."""
    logger.info("morning_briefing_job: iniciando")

    # Obtener textos del dia (desde BD o fuentes configuradas)
    texts = await _fetch_today_texts()
    if not texts:
        logger.warning("morning_briefing_job: sin textos disponibles")
        return

    try:
        from agents.orchestrator.playbooks.morning_briefing import run_morning_briefing

        result = await run_morning_briefing(
            texts=texts,
            market_id=MARKET_ID,
        )

        # Persistir briefing en BD
        briefing = result.get("output_briefing", {})
        if briefing:
            await _persist_briefing(briefing)

        # Procesar alertas
        alerts = result.get("output_alerts", [])
        logger.info("morning_briefing_job: %d alertas generadas", len(alerts))

    except Exception as exc:
        logger.exception("morning_briefing_job error: %s", exc)


async def _fetch_today_texts() -> list[str]:
    """
    Obtiene los textos del dia desde la BD.
    Fallback a lista vacia si no hay BD disponible.
    """
    try:
        from db.models import SessionLocal
        from sqlalchemy import text
        from datetime import date

        with SessionLocal() as session:
            result = session.execute(text("""
                SELECT titulo || ' ' || COALESCE(resumen, '') AS texto
                FROM noticias_medios
                WHERE fecha_publicacion >= :today
                ORDER BY fecha_publicacion DESC
                LIMIT 50
            """), {"today": date.today()})
            return [row.texto for row in result if row.texto]
    except Exception as exc:
        logger.debug("_fetch_today_texts fallback: %s", exc)
        return []


async def _persist_briefing(briefing: dict[str, Any]) -> None:
    """Guarda el briefing en la tabla intel_briefings (si existe)."""
    try:
        from db.models import SessionLocal
        from sqlalchemy import text
        import json

        with SessionLocal() as session:
            session.execute(text("""
                INSERT INTO intel_briefings
                    (type, title, executive_summary, content_json, created_at)
                VALUES (:type, :title, :summary, :content, NOW())
                ON CONFLICT DO NOTHING
            """), {
                "type": briefing.get("type", "morning_briefing"),
                "title": briefing.get("title", ""),
                "summary": briefing.get("executive_summary", "")[:500],
                "content": json.dumps(briefing, ensure_ascii=False),
            })
            session.commit()
    except Exception as exc:
        logger.debug("_persist_briefing: %s (tabla puede no existir)", exc)


# ---------------------------------------------------------------------------
# Registro de jobs
# ---------------------------------------------------------------------------

def register_jobs(scheduler: Any) -> None:
    """
    Registra los jobs del orchestrator en APScheduler.

    Args:
        scheduler: instancia de APScheduler (BackgroundScheduler o AsyncIOScheduler)
    """
    from agents.orchestrator.playbooks.morning_briefing import schedule_config

    config = schedule_config()
    cron = config["cron"].split()  # "30 6 * * 1-5"

    try:
        scheduler.add_job(
            run_morning_briefing_job,
            trigger="cron",
            minute=int(cron[0]),
            hour=int(cron[1]),
            day_of_week=cron[4],
            id="morning_briefing",
            name="Morning Briefing Inteligencia",
            replace_existing=True,
            misfire_grace_time=600,
        )
        logger.info("Job morning_briefing registrado: %s", config["cron"])
    except Exception as exc:
        logger.warning("register_jobs: no se pudo registrar morning_briefing: %s", exc)
