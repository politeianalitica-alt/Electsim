"""
Pipeline Prefect — Bloque 1: Extraccion y normalizacion de menciones.

Flujo principal (flow extraction_flow):
  1. load_unprocessed_articles  — carga articulos de news_articles sin menciones
  2. extract_batch              — extrae menciones con spaCy (en batches)
  3. write_raw_mentions         — inserta en raw_mentions (psycopg v3, upsert)
  4. seed_canonical_entities    — popula entities_canonical + entity_aliases
                                  desde aliases.yaml (idempotente)

El flow puede ejecutarse como tarea Prefect standalone o llamarse
directamente desde el scheduler (dashboard/workers/news_scheduler.py).

Variables de entorno:
  DATABASE_URL         — PostgreSQL connection string
  ER_BATCH_SIZE        — articulos por batch (default: 50)
  ER_MAX_ARTICLES      — limite por ejecucion (default: 500)
  ER_LOOKBACK_HOURS    — ventana de articulos a procesar (default: 48)
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prefect — import opcional para poder usar el modulo sin Prefect instalado
# ---------------------------------------------------------------------------
try:
    from prefect import flow, task, get_run_logger  # type: ignore
    _PREFECT = True
except ImportError:
    # Si Prefect no esta disponible, los decoradores son no-ops
    _PREFECT = False

    def flow(fn=None, **_kw):  # type: ignore
        return fn if fn else lambda f: f

    def task(fn=None, **_kw):  # type: ignore
        return fn if fn else lambda f: f

    def get_run_logger():  # type: ignore
        return logging.getLogger(__name__)

from .extractor import extract_mentions
from .models import Article, ExtractionResult, RawMention
from .normalizer import iter_canonical_entities, normalize, _normalize_for_lookup

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------

_BATCH_SIZE      = int(os.getenv("ER_BATCH_SIZE",      "50"))
_MAX_ARTICLES    = int(os.getenv("ER_MAX_ARTICLES",    "500"))
_LOOKBACK_HOURS  = int(os.getenv("ER_LOOKBACK_HOURS",  "48"))


# ---------------------------------------------------------------------------
# Utilidad de conexion (psycopg v3)
# ---------------------------------------------------------------------------

def _get_conn():
    """Devuelve una conexion psycopg v3 desde DATABASE_URL."""
    import psycopg  # type: ignore
    url = os.environ.get("DATABASE_URL", "")
    return psycopg.connect(url)


# ---------------------------------------------------------------------------
# Tarea 0: seed de entidades canonicas desde aliases.yaml
# ---------------------------------------------------------------------------

@task(name="seed_canonical_entities", retries=2, retry_delay_seconds=10)
def seed_canonical_entities() -> int:
    """
    Inserta/actualiza entidades canonicas y sus aliases en la BD.
    Idempotente: usa ON CONFLICT DO UPDATE para no duplicar.

    Returns:
      Numero de entidades procesadas.
    """
    logger = get_run_logger() if _PREFECT else log

    entities = iter_canonical_entities()
    if not entities:
        logger.warning("aliases.yaml vacio o no encontrado")
        return 0

    inserted = 0
    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                for ent in entities:
                    # Upsert entidad canonical
                    cur.execute(
                        """
                        INSERT INTO entities_canonical
                            (qid, nombre_oficial, tipo, cargo_actual, partido_qid, pais)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (qid) DO UPDATE SET
                            nombre_oficial = EXCLUDED.nombre_oficial,
                            cargo_actual   = EXCLUDED.cargo_actual,
                            partido_qid    = EXCLUDED.partido_qid,
                            updated_at     = NOW()
                        RETURNING id
                        """,
                        (
                            ent["qid"],
                            ent["nombre_oficial"],
                            ent["tipo"],
                            ent.get("cargo_actual"),
                            ent.get("partido_qid"),
                            ent.get("pais"),
                        ),
                    )
                    row = cur.fetchone()
                    if row is None:
                        # El UPDATE no devuelve fila en algunos drivers; fetch por qid
                        cur.execute(
                            "SELECT id FROM entities_canonical WHERE qid = %s",
                            (ent["qid"],),
                        )
                        row = cur.fetchone()
                    entity_db_id = row[0]

                    # Upsert aliases
                    for alias in ent.get("aliases_raw", []):
                        alias_norm = _normalize_for_lookup(alias)
                        if not alias_norm:
                            continue
                        cur.execute(
                            """
                            INSERT INTO entity_aliases (entity_id, alias, alias_norm)
                            VALUES (%s, %s, %s)
                            ON CONFLICT DO NOTHING
                            """,
                            (entity_db_id, alias, alias_norm),
                        )
                    inserted += 1

        conn.close()
        logger.info("seed_canonical_entities: %d entidades procesadas", inserted)
    except Exception as exc:
        logger.error("Error en seed_canonical_entities: %s", exc)
        raise

    return inserted


# ---------------------------------------------------------------------------
# Tarea 1: carga de articulos sin menciones
# ---------------------------------------------------------------------------

@task(name="load_unprocessed_articles", retries=2, retry_delay_seconds=5)
def load_unprocessed_articles(limit: int = _MAX_ARTICLES) -> list[dict]:
    """
    Carga articulos de news_articles que aun no tienen menciones en raw_mentions.

    Usa LEFT JOIN para detectar articulos nuevos sin procesar.
    """
    logger = get_run_logger() if _PREFECT else log

    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        na.id,
                        na.url,
                        na.headline,
                        na.body,
                        na.source,
                        na.published_at
                    FROM news_articles na
                    LEFT JOIN (
                        SELECT DISTINCT article_id
                        FROM raw_mentions
                        WHERE article_id IS NOT NULL
                    ) rm ON rm.article_id = na.id
                    WHERE rm.article_id IS NULL
                      AND na.published_at >= NOW() - INTERVAL '%s hours'
                      AND na.body IS NOT NULL
                      AND length(na.body) > 100
                    ORDER BY na.published_at DESC
                    LIMIT %s
                    """,
                    (_LOOKBACK_HOURS, limit),
                )
                rows = cur.fetchall()
        conn.close()
    except Exception as exc:
        logger.error("Error cargando articulos: %s", exc)
        return []

    articles = []
    for row in rows:
        articles.append(
            {
                "id":           row[0],
                "url":          row[1] or "",
                "headline":     row[2] or "",
                "body":         row[3] or "",
                "source":       row[4] or "",
                "published_at": row[5],
            }
        )
    logger.info("load_unprocessed_articles: %d articulos cargados", len(articles))
    return articles


