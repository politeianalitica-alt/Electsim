"""
Tareas Celery para ingesta de prensa y pipeline mediatico.
Cola: ingesta (incremental) / nlp (completo con BERTopic).
"""
from __future__ import annotations

import asyncio
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from celery import shared_task
from celery.utils.log import get_task_logger

from config.settings import get_settings

logger = get_task_logger(__name__)

# ---------------------------------------------------------------------------
# helpers internos
# ---------------------------------------------------------------------------

def _run(coro):
    """Ejecuta una corrutina de forma sincrona desde un worker Celery."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("loop cerrado")
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def _pipeline_mediatico():
    """Importacion diferida para no penalizar el arranque del worker."""
    from etl.pipelines.pipeline_mediatico import PipelineMediatico
    return PipelineMediatico


# ---------------------------------------------------------------------------
# Tareas publicas
# ---------------------------------------------------------------------------

@shared_task(
    name="scheduler.tasks.ingesta.task_pipeline_mediatico_incremental",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    queue="ingesta",
)
def task_pipeline_mediatico_incremental(
    self,
    max_por_medio: int = 20,
    usar_trafilatura: bool = False,
    medios: list[str] | None = None,
):
    """
    Ingesta incremental de prensa.
    Se ejecuta cada hora. Si encuentra articulos nuevos, encadena el pipeline Ollama.
    """
    cfg = get_settings()
    inicio = datetime.now(timezone.utc)
    logger.info(
        "Iniciando ingesta incremental max_por_medio=%s trafilatura=%s",
        max_por_medio,
        usar_trafilatura,
    )

    try:
        Pipeline = _pipeline_mediatico()
        pipeline = Pipeline(db_url=cfg.database_url_asyncpg)

        resultado = _run(
            pipeline.ejecutar_completo(
                medios=medios,
                max_por_medio=max_por_medio,
                persistir=True,
                usar_trafilatura=usar_trafilatura,
            )
        )

        nuevos = resultado.get("articulos_persistidos", 0)
        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        logger.info(
            "Ingesta incremental completada: nuevos=%s duracion=%.1fs",
            nuevos,
            duracion,
        )

        # Encadenar pipeline Ollama si hay articulos nuevos
        if nuevos > 0:
            logger.info("Encadenando pipeline Ollama para %s articulos nuevos", nuevos)
            from scheduler.tasks.ollama import task_pipeline_noticias_actores
            task_pipeline_noticias_actores.apply_async(
                kwargs={"limite": min(nuevos, 50)},
                queue="ollama",
                countdown=10,
            )

        return {
            "estado": "ok",
            "articulos_nuevos": nuevos,
            "duracion_s": round(duracion, 1),
            "timestamp": inicio.isoformat(),
        }

    except Exception as exc:
        logger.error("Error en ingesta incremental: %s", exc)
        raise self.retry(exc=exc)


@shared_task(
    name="scheduler.tasks.ingesta.task_pipeline_mediatico_completo",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    queue="nlp",
    soft_time_limit=7200,   # 2 horas
    time_limit=7500,
)
def task_pipeline_mediatico_completo(
    self,
    max_por_medio: int = 50,
    usar_trafilatura: bool = True,
    medios: list[str] | None = None,
):
    """
    Pipeline completo con ingesta + NLP (BERTopic + sentimiento).
    Se ejecuta una vez al dia a las 06:00.
    """
    cfg = get_settings()
    inicio = datetime.now(timezone.utc)
    logger.info(
        "Iniciando pipeline completo max_por_medio=%s trafilatura=%s",
        max_por_medio,
        usar_trafilatura,
    )

    try:
        Pipeline = _pipeline_mediatico()
        pipeline = Pipeline(db_url=cfg.database_url_asyncpg)

        resultado = _run(
            pipeline.ejecutar_completo(
                medios=medios,
                max_por_medio=max_por_medio,
                persistir=True,
                usar_trafilatura=usar_trafilatura,
            )
        )

        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        articulos = resultado.get("articulos_persistidos", 0)
        topics = resultado.get("topics_detectados", 0)
        fimi = resultado.get("fimi_alertas", 0)

        logger.info(
            "Pipeline completo finalizado: articulos=%s topics=%s fimi=%s duracion=%.0fs",
            articulos,
            topics,
            fimi,
            duracion,
        )

        # Reentrenar BERTopic si hay suficientes datos
        if articulos >= 50:
            logger.info("Lanzando reentrenamiento BERTopic asincronamente")
            _run(pipeline.fase_reentrenamiento())

        return {
            "estado": "ok",
            "articulos_persistidos": articulos,
            "topics_detectados": topics,
            "fimi_alertas": fimi,
            "duracion_s": round(duracion, 1),
            "timestamp": inicio.isoformat(),
        }

    except Exception as exc:
        logger.error("Error en pipeline completo: %s", exc)
        raise self.retry(exc=exc)
