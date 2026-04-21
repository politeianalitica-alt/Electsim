"""Observabilidad operativa para la API de ElectSim."""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from threading import Lock
from typing import Any
import time

from sqlalchemy import text

_SERVICE_NAME = "electsim-api"
_PROCESS_STARTED_AT = time.time()
_REQUEST_LOCK = Lock()
_REQUEST_TOTALS: Counter[tuple[str, str, int]] = Counter()
_REQUEST_DURATION_SUM_MS: defaultdict[tuple[str, str], float] = defaultdict(float)
_REQUEST_DURATION_COUNT: Counter[tuple[str, str]] = Counter()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _session_local():
    from db.session import SessionLocal

    return SessionLocal


def _normalize_metric_label(value: str) -> str:
    return value.replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')


def _prometheus_labels(**labels: str) -> str:
    if not labels:
        return ""
    rendered = ",".join(
        f'{key}="{_normalize_metric_label(str(value))}"'
        for key, value in sorted(labels.items())
    )
    return "{" + rendered + "}"


def _json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _serialize_row(row: Any) -> dict[str, Any]:
    return {key: _json_safe(value) for key, value in dict(row).items()}


def _parse_timestamp(value: Any) -> datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        candidate = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(candidate)
        except ValueError:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    return None


def _table_exists(session: Any, table_name: str) -> bool:
    bind = session.get_bind()
    dialect = getattr(getattr(bind, "dialect", None), "name", "")
    if dialect == "sqlite":
        exists = session.execute(
            text(
                "SELECT name FROM sqlite_master "
                "WHERE type = 'table' AND name = :table_name"
            ),
            {"table_name": table_name},
        ).scalar()
        return bool(exists)
    exists = session.execute(
        text(
            "SELECT EXISTS("
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :table_name"
            ")"
        ),
        {"table_name": table_name},
    ).scalar()
    return bool(exists)


