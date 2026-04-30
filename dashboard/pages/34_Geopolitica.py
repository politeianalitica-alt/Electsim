"""
Geopolitica v2 — Dashboard de Inteligencia Geopolitica
Mapa pydeck multicapa + Espana en el exterior + Briefings LLM
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    kpi_card, section_header,
)

logger = logging.getLogger(__name__)

st.set_page_config(
    page_title="Geopolitica — ElectSim",
    page_icon="",
    layout="wide",
)
sidebar_nav()
mostrar_alertas_pagina("geopolitica")

# ============================================================================
# CSS intel-card
# ============================================================================
st.markdown(f"""
<style>
.intel-card {{
    background: {BG2};
    border: 1px solid {BORDER};
    border-radius: 12px;
    padding: 1rem 1.2rem;
    margin-bottom: .8rem;
}}
.intel-card .ic-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: .5rem;
}}
.intel-card .ic-pais {{
    font-size: .95rem;
    font-weight: 800;
    color: {TEXT};
}}
.intel-card .ic-badge {{
    font-size: .72rem;
    font-weight: 700;
    padding: .2rem .6rem;
    border-radius: 6px;
    letter-spacing: .05em;
}}
.ic-badge-critico   {{ background: {RED}22;    color: {RED}; }}
.ic-badge-muyalto   {{ background: {AMBER}22;  color: {AMBER}; }}
.ic-badge-alto      {{ background: {AMBER}18;  color: {AMBER}; }}
.ic-badge-moderado  {{ background: {BLUE}22;   color: {BLUE}; }}
.ic-badge-bajo      {{ background: {GREEN}18;  color: {GREEN}; }}
.intel-card .ic-score-row {{
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}}
.intel-card .ic-metric {{
    font-size: .75rem;
    color: {TEXT2};
}}
.intel-card .ic-metric span {{
    color: {TEXT};
    font-weight: 600;
}}
</style>
""", unsafe_allow_html=True)

# ============================================================================
# Header
# ============================================================================
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;
              background:linear-gradient(135deg,{RED},{AMBER});
              border-radius:10px;flex-shrink:0"></div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">
      Inteligencia Geopolitica
    </h2>
    <div style="color:{TEXT2};font-size:.82rem">
      ACLED · UCDP · GDELT · GPSJam · WGI · IMF — riesgo para intereses espanoles
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

# ============================================================================
# Datos estaticos
# ============================================================================

MISIONES_FFAA_2026 = [
    {"nombre": "EUTM Somalia",     "lat": 2.0,   "lon": 45.3,  "efectivos": 8,   "tipo": "entrenamiento"},
    {"nombre": "EUNAVFOR Atalanta","lat": 11.8,  "lon": 50.5,  "efectivos": 85,  "tipo": "naval"},
    {"nombre": "MINUSMA (ex)",     "lat": 12.7,  "lon": -8.0,  "efectivos": 0,   "tipo": "retirada"},
    {"nombre": "NATO eFP Latvia",  "lat": 56.9,  "lon": 24.1,  "efectivos": 350, "tipo": "disuasion"},
    {"nombre": "NATO VJTF",        "lat": 50.0,  "lon": 14.4,  "efectivos": 200, "tipo": "reaccion_rapida"},
    {"nombre": "EUFOR Bosnia",     "lat": 43.9,  "lon": 17.7,  "efectivos": 40,  "tipo": "estabilizacion"},
    {"nombre": "Irak Inherent Resolve", "lat": 33.3, "lon": 44.4, "efectivos": 170, "tipo": "entrenamiento"},
    {"nombre": "UNIFIL Libano",    "lat": 33.3,  "lon": 35.4,  "efectivos": 674, "tipo": "interposicion"},
    {"nombre": "EUTM RCA",         "lat": 4.4,   "lon": 18.6,  "efectivos": 30,  "tipo": "entrenamiento"},
    {"nombre": "Op. Sophia (cerrada)", "lat": 35.0, "lon": 13.0, "efectivos": 0, "tipo": "cerrada"},
    {"nombre": "OTAN Eslovaquia",  "lat": 48.7,  "lon": 21.3,  "efectivos": 25,  "tipo": "disuasion"},
    {"nombre": "KFOR Kosovo",      "lat": 42.7,  "lon": 21.2,  "efectivos": 73,  "tipo": "estabilizacion"},
    {"nombre": "NATO Baltic Air P.","lat": 59.4, "lon": 24.8,  "efectivos": 100, "tipo": "vigilancia_aerea"},
    {"nombre": "EUNAVFOR ASPIDES", "lat": 15.0,  "lon": 42.0,  "efectivos": 120, "tipo": "naval"},
    {"nombre": "EUCAP Sahel Niger","lat": 13.5,  "lon": 2.1,   "efectivos": 12,  "tipo": "capacitacion"},
]

FLOTA_PESCA = [
    {"zona": "Aguas Marruecos",    "lat": 31.5, "lon": -10.0, "barcos": 80,  "tn_ano": 45000},
    {"zona": "Gran Sole (Atlantico)", "lat": 49.0, "lon": -11.0, "barcos": 35, "tn_ano": 18000},
    {"zona": "Mauritania",         "lat": 19.0, "lon": -17.0, "barcos": 25,  "tn_ano": 12000},
    {"zona": "Groenlandia",        "lat": 65.0, "lon": -51.0, "barcos": 12,  "tn_ano": 8000},
    {"zona": "Argentina/Falklands","lat": -47.0,"lon": -60.0, "barcos": 20,  "tn_ano": 15000},
    {"zona": "Namibia/Angola",     "lat": -17.0,"lon": 11.0,  "barcos": 15,  "tn_ano": 9000},
    {"zona": "Senegal",            "lat": 14.5, "lon": -17.5, "barcos": 18,  "tn_ano": 10000},
    {"zona": "Guinea Conakry",     "lat": 10.0, "lon": -15.0, "barcos": 8,   "tn_ano": 4000},
]

DEPENDENCIA_ENERGIA = {
    "Gas natural Argelia (Medgaz+Transmed)": "38%",
    "Gas natural Nigeria (GNL)":              "12%",
    "Gas natural EEUU (GNL)":                "18%",
    "Petroleo Arabia Saudi":                  "8%",
    "Petroleo Nigeria":                       "7%",
    "Petroleo Angola":                        "5%",
    "Nuclear (Francia)":                      "6%",
    "Renovables propias":                     "6%",
}

IBEX_EXPOSICION = [
    {"empresa": "Repsol",      "paises": "IRQ,LBY,VEN,AGO,COL", "exposicion": "Alta"},
    {"empresa": "Iberdrola",   "paises": "MEX,BRA,USA,GBR",      "exposicion": "Alta"},
    {"empresa": "BBVA",        "paises": "MEX,TUR,COL,PER,ARG",  "exposicion": "Alta"},
    {"empresa": "Telefonica",  "paises": "BRA,COL,MEX,VEN,PER",  "exposicion": "Alta"},
    {"empresa": "ACS",         "paises": "USA,AUS,MEX,BRA",      "exposicion": "Media"},
    {"empresa": "Indra",       "paises": "diversos OTAN",         "exposicion": "Media"},
    {"empresa": "Acciona",     "paises": "AUS,USA,MEX",          "exposicion": "Media"},
    {"empresa": "IAG/Iberia",  "paises": "LAT global",           "exposicion": "Alta"},
    {"empresa": "Santander",   "paises": "BRA,MEX,ARG,COL,CHL",  "exposicion": "Alta"},
    {"empresa": "Mapfre",      "paises": "BRA,MEX,USA,COL",      "exposicion": "Media"},
    {"empresa": "Ferrovial",   "paises": "USA,GBR,AUS",          "exposicion": "Media"},
    {"empresa": "Inditex",     "paises": "global 93 paises",     "exposicion": "Alta"},
    {"empresa": "Naturgy",     "paises": "DZA+GNL global",       "exposicion": "Alta"},
    {"empresa": "Endesa",      "paises": "ITA,ESP,LAT",          "exposicion": "Media"},
    {"empresa": "Grifols",     "paises": "USA,global",           "exposicion": "Baja"},
]

# Colores por nivel de riesgo
COLORES_RIESGO = {
    "CRITICO":  RED,
    "MUY_ALTO": AMBER,
    "ALTO":     "#f59e0b",
    "MODERADO": BLUE,
    "BAJO":     GREEN,
}

BADGE_CSS = {
    "CRITICO":  "ic-badge-critico",
    "MUY_ALTO": "ic-badge-muyalto",
    "ALTO":     "ic-badge-alto",
    "MODERADO": "ic-badge-moderado",
    "BAJO":     "ic-badge-bajo",
}


# ============================================================================
# Carga de datos desde cache o demo
# ============================================================================

@st.cache_data(ttl=300)
def cargar_riesgo_paises() -> list[dict]:
    """Carga scores de riesgo desde cache local o datos demo."""
    cache_file = _ROOT / "data" / "cache" / "geopolitico" / "scores_ultimo.json"
    if cache_file.exists():
        try:
            datos = json.loads(cache_file.read_text(encoding="utf-8"))
            scores = datos.get("scores", [])
            if scores:
                return scores
        except Exception:
            pass
    return _SCORES_DEMO


@st.cache_data(ttl=300)
def cargar_eventos_timeline() -> list[dict]:
    """Carga eventos ACLED/UCDP recientes."""
    try:
        import dashboard.db as _db
        conn = _db.get_conn()
        df = pd.read_sql(
            """
            SELECT pais, pais_nombre, fecha, tipo_evento, tipo_cameo,
                   actor1, fatalities, notas, fuente
            FROM eventosacled
            WHERE fecha >= CURRENT_DATE - 30
            ORDER BY fecha DESC, relevancia_es DESC
            LIMIT 200
            """,
            conn,
        )
        return df.to_dict("records")
    except Exception:
        return _EVENTOS_DEMO


@st.cache_data(ttl=600)
def cargar_gpsjam() -> list[dict]:
    """Carga datos GPSJam del snapshot mas reciente."""
    try:
        import dashboard.db as _db
        conn = _db.get_conn()
        df = pd.read_sql(
            """
            SELECT hex_id, pct_interferencia, nivel
            FROM mv_gpsjam_ultimo_por_pais
            WHERE nivel IN ('alto','medio')
            LIMIT 5000
            """,
            conn,
        )
        return df.to_dict("records")
    except Exception:
        return []


# ============================================================================
# KPI Header
# ============================================================================

scores_data = cargar_riesgo_paises()
df_scores = pd.DataFrame(scores_data) if scores_data else pd.DataFrame()

n_criticos  = len(df_scores[df_scores["nivel"] == "CRITICO"])  if not df_scores.empty else 0
n_muy_altos = len(df_scores[df_scores["nivel"] == "MUY_ALTO"]) if not df_scores.empty else 0
n_altos     = len(df_scores[df_scores["nivel"] == "ALTO"])     if not df_scores.empty else 0
score_medio = round(float(df_scores["score_total"].mean()), 1)  if not df_scores.empty else 0.0

kpi_cols = st.columns(6)
kpis = [
    ("Paises monitorizados", str(len(df_scores)), "interes Espana", CYAN),
    ("CRITICO",              str(n_criticos),       "score >= 80",    RED),
    ("MUY ALTO",             str(n_muy_altos),      "score 65-79",    AMBER),
    ("ALTO",                 str(n_altos),          "score 50-64",    AMBER),
    ("Score medio",          f"{score_medio}",      "0-100",          BLUE),
    ("Misiones activas",
     str(sum(1 for m in MISIONES_FFAA_2026 if m["efectivos"] > 0)),
     "FFAA en exterior", PURPLE),
]
for col, (titulo, valor, subtitulo, color) in zip(kpi_cols, kpis):
    col.markdown(kpi_card(titulo, valor, subtitulo, color=color), unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ============================================================================
# Tabs principales
# ============================================================================

tab_mapa, tab_exterior, tab_briefings = st.tabs([
    "Mapa de Riesgo Global",
    "Espana en el Exterior",
    "Briefings y Senales",
])


# ============================================================================
# TAB 1: Mapa de riesgo
# ============================================================================
with tab_mapa:
    col_mapa, col_ranking = st.columns([2, 1])

    with col_mapa:
        section_header("MAPA MULTICAPA — RIESGO GEOPOLITICO", RED)

        # --- pydeck ---
        _pydeck_ok = False
        try:
            import pydeck as pdk
            _pydeck_ok = True
        except ImportError:
            pass

        if _pydeck_ok and not df_scores.empty:
            # Preparar datos para ColumnLayer (riesgo)
            df_map = df_scores.copy()
            # Coordenadas aproximadas por pais (demo)
            COORDS = {
                "DZA":(28.0,2.6),"MAR":(31.8,-7.1),"UKR":(48.4,31.2),"LBY":(27.0,17.0),
                "RUS":(61.5,105.3),"VEN":(8.0,-66.6),"PSE":(31.9,35.2),"ISR":(31.0,34.8),
                "MEX":(23.6,-102.6),"MLI":(17.6,-3.9),"NER":(17.6,8.1),"TUR":(38.9,35.2),
                "IRN":(32.4,53.7),"SYR":(34.8,38.9),"LBN":(33.8,35.9),"BFA":(12.4,-1.6),
                "NGA":(9.1,8.7),"COL":(4.6,-74.3),"TUN":(33.9,9.5),"BRA":((-14.2),-51.9),
                "IRQ":(33.2,43.7),"AGO":(-11.2,17.9),"SAU":(24.0,45.0),"ARG":(-38.4,-63.6),
                "CUB":(22.0,-79.5),"TCD":(15.5,18.7),"MRT":(20.3,-10.9),"MDA":(47.4,28.4),
                "GEO":(42.3,43.4),"PER":(-9.2,-75.0),"EGY":(26.8,30.8),"ECU":(-1.8,-78.2),
                "BLR":(53.7,27.9),"YEM":(15.6,48.5),"SOM":(5.2,46.2),"SSD":(7.9,29.9),
                "COD":(-4.0,21.8),"AFG":(33.9,67.7),"MMR":(19.2,96.7),
            }
            df_map["lat"] = df_map["pais"].map(lambda p: COORDS.get(p, (0,0))[0])
            df_map["lon"] = df_map["pais"].map(lambda p: COORDS.get(p, (0,0))[1])
            df_map["elevation"] = (df_map["score_total"].fillna(0) * 20000).astype(int)
            df_map["color"] = df_map["nivel"].map({
                "CRITICO":  [220, 38, 38, 200],
                "MUY_ALTO": [245, 158, 11, 180],
                "ALTO":     [251, 191, 36, 160],
                "MODERADO": [59, 130, 246, 140],
                "BAJO":     [34, 197, 94, 120],
            }).fillna([100, 100, 100, 100])

            # Datos de misiones
            df_misiones = pd.DataFrame([
                m for m in MISIONES_FFAA_2026 if m["efectivos"] > 0
            ])

            layers = [
                pdk.Layer(
                    "ColumnLayer",
                    data=df_map[df_map["lat"] != 0],
                    get_position=["lon", "lat"],
                    get_elevation="elevation",
                    elevation_scale=1,
                    radius=80000,
                    get_fill_color="color",
                    pickable=True,
                    auto_highlight=True,
                ),
            ]

            if not df_misiones.empty:
                layers.append(
                    pdk.Layer(
                        "ScatterplotLayer",
                        data=df_misiones,
                        get_position=["lon", "lat"],
                        get_radius=120000,
                        get_fill_color=[99, 102, 241, 180],
                        pickable=True,
                    )
                )

            view_state = pdk.ViewState(
                latitude=20.0, longitude=15.0,
                zoom=1.8, pitch=40, bearing=0,
            )
            deck = pdk.Deck(
                layers=layers,
                initial_view_state=view_state,
                map_style="mapbox://styles/mapbox/dark-v10",
                tooltip={
                    "html": "<b>{pais}</b><br>Score: {score_total}<br>Nivel: {nivel}",
                    "style": {"backgroundColor": "#1e293b", "color": "white"},
                },
            )
            st.pydeck_chart(deck)
        else:
            # Fallback: mapa Plotly scatter geo
            if not df_scores.empty:
                COORDS_PLOTLY = {
                    "DZA":(28.0,2.6),"MAR":(31.8,-7.1),"UKR":(48.4,31.2),"LBY":(27.0,17.0),
                    "RUS":(61.5,105.3),"VEN":(8.0,-66.6),"PSE":(31.9,35.2),"ISR":(31.0,34.8),
                    "MEX":(23.6,-102.6),"MLI":(17.6,-3.9),"NER":(17.6,8.1),"TUR":(38.9,35.2),
                    "IRN":(32.4,53.7),"SYR":(34.8,38.9),"LBN":(33.8,35.9),"BFA":(12.4,-1.6),
                    "NGA":(9.1,8.7),"COL":(4.6,-74.3),"TUN":(33.9,9.5),"BRA":(-14.2,-51.9),
                    "IRQ":(33.2,43.7),"AGO":(-11.2,17.9),"SAU":(24.0,45.0),"ARG":(-38.4,-63.6),
                    "CUB":(22.0,-79.5),"TCD":(15.5,18.7),"MRT":(20.3,-10.9),"MDA":(47.4,28.4),
                    "GEO":(42.3,43.4),"PER":(-9.2,-75.0),"EGY":(26.8,30.8),"ECU":(-1.8,-78.2),
                    "BLR":(53.7,27.9),
                }
                lats, lons, textos, tamanos, colores_hex = [], [], [], [], []
                for _, row in df_scores.iterrows():
                    coords = COORDS_PLOTLY.get(str(row["pais"]))
                    if not coords:
                        continue
                    lats.append(coords[0])
                    lons.append(coords[1])
                    textos.append(f"{row['pais']}: {row.get('score_total',0):.0f}")
                    tamanos.append(max(8, float(row.get("score_total", 0)) / 5))
                    colores_hex.append(COLORES_RIESGO.get(str(row.get("nivel", "")), MUTED))

                fig_geo = go.Figure(go.Scattergeo(
                    lat=lats, lon=lons,
                    text=textos,
                    mode="markers",
                    marker=dict(
                        size=tamanos,
                        color=colores_hex,
                        opacity=0.8,
                        line=dict(width=1, color="rgba(255,255,255,0.3)"),
                    ),
                ))
                fig_geo.update_layout(
                    height=420,
                    paper_bgcolor=BG2,
                    geo=dict(
                        bgcolor=BG,
                        landcolor="#1e293b",
                        oceancolor=BG,
                        showland=True,
                        showocean=True,
                        showcoastlines=True,
                        coastlinecolor=BORDER,
                        showframe=False,
                    ),
                    margin=dict(t=5, b=5, l=5, r=5),
                )
                st.plotly_chart(fig_geo, use_container_width=True, config={"displayModeBar": False})
            if not _pydeck_ok:
                st.caption("Instala pydeck para el mapa 3D: pip install pydeck")

    with col_ranking:
        section_header("RANKING DE RIESGO", RED)

        if not df_scores.empty:
            top = df_scores.sort_values("score_total", ascending=False).head(15)
            for _, row in top.iterrows():
                nivel = str(row.get("nivel", "BAJO"))
                badge_css = BADGE_CSS.get(nivel, "ic-badge-bajo")
                pais_nombre_corto = str(row.get("pais", ""))
                score_val = float(row.get("score_total", 0))
                cii_val = float(row.get("cii_raw", row.get("cii", 0)))
                st.markdown(f"""
