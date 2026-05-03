"""
Pipeline Prefect — Bloque 2: Resolucion de identidades en cascada.

Flujo principal (flow resolution_flow):
  1. load_index            — carga EmbeddingIndex desde entities_canonical
  2. load_unresolved       — carga raw_mentions.processed = FALSE
  3. resolve_batch         — aplica CascadeResolver a cada mencion
  4. write_resolutions     — inserta en entity_mentions, actualiza raw_mentions
  5. write_review_queue    — encola en resolution_review_queue si needs_review
  6. feedback_to_aliases   — actualiza frecuencia en entity_aliases (retroalimentacion)

Variables de entorno:
  DATABASE_URL              — PostgreSQL connection string
  RES_BATCH_SIZE            — menciones por batch (default: 100)
  RES_MAX_MENTIONS          — limite por ejecucion (default: 2000)
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)

try:
    from prefect import flow, task, get_run_logger  # type: ignore
    _PREFECT = True
except ImportError:
    _PREFECT = False

    def flow(fn=None, **_kw):  # type: ignore
        return fn if fn else lambda f: f

    def task(fn=None, **_kw):  # type: ignore
        return fn if fn else lambda f: f

    def get_run_logger():  # type: ignore
        return logging.getLogger(__name__)

from .embedding_store import load_index, get_index
from .models import ResolutionMethod, ResolutionResult
from .resolver import CascadeResolver

_BATCH_SIZE   = int(os.getenv("RES_BATCH_SIZE",   "100"))
_MAX_MENTIONS = int(os.getenv("RES_MAX_MENTIONS", "2000"))


def _get_conn():
    import psycopg  # type: ignore
    return psycopg.connect(os.environ.get("DATABASE_URL", ""))


# ---------------------------------------------------------------------------
# Tarea 1: Carga del indice de embeddings
# ---------------------------------------------------------------------------

@task(name="res_load_index", retries=2, retry_delay_seconds=15)
def res_load_index() -> int:
    logger = get_run_logger() if _PREFECT else log
    n = load_index()
    logger.info("res_load_index: %d entidades en el indice", n)
    return n


# ---------------------------------------------------------------------------
# Tarea 2: Carga de menciones sin resolver
# ---------------------------------------------------------------------------

@task(name="res_load_unresolved", retries=2, retry_delay_seconds=5)
def res_load_unresolved(limit: int = _MAX_MENTIONS) -> list[dict]:
    """Carga raw_mentions donde processed = FALSE y resolved_qid IS NULL."""
    logger = get_run_logger() if _PREFECT else log
    rows = []
    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, surface_text, surface_norm, context_window,
                           ner_label, article_url, published_at,
                           resolved_qid, resolution_method
                    FROM raw_mentions
                    WHERE processed = FALSE
                    ORDER BY published_at DESC NULLS LAST
                    LIMIT %s
                    """,
                    (limit,),
                )
                rows = cur.fetchall()
        conn.close()
    except Exception as exc:
        logger.error("Error cargando menciones sin resolver: %s", exc)
        return []

    result = []
    for row in rows:
        result.append(
            {
                "id":               row[0],
                "surface_text":     row[1] or "",
                "surface_norm":     row[2] or "",
                "context_window":   row[3] or "",
                "ner_label":        row[4] or "",
                "article_url":      row[5] or "",
                "published_at":     row[6],
                "yaml_qid":         row[7],      # puede que ya venga de Bloque 1
                "yaml_method":      row[8],
            }
        )
    logger.info("res_load_unresolved: %d menciones cargadas", len(result))
    return result


# ---------------------------------------------------------------------------
# Tarea 3: Resolucion en batch
# ---------------------------------------------------------------------------

@task(name="res_resolve_batch", retries=1)
def res_resolve_batch(mentions_raw: list[dict]) -> list[ResolutionResult]:
    """Aplica CascadeResolver a cada mencion del batch."""
    logger = get_run_logger() if _PREFECT else log
    resolver = CascadeResolver(embedding_index=get_index())
    results: list[ResolutionResult] = []

    for m in mentions_raw:
        try:
            result = resolver.resolve(
                raw_mention_id=m["id"],
                surface_text=m["surface_text"],
                surface_norm=m["surface_norm"],
                context_window=m["context_window"],
                ner_label=m["ner_label"],
                yaml_resolved_qid=m.get("yaml_qid")
                    if m.get("yaml_method") == "yaml" else None,
            )
            results.append(result)
        except Exception as exc:
            log.warning("Error resolviendo mencion %d: %s", m["id"], exc)

    resolved = sum(1 for r in results if r.resolved)
    needs_review = sum(1 for r in results if r.needs_review)
    logger.info(
        "res_resolve_batch: %d/%d resueltas, %d en cola de revision",
        resolved, len(results), needs_review,
    )
    return results