def _fetch_rows(session: Any, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    result = session.execute(text(sql), params or {})
    return [_serialize_row(row._mapping) for row in result]


def record_request(method: str, path: str, status_code: int, elapsed_ms: int) -> None:
    key = (method.upper(), path or "/", int(status_code))
    duration_key = (method.upper(), path or "/")
    with _REQUEST_LOCK:
        _REQUEST_TOTALS[key] += 1
        _REQUEST_DURATION_SUM_MS[duration_key] += float(elapsed_ms)
        _REQUEST_DURATION_COUNT[duration_key] += 1


def snapshot_request_metrics() -> dict[str, dict[Any, Any]]:
    with _REQUEST_LOCK:
        return {
            "requests_total": dict(_REQUEST_TOTALS),
            "request_duration_sum_ms": dict(_REQUEST_DURATION_SUM_MS),
            "request_duration_count": dict(_REQUEST_DURATION_COUNT),
        }


def collect_operational_summary() -> dict[str, Any]:
    now = _utc_now()
    summary: dict[str, Any] = {
        "service": _SERVICE_NAME,
        "timestamp": now.isoformat(),
        "uptime_seconds": int(time.time() - _PROCESS_STARTED_AT),
        "database": {"ready": False},
        "source_health": {"available": False, "total_sources": 0, "by_status": {}, "items": []},
        "scraper_incidents": {"available": False, "active_total": 0, "by_severity": {}, "items": []},
        "scraping_log": {"available": False, "recent_total": 0, "by_status": {}, "items": []},
        "ingestion": {"available": False, "tracked_sources": 0, "stale_sources": 0, "items": []},
        "alerts": {"available": False, "active_total": 0, "by_severity": {}, "items": []},
    }

    started = time.perf_counter()
    try:
        session_factory = _session_local()
        with session_factory() as session:
            session.execute(text("SELECT 1"))
            db_elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            bind = session.get_bind()
            dialect = getattr(getattr(bind, "dialect", None), "name", "unknown")
            db_summary = {
                "ready": True,
                "latency_ms": db_elapsed_ms,
                "dialect": dialect,
            }
            if _table_exists(session, "alembic_version"):
                db_summary["alembic_version"] = session.execute(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                ).scalar()
            summary["database"] = db_summary

            if _table_exists(session, "source_health"):
                rows = _fetch_rows(
                    session,
                    """
                    SELECT source_id, source_type, status, articles_count, errors_count,
                           freshness_lag_s, checked_at
                    FROM source_health
                    ORDER BY checked_at DESC
                    LIMIT 200
                    """,
                )
                latest_by_source: dict[str, dict[str, Any]] = {}
                for row in rows:
                    source_id = str(row.get("source_id") or "").strip()
                    if source_id and source_id not in latest_by_source:
                        latest_by_source[source_id] = row
                by_status = Counter(
                    str(row.get("status") or "unknown") for row in latest_by_source.values()
                )
                summary["source_health"] = {
                    "available": True,
                    "total_sources": len(latest_by_source),
                    "by_status": dict(sorted(by_status.items())),
                    "items": list(latest_by_source.values())[:10],
                }

            if _table_exists(session, "scraper_incident"):
                rows = _fetch_rows(
                    session,
                    """
                    SELECT source_id, error_type, severity, occurrence_count,
                           last_seen, resolved
                    FROM scraper_incident
                    WHERE resolved = FALSE
                    ORDER BY last_seen DESC
                    LIMIT 25
                    """,
                )
                by_severity = Counter(str(row.get("severity") or "unknown") for row in rows)
                summary["scraper_incidents"] = {
                    "available": True,
                    "active_total": len(rows),
                    "by_severity": dict(sorted(by_severity.items())),
                    "items": rows,
                }

            if _table_exists(session, "scraping_log"):
                rows = _fetch_rows(
                    session,
                    """
                    SELECT fuente, tipo, estado, n_registros_nuevos, n_registros_duplicados,
                           duracion_segundos, error_mensaje, created_at
                    FROM scraping_log
                    ORDER BY created_at DESC
                    LIMIT 200
                    """,
                )
                cutoff = now - timedelta(hours=24)
                recent_rows = [
                    row
                    for row in rows
                    if (_parse_timestamp(row.get("created_at")) or now - timedelta(days=3650)) >= cutoff
                ]
                by_status = Counter(str(row.get("estado") or "unknown") for row in recent_rows)
                summary["scraping_log"] = {
                    "available": True,
                    "recent_total": len(recent_rows),
                    "by_status": dict(sorted(by_status.items())),
                    "items": recent_rows[:10],
                }

            if _table_exists(session, "ingest_log"):
                rows = _fetch_rows(
                    session,
                    """
                    SELECT source_name, last_ingested_at, updated_at
                    FROM ingest_log
                    ORDER BY COALESCE(last_ingested_at, updated_at) DESC
                    LIMIT 100
                    """,
                )
                stale_cutoff = now - timedelta(days=2)
                stale_sources = 0
                for row in rows:
                    ts = _parse_timestamp(row.get("last_ingested_at")) or _parse_timestamp(row.get("updated_at"))
                    if ts is None or ts < stale_cutoff:
                        stale_sources += 1
                summary["ingestion"] = {
                    "available": True,
                    "tracked_sources": len(rows),
                    "stale_sources": stale_sources,
                    "items": rows[:10],
                }

            if _table_exists(session, "alertas_sistema"):
                rows = _fetch_rows(
                    session,
                    """
                    SELECT severidad, tipo, titulo, leida, created_at
                    FROM alertas_sistema
                    WHERE leida = FALSE
                    ORDER BY created_at DESC
                    LIMIT 50
                    """,
                )
                by_severity = Counter(str(row.get("severidad") or "INFO") for row in rows)
                summary["alerts"] = {
                    "available": True,
                    "active_total": len(rows),
                    "by_severity": dict(sorted(by_severity.items())),
                    "items": rows[:10],
                }
    except Exception as exc:
        summary["database"] = {"ready": False, "error": str(exc)}

    return summary


def build_health_payload(summary: dict[str, Any]) -> dict[str, Any]:
    database = summary.get("database", {})
    ready = bool(database.get("ready"))
    return {
        "status": "ok" if ready else "degraded",
        "service": summary.get("service", _SERVICE_NAME),
        "timestamp": summary.get("timestamp"),
        "uptime_seconds": summary.get("uptime_seconds", 0),
        "database": database,
        "source_health": summary.get("source_health", {}).get("by_status", {}),
        "active_incidents": summary.get("scraper_incidents", {}).get("active_total", 0),
        "tracked_ingestions": summary.get("ingestion", {}).get("tracked_sources", 0),
    }


def render_prometheus_metrics(
    summary: dict[str, Any],
    request_metrics: dict[str, dict[Any, Any]] | None = None,
) -> str:
    metrics = request_metrics or snapshot_request_metrics()
    lines = [
        "# HELP electsim_api_uptime_seconds Seconds since API startup.",
        "# TYPE electsim_api_uptime_seconds gauge",
        f'electsim_api_uptime_seconds {int(summary.get("uptime_seconds", 0))}',
        "# HELP electsim_api_database_ready Database readiness status.",
        "# TYPE electsim_api_database_ready gauge",
        f'electsim_api_database_ready {1 if summary.get("database", {}).get("ready") else 0}',
        "# HELP electsim_api_requests_total Total HTTP requests served by the API.",
        "# TYPE electsim_api_requests_total counter",
    ]

    for (method, path, status_code), count in sorted(metrics.get("requests_total", {}).items()):
        labels = _prometheus_labels(method=method, path=path, status=str(status_code))
        lines.append(f"electsim_api_requests_total{labels} {int(count)}")

    lines.extend(
        [
            "# HELP electsim_api_request_duration_ms_sum Cumulative request latency in milliseconds.",
            "# TYPE electsim_api_request_duration_ms_sum counter",
        ]
    )
    for (method, path), total_ms in sorted(metrics.get("request_duration_sum_ms", {}).items()):
        labels = _prometheus_labels(method=method, path=path)
        lines.append(f"electsim_api_request_duration_ms_sum{labels} {float(total_ms):.3f}")

    lines.extend(
        [
            "# HELP electsim_api_request_duration_ms_count Number of timed requests.",
            "# TYPE electsim_api_request_duration_ms_count counter",
        ]
    )
    for (method, path), count in sorted(metrics.get("request_duration_count", {}).items()):
        labels = _prometheus_labels(method=method, path=path)
        lines.append(f"electsim_api_request_duration_ms_count{labels} {int(count)}")

    lines.extend(
        [
            "# HELP electsim_source_health_total Latest known source health count by status.",
            "# TYPE electsim_source_health_total gauge",
        ]
    )
    for status, count in sorted(summary.get("source_health", {}).get("by_status", {}).items()):
        lines.append(
            f'electsim_source_health_total{_prometheus_labels(status=status)} {int(count)}'
        )

    lines.extend(
        [
            "# HELP electsim_scraper_incidents_active_total Active scraper incidents by severity.",
            "# TYPE electsim_scraper_incidents_active_total gauge",
        ]
    )
    for severity, count in sorted(summary.get("scraper_incidents", {}).get("by_severity", {}).items()):
        lines.append(
            f'electsim_scraper_incidents_active_total{_prometheus_labels(severity=severity)} {int(count)}'
        )

    lines.extend(
        [
            "# HELP electsim_scraping_runs_recent_total Recent scraping runs by status.",
            "# TYPE electsim_scraping_runs_recent_total gauge",
        ]
    )
    for status, count in sorted(summary.get("scraping_log", {}).get("by_status", {}).items()):
        lines.append(
            f'electsim_scraping_runs_recent_total{_prometheus_labels(status=status)} {int(count)}'
        )

    lines.extend(
        [
            "# HELP electsim_ingest_sources_total Sources tracked in ingest_log.",
            "# TYPE electsim_ingest_sources_total gauge",
            f'electsim_ingest_sources_total {int(summary.get("ingestion", {}).get("tracked_sources", 0))}',
            "# HELP electsim_ingest_stale_sources_total Sources without fresh ingest in the last 48 hours.",
            "# TYPE electsim_ingest_stale_sources_total gauge",
            f'electsim_ingest_stale_sources_total {int(summary.get("ingestion", {}).get("stale_sources", 0))}',
            "# HELP electsim_system_alerts_total Unread system alerts by severity.",
            "# TYPE electsim_system_alerts_total gauge",
        ]
    )
    for severity, count in sorted(summary.get("alerts", {}).get("by_severity", {}).items()):
        lines.append(
            f'electsim_system_alerts_total{_prometheus_labels(severity=severity)} {int(count)}'
        )

    return "\n".join(lines) + "\n"
