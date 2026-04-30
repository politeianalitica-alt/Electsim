"""
Pipeline Mediatico — Orquestacion completa del Radar Mediatico.

6 fases:
  1. Ingesta     — FundusClient (Fundus + RSS + trafilatura)
  2. Transform   — TransformerMediatico (NER + IPTC + sesgo)
  3. NLP         — SentimientoAgent + FramingAgent
  4. Agregacion  — topics BERTopic + metricas por medio
  5. Persistencia — PostgreSQL (articulos_prensa, nlp_mediatico)
  6. Reentrenamiento BERTopic — diario o cuando el corpus crece

Scheduler APScheduler:
  - ingestar_prensa: cada hora
  - pipeline_nlp: cada hora (tras ingesta)
  - reentrenar_bertopic: 02:00 diario

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

PIPELINE_DIAS_HISTORICO = int(os.getenv("MEDIATICO_DIAS_HISTORICO", "14"))
PIPELINE_MAX_POR_MEDIO = int(os.getenv("MEDIATICO_MAX_POR_MEDIO", "15"))
PIPELINE_USAR_TRAFILATURA = os.getenv("MEDIATICO_TRAFILATURA", "false").lower() == "true"
BERTOPIC_REENTRENAR_CADA_N = int(os.getenv("BERTOPIC_REENTRENAR_N", "500"))
BERTOPIC_MIN_CORPUS = int(os.getenv("BERTOPIC_MIN_CORPUS", "100"))


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

class PipelineMediatico:
    """
    Orquesta la ingesta, transformacion, NLP y persistencia del Radar Mediatico.
    """

    def __init__(self, db_url: str | None = None) -> None:
        self._db_url = db_url or os.getenv("DATABASE_URL", "")
        self._engine: Any = None

    # ------------------------------------------------------------------
    # Fase 1: Ingesta
    # ------------------------------------------------------------------

    async def fase_ingesta(
        self,
        medios: list[str] | None = None,
        max_por_medio: int = PIPELINE_MAX_POR_MEDIO,
        usar_trafilatura: bool = PIPELINE_USAR_TRAFILATURA,
    ) -> list[Any]:
        """Descarga articulos de todos los medios configurados."""
        from etl.sources.prensa import FundusClient

        async with FundusClient() as client:
            articulos = await client.ingestar_todos(
                medios=medios,
                usar_trafilatura=usar_trafilatura,
                max_por_medio=max_por_medio,
            )

        logger.info("Fase ingesta: %d articulos", len(articulos))
        return articulos

    # ------------------------------------------------------------------
    # Fase 2: Transform (NER + IPTC + sesgo)
    # ------------------------------------------------------------------

    def fase_transform(self, articulos: list[Any]) -> list[dict]:
        """Transforma articulos normalizados en articulos procesados con NER/IPTC."""
        from etl.transformers.mediatico import TransformerMediatico

        # Convertir dataclasses a dicts si es necesario
        articulos_dict: list[dict] = []
        for art in articulos:
            if isinstance(art, dict):
                articulos_dict.append(art)
            else:
                articulos_dict.append({
                    "url_hash": art.url_hash,
                    "titulo": art.titulo,
                    "url": art.url,
                    "medio": art.medio,
                    "tendencia": art.tendencia,
                    "credibilidad": art.credibilidad,
                    "fecha_pub": art.fecha_pub,
                    "texto_completo": art.texto_completo,
                    "resumen": art.resumen,
                    "tags": art.tags,
                    "fuente_ingesta": art.fuente_ingesta,
                })

        procesados = TransformerMediatico.procesar_lote(articulos_dict)

        # Convertir dataclasses a dicts
        resultado: list[dict] = []
        for proc in procesados:
            d = {
                "url_hash": proc.url_hash,
                "titulo": proc.titulo,
                "medio": proc.medio,
                "tendencia": proc.tendencia,
                "credibilidad": proc.credibilidad,
                "fecha_pub": proc.fecha_pub,
                "texto_completo": proc.texto_completo,
                "resumen": proc.resumen,
                "categoria_iptc": proc.categoria_iptc,
                "score_iptc": proc.score_iptc,
                "score_sesgo": proc.score_sesgo,
                "score_credibilidad": proc.score_credibilidad,
                "entidades": [
                    {"texto": e.texto, "tipo": e.tipo}
                    for e in proc.entidades
                ],
            }
            resultado.append(d)

        logger.info("Fase transform: %d articulos procesados", len(resultado))
        return resultado

    # ------------------------------------------------------------------
    # Fase 3: NLP (sentimiento + framing + FIMI)
    # ------------------------------------------------------------------

    def fase_nlp(self, articulos_procesados: list[dict]) -> list[dict]:
        """Aplica sentimiento y framing a articulos procesados."""
        from agents.mediatico.sentimiento_agent import SentimientoAgent
        from agents.mediatico.framing_agent import FramingAgent

        # Sentimiento
        con_sentimiento = SentimientoAgent.analizar_lote(articulos_procesados)
        # Framing y FIMI
        con_framing = FramingAgent.procesar_lote(con_sentimiento)

        logger.info("Fase NLP: %d articulos con sentimiento+framing", len(con_framing))
        return con_framing

    # ------------------------------------------------------------------
    # Fase 4: Agregacion (BERTopic + metricas)
    # ------------------------------------------------------------------

    def fase_agregacion(self, articulos_nlp: list[dict]) -> dict:
        """Calcula topics BERTopic y metricas agregadas."""
        from agents.mediatico.bertopic_agent import BERTopicAgent
        from agents.mediatico.sentimiento_agent import SentimientoAgent

        agent_bt = BERTopicAgent()
        modelo_cargado = agent_bt.cargar_modelo()

        textos = [
            (a.get("titulo", "") + " " + a.get("resumen", "")).strip()
            for a in articulos_nlp
        ]

        if modelo_cargado:
            topics = agent_bt.transformar(textos)
        else:
            # Sin modelo previo, fallback por seed topics
            topics, _ = agent_bt.entrenar(textos)
            if len(textos) >= BERTOPIC_MIN_CORPUS:
                agent_bt.guardar_modelo()

        # Asignar topic_id a cada articulo
        for art, topic_id in zip(articulos_nlp, topics):
            art["topic_id"] = int(topic_id)

        # Metricas de sentimiento por medio
        tono_por_medio = SentimientoAgent.calcular_tono_por_medio(articulos_nlp)

        # Topics para dashboard
        topics_dashboard = agent_bt.obtener_topics_dashboard(articulos_nlp)

        metricas = {
            "tono_por_medio": tono_por_medio,
            "topics_dashboard": topics_dashboard,
            "n_articulos": len(articulos_nlp),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        logger.info("Fase agregacion: %d topics, %d medios", len(topics_dashboard), len(tono_por_medio))
        return metricas

    # ------------------------------------------------------------------
    # Fase 5: Persistencia
    # ------------------------------------------------------------------

    async def fase_persistencia(
        self,
        articulos_nlp: list[dict],
        metricas: dict,
    ) -> int:
        """Persiste articulos y metricas en PostgreSQL."""
        if not self._db_url:
            logger.info("Sin DATABASE_URL — persistencia omitida")
            return 0

        try:
            from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
            from sqlalchemy import text

            url_async = self._db_url.replace("postgresql://", "postgresql+asyncpg://")
            engine = create_async_engine(url_async, pool_size=5)

            insertados = 0
            async with AsyncSession(engine) as session:
                for art in articulos_nlp:
                    try:
                        await session.execute(
                            text("""
                                INSERT INTO articulos_prensa (
                                    url_hash, titulo, url, medio, fecha_pub,
                                    texto_completo, resumen, categoria_iptc,
                                    score_sentimiento, score_sesgo, score_credibilidad,
                                    frame_dominante, fimi_score, topic_id,
                                    entidades_ner, creado_en
                                ) VALUES (
                                    :url_hash, :titulo, :url, :medio, :fecha_pub,
                                    :texto_completo, :resumen, :categoria_iptc,
                                    :score_sentimiento, :score_sesgo, :score_credibilidad,
                                    :frame_dominante, :fimi_score, :topic_id,
                                    :entidades_ner, NOW()
                                )
                                ON CONFLICT (url_hash) DO UPDATE SET
                                    categoria_iptc = EXCLUDED.categoria_iptc,
                                    score_sentimiento = EXCLUDED.score_sentimiento,
                                    frame_dominante = EXCLUDED.frame_dominante,
                                    fimi_score = EXCLUDED.fimi_score,
                                    topic_id = EXCLUDED.topic_id,
                                    actualizado_en = NOW()
                            """),
                            {
                                "url_hash": art.get("url_hash", ""),
                                "titulo": art.get("titulo", "")[:500],
                                "url": art.get("url", "")[:2000],
                                "medio": art.get("medio", ""),
                                "fecha_pub": art.get("fecha_pub", ""),
                                "texto_completo": art.get("texto_completo", "")[:100_000],
                                "resumen": art.get("resumen", "")[:2000],
                                "categoria_iptc": art.get("categoria_iptc", "unknown"),
                                "score_sentimiento": float(art.get("sentimiento_score", 0.0)),
                                "score_sesgo": float(art.get("score_sesgo", 0.0)),
                                "score_credibilidad": float(art.get("score_credibilidad", 0.7)),
                                "frame_dominante": art.get("frame", "UNKNOWN"),
                                "fimi_score": float(art.get("fimi_score", 0.0)),
                                "topic_id": int(art.get("topic_id", -1)),
                                "entidades_ner": str(art.get("entidades", [])),
                            },
                        )
                        insertados += 1
                    except Exception as exc:
                        logger.debug("persistencia articulo %s: %s", art.get("url_hash", ""), exc)

                await session.commit()

            await engine.dispose()
            logger.info("Fase persistencia: %d/%d articulos guardados", insertados, len(articulos_nlp))
            return insertados

        except ImportError:
            logger.warning("sqlalchemy/asyncpg no instalados — persistencia omitida")
            return 0
        except Exception as exc:
            logger.error("Fase persistencia error: %s", exc)
            return 0

    # ------------------------------------------------------------------
    # Fase 6: Reentrenamiento BERTopic
    # ------------------------------------------------------------------

    async def fase_reentrenamiento(self) -> bool:
        """
        Reentrenamiento diario de BERTopic sobre todo el corpus disponible.
        Solo se ejecuta si hay suficientes articulos.
        """
        if not self._db_url:
            logger.info("Sin DATABASE_URL — reentrenamiento omitido")
            return False

        try:
            from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
            from sqlalchemy import text
            from agents.mediatico.bertopic_agent import BERTopicAgent

            url_async = self._db_url.replace("postgresql://", "postgresql+asyncpg://")
            engine = create_async_engine(url_async)

            async with AsyncSession(engine) as session:
                result = await session.execute(
                    text("""
                        SELECT titulo || ' ' || COALESCE(resumen, '') AS texto
                        FROM articulos_prensa
                        WHERE creado_en >= NOW() - INTERVAL ':dias days'
                        LIMIT 5000
                    """.replace(":dias days", f"{PIPELINE_DIAS_HISTORICO} days"))
                )
                textos = [row[0] for row in result.fetchall() if row[0].strip()]

            await engine.dispose()

            if len(textos) < BERTOPIC_MIN_CORPUS:
                logger.info("Reentrenamiento omitido: solo %d textos (minimo %d)", len(textos), BERTOPIC_MIN_CORPUS)
                return False

            agent_bt = BERTopicAgent()
            agent_bt.entrenar(textos)
            exito = agent_bt.guardar_modelo()
            if exito:
                logger.info("BERTopic reentrenado con %d textos", len(textos))
            return exito

        except Exception as exc:
            logger.error("Fase reentrenamiento BERTopic error: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Ejecucion completa
    # ------------------------------------------------------------------

    async def ejecutar_completo(
        self,
        medios: list[str] | None = None,
        max_por_medio: int = PIPELINE_MAX_POR_MEDIO,
        persistir: bool = True,
    ) -> dict:
        """
        Ejecuta las 5 fases operativas del pipeline en secuencia.
        Retorna resumen de ejecucion.
        """
        inicio = datetime.now(timezone.utc)
        resumen: dict = {"ok": False, "n_articulos": 0, "n_persistidos": 0, "errores": []}

        try:
            # Fase 1: Ingesta
            articulos_raw = await self.fase_ingesta(medios, max_por_medio)
            if not articulos_raw:
                resumen["errores"].append("ingesta: sin articulos")
                return resumen

            # Fase 2: Transform
            articulos_proc = self.fase_transform(articulos_raw)

            # Fase 3: NLP
            articulos_nlp = self.fase_nlp(articulos_proc)

            # Fase 4: Agregacion
            metricas = self.fase_agregacion(articulos_nlp)

            # Fase 5: Persistencia
            n_persistidos = 0
            if persistir:
                n_persistidos = await self.fase_persistencia(articulos_nlp, metricas)

            duracion = (datetime.now(timezone.utc) - inicio).total_seconds()
            resumen = {
                "ok": True,
                "n_articulos": len(articulos_nlp),
                "n_persistidos": n_persistidos,
                "n_topics": len(metricas.get("topics_dashboard", [])),
                "n_medios": len(medios or list(range(19))),
                "duracion_s": round(duracion, 1),
                "errores": [],
            }
            logger.info(
                "Pipeline mediatico OK: %d art, %d persistidos, %.1fs",
                len(articulos_nlp), n_persistidos, duracion,
            )

        except Exception as exc:
            logger.error("PipelineMediatico.ejecutar_completo: %s", exc)
            resumen["errores"].append(str(exc))

        return resumen

    async def ejecutar_incremental(self) -> dict:
        """Ejecuta pipeline incremental horario (sin reentrenamiento BERTopic)."""
        return await self.ejecutar_completo(persistir=True)


# ---------------------------------------------------------------------------
# Registro de jobs APScheduler
# ---------------------------------------------------------------------------

def registrar_jobs_mediatico(scheduler: Any, db_url: str | None = None) -> None:
    """Registra los jobs del pipeline mediatico en el scheduler APScheduler."""
    pipeline = PipelineMediatico(db_url=db_url)

    # Ingesta + NLP cada hora (minuto 15)
    scheduler.add_job(
        lambda: asyncio.run(pipeline.ejecutar_incremental()),
        "cron",
        minute=15,
        id="pipeline_mediatico_horario",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    # Reentrenamiento BERTopic a las 02:00 diario
    scheduler.add_job(
        lambda: asyncio.run(pipeline.fase_reentrenamiento()),
        "cron",
        hour=2,
        minute=0,
        id="bertopic_reentrenamiento_diario",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    logger.info("Jobs mediatico registrados: pipeline_horario + bertopic_reentrenamiento")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio as _asyncio

    async def _demo() -> None:
        pipeline = PipelineMediatico()
        resumen = await pipeline.ejecutar_completo(
            medios=["elpais", "elmundo"],
            max_por_medio=5,
            persistir=False,
        )
        print("Resumen:", resumen)

    _asyncio.run(_demo())
