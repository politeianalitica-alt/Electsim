"""Alertas Inteligentes — ElectSim Espana."""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN,
    BLUE, AMBER, RED, GREEN, TEXT, TEXT2, MUTED,
    sidebar_nav, section_header,
)
from services.intelligence.alert_engine import (
    AlertCategory,
    AlertLevel,
    get_alerts,
    get_alert_summary,
    mark_read,
    mark_all_read,
)

st.set_page_config(page_title="Alertas — ElectSim", layout="wide")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_LEVEL_COLORS: dict[str, str] = {
    AlertLevel.critical.value: RED,
    AlertLevel.high.value: AMBER,
    AlertLevel.medium.value: BLUE,
    AlertLevel.low.value: GREEN,
    AlertLevel.info.value: MUTED,
}

_LEVEL_LABELS: dict[str, str] = {
    AlertLevel.critical.value: "Critica",
    AlertLevel.high.value: "Alta",
    AlertLevel.medium.value: "Media",
    AlertLevel.low.value: "Baja",
    AlertLevel.info.value: "Informativa",
}

_CATEGORY_LABELS: dict[str, str] = {
    AlertCategory.electoral.value: "Electoral",
    AlertCategory.legislative.value: "Legislativo",
    AlertCategory.media.value: "Medios",
    AlertCategory.risk.value: "Riesgo",
    AlertCategory.economic.value: "Economico",
    AlertCategory.geopolitical.value: "Geopolitico",
    AlertCategory.operational.value: "Operacional",
    AlertCategory.intelligence.value: "Inteligencia",
}


def _time_ago(dt: datetime) -> str:
    """Devuelve una cadena legible de tiempo transcurrido."""
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    total_seconds = int(delta.total_seconds())
    if total_seconds < 60:
        return "hace un momento"
    minutes = total_seconds // 60
    if minutes < 60:
        return f"hace {minutes}min"
    hours = minutes // 60
    if hours < 24:
        return f"hace {hours}h"
    days = hours // 24
    return f"hace {days}d"


def _render_alert_card(alert: object) -> None:
    """Renderiza una tarjeta de alerta premium con acciones inline."""
    level_color = _LEVEL_COLORS.get(alert.level.value, MUTED)
    level_label = _LEVEL_LABELS.get(alert.level.value, alert.level.value)
    category_label = _CATEGORY_LABELS.get(alert.category.value, alert.category.value)
    time_str = _time_ago(alert.created_at)
    is_unread = alert.read_at is None

    # Borde izquierdo adicional para alertas no leidas
    unread_glow = f"box-shadow: inset 3px 0 0 {CYAN};" if is_unread else ""

    action_badge_html = ""
    if alert.action_required:
        action_badge_html = (
            f'<span style="background:#EF444420;color:{RED};padding:.15rem .5rem;'
            f'border-radius:4px;font-size:.65rem;font-weight:700;text-transform:uppercase;'
            f'letter-spacing:.08em;margin-left:.5rem">Accion requerida</span>'
        )

    action_row_html = ""
    if alert.action_required and alert.action_text:
        action_row_html = (
            f'<div style="margin-top:.5rem;padding:.4rem .6rem;background:#EF444410;'
            f'border-left:2px solid {RED};border-radius:4px;'
            f'color:{TEXT2};font-size:.8rem;line-height:1.4">'
            f'Accion: {alert.action_text}</div>'
        )

    related_html = ""
    if alert.related_entity:
        related_html = (
            f'<span style="background:{BG3};color:{TEXT2};padding:.12rem .4rem;'
            f'border-radius:4px;font-size:.62rem;margin-left:.4rem">'
            f'{alert.related_entity}</span>'
        )

    card_html = f"""
    <div style="background:{BG2};border-left:4px solid {level_color};border-radius:8px;
                padding:1rem 1.2rem;margin:.5rem 0;border:1px solid {BORDER};
                border-left-width:4px;{unread_glow}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:.3rem">
          <span style="background:{level_color}20;color:{level_color};padding:.15rem .5rem;
                       border-radius:4px;font-size:.65rem;font-weight:700;
                       text-transform:uppercase;letter-spacing:.08em">{level_label}</span>
          <span style="background:{BG3};color:{TEXT2};padding:.15rem .5rem;
                       border-radius:4px;font-size:.65rem">{category_label}</span>
          {action_badge_html}
          {related_html}
        </div>
        <div style="color:{MUTED};font-size:.72rem;white-space:nowrap;margin-left:.5rem">{time_str}</div>
      </div>
      <div style="color:{TEXT};font-weight:600;margin:.5rem 0 .25rem;font-size:.95rem">{alert.title}</div>
      <div style="color:{TEXT2};font-size:.85rem;line-height:1.5">{alert.body}</div>
      {action_row_html}
      <div style="color:{MUTED};font-size:.72rem;margin-top:.5rem">Fuente: {alert.source}</div>
    </div>
    """
    st.markdown(card_html, unsafe_allow_html=True)

    # Boton de marcar como leida
    if is_unread:
        col_btn, _ = st.columns([1, 9])
        with col_btn:
            if st.button(
                "Leida",
                key=f"read_{alert.id}",
                help="Marcar esta alerta como leida",
            ):
                mark_read(tenant_id, alert.id)
                st.rerun()


