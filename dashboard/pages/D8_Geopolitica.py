"""
POLITEIA — Geopolítica & RRII v2 (D8)
6 tabs: Teatro Global · España en el Mundo · OSINT Intelligence
        Impacto Doméstico · Alertas & Señales · Análisis IA

Arquitectura de datos:
  - etl/sources/geo/scraper_acled.py         → eventos_acled (DB / demo)
  - etl/sources/geo/scraper_osint_advanced.py → osint_geo.json
  - etl/sources/geo/scraper_gdelt.py          → merge en osint_geo.json
  - agents/geo/enricher_ollama.py             → enriquecimiento LLM
  - agents/geo/signal_engine_geo.py           → alertas_geo.json
  - dashboard/utils/geo_helpers.py            → acceso cacheado
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import json
from collections import Counter
from datetime import datetime, timezone

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    AMBER, BG, BG2, BG3, BLUE, BORDER, CYAN, GREEN, MUTED,
    PURPLE, RED, TEXT, TEXT2, kpi_card, section_header, sidebar_nav,
    mostrar_alertas_pagina,
)

st.set_page_config(page_title="Geopolítica — Politeia", page_icon="🌍", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("geopolitica")

# ── LLM ───────────────────────────────────────────────────────────────────────
try:
    from dashboard.services import llm_local as _brain
    _BRAIN_OK = _brain.esta_disponible()
except Exception:
    _brain = None  # type: ignore
    _BRAIN_OK = False

# ── Helpers ───────────────────────────────────────────────────────────────────
try:
    from dashboard.utils.geo_helpers import (
        get_alertas_nivel,
        get_analisis_pais_llm,
        get_briefing_diario,
        get_count_alertas,
        get_eventos_acled,
        get_impactos_filtered,
        get_osint_filtered,
        get_osint_stats,
        get_paises_mas_mencionados,
        get_presencia_espanola,
        get_riesgo_pais,
        get_stats_geo,
        get_trending_topics_geo,
        search_osint_semantic,
    )
    _GEO_OK = True
except Exception as _e:
    _GEO_OK = False
    st.warning(f"⚠️ Módulo geo_helpers no disponible: {_e}")

    def get_riesgo_pais(**kw): return []
    def get_presencia_espanola(**kw): return []
    def get_osint_filtered(**kw): return []
    def get_alertas_nivel(**kw): return []
    def get_count_alertas(**kw): return {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}
    def get_impactos_filtered(**kw): return []
    def get_eventos_acled(**kw): return []
    def get_stats_geo(): return {}
    def get_briefing_diario(): return None
    def get_trending_topics_geo(**kw): return []
    def get_paises_mas_mencionados(**kw): return []
    def get_osint_stats(): return {}
    def search_osint_semantic(q, **kw): return ""
    def get_analisis_pais_llm(iso3, nombre): return ""


# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
.geo-badge {{
    display:inline-flex;align-items:center;gap:.3rem;
    padding:.2rem .6rem;border-radius:20px;font-size:.72rem;font-weight:700;
    letter-spacing:.04em;text-transform:uppercase;
}}
.nivel-critico {{ background:#7f1d1d55;color:{RED};border:1px solid {RED}66; }}
.nivel-alto    {{ background:#451a0355;color:{AMBER};border:1px solid {AMBER}66; }}
.nivel-medio   {{ background:#1e3a5f55;color:{BLUE};border:1px solid {BLUE}66; }}
.nivel-bajo    {{ background:#14532d55;color:{GREEN};border:1px solid {GREEN}66; }}
.osint-card {{
    background:{BG2};border:1px solid {BORDER};border-radius:10px;
    padding:.9rem 1.1rem;margin-bottom:.6rem;
}}
.urgencia-5 {{ border-left:4px solid {RED}; }}
.urgencia-4 {{ border-left:4px solid {AMBER}; }}
.urgencia-3 {{ border-left:4px solid {BLUE}; }}
.urgencia-2 {{ border-left:4px solid {GREEN}; }}
.pais-chip {{
    display:inline-block;background:{BG3};border:1px solid {BORDER};
    border-radius:4px;padding:.1rem .4rem;font-size:.68rem;color:{TEXT2};
    margin:.1rem;
}}
</style>
""", unsafe_allow_html=True)


# ── Header ────────────────────────────────────────────────────────────────────
stats_geo = get_stats_geo()
alertas_count = get_count_alertas()

alerta_badge = ""
if alertas_count.get("CRITICO", 0) > 0:
    alerta_badge = f'<span class="geo-badge nivel-critico">🚨 {alertas_count["CRITICO"]} CRÍTICO</span>'
elif alertas_count.get("ALTO", 0) > 0:
    alerta_badge = f'<span class="geo-badge nivel-alto">⚠️ {alertas_count["ALTO"]} ALTO</span>'

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,{BLUE},{CYAN});
              border-radius:12px;display:flex;align-items:center;justify-content:center;
              font-size:1.6rem;flex-shrink:0;box-shadow:0 0 20px {BLUE}55">🌍</div>
  <div style="flex:1">
    <div style="display:flex;align-items:center;gap:.8rem">
      <h2 style="margin:0;color:{TEXT};font-size:1.45rem;font-weight:900">Geopolítica & RRII</h2>
      {alerta_badge}
    </div>
    <div style="color:{TEXT2};font-size:.78rem">
      OSINT · ACLED · GDELT · Análisis Ollama · Briefing Diario
    </div>
  </div>
  <div style="text-align:right">
    <div style="color:{TEXT2};font-size:.7rem">OSINT 24h</div>
    <div style="color:{CYAN};font-weight:700;font-size:1.1rem">{stats_geo.get('osint_24h', 0)}</div>
  </div>
  <div style="text-align:right;margin-left:1rem">
    <div style="color:{TEXT2};font-size:.7rem">Eventos ACLED 7d</div>
    <div style="color:{AMBER};font-weight:700;font-size:1.1rem">{stats_geo.get('eventos_acled_7d', 0)}</div>
  </div>
