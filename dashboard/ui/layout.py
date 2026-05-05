"""
Layout — Bloque 12.

Sistema de layout para páginas ElectSim.
Usa dashboard/shared.py internamente; no rompe páginas existentes.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any

import streamlit as st

from dashboard.ui.tokens import BG, BG2, BORDER, CYAN, TEXT, TEXT2, MUTED


# ── page_shell ─────────────────────────────────────────────────────────────────

def page_shell(
    title: str,
    subtitle: str | None = None,
    module_id: str | None = None,
    show_alerts: bool = True,
    show_sidebar_ai: bool = True,
) -> None:
    """
    Cabecera estándar de página con estilos, alertas y sidebar AI.

    Args:
        title: Título de la página.
        subtitle: Subtítulo.
        module_id: ID de módulo para filtrar alertas.
        show_alerts: Si True, muestra alertas del módulo.
        show_sidebar_ai: Si True, muestra el chatbot lateral.
    """
    try:
        from dashboard.shared import aplicar_estilos
        aplicar_estilos()
    except Exception:
        pass

    module_header(title, subtitle, module_id=module_id)

    if show_alerts and module_id:
        try:
            from dashboard.shared import mostrar_alertas_pagina
            mostrar_alertas_pagina(module_id)
        except Exception:
            pass

    if show_sidebar_ai:
        try:
            from dashboard.shared import render_ai_chat_sidebar
            render_ai_chat_sidebar()
        except Exception:
            pass


# ── module_header ──────────────────────────────────────────────────────────────

def module_header(
    title: str,
    subtitle: str | None = None,
    module_id: str | None = None,
    status: str | None = None,
    accent: str | None = None,
) -> None:
    """
    Cabecera de módulo con título, subtítulo y estado.

    Args:
        title: Título del módulo.
        subtitle: Descripción breve.
        module_id: Identificador del módulo.
        status: Estado (live/demo/error).
        accent: Color de acento (default: CYAN).
    """
    from dashboard.ui.badges import status_badge, demo_badge
    _accent = accent or CYAN

    status_html = ""
    if status:
        badge_fn = demo_badge if status == "demo" else lambda **kw: status_badge(status, **kw)
        status_html = badge_fn(inline=True) or ""

    mod_html = (
        f"<span style='color:{MUTED};font-size:10px;text-transform:uppercase;"
        f"letter-spacing:1px;'>{module_id}</span> " if module_id else ""
    )

    sub_html = (
        f"<p style='color:{TEXT2};font-size:13px;margin:2px 0 0;'>{subtitle}</p>"
        if subtitle else ""
    )

    st.markdown(
        f"<div style='border-left:3px solid {_accent};"
        f"padding:8px 0 8px 14px;margin-bottom:16px;'>"
        f"<div style='display:flex;align-items:center;gap:8px;'>"
        f"{mod_html}"
        f"<h2 style='color:{TEXT};font-size:20px;font-weight:700;margin:0;'>{title}</h2>"
        f"{status_html}</div>"
        f"{sub_html}</div>",
        unsafe_allow_html=True,
    )


# ── section ────────────────────────────────────────────────────────────────────

@contextmanager
def section(
    title: str | None = None,
    color: str | None = None,
    icon: str | None = None,
):
    """
    Sección con cabecera opcional.

    Uso:
        with section("Análisis de riesgo", icon="⚠️"):
            st.write(...)
    """
    if title:
        from dashboard.shared import section_header
        section_header(f"{icon} {title}" if icon else title, color=color or CYAN)
    yield


# ── two_column_layout ──────────────────────────────────────────────────────────

def two_column_layout(ratio: tuple[int, int] = (1, 1)) -> tuple[Any, Any]:
    """
    Layout de dos columnas con ratio configurable.

    Returns:
        Tupla (col1, col2) de columnas Streamlit.
    """
    return st.columns(list(ratio))


def three_column_layout(ratio: tuple[int, int, int] = (1, 1, 1)) -> tuple[Any, Any, Any]:
    """
    Layout de tres columnas.

    Returns:
        Tupla (col1, col2, col3) de columnas Streamlit.
    """
    cols = st.columns(list(ratio))
    return cols[0], cols[1], cols[2]


def four_column_layout() -> tuple[Any, Any, Any, Any]:
    """Layout de cuatro columnas iguales para KPI cards."""
    cols = st.columns(4)
    return cols[0], cols[1], cols[2], cols[3]


# ── sticky_sidebar_panel ───────────────────────────────────────────────────────

@contextmanager
def sticky_sidebar_panel(title: str | None = None):
    """
    Panel de sidebar estilizado.

    Uso:
        with sticky_sidebar_panel("Filtros"):
            st.selectbox(...)
    """
    with st.sidebar:
        if title:
            st.markdown(
                f"<p style='color:{CYAN};font-size:12px;font-weight:600;"
                f"text-transform:uppercase;letter-spacing:0.5px;"
                f"border-bottom:1px solid {BORDER};padding-bottom:6px;margin-bottom:10px;'>"
                f"{title}</p>",
                unsafe_allow_html=True,
            )
        yield


# ── kpi_row ────────────────────────────────────────────────────────────────────

def kpi_row(kpis: list[dict[str, Any]]) -> None:
    """
    Fila de KPI cards usando el componente de shared.py.

    Args:
        kpis: Lista de dicts con {label, value, delta?, status?, subtitle?}.
    """
    if not kpis:
        return

    cols = st.columns(len(kpis))
    for col, kpi in zip(cols, kpis):
        with col:
            try:
                from dashboard.ui.cards import metric_card
                metric_card(
                    label=kpi.get("label", ""),
                    value=kpi.get("value", "—"),
                    delta=kpi.get("delta"),
                    status=kpi.get("status"),
                    subtitle=kpi.get("subtitle"),
                    source=kpi.get("source"),
                    freshness=kpi.get("freshness"),
                    demo=kpi.get("demo", False),
                )
            except Exception:
                # Fallback al kpi_card de shared.py
                try:
                    from dashboard.shared import kpi_card
                    kpi_card(
                        label=kpi.get("label", ""),
                        value=str(kpi.get("value", "—")),
                        delta=kpi.get("delta"),
                        color=kpi.get("color", CYAN),
                        sub=kpi.get("subtitle", ""),
                    )
                except Exception:
                    st.metric(kpi.get("label", ""), kpi.get("value", "—"))


# ── tab_section ────────────────────────────────────────────────────────────────

def tab_section(tab_labels: list[str]) -> list[Any]:
    """
    Crea tabs de Streamlit con estilo estándar.

    Args:
        tab_labels: Lista de etiquetas de tabs.

    Returns:
        Lista de objetos tab de Streamlit.
    """
    return st.tabs(tab_labels)


# ── divider ────────────────────────────────────────────────────────────────────

def divider(color: str | None = None, margin: str = "12px 0") -> None:
    """Línea divisora con color de token."""
    _color = color or BORDER
    st.markdown(
        f"<hr style='border:none;border-top:1px solid {_color};margin:{margin};'>",
        unsafe_allow_html=True,
    )
