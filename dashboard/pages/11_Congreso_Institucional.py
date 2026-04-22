"""
Página: Congreso & Actividad Institucional
BOE, votaciones, agenda de decisores, iniciativas, comisiones.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
    COLORES_PARTIDOS, color_partido,
)

from dashboard.db import (
    cargar_actividad_reciente_congreso,
    cargar_stats_legislativas,
    cargar_boe_publicaciones,
    cargar_agenda_institucional,
    cargar_votaciones_pleno,
    cargar_dm_actividad_legislativa,
    cargar_source_health,
    cargar_scraper_incidents,
)
from dashboard.services.boe_service import normalize_boe_item, items_to_dicts, score_relevance
from dashboard.services.agenda_service import (
    normalize_agenda_event,
    build_timeline_data,
    sort_by_importance,
    EVENT_TYPE_COLORS,
)
from dashboard.services.legislative_service import activity_kpis, build_legislative_laws_view
from dashboard.services.tipi_service import (
    classify_text, tag_initiative, get_top_topics_overview,
    get_topic_salience, topic_color, topic_label, TIPI_TOPICS,
)
from dashboard.services.quality_service import (
    validate_boe, validate_agenda, validate_parliamentary_votes,
    run_all_validations, reports_to_df,
)
from etl.sources.agendas_dinamicas import fetch_all_agendas

ORANGE = "#F97316"
PARTY_COLORS = {**COLORES_PARTIDOS, "OTROS": MUTED}

# ── Helpers UI ────────────────────────────────────────────────────────────────

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


def _txt(value: object) -> str:
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass
    return str(value).strip()


def _date_label(value: object) -> str:
    txt = _txt(value)
    if not txt:
        return ""
    parsed = pd.to_datetime(txt, errors="coerce")
    if pd.notna(parsed):
        if parsed.hour or parsed.minute:
            return parsed.strftime("%Y-%m-%d %H:%M")
        return parsed.strftime("%Y-%m-%d")
    return txt[:16]


def _normalize_live_agenda_rows(rows: list[dict] | None, limit: int | None = None) -> list[dict[str, str]]:
    cleaned: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()

    for raw in rows or []:
        if not isinstance(raw, dict):
            continue
        titulo = _txt(raw.get("titulo") or raw.get("title") or raw.get("name"))
        if not titulo:
            continue
        fuente = _txt(raw.get("fuente") or raw.get("institution") or raw.get("source")) or "Fuente oficial"
        fecha = _date_label(raw.get("fecha") or raw.get("fecha_publicacion") or raw.get("date"))
        key = (titulo.lower(), fuente.lower(), fecha)
        if key in seen:
            continue
        seen.add(key)
        resumen = _txt(raw.get("resumen") or raw.get("cita") or raw.get("description") or raw.get("summary"))
        enlace = _txt(raw.get("enlace") or raw.get("url") or raw.get("link"))
        cleaned.append(
            {
                "titulo": titulo,
                "actor": _txt(raw.get("actor") or raw.get("main_actor") or fuente),
                "fuente": fuente,
                "fecha": fecha,
                "tipo": _txt(raw.get("tipo") or raw.get("event_type")),
                "lugar": _txt(raw.get("lugar") or raw.get("location")),
                "cita": resumen,
                "resumen": resumen or "Comunicación oficial agenda/actividad institucional.",
                "enlace": enlace,
                "url": enlace,
            }
        )

    return cleaned[:limit] if limit is not None else cleaned


@st.cache_data(ttl=3600)
def _boe_rss_fallback(limit: int = 20) -> list[dict]:
    """Lee BOE directamente del RSS como fallback cuando la BD está vacía."""
    import feedparser, re
    FEEDS = ["https://www.boe.es/rss/boe.php", "https://www.boe.es/rss/diario_boe.xml"]
    seen: dict[str, dict] = {}
    for url in FEEDS:
        try:
            feed = feedparser.parse(url)
            for e in getattr(feed, "entries", [])[:limit]:
                titulo = re.sub(r"<[^>]+>", " ", str(getattr(e, "title", ""))).strip()
                if not titulo or titulo in seen:
                    continue
                resumen = re.sub(r"<[^>]+>", " ", str(getattr(e, "summary", ""))).strip()
                item = normalize_boe_item({"titulo": titulo, "resumen": resumen,
                                           "url": getattr(e, "link", "")}, source="rss_live")
                seen[titulo] = {
                    "seccion": item.seccion, "organismo": item.organismo,
                    "tipo": item.tipo, "numero": item.numero,
                    "titulo": item.titulo, "resumen": item.resumen,
                    "relevancia_politica": item.relevancia_politica,
                    "url": item.url, "source": "rss_live",
                }
        except Exception:
            continue
    result = list(seen.values())
    result.sort(key=lambda x: {"Alta": 2, "Media": 1, "Baja": 0}.get(x["relevancia_politica"], 0), reverse=True)
    return result[:limit]


@st.cache_data(ttl=3600)
def _comunicados_live(limit: int = 25) -> pd.DataFrame:
    rows = _normalize_live_agenda_rows(
        fetch_all_agendas(max_items_per_source=max(6, limit // 4)),
        limit=limit,
    )
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    for col in ["titulo", "fuente", "fecha", "resumen", "cita", "url"]:
        if col not in df.columns:
            df[col] = ""
    df["resumen"] = df["resumen"].replace("", "Comunicación oficial agenda/actividad institucional.")
    return df.drop_duplicates(subset=["titulo", "fuente", "fecha"]).head(limit)


# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Congreso — ElectSim", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("11_Congreso_Institucional")

tabs_nav_11 = st.columns([1, 1, 6])
with tabs_nav_11[0]:
    st.page_link("pages/11_Congreso_Institucional.py", label="Congreso", icon="◉")
with tabs_nav_11[1]:
    st.page_link("pages/15_Agenda_Lideres.py", label="Agenda líderes", icon="▣")

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
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
""", unsafe_allow_html=True)

