"""
RBAC — Role-Based Access Control — Bloque 13.

Sistema de roles y permisos para ElectSim.
9 roles de sistema predefinidos con permisos granulares.

En DEV_MODE o sin RBAC activado, has_permission() siempre devuelve True.
"""
from __future__ import annotations

import logging
from typing import Any

from security.settings import settings

logger = logging.getLogger(__name__)

# ── Permisos del sistema ───────────────────────────────────────────────────────

SYSTEM_PERMISSIONS: dict[str, dict[str, str]] = {
    # Datos electorales
    "electoral:read": {"resource": "electoral_data", "action": "read", "description": "Ver datos electorales"},
    "electoral:write": {"resource": "electoral_data", "action": "write", "description": "Modificar datos electorales"},
    "electoral:simulate": {"resource": "electoral_data", "action": "simulate", "description": "Ejecutar simulaciones electorales"},

    # Datos legislativos
    "legislative:read": {"resource": "legislative_data", "action": "read"},
    "legislative:write": {"resource": "legislative_data", "action": "write"},

    # Datos de medios
    "media:read": {"resource": "media_data", "action": "read"},
    "media:write": {"resource": "media_data", "action": "write"},

    # Riesgo
    "risk:read": {"resource": "risk_data", "action": "read"},
    "risk:write": {"resource": "risk_data", "action": "write"},

    # Economía
    "economic:read": {"resource": "economic_data", "action": "read"},
    "economic:write": {"resource": "economic_data", "action": "write"},

    # Brain / Agentes LLM
    "brain:use": {"resource": "brain_tools", "action": "execute", "description": "Usar el agente Brain"},
    "brain:admin": {"resource": "brain_tools", "action": "admin"},

    # Exportación
    "export:basic": {"resource": "export", "action": "basic", "description": "Exportar CSV/JSON básico"},
    "export:full": {"resource": "export", "action": "full", "description": "Exportar todos los formatos"},
    "export:approve": {"resource": "export", "action": "approve", "description": "Aprobar exportaciones"},

    # Documentos
    "documents:read": {"resource": "documents", "action": "read"},
    "documents:write": {"resource": "documents", "action": "write"},
    "documents:delete": {"resource": "documents", "action": "delete"},

    # Simulaciones
    "simulation:read": {"resource": "simulation", "action": "read"},
    "simulation:run": {"resource": "simulation", "action": "run"},
    "simulation:admin": {"resource": "simulation", "action": "admin"},

    # Pipelines / ETL
    "pipeline:read": {"resource": "pipeline", "action": "read"},
    "pipeline:run": {"resource": "pipeline", "action": "run"},
    "pipeline:admin": {"resource": "pipeline", "action": "admin"},

    # Usuarios y tenants
    "users:read": {"resource": "users", "action": "read"},
    "users:write": {"resource": "users", "action": "write"},
    "users:admin": {"resource": "users", "action": "admin"},
    "tenants:read": {"resource": "tenants", "action": "read"},
    "tenants:admin": {"resource": "tenants", "action": "admin"},

    # Seguridad y auditoría
    "audit:read": {"resource": "audit", "action": "read"},
    "security:admin": {"resource": "security", "action": "admin"},
    "secrets:read": {"resource": "secrets", "action": "read"},

    # Workspace
    "workspace:read": {"resource": "workspace", "action": "read"},
    "workspace:write": {"resource": "workspace", "action": "write"},
    "workspace:admin": {"resource": "workspace", "action": "admin"},

    # Open data
    "opendata:read": {"resource": "opendata", "action": "read"},
    "opendata:write": {"resource": "opendata", "action": "write"},

    # CRM
    "crm:read": {"resource": "crm", "action": "read", "description": "Ver contactos CRM"},
    "crm:write": {"resource": "crm", "action": "write", "description": "Crear/editar contactos CRM"},
    "crm:import": {"resource": "crm", "action": "import", "description": "Importar contactos CRM"},
    "crm:admin": {"resource": "crm", "action": "admin"},

    # Comunicaciones
    "comms:read": {"resource": "comms", "action": "read", "description": "Ver contenido de comunicaciones"},
    "comms:create": {"resource": "comms", "action": "create", "description": "Crear contenido de comunicaciones"},
    "comms:approve": {"resource": "comms", "action": "approve", "description": "Aprobar contenido"},
    "comms:admin": {"resource": "comms", "action": "admin"},

    # Geopolítica
    "geopolitics:read": {"resource": "geopolitics", "action": "read", "description": "Ver datos geopolíticos"},
    "geopolitics:write": {"resource": "geopolitics", "action": "write"},

    # Briefings
    "briefings:read": {"resource": "briefings", "action": "read", "description": "Ver briefings"},
    "briefings:write": {"resource": "briefings", "action": "write", "description": "Crear briefings"},

    # Campaña
    "campaign:read": {"resource": "campaign", "action": "read", "description": "Ver datos de campaña"},
    "campaign:write": {"resource": "campaign", "action": "write"},

    # Data Ops
    "data_ops:read": {"resource": "data_ops", "action": "read", "description": "Ver operaciones de datos"},
    "data_ops:run_pipeline": {"resource": "data_ops", "action": "run_pipeline", "description": "Ejecutar pipelines"},

    # Permisos especiales
    "brain:use_tools": {"resource": "brain", "action": "use_tools", "description": "Usar tools de Brain"},
    "risk:read_sensitive": {"resource": "risk", "action": "read_sensitive", "description": "Ver datos de riesgo sensibles"},
    "security:manage_roles": {"resource": "security", "action": "manage_roles", "description": "Gestionar roles de usuario"},
}


