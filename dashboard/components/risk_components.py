"""
Risk Components — Bloque 12.

Componentes de dominio para riesgo político, reputacional,
actores de riesgo e identidad.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED, get_severity_color,
)
from dashboard.ui.badges import severity_badge, risk_badge
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_risk_entity_card ────────────────────────────────────────────────────

def render_risk_entity_card(
    entity: dict[str, Any],
    show_breakdown: bool = True,
) -> None:
    """
    Tarjeta de entidad con puntuación de riesgo.

    Args:
        entity: Dict con {nombre, tipo, risk_score (0-1), severidad?,
                          flags?, fuentes?, descripcion?, partido?}.
        show_breakdown: Si True, muestra desglose de riesgo.
    """
    nombre = entity.get("nombre", entity.get("name", "—"))
    tipo = entity.get("tipo", entity.get("type", "actor"))
    risk_score = entity.get("risk_score", entity.get("riesgo", 0))
    severidad = entity.get("severidad", entity.get("severity", ""))
    flags = entity.get("flags", [])
    descripcion = entity.get("descripcion", entity.get("description", ""))
    partido = entity.get("partido", entity.get("party", ""))

    try:
        risk_f = float(risk_score)
        risk_pct = int(risk_f * 100)
        risk_color = RED if risk_f > 0.7 else AMBER if risk_f > 0.4 else GREEN
    except (TypeError, ValueError):
        risk_pct = 0
        risk_color = MUTED

    sev_html = severity_badge(severidad, inline=True) if severidad else ""

    flags_html = " ".join(
        f"<span style='background:{BG3};color:{RED};font-size:10px;"
        f"padding:1px 6px;border-radius:3px;'>⚑ {f}</span>"
        for f in (flags[:5] if isinstance(flags, list) else [])
    )

    partido_html = (
        f"<span style='color:{MUTED};font-size:10px;'>🏛️ {partido}</span>"
        if partido else ""
    )

    desc_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:6px 0 0;'>{descripcion[:200]}</p>"
        if descripcion else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:4px solid {risk_color};border-radius:6px;padding:12px 14px;margin:4px 0;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:flex-start;'>"
        f"    <div>"
        f"      <span style='color:{TEXT};font-size:14px;font-weight:700;'>{nombre}</span> "
        f"      <span style='color:{MUTED};font-size:10px;'>[{tipo}]</span>"
        f"      {sev_html}"
        f"      {partido_html}"
        f"    </div>"
        f"    <div style='text-align:center;'>"
        f"      <span style='color:{risk_color};font-size:22px;font-weight:800;'>{risk_pct}</span>"
        f"      <span style='color:{MUTED};font-size:10px;'>/100</span>"
        f"    </div>"
        f"  </div>"
        f"  {desc_html}"
        f"  <div style='margin-top:6px;'>{flags_html}</div>"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_risk_flags_panel ────────────────────────────────────────────────────

def render_risk_flags_panel(
    flags: list[dict[str, Any]],
    title: str = "Señales de riesgo",
) -> None:
    """
    Panel de señales de riesgo activas.

    Args:
        flags: Lista de dicts con {tipo, descripcion, severidad, fecha?, fuente?}.
        title: Título del panel.
    """
    if not flags:
        no_data_state("Señales de riesgo", "No hay señales de riesgo activas.")
        return

    st.markdown(
        f"<p style='color:{RED};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🚨 {title} ({len(flags)})</p>",
        unsafe_allow_html=True,
    )

    for flag in flags[:10]:
        tipo = flag.get("tipo", flag.get("type", ""))
        descripcion = flag.get("descripcion", flag.get("description", ""))
        severidad = flag.get("severidad", flag.get("severity", "medium"))
        fecha = flag.get("fecha", flag.get("date", ""))
        fuente = flag.get("fuente", flag.get("source", ""))

        sev_color = get_severity_color(severidad, AMBER)
        sev_html = severity_badge(severidad, inline=True) if severidad else ""

        meta_parts = []
        if fecha:
            meta_parts.append(fecha)
        if fuente:
            meta_parts.append(f"📍 {fuente}")
        meta_html = " &nbsp;|&nbsp; ".join(
            f"<span style='color:{MUTED};font-size:10px;'>{p}</span>" for p in meta_parts
        )

        st.markdown(
            f"<div style='background:{BG2};border:1px solid {sev_color}44;"
            f"border-left:3px solid {sev_color};border-radius:4px;"
            f"padding:8px 10px;margin:3px 0;'>"
            f"  <div style='display:flex;align-items:center;gap:6px;'>"
            f"    <span style='color:{sev_color};font-size:11px;font-weight:600;'>⚑ {tipo}</span>"
            f"    {sev_html}"
            f"  </div>"
            f"  <p style='color:{TEXT2};font-size:12px;margin:3px 0 2px;'>{descripcion}</p>"
            f"  {meta_html}"
            f"</div>",
            unsafe_allow_html=True,
        )


# ── render_actor_graph_panel ───────────────────────────────────────────────────

def render_actor_graph_panel(
    graph_data: dict[str, Any],
    title: str = "Mapa de actores de riesgo",
    height: int = 450,
) -> None:
    """
    Panel de grafo de actores usando el componente base.

    Args:
        graph_data: Dict con {nodes, edges}.
        title: Título.
        height: Altura en píxeles.
    """
    from dashboard.ui.graphs import render_actor_graph
    render_actor_graph(graph_data, title=title, height=height)


# ── render_risk_score_breakdown ────────────────────────────────────────────────

def render_risk_score_breakdown(
    breakdown: dict[str, float],
    total_score: float | None = None,
    title: str = "Desglose de riesgo",
) -> None:
    """
    Desglose visual de score de riesgo por componente.

    Args:
        breakdown: Dict {componente: score (0-1)}.
        total_score: Score total agregado (0-1).
        title: Título.
    """
    if not breakdown:
        no_data_state("Desglose de riesgo")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"📊 {title}</p>",
        unsafe_allow_html=True,
    )

    if total_score is not None:
        try:
            total_f = float(total_score)
            total_color = RED if total_f > 0.7 else AMBER if total_f > 0.4 else GREEN
            st.markdown(
                f"<div style='text-align:center;padding:8px 0;'>"
                f"  <span style='color:{total_color};font-size:32px;font-weight:800;'>"
                f"{total_f:.0%}</span>"
                f"  <p style='color:{MUTED};font-size:11px;margin:0;'>Riesgo total</p>"
                f"</div>",
                unsafe_allow_html=True,
            )
        except (TypeError, ValueError):
            pass

    for component, score in breakdown.items():
        try:
            score_f = float(score)
            color = RED if score_f > 0.7 else AMBER if score_f > 0.4 else GREEN
            pct = int(score_f * 100)
        except (TypeError, ValueError):
            color = MUTED
            pct = 0

        label = component.replace("_", " ").title()

        st.markdown(
            f"<div style='margin:4px 0;display:flex;align-items:center;gap:8px;'>"
            f"  <span style='color:{TEXT2};font-size:12px;min-width:140px;'>{label}</span>"
            f"  <div style='flex:1;height:8px;background:{BORDER};border-radius:4px;'>"
            f"    <div style='width:{pct}%;height:100%;background:{color};border-radius:4px;'></div>"
            f"  </div>"
            f"  <span style='color:{color};font-size:12px;min-width:35px;text-align:right;'>"
            f"{pct}%</span>"
            f"</div>",
            unsafe_allow_html=True,
        )


# ── render_identity_verification_panel ────────────────────────────────────────

def render_identity_verification_panel(
    verification: dict[str, Any],
    title: str = "Verificación de identidad",
) -> None:
    """
    Panel de verificación de identidad de un actor.

    Args:
        verification: Dict con {verificado, fuentes_confirmacion, discrepancias?,
                                 nivel_confianza, ultima_actualizacion?}.
        title: Título.
    """
    verificado = verification.get("verificado", verification.get("verified", False))
    fuentes = verification.get("fuentes_confirmacion", verification.get("sources", []))
    discrepancias = verification.get("discrepancias", verification.get("discrepancies", []))
    confianza = verification.get("nivel_confianza", verification.get("confidence", 0))
    actualizado = verification.get("ultima_actualizacion", verification.get("last_updated", ""))

    status_color = GREEN if verificado else RED
    status_icon = "✅" if verificado else "❌"
    status_label = "Verificado" if verificado else "No verificado"

    try:
        conf_f = float(confianza)
        conf_pct = int(conf_f * 100)
    except (TypeError, ValueError):
        conf_pct = 0

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {status_color}44;"
        f"border-radius:8px;padding:14px;'>"
        f"  <div style='display:flex;align-items:center;gap:8px;margin-bottom:8px;'>"
        f"    <span style='font-size:20px;'>{status_icon}</span>"
        f"    <span style='color:{status_color};font-size:14px;font-weight:700;'>{status_label}</span>"
        f"    <span style='color:{MUTED};font-size:10px;'>{title}</span>"
        f"  </div>"
        f"  <div style='height:6px;background:{BORDER};border-radius:3px;margin-bottom:8px;'>"
        f"    <div style='width:{conf_pct}%;height:100%;background:{status_color};border-radius:3px;'></div>"
        f"  </div>"
        f"  <span style='color:{MUTED};font-size:10px;'>Confianza: {conf_pct}%</span>"
        f"</div>",
        unsafe_allow_html=True,
    )

    if fuentes:
        fuentes_list = fuentes if isinstance(fuentes, list) else [str(fuentes)]
        for f in fuentes_list[:5]:
            st.caption(f"✓ {f}")

    if discrepancias:
        for d in discrepancias[:3]:
            st.warning(f"⚠️ {d}", icon=None)

    if actualizado:
        st.caption(f"🕐 Última actualización: {actualizado}")
