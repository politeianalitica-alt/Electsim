"""
Definicion de tareas periodicas para Celery Beat.
Todas las horas en timezone Europe/Madrid.
"""
from __future__ import annotations

from celery.schedules import crontab

BEAT_SCHEDULE: dict = {
    # ------------------------------------------------------------------
    # Ingesta incremental — cada hora en el minuto :15
    # ------------------------------------------------------------------
    "ingesta-incremental-cada-hora": {
        "task": "scheduler.tasks.ingesta.task_pipeline_mediatico_incremental",
        "schedule": crontab(minute=15),
        "options": {"queue": "ingesta"},
        "kwargs": {"max_por_medio": 20, "usar_trafilatura": False},
    },

    # ------------------------------------------------------------------
    # Ingesta completa — diaria a las 06:00 (con trafilatura)
    # ------------------------------------------------------------------
    "ingesta-completa-diaria": {
        "task": "scheduler.tasks.ingesta.task_pipeline_mediatico_completo",
        "schedule": crontab(hour=6, minute=0),
        "options": {"queue": "nlp"},
        "kwargs": {"max_por_medio": 50, "usar_trafilatura": True},
    },

    # ------------------------------------------------------------------
    # Pipeline Ollama — cada 30 minutos
    # ------------------------------------------------------------------
    "ollama-noticias-actores-30min": {
        "task": "scheduler.tasks.ollama.task_pipeline_noticias_actores",
        "schedule": crontab(minute="*/30"),
        "options": {"queue": "ollama"},
        "kwargs": {"limite": 30},
    },

    # ------------------------------------------------------------------
    # Backfill Ollama — diario a las 03:00 (procesa pendientes sin limite)
    # ------------------------------------------------------------------
    "ollama-backfill-diario": {
        "task": "scheduler.tasks.ollama.task_backfill_ollama",
        "schedule": crontab(hour=3, minute=0),
        "options": {"queue": "ollama"},
        "kwargs": {"limite": 500},
    },

    # ------------------------------------------------------------------
    # Briefings diarios — 07:30
    # ------------------------------------------------------------------
    "briefings-diarios-0730": {
        "task": "scheduler.tasks.ollama.task_briefings_diarios",
        "schedule": crontab(hour=7, minute=30),
        "options": {"queue": "ollama"},
    },

    # ------------------------------------------------------------------
    # Healthcheck — cada 5 minutos
    # ------------------------------------------------------------------
    "healthcheck-5min": {
        "task": "scheduler.tasks.mantenimiento.task_healthcheck_sistema",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "mantenimiento"},
    },

    # ------------------------------------------------------------------
    # Limpieza BD — diaria a las 02:00
    # ------------------------------------------------------------------
    "limpiar-bd-diario": {
        "task": "scheduler.tasks.mantenimiento.task_limpiar_bd",
        "schedule": crontab(hour=2, minute=0),
        "options": {"queue": "mantenimiento"},
    },

    # ------------------------------------------------------------------
    # VACUUM analitico — semanal lunes 04:00
    # ------------------------------------------------------------------
    "vacuum-bd-semanal": {
        "task": "scheduler.tasks.mantenimiento.task_vacuum_bd",
        "schedule": crontab(day_of_week=1, hour=4, minute=0),
        "options": {"queue": "mantenimiento"},
    },

    # ------------------------------------------------------------------
    # Intelligence Layer — Risk Scores diarios 06:00 (antes de briefings)
    # ------------------------------------------------------------------
    "intelligence-risk-scores-0600": {
        "task": "intelligence.task_score_all_clients",
        "schedule": crontab(hour=6, minute=0),
        "options": {"queue": "intelligence"},
        "kwargs": {"market_code": "spain"},
    },

    # ------------------------------------------------------------------
    # Intelligence Layer — Morning Briefings 06:30 UTC
    # Se dispara por cada cliente desde task_score_all_clients o manualmente.
    # El cron global actua como safety net para el cliente por defecto.
    # ------------------------------------------------------------------
    "intelligence-briefings-0630": {
        "task": "intelligence.task_morning_briefing",
        "schedule": crontab(hour=6, minute=30),
        "options": {"queue": "intelligence"},
        "kwargs": {"client_id": "default", "market_code": "spain"},
    },

    # ------------------------------------------------------------------
    # Intelligence Layer — Consumo de eventos Redis Stream cada 2 min
    # ------------------------------------------------------------------
    "intelligence-consume-events-2min": {
        "task": "intelligence.task_consume_intelligence_events",
        "schedule": crontab(minute="*/2"),
        "options": {"queue": "intelligence"},
        "kwargs": {"max_events": 20},
    },
}
