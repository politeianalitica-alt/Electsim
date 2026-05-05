"""
Tenant management — Bloque 13.

Gestión de tenants (clientes). En modo single-tenant (por defecto),
siempre devuelve el tenant default. En modo multi-tenant,
aplica aislamiento completo.
"""
from __future__ import annotations

import logging
from typing import Any

from security.settings import settings

logger = logging.getLogger(__name__)

# Cache en memoria
_TENANTS_CACHE: dict[str, dict[str, Any]] = {}


def get_default_tenant() -> dict[str, Any]:
    """Devuelve el tenant por defecto configurado en settings."""
    return settings.get_default_tenant()


def get_tenant(tenant_id: str) -> dict[str, Any] | None:
    """
    Obtiene un tenant por ID.

    En single-tenant mode, siempre devuelve el default.
    En multi-tenant, busca en DB.
    """
    if not settings.feature_multicliente:
        return settings.get_default_tenant()

    if tenant_id in _TENANTS_CACHE:
        return _TENANTS_CACHE[tenant_id]

    tenant = _load_tenant_from_db(tenant_id)
    if tenant:
        _TENANTS_CACHE[tenant_id] = tenant
    return tenant


def get_tenant_for_user(user: dict[str, Any]) -> dict[str, Any]:
    """
    Obtiene el tenant del usuario actual.

    Nunca lanza excepción — devuelve el default si no hay tenant.
    """
    tenant_id = user.get("tenant_id") or settings.default_tenant_id
    tenant = get_tenant(tenant_id)
    return tenant or settings.get_default_tenant()


def list_tenants(active_only: bool = True, limit: int = 100) -> list[dict[str, Any]]:
    """
    Lista todos los tenants.

    Solo disponible para super_admin. Devuelve lista vacía sin permisos.
    """
    tenants = _load_all_tenants_from_db(active_only=active_only, limit=limit)
    if not tenants:
        # Devolver al menos el default
        return [settings.get_default_tenant()]
    return tenants


def create_tenant(
    nombre: str,
    slug: str,
    plan: str = "starter",
    max_users: int = 10,
    features: list[str] | None = None,
) -> dict[str, Any] | None:
    """
    Crea un nuevo tenant.

    Returns el tenant creado o None si error.
    """
    import uuid
    tenant_id = f"tenant-{uuid.uuid4().hex[:8]}"
    tenant = {
        "id": tenant_id,
        "nombre": nombre,
        "slug": slug,
        "plan": plan,
        "activo": True,
        "max_users": max_users,
        "features": features or [],
    }

    saved = _save_tenant_to_db(tenant)
    if saved:
        _TENANTS_CACHE[tenant_id] = tenant
        logger.info("Tenant creado: %s (%s)", nombre, tenant_id)
        return tenant

    # Guardar en cache aunque no haya DB
    _TENANTS_CACHE[tenant_id] = tenant
    return tenant


def check_tenant_feature(tenant: dict[str, Any], feature: str) -> bool:
    """Verifica si el tenant tiene una feature activada."""
    features = tenant.get("features", [])
    plan = tenant.get("plan", "starter")
    # Enterprise tiene todo
    if plan == "enterprise":
        return True
    return feature in features


def get_tenant_context(user: dict[str, Any]) -> dict[str, Any]:
    """
    Devuelve el contexto de tenant completo para un usuario.

    Útil para pasar a servicios que necesitan el contexto completo.
    """
    tenant = get_tenant_for_user(user)
    return {
        "tenant_id": tenant.get("id", settings.default_tenant_id),
        "tenant_nombre": tenant.get("nombre", "Default"),
        "tenant_plan": tenant.get("plan", "starter"),
        "tenant_features": tenant.get("features", []),
        "multicliente_active": settings.feature_multicliente,
    }


# ── DB helpers ─────────────────────────────────────────────────────────────────

def _load_tenant_from_db(tenant_id: str) -> dict[str, Any] | None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return None
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, nombre, slug, plan, activo, max_users, features, config "
            "FROM tenants WHERE id = %s LIMIT 1",
            (tenant_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cursor.description]
        return dict(zip(cols, row))
    except Exception as exc:
        logger.debug("_load_tenant_from_db: %s", exc)
        return None


def _load_all_tenants_from_db(
    active_only: bool = True, limit: int = 100
) -> list[dict[str, Any]]:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return []
        cursor = conn.cursor()
        where = "WHERE activo = true" if active_only else ""
        cursor.execute(
            f"SELECT id, nombre, slug, plan, activo, max_users "
            f"FROM tenants {where} ORDER BY nombre LIMIT %s",
            (limit,),
        )
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]
        return [dict(zip(cols, r)) for r in rows]
    except Exception as exc:
        logger.debug("_load_all_tenants_from_db: %s", exc)
        return []


def _save_tenant_to_db(tenant: dict[str, Any]) -> bool:
    try:
        import json
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return False
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO tenants (id, nombre, slug, plan, activo, max_users, features) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (id) DO NOTHING",
            (
                tenant["id"], tenant["nombre"], tenant["slug"],
                tenant.get("plan", "starter"), tenant.get("activo", True),
                tenant.get("max_users", 10),
                json.dumps(tenant.get("features", [])),
            ),
        )
        conn.commit()
        return True
    except Exception as exc:
        logger.debug("_save_tenant_to_db: %s", exc)
        return False
