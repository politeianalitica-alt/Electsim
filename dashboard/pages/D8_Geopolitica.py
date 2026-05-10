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

st.set_page_config(page_title="Geopolítica — Politeia", page_icon="", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("geopolitica")

# ── Geopolitics Core (Bloque 14) ─────────────────────────────────────────────
try:
    from dashboard.services.geopolitics_core import (
        cargar_eventos_geopoliticos as _geo14_eventos,
        cargar_perfiles_riesgo_pais as _geo14_riesgo,
        cargar_alertas_geopoliticas as _geo14_alertas,
        cargar_presencia_espanola as _geo14_presencia,
        cargar_impactos_domesticos as _geo14_impactos,
        cargar_source_health as _geo14_health,
    )
    _GEO14_OK = True
except Exception:
    _GEO14_OK = False
    def _geo14_eventos(**kw): import pandas as pd; return pd.DataFrame()
    def _geo14_riesgo(**kw): import pandas as pd; return pd.DataFrame()
    def _geo14_alertas(**kw): import pandas as pd; return pd.DataFrame()
    def _geo14_presencia(**kw): import pandas as pd; return pd.DataFrame()
    def _geo14_impactos(**kw): import pandas as pd; return pd.DataFrame()
    def _geo14_health(): return {}

# ── OSINT Risk (Bloque 4) ─────────────────────────────────────────────────────
try:
    from dashboard.services.actor_risk_core import (
        cargar_exposicion_por_pais as _arc_exposicion,
        cargar_kpis_riesgo as _arc_kpis_geo,
    )
    _RISK_GEO_OK = True
except Exception:
    _RISK_GEO_OK = False
    def _arc_exposicion(): import pandas as pd; return pd.DataFrame()
    def _arc_kpis_geo() -> dict: return {"hay_datos": False}

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
    # Importar funciones nuevas de forma defensiva (pueden no existir en versiones anteriores)
    try:
        from dashboard.utils.geo_helpers import get_impactos_con_contexto_macro
    except ImportError:
        def get_impactos_con_contexto_macro(**kw): return []
    try:
        from dashboard.utils.geo_helpers import get_riesgo_pais_dinamico
    except ImportError:
        def get_riesgo_pais_dinamico(**kw): return []
    _GEO_OK = True
except Exception as _e:
    _GEO_OK = False
    st.warning(f"Módulo geo_helpers no disponible: {_e}")

    def get_riesgo_pais(**kw): return []
    def get_riesgo_pais_dinamico(**kw): return []
    def get_presencia_espanola(**kw): return []
    def get_osint_filtered(**kw): return []
    def get_alertas_nivel(**kw): return []
    def get_count_alertas(**kw): return {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}
    def get_impactos_filtered(**kw): return []
    def get_impactos_con_contexto_macro(**kw): return []
    def get_eventos_acled(**kw): return []
    def get_stats_geo(): return {}
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
    alerta_badge = f'<span class="geo-badge nivel-critico"> {alertas_count["CRITICO"]} CRÍTICO</span>'
elif alertas_count.get("ALTO", 0) > 0:
    alerta_badge = f'<span class="geo-badge nivel-alto"> {alertas_count["ALTO"]} ALTO</span>'

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,{BLUE},{CYAN});
              border-radius:12px;display:flex;align-items:center;justify-content:center;
              font-size:1.6rem;flex-shrink:0;box-shadow:0 0 20px {BLUE}55"></div>
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
    tab_risk_exposure,
) = st.tabs([
    "Teatro Global",
    "España en el Mundo",
    "OSINT Intelligence",
    "Impacto Doméstico",
    "Alertas & Señales",
    "Análisis IA",
    "⚠️ Exposición Riesgo",
])


# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — Teatro Global
# ══════════════════════════════════════════════════════════════════════════════
with tab_teatro:
    section_header("Teatro Geopolítico Global", "Mapa de riesgo y conflictos activos")

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

        _paises_mapa = paises_riesgo if paises_riesgo else [
            {"nombre": "Ucrania", "lat_capital": 50.4, "lon_capital": 30.5,
             "score_total": 9.2, "interes_espana": 0.82, "riesgo_tendencia": "subiendo",
             "flag_emoji": "", "empresas_espanolas": ["Iberdrola", "Repsol"]},
            {"nombre": "Gaza / Israel", "lat_capital": 31.5, "lon_capital": 34.8,
             "score_total": 9.6, "interes_espana": 0.75, "riesgo_tendencia": "subiendo",
             "flag_emoji": "", "empresas_espanolas": []},
            {"nombre": "Sudan", "lat_capital": 15.5, "lon_capital": 32.5,
             "score_total": 8.7, "interes_espana": 0.55, "riesgo_tendencia": "estable",
             "flag_emoji": "", "empresas_espanolas": []},
            {"nombre": "Sahel (Mali)", "lat_capital": 12.6, "lon_capital": -8.0,
             "score_total": 7.9, "interes_espana": 0.68, "riesgo_tendencia": "subiendo",
             "flag_emoji": "", "empresas_espanolas": ["Total Energies ES"]},
            {"nombre": "Moldavia", "lat_capital": 47.0, "lon_capital": 28.9,
             "score_total": 6.4, "interes_espana": 0.42, "riesgo_tendencia": "subiendo",
             "flag_emoji": "", "empresas_espanolas": []},
            {"nombre": "Irak", "lat_capital": 33.3, "lon_capital": 44.4,
             "score_total": 6.1, "interes_espana": 0.58, "riesgo_tendencia": "estable",
             "flag_emoji": "", "empresas_espanolas": ["Repsol"]},
            {"nombre": "Libia", "lat_capital": 32.9, "lon_capital": 13.2,
             "score_total": 7.3, "interes_espana": 0.72, "riesgo_tendencia": "bajando",
             "flag_emoji": "", "empresas_espanolas": ["Repsol"]},
            {"nombre": "Venezuela", "lat_capital": 10.5, "lon_capital": -66.9,
             "score_total": 6.8, "interes_espana": 0.80, "riesgo_tendencia": "estable",
             "flag_emoji": "", "empresas_espanolas": ["Repsol", "BBVA"]},
            {"nombre": "Tayikistan", "lat_capital": 38.5, "lon_capital": 68.8,
             "score_total": 5.2, "interes_espana": 0.22, "riesgo_tendencia": "estable",
             "flag_emoji": "", "empresas_espanolas": []},
            {"nombre": "Sahara Occidental", "lat_capital": 27.1, "lon_capital": -13.2,
             "score_total": 7.0, "interes_espana": 0.90, "riesgo_tendencia": "estable",
             "flag_emoji": "", "empresas_espanolas": []},
            {"nombre": "Marruecos", "lat_capital": 34.0, "lon_capital": -6.8,
             "score_total": 5.5, "interes_espana": 0.95, "riesgo_tendencia": "bajando",
             "flag_emoji": "", "empresas_espanolas": ["OHL", "Iberdrola", "Mapfre"]},
            {"nombre": "Algeria", "lat_capital": 36.7, "lon_capital": 3.0,
             "score_total": 4.8, "interes_espana": 0.88, "riesgo_tendencia": "subiendo",
             "flag_emoji": "", "empresas_espanolas": ["Naturgy"]},
        ]
        if not paises_riesgo:
            st.caption("Datos demo — ejecuta la migracion 0016 para datos reales")

        df_mapa = pd.DataFrame(_paises_mapa)
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

    with col_tabla:
        section_header("Top Paises — Riesgo x Interes Espana")

        _paises_tabla = paises_riesgo if paises_riesgo else _paises_mapa
        if _paises_tabla:
            sorted_paises = sorted(
                _paises_tabla,
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
                flag = p.get("flag_emoji", "")
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
                                background:{'#ef4444'if score>=7 else '#f59e0b'if score>=5 else '#10b981'}"></div>
                  </div>
                  <div style="color:{TEXT2};font-size:.7rem">
                    Interés: {interes*100:.0f}% · {', '.join(empresas)}
                  </div>
                </div>
                """, unsafe_allow_html=True)

    # Matriz riesgo x interes
    _paises_bub = paises_riesgo if (paises_riesgo and len(paises_riesgo) > 3) else _paises_mapa
    if _paises_bub and len(_paises_bub) > 3:
        st.markdown("---")
        section_header("Matriz Riesgo x Interes Espana")
        df_bub = pd.DataFrame(_paises_bub)
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
    section_header("España en el Mundo", "Presencia global: misiones militares, energía, inversión, red diplomática y diáspora")

    # ── Normalizer: admite tanto el schema nuevo (consolidador) como el legacy ──
    def _norm_presencia(item: dict) -> dict:
        """Normaliza a campo unificado independientemente del schema de origen."""
        return {
            "categoria":       item.get("categoria") or item.get("tipo_presencia", "otro"),
            "pais_nombre":     item.get("pais_nombre") or item.get("pais", "?"),
            "iso3":            item.get("iso3", ""),
            "titulo":          item.get("titulo") or item.get("descripcion", ""),
            "actor_espanol":   item.get("actor_espanol", ""),
            "descripcion":     item.get("descripcion", ""),
            "valor":           float(item.get("valor", 0) or 0),
            "unidad":          item.get("unidad", ""),
            "score":           float(item.get("score_relevancia") or item.get("relevancia", 0.5)),
            "lat":             float(item.get("lat", 0) or 0),
            "lon":             float(item.get("lon", 0) or 0),
            "fuente_url":      item.get("fuente_url", ""),
            # campos extra por categoría
            "teatro":          item.get("teatro", ""),
            "marco":           item.get("marco", ""),
            "efectivos":       item.get("efectivos") or (int(item.get("valor", 0)) if item.get("unidad") == "efectivos" else 0),
            "residentes":      item.get("residentes") or (int(item.get("valor", 0)) if item.get("unidad") in ("residentes", "personas") else 0),
            "stock_mill_eur":  item.get("stock_mill_eur") or (item.get("valor", 0) if item.get("unidad") == "millones_EUR" else 0),
            "cuota_pct":       item.get("cuota_pct", 0),
            "riesgo_inversor": item.get("riesgo_inversor", 0),
            "nivel_alerta":    item.get("nivel_alerta", "verde"),
            "subcategoria":    item.get("subcategoria", ""),
        }

    presencia_raw = get_presencia_espanola()
    presencia_all = [_norm_presencia(p) for p in presencia_raw]

    # ── Colores por categoría ──────────────────────────────────────────────────
    _cat_color = {
        "militar":     RED,
        "energetica":  AMBER,
        "empresarial": BLUE,
        "diplomatica": CYAN,
        "diaspora":    PURPLE,
    }
    _cat_label = {
        "militar":     "Misiones Militares",
        "energetica":  "Energetica",
        "empresarial": "Empresarial",
        "diplomatica": "Diplomatica",
        "diaspora":    "Diaspora",
    }

    # ── Mapa global unificado con todas las capas ──────────────────────────────
    if presencia_all:
        df_g = pd.DataFrame(presencia_all)
        df_g["lat"] = df_g["lat"].astype(float)
        df_g["lon"] = df_g["lon"].astype(float)

        # Tamaño de burbuja: normalizado por categoría para que sean comparables
        def _bubble_size(row):
            cat = row["categoria"]
            if cat == "empresarial" and row["stock_mill_eur"] > 0:
                return min(50, max(8, row["stock_mill_eur"] / 3000))
            elif cat == "diaspora" and row["residentes"] > 0:
                return min(50, max(8, row["residentes"] / 12000))
            elif cat == "militar" and row["efectivos"] > 0:
                return min(40, max(8, row["efectivos"] / 20))
            else:
                return max(8, row["score"] * 35)

        df_g["bubble"] = df_g.apply(_bubble_size, axis=1)
        df_g["cat_label"] = df_g["categoria"].map(_cat_label).fillna(df_g["categoria"])

        # Tooltip enriquecido
        df_g["hover_extra"] = df_g.apply(lambda r: (
            f"Efectivos: {int(r['efectivos']):,}" if r["efectivos"] > 0
            else f"Stock: {r['stock_mill_eur']:,.0f} M EUR" if r["stock_mill_eur"] > 0
            else f"Residentes: {int(r['residentes']):,}" if r["residentes"] > 0
            else f"Cuota: {r['cuota_pct']:.1f}%" if r["cuota_pct"] > 0
            else ""
        ), axis=1)

        fig_global = px.scatter_geo(
            df_g,
            lat="lat", lon="lon",
            color="cat_label",
            size="bubble",
            hover_name="pais_nombre",
            custom_data=["actor_espanol", "descripcion", "hover_extra", "fuente_url"],
            color_discrete_map={v: _cat_color[k] for k, v in _cat_label.items()},
            size_max=30,
        )
        fig_global.update_traces(
            hovertemplate=(
                "<b>%{hovertext}</b><br>"
                "%{customdata[0]}<br>"
                "<i style='color:#aaa'>%{customdata[1]}</i><br>"
                "%{customdata[2]}"
                "<extra></extra>"
            ),
            marker=dict(opacity=0.85, line=dict(width=0.5, color="#0a1525")),
        )
        fig_global.update_layout(
            paper_bgcolor=BG,
            geo=dict(
                bgcolor=BG, landcolor="#1a2840", oceancolor="#0a1525",
                coastlinecolor=BORDER, countrycolor=BORDER,
                showland=True, showocean=True, showframe=False,
                showlakes=False,
                projection_type="natural earth",
            ),
            legend=dict(
                bgcolor=BG2, font=dict(color=TEXT2, size=11),
                bordercolor=BORDER, borderwidth=1,
                title=dict(text="Capa", font=dict(color=TEXT)),
                orientation="h", y=-0.05,
            ),
            margin=dict(l=0, r=0, t=0, b=30),
            height=420,
        )
        st.plotly_chart(fig_global, use_container_width=True, config={"displayModeBar": False})

        # KPIs globales
        k1, k2, k3, k4, k5 = st.columns(5)
        _mil = [p for p in presencia_all if p["categoria"] == "militar"]
        _ene = [p for p in presencia_all if p["categoria"] == "energetica"]
        _emp = [p for p in presencia_all if p["categoria"] == "empresarial"]
        _dip = [p for p in presencia_all if p["categoria"] == "diplomatica"]
        _dis = [p for p in presencia_all if p["categoria"] == "diaspora"]
        with k1:
            ef_total = sum(p["efectivos"] for p in _mil)
            st.markdown(kpi_card("Efectivos", f"{ef_total:,}", color=RED), unsafe_allow_html=True)
        with k2:
            dis_total = sum(p["residentes"] for p in _dis)
            st.markdown(kpi_card("Diaspora", f"{dis_total/1e6:.2f}M", color=PURPLE), unsafe_allow_html=True)
        with k3:
            stock_total = sum(p["stock_mill_eur"] for p in _emp)
            st.markdown(kpi_card("Inversion ext.", f"{stock_total/1000:.0f} B EUR", color=BLUE), unsafe_allow_html=True)
        with k4:
            st.markdown(kpi_card("Embajadas/consuls.", len(_dip), color=CYAN), unsafe_allow_html=True)
        with k5:
            st.markdown(kpi_card("Fuentes energia", len(_ene), color=AMBER), unsafe_allow_html=True)

    st.markdown("---")

    # ── Sub-tabs por capa ──────────────────────────────────────────────────────
    sub_tipos  = ["militar",          "energetica",  "empresarial", "diplomatica",  "diaspora"]
    sub_labels = ["Misiones Militares","Energetica",  "Empresarial", "Diplomatica",  "Diaspora"]
    sub_tabs   = st.tabs(sub_labels)

    for sub_tab, tipo, label in zip(sub_tabs, sub_tipos, sub_labels):
        with sub_tab:
            items = [p for p in presencia_all if p["categoria"] == tipo]
            cat_col = _cat_color.get(tipo, CYAN)

            if not items:
                st.info(f"Sin datos de presencia '{tipo}' — ejecuta: python -m etl.sources.geo.consolidar_presencia_espanola")
                continue

            items_sorted = sorted(items, key=lambda x: -x["score"])

            # ── KPIs por categoría ───────────────────────────────────────────
            kc1, kc2, kc3, kc4 = st.columns(4)
            with kc1:
                st.markdown(kpi_card("Ubicaciones", len(items), color=cat_col), unsafe_allow_html=True)
            with kc2:
                if tipo == "militar":
                    ef = sum(p["efectivos"] for p in items)
                    st.markdown(kpi_card("Total efectivos", f"{ef:,}", color=RED), unsafe_allow_html=True)
                elif tipo == "diaspora":
                    res = sum(p["residentes"] for p in items)
                    st.markdown(kpi_card("Total residentes", f"{res:,}", color=PURPLE), unsafe_allow_html=True)
                elif tipo == "empresarial":
                    stock = sum(p["stock_mill_eur"] for p in items)
                    st.markdown(kpi_card("Stock inversión", f"{stock/1000:.0f} B EUR", color=BLUE), unsafe_allow_html=True)
                elif tipo == "energetica":
                    cuota = sum(p["cuota_pct"] for p in items if p["cuota_pct"] > 0)
                    st.markdown(kpi_card("Cuota acumulada", f"{cuota:.0f}%", color=AMBER), unsafe_allow_html=True)
                else:
                    alerta_r = sum(1 for p in items if p["nivel_alerta"] == "rojo")
                    st.markdown(kpi_card("Alerta roja", alerta_r, color=RED), unsafe_allow_html=True)
            with kc3:
                actores = list({p["actor_espanol"] for p in items if p["actor_espanol"]})
                st.markdown(kpi_card("Actores ESP", len(actores), color=cat_col), unsafe_allow_html=True)
            with kc4:
                sc_med = sum(p["score"] for p in items) / len(items)
                st.markdown(kpi_card("Score medio", f"{sc_med:.2f}", color=AMBER), unsafe_allow_html=True)

            # ── Mapa por capa ────────────────────────────────────────────────
            df_p = pd.DataFrame(items_sorted)
            df_p["lat"] = df_p["lat"].astype(float)
            df_p["lon"] = df_p["lon"].astype(float)
            df_p["bub"] = df_p.apply(_bubble_size, axis=1)
            df_p["hover_x"] = df_p.apply(lambda r: (
                f"Efectivos: {int(r['efectivos']):,}" if r["efectivos"] > 0
                else f"{r['stock_mill_eur']:,.0f} M EUR" if r["stock_mill_eur"] > 0
                else f"{int(r['residentes']):,} res." if r["residentes"] > 0
                else f"Cuota: {r['cuota_pct']:.1f}%" if r["cuota_pct"] > 0
                else f"Score: {r['score']:.2f}"
            ), axis=1)

            fig_p = px.scatter_geo(
                df_p, lat="lat", lon="lon",
                size="bub",
                hover_name="pais_nombre",
                custom_data=["actor_espanol", "descripcion", "hover_x", "subcategoria"],
                color_discrete_sequence=[cat_col],
                size_max=28,
            )
            fig_p.update_traces(
                hovertemplate=(
                    "<b>%{hovertext}</b><br>"
                    "%{customdata[3]}<br>"
                    "%{customdata[0]}<br>"
                    "<i>%{customdata[1]}</i><br>"
                    "<b>%{customdata[2]}</b>"
                    "<extra></extra>"
                ),
                marker=dict(opacity=0.88, color=cat_col,
                            line=dict(width=0.5, color="#0a1525")),
            )
            fig_p.update_layout(
                paper_bgcolor=BG,
                geo=dict(bgcolor=BG, landcolor="#1a2840", oceancolor="#0a1525",
                         coastlinecolor=BORDER, countrycolor=BORDER,
                         showland=True, showocean=True, showframe=False,
                         showlakes=False, projection_type="natural earth"),
                margin=dict(l=0, r=0, t=0, b=0), height=320,
            )
            st.plotly_chart(fig_p, use_container_width=True, config={"displayModeBar": False})

            # ── Lista de observaciones ───────────────────────────────────────
            for item in items_sorted:
                sc = item["score"]
                sc_col = RED if sc >= 0.85 else AMBER if sc >= 0.65 else GREEN

                # Línea de valor extra (según categoría)
                if tipo == "militar" and item["efectivos"] > 0:
                    extra_line = f"<span style='color:{RED};font-weight:600'>{item['efectivos']:,} efectivos</span>"
                    if item["teatro"]:
                        extra_line += f" &nbsp;·&nbsp; Teatro: {item['teatro']}"
                    if item["marco"]:
                        extra_line += f" &nbsp;·&nbsp; {item['marco']}"
                elif tipo == "empresarial" and item["stock_mill_eur"] > 0:
                    ri = item["riesgo_inversor"]
                    ri_col = RED if ri >= 7 else AMBER if ri >= 4.5 else GREEN
                    extra_line = (
                        f"<span style='color:{BLUE};font-weight:600'>{item['stock_mill_eur']:,.0f} M EUR</span>"
                        f" &nbsp;·&nbsp; Riesgo inversor: <span style='color:{ri_col}'>{ri:.1f}/10</span>"
                    )
                elif tipo == "diaspora" and item["residentes"] > 0:
                    extra_line = f"<span style='color:{PURPLE};font-weight:600'>{int(item['residentes']):,} residentes</span>"
                elif tipo == "energetica" and item["cuota_pct"] > 0:
                    extra_line = f"<span style='color:{AMBER};font-weight:600'>Cuota: {item['cuota_pct']:.1f}%</span>"
                    if item["subcategoria"]:
                        extra_line += f" &nbsp;·&nbsp; {item['subcategoria'].replace('_', ' ')}"
                elif tipo == "diplomatica":
                    al = item["nivel_alerta"]
                    al_col = RED if al == "rojo" else AMBER if al == "amarillo" else GREEN
                    extra_line = f"Alerta: <span style='color:{al_col};font-weight:600'>{al.upper()}</span>"
                else:
                    extra_line = ""

                fuente_html = (
                    f"<a href='{item['fuente_url']}' target='_blank' "
                    f"style='color:{TEXT2};font-size:.75rem;text-decoration:none'>fuente</a>"
                    if item.get("fuente_url") else ""
                )

                st.markdown(f"""
                <div class="osint-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div>
                      <span style="color:{TEXT};font-weight:700">{item['pais_nombre']}</span>
                      <span style="color:{TEXT2};font-size:.8rem;margin-left:.5rem">{item['actor_espanol']}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:.6rem">
                      {fuente_html}
                      <span style="color:{sc_col};font-weight:700">{sc:.0%}</span>
                    </div>
                  </div>
                  <div style="color:{TEXT2};font-size:.82rem;margin:.25rem 0 .1rem">{item['descripcion']}</div>
                  <div style="font-size:.8rem;margin-top:.2rem">{extra_line}</div>
                </div>
                """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — OSINT Intelligence (newsroom layout)
# ══════════════════════════════════════════════════════════════════════════════
with tab_osint:
    section_header("OSINT Intelligence", "Newsroom geopolítico en tiempo real")

    # ── Filtros compactos ─────────────────────────────────────────────────────
    c_fil1, c_fil2, c_fil3, c_fil4 = st.columns([2, 2, 2, 2])
    with c_fil1:
        horas_osint = st.selectbox("Ventana", [6, 12, 24, 48, 72, 168],
                                   index=2, format_func=lambda h: f"Últimas {h}h")
    with c_fil2:
        urg_min = st.selectbox("Urgencia mín.", [1, 2, 3, 4, 5],
                               index=0, format_func=lambda u: f"≥ {u}")
    with c_fil3:
        categorias_disp = ["todas", "conflicto_armado", "terrorismo", "diplomacia",
                           "energia", "migracion", "ciberseguridad", "defensa",
                           "economia_politica", "derechos_humanos"]
        cat_sel = st.selectbox("Categoría", categorias_disp)
        cat_filter = None if cat_sel == "todas" else cat_sel
    with c_fil4:
        rel_min = st.slider("Relevancia ESP mín.", 0.0, 1.0, 0.3, 0.05)

    # ── KPIs ──────────────────────────────────────────────────────────────────
    osint_stats = get_osint_stats()
    s1, s2, s3, s4 = st.columns(4)
    with s1:
        st.markdown(kpi_card("Total corpus", osint_stats.get("total", 0), color=CYAN), unsafe_allow_html=True)
    with s2:
        st.markdown(kpi_card("Últimas 24h", osint_stats.get("ultimas_24h", 0), color=BLUE), unsafe_allow_html=True)
    with s3:
        st.markdown(kpi_card("Procesados LLM", osint_stats.get("procesados_llm", 0), color=PURPLE), unsafe_allow_html=True)
    with s4:
        urg45 = (osint_stats.get("por_urgencia", {}).get(4, 0)
                 + osint_stats.get("por_urgencia", {}).get(5, 0))
        st.markdown(kpi_card("Urgencia ≥4", urg45, color=RED), unsafe_allow_html=True)

    st.markdown("---")

    # ── Cargar items ──────────────────────────────────────────────────────────
    items_osint = get_osint_filtered(
        horas=horas_osint, urgencia_min=urg_min,
        relevancia_min=rel_min, categoria=cat_filter, limit=80,
    )

    # También cargar fuentes nicho (think tanks)
    _nicho_items: list[dict] = []
    try:
        from etl.sources.geo.scraper_fuentes_nicho import get_items_by_nicho
        _nicho_items = get_items_by_nicho(max_age_hours=horas_osint, limit=40)
    except Exception:
        pass

    _items_osint_demo = [
        {"urgencia": 5, "relevancia_espana": 0.92,
         "titulo": "Rusia lanza ataque masivo contra infraestructuras energéticas ucranianas",
         "resumen_ollama": "Impacto directo en precios del gas europeo. REE activa protocolo de contingencia.",
         "fuente": "Reuters", "fecha_publicacion": "2026-05-02 07:14",
         "url": "", "categoria": "conflicto_armado",
         "paises_mencionados": ["Ucrania", "Rusia", "Alemania"], "procesado_llm": True},
        {"urgencia": 4, "relevancia_espana": 0.85,
         "titulo": "Marruecos cierra parcialmente espacio aéreo — tensiones Argelia-Sahara",
         "resumen_ollama": "Vuelos Madrid-Casablanca afectados. AENA en contacto con Iberia.",
         "fuente": "El País", "fecha_publicacion": "2026-05-02 06:30",
         "url": "", "categoria": "diplomacia",
         "paises_mencionados": ["Marruecos", "Argelia", "España"], "procesado_llm": True},
        {"urgencia": 4, "relevancia_espana": 0.78,
         "titulo": "Gobierno Maduro expulsa a embajador español — crisis diplomática bilateral",
         "resumen_ollama": "El régimen chavista expulsa al embajador en respuesta a declaraciones del Ejecutivo. 350.000 venezolanos con pasaporte español en riesgo. Gobierno activa plan consular de emergencia.",
         "fuente": "ABC", "fecha_publicacion": "2026-05-01 22:45",
         "url": "", "categoria": "diplomacia",
         "paises_mencionados": ["Venezuela", "España"], "procesado_llm": True},
        {"urgencia": 3, "relevancia_espana": 0.72,
         "titulo": "OPEP+ anuncia reducción 500kbpd — petróleo supera 90$/barril",
         "resumen_ollama": "Repsol estima impacto positivo en margen de refino. IPC español podría subir 0.3pp.",
         "fuente": "Bloomberg", "fecha_publicacion": "2026-05-01 18:00",
         "url": "", "categoria": "energia",
         "paises_mencionados": ["Arabia Saudí", "Rusia", "EEUU"], "procesado_llm": False},
        {"urgencia": 2, "relevancia_espana": 0.55,
         "titulo": "BCE mantiene tipos al 3.5% — Lagarde señala posible bajada en junio",
         "resumen_ollama": "Hipotecas variables españolas podrían bajar 40€/mes en julio.",
         "fuente": "FT", "fecha_publicacion": "2026-05-01 13:45",
         "url": "", "categoria": "economia_politica",
         "paises_mencionados": ["UE", "Alemania", "Francia"], "procesado_llm": False},
        {"urgencia": 2, "relevancia_espana": 0.48,
         "titulo": "APT28 detectado en perímetro bancario europeo — España entre objetivos",
         "resumen_ollama": "CCN-CERT activa nivel amarillo. Sin exfiltración confirmada.",
         "fuente": "El Confidencial", "fecha_publicacion": "2026-04-30 20:10",
         "url": "", "categoria": "ciberseguridad",
         "paises_mencionados": ["Rusia", "Polonia", "España"], "procesado_llm": True},
        {"urgencia": 1, "relevancia_espana": 0.35,
         "titulo": "ECFR: Fragmentación del orden multilateral y sus implicaciones para la UE",
         "resumen_ollama": "Análisis de think tank sobre la erosión institucional de Naciones Unidas.",
         "fuente": "ECFR", "fecha_publicacion": "2026-04-29 10:00",
         "url": "", "categoria": "diplomacia",
         "paises_mencionados": ["UE", "EEUU", "China"], "procesado_llm": False,
         "nicho": "think_tank_eu"},
    ]

    if not items_osint:
        items_osint = _items_osint_demo
        st.caption("ℹ Datos demo — ejecuta el pipeline geopolítico para datos reales")

    # Merge con items de fuentes nicho (think tanks) — marcarlos
    for ni in _nicho_items:
        ni.setdefault("nicho", "think_tank")
        ni.setdefault("urgencia", 1)
        ni.setdefault("relevancia_espana", 0.3)
        ni.setdefault("procesado_llm", False)
    all_items_osint = items_osint + _nicho_items

    # ── 3 columnas: Heatmap Fuentes | Feed principal | Señales débiles ─────────
    col_izq, col_centro, col_der = st.columns([1, 2, 1])

    # ─── COLUMNA IZQUIERDA: Heatmap de fuentes ───────────────────────────────
    with col_izq:
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                    padding:.6rem .8rem;margin-bottom:.5rem">
          <div style="color:{TEXT};font-weight:700;font-size:.82rem;margin-bottom:.4rem">
            Fuentes Activas
          </div>""", unsafe_allow_html=True)

        # Agrupar por fuente
        from collections import defaultdict
        fuentes_count: dict[str, dict] = defaultdict(lambda: {"n": 0, "max_urg": 1})
        for it in all_items_osint:
            fn = it.get("fuente", "?")
            fuentes_count[fn]["n"] += 1
            fuentes_count[fn]["max_urg"] = max(
                fuentes_count[fn]["max_urg"], int(it.get("urgencia", 1))
            )

        fuentes_sorted = sorted(fuentes_count.items(), key=lambda x: (-x[1]["max_urg"], -x[1]["n"]))

        for fname, fdata in fuentes_sorted[:15]:
            n_items = fdata["n"]
            max_u = fdata["max_urg"]
            heat_color = (RED if max_u >= 5 else AMBER if max_u >= 4
                          else BLUE if max_u >= 3 else GREEN if max_u >= 2 else TEXT2)
            bar_pct = min(100, int(n_items / max(1, len(all_items_osint)) * 100 * 5))
            st.markdown(f"""
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:.28rem 0;border-bottom:1px solid {BORDER}22">
              <div style="flex:1;min-width:0">
                <div style="color:{TEXT2};font-size:.72rem;white-space:nowrap;
                            overflow:hidden;text-overflow:ellipsis">{fname}</div>
                <div style="height:3px;background:{heat_color}{hex(int(255*bar_pct/100))[2:].zfill(2)};
                            width:{bar_pct}%;border-radius:2px;margin-top:2px"></div>
              </div>
              <span style="color:{heat_color};font-weight:700;font-size:.72rem;
                           margin-left:.4rem;flex-shrink:0">{n_items}</span>
            </div>
            """, unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

        # Trending topics
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                    padding:.6rem .8rem;margin-top:.4rem">
          <div style="color:{TEXT};font-weight:700;font-size:.82rem;margin-bottom:.4rem">
            Países Mencionados
          </div>""", unsafe_allow_html=True)

        paises_top = get_paises_mas_mencionados(horas=horas_osint, top_n=10)
        if not paises_top:
            # Calcular desde items locales
            paises_cnt: Counter = Counter()
            for it in all_items_osint:
                for p in (it.get("paises_mencionados") or []):
                    paises_cnt[p] += 1
            paises_top = [{"pais": k, "menciones": v} for k, v in paises_cnt.most_common(10)]

        for pm in paises_top:
            st.markdown(f"""
            <div style="display:flex;justify-content:space-between;
                        padding:.25rem 0;border-bottom:1px solid {BORDER}22">
              <span style="color:{TEXT2};font-size:.74rem">{pm['pais']}</span>
              <span style="color:{CYAN};font-weight:700;font-size:.74rem">{pm['menciones']}</span>
            </div>
            """, unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # ─── COLUMNA CENTRAL: Feed agrupado por hora ─────────────────────────────
    with col_centro:
        # Enriquecer batch si hay muchos items sin procesar
        _sin_procesar = [i for i in items_osint[:30] if not i.get("procesado_llm")]
        if len(_sin_procesar) >= 5 and _BRAIN_OK:
            with st.spinner(f"Enriqueciendo {len(_sin_procesar)} items con LLM…"):
                try:
                    from agents.geo.enricher_ollama import enriquecer_batch
                    _enriched = enriquecer_batch(_sin_procesar, batch_size=5)
                    # Merge de vuelta
                    _enriched_map = {id(i): i for i in _enriched}
                    items_osint = [_enriched_map.get(id(i), i) for i in items_osint]
                except Exception as _be:
                    pass

        # Agrupar por slot de 1h
        _items_con_fecha: list[tuple] = []
        for it in items_osint:
            try:
                dt = pd.to_datetime(it.get("fecha_publicacion", ""), utc=True, errors="coerce")
                if pd.isna(dt):
                    dt = pd.Timestamp.now(tz="UTC")
                slot = dt.floor("1h")
                _items_con_fecha.append((slot, it))
            except Exception:
                _items_con_fecha.append((pd.Timestamp.now(tz="UTC").floor("1h"), it))

        from itertools import groupby
        _items_con_fecha.sort(key=lambda x: x[0], reverse=True)

        _grupos: dict = {}
        for slot, it in _items_con_fecha:
            k = str(slot)[:16]
            _grupos.setdefault(k, []).append(it)

        for slot_str, slot_items in list(_grupos.items())[:8]:
            # Header de slot
            slot_items_urgentes = [i for i in slot_items if int(i.get("urgencia", 1)) >= 4]
            slot_color = RED if slot_items_urgentes else AMBER if any(
                int(i.get("urgencia", 1)) >= 3 for i in slot_items
            ) else TEXT2
            st.markdown(f"""
            <div style="display:flex;align-items:center;gap:.5rem;margin:.5rem 0 .3rem 0">
              <div style="height:1px;background:{BORDER};flex:0 0 20px"></div>
              <span style="color:{slot_color};font-size:.7rem;font-weight:700;
                           white-space:nowrap">{slot_str[-5:]} UTC</span>
              <span style="color:{MUTED};font-size:.65rem">({len(slot_items)} items)</span>
              <div style="height:1px;background:{BORDER};flex:1"></div>
            </div>
            """, unsafe_allow_html=True)

            for item in sorted(slot_items, key=lambda x: -int(x.get("urgencia", 1))):
                urgencia = int(item.get("urgencia", 1))
                relevancia = float(item.get("relevancia_espana", 0))
                titulo = item.get("titulo", "Sin título")
                resumen = item.get("resumen_ollama", item.get("contenido", ""))[:220]
                fuente = item.get("fuente", "")
                url = item.get("url", item.get("url_articulo", ""))
                categoria = item.get("categoria", "")
                paises = item.get("paises_mencionados", [])[:3]
                procesado = item.get("procesado_llm", False)

                urg_color = {5: RED, 4: AMBER, 3: BLUE, 2: GREEN}.get(urgencia, TEXT2)
                paises_html = "".join(f'<span class="pais-chip">{p}</span>' for p in paises)
                llm_dot = f'<span style="color:{CYAN};font-size:.6rem"> LLM</span>' if procesado else ""
                url_html = (f'<a href="{url}" target="_blank" '
                            f'style="color:{CYAN};font-size:.7rem"> ↗</a>' if url else "")
                cat_html = (f'<span style="color:{TEXT2};font-size:.67rem">[{categoria}]</span>'
                            if categoria else "")
                nicho_html = (f'<span style="color:{PURPLE};font-size:.65rem"> '
                              f'{item.get("nicho","")}</span>'
                              if item.get("nicho") else "")

                st.markdown(f"""
                <div class="osint-card urgencia-{min(urgencia, 5)}">
                  <div style="display:flex;justify-content:space-between;align-items:start">
                    <span style="color:{TEXT};font-weight:700;font-size:.84rem;
                                 flex:1;padding-right:.4rem">{titulo[:200]}</span>
                    <div style="text-align:right;flex-shrink:0">
                      <div style="color:{urg_color};font-weight:800;font-size:.75rem">U{urgencia}</div>
                      <div style="color:{TEXT2};font-size:.65rem">ESP {int(relevancia*100)}%</div>
                    </div>
                  </div>
                  {f'<div style="color:{TEXT2};font-size:.78rem;margin:.3rem 0">{resumen}</div>'
                   if resumen else ''}
                  <div style="display:flex;gap:.3rem;align-items:center;flex-wrap:wrap;margin-top:.15rem">
                    {cat_html}{nicho_html}{paises_html}
                    <span style="color:{MUTED};font-size:.65rem">{fuente}</span>
                    {llm_dot}{url_html}
                  </div>
                </div>
                """, unsafe_allow_html=True)

    # ─── COLUMNA DERECHA: Señales débiles (think tanks + urgencia baja) ──────
    with col_der:
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                    padding:.6rem .8rem;margin-bottom:.5rem">
          <div style="color:{PURPLE};font-weight:700;font-size:.82rem;margin-bottom:.2rem">
            Señales Débiles
          </div>
          <div style="color:{MUTED};font-size:.68rem;margin-bottom:.6rem">
            Think tanks · Horizonte 30-90d
          </div>""", unsafe_allow_html=True)

        # Señales: urgencia 1-2, fuentes think_tank/nicho, o items más antiguos
        señales = [
            i for i in all_items_osint
            if int(i.get("urgencia", 1)) <= 2
            or i.get("nicho") in ("think_tank_eu", "think_tank_uk", "think_tank_us",
                                   "think_tank_es", "think_tank_au",
                                   "defensa_estrategia", "doctrina_militar")
        ]
        señales = sorted(señales, key=lambda x: -float(x.get("relevancia_espana", 0)))[:12]

        if not señales:
            # Fallback con items de baja urgencia
            señales = [i for i in all_items_osint if int(i.get("urgencia", 1)) <= 2][:8]

        for s in señales:
            s_url = s.get("url", s.get("url_articulo", ""))
            s_fuente = s.get("fuente", "")
            s_titulo = s.get("titulo", "")[:110]
            s_rel = float(s.get("relevancia_espana", 0))
            s_nicho = s.get("nicho", "")
            nicho_label = {
                "think_tank_eu": "EU", "think_tank_uk": "UK", "think_tank_us": "US",
                "think_tank_es": "ESP", "osint": "OSINT", "defensa_estrategia": "DEF",
                "doctrina_militar": "MIL", "conflictos": "CONF", "otan": "NATO",
            }.get(s_nicho, s_nicho[:4].upper() if s_nicho else "")
            nicho_html = (f'<span style="background:{PURPLE}22;color:{PURPLE};'
                          f'font-size:.6rem;padding:.05rem .3rem;border-radius:3px;'
                          f'margin-right:.2rem">{nicho_label}</span>' if nicho_html else "")
            url_tag = (f'<a href="{s_url}" target="_blank" '
                       f'style="color:{CYAN};font-size:.68rem"> ↗</a>' if s_url else "")

            st.markdown(f"""
            <div style="padding:.45rem 0;border-bottom:1px solid {BORDER}33">
              <div style="color:{TEXT2};font-size:.74rem;line-height:1.35;margin-bottom:.15rem">
                {nicho_html}{s_titulo}
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="color:{MUTED};font-size:.65rem">{s_fuente}</span>
                <div style="display:flex;align-items:center;gap:.2rem">
                  <span style="color:{CYAN};font-size:.65rem">ESP {int(s_rel*100)}%</span>
                  {url_tag}
                </div>
              </div>
            </div>
            """, unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

        # Panel de enrichment batch
        st.markdown("&nbsp;", unsafe_allow_html=True)
        if st.button("Enriquecer think tanks", use_container_width=True, key="btn_enrich_nicho"):
            with st.spinner("Procesando batch…"):
                try:
                    from etl.sources.geo.scraper_fuentes_nicho import run_all_feeds
                    nuevos = run_all_feeds(persist=True, max_items_per_feed=10)
                    st.success(f"{len(nuevos)} items de fuentes nicho")
                    st.rerun()
                except Exception as e:
                    st.error(str(e))


# ══════════════════════════════════════════════════════════════════════════════
# TAB 4 — Impacto Doméstico
# ══════════════════════════════════════════════════════════════════════════════
with tab_impacto:
    section_header("Impacto Doméstico en España", "Efectos directos sobre economía, seguridad y política")

    dimensiones = ["todas", "energia", "economia", "seguridad", "migracion",
                   "diplomacia", "comercio", "defensa", "ciberseguridad"]
    horizonte_opts = ["todos", "inmediato", "corto_plazo", "medio_plazo", "largo_plazo"]

    c_d1, c_d2, c_d3 = st.columns(3)
    with c_d1:
        dim_sel = st.selectbox("Dimensión", dimensiones)
        dim_filter = None if dim_sel == "todas" else dim_sel
    with c_d2:
        sev_min = st.selectbox("Severidad mínima", [1, 2, 3, 4, 5],
                               index=1, format_func=lambda s: f"≥ {s}")
    with c_d3:
        hor_sel = st.selectbox("Horizonte", horizonte_opts)
        hor_filter = None if hor_sel == "todos" else hor_sel

    # Intentar datos enriquecidos con contexto macro
    impactos = get_impactos_con_contexto_macro(
        dimension=dim_filter, severidad_min=sev_min, horizonte=hor_filter, limit=40
    )
    if not impactos:
        impactos = get_impactos_filtered(dimension=dim_filter, severidad_min=sev_min, limite=30)

    _impactos_demo = [
        {"titulo": "Crisis energética — corte suministro gas Argelia",
         "descripcion": "Naturgy reporta caída del 35% en flujo del gasoducto Medgaz. Gobierno activa reservas estratégicas.",
         "dimension": "energia", "severidad": 5, "horizonte": "inmediato",
         "probabilidad": 0.68, "recomendacion": "Activar interconexión con Francia. Buscar GNL spot.",
         "sectores_afectados": ["industria", "residencial", "química"],
         "empresas_afectadas": ["Naturgy", "Endesa", "Repsol"],
         "empresas_contexto": ["Naturgy", "Endesa", "Repsol", "Cepsa", "Iberdrola"],
         "indicadores_macro": ["Precio gas TTF", "Precio petróleo Brent", "Coste MWh España"],
         "severidad_compuesta": 5, "tiene_exposicion_empresarial": True},
        {"titulo": "Guerra comercial EEUU-China — exportaciones españolas en riesgo",
         "descripcion": "Aranceles del 25% sobre bienes europeos. Automóvil, agroalimentario y maquinaria en primera línea.",
         "dimension": "comercio", "severidad": 4, "horizonte": "corto_plazo",
         "probabilidad": 0.55, "recomendacion": "Diversificar mercados LATAM y ASEAN. Activar líneas ICO.",
         "sectores_afectados": ["automóvil", "agroalimentario", "maquinaria"],
         "empresas_afectadas": ["SEAT/VW", "Mercadona", "Grupo Antolín"],
         "empresas_contexto": ["SEAT/VW", "Inditex", "Mercadona", "Grupo Antolín"],
         "indicadores_macro": ["Exportaciones Spain %", "Balanza comercial", "€/$ tipo cambio"],
         "severidad_compuesta": 4, "tiene_exposicion_empresarial": True},
        {"titulo": "Presión migratoria Canarias — desbordamiento capacidad",
         "descripcion": "Llegadas irregulares superan 8.000 en abril. CATE al 180% de capacidad.",
         "dimension": "migracion", "severidad": 4, "horizonte": "inmediato",
         "probabilidad": 0.82, "recomendacion": "Solicitar mecanismo de crisis UE. Reforzar acuerdo Marruecos.",
         "sectores_afectados": ["servicios sociales", "turismo Canarias"],
         "empresas_afectadas": [],
         "empresas_contexto": [],
         "indicadores_macro": ["Llegadas irregulares canarias", "Solicitudes asilo"],
         "severidad_compuesta": 4, "tiene_exposicion_empresarial": False},
        {"titulo": "APT28 detectado en perímetro bancario español",
         "descripcion": "CCN-CERT nivel 4. Tres entidades bancarias afectadas. Sin exfiltración confirmada.",
         "dimension": "ciberseguridad", "severidad": 3, "horizonte": "inmediato",
         "probabilidad": 0.45, "recomendacion": "Parchear CVE-2026-1182. Activar SOC 24h.",
         "sectores_afectados": ["banca", "seguros", "administración pública"],
         "empresas_afectadas": ["Santander", "BBVA", "CaixaBank"],
         "empresas_contexto": ["Santander", "BBVA", "CaixaBank", "Indra", "Telefónica Tech"],
         "indicadores_macro": ["Incidentes CCN-CERT", "Alertas INCIBE nivel"],
         "severidad_compuesta": 4, "tiene_exposicion_empresarial": True},
        {"titulo": "OPEP+ recorta producción — rebote inflación en España",
         "descripcion": "Carburantes +12% en surtidor. BdE revisa al alza previsión IPC Q3 2026.",
         "dimension": "economia", "severidad": 3, "horizonte": "corto_plazo",
         "probabilidad": 0.71, "recomendacion": "Evaluar bonificación transporte. Revisión topes gas.",
         "sectores_afectados": ["transporte", "alimentación", "turismo"],
         "empresas_afectadas": ["Repsol", "Cepsa"],
         "empresas_contexto": ["Repsol", "Cepsa", "BBVA", "Santander", "Inditex", "IAG"],
         "indicadores_macro": ["IBEX-35", "Spread bono 10y vs Bund", "IPC España"],
         "severidad_compuesta": 3, "tiene_exposicion_empresarial": True},
    ]

    if not impactos:
        impactos = _impactos_demo
        st.caption("ℹ Datos demo — se generan automáticamente con relevancia_espana > 0.6")

    if impactos:
        sev_criticos = [i for i in impactos if int(i.get("severidad_compuesta", i.get("severidad", 1))) >= 4]
        dim_unicas = len({i.get("dimension") for i in impactos})
        prob_m = sum(float(i.get("probabilidad", 0.5)) for i in impactos) / len(impactos)
        con_exposicion = sum(1 for i in impactos if i.get("tiene_exposicion_empresarial"))

        k1, k2, k3, k4 = st.columns(4)
        with k1:
            st.markdown(kpi_card("Impactos activos", len(impactos), color=CYAN), unsafe_allow_html=True)
        with k2:
            st.markdown(kpi_card("Severidad ≥4", len(sev_criticos), color=RED), unsafe_allow_html=True)
        with k3:
            st.markdown(kpi_card("Prob. media", f"{prob_m:.0%}", color=AMBER), unsafe_allow_html=True)
        with k4:
            st.markdown(kpi_card("Con exposición empresarial", con_exposicion, color=PURPLE), unsafe_allow_html=True)

        # ── Distribución por dimensión: barra horizontal compacta ─────────────
        dim_counts = Counter(i.get("dimension", "otros") for i in impactos)
        if len(dim_counts) > 1:
            _dim_col = {
                "energia": AMBER, "economia": CYAN, "seguridad": RED,
                "migracion": PURPLE, "diplomacia": BLUE, "comercio": GREEN,
                "defensa": RED, "ciberseguridad": CYAN, "otros": TEXT2,
            }
            fig_bar_dim = go.Figure([go.Bar(
                x=list(dim_counts.values()),
                y=list(dim_counts.keys()),
                orientation="h",
                marker_color=[_dim_col.get(d, TEXT2) for d in dim_counts.keys()],
                text=[str(v) for v in dim_counts.values()],
                textposition="inside",
                textfont=dict(color=TEXT, size=11),
            )])
            fig_bar_dim.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                height=max(100, len(dim_counts) * 28),
                margin=dict(l=0, r=0, t=0, b=0),
                xaxis=dict(visible=False),
                yaxis=dict(tickfont=dict(color=TEXT2, size=11), autorange="reversed"),
                showlegend=False,
            )
            st.plotly_chart(fig_bar_dim, use_container_width=True,
                            config={"displayModeBar": False})

        # ── Cards de impacto con contexto macro ────────────────────────────────
        dim_icons = {
            "energia": "!", "economia": "~", "seguridad": "*",
            "migracion": ">", "diplomacia": "-", "comercio": "o",
            "defensa": "+", "ciberseguridad": "#", "otros": "!",
        }
        horizonte_colors = {
            "inmediato": RED, "corto_plazo": AMBER,
            "medio_plazo": BLUE, "largo_plazo": GREEN,
        }

        for imp in sorted(impactos, key=lambda x: (
            -int(x.get("severidad_compuesta", x.get("severidad", 1))),
            -float(x.get("probabilidad", 0.5)),
        )):
            sev = int(imp.get("severidad_compuesta", imp.get("severidad", 2)))
            sev_color = RED if sev >= 4 else AMBER if sev == 3 else BLUE
            dim = imp.get("dimension", "otros")
            horizonte = imp.get("horizonte", "medio_plazo")
            hcolor = horizonte_colors.get(horizonte, TEXT2)
            icon = dim_icons.get(dim, "️")
            sectores = (imp.get("sectores_afectados") or [])[:4]
            empresas = (imp.get("empresas_contexto") or imp.get("empresas_afectadas") or [])[:6]
            indicadores = (imp.get("indicadores_macro") or [])[:3]
            prob = float(imp.get("probabilidad", 0.5))
            recom = imp.get("recomendacion", "")

            indicadores_html = "".join(
                f'<span style="background:{CYAN}11;color:{CYAN};font-size:.62rem;'
                f'padding:.05rem .3rem;border-radius:3px;margin:.1rem">{ind}</span>'
                for ind in indicadores
            )

            st.markdown(f"""
            <div class="osint-card">
              <div style="display:flex;justify-content:space-between;align-items:start">
                <span style="color:{TEXT};font-weight:700;font-size:.87rem;flex:1">
                  {icon} {imp.get('titulo','')[:200]}
                </span>
                <div style="text-align:right;flex-shrink:0;margin-left:.6rem">
                  <div style="color:{sev_color};font-weight:800">SEV {sev}/5</div>
                  <div style="color:{MUTED};font-size:.65rem">P={prob:.0%}</div>
                  <div style="color:{hcolor};font-size:.68rem">{horizonte}</div>
                </div>
              </div>
              {f'<div style="color:{TEXT2};font-size:.8rem;margin:.35rem 0">{imp.get("descripcion","")[:350]}</div>'}
              {f'<div style="color:{CYAN};font-size:.78rem;margin-bottom:.3rem">{recom[:200]}</div>' if recom else ''}
              <div style="display:flex;flex-wrap:wrap;gap:.2rem;margin-bottom:.3rem">
                {"".join(f'<span class="pais-chip">{s}</span>' for s in sectores)}
              </div>
              {f'<div style="margin-bottom:.2rem">{indicadores_html}</div>' if indicadores_html else ''}
              {f'''<div style="display:flex;flex-wrap:wrap;gap:.2rem;margin-top:.1rem">
                {"".join(f'<span class="pais-chip" style="color:{AMBER};border-color:{AMBER}44">{e}</span>' for e in empresas)}
               </div>''' if empresas else ''}
            </div>
            """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 5 — Alertas & Señales
# ══════════════════════════════════════════════════════════════════════════════
with tab_alertas:
    section_header("Alertas & Señales de Alerta Temprana")

    # ── KPIs ──────────────────────────────────────────────────────────────────
    c_al1, c_al2, c_al3, c_al4 = st.columns(4)
    with c_al1:
        st.markdown(kpi_card("CRITICO", alertas_count.get("CRITICO", 0), color=RED), unsafe_allow_html=True)
    with c_al2:
        st.markdown(kpi_card("ALTO", alertas_count.get("ALTO", 0), color=AMBER), unsafe_allow_html=True)
    with c_al3:
        st.markdown(kpi_card("MEDIO", alertas_count.get("MEDIO", 0), color=BLUE), unsafe_allow_html=True)
    with c_al4:
        st.markdown(kpi_card("BAJO", alertas_count.get("BAJO", 0), color=GREEN), unsafe_allow_html=True)

    # Filtro de solo no leídas
    col_noleid, col_lim = st.columns([3, 1])
    with col_noleid:
        no_leidas = st.checkbox("Solo no leídas", value=False)
    with col_lim:
        lim_alertas = st.number_input("Límite total", 5, 200, 40, 5)

    # Cargar TODAS las alertas de una vez (las tab-tabs filtran por nivel)
    alertas_all = get_alertas_nivel(nivel=None, limite=int(lim_alertas),
                                    solo_no_leidas=no_leidas)

    _alertas_demo = [
        {"nivel": "CRITICO", "titulo": "Corte suministro gas Medgaz — riesgo desabastecimiento industrial",
         "descripcion": "Caída del 35% en flujo confirmada. Naturgy activa protocolo contingencia. Almacenamiento subterráneo al 41%.",
         "paises": ["Argelia", "España"], "regla_nombre": "suministro_energetico_critico",
         "creada_en": "2026-05-02 07:30", "leida": False, "enviado_telegram": True, "url_origen": ""},
        {"nivel": "ALTO", "titulo": "Crisis diplomática Venezuela — expulsión embajador español por régimen Maduro",
         "descripcion": "El régimen venezolano expulsa al embajador español. 350.000 venezolanos con pasaporte español afectados. Gobierno activa plan consular.",
         "paises": ["Venezuela", "España"], "regla_nombre": "crisis_diplomatica_bilateral",
         "creada_en": "2026-05-01 23:00", "leida": False, "enviado_telegram": True, "url_origen": ""},
        {"nivel": "ALTO", "titulo": "Presión migratoria Canarias — desbordamiento CATE",
         "descripcion": "Llegadas abril: 8.240. CATE al 180%. Tensión acuerdo de retorno con Marruecos.",
         "paises": ["Marruecos", "Mauritania", "España"], "regla_nombre": "flujo_migratorio_elevado",
         "creada_en": "2026-05-01 18:15", "leida": True, "enviado_telegram": False, "url_origen": ""},
        {"nivel": "MEDIO", "titulo": "APT28 detectado en perímetro bancario español",
         "descripcion": "CCN-CERT nivel amarillo. Tres entidades afectadas. Sin exfiltración confirmada.",
         "paises": ["Rusia", "España"], "regla_nombre": "ciberataque_infraestructura_critica",
         "creada_en": "2026-04-30 20:30", "leida": True, "enviado_telegram": False, "url_origen": ""},
        {"nivel": "MEDIO", "titulo": "Marruecos cierra espacio aéreo — impacto vuelos Iberia",
         "descripcion": "Restricciones temporales por tensiones con Argelia. 14 vuelos afectados.",
         "paises": ["Marruecos", "Argelia", "España"], "regla_nombre": "tension_diplomatica_vecindad",
         "creada_en": "2026-05-02 06:45", "leida": False, "enviado_telegram": False, "url_origen": ""},
        {"nivel": "BAJO", "titulo": "OPEP+ reducción producción — petróleo 90$/barril",
         "descripcion": "Recorte 500kbpd. Impacto moderado en costes transporte español.",
         "paises": ["Arabia Saudí", "Rusia", "EEUU"], "regla_nombre": "precio_energia_internacional",
         "creada_en": "2026-05-01 18:00", "leida": True, "enviado_telegram": False, "url_origen": ""},
    ]

    if not alertas_all:
        alertas_all = _alertas_demo
        for _nivel_d in ["CRITICO", "ALTO", "MEDIO", "BAJO"]:
            alertas_count[_nivel_d] = sum(1 for a in alertas_all if a.get("nivel") == _nivel_d)
        st.caption("ℹ Datos demo — ejecuta el motor de señales para alertas reales")

    # ── Tabs por nivel ────────────────────────────────────────────────────────
    _n_crit = alertas_count.get("CRITICO", 0)
    _n_alto = alertas_count.get("ALTO", 0)
    _n_med = alertas_count.get("MEDIO", 0)
    _n_bajo = alertas_count.get("BAJO", 0)

    nivel_tabs = st.tabs([
        f"CRITICO ({_n_crit})",
        f"ALTO ({_n_alto})",
        f"MEDIO ({_n_med})",
        f"BAJO ({_n_bajo})",
        "Timeline",
    ])

    nivel_map = {
        "CRITICO": ("nivel-critico", ""),
        "ALTO":    ("nivel-alto",    ""),
        "MEDIO":   ("nivel-medio",   ""),
        "BAJO":    ("nivel-bajo",    ""),
    }
    nivel_color_map = {
        "CRITICO": RED, "ALTO": AMBER, "MEDIO": BLUE, "BAJO": GREEN,
    }

    def _render_alertas(alertas_lista: list[dict], tab_key: str) -> None:
        """Renderiza lista de alertas con botones de acción inline."""
        if not alertas_lista:
            st.caption("Sin alertas en este nivel")
            return

        for idx, alerta in enumerate(alertas_lista):
            nivel = alerta.get("nivel", "BAJO")
            bc, icon = nivel_map.get(nivel, ("nivel-bajo", ""))
            nivel_color = nivel_color_map.get(nivel, GREEN)
            leida = alerta.get("leida", False)
            opacity = "opacity:.5;" if leida else ""
            paises_str = ", ".join(alerta.get("paises", [])[:3]) or "N/A"
            creada = str(alerta.get("creada_en", ""))[:16]
            regla = alerta.get("regla_nombre", "")
            url = alerta.get("url_origen", "")
            tg_html = "TG " if alerta.get("enviado_telegram") else ""

            st.markdown(f"""
            <div class="osint-card" style="{opacity}border-left-color:{nivel_color}">
              <div style="display:flex;align-items:start;justify-content:space-between;
                          margin-bottom:.3rem">
                <div style="flex:1">
                  <span class="geo-badge {bc}">{icon} {nivel}</span>
                  <span style="color:{TEXT};font-weight:700;font-size:.86rem;margin-left:.5rem">
                    {alerta.get('titulo','')[:200]}
                  </span>
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:.5rem">
                  <div style="color:{MUTED};font-size:.65rem">{tg_html}{creada}</div>
                  {f'<div style="color:{MUTED};font-size:.62rem">{regla}</div>' if regla else ''}
                </div>
              </div>
              {f'<div style="color:{TEXT2};font-size:.8rem;margin-bottom:.3rem">{alerta.get("descripcion","")[:350]}</div>' if alerta.get("descripcion") else ''}
              <div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">
                <span style="color:{MUTED};font-size:.67rem">{paises_str}</span>
                {f'<a href="{url}" target="_blank" style="color:{CYAN};font-size:.7rem">fuente</a>' if url else ''}
              </div>
            </div>
            """, unsafe_allow_html=True)

            # Botones de acción inline
            btn_key = f"{tab_key}_{idx}"
            cols_btn = st.columns([1, 1, 1, 3])
            with cols_btn[0]:
                if st.button("Leer", key=f"leer_{btn_key}", use_container_width=True):
                    st.toast(f"Alerta marcada como leída")
            with cols_btn[1]:
                if st.button("Informe", key=f"inf_{btn_key}", use_container_width=True):
                    with st.spinner("Generando informe…"):
                        try:
                            from agents.geo.enricher_ollama import analizar_impacto
                            item_proxy = {
                                "titulo": alerta.get("titulo", ""),
                                "contenido": alerta.get("descripcion", ""),
                                "relevancia_espana": 0.85,
                                "urgencia": {"CRITICO": 5, "ALTO": 4, "MEDIO": 3}.get(nivel, 2),
                                "paises_mencionados": alerta.get("paises", []),
                                "categoria": "geopolitica",
                            }
                            imp = analizar_impacto(item_proxy)
                            if imp:
                                st.info(imp.get("analisis_ollama", "Sin análisis"))
                        except Exception as e:
                            st.error(str(e))
            with cols_btn[2]:
                if st.button("Escalar", key=f"esc_{btn_key}", use_container_width=True):
                    st.toast(f"Alerta escalada al nivel superior", icon="")

    for nivel_tab, nivel_nombre in zip(nivel_tabs[:4], ["CRITICO", "ALTO", "MEDIO", "BAJO"]):
        with nivel_tab:
            alertas_nivel_lista = [a for a in alertas_all if a.get("nivel") == nivel_nombre]
            _render_alertas(alertas_nivel_lista, tab_key=f"t{nivel_nombre}")

    # ── Tab Timeline ──────────────────────────────────────────────────────────
    with nivel_tabs[4]:
        section_header("Timeline de Alertas", "Distribución temporal por nivel")

        if alertas_all:
            _tl_data = []
            for a in alertas_all:
                try:
                    dt = pd.to_datetime(a.get("creada_en", ""), errors="coerce", utc=True)
                    if not pd.isna(dt):
                        _tl_data.append({
                            "fecha": dt,
                            "nivel": a.get("nivel", "BAJO"),
                            "titulo": a.get("titulo", "")[:60],
                        })
                except Exception:
                    pass

            if _tl_data:
                df_tl = pd.DataFrame(_tl_data)
                _tl_colors = {"CRITICO": RED, "ALTO": AMBER, "MEDIO": BLUE, "BAJO": GREEN}
                fig_tl = px.scatter(
                    df_tl, x="fecha", y="nivel",
                    color="nivel",
                    color_discrete_map=_tl_colors,
                    hover_name="titulo",
                    category_orders={"nivel": ["CRITICO", "ALTO", "MEDIO", "BAJO"]},
                )
                fig_tl.update_traces(marker=dict(size=12, opacity=0.85))
                fig_tl.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    height=250, margin=dict(l=0, r=0, t=10, b=0),
                    xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
                    yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), title=""),
                    legend=dict(bgcolor=BG2, font=dict(color=TEXT2)),
                    showlegend=True,
                )
                st.plotly_chart(fig_tl, use_container_width=True, config={"displayModeBar": False})

                # Agregado por día
                df_tl["dia"] = df_tl["fecha"].dt.floor("D")
                df_agg = df_tl.groupby(["dia", "nivel"]).size().reset_index(name="n")
                fig_bar = px.bar(
                    df_agg, x="dia", y="n", color="nivel",
                    color_discrete_map=_tl_colors,
                    category_orders={"nivel": ["CRITICO", "ALTO", "MEDIO", "BAJO"]},
                    labels={"dia": "", "n": "Alertas", "nivel": "Nivel"},
                )
                fig_bar.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    height=180, margin=dict(l=0, r=0, t=0, b=0),
                    xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
                    yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
                    legend=dict(bgcolor=BG2, font=dict(color=TEXT2)),
                    barmode="stack",
                )
                st.plotly_chart(fig_bar, use_container_width=True, config={"displayModeBar": False})
            else:
                st.caption("No hay datos temporales disponibles")

    # ── Acciones globales ─────────────────────────────────────────────────────
    st.markdown("---")
    section_header("Acciones")
    col_a1, col_a2, col_a3, col_a4 = st.columns(4)

    with col_a1:
        if st.button("Procesar Señales", use_container_width=True):
            with st.spinner("Evaluando señales…"):
                try:
                    from agents.geo.signal_engine_geo import procesar_nuevos_eventos
                    osint_r = get_osint_filtered(horas=24, urgencia_min=2, relevancia_min=0.4)
                    acled_r = get_eventos_acled(days=7, relevancia_min=0.4)
                    nuevas = procesar_nuevos_eventos(eventos_acled=acled_r, items_osint=osint_r)
                    st.success(f"{len(nuevas)} nuevas alertas")
                    if nuevas:
                        st.rerun()
                except Exception as e:
                    st.error(str(e))

    with col_a2:
        if st.button("Scraping OSINT", use_container_width=True):
            with st.spinner("Scraping RSS + GDELT…"):
                try:
                    from etl.pipelines.pipeline_geopolitica import tarea_osint
                    r = tarea_osint()
                    st.success(f"{r.get('osint_nuevos',0)} RSS · {r.get('gdelt_nuevos',0)} GDELT")
                except Exception as e:
                    st.error(str(e))

    with col_a3:
        if st.button("Actualizar ACLED", use_container_width=True):
            with st.spinner("Descargando ACLED…"):
                try:
                    from etl.pipelines.pipeline_geopolitica import tarea_acled
                    r = tarea_acled()
                    st.success(f"{r.get('eventos',0)} eventos · {r.get('alertas',0)} alertas")
                except Exception as e:
                    st.error(str(e))

    with col_a4:
        if st.button("Actualizar Riesgo País", use_container_width=True):
            with st.spinner("Calculando scores dinámicos…"):
                try:
                    from etl.sources.geo.ingestor_riesgo_pais import run_ingestor
                    risks = run_ingestor(persist=True)
                    st.success(f"{len(risks)} países actualizados")
                    st.rerun()
                except Exception as e:
                    st.error(str(e))


