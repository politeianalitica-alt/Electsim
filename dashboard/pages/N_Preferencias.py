"""Preferencias de Usuario — ElectSim Espana."""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.shared import sidebar_nav
from services.notifications.user_preferences_service import (
    AlertThreshold,
    BriefingFrequency,
    DashboardLayout,
    get_preferences,
    update_preferences,
)

st.set_page_config(page_title="Preferencias — ElectSim", layout="wide")

sidebar_nav()

# --- Auth check ---
user_profile = st.session_state.get("politeia_user_profile")
if user_profile is None:
    user_id = "demo_user"
    user_name = "Usuario Demo"
    user_role = "Analista"
    user_email = "demo@electsim.es"
else:
    user_id = user_profile.get("id", "demo_user")
    user_name = user_profile.get("name", "Usuario")
    user_role = user_profile.get("role", "Analista")
    user_email = user_profile.get("email", "")

# --- Page header ---
st.title("Preferencias de Usuario")
st.caption("Personaliza tu experiencia en la plataforma")

# --- User info card ---
initials = "".join(w[0].upper() for w in user_name.split()[:2]) if user_name else "U"
st.markdown(
    f'<div style="'
    f"background:#1e1e2e;"
    f"border-radius:8px;"
    f"padding:16px 20px;"
    f"margin-bottom:24px;"
    f"display:flex;"
    f"align-items:center;"
    f"gap:16px;"
    f'">'
    f'<div style="'
    f"background:#4f46e5;"
    f"color:#fff;"
    f"border-radius:50%;"
    f"width:48px;"
    f"height:48px;"
    f"display:flex;"
    f"align-items:center;"
    f"justify-content:center;"
    f"font-size:18px;"
    f"font-weight:700;"
    f'">{initials}</div>'
    f'<div>'
    f'<div style="font-weight:600;font-size:16px;">{user_name}</div>'
    f'<div style="color:#888;font-size:13px;">{user_role}'
    f'{" — " + user_email if user_email else ""}</div>'
    f"</div>"
    f"</div>",
    unsafe_allow_html=True,
)

prefs = get_preferences(user_id)

st.divider()

col1, col2, col3 = st.columns(3)

# ------------------------------------------------------------------ #
# Col 1: Dashboard
# ------------------------------------------------------------------ #
with col1:
    st.subheader("Dashboard")

    layout_options = {
        DashboardLayout.default: "Predeterminado",
        DashboardLayout.compact: "Compacto",
        DashboardLayout.expanded: "Expandido",
        DashboardLayout.minimal: "Minimo",
    }
    layout_keys = list(layout_options.keys())
    layout_labels = list(layout_options.values())
    current_layout_idx = layout_keys.index(prefs.dashboard_layout) if prefs.dashboard_layout in layout_keys else 0

    selected_layout_label = st.selectbox(
        "Diseno del dashboard",
        options=layout_labels,
        index=current_layout_idx,
        key="pref_layout",
    )
    selected_layout = layout_keys[layout_labels.index(selected_layout_label)]

    threshold_options = {
        AlertThreshold.all: "Todas",
        AlertThreshold.medium_and_above: "Media y superior",
        AlertThreshold.high_and_above: "Alta y superior",
        AlertThreshold.critical_only: "Solo criticas",
    }
    threshold_keys = list(threshold_options.keys())
    threshold_labels = list(threshold_options.values())
    current_threshold_idx = threshold_keys.index(prefs.alert_threshold) if prefs.alert_threshold in threshold_keys else 0

    selected_threshold_label = st.selectbox(
        "Umbral de alertas",
        options=threshold_labels,
        index=current_threshold_idx,
        key="pref_threshold",
    )
    selected_threshold = threshold_keys[threshold_labels.index(selected_threshold_label)]

    show_demo = st.checkbox(
        "Mostrar datos de demo",
        value=prefs.show_demo_data,
        key="pref_show_demo",
    )

    if st.button("Guardar configuracion de dashboard", key="save_dashboard"):
        update_preferences(
            user_id,
            {
                "dashboard_layout": selected_layout,
                "alert_threshold": selected_threshold,
                "show_demo_data": show_demo,
            },
        )
        st.success("Preferencias guardadas")

# ------------------------------------------------------------------ #
# Col 2: Seguimiento
# ------------------------------------------------------------------ #
with col2:
    st.subheader("Seguimiento")

    all_parties = [
        "PP", "PSOE", "VOX", "SUMAR", "JUNTS", "PNV", "ERC",
        "Sumar", "Bildu", "CC", "BNG", "UPN", "otros",
    ]
    selected_parties = st.multiselect(
        "Partidos seguidos",
        options=all_parties,
        default=[p for p in prefs.tracked_parties if p in all_parties],
        key="pref_parties",
    )

    all_territories = [
        "Nacional",
        "Madrid",
        "Cataluna",
        "Andalucia",
        "Pais Vasco",
        "Valencia",
        "Galicia",
        "Castilla y Leon",
        "Aragon",
        "Murcia",
    ]
    selected_territories = st.multiselect(
        "Territorios seguidos",
        options=all_territories,
        default=[t for t in prefs.tracked_territories if t in all_territories],
        key="pref_territories",
    )

    freq_options = {
        BriefingFrequency.daily: "Diario",
        BriefingFrequency.twice_daily: "Dos veces al dia",
        BriefingFrequency.weekly: "Semanal",
        BriefingFrequency.never: "Nunca",
    }
    freq_keys = list(freq_options.keys())
    freq_labels = list(freq_options.values())
    current_freq_idx = freq_keys.index(prefs.briefing_frequency) if prefs.briefing_frequency in freq_keys else 0

    selected_freq_label = st.selectbox(
        "Frecuencia de briefings",
        options=freq_labels,
        index=current_freq_idx,
        key="pref_freq",
    )
    selected_freq = freq_keys[freq_labels.index(selected_freq_label)]

    if st.button("Guardar seguimiento", key="save_tracking"):
        update_preferences(
            user_id,
            {
                "tracked_parties": selected_parties,
                "tracked_territories": selected_territories,
                "briefing_frequency": selected_freq,
            },
        )
        st.success("Preferencias guardadas")

# ------------------------------------------------------------------ #
# Col 3: Notificaciones
# ------------------------------------------------------------------ #
with col3:
    st.subheader("Notificaciones")

    notif_email = st.checkbox(
        "Notificaciones por correo electronico",
        value=prefs.notification_email,
        key="pref_email",
    )
    notif_slack = st.checkbox(
        "Notificaciones por Slack",
        value=prefs.notification_slack,
        key="pref_slack",
    )

    slack_channel = prefs.slack_channel
    if notif_slack:
        slack_channel = st.text_input(
            "Canal de Slack (ej: #alertas-politeia)",
            value=prefs.slack_channel,
            key="pref_slack_channel",
        )

    tz_options = [
        "Europe/Madrid",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "America/New_York",
        "America/Los_Angeles",
        "America/Sao_Paulo",
        "Asia/Tokyo",
        "UTC",
    ]
    current_tz_idx = tz_options.index(prefs.timezone) if prefs.timezone in tz_options else 0
    selected_tz = st.selectbox(
        "Zona horaria",
        options=tz_options,
        index=current_tz_idx,
        key="pref_tz",
    )

    if st.button("Guardar notificaciones", key="save_notifications"):
        update_preferences(
            user_id,
            {
                "notification_email": notif_email,
                "notification_slack": notif_slack,
                "slack_channel": slack_channel,
                "timezone": selected_tz,
            },
        )
        st.success("Preferencias guardadas")
