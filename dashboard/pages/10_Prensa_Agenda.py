"""
Página: Prensa & Agenda Mediática
Análisis en tiempo real de la cobertura mediática española.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    _safe_page_link,
    hex_to_rgba,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import (
    cargar_agenda_hoy,
    cargar_agenda_historica,
    cargar_agenda_tema_partido,
    cargar_alertas_sentimiento,
    cargar_heatmap_fuente_partido,
    cargar_noticias_recientes,
    cargar_scraping_log,
    cargar_sesgo_fuente_partido,
    cargar_sentimiento_partido,
    cargar_sentimiento_todos_partidos,
    cargar_source_health,
    cargar_scraper_incidents,
    cargar_fact_checks,
)
from dashboard.media_logic import (
    theme_party_impact,
    theme_narratives,
    bulos_desde_noticias,
    extraer_partidos,
    inferir_veredicto,
    PARTIDOS_KEYWORDS,
)
from etl.sources.agendas_dinamicas import fetch_all_agendas

ORANGE = "#F97316"
YELLOW = "#EAB308"

VEREDICTO_COLORS = {
    "FALSO":               RED,
    "ENGAÑOSO":            ORANGE,
    "SIN VERIFICAR":       YELLOW,
    "SIN AVAL CIENTÍFICO": PURPLE,
    "VERDADERO":           GREEN,
}

_hex_to_rgba = hex_to_rgba  # alias retrocompatible


# ── Helpers de UI ─────────────────────────────────────────────────────────────

def sec_hdr(title: str, color: str = CYAN) -> None:
    st.markdown(
        f'<div style="display:flex;align-items:center;gap:.8rem;margin:1.5rem 0 .8rem">'
        f'<div style="width:4px;height:16px;background:{color};border-radius:2px"></div>'
        f'<div style="font-size:.68rem;font-weight:700;letter-spacing:.12em;color:{MUTED};text-transform:uppercase">{title}</div>'
        f'<div style="flex:1;height:1px;background:{BORDER}"></div>'
        f'</div>',
        unsafe_allow_html=True,
    )


@st.cache_data(ttl=3600)
def cargar_agenda_oficial(limit: int = 20) -> pd.DataFrame:
    rows = fetch_all_agendas(max_items_per_source=max(6, limit // 4))
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows).drop_duplicates(subset=["titulo"]).head(limit)
    if "fuente" not in df.columns:
        df["fuente"] = "Agenda oficial"
    return df


def _fact_check_row_to_bulo(row: pd.Series) -> dict:
    """Convierte una fila de fact_check a dict compatible con la UI de bulos."""
    try:
        partidos = json.loads(row.get("partidos_json") or "[]")
    except Exception:
        partidos = []
    fecha_raw = str(row.get("published_at") or "")
    return {
        "fecha": fecha_raw[:16] or "reciente",
        "titular_bulo": str(row.get("titular") or "")[:300],
        "veredicto": str(row.get("verdict") or "SIN VERIFICAR"),
        "partidos_implicados": partidos or ["SIN CLASIFICAR"],
        "fuente_origen": str(row.get("source_id") or "fact-checker"),
        "explicacion": str(row.get("resumen") or "Verificación publicada por fact-checker."),
        "impacto": "Pendiente estimación",
        "fuente_verificacion": str(row.get("source_id") or "—").capitalize(),
        "url": str(row.get("url") or ""),
    }


def _source_health_badge(df_health: pd.DataFrame) -> str:
    """Genera HTML de badge de estado global de fuentes."""
    if df_health.empty:
        return (
            f'<span style="font-size:.68rem;color:{MUTED};background:{BG3};'
            f'border:1px solid {BORDER};border-radius:4px;padding:.1rem .5rem">'
            f'ETL sin datos</span>'
        )
    total = len(df_health)
    ok = (df_health["status"] == "ok").sum()
    failing = (df_health["status"] == "failing").sum()
    degraded = (df_health["status"] == "degraded").sum()

    if failing > 0:
        color, label = RED, f"{failing} fuente{'s' if failing > 1 else ''} caída{'s' if failing > 1 else ''}"
    elif degraded > 0:
        color, label = AMBER, f"{degraded} degradada{'s' if degraded > 1 else ''}"
    else:
        color, label = GREEN, f"{ok}/{total} fuentes OK"

    return (
        f'<span style="font-size:.68rem;color:{color};background:{color}18;'
        f'border:1px solid {color}44;border-radius:4px;padding:.1rem .5rem;font-weight:600">'
        f'● {label}</span>'
    )


def _freshness_badge(df_health: pd.DataFrame) -> str:
    """Genera badge con lag de freshness máximo entre fuentes activas."""
    if df_health.empty or "freshness_lag_s" not in df_health.columns:
        return ""
    lags = df_health["freshness_lag_s"].dropna()
    if lags.empty:
        return ""
    max_lag = int(lags.max())
    if max_lag < 3600:
        color, texto = GREEN, f"Actualizado hace {max_lag // 60} min"
    elif max_lag < 7200:
        color, texto = AMBER, f"Última ingestión hace {max_lag // 3600:.0f} h"
    else:
        color, texto = RED, f"Sin actualización ({max_lag // 3600:.0f} h)"
    return (
        f'<span style="font-size:.68rem;color:{color};background:{color}18;'
        f'border:1px solid {color}44;border-radius:4px;padding:.1rem .5rem">'
        f'{texto}</span>'
    )


# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Prensa & Agenda — ElectSim", layout="wide")
sidebar_nav()

tabs_nav_10 = st.columns([1, 1, 1, 5])
with tabs_nav_10[0]:
    _safe_page_link("pages/10_Prensa_Agenda.py", label="Prensa & Agenda")
with tabs_nav_10[1]:
    _safe_page_link("pages/14_Monitor_Sentimiento.py", label="Monitor sentimiento")
with tabs_nav_10[2]:
    _safe_page_link("pages/20_Monitor_Medios_RRSS.py", label="Monitor medios")

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
.news-card {{
    background:{BG2};
    border:1px solid {BORDER};
    border-left:3px solid {CYAN};
    border-radius:8px;
    padding:.8rem 1rem;
    margin-bottom:.5rem;
    animation:fadeInUp .35s ease both;
    transition:border-color .2s ease,box-shadow .2s ease;
}}
.news-card:hover {{ box-shadow:0 0 14px rgba(0,212,255,0.08); }}
.news-pos {{ border-left-color:{GREEN} !important; }}
.news-neg {{ border-left-color:{RED} !important; }}
.news-neu {{ border-left-color:{BORDER} !important; }}
.bulo-card {{
    background:{BG2};
    border:1px solid {BORDER};
    border-radius:10px;
    padding:1rem 1.2rem;
    margin-bottom:.7rem;
    animation:fadeInUp .35s ease both;
}}
.badge {{
    display:inline-block;
    padding:.15rem .5rem;
    border-radius:4px;
    font-size:.7rem;
    font-weight:600;
    letter-spacing:.04em;
}}
.info-banner {{
    background:{BG2};
    border:1px solid {BORDER};
    border-radius:10px;
    padding:1rem 1.2rem;
    margin-bottom:1.2rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Carga de estado de fuentes (para badges) ──────────────────────────────────
df_health = cargar_source_health()
df_incidents = cargar_scraper_incidents(solo_activos=True)

# ── Header con badges de estado ───────────────────────────────────────────────
health_badge    = _source_health_badge(df_health)
freshness_badge = _freshness_badge(df_health)

st.markdown(
    f'<div style="position:relative;overflow:hidden;background:{BG2};border:1px solid {BORDER};'
    f'border-radius:16px;padding:2rem 2.5rem;margin-bottom:1.5rem;animation:fadeInUp .5s ease both">'
    f'<div style="position:absolute;top:-40px;right:-40px;width:220px;height:220px;border-radius:50%;'
    f'background:radial-gradient(circle,rgba(0,212,255,0.10) 0%,transparent 70%);pointer-events:none"></div>'
    f'<div style="position:absolute;bottom:-50px;left:25%;width:160px;height:160px;border-radius:50%;'
    f'background:radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%);pointer-events:none"></div>'
    f'<div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem;flex-wrap:wrap">'
    f'<div style="width:8px;height:8px;border-radius:50%;background:{CYAN};'
    f'animation:dotPulse 2s ease-in-out infinite;box-shadow:0 0 8px {CYAN}"></div>'
    f'<span style="font-size:.65rem;font-weight:700;letter-spacing:.16em;color:{CYAN};text-transform:uppercase">MONITORIZACIÓN ACTIVA</span>'
    f'&nbsp;{health_badge}&nbsp;{freshness_badge}'
    f'</div>'
    f'<h1 style="font-size:1.7rem;font-weight:800;color:{TEXT};margin:0 0 .3rem;letter-spacing:-.02em">Prensa & Agenda Mediática</h1>'
    f'<p style="color:{TEXT2};font-size:.88rem;margin:0">Análisis de sentimiento · verificación de bulos · 12 medios españoles monitorizados · actualización cada hora</p>'
    f'</div>',
    unsafe_allow_html=True,
)

# Alertas de incidentes críticos en cabecera
if not df_incidents.empty:
    critical = df_incidents[df_incidents["severity"] == "critical"]
    if not critical.empty:
        names = ", ".join(critical["source_id"].tolist()[:3])
        st.warning(f"⚠️ Fuentes con incidencias críticas: **{names}** — datos pueden estar incompletos.")

# ── Sidebar controles ─────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown(
        f'<div style="font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};'
        f'text-transform:uppercase;padding:.6rem .5rem .3rem">Filtros</div>',
        unsafe_allow_html=True,
    )
    dias_noticias = st.slider("Ventana noticias (días)", 1, 30, 7)
    dias_sent     = st.slider("Ventana sentimiento (días)", 7, 90, 30)

# ── Carga principal de datos ──────────────────────────────────────────────────
df_noticias  = cargar_noticias_recientes(dias=dias_noticias, limit=100)
df_agenda    = cargar_agenda_hoy()
df_sent_all  = cargar_sentimiento_todos_partidos(dias=dias_noticias)

# ── KPIs ──────────────────────────────────────────────────────────────────────
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Noticias analizadas", len(df_noticias) if not df_noticias.empty else 0,
              help=f"Últimos {dias_noticias} días")
with col2:
    if not df_noticias.empty and "sentimiento_score" in df_noticias.columns:
        sent_medio = df_noticias["sentimiento_score"].mean()
        label = "positivo" if sent_medio > 0.1 else "negativo" if sent_medio < -0.1 else "neutro"
        st.metric("Sentimiento medio", f"{sent_medio:.3f}", delta=label)
    else:
        st.metric("Sentimiento medio", "—")
with col3:
    if not df_noticias.empty and "sentimiento_label" in df_noticias.columns:
        pct_neg = (df_noticias["sentimiento_label"] == "negativo").sum() / len(df_noticias) * 100
        st.metric("Noticias negativas", f"{pct_neg:.1f}%")
    else:
        st.metric("Noticias negativas", "—")
with col4:
    st.metric("Temas en agenda hoy", len(df_agenda) if not df_agenda.empty else 0)

st.divider()

# ── Radar operativo (nueva capa consolidada) ─────────────────────────────────
sec_hdr("Radar Operativo de Prensa", CYAN)

radar_overview, radar_narrativas, radar_medios, radar_salud = st.tabs([
    "🧭 Overview",
    "🧠 Narrativas",
    "📰 Medios & Sesgo",
    "🛠️ Salud de Ingesta",
])

with radar_overview:
    c_ov_1, c_ov_2, c_ov_3 = st.columns([1.2, 1, 1])

    with c_ov_1:
        st.markdown("#### Agenda de hoy")
        if not df_agenda.empty:
            df_top_temas = df_agenda.sort_values("n_noticias", ascending=False).head(10)
            fig_top_temas = go.Figure(go.Bar(
                x=df_top_temas["n_noticias"],
                y=df_top_temas["tema"],
                orientation="h",
                marker_color=df_top_temas["sentimiento_medio"],
                marker_colorscale="RdYlGn",
                marker_cmid=0,
                text=df_top_temas["sentimiento_medio"].round(2),
                textposition="outside",
            ))
            fig_top_temas.update_layout(
                height=340,
                margin=dict(t=10, b=10, l=10, r=30),
                yaxis=dict(autorange="reversed"),
                xaxis_title="Nº noticias",
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig_top_temas, use_container_width=True)
        else:
            st.info("Sin agenda del día para la ventana actual.")

    with c_ov_2:
        st.markdown("#### Sentimiento por partido")
        if not df_sent_all.empty:
            df_rank_sent = df_sent_all.copy().sort_values("sent_medio", ascending=False)
            fig_rank_sent = go.Figure(go.Bar(
                x=df_rank_sent["sent_medio"],
                y=df_rank_sent["entidad"],
                orientation="h",
                marker_color=df_rank_sent["sent_medio"],
                marker_colorscale="RdYlGn",
                marker_cmid=0,
                text=df_rank_sent["n_total"].astype(int),
                textposition="outside",
            ))
            fig_rank_sent.update_layout(
                height=340,
                margin=dict(t=10, b=10, l=10, r=35),
                yaxis=dict(autorange="reversed"),
                xaxis=dict(title="Sentimiento medio", range=[-1, 1]),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig_rank_sent, use_container_width=True)
        else:
            st.info("No hay datos de sentimiento por partido.")

    with c_ov_3:
        st.markdown("#### Señales operativas")
        if not df_sent_all.empty:
            peor = df_sent_all.sort_values("sent_medio", ascending=True).iloc[0]
            st.metric("Partido más castigado", str(peor.get("entidad", "—")), f"{float(peor.get('sent_medio', 0)):.3f}")
        else:
            st.metric("Partido más castigado", "—")
        if not df_noticias.empty and "fuente" in df_noticias.columns:
            fuente_top = (
                df_noticias.groupby("fuente", as_index=False)
                .size()
                .sort_values("size", ascending=False)
                .head(1)
            )
            if not fuente_top.empty:
                st.metric("Medio más activo", str(fuente_top.iloc[0]["fuente"]), int(fuente_top.iloc[0]["size"]))
            else:
                st.metric("Medio más activo", "—")
        else:
            st.metric("Medio más activo", "—")

        if not df_agenda.empty:
            top_tema = df_agenda.sort_values("n_noticias", ascending=False).iloc[0]
            st.metric(
                "Tema dominante",
                str(top_tema.get("tema", "—")),
                f"{int(top_tema.get('n_noticias', 0))} noticias",
            )
        else:
            st.metric("Tema dominante", "—")

        df_alertas_r = cargar_alertas_sentimiento(umbral=-0.35)
        st.metric("Alertas negativas (7d)", len(df_alertas_r) if not df_alertas_r.empty else 0)

with radar_narrativas:
    temas_radar = df_agenda["tema"].astype(str).dropna().unique().tolist() if not df_agenda.empty else []
    tema_radar = st.selectbox(
        "Tema para seguimiento narrativo",
        temas_radar if temas_radar else ["general"],
        key="radar_tema_narrativo",
    )
    df_tema_partido = cargar_agenda_tema_partido(tema=tema_radar, dias=30)

    col_np_1, col_np_2 = st.columns([1.3, 1])
    with col_np_1:
        st.markdown("#### Evolución tema × partido (30 días)")
        if not df_tema_partido.empty:
            fig_tema_part = px.area(
                df_tema_partido,
                x="fecha",
                y="n_noticias",
                color="partido",
                line_group="partido",
                hover_data=["sentimiento_medio"],
            )
            fig_tema_part.update_layout(
                height=360,
                margin=dict(t=10, b=10, l=10, r=10),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig_tema_part, use_container_width=True)
        else:
            st.info("No hay señal tema×partido para esta selección.")

    with col_np_2:
        st.markdown("#### Liderazgo narrativo")
        if not df_tema_partido.empty:
            df_lider = (
                df_tema_partido.groupby("partido", as_index=False)["n_noticias"]
                .sum()
                .sort_values("n_noticias", ascending=False)
            )
            st.dataframe(df_lider, use_container_width=True, hide_index=True)
        else:
            st.info("Sin liderazgo medible en esta ventana.")

        st.markdown("#### Titulares clave del tema")
        df_tit = df_noticias.copy()
        if not df_tit.empty and "categoria" in df_tit.columns:
            df_tit = df_tit[df_tit["categoria"].fillna("general").astype(str) == str(tema_radar)]
        if not df_tit.empty:
            st.dataframe(
                df_tit[["fecha_publicacion", "fuente", "titular", "sentimiento_label"]].head(12),
                use_container_width=True,
                hide_index=True,
            )
        else:
            st.caption("Sin titulares en el tema seleccionado.")

with radar_medios:
    col_m_1, col_m_2 = st.columns([1.25, 1])
    df_heatmap = cargar_heatmap_fuente_partido()
    df_sesgo = cargar_sesgo_fuente_partido(dias=max(dias_noticias, 14), min_noticias=3)

    with col_m_1:
        st.markdown("#### Heatmap fuente × partido")
        if not df_heatmap.empty:
            pivot = df_heatmap.pivot(index="fuente_id", columns="partido", values="sentimiento")
            fig_heat_fp = px.imshow(
                pivot,
                color_continuous_scale="RdYlGn",
                zmin=-1,
                zmax=1,
                aspect="auto",
            )
            fig_heat_fp.update_layout(
                height=420,
                margin=dict(t=10, b=10, l=10, r=10),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig_heat_fp, use_container_width=True)
        else:
            st.info("Sin datos para construir el heatmap fuente×partido.")

    with col_m_2:
        st.markdown("#### Sesgo relativo por fuente")
        if not df_sesgo.empty:
            df_rank_sesgo = (
                df_sesgo.groupby("fuente_id", as_index=False)
                .agg(
                    sesgo_medio=("sesgo_vs_global", "mean"),
                    n_noticias=("n_noticias", "sum"),
                )
                .sort_values("sesgo_medio", ascending=False)
            )
            st.dataframe(df_rank_sesgo.head(20), use_container_width=True, hide_index=True)
        else:
            st.info("Sin datos de sesgo fuente×partido en la ventana seleccionada.")

        st.markdown("#### Alertas de cobertura negativa")
        df_alertas_med = cargar_alertas_sentimiento(umbral=-0.35)
        if not df_alertas_med.empty:
            st.dataframe(df_alertas_med.head(12), use_container_width=True, hide_index=True)
        else:
            st.caption("Sin alertas negativas activas en 7 días.")

with radar_salud:
    st.markdown("#### Salud de fuentes")
    if not df_health.empty:
        st.dataframe(
            df_health[[
                "source_id", "source_type", "status", "articles_count",
                "errors_count", "freshness_lag_s", "checked_at",
            ]],
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info("Sin datos de `source_health`.")

    st.markdown("#### Últimas ejecuciones scraping")
    df_scraping = cargar_scraping_log(limit=40)
    if not df_scraping.empty:
        st.dataframe(df_scraping, use_container_width=True, hide_index=True)
    else:
        st.caption("No hay registros de `scraping_log`.")

    if not df_incidents.empty:
        st.markdown("#### Incidencias activas")
        st.dataframe(df_incidents, use_container_width=True, hide_index=True)
    else:
        st.success("Sin incidencias activas.")

st.divider()
st.caption("Vista detallada legacy disponible debajo para análisis granular.")

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_agenda_t, tab_sentimiento, tab_noticias, tab_bulos, tab_etl = st.tabs([
    "◈  Agenda & Mapa",
    "◉  Sentimiento",
    "◎  Feed Noticias",
    "⬡  Bulos & Desinformación",
    "⚙  Estado ETL",
])

# ── Tab 1: Agenda & Mapa ──────────────────────────────────────────────────────
with tab_agenda_t:
    col_agenda, col_sent_partidos = st.columns([1.2, 1])

    with col_agenda:
        sec_hdr("Mapa de Agenda — Hoy")
        df_agenda_view = df_agenda.copy()
        if df_agenda_view.empty and not df_noticias.empty:
            try:
                tmp = df_noticias.copy()
                tmp["tema"] = tmp.get("categoria", "general").fillna("general").astype(str).str.strip()
                tmp["tema"] = tmp["tema"].replace({"": "general"})
                tmp["sentimiento_score"] = pd.to_numeric(tmp.get("sentimiento_score"), errors="coerce").fillna(0.0)
                df_agenda_view = (
                    tmp.groupby("tema", as_index=False)
                    .agg(n_noticias=("titular", "count"), sentimiento_medio=("sentimiento_score", "mean"))
                    .sort_values("n_noticias", ascending=False)
                    .head(25)
                )
                total_n = max(float(df_agenda_view["n_noticias"].sum()), 1.0)
                df_agenda_view["peso_agenda"] = df_agenda_view["n_noticias"].astype(float) / total_n
                df_agenda_view["tendencia"] = "estable"
            except Exception:
                df_agenda_view = pd.DataFrame()

        selected_theme = None
        if not df_agenda_view.empty:
            fig_tree = px.treemap(
                df_agenda_view,
                path=["tema"],
                values="n_noticias",
                color="sentimiento_medio",
                color_continuous_scale=[[0, RED], [0.5, AMBER], [1, GREEN]],
                color_continuous_midpoint=0,
                hover_data=["sentimiento_medio"],
            )
            fig_tree.update_traces(
                textfont=dict(size=13, family="Inter, sans-serif"),
                hovertemplate="<b>%{label}</b><br>Noticias: %{value}<br>Sentimiento: %{color:.3f}<extra></extra>",
            )
            fig_tree.update_layout(
                height=380,
                paper_bgcolor="rgba(0,0,0,0)",
                margin=dict(t=0, b=0, l=0, r=0),
                coloraxis_colorbar=dict(title="Sent.", tickfont=dict(size=9, color=TEXT2)),
            )
            selection = st.plotly_chart(fig_tree, use_container_width=True, key="agenda_treemap", on_select="rerun")
            try:
                points = (selection or {}).get("selection", {}).get("points", [])
                if points:
                    selected_theme = str(points[0].get("label") or "").strip() or None
            except Exception:
                selected_theme = None
        else:
            st.info("Sin datos de agenda para la ventana actual. Ejecuta actualización ETL de prensa/agenda.")

    with col_sent_partidos:
        temas_options = df_agenda_view["tema"].astype(str).dropna().tolist() if not df_agenda_view.empty else []
        if temas_options:
            if selected_theme and selected_theme in temas_options:
                st.session_state["tema_agenda_activo"] = selected_theme
            tema_default = st.session_state.get("tema_agenda_activo", temas_options[0])
            if tema_default not in temas_options:
                tema_default = temas_options[0]
            tema_activo = st.selectbox("Tema activo (mapa)", temas_options,
                                       index=temas_options.index(tema_default), key="tema_agenda_activo_select")
            st.session_state["tema_agenda_activo"] = tema_activo

            sec_hdr(f"Impacto por Partido — {tema_activo}")
            df_impact = theme_party_impact(df_noticias, tema_activo)
            if not df_impact.empty:
                colors = [GREEN if float(v) > 0.05 else RED if float(v) < -0.05 else AMBER for v in df_impact["sent_medio"]]
                fig_imp = go.Figure(go.Bar(
                    x=df_impact["sent_medio"].round(3),
                    y=df_impact["partido"],
                    orientation="h",
                    marker_color=colors,
                    text=[f"{x:+.2f} · n={int(n)}" for x, n in zip(df_impact["sent_medio"], df_impact["n"])],
                    textposition="outside",
                    textfont=dict(color=TEXT2, size=10),
                ))
                fig_imp.update_layout(
                    xaxis=dict(
                        title=dict(text="Sentimiento medio por partido en este tema", font=dict(color=MUTED, size=10)),
                        range=[-1, 1], zeroline=True, zerolinecolor=MUTED, zerolinewidth=1,
                        gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9),
                    ),
                    yaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
                    height=300,
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                    margin=dict(t=10, b=10, l=10, r=80),
                    showlegend=False,
                )
                fig_imp.add_vline(x=0, line_color=MUTED, line_width=1)
                st.plotly_chart(fig_imp, use_container_width=True)
            else:
                st.info("Sin suficiente señal de partidos en este tema.")

            sec_hdr("Narrativas y Debates")
            narr = theme_narratives(df_noticias, tema_activo, topn=8)
            if narr:
                st.markdown(
                    "".join(
                        f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:4px">{t}</span>'
                        for t in narr
                    ),
                    unsafe_allow_html=True,
                )
            else:
                st.info("Sin narrativas claras para este tema en la ventana actual.")
        else:
            st.info("Sin temas disponibles para analizar en el mapa.")

    sec_hdr("Evolución de la Agenda — Últimos 30 Días", BLUE)
    df_agenda_hist = cargar_agenda_historica(dias=30, top_temas=12)
    if not df_agenda_hist.empty:
        df_pivot = df_agenda_hist.pivot_table(index="tema", columns="fecha", values="n_noticias", fill_value=0)
        fig_heat = go.Figure(go.Heatmap(
            z=df_pivot.values,
            x=[str(c)[:10] for c in df_pivot.columns],
            y=df_pivot.index.tolist(),
            colorscale=[[0.0, BG3], [0.3, "rgba(0,212,255,0.25)"], [0.7, "rgba(0,212,255,0.65)"], [1.0, CYAN]],
            hoverongaps=False,
            hovertemplate="<b>%{y}</b><br>%{x}<br>Noticias: %{z}<extra></extra>",
        ))
        fig_heat.update_layout(
            height=360,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(tickfont=dict(size=9, color=TEXT2), title=None),
            yaxis=dict(tickfont=dict(size=11, color=TEXT2), title=None),
            margin=dict(t=10, b=10, l=120, r=10),
        )
        st.plotly_chart(fig_heat, use_container_width=True)
    else:
        st.info("Sin datos de agenda histórica aún.")

    sec_hdr("Agenda Oficial — Próximos Eventos", PURPLE)
    df_oficial = cargar_agenda_oficial(limit=18)
    if df_oficial.empty:
        st.info("Sin agenda oficial en tiempo real disponible en este momento.")
    else:
        fuente_off = st.selectbox(
            "Fuente oficial",
            ["Todas"] + sorted(df_oficial["fuente"].unique().tolist()),
            key="agenda_oficial_fuente",
        )
        if fuente_off != "Todas":
            df_oficial = df_oficial[df_oficial["fuente"] == fuente_off]
        for _, row in df_oficial.iterrows():
            st.markdown(
                f'<div class="news-card news-neu">'
                f'<div style="font-weight:600;color:{TEXT};font-size:.88rem">{row.get("titulo", "")}</div>'
                f'<div style="font-size:.74rem;color:{MUTED};margin-top:.2rem">{row.get("fuente", "")} · {row.get("fecha", "")}</div>'
                f'<div style="font-size:.8rem;color:{TEXT2};margin-top:.35rem;line-height:1.45">{row.get("cita", "")}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

# ── Tab 2: Sentimiento ────────────────────────────────────────────────────────
with tab_sentimiento:
    sec_hdr("Evolución del Sentimiento — Serie Temporal")

    partidos_disponibles = (
        df_sent_all["entidad"].tolist() if not df_sent_all.empty
        else ["PP", "PSOE", "VOX", "SUMAR"]
    )
    sel_partidos = st.multiselect("Partidos a comparar", partidos_disponibles, default=partidos_disponibles[:4])

    if sel_partidos:
        fig_ts = go.Figure()
        palette = [CYAN, RED, AMBER, GREEN, PURPLE, ORANGE, "#EC4899"]
        for i, partido in enumerate(sel_partidos):
            df_s = cargar_sentimiento_partido(partido, dias_sent)
            if df_s.empty:
                continue
            color = palette[i % len(palette)]
            fig_ts.add_trace(go.Scatter(
                x=list(df_s["fecha"]) + list(df_s["fecha"])[::-1],
                y=(list((df_s["pct_positivo"] - 50).fillna(0) / 100) +
                   list(-(df_s["pct_negativo"] - 50).fillna(0)[::-1] / 100)),
                fill="toself",
                fillcolor=_hex_to_rgba(color, 0.10),
                line=dict(color="rgba(0,0,0,0)"),
                showlegend=False,
                hoverinfo="skip",
            ))
            fig_ts.add_trace(go.Scatter(
                x=df_s["fecha"], y=df_s["sentimiento_medio"],
                name=partido, mode="lines+markers",
                line=dict(color=color, width=2.5),
                marker=dict(size=5, color=color),
            ))
        fig_ts.add_hline(y=0, line_dash="dot", line_color=MUTED, line_width=1)
        fig_ts.update_layout(
            height=420,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=False, title=None, tickfont=dict(color=TEXT2, size=9)),
            yaxis=dict(
                title=dict(text="Sentimiento medio", font=dict(color=MUTED, size=10)),
                gridcolor=BORDER, zeroline=True, zerolinecolor=MUTED, tickfont=dict(color=TEXT2, size=9),
            ),
            hovermode="x unified",
            legend=dict(orientation="h", y=1.05, bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT2, size=10)),
            margin=dict(t=30, b=20),
        )
        st.plotly_chart(fig_ts, use_container_width=True)
    else:
        st.info("Selecciona al menos un partido para visualizar la evolución temporal.")

# ── Tab 3: Feed de Noticias ───────────────────────────────────────────────────
with tab_noticias:
    sec_hdr("Feed de Noticias Recientes")

    col_filtros = st.columns(3)
    with col_filtros[0]:
        fuentes_disp = df_noticias["fuente"].unique().tolist() if not df_noticias.empty else []
        fuente_sel   = st.multiselect("Filtrar por fuente", fuentes_disp, default=fuentes_disp[:3])
    with col_filtros[1]:
        sent_filtro = st.selectbox("Sentimiento", ["Todos", "positivo", "negativo", "neutro"])
    with col_filtros[2]:
        n_mostrar = st.slider("Nº de noticias", 5, 50, 20)

    if not df_noticias.empty:
        df_feed = df_noticias.copy()
        if fuente_sel:
            df_feed = df_feed[df_feed["fuente"].isin(fuente_sel)]
        if sent_filtro != "Todos":
            df_feed = df_feed[df_feed["sentimiento_label"] == sent_filtro]
        df_feed = df_feed.head(n_mostrar)

        for _, row in df_feed.iterrows():
            sent       = row.get("sentimiento_label", "neutro")
            sent_color = GREEN if sent == "positivo" else RED if sent == "negativo" else MUTED
            sent_score = float(row.get("sentimiento_score") or 0)
            partidos   = row.get("partidos_mencionados", "") or ""
            temas_raw  = row.get("temas_json", "[]") or "[]"
            try:
                temas = json.loads(temas_raw) if isinstance(temas_raw, str) else temas_raw
            except Exception:
                temas = []

            partidos_html = "".join(
                f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{p.strip()}</span>'
                for p in partidos.split(",") if p.strip()
            )
            temas_html = "".join(
                f'<span class="badge" style="background:rgba(0,212,255,0.08);color:{CYAN};border:1px solid rgba(0,212,255,0.2);margin-right:3px">{t}</span>'
                for t in temas[:3]
            )
            css_cls = "news-pos" if sent == "positivo" else "news-neg" if sent == "negativo" else "news-neu"
            st.markdown(
                f'<div class="news-card {css_cls}">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
                f'<div style="flex:1">'
                f'<a href="{row.get("url","#")}" target="_blank" style="font-weight:600;color:{TEXT};text-decoration:none;font-size:.9rem">{str(row.get("titular",""))[:100]}</a>'
                f'<div style="margin-top:.3rem;font-size:.75rem;color:{MUTED}">{row.get("fuente","—")} · {str(row.get("fecha_publicacion",""))[:10]} &nbsp; {partidos_html} {temas_html}</div>'
                f'</div>'
                f'<div style="margin-left:1rem;text-align:right;min-width:4rem">'
                f'<div style="font-size:1rem;font-weight:700;color:{sent_color};font-family:JetBrains Mono,monospace">{sent_score:+.2f}</div>'
                f'<div style="font-size:.68rem;color:{MUTED}">{sent}</div>'
                f'</div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.info("Sin noticias. Ejecuta: `python -m etl.sources.rss_noticias`")

# ── Tab 4: Bulos y Desinformación ─────────────────────────────────────────────
with tab_bulos:
    # Prioridad: 1) fact_check BD real, 2) detección desde noticias ingestadas
    df_fc = cargar_fact_checks(dias=30, limit=25)
    if not df_fc.empty:
        bulos_data = [_fact_check_row_to_bulo(row) for _, row in df_fc.iterrows()]
        fuente_texto = "Datos de fact-checkers verificados (Newtral, Maldita, EFE Verifica, AFP Factual)."
    else:
        bulos_data = bulos_desde_noticias(df_noticias, limit=18)
        fuente_texto = (
            "Detección preliminar desde prensa monitorizada. "
            "Ejecuta <code>python -m etl.sources.factcheck_feeds</code> para ingestar fact-checks reales."
        )

    st.markdown(
        f'<div class="info-banner">'
        f'<div style="font-weight:700;font-size:.95rem;color:{TEXT}">Monitor de Desinformación</div>'
        f'<div style="font-size:.82rem;color:{TEXT2};margin-top:.3rem">{fuente_texto}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    if not bulos_data:
        st.info("No se detectaron bulos en las fuentes verificadas ni en la prensa ingestada para esta ventana temporal.")
    else:
        total_bulos = len(bulos_data)
        falsos    = sum(1 for b in bulos_data if b["veredicto"] == "FALSO")
        enganosos = sum(1 for b in bulos_data if b["veredicto"] == "ENGAÑOSO")
        sin_ver   = sum(1 for b in bulos_data if b["veredicto"] == "SIN VERIFICAR")
        sin_aval  = sum(1 for b in bulos_data if b["veredicto"] == "SIN AVAL CIENTÍFICO")

        kcol1, kcol2, kcol3, kcol4, kcol5 = st.columns(5)
        with kcol1: st.metric("Total (30 días)", total_bulos)
        with kcol2: st.metric("FALSO", falsos)
        with kcol3: st.metric("ENGAÑOSO", enganosos)
        with kcol4: st.metric("SIN VERIFICAR", sin_ver)
        with kcol5: st.metric("SIN AVAL CIENTÍFICO", sin_aval)

        st.divider()

        col_bar_b, col_pie_b = st.columns(2)
        with col_bar_b:
            sec_hdr("Bulos por Partido Implicado", RED)
            conteo_partidos: dict[str, int] = {}
            for b in bulos_data:
                for p in b["partidos_implicados"]:
                    conteo_partidos[p] = conteo_partidos.get(p, 0) + 1
            partidos_ord = sorted(conteo_partidos.items(), key=lambda x: x[1], reverse=True)
            PARTY_COL = {"PP": "#3B82F6", "PSOE": "#EF4444", "VOX": "#22C55E", "SUMAR": "#EC4899"}
            fig_bulos_bar = go.Figure(go.Bar(
                x=[x[0] for x in partidos_ord],
                y=[x[1] for x in partidos_ord],
                marker_color=[PARTY_COL.get(x[0], MUTED) for x in partidos_ord],
                text=[x[1] for x in partidos_ord],
                textposition="outside",
                textfont=dict(color=TEXT2, size=10),
            ))
            fig_bulos_bar.update_layout(
                height=300, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
                yaxis=dict(title="Nº de bulos", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
                margin=dict(t=10, b=10), showlegend=False,
            )
            st.plotly_chart(fig_bulos_bar, use_container_width=True)

        with col_pie_b:
            sec_hdr("Distribución por Veredicto", PURPLE)
            ver_labels = ["FALSO", "ENGAÑOSO", "SIN VERIFICAR", "SIN AVAL CIENTÍFICO"]
            ver_values = [falsos, enganosos, sin_ver, sin_aval]
            ver_colors = [RED, ORANGE, YELLOW, PURPLE]
            fig_pie_ver = go.Figure(go.Pie(
                labels=ver_labels, values=ver_values, marker_colors=ver_colors,
                hole=0.45, textinfo="label+percent", textfont=dict(size=11, color=TEXT),
            ))
            fig_pie_ver.update_layout(
                height=300, paper_bgcolor="rgba(0,0,0,0)",
                margin=dict(t=10, b=10, l=10, r=10), showlegend=False,
                annotations=[dict(text="Veredictos", x=0.5, y=0.5, font_size=11, showarrow=False, font_color=TEXT2)],
            )
            st.plotly_chart(fig_pie_ver, use_container_width=True)

        sec_hdr("Línea Temporal de Bulos", AMBER)
        timeline_titulares = [
            b["titular_bulo"][:60] + "..." if len(b["titular_bulo"]) > 60 else b["titular_bulo"]
            for b in bulos_data
        ]
        fig_timeline = go.Figure()
        for i, bulo in enumerate(bulos_data):
            fig_timeline.add_trace(go.Scatter(
                x=[bulo["fecha"]], y=[i],
                mode="markers+text",
                marker=dict(size=18, color=VEREDICTO_COLORS.get(bulo["veredicto"], MUTED),
                            line=dict(color=BG2, width=2)),
                text=[bulo["veredicto"]],
                textposition="middle right",
                textfont=dict(size=9, color=TEXT2),
                hovertemplate=(
                    f"<b>{bulo['fecha']}</b><br>"
                    f"{bulo['titular_bulo'][:80]}<br>"
                    f"Veredicto: <b>{bulo['veredicto']}</b><br>"
                    f"Fuente: {bulo['fuente_verificacion']}"
                    "<extra></extra>"
                ),
                showlegend=False,
            ))
        fig_timeline.update_layout(
            height=max(300, len(bulos_data) * 28),
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title=None, showgrid=False, tickfont=dict(size=9, color=TEXT2)),
            yaxis=dict(
                tickvals=list(range(len(bulos_data))),
                ticktext=[t[:45] + "..." if len(t) > 45 else t for t in timeline_titulares],
                tickfont=dict(size=9, color=TEXT2), title=None,
            ),
            margin=dict(t=10, b=10, l=280, r=20), showlegend=False,
        )
        st.plotly_chart(fig_timeline, use_container_width=True)

        sec_hdr("Detalle de Bulos Verificados")
        filtro_ver = st.selectbox(
            "Filtrar por veredicto",
            ["Todos", "FALSO", "ENGAÑOSO", "SIN VERIFICAR", "SIN AVAL CIENTÍFICO"],
            key="filtro_veredicto",
        )
        bulos_mostrar = bulos_data if filtro_ver == "Todos" else [b for b in bulos_data if b["veredicto"] == filtro_ver]

        for bulo in bulos_mostrar:
            ver_color = VEREDICTO_COLORS.get(bulo["veredicto"], MUTED)
            partidos_html = "".join(
                f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{p}</span>'
                for p in bulo["partidos_implicados"]
            )
            st.markdown(
                f'<div class="bulo-card" style="border-left:3px solid {ver_color}">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">'
                f'<div style="flex:1">'
                f'<div style="font-weight:700;font-size:.92rem;color:{TEXT};margin-bottom:.3rem">{bulo["titular_bulo"]}</div>'
                f'<div style="font-size:.75rem;color:{MUTED}">{bulo["fecha"]} &nbsp;&bull;&nbsp; Origen: {bulo["fuente_origen"]} &nbsp;&bull;&nbsp; {partidos_html}</div>'
                f'</div>'
                f'<div style="margin-left:1rem;flex-shrink:0">'
                f'<span class="badge" style="background:{ver_color}25;color:{ver_color};border:1px solid {ver_color}55;font-size:.75rem;padding:.25rem .7rem">{bulo["veredicto"]}</span>'
                f'</div>'
                f'</div>'
                f'<div style="font-size:.82rem;color:{TEXT2};background:{BG3};border-radius:6px;padding:.6rem .8rem;margin-bottom:.4rem;line-height:1.5">{bulo["explicacion"]}</div>'
                f'<div style="display:flex;justify-content:space-between;font-size:.75rem;color:{MUTED}">'
                f'<span>Impacto: <b style="color:{TEXT2}">{bulo["impacto"]}</b></span>'
                f'<span>Verificado por: <b style="color:{CYAN}">{bulo["fuente_verificacion"]}</b></span>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
            if bulo.get("url"):
                st.markdown(f"[Ver fuente]({bulo['url']})")

# ── Tab 5: Estado ETL ─────────────────────────────────────────────────────────
with tab_etl:
    sec_hdr("Estado de Fuentes de Ingesta", CYAN)

    if df_health.empty:
        st.info(
            "Tabla `source_health` vacía. Ejecuta la migración "
            "`db/migrations/0012_media_infrastructure.sql` y los jobs ETL."
        )
    else:
        STATUS_COLOR = {"ok": GREEN, "degraded": AMBER, "failing": RED, "unknown": MUTED}
        for _, row in df_health.iterrows():
            sc = STATUS_COLOR.get(str(row.get("status", "unknown")), MUTED)
            lag = row.get("freshness_lag_s")
            lag_txt = f"{int(lag) // 60} min" if lag and lag < 3600 else (f"{int(lag) // 3600} h" if lag else "—")
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.8rem;padding:.5rem .8rem;'
                f'background:{BG2};border:1px solid {BORDER};border-radius:6px;margin-bottom:.3rem">'
                f'<span style="width:8px;height:8px;border-radius:50%;background:{sc};flex-shrink:0"></span>'
                f'<span style="flex:1;font-size:.85rem;color:{TEXT};font-weight:600">{row.get("source_id","")}</span>'
                f'<span style="font-size:.75rem;color:{MUTED}">{row.get("source_type","")}</span>'
                f'<span style="font-size:.75rem;color:{TEXT2}">{row.get("articles_count",0)} arts</span>'
                f'<span style="font-size:.75rem;color:{MUTED}">lag: {lag_txt}</span>'
                f'<span style="font-size:.72rem;font-weight:700;color:{sc}">{str(row.get("status","")).upper()}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

    if not df_incidents.empty:
        sec_hdr("Incidencias Activas", RED)
        for _, inc in df_incidents.iterrows():
            sev_color = RED if inc.get("severity") == "critical" else (AMBER if inc.get("severity") == "major" else MUTED)
            st.markdown(
                f'<div style="padding:.5rem .8rem;background:{BG2};border:1px solid {sev_color}44;'
                f'border-left:3px solid {sev_color};border-radius:6px;margin-bottom:.3rem">'
                f'<span style="font-weight:700;font-size:.82rem;color:{sev_color}">[{str(inc.get("severity","")).upper()}]</span>'
                f' <span style="font-size:.82rem;color:{TEXT}">{inc.get("source_id","")} — {inc.get("error_type","")}</span>'
                f'<span style="font-size:.72rem;color:{MUTED};float:right">{str(inc.get("last_seen",""))[:16]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.success("Sin incidencias activas en los últimos 7 días.")

    st.caption(
        "Para registrar estado manualmente: INSERT INTO source_health (source_id, source_type, status, articles_count). "
        "Los jobs ETL actualizan esta tabla automáticamente cuando están configurados."
    )

st.caption(
    "Fuentes: El País, El Mundo, ABC, RTVE, La Vanguardia, El Confidencial, elDiario.es, "
    "Expansión, Cinco Días, El Economista, InfoLibre + más. Actualización cada hora. "
    "Fact-checking: Newtral, Maldita.es, EFE Verifica, AFP Factual."
)
