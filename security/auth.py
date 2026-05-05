"""
Authentication — Bloque 13.

Funciones de autenticación para ElectSim.
En DEV_MODE, devuelve el usuario dev sin verificación.
En producción, requiere JWT válido.

Diseñado para Streamlit: no usa FastAPI Depends().
"""
from __future__ import annotations

import logging
from typing import Any

from security.settings import settings
from security.jwt import decode_token

logger = logging.getLogger(__name__)

# Cache en memoria de sesión (Streamlit singleton por defecto)
_SESSION_USERS: dict[str, dict[str, Any]] = {}


def get_current_user(token: str | None = None) -> dict[str, Any]:
    """
    Obtiene el usuario actual.

    En DEV_MODE: devuelve el usuario dev configurado en settings.
    En PROD: verifica el JWT y busca el usuario en DB.

    Args:
        token: JWT Bearer token (opcional en dev mode).

    Returns:
        Dict con datos del usuario (nunca lanza excepción).
    """
    if settings.dev_mode:
        return settings.get_dev_user()

    if token:
        payload = decode_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id and user_id in _SESSION_USERS:
                return _SESSION_USERS[user_id]
            # Construir usuario mínimo desde JWT
            return {
                "id": user_id or "unknown",
                "email": payload.get("email", ""),
                "nombre": payload.get("nombre", ""),
                "tenant_id": payload.get("tenant_id"),
                "roles": payload.get("roles", []),
                "is_superadmin": payload.get("is_superadmin", False),
                "activo": True,
            }

    if settings.auth_required:
        logger.warning("Auth requerida pero no hay token — usuario anónimo")

    return {
        "id": "anonymous",
        "email": "",
        "nombre": "Anónimo",
        "tenant_id": settings.default_tenant_id,
        "roles": [],
        "is_superadmin": False,
        "activo": False,
    }


def get_current_user_from_streamlit() -> dict[str, Any]:
    """
    Obtiene el usuario actual desde el estado de sesión de Streamlit.

    Busca en st.session_state["auth_token"] y st.session_state["current_user"].
    """
    try:
        import streamlit as st
        # Verificar usuario ya cargado en sesión
        if hasattr(st, "session_state") and "current_user" in st.session_state:
            user = st.session_state["current_user"]
            if isinstance(user, dict) and user.get("activo") is not False:
                return user
        # Intentar desde token
        token = None
        if hasattr(st, "session_state"):
            token = st.session_state.get("auth_token")
        return get_current_user(token)
    except Exception:
        return get_current_user()


def require_permission(user: dict[str, Any], permission: str) -> bool:
    """
    Verifica si el usuario tiene un permiso específico.

    En DEV_MODE: siempre True.
    En PROD con RBAC desactivado: True si el usuario está activo.
    En PROD con RBAC: verifica roles y permisos.

    Returns:
        True si tiene permiso, False si no.
    """
    if settings.dev_mode:
        return True

    if not user.get("activo", False):
        return False

    if user.get("is_superadmin", False):
        return True

    if not settings.feature_rbac:
        # Sin RBAC: cualquier usuario activo puede todo
        return True

    # Con RBAC activo: verificar
    from security.rbac import has_permission
    return has_permission(user, permission)


def require_role(user: dict[str, Any], role: str) -> bool:
    """
    Verifica si el usuario tiene un rol específico.

    Returns:
        True si tiene el rol, False si no.
    """
    if settings.dev_mode:
        return True
    if user.get("is_superadmin", False):
        return True
    return role in user.get("roles", [])


def login_with_password(email: str, password: str) -> dict[str, Any] | None:
    """
    Autentica con email/password.

    Returns el usuario con token si éxito, None si fallo.
    Registra el evento de auditoría.
    """
    from security.audit import log_audit_event
    try:
        user = _find_user_by_email(email)
        if not user:
            log_audit_event(
                event_type="login_failed",
                action="login",
                result="denied",
                details={"email": email, "reason": "user_not_found"},
            )
            return None

        from security.password import verify_password
        stored_hash = user.pop("password_hash", None)
        if not stored_hash or not verify_password(password, stored_hash):
            log_audit_event(
                event_type="login_failed",
                user_id=user.get("id"),
                action="login",
                result="denied",
                details={"email": email, "reason": "invalid_password"},
            )
            return None

        # Generar token
        from security.jwt import create_access_token
        token = create_access_token(
            user_id=user["id"],
            tenant_id=user.get("tenant_id"),
            roles=user.get("roles", []),
        )
        user["auth_token"] = token

        log_audit_event(
            event_type="login",
            user_id=user.get("id"),
            tenant_id=user.get("tenant_id"),
            action="login",
            result="ok",
        )
        return user

    except Exception as exc:
        logger.error("Error en login: %s", exc)
        return None


def _find_user_by_email(email: str) -> dict[str, Any] | None:
    """Busca un usuario por email en DB. Fallback a None."""
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return None
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, nombre, tenant_id, is_superadmin, activo, password_hash "
            "FROM users WHERE email = %s AND activo = true LIMIT 1",
            (email,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cursor.description]
        return dict(zip(cols, row))
    except Exception as exc:
        logger.debug("_find_user_by_email error: %s", exc)
        return None