<div class="intel-card">
  <div class="ic-header">
    <span class="ic-pais">{pais_nombre_corto}</span>
    <span class="ic-badge {badge_css}">{nivel.replace("_"," ")}</span>
  </div>
  <div class="ic-score-row">
    <div class="ic-metric">Score <span>{score_val:.0f}</span></div>
    <div class="ic-metric">CII <span>{cii_val:.1f}</span></div>
  </div>
</div>
""", unsafe_allow_html=True)


# ============================================================================
# TAB 2: Espana en el exterior
# ============================================================================
with tab_exterior:
    tab_misiones, tab_pesca, tab_energia, tab_ibex, tab_comunidad = st.tabs([
        "Misiones FFAA",
        "Flota pesquera",
        "Dependencia energetica",
        "IBEX Exposicion",
        "Comunidad espanola",
    ])

    with tab_misiones:
        section_header("MISIONES DE LAS FUERZAS ARMADAS ESPANOLAS (2026)", BLUE)
        df_mis = pd.DataFrame(MISIONES_FFAA_2026)
        df_mis_activas = df_mis[df_mis["efectivos"] > 0].sort_values("efectivos", ascending=False)

        cols_m = st.columns(3)
        kpis_mis = [
            ("Misiones activas", str(len(df_mis_activas)), "", BLUE),
            ("Efectivos total", str(df_mis_activas["efectivos"].sum()), "aprox.", CYAN),
            ("Teatros distintos", str(df_mis_activas["tipo"].nunique()), "tipos", PURPLE),
        ]
        for col, (t, v, s, c) in zip(cols_m, kpis_mis):
            col.markdown(kpi_card(t, v, s, color=c), unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        st.dataframe(
            df_mis_activas[["nombre", "tipo", "efectivos"]],
            use_container_width=True, hide_index=True,
        )

        # Grafico efectivos por tipo
        por_tipo = df_mis_activas.groupby("tipo")["efectivos"].sum().reset_index()
        fig_mis = go.Figure(go.Bar(
            x=por_tipo["efectivos"], y=por_tipo["tipo"],
            orientation="h",
            marker_color=BLUE,
            hovertemplate="%{y}: %{x} efectivos<extra></extra>",
        ))
        fig_mis.update_layout(
            height=250, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER),
            yaxis=dict(color=TEXT2),
        )
        st.plotly_chart(fig_mis, use_container_width=True, config={"displayModeBar": False})

    with tab_pesca:
        section_header("FLOTA PESQUERA ESPANOLA EN AGUAS INTERNACIONALES", CYAN)
        df_pesca = pd.DataFrame(FLOTA_PESCA)
        total_barcos = df_pesca["barcos"].sum()
        total_tn = df_pesca["tn_ano"].sum()

        cols_p = st.columns(3)
        kpis_p = [
            ("Barcos en el exterior", str(total_barcos), "aprox.", CYAN),
            ("Toneladas/ano", f"{total_tn:,}", "captura", GREEN),
            ("Zonas de faena", str(len(df_pesca)), "", BLUE),
        ]
        for col, (t, v, s, c) in zip(cols_p, kpis_p):
            col.markdown(kpi_card(t, v, s, color=c), unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        fig_pesca = go.Figure(go.Bar(
            x=df_pesca["barcos"], y=df_pesca["zona"],
            orientation="h",
            marker_color=CYAN,
            hovertemplate="%{y}: %{x} barcos<extra></extra>",
        ))
        fig_pesca.update_layout(
            height=280, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER),
            yaxis=dict(color=TEXT2),
        )
        st.plotly_chart(fig_pesca, use_container_width=True, config={"displayModeBar": False})

    with tab_energia:
        section_header("DEPENDENCIA ENERGETICA EXTERIOR DE ESPANA", AMBER)
        fuentes = list(DEPENDENCIA_ENERGIA.keys())
        pcts = [float(v.strip("%")) for v in DEPENDENCIA_ENERGIA.values()]
        colores_energia = [AMBER if "Argelia" in f or "Nigeria" in f
                           else (GREEN if "Renovables" in f else BLUE)
                           for f in fuentes]

        fig_ener = go.Figure(go.Bar(
            x=pcts, y=fuentes,
            orientation="h",
            marker_color=colores_energia,
            hovertemplate="%{y}: %{x}%<extra></extra>",
        ))
        fig_ener.update_layout(
            height=320, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%"),
            yaxis=dict(color=TEXT2),
        )
        st.plotly_chart(fig_ener, use_container_width=True, config={"displayModeBar": False})
        st.caption("Datos aproximados 2025-2026. Argelia = primer proveedor de gas via Medgaz y Transmed.")

    with tab_ibex:
        section_header("EXPOSICION GEOPOLITICA DE EMPRESAS IBEX-35", PURPLE)
        df_ibex = pd.DataFrame(IBEX_EXPOSICION)
        cols_ibex = st.columns(3)
        kpis_ibex = [
            ("Alta exposicion", str(len(df_ibex[df_ibex["exposicion"] == "Alta"])), "", RED),
            ("Media exposicion", str(len(df_ibex[df_ibex["exposicion"] == "Media"])), "", AMBER),
            ("Empresas analizadas", str(len(df_ibex)), "", BLUE),
        ]
        for col, (t, v, s, c) in zip(cols_ibex, kpis_ibex):
            col.markdown(kpi_card(t, v, s, color=c), unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        st.dataframe(df_ibex, use_container_width=True, hide_index=True)

    with tab_comunidad:
        section_header("COMUNIDAD ESPANOLA EN EL EXTERIOR", GREEN)
        COMUNIDAD = [
            {"pais": "Argentina",  "personas": 580000, "lat": -38.4, "lon": -63.6},
            {"pais": "Francia",    "personas": 430000, "lat": 46.2,  "lon": 2.2},
            {"pais": "Venezuela",  "personas": 220000, "lat": 8.0,   "lon": -66.6},
            {"pais": "Alemania",   "personas": 195000, "lat": 51.2,  "lon": 10.4},
            {"pais": "Mexico",     "personas": 180000, "lat": 23.6,  "lon": -102.6},
            {"pais": "Reino Unido","personas": 175000, "lat": 55.4,  "lon": -3.4},
            {"pais": "Brasil",     "personas": 140000, "lat": -14.2, "lon": -51.9},
            {"pais": "EEUU",       "personas": 110000, "lat": 37.1,  "lon": -95.7},
            {"pais": "Cuba",       "personas": 95000,  "lat": 22.0,  "lon": -79.5},
            {"pais": "Colombia",   "personas": 80000,  "lat": 4.6,   "lon": -74.3},
            {"pais": "Chile",      "personas": 75000,  "lat": -35.7, "lon": -71.5},
            {"pais": "Suiza",      "personas": 65000,  "lat": 46.8,  "lon": 8.2},
        ]
        df_com = pd.DataFrame(COMUNIDAD).sort_values("personas", ascending=False)
        fig_com = go.Figure(go.Bar(
            x=df_com["personas"], y=df_com["pais"],
            orientation="h",
            marker_color=GREEN,
            hovertemplate="%{y}: %{x:,} personas<extra></extra>",
        ))
        fig_com.update_layout(
            height=320, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER),
            yaxis=dict(color=TEXT2),
        )
        st.plotly_chart(fig_com, use_container_width=True, config={"displayModeBar": False})
        total_com = df_com["personas"].sum()
        st.caption(f"Total comunidad exterior registrada: aprox. {total_com:,} personas (datos PERE 2025).")


# ============================================================================
# TAB 3: Briefings y Senales
# ============================================================================
with tab_briefings:
    tab_br_eventos, tab_br_llm, tab_br_senales = st.tabs([
        "Eventos recientes",
        "Briefings LLM",
        "Senales activas",
    ])

    with tab_br_eventos:
        section_header("EVENTOS GEOPOLITICOS RECIENTES (30 dias)", AMBER)
        eventos = cargar_eventos_timeline()
        if eventos:
            df_ev = pd.DataFrame(eventos)
            # Filtros
            col_f1, col_f2, col_f3 = st.columns(3)
            with col_f1:
                paises_ev = sorted(df_ev["pais"].dropna().unique().tolist())
                filtro_pais = st.multiselect("Pais", paises_ev, key="ev_pais")
            with col_f2:
                tipos_ev = sorted(df_ev["tipo_cameo"].dropna().unique().tolist()) if "tipo_cameo" in df_ev.columns else []
                filtro_tipo = st.multiselect("Tipo CAMEO", tipos_ev, key="ev_tipo")
            with col_f3:
                min_fat = st.slider("Min. bajas", 0, 100, 0, key="ev_fat")

            df_filtrado = df_ev.copy()
            if filtro_pais:
                df_filtrado = df_filtrado[df_filtrado["pais"].isin(filtro_pais)]
            if filtro_tipo and "tipo_cameo" in df_filtrado.columns:
                df_filtrado = df_filtrado[df_filtrado["tipo_cameo"].isin(filtro_tipo)]
            if min_fat > 0 and "fatalities" in df_filtrado.columns:
                df_filtrado = df_filtrado[df_filtrado["fatalities"] >= min_fat]

            cols_mostrar = [c for c in ["pais","fecha","tipo_cameo","actor1","fatalities","notas","fuente"]
                           if c in df_filtrado.columns]
            st.dataframe(df_filtrado[cols_mostrar], use_container_width=True, hide_index=True)
        else:
            st.info("Sin eventos recientes. Ejecuta el pipeline para cargar datos.")

    with tab_br_llm:
        section_header("BRIEFINGS GEOPOLITICOS (LLM)", CYAN)

        # Cargar briefings guardados
        briefings_cache = {}
        briefing_file = _ROOT / "data" / "cache" / "geopolitico" / "briefings_ultimo.json"
        if briefing_file.exists():
            try:
                datos_br = json.loads(briefing_file.read_text(encoding="utf-8"))
                briefings_cache = datos_br.get("briefings", {})
            except Exception:
                pass

        if briefings_cache:
            st.success(f"Briefings disponibles para {len(briefings_cache)} paises.")
            pais_sel = st.selectbox("Seleccionar pais", sorted(briefings_cache.keys()))
            if pais_sel:
                st.markdown(f"""
