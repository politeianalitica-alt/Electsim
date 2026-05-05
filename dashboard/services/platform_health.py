"""
dashboard/services/platform_health.py — Estado de salud de la plataforma.

Agrega: DB health, módulos en real/demo/fallback, alertas pendientes,
contenido pendiente, schema contracts, pipeline failures.

Uso:
    from dashboard.services.platform_health import (
        cargar_platform_status, cargar_module_modes, cargar_schema_status
    )
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


def _cache(seconds: int = 30):
    """Cache simple en memoria."""
    import functools, time
    def decorator(fn):
        _cache_data = {}
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = str(args) + str(sorted(kwargs.items()))
            cached = _cache_data.get(key)
            if cached and (time.time() - cached["ts"]) < seconds:
                return cached["v"]
            result = fn(*args, **kwargs)
            _cache_data[key] = {"v": result, "ts": time.time()}
            return result
        return wrapper
    return decorator


@_cache(30)
def cargar_platform_status() -> dict[str, Any]:
    """
    Informe completo de salud de la plataforma.

    Returns dict con database, migrations, tables, modules, overall_ok.
    """
    try:
        from core.health import get_full_health_report
        return get_full_health_report()
    except Exception as exc:
        logger.debug("cargar_platform_status error: %s", exc)
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "database": {"ok": False, "message": str(exc)},
            "migrations": {"ok": False, "message": "No disponible"},
            "tables": {"ok": False, "present": [], "missing": [], "message": "No disponible"},
            "modules": {},
            "overall_ok": False,
        }


@_cache(60)
def cargar_module_modes() -> dict[str, str]:
    """
    Retorna el modo (real/fallback/unavailable/error) de cada módulo.

    Returns: {"CRM": "real", "Comms": "unavailable", ...}
    """
    try:
        report = cargar_platform_status()
        return report.get("modules", {})
    except Exception:
        return {}


@_cache(60)
def cargar_schema_status() -> dict[str, Any]:
    """
    Verifica contratos schema↔DB para módulos clave.

    Returns dict con results por módulo: {name: {ok, missing_in_db, missing_in_schema}}
    """
    results = {}
    CONTRACTS = {
        "crm_contacts": ("crm.schemas", "Contact"),
        "crm_organizations": ("crm.schemas", "Organization"),
        "content_assets": ("communications.schemas", "ContentAsset"),
        "message_frames": ("communications.schemas", "MessageFrame"),
    }
    for table, (mod, cls_name) in CONTRACTS.items():
        try:
            import importlib
            from sqlalchemy import inspect as sa_inspect
            from db.session import get_engine

            # Get Pydantic fields
            schema_mod = importlib.import_module(mod)
            schema_cls = getattr(schema_mod, cls_name)
            schema_fields = set(schema_cls.model_fields.keys())

            # Get DB columns
            insp = sa_inspect(get_engine())
            existing_tables = set(insp.get_table_names())
            if table not in existing_tables:
                results[table] = {"ok": False, "mode": "unavailable", "missing_in_db": list(schema_fields)}
                continue

            db_cols = {c["name"] for c in insp.get_columns(table)}
            db_only_expected = {"id", "created_at", "updated_at", "scored_at"}
            missing_in_db = sorted(schema_fields - db_cols)
            missing_in_schema = sorted(db_cols - schema_fields - db_only_expected)

            results[table] = {
                "ok": len(missing_in_db) == 0,
                "mode": "real" if len(missing_in_db) == 0 else "error",
                "missing_in_db": missing_in_db,
                "missing_in_schema": missing_in_schema,
                "schema_fields": len(schema_fields),
                "db_columns": len(db_cols),
            }
        except Exception as exc:
            results[table] = {"ok": False, "mode": "error", "error": str(exc)[:100]}
    return results


@_cache(120)
def cargar_pending_actions_summary(tenant_id: str = "default") -> dict[str, int]:
    """
    Cuenta pendientes: aprobaciones comms, tareas CRM, alertas.

    Returns: {"pending_approvals": N, "due_tasks": N, "active_alerts": N}
    """
    summary: dict[str, int] = {"pending_approvals": 0, "due_tasks": 0, "active_alerts": 0}

    try:
        from communications.repository import CommsRepository
        repo = CommsRepository()
        summary["pending_approvals"] = len(repo.list_pending_approvals(tenant_id))
    except Exception:
        pass

    try:
        from crm.repository import CRMRepository
        repo = CRMRepository()
        summary["due_tasks"] = len(repo.list_due_tasks(tenant_id, days=7))
    except Exception:
        pass

    return summary


@_cache(30)
def cargar_db_health() -> dict[str, Any]:
    """Health check rápido de DB."""
    try:
        from core.health import check_db_connection
        return check_db_connection()
    except Exception as exc:
        return {"ok": False, "message": str(exc)}


@_cache(120)
def cargar_migration_status() -> dict[str, Any]:
    """Estado de migraciones Alembic."""
    try:
        from core.health import check_migrations_current
        return check_migrations_current()
    except Exception as exc:
        return {"ok": False, "message": str(exc)}
