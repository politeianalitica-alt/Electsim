"""
Tareas Celery de mantenimiento: healthcheck, limpieza BD, vacuum.
Cola: mantenimiento — concurrencia 1, bajo coste.
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

# Redis client compartido (inicializado bajo demanda)
_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis as _redis
            cfg = get_settings()
            _redis_client = _redis.from_url(cfg.redis_url, decode_responses=True)
        except Exception as e:
            logger.warning("No se pudo conectar a Redis: %s", e)
    return _redis_client


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
    name="scheduler.tasks.mantenimiento.task_healthcheck_sistema",
    bind=True,
    max_retries=0,
    queue="mantenimiento",
    soft_time_limit=30,
    time_limit=45,
)
def task_healthcheck_sistema(self):
    """
    Comprueba la disponibilidad de los servicios criticos.
    Guarda estado en Redis para que el dashboard lo consuma.
    Intervalo: cada 5 minutos.
    """
    cfg = get_settings()
    ts = datetime.now(timezone.utc).isoformat()

    estado = {
        "timestamp": ts,
        "postgres": "DESCONOCIDO",
        "redis": "DESCONOCIDO",
        "ollama": "DESCONOCIDO",
    }

    # --- postgres ---
    try:
        import asyncpg
        conn_url = cfg.database_url_asyncpg.replace(
            "postgresql+asyncpg://", "postgresql://"
        )

        async def _check_pg():
            conn = await asyncpg.connect(conn_url, timeout=5)
            await conn.fetchval("SELECT 1")
            await conn.close()

        _run(_check_pg())
        estado["postgres"] = "OK"
    except Exception as e:
        estado["postgres"] = f"ERROR: {type(e).__name__}"
        logger.warning("Healthcheck postgres: %s", e)

    # --- redis ---
    try:
        rc = _get_redis()
        if rc and rc.ping():
            estado["redis"] = "OK"
        else:
            estado["redis"] = "ERROR: ping fallido"
    except Exception as e:
        estado["redis"] = f"ERROR: {type(e).__name__}"
        logger.warning("Healthcheck redis: %s", e)

    # --- ollama ---
    try:
        from agents.ollama.ollama_client import OllamaClient

        async def _check_ollama():
            client = OllamaClient(base_url=cfg.ollama_base_url)
            return await client.healthcheck()

        ok = _run(_check_ollama())
        estado["ollama"] = "OK" if ok else "DEGRADADO"
    except Exception as e:
        estado["ollama"] = f"ERROR: {type(e).__name__}"
        logger.warning("Healthcheck ollama: %s", e)

    # Persistir en Redis para que el dashboard lo lea
    try:
        rc = _get_redis()
        if rc:
            import json
            rc.setex("electsim:healthcheck", 600, json.dumps(estado))
    except Exception as e:
        logger.debug("No se pudo guardar healthcheck en Redis: %s", e)

    todos_ok = all(v == "OK" for k, v in estado.items() if k != "timestamp")
    nivel = "OK" if todos_ok else "DEGRADADO"
    logger.info("Healthcheck %s: %s", nivel, estado)

    return {"nivel": nivel, **estado}


@shared_task(
    name="scheduler.tasks.mantenimiento.task_limpiar_bd",
    bind=True,
    max_retries=2,
    default_retry_delay=600,
    queue="mantenimiento",
    soft_time_limit=1800,
    time_limit=2100,
)
def task_limpiar_bd(self):
    """
    Limpieza de datos antiguos segun politicas de retencion:
    - Articulos de prensa > 90 dias sin embedding se eliminan
    - Relaciones entre actores con decay
    - Alertas FIMI resueltas > 30 dias
    Intervalo: diario a las 02:00.
    """
    cfg = get_settings()
    inicio = datetime.now(timezone.utc)
    logger.info("Iniciando limpieza de BD")
    eliminados: dict[str, int] = {}

    try:
        from agents.ollama.actor_context_rag import ActorContextRAG

        async def _limpiar():
            rag = ActorContextRAG(db_url=cfg.database_url_asyncpg)
            relaciones_decay = await rag.aplicar_decay_relaciones()
            eliminados["relaciones_decay"] = relaciones_decay

            import asyncpg
            conn_url = cfg.database_url_asyncpg.replace(
                "postgresql+asyncpg://", "postgresql://"
            )
            conn = await asyncpg.connect(conn_url)
            try:
                # Articulos sin embedding > 90 dias
                r1 = await conn.execute(
                    """
                    DELETE FROM articulos_prensa
                    WHERE fecha_pub < NOW() - INTERVAL '90 days'
                      AND embedding IS NULL
                    """
                )
                eliminados["articulos_sin_embedding"] = int(r1.split()[-1])

                # Alertas FIMI resueltas > 30 dias
                r2 = await conn.execute(
                    """
                    DELETE FROM fimi_alertas
                    WHERE resuelta = true
                      AND created_at < NOW() - INTERVAL '30 days'
                    """
                )
                eliminados["fimi_alertas_resueltas"] = int(r2.split()[-1])

                # Briefings de actores > 60 dias
                r3 = await conn.execute(
                    """
                    DELETE FROM actor_briefings
                    WHERE created_at < NOW() - INTERVAL '60 days'
                    """
                )
                eliminados["briefings_viejos"] = int(r3.split()[-1])

            finally:
                await conn.close()

        _run(_limpiar())

        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        logger.info(
            "Limpieza BD completada: %s duracion=%.0fs",
            eliminados,
            duracion,
        )

        return {
            "estado": "ok",
            "eliminados": eliminados,
            "duracion_s": round(duracion, 1),
            "timestamp": inicio.isoformat(),
        }

    except Exception as exc:
        logger.error("Error en limpieza BD: %s", exc)
        raise self.retry(exc=exc)


@shared_task(
    name="scheduler.tasks.mantenimiento.task_vacuum_bd",
    bind=True,
    max_retries=1,
    default_retry_delay=3600,
    queue="mantenimiento",
    soft_time_limit=3600,
    time_limit=3900,
)
def task_vacuum_bd(self):
    """
    VACUUM ANALYZE en tablas de alto volumen para mantener el rendimiento del indice HNSW.
    Intervalo: semanal los lunes a las 04:00.
    """
    cfg = get_settings()
    inicio = datetime.now(timezone.utc)
    logger.info("Iniciando VACUUM ANALYZE")

    TABLAS = [
        "articulos_prensa",
        "noticias_actores",
        "actor_relaciones",
        "actor_briefings",
        "fimi_alertas",
        "metricas_medio_diario",
    ]

    try:
        import asyncpg

        async def _vacuum():
            conn_url = cfg.database_url_asyncpg.replace(
                "postgresql+asyncpg://", "postgresql://"
            )
            # VACUUM requiere autocommit (no transaccion)
            conn = await asyncpg.connect(conn_url, timeout=30)
            try:
                for tabla in TABLAS:
                    try:
                        await conn.execute(f"VACUUM ANALYZE {tabla}")
                        logger.debug("VACUUM ANALYZE %s completado", tabla)
                    except Exception as e:
                        logger.warning("VACUUM %s: %s", tabla, e)
            finally:
                await conn.close()

        _run(_vacuum())

        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        logger.info("VACUUM ANALYZE completado en %.0fs", duracion)

        return {
            "estado": "ok",
            "tablas": TABLAS,
            "duracion_s": round(duracion, 1),
            "timestamp": inicio.isoformat(),
        }

    except Exception as exc:
        logger.error("Error en VACUUM: %s", exc)
        raise self.retry(exc=exc)
