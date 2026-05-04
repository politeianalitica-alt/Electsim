"""
Quality Checks — Bloque 8.

Ejecuta checks de calidad de datos sobre tablas de PostgreSQL.
Si una tabla no existe, devuelve 'skipped' en lugar de romper.

Tipos de check soportados:
  not_null, unique, freshness, volume, range,
  referential_integrity, custom
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

from etl.operations.schemas import DataQualityCheck, DataQualityResult

# ── Checks por defecto ─────────────────────────────────────────────────────────

_DEFAULT_CHECKS: list[DataQualityCheck] = [
    # Media
    DataQualityCheck(
        check_id="media_items_url_not_null",
        name="media_items: url no nulo",
        table_name="media_items",
        domain="media",
        check_type="not_null",
        severity="CRITICAL",
        rule={"column": "url"},
    ),
    DataQualityCheck(
        check_id="media_items_content_hash_unique",
        name="media_items: content_hash único",
        table_name="media_items",
        domain="media",
        check_type="unique",
        severity="WARNING",
        rule={"column": "content_hash"},
    ),
    DataQualityCheck(
        check_id="media_items_freshness",
        name="media_items: actualizado en últimas 4h",
        table_name="media_items",
        domain="media",
        check_type="freshness",
        severity="WARNING",
        rule={"timestamp_col": "created_at", "max_lag_hours": 4},
    ),
    DataQualityCheck(
        check_id="media_items_volume",
        name="media_items: mínimo 10 registros",
        table_name="media_items",
        domain="media",
        check_type="volume",
        severity="WARNING",
        rule={"min_rows": 10},
    ),

    # Legislativo
    DataQualityCheck(
        check_id="legal_items_source_id_unique",
        name="legal_items: source_id único",
        table_name="legal_items",
        domain="legislative",
        check_type="unique",
        severity="CRITICAL",
        rule={"column": "source_id"},
    ),
    DataQualityCheck(
        check_id="legal_items_freshness",
        name="legal_items: actualizado en últimas 24h",
        table_name="legal_items",
        domain="legislative",
        check_type="freshness",
        severity="WARNING",
        rule={"timestamp_col": "created_at", "max_lag_hours": 24},
    ),

    # Electoral
    DataQualityCheck(
        check_id="polls_freshness",
        name="polls: actualizado en últimos 7 días",
        table_name="polls",
        domain="electoral",
        check_type="freshness",
        severity="INFO",
        rule={"timestamp_col": "created_at", "max_lag_hours": 168},
    ),
    DataQualityCheck(
        check_id="nowcast_snapshots_freshness",
        name="nowcast_snapshots: actualizado en últimas 6h",
        table_name="nowcast_snapshots",
        domain="electoral",
        check_type="freshness",
        severity="WARNING",
        rule={"timestamp_col": "created_at", "max_lag_hours": 6},
    ),

    # Economía
    DataQualityCheck(
        check_id="macro_indicators_value_not_null",
        name="macro_indicators: value no nulo",
        table_name="macro_indicators",
        domain="economy",
        check_type="not_null",
        severity="CRITICAL",
        rule={"column": "value"},
    ),
    DataQualityCheck(
        check_id="macro_indicators_freshness",
        name="macro_indicators: actualizado en últimas 48h",
        table_name="macro_indicators",
        domain="economy",
        check_type="freshness",
        severity="WARNING",
        rule={"timestamp_col": "created_at", "max_lag_hours": 48},
    ),

    # Territorial
    DataQualityCheck(
        check_id="territorial_signals_freshness",
        name="territorial_signals: actualizado en últimas 48h",
        table_name="territorial_signals",
        domain="geospatial",
        check_type="freshness",
        severity="INFO",
        rule={"timestamp_col": "created_at", "max_lag_hours": 48},
    ),

    # Sistema
    DataQualityCheck(
        check_id="source_registry_volume",
        name="source_registry: mínimo 5 fuentes",
        table_name="source_registry",
        domain="system",
        check_type="volume",
        severity="WARNING",
        rule={"min_rows": 5},
    ),
]

# Caché de checks en memoria
_CHECK_CACHE: dict[str, DataQualityCheck] = {c.check_id: c for c in _DEFAULT_CHECKS}


# ── Ejecución de checks ───────────────────────────────────────────────────────

def run_check(
    check: DataQualityCheck,
    engine: Any = None,
    run_id: str | None = None,
) -> DataQualityResult:
    """
    Ejecuta un check de calidad de datos.

    Returns:
        DataQualityResult con estado, métricas y detalles.
    """
    now = datetime.now(timezone.utc)
    _skipped = DataQualityResult(
        check_id=check.check_id,
        run_id=run_id,
        status="skipped",
        checked_at=now,
        details={"reason": "tabla no disponible o engine no configurado"},
    )

    if engine is None:
        return _skipped

    # Verificar que la tabla existe
    try:
        from sqlalchemy import text as sa_text, inspect as sa_inspect
        inspector = sa_inspect(engine)
        tables = inspector.get_table_names()
        if check.table_name not in tables:
            return DataQualityResult(
                check_id=check.check_id,
                run_id=run_id,
                status="skipped",
                checked_at=now,
                details={"reason": f"tabla '{check.table_name}' no existe"},
            )
    except Exception as exc:
        logger.debug("run_check tabla check %s: %s", check.check_id, exc)
        return _skipped

    try:
        if check.check_type == "not_null":
            return _check_not_null(check, engine, run_id, now)
        elif check.check_type == "unique":
            return _check_unique(check, engine, run_id, now)
        elif check.check_type == "freshness":
            return _check_freshness(check, engine, run_id, now)
        elif check.check_type == "volume":
            return _check_volume(check, engine, run_id, now)
        elif check.check_type == "range":
            return _check_range(check, engine, run_id, now)
        elif check.check_type == "referential_integrity":
            return _check_referential(check, engine, run_id, now)
        elif check.check_type == "custom":
            return _check_custom(check, engine, run_id, now)
        else:
            return DataQualityResult(
                check_id=check.check_id, run_id=run_id,
                status="skipped", checked_at=now,
                details={"reason": f"check_type '{check.check_type}' no soportado"},
            )
    except Exception as exc:
        logger.debug("run_check %s: %s", check.check_id, exc)
        return DataQualityResult(
            check_id=check.check_id, run_id=run_id,
            status="failed", checked_at=now,
            details={"error": str(exc)[:500]},
        )


def _check_not_null(check, engine, run_id, now) -> DataQualityResult:
    """Check: columna no tiene valores nulos."""
    from sqlalchemy import text as sa_text
    col = check.rule.get("column", "id")
    with engine.connect() as conn:
        total = conn.execute(sa_text(f"SELECT COUNT(*) FROM {check.table_name}")).scalar() or 0
        nulls = conn.execute(sa_text(f"SELECT COUNT(*) FROM {check.table_name} WHERE {col} IS NULL")).scalar() or 0

    status = "passed" if nulls == 0 else ("warning" if check.severity == "WARNING" else "failed")
    return DataQualityResult(
        check_id=check.check_id, run_id=run_id, status=status, checked_at=now,
        records_checked=total, records_failed=nulls,
        metric_value=nulls, threshold=0,
        details={"column": col, "null_count": nulls, "total": total},
    )


def _check_unique(check, engine, run_id, now) -> DataQualityResult:
    """Check: columna no tiene valores duplicados."""
    from sqlalchemy import text as sa_text
    col = check.rule.get("column", "id")
    with engine.connect() as conn:
        total = conn.execute(sa_text(f"SELECT COUNT(*) FROM {check.table_name}")).scalar() or 0
        dups = conn.execute(sa_text(f"""
            SELECT COUNT(*) - COUNT(DISTINCT {col}) AS dups
            FROM {check.table_name}
        """)).scalar() or 0

    status = "passed" if dups == 0 else ("warning" if check.severity == "WARNING" else "failed")
    return DataQualityResult(
        check_id=check.check_id, run_id=run_id, status=status, checked_at=now,
        records_checked=total, records_failed=dups,
        metric_value=dups, threshold=0,
        details={"column": col, "duplicates": dups},
    )


def _check_freshness(check, engine, run_id, now) -> DataQualityResult:
    """Check: tabla tiene datos más recientes que max_lag_hours."""
    from sqlalchemy import text as sa_text
    ts_col = check.rule.get("timestamp_col", "created_at")
    max_lag_h = check.rule.get("max_lag_hours", 24)

    with engine.connect() as conn:
        last = conn.execute(sa_text(f"SELECT MAX({ts_col}) FROM {check.table_name}")).scalar()

    if last is None:
        return DataQualityResult(
            check_id=check.check_id, run_id=run_id, status="warning", checked_at=now,
            details={"reason": "sin datos"},
        )

    if hasattr(last, "tzinfo") and last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)

    lag_h = (now - last).total_seconds() / 3600
    threshold = max_lag_h
    status = "passed" if lag_h <= max_lag_h else ("warning" if check.severity != "CRITICAL" else "failed")

    return DataQualityResult(
        check_id=check.check_id, run_id=run_id, status=status, checked_at=now,
        metric_value=round(lag_h, 2), threshold=threshold,
        details={"lag_hours": round(lag_h, 2), "max_lag_hours": max_lag_h, "last_record": str(last)},
    )


def _check_volume(check, engine, run_id, now) -> DataQualityResult:
    """Check: tabla tiene mínimo n filas."""
    from sqlalchemy import text as sa_text
    min_rows = check.rule.get("min_rows", 1)
    with engine.connect() as conn:
        count = conn.execute(sa_text(f"SELECT COUNT(*) FROM {check.table_name}")).scalar() or 0

    status = "passed" if count >= min_rows else ("warning" if check.severity == "WARNING" else "failed")
    return DataQualityResult(
        check_id=check.check_id, run_id=run_id, status=status, checked_at=now,
        records_checked=count, metric_value=count, threshold=min_rows,
        details={"count": count, "min_rows": min_rows},
    )


def _check_range(check, engine, run_id, now) -> DataQualityResult:
    """Check: valores de columna en rango [min_val, max_val]."""
    from sqlalchemy import text as sa_text
    col = check.rule.get("column", "value")
    min_val = check.rule.get("min_val")
    max_val = check.rule.get("max_val")

    conditions = []
    if min_val is not None:
        conditions.append(f"{col} < {min_val}")
    if max_val is not None:
        conditions.append(f"{col} > {max_val}")

    if not conditions:
        return DataQualityResult(
            check_id=check.check_id, run_id=run_id, status="skipped", checked_at=now,
            details={"reason": "sin rango definido"},
        )

    where = " OR ".join(conditions)
    with engine.connect() as conn:
        total = conn.execute(sa_text(f"SELECT COUNT(*) FROM {check.table_name}")).scalar() or 0
        out_of_range = conn.execute(sa_text(
            f"SELECT COUNT(*) FROM {check.table_name} WHERE {where}"
        )).scalar() or 0

    status = "passed" if out_of_range == 0 else ("warning" if check.severity == "WARNING" else "failed")
    return DataQualityResult(
        check_id=check.check_id, run_id=run_id, status=status, checked_at=now,
        records_checked=total, records_failed=out_of_range,
        metric_value=out_of_range, threshold=0,
        details={"column": col, "out_of_range": out_of_range},
    )


def _check_referential(check, engine, run_id, now) -> DataQualityResult:
    """Check: integridad referencial entre tablas."""
    from sqlalchemy import text as sa_text
    col = check.rule.get("column", "id")
    ref_table = check.rule.get("ref_table")
    ref_col = check.rule.get("ref_col", "id")

    if not ref_table:
        return DataQualityResult(
            check_id=check.check_id, run_id=run_id, status="skipped", checked_at=now,
            details={"reason": "ref_table no definido"},
        )

    with engine.connect() as conn:
        orphans = conn.execute(sa_text(f"""
            SELECT COUNT(*) FROM {check.table_name} t
            WHERE t.{col} IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM {ref_table} r WHERE r.{ref_col} = t.{col}
              )
        """)).scalar() or 0

    status = "passed" if orphans == 0 else ("warning" if check.severity == "WARNING" else "failed")
    return DataQualityResult(
        check_id=check.check_id, run_id=run_id, status=status, checked_at=now,
        records_failed=orphans, metric_value=orphans, threshold=0,
        details={"orphan_records": orphans, "ref_table": ref_table},
    )


def _check_custom(check, engine, run_id, now) -> DataQualityResult:
    """Check: query SQL personalizada. Pasa si devuelve 0 filas."""
    from sqlalchemy import text as sa_text
    query = check.query or check.rule.get("query")
    if not query:
        return DataQualityResult(
            check_id=check.check_id, run_id=run_id, status="skipped", checked_at=now,
            details={"reason": "query no definida"},
        )

    with engine.connect() as conn:
        result = conn.execute(sa_text(query)).scalar() or 0

    threshold = check.rule.get("threshold", 0)
    status = "passed" if result <= threshold else ("warning" if check.severity == "WARNING" else "failed")
    return DataQualityResult(
        check_id=check.check_id, run_id=run_id, status=status, checked_at=now,
        metric_value=result, threshold=threshold,
        details={"query_result": result},
    )


def _save_result(result: DataQualityResult, engine: Any) -> None:
    """Persiste un resultado de check en data_quality_results."""
    if engine is None:
        return
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO data_quality_results (
                    check_id, run_id, status, checked_at,
                    records_checked, records_failed,
                    metric_value, threshold, details
                ) VALUES (
                    :check_id, :run_id, :status, :checked_at,
                    :records_checked, :records_failed,
                    :metric_value, :threshold, :details::jsonb
                )
            """), {
                "check_id": result.check_id,
                "run_id": result.run_id,
                "status": result.status,
                "checked_at": result.checked_at,
                "records_checked": result.records_checked,
                "records_failed": result.records_failed,
                "metric_value": result.metric_value,
                "threshold": result.threshold,
                "details": json.dumps(result.details),
            })
    except Exception as exc:
        logger.debug("_save_result: %s", exc)


