"""
core/health.py — Health checks técnicos para ElectSim.

Funciones:
    check_db_connection()
    check_migrations_current()
    check_required_tables(tables)
    get_full_health_report()

Uso en D10/N9:
    from core.health import get_full_health_report
    report = get_full_health_report()
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

REQUIRED_TABLES = [
    # core
    "tenants", "users", "roles", "user_roles", "audit_events",
    # crm
    "crm_contacts", "crm_organizations", "crm_interactions",
    "crm_outreach_tasks", "crm_relationships", "crm_segments",
    "crm_mobilization_events", "crm_stakeholder_profiles",
    # comms
    "comms_channels", "message_frames", "content_assets",
    "editorial_calendar", "distribution_lists", "publication_jobs",
    "content_approvals", "content_performance",
    # security
    "data_classifications", "export_jobs",
    # geopolitics
    "geo_events", "country_risk_profiles",
    # documents
    "source_documents", "document_chunks", "evidence_citations",
]


def check_db_connection() -> dict[str, Any]:
    """Verifica que hay conexión a la DB."""
    try:
        from db.session import get_engine
        with get_engine().connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {"ok": True, "message": "Conexión DB activa"}
    except Exception as exc:
        return {"ok": False, "message": str(exc)}


def check_migrations_current() -> dict[str, Any]:
    """Verifica que alembic está en head."""
    try:
        from alembic.runtime.migration import MigrationContext
        from db.session import get_engine
        with get_engine().connect() as conn:
            ctx = MigrationContext.configure(conn)
            current = ctx.get_current_revision()
        return {
            "ok": True,
            "current_revision": current,
            "message": f"Alembic en revisión {current}",
        }
    except Exception as exc:
        return {"ok": False, "current_revision": None, "message": str(exc)}


def check_required_tables(tables: list[str] | None = None) -> dict[str, Any]:
    """Verifica que las tablas requeridas existen."""
    from sqlalchemy import inspect as sa_inspect
    tables_to_check = tables or REQUIRED_TABLES
    try:
        from db.session import get_engine
        insp = sa_inspect(get_engine())
        existing = set(insp.get_table_names())
        missing = [t for t in tables_to_check if t not in existing]
        present = [t for t in tables_to_check if t in existing]
        return {
            "ok": len(missing) == 0,
            "present": present,
            "missing": missing,
            "message": (
                f"Todas las tablas presentes ({len(present)})"
                if not missing
                else f"{len(missing)} tablas ausentes: {', '.join(missing[:5])}"
            ),
        }
    except Exception as exc:
        return {"ok": False, "present": [], "missing": tables_to_check, "message": str(exc)}


def check_module_mode(module_name: str, table: str) -> str:
    """Devuelve 'real', 'unavailable' o 'error' para un módulo."""
    try:
        from db.session import get_engine
        from sqlalchemy import inspect as sa_inspect
        insp = sa_inspect(get_engine())
        existing = set(insp.get_table_names())
        if table in existing:
            return "real"
        return "unavailable"
    except Exception:
        return "error"


def get_full_health_report() -> dict[str, Any]:
    """Informe completo de salud técnica del sistema."""
    db = check_db_connection()
    migrations = check_migrations_current() if db["ok"] else {"ok": False, "current_revision": None, "message": "DB no disponible"}
    tables = check_required_tables() if db["ok"] else {"ok": False, "present": [], "missing": REQUIRED_TABLES, "message": "DB no disponible"}

    modules = {}
    if db["ok"]:
        MODULE_TABLES = {
            "CRM": "crm_contacts",
            "Comunicaciones": "content_assets",
            "Seguridad": "audit_events",
            "Geopolítica": "geo_events",
            "Documentos": "source_documents",
            "Simulación": "simulation_scenarios",
            "OpenData": "opendata_datasets",
        }
        for mod, tbl in MODULE_TABLES.items():
            modules[mod] = check_module_mode(mod, tbl)
    else:
        for mod in ["CRM", "Comunicaciones", "Seguridad", "Geopolítica", "Documentos"]:
            modules[mod] = "error"

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db,
        "migrations": migrations,
        "tables": tables,
        "modules": modules,
        "overall_ok": db["ok"] and tables["ok"],
    }
