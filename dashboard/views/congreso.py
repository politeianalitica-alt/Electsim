"""Presentación de la página Congreso & Actividad Institucional."""

from __future__ import annotations

import json

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.repositories.institutional import CongresoDashboardData
from dashboard.services.agenda_service import (
    EVENT_TYPE_COLORS,
    build_timeline_data,
    sort_by_importance,
)
from dashboard.services.institutional_service import (
    build_quality_inputs,
    load_live_comunicados,
    prepare_agenda_data,
    prepare_boe_data,
)
from dashboard.services.legislative_service import activity_kpis, build_legislative_laws_view
from dashboard.services.quality_service import reports_to_df, run_all_validations
from dashboard.services.tipi_service import (
    classify_text,
    get_top_topics_overview,
    get_topic_salience,
    topic_color,
    topic_label,
)
from dashboard.shared import (
    BG,
    BG2,
    BG3,
    BLUE,
    BORDER,
    CYAN,
    GREEN,
    MUTED,
    PURPLE,
    RED,
    TEXT,
    TEXT2,
    AMBER,
    COLORES_PARTIDOS,
)

PARTY_COLORS = {**COLORES_PARTIDOS, "OTROS": MUTED}


def sec_hdr(title: str, color: str = CYAN) -> None:
    st.markdown(
        f'<div style="display:flex;align-items:center;gap:.8rem;margin:1.5rem 0 .8rem">'
        f'<div style="width:4px;height:16px;background:{color};border-radius:2px"></div>'
        f'<div style="font-size:.68rem;font-weight:700;letter-spacing:.12em;color:{MUTED};text-transform:uppercase">{title}</div>'
        f'<div style="flex:1;height:1px;background:{BORDER}"></div>'
        f'</div>',
        unsafe_allow_html=True,
    )


def data_badge(real: bool, label: str = "") -> str:
    if real:
        return (
            f'<span style="font-size:.65rem;font-weight:700;color:{GREEN};background:{GREEN}18;'
            f'border:1px solid {GREEN}44;border-radius:3px;padding:.1rem .45rem">● DATOS REALES</span>'
        )
    return (
        f'<span style="font-size:.65rem;font-weight:700;color:{AMBER};background:{AMBER}18;'
        f'border:1px solid {AMBER}44;border-radius:3px;padding:.1rem .45rem" '
        f'title="Ejecuta ETL para poblar con datos reales">⚠ {label or "PENDIENTE ETL"}</span>'
    )