def run_checks_for_domain(
    domain: str,
    engine: Any = None,
    persist: bool = True,
) -> list[DataQualityResult]:
    """Ejecuta todos los checks de un dominio."""
    checks = [c for c in _CHECK_CACHE.values() if c.domain == domain and c.active]
    results = []
    for check in checks:
        result = run_check(check, engine=engine)
        results.append(result)
        if persist and engine is not None:
            _save_result(result, engine)
    return results


def run_checks_for_table(
    table_name: str,
    engine: Any = None,
    persist: bool = True,
) -> list[DataQualityResult]:
    """Ejecuta todos los checks de una tabla."""
    checks = [c for c in _CHECK_CACHE.values() if c.table_name == table_name and c.active]
    results = []
    for check in checks:
        result = run_check(check, engine=engine)
        results.append(result)
        if persist and engine is not None:
            _save_result(result, engine)
    return results


def run_all_checks(
    engine: Any = None,
    persist: bool = True,
) -> list[DataQualityResult]:
    """Ejecuta todos los checks activos."""
    results = []
    for check in _CHECK_CACHE.values():
        if not check.active:
            continue
        result = run_check(check, engine=engine)
        results.append(result)
        if persist and engine is not None:
            _save_result(result, engine)

    n_passed = sum(1 for r in results if r.status == "passed")
    n_failed = sum(1 for r in results if r.status in ("failed", "warning"))
    logger.info(
        "run_all_checks: %d checks — %d passed, %d failed/warning",
        len(results), n_passed, n_failed
    )
    return results


