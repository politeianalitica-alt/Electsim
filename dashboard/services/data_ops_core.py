"""
Data Operations Core Service — Bloque 8.

API de servicio para el módulo de operaciones de datos.
Alimenta D10_Centro_Operaciones y N9_Command_Center.

Todas las funciones devuelven DataFrame/dict seguro.
Si no hay tablas, devuelven vacío sin romper el dashboard.
"""
from __future__ import annotations

import logging
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def _get_engine() -> Any:
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


# ── Estado de fuentes ──────────────────────────────────────────────────────────

def cargar_estado_fuentes(
    domain: str | None = None,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga el estado de las fuentes de datos.

    Returns:
        DataFrame con: source_id, name, domain, source_type, status,
        last_success_at, freshness_lag_minutes, active, risk_level.
    """
    eng = engine or _get_engine()

    try:
        from etl.operations.source_registry import list_sources
        from etl.operations.freshness import compute_source_freshness

        sources = list_sources(domain=domain, active_only=False, engine=eng)
        rows = []
        for src in sources:
            health = compute_source_freshness(src.source_id, eng)
            rows.append({
                "source_id": src.source_id,
                "name": src.name,
                "domain": src.domain,
                "source_type": src.source_type,
                "status": health.status,
                "last_success_at": str(health.last_success_at) if health.last_success_at else None,
                "freshness_lag_minutes": health.freshness_lag_minutes,
                "consecutive_failures": health.consecutive_failures,
                "active": src.active,
                "risk_level": src.risk_level,
                "refresh_interval_minutes": src.refresh_interval_minutes,
            })

        if rows:
            return pd.DataFrame(rows).sort_values(["domain", "source_id"])
    except Exception as exc:
        logger.debug("cargar_estado_fuentes: %s", exc)

    # Fallback: fuentes estáticas sin estado de salud
    try:
        from etl.operations.source_registry import list_sources
        sources = list_sources(domain=domain, active_only=False)
        if sources:
            return pd.DataFrame([{
                "source_id": s.source_id,
                "name": s.name,
                "domain": s.domain,
                "source_type": s.source_type,
                "status": "unknown",
                "active": s.active,
                "risk_level": s.risk_level,
            } for s in sources])
    except Exception:
        pass

    return pd.DataFrame()


# ── Pipeline Runs ──────────────────────────────────────────────────────────────

def cargar_pipeline_runs(
    pipeline_id: str | None = None,
    limit: int = 100,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga las ejecuciones recientes de pipelines.

    Returns:
        DataFrame con: run_id, pipeline_id, source_id, status,
        started_at, duration_seconds, records_extracted, records_loaded,
        records_failed, error_type.
    """
    eng = engine or _get_engine()
    if eng is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        df = pd.read_sql(sa_text("""
            SELECT run_id, pipeline_id, source_id, status,
                   started_at, finished_at, duration_seconds,
                   records_extracted, records_loaded, records_updated,
                   records_duplicate, records_failed, error_type, error_message
            FROM pipeline_runs
            WHERE (:pipeline_id IS NULL OR pipeline_id = :pipeline_id)
            ORDER BY started_at DESC
            LIMIT :limit
        """), eng, params={"pipeline_id": pipeline_id, "limit": limit})
        return df
    except Exception as exc:
        logger.debug("cargar_pipeline_runs: %s", exc)
        return pd.DataFrame()


# ── KPIs Data Ops ─────────────────────────────────────────────────────────────

def cargar_kpis_data_ops(engine: Any | None = None) -> dict:
    """
    Carga KPIs del sistema de operaciones de datos.

    Returns:
        Dict con: fuentes_activas, fuentes_healthy, fuentes_down,
        pipelines_ok_24h, pipelines_failed_24h, quality_pass_rate,
        alertas_pendientes, modules_fresh, overall_status.
    """
    eng = engine or _get_engine()

    try:
        from etl.operations.health_monitor import compute_global_data_health
        return compute_global_data_health(engine=eng)
    except Exception as exc:
        logger.debug("cargar_kpis_data_ops: %s", exc)

    # Fallback: datos estáticos
    try:
        from etl.operations.source_registry import list_sources
        sources = list_sources()
        return {
            "computed_at": None,
            "sources_healthy": 0,
            "sources_degraded": 0,
            "sources_down": 0,
            "sources_unknown": len(sources),
            "pipelines_ok_24h": 0,
            "pipelines_failed_24h": 0,
            "modules_fresh": 0,
            "modules_stale": 0,
            "quality_pass_rate": 1.0,
            "total_alerts": 0,
            "overall_status": "unknown",
        }
    except Exception:
        return {"overall_status": "unknown"}


# ── Quality Checks ─────────────────────────────────────────────────────────────

def cargar_quality_results(
    limit: int = 100,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga resultados recientes de checks de calidad.

    Returns:
        DataFrame con: check_id, status, checked_at, metric_value,
        threshold, records_checked, records_failed.
    """
    eng = engine or _get_engine()
    if eng is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        df = pd.read_sql(sa_text("""
            SELECT r.check_id, c.name, c.table_name, c.domain,
                   c.check_type, c.severity, r.status,
                   r.checked_at, r.metric_value, r.threshold,
                   r.records_checked, r.records_failed
            FROM data_quality_results r
            LEFT JOIN data_quality_checks c ON r.check_id = c.check_id
            ORDER BY r.checked_at DESC
            LIMIT :limit
        """), eng, params={"limit": limit})
        return df
    except Exception as exc:
        logger.debug("cargar_quality_results: %s", exc)
        return pd.DataFrame()


def cargar_quality_summary(engine: Any | None = None) -> dict:
    """
    Devuelve resumen de calidad de datos.

    Returns:
        Dict con: total, passed, failed, warning, skipped, pass_rate.
    """
    eng = engine or _get_engine()

    # Intentar desde BD
    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            with eng.connect() as conn:
                row = conn.execute(sa_text("""
                    SELECT
                        COUNT(*) AS total,
                        COUNT(CASE WHEN status = 'passed' THEN 1 END) AS passed,
                        COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed,
                        COUNT(CASE WHEN status = 'warning' THEN 1 END) AS warning,
                        COUNT(CASE WHEN status = 'skipped' THEN 1 END) AS skipped
                    FROM data_quality_results
                    WHERE checked_at > NOW() - INTERVAL '24 hours'
                """)).fetchone()

            if row and row[0]:
                total = row[0] or 0
                passed = row[1] or 0
                evaluated = total - (row[4] or 0)
                return {
                    "total": total,
                    "passed": passed,
                    "failed": row[2] or 0,
                    "warning": row[3] or 0,
                    "skipped": row[4] or 0,
                    "pass_rate": round(passed / evaluated, 4) if evaluated > 0 else 1.0,
                    "pass_pct": round(passed / evaluated * 100, 1) if evaluated > 0 else 100.0,
                }
        except Exception as exc:
            logger.debug("cargar_quality_summary DB: %s", exc)

    # Fallback: ejecutar checks en tiempo real
    try:
        from etl.operations.quality_checks import run_all_checks, get_quality_summary
        results = run_all_checks(engine=eng, persist=False)
        return get_quality_summary(results)
    except Exception as exc:
        logger.debug("cargar_quality_summary realtime: %s", exc)

    return {"total": 0, "passed": 0, "failed": 0, "warning": 0, "skipped": 0, "pass_rate": 1.0}


# ── Source Health ──────────────────────────────────────────────────────────────

def cargar_source_health(engine: Any | None = None) -> pd.DataFrame:
    """
    Carga el estado de salud de las fuentes.

    Returns:
        DataFrame con: source_id, status, last_success_at, freshness_lag_minutes,
        consecutive_failures, checked_at.
    """
    eng = engine or _get_engine()
    if eng is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        df = pd.read_sql(sa_text("""
            SELECT DISTINCT ON (source_id)
                source_id, status, last_success_at, last_failure_at,
                freshness_lag_minutes, consecutive_failures,
                avg_latency_ms, last_error, checked_at
            FROM source_health
            ORDER BY source_id, checked_at DESC
        """), eng)
        return df
    except Exception as exc:
        logger.debug("cargar_source_health: %s", exc)
        return pd.DataFrame()


# ── Cache Stats ────────────────────────────────────────────────────────────────

def cargar_cache_stats(engine: Any | None = None) -> dict:
    """
    Devuelve estadísticas de la caché HTTP.
    """
    eng = engine or _get_engine()
    try:
        from etl.operations.cache_manager import cache_stats
        return cache_stats(engine=eng)
    except Exception as exc:
        logger.debug("cargar_cache_stats: %s", exc)
        return {"available": False}


# ── Raw Manifest ───────────────────────────────────────────────────────────────

def cargar_raw_manifest(
    source_id: str | None = None,
    limit: int = 100,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga el manifiesto de archivos brutos.
    """
    eng = engine or _get_engine()
    if eng is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        df = pd.read_sql(sa_text("""
            SELECT manifest_id, source_id, run_id, path,
                   file_format, size_bytes, checksum,
                   record_count, extracted_at, immutable
            FROM raw_data_manifest
            WHERE (:source_id IS NULL OR source_id = :source_id)
            ORDER BY extracted_at DESC
            LIMIT :limit
        """), eng, params={"source_id": source_id, "limit": limit})
        return df
    except Exception as exc:
        logger.debug("cargar_raw_manifest: %s", exc)
        return pd.DataFrame()


# ── Lineage ────────────────────────────────────────────────────────────────────

def cargar_lineage(
    object_type: str,
    object_id: str,
    engine: Any | None = None,
) -> dict:
    """
    Carga el linaje de un objeto.
    """
    eng = engine or _get_engine()
    try:
        from etl.operations.lineage import get_lineage_chain
        return get_lineage_chain(object_type, object_id, engine=eng)
    except Exception as exc:
        logger.debug("cargar_lineage: %s", exc)
        return {"object_type": object_type, "object_id": object_id, "upstream": [], "downstream": []}


# ── Freshness por Módulo ───────────────────────────────────────────────────────

def cargar_modulos_freshness(engine: Any | None = None) -> pd.DataFrame:
    """
    Carga la frescura de datos por módulo.

    Returns:
        DataFrame con: module, table, status, last_update,
        lag_minutes, expected_minutes.
    """
    eng = engine or _get_engine()

    try:
        from etl.operations.freshness import compute_all_freshness
        data = compute_all_freshness(engine=eng)
        if data:
            return pd.DataFrame(data).sort_values("module")
    except Exception as exc:
        logger.debug("cargar_modulos_freshness: %s", exc)

    return pd.DataFrame()


# ── Pipelines Registry ────────────────────────────────────────────────────────

def cargar_pipelines_registry(engine: Any | None = None) -> pd.DataFrame:
    """
    Carga el registro de pipelines.

    Returns:
        DataFrame con: pipeline_id, name, domain, schedule, active, sources.
    """
    eng = engine or _get_engine()
    try:
        from etl.operations.pipeline_registry import list_pipelines
        pipelines = list_pipelines(active_only=False, engine=eng)
        return pd.DataFrame([{
            "pipeline_id": p.pipeline_id,
            "name": p.name,
            "domain": p.domain,
            "entrypoint": p.entrypoint,
            "schedule": p.schedule or "manual",
            "active": p.active,
            "sources": ", ".join(p.sources[:3]),
            "output_tables": len(p.output_tables),
        } for p in pipelines])
    except Exception as exc:
        logger.debug("cargar_pipelines_registry: %s", exc)
        return pd.DataFrame()
