"""
Territorial Components — Bloque 12.

Componentes de dominio para análisis territorial:
perfil de CCAA/provincia, rankings y señales territoriales.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED, get_party_color,
)
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_territory_profile_card ──────────────────────────────────────────────

def render_territory_profile_card(
    territory: dict[str, Any],
) -> None:
    """
    Tarjeta de perfil territorial.

    Args:
        territory: Dict con {nombre, tipo (ccaa/provincia/municipio),
                               partido_ganador?, escanos?, poblacion?,
                               riesgo?, metricas?, descripcion?}.
    """
    nombre = territory.get("nombre", territory.get("name", "—"))
    tipo = territory.get("tipo", territory.get("type", "territorio"))
    partido_ganador = territory.get("partido_ganador", territory.get("leading_party"))
    escanos = territory.get("escanos", territory.get("seats"))
    poblacion = territory.get("poblacion", territory.get("population"))
    riesgo = territory.get("riesgo", territory.get("risk"))
    descripcion = territory.get("descripcion", territory.get("description", ""))
    metricas = territory.get("metricas", territory.get("metrics", {}))

    party_color = get_party_color(partido_ganador) if partido_ganador else CYAN

    # KPIs
    kpi_items = []
    if partido_ganador:
        kpi_items.append(("Partido líder", partido_ganador, party_color))
    if escanos:
        kpi_items.append(("Escaños", str(escanos), TEXT))
    if poblacion:
        pob_str = f"{int(poblacion):,}".replace(",", ".")
        kpi_items.append(("Población", pob_str, TEXT2))
    if riesgo is not None:
        try:
            r_f = float(riesgo)
            r_color = RED if r_f > 0.7 else AMBER if r_f > 0.4 else GREEN
            kpi_items.append(("Riesgo", f"{r_f:.0%}", r_color))
        except (TypeError, ValueError):
            pass

    kpi_html = "".join(
        f"<div style='text-align:center;'>"
        f"  <p style='color:{MUTED};font-size:9px;margin:0;'>{k}</p>"
        f"  <p style='color:{c};font-size:13px;font-weight:700;margin:0;'>{v}</p>"
        f"</div>"
        for k, v, c in kpi_items[:4]
    )

    # Métricas adicionales
    met_html = ""
    if metricas:
        for met_name, met_val in list(metricas.items())[:4]:
            label = met_name.replace("_", " ").title()
            met_html += (
                f"<div style='display:flex;justify-content:space-between;margin:2px 0;'>"
                f"  <span style='color:{MUTED};font-size:11px;'>{label}</span>"
                f"  <span style='color:{TEXT2};font-size:11px;'>{met_val}</span>"
                f"</div>"
            )

    desc_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:8px 0 0;'>{descripcion[:200]}</p>"
        if descripcion else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:4px solid {party_color};border-radius:6px;padding:14px 16px;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:flex-start;'>"
        f"    <div>"
        f"      <p style='color:{TEXT};font-size:16px;font-weight:800;margin:0;'>{nombre}</p>"
        f"      <span style='color:{MUTED};font-size:10px;text-transform:uppercase;"
        f"letter-spacing:0.5px;'>{tipo}</span>"
        f"    </div>"
        f"  </div>"
        f"  <div style='display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;'>{kpi_html}</div>"
        f"  {met_html}"
        f"  {desc_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_hot_territories_ranking ────────────────────────────────────────────

def render_hot_territories_ranking(
    territories: list[dict[str, Any]],
    metric: str = "riesgo",
    title: str = "Territorios calientes",
    top_n: int = 10,
) -> None:
    """
    Ranking de territorios por una métrica de alerta.

    Args:
        territories: Lista de dicts territoriales.
        metric: Métrica de ranking.
        title: Título.
        top_n: Número de territorios.
    """
    from dashboard.ui.compare import render_territory_comparison
    render_territory_comparison(
        territories=territories,
        metric=metric,
        name_col="nombre",
        title=title,
        top_n=top_n,
        ascending=False,
    )


# ── render_territorial_signal_card ────────────────────────────────────────────

def render_territorial_signal_card(
    signal: dict[str, Any],
) -> None:
    """
    Señal territorial: evento o alerta específica de un territorio.

    Args:
        signal: Dict con {territorio, titulo, tipo, severidad?,
                           descripcion?, fecha?, fuente?}.
    """
    territorio = signal.get("territorio", signal.get("territory", ""))
    titulo = signal.get("titulo", signal.get("title", "Señal territorial"))
    tipo = signal.get("tipo", signal.get("type", ""))
    severidad = signal.get("severidad", signal.get("severity", "medium"))
    descripcion = signal.get("descripcion", signal.get("description", ""))
    fecha = signal.get("fecha", signal.get("date", ""))
    fuente = signal.get("fuente", signal.get("source", ""))

    from dashboard.ui.tokens import get_severity_color
    border_color = get_severity_color(severidad, CYAN)

    meta_parts = []
    if territorio:
        meta_parts.append(f"🗺️ {territorio}")
    if fecha:
        meta_parts.append(f"📅 {fecha}")
    if fuente:
        meta_parts.append(f"📍 {fuente}")
    meta_html = " &nbsp;|&nbsp; ".join(
        f"<span style='color:{MUTED};font-size:10px;'>{p}</span>" for p in meta_parts
    )

    tipo_html = (
        f"<span style='color:{MUTED};font-size:10px;text-transform:uppercase;"
        f"letter-spacing:0.5px;'>{tipo}</span> " if tipo else ""
    )

    desc_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:4px 0 0;'>{descripcion[:200]}</p>"
        if descripcion else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {border_color};border-radius:6px;padding:10px 12px;margin:3px 0;'>"
        f"  {tipo_html}"
        f"  <span style='color:{TEXT};font-size:13px;font-weight:600;'>{titulo}</span>"
        f"  <div style='margin-top:2px;'>{meta_html}</div>"
        f"  {desc_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_territorial_layer_selector ─────────────────────────────────────────

def render_territorial_layer_selector(
    layers: list[dict[str, Any]],
    key: str = "territory_layer",
) -> str | None:
    """
    Selector de capa territorial (CCAA, provincia, municipio...).

    Args:
        layers: Lista de dicts con {id, nombre, tipo}.
        key: Clave Streamlit.

    Returns:
        ID de la capa seleccionada.
    """
    if not layers:
        return None

    names = [l.get("nombre", l.get("name", "")) for l in layers]
    ids = [l.get("id", l.get("name", "")) for l in layers]
    name_to_id = dict(zip(names, ids))

    selected_name = st.selectbox("Capa territorial", names, key=key)
    return name_to_id.get(selected_name)
