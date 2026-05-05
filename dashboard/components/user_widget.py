"""User widget para sidebar — muestra el usuario activo y permite cerrar sesion."""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def get_current_user():
    """Devuelve el UserProfile activo desde session_state, o None."""
    try:
        import streamlit as st
        from security.user_profiles import SESSION_KEY
        return st.session_state.get(SESSION_KEY)
    except Exception:
        return None


def get_current_tenant_id() -> str:
    """Devuelve el tenant_id activo desde session_state."""
    try:
        import streamlit as st
        return st.session_state.get("politeia_tenant_id", "demo")
    except Exception:
        return "demo"


def has_permission(permission: str) -> bool:
    """Comprueba si el usuario activo tiene un permiso dado."""
    try:
        from security.user_profiles import get_role_permissions, UserRole
        user = get_current_user()
        if user is None:
            return False
        role = user.role if isinstance(user.role, UserRole) else UserRole(user.role)
        return permission in get_role_permissions(role)
    except Exception:
        return False


def require_auth():
    """
    Exige autenticacion. Si el usuario no ha iniciado sesion,
    redirige a la pagina de login y detiene la ejecucion.

    Devuelve el UserProfile si esta autenticado.
    """
    import streamlit as st

    user = get_current_user()
    if user is None:
        try:
            st.switch_page("pages/Login.py")
        except Exception:
            st.stop()
    return user


def render_user_widget() -> None:
    """
    Renderiza el bloque de usuario en el sidebar de Streamlit.

    Muestra: avatar con iniciales, nombre completo, rol, tenant,
    y un boton para cerrar sesion.
    """
    import streamlit as st

    user = get_current_user()
    if user is None:
        return

    try:
        from security.user_profiles import get_role_display_name, UserRole
        role_enum = user.role if isinstance(user.role, UserRole) else UserRole(user.role)
        role_label = get_role_display_name(role_enum)
    except Exception:
        role_label = str(getattr(user, "role", ""))

    initials = getattr(user, "avatar_initials", "??")
    full_name = getattr(user, "full_name", "Usuario")
    tenant_id = getattr(user, "tenant_id", "demo")
    workspace_ids = getattr(user, "workspace_ids", [])
    workspace_label = workspace_ids[0] if workspace_ids else tenant_id

    with st.sidebar:
        # ── Avatar + info principal ──────────────────────────────────────────
        st.markdown(
            f"""
            <div style="
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 0.5rem 0.5rem 0.5rem;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #0D1320;
                    border: 1.5px solid #00D4FF55;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #00D4FF;
                    letter-spacing: 0.05em;
                    flex-shrink: 0;
                    box-shadow: 0 0 12px #00D4FF22;
                    font-family: 'SF Mono', 'Fira Code', monospace;
                ">{initials}</div>
                <div style="min-width:0; flex:1;">
                    <div style="
                        color: #E2E8F0;
                        font-weight: 600;
                        font-size: 0.875rem;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">{full_name}</div>
                    <div style="
                        color: #94A3B8;
                        font-size: 0.75rem;
                        margin-top: 0.1rem;
                    ">{role_label}</div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # ── Tenant / Workspace ───────────────────────────────────────────────
        st.markdown(
            f"""
            <div style="
                padding: 0.25rem 0.5rem 0.5rem 0.5rem;
                display: flex;
                align-items: center;
                gap: 0.4rem;
            ">
                <span style="
                    color: #475569;
                    font-size: 0.7rem;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                ">Espacio de trabajo</span>
                <span style="
                    color: #00D4FF99;
                    font-size: 0.7rem;
                    font-family: monospace;
                    background: #00D4FF11;
                    border: 1px solid #00D4FF22;
                    padding: 0.05rem 0.4rem;
                    border-radius: 4px;
                ">{workspace_label}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # ── Separador ────────────────────────────────────────────────────────
        st.markdown(
            '<hr style="border:none; border-top:1px solid #1E293B; margin: 0.25rem 0.5rem 0.5rem 0.5rem;">',
            unsafe_allow_html=True,
        )

        # ── Boton de cierre de sesion ─────────────────────────────────────────
        if st.button(
            "Cerrar sesion",
            key="logout_button",
            use_container_width=True,
            help="Finalizar sesion activa",
        ):
            _logout()


def _logout() -> None:
    """Limpia el estado de sesion y recarga la aplicacion."""
    import streamlit as st

    keys_to_clear = [
        "politeia_user_profile",
        "politeia_tenant_id",
        "login_email",
        "login_password",
    ]
    for key in keys_to_clear:
        if key in st.session_state:
            del st.session_state[key]

    st.rerun()
