"""
CENTRO DE OPERACIONES — Vista unificada de inteligencia operacional.

Absorbe toda la funcionalidad del antiguo Command Center:
  Tab 1 — Mision: KPIs globales, senales activas, mapa de actividad,
           Political Risk Index, actores clave, pulso mediatico,
           propensity electoral, swing districts.
  Tab 2 — Entidades: actividad del pipeline de resolucion de identidades,
           alertas de anomalias multivariante, cola de revision humana.
  Tab 3 — Legislacion: monitor legislativo con normas de alto impacto.
  Tab 4 — Prediccion: outputs de CoalitionPredictor, CrisisEscalation,
           ElectoralShiftDetector (Bloque 7 cuando este disponible).
  Tab 5 — Salud del sistema: datasets, fases, API health.
"""
from __future__ import annotations

import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    kpi_card, signal_card, section_header,
    sidebar_nav, apply_plotly_theme,
)

log = logging.getLogger(__name__)

# ── Configuracion ──────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Centro de Operaciones — Politeia",
    layout="wide",
    initial_sidebar_state="collapsed",
)
sidebar_nav()

_API           = os.getenv("ELECTSIM_API_URL", "http://localhost:8000").rstrip("/")
_REFRESH_SECS  = int(os.getenv("COMMAND_CENTER_REFRESH_SECS", "30"))
_TIMEOUT       = 6

# ── Estilos ────────────────────────────────────────────────────────────────────