# ---------------------------------------------------------------------------
# Tarea 2: extraccion en batch
# ---------------------------------------------------------------------------

@task(name="extract_batch", retries=1, retry_delay_seconds=5)
def extract_batch(articles_raw: list[dict]) -> list[ExtractionResult]:
    """
    Ejecuta extract_mentions() sobre un batch de articulos.
    Captura errores por articulo sin abortar el batch completo.
    """
    logger = get_run_logger() if _PREFECT else log
    results: list[ExtractionResult] = []

    for raw in articles_raw:
        article = Article(
            url=raw["url"],
            text=raw["body"],
            headline=raw["headline"],
            source_media=raw["source"],
            published_at=raw.get("published_at"),
            article_id=raw.get("id"),
        )
        try:
            result = extract_mentions(article)
        except Exception as exc:
            log.warning("Error extrayendo %s: %s", raw["url"][:80], exc)
            result = ExtractionResult(article=article, error=str(exc))
        results.append(result)

    ok = sum(1 for r in results if r.ok)
    total_mentions = sum(len(r.mentions) for r in results if r.ok)
    logger.info(
        "extract_batch: %d/%d ok, %d menciones totales",
        ok, len(results), total_mentions,
    )
    return results


# ---------------------------------------------------------------------------
# Tarea 3: escritura en raw_mentions
# ---------------------------------------------------------------------------

@task(name="write_raw_mentions", retries=3, retry_delay_seconds=10)
def write_raw_mentions(results: list[ExtractionResult]) -> dict[str, int]:
    """
    Inserta menciones en raw_mentions usando upsert por (article_url, surface_text, char_start).
    Evita duplicados si el pipeline se re-ejecuta sobre el mismo articulo.
    """
    logger = get_run_logger() if _PREFECT else log

    stats = {"inserted": 0, "skipped": 0, "errors": 0}

    mentions_to_insert: list[RawMention] = []
    for result in results:
        if result.ok:
            mentions_to_insert.extend(result.mentions)

    if not mentions_to_insert:
        logger.info("write_raw_mentions: nada que insertar")
        return stats

    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                for m in mentions_to_insert:
                    try:
                        cur.execute(
                            """
                            INSERT INTO raw_mentions (
                                article_url, article_id, source_media, published_at,
                                surface_text, surface_norm, ner_label,
                                context_window, char_start, char_end, sentence_idx,
                                resolved_qid, resolution_method, resolution_score,
                                processed
                            ) VALUES (
                                %s, %s, %s, %s,
                                %s, %s, %s,
                                %s, %s, %s, %s,
                                %s, %s, %s,
                                %s
                            )
                            ON CONFLICT DO NOTHING
                            """,
                            (
                                m.article_url,
                                m.article_id,
                                m.source_media,
                                m.published_at,
                                m.surface_text,
                                m.surface_norm,
                                m.ner_label,
                                m.context_window,
                                m.char_start,
                                m.char_end,
                                m.sentence_idx,
                                m.resolved_qid,
                                m.resolution_method,
                                m.resolution_score if m.resolved_qid else None,
                                # Ya resueltas por YAML se marcan como procesadas
                                m.resolved_qid is not None,
                            ),
                        )
                        stats["inserted"] += cur.rowcount
                    except Exception as exc:
                        log.warning("Error insertando mencion %s: %s", m.surface_text[:40], exc)
                        stats["errors"] += 1
        conn.close()
    except Exception as exc:
        logger.error("Error en write_raw_mentions: %s", exc)
        stats["errors"] += 1

    logger.info(
        "write_raw_mentions: inserted=%d skipped=%d errors=%d",
        stats["inserted"], stats["skipped"], stats["errors"],
    )
    return stats


