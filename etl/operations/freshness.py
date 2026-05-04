"""
Freshness Monitor — Bloque 8.

Mide cuánto hace que se actualizó cada módulo y fuente.

Estados:
  healthy  → lag <= expected
  degraded → lag <= 2 × expected
  down     → lag > 2 × expected
  unknown  → sin datos

Si las tablas no existen, devuelve estado 'unknown' sin romper.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

from etl.operations.schemas import SourceHealth

# Freshness esperado por tabla (minutos)
_TABLE_EXPECTED_FRESHNESS: dict[str, tuple[str, int]] = {
    # tabla → (timestamp_col, expected_minutes)
    "media_items":          ("created_at", 60),
    "legal_items":          ("created_at", 240),
    "macro_indicators":     ("created_at", 1440),
    "polls":                ("created_at", 1440),
    "nowcast_snapshots":    ("created_at", 360),
    "actores":              ("updated_at", 10080),
    "territorial_signals":  ("created_at", 720),
    "territory_profiles_cache": ("updated_at", 1440),
    "rag_documents":        ("created_at", 360),
    "agenda_gobierno":      ("created_at", 240),
}


def compute_table_freshness(
    table_name: str,
    timestamp_col: str = "created_at",
    engine: Any = None,
) -> dict:
    """
    Calcula la frescura de una tabla (cuánto hace desde el último registro).

    Args:
        table_name: Nombre de la tabla.
        timestamp_col: Columna de timestamp.
        engine: SQLAlchemy engine.

    Returns:
        Dict con last_update, lag_minutes, status, expected_minutes.
    """
    if engine is None:
        return {
            "table": table_name,
            "status": "unknown",
            "last_update": None,
            "lag_minutes": None,
            "expected_minutes": _TABLE_EXPECTED_FRESHNESS.get(table_name, ("created_at", 1440))[1],
        }

    expected = _TABLE_EXPECTED_FRESHNESS.get(table_name, (timestamp_col, 1440))[1]

    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            row = conn.execute(sa_text(f"""
                SELECT MAX({timestamp_col}) AS last_update
                FROM {table_name}
            """)).fetchone()

        if row is None or row[0] is None:
            return {
                "table": table_name,
                "status": "unknown",
                "last_update": None,
                "lag_minutes": None,
                "expected_minutes": expected,
            }

        last_update = row[0]
        if hasattr(last_update, "tzinfo") and last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        lag = int((now - last_update).total_seconds() / 60)
        status = freshness_status(lag, expected)

        return {
            "table": table_name,
            "status": status,
            "last_update": last_update.isoformat(),
            "lag_minutes": lag,
            "expected_minutes": expected,
        }

    except Exception as exc:
        logger.debug("compute_table_freshness %s: %s", table_name, exc)
        return {
            "table": table_name,
            "status": "unknown",
            "last_update": None,
            "lag_minutes": None,
            "expected_minutes": expected,
        }


def compute_all_freshness(engine: Any = None) -> list[dict]:
    """
    Calcula frescura para todas las tablas monitorizadas.

    Returns:
        Lista de dicts con estado de frescura por tabla.
    """
    results = []
    for table, (ts_col, _) in _TABLE_EXPECTED_FRESHNESS.items():
        result = compute_table_freshness(table_name=table, timestamp_col=ts_col, engine=engine)
        result["module"] = _table_to_module(table)
        results.append(result)
    return results


def compute_source_freshness(
    source_id: str,
    engine: Any = None,
) -> SourceHealth:
    """
    Calcula la frescura de una fuente desde pipeline_runs.

    Returns:
        SourceHealth con estado actual.
    """
    now = datetime.now(timezone.utc)

    if engine is None:
        return SourceHealth(
            source_id=source_id,
            status="unknown",
            checked_at=now,
        )

    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            row = conn.execute(sa_text("""
                SELECT
                    MAX(CASE WHEN status = 'success' THEN finished_at END) AS last_success,
                    MAX(CASE WHEN status = 'failed' THEN finished_at END) AS last_failure,
                    COUNT(CASE WHEN status = 'failed' AND started_at > NOW() - INTERVAL '24 hours' END) AS failures_24h,
                    AVG(CASE WHEN status = 'success' THEN duration_seconds END) * 1000 AS avg_latency_ms
                FROM pipeline_runs
                WHERE source_id = :source_id
                  AND started_at > NOW() - INTERVAL '7 days'
            """), {"source_id": source_id}).fetchone()

        if row is None:
            return SourceHealth(source_id=source_id, status="unknown", checked_at=now)

        last_success = row[0]
        last_failure = row[1]
        failures_24h = int(row[2] or 0)
        avg_latency = float(row[3]) if row[3] else None

        # Calcular lag desde última actualización
        lag_minutes = None
        if last_success:
            if hasattr(last_success, "tzinfo") and last_success.tzinfo is None:
                last_success = last_success.replace(tzinfo=timezone.utc)
            lag_minutes = int((now - last_success).total_seconds() / 60)

        # Obtener expected de source_registry
        try:
            from etl.operations.source_registry import get_source
            src = get_source(source_id)
            expected = src.expected_latency_minutes if src else 1440
        except Exception:
            expected = 1440

        status = "unknown"
        if last_success is None and last_failure is None:
            status = "unknown"
        elif lag_minutes is not None:
            status = freshness_status(lag_minutes, expected)
        elif last_failure and not last_success:
            status = "down"

        return SourceHealth(
            source_id=source_id,
            status=status,
            last_success_at=last_success,
            last_failure_at=last_failure,
            freshness_lag_minutes=lag_minutes,
            consecutive_failures=failures_24h,
            avg_latency_ms=avg_latency,
            checked_at=now,
        )

    except Exception as exc:
        logger.debug("compute_source_freshness %s: %s", source_id, exc)
        return SourceHealth(source_id=source_id, status="unknown", checked_at=now)


def freshness_status(lag_minutes: int, expected_minutes: int) -> str:
    """
    Calcula el estado de frescura a partir del lag.

    Estados:
        healthy  → lag <= expected
        degraded → lag <= 2 × expected
        down     → lag > 2 × expected
    """
    if lag_minutes <= expected_minutes:
        return "healthy"
    elif lag_minutes <= 2 * expected_minutes:
        return "degraded"
    else:
        return "down"


def _table_to_module(table: str) -> str:
    """Mapea una tabla a su módulo."""
    _MAP = {
        "media_items":            "Medios",
        "legal_items":            "Legislativo",
        "macro_indicators":       "Economía",
        "polls":                  "Electoral",
        "nowcast_snapshots":      "Electoral",
        "actores":                "OSINT",
        "territorial_signals":    "Territorial",
        "territory_profiles_cache": "Territorial",
        "rag_documents":          "Brain/RAG",
        "agenda_gobierno":        "Legislativo",
    }
    return _MAP.get(table, table)


def get_module_freshness_summary(engine: Any = None) -> dict[str, str]:
    """
    Devuelve estado de frescura por módulo (el peor estado de sus tablas).

    Returns:
        Dict módulo → status ('healthy', 'degraded', 'down', 'unknown').
    """
    all_freshness = compute_all_freshness(engine)
    module_status: dict[str, str] = {}
    status_order = {"down": 0, "degraded": 1, "unknown": 2, "healthy": 3}

    for item in all_freshness:
        module = item.get("module", "unknown")
        status = item.get("status", "unknown")
        current = module_status.get(module, "healthy")
        # Tomar el peor estado
        if status_order.get(status, 2) < status_order.get(current, 3):
            module_status[module] = status

    return module_status
