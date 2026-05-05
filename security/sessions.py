"""
Session management — Bloque 13.

Gestión de sesiones de usuario en Streamlit.
Almacena estado de autenticación en st.session_state.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from security.settings import settings

logger = logging.getLogger(__name__)

_SESSION_KEY_USER = "_electsim_user"
_SESSION_KEY_TOKEN = "_electsim_token"
_SESSION_KEY_LOGIN_TIME = "_electsim_login_time"
_SESSION_KEY_TENANT = "_electsim_tenant"


def init_session() -> None:
    """
    Inicializa la sesión de seguridad en Streamlit.

    En DEV_MODE, carga el usuario dev automáticamente.
    Debe llamarse al inicio de cada página.
    """
    try:
        import streamlit as st
        if not hasattr(st, "session_state"):
            return

        if _SESSION_KEY_USER not in st.session_state:
            if settings.dev_mode:
                user = settings.get_dev_user()
                tenant = settings.get_default_tenant()
                st.session_state[_SESSION_KEY_USER] = user
                st.session_state[_SESSION_KEY_TENANT] = tenant
                st.session_state[_SESSION_KEY_LOGIN_TIME] = datetime.now(timezone.utc).isoformat()
            else:
                st.session_state[_SESSION_KEY_USER] = None
    except Exception as exc:
        logger.debug("init_session error: %s", exc)


def get_session_user() -> dict[str, Any] | None:
    """
    Obtiene el usuario de la sesión actual.

    Returns None si no hay sesión autenticada (en producción).
    En DEV_MODE, devuelve el usuario dev.
    """
    if settings.dev_mode:
        return settings.get_dev_user()

    try:
        import streamlit as st
        if hasattr(st, "session_state"):
            return st.session_state.get(_SESSION_KEY_USER)
    except Exception:
        pass
    return None


def set_session_user(user: dict[str, Any], token: str | None = None) -> None:
    """Establece el usuario en la sesión."""
    try:
        import streamlit as st
        if hasattr(st, "session_state"):
            st.session_state[_SESSION_KEY_USER] = user
            if token:
                st.session_state[_SESSION_KEY_TOKEN] = token
            st.session_state[_SESSION_KEY_LOGIN_TIME] = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        logger.debug("set_session_user error: %s", exc)


def clear_session() -> None:
    """Limpia la sesión (logout)."""
    try:
        import streamlit as st
        if hasattr(st, "session_state"):
            for key in [_SESSION_KEY_USER, _SESSION_KEY_TOKEN,
                        _SESSION_KEY_LOGIN_TIME, _SESSION_KEY_TENANT]:
                st.session_state.pop(key, None)
    except Exception as exc:
        logger.debug("clear_session error: %s", exc)


def is_session_valid() -> bool:
    """
    Verifica si la sesión actual es válida y no ha expirado.
    """
    if settings.dev_mode:
        return True

    user = get_session_user()
    if not user or not user.get("activo", False):
        return False

    # Verificar TTL
    try:
        import streamlit as st
        if hasattr(st, "session_state"):
            login_time_str = st.session_state.get(_SESSION_KEY_LOGIN_TIME)
            if login_time_str:
                login_time = datetime.fromisoformat(login_time_str)
                ttl = timedelta(minutes=settings.session_ttl_minutes)
                if datetime.now(timezone.utc) - login_time > ttl:
                    logger.info("Sesión expirada para usuario %s", user.get("id"))
                    clear_session()
                    return False
    except Exception:
        pass

    return True


def get_session_tenant() -> dict[str, Any]:
    """Obtiene el tenant de la sesión actual."""
    if settings.dev_mode:
        return settings.get_default_tenant()

    try:
        import streamlit as st
        if hasattr(st, "session_state"):
            tenant = st.session_state.get(_SESSION_KEY_TENANT)
            if tenant:
                return tenant
    except Exception:
        pass

    return settings.get_default_tenant()


def require_login() -> dict[str, Any] | None:
    """
    Requiere que el usuario esté logueado.

    En DEV_MODE, devuelve el usuario dev.
    En producción, si no hay sesión válida, muestra el formulario de login y retorna None.

    Usage en página:
        user = require_login()
        if user is None:
            return  # Streamlit mostrará el login form
    """
    if settings.dev_mode:
        return settings.get_dev_user()

    init_session()

    if is_session_valid():
        return get_session_user()

    # Mostrar formulario de login
    try:
        import streamlit as st
        st.warning("🔐 Debes iniciar sesión para acceder a esta página.")
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Contraseña", type="password")
            submit = st.form_submit_button("Iniciar sesión")
            if submit:
                from security.auth import login_with_password
                user = login_with_password(email, password)
                if user:
                    token = user.pop("auth_token", None)
                    set_session_user(user, token)
                    st.success("✅ Sesión iniciada correctamente")
                    st.rerun()
                else:
                    st.error("❌ Email o contraseña incorrectos")
    except Exception as exc:
        logger.debug("require_login error: %s", exc)

    return None
