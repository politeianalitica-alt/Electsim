"""Login — ElectSim España."""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

# ── Configuración de página ───────────────────────────────────────────────────

st.set_page_config(
    page_title="ElectSim España — Acceso",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ── Redirección si ya está autenticado ────────────────────────────────────────

if st.session_state.get("politeia_user_profile"):
    try:
        st.switch_page("pages/N0_Inicio.py")
    except Exception:
        st.rerun()

# ── CSS global — oculta UI de Streamlit y aplica tema oscuro ─────────────────

st.markdown(
    """<style>
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}
[data-testid="stSidebarNav"] {display: none;}
[data-testid="collapsedControl"] {display: none;}
.stApp { background: #080C14; }
.stTextInput > label { display: none; }
.stButton > button {
    background: linear-gradient(135deg, #00D4FF22, #00D4FF11);
    border: 1px solid #00D4FF55;
    color: #00D4FF;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 0.85rem;
    padding: 0.65rem 1.5rem;
    transition: all 0.2s ease;
}
.stButton > button:hover {
    background: linear-gradient(135deg, #00D4FF44, #00D4FF22);
    border-color: #00D4FF;
    box-shadow: 0 0 20px #00D4FF33;
}
.stTextInput > div > div > input {
    background: #0D1320 !important;
    border: 1px solid #1E293B !important;
    color: #E2E8F0 !important;
    border-radius: 6px;
}
.stTextInput > div > div > input:focus {
    border-color: #00D4FF !important;
    box-shadow: 0 0 0 1px #00D4FF44 !important;
}
.stExpander {
    background: #0D1320;
    border: 1px solid #1E293B;
    border-radius: 6px;
}
div[data-testid="stExpander"] summary {
    color: #94A3B8 !important;
}
</style>""",
    unsafe_allow_html=True,
)

# ── Imports de lógica ─────────────────────────────────────────────────────────

try:
    from security.user_profiles import (
        SESSION_KEY,
        authenticate_user,
        get_role_display_name,
        update_last_login,
        _DEFAULT_PROFILES,
    )
    _PROFILES_AVAILABLE = True
except Exception as _e:
    _PROFILES_AVAILABLE = False
    _IMPORT_ERROR = str(_e)

# ── Layout centrado en columnas ───────────────────────────────────────────────

_, col, _ = st.columns([1, 1.4, 1])

with col:
    # ── Logo y cabecera ──────────────────────────────────────────────────────
    st.markdown(
        f"""
        <div style="text-align:center; padding: 2.5rem 0 1.5rem 0;">
            <div style="
                font-size: 1.75rem;
                font-weight: 700;
                color: #00D4FF;
                letter-spacing: 0.04em;
                font-family: 'SF Mono', 'Fira Code', monospace;
                text-shadow: 0 0 30px #00D4FF55;
                margin-bottom: 0.4rem;
            ">ElectSim España</div>
            <div style="
                font-size: 0.85rem;
                color: #94A3B8;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                margin-bottom: 1.5rem;
            ">Plataforma de Inteligencia Politica</div>
            <div style="
                width: 60px;
                height: 2px;
                background: linear-gradient(90deg, transparent, #00D4FF, transparent);
                margin: 0 auto;
            "></div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Card de login ────────────────────────────────────────────────────────
    st.markdown(
        """
        <div style="
            background: #0D1320;
            border: 1px solid #1E293B;
            border-top: 1px solid #00D4FF26;
            border-radius: 10px;
            padding: 2rem 1.75rem 1.75rem 1.75rem;
            box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(0,212,255,0.04);
        ">
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        '<p style="color:#94A3B8; font-size:0.8rem; letter-spacing:0.1em; '
        'text-transform:uppercase; margin-bottom:0.3rem;">Correo electronico</p>',
        unsafe_allow_html=True,
    )
    email_input = st.text_input(
        "email",
        placeholder="usuario@organizacion.es",
        label_visibility="collapsed",
        key="login_email",
    )

    st.markdown(
        '<p style="color:#94A3B8; font-size:0.8rem; letter-spacing:0.1em; '
        'text-transform:uppercase; margin: 0.75rem 0 0.3rem 0;">Contrasena</p>',
        unsafe_allow_html=True,
    )
    password_input = st.text_input(
        "password",
        type="password",
        placeholder="••••••••",
        label_visibility="collapsed",
        key="login_password",
    )

    st.markdown('<div style="margin-top:1.25rem;"></div>', unsafe_allow_html=True)

    login_clicked = st.button(
        "Iniciar sesion",
        use_container_width=True,
        key="login_button",
    )

    st.markdown("</div>", unsafe_allow_html=True)

    # ── Lógica de autenticación ──────────────────────────────────────────────
    if login_clicked:
        if not email_input or not password_input:
            st.error("Introduce tu correo y contrasena para continuar.")
        elif not _PROFILES_AVAILABLE:
            st.error(f"Error interno del sistema: {_IMPORT_ERROR}")
        else:
            with st.spinner("Verificando credenciales..."):
                profile = authenticate_user(email_input.strip(), password_input)

            if profile is not None:
                st.session_state[SESSION_KEY] = profile
                st.session_state["politeia_tenant_id"] = profile.tenant_id
                update_last_login(profile.id)
                st.success(f"Acceso autorizado. Bienvenido, {profile.full_name}.")
                try:
                    st.switch_page("pages/N0_Inicio.py")
                except Exception:
                    st.rerun()
            else:
                st.error("Credenciales incorrectas. Acceso denegado.")

    # ── Expander con cuentas demo ────────────────────────────────────────────
    st.markdown('<div style="margin-top:1rem;"></div>', unsafe_allow_html=True)

    with st.expander("Modo demostracion — cuentas de acceso"):
        st.markdown(
            '<p style="color:#94A3B8; font-size:0.78rem; margin-bottom:0.75rem;">'
            "Introduce cualquier contrasena en modo desarrollo.</p>",
            unsafe_allow_html=True,
        )
        demo_accounts = [
            ("admin@politeia.es", "Administrador", "#00D4FF"),
            ("analyst@politeia.es", "Analista Senior", "#22D3EE"),
            ("junior@politeia.es", "Analista Junior", "#94A3B8"),
            ("cliente@politeia.es", "Cliente", "#8B5CF6"),
        ]
        for email_demo, role_demo, color in demo_accounts:
            st.markdown(
                f"""
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.4rem 0;
                    border-bottom: 1px solid #1E293B22;
                ">
                    <span style="color:#E2E8F0; font-size:0.82rem; font-family:monospace;">{email_demo}</span>
                    <span style="
                        color:{color};
                        font-size:0.72rem;
                        background:{color}22;
                        border:1px solid {color}44;
                        padding:0.15rem 0.5rem;
                        border-radius:4px;
                        letter-spacing:0.05em;
                    ">{role_demo}</span>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # ── Footer ───────────────────────────────────────────────────────────────
    st.markdown(
        """
        <div style="
            text-align: center;
            margin-top: 2.5rem;
            padding-bottom: 1rem;
            color: #475569;
            font-size: 0.72rem;
            letter-spacing: 0.05em;
        ">
            ElectSim España v3.0 &mdash; Inteligencia Politica Avanzada
        </div>
        """,
        unsafe_allow_html=True,
    )