<div style="background:{BG2};border:1px solid {CYAN}33;border-radius:12px;
            padding:1.5rem;border-left:4px solid {CYAN}">
""", unsafe_allow_html=True)
                st.markdown(briefings_cache[pais_sel])
                st.markdown("</div>", unsafe_allow_html=True)
        else:
            st.info("Sin briefings disponibles. Ejecuta el LLM enricher para generar briefings.")

        # Boton para generar briefings
        st.markdown("---")
        section_header("GENERAR BRIEFINGS", PURPLE)
        if st.button("Generar briefings (top 10 paises por riesgo)", type="primary"):
            with st.spinner("Generando briefings..."):
                try:
                    from agents.geopolitico import RiskScorer, GeopoliticalEnricher
                    scores_top = sorted(scores_data, key=lambda s: float(s.get("score_total", 0)), reverse=True)[:10]
                    enricher = GeopoliticalEnricher()
                    nuevos_briefings = enricher.enriquecer_lote(scores_top, batch_size=3)
                    if nuevos_briefings:
                        enricher.guardar_briefings(nuevos_briefings)
                        st.success(f"Briefings generados para {len(nuevos_briefings)} paises.")
                    else:
                        st.warning("No se pudieron generar briefings. Verifica ANTHROPIC_API_KEY.")
                except Exception as exc:
                    st.error(f"Error generando briefings: {exc}")

    with tab_br_senales:
        section_header("SENALES DE ALERTA ACTIVAS", RED)

        try:
            import dashboard.db as _db
            conn_s = _db.get_conn()
            df_sen = pd.read_sql(
                """
                SELECT pais, tipo, urgencia, descripcion, estado, fuente, creado_en
                FROM senales
                WHERE estado = 'pendiente'
                ORDER BY urgencia DESC, creado_en DESC
                LIMIT 50
                """,
                conn_s,
            )
            if not df_sen.empty:
                st.dataframe(df_sen, use_container_width=True, hide_index=True)
            else:
                st.info("Sin senales pendientes.")
        except Exception:
            # Demo senales
            demo_sen = [
                {"pais": "UKR", "tipo": "CONFLICTO_ACTIVO",    "urgencia": 4,
                 "descripcion": "Combates intensos frente Este — bajas elevadas",  "estado": "pendiente"},
                {"pais": "MLI", "tipo": "CAMBIO_REGIMEN",      "urgencia": 3,
                 "descripcion": "JNIM expande control en Segou — riesgo misiones", "estado": "pendiente"},
                {"pais": "DZA", "tipo": "SUMINISTRO_ENERGIA",  "urgencia": 2,
                 "descripcion": "Mantenimiento Medgaz — monitorizar continuidad",  "estado": "pendiente"},
            ]
            st.dataframe(pd.DataFrame(demo_sen), use_container_width=True, hide_index=True)

        # Boton para ejecutar pipeline
        st.markdown("---")
        if st.button("Actualizar pipeline geopolitico ahora", key="btn_pipeline_geo"):
            with st.spinner("Ejecutando pipeline..."):
                try:
                    import asyncio
                    from etl.pipelines.pipeline_geopolitico import PipelineGeopolitico
                    resultado = asyncio.run(PipelineGeopolitico().ejecutar_completo())
                    st.success(
                        f"Pipeline completado: {resultado.get('paises_scored',0)} paises scored, "
                        f"{resultado.get('eventos_acled',0)} eventos ACLED, "
                        f"{resultado.get('articulos_gdelt',0)} articulos GDELT."
                    )
                    st.cache_data.clear()
                except Exception as exc:
                    st.error(f"Error en pipeline: {exc}")


# ============================================================================
# Demo data
# ============================================================================

_SCORES_DEMO: list[dict] = [
    {"pais":"UKR","score_total":92.1,"nivel":"CRITICO",  "cii_raw":480.0,"cii":480.0,"score_cii":96.0,"score_wgi":85.0,"score_imf":70.0,"score_gdelt":78.0,"score_jamming":95.0,"tono_gdelt":-12.3,"relevancia_es":1.0},
    {"pais":"RUS","score_total":88.5,"nivel":"CRITICO",  "cii_raw":320.0,"cii":320.0,"score_cii":64.0,"score_wgi":92.0,"score_imf":75.0,"score_gdelt":82.0,"score_jamming":45.0,"tono_gdelt":-15.1,"relevancia_es":0.90},
    {"pais":"PSE","score_total":85.3,"nivel":"CRITICO",  "cii_raw":280.0,"cii":280.0,"score_cii":56.0,"score_wgi":88.0,"score_imf":90.0,"score_gdelt":88.0,"score_jamming":75.0,"tono_gdelt":-18.2,"relevancia_es":0.80},
    {"pais":"MLI","score_total":78.9,"nivel":"MUY_ALTO", "cii_raw":210.0,"cii":210.0,"score_cii":42.0,"score_wgi":80.0,"score_imf":65.0,"score_gdelt":65.0,"score_jamming":20.0,"tono_gdelt":-8.5, "relevancia_es":0.82},
    {"pais":"NER","score_total":75.4,"nivel":"MUY_ALTO", "cii_raw":185.0,"cii":185.0,"score_cii":37.0,"score_wgi":78.0,"score_imf":70.0,"score_gdelt":60.0,"score_jamming":15.0,"tono_gdelt":-7.2, "relevancia_es":0.75},
    {"pais":"DZA","score_total":72.1,"nivel":"MUY_ALTO", "cii_raw":90.0, "cii":90.0, "score_cii":18.0,"score_wgi":72.0,"score_imf":45.0,"score_gdelt":55.0,"score_jamming":10.0,"tono_gdelt":-5.8, "relevancia_es":1.0},
    {"pais":"SYR","score_total":70.8,"nivel":"MUY_ALTO", "cii_raw":160.0,"cii":160.0,"score_cii":32.0,"score_wgi":95.0,"score_imf":92.0,"score_gdelt":70.0,"score_jamming":40.0,"tono_gdelt":-11.0,"relevancia_es":0.72},
    {"pais":"VEN","score_total":68.3,"nivel":"MUY_ALTO", "cii_raw":75.0, "cii":75.0, "score_cii":15.0,"score_wgi":85.0,"score_imf":88.0,"score_gdelt":62.0,"score_jamming":5.0, "tono_gdelt":-9.3, "relevancia_es":0.80},
    {"pais":"IRN","score_total":66.7,"nivel":"MUY_ALTO", "cii_raw":55.0, "cii":55.0, "score_cii":11.0,"score_wgi":82.0,"score_imf":78.0,"score_gdelt":58.0,"score_jamming":30.0,"tono_gdelt":-10.1,"relevancia_es":0.70},
    {"pais":"MAR","score_total":55.2,"nivel":"ALTO",     "cii_raw":30.0, "cii":30.0, "score_cii":6.0, "score_wgi":45.0,"score_imf":40.0,"score_gdelt":50.0,"score_jamming":8.0, "tono_gdelt":-3.2, "relevancia_es":1.0},
    {"pais":"LBY","score_total":62.4,"nivel":"MUY_ALTO", "cii_raw":140.0,"cii":140.0,"score_cii":28.0,"score_wgi":90.0,"score_imf":60.0,"score_gdelt":65.0,"score_jamming":12.0,"tono_gdelt":-8.0, "relevancia_es":0.90},
    {"pais":"BFA","score_total":60.1,"nivel":"ALTO",     "cii_raw":120.0,"cii":120.0,"score_cii":24.0,"score_wgi":78.0,"score_imf":62.0,"score_gdelt":55.0,"score_jamming":8.0, "tono_gdelt":-6.5, "relevancia_es":0.72},
    {"pais":"ISR","score_total":58.9,"nivel":"ALTO",     "cii_raw":200.0,"cii":200.0,"score_cii":40.0,"score_wgi":50.0,"score_imf":35.0,"score_gdelt":70.0,"score_jamming":60.0,"tono_gdelt":-14.0,"relevancia_es":0.78},
    {"pais":"IRQ","score_total":52.3,"nivel":"ALTO",     "cii_raw":95.0, "cii":95.0, "score_cii":19.0,"score_wgi":75.0,"score_imf":55.0,"score_gdelt":48.0,"score_jamming":15.0,"tono_gdelt":-5.5, "relevancia_es":0.65},
    {"pais":"TUR","score_total":45.6,"nivel":"MODERADO", "cii_raw":40.0, "cii":40.0, "score_cii":8.0, "score_wgi":62.0,"score_imf":58.0,"score_gdelt":40.0,"score_jamming":20.0,"tono_gdelt":-4.1, "relevancia_es":0.75},
    {"pais":"MEX","score_total":42.8,"nivel":"MODERADO", "cii_raw":55.0, "cii":55.0, "score_cii":11.0,"score_wgi":65.0,"score_imf":50.0,"score_gdelt":35.0,"score_jamming":2.0, "tono_gdelt":-3.8, "relevancia_es":0.78},
    {"pais":"COL","score_total":40.1,"nivel":"MODERADO", "cii_raw":65.0, "cii":65.0, "score_cii":13.0,"score_wgi":60.0,"score_imf":42.0,"score_gdelt":32.0,"score_jamming":0.0, "tono_gdelt":-2.9, "relevancia_es":0.70},
    {"pais":"GEO","score_total":38.5,"nivel":"MODERADO", "cii_raw":25.0, "cii":25.0, "score_cii":5.0, "score_wgi":55.0,"score_imf":45.0,"score_gdelt":30.0,"score_jamming":22.0,"tono_gdelt":-3.5, "relevancia_es":0.58},
]

_EVENTOS_DEMO: list[dict] = [
    {"pais":"UKR","pais_nombre":"Ucrania","fecha":"2026-04-29","tipo_cameo":"FIGHT",
     "tipo_evento":"Battles","actor1":"Russian Armed Forces","fatalities":38,
     "notas":"Combates intensos Donetsk","fuente":"ACLED"},
    {"pais":"MLI","pais_nombre":"Mali","fecha":"2026-04-28","tipo_cameo":"STRATEGIC",
     "tipo_evento":"Strategic developments","actor1":"JNIM","fatalities":0,
     "notas":"JNIM expande control Segou","fuente":"UCDP"},
    {"pais":"PSE","pais_nombre":"Palestina","fecha":"2026-04-27","tipo_cameo":"FIGHT",
     "tipo_evento":"Explosions/Remote violence","actor1":"IDF","fatalities":12,
     "notas":"Operacion Gaza norte","fuente":"ACLED"},
    {"pais":"DZA","pais_nombre":"Argelia","fecha":"2026-04-26","tipo_cameo":"PROTEST",
     "tipo_evento":"Protests","actor1":"Opposition groups","fatalities":0,
     "notas":"Protestas Argel por reformas","fuente":"GDELT"},
]