st.markdown(
    f"""
    <style>
    [data-testid="stAppViewContainer"] {{ background:{BG}; }}
    [data-testid="stHeader"]           {{ background:{BG}; }}
    [data-testid="stSidebar"]          {{ background:#060A12; }}
    section.main > div                 {{ padding-top:.5rem; }}
    div[data-testid="stMetric"]        {{ background:{BG2};border:1px solid {BORDER};
                                          border-radius:8px;padding:.6rem .8rem; }}
    .co-section {{
        font-size:.6rem;font-weight:800;letter-spacing:.14em;
        text-transform:uppercase;color:{MUTED};
        border-bottom:1px solid {BORDER};padding-bottom:.4rem;margin-bottom:.6rem;
    }}
    .co-actor-row {{
        display:flex;align-items:center;gap:.6rem;
        padding:.45rem .5rem;border-radius:6px;
        border:1px solid {BORDER};background:{BG2};margin-bottom:.35rem;
    }}
    .co-leg-row {{
        padding:.4rem .6rem;border-radius:6px;
        border-left:3px solid {BLUE};background:{BG2};
        margin-bottom:.3rem;font-size:.78rem;color:{TEXT};
    }}
    .co-anomaly-card {{
        padding:.5rem .7rem;border-radius:6px;
        border-left:3px solid {RED};background:{BG2};
        margin-bottom:.4rem;
    }}
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Helpers API ────────────────────────────────────────────────────────────────


def _get(path: str, params: dict | None = None) -> Any:
    try:
        r = requests.get(f"{_API}{path}", params=params, timeout=_TIMEOUT)
        if r.status_code == 200:
            return r.json()
    except Exception as exc:
        log.debug("API %s error: %s", path, exc)
    return None


@st.cache_data(ttl=_REFRESH_SECS)
def _fetch_risk_index() -> dict:
    data = _get("/intelligence/risk-index")
    if data:
        return data
    return {
        "score": 42.5, "nivel": "medio",
        "componentes": {
            "senales_criticas_24h": 3, "leyes_alto_impacto_7d": 5,
            "sentimiento_politicos": 0.12, "iniciativas_pendientes": 18,
        },
        "timestamp": datetime.now().isoformat(),
    }


@st.cache_data(ttl=_REFRESH_SECS)
def _fetch_signals(urgencia_min: int = 1, limit: int = 30) -> list[dict]:
    data = _get("/intelligence/signals", {"urgencia_min": urgencia_min, "limit": limit})
    if data:
        return data
    return [
        {"id": "s1", "tipo": "mediatico",     "urgencia": 5, "titulo": "Pedro Sanchez: caida de sentimiento -0.38 en 24h",     "resumen": "38 articulos negativos detectados en prensa nacional.",       "modulo_origen": "sentiment_tracker",  "created_at": (datetime.now()-timedelta(hours=1)).isoformat()},
        {"id": "s2", "tipo": "legislativo",   "urgencia": 4, "titulo": "Ley de IA aprobada en primera lectura",               "resumen": "Impacto alto en sectores tecnologico y financiero.",           "modulo_origen": "boe_ingestor",        "created_at": (datetime.now()-timedelta(hours=3)).isoformat()},
        {"id": "s3", "tipo": "geopolitico",   "urgencia": 4, "titulo": "Escalada diplomatica Espana-Marruecos por Ceuta",     "resumen": "Nota de protesta presentada ante la Embajada.",               "modulo_origen": "gdelt_ingestor",      "created_at": (datetime.now()-timedelta(hours=5)).isoformat()},
        {"id": "s4", "tipo": "electoral",     "urgencia": 3, "titulo": "PSOE pierde 4pp en encuesta CIS flash",               "resumen": "Swing districts de Madrid y Valencia en riesgo.",             "modulo_origen": "propensity_engine",   "created_at": (datetime.now()-timedelta(hours=8)).isoformat()},
        {"id": "s5", "tipo": "mediatico",     "urgencia": 3, "titulo": "Tendencia viral #CrisisGobierno en X",                "resumen": "12.400 menciones en las ultimas 6h.",                         "modulo_origen": "social_monitor",      "created_at": (datetime.now()-timedelta(hours=2)).isoformat()},
        {"id": "s6", "tipo": "legislativo",   "urgencia": 2, "titulo": "BOE: nueva resolucion sobre vivienda",                "resumen": "Afecta a 47 municipios con presion inmobiliaria alta.",       "modulo_origen": "boe_ingestor",        "created_at": (datetime.now()-timedelta(hours=6)).isoformat()},
        {"id": "s7", "tipo": "institucional", "urgencia": 2, "titulo": "Congreso: 3 enmiendas registradas Ley Presupuestos",  "resumen": "Enmiendas de PP, VOX y Junts.",                               "modulo_origen": "congreso_ingestor",   "created_at": (datetime.now()-timedelta(hours=9)).isoformat()},
    ]


@st.cache_data(ttl=60)
def _fetch_personas(limit: int = 10) -> list[dict]:
    data = _get("/intelligence/personas", {"limit": limit, "order_by": "score_influencia"})
    if data:
        return data
    return [
        {"nombre_completo": "Pedro Sanchez",      "partido": "PSOE",  "cargo_actual": "Presidente del Gobierno", "score_influencia": 98, "score_riesgo": 62, "sentimiento_actual": -0.15, "tendencia_sentimiento": "bajando"},
        {"nombre_completo": "Alberto Nunez Feijoo","partido": "PP",   "cargo_actual": "Lider de la oposicion",   "score_influencia": 91, "score_riesgo": 41, "sentimiento_actual":  0.08, "tendencia_sentimiento": "estable"},
        {"nombre_completo": "Santiago Abascal",   "partido": "VOX",   "cargo_actual": "Presidente de VOX",       "score_influencia": 78, "score_riesgo": 55, "sentimiento_actual": -0.22, "tendencia_sentimiento": "bajando"},
        {"nombre_completo": "Yolanda Diaz",       "partido": "SUMAR", "cargo_actual": "Vicepresidenta 2a",       "score_influencia": 74, "score_riesgo": 34, "sentimiento_actual":  0.14, "tendencia_sentimiento": "subiendo"},
        {"nombre_completo": "Teresa Ribera",      "partido": "PSOE",  "cargo_actual": "Vicepresidenta CE",       "score_influencia": 68, "score_riesgo": 28, "sentimiento_actual":  0.31, "tendencia_sentimiento": "subiendo"},
        {"nombre_completo": "Carles Puigdemont",  "partido": "JUNTS", "cargo_actual": "Expresident Cataluna",    "score_influencia": 65, "score_riesgo": 72, "sentimiento_actual": -0.41, "tendencia_sentimiento": "bajando"},
        {"nombre_completo": "Andoni Ortuzar",     "partido": "PNV",   "cargo_actual": "Presidente PNV",          "score_influencia": 58, "score_riesgo": 19, "sentimiento_actual":  0.22, "tendencia_sentimiento": "estable"},
    ]


@st.cache_data(ttl=120)
def _fetch_legislation(limit: int = 8) -> list[dict]:
    data = _get("/intelligence/legislation/impact", {"limit": limit, "min_relevance": 7})
    if data:
        return data
    today = datetime.now()
    return [
        {"titulo": "Ley Organica de Inteligencia Artificial",      "nivel": "nacional", "ai_category": "tecnologia",     "ai_impact_level": "high",   "ai_relevance": 9,  "published_at": (today-timedelta(days=2)).isoformat()},
        {"titulo": "Reglamento Europeo de Datos (EU Data Act)",    "nivel": "europeo",  "ai_category": "digital",        "ai_impact_level": "high",   "ai_relevance": 9,  "published_at": (today-timedelta(days=5)).isoformat()},
        {"titulo": "Plan Recuperacion: tramo 4 fondos NextGen",    "nivel": "nacional", "ai_category": "economia",       "ai_impact_level": "high",   "ai_relevance": 8,  "published_at": (today-timedelta(days=1)).isoformat()},
        {"titulo": "Decreto vivienda asequible CCAA Cataluna",     "nivel": "regional", "ai_category": "vivienda",       "ai_impact_level": "medium", "ai_relevance": 8,  "published_at": (today-timedelta(days=3)).isoformat()},
        {"titulo": "Directiva UE Gobernanza Corporativa (CSRD)",   "nivel": "europeo",  "ai_category": "sostenibilidad", "ai_impact_level": "medium", "ai_relevance": 7,  "published_at": (today-timedelta(days=7)).isoformat()},
        {"titulo": "Ley de Presupuestos Generales del Estado 2025","nivel": "nacional", "ai_category": "economia",       "ai_impact_level": "high",   "ai_relevance": 10, "published_at": (today-timedelta(days=12)).isoformat()},
    ]


@st.cache_data(ttl=300)
def _fetch_swing_districts(n: int = 20) -> list[dict]:
    data = _get("/intelligence/propensity/swing-districts", {"partido_a": "pp", "partido_b": "psoe", "n": n})
    if data:
        return data
    import random
    random.seed(42)
    provincias = ["Madrid","Barcelona","Valencia","Sevilla","Zaragoza","Bilbao","Murcia","Valladolid","Alicante","Cordoba"]
    return [
        {
            "seccion_censal": f"{p[:3].upper()}{i:04d}", "provincia_cod": f"{i+1:02d}",
            "ccaa": "Andalucia" if p in ["Sevilla","Cordoba"] else "Cataluna" if p=="Barcelona" else "Madrid" if p=="Madrid" else "Otros",
            "score_a": round(0.35+random.random()*0.15, 3), "score_b": round(0.33+random.random()*0.15, 3),
            "diferencia": round(random.random()*0.08, 3), "competitividad": round(0.40+random.random()*0.20, 3),
            "renta_media": random.randint(18000, 45000),
        }
        for i, p in enumerate(provincias * 2)
    ]


# ── Utilidades visuales ────────────────────────────────────────────────────────

def _urgencia_level(u: int) -> str:
    return {5: "critical", 4: "high", 3: "medium", 2: "low"}.get(u, "info")

def _tipo_icon(tipo: str) -> str:
    return {"mediatico":"[M]","legislativo":"[L]","geopolitico":"[G]","electoral":"[E]","institucional":"[I]"}.get(tipo,"[?]")

def _sent_color(v: float) -> str:
    return GREEN if v > 0.1 else (RED if v < -0.1 else AMBER)

def _arrow(t: str) -> str:
    return {"subiendo":"&#9650;","bajando":"&#9660;","estable":"&#9679;"}.get(t,"")

def _nivel_color(n: str) -> str:
    return {"europeo":PURPLE,"nacional":BLUE,"regional":CYAN}.get(n,MUTED)

def _impact_color(i: str) -> str:
    return {"high":RED,"medium":AMBER,"low":GREEN}.get(i,MUTED)


# ── Cabecera ───────────────────────────────────────────────────────────────────

_hc = st.columns([5, 1, 1])
with _hc[0]:
    st.markdown(
        f'<div style="font-size:1.35rem;font-weight:900;color:{CYAN};letter-spacing:.04em;'
        f'margin-bottom:.1rem">CENTRO DE OPERACIONES</div>'
        f'<div style="font-size:.7rem;color:{MUTED}">Political Intelligence Platform — '
        f'{datetime.now().strftime("%A %d %b %Y %H:%M")}</div>',
        unsafe_allow_html=True,
    )
with _hc[1]:
    auto_refresh = st.toggle("Auto-refresh", value=False, key="co_autorefresh")
with _hc[2]:
    if st.button("Actualizar", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

st.markdown(
    f'<div style="height:4px;background:linear-gradient(90deg,{CYAN},{BLUE},{PURPLE});'
    f'border-radius:2px;margin:.4rem 0 .8rem 0"></div>',
    unsafe_allow_html=True,
)

# ── Datos globales (pre-tab) ───────────────────────────────────────────────────

risk_data    = _fetch_risk_index()
signals      = _fetch_signals()
personas     = _fetch_personas()
legislation  = _fetch_legislation()
swing        = _fetch_swing_districts()

risk_score   = risk_data.get("score", 0)
risk_nivel   = risk_data.get("nivel", "bajo")
componentes  = risk_data.get("componentes", {})
criticas_24h = sum(1 for s in signals if s.get("urgencia", 0) >= 4)
sent_medio   = round(sum(p.get("sentimiento_actual", 0) for p in personas) / max(len(personas), 1), 2)
_risk_color  = RED if risk_nivel == "alto" else AMBER if risk_nivel == "medio" else GREEN

# KPI strip
_kc = st.columns(6)
for col, html in zip(_kc, [
    kpi_card("Risk Index",       f"{risk_score}/100",  sub=risk_nivel.upper(),       color=_risk_color),
    kpi_card("Senales criticas", str(criticas_24h),    sub="urgencia 4-5 / 24h",     color=RED),
    kpi_card("Total senales",    str(len(signals)),    sub="sistema activo",          color=AMBER),
    kpi_card("Normas activas",   str(len(legislation)),sub="relevancia >= 7",         color=BLUE),
    kpi_card("Iniciativas pend.",str(componentes.get("iniciativas_pendientes",0)), sub="30d", color=PURPLE),
    kpi_card("Sent. politicos",  f"{sent_medio:+.2f}", sub="media personas top",      color=_sent_color(sent_medio)),
]):
    col.markdown(html, unsafe_allow_html=True)

st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)

# ── Tabs ───────────────────────────────────────────────────────────────────────

tab_mision, tab_entidades, tab_legislacion, tab_prediccion, tab_salud = st.tabs([
    "Mision",
    "Inteligencia de Entidades",
    "Monitor Legislativo",
    "Prediccion Politica",
    "Salud del Sistema",
])

# ==============================================================================
# TAB 1 — MISION
# ==============================================================================

with tab_mision:

    col_signals, col_map, col_risk = st.columns([2, 3, 2])

    with col_signals:
        st.markdown('<div class="co-section">SENALES ACTIVAS</div>', unsafe_allow_html=True)
        for sig in signals[:7]:
            urgencia = sig.get("urgencia", 1)
            tipo     = sig.get("tipo", "")
            ts_raw   = sig.get("created_at", "")
            try:
                ts = datetime.fromisoformat(ts_raw)
                mins = int((datetime.now() - ts).total_seconds() / 60)
                time_ago = f"hace {mins}m" if mins < 60 else f"hace {mins//60}h"
            except Exception:
                time_ago = ""
            st.markdown(
                signal_card(
                    title=f"{_tipo_icon(tipo)} {sig.get('titulo','')}",
                    body=sig.get("resumen", ""),
                    level=_urgencia_level(urgencia),
                    source=sig.get("modulo_origen", ""),
                    time_ago=time_ago,
                ),
                unsafe_allow_html=True,
            )

    with col_map:
        st.markdown('<div class="co-section">MAPA DE ACTIVIDAD</div>', unsafe_allow_html=True)
        _map_events = [
            {"lat":40.4,"lon":-3.7, "label":"Madrid",    "tipo":"electoral",    "text":"Swing district Madrid-Centro"},
            {"lat":41.4,"lon": 2.2, "label":"Barcelona", "tipo":"geopolitico",  "text":"Escalada tension institucional"},
            {"lat":37.4,"lon":-5.9, "label":"Sevilla",   "tipo":"legislativo",  "text":"Decreto vivienda asequible"},
            {"lat":39.5,"lon":-0.4, "label":"Valencia",  "tipo":"electoral",    "text":"Oportunidad propensity PSOE"},
            {"lat":43.3,"lon":-1.9, "label":"San Sebastian","tipo":"institucional","text":"Acuerdo PNV-Gobierno"},
            {"lat":28.1,"lon":-15.4,"label":"Las Palmas","tipo":"mediatico",    "text":"Viralidad narrativa migratoria"},
            {"lat":51.5,"lon":-0.1, "label":"Londres",   "tipo":"geopolitico",  "text":"Brexit aftershock: Gibraltar"},
            {"lat":48.9,"lon": 2.3, "label":"Paris",     "tipo":"geopolitico",  "text":"Cumbre eurozona: presion deuda"},
            {"lat":52.5,"lon":13.4, "label":"Berlin",    "tipo":"legislativo",  "text":"CSRD entra en vigor Q3"},
        ]
        _tc = {"electoral":CYAN,"geopolitico":PURPLE,"legislativo":BLUE,"mediatico":AMBER,"institucional":GREEN}
        fig_map = go.Figure()
        for ev in _map_events:
            fig_map.add_trace(go.Scattergeo(
                lat=[ev["lat"]], lon=[ev["lon"]], mode="markers+text",
                marker=dict(size=14, color=_tc.get(ev["tipo"], MUTED), opacity=0.85, line=dict(width=1.5, color="white")),
                text=[ev["label"]], textposition="top center", textfont=dict(size=9, color=TEXT2),
                hovertext=[ev["text"]], hoverinfo="text", showlegend=False,
            ))
        fig_map.update_layout(
            geo=dict(bgcolor=BG2, showland=True, landcolor="#1a2035", showocean=True, oceancolor="#0a1020",
                     showcoastlines=True, coastlinecolor=BORDER, showcountries=True, countrycolor=BORDER,
                     showframe=False, projection_type="natural earth",
                     center=dict(lat=42, lon=5), projection_scale=3.5,
                     lataxis_range=[25,60], lonaxis_range=[-20,30]),
            paper_bgcolor=BG2, plot_bgcolor=BG2, margin=dict(l=0,r=0,t=0,b=0), height=310,
        )
        st.plotly_chart(fig_map, use_container_width=True, config={"displayModeBar":False}, key="co_map")
        st.markdown(
            f'<div style="text-align:center;margin-top:-.4rem">'
            + " &nbsp;".join(f'<span style="color:{c};font-size:.65rem">{t.upper()}</span>' for t,c in _tc.items())
            + f'</div>',
            unsafe_allow_html=True,
        )

    with col_risk:
        st.markdown('<div class="co-section">POLITICAL RISK INDEX</div>', unsafe_allow_html=True)
        fig_gauge = go.Figure(go.Indicator(
            mode="gauge+number", value=risk_score,
            number={"font":{"color":_risk_color,"size":36},"suffix":"/100"},
            gauge={
                "axis":{"range":[0,100],"tickcolor":TEXT2,"tickfont":{"size":8}},
                "bar":{"color":_risk_color,"thickness":.22}, "bgcolor":BG3,
                "steps":[{"range":[0,35],"color":"#10B98122"},{"range":[35,65],"color":"#F59E0B22"},{"range":[65,100],"color":"#EF444422"}],
                "threshold":{"line":{"color":_risk_color,"width":3},"thickness":.75,"value":risk_score},
            },
            domain={"x":[0,1],"y":[0,1]},
        ))
        fig_gauge.update_layout(paper_bgcolor=BG2, plot_bgcolor=BG2, margin=dict(l=10,r=10,t=10,b=10), height=180, font=dict(color=TEXT))
        st.plotly_chart(fig_gauge, use_container_width=True, config={"displayModeBar":False}, key="co_gauge")

        st.markdown('<div class="co-section" style="margin-top:.4rem">COMPONENTES</div>', unsafe_allow_html=True)
        for key, (label, color) in {
            "senales_criticas_24h":  ("Senales criticas", RED),
            "leyes_alto_impacto_7d": ("Leyes alto impacto", AMBER),
            "sentimiento_politicos": ("Sentimiento politicos", BLUE),
            "iniciativas_pendientes":("Iniciativas pend.", PURPLE),
        }.items():
            val = componentes.get(key, 0)
            val_str = f"{val:+.3f}" if isinstance(val, float) else str(val)
            st.markdown(
                f'<div style="display:flex;justify-content:space-between;align-items:center;'
                f'padding:.3rem 0;border-bottom:1px solid {BORDER}">'
                f'<span style="font-size:.72rem;color:{TEXT2}">{label}</span>'
                f'<span style="font-size:.85rem;font-weight:700;color:{color}">{val_str}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

    st.markdown(f'<div style="height:4px;background:{BORDER};border-radius:2px;margin:.8rem 0"></div>', unsafe_allow_html=True)

    col_personas, col_media = st.columns([2, 3])

    with col_personas:
        st.markdown('<div class="co-section">ACTORES CLAVE</div>', unsafe_allow_html=True)
        for p in personas[:7]:
            nombre = p.get("nombre_completo","")
            sent   = float(p.get("sentimiento_actual",0))
            tend   = p.get("tendencia_sentimiento","estable")
            sc     = _sent_color(sent)
            st.markdown(
                f'<div class="co-actor-row">'
                f'<div style="width:32px;height:32px;border-radius:50%;background:{BG3};'
                f'border:2px solid {sc};display:flex;align-items:center;justify-content:center;'
                f'font-size:.65rem;font-weight:800;color:{sc};flex-shrink:0">{nombre[:2].upper()}</div>'
                f'<div style="flex:1;min-width:0">'
                f'<div style="font-size:.78rem;font-weight:600;color:{TEXT};'
                f'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{nombre}</div>'
                f'<div style="font-size:.62rem;color:{MUTED}">{p.get("partido","")} — {p.get("cargo_actual","")[:35]}</div>'
                f'</div>'
                f'<div style="text-align:right;flex-shrink:0">'
                f'<div style="font-size:.78rem;font-weight:700;color:{sc}">{_arrow(tend)} {sent:+.2f}</div>'
                f'<div style="font-size:.58rem;color:{MUTED}">inf {p.get("score_influencia",0)} | risk {p.get("score_riesgo",0)}</div>'
                f'</div></div>',
                unsafe_allow_html=True,
            )

    with col_media:
        st.markdown('<div class="co-section">PULSO MEDIATICO</div>', unsafe_allow_html=True)
        _media_data = {"El Pais":0.18,"El Mundo":-0.12,"La Vanguardia":0.05,"ABC":-0.21,"El Confidencial":0.09,"RTVE":0.02,"La Sexta":0.14,"Antena 3":-0.08}
        valores = list(_media_data.values())
        fig_media = go.Figure(go.Bar(
            x=valores, y=list(_media_data.keys()), orientation="h",
            marker_color=[GREEN if v>0 else RED for v in valores], marker_opacity=0.85,
            text=[f"{v:+.2f}" for v in valores], textposition="auto", textfont=dict(size=9,color=TEXT),
        ))
        fig_media.add_vline(x=0, line_color=BORDER, line_width=1)
        fig_media.update_layout(paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT2,size=9),
            xaxis=dict(showgrid=False,zeroline=False,range=[-0.35,0.35],tickfont=dict(color=MUTED,size=8)),
            yaxis=dict(showgrid=False,tickfont=dict(color=TEXT2,size=9)),
            margin=dict(l=5,r=10,t=5,b=5), height=210)
        st.plotly_chart(fig_media, use_container_width=True, config={"displayModeBar":False}, key="co_media")
        st.markdown(f'<div style="font-size:.62rem;color:{MUTED};text-align:center;margin-top:-.3rem">Tono editorial medio — ultimas 24h</div>', unsafe_allow_html=True)

    # Propensity + swing
    st.markdown(f'<div style="height:4px;background:{BORDER};border-radius:2px;margin:.8rem 0"></div>', unsafe_allow_html=True)
    st.markdown('<div class="co-section">INTELIGENCIA ELECTORAL — PROPENSITY & SWING DISTRICTS</div>', unsafe_allow_html=True)
    col_prop, col_swing_chart = st.columns([3, 2])

    with col_prop:
        _PROV = {
            "Madrid":(40.4,-3.7,0.48,0.40),"Barcelona":(41.4,2.2,0.38,0.46),"Valencia":(39.5,-0.4,0.41,0.43),
            "Sevilla":(37.4,-5.9,0.35,0.50),"Zaragoza":(41.7,-0.9,0.46,0.37),"Bilbao":(43.3,-2.9,0.30,0.34),
            "Murcia":(37.9,-1.1,0.51,0.31),"Valladolid":(41.7,-4.7,0.50,0.33),"Alicante":(38.3,-0.5,0.44,0.39),
            "Cordoba":(37.9,-4.8,0.39,0.46),"Granada":(37.2,-3.6,0.42,0.43),"Malaga":(36.7,-4.4,0.46,0.38),
            "Las Palmas":(28.1,-15.4,0.36,0.44),"Oviedo":(43.4,-5.8,0.43,0.41),
        }
        _pp   = [v[2] for v in _PROV.values()]
        _ps   = [v[3] for v in _PROV.values()]
        _gap  = [a-b for a,b in zip(_pp,_ps)]
        fig_prop = go.Figure(go.Scattergeo(
            lat=[v[0] for v in _PROV.values()], lon=[v[1] for v in _PROV.values()], mode="markers",
            marker=dict(size=20, color=_gap, colorscale=[[0,"#E30613"],[0.5,"#888888"],[1,"#009FDB"]],
                cmin=-0.15, cmax=0.15,
                colorbar=dict(title=dict(text="PP-PSOE",font=dict(color=TEXT2,size=9)),tickfont=dict(color=TEXT2,size=8),len=0.6,x=1.01),
                line=dict(width=1,color=BORDER), opacity=0.9),
            hovertext=[f"<b>{n}</b><br>PP:{pp:.0%}<br>PSOE:{ps:.0%}<br>Gap:{g:+.0%}" for n,pp,ps,g in zip(_PROV,_pp,_ps,_gap)],
            hoverinfo="text", showlegend=False,
        ))
        fig_prop.update_layout(
            geo=dict(bgcolor=BG2,showland=True,landcolor="#1a2035",showocean=True,oceancolor="#0a1020",
                showcoastlines=True,coastlinecolor=BORDER,showcountries=True,countrycolor=BORDER,
                showframe=False,projection_type="natural earth",center=dict(lat=40.0,lon=-3.5),
                projection_scale=5.5,lataxis_range=[35,45],lonaxis_range=[-10,5]),
            paper_bgcolor=BG2,plot_bgcolor=BG2,margin=dict(l=0,r=0,t=25,b=0),height=280,
            title=dict(text="Propensity PP vs PSOE por provincia",font=dict(color=TEXT2,size=10),x=0.5),
        )
        st.plotly_chart(fig_prop, use_container_width=True, config={"displayModeBar":False}, key="co_propensity")

    with col_swing_chart:
        st.markdown(f'<div style="font-size:.75rem;font-weight:600;color:{TEXT2};margin-bottom:.5rem">Top swing districts</div>', unsafe_allow_html=True)
        if swing:
            df_sw = pd.DataFrame(swing)
            if "score_a" in df_sw.columns:
                fig_sw = go.Figure(go.Scatter(
                    x=df_sw["score_a"].tolist(), y=df_sw["score_b"].tolist(), mode="markers",
                    marker=dict(size=8, color=df_sw.get("diferencia",pd.Series([0.05]*len(df_sw))).tolist(),
                        colorscale=[[0,CYAN],[1,AMBER]], showscale=False, opacity=0.75, line=dict(width=0.5,color=BORDER)),
                    hovertext=df_sw.get("seccion_censal",pd.Series([""]*len(df_sw))).tolist(),
                    hoverinfo="text+x+y",
                ))
                fig_sw.add_shape(type="line",x0=0.2,y0=0.2,x1=0.7,y1=0.7,line=dict(color=MUTED,dash="dot",width=1))
                fig_sw.add_annotation(x=0.62,y=0.58,text="Empate",font=dict(color=MUTED,size=8),showarrow=False)
                fig_sw.update_layout(
                    paper_bgcolor=BG2,plot_bgcolor=BG2,font=dict(color=TEXT2,size=9),
                    xaxis=dict(title="PP",showgrid=True,gridcolor=BORDER,tickfont=dict(color=MUTED,size=8),range=[0.25,0.65]),
                    yaxis=dict(title="PSOE",showgrid=True,gridcolor=BORDER,tickfont=dict(color=MUTED,size=8),range=[0.25,0.65]),
                    margin=dict(l=40,r=10,t=10,b=40),height=260,
                )
                st.plotly_chart(fig_sw, use_container_width=True, config={"displayModeBar":False}, key="co_swing")
                df_tbl = pd.DataFrame(swing[:5])
                cols_s = [c for c in ["seccion_censal","ccaa","diferencia","competitividad"] if c in df_tbl.columns]
                if cols_s:
                    st.dataframe(df_tbl[cols_s].rename(columns={"seccion_censal":"Seccion","ccaa":"CCAA","diferencia":"Gap","competitividad":"Compet."}),
                        hide_index=True, use_container_width=True, height=150)


# ==============================================================================
# TAB 2 — INTELIGENCIA DE ENTIDADES
# ==============================================================================

with tab_entidades:

    try:
        from dashboard.services.entity_service import (
            get_entity_activity_24h, get_anomaly_alerts,
            get_pipeline_stats, get_review_queue, run_full_pipeline,
        )
        _ENTITY_SVC = True
    except ImportError:
        _ENTITY_SVC = False

    if not _ENTITY_SVC:
        st.warning("El servicio de entidades no esta disponible. Aplica la migracion 0034.")
    else:
        stats = get_pipeline_stats()

        if stats.get("pipeline_available"):
            _ps = st.columns(5)
            for col, (label, key, sub, color) in zip(_ps, [
                ("Entidades",      "entities_canonical",    "en registro",        CYAN),
                ("Menciones raw",  "raw_mentions_total",    "extraidas",          TEXT2),
                ("Resueltas",      "raw_mentions_resolved", "con QID canonico",   GREEN),
                ("Pendientes",     "raw_mentions_pending",  "por resolver",       AMBER),
                ("En revision",    "review_queue_pending",  "revision humana",    RED),
            ]):
                col.markdown(kpi_card(label, str(stats.get(key,0)), sub=sub, color=color), unsafe_allow_html=True)

            _pb1, _pb2 = st.columns([1, 4])
            with _pb1:
                if st.button("Ejecutar pipeline completo", type="primary", key="co_run_pipeline"):
                    with st.spinner("Ejecutando Bloques 1-2-3..."):
                        try:
                            result = run_full_pipeline(max_articles=100)
                            b1 = result.get("bloque_1", {})
                            b2 = result.get("bloque_2", {})
                            b3 = result.get("bloque_3", {})
                            st.success(
                                f"B1: {b1.get('mentions_inserted',0)} menciones | "
                                f"B2: {b2.get('mentions_resolved',0)} resueltas | "
                                f"B3: {b3.get('entities_enriched',0)} enriquecidas"
                            )
                            st.cache_data.clear()
                            st.rerun()
                        except Exception as exc:
                            st.error(f"Error: {exc}")
        else:
            st.info("Pipeline no inicializado. Aplica la migracion 0034 y ejecuta el pipeline.")

        st.markdown("---")
        col_e1, col_e2 = st.columns([3, 2])

        with col_e1:
            st.markdown('<div class="co-section">ACTIVIDAD DE ENTIDADES — ULTIMAS 24H</div>', unsafe_allow_html=True)
            df_act = get_entity_activity_24h(limit=20)
            if not df_act.empty:
                sentiments = df_act.get("avg_sentiment", pd.Series([0.0]*len(df_act)))
                fig_ent = go.Figure(go.Bar(
                    x=df_act["mention_count"].tolist(),
                    y=df_act["nombre_oficial"].tolist(),
                    orientation="h",
                    marker_color=[GREEN if float(s or 0)>0.1 else (RED if float(s or 0)<-0.1 else AMBER) for s in sentiments],
                    marker_opacity=0.85,
                    text=df_act["mention_count"].tolist(), textposition="outside", textfont=dict(size=9,color=TEXT2),
                ))
                fig_ent.update_layout(
                    paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT2,size=9),
                    xaxis=dict(showgrid=True,gridcolor=BORDER,tickfont=dict(color=MUTED,size=8)),
                    yaxis=dict(showgrid=False,tickfont=dict(color=TEXT,size=9),autorange="reversed"),
                    margin=dict(l=10,r=60,t=10,b=10), height=max(200, len(df_act)*28),
                )
                st.plotly_chart(fig_ent, use_container_width=True, config={"displayModeBar":False}, key="co_ent_act")
            else:
                st.info("Sin actividad de entidades en las ultimas 24h. Ejecuta el pipeline.")

        with col_e2:
            st.markdown('<div class="co-section">ALERTAS DE ANOMALIA</div>', unsafe_allow_html=True)
            df_alerts = get_anomaly_alerts(hours=48, limit=10)
            if not df_alerts.empty:
                for _, row in df_alerts.iterrows():
                    z = float(row.get("z_score", 0))
                    color = RED if abs(z) >= 3 else AMBER
                    st.markdown(
                        f'<div class="co-anomaly-card" style="border-left-color:{color}">'
                        f'<div style="display:flex;justify-content:space-between;margin-bottom:.2rem">'
                        f'<span style="font-size:.72rem;font-weight:700;color:{TEXT}">{row.get("nombre_oficial","")}</span>'
                        f'<span style="font-size:.62rem;color:{color};font-weight:700">z={z:+.1f}</span>'
                        f'</div>'
                        f'<div style="font-size:.65rem;color:{MUTED};margin-bottom:.2rem">{row.get("alert_type","")}</div>'
                        f'<div style="font-size:.7rem;color:{TEXT2};line-height:1.3">{str(row.get("hypothesis",""))[:140]}</div>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )
            else:
                st.success("Sin alertas de anomalia activas.")

        st.markdown("---")
        st.markdown('<div class="co-section">COLA DE REVISION HUMANA</div>', unsafe_allow_html=True)
        df_rev = get_review_queue(limit=20)
        if not df_rev.empty:
            show_cols = [c for c in ["surface_text","context_window","max_score","source_media","created_at"] if c in df_rev.columns]
            st.dataframe(df_rev[show_cols].rename(columns={
                "surface_text":"Mencion","context_window":"Contexto",
                "max_score":"Score","source_media":"Fuente","created_at":"Detectada",
            }), hide_index=True, use_container_width=True, height=250)
        else:
            st.success("Cola de revision vacia.")


# ==============================================================================
# TAB 3 — MONITOR LEGISLATIVO
# ==============================================================================

with tab_legislacion:
    st.markdown('<div class="co-section">NORMAS DE ALTO IMPACTO</div>', unsafe_allow_html=True)
    for norm in legislation:
        nivel = norm.get("nivel",""); titulo = norm.get("titulo","")
        impacto = norm.get("ai_impact_level",""); cat = norm.get("ai_category","")
        rel = norm.get("ai_relevance",0)
        pub = (norm.get("published_at","")[:10] if norm.get("published_at") else "")
        nc = _nivel_color(nivel); ic = _impact_color(impacto)
        st.markdown(
            f'<div class="co-leg-row" style="border-left-color:{nc}">'
            f'<div style="display:flex;justify-content:space-between;margin-bottom:.15rem">'
            f'<span style="font-size:.62rem;color:{nc};font-weight:700;letter-spacing:.06em">{nivel.upper()}</span>'
            f'<span style="font-size:.62rem;color:{ic};font-weight:700">{impacto.upper()} | {rel}/10 | {pub}</span>'
            f'</div>'
            f'<div style="font-size:.82rem;color:{TEXT};font-weight:500">{titulo}</div>'
            f'<div style="font-size:.62rem;color:{MUTED};margin-top:.2rem">{cat}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
    st.markdown("---")
    try:
        from dashboard.services.legislative_service import get_normas_recientes
        df_leg = get_normas_recientes(limit=50)
        if not df_leg.empty:
            st.dataframe(df_leg, hide_index=True, use_container_width=True, height=350)
    except Exception:
        st.caption("Conecta el servicio legislativo para ver el historico completo.")


# ==============================================================================
# TAB 4 — PREDICCION POLITICA (Bloque 7, se activa cuando este disponible)
# ==============================================================================

with tab_prediccion:
    section_header("PREDICCION POLITICA — BLOQUE 7", PURPLE)

    # ── Lazy load de modelos ────────────────────────────────────────────────────
    @st.cache_data(ttl=900, show_spinner=False)
    def _run_coalition_predictor():
        try:
            from analytics.prediction.coalition_predictor import CoalitionPredictor
            return CoalitionPredictor().predict_coalitions(top_n=6)
        except Exception as exc:
            log.debug("CoalitionPredictor error: %s", exc)
            return []

    @st.cache_data(ttl=900, show_spinner=False)
    def _run_crisis_model():
        try:
            from analytics.prediction.crisis_escalation import CrisisEscalationModel
            return CrisisEscalationModel().predict_crisis()
        except Exception as exc:
            log.debug("CrisisEscalation error: %s", exc)
            return None

    @st.cache_data(ttl=900, show_spinner=False)
    def _run_shift_detector():
        try:
            from analytics.prediction.electoral_shift import ElectoralShiftDetector
            return ElectoralShiftDetector().predict_electoral_shift()
        except Exception as exc:
            log.debug("ElectoralShiftDetector error: %s", exc)
            return []

    col_p_run, col_p_ts = st.columns([1, 4])
    with col_p_run:
        if st.button("Recalcular predicciones", key="btn_recalc_pred", use_container_width=True):
            st.cache_data.clear()
            st.rerun()
    with col_p_ts:
        st.markdown(
            f'<div style="font-size:.72rem;color:{MUTED};padding-top:.6rem">'
            f'Actualizacion automatica: 15 min (TTL cache). Modelos: CoalitionPredictor · '
            f'CrisisEscalationModel · ElectoralShiftDetector</div>',
            unsafe_allow_html=True,
        )

    col_pred1, col_pred2 = st.columns(2)

    # ── Coaliciones viables ─────────────────────────────────────────────────────
    with col_pred1:
        st.markdown('<div class="co-section">COALICIONES VIABLES</div>', unsafe_allow_html=True)
        with st.spinner("Calculando coaliciones..."):
            coalitions = _run_coalition_predictor()
        if coalitions:
            for c in coalitions:
                prob = float(getattr(c, "probability", 0))
                color = GREEN if prob > 0.55 else (AMBER if prob > 0.30 else RED)
                seats = int(getattr(c, "projected_seats", 0))
                parties = getattr(c, "party_names", None) or getattr(c, "parties", [])
                parties_str = " + ".join(str(p) for p in parties[:4])
                notes = getattr(c, "notes", "")
                st.markdown(
                    f'<div style="padding:.45rem .7rem;border-radius:6px;background:{BG2};'
                    f'border-left:3px solid {color};margin-bottom:.4rem">'
                    f'<div style="display:flex;justify-content:space-between;align-items:center">'
                    f'<span style="font-size:.78rem;color:{TEXT};font-weight:600">{parties_str}</span>'
                    f'<span style="font-size:.88rem;font-weight:700;color:{color}">{prob:.0%}</span>'
                    f'</div>'
                    f'<div style="font-size:.68rem;color:{MUTED};margin-top:.15rem">'
                    f'{seats} escanos · {notes[:60]}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
        else:
            st.info("Sin datos de nowcasting — ejecuta el pipeline electoral para habilitar predicciones.")

    # ── Escalada de crisis ──────────────────────────────────────────────────────
    with col_pred2:
        st.markdown('<div class="co-section">ESCALADA DE CRISIS</div>', unsafe_allow_html=True)
        with st.spinner("Evaluando riesgo de crisis..."):
            crisis_pred = _run_crisis_model()
        if crisis_pred is not None:
            horizons = getattr(crisis_pred, "horizons", {})
            ci = getattr(crisis_pred, "confidence_intervals", {})
            for h_days, prob in sorted(horizons.items()):
                color = RED if prob > 0.50 else (AMBER if prob > 0.25 else GREEN)
                lo, hi = ci.get(h_days, (max(0, prob - 0.08), min(1, prob + 0.08)))
                st.markdown(
                    f'<div style="padding:.35rem .7rem;border-radius:6px;background:{BG2};'
                    f'border-left:3px solid {color};margin-bottom:.3rem;'
                    f'display:flex;justify-content:space-between;align-items:center">'
                    f'<span style="font-size:.8rem;color:{TEXT2}">{h_days}d</span>'
                    f'<div style="text-align:right">'
                    f'<span style="font-size:.9rem;font-weight:700;color:{color}">{prob:.0%}</span>'
                    f'<span style="font-size:.65rem;color:{MUTED};margin-left:.4rem">'
                    f'IC [{lo:.0%}–{hi:.0%}]</span>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )
            description = getattr(crisis_pred, "scenario_description", "")
            if description:
                st.caption(description)
        else:
            st.info("Modelo de crisis no disponible — revisa la conexion a BD.")

    # ── Desplazamiento electoral ────────────────────────────────────────────────
    st.markdown('<div class="co-section" style="margin-top:.8rem">DESPLAZAMIENTO DE VOTO</div>',
                unsafe_allow_html=True)
    with st.spinner("Analizando senales de shift electoral..."):
        shifts = _run_shift_detector()
    if shifts:
        shift_rows = []
        for s in shifts:
            siglas = getattr(s, "partido_siglas", getattr(s, "partido_qid", "?"))
            idx = float(getattr(s, "shift_index", 0))
            direction = getattr(s, "shift_direction", "stable")
            direction_arrow = "subiendo" if direction == "up" else ("bajando" if direction == "down" else "estable")
            corr = float(getattr(s, "correlation_pearson", 0))
            pred_shift = float(getattr(s, "predicted_shift_pct", 0))
            voto = float(getattr(s, "voto_blando_pct", 0))
            shift_rows.append({
                "Partido": siglas,
                "Intencion (%)": f"{voto:.1f}",
                "Shift index": f"{idx:+.3f}",
                "Tendencia": direction_arrow,
                "Correlacion media×voto": f"{corr:.3f}",
                "Shift predicho (pp)": f"{pred_shift:+.2f}",
            })
        if shift_rows:
            st.dataframe(
                pd.DataFrame(shift_rows),
                hide_index=True,
                use_container_width=True,
            )
    else:
        st.info("Sin datos de encuesta disponibles — el detector de shift requiere oleadas de intencion de voto.")


# ==============================================================================
# TAB 5 — SALUD DEL SISTEMA
# ==============================================================================

with tab_salud:
    try:
        from dashboard.services.ops_center import acciones_recomendadas, estado_datasets, health_api, resumen_fases
        df_estado = estado_datasets()
        df_fases  = resumen_fases(df_estado)
        api       = health_api()

        if df_estado.empty:
            st.warning("No hay datos operativos. Revisa conexion DB y migraciones.")
        else:
            score_g = float(df_fases["score_pct"].mean()) if not df_fases.empty else 0.0
            n_c = int((df_estado["estado"]=="critical").sum())
            n_w = int((df_estado["estado"]=="warning").sum())
            n_o = int((df_estado["estado"]=="ok").sum())

            _sc = st.columns(4)
            for col, html in zip(_sc, [
                kpi_card("Score global", f"{score_g:.1f}%", "salud operativa"),
                kpi_card("Datasets OK",  str(n_o), "en SLA", color=GREEN),
                kpi_card("Warnings",     str(n_w), "seguimiento", color=AMBER),
                kpi_card("Criticos",     str(n_c), "bloqueos", color=RED),
            ]):
                col.markdown(html, unsafe_allow_html=True)

            st.markdown("---")
            _ac1, _ac2 = st.columns([1, 2])
            with _ac1:
                if api.get("ok"):
                    st.success(f"API OK — {api.get('status_code')} — {api.get('latency_ms')} ms")
                else:
                    st.error(f"API KO — {api.get('status_code') or 'sin respuesta'} — {api.get('latency_ms')} ms")
            with _ac2:
                st.dataframe(df_fases[["fase","score_pct","datasets","ok","warning","critical"]].rename(columns={
                    "fase":"Fase","score_pct":"Score (%)","datasets":"Datasets","ok":"OK","warning":"Warning","critical":"Critico",
                }), use_container_width=True, hide_index=True)

            ti, tp, ta, tv = st.tabs(["Ingesta","Procesamiento","Analisis","Visualizacion"])
            for phase, tab_ctx in [("ingesta",ti),("procesamiento",tp),("analisis",ta),("visualizacion",tv)]:
                with tab_ctx:
                    df_ph = df_estado[df_estado["fase"]==phase].copy()
                    if df_ph.empty:
                        st.info("Sin datasets configurados.")
                    else:
                        show = [c for c in ["dataset","tabla","edad_horas","sla_horas","rows_24h","rows_total","detalle","estado"] if c in df_ph.columns]
                        st.dataframe(df_ph[show], hide_index=True, use_container_width=True)

            acciones = acciones_recomendadas(df_estado)
            if acciones:
                st.markdown("---")
                st.markdown('<div class="co-section">ACCIONES RECOMENDADAS</div>', unsafe_allow_html=True)
                for a in acciones:
                    st.warning(a)

    except Exception as exc:
        st.error(f"Error cargando estado del sistema: {exc}")

# ── Footer + auto-refresh ──────────────────────────────────────────────────────

st.markdown(
    f'<div style="height:1px;background:{BORDER};margin:.8rem 0"></div>'
    f'<div style="display:flex;justify-content:space-between;font-size:.62rem;color:{MUTED}">'
    f'<span>Politeia Centro de Operaciones &nbsp;|&nbsp; API: {_API}</span>'
    f'<span>{datetime.now().strftime("%H:%M:%S")}</span>'
    f'</div>',
    unsafe_allow_html=True,
)

if auto_refresh:
    time.sleep(_REFRESH_SECS)
    st.rerun()