# ---------------------------------------------------------------------------
# Tarea 4: Escritura de resoluciones
# ---------------------------------------------------------------------------

@task(name="res_write_resolutions", retries=3, retry_delay_seconds=10)
def res_write_resolutions(results: list[ResolutionResult]) -> dict[str, int]:
    """
    Para cada ResolutionResult:
      - Actualiza raw_mentions (resolved_qid, method, score, processed=TRUE)
      - Inserta en entity_mentions si resolved
    """
    logger = get_run_logger() if _PREFECT else log
    stats = {"mentions_updated": 0, "entity_mentions_inserted": 0, "errors": 0}

    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                for r in results:
                    try:
                        # Actualizar raw_mentions
                        cur.execute(
                            """
                            UPDATE raw_mentions SET
                                resolved_qid        = %s,
                                resolution_method   = %s,
                                resolution_score    = %s,
                                resolved_at         = NOW(),
                                processed           = TRUE
                            WHERE id = %s
                            """,
                            (
                                r.resolved_qid,
                                r.method.value,
                                r.score if r.resolved_qid else None,
                                r.raw_mention_id,
                            ),
                        )
                        stats["mentions_updated"] += cur.rowcount

                        # Insertar entity_mention si resuelto
                        if r.resolved_qid:
                            # Obtener entity_id desde QID
                            cur.execute(
                                "SELECT id FROM entities_canonical WHERE qid = %s",
                                (r.resolved_qid,),
                            )
                            row = cur.fetchone()
                            entity_db_id = row[0] if row else None

                            cur.execute(
                                """
                                INSERT INTO entity_mentions (
                                    raw_mention_id, entity_id, qid,
                                    article_url, context_window,
                                    co_entities,
                                    resolution_method, resolution_score
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (raw_mention_id) DO NOTHING
                                """,
                                (
                                    r.raw_mention_id,
                                    entity_db_id,
                                    r.resolved_qid,
                                    "",   # article_url se rellena en el join con raw_mentions
                                    r.context_window,
                                    json.dumps([]),
                                    r.method.value,
                                    r.score,
                                ),
                            )
                            stats["entity_mentions_inserted"] += cur.rowcount

                    except Exception as exc:
                        log.warning("Error escribiendo resolucion %d: %s", r.raw_mention_id, exc)
                        stats["errors"] += 1

        conn.close()
    except Exception as exc:
        logger.error("Error en res_write_resolutions: %s", exc)

    logger.info(
        "res_write_resolutions: %d actualizadas, %d entity_mentions, %d errores",
        stats["mentions_updated"], stats["entity_mentions_inserted"], stats["errors"],
    )
    return stats


# ---------------------------------------------------------------------------
# Tarea 5: Cola de revision
# ---------------------------------------------------------------------------

