"""
Aplicacion Celery principal.
Cinco colas con prioridades y concurrencia distintas:
  ingesta       — I/O bound, concurrencia 4
  nlp           — RAM intensivo, concurrencia 2
  ollama        — GPU unica, concurrencia 1 (CRITICO)
  intelligence  — LLM intelligence layer, concurrencia 1 (comparte GPU)
  mantenimiento — bajo coste, concurrencia 1
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

# asegurar que el root del proyecto esta en sys.path
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from celery import Celery
from celery.signals import task_failure, task_postrun, task_prerun, worker_ready

from config.settings import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Instancia Celery
# ---------------------------------------------------------------------------

_cfg = get_settings()

app = Celery(
    "electsim",
    broker=_cfg.celery_broker_url,
    backend=_cfg.celery_result_backend,
    include=[
        "scheduler.tasks.ingesta",
        "scheduler.tasks.ollama",
        "scheduler.tasks.mantenimiento",
        "scheduler.tasks.intelligence",
    ],
)

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

app.conf.update(
    # serializers
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # timezone
    timezone="Europe/Madrid",
    enable_utc=True,
    # resultados
    result_expires=86400,  # 24 horas
    task_track_started=True,
    task_send_sent_event=True,
    # reintentos
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # limites de memoria (precaucion con BERTopic)
    worker_max_memory_per_child=1_500_000,  # 1.5 GB en KB
    # prefetch: 1 para colas pesadas
    worker_prefetch_multiplier=1,
    # beat schedule se carga desde beat_schedule.py
    beat_schedule_filename=str(_ROOT / "scheduler" / "celerybeat-schedule"),
)

# ---------------------------------------------------------------------------
# Enrutado de tareas a colas
# ---------------------------------------------------------------------------

app.conf.task_routes = {
    "scheduler.tasks.ingesta.*":       {"queue": "ingesta"},
    "scheduler.tasks.ollama.*":        {"queue": "ollama"},
    "scheduler.tasks.mantenimiento.*": {"queue": "mantenimiento"},
    "scheduler.tasks.intelligence.*":  {"queue": "intelligence"},
    "intelligence.*":                  {"queue": "intelligence"},
    "etl.pipeline.*":                  {"queue": "nlp"},
}

# Cola NLP para subtareas pesadas (BERTopic / pysentimiento)
app.conf.task_annotations = {
    "scheduler.tasks.ingesta.task_pipeline_mediatico_completo": {
        "queue": "nlp",
        "rate_limit": "2/h",
    },
}

# ---------------------------------------------------------------------------
# Beat schedule
# ---------------------------------------------------------------------------

from scheduler.beat_schedule import BEAT_SCHEDULE  # noqa: E402  (import after app creation)

app.conf.beat_schedule = BEAT_SCHEDULE

# ---------------------------------------------------------------------------
# Signals
# ---------------------------------------------------------------------------

@worker_ready.connect
def on_worker_ready(sender, **kwargs):
    logger.info("Celery worker listo: %s", sender)


@task_prerun.connect
def on_task_prerun(task_id, task, args, kwargs, **_):
    logger.debug("Tarea iniciada: %s [%s]", task.name, task_id)


@task_postrun.connect
def on_task_postrun(task_id, task, args, kwargs, retval, state, **_):
    logger.info("Tarea finalizada: %s [%s] estado=%s", task.name, task_id, state)


@task_failure.connect
def on_task_failure(task_id, exception, traceback, sender, **_):
    logger.error(
        "Tarea fallida: %s [%s] error=%s",
        sender.name,
        task_id,
        type(exception).__name__,
    )
