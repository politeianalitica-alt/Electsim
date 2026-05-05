"""
Security Policies — Bloque 13.

Políticas de acceso de alto nivel que combinan RBAC, clasificación de datos
y restricciones de tenant. Punto de entrada único para verificaciones de política.
"""
from __future__ import annotations

import logging
from typing import Any

from security.settings import settings
from security.schemas import DataClassificationLevel

logger = logging.getLogger(__name__)


def can_access_module(user: dict[str, Any], module_id: str) -> bool:
    """
    Verifica si el usuario puede acceder a un módulo.

    Args:
        user: Dict de usuario.
        module_id: ID del módulo (ej: "electoral", "media", "risk").

    Returns:
        bool
    """
    if settings.dev_mode:
        return True

    from security.auth import require_permission

    # Mapeo módulo → permiso
    module_permissions = {
        "electoral": "electoral:read",
        "media": "media:read",
        "legislative": "legislative:read",
        "risk": "risk:read",
        "economic": "economic:read",
        "simulation": "simulation:read",
        "documents": "documents:read",
        "opendata": "opendata:read",
        "workspace": "workspace:read",
        "brain": "brain:use",
        "pipeline": "pipeline:read",
        "security": "security:admin",
        "audit": "audit:read",
    }

    permission = module_permissions.get(module_id)
    if permission is None:
        # Módulo desconocido — permitir en modo no-RBAC, denegar en RBAC
        if settings.feature_rbac:
            logger.warning("Módulo desconocido en policies: %s", module_id)
            return False
        return True

    return require_permission(user, permission)


def can_access_resource(
    user: dict[str, Any],
    resource_type: str,
    resource_id: str,
    action: str = "read",
) -> bool:
    """
    Verifica si el usuario puede realizar una acción sobre un recurso específico.

    Combina RBAC + clasificación de datos + tenant isolation.

    Args:
        user: Dict de usuario.
        resource_type: Tipo de recurso.
        resource_id: ID del recurso.
        action: "read", "write", "delete", "export".

    Returns:
        bool
    """
    if settings.dev_mode:
        return True

    from security.auth import require_permission
    from security.data_classification import get_effective_level

    # 1. Verificar permiso básico
    permission = f"{resource_type}:{action}"
    if not require_permission(user, permission):
        return False

    # 2. Verificar clasificación de datos
    level = get_effective_level(resource_type, resource_id)

    # RESTRICTED: solo super_admin y security_admin
    if level == DataClassificationLevel.RESTRICTED:
        if not (user.get("is_superadmin") or "security_admin" in user.get("roles", [])):
            return False

    # SENSITIVE: requiere senior_analyst o superior
    if level == DataClassificationLevel.SENSITIVE:
        allowed_roles = {"super_admin", "platform_admin", "senior_analyst", "security_admin"}
        if not (user.get("is_superadmin") or any(r in allowed_roles for r in user.get("roles", []))):
            return False

    # 3. Tenant isolation (si multi-tenant activo)
    if settings.feature_multicliente:
        if not _check_tenant_isolation(user, resource_type, resource_id):
            return False

    return True


def enforce_module_access(user: dict[str, Any], module_id: str) -> None:
    """
    Lanza un error descriptivo si el usuario no puede acceder al módulo.

    Uso en páginas de dashboard: enforce_module_access(user, "electoral")
    """
    if not can_access_module(user, module_id):
        from security.audit import log_permission_denied
        log_permission_denied(
            user_id=user.get("id"),
            permission=f"{module_id}:read",
            resource=module_id,
            tenant_id=user.get("tenant_id"),
        )
        raise PermissionError(
            f"Acceso denegado al módulo '{module_id}'. "
            f"Contacta a tu administrador para solicitar acceso."
        )


def get_visible_modules(user: dict[str, Any]) -> list[str]:
    """
    Devuelve los módulos visibles para el usuario.
    """
    all_modules = [
        "electoral", "media", "legislative", "risk", "economic",
        "simulation", "documents", "opendata", "workspace",
        "brain", "pipeline", "security", "audit",
    ]

    if settings.dev_mode or user.get("is_superadmin", False):
        return all_modules

    if not settings.feature_rbac:
        return all_modules

    return [m for m in all_modules if can_access_module(user, m)]


def apply_tenant_filter(
    query_params: dict[str, Any],
    user: dict[str, Any],
) -> dict[str, Any]:
    """
    Añade filtro de tenant a parámetros de consulta.

    En modo single-tenant o sin multi-cliente, es un no-op.
    """
    if not settings.feature_multicliente:
        return query_params

    if user.get("is_superadmin", False):
        return query_params

    tenant_id = user.get("tenant_id", settings.default_tenant_id)
    return {**query_params, "tenant_id": tenant_id}


# ── Helpers privados ───────────────────────────────────────────────────────────

def _check_tenant_isolation(
    user: dict[str, Any],
    resource_type: str,
    resource_id: str,
) -> bool:
    """
    Verifica que el recurso pertenece al tenant del usuario.

    En modo single-tenant, siempre True.
    """
    if not settings.feature_multicliente:
        return True

    user_tenant = user.get("tenant_id", settings.default_tenant_id)

    # Intentar verificar en DB
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return True  # Sin DB, no podemos verificar

        # Las tablas con tenant_id son verificables
        tenant_tables = {
            "electoral_data": "tenant_id",
            "media_data": "tenant_id",
            "document": "tenant_id",
            "scenario": "tenant_id",
        }

        table_col = tenant_tables.get(resource_type)
        if not table_col:
            return True  # Sin columna tenant_id, no podemos verificar

        cursor = conn.cursor()
        cursor.execute(
            f"SELECT {table_col} FROM {resource_type}s WHERE id = %s LIMIT 1",
            (resource_id,),
        )
        row = cursor.fetchone()
        if not row:
            return True  # Recurso no encontrado — dejar pasar para 404 downstream
        resource_tenant = row[0]
        return resource_tenant is None or resource_tenant == user_tenant
    except Exception:
        return True  # En caso de error, no bloquear
