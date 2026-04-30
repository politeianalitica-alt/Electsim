"""
Tareas Celery para pipeline Ollama: NER, embeddings, RAG y briefings.
Cola: ollama — concurrencia 1 (GPU unica).
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
# helpers
# ---------------------------------------------------------------------------

def _run(coro):
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError("loop cerrado")
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Tareas
# ---------------------------------------------------------------------------

@shared_task(
    name="scheduler.tasks.ollama.task_pipeline_noticias_actores",
    bind=True,
    max_retries=3,
    default_retry_delay=180,
    queue="ollama",
    soft_time_limit=1800,
    time_limit=2100,
)
def task_pipeline_noticias_actores(self, limite: int = 30):
    """
    Procesa noticias pendientes con Ollama: resumen, NER, embedding y vinculacion a actores.
    Se ejecuta cada 30 minutos y tambien como callback de ingesta.
    """
    cfg = get_settings()
    inicio = datetime.now(timezone.utc)
    logger.info("Iniciando pipeline noticias-actores limite=%s", limite)

    try:
        from agents.ollama.news_processor import NewsProcessor

        async def _ejecutar():
            processor = NewsProcessor(db_url=cfg.database_url_asyncpg)
            pendientes = await processor.obtener_pendientes(limite=limite)
            if not pendientes:
                return {"procesados": 0}

            logger.info("Procesando %s noticias con Ollama", len(pendientes))
            resultados = []
            for art in pendientes:
                try:
                    r = await processor.procesar_articulo(art)
                    resultados.append(r)
                except Exception as e:
                    logger.warning(
                        "Error procesando articulo id=%s: %s",
                        art.get("id"),
                        e,
                    )
            return {"procesados": len(resultados)}

        resultado = _run(_ejecutar())
        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        logger.info(
            "Pipeline noticias-actores completado: procesados=%s duracion=%.1fs",
            resultado.get("procesados", 0),
            duracion,
        )

        return {
            "estado": "ok",
            "procesados": resultado.get("procesados", 0),
            "duracion_s": round(duracion, 1),
            "timestamp": inicio.isoformat(),
        }

    except Exception as exc:
        logger.error("Error en pipeline noticias-actores: %s", exc)
        raise self.retry(exc=exc)


@shared_task(
    name="scheduler.tasks.ollama.task_backfill_ollama",
    bind=True,
    max_retries=1,
    default_retry_delay=600,
    queue="ollama",
    soft_time_limit=10800,  # 3 horas
    time_limit=11100,
)
def task_backfill_ollama(self, limite: int = 500):
    """
    Reprocesa en lotes los articulos mas antiguos sin embedding ni resumen.
    Se ejecuta a las 03:00 para no competir con las tareas diurnas.
    """
    cfg = get_settings()
    inicio = datetime.now(timezone.utc)
    logger.info("Iniciando backfill Ollama limite=%s", limite)

    try:
        from agents.ollama.news_processor import NewsProcessor

        async def _ejecutar():
            processor = NewsProcessor(db_url=cfg.database_url_asyncpg)
            lote_size = 50
            total_procesados = 0
            while total_procesados < limite:
                restante = min(lote_size, limite - total_procesados)
                pendientes = await processor.obtener_pendientes(limite=restante)
                if not pendientes:
                    break

                for art in pendientes:
                    try:
                        await processor.procesar_articulo(art)
                        total_procesados += 1
                    except Exception as e:
                        logger.warning(
                            "Backfill: error en articulo id=%s: %s",
                            art.get("id"),
                            e,
                        )

                logger.info("Backfill progreso: %s/%s", total_procesados, limite)

            return total_procesados

        procesados = _run(_ejecutar())
        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        logger.info(
            "Backfill completado: procesados=%s duracion=%.0fs",
            procesados,
            duracion,
        )

        return {
            "estado": "ok",
            "procesados": procesados,
            "duracion_s": round(duracion, 1),
            "timestamp": inicio.isoformat(),
        }

    except Exception as exc:
        logger.error("Error en backfill Ollama: %s", exc)
        raise self.retry(exc=exc)


@shared_task(
    name="scheduler.tasks.ollama.task_briefings_diarios",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    queue="ollama",
    soft_time_limit=3600,
    time_limit=3900,
)
def task_briefings_diarios(self):
    """
    Genera briefings diarios para todos los actores con actividad reciente.
    Se ejecuta a las 07:30.
    """
    cfg = get_settings()
    inicio = datetime.now(timezone.utc)
    logger.info("Generando briefings diarios")

    try:
        from agents.ollama.actor_context_rag import ActorContextRAG

        async def _ejecutar():
            rag = ActorContextRAG(db_url=cfg.database_url_asyncpg)

            # Obtener actores con actividad en las ultimas 24h
            import asyncpg
            conn_url = cfg.database_url_asyncpg.replace(
                "postgresql+asyncpg://", "postgresql://"
            )
            conn = await asyncpg.connect(conn_url)
            try:
                rows = await conn.fetch(
                    """
                    SELECT DISTINCT actor_id
                    FROM noticias_actores
                    WHERE fecha_vinculacion > NOW() - INTERVAL '24 hours'
                    ORDER BY actor_id
                    """
                )
                actor_ids = [r["actor_id"] for r in rows]
            finally:
                await conn.close()

            logger.info("Actores con actividad reciente: %s", len(actor_ids))
            generados = 0
            for actor_id in actor_ids:
                try:
                    briefing = await rag.generar_briefing_si_necesario(
                        actor_id=actor_id,
                        umbral_noticias=5,
                    )
                    if briefing:
                        generados += 1
                        logger.debug("Briefing generado para actor_id=%s", actor_id)
                except Exception as e:
                    logger.warning(
                        "Error generando briefing actor_id=%s: %s",
                        actor_id,
                        e,
                    )

            return {"actores": len(actor_ids), "generados": generados}

        resultado = _run(_ejecutar())
        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        logger.info(
            "Briefings diarios completados: actores=%s generados=%s duracion=%.0fs",
            resultado.get("actores", 0),
            resultado.get("generados", 0),
            duracion,
        )

        return {
            "estado": "ok",
            **resultado,
            "duracion_s": round(duracion, 1),
            "timestamp": inicio.isoformat(),
        }

    except Exception as exc:
        logger.error("Error en briefings diarios: %s", exc)
        raise self.retry(exc=exc)


@shared_task(
    name="scheduler.tasks.ollama.task_briefing_actor_on_demand",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="ollama",
    soft_time_limit=300,
    time_limit=360,
)
def task_briefing_actor_on_demand(self, actor_id: int):
    """
    Genera un briefing inmediato para un actor concreto (llamada on-demand desde dashboard).
    """
    cfg = get_settings()
    inicio = datetime.now(timezone.utc)
    logger.info("Briefing on-demand para actor_id=%s", actor_id)

    try:
        from agents.ollama.actor_context_rag import ActorContextRAG

        async def _ejecutar():
            rag = ActorContextRAG(db_url=cfg.database_url_asyncpg)
            return await rag.generar_briefing_si_necesario(
                actor_id=actor_id,
                umbral_noticias=0,  # forzar generacion
            )

        briefing = _run(_ejecutar())
        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        logger.info(
            "Briefing on-demand completado actor_id=%s duracion=%.1fs",
            actor_id,
            duracion,
        )

        return {
            "estado": "ok",
            "actor_id": actor_id,
            "briefing_generado": bool(briefing),
            "duracion_s": round(duracion, 1),
            "timestamp": inicio.isoformat(),
        }

    except Exception as exc:
        logger.error("Error en briefing on-demand actor_id=%s: %s", actor_id, exc)
        raise self.retry(exc=exc)
