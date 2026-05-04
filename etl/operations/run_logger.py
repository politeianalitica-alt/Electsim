"""
Run Logger — Bloque 8.

Context manager y funciones para registrar ejecuciones de pipelines.

Uso:
    from etl.operations.run_logger import pipeline_run

    with pipeline_run("media_core", source_id="rss_media") as run:
        items = extract_items()
        run.records_extracted = len(items)
        loaded = load_items(items)
        run.records_loaded = loaded

Si la tabla pipeline_runs no existe, registra en consola y no rompe.
"""
from __future__ import annotations

import logging
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator

logger = logging.getLogger(__name__)


class RunContext:
    """Contexto de ejecución de un pipeline. Se modifica durante la ejecución."""

    def __init__(
        self,
        run_id: str,
        pipeline_id: str,
        source_id: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        self.run_id = run_id
        self.pipeline_id = pipeline_id
        self.source_id = source_id
        self.started_at = datetime.now(timezone.utc)
        self.metadata = metadata or {}

        # Stats actualizables por el caller
        self.records_extracted: int = 0
        self.records_loaded: int = 0
        self.records_updated: int = 0
        self.records_duplicate: int = 0
        self.records_failed: int = 0

        # Internos
        self._start_time = time.monotonic()
        self._engine: Any = None

    @property
    def duration_seconds(self) -> float:
        return time.monotonic() - self._start_time

    def set_engine(self, engine: Any) -> None:
        self._engine = engine


def _get_engine() -> Any:
    """Obtiene el engine compartido del dashboard."""
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


def start_run(
    pipeline_id: str,
    source_id: str | None = None,
    metadata: dict | None = None,
    engine: Any = None,
) -> str:
    """
    Inicia el registro de una ejecución de pipeline.

    Returns:
        run_id generado.
    """
    run_id = str(uuid.uuid4())
    eng = engine or _get_engine()

    if eng is not None:
        try:
            import json
            from sqlalchemy import text as sa_text
            with eng.begin() as conn:
                conn.execute(sa_text("""
                    INSERT INTO pipeline_runs (
                        run_id, pipeline_id, source_id, status,
                        started_at, metadata
                    ) VALUES (
                        :run_id, :pipeline_id, :source_id, 'running',
                        :started_at, :metadata::jsonb
                    )
                """), {
                    "run_id": run_id,
                    "pipeline_id": pipeline_id,
                    "source_id": source_id,
                    "started_at": datetime.now(timezone.utc),
                    "metadata": json.dumps(metadata or {}),
                })
        except Exception as exc:
            logger.debug("start_run DB: %s", exc)

    logger.info("pipeline_run START [%s] pipeline=%s source=%s", run_id[:8], pipeline_id, source_id)
    return run_id


def finish_run(
    run_id: str,
    status: str,
    stats: dict,
    engine: Any = None,
) -> None:
    """
    Finaliza el registro de una ejecución.

    Args:
        run_id: ID de la ejecución.
        status: Estado final ('success', 'partial', 'failed', 'skipped').
        stats: Dict con records_extracted, records_loaded, etc.
    """
    eng = engine or _get_engine()
    finished_at = datetime.now(timezone.utc)

    logger.info(
        "pipeline_run END [%s] status=%s extracted=%d loaded=%d duration=%.1fs",
        run_id[:8], status,
        stats.get("records_extracted", 0),
        stats.get("records_loaded", 0),
        stats.get("duration_seconds", 0),
    )

    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            with eng.begin() as conn:
                conn.execute(sa_text("""
                    UPDATE pipeline_runs SET
                        status = :status,
                        finished_at = :finished_at,
                        records_extracted = :records_extracted,
                        records_loaded = :records_loaded,
                        records_updated = :records_updated,
                        records_duplicate = :records_duplicate,
                        records_failed = :records_failed,
                        duration_seconds = :duration_seconds
                    WHERE run_id = :run_id
                """), {
                    "run_id": run_id,
                    "status": status,
                    "finished_at": finished_at,
                    "records_extracted": stats.get("records_extracted", 0),
                    "records_loaded": stats.get("records_loaded", 0),
                    "records_updated": stats.get("records_updated", 0),
                    "records_duplicate": stats.get("records_duplicate", 0),
                    "records_failed": stats.get("records_failed", 0),
                    "duration_seconds": stats.get("duration_seconds"),
                })
        except Exception as exc:
            logger.debug("finish_run DB: %s", exc)


def fail_run(
    run_id: str,
    exc: Exception,
    engine: Any = None,
) -> None:
    """Registra un fallo en una ejecución."""
    eng = engine or _get_engine()
    error_msg = str(exc)[:1000]
    error_type = type(exc).__name__

    logger.error("pipeline_run FAIL [%s] %s: %s", run_id[:8], error_type, error_msg)

    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            with eng.begin() as conn:
                conn.execute(sa_text("""
                    UPDATE pipeline_runs SET
                        status = 'failed',
                        finished_at = NOW(),
                        error_message = :error_message,
                        error_type = :error_type
                    WHERE run_id = :run_id
                """), {
                    "run_id": run_id,
                    "error_message": error_msg,
                    "error_type": error_type,
                })
        except Exception as db_exc:
            logger.debug("fail_run DB: %s", db_exc)


@contextmanager
def pipeline_run(
    pipeline_id: str,
    source_id: str | None = None,
    metadata: dict | None = None,
    engine: Any = None,
) -> Generator[RunContext, None, None]:
    """
    Context manager para registrar ejecuciones de pipelines.

    Ejemplo:
        with pipeline_run("media_core", source_id="rss_media") as run:
            items = extract()
            run.records_extracted = len(items)
            run.records_loaded = load(items)

    Args:
        pipeline_id: ID del pipeline.
        source_id: ID de la fuente (opcional).
        metadata: Metadatos adicionales.
        engine: SQLAlchemy engine (None → auto-detect).
    """
    eng = engine or _get_engine()
    run_id = start_run(pipeline_id, source_id=source_id, metadata=metadata, engine=eng)
    ctx = RunContext(run_id=run_id, pipeline_id=pipeline_id, source_id=source_id, metadata=metadata)
    ctx.set_engine(eng)

    try:
        yield ctx

        # Determinar status
        if ctx.records_failed > 0 and ctx.records_loaded > 0:
            status = "partial"
        elif ctx.records_failed > 0:
            status = "failed"
        else:
            status = "success"

        finish_run(run_id, status=status, stats={
            "records_extracted": ctx.records_extracted,
            "records_loaded": ctx.records_loaded,
            "records_updated": ctx.records_updated,
            "records_duplicate": ctx.records_duplicate,
            "records_failed": ctx.records_failed,
            "duration_seconds": ctx.duration_seconds,
        }, engine=eng)

    except Exception as exc:
        fail_run(run_id, exc, engine=eng)
        raise


def get_recent_runs(
    pipeline_id: str | None = None,
    source_id: str | None = None,
    limit: int = 50,
    engine: Any = None,
) -> list[dict]:
    """Obtiene las ejecuciones recientes de pipelines."""
    eng = engine or _get_engine()
    if eng is None:
        return []

    try:
        import pandas as pd
        from sqlalchemy import text as sa_text
        with eng.connect() as conn:
            df = pd.read_sql(sa_text("""
                SELECT run_id, pipeline_id, source_id, status,
                       started_at, finished_at, duration_seconds,
                       records_extracted, records_loaded,
                       records_failed, error_type
                FROM pipeline_runs
                WHERE (:pipeline_id IS NULL OR pipeline_id = :pipeline_id)
                  AND (:source_id IS NULL OR source_id = :source_id)
                ORDER BY started_at DESC
                LIMIT :limit
            """), conn, params={
                "pipeline_id": pipeline_id,
                "source_id": source_id,
                "limit": limit,
            })
        return df.to_dict("records") if not df.empty else []
    except Exception as exc:
        logger.debug("get_recent_runs: %s", exc)
        return []
