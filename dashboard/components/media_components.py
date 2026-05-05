"""
Media Components — Bloque 12.

Componentes de dominio para medios de comunicación,
narrativas, sentimiento y clusters temáticos.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, PURPLE, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED, get_severity_color,
)
from dashboard.ui.badges import source_badge, severity_badge
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_media_item_card ─────────────────────────────────────────────────────

def render_media_item_card(
    item: dict[str, Any],
    show_sentiment: bool = True,
    show_credibility: bool = True,
) -> None:
    """
    Tarjeta de noticia / artículo de medio.

    Args:
        item: Dict con {titulo, fuente, fecha, url?, resumen?,
                        sentimiento?, credibilidad?, etiquetas?}.
        show_sentiment: Si True, muestra badge de sentimiento.
        show_credibility: Si True, muestra indicador de credibilidad.
    """
    titulo = item.get("titulo", item.get("title", "Sin título"))
    fuente = item.get("fuente", item.get("source", ""))
    fecha = item.get("fecha", item.get("date", ""))
    url = item.get("url", "")
    resumen = item.get("resumen", item.get("summary", ""))
    sentimiento = item.get("sentimiento", item.get("sentiment", ""))
    credibilidad = item.get("credibilidad", item.get("credibility"))
    etiquetas = item.get("etiquetas", item.get("tags", []))

    # Colores por sentimiento
    sent_colors = {
        "positivo": GREEN, "positive": GREEN,
        "negativo": RED, "negative": RED,
        "neutro": MUTED, "neutral": MUTED,
        "mixto": AMBER, "mixed": AMBER,
    }
    sent_color = sent_colors.get(str(sentimiento).lower(), MUTED)
    sent_icon = {"positivo": "😊", "positive": "😊", "negativo": "😞", "negative": "😞"}.get(
        str(sentimiento).lower(), "😐"
    )

    title_link = (
        f"<a href='{url}' target='_blank' style='color:{CYAN};text-decoration:none;'>{titulo}</a>"
        if url else f"<span style='color:{TEXT};'>{titulo}</span>"
    )

    meta_parts = []
    if fuente:
        meta_parts.append(f"📰 {fuente}")
    if fecha:
        meta_parts.append(f"📅 {fecha}")
    meta_html = " &nbsp;|&nbsp; ".join(
        f"<span style='color:{MUTED};font-size:10px;'>{p}</span>" for p in meta_parts
    )

    sent_html = ""
    if show_sentiment and sentimiento:
        sent_html = (
            f"<span style='color:{sent_color};font-size:11px;'>"
            f"{sent_icon} {sentimiento}</span>"
        )

    cred_html = ""
    if show_credibility and credibilidad is not None:
        try:
            cred_f = float(credibilidad)
            cred_color = GREEN if cred_f > 0.7 else AMBER if cred_f > 0.4 else RED
            cred_html = (
                f"<span style='color:{cred_color};font-size:10px;'>"
                f"⭐ {cred_f:.0%}</span>"
            )
        except (TypeError, ValueError):
            pass

    tags_html = " ".join(
        f"<span style='background:{BG3};color:{CYAN};font-size:10px;"
        f"padding:1px 6px;border-radius:3px;'>{t}</span>"
        for t in (etiquetas[:5] if isinstance(etiquetas, list) else [])
    )

    resumen_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:4px 0 0;'>{resumen[:250]}</p>"
        if resumen else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {sent_color};border-radius:6px;padding:10px 12px;margin:4px 0;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:flex-start;'>"
        f"    <div style='flex:1;'>{title_link}</div>"
        f"    <div style='display:flex;gap:6px;margin-left:8px;'>{sent_html} {cred_html}</div>"
        f"  </div>"
        f"  <div style='margin:2px 0;'>{meta_html}</div>"
        f"  {resumen_html}"
        f"  <div style='margin-top:6px;'>{tags_html}</div>"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_narrative_cluster_card ──────────────────────────────────────────────

def render_narrative_cluster_card(
    cluster: dict[str, Any],
    expanded: bool = False,
) -> None:
    """
    Tarjeta de cluster de narrativa (grupo temático de noticias).

    Args:
        cluster: Dict con {nombre, descripcion?, n_articulos, sentimiento_medio,
                           actores_mencionados?, intensidad?, palabras_clave?}.
        expanded: Si True, muestra los artículos del cluster.
    """
    nombre = cluster.get("nombre", cluster.get("name", "Narrativa"))
    descripcion = cluster.get("descripcion", cluster.get("description", ""))
    n_articulos = cluster.get("n_articulos", cluster.get("article_count", 0))
    sentimiento = cluster.get("sentimiento_medio", cluster.get("avg_sentiment", 0))
    intensidad = cluster.get("intensidad", cluster.get("intensity", 0))
    palabras = cluster.get("palabras_clave", cluster.get("keywords", []))
    actores = cluster.get("actores_mencionados", cluster.get("actors", []))

    try:
        sent_f = float(sentimiento)
        sent_color = GREEN if sent_f > 0.1 else RED if sent_f < -0.1 else MUTED
        sent_str = f"{sent_f:+.2f}"
    except (TypeError, ValueError):
        sent_color = MUTED
        sent_str = str(sentimiento)

    try:
        int_f = float(intensidad)
        int_pct = min(100, int(int_f * 100))
    except (TypeError, ValueError):
        int_pct = 0

    keywords_html = " ".join(
        f"<span style='background:{BG3};color:{PURPLE};font-size:10px;"
        f"padding:1px 5px;border-radius:3px;'>{kw}</span>"
        for kw in (palabras[:6] if isinstance(palabras, list) else [])
    )

    with st.expander(f"📰 {nombre} ({n_articulos} artículos)", expanded=expanded):
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(
                f"<p style='color:{MUTED};font-size:10px;'>Sentimiento medio</p>"
                f"<p style='color:{sent_color};font-size:16px;font-weight:700;'>{sent_str}</p>",
                unsafe_allow_html=True,
            )
        with col2:
            st.markdown(
                f"<p style='color:{MUTED};font-size:10px;'>Intensidad</p>",
                unsafe_allow_html=True,
            )
            st.progress(int_pct / 100)

        if descripcion:
            st.markdown(
                f"<p style='color:{TEXT2};font-size:12px;'>{descripcion}</p>",
                unsafe_allow_html=True,
            )

        if palabras:
            st.markdown(keywords_html, unsafe_allow_html=True)

        if actores:
            actor_list = ", ".join(str(a) for a in actores[:8])
            st.caption(f"👥 Actores: {actor_list}")


# ── render_actor_sentiment_panel ───────────────────────────────────────────────

def render_actor_sentiment_panel(
    actors: list[dict[str, Any]],
    title: str = "Sentimiento por actor",
) -> None:
    """
    Panel de sentimiento medio por actor político.

    Args:
        actors: Lista de dicts con {nombre, sentimiento (-1..+1), n_menciones?, variacion?}.
        title: Título del panel.
    """
    if not actors:
        no_data_state("Sentimiento")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"💬 {title}</p>",
        unsafe_allow_html=True,
    )

    sorted_actors = sorted(
        actors,
        key=lambda a: float(a.get("sentimiento", a.get("sentiment", 0))),
        reverse=True,
    )

    for actor in sorted_actors[:10]:
        nombre = actor.get("nombre", actor.get("name", "—"))
        sent = actor.get("sentimiento", actor.get("sentiment", 0))
        menciones = actor.get("n_menciones", actor.get("mentions", ""))
        variacion = actor.get("variacion", actor.get("change"))

        try:
            sent_f = float(sent)
            color = GREEN if sent_f > 0.1 else RED if sent_f < -0.1 else MUTED
            # Normalizar a 0-100 para la barra
            bar_pct = int((sent_f + 1) / 2 * 100)
            sent_str = f"{sent_f:+.2f}"
        except (TypeError, ValueError):
            color = MUTED
            bar_pct = 50
            sent_str = str(sent)

        var_html = ""
        if variacion is not None:
            try:
                var_f = float(variacion)
                var_color = GREEN if var_f > 0 else RED
                var_html = f"<span style='color:{var_color};font-size:10px;'>{var_f:+.2f}</span>"
            except (TypeError, ValueError):
                pass

        menciones_html = (
            f"<span style='color:{MUTED};font-size:10px;'>{menciones} menciones</span>"
            if menciones else ""
        )

        st.markdown(
            f"<div style='display:flex;align-items:center;gap:8px;margin:3px 0;'>"
            f"  <span style='color:{TEXT};font-size:12px;min-width:100px;'>{nombre}</span>"
            f"  <div style='flex:1;height:6px;background:{BORDER};border-radius:3px;'>"
            f"    <div style='width:{bar_pct}%;height:100%;background:{color};border-radius:3px;'></div>"
            f"  </div>"
            f"  <span style='color:{color};font-size:12px;min-width:40px;'>{sent_str}</span>"
            f"  {var_html}"
            f"  {menciones_html}"
            f"</div>",
            unsafe_allow_html=True,
        )


# ── render_media_source_map ────────────────────────────────────────────────────

def render_media_source_map(
    sources: list[dict[str, Any]],
    title: str = "Mapa de fuentes",
) -> None:
    """
    Mapa / tabla de fuentes de medios con métricas.

    Args:
        sources: Lista de dicts con {nombre, tipo (nacional/regional/digital),
                                      credibilidad, sesgo?, n_articulos?, url?}.
        title: Título.
    """
    if not sources:
        no_data_state("Fuentes de medios")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🗺️ {title}</p>",
        unsafe_allow_html=True,
    )

    try:
        import pandas as pd
        df = pd.DataFrame(sources)
        visible_cols = [c for c in ["nombre", "tipo", "credibilidad", "sesgo", "n_articulos"]
                        if c in df.columns]
        if not visible_cols:
            visible_cols = list(df.columns[:6])
        st.dataframe(df[visible_cols].head(20), use_container_width=True, hide_index=True)
    except Exception as exc:
        logger.debug("Error en media_source_map: %s", exc)
        for src in sources[:10]:
            nombre = src.get("nombre", "—")
            tipo = src.get("tipo", "")
            cred = src.get("credibilidad", "")
            st.text(f"{nombre} ({tipo}) — credibilidad: {cred}")


# ── render_narrative_timeline ──────────────────────────────────────────────────

def render_narrative_timeline(
    events: list[dict[str, Any]],
    title: str = "Evolución de narrativa",
    max_items: int = 20,
) -> None:
    """
    Timeline de eventos de narrativa mediática.

    Args:
        events: Lista de eventos con {date, title, type=media, ...}.
        title: Título.
        max_items: Máximo de eventos.
    """
    from dashboard.ui.timelines import render_event_timeline
    # Asegurar tipo media
    for e in events:
        if not e.get("type"):
            e["type"] = "media"
    render_event_timeline(events, title=title, max_items=max_items)