def seed_default_quality_checks(engine: Any = None) -> int:
    """Registra los checks de calidad por defecto en la BD."""
    if engine is None:
        return len(_DEFAULT_CHECKS)

    n = 0
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            for check in _DEFAULT_CHECKS:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO data_quality_checks (
                            check_id, name, table_name, domain,
                            check_type, severity, query, rule, active
                        ) VALUES (
                            :check_id, :name, :table_name, :domain,
                            :check_type, :severity, :query, :rule::jsonb, :active
                        )
                        ON CONFLICT (check_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            active = EXCLUDED.active,
                            rule = EXCLUDED.rule
                    """), {
                        "check_id": check.check_id,
                        "name": check.name,
                        "table_name": check.table_name,
                        "domain": check.domain,
                        "check_type": check.check_type,
                        "severity": check.severity,
                        "query": check.query,
                        "rule": json.dumps(check.rule),
                        "active": check.active,
                    })
                    n += 1
                except Exception as exc:
                    logger.debug("seed check %s: %s", check.check_id, exc)
    except Exception as exc:
        logger.warning("seed_default_quality_checks: %s", exc)

    logger.info("seed_default_quality_checks: %d checks registrados", n)
    return n


def get_quality_summary(results: list[DataQualityResult]) -> dict:
    """Genera un resumen de resultados de checks."""
    total = len(results)
    if total == 0:
        return {"total": 0, "passed": 0, "failed": 0, "warning": 0, "skipped": 0, "pass_rate": 1.0}

    passed = sum(1 for r in results if r.status == "passed")
    failed = sum(1 for r in results if r.status == "failed")
    warning = sum(1 for r in results if r.status == "warning")
    skipped = sum(1 for r in results if r.status == "skipped")
    evaluated = total - skipped
    pass_rate = passed / evaluated if evaluated > 0 else 1.0

    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "warning": warning,
        "skipped": skipped,
        "pass_rate": round(pass_rate, 4),
        "pass_pct": round(pass_rate * 100, 1),
    }
