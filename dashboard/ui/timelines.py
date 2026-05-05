"""
Timelines — Bloque 12.

Visualización de líneas de tiempo de eventos legislativos,
de riesgo, de campaña y de documentos.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
    get_severity_color, get_status_color,
)
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)

# ── Tipo de evento ─────────────────────────────────────────────────────────────

_EVENT_TYPE_COLORS = {
    "legal": BLUE,
    "legislative": BLUE,
    "risk": RED,
    "media": AMBER,
    "campaign": PURPLE,
    "document": CYAN,
    "economic": GREEN,
    "geopolitical": RED,
    "electoral": CYAN,
    "default": MUTED,
}

_EVENT_TYPE_ICONS = {
    "legal": "⚖️",
    "legislative": "🏛️",
    "risk": "⚠️",
    "media": "📰",
    "campaign": "📢",
    "document": "📄",
    "economic": "📊",
    "geopolitical": "🌍",
    "electoral": "🗳️",
    "default": "📍",
}


# ── Helper HTML ────────────────────────────────────────────────────────────────

def _event_item_html(event: dict[str, Any]) -> str:
    """Genera el HTML de un único ítem de timeline."""
    date = event.get("date", "")
    title = event.get("title", "Sin título")
    event_type = str(event.get("type", "default")).lower()
    severity = event.get("severity", "")
    description = event.get("description", "")
    source = event.get("source", "")

    color = get_severity_color(severity, _EVENT_TYPE_COLORS.get(event_type, MUTED))
    icon = _EVENT_TYPE_ICONS.get(event_type, "📍")

    sev_html = ""
    if severity:
        from dashboard.ui.badges import severity_badge
        sev_html = severity_badge(severity, inline=True) or ""

    src_html = (
        f"<span style='color:{MUTED};font-size:10px;'>📍 {source}</span>"
        if source else ""
    )

    desc_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:4px 0 0;'>{description[:200]}</p>"
        if description else ""
    )

    return (
        f"<div style='display:flex;gap:12px;margin:6px 0;'>"
        f"  <div style='min-width:90px;color:{MUTED};font-size:11px;padding-top:3px;'>{date}</div>"
        f"  <div style='width:3px;background:{color};border-radius:2px;flex-shrink:0;'></div>"
        f"  <div style='flex:1;background:{BG2};border:1px solid {BORDER};border-radius:6px;padding:10px 12px;'>"
        f"    <div style='display:flex;align-items:center;gap:6px;'>"
        f"      <span>{icon}</span>"
        f"      <span style='color:{TEXT};font-size:13px;font-weight:600;'>{title}</span>"
        f"      {sev_html}"
        f"    </div>"
        f"    {desc_html}"
        f"    <div style='margin-top:4px;'>{src_html}</div>"
        f"  </div>"
        f"</div>"
    )


def _render_timeline(events: list[dict[str, Any]], title: str | None = None, max_items: int = 20) -> None:
    """Renderiza una lista de eventos como timeline vertical."""
    if not events:
        no_data_state("Timeline")
        return

    if title:
        st.markdown(
            f"<p style='color:{CYAN};font-size:13px;font-weight:600;"
            f"text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;'>{title}</p>",
            unsafe_allow_html=True,
        )

    # Ordenar por fecha descendente
    try:
        events = sorted(events, key=lambda e: e.get("date", ""), reverse=True)
    except Exception:
        pass

    items_html = "".join(_event_item_html(e) for e in events[:max_items])
    st.markdown(
        f"<div style='padding:4px 0;'>{items_html}</div>",
        unsafe_allow_html=True,
    )

    if len(events) > max_items:
        st.caption(f"Mostrando {max_items} de {len(events)} eventos.")


# ── Funciones públicas ─────────────────────────────────────────────────────────

def render_event_timeline(
    events: list[dict[str, Any]],
    title: str | None = "Línea de tiempo",
    max_items: int = 20,
) -> None:
    """
    Timeline de eventos genérica.

    Args:
        events: Lista de eventos con {date, title, type, severity?, description?, source?}.
        title: Título de la sección.
        max_items: Número máximo de eventos a mostrar.
    """
    _render_timeline(events, title, max_items)


def render_legislative_timeline(
    events: list[dict[str, Any]],
    title: str = "Actividad Legislativa",
    max_items: int = 15,
) -> None:
    """
    Timeline de eventos legislativos (BOE, Congreso, Senado).

    Cada evento debe tener: date, title, type (legal/legislative),
    source (BOE/Congreso), severity?, description?.
    """
    for e in events:
        if not e.get("type"):
            e["type"] = "legislative"
    _render_timeline(events, title, max_items)


def render_risk_timeline(
    events: list[dict[str, Any]],
    title: str = "Eventos de Riesgo",
    max_items: int = 15,
) -> None:
    """
    Timeline de eventos de riesgo político/reputacional.

    Cada evento: date, title, type=risk, severity, description?, source?.
    """
    for e in events:
        if not e.get("type"):
            e["type"] = "risk"
    _render_timeline(events, title, max_items)


def render_campaign_timeline(
    events: list[dict[str, Any]],
    title: str = "Hoja de Ruta de Campaña",
    max_items: int = 20,
) -> None:
    """
    Timeline de campaña electoral.

    Cada evento: date, title, type=campaign, description?, party?, channel?.
    """
    for e in events:
        if not e.get("type"):
            e["type"] = "campaign"
    _render_timeline(events, title, max_items)


def render_document_timeline(
    events: list[dict[str, Any]],
    title: str = "Documentos Procesados",
    max_items: int = 15,
) -> None:
    """
    Timeline de documentos procesados (ingestados, analizados).

    Cada evento: date, title, type=document, source?, description?.
    """
    for e in events:
        if not e.get("type"):
            e["type"] = "document"
    _render_timeline(events, title, max_items)


def render_plotly_timeline(
    events: list[dict[str, Any]],
    x_col: str = "date",
    y_col: str = "category",
    color_col: str = "type",
    title: str | None = None,
    height: int = 400,
) -> Any | None:
    """
    Timeline usando Plotly (gantt / scatter temporal).

    Args:
        events: Lista de eventos.
        x_col: Campo de fecha.
        y_col: Campo de categoría (eje Y).
        color_col: Campo de color.
        title: Título.
        height: Altura.

    Returns:
        Figura Plotly o None.
    """
    if not events:
        no_data_state()
        return None

    try:
        import plotly.express as px
        import pandas as pd
        df = pd.DataFrame(events)
        if x_col not in df.columns:
            _render_timeline(events, title)
            return None

        fig = px.scatter(
            df, x=x_col, y=y_col if y_col in df.columns else None,
            color=color_col if color_col in df.columns else None,
            hover_data={k: True for k in df.columns if k not in (x_col,)},
            title=title or "Timeline",
            height=height,
        )
        fig.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT2),
            xaxis=dict(gridcolor=BORDER),
            yaxis=dict(gridcolor=BORDER),
        )
        st.plotly_chart(fig, use_container_width=True)
        return fig
    except Exception as exc:
        logger.debug("Error en plotly timeline: %s", exc)
        _render_timeline(events, title)
        return None