def _render_styles() -> None:
    st.markdown(
        f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(16px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:1; transform:scale(1); }}
    50%     {{ opacity:.5; transform:scale(.8); }}
}}
.boe-card {{
    background:{BG2}; border:1px solid {BORDER}; border-left:4px solid {BLUE};
    border-radius:10px; padding:.9rem 1.1rem; margin-bottom:.6rem;
    animation:fadeInUp .35s ease both; transition:box-shadow .2s ease;
}}
.boe-card:hover {{ box-shadow:0 0 14px rgba(0,212,255,0.07); }}
.boe-alta  {{ border-left-color:{RED}    !important; }}
.boe-media {{ border-left-color:{AMBER}  !important; }}
.boe-baja  {{ border-left-color:{BORDER} !important; }}
.data-card {{
    background:{BG2}; border:1px solid {BORDER}; border-radius:10px;
    padding:.9rem 1.1rem; margin-bottom:.7rem; animation:fadeInUp .35s ease both;
}}
.agenda-item {{
    background:{BG3}; border:1px solid {BORDER}; border-radius:8px;
    padding:.6rem .9rem; margin:.3rem 0; border-left:3px solid {CYAN};
}}
.badge {{
    display:inline-block; padding:.15rem .5rem; border-radius:4px;
    font-size:.7rem; font-weight:600; letter-spacing:.04em;
}}
.info-banner {{
    background:{BG2}; border:1px solid {BORDER}; border-radius:10px;
    padding:.8rem 1.1rem; margin-bottom:1rem;
    display:flex; justify-content:space-between; align-items:center;
}}
</style>
""",
        unsafe_allow_html=True,
    )


def _render_header(df_incidents: pd.DataFrame) -> None:
    st.markdown(
        f'<div style="position:relative;overflow:hidden;background:{BG2};border:1px solid {BORDER};'
        f'border-radius:16px;padding:2rem 2.5rem;margin-bottom:1.5rem;animation:fadeInUp .5s ease both">'
        f'<div style="position:absolute;top:-40px;right:-40px;width:220px;height:220px;border-radius:50%;'
        f'background:radial-gradient(circle,rgba(59,130,246,0.10) 0%,transparent 70%);pointer-events:none"></div>'
        f'<div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem;flex-wrap:wrap">'
        f'<div style="width:8px;height:8px;border-radius:50%;background:{CYAN};'
        f'animation:dotPulse 2s ease-in-out infinite;box-shadow:0 0 8px {CYAN}"></div>'
        f'<span style="font-size:.65rem;font-weight:700;letter-spacing:.16em;color:{CYAN};text-transform:uppercase">XV LEGISLATURA · EN TIEMPO REAL</span>'
        f'</div>'
        f'<h1 style="font-size:1.7rem;font-weight:800;color:{TEXT};margin:0 0 .3rem;letter-spacing:-.02em">Congreso & Actividad Institucional</h1>'
        f'<p style="color:{TEXT2};font-size:.88rem;margin:0">BOE · votaciones · agenda de decisores · iniciativas parlamentarias · comisiones</p>'
        f'</div>',
        unsafe_allow_html=True,
    )

    if df_incidents.empty:
        return

    crit = df_incidents[df_incidents["severity"] == "critical"]
    if crit.empty:
        return
    names = ", ".join(crit["source_id"].tolist()[:3])
    st.warning(f"⚠️ Fuentes con incidencias críticas: **{names}** — datos pueden estar incompletos.")


def render_boe_tab(data: CongresoDashboardData) -> None:
    boe_data = prepare_boe_data(data.boe_today)
    items = boe_data.items

    st.markdown(
        f'<div class="info-banner">'
        f'<div>'
        f'<span style="font-weight:700;font-size:.95rem;color:{TEXT}">Boletín Oficial del Estado</span>'
        f'<span style="margin-left:.8rem;font-size:.82rem;color:{MUTED}">'
        f'{pd.Timestamp.today().strftime("%A, %d de %B de %Y")} &nbsp;·&nbsp; {len(items)} disposiciones</span>'
        f'</div>'
        f'<div style="display:flex;gap:.5rem;align-items:center">'
        + data_badge(boe_data.is_real, "RSS EN VIVO")
        + f'</div></div>',
        unsafe_allow_html=True,
    )

    total_boe = len(items)
    alta = sum(1 for item in items if item.get("relevancia_politica") == "Alta")
    media = sum(1 for item in items if item.get("relevancia_politica") == "Media")
    baja = sum(1 for item in items if item.get("relevancia_politica") == "Baja")

    kb1, kb2, kb3, kb4 = st.columns(4)
    with kb1:
        st.metric("Disposiciones", total_boe)
    with kb2:
        st.metric("Relevancia Alta", alta)
    with kb3:
        st.metric("Relevancia Media", media)
    with kb4:
        st.metric("Relevancia Baja", baja)

    st.divider()

    secciones_boe = ["Todas"] + sorted({item.get("seccion", "BOE") for item in items})
    relevancia_opts = ["Todas", "Alta", "Media", "Baja"]
    f1, f2 = st.columns(2)
    seccion_sel = f1.selectbox("Filtrar por sección", secciones_boe)
    relevancia_sel = f2.selectbox("Filtrar por relevancia", relevancia_opts)

    visible_items = items
    if seccion_sel != "Todas":
        visible_items = [item for item in visible_items if item.get("seccion") == seccion_sel]
    if relevancia_sel != "Todas":
        visible_items = [item for item in visible_items if item.get("relevancia_politica") == relevancia_sel]

    for item in visible_items:
        relevancia = item.get("relevancia_politica", "Baja")
        rel_color = RED if relevancia == "Alta" else AMBER if relevancia == "Media" else MUTED
        css_rel = f"boe-{relevancia.lower()}"
        url = item.get("url", "")
        titulo = item.get("titulo", "")
        titulo_html = (
            f'<a href="{url}" target="_blank" style="font-weight:700;font-size:.9rem;color:{TEXT};text-decoration:none;line-height:1.4">{titulo}</a>'
            if url
            else f'<div style="font-weight:700;font-size:.9rem;color:{TEXT};line-height:1.4">{titulo}</div>'
        )
        topic_result = classify_text(f"{titulo} {item.get('resumen', '')}")
        topic_html = "".join(
            f'<span class="badge" style="background:{topic_color(topic)}22;color:{topic_color(topic)};'
            f'border:1px solid {topic_color(topic)}44;margin-right:3px">{topic_label(topic)}</span>'
            for topic in topic_result.topics[:2]
        )
        st.markdown(
            f'<div class="boe-card {css_rel}">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.4rem">'
            f'<div style="flex:1">'
            f'<span class="badge" style="background:{BG3};color:{CYAN};border:1px solid {BORDER};margin-right:.5rem">{item.get("numero", "BOE")}</span>'
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER}">{item.get("tipo", "Disposición")}</span>'
            f'</div>'
            f'<span class="badge" style="background:{rel_color}25;color:{rel_color};border:1px solid {rel_color}55;flex-shrink:0">Relevancia {relevancia}</span>'
            f'</div>'
            + titulo_html
            + f'<div style="font-size:.78rem;color:{MUTED};margin:.3rem 0">{item.get("organismo", "BOE")} &nbsp;&bull;&nbsp; {item.get("seccion", "")}</div>'
            f'<div style="font-size:.82rem;color:{TEXT2};line-height:1.5">{item.get("resumen", "")}</div>'
            + (f'<div style="margin-top:.4rem">{topic_html}</div>' if topic_result.topics[0] != "OTROS" else "")
            + f'</div>',
            unsafe_allow_html=True,
        )

    st.caption(
        f"Fuente: {boe_data.source_label}. Ejecuta `python -m etl.institucional.boe_rss` para persistir en BD."
    )


def render_votes_tab(data: CongresoDashboardData) -> None:
    df_vot = data.votes_recent
    is_votes_real = not df_vot.empty and "titulo" in df_vot.columns

    sec_hdr("Votaciones del Pleno")
    st.markdown(data_badge(is_votes_real, "EJECUTAR ETL CONGRESO"), unsafe_allow_html=True)
    st.markdown("")

    if not is_votes_real:
        st.info(
            "Sin votaciones en base de datos. Ejecuta `python -m etl.institucional.congreso_iniciativas` "
            "para importar iniciativas y votaciones desde la API del Congreso. En entornos normales "
            "usa `alembic upgrade head`; el script `0013_institucional_core.sql` queda como bootstrap "
            "manual legado para instalaciones antiguas."
        )
        return

    aprobadas = int((df_vot["resultado"] == "APROBADA").sum())
    rechazadas = int((df_vot["resultado"] == "RECHAZADA").sum())
    kv1, kv2, kv3 = st.columns(3)
    with kv1:
        st.metric("Votaciones (14d)", len(df_vot))
    with kv2:
        st.metric("Aprobadas", aprobadas)
    with kv3:
        st.metric("Rechazadas", rechazadas)

    sec_hdr("Línea Temporal", BLUE)
    fig_tl = go.Figure()
    for idx, row in df_vot.iterrows():
        color = GREEN if str(row.get("resultado", "")) == "APROBADA" else RED
        titulo_short = str(row.get("titulo", ""))[:60]
        fig_tl.add_trace(
            go.Scatter(
                x=[str(row.get("fecha", ""))[:10]],
                y=[idx],
                mode="markers+text",
                marker=dict(size=20, color=color, line=dict(color=BG2, width=2)),
                text=[str(row.get("resultado", ""))],
                textposition="middle right",
                textfont=dict(size=9, color=TEXT2),
                hovertemplate=(
                    f"<b>{str(row.get('fecha', ''))[:10]}</b><br>"
                    f"{titulo_short}<br>"
                    f"Resultado: <b>{row.get('resultado', '')}</b><br>"
                    f"A favor: {row.get('votos_favor', 0)} · En contra: {row.get('votos_contra', 0)}"
                    "<extra></extra>"
                ),
                showlegend=False,
            )
        )
    fig_tl.update_layout(
        height=max(220, len(df_vot) * 32),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(title=None, showgrid=False, tickfont=dict(size=10, color=TEXT2)),
        yaxis=dict(
            tickvals=list(range(len(df_vot))),
            ticktext=[
                str(df_vot.iloc[row_idx].get("titulo", ""))[:50]
                + ("..." if len(str(df_vot.iloc[row_idx].get("titulo", ""))) > 50 else "")
                for row_idx in range(len(df_vot))
            ],
            tickfont=dict(size=9, color=TEXT2),
            title=None,
        ),
        margin=dict(t=10, b=10, l=340, r=80),
        showlegend=False,
    )
    st.plotly_chart(fig_tl, use_container_width=True, key="congreso_votaciones_timeline")

    sec_hdr("Detalle por votación")
    for vote_idx, (_, row) in enumerate(df_vot.iterrows()):
        res = str(row.get("resultado", ""))
        res_color = GREEN if res == "APROBADA" else RED
        favor = int(row.get("votos_favor", 0) or 0)
        contra = int(row.get("votos_contra", 0) or 0)
        abstenciones = int(row.get("abstenciones", 0) or 0)
        total = favor + contra + abstenciones or 1
        pct_favor = favor / total * 100

        try:
            parties_favor = json.loads(row.get("parties_favor_json") or "[]")
        except Exception:
            parties_favor = []
        try:
            parties_contra = json.loads(row.get("parties_against_json") or "[]")
        except Exception:
            parties_contra = []

        favor_html = "".join(
            f'<span class="badge" style="background:{PARTY_COLORS.get(party, BG3)};color:#fff;margin-right:3px">{party}</span>'
            for party in parties_favor
        )
        contra_html = "".join(
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{party}</span>'
            for party in parties_contra
        )

        with st.expander(f"{str(row.get('fecha', ''))[:10]}  —  {str(row.get('titulo', ''))[:70]}"):
            col_i, col_d = st.columns([2, 1])
            with col_i:
                st.markdown(
                    f'<div>'
                    f'<span class="badge" style="background:{BG3};color:{CYAN};border:1px solid {BORDER};margin-right:.4rem">{row.get("tipo_votacion", "")}</span>'
                    f'<span class="badge" style="background:{res_color}25;color:{res_color};border:1px solid {res_color}55">{res}</span>'
                    f'</div>'
                    f'<div style="font-weight:700;color:{TEXT};margin:.5rem 0">{row.get("titulo", "")}</div>'
                    + (f'<div style="font-size:.75rem;color:{MUTED};margin-bottom:.2rem">A favor ({favor} votos)</div>{favor_html}' if favor_html else "")
                    + (f'<div style="font-size:.75rem;color:{MUTED};margin-top:.4rem;margin-bottom:.2rem">En contra ({contra} votos)</div>{contra_html}' if contra_html else "")
                    + f'<div style="margin-top:.6rem;border-radius:4px;overflow:hidden;height:8px;background:{BG3}">'
                    f'<div style="background:{GREEN};width:{pct_favor:.1f}%;height:8px;display:inline-block;border-radius:4px 0 0 4px"></div></div>'
                    f'<div style="display:flex;justify-content:space-between;font-size:.7rem;color:{MUTED};margin-top:.2rem">'
                    f'<span>A favor {pct_favor:.1f}%</span><span>Abs. {abstenciones}</span><span>En contra {100 - pct_favor - abstenciones / total * 100:.1f}%</span></div>',
                    unsafe_allow_html=True,
                )
                if row.get("implicaciones"):
                    st.markdown(
                        f'<div style="font-size:.82rem;color:{TEXT2};background:{BG3};border-radius:6px;padding:.5rem .8rem;margin-top:.4rem;border-left:3px solid {AMBER}">'
                        f'<b style="color:{AMBER}">Implicaciones:</b> {row["implicaciones"]}</div>',
                        unsafe_allow_html=True,
                    )
            with col_d:
                fig_d = go.Figure(
                    go.Pie(
                        labels=["A favor", "En contra", "Abstención"],
                        values=[favor, contra, abstenciones],
                        marker_colors=[GREEN, RED, AMBER],
                        hole=0.5,
                        textinfo="value",
                        textfont=dict(size=11, color=TEXT),
                    )
                )
                fig_d.update_layout(
                    height=200,
                    paper_bgcolor="rgba(0,0,0,0)",
                    margin=dict(t=5, b=5, l=5, r=5),
                    showlegend=True,
                    legend=dict(font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
                    annotations=[
                        dict(
                            text=f"{favor}/{total}",
                            x=0.5,
                            y=0.5,
                            font_size=11,
                            showarrow=False,
                            font_color=TEXT2,
                        )
                    ],
                )
                st.plotly_chart(
                    fig_d,
                    use_container_width=True,
                    key=f"congreso_votacion_pie_{vote_idx}",
                )


def render_agenda_tab(data: CongresoDashboardData) -> None:
    agenda_data = prepare_agenda_data(data.agenda_week)
    events = [event for event in agenda_data.events if str(event.title).strip()]

    sec_hdr("Agenda política — Qué pasa hoy / esta semana")
    st.markdown(
        data_badge(agenda_data.is_real) + f'&nbsp;<span style="font-size:.75rem;color:{MUTED}">Fuente: {agenda_data.source_label}</span>',
        unsafe_allow_html=True,
    )

    if not events:
        st.info("No hay eventos de agenda disponibles. Ejecuta `python -m etl.institucional.moncloa_agenda`.")
        return

    events_sorted = sort_by_importance(events)

    sec_hdr("Agenda crítica — Top eventos", RED)
    top_events = events_sorted[:6]
    cols = st.columns(min(3, len(top_events)))
    for idx, event in enumerate(top_events):
        with cols[idx % 3]:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {event.color}44;border-top:3px solid {event.color};'
                f'border-radius:8px;padding:.8rem;margin-bottom:.5rem">'
                f'<div style="font-size:.65rem;color:{event.color};font-weight:700;text-transform:uppercase;margin-bottom:.3rem">{event.event_type.replace("_", " ")}</div>'
                f'<div style="font-weight:700;font-size:.88rem;color:{TEXT};line-height:1.35;margin-bottom:.3rem">{event.title[:80]}</div>'
                f'<div style="font-size:.75rem;color:{MUTED}">{event.actor or event.institution} &nbsp;·&nbsp; {event.date[:10]} {event.time_start}</div>'
                f'<div style="font-size:.72rem;color:{MUTED};margin-top:.2rem">{event.location}</div>'
                f'<div style="margin-top:.4rem"><span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER}">imp. {event.importance_score}</span></div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    sec_hdr("Timeline por actor", BLUE)
    timeline_data = [
        row
        for row in build_timeline_data(events_sorted)
        if str(row.get("x", "")).strip() and str(row.get("y", "")).strip()
    ]

    if timeline_data:
        actores = sorted({row["y"] for row in timeline_data if row["y"]})
        actor_y = {actor: idx for idx, actor in enumerate(actores)}

        fig_tl = go.Figure()
        for row in timeline_data:
            y_pos = actor_y.get(row["y"], 0)
            fig_tl.add_trace(
                go.Scatter(
                    x=[row["x"]],
                    y=[y_pos],
                    mode="markers",
                    marker=dict(
                        size=max(10, min(24, row["importance"] // 4)),
                        color=row["color"],
                        line=dict(color=BG2, width=1.5),
                    ),
                    hovertemplate=(
                        f"<b>{row['y']}</b><br>"
                        f"{row['titulo'][:70]}<br>"
                        f"Tipo: {row['tipo'].replace('_', ' ')}<br>"
                        f"Lugar: {row['lugar'] or '—'}<br>"
                        f"Importancia: {row['importance']}"
                        "<extra></extra>"
                    ),
                    showlegend=False,
                )
            )

        fig_tl.update_layout(
            height=max(300, len(actores) * 45),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title=None, showgrid=False, tickfont=dict(size=9, color=TEXT2)),
            yaxis=dict(
                tickvals=list(actor_y.values()),
                ticktext=list(actor_y.keys()),
                tickfont=dict(size=10, color=TEXT2),
                title=None,
                gridcolor=BORDER,
            ),
            margin=dict(t=10, b=10, l=180, r=20),
            showlegend=False,
        )
        st.plotly_chart(fig_tl, use_container_width=True, key="congreso_agenda_timeline")

    sec_hdr("Todos los eventos")
    fuentes_disp = sorted({event.institution or event.source for event in events_sorted if event.institution or event.source})
    tipos_disp = sorted({event.event_type for event in events_sorted})
    f1, f2 = st.columns(2)
    fuente_sel = f1.selectbox("Fuente", ["Todas"] + fuentes_disp, key="ag_fuente")
    tipo_sel = f2.selectbox("Tipo de acto", ["Todos"] + tipos_disp, key="ag_tipo")

    filtered = [
        event
        for event in events_sorted
        if (fuente_sel == "Todas" or event.institution == fuente_sel or event.source == fuente_sel)
        and (tipo_sel == "Todos" or event.event_type == tipo_sel)
    ]

    for event in filtered[:60]:
        enlace = event.source_url
        st.markdown(
            f'<div class="agenda-item" style="border-left-color:{event.color}">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.8rem">'
            f'<div style="flex:1">'
            f'<div style="font-size:.73rem;color:{MUTED}">{event.date[:10]} {event.time_start} · {event.institution}</div>'
            f'<div style="font-size:.9rem;font-weight:700;color:{TEXT};margin-top:.12rem">{event.title}</div>'
            + (f'<div style="font-size:.8rem;color:{TEXT2};margin-top:.2rem">{event.description[:180]}</div>' if event.description else "")
            + f'</div><div style="text-align:right;flex-shrink:0">'
            f'<span class="badge" style="background:{event.color}20;color:{event.color};border:1px solid {event.color}44">{event.event_type.replace("_", " ")}</span>'
            + (f'<div style="margin-top:.3rem"><a href="{enlace}" target="_blank" style="font-size:.72rem;color:{CYAN};text-decoration:none">Fuente</a></div>' if enlace else "")
            + f'</div></div></div>',
            unsafe_allow_html=True,
        )

    sec_hdr("Distribución por tipo de acto", BLUE)
    tipo_count: dict[str, int] = {}
    for event in events_sorted:
        tipo_count[event.event_type] = tipo_count.get(event.event_type, 0) + 1
    tipo_ord = sorted(tipo_count.items(), key=lambda item: item[1], reverse=True)
    fig_tc = go.Figure(
        go.Bar(
            x=[item[0].replace("_", " ") for item in tipo_ord],
            y=[item[1] for item in tipo_ord],
            marker_color=[EVENT_TYPE_COLORS.get(item[0], MUTED) for item in tipo_ord],
            text=[item[1] for item in tipo_ord],
            textposition="outside",
            textfont=dict(color=TEXT2, size=10),
        )
    )
    fig_tc.update_layout(
        height=280,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
        yaxis=dict(title="Nº actos", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
        margin=dict(t=10, b=10),
        showlegend=False,
    )
    st.plotly_chart(fig_tc, use_container_width=True, key="congreso_agenda_tipos")


def render_comunicados_tab() -> None:
    sec_hdr("Comunicados y Notas Oficiales")
    df_com = load_live_comunicados(limit=30)
    if df_com.empty:
        st.info("No se pudieron cargar comunicados en tiempo real.")
        return

    fuentes = ["Todas"] + sorted(df_com["fuente"].dropna().unique().tolist())
    fuente_sel = st.selectbox("Filtrar por fuente oficial", fuentes, key="com_fuente")
    if fuente_sel != "Todas":
        df_com = df_com[df_com["fuente"] == fuente_sel]
    st.metric("Comunicados monitorizados", len(df_com))
    for _, row in df_com.iterrows():
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {CYAN};border-radius:8px;padding:.7rem .9rem;margin-bottom:.5rem">'
            f'<div style="font-weight:700;color:{TEXT};font-size:.9rem">{row.get("titulo", "")}</div>'
            f'<div style="font-size:.75rem;color:{MUTED};margin:.25rem 0">{row.get("fuente", "—")} · {row.get("fecha", "")}</div>'
            f'<div style="font-size:.8rem;color:{TEXT2};line-height:1.45">{row.get("cita", row.get("resumen", ""))}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


def render_laws_tab(data: CongresoDashboardData) -> None:
    sec_hdr("Iniciativas y actividad legislativa — datos reales de la API del Congreso")
    kpis = activity_kpis(data.activity_long)

    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.metric("Registros legislativos", kpis["total"])
    with k2:
        st.metric("Partidos con actividad", kpis["partidos"])
    with k3:
        st.metric("Tipos de iniciativa", kpis["tipos"])
    with k4:
        st.metric("Partido más activo", kpis["mas_activo"])

    leyes = build_legislative_laws_view(data.activity_long, data.votes_long)
    if leyes.empty:
        st.info("Sin normas legislativas recientes. Ejecuta `python -m etl.sources.congreso_api`.")
        return

    sec_hdr("Volumen legislativo por partido", BLUE)
    leyes_partidos = leyes[leyes["partido_siglas"] != "N/A"].copy()
    if not leyes_partidos.empty:
        por_partido = (
            leyes_partidos.groupby("partido_siglas")
            .size()
            .reset_index(name="n_normas")
            .sort_values("n_normas", ascending=False)
            .head(12)
        )
        fig_lp = go.Figure(
            go.Bar(
                x=por_partido["partido_siglas"],
                y=por_partido["n_normas"],
                marker_color=[PARTY_COLORS.get(partido, MUTED) for partido in por_partido["partido_siglas"]],
                text=por_partido["n_normas"],
                textposition="outside",
            )
        )
        fig_lp.update_layout(
            height=280,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(tickfont=dict(color=TEXT2, size=10)),
            yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9), title="Nº normas"),
            margin=dict(t=10, b=10),
            showlegend=False,
        )
        st.plotly_chart(fig_lp, use_container_width=True, key="congreso_leyes_partidos")

    sec_hdr("Detalle de normas recientes")
    for _, row in leyes.head(30).iterrows():
        partido = str(row.get("partido_siglas", "N/A"))
        estado = str(row.get("estado", "Registro"))
        st.markdown(
            f'<div class="data-card" style="border-left:3px solid {BLUE}">'
            f'<div style="display:flex;justify-content:space-between;gap:.8rem;align-items:flex-start">'
            f'<div style="flex:1">'
            f'<div style="font-weight:700;color:{TEXT};font-size:.92rem">{row.get("titulo_norma", "")}</div>'
            f'<div style="font-size:.77rem;color:{MUTED};margin-top:.2rem">'
            f'{row.get("fecha_norma_label", "")} · {row.get("tipo", "")} · {partido}</div>'
            f'</div>'
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER}">{estado}</span>'
            f'</div></div>',
            unsafe_allow_html=True,
        )


def render_commissions_tab(data: CongresoDashboardData) -> None:
    sec_hdr("Actividad de comisiones — datos reales")
    act = data.activity_long
    if act.empty:
        st.info("No hay actividad. Ejecuta `python -m etl.sources.congreso_api`.")
        return

    act2 = act.copy()
    act2["tipo_acto"] = act2["tipo_acto"].astype(str)
    comisiones = act2[act2["tipo_acto"].str.contains("comisi", case=False, na=False)]
    if comisiones.empty:
        st.info("La BD no contiene filas etiquetadas como comisión todavía.")
        return

    por_comision = (
        comisiones.groupby("titulo")
        .agg(
            ultimo_movimiento=("fecha", "max"),
            n_registros=("titulo", "count"),
            partidos=("partido_siglas", lambda s: ", ".join(sorted({str(item) for item in s if pd.notna(item)}))),
        )
        .reset_index()
        .sort_values("ultimo_movimiento", ascending=False)
    )
    k1, k2, k3 = st.columns(3)
    with k1:
        st.metric("Comisiones detectadas", int(len(por_comision)))
    with k2:
        reciente = pd.to_datetime(comisiones["fecha"], errors="coerce") >= (pd.Timestamp.utcnow() - pd.Timedelta(days=90))
        st.metric("Actividad 90d", int(reciente.sum()))
    with k3:
        st.metric("Registros totales", int(len(comisiones)))

    sec_hdr("Detalle por comisión")
    for _, row in por_comision.head(30).iterrows():
        st.markdown(
            f'<div class="data-card" style="border-left:3px solid {PURPLE}">'
            f'<div style="font-weight:700;color:{TEXT};font-size:.92rem">{row["titulo"]}</div>'
            f'<div style="font-size:.78rem;color:{MUTED};margin-top:.2rem">Último movimiento: {str(row["ultimo_movimiento"])[:10]} · Registros: {int(row["n_registros"])}</div>'
            f'<div style="font-size:.8rem;color:{TEXT2};margin-top:.35rem">Partidos: {row["partidos"] or "N/D"}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    sec_hdr("Actividad de comisiones por partido", BLUE)
    por_partido = (
        comisiones.groupby("partido_siglas")
        .size()
        .reset_index(name="n")
        .sort_values("n", ascending=False)
        .head(12)
    )
    fig_cp = go.Figure(
        go.Bar(
            x=por_partido["partido_siglas"],
            y=por_partido["n"],
            marker_color=[PARTY_COLORS.get(str(partido), MUTED) for partido in por_partido["partido_siglas"]],
            text=por_partido["n"],
            textposition="outside",
        )
    )
    fig_cp.update_layout(
        height=280,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(tickfont=dict(color=TEXT2, size=10)),
        yaxis=dict(title="Nº registros", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
        margin=dict(t=10, b=10),
        showlegend=False,
    )
    st.plotly_chart(fig_cp, use_container_width=True, key="congreso_comisiones_partidos")


def render_topics_tab(data: CongresoDashboardData) -> None:
    sec_hdr("Radar temático — clasificación TIPI de actividad legislativa", CYAN)
    st.markdown(
        f'<div style="font-size:.78rem;color:{MUTED};margin-bottom:1rem">'
        f'Clasificación temática inspirada en el <b>TIPI Engine</b> de Political Watch. '
        f'Cada iniciativa del Congreso, publicación BOE y votación se clasifica automáticamente '
        f'en las 24 áreas de política pública de la taxonomía TIPI.</div>',
        unsafe_allow_html=True,
    )

    sec_hdr("Distribución temática (BOE + iniciativas)", BLUE)
    overview = get_top_topics_overview(
        df_boe=data.boe_week if not data.boe_week.empty else None,
        df_initiatives=data.activity_topic_window if not data.activity_topic_window.empty else None,
    )
    if overview.empty:
        st.info("Sin datos para clasificar. Ejecuta los ETLs institucionales primero.")
    else:
        top_k = min(15, len(overview))
        fig_tipi = go.Figure(
            go.Bar(
                x=overview["total"].head(top_k).tolist()[::-1],
                y=overview["topic_label"].head(top_k).tolist()[::-1],
                orientation="h",
                marker_color=overview["color"].head(top_k).tolist()[::-1],
                text=overview["total"].head(top_k).tolist()[::-1],
                textposition="outside",
                textfont=dict(color=TEXT2, size=10),
                hovertemplate="<b>%{y}</b><br>Total: %{x}<br><extra></extra>",
            )
        )
        fig_tipi.update_layout(
            height=max(350, top_k * 28),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title="Nº menciones", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
            yaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
            margin=dict(t=10, b=10, l=10, r=60),
            showlegend=False,
        )
        st.plotly_chart(fig_tipi, use_container_width=True, key="congreso_tipi_overview")

        col_b, col_i = st.columns(2)
        with col_b:
            st.metric("Temas activos en BOE", int(overview["n_boe"].gt(0).sum()))
        with col_i:
            st.metric("Temas activos en Congreso", int(overview["n_initiatives"].gt(0).sum()))

    if not data.activity_topic_window.empty:
        sec_hdr("Saliencia temática por partido", PURPLE)
        st.markdown(
            f'<div style="font-size:.76rem;color:{MUTED};margin-bottom:.6rem">'
            f'% de iniciativas de cada partido por área temática — mide en qué temas se enfoca cada grupo parlamentario.</div>',
            unsafe_allow_html=True,
        )
        salience = get_topic_salience(data.activity_topic_window)
        if not salience.empty:
            partidos = sorted(salience["partido_siglas"].unique().tolist())
            partido_sel = st.selectbox("Partido", ["Todos"] + partidos, key="tipi_partido")
            salience_view = salience if partido_sel == "Todos" else salience[salience["partido_siglas"] == partido_sel]
            top_rows = salience_view.head(30)
            st.dataframe(
                top_rows[["partido_siglas", "topic_label", "n", "pct"]].rename(
                    columns={
                        "partido_siglas": "Partido",
                        "topic_label": "Tema",
                        "n": "Iniciativas",
                        "pct": "% del partido",
                    }
                ),
                use_container_width=True,
                hide_index=True,
            )

    sec_hdr("Clasificador temático interactivo", AMBER)
    texto_check = st.text_area(
        "Pega aquí el título o descripción de una iniciativa:",
        height=80,
        key="tipi_texto",
        placeholder="Ej: Proposición de Ley para la regulación de los precios del alquiler en zonas tensionadas...",
    )
    if not texto_check:
        return

    result = classify_text(texto_check)
    topic_cols = st.columns(min(3, len(result.topics)))
    for idx, topic in enumerate(result.topics[:3]):
        with topic_cols[idx]:
            tc_color = topic_color(topic)
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {tc_color}44;'
                f'border-top:3px solid {tc_color};border-radius:8px;padding:.7rem .9rem">'
                f'<div style="font-size:.65rem;color:{tc_color};font-weight:700;margin-bottom:.2rem">TEMA {idx + 1}</div>'
                f'<div style="font-weight:700;color:{TEXT};font-size:.9rem">{topic_label(topic)}</div>'
                f'<div style="font-size:.72rem;color:{MUTED};margin-top:.2rem">Score: {result.scores.get(topic, 0):.0f}/100</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    if result.matched_keywords:
        st.caption(f"Keywords detectadas: {', '.join(result.matched_keywords[:8])}")


def render_etl_tab(data: CongresoDashboardData) -> None:
    sec_hdr("Estado de fuentes institucionales", CYAN)

    institucional_sources = [
        ("boe", "boe", "https://www.boe.es/rss/boe.php", "python -m etl.institucional.boe_rss"),
        ("moncloa", "agenda", "Moncloa HTML + RSS", "python -m etl.institucional.moncloa_agenda"),
        ("congreso", "congreso", "https://www.congreso.es/opendata/api", "python -m etl.institucional.congreso_iniciativas"),
        ("senado", "senado", "https://www.senado.es/datosabiertos", "python -m etl.sources.senado_api"),
    ]

    df_health = data.source_health
    df_incidents = data.scraper_incidents

    for source_id, source_type, _url, command in institucional_sources:
        row_health = df_health[df_health["source_id"] == source_id] if not df_health.empty else pd.DataFrame()
        if not row_health.empty:
            sh = row_health.iloc[0]
            sc = {"ok": GREEN, "degraded": AMBER, "failing": RED}.get(str(sh.get("status", "unknown")), MUTED)
            lag = sh.get("freshness_lag_s")
            lag_txt = f"{int(lag) // 60} min" if lag and lag < 3600 else (f"{int(lag) // 3600} h" if lag else "—")
            status_html = f'<span style="color:{sc};font-weight:700">{str(sh.get("status", "")).upper()}</span> · {sh.get("articles_count", 0)} items · lag: {lag_txt}'
        else:
            status_html = f'<span style="color:{MUTED}">Sin datos — ejecutar ETL</span>'

        st.markdown(
            f'<div style="display:flex;align-items:center;gap:.8rem;padding:.55rem .8rem;'
            f'background:{BG2};border:1px solid {BORDER};border-radius:6px;margin-bottom:.3rem">'
            f'<span style="font-size:.85rem;color:{TEXT};font-weight:600;flex:1">{source_id}</span>'
            f'<span style="font-size:.73rem;color:{MUTED}">{source_type}</span>'
            f'<span style="font-size:.75rem;color:{TEXT2}">{status_html}</span>'
            f'<code style="font-size:.68rem;color:{CYAN};background:{BG3};padding:.1rem .35rem;border-radius:3px">{command}</code>'
            f'</div>',
            unsafe_allow_html=True,
        )

    if not df_incidents.empty:
        inst_inc = df_incidents[df_incidents["source_id"].isin([item[0] for item in institucional_sources])]
        if not inst_inc.empty:
            sec_hdr("Incidencias activas", RED)
            for _, inc in inst_inc.iterrows():
                sc = RED if inc.get("severity") == "critical" else AMBER if inc.get("severity") == "major" else MUTED
                st.markdown(
                    f'<div style="padding:.5rem .8rem;background:{BG2};border:1px solid {sc}44;'
                    f'border-left:3px solid {sc};border-radius:6px;margin-bottom:.3rem">'
                    f'<span style="font-weight:700;font-size:.82rem;color:{sc}">[{str(inc.get("severity", "")).upper()}]</span>'
                    f' <span style="font-size:.82rem;color:{TEXT}">{inc.get("source_id", "")} — {inc.get("error_type", "")}</span>'
                    f'<span style="font-size:.72rem;color:{MUTED};float:right">{str(inc.get("last_seen", ""))[:16]}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.success("Sin incidencias activas.")

    sec_hdr("Validación de calidad de datos", AMBER)
    quality_inputs = build_quality_inputs(
        boe_df=data.boe_today,
        agenda_df=data.agenda_quality,
        votes_df=data.votes_quality,
    )
    if quality_inputs:
        reports = run_all_validations(**quality_inputs)
        quality_df = reports_to_df(reports)
        for _, row in quality_df.iterrows():
            sc = GREEN if row["estado"] == "PASS" else AMBER if row["estado"] == "WARN" else RED
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.8rem;padding:.5rem .8rem;'
                f'background:{BG2};border:1px solid {BORDER};border-radius:6px;margin-bottom:.3rem">'
                f'<span style="font-size:.82rem;color:{TEXT};font-weight:600;flex:1">{row["fuente"]}</span>'
                f'<span class="badge" style="background:{sc}22;color:{sc};border:1px solid {sc}44">{row["estado"]}</span>'
                f'<span style="font-size:.76rem;color:{MUTED}">Score: {row["score"]}/100</span>'
                f'<span style="font-size:.72rem;color:{TEXT2}">✓{row["passed"]} ⚠{row["warned"]} ✗{row["failed"]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
            if row["detalle"]:
                st.caption(f"  ↳ {row['detalle'][:150]}")
    else:
        st.info("Sin datos en BD para validar. Ejecuta los ETLs primero.")

    st.divider()
    st.markdown(
        f'<div style="font-size:.8rem;color:{MUTED}">'
        f'Esquema oficial: <code>alembic upgrade head</code>. '
        f'Bootstrap legado: <code>db/migrations/0013_institucional_core.sql</code>'
        f'</div>',
        unsafe_allow_html=True,
    )


def render_congreso_page(data: CongresoDashboardData) -> None:
    """Render completo de la página institucional a partir de un payload tipado."""
    _render_styles()
    _render_header(data.scraper_incidents)

    tab_boe, tab_votaciones, tab_agenda, tab_comunicados, tab_leyes, tab_comisiones, tab_temas, tab_etl = st.tabs(
        [
            "◈  BOE de Hoy",
            "◉  Votaciones",
            "◎  Agenda Decisores",
            "⬡  Comunicados",
            "◈  Leyes & Actividad",
            "◉  Comisiones",
            "⬢  Temas TIPI",
            "⚙  Estado ETL",
        ]
    )

    with tab_boe:
        render_boe_tab(data)
    with tab_votaciones:
        render_votes_tab(data)
    with tab_agenda:
        render_agenda_tab(data)
    with tab_comunicados:
        render_comunicados_tab()
    with tab_leyes:
        render_laws_tab(data)
    with tab_comisiones:
        render_commissions_tab(data)
    with tab_temas:
        render_topics_tab(data)
    with tab_etl:
        render_etl_tab(data)