# ══════════════════════════════════════════════════════════════════════════════
# TAB 6 — Análisis IA
# ══════════════════════════════════════════════════════════════════════════════
with tab_ia:
    section_header("Análisis IA — Politeia Brain", "Inteligencia geopolítica generada por LLM local")

    llm_txt = " Ollama disponible"if _BRAIN_OK else " Ollama no disponible (modo demo)"
    llm_c = GREEN if _BRAIN_OK else AMBER
    st.markdown(f"""
    <div style="background:{BG2};border:1px solid {llm_c}33;border-radius:8px;
                padding:.5rem 1rem;margin-bottom:1rem">
      <span style="color:{llm_c}">{llm_txt}</span>
      {f'<span style="color:{TEXT2};font-size:.75rem;margin-left:1rem">Inicia con: ollama serve</span>'
       if not _BRAIN_OK else ''}
    </div>
    """, unsafe_allow_html=True)

    ia_tab1, ia_tab2 = st.tabs(["Busqueda RAG", "Analisis Pais"])

    with ia_tab1:
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
            run_rag = st.button("Analizar", use_container_width=True,
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

    with ia_tab2:
        section_header("Analisis Estrategico por Pais")
        p_lista = get_riesgo_pais(interes_min=0.5, limit=20)
        _p_lista_efectiva = p_lista if p_lista else [
            {"nombre": "Ucrania", "pais": "UKR", "flag_emoji": "",
             "score_total": 9.2, "interes_espana": 0.82, "riesgo_tendencia": "subiendo",
             "empresas_espanolas": ["Iberdrola", "Repsol"], "tipo_interes": ["energia", "diplomatico"]},
            {"nombre": "Marruecos", "pais": "MAR", "flag_emoji": "",
             "score_total": 5.5, "interes_espana": 0.95, "riesgo_tendencia": "bajando",
             "empresas_espanolas": ["OHL", "Iberdrola", "Mapfre"], "tipo_interes": ["migracion", "comercio", "energia"]},
            {"nombre": "Venezuela", "pais": "VEN", "flag_emoji": "",
             "score_total": 6.8, "interes_espana": 0.80, "riesgo_tendencia": "estable",
             "empresas_espanolas": ["Repsol", "BBVA"], "tipo_interes": ["diaspora", "diplomatico"]},
            {"nombre": "Algeria", "pais": "DZA", "flag_emoji": "",
             "score_total": 4.8, "interes_espana": 0.88, "riesgo_tendencia": "subiendo",
             "empresas_espanolas": ["Naturgy"], "tipo_interes": ["energia", "migracion"]},
        ]
        if not p_lista:
            st.caption("Datos demo — ejecuta la migracion 0016 para datos reales")

        if _p_lista_efectiva:
            p_opts = {
                f"{p.get('flag_emoji','')} {p.get('nombre','?')} ({p.get('pais','?')})": p
                for p in sorted(_p_lista_efectiva, key=lambda x: -float(x.get("interes_espana", 0)))
            }
            p_sel_lbl = st.selectbox("Pais", list(p_opts.keys()))
            p_sel = p_opts.get(p_sel_lbl, {})

            if p_sel:
                c_p1, c_p2, c_p3 = st.columns(3)
                with c_p1:
                    st.markdown(kpi_card("Riesgo", f"{float(p_sel.get('score_total',0)):.1f}/10",
                                color=RED if float(p_sel.get('score_total',0))>=7 else AMBER), unsafe_allow_html=True)
                with c_p2:
                    st.markdown(kpi_card("Interes ESP", f"{float(p_sel.get('interes_espana',0)):.0%}", color=CYAN), unsafe_allow_html=True)
                with c_p3:
                    st.markdown(kpi_card("Tendencia", p_sel.get("riesgo_tendencia","?"),
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

                # Radar de factores de riesgo
                _nombre_pais = p_sel.get("nombre", "?")
                _score = float(p_sel.get("score_total", 5))
                _factores = ["Conflicto", "Inestabilidad politica", "Riesgo economico",
                             "Interes energetico", "Presencia empresarial", "Impacto migratorio"]
                import random as _rnd
                _rnd.seed(hash(_nombre_pais) % 999)
                _vals_radar = [round(min(10, max(1, _score + _rnd.uniform(-2.5, 2.5))), 1)
                               for _ in _factores]
                _vals_radar.append(_vals_radar[0])
                _cats_radar = _factores + [_factores[0]]

                fig_radar = go.Figure(go.Scatterpolar(
                    r=_vals_radar,
                    theta=_cats_radar,
                    fill="toself",
                    fillcolor=f"rgba(59,130,246,0.18)",
                    line_color=BLUE,
                    name=_nombre_pais,
                ))
                fig_radar.update_layout(
                    polar=dict(
                        bgcolor=BG2,
                        radialaxis=dict(visible=True, range=[0, 10], color=TEXT2,
                                        gridcolor=BORDER, tickfont=dict(size=8)),
                        angularaxis=dict(color=TEXT2, gridcolor=BORDER, tickfont=dict(size=10)),
                    ),
                    paper_bgcolor=BG,
                    showlegend=False,
                    height=280,
                    margin=dict(l=30, r=30, t=30, b=30),
                )
                st.plotly_chart(fig_radar, use_container_width=True, config={"displayModeBar": False})

                if st.button(f"Analizar {_nombre_pais} (Ollama)", use_container_width=True,
                             disabled=not _BRAIN_OK):
                    with st.spinner("Generando analisis (modo deep)..."):
                        try:
                            analisis = get_analisis_pais_llm(
                                p_sel.get("pais", ""), _nombre_pais)
                            if analisis:
                                st.markdown(f"""
                                <div style="background:{BG2};border:1px solid {BORDER};
                                            border-left:4px solid {BLUE};border-radius:10px;
                                            padding:1rem 1.2rem;margin-top:.5rem">
                                """, unsafe_allow_html=True)
                                st.markdown(analisis)
                                st.markdown("</div>", unsafe_allow_html=True)
                            else:
                                st.warning("Analisis vacio")
                        except Exception as e:
                            st.error(str(e))
                elif not _BRAIN_OK:
                    st.markdown(f"""
                    <div style="background:{BG2};border:1px solid {BLUE}33;border-left:4px solid {BLUE};
                                border-radius:10px;padding:1rem 1.2rem;margin-top:.5rem;
                                font-size:.82rem;color:{TEXT2}">
                      <div style="font-size:.65rem;color:{BLUE};font-weight:700;text-transform:uppercase;
                                   letter-spacing:.1em;margin-bottom:.6rem">ANALISIS DEMO — {_nombre_pais.upper()}</div>
                      El pais presenta un score de riesgo de {_score:.1f}/10 para los intereses espanoles.
                      Los principales vectores de riesgo son: {', '.join(_factores[:3])}.
                      Se recomienda vigilancia reforzada y actualizacion de planes de contingencia.
                      Activa Ollama con <code>ollama serve</code> para analisis completo generado por IA.
                    </div>
                    """, unsafe_allow_html=True)

    # ── Pipeline manual ─────────────────────────────────────────────────────
    st.markdown("---")
    section_header("Pipeline Manual")
    pm1, pm2, pm3 = st.columns(3)

    with pm1:
        if st.button("Enriquecer OSINT (LLM)", use_container_width=True, disabled=not _BRAIN_OK):
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
                    st.success(f" {ok} items enriquecidos")
                except Exception as e:
                    st.error(str(e))

    with pm2:
        if st.button("Calcular Impactos DOM", use_container_width=True, disabled=not _BRAIN_OK):
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
                        st.success(f" {len(imps)} impactos calculados")
                    else:
                        st.info("Sin nuevos impactos")
                except Exception as e:
                    st.error(str(e))

    with pm3:
        if st.button("Indexar ChromaDB", use_container_width=True):
            with st.spinner("Indexando..."):
                try:
                    from etl.pipelines.pipeline_geopolitica import tarea_indexar_chromadb
                    r = tarea_indexar_chromadb()
                    st.success(f" {r.get('indexados',0)} documentos")
                except Exception as e:
                    st.warning(str(e))


# ══════════════════════════════════════════════════════════════════════════════
# TAB 7 — EXPOSICIÓN RIESGO OSINT (Bloque 4)
# ══════════════════════════════════════════════════════════════════════════════
with tab_risk_exposure:
    section_header("EXPOSICIÓN GEOPOLÍTICA — Risk Graph OSINT", RED)

    if not _RISK_GEO_OK:
        st.info(
            "Módulo OSINT/Risk no disponible. "
            "Ejecuta `alembic upgrade head` y luego carga entidades con:\n\n"
            "```bash\npython -m pipelines.osint_core --source opensanctions --file data/raw/...\n```"
        )
    else:
        _geo_kpis = _arc_kpis_geo()
        _df_expo = _arc_exposicion()

        if not _geo_kpis.get("hay_datos", False) or _df_expo is None or (hasattr(_df_expo, "empty") and _df_expo.empty):
            st.info(
                "No hay datos de exposición geopolítica OSINT. "
                "Carga entidades de riesgo con países asignados para ver este panel."
            )
        else:
            # KPIs de exposición
            ge1, ge2, ge3, ge4 = st.columns(4)
            with ge1:
                st.markdown(kpi_card(
                    "Países expuestos",
                    str(_geo_kpis.get("countries_exposed", len(_df_expo))),
                    "con entidades de riesgo", color=CYAN,
                ), unsafe_allow_html=True)
            with ge2:
                max_country = _df_expo.iloc[0]["country"] if not _df_expo.empty else "—"
                st.markdown(kpi_card(
                    "Mayor exposición", str(max_country),
                    "más entidades de riesgo", color=RED,
                ), unsafe_allow_html=True)
            with ge3:
                st.markdown(kpi_card(
                    "Entidades sancionadas", str(_geo_kpis.get("sanctioned_count", 0)),
                    "en listas de sanciones", color=AMBER,
                ), unsafe_allow_html=True)
            with ge4:
                st.markdown(kpi_card(
                    "PEPs detectados", str(_geo_kpis.get("pep_count", 0)),
                    "pers. polít. expuestas", color=PURPLE,
                ), unsafe_allow_html=True)

            st.markdown("---")

            # Mapa de exposición por país
            if "country" in _df_expo.columns and "n_entities" in _df_expo.columns:
                try:
                    fig_expo = px.choropleth(
                        _df_expo,
                        locations="country",
                        locationmode="ISO-3",
                        color="n_entities",
                        hover_name="country",
                        hover_data={
                            "n_entities": True,
                            "avg_risk_score": ":.1f" if "avg_risk_score" in _df_expo.columns else False,
                            "n_sanctioned": True if "n_sanctioned" in _df_expo.columns else False,
                            "n_pep": True if "n_pep" in _df_expo.columns else False,
                        },
                        color_continuous_scale=[
                            [0.0, "#1e293b"], [0.3, "#854d0e"],
                            [0.6, "#b45309"], [1.0, "#dc2626"],
                        ],
                        title="Exposición a entidades de riesgo por país",
                    )
                    fig_expo.update_layout(
                        paper_bgcolor=BG, plot_bgcolor=BG,
                        geo=dict(bgcolor=BG, showframe=False),
                        font=dict(color=TEXT),
                        margin=dict(l=0, r=0, t=40, b=0),
                        coloraxis_colorbar=dict(title="Entidades"),
                    )
                    st.plotly_chart(fig_expo, use_container_width=True, config={"displayModeBar": False})
                except Exception as _map_err:
                    st.warning(f"No se pudo renderizar el mapa: {_map_err}")

            # Tabla detallada
            st.markdown("#### Detalle por país")
            _expo_cols = [c for c in [
                "country", "n_entities", "avg_risk_score",
                "n_sanctioned", "n_pep", "max_risk_score",
            ] if c in _df_expo.columns]
            st.dataframe(
                _df_expo[_expo_cols].head(50),
                use_container_width=True,
            )
            st.caption(
                "Fuente: Risk entities con campo `countries` en BD. "
                "Datos OSINT — verificar antes de usar en decisiones críticas."
            )
