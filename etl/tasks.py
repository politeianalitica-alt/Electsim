"""
Tareas Celery del pipeline event-driven (Bloque 3).

Se registran en el app de scheduler.celery_app (no crean una instancia nueva).
Cola por defecto: 'nlp' (CPU intensivo).
La ingesta usa la cola 'ingesta' (I/O bound, concurrencia 4).

Tareas expuestas:
    task_process_ingestion_event   — procesa un IngestionEvent serializado
    task_run_ingestion_cycle       — lanza un ciclo de ingesta para un mercado+fuente
    task_full_pipeline_for_market  — pipeline completo para todas las fuentes de un mercado
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)


def _get_celery_app():
    """Import lazy para evitar importacion circular al cargar el modulo."""
    from scheduler.celery_app import app
    return app


def _run(coro):
    """Ejecuta corutina async desde contexto Celery sync."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result(timeout=300)
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Tarea: procesar un IngestionEvent individual
# ---------------------------------------------------------------------------

def task_process_ingestion_event(
    event_dict: dict[str, Any],
    market_code: str = "",
    source_id: str = "",
    skip_steps: list[str] | None = None,
) -> dict[str, Any]:
    """
    Procesa un unico IngestionEvent y retorna el PipelineResult serializado.

    Args:
        event_dict:   Diccionario serializable que representa el IngestionEvent.
        market_code:  Usado solo si event_dict no lo incluye.
        source_id:    Usado solo si event_dict no lo incluye.
        skip_steps:   Pasos a omitir (util para tests o ejecucion parcial).

    Retorna:
        dict con las claves de PipelineResult (serializado a JSON-safe).
    """
    from etl.pipeline.models import IngestionEvent
    from etl.pipeline.runner import run_pipeline_for_event

    # Completar campos faltantes si se pasaron por separado
    if not event_dict.get("market_code") and market_code:
        event_dict["market_code"] = market_code
    if not event_dict.get("source_id") and source_id:
        event_dict["source_id"] = source_id

    event = IngestionEvent.model_validate(event_dict)
    result = run_pipeline_for_event(event, skip_steps=skip_steps)

    return result.model_dump(mode="json")


# ---------------------------------------------------------------------------
# Tarea: ciclo de ingesta para una fuente concreta
# ---------------------------------------------------------------------------

def task_run_ingestion_cycle(
    market_code: str,
    source_type: str | None = None,
    only_enabled: bool = True,
) -> dict[str, Any]:
    """
    Lanza un ciclo completo de ingesta (fetch + pipeline) para un mercado.

    Cada item ingestado se encola inmediatamente como task_process_ingestion_event
    en la cola 'nlp'.

    Retorna estadisticas del ciclo.
    """
    from config.market_loader import load_market_config
    from api.context.market_context import MarketContext
    from etl.factory import run_ingestion_cycle

    try:
        config = load_market_config(market_code)
        market = MarketContext(market_code=market_code, config=config)
        source_types = [source_type] if source_type else None

        stats = _run(run_ingestion_cycle(
            market,
            only_enabled=only_enabled,
            source_types=source_types,
        ))
        return stats or {"status": "ok", "market_code": market_code}
    except Exception as exc:
        logger.error("task_run_ingestion_cycle error [%s]: %s", market_code, exc)
        return {"status": "error", "market_code": market_code, "error": str(exc)}


# ---------------------------------------------------------------------------
# Tarea: pipeline completo para todos los mercados disponibles
# ---------------------------------------------------------------------------

def task_full_pipeline_all_markets() -> dict[str, Any]:
    """
    Ejecuta task_run_ingestion_cycle para todos los mercados disponibles.
    Retorna mapa market_code -> resultado.
    """
    from config.market_loader import list_available_markets

    results = {}
    for market_code in list_available_markets():
        results[market_code] = task_run_ingestion_cycle(market_code)
    return results


# ---------------------------------------------------------------------------
# Registro de tareas en Celery
# (se ejecuta solo cuando el modulo se importa con Celery disponible)
# ---------------------------------------------------------------------------

def _register_tasks() -> None:
    """
    Registra las funciones anteriores como tareas Celery.
    Se llama de forma lazy para no romper imports en tests sin Celery.
    """
    try:
        app = _get_celery_app()

        global task_process_ingestion_event, task_run_ingestion_cycle, task_full_pipeline_all_markets

        task_process_ingestion_event = app.task(
            name="etl.pipeline.process_ingestion_event",
            queue="nlp",
            max_retries=2,
            default_retry_delay=30,
            bind=False,
        )(task_process_ingestion_event)

        task_run_ingestion_cycle = app.task(
            name="etl.pipeline.run_ingestion_cycle",
            queue="ingesta",
            max_retries=1,
            default_retry_delay=60,
        )(task_run_ingestion_cycle)

        task_full_pipeline_all_markets = app.task(
            name="etl.pipeline.full_pipeline_all_markets",
            queue="ingesta",
        )(task_full_pipeline_all_markets)

        logger.info("Tareas ETL pipeline registradas en Celery")
    except Exception as exc:
        logger.debug("Celery no disponible — tareas ETL no registradas: %s", exc)


# Intentar registro automatico si Celery esta disponible
try:
    _register_tasks()
except Exception:
    pass
