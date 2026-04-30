"""
Pipeline Noticias-Actores — Orquesta el procesamiento Ollama de articulos.

5 fases:
  1. Pendientes    — obtener articulos sin procesar por Ollama
  2. Ollama        — resumen + entidades + embedding (NewsProcessor)
  3. Fichas        — actualizar ficha/perfil de cada actor mencionado
  4. Grafo decay   — aplicar decay a relaciones antiguas entre actores
  5. Briefings     — generar briefings automaticos para actores con pico de menciones

Scheduler APScheduler:
  - pipeline_noticias_actores: cada hora
  - decay_relaciones: 03:00 diario

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PIPELINE_LOTE_SIZE = int(os.getenv("NOTICIAS_ACTORES_LOTE", "50"))
PIPELINE_MAX_CONCURRENTE = int(os.getenv("NOTICIAS_ACTORES_CONCURRENTE", "3"))
BRIEFING_UMBRAL_NOTICIAS = int(os.getenv("BRIEFING_UMBRAL", "10"))
BRIEFING_VENTANA_HORAS = int(os.getenv("BRIEFING_VENTANA_H", "24"))


class PipelineNoticiasActores:
    """
    Orquesta el procesamiento Ollama y la actualizacion del grafo de actores.
    """

    def __init__(self, db_url: str | None = None) -> None:
        self._db_url = db_url or os.getenv("DATABASE_URL", "")

    # ------------------------------------------------------------------
    # Contexto DB asincrono
    # ------------------------------------------------------------------

    async def _crear_session(self) -> Any:
        """Crea una sesion SQLAlchemy asincrona."""
        if not self._db_url:
            return None
        try:
            from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
            url = self._db_url.replace("postgresql://", "postgresql+asyncpg://")
            engine = create_async_engine(url, pool_size=5)
            return AsyncSession(engine)
        except ImportError:
            logger.warning("sqlalchemy/asyncpg no instalados")
            return None
        except Exception as exc:
            logger.error("_crear_session: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Fase 1: Obtener pendientes
    # ------------------------------------------------------------------

    async def fase_pendientes(self, session: Any, limite: int) -> list[dict]:
        """Obtiene articulos pendientes de procesamiento Ollama."""
        from agents.ollama.news_processor import NewsProcessor

        # NewsProcessor usa la session para las queries
        processor = NewsProcessor(ollama_client=None, db_session=session)
        pendientes = await processor.obtener_pendientes(limite=limite)
        logger.info("Fase pendientes: %d articulos por procesar", len(pendientes))
        return pendientes

    # ------------------------------------------------------------------
    # Fase 2: Procesamiento Ollama
    # ------------------------------------------------------------------

    async def fase_ollama(
        self,
        articulos: list[dict],
        session: Any,
    ) -> list[dict]:
        """Procesa articulos con Ollama (resumen + entidades + embedding)."""
        from agents.ollama.ollama_client import OllamaClient
        from agents.ollama.news_processor import NewsProcessor

        if not articulos:
            return []

        async with OllamaClient() as ollama:
            # Verificar disponibilidad
            disponible = await ollama.healthcheck()
            if not disponible:
                logger.warning("Ollama no disponible — fase_ollama omitida")
                return []

            processor = NewsProcessor(ollama_client=ollama, db_session=session)
            procesados = await processor.procesar_lote(
                articulos,
                max_concurrente=PIPELINE_MAX_CONCURRENTE,
            )

            await session.commit()

        logger.info("Fase Ollama: %d articulos procesados", len(procesados))
        return procesados

    # ------------------------------------------------------------------
    # Fase 3: Actualizar fichas de actores
    # ------------------------------------------------------------------

    async def fase_fichas(self, session: Any) -> int:
        """
        Actualiza la ficha de cada actor con metricas recientes.
        Calcula: n_menciones_7d, n_menciones_30d, sentimiento_medio_30d.
        """
        if not session:
            return 0

        try:
            from sqlalchemy import text
            result = await session.execute(
                text("""
                    UPDATE actores a
                    SET
                        n_menciones_7d = subq.menciones_7d,
                        n_menciones_30d = subq.menciones_30d,
                        sentimiento_medio = subq.sent_30d,
                        actualizado_en = NOW()
                    FROM (
                        SELECT
                            na.actor_id,
                            COUNT(*) FILTER (WHERE ap.fecha_pub >= NOW() - INTERVAL '7 days')  AS menciones_7d,
                            COUNT(*) FILTER (WHERE ap.fecha_pub >= NOW() - INTERVAL '30 days') AS menciones_30d,
                            AVG(ap.score_sentimiento) FILTER (WHERE ap.fecha_pub >= NOW() - INTERVAL '30 days') AS sent_30d
                        FROM noticias_actores na
                        JOIN articulos_prensa ap ON ap.id = na.articulo_id
                        GROUP BY na.actor_id
                    ) subq
                    WHERE a.id = subq.actor_id
                    RETURNING a.id
                """)
            )
            n_actualizados = len(result.fetchall())
            await session.commit()
            logger.info("Fase fichas: %d actores actualizados", n_actualizados)
            return n_actualizados
        except Exception as exc:
            logger.error("fase_fichas: %s", exc)
            return 0

    # ------------------------------------------------------------------
    # Fase 4: Decay del grafo de relaciones
    # ------------------------------------------------------------------

    async def fase_decay(self, session: Any) -> int:
        """Aplica decay y borra relaciones obsoletas entre actores."""
        from agents.ollama.actor_context_rag import ActorContextRAG

        rag = ActorContextRAG(db_session=session)
        borradas = await rag.aplicar_decay_relaciones()

        if borradas:
            await session.commit()

        logger.info("Fase decay: %d relaciones borradas", borradas)
        return borradas

    # ------------------------------------------------------------------
    # Fase 5: Briefings automaticos
    # ------------------------------------------------------------------

    async def fase_briefings(self, session: Any) -> int:
        """
        Genera briefings para actores que superan el umbral de menciones.
        """
        if not session:
            return 0

        try:
            from sqlalchemy import text
            # Buscar actores con pico de menciones
            result = await session.execute(
                text("""
                    SELECT actor_id, COUNT(*) AS n
                    FROM noticias_actores na
                    JOIN articulos_prensa ap ON ap.id = na.articulo_id
                    WHERE ap.creado_en >= NOW() - (:horas || ' hours')::INTERVAL
                    GROUP BY actor_id
                    HAVING COUNT(*) >= :umbral
                    ORDER BY n DESC
                    LIMIT 5
                """),
                {"horas": BRIEFING_VENTANA_HORAS, "umbral": BRIEFING_UMBRAL_NOTICIAS},
            )
            actores_pico = [(row[0], row[1]) for row in result.fetchall()]
        except Exception as exc:
            logger.debug("fase_briefings query: %s", exc)
            return 0

        if not actores_pico:
            return 0

        from agents.ollama.ollama_client import OllamaClient
        from agents.ollama.actor_context_rag import ActorContextRAG

        n_generados = 0
        async with OllamaClient() as ollama:
            if not await ollama.healthcheck():
                logger.warning("Ollama no disponible — briefings omitidos")
                return 0

            rag = ActorContextRAG(db_session=session, ollama_client=ollama)
            for actor_id, n_noticias in actores_pico:
                logger.info("Generando briefing para actor %d (%d noticias)", actor_id, n_noticias)
                briefing = await rag.generar_briefing_si_necesario(
                    actor_id=actor_id,
                    umbral_noticias=BRIEFING_UMBRAL_NOTICIAS,
                    ventana_horas=BRIEFING_VENTANA_HORAS,
                )
                if briefing:
                    n_generados += 1

            await session.commit()

        logger.info("Fase briefings: %d generados de %d candidatos", n_generados, len(actores_pico))
        return n_generados

    # ------------------------------------------------------------------
    # Ejecucion completa
    # ------------------------------------------------------------------

    async def ejecutar_completo(
        self,
        lote_size: int = PIPELINE_LOTE_SIZE,
    ) -> dict:
        """
        Ejecuta todas las fases del pipeline.
        Retorna resumen de ejecucion.
        """
        inicio = datetime.now(timezone.utc)
        resumen = {
            "ok": False,
            "n_pendientes": 0,
            "n_procesados_ollama": 0,
            "n_actores_actualizados": 0,
            "n_relaciones_borradas": 0,
            "n_briefings": 0,
            "duracion_s": 0.0,
            "errores": [],
        }

        session = await self._crear_session()
        if not session:
            resumen["errores"].append("no se pudo crear session DB")
            return resumen

        try:
            async with session:
                # Fase 1: pendientes
                pendientes = await self.fase_pendientes(session, limite=lote_size)
                resumen["n_pendientes"] = len(pendientes)

                # Fase 2: Ollama
                if pendientes:
                    procesados = await self.fase_ollama(pendientes, session)
                    resumen["n_procesados_ollama"] = len(procesados)

                # Fase 3: fichas
                n_fichas = await self.fase_fichas(session)
                resumen["n_actores_actualizados"] = n_fichas

                # Fase 4: decay (solo si se procesaron articulos)
                if pendientes:
                    n_borradas = await self.fase_decay(session)
                    resumen["n_relaciones_borradas"] = n_borradas

                # Fase 5: briefings
                n_briefings = await self.fase_briefings(session)
                resumen["n_briefings"] = n_briefings

        except Exception as exc:
            logger.error("PipelineNoticiasActores.ejecutar_completo: %s", exc)
            resumen["errores"].append(str(exc))
        finally:
            try:
                await session.close()
            except Exception:
                pass

        duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
        resumen["duracion_s"] = round(duracion, 1)
        resumen["ok"] = not resumen["errores"]

        logger.info(
            "Pipeline noticias-actores: %d procesados, %d fichas, %d briefings, %.1fs",
            resumen["n_procesados_ollama"],
            resumen["n_actores_actualizados"],
            resumen["n_briefings"],
            duracion,
        )
        return resumen

    async def ejecutar_solo_decay(self) -> int:
        """Ejecucion aislada del decay diario (sin procesar noticias)."""
        session = await self._crear_session()
        if not session:
            return 0
        try:
            async with session:
                n = await self.fase_decay(session)
                return n
        except Exception as exc:
            logger.error("ejecutar_solo_decay: %s", exc)
            return 0


# ---------------------------------------------------------------------------
# Registro de jobs APScheduler
# ---------------------------------------------------------------------------

def registrar_jobs_noticias_actores(scheduler: Any, db_url: str | None = None) -> None:
    """Registra los jobs del pipeline noticias-actores en APScheduler."""
    pipeline = PipelineNoticiasActores(db_url=db_url)

    # Pipeline completo cada hora (minuto 30)
    scheduler.add_job(
        lambda: asyncio.run(pipeline.ejecutar_completo()),
        "cron",
        minute=30,
        id="pipeline_noticias_actores_horario",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    # Decay diario a las 03:00
    scheduler.add_job(
        lambda: asyncio.run(pipeline.ejecutar_solo_decay()),
        "cron",
        hour=3,
        minute=0,
        id="decay_relaciones_actores_diario",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    logger.info("Jobs noticias-actores registrados: pipeline_horario + decay_diario")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio as _asyncio

    async def _demo() -> None:
        pipeline = PipelineNoticiasActores()
        resumen = await pipeline.ejecutar_completo(lote_size=10)
        print("Resumen:", resumen)

    _asyncio.run(_demo())