# ── Carga de health para badges ───────────────────────────────────────────────
df_health    = cargar_source_health()
df_incidents = cargar_scraper_incidents(solo_activos=True)
boe_health   = df_health[df_health["source_type"] == "boe"].head(1) if not df_health.empty else pd.DataFrame()
agenda_health = df_health[df_health["source_type"] == "agenda"].head(1) if not df_health.empty else pd.DataFrame()

# ── Header ────────────────────────────────────────────────────────────────────
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

# Alertas críticas de ETL
if not df_incidents.empty:
    crit = df_incidents[df_incidents["severity"] == "critical"]
    if not crit.empty:
        names = ", ".join(crit["source_id"].tolist()[:3])
        st.warning(f"⚠️ Fuentes con incidencias críticas: **{names}** — datos pueden estar incompletos.")

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_boe, tab_votaciones, tab_agenda, tab_comunicados, tab_leyes, tab_comisiones, tab_temas, tab_etl = st.tabs([
    "◈  BOE de Hoy",
    "◉  Votaciones",
    "◎  Agenda Decisores",
    "⬡  Comunicados",
    "◈  Leyes & Actividad",
    "◉  Comisiones",
    "⬢  Temas TIPI",
    "⚙  Estado ETL",
])

# ── Tab 1: BOE ────────────────────────────────────────────────────────────────
with tab_boe:
    df_boe = cargar_boe_publicaciones(dias=1, limit=40)
    boe_data: list[dict]
    is_boe_real = not df_boe.empty

    if is_boe_real:
        boe_data = df_boe.to_dict("records")
        # Normalizar columnas al esquema que usa la UI
        for item in boe_data:
            item.setdefault("seccion", item.get("seccion", "BOE"))
            item.setdefault("organismo", item.pop("departamento", "BOE"))
            item.setdefault("tipo", item.pop("tipo_norma", "Disposición"))
            item.setdefault("numero", item.pop("boe_no", "BOE") or "BOE")
            item.setdefault("relevancia_politica", item.get("relevancia", "Baja"))
            item.setdefault("resumen", item.get("resumen") or "Publicación oficial en BOE.")
            item.setdefault("url", item.pop("url_html", ""))
    else:
        boe_data = _boe_rss_fallback(limit=20)

    st.markdown(
        f'<div class="info-banner">'
        f'<div>'
        f'<span style="font-weight:700;font-size:.95rem;color:{TEXT}">Boletín Oficial del Estado</span>'
        f'<span style="margin-left:.8rem;font-size:.82rem;color:{MUTED}">'
        f'{pd.Timestamp.today().strftime("%A, %d de %B de %Y")} &nbsp;·&nbsp; {len(boe_data)} disposiciones</span>'
        f'</div>'
        f'<div style="display:flex;gap:.5rem;align-items:center">'
        + data_badge(is_boe_real, "RSS EN VIVO")
        + f'</div></div>',
        unsafe_allow_html=True,
    )

    total_boe = len(boe_data)
    alta  = sum(1 for b in boe_data if b.get("relevancia_politica") == "Alta")
    media = sum(1 for b in boe_data if b.get("relevancia_politica") == "Media")
    baja  = sum(1 for b in boe_data if b.get("relevancia_politica") == "Baja")

    kb1, kb2, kb3, kb4 = st.columns(4)
    with kb1: st.metric("Disposiciones", total_boe)
    with kb2: st.metric("Relevancia Alta", alta)
    with kb3: st.metric("Relevancia Media", media)
    with kb4: st.metric("Relevancia Baja", baja)

    st.divider()

    secciones_boe   = ["Todas"] + sorted({b.get("seccion", "BOE") for b in boe_data})
    relevancia_opts = ["Todas", "Alta", "Media", "Baja"]
    f1, f2 = st.columns(2)
    seccion_sel    = f1.selectbox("Filtrar por sección", secciones_boe)
    relevancia_sel = f2.selectbox("Filtrar por relevancia", relevancia_opts)

    boe_mostrar = boe_data
    if seccion_sel != "Todas":
        boe_mostrar = [b for b in boe_mostrar if b.get("seccion") == seccion_sel]
    if relevancia_sel != "Todas":
        boe_mostrar = [b for b in boe_mostrar if b.get("relevancia_politica") == relevancia_sel]

    for item in boe_mostrar:
        rel       = item.get("relevancia_politica", "Baja")
        rel_color = RED if rel == "Alta" else AMBER if rel == "Media" else MUTED
        css_rel   = f"boe-{rel.lower()}"
        url       = item.get("url", "")
        titulo_html = (
            f'<a href="{url}" target="_blank" style="font-weight:700;font-size:.9rem;color:{TEXT};text-decoration:none;line-height:1.4">{item["titulo"]}</a>'
            if url else
            f'<div style="font-weight:700;font-size:.9rem;color:{TEXT};line-height:1.4">{item["titulo"]}</div>'
        )
        # TIPI topic classification
        _tipi = classify_text(f"{item['titulo']} {item.get('resumen','')}")
        _tipi_html = "".join(
            f'<span class="badge" style="background:{topic_color(t)}22;color:{topic_color(t)};'
            f'border:1px solid {topic_color(t)}44;margin-right:3px">{topic_label(t)}</span>'
            for t in _tipi.topics[:2]
        )
        st.markdown(
            f'<div class="boe-card {css_rel}">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.4rem">'
            f'<div style="flex:1">'
            f'<span class="badge" style="background:{BG3};color:{CYAN};border:1px solid {BORDER};margin-right:.5rem">{item.get("numero","BOE")}</span>'
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER}">{item.get("tipo","Disposición")}</span>'
            f'</div>'
            f'<span class="badge" style="background:{rel_color}25;color:{rel_color};border:1px solid {rel_color}55;flex-shrink:0">Relevancia {rel}</span>'
            f'</div>'
            + titulo_html +
            f'<div style="font-size:.78rem;color:{MUTED};margin:.3rem 0">{item.get("organismo","BOE")} &nbsp;&bull;&nbsp; {item.get("seccion","")}</div>'
            f'<div style="font-size:.82rem;color:{TEXT2};line-height:1.5">{item.get("resumen","")}</div>'
            + (f'<div style="margin-top:.4rem">{_tipi_html}</div>' if _tipi.topics[0] != "OTROS" else "")
            + f'</div>',
            unsafe_allow_html=True,
        )

    src_label = "Tabla boe_publication" if is_boe_real else "RSS boe.es en vivo (sin persistencia)"
    st.caption(f"Fuente: {src_label}. Ejecuta `python -m etl.institucional.boe_rss` para persistir en BD.")