</div>
""", unsafe_allow_html=True)


# ── Tabs ──────────────────────────────────────────────────────────────────────
(
    tab_teatro,
    tab_espana,
    tab_osint,
    tab_impacto,
    tab_alertas,
    tab_ia,
) = st.tabs([
    "🗺️ Teatro Global",
    "🇪🇸 España en el Mundo",
    "🔍 OSINT Intelligence",
    "📊 Impacto Doméstico",
    "🚨 Alertas & Señales",
    "🧠 Análisis IA",
])


# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — Teatro Global
# ══════════════════════════════════════════════════════════════════════════════
with tab_teatro:
    section_header("🗺️ Teatro Geopolítico Global", "Mapa de riesgo y conflictos activos")

    paises_riesgo = get_riesgo_pais(interes_min=0.5, limit=20)
    paises_alto_riesgo = [p for p in paises_riesgo if float(p.get("score_total", 0)) >= 7]
    paises_subiendo = [p for p in paises_riesgo if p.get("riesgo_tendencia") == "subiendo"]

    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.markdown(kpi_card("Países monitorizados", len(paises_riesgo), color=CYAN), unsafe_allow_html=True)
    with k2:
        st.markdown(kpi_card("Riesgo Alto/Crítico (≥7)", len(paises_alto_riesgo), color=RED), unsafe_allow_html=True)
    with k3:
        st.markdown(kpi_card("Tendencia subiendo", len(paises_subiendo), color=AMBER), unsafe_allow_html=True)
    with k4:
        st.markdown(kpi_card("OSINT activo", stats_geo.get("osint_total", 0), color=PURPLE), unsafe_allow_html=True)

    st.markdown("---")
    col_mapa, col_tabla = st.columns([3, 2])

    with col_mapa:
        section_header("Mapa de Riesgo", "Score ponderado por interés para España")

        if paises_riesgo:
            df_mapa = pd.DataFrame(paises_riesgo)
            for col in ["lat_capital", "lon_capital", "score_total", "interes_espana"]:
                if col not in df_mapa.columns:
                    df_mapa[col] = 0.0

            df_mapa["score_total"] = df_mapa["score_total"].astype(float)
            df_mapa["interes_espana"] = df_mapa["interes_espana"].astype(float)

            fig_mapa = px.scatter_geo(
                df_mapa,
                lat="lat_capital",
                lon="lon_capital",
                size="score_total",
                color="score_total",
                color_continuous_scale=[[0, GREEN], [0.5, AMBER], [1.0, RED]],
                range_color=[0, 10],
                hover_name="nombre",
                size_max=30,
                labels={"score_total": "Riesgo"},
            )
            fig_mapa.update_layout(
                paper_bgcolor=BG,
                geo=dict(
                    bgcolor=BG, landcolor="#1a2840", oceancolor="#0a1525",
                    coastlinecolor=BORDER, countrycolor=BORDER,
                    showland=True, showocean=True, showcoastlines=True,
                    showframe=False, projection_type="natural earth",
                ),
                coloraxis_colorbar=dict(
                    bgcolor=BG2, bordercolor=BORDER,
                    tickfont=dict(color=TEXT2),
                    title=dict(text="Riesgo", font=dict(color=TEXT2)),
                ),
                margin=dict(l=0, r=0, t=0, b=0),
                height=420,
            )
            st.plotly_chart(fig_mapa, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("Sin datos de riesgo_pais. Ejecuta la migración 0016.")

    with col_tabla:
        section_header("Top Países — Riesgo × Interés España")

        if paises_riesgo:
            sorted_paises = sorted(
                paises_riesgo,
                key=lambda p: float(p.get("score_total", 0)) * float(p.get("interes_espana", 0)),
                reverse=True,
            )[:12]

            for p in sorted_paises:
                score = float(p.get("score_total", 0))
                interes = float(p.get("interes_espana", 0))
                tendencia = p.get("riesgo_tendencia", "estable")
                trend_icon = {"subiendo": "↑", "bajando": "↓", "estable": "→"}.get(tendencia, "→")
                trend_color = {"subiendo": RED, "bajando": GREEN, "estable": TEXT2}.get(tendencia, TEXT2)
                score_bar = int((score / 10) * 100)
                flag = p.get("flag_emoji", "🏳️")
                empresas = (p.get("empresas_espanolas") or [])[:2]

                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                            padding:.6rem .8rem;margin-bottom:.4rem">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="color:{TEXT};font-weight:700;font-size:.85rem">
                      {flag} {p.get('nombre','?')}
                    </span>
                    <span style="color:{trend_color};font-weight:700;font-size:.85rem">
                      {trend_icon} {score:.1f}/10
                    </span>
                  </div>
                  <div style="margin:.4rem 0 .2rem;height:4px;background:{BORDER};border-radius:2px">
                    <div style="width:{score_bar}%;height:4px;border-radius:2px;
                                background:{'#ef4444' if score>=7 else '#f59e0b' if score>=5 else '#10b981'}"></div>
                  </div>
                  <div style="color:{TEXT2};font-size:.7rem">
                    Interés: {interes*100:.0f}% · {', '.join(empresas)}
                  </div>
                </div>
                """, unsafe_allow_html=True)

    # Matriz riesgo × interés
    if paises_riesgo and len(paises_riesgo) > 3:
        st.markdown("---")
        section_header("Matriz Riesgo × Interés España")
        df_bub = pd.DataFrame(paises_riesgo)
        df_bub["score_total"] = df_bub["score_total"].astype(float)
        df_bub["interes_espana"] = df_bub["interes_espana"].astype(float)
        df_bub["size_val"] = (df_bub["score_total"] * df_bub["interes_espana"] * 15).clip(lower=2)

        fig_bub = px.scatter(
            df_bub, x="interes_espana", y="score_total",
            size="size_val", color="score_total",
            color_continuous_scale=[[0, GREEN], [0.5, AMBER], [1.0, RED]],
            range_color=[0, 10],
            hover_name="nombre",
            labels={"interes_espana": "Interés para España", "score_total": "Score Riesgo"},
        )
        fig_bub.update_layout(
            paper_bgcolor=BG, plot_bgcolor=BG2, height=320,
            font=dict(color=TEXT2), coloraxis_showscale=False,
            xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
            yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
            margin=dict(l=40, r=20, t=20, b=40),
        )
        fig_bub.add_hline(y=7, line_dash="dot", line_color=RED, opacity=0.4)
        fig_bub.add_vline(x=0.65, line_dash="dot", line_color=CYAN, opacity=0.4)
        st.plotly_chart(fig_bub, use_container_width=True, config={"displayModeBar": False})


# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — España en el Mundo
# ══════════════════════════════════════════════════════════════════════════════
with tab_espana:
    section_header("🇪🇸 España en el Mundo", "Presencia global: militar, energética, empresarial y diplomática")

    sub_tipos = ["militar", "energetica", "empresarial", "diplomatica", "diaspora"]
    sub_labels = ["🪖 Misiones Militares", "⚡ Energética",
                  "🏢 Empresarial", "🤝 Diplomática", "👥 Diáspora"]
    sub_tabs = st.tabs(sub_labels)

    presencia_all = get_presencia_espanola()
    tipo_icons = {
        "militar": "🪖", "energetica": "⚡", "empresarial": "🏢",
        "diplomatica": "🤝", "diaspora": "👥",
    }

    for sub_tab, tipo, label in zip(sub_tabs, sub_tipos, sub_labels):
        with sub_tab:
            items_tipo = [p for p in presencia_all if p.get("tipo_presencia") == tipo]
            if not items_tipo:
                st.info(f"Sin datos de presencia '{tipo}' registrados.")
                continue

            c1, c2, c3 = st.columns(3)
            with c1:
                st.markdown(kpi_card("Ubicaciones", len(items_tipo), color=CYAN), unsafe_allow_html=True)
            with c2:
                rel_media = sum(float(p.get("relevancia", 0)) for p in items_tipo) / len(items_tipo)
                st.markdown(kpi_card("Relevancia media", f"{rel_media:.2f}", color=AMBER), unsafe_allow_html=True)
            with c3:
                actores = list({p.get("actor_espanol", "") for p in items_tipo if p.get("actor_espanol")})
                st.markdown(kpi_card("Actores", len(actores), color=PURPLE), unsafe_allow_html=True)

            # Mapa
            df_pres = pd.DataFrame(items_tipo)
            if "lat" in df_pres.columns and "lon" in df_pres.columns:
                df_pres["lat"] = df_pres["lat"].astype(float)
                df_pres["lon"] = df_pres["lon"].astype(float)
                df_pres["rel_size"] = (df_pres["relevancia"].astype(float) * 100).clip(lower=5)

                fig_p = px.scatter_geo(
                    df_pres, lat="lat", lon="lon", size="rel_size",
                    hover_name="pais",
                    hover_data={"descripcion": True, "actor_espanol": True,
                                "lat": False, "lon": False, "rel_size": False},
                    size_max=18,
                    color_discrete_sequence=[CYAN],
                )
                fig_p.update_layout(
                    paper_bgcolor=BG,
                    geo=dict(bgcolor=BG, landcolor="#1a2840", oceancolor="#0a1525",
                             coastlinecolor=BORDER, countrycolor=BORDER,
                             showland=True, showocean=True, showframe=False,
                             projection_type="natural earth"),
                    margin=dict(l=0, r=0, t=0, b=0), height=260,
                )
                st.plotly_chart(fig_p, use_container_width=True, config={"displayModeBar": False})

            # Lista
            for item in sorted(items_tipo, key=lambda x: -float(x.get("relevancia", 0))):
                rel = float(item.get("relevancia", 0))
                rel_color = RED if rel >= 0.85 else AMBER if rel >= 0.7 else GREEN
                st.markdown(f"""
                <div class="osint-card">
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:{TEXT};font-weight:700">
                      {tipo_icons.get(tipo,'📍')} {item.get('pais','?')}
                      <span style="color:{TEXT2};font-size:.8rem;font-weight:400;margin-left:.4rem">
                        {item.get('actor_espanol','')}
                      </span>
                    </span>
                    <span style="color:{rel_color};font-weight:700">{rel:.0%}</span>
                  </div>
                  <div style="color:{TEXT2};font-size:.85rem;margin-top:.3rem">
                    {item.get('descripcion','')}
                  </div>
                </div>
                """, unsafe_allow_html=True)

    # Mapa global
    if presencia_all:
        st.markdown("---")
        section_header("Mapa Global de Presencia Española")
        df_g = pd.DataFrame(presencia_all)
        if "lat" in df_g.columns:
            df_g["lat"] = df_g["lat"].astype(float)
            df_g["lon"] = df_g["lon"].astype(float)
            color_map = {"militar": RED, "energetica": AMBER, "empresarial": BLUE,
                         "diplomatica": CYAN, "diaspora": PURPLE}
            fig_g = px.scatter_geo(
                df_g, lat="lat", lon="lon", color="tipo_presencia",
                color_discrete_map=color_map,
                hover_name="pais",
                hover_data={"descripcion": True, "actor_espanol": True,
                            "lat": False, "lon": False},
                size_max=14,
            )
            fig_g.update_layout(
                paper_bgcolor=BG,
                geo=dict(bgcolor=BG, landcolor="#1a2840", oceancolor="#0a1525",
                         coastlinecolor=BORDER, countrycolor=BORDER,
                         showland=True, showocean=True, showframe=False,
                         projection_type="natural earth"),
                legend=dict(bgcolor=BG2, font=dict(color=TEXT2), bordercolor=BORDER),
                margin=dict(l=0, r=0, t=0, b=0), height=340,
            )
            st.plotly_chart(fig_g, use_container_width=True, config={"displayModeBar": False})


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — OSINT Intelligence
# ══════════════════════════════════════════════════════════════════════════════
with tab_osint:
    section_header("🔍 OSINT Intelligence", "Noticias y señales geopolíticas en tiempo real")

    c_fil1, c_fil2, c_fil3, c_fil4 = st.columns([2, 2, 2, 2])
    with c_fil1:
        horas_osint = st.selectbox("Ventana temporal", [6, 12, 24, 48, 72, 168],
                                   index=2, format_func=lambda h: f"Últimas {h}h")
    with c_fil2:
        urg_min = st.selectbox("Urgencia mínima", [1, 2, 3, 4, 5],
                               index=0, format_func=lambda u: f"≥ {u}")
    with c_fil3:
        categorias_disp = ["todas", "conflicto_armado", "terrorismo", "diplomacia",
                           "energia", "migracion", "ciberseguridad", "defensa"]
        cat_sel = st.selectbox("Categoría", categorias_disp)
        cat_filter = None if cat_sel == "todas" else cat_sel
    with c_fil4:
        rel_min = st.slider("Relevancia España mín.", 0.0, 1.0, 0.3, 0.05)

    osint_stats = get_osint_stats()
    s1, s2, s3, s4 = st.columns(4)
    with s1: st.markdown(kpi_card("Total corpus", osint_stats.get("total", 0), color=CYAN), unsafe_allow_html=True)
    with s2: st.markdown(kpi_card("Últimas 24h", osint_stats.get("ultimas_24h", 0), color=BLUE), unsafe_allow_html=True)
    with s3: st.markdown(kpi_card("Procesados LLM", osint_stats.get("procesados_llm", 0), color=PURPLE), unsafe_allow_html=True)
    with s4:
        urg45 = (osint_stats.get("por_urgencia", {}).get(4, 0) +
                 osint_stats.get("por_urgencia", {}).get(5, 0))
        st.markdown(kpi_card("Urgencia ≥4", urg45, color=RED), unsafe_allow_html=True)

    st.markdown("---")

    col_feed, col_trends = st.columns([3, 1])

    with col_trends:
        section_header("🔥 Trending")
        trending = get_trending_topics_geo(horas=horas_osint, top_n=8)
        if trending:
            for t in trending:
                urg_c = RED if t["urgencia_media"] >= 4 else AMBER if t["urgencia_media"] >= 3 else TEXT2
                st.markdown(f"""
                <div style="display:flex;justify-content:space-between;align-items:center;
                            padding:.3rem 0;border-bottom:1px solid {BORDER}">
                  <span style="color:{TEXT2};font-size:.78rem">{t['tema']}</span>
                  <span style="color:{urg_c};font-weight:700;font-size:.78rem">{t['count']}</span>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.caption("Sin tendencias")

        st.markdown("&nbsp;", unsafe_allow_html=True)
        section_header("🌍 Países")
        paises_top = get_paises_mas_mencionados(horas=horas_osint, top_n=8)
        for pm in paises_top:
            st.markdown(f"""
            <div style="display:flex;justify-content:space-between;
                        padding:.3rem 0;border-bottom:1px solid {BORDER}">
              <span style="color:{TEXT2};font-size:.78rem">{pm['pais']}</span>
              <span style="color:{CYAN};font-weight:700;font-size:.78rem">{pm['menciones']}</span>
            </div>
            """, unsafe_allow_html=True)

    with col_feed:
        items_osint = get_osint_filtered(
            horas=horas_osint, urgencia_min=urg_min,
            relevancia_min=rel_min, categoria=cat_filter, limit=40,
        )

        if not items_osint:
            st.info("Sin items OSINT. Ejecuta: `python -m etl.pipelines.pipeline_geopolitica`")
        else:
            urg_vals = [int(i.get("urgencia", 1)) for i in items_osint]
            urg_dist = Counter(urg_vals)
            fig_urg = go.Figure([go.Bar(
                x=[f"U{k}" for k in sorted(urg_dist.keys())],
                y=[urg_dist[k] for k in sorted(urg_dist.keys())],
                marker_color=[
                    RED if k >= 4 else AMBER if k == 3 else BLUE if k == 2 else GREEN
                    for k in sorted(urg_dist.keys())
                ],
            )])
            fig_urg.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                margin=dict(l=0, r=0, t=0, b=0), height=75,
                yaxis=dict(visible=False), xaxis=dict(tickfont=dict(color=TEXT2, size=10)),
                showlegend=False,
            )
            st.plotly_chart(fig_urg, use_container_width=True, config={"displayModeBar": False})
            st.caption(f"{len(items_osint)} items")

            for item in items_osint:
                urgencia = int(item.get("urgencia", 1))
                relevancia = float(item.get("relevancia_espana", 0))
                titulo = item.get("titulo", "Sin título")
                resumen = item.get("resumen_ollama", item.get("contenido", ""))[:240]
                fuente = item.get("fuente", "")
                fecha = str(item.get("fecha_publicacion", ""))[:16]
                url = item.get("url", "")
                categoria = item.get("categoria", "")
                paises = item.get("paises_mencionados", [])[:3]
                procesado = item.get("procesado_llm", False)

                urg_color = {5: RED, 4: AMBER, 3: BLUE, 2: GREEN}.get(urgencia, TEXT2)
                paises_html = "".join(f'<span class="pais-chip">{p}</span>' for p in paises)
                llm_html = f'<span style="color:{CYAN};font-size:.65rem">✓ LLM</span>' if procesado else ''
                url_html = (f'<a href="{url}" target="_blank" style="color:{CYAN};font-size:.72rem">🔗</a>'
                            if url else "")
                cat_html = (f'<span style="color:{TEXT2};font-size:.7rem">[{categoria}]</span>'
                            if categoria else "")

                st.markdown(f"""
                <div class="osint-card urgencia-{urgencia}">
                  <div style="display:flex;justify-content:space-between;align-items:start">
                    <span style="color:{TEXT};font-weight:700;font-size:.87rem;flex:1;
                                 padding-right:.4rem">{titulo[:180]}</span>
                    <div style="text-align:right;flex-shrink:0">
                      <div style="color:{urg_color};font-weight:800;font-size:.78rem">U{urgencia}</div>
                      <div style="color:{TEXT2};font-size:.68rem">ESP {int(relevancia*100)}%</div>
                    </div>
                  </div>
                  {f'<div style="color:{TEXT2};font-size:.81rem;margin:.35rem 0">{resumen}</div>' if resumen else ''}
                  <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-top:.2rem">
                    {cat_html}{paises_html}
                    <span style="color:{MUTED};font-size:.68rem">{fuente} · {fecha}</span>
                    {llm_html} {url_html}
                  </div>
                </div>
                """, unsafe_allow_html=True)

    # Evolución
    if items_osint:
        st.markdown("---")
        section_header("📈 Evolución temporal OSINT")
        df_ev = pd.DataFrame(items_osint)
        if "fecha_publicacion" in df_ev.columns:
            df_ev["fecha_dt"] = pd.to_datetime(df_ev["fecha_publicacion"], errors="coerce", utc=True)
            df_ev = df_ev.dropna(subset=["fecha_dt"])
            if not df_ev.empty:
                df_ev["slot"] = df_ev["fecha_dt"].dt.floor("6h")
                ev_cnt = df_ev.groupby("slot").size().reset_index(name="n")
                fig_ev = px.area(ev_cnt, x="slot", y="n",
                                 labels={"slot": "", "n": "Items OSINT"})
                fig_ev.update_traces(line_color=CYAN, fillcolor=f"{CYAN}22")
                fig_ev.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    height=180, margin=dict(l=0, r=0, t=0, b=0),
                    xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
                    yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
                    showlegend=False,
                )
                st.plotly_chart(fig_ev, use_container_width=True, config={"displayModeBar": False})


# ══════════════════════════════════════════════════════════════════════════════
# TAB 4 — Impacto Doméstico
# ══════════════════════════════════════════════════════════════════════════════
with tab_impacto:
    section_header("📊 Impacto Doméstico en España", "Efectos directos sobre economía, seguridad y política")

    dimensiones = ["todas", "energia", "economia", "seguridad", "migracion",
                   "diplomacia", "comercio", "defensa", "ciberseguridad"]
    c_d1, c_d2 = st.columns(2)
    with c_d1:
        dim_sel = st.selectbox("Dimensión", dimensiones)
        dim_filter = None if dim_sel == "todas" else dim_sel
    with c_d2:
        sev_min = st.selectbox("Severidad mínima", [1, 2, 3, 4, 5],
                               index=1, format_func=lambda s: f"≥ {s}")

    impactos = get_impactos_filtered(dimension=dim_filter, severidad_min=sev_min, limite=30)

    if not impactos:
        st.info("Sin impactos domésticos registrados. "
                "Se generan automáticamente con relevancia_espana > 0.6.")

        # Proxy: eventos ACLED de alta relevancia
        section_header("Eventos ACLED de Alta Relevancia")
        eventos_acled = get_eventos_acled(days=30, relevancia_min=0.5, limite=10)
        for ev in eventos_acled:
            rel = float(ev.get("relevancia_es", ev.get("relevancia_espana", 0)))
            fat = int(ev.get("fatalities", 0))
            st.markdown(f"""
            <div class="osint-card">
              <div style="display:flex;justify-content:space-between">
                <span style="color:{TEXT};font-weight:700">
                  [{ev.get('pais','?')}] {ev.get('tipo_evento','')}
                </span>
                <span style="color:{RED if rel>=0.8 else AMBER};font-weight:700">
                  {rel:.0%} | 💀 {fat}
                </span>
              </div>
              <div style="color:{TEXT2};font-size:.82rem;margin-top:.3rem">
                {str(ev.get('notas',''))[:300]}
              </div>
              <div style="color:{MUTED};font-size:.7rem;margin-top:.2rem">
                {ev.get('fecha',ev.get('event_date',''))} · ACLED
              </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        sev_criticos = [i for i in impactos if int(i.get("severidad", 1)) >= 4]
        dim_unicas = len({i.get("dimension") for i in impactos})
        prob_m = sum(float(i.get("probabilidad", 0.5)) for i in impactos) / len(impactos)

        k1, k2, k3 = st.columns(3)
        with k1: st.markdown(kpi_card("Impactos activos", len(impactos), color=CYAN), unsafe_allow_html=True)
        with k2: st.markdown(kpi_card("Severidad ≥4", len(sev_criticos), color=RED), unsafe_allow_html=True)
        with k3: st.markdown(kpi_card("Prob. media", f"{prob_m:.0%}", color=AMBER), unsafe_allow_html=True)

        # Gráfico dimensiones
        dim_counts = Counter(i.get("dimension", "otros") for i in impactos)
        if len(dim_counts) > 1:
            fig_dim = px.pie(
                values=list(dim_counts.values()),
                names=list(dim_counts.keys()),
                color_discrete_sequence=[CYAN, BLUE, AMBER, RED, PURPLE, GREEN, TEXT2],
            )
            fig_dim.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT2)),
                margin=dict(l=0, r=0, t=0, b=0), height=180,
            )
            st.plotly_chart(fig_dim, use_container_width=True, config={"displayModeBar": False})

        dim_icons = {
            "energia": "⚡", "economia": "📈", "seguridad": "🛡️",
            "migracion": "🚶", "diplomacia": "🤝", "comercio": "💼",
            "defensa": "🪖", "ciberseguridad": "💻",
        }
        horizonte_colors = {
            "inmediato": RED, "corto_plazo": AMBER,
            "medio_plazo": BLUE, "largo_plazo": GREEN,
        }

        for imp in sorted(impactos, key=lambda x: -int(x.get("severidad", 1))):
            sev = int(imp.get("severidad", 2))
            sev_color = RED if sev >= 4 else AMBER if sev == 3 else BLUE
            dim = imp.get("dimension", "otros")
            horizonte = imp.get("horizonte", "medio_plazo")
            hcolor = horizonte_colors.get(horizonte, TEXT2)
            icon = dim_icons.get(dim, "📌")
            sectores = (imp.get("sectores_afectados") or [])[:4]
            empresas = (imp.get("empresas_afectadas") or [])[:3]

            st.markdown(f"""
            <div class="osint-card">
              <div style="display:flex;justify-content:space-between;align-items:start">
                <span style="color:{TEXT};font-weight:700;font-size:.88rem;flex:1">
                  {icon} {imp.get('titulo','')[:180]}
                </span>
                <div style="text-align:right;flex-shrink:0;margin-left:.5rem">
                  <div style="color:{sev_color};font-weight:700">SEV {sev}/5</div>
                  <div style="color:{hcolor};font-size:.7rem">{horizonte}</div>
                </div>
              </div>
              {f'<div style="color:{TEXT2};font-size:.81rem;margin:.4rem 0">{imp.get("descripcion","")[:400]}</div>'}
              {f'<div style="color:{CYAN};font-size:.8rem">💡 {imp.get("recomendacion","")[:200]}</div>' if imp.get("recomendacion") else ''}
              <div style="margin-top:.35rem">
                {''.join(f'<span class="pais-chip">{s}</span>' for s in sectores)}
                {''.join(f'<span class="pais-chip" style="color:{AMBER}">{e}</span>' for e in empresas)}
              </div>
            </div>
            """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 5 — Alertas & Señales
# ══════════════════════════════════════════════════════════════════════════════
with tab_alertas:
    section_header("🚨 Alertas & Señales de Alerta Temprana")

    c_al1, c_al2, c_al3, c_al4 = st.columns(4)
    with c_al1: st.markdown(kpi_card("CRÍTICO 🚨", alertas_count.get("CRITICO", 0), color=RED), unsafe_allow_html=True)
    with c_al2: st.markdown(kpi_card("ALTO ⚠️", alertas_count.get("ALTO", 0), color=AMBER), unsafe_allow_html=True)
    with c_al3: st.markdown(kpi_card("MEDIO 📌", alertas_count.get("MEDIO", 0), color=BLUE), unsafe_allow_html=True)
    with c_al4: st.markdown(kpi_card("BAJO ℹ️", alertas_count.get("BAJO", 0), color=GREEN), unsafe_allow_html=True)

    c_af1, c_af2, c_af3 = st.columns([2, 2, 2])
    with c_af1:
        nivel_filter = st.selectbox("Nivel", ["todos", "CRITICO", "ALTO", "MEDIO", "BAJO"])
    with c_af2:
        no_leidas = st.checkbox("Solo no leídas")
    with c_af3:
        lim_alertas = st.number_input("Límite", 5, 100, 20, 5)

    alertas = get_alertas_nivel(
        nivel=None if nivel_filter == "todos" else nivel_filter,
        limite=int(lim_alertas),
        solo_no_leidas=no_leidas,
    )

    if not alertas:
        st.info("Sin alertas activas.")
        section_header("📋 Reglas Críticas Configuradas")
        try:
            from agents.geo.signal_engine_geo import REGLAS_CRITICAS
            for regla in REGLAS_CRITICAS:
                bc = {"CRITICO": "nivel-critico", "ALTO": "nivel-alto",
                      "MEDIO": "nivel-medio", "BAJO": "nivel-bajo"}.get(regla["nivel"], "nivel-bajo")
                st.markdown(f"""
                <div class="osint-card">
                  <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.3rem">
                    <span class="geo-badge {bc}">{regla['nivel']}</span>
                    <span style="color:{TEXT};font-weight:700">{regla['nombre']}</span>
                  </div>
                  <div style="color:{TEXT2};font-size:.82rem">{regla['descripcion']}</div>
                  <div style="margin-top:.3rem">
                    {''.join(f'<span class="pais-chip">{p}</span>' for p in regla.get('paises',[])[:5])}
                    {''.join(f'<span class="pais-chip" style="color:{AMBER}">{k}</span>' for k in regla.get('keywords',[])[:4])}
                  </div>
                </div>
                """, unsafe_allow_html=True)
        except Exception:
            pass
    else:
        nivel_map = {
            "CRITICO": ("nivel-critico", "🚨"),
            "ALTO":    ("nivel-alto",    "⚠️"),
            "MEDIO":   ("nivel-medio",   "📌"),
            "BAJO":    ("nivel-bajo",    "ℹ️"),
        }
        for alerta in alertas:
            nivel = alerta.get("nivel", "BAJO")
            bc, icon = nivel_map.get(nivel, ("nivel-bajo", "ℹ️"))
            leida = alerta.get("leida", False)
            opacity = "opacity:.55;" if leida else ""
            paises_str = ", ".join(alerta.get("paises", [])[:3]) or "N/A"
            creada = str(alerta.get("creada_en", ""))[:16]
            regla_html = (f'<span style="color:{CYAN};font-size:.7rem">📋 {alerta.get("regla_nombre")}</span>'
                          if alerta.get("regla_nombre") else "")
            url_html = (f'<a href="{alerta.get("url_origen")}" target="_blank" '
                        f'style="color:{CYAN};font-size:.72rem">🔗</a>'
                        if alerta.get("url_origen") else "")
            tg_html = "✈️ " if alerta.get("enviado_telegram") else ""

            st.markdown(f"""
            <div class="osint-card" style="{opacity}">
              <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:.35rem">
                <div style="flex:1">
                  <span class="geo-badge {bc}">{icon} {nivel}</span>
                  <span style="color:{TEXT};font-weight:700;font-size:.87rem;margin-left:.5rem">
                    {alerta.get('titulo','')[:200]}
                  </span>
                </div>
                <span style="color:{MUTED};font-size:.68rem;flex-shrink:0;margin-left:.5rem">
                  {tg_html}{creada}
                </span>
              </div>
              {f'<div style="color:{TEXT2};font-size:.81rem;margin-bottom:.3rem">{alerta.get("descripcion","")[:400]}</div>' if alerta.get("descripcion") else ''}
              <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
                <span style="color:{MUTED};font-size:.68rem">🌍 {paises_str}</span>
                {regla_html} {url_html}
              </div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("---")
    section_header("⚡ Acciones")
    col_a1, col_a2, col_a3 = st.columns(3)

    with col_a1:
        if st.button("🔄 Procesar Señales", use_container_width=True):
            with st.spinner("Evaluando señales..."):
                try:
                    from agents.geo.signal_engine_geo import procesar_nuevos_eventos
                    osint_r = get_osint_filtered(horas=24, urgencia_min=2, relevancia_min=0.4)
                    acled_r = get_eventos_acled(days=7, relevancia_min=0.4)
                    nuevas = procesar_nuevos_eventos(eventos_acled=acled_r, items_osint=osint_r)
                    st.success(f"✓ {len(nuevas)} nuevas alertas")
                    if nuevas:
                        st.rerun()
                except Exception as e:
                    st.error(str(e))

    with col_a2:
        if st.button("🚀 Scraping OSINT", use_container_width=True):
            with st.spinner("Scraping RSS + GDELT..."):
                try:
                    from etl.pipelines.pipeline_geopolitica import tarea_osint
                    r = tarea_osint()
                    st.success(f"✓ {r.get('osint_nuevos',0)} RSS · {r.get('gdelt_nuevos',0)} GDELT")
                except Exception as e:
                    st.error(str(e))

    with col_a3:
        if st.button("📡 Actualizar ACLED", use_container_width=True):
            with st.spinner("Descargando ACLED..."):
                try:
                    from etl.pipelines.pipeline_geopolitica import tarea_acled
                    r = tarea_acled()
                    st.success(f"✓ {r.get('eventos',0)} eventos · {r.get('alertas',0)} alertas")
                except Exception as e:
                    st.error(str(e))


# ══════════════════════════════════════════════════════════════════════════════
# TAB 6 — Análisis IA
# ══════════════════════════════════════════════════════════════════════════════
with tab_ia:
    section_header("🧠 Análisis IA — Politeia Brain", "Inteligencia geopolítica generada por LLM local")

    llm_txt = "✅ Ollama disponible" if _BRAIN_OK else "⚠️ Ollama no disponible (modo demo)"
    llm_c = GREEN if _BRAIN_OK else AMBER
    st.markdown(f"""
    <div style="background:{BG2};border:1px solid {llm_c}33;border-radius:8px;
                padding:.5rem 1rem;margin-bottom:1rem">
      <span style="color:{llm_c}">{llm_txt}</span>
      {f'<span style="color:{TEXT2};font-size:.75rem;margin-left:1rem">Inicia con: ollama serve</span>'
       if not _BRAIN_OK else ''}
    </div>
    """, unsafe_allow_html=True)

    ia_tab1, ia_tab2, ia_tab3 = st.tabs(["📰 Briefing Diario", "🔎 Búsqueda RAG", "🌍 Análisis País"])

    with ia_tab1:
        section_header("Briefing Geopolítico Diario")
        briefing = get_briefing_diario()
        col_b1, col_b2 = st.columns([3, 1])

        with col_b1:
            if briefing:
                fecha_b = str(briefing.get("fecha", ""))[:10]
                st.markdown(f"""
                <div style="color:{TEXT2};font-size:.75rem;margin-bottom:.6rem">
                  Generado: {fecha_b} · {briefing.get('items_analizados',0)} noticias · {briefing.get('alertas_incluidas',0)} alertas
                </div>
                """, unsafe_allow_html=True)
                st.markdown(briefing.get("texto", ""))
            else:
                st.info("Briefing no disponible. Genera uno →")

        with col_b2:
            if st.button("🔄 Generar Ahora", use_container_width=True, disabled=not _BRAIN_OK):
                with st.spinner("Generando briefing (modo deep)..."):
                    try:
                        from etl.pipelines.pipeline_geopolitica import tarea_briefing
                        r = tarea_briefing()
                        if r.get("generado"):
                            st.success("✓ Generado")
                            st.rerun()
                        else:
                            st.warning("No generado")
                    except Exception as e:
                        st.error(str(e))

    with ia_tab2:
        section_header("Búsqueda RAG en Corpus OSINT")
        query_rag = st.text_area(
            "Consulta geopolítica",
            placeholder="Ej: ¿Impacto del conflicto en Libia sobre Repsol y el suministro energético español?",
            height=80,
        )
        c_rq1, c_rq2 = st.columns([3, 1])
        with c_rq2:
            top_k_rag = st.number_input("Fuentes", 3, 10, 5)
        with c_rq1:
            run_rag = st.button("🔍 Analizar", use_container_width=True,
                                disabled=not _BRAIN_OK or not query_rag.strip())
        if run_rag and query_rag.strip():
            with st.spinner("Consultando corpus OSINT + Ollama..."):
                try:
                    resultado = search_osint_semantic(query_rag, top_k=top_k_rag)
                    if resultado:
                        st.markdown(f"""
                        <div style="background:{BG2};border:1px solid {BORDER};
                                    border-left:4px solid {CYAN};border-radius:10px;
                                    padding:1rem 1.2rem;margin-top:.5rem">
                        """, unsafe_allow_html=True)
                        st.markdown(resultado)
                        st.markdown("</div>", unsafe_allow_html=True)
                    else:
                        st.warning("Sin resultados. Amplía el corpus ejecutando el pipeline.")
                except Exception as e:
                    st.error(str(e))

    with ia_tab3:
        section_header("Análisis Estratégico por País")
        p_lista = get_riesgo_pais(interes_min=0.5, limit=20)
        if p_lista:
            p_opts = {
                f"{p.get('flag_emoji','')} {p.get('nombre','?')} ({p.get('pais','?')})": p
                for p in sorted(p_lista, key=lambda x: -float(x.get("interes_espana", 0)))
            }
            p_sel_lbl = st.selectbox("País", list(p_opts.keys()))
            p_sel = p_opts.get(p_sel_lbl, {})

            if p_sel:
                c_p1, c_p2, c_p3 = st.columns(3)
                with c_p1: st.markdown(kpi_card("Riesgo", f"{float(p_sel.get('score_total',0)):.1f}/10",
                                    color=RED if float(p_sel.get('score_total',0))>=7 else AMBER), unsafe_allow_html=True)
                with c_p2: st.markdown(kpi_card("Interés ESP", f"{float(p_sel.get('interes_espana',0)):.0%}", color=CYAN), unsafe_allow_html=True)
                with c_p3: st.markdown(kpi_card("Tendencia", p_sel.get("riesgo_tendencia","?"),
                                    color=RED if p_sel.get("riesgo_tendencia")=="subiendo" else GREEN), unsafe_allow_html=True)

                empresas = p_sel.get("empresas_espanolas") or []
                intereses = p_sel.get("tipo_interes") or []
                if empresas or intereses:
                    st.markdown(f"""
                    <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                                padding:.5rem 1rem;margin:.5rem 0">
                      {''.join(f'<span class="pais-chip">{i}</span>' for i in intereses)}
                      {''.join(f'<span class="pais-chip" style="color:{AMBER}">{e}</span>' for e in empresas)}
                    </div>
                    """, unsafe_allow_html=True)

                if st.button(f"🧠 Analizar {p_sel.get('nombre','?')}", use_container_width=True,
                             disabled=not _BRAIN_OK):
                    with st.spinner("Generando análisis (modo deep)..."):
                        try:
                            analisis = get_analisis_pais_llm(
                                p_sel.get("pais", ""), p_sel.get("nombre", ""))
                            if analisis:
                                st.markdown(f"""
                                <div style="background:{BG2};border:1px solid {BORDER};
                                            border-left:4px solid {BLUE};border-radius:10px;
                                            padding:1rem 1.2rem;margin-top:.5rem">
                                """, unsafe_allow_html=True)
                                st.markdown(analisis)
                                st.markdown("</div>", unsafe_allow_html=True)
                            else:
                                st.warning("Análisis vacío")
                        except Exception as e:
                            st.error(str(e))
        else:
            st.info("Sin datos de países.")

    # ── Pipeline manual ─────────────────────────────────────────────────────
    st.markdown("---")
    section_header("⚙️ Pipeline Manual")
    pm1, pm2, pm3 = st.columns(3)

    with pm1:
        if st.button("🧠 Enriquecer OSINT (LLM)", use_container_width=True, disabled=not _BRAIN_OK):
            with st.spinner("Enriqueciendo..."):
                try:
                    pending = get_osint_filtered(horas=48, urgencia_min=2, relevancia_min=0.3,
                                                 solo_no_procesados=True, limit=10)
                    from agents.geo.enricher_ollama import enriquecer_item
                    from etl.sources.geo.scraper_osint_advanced import load_store, save_store
                    store = load_store()
                    ok = 0
                    for item in pending:
                        enr = enriquecer_item(item)
                        for idx, s in enumerate(store):
                            if s.get("id") == enr.get("id"):
                                store[idx] = enr
                                ok += 1
                                break
                    save_store(store)
                    st.success(f"✓ {ok} items enriquecidos")
                except Exception as e:
                    st.error(str(e))

    with pm2:
        if st.button("📊 Calcular Impactos DOM", use_container_width=True, disabled=not _BRAIN_OK):
            with st.spinner("Calculando impactos..."):
                try:
                    from agents.geo.enricher_ollama import analizar_impacto
                    items_r = get_osint_filtered(horas=48, urgencia_min=3, relevancia_min=0.6, limit=5)
                    imps = [i for i in (analizar_impacto(it) for it in items_r) if i]
                    if imps:
                        imp_path = _ROOT / "dashboard" / "data" / "impactos_domesticos.json"
                        ex = []
                        if imp_path.exists():
                            with open(imp_path) as f:
                                ex = json.load(f)
                        ex.extend(imps)
                        with open(imp_path, "w") as f:
                            json.dump(ex[-200:], f, ensure_ascii=False, indent=2)
                        st.success(f"✓ {len(imps)} impactos calculados")
                    else:
                        st.info("Sin nuevos impactos")
                except Exception as e:
                    st.error(str(e))

    with pm3:
        if st.button("🗂️ Indexar ChromaDB", use_container_width=True):
            with st.spinner("Indexando..."):
                try:
                    from etl.pipelines.pipeline_geopolitica import tarea_indexar_chromadb
                    r = tarea_indexar_chromadb()
                    st.success(f"✓ {r.get('indexados',0)} documentos")
                except Exception as e:
                    st.warning(str(e))