# ---------------------------------------------------------------------------
# Main page
# ---------------------------------------------------------------------------

sidebar_nav()

tenant_id: str = st.session_state.get("politeia_tenant_id", "demo")

# Cabecera
section_header(
    "Centro de Alertas",
    "Senales de inteligencia priorizadas por impacto operativo",
)

# ---------------------------------------------------------------------------
# Barra de resumen (4 tarjetas KPI)
# ---------------------------------------------------------------------------
summary = get_alert_summary(tenant_id)
unread_count: int = summary["unread"]
total_count: int = summary["total"]
critical_count: int = summary["by_level"].get(AlertLevel.critical.value, 0)
action_count: int = sum(
    1 for a in get_alerts(tenant_id) if a.action_required and a.read_at is None
)

kpi_cols = st.columns(4)

def _kpi(col: object, label: str, value: int | str, color: str = TEXT) -> None:
    col.markdown(
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
        f'padding:.9rem 1.1rem;text-align:center">'
        f'<div style="color:{MUTED};font-size:.72rem;text-transform:uppercase;'
        f'letter-spacing:.07em;margin-bottom:.3rem">{label}</div>'
        f'<div style="color:{color};font-size:1.8rem;font-weight:700;line-height:1">{value}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

with kpi_cols[0]:
    _kpi(kpi_cols[0], "Total alertas", total_count)
with kpi_cols[1]:
    _kpi(kpi_cols[1], "Sin leer", unread_count, AMBER if unread_count > 0 else TEXT)
with kpi_cols[2]:
    _kpi(kpi_cols[2], "Criticas", critical_count, RED if critical_count > 0 else TEXT)
with kpi_cols[3]:
    _kpi(kpi_cols[3], "Requieren accion", action_count, AMBER if action_count > 0 else TEXT)

st.markdown("<div style='margin:.5rem 0'></div>", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Barra de filtros
# ---------------------------------------------------------------------------
filter_cols = st.columns([2, 2, 2, 2])

_LEVEL_OPTIONS = {
    "Todos": None,
    "Criticas": AlertLevel.critical,
    "Altas": AlertLevel.high,
    "Medias": AlertLevel.medium,
    "Bajas": AlertLevel.low,
    "Informativas": AlertLevel.info,
}

_CATEGORY_OPTIONS = {
    "Todas": None,
    "Electoral": AlertCategory.electoral,
    "Legislativo": AlertCategory.legislative,
    "Medios": AlertCategory.media,
    "Riesgo": AlertCategory.risk,
    "Economico": AlertCategory.economic,
    "Geopolitico": AlertCategory.geopolitical,
}

with filter_cols[0]:
    selected_level_label = st.selectbox(
        "Nivel",
        options=list(_LEVEL_OPTIONS.keys()),
        index=0,
        key="alert_level_filter",
    )
    selected_level = _LEVEL_OPTIONS[selected_level_label]

with filter_cols[1]:
    selected_cat_label = st.selectbox(
        "Categoria",
        options=list(_CATEGORY_OPTIONS.keys()),
        index=0,
        key="alert_cat_filter",
    )
    selected_category = _CATEGORY_OPTIONS[selected_cat_label]

with filter_cols[2]:
    unread_only = st.checkbox("Solo sin leer", value=False, key="alert_unread_filter")

with filter_cols[3]:
    st.markdown("<div style='margin-top:1.65rem'></div>", unsafe_allow_html=True)
    if st.button("Marcar todas como leidas", key="mark_all_read_btn"):
        n = mark_all_read(tenant_id)
        st.toast(f"{n} alertas marcadas como leidas")
        st.rerun()

st.markdown("<div style='margin:.25rem 0'></div>", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Lista de alertas
# ---------------------------------------------------------------------------
filtered_alerts = get_alerts(
    tenant_id=tenant_id,
    level=selected_level,
    category=selected_category,
    unread_only=unread_only,
    limit=50,
)

if not filtered_alerts:
    st.markdown(
        f'<div style="text-align:center;padding:3rem;color:{MUTED};font-size:.95rem">'
        f'Sin alertas que coincidan con los filtros</div>',
        unsafe_allow_html=True,
    )
else:
    for alert in filtered_alerts:
        _render_alert_card(alert)

# ---------------------------------------------------------------------------
# Aviso de actualizacion automatica
# ---------------------------------------------------------------------------
now_str = datetime.now().strftime("%H:%M:%S")
st.markdown(
    f'<div style="color:{MUTED};font-size:.72rem;text-align:center;margin-top:1.5rem;'
    f'padding-top:.75rem;border-top:1px solid {BORDER}">'
    f'Los datos se actualizan automaticamente. Ultima actualizacion: {now_str}</div>',
    unsafe_allow_html=True,
)
