"""
Security Middleware — Bloque 13.

Middleware de seguridad para integración con páginas Streamlit y API FastAPI.
Proporciona decoradores y helpers para enforcement transparente.
"""
from __future__ import annotations

import functools
import logging
from typing import Any, Callable

from security.settings import settings

logger = logging.getLogger(__name__)


def security_context(module_id: str | None = None) -> dict[str, Any]:
    """
    Obtiene el contexto de seguridad completo para la página actual.

    Returns dict con user, tenant, permissions, dev_mode.
    Nunca lanza excepción.
    """
    try:
        from security.sessions import init_session, get_session_user, get_session_tenant
        from security.rbac import get_effective_permissions

        init_session()
        user = get_session_user() or settings.get_dev_user()
        tenant = get_session_tenant()

        permissions = get_effective_permissions(user)

        ctx = {
            "user": user,
            "tenant": tenant,
            "permissions": permissions,
            "dev_mode": settings.dev_mode,
            "auth_required": settings.auth_required,
            "feature_rbac": settings.feature_rbac,
            "feature_audit": settings.feature_audit,
            "module_id": module_id,
        }

        if module_id:
            from security.policies import can_access_module
            ctx["module_accessible"] = can_access_module(user, module_id)
        else:
            ctx["module_accessible"] = True

        return ctx
    except Exception as exc:
        logger.debug("security_context error: %s", exc)
        return {
            "user": settings.get_dev_user(),
            "tenant": settings.get_default_tenant(),
            "permissions": set(),
            "dev_mode": settings.dev_mode,
            "auth_required": False,
            "feature_rbac": False,
            "feature_audit": False,
            "module_accessible": True,
        }


def require_module_access(module_id: str) -> Callable:
    """
    Decorador para funciones de página que requieren acceso a un módulo.

    Uso:
        @require_module_access("electoral")
        def show_electoral_page():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            if settings.dev_mode:
                return func(*args, **kwargs)

            from security.sessions import get_session_user
            from security.policies import can_access_module

            user = get_session_user()
            if user is None:
                try:
                    import streamlit as st
                    st.error("🔐 Debes iniciar sesión")
                except Exception:
                    pass
                return None

            if not can_access_module(user, module_id):
                try:
                    import streamlit as st
                    st.error(f"🚫 Sin acceso al módulo '{module_id}'")
                except Exception:
                    pass
                return None

            return func(*args, **kwargs)
        return wrapper
    return decorator


def log_page_access(module_id: str, user: dict[str, Any] | None = None) -> None:
    """
    Registra el acceso a una página en auditoría.

    Solo registra si audit está activo, no bloquea.
    """
    if not settings.feature_audit:
        return
    try:
        from security.audit import log_audit_event
        if user is None:
            from security.sessions import get_session_user
            user = get_session_user() or {}
        log_audit_event(
            event_type="config_change",
            user_id=user.get("id"),
            tenant_id=user.get("tenant_id"),
            resource_type="page",
            resource_id=module_id,
            action=f"view_{module_id}",
            result="ok",
        )
    except Exception:
        pass


def render_security_badge(dev_mode: bool | None = None) -> None:
    """
    Renderiza un badge de modo de seguridad en el sidebar.

    Útil para mostrar si estamos en DEV o PROD.
    """
    try:
        import streamlit as st
        is_dev = dev_mode if dev_mode is not None else settings.dev_mode

        if is_dev:
            st.sidebar.markdown(
                "<div style='background:#92400e;color:#fef3c7;padding:4px 8px;"
                "border-radius:4px;font-size:10px;text-align:center;'>🔧 DEV MODE</div>",
                unsafe_allow_html=True,
            )
        else:
            st.sidebar.markdown(
                "<div style='background:#065f46;color:#d1fae5;padding:4px 8px;"
                "border-radius:4px;font-size:10px;text-align:center;'>🔒 PROD</div>",
                unsafe_allow_html=True,
            )
    except Exception:
        pass


def get_request_ip() -> str | None:
    """
    Intenta obtener la IP del cliente en Streamlit.

    Streamlit no expone la IP directamente — devuelve None.
    En producción, la IP puede obtenerse del reverse proxy via headers.
    """
    try:
        import streamlit as st
        # Intentar via headers de contexto (Streamlit >= 1.30)
        if hasattr(st, "context") and hasattr(st.context, "headers"):
            headers = st.context.headers
            # X-Forwarded-For del reverse proxy
            return headers.get("X-Forwarded-For") or headers.get("X-Real-IP")
    except Exception:
        pass
    return None
