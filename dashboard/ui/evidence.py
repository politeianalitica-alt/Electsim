"""
Evidence — Bloque 12.

Paneles de evidencias, citas, trazabilidad de fuentes y confianza.
Compatible con Bloque 3 (EvidencePack) y Bloque 9 (EvidenceCitation).
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, BLUE, TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)
from dashboard.ui.empty_states import no_data_state
from dashboard.ui.badges import confidence_badge, source_badge

logger = logging.getLogger(__name__)


# ── render_evidence_pack ───────────────────────────────────────────────────────

def render_evidence_pack(
    evidence_pack: dict[str, Any],
    title: str = "Evidencias",
    collapsed: bool = False,
) -> None:
    """
    Panel de un paquete de evidencias (EvidencePack de Bloque 3).

    Args:
        evidence_pack: Dict con {claim, confidence, sources, citations, tools_used, warnings}.
        title: Título del panel.
        collapsed: Si True, muestra el panel colapsado inicialmente.
    """
    if not evidence_pack:
        no_data_state("Evidencias", "No se encontraron evidencias para esta consulta.")
        return

    confidence = evidence_pack.get("confidence", 0.5)
    claim = evidence_pack.get("claim", evidence_pack.get("query", ""))
    sources = evidence_pack.get("sources", [])
    citations = evidence_pack.get("citations", [])
    warnings = evidence_pack.get("warnings", [])
    tools_used = evidence_pack.get("tools_used", [])

    with st.expander(f"🔍 {title}", expanded=not collapsed):
        # Claim principal
        if claim:
            st.markdown(
                f"<p style='color:{TEXT};font-size:13px;font-style:italic;"
                f"border-left:3px solid {CYAN};padding-left:10px;'>{claim}</p>",
                unsafe_allow_html=True,
            )

        # Confianza
        col1, col2 = st.columns([2, 3])
        with col1:
            confidence_badge(confidence)
        with col2:
            if tools_used:
                st.caption(f"🔧 Herramientas: {', '.join(tools_used[:5])}")

        # Warnings
        if warnings:
            for w in warnings[:3]:
                st.warning(f"⚠️ {w}", icon=None)

        # Citas
        if citations:
            render_citation_list(citations)

        # Fuentes
        if sources:
            render_source_trace(sources)


# ── render_citation_list ───────────────────────────────────────────────────────

def render_citation_list(
    citations: list[dict[str, Any]],
    title: str = "Citas y referencias",
) -> None:
    """
    Lista de citas/referencias de evidencia.

    Args:
        citations: Lista de dicts con {text, source, url?, relevance?}.
    """
    if not citations:
        no_data_state("Citas")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:12px;font-weight:600;margin:8px 0 4px;'>"
        f"📎 {title} ({len(citations)})</p>",
        unsafe_allow_html=True,
    )

    for i, cit in enumerate(citations[:10], 1):
        text = cit.get("text", cit.get("content", ""))
        source = cit.get("source", cit.get("document_id", ""))
        url = cit.get("url", "")
        relevance = cit.get("relevance", cit.get("relevance_score"))

        rel_html = ""
        if relevance is not None:
            try:
                rel_val = float(relevance)
                rel_color = GREEN if rel_val > 0.7 else AMBER if rel_val > 0.4 else RED
                rel_html = (
                    f"<span style='color:{rel_color};font-size:10px;'>⭐ {rel_val:.0%}</span>"
                )
            except (ValueError, TypeError):
                pass

        src_link = (
            f"<a href='{url}' style='color:{CYAN};font-size:10px;' target='_blank'>{source}</a>"
            if url else
            f"<span style='color:{MUTED};font-size:10px;'>{source}</span>"
        )

        text_preview = text[:200] + "..." if len(text) > 200 else text

        st.markdown(
            f"<div style='background:{BG3};border:1px solid {BORDER};"
            f"border-left:3px solid {BLUE};border-radius:4px;padding:8px 10px;margin:3px 0;'>"
            f"<div style='display:flex;justify-content:space-between;align-items:center;'>"
            f"<span style='color:{MUTED};font-size:10px;'>#{i} {src_link}</span>"
            f"{rel_html}</div>"
            f"<p style='color:{TEXT2};font-size:12px;margin:4px 0 0;'>{text_preview}</p>"
            f"</div>",
            unsafe_allow_html=True,
        )


# ── render_source_trace ────────────────────────────────────────────────────────

def render_source_trace(
    sources: list[str | dict[str, Any]],
    title: str = "Fuentes utilizadas",
) -> None:
    """
    Trazabilidad de fuentes usadas en un análisis.

    Args:
        sources: Lista de strings o dicts con {name, type?, freshness?, url?}.
    """
    if not sources:
        return

    items_html = ""
    for src in sources[:15]:
        if isinstance(src, str):
            name, src_type, url = src, "", ""
        else:
            name = src.get("name", str(src))
            src_type = src.get("type", "")
            url = src.get("url", "")

        src_link = (
            f"<a href='{url}' style='color:{CYAN};' target='_blank'>{name}</a>"
            if url else f"<span style='color:{TEXT2};'>{name}</span>"
        )
        type_html = f" <span style='color:{MUTED};font-size:10px;'>({src_type})</span>" if src_type else ""
        items_html += f"<li style='font-size:12px;margin:2px 0;'>{src_link}{type_html}</li>"

    st.markdown(
        f"<p style='color:{CYAN};font-size:12px;font-weight:600;margin:8px 0 4px;'>"
        f"📚 {title}</p>"
        f"<ul style='color:{TEXT2};margin:0;padding-left:20px;'>{items_html}</ul>",
        unsafe_allow_html=True,
    )


# ── render_confidence_panel ────────────────────────────────────────────────────

def render_confidence_panel(
    confidence: float,
    warnings: list[str] | None = None,
    label: str = "Confianza del análisis",
    details: dict[str, float] | None = None,
) -> None:
    """
    Panel de confianza con visualización y advertencias.

    Args:
        confidence: Puntuación de confianza (0-1).
        warnings: Advertencias de baja confianza.
        label: Etiqueta del panel.
        details: Desglose de confianza por componente.
    """
    color = GREEN if confidence > 0.7 else AMBER if confidence > 0.4 else RED

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {color}44;"
        f"border-radius:6px;padding:12px 14px;margin:4px 0;'>"
        f"<p style='color:{TEXT2};font-size:11px;font-weight:600;margin:0 0 4px;'>{label}</p>"
        f"<div style='display:flex;align-items:center;gap:10px;'>"
        f"<div style='flex:1;height:8px;background:{BORDER};border-radius:4px;'>"
        f"<div style='width:{confidence:.0%};height:100%;background:{color};border-radius:4px;'></div>"
        f"</div>"
        f"<span style='color:{color};font-size:16px;font-weight:700;'>{confidence:.0%}</span>"
        f"</div></div>",
        unsafe_allow_html=True,
    )

    # Desglose por componente
    if details:
        with st.expander("Ver desglose de confianza"):
            for component, score in details.items():
                c = GREEN if score > 0.7 else AMBER if score > 0.4 else RED
                st.markdown(
                    f"<div style='display:flex;justify-content:space-between;margin:2px 0;'>"
                    f"<span style='color:{TEXT2};font-size:12px;'>{component}</span>"
                    f"<span style='color:{c};font-size:12px;'>{score:.0%}</span>"
                    f"</div>",
                    unsafe_allow_html=True,
                )

    # Warnings
    if warnings:
        for w in warnings[:3]:
            st.warning(f"⚠️ {w}", icon=None)


# ── render_tools_used_panel ────────────────────────────────────────────────────

def render_tools_used_panel(
    tools: list[str | dict[str, Any]],
    title: str = "Herramientas Brain utilizadas",
) -> None:
    """
    Panel de herramientas LLM/IA utilizadas.

    Args:
        tools: Lista de nombres o dicts de herramientas.
    """
    if not tools:
        return

    tool_items = []
    for t in tools:
        if isinstance(t, str):
            tool_items.append(f"<span style='color:{CYAN};font-size:11px;'>🔧 {t}</span>")
        elif isinstance(t, dict):
            name = t.get("name", str(t))
            status = t.get("status", "ok")
            color = GREEN if status == "ok" else RED
            tool_items.append(
                f"<span style='color:{color};font-size:11px;'>🔧 {name}</span>"
            )

    tools_html = " &nbsp;|&nbsp; ".join(tool_items)
    st.markdown(
        f"<div style='margin:4px 0;'>"
        f"<span style='color:{MUTED};font-size:10px;'>{title}: </span>"
        f"{tools_html}</div>",
        unsafe_allow_html=True,
    )