# ── Roles de sistema con sus permisos ─────────────────────────────────────────

SYSTEM_ROLES: dict[str, dict[str, Any]] = {
    "super_admin": {
        "nombre": "Super Admin",
        "description": "Acceso total a la plataforma, todos los tenants",
        "is_system": True,
        "permissions": list(SYSTEM_PERMISSIONS.keys()),  # TODOS
    },
    "platform_admin": {
        "nombre": "Platform Admin",
        "description": "Admin de plataforma (sin acceso cross-tenant)",
        "is_system": True,
        "permissions": [
            "electoral:read", "electoral:write", "electoral:simulate",
            "legislative:read", "legislative:write",
            "media:read", "media:write",
            "risk:read", "risk:write",
            "economic:read", "economic:write",
            "brain:use", "brain:admin",
            "export:full", "export:approve",
            "documents:read", "documents:write", "documents:delete",
            "simulation:read", "simulation:run", "simulation:admin",
            "pipeline:read", "pipeline:run", "pipeline:admin",
            "users:read", "users:write", "users:admin",
            "audit:read", "workspace:admin", "opendata:read", "opendata:write",
        ],
    },
    "senior_analyst": {
        "nombre": "Senior Analyst",
        "description": "Analista senior con capacidades completas de análisis y simulación",
        "is_system": True,
        "permissions": [
            "electoral:read", "electoral:write", "electoral:simulate",
            "legislative:read", "legislative:write",
            "media:read", "media:write",
            "risk:read", "risk:write",
            "economic:read", "economic:write",
            "brain:use",
            "export:full",
            "documents:read", "documents:write",
            "simulation:read", "simulation:run",
            "pipeline:read", "pipeline:run",
            "users:read",
            "workspace:read", "workspace:write",
            "opendata:read",
        ],
    },
    "analyst": {
        "nombre": "Analyst",
        "description": "Analista con acceso de lectura y análisis básico",
        "is_system": True,
        "permissions": [
            "electoral:read",
            "legislative:read",
            "media:read",
            "risk:read",
            "economic:read",
            "brain:use",
            "export:basic",
            "documents:read",
            "simulation:read",
            "pipeline:read",
            "workspace:read",
            "opendata:read",
        ],
    },
    "campaign_manager": {
        "nombre": "Campaign Manager",
        "description": "Gestor de campañas electorales",
        "is_system": True,
        "permissions": [
            "electoral:read", "electoral:simulate",
            "media:read",
            "brain:use",
            "export:basic",
            "simulation:read", "simulation:run",
            "workspace:read", "workspace:write",
        ],
    },
    "data_operator": {
        "nombre": "Data Operator",
        "description": "Operador de pipelines y datos",
        "is_system": True,
        "permissions": [
            "electoral:read", "legislative:read", "media:read",
            "risk:read", "economic:read",
            "pipeline:read", "pipeline:run",
            "documents:read", "documents:write",
            "opendata:read", "opendata:write",
            "workspace:read",
        ],
    },
    "client_viewer": {
        "nombre": "Client Viewer",
        "description": "Viewer de cliente — solo lectura de datos propios",
        "is_system": True,
        "permissions": [
            "electoral:read",
            "media:read",
            "export:basic",
            "workspace:read",
        ],
    },
    "security_admin": {
        "nombre": "Security Admin",
        "description": "Administrador de seguridad y auditoría",
        "is_system": True,
        "permissions": [
            "audit:read",
            "security:admin",
            "secrets:read",
            "users:read", "users:write",
            "export:approve",
            "workspace:read",
        ],
    },
    "read_only": {
        "nombre": "Read Only",
        "description": "Solo lectura de módulos públicos",
        "is_system": True,
        "permissions": [
            "electoral:read",
            "legislative:read",
            "opendata:read",
            "workspace:read",
        ],
    },
}


