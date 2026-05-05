"""
Security Core Dashboard Service — Bloque 13.

Funciones de carga de datos de seguridad para el dashboard.
Todas con fallback gracioso sin DB.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def cargar_usuarios(
    tenant_id: str | None = None,
    activo_only: bool = True,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """
    Carga lista de usuarios.

    En modo dev sin DB, devuelve el usuario dev.
    """
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            raise RuntimeError("sin conexión")

        where_parts = []
        params: list[Any] = []
        if tenant_id:
            where_parts.append("tenant_id = %s")
            params.append(tenant_id)
        if activo_only:
            where_parts.append("activo = true")
        where_sql = "WHERE " + " AND ".join(where_parts) if where_parts else ""
        params.append(limit)

        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id, email, nombre, tenant_id, activo, is_superadmin, "
            f"last_login, created_at FROM users {where_sql} "
            f"ORDER BY nombre LIMIT %s",
            params,
        )
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as exc:
        logger.debug("cargar_usuarios error: %s", exc)
        from security.settings import settings
        return [settings.get_dev_user()]


def cargar_tenants(
    activo_only: bool = True,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Carga lista de tenants."""
    try:
        from security.tenants import list_tenants
        return list_tenants(active_only=activo_only, limit=limit)
    except Exception as exc:
        logger.debug("cargar_tenants error: %s", exc)
        from security.settings import settings
        return [settings.get_default_tenant()]


def cargar_workspaces(
    tenant_id: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Carga lista de workspaces."""
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            raise RuntimeError("sin conexión")

        where_parts = []
        params: list[Any] = []
        if tenant_id:
            where_parts.append("tenant_id = %s")
            params.append(tenant_id)
        where_sql = "WHERE " + " AND ".join(where_parts) if where_parts else ""
        params.append(limit)

        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id, nombre, tenant_id, owner_id, description, "
            f"data_classification, activo, created_at "
            f"FROM workspaces {where_sql} ORDER BY nombre LIMIT %s",
            params,
        )
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as exc:
        logger.debug("cargar_workspaces error: %s", exc)
        return []


def cargar_roles(
    include_system: bool = True,
    tenant_id: str | None = None,
) -> list[dict[str, Any]]:
    """Carga roles del sistema y/o del tenant."""
    try:
        from security.rbac import list_system_roles
        roles = list_system_roles() if include_system else []

        if tenant_id:
            # Roles custom del tenant desde DB
            try:
                from db.connection import get_db_connection
                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT id, nombre, permissions, description FROM roles "
                        "WHERE tenant_id = %s AND is_system = false",
                        (tenant_id,),
                    )
                    rows = cursor.fetchall()
                    cols = [d[0] for d in cursor.description]
                    custom_roles = [dict(zip(cols, r)) for r in rows]
                    roles = roles + custom_roles
            except Exception:
                pass

        return roles
    except Exception as exc:
        logger.debug("cargar_roles error: %s", exc)
        return []


def cargar_audit_events(
    limit: int = 100,
    user_id: str | None = None,
    tenant_id: str | None = None,
    event_type: str | None = None,
    min_risk_score: int = 0,
) -> list[dict[str, Any]]:
    """Carga eventos de auditoría recientes."""
    try:
        from security.audit import get_recent_events
        return get_recent_events(
            limit=limit,
            user_id=user_id,
            tenant_id=tenant_id,
            event_type=event_type,
            min_risk_score=min_risk_score,
        )
    except Exception as exc:
        logger.debug("cargar_audit_events error: %s", exc)
        return []


def cargar_security_kpis(tenant_id: str | None = None) -> dict[str, Any]:
    """
    Carga KPIs de seguridad para el dashboard.

    Returns dict con métricas agregadas de seguridad.
    """
    from security.settings import settings
    from security.secrets import get_secrets_summary
    from security.deployment_checks import run_all_checks, get_security_score

    kpis: dict[str, Any] = {
        "dev_mode": settings.dev_mode,
        "auth_required": settings.auth_required,
        "feature_rbac": settings.feature_rbac,
        "feature_audit": settings.feature_audit,
        "feature_multicliente": settings.feature_multicliente,
    }

    try:
        secrets_summary = get_secrets_summary()
        kpis["secrets_health"] = secrets_summary["health"]
        kpis["secrets_missing_required"] = secrets_summary["missing_required"]
        kpis["secrets_total"] = secrets_summary["total"]
        kpis["secrets_present"] = secrets_summary["present"]
    except Exception:
        kpis["secrets_health"] = "unknown"

    try:
        checks = run_all_checks()
        score = get_security_score(checks)
        kpis["security_score"] = score["score"]
        kpis["security_health"] = score["health"]
        kpis["checks_failed"] = score["failed"]
        kpis["checks_critical"] = score["critical_failures"]
    except Exception:
        kpis["security_score"] = 0
        kpis["security_health"] = "unknown"

    try:
        from security.audit import get_audit_summary
        audit_summary = get_audit_summary(tenant_id=tenant_id)
        kpis["audit_total_events"] = audit_summary["total_events"]
        kpis["audit_denied_events"] = audit_summary["denied_events"]
        kpis["audit_high_risk_events"] = audit_summary["high_risk_events"]
    except Exception:
        kpis["audit_total_events"] = 0

    try:
        users = cargar_usuarios(tenant_id=tenant_id)
        kpis["total_users"] = len(users)
        kpis["active_users"] = sum(1 for u in users if u.get("activo", True))
    except Exception:
        kpis["total_users"] = 0

    return kpis


def cargar_data_classifications(
    resource_type: str | None = None,
    level: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Carga clasificaciones de datos."""
    try:
        from security.data_classification import list_classifications
        return list_classifications(
            resource_type=resource_type, level=level, limit=limit
        )
    except Exception as exc:
        logger.debug("cargar_data_classifications error: %s", exc)
        return []


def cargar_export_jobs(
    user_id: str | None = None,
    tenant_id: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Carga export jobs."""
    try:
        from security.export_controls import list_export_jobs
        return list_export_jobs(
            user_id=user_id, tenant_id=tenant_id, status=status, limit=limit
        )
    except Exception as exc:
        logger.debug("cargar_export_jobs error: %s", exc)
        return []


def cargar_deployment_checks() -> list[dict[str, Any]]:
    """Carga resultados de checks de despliegue."""
    try:
        from security.deployment_checks import run_all_checks
        return run_all_checks()
    except Exception as exc:
        logger.debug("cargar_deployment_checks error: %s", exc)
        return []


def cargar_secret_status() -> list[dict[str, Any]]:
    """Carga estado de secretos (sin valores reales)."""
    try:
        from security.secrets import check_all_secrets
        return check_all_secrets()
    except Exception as exc:
        logger.debug("cargar_secret_status error: %s", exc)
        return []