# ---------------------------------------------------------------------------
# Flow principal
# ---------------------------------------------------------------------------

@flow(
    name="extraction_flow",
    description="Bloque 1: Extrae menciones de entidades de articulos nuevos",
)
def extraction_flow(
    max_articles: int = _MAX_ARTICLES,
    batch_size:   int = _BATCH_SIZE,
    seed_aliases: bool = True,
) -> dict[str, Any]:
    """
    Flow principal de Bloque 1.

    Args:
      max_articles: maximo de articulos a procesar en esta ejecucion
      batch_size:   tamano de cada batch para extract_batch
      seed_aliases: si True, sincroniza entities_canonical desde aliases.yaml

    Returns:
      Diccionario con estadisticas de la ejecucion.
    """
    logger = get_run_logger() if _PREFECT else log
    logger.info("extraction_flow iniciado (max=%d, batch=%d)", max_articles, batch_size)

    stats: dict[str, Any] = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "entities_seeded": 0,
        "articles_loaded": 0,
        "mentions_inserted": 0,
        "errors": 0,
    }

    # Paso 0: seed desde YAML
    if seed_aliases:
        stats["entities_seeded"] = seed_canonical_entities()

    # Paso 1: cargar articulos
    articles_raw = load_unprocessed_articles(limit=max_articles)
    stats["articles_loaded"] = len(articles_raw)

    if not articles_raw:
        logger.info("No hay articulos nuevos que procesar")
        return stats

    # Paso 2: extraer en batches
    all_results: list[ExtractionResult] = []
    for i in range(0, len(articles_raw), batch_size):
        batch = articles_raw[i : i + batch_size]
        results = extract_batch(batch)
        all_results.extend(results)

    # Paso 3: escribir menciones
    write_stats = write_raw_mentions(all_results)
    stats["mentions_inserted"] = write_stats.get("inserted", 0)
    stats["errors"]            = write_stats.get("errors", 0)
    stats["finished_at"]       = datetime.now(timezone.utc).isoformat()

    logger.info(
        "extraction_flow completado: %d menciones insertadas de %d articulos",
        stats["mentions_inserted"],
        stats["articles_loaded"],
    )
    return stats


# ---------------------------------------------------------------------------
# Punto de entrada directo (sin Prefect)
# ---------------------------------------------------------------------------

def run_extraction(
    max_articles: int = _MAX_ARTICLES,
    batch_size:   int = _BATCH_SIZE,
    seed_aliases: bool = True,
) -> dict[str, Any]:
    """
    Ejecuta el pipeline sin Prefect. Util para llamadas desde el scheduler
    o desde el dashboard.
    """
    if _PREFECT:
        return extraction_flow(
            max_articles=max_articles,
            batch_size=batch_size,
            seed_aliases=seed_aliases,
        )
    else:
        # Ejecucion directa sin Prefect
        result: dict[str, Any] = {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "entities_seeded": 0,
            "articles_loaded": 0,
            "mentions_inserted": 0,
            "errors": 0,
        }
        if seed_aliases:
            result["entities_seeded"] = seed_canonical_entities()
        articles_raw = load_unprocessed_articles(limit=max_articles)
        result["articles_loaded"] = len(articles_raw)
        if articles_raw:
            all_results = []
            for i in range(0, len(articles_raw), batch_size):
                batch = articles_raw[i : i + batch_size]
                all_results.extend(extract_batch(batch))
            ws = write_raw_mentions(all_results)
            result["mentions_inserted"] = ws.get("inserted", 0)
            result["errors"] = ws.get("errors", 0)
        result["finished_at"] = datetime.now(timezone.utc).isoformat()
        return result


if __name__ == "__main__":
    import json
    result = run_extraction()
    print(json.dumps(result, indent=2, default=str))