# ── Cache ──────────────────────────────────────────────────────────────────────

_ROLE_PERMISSIONS_CACHE: dict[str, set[str]] = {}

# Inicializar cache de roles del sistema
for _role_id, _role_data in SYSTEM_ROLES.items():
    _ROLE_PERMISSIONS_CACHE[_role_id] = set(_role_data.get("permissions", []))


# ── Funciones públicas ─────────────────────────────────────────────────────────

def has_permission(user: dict[str, Any], permission: str) -> bool:
    """
    Verifica si el usuario tiene un permiso específico.

    Jerarquía:
    1. DEV_MODE → True
    2. is_superadmin → True
    3. RBAC desactivado + usuario activo → True
    4. Verificar permissions_override
    5. Verificar permisos de roles

    Args:
        user: Dict de usuario (de get_current_user).
        permission: ID de permiso (ej: "electoral:read").

    Returns:
        bool
    """
    if settings.dev_mode:
        return True

    if not user.get("activo", False):
        return False

    if user.get("is_superadmin", False):
        return True

    if not settings.feature_rbac:
        return True

    # Verificar permisos directos del usuario
    user_override = set(user.get("permissions_override", []))
    if permission in user_override:
        return True

    # Verificar roles
    user_roles = user.get("roles", [])
    for role_id in user_roles:
        role_perms = _get_role_permissions(role_id)
        if permission in role_perms:
            return True

    return False


def get_user_roles(user: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Devuelve los roles del usuario con sus detalles.
    """
    user_role_ids = user.get("roles", [])
    roles = []
    for role_id in user_role_ids:
        if role_id in SYSTEM_ROLES:
            role_data = SYSTEM_ROLES[role_id].copy()
            role_data["id"] = role_id
            roles.append(role_data)
        else:
            # Rol custom — buscar en DB
            custom = _load_role_from_db(role_id)
            if custom:
                roles.append(custom)
    return roles


def get_effective_permissions(user: dict[str, Any]) -> set[str]:
    """
    Devuelve el conjunto completo de permisos efectivos del usuario.
    """
    if settings.dev_mode or user.get("is_superadmin", False):
        return set(SYSTEM_PERMISSIONS.keys())

    if not settings.feature_rbac:
        return set(SYSTEM_PERMISSIONS.keys())

    perms: set[str] = set()
    for role_id in user.get("roles", []):
        perms.update(_get_role_permissions(role_id))
    perms.update(user.get("permissions_override", []))
    return perms


def list_system_roles() -> list[dict[str, Any]]:
    """Lista todos los roles del sistema."""
    result = []
    for role_id, role_data in SYSTEM_ROLES.items():
        r = role_data.copy()
        r["id"] = role_id
        r["n_permissions"] = len(role_data.get("permissions", []))
        result.append(r)
    return result


def assign_role(user_id: str, role_id: str, tenant_id: str | None = None) -> bool:
    """
    Asigna un rol a un usuario.

    Returns True si éxito.
    """
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            logger.debug("assign_role: sin DB")
            return False
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO user_roles (user_id, role_id, tenant_id) "
            "VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (user_id, role_id, tenant_id),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.debug("assign_role error: %s", exc)
        return False


def revoke_role(user_id: str, role_id: str) -> bool:
    """Revoca un rol de un usuario."""
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return False
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM user_roles WHERE user_id = %s AND role_id = %s",
            (user_id, role_id),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.debug("revoke_role error: %s", exc)
        return False


# ── Helpers privados ───────────────────────────────────────────────────────────

def _get_role_permissions(role_id: str) -> set[str]:
    """Devuelve permisos de un rol (cache)."""
    if role_id in _ROLE_PERMISSIONS_CACHE:
        return _ROLE_PERMISSIONS_CACHE[role_id]
    # Intentar cargar de DB
    role = _load_role_from_db(role_id)
    if role:
        perms = set(role.get("permissions", []))
        _ROLE_PERMISSIONS_CACHE[role_id] = perms
        return perms
    return set()


def _load_role_from_db(role_id: str) -> dict[str, Any] | None:
    try:
        import json
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return None
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, nombre, permissions, description, is_system "
            "FROM roles WHERE id = %s LIMIT 1",
            (role_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cursor.description]
        result = dict(zip(cols, row))
        if isinstance(result.get("permissions"), str):
            result["permissions"] = json.loads(result["permissions"])
        return result
    except Exception as exc:
        logger.debug("_load_role_from_db: %s", exc)
        return None
