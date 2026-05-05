"""
Legislative Components — Bloque 12.

Componentes de dominio para actividad legislativa, BOE,
Congreso, Senado e impacto normativo.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, BLUE, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED, get_severity_color,
)
from dashboard.ui.badges import severity_badge, source_badge
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_legal_item_card ─────────────────────────────────────────────────────

def render_legal_item_card(
    item: dict[str, Any],
    show_impact: bool = True,
) -> None:
    """
    Tarjeta de disposición legal (BOE, DOUE, BOCA...).

    Args:
        item: Dict con {titulo, fecha, seccion?, fuente?, url?,
                        resumen?, impacto?, severidad?}.
        show_impact: Si True, muestra indicador de impacto.
    """
    titulo = item.get("titulo", item.get("title", "Sin título"))
    fecha = item.get("fecha", item.get("date", ""))
    seccion = item.get("seccion", item.get("section", ""))
    fuente = item.get("fuente", item.get("source", "BOE"))
    url = item.get("url", "")
    resumen = item.get("resumen", item.get("summary", ""))
    severidad = item.get("severidad", item.get("severity", ""))
    impacto = item.get("impacto", item.get("impact", ""))

    sev_html = severity_badge(severidad, inline=True) if severidad else ""
    src_html = source_badge(fuente, inline=True) if fuente else ""

    title_link = (
        f"<a href='{url}' target='_blank' style='color:{CYAN};text-decoration:none;'>{titulo}</a>"
        if url else f"<span style='color:{TEXT};'>{titulo}</span>"
    )

    meta_parts = []
    if fecha:
        meta_parts.append(f"📅 {fecha}")
    if seccion:
        meta_parts.append(f"📂 {seccion}")
    meta_html = " &nbsp;|&nbsp; ".join(
        f"<span style='color:{MUTED};font-size:10px;'>{p}</span>" for p in meta_parts
    )

    impacto_html = ""
    if show_impact and impacto:
        impacto_html = (
            f"<p style='color:{AMBER};font-size:11px;margin:4px 0 0;'>⚡ {impacto}</p>"
        )

    resumen_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:4px 0 0;'>{resumen[:300]}</p>"
        if resumen else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {BLUE};border-radius:6px;padding:12px 14px;margin:4px 0;'>"
        f"  <div style='display:flex;align-items:center;gap:6px;flex-wrap:wrap;'>"
        f"    {title_link} {sev_html} {src_html}"
        f"  </div>"
        f"  <div style='margin:2px 0;'>{meta_html}</div>"
        f"  {resumen_html}"
        f"  {impacto_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_parliamentary_initiative_card ───────────────────────────────────────

def render_parliamentary_initiative_card(
    initiative: dict[str, Any],
) -> None:
    """
    Tarjeta de iniciativa parlamentaria (proposición, pregunta, moción...).

    Args:
        initiative: Dict con {titulo, tipo, autor?, partido?, estado?,
                               fecha, url?, descripcion?}.
    """
    titulo = initiative.get("titulo", initiative.get("title", "Sin título"))
    tipo = initiative.get("tipo", initiative.get("type", ""))
    autor = initiative.get("autor", initiative.get("author", ""))
    partido = initiative.get("partido", initiative.get("party", ""))
    estado = initiative.get("estado", initiative.get("status", ""))
    fecha = initiative.get("fecha", initiative.get("date", ""))
    url = initiative.get("url", "")
    descripcion = initiative.get("descripcion", initiative.get("description", ""))

    # Color por estado
    estado_colors = {
        "aprobada": GREEN, "rechazada": RED, "en tramitación": AMBER,
        "retirada": MUTED, "caducada": MUTED,
    }
    estado_color = estado_colors.get(estado.lower(), CYAN) if estado else CYAN

    title_link = (
        f"<a href='{url}' target='_blank' style='color:{TEXT};text-decoration:none;'>{titulo}</a>"
        if url else f"<span style='color:{TEXT};'>{titulo}</span>"
    )

    tipo_html = (
        f"<span style='color:{MUTED};font-size:10px;text-transform:uppercase;"
        f"letter-spacing:0.5px;'>{tipo}</span>" if tipo else ""
    )

    estado_html = (
        f"<span style='color:{estado_color};font-size:11px;font-weight:600;'>{estado}</span>"
        if estado else ""
    )

    desc_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:6px 0 0;'>{descripcion[:250]}</p>"
        if descripcion else ""
    )

    meta_parts = []
    if autor:
        meta_parts.append(f"👤 {autor}")
    if partido:
        meta_parts.append(f"🏛️ {partido}")
    if fecha:
        meta_parts.append(f"📅 {fecha}")
    meta_html = " &nbsp;|&nbsp; ".join(
        f"<span style='color:{MUTED};font-size:10px;'>{p}</span>" for p in meta_parts
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {CYAN};border-radius:6px;padding:12px 14px;margin:4px 0;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:flex-start;'>"
        f"    <div style='flex:1;'>{tipo_html}<br>{title_link}</div>"
        f"    <div style='margin-left:12px;'>{estado_html}</div>"
        f"  </div>"
        f"  <div style='margin-top:4px;'>{meta_html}</div>"
        f"  {desc_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_legislative_timeline ────────────────────────────────────────────────

def render_legislative_timeline(
    events: list[dict[str, Any]],
    title: str = "Actividad Legislativa",
    max_items: int = 15,
) -> None:
    """
    Timeline legislativo usando el componente base.

    Args:
        events: Lista de eventos legislativos.
        title: Título.
        max_items: Máximo de eventos.
    """
    from dashboard.ui.timelines import render_legislative_timeline as _tl
    _tl(events, title=title, max_items=max_items)


# ── render_boe_summary_panel ───────────────────────────────────────────────────

def render_boe_summary_panel(
    boe_data: dict[str, Any],
    date_label: str | None = None,
) -> None:
    """
    Panel resumen del BOE del día.

    Args:
        boe_data: Dict con {fecha, total_disposiciones, secciones: {nombre: count},
                            highlights: [...], urgentes: [...]}.
        date_label: Etiqueta de fecha (default: boe_data["fecha"]).
    """
    if not boe_data:
        no_data_state("BOE", "No hay datos del BOE para esta fecha.")
        return

    fecha = date_label or boe_data.get("fecha", "Hoy")
    total = boe_data.get("total_disposiciones", boe_data.get("total", 0))
    secciones = boe_data.get("secciones", {})
    highlights = boe_data.get("highlights", [])
    urgentes = boe_data.get("urgentes", [])

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-radius:8px;padding:14px 16px;margin-bottom:12px;'>"
        f"<div style='display:flex;justify-content:space-between;'>"
        f"  <span style='color:{CYAN};font-weight:700;'>📰 BOE {fecha}</span>"
        f"  <span style='color:{TEXT2};font-size:13px;'>{total} disposiciones</span>"
        f"</div>"
        f"</div>",
        unsafe_allow_html=True,
    )

    if secciones:
        cols = st.columns(min(len(secciones), 4))
        for col, (sec, count) in zip(cols, list(secciones.items())[:4]):
            with col:
                st.metric(sec[:20], count)

    if urgentes:
        st.markdown(
            f"<p style='color:{RED};font-size:12px;font-weight:600;margin:8px 0 4px;'>"
            f"🚨 Urgentes ({len(urgentes)})</p>",
            unsafe_allow_html=True,
        )
        for item in urgentes[:3]:
            render_legal_item_card(item if isinstance(item, dict) else {"titulo": str(item)})

    if highlights:
        st.markdown(
            f"<p style='color:{CYAN};font-size:12px;font-weight:600;margin:8px 0 4px;'>"
            f"⭐ Destacados</p>",
            unsafe_allow_html=True,
        )
        for item in highlights[:5]:
            render_legal_item_card(item if isinstance(item, dict) else {"titulo": str(item)})


# ── render_legal_impact_matrix ─────────────────────────────────────────────────

def render_legal_impact_matrix(
    matrix: list[dict[str, Any]],
    title: str = "Matriz de Impacto Legislativo",
) -> None:
    """
    Matriz actor × disposición con niveles de impacto.

    Args:
        matrix: Lista de dicts con {actor, disposicion, impacto (0-1), tipo?}.
        title: Título.
    """
    if not matrix:
        no_data_state("Matriz de impacto")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"⚖️ {title}</p>",
        unsafe_allow_html=True,
    )

    try:
        import pandas as pd
        df = pd.DataFrame(matrix)
        if "actor" in df.columns and "disposicion" in df.columns and "impacto" in df.columns:
            pivot = df.pivot_table(
                index="actor", columns="disposicion", values="impacto", aggfunc="mean"
            )
            st.dataframe(
                pivot.style.background_gradient(cmap="RdYlGn", vmin=0, vmax=1),
                use_container_width=True,
            )
        else:
            st.dataframe(df.head(20), use_container_width=True, hide_index=True)
    except Exception as exc:
        logger.debug("Error en legal_impact_matrix: %s", exc)
        for row in matrix[:10]:
            actor = row.get("actor", "—")
            disp = row.get("disposicion", "—")
            imp = row.get("impacto", 0)
            st.text(f"{actor} ← {disp}: {imp:.2f}")
