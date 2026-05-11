"""
RAG Scheduler — APScheduler que ejecuta `index_all()` diariamente.

Integración:
  - `start_scheduler()` se llama en `api/main.py:startup_checks` (opt-in
    vía env `RAG_SCHEDULER_ENABLED=1`).
  - Job principal: `daily_reindex_job` cada día a las 03:30 UTC.
  - Job opcional: `hourly_legal_update` cada hora para BOE solamente.
  - Endpoint REST `/api/rag/reindex` permite trigger manual.

Configuración por entorno:
  RAG_SCHEDULER_ENABLED       — '1' para activar (default off para no
                                 spamear procesos en dev).
  RAG_REINDEX_HOUR            — hora UTC del reindex completo (default 3)
  RAG_REINDEX_MINUTE          — minuto (default 30)
  RAG_HOURLY_BOE_ENABLED      — '1' para reindexar BOE cada hora.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

_scheduler: Optional[Any] = None
_last_run: dict[str, Any] = {"reindex_all": None, "hourly_legal": None}
_last_result: dict[str, Any] = {"reindex_all": None, "hourly_legal": None}


def daily_reindex_job() -> dict[str, int]:
    """Job diario: reindexa BOE + Congreso + EUR-Lex + medios + narrativas."""
    started = datetime.now(timezone.utc)
    logger.info("rag_scheduler.daily_reindex_job: comienza @ %s UTC", started.isoformat())
    try:
        from agents.brain.rag_indexer import index_all
        result = index_all(legal=True, parliament=True, eurlex=True, media=True, narratives=True)
        ended = datetime.now(timezone.utc)
        _last_run["reindex_all"] = ended.isoformat()
        _last_result["reindex_all"] = {**result, "duration_s": (ended - started).total_seconds()}
        logger.info("rag_scheduler.daily_reindex_job: %s", result)
        return result
    except Exception as e:
        logger.exception("rag_scheduler.daily_reindex_job failed: %s", e)
        _last_result["reindex_all"] = {"error": str(e)}
        return {}


def hourly_legal_update_job() -> int:
    """Job horario: reindexa solo BOE (datos legales muy frescos)."""
    started = datetime.now(timezone.utc)
    logger.info("rag_scheduler.hourly_legal_update_job: comienza @ %s UTC", started.isoformat())
    try:
        from agents.brain.rag_indexer import index_legal_items
        n = index_legal_items(limit=200)
        ended = datetime.now(timezone.utc)
        _last_run["hourly_legal"] = ended.isoformat()
        _last_result["hourly_legal"] = {"n": n, "duration_s": (ended - started).total_seconds()}
        logger.info("rag_scheduler.hourly_legal_update_job: %d documentos", n)
        return n
    except Exception as e:
        logger.exception("rag_scheduler.hourly_legal_update_job failed: %s", e)
        _last_result["hourly_legal"] = {"error": str(e)}
        return 0


def start_scheduler() -> bool:
    """
    Arranca el scheduler si la variable de entorno `RAG_SCHEDULER_ENABLED='1'`.
    Devuelve True si arrancó, False si está desactivado o ya estaba corriendo.
    """
    global _scheduler

    if os.getenv("RAG_SCHEDULER_ENABLED", "0") != "1":
        logger.info("rag_scheduler: desactivado (RAG_SCHEDULER_ENABLED!=1)")
        return False

    if _scheduler is not None:
        logger.info("rag_scheduler: ya estaba corriendo")
        return False

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError as e:
        logger.warning("rag_scheduler: apscheduler no disponible (%s)", e)
        return False

    hour = int(os.getenv("RAG_REINDEX_HOUR", "3"))
    minute = int(os.getenv("RAG_REINDEX_MINUTE", "30"))

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        daily_reindex_job,
        trigger=CronTrigger(hour=hour, minute=minute),
        id="rag_daily_reindex",
        name="RAG · reindex diario completo",
        replace_existing=True,
    )

    if os.getenv("RAG_HOURLY_BOE_ENABLED", "0") == "1":
        _scheduler.add_job(
            hourly_legal_update_job,
            trigger=CronTrigger(minute=15),  # minuto 15 de cada hora
            id="rag_hourly_legal",
            name="RAG · actualización horaria BOE",
            replace_existing=True,
        )

    _scheduler.start()
    logger.info(
        "rag_scheduler: arrancado · reindex diario @ %02d:%02d UTC · BOE horario=%s",
        hour, minute, os.getenv("RAG_HOURLY_BOE_ENABLED", "0"),
    )
    return True


def stop_scheduler() -> bool:
    """Para el scheduler si estaba corriendo."""
    global _scheduler
    if _scheduler is None:
        return False
    try:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("rag_scheduler: detenido")
        return True
    except Exception as e:
        logger.warning("rag_scheduler.stop_scheduler: %s", e)
        return False


def scheduler_status() -> dict[str, Any]:
    """Devuelve el estado del scheduler para el endpoint REST."""
    if _scheduler is None:
        return {
            "running": False,
            "enabled_env": os.getenv("RAG_SCHEDULER_ENABLED", "0") == "1",
            "last_run": _last_run,
            "last_result": _last_result,
        }

    jobs = []
    for job in _scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
        })
    return {
        "running": True,
        "enabled_env": True,
        "jobs": jobs,
        "last_run": _last_run,
        "last_result": _last_result,
    }