@task(name="res_write_review_queue", retries=2)
def res_write_review_queue(results: list[ResolutionResult]) -> int:
    """Encola en resolution_review_queue las menciones con needs_review=True."""
    logger = get_run_logger() if _PREFECT else log
    to_review = [r for r in results if r.needs_review]

    if not to_review:
        return 0

    inserted = 0
    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                for r in to_review:
                    candidates_json = json.dumps(
                        [{"qid": c.qid, "nombre": c.nombre_oficial, "score": c.score}
                         for c in r.candidates]
                    )
                    cur.execute(
                        """
                        INSERT INTO resolution_review_queue (
                            raw_mention_id, surface_text, context_window,
                            candidates, ollama_response, max_score, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            r.raw_mention_id,
                            r.surface_text,
                            r.context_window,
                            candidates_json,
                            r.ollama_response,
                            r.candidates[0].score if r.candidates else None,
                        ),
                    )
                    inserted += cur.rowcount
        conn.close()
    except Exception as exc:
        logger.error("Error escribiendo cola de revision: %s", exc)

    logger.info("res_write_review_queue: %d elementos encolados", inserted)
    return inserted


# ---------------------------------------------------------------------------
# Tarea 6: Retroalimentacion a entity_aliases
# ---------------------------------------------------------------------------

@task(name="res_feedback_to_aliases", retries=2)
def res_feedback_to_aliases(results: list[ResolutionResult]) -> int:
    """
    Incrementa entity_aliases.frecuencia para cada alias que fue
    resuelto con confianza alta. Esto mejora el ranking de lookup YAML.
    """
    logger = get_run_logger() if _PREFECT else log
    high_conf = [
        r for r in results
        if r.resolved and r.score >= 0.88 and r.method != ResolutionMethod.REVIEW
    ]

    if not high_conf:
        return 0

    updated = 0
    try:
        conn = _get_conn()
        with conn:
            with conn.cursor() as cur:
                for r in high_conf:
                    cur.execute(
                        """
                        UPDATE entity_aliases
                        SET frecuencia = frecuencia + 1
                        WHERE alias_norm = %s
                        """,
                        (r.surface_norm,),
                    )
                    updated += cur.rowcount
        conn.close()
    except Exception as exc:
        logger.error("Error en feedback_to_aliases: %s", exc)

    logger.info("res_feedback_to_aliases: %d alias actualizados", updated)
    return updated


# ---------------------------------------------------------------------------
# Flow principal
# ---------------------------------------------------------------------------

@flow(
    name="resolution_flow",
    description="Bloque 2: Resuelve menciones sin QID usando embedding + Ollama",
)
def resolution_flow(
    max_mentions: int = _MAX_MENTIONS,
    batch_size:   int = _BATCH_SIZE,
) -> dict[str, Any]:
    logger = get_run_logger() if _PREFECT else log
    logger.info("resolution_flow iniciado (max=%d)", max_mentions)

    stats: dict[str, Any] = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "index_size": 0,
        "mentions_loaded": 0,
        "mentions_resolved": 0,
        "review_queue_added": 0,
        "errors": 0,
    }

    # Paso 1: cargar indice
    stats["index_size"] = res_load_index()

    # Paso 2: cargar menciones
    mentions_raw = res_load_unresolved(limit=max_mentions)
    stats["mentions_loaded"] = len(mentions_raw)

    if not mentions_raw:
        logger.info("No hay menciones pendientes de resolver")
        return stats

    # Paso 3-6: batch
    all_results: list[ResolutionResult] = []
    for i in range(0, len(mentions_raw), batch_size):
        batch = mentions_raw[i : i + batch_size]
        batch_results = res_resolve_batch(batch)
        all_results.extend(batch_results)

    write_stats = res_write_resolutions(all_results)
    stats["mentions_resolved"] = write_stats.get("entity_mentions_inserted", 0)
    stats["errors"]            = write_stats.get("errors", 0)
    stats["review_queue_added"] = res_write_review_queue(all_results)
    res_feedback_to_aliases(all_results)

    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    logger.info(
        "resolution_flow completado: %d resueltas, %d en cola",
        stats["mentions_resolved"], stats["review_queue_added"],
    )
    return stats


def run_resolution(
    max_mentions: int = _MAX_MENTIONS,
    batch_size:   int = _BATCH_SIZE,
) -> dict[str, Any]:
    """Punto de entrada sin Prefect."""
    if _PREFECT:
        return resolution_flow(max_mentions=max_mentions, batch_size=batch_size)

    stats: dict[str, Any] = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "index_size": res_load_index(),
        "mentions_loaded": 0,
        "mentions_resolved": 0,
        "review_queue_added": 0,
        "errors": 0,
    }
    mentions_raw = res_load_unresolved(limit=max_mentions)
    stats["mentions_loaded"] = len(mentions_raw)
    if mentions_raw:
        all_results = []
        for i in range(0, len(mentions_raw), batch_size):
            all_results.extend(res_resolve_batch(mentions_raw[i : i + batch_size]))
        ws = res_write_resolutions(all_results)
        stats["mentions_resolved"] = ws.get("entity_mentions_inserted", 0)
        stats["errors"] = ws.get("errors", 0)
        stats["review_queue_added"] = res_write_review_queue(all_results)
        res_feedback_to_aliases(all_results)
    stats["finished_at"] = datetime.now(timezone.utc).isoformat()
    return stats


if __name__ == "__main__":
    import json as _json
    print(_json.dumps(run_resolution(), indent=2, default=str))
