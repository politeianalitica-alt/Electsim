"""
Backfill & Retry — Bloque 8.

Funciones para relanzar ejecuciones fallidas y hacer backfill de datos históricos.

Fase inicial:
  - Prepara comandos de backfill
  - Devuelve error claro si pipeline no soporta backfill
  - Retry de runs fallidos desde pipeline_runs
"""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

from etl.operations.schemas import BackfillRequest

# Pipelines que soportan backfill (con parámetros de fecha)
_BACKFILL_CAPABLE_PIPELINES = {
    "legislative_core": "pipelines.legislative_core --start-date {start} --end-date {end}",
    "media_core": "pipelines.media_core --start-date {start} --end-date {end}",
    "economy_core": "pipelines.economy_core --start-date {start} --end-date {end}",
    "electoral_core": "pipelines.electoral_core --start-date {start} --end-date {end}",
}


def backfill_source(
    source_id: str,
    start_date: date | str,
    end_date: date | str,
    engine: Any = None,
) -> dict:
    """
    Prepara un backfill para una fuente específica.

    Args:
        source_id: ID de la fuente.
        start_date, end_date: Rango de fechas.
        engine: SQLAlchemy engine.

    Returns:
        Dict con status, command, request_id.
    """
    start = str(start_date)
    end = str(end_date)

    # Encontrar pipeline que use esta fuente
    try:
        from etl.operations.pipeline_registry import list_pipelines
        pipelines = [p for p in list_pipelines() if source_id in p.sources]
    except Exception:
        pipelines = []

    if not pipelines:
        return {
            "status": "error",
            "reason": f"No hay pipeline configurado para la fuente '{source_id}'",
            "source_id": source_id,
        }

    pipeline = pipelines[0]
    if pipeline.pipeline_id not in _BACKFILL_CAPABLE_PIPELINES:
        return {
            "status": "not_supported",
            "reason": f"El pipeline '{pipeline.pipeline_id}' no soporta backfill por fecha",
            "pipeline_id": pipeline.pipeline_id,
            "source_id": source_id,
        }

    command_tpl = _BACKFILL_CAPABLE_PIPELINES[pipeline.pipeline_id]
    command = command_tpl.format(start=start, end=end)
    request_id = str(uuid.uuid4())

    request = BackfillRequest(
        request_id=request_id,
        pipeline_id=pipeline.pipeline_id,
        source_id=source_id,
        start_date=start,
        end_date=end,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )

    logger.info("backfill_source: source=%s period=%s→%s pipeline=%s",
                source_id, start, end, pipeline.pipeline_id)

    return {
        "status": "prepared",
        "request_id": request_id,
        "pipeline_id": pipeline.pipeline_id,
        "source_id": source_id,
        "start_date": start,
        "end_date": end,
        "command": f"python -m {command}",
        "note": "Ejecutar el comando manualmente o via Prefect para iniciar el backfill.",
    }


def backfill_pipeline(
    pipeline_id: str,
    start_date: date | str,
    end_date: date | str,
    engine: Any = None,
) -> dict:
    """
    Prepara un backfill para un pipeline completo.

    Returns:
        Dict con status, command, request_id.
    """
    start = str(start_date)
    end = str(end_date)

    if pipeline_id not in _BACKFILL_CAPABLE_PIPELINES:
        return {
            "status": "not_supported",
            "reason": f"El pipeline '{pipeline_id}' no soporta backfill automático por fecha. "
                      f"Pipelines con soporte: {list(_BACKFILL_CAPABLE_PIPELINES.keys())}",
        }

    command_tpl = _BACKFILL_CAPABLE_PIPELINES[pipeline_id]
    command = command_tpl.format(start=start, end=end)
    request_id = str(uuid.uuid4())

    logger.info("backfill_pipeline: pipeline=%s period=%s→%s", pipeline_id, start, end)

    return {
        "status": "prepared",
        "request_id": request_id,
        "pipeline_id": pipeline_id,
        "start_date": start,
        "end_date": end,
        "command": f"python -m {command}",
        "note": "Ejecutar el comando manualmente o via Prefect para iniciar el backfill.",
    }


def retry_failed_runs(
    pipeline_id: str | None = None,
    limit: int = 10,
    engine: Any = None,
) -> dict:
    """
    Obtiene las ejecuciones fallidas candidatas a retry.

    Args:
        pipeline_id: Filtrar por pipeline (None = todos).
        limit: Máximo de runs a obtener.
        engine: SQLAlchemy engine.

    Returns:
        Dict con runs_found, commands.
    """
    if engine is None:
        return {
            "status": "no_engine",
            "runs_found": 0,
            "message": "Sin conexión a BD. Configura DATABASE_URL.",
        }

    try:
        import pandas as pd
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            df = pd.read_sql(sa_text("""
                SELECT run_id, pipeline_id, source_id, status,
                       started_at, error_type, error_message
                FROM pipeline_runs
                WHERE status = 'failed'
                  AND (:pipeline_id IS NULL OR pipeline_id = :pipeline_id)
                  AND started_at > NOW() - INTERVAL '7 days'
                ORDER BY started_at DESC
                LIMIT :limit
            """), conn, params={"pipeline_id": pipeline_id, "limit": limit})

        if df.empty:
            return {
                "status": "none_found",
                "runs_found": 0,
                "message": "No hay ejecuciones fallidas recientes.",
            }

        commands = []
        for _, row in df.iterrows():
            pid = row.get("pipeline_id", "")
            if pid in _BACKFILL_CAPABLE_PIPELINES:
                commands.append(f"python -m pipelines.{pid} --run-all")
            else:
                commands.append(f"# Pipeline '{pid}' — ejecutar manualmente")

        return {
            "status": "found",
            "runs_found": len(df),
            "failed_runs": df[["run_id", "pipeline_id", "source_id", "started_at", "error_type"]].to_dict("records"),
            "retry_commands": list(dict.fromkeys(commands)),  # dedup
        }

    except Exception as exc:
        logger.debug("retry_failed_runs: %s", exc)
        return {
            "status": "error",
            "runs_found": 0,
            "error": str(exc),
        }
