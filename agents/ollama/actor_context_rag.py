"""
Actor Context RAG — Motor de RAG semantico sobre perfiles de actores politicos.

Funcionalidades:
  - Busqueda semantica de noticias sobre un actor (pgvector + HNSW)
  - Fallback temporal cuando no hay embedding
  - Consulta con contexto: responder preguntas sobre actores usando noticias recientes
  - Timeline semanal de menciones
  - Co-menciones entre actores (grafo de relaciones)

Decay de relaciones:
  - 7 dias:   peso normal (1.0)
  - 7-30 dias: peso 0.8
  - >30 dias: peso 0.6
  - >90 dias: candidatos a borrar

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

DECAY_7D  = 1.0
DECAY_30D = 0.8
DECAY_90D = 0.6
DECAY_DELETE_DIAS = 90

RAG_MAX_DOCS = 5
RAG_SIMILARITY_THRESHOLD = 0.7
RAG_TEMPORAL_DIAS = 30


class ActorContextRAG:
    """
    RAG semantico sobre noticias de actores politicos.

    Uso:
        rag = ActorContextRAG(db_session, ollama_client)
        contexto = await rag.obtener_contexto_actor(actor_id)
        respuesta = await rag.consultar_actor(actor_id, "cuales son sus posiciones sobre vivienda")
    """

    def __init__(
        self,
        db_session: Any,
        ollama_client: Any | None = None,
    ) -> None:
        self._session = db_session
        self._ollama = ollama_client

    # ------------------------------------------------------------------
    # Contexto completo del actor (para prompt)
    # ------------------------------------------------------------------

    async def obtener_contexto_actor(
        self,
        actor_id: int,
        max_noticias: int = 10,
        dias: int = 30,
    ) -> dict:
        """
        Obtiene el contexto completo de un actor para usar en un prompt LLM.
        Retorna {actor, noticias_recientes, relaciones_clave, timeline}.
        """
        actor = await self._obtener_perfil_actor(actor_id)
        if not actor:
            return {}

        noticias = await self._noticias_recientes_actor(actor_id, dias=dias, limite=max_noticias)
        relaciones = await self._obtener_relaciones_clave(actor_id, top_n=5)
        timeline = await self.obtener_timeline(actor_id, semanas=4)

        return {
            "actor": actor,
            "noticias_recientes": noticias,
            "relaciones_clave": relaciones,
            "timeline_semanal": timeline,
        }

    # ------------------------------------------------------------------
    # Perfil del actor
    # ------------------------------------------------------------------

    async def _obtener_perfil_actor(self, actor_id: int) -> dict | None:
        """Obtiene el perfil basico del actor desde la tabla actores."""
        try:
            from sqlalchemy import text
            result = await self._session.execute(
                text("""
                    SELECT id, nombre, nombre_normalizado, partido, cargo,
                           biografia, aliases, relevancia
                    FROM actores
                    WHERE id = :id
                """),
                {"id": actor_id},
            )
            fila = result.fetchone()
            if not fila:
                return None
            keys = result.keys()
            return dict(zip(keys, fila))
        except Exception as exc:
            logger.debug("_obtener_perfil_actor %d: %s", actor_id, exc)
            return None

    # ------------------------------------------------------------------
    # Busqueda semantica (pgvector)
    # ------------------------------------------------------------------

    async def buscar_noticias_semanticas(
        self,
        query: str,
        actor_id: int | None = None,
        max_docs: int = RAG_MAX_DOCS,
        threshold: float = RAG_SIMILARITY_THRESHOLD,
        dias: int = RAG_TEMPORAL_DIAS,
    ) -> list[dict]:
        """
        Busca noticias semanticamente similares al query usando pgvector.
        Si no hay embedding disponible, usa fallback temporal.

        Retorna lista de {url_hash, titulo, resumen_ollama, fecha_pub, similarity}.
        """
        if not self._ollama:
            return await self._fallback_temporal(actor_id, dias, max_docs)

        # Generar embedding del query
        try:
            embedding_query = await self._ollama.embed(query)
        except Exception as exc:
            logger.debug("buscar_noticias_semanticas embed: %s", exc)
            return await self._fallback_temporal(actor_id, dias, max_docs)

        if not embedding_query:
            return await self._fallback_temporal(actor_id, dias, max_docs)

        embedding_str = "[" + ",".join(str(x) for x in embedding_query) + "]"

        try:
            from sqlalchemy import text

            filtro_actor = ""
            params: dict = {
                "embedding": embedding_str,
                "threshold": 1.0 - threshold,  # pgvector <=> = distancia coseno
                "limite": max_docs,
                "dias": dias,
            }

            if actor_id is not None:
                filtro_actor = "AND na.actor_id = :actor_id"
                params["actor_id"] = actor_id

            query_sql = f"""
                SELECT DISTINCT ON (ap.url_hash)
                    ap.url_hash,
                    ap.titulo,
                    ap.resumen_ollama,
                    ap.fecha_pub,
                    ap.medio,
                    1 - (ap.embedding <=> :embedding::vector) AS similarity
                FROM articulos_prensa ap
                {("JOIN noticias_actores na ON na.articulo_id = ap.id " + filtro_actor) if actor_id else ""}
                WHERE ap.embedding IS NOT NULL
                  AND ap.creado_en >= NOW() - (:dias || ' days')::INTERVAL
                  AND (ap.embedding <=> :embedding::vector) < :threshold
                ORDER BY ap.url_hash, similarity DESC
                LIMIT :limite
            """

            result = await self._session.execute(text(query_sql), params)
            filas = result.fetchall()
            keys = result.keys()
            return sorted(
                [dict(zip(keys, f)) for f in filas],
                key=lambda x: float(x.get("similarity", 0)),
                reverse=True,
            )

        except Exception as exc:
            logger.debug("buscar_noticias_semanticas pgvector: %s", exc)
            return await self._fallback_temporal(actor_id, dias, max_docs)

    async def _fallback_temporal(
        self,
        actor_id: int | None,
        dias: int,
        limite: int,
    ) -> list[dict]:
        """Fallback: noticias mas recientes cuando no hay pgvector disponible."""
        return await self._noticias_recientes_actor(actor_id, dias=dias, limite=limite)

    async def _noticias_recientes_actor(
        self,
        actor_id: int | None,
        dias: int = 30,
        limite: int = 10,
    ) -> list[dict]:
        """Obtiene las noticias mas recientes de un actor."""
        try:
            from sqlalchemy import text

            if actor_id is not None:
                result = await self._session.execute(
                    text("""
                        SELECT ap.url_hash, ap.titulo,
                               COALESCE(ap.resumen_ollama, ap.resumen) AS resumen_ollama,
                               ap.fecha_pub, ap.medio, ap.score_sentimiento
                        FROM articulos_prensa ap
                        JOIN noticias_actores na ON na.articulo_id = ap.id
                        WHERE na.actor_id = :actor_id
                          AND ap.fecha_pub >= NOW() - (:dias || ' days')::INTERVAL
                        ORDER BY ap.fecha_pub DESC
                        LIMIT :limite
                    """),
                    {"actor_id": actor_id, "dias": dias, "limite": limite},
                )
            else:
                result = await self._session.execute(
                    text("""
                        SELECT url_hash, titulo,
                               COALESCE(resumen_ollama, resumen) AS resumen_ollama,
                               fecha_pub, medio, score_sentimiento
                        FROM articulos_prensa
                        WHERE fecha_pub >= NOW() - (:dias || ' days')::INTERVAL
                        ORDER BY fecha_pub DESC
                        LIMIT :limite
                    """),
                    {"dias": dias, "limite": limite},
                )

            filas = result.fetchall()
            keys = result.keys()
            return [dict(zip(keys, f)) for f in filas]
        except Exception as exc:
            logger.debug("_noticias_recientes_actor %s: %s", actor_id, exc)
            return []

    # ------------------------------------------------------------------
    # Consulta RAG sobre actor
    # ------------------------------------------------------------------

    async def consultar_actor(
        self,
        actor_id: int,
        pregunta: str,
        max_contexto: int = RAG_MAX_DOCS,
    ) -> str:
        """
        Responde una pregunta sobre un actor usando RAG.
        Combina busqueda semantica + perfil del actor.
        """
        if not self._ollama:
            return "Ollama no disponible."

        # Obtener contexto
        actor = await self._obtener_perfil_actor(actor_id)
        nombre_actor = actor.get("nombre", f"actor_{actor_id}") if actor else f"actor_{actor_id}"

        noticias = await self.buscar_noticias_semanticas(
            query=f"{nombre_actor} {pregunta}",
            actor_id=actor_id,
            max_docs=max_contexto,
        )

        # Preparar documentos de contexto
        docs_contexto: list[str] = []
        if actor:
            bio = actor.get("biografia", "")
            if bio:
                docs_contexto.append(f"Perfil: {nombre_actor} ({actor.get('cargo', '')}, {actor.get('partido', '')}). {bio[:300]}")

        for noticia in noticias:
            texto_noticia = (
                f"[{str(noticia.get('fecha_pub', ''))[:10]} | {noticia.get('medio', '')}] "
                f"{noticia.get('titulo', '')}. "
                f"{noticia.get('resumen_ollama', '')}"
            )
            docs_contexto.append(texto_noticia)

        system_prompt = (
            "Eres un asistente de analisis politico especializado en politica espanola. "
            "Responde de forma concisa y factual basandote unicamente en el contexto proporcionado. "
            "Si no tienes informacion suficiente, dilo claramente."
        )

        try:
            respuesta = await self._ollama.chat_con_contexto(
                system_prompt=system_prompt,
                user_message=pregunta,
                context_docs=docs_contexto,
                temperature=0.3,
            )
            return respuesta
        except Exception as exc:
            logger.error("consultar_actor %d: %s", actor_id, exc)
            return f"Error al consultar: {exc}"

    # ------------------------------------------------------------------
    # Timeline semanal
    # ------------------------------------------------------------------

    async def obtener_timeline(
        self,
        actor_id: int,
        semanas: int = 8,
    ) -> list[dict]:
        """
        Retorna timeline semanal de menciones del actor.
        [{semana, n_menciones, sentimiento_medio, temas_top}]
        """
        try:
            from sqlalchemy import text
            result = await self._session.execute(
                text("""
                    SELECT
                        DATE_TRUNC('week', ap.fecha_pub) AS semana,
                        COUNT(*) AS n_menciones,
                        AVG(ap.score_sentimiento) AS sentimiento_medio,
                        ARRAY_AGG(DISTINCT ap.categoria_iptc) FILTER (WHERE ap.categoria_iptc IS NOT NULL) AS categorias
                    FROM articulos_prensa ap
                    JOIN noticias_actores na ON na.articulo_id = ap.id
                    WHERE na.actor_id = :actor_id
                      AND ap.fecha_pub >= NOW() - (:semanas || ' weeks')::INTERVAL
                    GROUP BY semana
                    ORDER BY semana DESC
                """),
                {"actor_id": actor_id, "semanas": semanas},
            )
            filas = result.fetchall()
            keys = result.keys()
            timeline = []
            for fila in filas:
                d = dict(zip(keys, fila))
                # Serializar semana
                if hasattr(d.get("semana"), "isoformat"):
                    d["semana"] = d["semana"].isoformat()
                # Limpiar None en sentimiento
                if d.get("sentimiento_medio") is not None:
                    d["sentimiento_medio"] = round(float(d["sentimiento_medio"]), 4)
                timeline.append(d)
            return timeline
        except Exception as exc:
            logger.debug("obtener_timeline actor %d: %s", actor_id, exc)
            return []

    # ------------------------------------------------------------------
    # Co-menciones (grafo de relaciones)
    # ------------------------------------------------------------------

    async def obtener_co_menciones(
        self,
        actor_id: int,
        top_n: int = 10,
        min_co_menciones: int = 2,
    ) -> list[dict]:
        """
        Retorna los actores mas frecuentemente co-mencionados con este actor.
        [{actor_id, nombre, partido, n_co_menciones, peso_decay}]
        """
        return await self._obtener_relaciones_clave(actor_id, top_n=top_n, min_menciones=min_co_menciones)

    async def _obtener_relaciones_clave(
        self,
        actor_id: int,
        top_n: int = 5,
        min_menciones: int = 1,
    ) -> list[dict]:
        """Obtiene relaciones con decay aplicado."""
        try:
            from sqlalchemy import text
            result = await self._session.execute(
                text("""
                    SELECT
                        CASE WHEN ar.actor_a_id = :actor_id THEN ar.actor_b_id
                             ELSE ar.actor_a_id END AS otro_actor_id,
                        a.nombre AS otro_nombre,
                        a.partido AS otro_partido,
                        ar.n_co_menciones,
                        ar.ultima_co_mencion,
                        CASE
                            WHEN ar.ultima_co_mencion >= NOW() - INTERVAL '7 days'  THEN 1.0
                            WHEN ar.ultima_co_mencion >= NOW() - INTERVAL '30 days' THEN 0.8
                            WHEN ar.ultima_co_mencion >= NOW() - INTERVAL '90 days' THEN 0.6
                            ELSE 0.3
                        END AS peso_decay
                    FROM actor_relaciones ar
                    JOIN actores a ON a.id = (
                        CASE WHEN ar.actor_a_id = :actor_id THEN ar.actor_b_id
                             ELSE ar.actor_a_id END
                    )
                    WHERE (ar.actor_a_id = :actor_id OR ar.actor_b_id = :actor_id)
                      AND ar.n_co_menciones >= :min_menciones
                    ORDER BY ar.n_co_menciones * peso_decay DESC
                    LIMIT :top_n
                """),
                {"actor_id": actor_id, "top_n": top_n, "min_menciones": min_menciones},
            )
            filas = result.fetchall()
            keys = result.keys()
            relaciones: list[dict] = []
            for fila in filas:
                d = dict(zip(keys, fila))
                if d.get("ultima_co_mencion") and hasattr(d["ultima_co_mencion"], "isoformat"):
                    d["ultima_co_mencion"] = d["ultima_co_mencion"].isoformat()
                relaciones.append(d)
            return relaciones
        except Exception as exc:
            logger.debug("_obtener_relaciones_clave actor %d: %s", actor_id, exc)
            return []

    # ------------------------------------------------------------------
    # Decay y limpieza de relaciones
    # ------------------------------------------------------------------

    async def aplicar_decay_relaciones(self) -> int:
        """
        Aplica decay a relaciones antiguas y borra las que superan 90 dias sin actividad.
        Retorna el numero de relaciones borradas.
        """
        try:
            from sqlalchemy import text
            result = await self._session.execute(
                text("""
                    DELETE FROM actor_relaciones
                    WHERE ultima_co_mencion < NOW() - INTERVAL ':dias days'
                    RETURNING id
                """.replace(":dias days", f"{DECAY_DELETE_DIAS} days"))
            )
            borradas = len(result.fetchall())
            if borradas:
                logger.info("decay_relaciones: %d relaciones borradas (>%dd sin actividad)",
                            borradas, DECAY_DELETE_DIAS)
            return borradas
        except Exception as exc:
            logger.debug("aplicar_decay_relaciones: %s", exc)
            return 0

    # ------------------------------------------------------------------
    # Briefing automatico (trigger: >10 noticias en 24h)
    # ------------------------------------------------------------------

    async def generar_briefing_si_necesario(
        self,
        actor_id: int,
        umbral_noticias: int = 10,
        ventana_horas: int = 24,
    ) -> str | None:
        """
        Genera un briefing automatico si el actor supera el umbral de noticias.
        Retorna el briefing generado o None si no se requiere.
        """
        if not self._ollama:
            return None

        try:
            from sqlalchemy import text
            result = await self._session.execute(
                text("""
                    SELECT COUNT(*) FROM articulos_prensa ap
                    JOIN noticias_actores na ON na.articulo_id = ap.id
                    WHERE na.actor_id = :actor_id
                      AND ap.creado_en >= NOW() - (:horas || ' hours')::INTERVAL
                """),
                {"actor_id": actor_id, "horas": ventana_horas},
            )
            n_noticias = result.scalar() or 0
        except Exception as exc:
            logger.debug("generar_briefing_si_necesario count: %s", exc)
            return None

        if n_noticias < umbral_noticias:
            return None

        # Obtener noticias y perfil
        actor = await self._obtener_perfil_actor(actor_id)
        noticias = await self._noticias_recientes_actor(actor_id, dias=1, limite=20)

        nombre = actor.get("nombre", f"actor_{actor_id}") if actor else f"actor_{actor_id}"
        bio = actor.get("biografia", "") if actor else ""
        titulos = [n.get("titulo", "") for n in noticias if n.get("titulo")]

        try:
            briefing = await self._ollama.generar_briefing_actor(
                nombre_actor=nombre,
                noticias_recientes=titulos,
                perfil_base=bio,
            )
            # Persistir briefing
            await self._guardar_briefing(actor_id, briefing, n_noticias)
            return briefing
        except Exception as exc:
            logger.error("generar_briefing_si_necesario %d: %s", actor_id, exc)
            return None

    async def _guardar_briefing(
        self,
        actor_id: int,
        briefing: str,
        n_noticias: int,
    ) -> None:
        """Persiste el briefing en la tabla actor_briefings."""
        try:
            from sqlalchemy import text
            await self._session.execute(
                text("""
                    INSERT INTO actor_briefings (actor_id, contenido, n_noticias_base, creado_en)
                    VALUES (:actor_id, :contenido, :n_noticias, NOW())
                """),
                {"actor_id": actor_id, "contenido": briefing[:5000], "n_noticias": n_noticias},
            )
        except Exception as exc:
            logger.debug("_guardar_briefing actor %d: %s", actor_id, exc)
