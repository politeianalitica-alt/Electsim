"""
Audit logging — Bloque 13.

Registro inmutable de eventos de seguridad y operaciones sensibles.
En DEV_MODE o sin DB, los eventos se guardan en memoria.
Nunca lanza excepciones — el audit no debe romper el flujo normal.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from security.settings import settings

logger = logging.getLogger(__name__)

# Cache en memoria para cuando no hay DB
_AUDIT_CACHE: list[dict[str, Any]] = []
_MAX_CACHE_SIZE = 1000


def log_audit_event(
    event_type: str,
    user_id: str | None = None,
    tenant_id: str | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    action: str = "",
    result: str = "ok",
    ip_address: str | None = None,
    details: dict[str, Any] | None = None,
    risk_score: int = 0,
) -> str | None:
    """
    Registra un evento de auditoría.

    Nunca lanza excepción. Devuelve el ID del evento o None.

    Args:
        event_type: Tipo de evento (de AuditEventType o string libre).
        user_id: ID del usuario que realiza la acción.
        tenant_id: ID del tenant.
        resource_type: Tipo de recurso afectado.
        resource_id: ID del recurso afectado.
        action: Descripción de la acción.
        result: "ok", "denied", "error".
        ip_address: IP del cliente.
        details: Detalles adicionales (no incluir datos sensibles).
        risk_score: Puntuación de riesgo 0-100.

    Returns:
        event_id o None.
    """
    if not settings.feature_audit and not settings.dev_mode:
        return None

    event_id = str(uuid.uuid4())
    event: dict[str, Any] = {
        "id": event_id,
        "event_type": event_type,
        "user_id": user_id,
        "tenant_id": tenant_id or settings.default_tenant_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "action": action,
        "result": result,
        "ip_address": ip_address,
        "details": details or {},
        "risk_score": risk_score,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Nivel de log según resultado
    if result == "denied":
        logger.warning(
            "AUDIT [%s] user=%s action=%s result=denied",
            event_type, user_id, action,
        )
    elif result == "error":
        logger.error(
            "AUDIT [%s] user=%s action=%s result=error",
            event_type, user_id, action,
        )
    else:
        logger.debug(
            "AUDIT [%s] user=%s action=%s result=ok",
            event_type, user_id, action,
        )

    # Persistir en DB
    saved = _save_audit_event(event)
    if not saved:
        # Fallback memoria
        _AUDIT_CACHE.append(event)
        if len(_AUDIT_CACHE) > _MAX_CACHE_SIZE:
            _AUDIT_CACHE.pop(0)

    return event_id


def log_login(user_id: str, tenant_id: str | None = None, ip: str | None = None, success: bool = True) -> None:
    """Shortcut para loguear eventos de login."""
    log_audit_event(
        event_type="login" if success else "login_failed",
        user_id=user_id,
        tenant_id=tenant_id,
        action="login",
        result="ok" if success else "denied",
        ip_address=ip,
        risk_score=0 if success else 20,
    )


def log_export(
    user_id: str | None,
    module_id: str,
    export_type: str,
    record_count: int,
    tenant_id: str | None = None,
) -> None:
    """Shortcut para loguear exportaciones."""
    log_audit_event(
        event_type="data_export",
        user_id=user_id,
        tenant_id=tenant_id,
        resource_type="export",
        resource_id=module_id,
        action=f"export_{export_type}",
        result="ok",
        details={"export_type": export_type, "record_count": record_count},
        risk_score=min(30, record_count // 1000),
    )


def log_brain_tool(
    user_id: str | None,
    tool_name: str,
    tenant_id: str | None = None,
    result: str = "ok",
) -> None:
    """Shortcut para loguear llamadas al Brain."""
    log_audit_event(
        event_type="brain_tool_call",
        user_id=user_id,
        tenant_id=tenant_id,
        resource_type="brain_tool",
        resource_id=tool_name,
        action=f"call_{tool_name}",
        result=result,
    )


def log_permission_denied(
    user_id: str | None,
    permission: str,
    resource: str | None = None,
    tenant_id: str | None = None,
) -> None:
    """Shortcut para loguear denegar acceso."""
    log_audit_event(
        event_type="permission_denied",
        user_id=user_id,
        tenant_id=tenant_id,
        resource_type="permission",
        resource_id=permission,
        action=f"check_{permission}",
        result="denied",
        details={"resource": resource},
        risk_score=15,
    )


def get_recent_events(
    limit: int = 50,
    user_id: str | None = None,
    tenant_id: str | None = None,
    event_type: str | None = None,
    min_risk_score: int = 0,
) -> list[dict[str, Any]]:
    """
    Obtiene eventos de auditoría recientes.

    Combina DB + cache en memoria.
    """
    events = _load_audit_events(
        limit=limit,
        user_id=user_id,
        tenant_id=tenant_id,
        event_type=event_type,
        min_risk_score=min_risk_score,
    )
    if events:
        return events

    # Fallback memoria
    filtered = _AUDIT_CACHE
    if user_id:
        filtered = [e for e in filtered if e.get("user_id") == user_id]
    if tenant_id:
        filtered = [e for e in filtered if e.get("tenant_id") == tenant_id]
    if event_type:
        filtered = [e for e in filtered if e.get("event_type") == event_type]
    if min_risk_score > 0:
        filtered = [e for e in filtered if e.get("risk_score", 0) >= min_risk_score]
    return list(reversed(filtered))[:limit]


def get_audit_summary(
    tenant_id: str | None = None,
    days: int = 7,
) -> dict[str, Any]:
    """
    Resumen estadístico de auditoría para el periodo dado.
    """
    events = get_recent_events(limit=500, tenant_id=tenant_id)

    total = len(events)
    denied = sum(1 for e in events if e.get("result") == "denied")
    errors = sum(1 for e in events if e.get("result") == "error")
    high_risk = sum(1 for e in events if e.get("risk_score", 0) >= 50)

    type_counts: dict[str, int] = {}
    for e in events:
        t = e.get("event_type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "total_events": total,
        "denied_events": denied,
        "error_events": errors,
        "high_risk_events": high_risk,
        "event_types": type_counts,
        "period_days": days,
    }


# ── DB helpers ─────────────────────────────────────────────────────────────────

def _save_audit_event(event: dict[str, Any]) -> bool:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return False
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_events "
            "(id, event_type, user_id, tenant_id, resource_type, resource_id, "
            "action, result, ip_address, details, risk_score) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                event["id"], event["event_type"], event.get("user_id"),
                event.get("tenant_id"), event.get("resource_type"),
                event.get("resource_id"), event.get("action", ""),
                event.get("result", "ok"), event.get("ip_address"),
                json.dumps(event.get("details", {})),
                event.get("risk_score", 0),
            ),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.debug("_save_audit_event: %s", exc)
        return False


def _load_audit_events(
    limit: int = 50,
    user_id: str | None = None,
    tenant_id: str | None = None,
    event_type: str | None = None,
    min_risk_score: int = 0,
) -> list[dict[str, Any]]:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return []
        where_clauses = []
        params: list[Any] = []
        if user_id:
            where_clauses.append("user_id = %s")
            params.append(user_id)
        if tenant_id:
            where_clauses.append("tenant_id = %s")
            params.append(tenant_id)
        if event_type:
            where_clauses.append("event_type = %s")
            params.append(event_type)
        if min_risk_score > 0:
            where_clauses.append("risk_score >= %s")
            params.append(min_risk_score)

        where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        params.append(limit)

        cursor = conn.cursor()
        cursor.execute(
            f"SELECT id, event_type, user_id, tenant_id, resource_type, resource_id, "
            f"action, result, ip_address, details, risk_score, created_at "
            f"FROM audit_events {where_sql} "
            f"ORDER BY created_at DESC LIMIT %s",
            params,
        )
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        events = []
        for row in rows:
            e = dict(zip(cols, row))
            if isinstance(e.get("details"), str):
                try:
                    e["details"] = json.loads(e["details"])
                except Exception:
                    e["details"] = {}
            events.append(e)
        return events
    except Exception as exc:
        logger.debug("_load_audit_events: %s", exc)
        return []
