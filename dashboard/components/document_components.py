"""
Document Components — Bloque 12.

Componentes de dominio para documentos: tarjetas, chunks,
tablas extraídas, citas y borradores de informes.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, BLUE, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)
from dashboard.ui.badges import source_badge, status_badge
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_document_card ───────────────────────────────────────────────────────

def render_document_card(
    doc: dict[str, Any],
    show_actions: bool = False,
) -> None:
    """
    Tarjeta de documento procesado.

    Args:
        doc: Dict con {titulo, fuente, tipo, estado_parseo?, n_chunks?,
                        n_evidencias?, timestamp?, metadata?, url?}.
        show_actions: Si True, muestra botones de acción.
    """
    titulo = doc.get("titulo", doc.get("title", "Documento"))
    fuente = doc.get("fuente", doc.get("source", ""))
    tipo = doc.get("tipo", doc.get("type", ""))
    estado = doc.get("estado_parseo", doc.get("parse_status", ""))
    n_chunks = doc.get("n_chunks", doc.get("chunks"))
    n_evidencias = doc.get("n_evidencias", doc.get("evidence_count"))
    timestamp = doc.get("timestamp", doc.get("created_at", ""))
    url = doc.get("url", "")

    # Colores por estado
    status_colors = {
        "completo": GREEN, "complete": GREEN, "success": GREEN,
        "procesando": AMBER, "processing": AMBER, "pending": AMBER,
        "error": RED, "failed": RED,
    }
    status_color = status_colors.get(str(estado).lower(), MUTED)

    title_link = (
        f"<a href='{url}' target='_blank' style='color:{CYAN};text-decoration:none;'>{titulo}</a>"
        if url else f"<span style='color:{TEXT};'>{titulo}</span>"
    )

    meta_parts = []
    if fuente:
        meta_parts.append(f"📍 {fuente}")
    if tipo:
        meta_parts.append(f"📄 {tipo}")
    if timestamp:
        meta_parts.append(f"🕐 {timestamp}")
    meta_html = " &nbsp;|&nbsp; ".join(
        f"<span style='color:{MUTED};font-size:10px;'>{p}</span>" for p in meta_parts
    )

    stats_html = ""
    if n_chunks is not None:
        stats_html += f"<span style='color:{MUTED};font-size:10px;'>📦 {n_chunks} chunks</span> &nbsp;"
    if n_evidencias is not None:
        stats_html += f"<span style='color:{CYAN};font-size:10px;'>🔍 {n_evidencias} evidencias</span>"

    status_html = (
        f"<span style='color:{status_color};font-size:11px;font-weight:600;'>{estado}</span>"
        if estado else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {BLUE};border-radius:6px;padding:10px 12px;margin:4px 0;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:flex-start;'>"
        f"    <div style='flex:1;'>{title_link}</div>"
        f"    {status_html}"
        f"  </div>"
        f"  <div style='margin:2px 0;'>{meta_html}</div>"
        f"  <div style='margin-top:4px;'>{stats_html}</div>"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_document_chunks_panel ───────────────────────────────────────────────

def render_document_chunks_panel(
    chunks: list[dict[str, Any]],
    title: str = "Fragmentos del documento",
    max_chunks: int = 10,
) -> None:
    """
    Panel de chunks de texto de un documento.

    Args:
        chunks: Lista de dicts con {index?, texto, relevancia?, metadata?}.
        title: Título.
        max_chunks: Máximo de chunks a mostrar.
    """
    if not chunks:
        no_data_state("Fragmentos", "No hay fragmentos disponibles.")
        return

    with st.expander(f"📦 {title} ({len(chunks)})", expanded=False):
        for i, chunk in enumerate(chunks[:max_chunks], 1):
            texto = chunk.get("texto", chunk.get("text", chunk.get("content", "")))
            relevancia = chunk.get("relevancia", chunk.get("relevance_score"))
            chunk_idx = chunk.get("index", i)

            rel_html = ""
            if relevancia is not None:
                try:
                    rel_f = float(relevancia)
                    rel_color = GREEN if rel_f > 0.7 else AMBER if rel_f > 0.4 else RED
                    rel_html = (
                        f"<span style='color:{rel_color};font-size:10px;'>⭐ {rel_f:.0%}</span>"
                    )
                except (TypeError, ValueError):
                    pass

            text_preview = texto[:300] + "..." if len(texto) > 300 else texto

            st.markdown(
                f"<div style='background:{BG3};border:1px solid {BORDER};"
                f"border-left:2px solid {CYAN};border-radius:4px;padding:8px 10px;margin:3px 0;'>"
                f"  <div style='display:flex;justify-content:space-between;'>"
                f"    <span style='color:{MUTED};font-size:10px;'>#{chunk_idx}</span>"
                f"    {rel_html}"
                f"  </div>"
                f"  <p style='color:{TEXT2};font-size:12px;margin:4px 0 0;'>{text_preview}</p>"
                f"</div>",
                unsafe_allow_html=True,
            )

        if len(chunks) > max_chunks:
            st.caption(f"Mostrando {max_chunks} de {len(chunks)} fragmentos.")


# ── render_extracted_tables_panel ──────────────────────────────────────────────

def render_extracted_tables_panel(
    tables: list[dict[str, Any]],
    title: str = "Tablas extraídas",
) -> None:
    """
    Panel de tablas extraídas de un documento.

    Args:
        tables: Lista de dicts con {nombre?, datos (lista de listas o dict), fuente?}.
        title: Título.
    """
    if not tables:
        no_data_state("Tablas", "No se encontraron tablas en el documento.")
        return

    with st.expander(f"📊 {title} ({len(tables)})", expanded=False):
        for i, table in enumerate(tables[:5], 1):
            nombre = table.get("nombre", table.get("name", f"Tabla {i}"))
            datos = table.get("datos", table.get("data", []))

            st.caption(f"**{nombre}**")
            try:
                import pandas as pd
                if isinstance(datos, list) and datos:
                    if isinstance(datos[0], dict):
                        df = pd.DataFrame(datos)
                    elif isinstance(datos[0], list):
                        df = pd.DataFrame(datos[1:], columns=datos[0])
                    else:
                        df = pd.DataFrame(datos)
                    st.dataframe(df, use_container_width=True, hide_index=True)
                elif isinstance(datos, dict):
                    df = pd.DataFrame([datos])
                    st.dataframe(df, use_container_width=True, hide_index=True)
            except Exception as exc:
                logger.debug("Error renderizando tabla extraída: %s", exc)
                st.json(datos if isinstance(datos, (list, dict)) else str(datos))


# ── render_citation_panel ──────────────────────────────────────────────────────

def render_citation_panel(
    citations: list[dict[str, Any]],
    title: str = "Citas relevantes",
) -> None:
    """
    Panel de citas relevantes de un documento.

    Args:
        citations: Lista de dicts con {texto, fuente, relevancia?, pagina?, url?}.
        title: Título.
    """
    from dashboard.ui.evidence import render_citation_list
    render_citation_list(citations, title=title)


# ── render_draft_report_panel ──────────────────────────────────────────────────

def render_draft_report_panel(
    draft: dict[str, Any],
    editable: bool = False,
) -> str | None:
    """
    Panel de borrador de informe generado por IA.

    Args:
        draft: Dict con {titulo, contenido, secciones?, metadata?, version?}.
        editable: Si True, muestra área editable.

    Returns:
        Contenido editado si editable=True, None otherwise.
    """
    if not draft:
        no_data_state("Borrador", "No hay borrador disponible.")
        return None

    titulo = draft.get("titulo", draft.get("title", "Borrador de informe"))
    contenido = draft.get("contenido", draft.get("content", ""))
    version = draft.get("version", "")
    secciones = draft.get("secciones", draft.get("sections", []))

    ver_html = (
        f"<span style='color:{MUTED};font-size:10px;'>v{version}</span>" if version else ""
    )

    st.markdown(
        f"<div style='display:flex;align-items:center;gap:8px;margin-bottom:8px;'>"
        f"  <span style='color:{CYAN};font-size:13px;font-weight:700;'>📝 {titulo}</span>"
        f"  {ver_html}"
        f"</div>",
        unsafe_allow_html=True,
    )

    # Si hay secciones, mostrar como tabs
    if secciones:
        tab_labels = [s.get("titulo", s.get("title", f"Sección {i}"))
                      for i, s in enumerate(secciones, 1)]
        tabs = st.tabs(tab_labels[:6])
        for tab, seccion in zip(tabs, secciones[:6]):
            with tab:
                sec_content = seccion.get("contenido", seccion.get("content", ""))
                st.markdown(sec_content)
        return None

    # Contenido plano
    if editable:
        edited = st.text_area(
            "Editar borrador",
            value=contenido,
            height=400,
            key="draft_editor",
        )
        return edited
    else:
        with st.expander("Ver borrador completo", expanded=True):
            st.markdown(contenido)
        return None
