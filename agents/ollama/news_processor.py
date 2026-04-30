"""
News Processor — Procesamiento completo de noticias con Ollama.

Pipeline por articulo:
  1. Resumen (qwen3:8b)
  2. Extraccion de entidades (llama3.2:3b)
  3. Embedding del resumen (nomic-embed-text, 768d)
  4. Actor linking via ActorResolver
  5. Actualizar relaciones entre actores

ActorResolver:
  - Paso 1: busqueda exacta en tabla actores (nombre/alias)
  - Paso 2: busqueda en array de aliases
  - Paso 3: similitud pg_trgm (threshold 0.6)

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ActorResolver
# ---------------------------------------------------------------------------

class ActorResolver:
    """
    Resuelve nombres de entidades a actor_ids de la tabla actores.

    Estrategia en cascada:
      1. Busqueda exacta normalizada
      2. Busqueda en array aliases (PostgreSQL @>)
      3. Similitud pg_trgm (threshold 0.6)
    """

    # Cache de nombre -> actor_id para evitar queries repetidas
    _cache: dict[str, int | None] = {}

    def __init__(self, db_session: Any = None) -> None:
        self._session = db_session

    async def resolver(self, nombre: str) -> int | None:
        """Resuelve un nombre de entidad a actor_id. Retorna None si no encuentra."""
        if not nombre or len(nombre.strip()) < 3:
            return None

        nombre_norm = self._normalizar(nombre)
        if nombre_norm in self._cache:
            return self._cache[nombre_norm]

        actor_id = await self._buscar_en_db(nombre_norm)
        self._cache[nombre_norm] = actor_id
        return actor_id

    async def resolver_lote(self, nombres: list[str]) -> dict[str, int | None]:
        """Resuelve un lote de nombres. Retorna {nombre: actor_id | None}."""
        tareas = {nombre: self.resolver(nombre) for nombre in nombres}
        resultados: dict[str, int | None] = {}
        for nombre, coro in tareas.items():
            resultados[nombre] = await coro
        return resultados

    @staticmethod
    def _normalizar(nombre: str) -> str:
        """Normaliza un nombre para comparacion."""
        return nombre.strip().lower()[:200]

    async def _buscar_en_db(self, nombre_norm: str) -> int | None:
        """Busqueda en DB en 3 pasos."""
        if not self._session:
            return None

        try:
            from sqlalchemy import text

            # Paso 1: busqueda exacta en nombre_normalizado
            result = await self._session.execute(
                text("SELECT id FROM actores WHERE nombre_normalizado = :n LIMIT 1"),
                {"n": nombre_norm},
            )
            row = result.fetchone()
            if row:
                return int(row[0])

            # Paso 2: busqueda en array de aliases
            result = await self._session.execute(
                text("""
                    SELECT id FROM actores
                    WHERE aliases @> ARRAY[:n]::TEXT[]
                    LIMIT 1
                """),
                {"n": nombre_norm},
            )
            row = result.fetchone()
            if row:
                return int(row[0])

            # Paso 3: similitud pg_trgm
            result = await self._session.execute(
                text("""
                    SELECT id, similarity(nombre_normalizado, :n) AS sim
                    FROM actores
                    WHERE similarity(nombre_normalizado, :n) > 0.6
                    ORDER BY sim DESC
                    LIMIT 1
                """),
                {"n": nombre_norm},
            )
            row = result.fetchone()
            if row:
                return int(row[0])

        except Exception as exc:
            logger.debug("ActorResolver._buscar_en_db '%s': %s", nombre_norm, exc)

        return None


# ---------------------------------------------------------------------------
# NewsProcessor
# ---------------------------------------------------------------------------

class NewsProcessor:
    """
    Procesador completo de noticias usando Ollama.

    Pipeline:
        1. Resumen del articulo
        2. Extraccion de entidades
        3. Embedding del resumen
        4. Linkado de entidades a actores
        5. Guardado en DB con metadatos Ollama
        6. Actualizacion de relaciones entre actores co-mencionados

    Uso:
        async with OllamaClient() as ollama:
            processor = NewsProcessor(ollama, db_session)
            await processor.procesar_articulo(articulo_dict)
    """

    def __init__(
        self,
        ollama_client: Any,
        db_session: Any = None,
    ) -> None:
        self._ollama = ollama_client
        self._session = db_session
        self._resolver = ActorResolver(db_session)

    # ------------------------------------------------------------------
    # Pipeline principal
    # ------------------------------------------------------------------

    async def procesar_articulo(self, articulo: dict) -> dict:
        """
        Procesa un articulo completo.
        articulo debe tener: id, url_hash, titulo, texto_completo/resumen.
        Retorna el articulo enriquecido con campos Ollama.
        """
        texto = articulo.get("texto_completo", "") or articulo.get("resumen", "")
        titulo = articulo.get("titulo", "")
        texto_input = (titulo + ". " + texto).strip()

        resultado = dict(articulo)

        # 1. Resumen
        try:
            resumen_ollama = await self._ollama.resumir_noticia(texto_input, max_palabras=80)
            resultado["resumen_ollama"] = resumen_ollama
        except Exception as exc:
            logger.debug("procesar_articulo resumen: %s", exc)
            resultado["resumen_ollama"] = titulo[:300]

        # 2. Entidades
        try:
            entidades = await self._ollama.extraer_entidades(texto_input)
            resultado["entidades_ollama"] = entidades
        except Exception as exc:
            logger.debug("procesar_articulo entidades: %s", exc)
            resultado["entidades_ollama"] = {"personas": [], "organizaciones": [], "lugares": [], "temas": []}

        # 3. Embedding
        try:
            texto_embed = resultado.get("resumen_ollama", "") or texto_input[:512]
            embedding = await self._ollama.embed(texto_embed)
            resultado["embedding"] = embedding
        except Exception as exc:
            logger.debug("procesar_articulo embedding: %s", exc)
            resultado["embedding"] = []

        # 4. Actor linking
        actores_vinculados = await self._vincular_actores(resultado["entidades_ollama"])
        resultado["actores_vinculados"] = actores_vinculados

        # 5. Persistir
        if self._session:
            await self._guardar_resultado(resultado)
            await self._actualizar_relaciones(
                articulo_id=articulo.get("id"),
                actores_ids=[a["actor_id"] for a in actores_vinculados if a.get("actor_id")],
                fecha=articulo.get("fecha_pub", ""),
            )

        return resultado

    # ------------------------------------------------------------------
    # Vincular entidades a actores
    # ------------------------------------------------------------------

    async def _vincular_actores(self, entidades: dict) -> list[dict]:
        """
        Vincula personas y organizaciones extraidas a actores de la DB.
        Retorna lista de {nombre, actor_id, tipo, es_protagonista}.
        """
        vinculados: list[dict] = []
        vistos_ids: set[int] = set()

        personas = entidades.get("personas", [])[:10]
        orgs = entidades.get("organizaciones", [])[:10]

        todas = [(p, "PER") for p in personas] + [(o, "ORG") for o in orgs]

        for nombre, tipo in todas:
            actor_id = await self._resolver.resolver(nombre)
            if actor_id and actor_id not in vistos_ids:
                vistos_ids.add(actor_id)
                vinculados.append({
                    "nombre": nombre,
                    "actor_id": actor_id,
                    "tipo": tipo,
                    "es_protagonista": len(vinculados) == 0,  # El primero es protagonista
                })
            elif not actor_id:
                vinculados.append({
                    "nombre": nombre,
                    "actor_id": None,
                    "tipo": tipo,
                    "es_protagonista": False,
                })

        return vinculados

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------

    async def _guardar_resultado(self, resultado: dict) -> None:
        """Guarda el resumen, entidades y embedding en articulos_prensa."""
        if not self._session:
            return

        try:
            from sqlalchemy import text
            import json

            embedding = resultado.get("embedding", [])
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]" if embedding else None

            await self._session.execute(
                text("""
                    UPDATE articulos_prensa SET
                        resumen_ollama    = :resumen,
                        entidades_ollama  = :entidades,
                        embedding         = :embedding,
                        procesado_ollama  = true,
                        actualizado_en    = NOW()
                    WHERE url_hash = :url_hash
                """),
                {
                    "url_hash": resultado.get("url_hash", ""),
                    "resumen": resultado.get("resumen_ollama", "")[:2000],
                    "entidades": json.dumps(resultado.get("entidades_ollama", {})),
                    "embedding": embedding_str,
                },
            )
        except Exception as exc:
            logger.debug("_guardar_resultado: %s", exc)

    async def _actualizar_relaciones(
        self,
        articulo_id: int | None,
        actores_ids: list[int],
        fecha: str,
    ) -> None:
        """
        Registra menciones de actores y actualiza relaciones co-mencionados.
        """
        if not self._session or not articulo_id or not actores_ids:
            return

        try:
            from sqlalchemy import text

            # Insertar en junction noticias_actores
            for actor_id in actores_ids:
                await self._session.execute(
                    text("""
                        INSERT INTO noticias_actores (articulo_id, actor_id, es_protagonista, creado_en)
                        VALUES (:art_id, :act_id, false, NOW())
                        ON CONFLICT (articulo_id, actor_id) DO NOTHING
                    """),
                    {"art_id": articulo_id, "act_id": actor_id},
                )

            # Actualizar relaciones co-menciones (pares de actores)
            for i, actor_a in enumerate(actores_ids):
                for actor_b in actores_ids[i+1:]:
                    await self._session.execute(
                        text("""
                            INSERT INTO actor_relaciones (actor_a_id, actor_b_id, n_co_menciones, ultima_co_mencion)
                            VALUES (:a, :b, 1, NOW())
                            ON CONFLICT (actor_a_id, actor_b_id) DO UPDATE SET
                                n_co_menciones    = actor_relaciones.n_co_menciones + 1,
                                ultima_co_mencion = NOW()
                        """),
                        {"a": min(actor_a, actor_b), "b": max(actor_a, actor_b)},
                    )

        except Exception as exc:
            logger.debug("_actualizar_relaciones: %s", exc)

    # ------------------------------------------------------------------
    # Procesamiento por lotes
    # ------------------------------------------------------------------

    async def procesar_lote(
        self,
        articulos: list[dict],
        max_concurrente: int = 3,
        actualizar_db: bool = True,
    ) -> list[dict]:
        """
        Procesa un lote de articulos con concurrencia controlada.
        """
        sem = asyncio.Semaphore(max_concurrente)

        async def _procesar_uno(art: dict) -> dict:
            async with sem:
                return await self.procesar_articulo(art)

        resultados = await asyncio.gather(
            *[_procesar_uno(art) for art in articulos],
            return_exceptions=True,
        )

        procesados: list[dict] = []
        errores = 0
        for art, res in zip(articulos, resultados):
            if isinstance(res, Exception):
                errores += 1
                logger.debug("procesar_lote error en %s: %s", art.get("url_hash", ""), res)
                procesados.append(dict(art))
            else:
                procesados.append(res)

        logger.info("NewsProcessor.procesar_lote: %d OK, %d errores de %d total",
                    len(procesados) - errores, errores, len(articulos))
        return procesados

    # ------------------------------------------------------------------
    # Obtener articulos pendientes de procesamiento
    # ------------------------------------------------------------------

    async def obtener_pendientes(self, limite: int = 100) -> list[dict]:
        """Obtiene articulos no procesados aun por Ollama."""
        if not self._session:
            return []

        try:
            from sqlalchemy import text
            result = await self._session.execute(
                text("""
                    SELECT id, url_hash, titulo, resumen, texto_completo,
                           medio, fecha_pub
                    FROM articulos_prensa
                    WHERE procesado_ollama = false
                      AND titulo IS NOT NULL
                    ORDER BY fecha_pub DESC
                    LIMIT :limite
                """),
                {"limite": limite},
            )
            filas = result.fetchall()
            keys = result.keys()
            return [dict(zip(keys, fila)) for fila in filas]
        except Exception as exc:
            logger.debug("obtener_pendientes: %s", exc)
            return []
