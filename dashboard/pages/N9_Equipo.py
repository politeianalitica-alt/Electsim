"""Gestion de Equipo — ElectSim Espana."""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)

try:
    from dashboard.components.premium_cards import (
        team_member_row,
        kpi_metric,
        page_header,
        section_divider,
        empty_state,
    )
    _CARDS_OK = True
except Exception:
    _CARDS_OK = False

try:
    from security.team_management import (
        list_team_members,
        get_workspace_activity_summary,
        get_team,
    )
    _TEAM_OK = True
except Exception:
    _TEAM_OK = False

st.set_page_config(
    page_title="Gestion de Equipo — ElectSim",
    layout="wide",
    initial_sidebar_state="expanded",
)

sidebar_nav()

# ── Cabecera ───────────────────────────────────────────────────────────────────

if _CARDS_OK:
    st.markdown(
        page_header(
            title="Gestion de Equipo",
            subtitle="Miembros del workspace, roles y actividad reciente.",
            tag="ElectSim · Workspace",
        ),
        unsafe_allow_html=True,
    )
else:
    st.title("Gestion de Equipo")

# ── Selector de workspace ──────────────────────────────────────────────────────

WORKSPACES = {
    "Espana 2026": ("ws_espana_2026", "demo"),
}

workspace_name = st.selectbox(
    "Workspace activo",
    options=list(WORKSPACES.keys()),
    index=0,
)
workspace_id, tenant_id = WORKSPACES[workspace_name]

# ── Carga de datos ─────────────────────────────────────────────────────────────

if not _TEAM_OK:
    st.error("El modulo de gestion de equipo no esta disponible.")
    st.stop()

members = list_team_members(workspace_id, tenant_id)
summary = get_workspace_activity_summary(workspace_id, tenant_id)

# ── KPIs ───────────────────────────────────────────────────────────────────────

if _CARDS_OK:
    st.markdown(section_divider("Resumen del equipo"), unsafe_allow_html=True)

col1, col2, col3 = st.columns(3)

role_bd = summary.get("role_breakdown", {})
owners_admins = role_bd.get("owner", 0) + role_bd.get("admin", 0)

with col1:
    if _CARDS_OK:
        st.markdown(
            kpi_metric(
                label="Total miembros",
                value=str(summary.get("total_members", 0)),
                subtitle="Activos en el workspace",
            ),
            unsafe_allow_html=True,
        )
    else:
        st.metric("Total miembros", summary.get("total_members", 0))

with col2:
    if _CARDS_OK:
        st.markdown(
            kpi_metric(
                label="Activos (7 dias)",
                value=str(summary.get("active_last_7_days", 0)),
                subtitle="Actividad reciente",
            ),
            unsafe_allow_html=True,
        )
    else:
        st.metric("Activos (7 dias)", summary.get("active_last_7_days", 0))

with col3:
    role_str = ", ".join(f"{r}: {n}" for r, n in role_bd.items()) if role_bd else "—"
    if _CARDS_OK:
        st.markdown(
            kpi_metric(
                label="Roles",
                value=str(len(role_bd)),
                subtitle=role_str,
            ),
            unsafe_allow_html=True,
        )
    else:
        st.metric("Roles distintos", len(role_bd))

# ── Tabla de miembros ──────────────────────────────────────────────────────────

if _CARDS_OK:
    st.markdown(section_divider("Miembros del equipo"), unsafe_allow_html=True)
else:
    st.subheader("Miembros del equipo")

if not members:
    if _CARDS_OK:
        st.markdown(
            empty_state(
                title="Sin miembros en este workspace",
                message="Agrega miembros desde la configuracion del workspace o contacta con el administrador.",
                icon_char="[vacio]",
            ),
            unsafe_allow_html=True,
        )
    else:
        st.info("No hay miembros en este workspace.")
else:
    sort_col = st.selectbox(
        "Ordenar por",
        ["Nombre", "Rol", "Ultimo acceso"],
        index=0,
        key="equipo_sort",
    )

    def _sort_key(m):
        if sort_col == "Nombre":
            return m.user_name.lower()
        elif sort_col == "Rol":
            role_order = {"owner": 0, "admin": 1, "editor": 2, "viewer": 3}
            role_str = m.team_role if isinstance(m.team_role, str) else m.team_role.value
            return role_order.get(role_str, 9)
        else:
            return str(m.last_active or "")

    sorted_members = sorted(members, key=_sort_key)

    for m in sorted_members:
        role_str = m.team_role if isinstance(m.team_role, str) else m.team_role.value
        last_active_str = (
            m.last_active.strftime("%d/%m/%Y %H:%M")
            if m.last_active is not None
            else "Sin actividad"
        )
        if _CARDS_OK:
            st.markdown(
                team_member_row(
                    name=m.user_name,
                    email=m.user_email,
                    role=role_str,
                    last_active=last_active_str,
                    is_active=m.is_active,
                ),
                unsafe_allow_html=True,
            )
        else:
            cols = st.columns([3, 3, 2, 2])
            cols[0].write(m.user_name)
            cols[1].write(m.user_email)
            cols[2].write(role_str)
            cols[3].write(last_active_str)

# ── Resumen de actividad ───────────────────────────────────────────────────────

if _CARDS_OK:
    st.markdown(section_divider("Actividad del workspace"), unsafe_allow_html=True)
else:
    st.subheader("Actividad del workspace")

last_activity = summary.get("last_activity", "Sin datos")

st.markdown(
    f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {CYAN};'
    f'border-radius:8px;padding:.9rem 1.2rem;margin-bottom:.5rem">'
    f'<div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.1em;'
    f'text-transform:uppercase;margin-bottom:.3rem">Ultima actividad registrada</div>'
    f'<div style="font-size:1rem;font-weight:600;color:{TEXT}">{last_activity}</div>'
    f'<div style="font-size:.72rem;color:{TEXT2};margin-top:.4rem">'
    f'Miembros activos los ultimos 7 dias: '
    f'<strong style="color:{CYAN}">{summary.get("active_last_7_days", 0)}</strong>'
    f' de <strong style="color:{TEXT}">{summary.get("total_members", 0)}</strong> totales.'
    f'</div>'
    f'</div>',
    unsafe_allow_html=True,
)

# ── Footer informativo ─────────────────────────────────────────────────────────

st.markdown(
    f'<div style="margin-top:2rem;padding-top:1rem;border-top:1px solid {BORDER};'
    f'font-size:.62rem;color:{MUTED};text-align:center;letter-spacing:.06em">'
    f'Gestion de equipo — Vista de solo lectura. Contacta con el administrador para modificar roles.'
    f'</div>',
    unsafe_allow_html=True,
)