# ── Tab 2: Votaciones ─────────────────────────────────────────────────────────
with tab_votaciones:
    df_vot = cargar_votaciones_pleno(dias=14, limit=25)
    is_votes_real = not df_vot.empty and "titulo" in df_vot.columns

    sec_hdr("Votaciones del Pleno")
    st.markdown(data_badge(is_votes_real, "EJECUTAR ETL CONGRESO"), unsafe_allow_html=True)
    st.markdown("")

    if not is_votes_real:
        st.info(
            "Sin votaciones en base de datos. Ejecuta `python -m etl.institucional.congreso_iniciativas` "
            "para importar iniciativas y votaciones desde la API del Congreso, o aplica la migración "
            "`0013_institucional_core.sql` y pobla `parliamentary_vote`."
        )
    else:
        aprobadas  = int((df_vot["resultado"] == "APROBADA").sum())
        rechazadas = int((df_vot["resultado"] == "RECHAZADA").sum())
        kv1, kv2, kv3 = st.columns(3)
        with kv1: st.metric("Votaciones (14d)", len(df_vot))
        with kv2: st.metric("Aprobadas", aprobadas)
        with kv3: st.metric("Rechazadas", rechazadas)

        sec_hdr("Línea Temporal", BLUE)
        fig_tl = go.Figure()
        for i, row in df_vot.iterrows():
            color = GREEN if str(row.get("resultado", "")) == "APROBADA" else RED
            titulo_short = str(row.get("titulo", ""))[:60]
            fig_tl.add_trace(go.Scatter(
                x=[str(row.get("fecha", ""))[:10]],
                y=[i],
                mode="markers+text",
                marker=dict(size=20, color=color, line=dict(color=BG2, width=2)),
                text=[str(row.get("resultado", ""))],
                textposition="middle right",
                textfont=dict(size=9, color=TEXT2),
                hovertemplate=(
                    f"<b>{str(row.get('fecha',''))[:10]}</b><br>"
                    f"{titulo_short}<br>"
                    f"Resultado: <b>{row.get('resultado','')}</b><br>"
                    f"A favor: {row.get('votos_favor',0)} · En contra: {row.get('votos_contra',0)}"
                    "<extra></extra>"
                ),
                showlegend=False,
            ))
        fig_tl.update_layout(
            height=max(220, len(df_vot) * 32),
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title=None, showgrid=False, tickfont=dict(size=10, color=TEXT2)),
            yaxis=dict(
                tickvals=list(range(len(df_vot))),
                ticktext=[str(df_vot.iloc[i].get("titulo", ""))[:50] + ("..." if len(str(df_vot.iloc[i].get("titulo", ""))) > 50 else "") for i in range(len(df_vot))],
                tickfont=dict(size=9, color=TEXT2), title=None,
            ),
            margin=dict(t=10, b=10, l=340, r=80), showlegend=False,
        )
        st.plotly_chart(fig_tl, use_container_width=True, key="congreso_votaciones_timeline")

        sec_hdr("Detalle por votación")
        for vote_idx, (_, row) in enumerate(df_vot.iterrows()):
            res = str(row.get("resultado", ""))
            res_color = GREEN if res == "APROBADA" else RED
            fav = int(row.get("votos_favor", 0) or 0)
            con = int(row.get("votos_contra", 0) or 0)
            abs_ = int(row.get("abstenciones", 0) or 0)
            total = fav + con + abs_ or 1
            pct_f = fav / total * 100

            try:
                p_favor = json.loads(row.get("parties_favor_json") or "[]")
            except Exception:
                p_favor = []
            try:
                p_contra = json.loads(row.get("parties_against_json") or "[]")
            except Exception:
                p_contra = []

            favor_html = "".join(
                f'<span class="badge" style="background:{PARTY_COLORS.get(p, BG3)};color:#fff;margin-right:3px">{p}</span>'
                for p in p_favor
            )
            contra_html = "".join(
                f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{p}</span>'
                for p in p_contra
            )

            with st.expander(f"{str(row.get('fecha',''))[:10]}  —  {str(row.get('titulo',''))[:70]}"):
                col_i, col_d = st.columns([2, 1])
                with col_i:
                    st.markdown(
                        f'<div>'
                        f'<span class="badge" style="background:{BG3};color:{CYAN};border:1px solid {BORDER};margin-right:.4rem">{row.get("tipo_votacion","")}</span>'
                        f'<span class="badge" style="background:{res_color}25;color:{res_color};border:1px solid {res_color}55">{res}</span>'
                        f'</div>'
                        f'<div style="font-weight:700;color:{TEXT};margin:.5rem 0">{row.get("titulo","")}</div>'
                        + (f'<div style="font-size:.75rem;color:{MUTED};margin-bottom:.2rem">A favor ({fav} votos)</div>{favor_html}' if favor_html else "")
                        + (f'<div style="font-size:.75rem;color:{MUTED};margin-top:.4rem;margin-bottom:.2rem">En contra ({con} votos)</div>{contra_html}' if contra_html else "")
                        + f'<div style="margin-top:.6rem;border-radius:4px;overflow:hidden;height:8px;background:{BG3}">'
                        f'<div style="background:{GREEN};width:{pct_f:.1f}%;height:8px;display:inline-block;border-radius:4px 0 0 4px"></div></div>'
                        f'<div style="display:flex;justify-content:space-between;font-size:.7rem;color:{MUTED};margin-top:.2rem">'
                        f'<span>A favor {pct_f:.1f}%</span><span>Abs. {abs_}</span><span>En contra {100-pct_f-abs_/total*100:.1f}%</span></div>',
                        unsafe_allow_html=True,
                    )
                    if row.get("implicaciones"):
                        st.markdown(
                            f'<div style="font-size:.82rem;color:{TEXT2};background:{BG3};border-radius:6px;padding:.5rem .8rem;margin-top:.4rem;border-left:3px solid {AMBER}">'
                            f'<b style="color:{AMBER}">Implicaciones:</b> {row["implicaciones"]}</div>',
                            unsafe_allow_html=True,
                        )
                with col_d:
                    fig_d = go.Figure(go.Pie(
                        labels=["A favor", "En contra", "Abstención"],
                        values=[fav, con, abs_],
                        marker_colors=[GREEN, RED, AMBER],
                        hole=0.5,
                        textinfo="value",
                        textfont=dict(size=11, color=TEXT),
                    ))
                    fig_d.update_layout(
                        height=200, paper_bgcolor="rgba(0,0,0,0)",
                        margin=dict(t=5, b=5, l=5, r=5),
                        showlegend=True,
                        legend=dict(font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
                        annotations=[dict(text=f"{fav}/{total}", x=0.5, y=0.5, font_size=11,
                                          showarrow=False, font_color=TEXT2)],
                    )
                    st.plotly_chart(
                        fig_d,
                        use_container_width=True,
                        key=f"congreso_votacion_pie_{vote_idx}",
                    )

# ── Tab 3: Agenda de Decisores ────────────────────────────────────────────────
with tab_agenda:
    # Intentar primero la tabla agenda_item (modelo rico)
    df_agenda_rica = cargar_agenda_institucional(dias_atras=0, dias_adelante=7, limit=80)
    is_agenda_rica = not df_agenda_rica.empty

    if is_agenda_rica:
        # Construir lista de eventos desde tabla agenda_item
        raw_events = df_agenda_rica.to_dict("records")
        events = [
            normalize_agenda_event(
                {
                    "titulo": _txt(r.get("title")),
                    "actor": _txt(r.get("main_actor")),
                    "fuente": _txt(r.get("host_institution")),
                    "fecha": _date_label(r.get("event_date")),
                    "hora": _txt(r.get("time_start"))[:5],
                    "tipo": _txt(r.get("event_type")),
                    "lugar": _txt(r.get("location")),
                    "cita": _txt(r.get("description")),
                    "enlace": _txt(r.get("source_url")),
                }
            )
            for r in raw_events
            if _txt(r.get("title"))
        ]
        data_src_label = "Tabla agenda_item"
    else:
        # Fallback: fetch_all_agendas() (fuentes RSS/HTML en vivo)
        raw_live = _normalize_live_agenda_rows(fetch_all_agendas(max_items_per_source=25))
        events = [normalize_agenda_event(r) for r in raw_live]
        data_src_label = "RSS/HTML en vivo"

    events = [ev for ev in events if _txt(ev.title)]

    sec_hdr("Agenda política — Qué pasa hoy / esta semana")
    st.markdown(
        data_badge(is_agenda_rica) + f'&nbsp;<span style="font-size:.75rem;color:{MUTED}">Fuente: {data_src_label}</span>',
        unsafe_allow_html=True,
    )

    if not events:
        st.info("No hay eventos de agenda disponibles. Ejecuta `python -m etl.institucional.moncloa_agenda`.")
    else:
        events_sorted = sort_by_importance(events)

        # ── Vista "Agenda crítica" (top por importance) ───────────────────
        sec_hdr("Agenda crítica — Top eventos", RED)
        top_events = events_sorted[:6]
        cols = st.columns(min(3, len(top_events)))
        for idx, ev in enumerate(top_events):
            with cols[idx % 3]:
                st.markdown(
                    f'<div style="background:{BG2};border:1px solid {ev.color}44;border-top:3px solid {ev.color};'
                    f'border-radius:8px;padding:.8rem;margin-bottom:.5rem">'
                    f'<div style="font-size:.65rem;color:{ev.color};font-weight:700;text-transform:uppercase;margin-bottom:.3rem">{ev.event_type.replace("_"," ")}</div>'
                    f'<div style="font-weight:700;font-size:.88rem;color:{TEXT};line-height:1.35;margin-bottom:.3rem">{ev.title[:80]}</div>'
                    f'<div style="font-size:.75rem;color:{MUTED}">{ev.actor or ev.institution} &nbsp;·&nbsp; {ev.date[:10]} {ev.time_start}</div>'
                    f'<div style="font-size:.72rem;color:{MUTED};margin-top:.2rem">{ev.location}</div>'
                    f'<div style="margin-top:.4rem"><span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER}">imp. {ev.importance_score}</span></div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

        # ── Timeline por actor ────────────────────────────────────────────
        sec_hdr("Timeline por actor", BLUE)
        timeline_data = [row for row in build_timeline_data(events_sorted) if _txt(row.get("x")) and _txt(row.get("y"))]

        if timeline_data:
            actores = sorted({d["y"] for d in timeline_data if d["y"]})
            actor_y = {a: i for i, a in enumerate(actores)}

            fig_tl = go.Figure()
            for td in timeline_data:
                y_pos = actor_y.get(td["y"], 0)
                fig_tl.add_trace(go.Scatter(
                    x=[td["x"]],
                    y=[y_pos],
                    mode="markers",
                    marker=dict(
                        size=max(10, min(24, td["importance"] // 4)),
                        color=td["color"],
                        line=dict(color=BG2, width=1.5),
                    ),
                    hovertemplate=(
                        f"<b>{td['y']}</b><br>"
                        f"{td['titulo'][:70]}<br>"
                        f"Tipo: {td['tipo'].replace('_',' ')}<br>"
                        f"Lugar: {td['lugar'] or '—'}<br>"
                        f"Importancia: {td['importance']}"
                        "<extra></extra>"
                    ),
                    showlegend=False,
                ))

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

        # ── Lista detallada ───────────────────────────────────────────────
        sec_hdr("Todos los eventos")
        fuentes_disp = sorted({ev.institution or ev.source for ev in events_sorted if ev.institution or ev.source})
        tipos_disp   = sorted({ev.event_type for ev in events_sorted})
        f1, f2 = st.columns(2)
        fuente_sel = f1.selectbox("Fuente", ["Todas"] + fuentes_disp, key="ag_fuente")
        tipo_sel   = f2.selectbox("Tipo de acto", ["Todos"] + tipos_disp, key="ag_tipo")

        filtered = [ev for ev in events_sorted
                    if (fuente_sel == "Todas" or ev.institution == fuente_sel or ev.source == fuente_sel)
                    and (tipo_sel == "Todos" or ev.event_type == tipo_sel)]

        for ev in filtered[:60]:
            enlace = ev.source_url
            st.markdown(
                f'<div class="agenda-item" style="border-left-color:{ev.color}">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.8rem">'
                f'<div style="flex:1">'
                f'<div style="font-size:.73rem;color:{MUTED}">{ev.date[:10]} {ev.time_start} · {ev.institution}</div>'
                f'<div style="font-size:.9rem;font-weight:700;color:{TEXT};margin-top:.12rem">{ev.title}</div>'
                + (f'<div style="font-size:.8rem;color:{TEXT2};margin-top:.2rem">{ev.description[:180]}</div>' if ev.description else "")
                + f'</div><div style="text-align:right;flex-shrink:0">'
                f'<span class="badge" style="background:{ev.color}20;color:{ev.color};border:1px solid {ev.color}44">{ev.event_type.replace("_"," ")}</span>'
                + (f'<div style="margin-top:.3rem"><a href="{enlace}" target="_blank" style="font-size:.72rem;color:{CYAN};text-decoration:none">Fuente</a></div>' if enlace else "")
                + f'</div></div></div>',
                unsafe_allow_html=True,
            )

        sec_hdr("Distribución por tipo de acto", BLUE)
        tipo_count = {}
        for ev in events_sorted:
            tipo_count[ev.event_type] = tipo_count.get(ev.event_type, 0) + 1
        tipo_ord = sorted(tipo_count.items(), key=lambda x: x[1], reverse=True)
        fig_tc = go.Figure(go.Bar(
            x=[t[0].replace("_", " ") for t in tipo_ord],
            y=[t[1] for t in tipo_ord],
            marker_color=[EVENT_TYPE_COLORS.get(t[0], MUTED) for t in tipo_ord],
            text=[t[1] for t in tipo_ord],
            textposition="outside",
            textfont=dict(color=TEXT2, size=10),
        ))
        fig_tc.update_layout(
            height=280, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
            yaxis=dict(title="Nº actos", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
            margin=dict(t=10, b=10), showlegend=False,
        )
        st.plotly_chart(fig_tc, use_container_width=True, key="congreso_agenda_tipos")

# ── Tab 4: Comunicados ────────────────────────────────────────────────────────
with tab_comunicados:
    sec_hdr("Comunicados y Notas Oficiales")
    df_com = _comunicados_live(limit=30)
    if df_com.empty:
        st.info("No se pudieron cargar comunicados en tiempo real.")
    else:
        fuentes = ["Todas"] + sorted(df_com["fuente"].dropna().unique().tolist())
        fuente_sel = st.selectbox("Filtrar por fuente oficial", fuentes, key="com_fuente")
        if fuente_sel != "Todas":
            df_com = df_com[df_com["fuente"] == fuente_sel]
        st.metric("Comunicados monitorizados", len(df_com))
        for _, row in df_com.iterrows():
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {CYAN};border-radius:8px;padding:.7rem .9rem;margin-bottom:.5rem">'
                f'<div style="font-weight:700;color:{TEXT};font-size:.9rem">{row.get("titulo","")}</div>'
                f'<div style="font-size:.75rem;color:{MUTED};margin:.25rem 0">{row.get("fuente","—")} · {row.get("fecha","")}</div>'
                f'<div style="font-size:.8rem;color:{TEXT2};line-height:1.45">{row.get("cita",row.get("resumen",""))}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

# ── Tab 5: Leyes & Actividad ──────────────────────────────────────────────────
with tab_leyes:
    sec_hdr("Iniciativas y actividad legislativa — datos reales de la API del Congreso")
    act = cargar_actividad_reciente_congreso(dias=540, limit=800)
    vot = cargar_votaciones_pleno(dias=540, limit=800)
    kpis = activity_kpis(act)

    k1, k2, k3, k4 = st.columns(4)
    with k1: st.metric("Registros legislativos", kpis["total"])
    with k2: st.metric("Partidos con actividad", kpis["partidos"])
    with k3: st.metric("Tipos de iniciativa", kpis["tipos"])
    with k4: st.metric("Partido más activo", kpis["mas_activo"])

    leyes = build_legislative_laws_view(act, vot)

    if leyes.empty:
        st.info("Sin normas legislativas recientes. Ejecuta `python -m etl.sources.congreso_api`.")
    else:
        sec_hdr("Volumen legislativo por partido", BLUE)
        leyes_partidos = leyes[leyes["partido_siglas"] != "N/A"].copy()
        if not leyes_partidos.empty:
            por_partido = (
                leyes_partidos.groupby("partido_siglas").size().reset_index(name="n_normas")
                .sort_values("n_normas", ascending=False).head(12)
            )
            fig_lp = go.Figure(go.Bar(
                x=por_partido["partido_siglas"],
                y=por_partido["n_normas"],
                marker_color=[PARTY_COLORS.get(p, MUTED) for p in por_partido["partido_siglas"]],
                text=por_partido["n_normas"], textposition="outside",
            ))
            fig_lp.update_layout(
                height=280, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(tickfont=dict(color=TEXT2, size=10)),
                yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9), title="Nº normas"),
                margin=dict(t=10, b=10), showlegend=False,
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
                f'<div style="font-weight:700;color:{TEXT};font-size:.92rem">{row.get("titulo_norma","")}</div>'
                f'<div style="font-size:.77rem;color:{MUTED};margin-top:.2rem">'
                f'{row.get("fecha_norma_label","")} · {row.get("tipo","")} · {partido}</div>'
                f'</div>'
                f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER}">{estado}</span>'
                f'</div></div>',
                unsafe_allow_html=True,
            )

# ── Tab 6: Comisiones ─────────────────────────────────────────────────────────
with tab_comisiones:
    sec_hdr("Actividad de comisiones — datos reales")
    act = cargar_actividad_reciente_congreso(dias=540, limit=1000)
    if act.empty:
        st.info("No hay actividad. Ejecuta `python -m etl.sources.congreso_api`.")
    else:
        act2 = act.copy()
        act2["tipo_acto"] = act2["tipo_acto"].astype(str)
        com = act2[act2["tipo_acto"].str.contains("comisi", case=False, na=False)]
        if com.empty:
            st.info("La BD no contiene filas etiquetadas como comisión todavía.")
        else:
            por_comision = (
                com.groupby("titulo")
                .agg(
                    ultimo_movimiento=("fecha", "max"),
                    n_registros=("titulo", "count"),
                    partidos=("partido_siglas", lambda s: ", ".join(sorted({str(x) for x in s if pd.notna(x)}))),
                )
                .reset_index()
                .sort_values("ultimo_movimiento", ascending=False)
            )
            k1, k2, k3 = st.columns(3)
            with k1: st.metric("Comisiones detectadas", int(len(por_comision)))
            with k2: st.metric("Actividad 90d", int((pd.to_datetime(com["fecha"], errors="coerce") >= (pd.Timestamp.utcnow() - pd.Timedelta(days=90))).sum()))
            with k3: st.metric("Registros totales", int(len(com)))

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
                com.groupby("partido_siglas").size().reset_index(name="n")
                .sort_values("n", ascending=False).head(12)
            )
            fig_cp = go.Figure(go.Bar(
                x=por_partido["partido_siglas"],
                y=por_partido["n"],
                marker_color=[PARTY_COLORS.get(str(p), MUTED) for p in por_partido["partido_siglas"]],
                text=por_partido["n"], textposition="outside",
            ))
            fig_cp.update_layout(
                height=280, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(tickfont=dict(color=TEXT2, size=10)),
                yaxis=dict(title="Nº registros", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
                margin=dict(t=10, b=10), showlegend=False,
            )
            st.plotly_chart(fig_cp, use_container_width=True, key="congreso_comisiones_partidos")

# ── Tab 7: Temas TIPI ────────────────────────────────────────────────────────
with tab_temas:
    sec_hdr("Radar temático — clasificación TIPI de actividad legislativa", CYAN)
    st.markdown(
        f'<div style="font-size:.78rem;color:{MUTED};margin-bottom:1rem">'
        f'Clasificación temática inspirada en el <b>TIPI Engine</b> de Political Watch. '
        f'Cada iniciativa del Congreso, publicación BOE y votación se clasifica automáticamente '
        f'en las 24 áreas de política pública de la taxonomía TIPI.</div>',
        unsafe_allow_html=True,
    )

    _df_boe_tipi = cargar_boe_publicaciones(dias=7, limit=100)
    _df_init_tipi = cargar_actividad_reciente_congreso(dias=30, limit=300)

    # Vista consolidada de temas del día/semana
    sec_hdr("Distribución temática (BOE + iniciativas)", BLUE)
    _df_overview = get_top_topics_overview(
        df_boe=_df_boe_tipi if not _df_boe_tipi.empty else None,
        df_initiatives=_df_init_tipi if not _df_init_tipi.empty else None,
    )
    if _df_overview.empty:
        st.info("Sin datos para clasificar. Ejecuta los ETLs institucionales primero.")
    else:
        _top_k = min(15, len(_df_overview))
        fig_tipi = go.Figure(go.Bar(
            x=_df_overview["total"].head(_top_k).tolist()[::-1],
            y=_df_overview["topic_label"].head(_top_k).tolist()[::-1],
            orientation="h",
            marker_color=_df_overview["color"].head(_top_k).tolist()[::-1],
            text=_df_overview["total"].head(_top_k).tolist()[::-1],
            textposition="outside",
            textfont=dict(color=TEXT2, size=10),
            hovertemplate=(
                "<b>%{y}</b><br>"
                "Total: %{x}<br>"
                "<extra></extra>"
            ),
        ))
        fig_tipi.update_layout(
            height=max(350, _top_k * 28),
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title="Nº menciones", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
            yaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
            margin=dict(t=10, b=10, l=10, r=60),
            showlegend=False,
        )
        st.plotly_chart(fig_tipi, use_container_width=True, key="congreso_tipi_overview")

        col_b, col_i = st.columns(2)
        with col_b:
            st.metric("Temas activos en BOE", int(_df_overview["n_boe"].gt(0).sum()))
        with col_i:
            st.metric("Temas activos en Congreso", int(_df_overview["n_initiatives"].gt(0).sum()))

    # Saliencia temática por partido
    if not _df_init_tipi.empty:
        sec_hdr("Saliencia temática por partido", PURPLE)
        st.markdown(
            f'<div style="font-size:.76rem;color:{MUTED};margin-bottom:.6rem">'
            f'% de iniciativas de cada partido por área temática — mide en qué temas se enfoca cada grupo parlamentario.</div>',
            unsafe_allow_html=True,
        )
        _df_salience = get_topic_salience(_df_init_tipi)
        if not _df_salience.empty:
            _partidos_sal = sorted(_df_salience["partido_siglas"].unique().tolist())
            _part_sel = st.selectbox("Partido", ["Todos"] + _partidos_sal, key="tipi_partido")
            _df_sal_show = _df_salience if _part_sel == "Todos" else \
                           _df_salience[_df_salience["partido_siglas"] == _part_sel]
            _df_sal_top = _df_sal_show.head(30)
            st.dataframe(
                _df_sal_top[["partido_siglas", "topic_label", "n", "pct"]].rename(columns={
                    "partido_siglas": "Partido",
                    "topic_label": "Tema",
                    "n": "Iniciativas",
                    "pct": "% del partido",
                }),
                use_container_width=True,
                hide_index=True,
            )

    # Buscador TIPI en tiempo real
    sec_hdr("Clasificador temático interactivo", AMBER)
    _texto_check = st.text_area(
        "Pega aquí el título o descripción de una iniciativa:",
        height=80, key="tipi_texto",
        placeholder="Ej: Proposición de Ley para la regulación de los precios del alquiler en zonas tensionadas...",
    )
    if _texto_check:
        _result = classify_text(_texto_check)
        _topic_cols = st.columns(min(3, len(_result.topics)))
        for _idx, _tc in enumerate(_result.topics[:3]):
            with _topic_cols[_idx]:
                _tc_color = topic_color(_tc)
                st.markdown(
                    f'<div style="background:{BG2};border:1px solid {_tc_color}44;'
                    f'border-top:3px solid {_tc_color};border-radius:8px;padding:.7rem .9rem">'
                    f'<div style="font-size:.65rem;color:{_tc_color};font-weight:700;margin-bottom:.2rem">TEMA {_idx+1}</div>'
                    f'<div style="font-weight:700;color:{TEXT};font-size:.9rem">{topic_label(_tc)}</div>'
                    f'<div style="font-size:.72rem;color:{MUTED};margin-top:.2rem">'
                    f'Score: {_result.scores.get(_tc, 0):.0f}/100</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
        if _result.matched_keywords:
            st.caption(f"Keywords detectadas: {', '.join(_result.matched_keywords[:8])}")

# ── Tab 8: Estado ETL ─────────────────────────────────────────────────────────
with tab_etl:
    sec_hdr("Estado de fuentes institucionales", CYAN)

    institucional_sources = [
        ("boe",        "boe",     "https://www.boe.es/rss/boe.php",              "python -m etl.institucional.boe_rss"),
        ("moncloa",    "agenda",  "Moncloa HTML + RSS",                         "python -m etl.institucional.moncloa_agenda"),
        ("congreso",   "congreso","https://www.congreso.es/opendata/api",       "python -m etl.institucional.congreso_iniciativas"),
        ("senado",     "senado",  "https://www.senado.es/datosabiertos",        "python -m etl.sources.senado_api"),
    ]

    for source_id, stype, url, cmd in institucional_sources:
        row_health = df_health[df_health["source_id"] == source_id] if not df_health.empty else pd.DataFrame()
        if not row_health.empty:
            sh = row_health.iloc[0]
            sc = {"ok": GREEN, "degraded": AMBER, "failing": RED}.get(str(sh.get("status", "unknown")), MUTED)
            lag = sh.get("freshness_lag_s")
            lag_txt = f"{int(lag)//60} min" if lag and lag < 3600 else (f"{int(lag)//3600} h" if lag else "—")
            status_html = f'<span style="color:{sc};font-weight:700">{str(sh.get("status","")).upper()}</span> · {sh.get("articles_count",0)} items · lag: {lag_txt}'
        else:
            status_html = f'<span style="color:{MUTED}">Sin datos — ejecutar ETL</span>'

        st.markdown(
            f'<div style="display:flex;align-items:center;gap:.8rem;padding:.55rem .8rem;'
            f'background:{BG2};border:1px solid {BORDER};border-radius:6px;margin-bottom:.3rem">'
            f'<span style="font-size:.85rem;color:{TEXT};font-weight:600;flex:1">{source_id}</span>'
            f'<span style="font-size:.73rem;color:{MUTED}">{stype}</span>'
            f'<span style="font-size:.75rem;color:{TEXT2}">{status_html}</span>'
            f'<code style="font-size:.68rem;color:{CYAN};background:{BG3};padding:.1rem .35rem;border-radius:3px">{cmd}</code>'
            f'</div>',
            unsafe_allow_html=True,
        )

    if not df_incidents.empty:
        inst_inc = df_incidents[df_incidents["source_id"].isin([s[0] for s in institucional_sources])]
        if not inst_inc.empty:
            sec_hdr("Incidencias activas", RED)
            for _, inc in inst_inc.iterrows():
                sc = RED if inc.get("severity") == "critical" else (AMBER if inc.get("severity") == "major" else MUTED)
                st.markdown(
                    f'<div style="padding:.5rem .8rem;background:{BG2};border:1px solid {sc}44;'
                    f'border-left:3px solid {sc};border-radius:6px;margin-bottom:.3rem">'
                    f'<span style="font-weight:700;font-size:.82rem;color:{sc}">[{str(inc.get("severity","")).upper()}]</span>'
                    f' <span style="font-size:.82rem;color:{TEXT}">{inc.get("source_id","")} — {inc.get("error_type","")}</span>'
                    f'<span style="font-size:.72rem;color:{MUTED};float:right">{str(inc.get("last_seen",""))[:16]}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.success("Sin incidencias activas.")

    # Quality reports — inspired by great_expectations
    sec_hdr("Validación de calidad de datos", AMBER)
    _qr_dfs = {}
    _df_boe_q = cargar_boe_publicaciones(dias=3, limit=50)
    _df_ag_q  = cargar_agenda_institucional(dias_atras=7, dias_adelante=7, limit=50)
    _df_vot_q = cargar_votaciones_pleno(dias=30, limit=30)
    if not _df_boe_q.empty: _qr_dfs["boe"] = _df_boe_q
    if not _df_ag_q.empty:  _qr_dfs["agenda"] = _df_ag_q
    if not _df_vot_q.empty: _qr_dfs["votes"] = _df_vot_q

    if _qr_dfs:
        _reports = run_all_validations(**_qr_dfs)
        _df_qual = reports_to_df(_reports)
        for _, _rr in _df_qual.iterrows():
            _sc = GREEN if _rr["estado"] == "PASS" else (AMBER if _rr["estado"] == "WARN" else RED)
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.8rem;padding:.5rem .8rem;'
                f'background:{BG2};border:1px solid {BORDER};border-radius:6px;margin-bottom:.3rem">'
                f'<span style="font-size:.82rem;color:{TEXT};font-weight:600;flex:1">{_rr["fuente"]}</span>'
                f'<span class="badge" style="background:{_sc}22;color:{_sc};border:1px solid {_sc}44">'
                f'{_rr["estado"]}</span>'
                f'<span style="font-size:.76rem;color:{MUTED}">Score: {_rr["score"]}/100</span>'
                f'<span style="font-size:.72rem;color:{TEXT2}">'
                f'✓{_rr["passed"]} ⚠{_rr["warned"]} ✗{_rr["failed"]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
            if _rr["detalle"]:
                st.caption(f"  ↳ {_rr['detalle'][:150]}")
    else:
        st.info("Sin datos en BD para validar. Ejecuta los ETLs primero.")

    st.divider()
    st.markdown(
        f'<div style="font-size:.8rem;color:{MUTED}">'
        f'Migraciones a aplicar: <code>db/migrations/0013_institucional_core.sql</code>'
        f'</div>',
        unsafe_allow_html=True,
    )
