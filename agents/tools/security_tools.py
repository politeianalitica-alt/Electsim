"""
Security Brain Tools — Bloque 13.

6 herramientas de seguridad para el agente Brain/LLM.
Todas son de solo lectura (no modifican estado).
Siempre devuelven dicts JSON-serializable.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def get_security_status() -> dict[str, Any]:
    """
    Obtiene el estado actual de seguridad de la plataforma.

    Returns:
        Dict con security_score, health, dev_mode, checks, secrets_summary.

    Example brain prompt:
        ¿Cuál es el estado de seguridad actual de la plataforma?
    """
    try:
        from security.settings import settings
        from security.deployment_checks import run_all_checks, get_security_score
        from security.secrets import get_secrets_summary

        checks = run_all_checks()
        score = get_security_score(checks)
        secrets = get_secrets_summary()

        failed_checks = [
            {
                "name": c["name"],
                "severity": c["severity"],
                "message": c["message"],
                "recommendation": c.get("recommendation", ""),
            }
            for c in checks
            if not c["passed"]
        ]

        return {
            "ok": True,
            "security_score": score["score"],
            "health": score["health"],
            "dev_mode": settings.dev_mode,
            "auth_required": settings.auth_required,
            "feature_rbac": settings.feature_rbac,
            "feature_audit": settings.feature_audit,
            "feature_multicliente": settings.feature_multicliente,
            "checks_total": score["total"],
            "checks_passed": score["passed"],
            "checks_failed": score["failed"],
            "critical_failures": score["critical_failures"],
            "failed_checks": failed_checks[:10],
            "secrets_health": secrets["health"],
            "secrets_missing_required": secrets["missing_required"],
        }
    except Exception as exc:
        logger.error("get_security_status error: %s", exc)
        return {"ok": False, "error": str(exc)}


def get_current_user_permissions(user_id: str | None = None) -> dict[str, Any]:
    """
    Obtiene los permisos efectivos del usuario actual (o de un user_id específico).

    Args:
        user_id: ID de usuario a consultar. None = usuario de sesión actual.

    Returns:
        Dict con user info, roles, permisos efectivos, módulos accesibles.

    Example brain prompt:
        ¿Qué permisos tengo? ¿Puedo acceder al módulo de riesgo?
    """
    try:
        from security.auth import get_current_user_from_streamlit
        from security.rbac import get_user_roles, get_effective_permissions
        from security.policies import get_visible_modules

        if user_id:
            # Construir usuario mínimo para consulta
            user: dict[str, Any] = {"id": user_id, "activo": True}
        else:
            user = get_current_user_from_streamlit()

        roles = get_user_roles(user)
        permissions = get_effective_permissions(user)
        visible_modules = get_visible_modules(user)

        return {
            "ok": True,
            "user_id": user.get("id"),
            "email": user.get("email", ""),
            "tenant_id": user.get("tenant_id"),
            "is_superadmin": user.get("is_superadmin", False),
            "activo": user.get("activo", False),
            "roles": [{"id": r["id"], "nombre": r["nombre"]} for r in roles],
            "permissions": sorted(permissions)[:50],
            "visible_modules": visible_modules,
            "n_permissions": len(permissions),
        }
    except Exception as exc:
        logger.error("get_current_user_permissions error: %s", exc)
        return {"ok": False, "error": str(exc)}


def get_audit_summary(
    days: int = 7,
    tenant_id: str | None = None,
    event_type: str | None = None,
    min_risk_score: int = 0,
) -> dict[str, Any]:
    """
    Obtiene un resumen de eventos de auditoría recientes.

    Args:
        days: Período en días (default 7).
        tenant_id: Filtrar por tenant.
        event_type: Filtrar por tipo de evento.
        min_risk_score: Solo eventos con riesgo >= este valor.

    Returns:
        Dict con estadísticas agregadas y eventos recientes de alto riesgo.

    Example brain prompt:
        ¿Ha habido intentos de acceso denegado en los últimos 7 días?
        Dame el resumen de auditoría de esta semana.
    """
    try:
        from security.audit import get_audit_summary as _get_summary, get_recent_events

        summary = _get_summary(tenant_id=tenant_id, days=days)
        high_risk = get_recent_events(
            limit=10,
            tenant_id=tenant_id,
            event_type=event_type,
            min_risk_score=max(min_risk_score, 50),
        )

        return {
            "ok": True,
            "period_days": days,
            "total_events": summary["total_events"],
            "denied_events": summary["denied_events"],
            "error_events": summary["error_events"],
            "high_risk_events": summary["high_risk_events"],
            "event_type_breakdown": summary.get("event_types", {}),
            "high_risk_sample": [
                {
                    "event_type": e.get("event_type"),
                    "user_id": e.get("user_id"),
                    "action": e.get("action"),
                    "result": e.get("result"),
                    "risk_score": e.get("risk_score"),
                    "created_at": str(e.get("created_at", ""))[:19],
                }
                for e in high_risk[:5]
            ],
        }
    except Exception as exc:
        logger.error("get_audit_summary error: %s", exc)
        return {"ok": False, "error": str(exc)}


def get_deployment_security_checks() -> dict[str, Any]:
    """
    Ejecuta y devuelve los checks de seguridad del despliegue.

    Returns:
        Dict con score, checks agrupados por categoría, y recomendaciones prioritarias.

    Example brain prompt:
        ¿La plataforma está lista para ir a producción?
        ¿Qué checks de seguridad han fallado?
    """
    try:
        from security.deployment_checks import run_all_checks, get_security_score

        checks = run_all_checks()
        score = get_security_score(checks)

        by_category: dict[str, list[dict[str, Any]]] = {}
        for check in checks:
            cat = check.get("category", "other")
            by_category.setdefault(cat, []).append({
                "name": check["name"],
                "passed": check["passed"],
                "severity": check["severity"],
                "message": check["message"],
                "recommendation": check.get("recommendation", ""),
            })

        top_recommendations = [
            check["recommendation"]
            for check in checks
            if not check["passed"] and check.get("recommendation")
        ][:5]

        return {
            "ok": True,
            "security_score": score["score"],
            "health": score["health"],
            "passed": score["passed"],
            "failed": score["failed"],
            "critical_failures": score["critical_failures"],
            "by_category": by_category,
            "top_recommendations": top_recommendations,
        }
    except Exception as exc:
        logger.error("get_deployment_security_checks error: %s", exc)
        return {"ok": False, "error": str(exc)}


def get_secret_configuration_status() -> dict[str, Any]:
    """
    Obtiene el estado de configuración de secretos.

    NUNCA devuelve valores reales — solo metadata (present/missing/placeholder).

    Returns:
        Dict con resumen y lista de secretos por categoría.

    Example brain prompt:
        ¿Qué secretos faltan para ir a producción?
        ¿Están configuradas las API keys necesarias?
    """
    try:
        from security.secrets import check_all_secrets, get_secrets_summary

        summary = get_secrets_summary()
        secrets = check_all_secrets()

        # Agrupar por categoría sin exponer valores
        by_category: dict[str, list[dict[str, Any]]] = {}
        for s in secrets:
            cat = s.get("category", "other")
            by_category.setdefault(cat, []).append({
                "key": s["key"],
                "status": s["status"],
                "required": s["required"],
                "hint": s.get("hint", ""),
            })

        missing_required = [
            {"key": s["key"], "category": s["category"], "hint": s.get("hint", "")}
            for s in secrets
            if s.get("required") and s.get("status") != "present"
        ]

        return {
            "ok": True,
            "health": summary["health"],
            "total": summary["total"],
            "present": summary["present"],
            "missing_required": summary["missing_required"],
            "placeholder": summary["placeholder"],
            "invalid": summary["invalid"],
            "by_category": by_category,
            "action_needed": missing_required,
        }
    except Exception as exc:
        logger.error("get_secret_configuration_status error: %s", exc)
        return {"ok": False, "error": str(exc)}


def explain_access_to_object(
    resource_type: str,
    resource_id: str,
    action: str = "read",
) -> dict[str, Any]:
    """
    Explica si el usuario actual puede acceder a un recurso y por qué.

    Args:
        resource_type: Tipo de recurso (ej: "electoral_data", "document").
        resource_id: ID del recurso.
        action: Acción a verificar ("read", "write", "export", "delete").

    Returns:
        Dict con allowed, reason, classification_level, required_permissions.

    Example brain prompt:
        ¿Puedo exportar los datos del módulo electoral?
        ¿Por qué no tengo acceso al documento XYZ?
    """
    try:
        from security.auth import get_current_user_from_streamlit
        from security.policies import can_access_resource
        from security.data_classification import get_effective_level, get_level_info
        from security.rbac import get_effective_permissions

        user = get_current_user_from_streamlit()
        allowed = can_access_resource(user, resource_type, resource_id, action)
        level = get_effective_level(resource_type, resource_id)
        level_info = get_level_info(level)
        permissions = get_effective_permissions(user)

        # Permiso requerido
        required_perm = f"{resource_type}:{action}"
        has_perm = required_perm in permissions

        return {
            "ok": True,
            "allowed": allowed,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "reason": "Acceso permitido" if allowed else _explain_denial(user, resource_type, action, level),
            "user_id": user.get("id"),
            "user_roles": user.get("roles", []),
            "data_classification": level.value,
            "classification_label": level_info.get("label", ""),
            "required_permission": required_perm,
            "user_has_permission": has_perm,
            "dev_mode": True if user.get("is_superadmin") else False,
        }
    except Exception as exc:
        logger.error("explain_access_to_object error: %s", exc)
        return {"ok": False, "error": str(exc)}


def _explain_denial(
    user: dict[str, Any],
    resource_type: str,
    action: str,
    level: Any,
) -> str:
    """Genera explicación de denegación de acceso."""
    from security.settings import settings
    from security.schemas import DataClassificationLevel

    if not user.get("activo", False):
        return "Usuario inactivo"

    if level == DataClassificationLevel.RESTRICTED:
        return "Datos RESTRINGIDOS — acceso reservado a super_admin y security_admin"

    if level == DataClassificationLevel.SENSITIVE:
        return "Datos SENSIBLES — requiere rol senior_analyst o superior"

    required_perm = f"{resource_type}:{action}"
    return f"Sin permiso '{required_perm}'. Contacta al administrador para solicitar acceso."


# ── Registro de herramientas para el Brain ────────────────────────────────────

SECURITY_TOOLS = [
    {
        "name": "get_security_status",
        "function": get_security_status,
        "description": "Estado de seguridad de la plataforma: score, checks, secretos",
        "parameters": {},
        "category": "security",
        "requires_permission": "security:admin",
    },
    {
        "name": "get_current_user_permissions",
        "function": get_current_user_permissions,
        "description": "Permisos del usuario actual: roles, módulos accesibles",
        "parameters": {"user_id": {"type": "string", "required": False}},
        "category": "security",
        "requires_permission": "audit:read",
    },
    {
        "name": "get_audit_summary",
        "function": get_audit_summary,
        "description": "Resumen de auditoría: eventos, denegaciones, riesgo",
        "parameters": {
            "days": {"type": "integer", "default": 7},
            "tenant_id": {"type": "string", "required": False},
            "event_type": {"type": "string", "required": False},
            "min_risk_score": {"type": "integer", "default": 0},
        },
        "category": "security",
        "requires_permission": "audit:read",
    },
    {
        "name": "get_deployment_security_checks",
        "function": get_deployment_security_checks,
        "description": "Checks de seguridad del despliegue con recomendaciones",
        "parameters": {},
        "category": "security",
        "requires_permission": "security:admin",
    },
    {
        "name": "get_secret_configuration_status",
        "function": get_secret_configuration_status,
        "description": "Estado de secretos de configuración (sin valores reales)",
        "parameters": {},
        "category": "security",
        "requires_permission": "secrets:read",
    },
    {
        "name": "explain_access_to_object",
        "function": explain_access_to_object,
        "description": "Explica si el usuario puede acceder a un recurso y por qué",
        "parameters": {
            "resource_type": {"type": "string", "required": True},
            "resource_id": {"type": "string", "required": True},
            "action": {"type": "string", "default": "read"},
        },
        "category": "security",
        "requires_permission": None,  # Cualquier usuario puede consultar su propio acceso
    },
]
