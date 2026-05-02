"""
COMMAND CENTER — Centro de inteligencia operacional estilo Palantir Gotham.

Vista unificada en tiempo real de todas las senales, riesgos, actores y
legislacion del sistema. Equivalente funcional al Palantir Mission Operations
y al NationBuilder People + Signals dashboard combinados.

Secciones:
  - Fila KPI: Risk Index + senales criticas + normas + sentimiento medio
  - Panel izquierdo: senales activas ordenadas por urgencia
  - Panel central: mapa geopolitico de eventos recientes
  - Panel derecho: Political Risk Index gauge + componentes
  - Fila inferior: tabla legislativa + top personas + pulso mediatico
  - Seccion electoral: mapa choropleth propensity + swing districts scatter
"""
from __future__ import annotations

import os
import sys
import time
import logging
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
    sidebar_nav,
    apply_plotly_theme,
    kpi_card,
    signal_card,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
)

log = logging.getLogger(__name__)

# ── Configuracion ─────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Command Center — ElectSim",
    page_icon="",
    layout="wide",
    initial_sidebar_state="collapsed",
)
sidebar_nav()

_API = os.getenv("ELECTSIM_API_URL", "http://localhost:8000").rstrip("/")
_REFRESH_SECS = int(os.getenv("COMMAND_CENTER_REFRESH_SECS", "30"))
_TIMEOUT = 6

# ── Estilos globales ──────────────────────────────────────────────────────────

st.markdown(
    f"""
    <style>
    [data-testid="stAppViewContainer"]  {{ background:{BG}; }}
    [data-testid="stHeader"]            {{ background:{BG}; }}
    [data-testid="stSidebar"]           {{ background:#060A12; }}
    section.main > div                  {{ padding-top:.5rem; }}
    div[data-testid="stMetric"]         {{ background:{BG2};border:1px solid {BORDER};
                                           border-radius:8px;padding:.6rem .8rem; }}
    div[data-testid="column"]           {{ gap:.5rem; }}
    .cc-section-title {{
        font-size:.6rem; font-weight:800; letter-spacing:.14em;
        text-transform:uppercase; color:{MUTED};
        border-bottom:1px solid {BORDER}; padding-bottom:.4rem;
        margin-bottom:.6rem;
    }}
    .cc-persona-row {{
        display:flex; align-items:center; gap:.6rem;
        padding:.45rem .5rem; border-radius:6px;
        border:1px solid {BORDER}; background:{BG2};
        margin-bottom:.35rem;
    }}
    .cc-leg-row {{
        padding:.4rem .6rem; border-radius:6px;
        border-left:3px solid {BLUE}; background:{BG2};
        margin-bottom:.3rem; font-size:.78rem; color:{TEXT};
    }}
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Helpers API ───────────────────────────────────────────────────────────────


def _get(path: str, params: dict | None = None) -> Any:
    """GET al API con timeout y manejo de errores."""
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
    # Demo
    return {
        "score": 42.5,
        "nivel": "medio",
        "componentes": {
            "senales_criticas_24h":   3,
            "leyes_alto_impacto_7d":  5,
            "sentimiento_politicos":  0.12,
            "iniciativas_pendientes": 18,
        },
        "timestamp": datetime.now().isoformat(),
    }


@st.cache_data(ttl=_REFRESH_SECS)
def _fetch_signals(urgencia_min: int = 1, limit: int = 30) -> list[dict]:
    data = _get("/intelligence/signals", {"urgencia_min": urgencia_min, "limit": limit})
    if data:
        return data
    # Demo
    return [
        {"id": "s1", "tipo": "mediatico",    "urgencia": 5, "titulo": "Pedro Sanchez: caida de sentimiento -0.38 en 24h",      "resumen": "38 articulos negativos detectados en prensa nacional.", "modulo_origen": "sentiment_tracker", "created_at": (datetime.now()-timedelta(hours=1)).isoformat()},
        {"id": "s2", "tipo": "legislativo",  "urgencia": 4, "titulo": "Ley de IA aprobada en primer lectura en el Congreso",   "resumen": "Impacto alto en sectores tecnologico y financiero.", "modulo_origen": "boe_ingestor", "created_at": (datetime.now()-timedelta(hours=3)).isoformat()},
        {"id": "s3", "tipo": "geopolitico",  "urgencia": 4, "titulo": "Escalada diplomatica Espana-Marruecos por Ceuta",      "resumen": "Nota de protesta presentada ante la Embajada.", "modulo_origen": "gdelt_ingestor", "created_at": (datetime.now()-timedelta(hours=5)).isoformat()},
        {"id": "s4", "tipo": "electoral",    "urgencia": 3, "titulo": "PSOE pierde 4pp en encuesta CIS flash",                "resumen": "Swing districts de Madrid y Valencia en riesgo.", "modulo_origen": "propensity_engine", "created_at": (datetime.now()-timedelta(hours=8)).isoformat()},
        {"id": "s5", "tipo": "mediatico",    "urgencia": 3, "titulo": "Tendencia viral #CrisisGobierno en X (Twitter)",       "resumen": "12.400 menciones en las ultimas 6h.", "modulo_origen": "social_monitor", "created_at": (datetime.now()-timedelta(hours=2)).isoformat()},
        {"id": "s6", "tipo": "legislativo",  "urgencia": 2, "titulo": "BOE: nueva resolucion sobre vivienda",                 "resumen": "Afecta a 47 municipios con presion inmobiliaria alta.", "modulo_origen": "boe_ingestor", "created_at": (datetime.now()-timedelta(hours=6)).isoformat()},
        {"id": "s7", "tipo": "institucional","urgencia": 2, "titulo": "Congreso: 3 enmiendas registradas Ley Presupuestos",   "resumen": "Enmiendas de PP, VOX y Junts.", "modulo_origen": "congreso_ingestor", "created_at": (datetime.now()-timedelta(hours=9)).isoformat()},
    ]


@st.cache_data(ttl=60)
def _fetch_personas(limit: int = 10) -> list[dict]:
    data = _get("/intelligence/personas", {"limit": limit, "order_by": "score_influencia"})
    if data:
        return data
    return [
        {"id": "p1", "nombre_completo": "Pedro Sanchez",     "partido": "PSOE", "cargo_actual": "Presidente del Gobierno", "score_influencia": 98, "score_riesgo": 62, "sentimiento_actual": -0.15, "tendencia_sentimiento": "bajando"},
        {"id": "p2", "nombre_completo": "Alberto Nunez Feijoo","partido": "PP",  "cargo_actual": "Lider de la oposicion",  "score_influencia": 91, "score_riesgo": 41, "sentimiento_actual":  0.08, "tendencia_sentimiento": "estable"},
        {"id": "p3", "nombre_completo": "Santiago Abascal",  "partido": "VOX",  "cargo_actual": "Presidente de VOX",       "score_influencia": 78, "score_riesgo": 55, "sentimiento_actual": -0.22, "tendencia_sentimiento": "bajando"},
        {"id": "p4", "nombre_completo": "Yolanda Diaz",      "partido": "SUMAR","cargo_actual": "Vicepresidenta 2a",       "score_influencia": 74, "score_riesgo": 34, "sentimiento_actual":  0.14, "tendencia_sentimiento": "subiendo"},
        {"id": "p5", "nombre_completo": "Teresa Ribera",     "partido": "PSOE", "cargo_actual": "Vicepresidenta 3a",       "score_influencia": 68, "score_riesgo": 28, "sentimiento_actual":  0.31, "tendencia_sentimiento": "subiendo"},
        {"id": "p6", "nombre_completo": "Carles Puigdemont", "partido": "JUNTS","cargo_actual": "Expresidente Cataluna",   "score_influencia": 65, "score_riesgo": 72, "sentimiento_actual": -0.41, "tendencia_sentimiento": "bajando"},
        {"id": "p7", "nombre_completo": "Andoni Ortuzar",    "partido": "PNV",  "cargo_actual": "Presidente PNV",          "score_influencia": 58, "score_riesgo": 19, "sentimiento_actual":  0.22, "tendencia_sentimiento": "estable"},
    ]


@st.cache_data(ttl=120)
def _fetch_legislation(limit: int = 8) -> list[dict]:
    data = _get("/intelligence/legislation/impact", {"limit": limit, "min_relevance": 7})
    if data:
        return data
    today = datetime.now()
    return [
        {"titulo": "Ley Organica de Inteligencia Artificial",       "nivel": "nacional", "ai_category": "tecnologia",   "ai_impact_level": "high",   "ai_relevance": 9, "published_at": (today-timedelta(days=2)).isoformat()},
        {"titulo": "Reglamento Europeo de Datos (EU Data Act)",     "nivel": "europeo",  "ai_category": "digital",      "ai_impact_level": "high",   "ai_relevance": 9, "published_at": (today-timedelta(days=5)).isoformat()},
        {"titulo": "Plan de Recuperacion: tramo 4 fondos NextGen",  "nivel": "nacional", "ai_category": "economia",     "ai_impact_level": "high",   "ai_relevance": 8, "published_at": (today-timedelta(days=1)).isoformat()},
        {"titulo": "Decreto vivienda asequible CCAA Cataluna",      "nivel": "regional", "ai_category": "vivienda",     "ai_impact_level": "medium", "ai_relevance": 8, "published_at": (today-timedelta(days=3)).isoformat()},
        {"titulo": "Directiva UE Gobernanza Corporativa (CSRD)",    "nivel": "europeo",  "ai_category": "sostenibilidad","ai_impact_level": "medium", "ai_relevance": 7, "published_at": (today-timedelta(days=7)).isoformat()},
        {"titulo": "Ley de Presupuestos Generales del Estado 2025", "nivel": "nacional", "ai_category": "economia",     "ai_impact_level": "high",   "ai_relevance": 10,"published_at": (today-timedelta(days=12)).isoformat()},
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
            "seccion_censal": f"{p[:3].upper()}{i:04d}",
            "provincia_cod": f"{i+1:02d}",
            "ccaa": "Andalucia" if p in ["Sevilla","Cordoba"] else "Cataluna" if p == "Barcelona" else "Madrid" if p == "Madrid" else "Otros",
            "score_a": round(0.35 + random.random()*0.15, 3),
            "score_b": round(0.33 + random.random()*0.15, 3),
            "diferencia": round(random.random()*0.08, 3),
            "competitividad": round(0.40 + random.random()*0.20, 3),
            "renta_media": random.randint(18000, 45000),
        }
        for i, p in enumerate(provincias * 2)
    ]


# ── Utilidades visuales ───────────────────────────────────────────────────────


def _urgencia_to_level(u: int) -> str:
    return {5: "critical", 4: "high", 3: "medium", 2: "low"}.get(u, "info")


def _tipo_to_icon(tipo: str) -> str:
    return {
        "mediatico":    "[M]",
        "legislativo":  "[L]",
        "geopolitico":  "[G]",
        "electoral":    "[E]",
        "institucional":"[I]",
    }.get(tipo, "[?]")


def _sent_color(v: float) -> str:
    if v > 0.1:
        return GREEN
    if v < -0.1:
        return RED
    return AMBER


def _tendencia_arrow(t: str) -> str:
    return {"subiendo": "&#9650;", "bajando": "&#9660;", "estable": "&#9679;"}.get(t, "")


def _nivel_color(nivel: str) -> str:
    return {"europeo": PURPLE, "nacional": BLUE, "regional": CYAN}.get(nivel, MUTED)


def _impact_color(impact: str) -> str:
    return {"high": RED, "medium": AMBER, "low": GREEN}.get(impact, MUTED)


# ── Layout ────────────────────────────────────────────────────────────────────

# Cabecera
_header_cols = st.columns([5, 1, 1])
with _header_cols[0]:
    st.markdown(
        f'<div style="font-size:1.35rem;font-weight:900;color:{CYAN};'
        f'letter-spacing:.04em;margin-bottom:.1rem">COMMAND CENTER</div>'
        f'<div style="font-size:.7rem;color:{MUTED}">Political Intelligence Platform — '
        f'{datetime.now().strftime("%A %d %b %Y %H:%M")}</div>',
        unsafe_allow_html=True,
    )
with _header_cols[1]:
    auto_refresh = st.toggle("Auto-refresh", value=True, key="cc_autorefresh")
with _header_cols[2]:
    if st.button("Actualizar", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

st.markdown(f'<div style="height:4px;background:linear-gradient(90deg,{CYAN},{BLUE},{PURPLE});border-radius:2px;margin:.4rem 0 .8rem 0"></div>', unsafe_allow_html=True)

# Datos
risk_data     = _fetch_risk_index()
signals       = _fetch_signals()
personas      = _fetch_personas()
legislation   = _fetch_legislation()
swing         = _fetch_swing_districts()

risk_score    = risk_data.get("score", 0)
risk_nivel    = risk_data.get("nivel", "bajo")
componentes   = risk_data.get("componentes", {})

criticas_24h  = sum(1 for s in signals if s.get("urgencia", 0) >= 4)
total_signals = len(signals)
sent_medio    = round(sum(p.get("sentimiento_actual", 0) for p in personas) / max(len(personas), 1), 2)

# ── Fila KPI ──────────────────────────────────────────────────────────────────

kpi_cols = st.columns(6)
_risk_color = RED if risk_nivel == "alto" else AMBER if risk_nivel == "medio" else GREEN
kpi_html = [
    kpi_card("Risk Index",        f"{risk_score}/100",   sub=risk_nivel.upper(),      color=_risk_color),
    kpi_card("Senales criticas",  str(criticas_24h),     sub="urgencia 4-5 / 24h",   color=RED),
    kpi_card("Total senales",     str(total_signals),    sub="sistema activo",         color=AMBER),
    kpi_card("Normas activas",    str(len(legislation)), sub="relevancia >= 7",        color=BLUE),
    kpi_card("Iniciativas pend.", str(componentes.get("iniciativas_pendientes", 0)), sub="30d", color=PURPLE),
    kpi_card("Sent. politicos",   f"{sent_medio:+.2f}", sub="media personas top",     color=_sent_color(sent_medio)),
]
for col, html in zip(kpi_cols, kpi_html):
    col.markdown(html, unsafe_allow_html=True)

st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)

# ── Fila principal: senales + mapa + risk gauge ───────────────────────────────

col_signals, col_map, col_risk = st.columns([2, 3, 2])

# Panel de senales
with col_signals:
    st.markdown('<div class="cc-section-title">SENALES ACTIVAS</div>', unsafe_allow_html=True)
    for sig in signals[:7]:
        urgencia = sig.get("urgencia", 1)
        tipo     = sig.get("tipo", "")
        titulo   = sig.get("titulo", "")
        resumen  = sig.get("resumen", "")
        origen   = sig.get("modulo_origen", "")
        ts_raw   = sig.get("created_at", "")
        try:
            ts = datetime.fromisoformat(ts_raw)
            mins_ago = int((datetime.now() - ts).total_seconds() / 60)
            time_ago = f"hace {mins_ago}m" if mins_ago < 60 else f"hace {mins_ago//60}h"
        except Exception:
            time_ago = ""
        st.markdown(
            signal_card(
                title    = f"{_tipo_to_icon(tipo)} {titulo}",
                body     = resumen,
                level    = _urgencia_to_level(urgencia),
                source   = origen,
                time_ago = time_ago,
            ),
            unsafe_allow_html=True,
        )

# Panel central — mapa eventos recientes
with col_map:
    st.markdown('<div class="cc-section-title">MAPA DE ACTIVIDAD</div>', unsafe_allow_html=True)

    _map_events = [
        {"lat": 40.4, "lon": -3.7,  "label": "Madrid",    "tipo": "electoral",    "text": "Swing district Madrid-Centro"},
        {"lat": 41.4, "lon":  2.2,  "label": "Barcelona", "tipo": "geopolitico",  "text": "Escalada tension institucional"},
        {"lat": 37.4, "lon": -5.9,  "label": "Sevilla",   "tipo": "legislativo",  "text": "Decreto vivienda asequible"},
        {"lat": 39.5, "lon": -0.4,  "label": "Valencia",  "tipo": "electoral",    "text": "Oportunidad propensity PSOE"},
        {"lat": 43.3, "lon": -1.9,  "label": "San Sebastian","tipo":"institucional","text": "Acuerdo PNV-Gobierno"},
        {"lat": 28.1, "lon":-15.4,  "label": "Las Palmas","tipo": "mediatico",    "text": "Viralidad narrativa migratoria"},
        {"lat": 51.5, "lon":  -0.1, "label": "Londres",   "tipo": "geopolitico",  "text": "Brexit aftershock: Gibraltar"},
        {"lat": 48.9, "lon":   2.3, "label": "Paris",     "tipo": "geopolitico",  "text": "Cumbre eurozona: presion deuda"},
        {"lat": 52.5, "lon":  13.4, "label": "Berlin",    "tipo": "legislativo",  "text": "CSRD entra en vigor Q3"},
    ]

    _tipo_colors = {
        "electoral": CYAN, "geopolitico": PURPLE, "legislativo": BLUE,
        "mediatico": AMBER, "institucional": GREEN,
    }

    fig_map = go.Figure()
    for ev in _map_events:
        color = _tipo_colors.get(ev["tipo"], MUTED)
        fig_map.add_trace(go.Scattergeo(
            lat=[ev["lat"]], lon=[ev["lon"]],
            mode="markers+text",
            marker=dict(size=14, color=color, opacity=0.85,
                        line=dict(width=1.5, color="white")),
            text=[ev["label"]],
            textposition="top center",
            textfont=dict(size=9, color=TEXT2),
            hovertext=[ev["text"]],
            hoverinfo="text",
            showlegend=False,
        ))

    fig_map.update_layout(
        geo=dict(
            bgcolor=BG2,
            showland=True, landcolor="#1a2035",
            showocean=True, oceancolor="#0a1020",
            showcoastlines=True, coastlinecolor=BORDER,
            showcountries=True, countrycolor=BORDER,
            showframe=False,
            projection_type="natural earth",
            center=dict(lat=42, lon=5),
            projection_scale=3.5,
            lataxis_range=[25, 60],
            lonaxis_range=[-20, 30],
        ),
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        margin=dict(l=0, r=0, t=0, b=0),
        height=310,
    )
    st.plotly_chart(fig_map, use_container_width=True, config={"displayModeBar": False}, key="cc_map")

    # Leyenda mapa
    legend_html = " &nbsp;".join(
        f'<span style="color:{c};font-size:.65rem">{t.upper()}</span>'
        for t, c in _tipo_colors.items()
    )
    st.markdown(f'<div style="text-align:center;margin-top:-.4rem">{legend_html}</div>', unsafe_allow_html=True)

# Panel Risk Index
with col_risk:
    st.markdown('<div class="cc-section-title">POLITICAL RISK INDEX</div>', unsafe_allow_html=True)

    fig_gauge = go.Figure(go.Indicator(
        mode="gauge+number",
        value=risk_score,
        number={"font": {"color": _risk_color, "size": 36}, "suffix": "/100"},
        gauge={
            "axis": {"range": [0, 100], "tickcolor": TEXT2, "tickfont": {"size": 8}},
            "bar":  {"color": _risk_color, "thickness": .22},
            "bgcolor": BG3,
            "steps": [
                {"range": [0, 35],  "color": "#10B98122"},
                {"range": [35, 65], "color": "#F59E0B22"},
                {"range": [65, 100],"color": "#EF444422"},
            ],
            "threshold": {
                "line": {"color": _risk_color, "width": 3},
                "thickness": .75,
                "value": risk_score,
            },
        },
        domain={"x": [0, 1], "y": [0, 1]},
    ))
    fig_gauge.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        margin=dict(l=10, r=10, t=10, b=10),
        height=180,
        font=dict(color=TEXT),
    )
    st.plotly_chart(fig_gauge, use_container_width=True, config={"displayModeBar": False}, key="cc_gauge")

    st.markdown('<div class="cc-section-title" style="margin-top:.4rem">COMPONENTES</div>', unsafe_allow_html=True)
    comp_labels = {
        "senales_criticas_24h":   ("Senales criticas", RED),
        "leyes_alto_impacto_7d":  ("Leyes alto impacto", AMBER),
        "sentimiento_politicos":  ("Sentimiento politicos", BLUE),
        "iniciativas_pendientes": ("Iniciativas pendientes", PURPLE),
    }
    for key, (label, color) in comp_labels.items():
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

st.markdown(f'<div style="height:4px;background:linear-gradient(90deg,{BORDER},{BORDER});border-radius:2px;margin:.8rem 0"></div>', unsafe_allow_html=True)

# ── Fila inferior: legislacion + personas + pulso mediatico ───────────────────

col_leg, col_personas, col_media = st.columns([3, 2, 2])

with col_leg:
    st.markdown('<div class="cc-section-title">MONITOR LEGISLATIVO</div>', unsafe_allow_html=True)
    for norm in legislation:
        nivel   = norm.get("nivel", "")
        titulo  = norm.get("titulo", "")
        impacto = norm.get("ai_impact_level", "")
        cat     = norm.get("ai_category", "")
        rel     = norm.get("ai_relevance", 0)
        nc      = _nivel_color(nivel)
        ic      = _impact_color(impacto)
        st.markdown(
            f'<div class="cc-leg-row" style="border-left-color:{nc}">'
            f'<div style="display:flex;justify-content:space-between;margin-bottom:.15rem">'
            f'<span style="font-size:.62rem;color:{nc};font-weight:700;letter-spacing:.06em">'
            f'{nivel.upper()}</span>'
            f'<span style="font-size:.62rem;color:{ic};font-weight:700">'
            f'{impacto.upper()} &nbsp;|&nbsp; {rel}/10</span>'
            f'</div>'
            f'<div style="font-size:.78rem;color:{TEXT};line-height:1.3">{titulo}</div>'
            f'<div style="font-size:.62rem;color:{MUTED};margin-top:.2rem">{cat}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

with col_personas:
    st.markdown('<div class="cc-section-title">ACTORES CLAVE</div>', unsafe_allow_html=True)
    for p in personas[:7]:
        nombre  = p.get("nombre_completo", "")
        partido = p.get("partido", "")
        sent    = float(p.get("sentimiento_actual", 0))
        tend    = p.get("tendencia_sentimiento", "estable")
        inf_sc  = int(p.get("score_influencia", 0))
        riesgo  = int(p.get("score_riesgo", 0))
        sc      = _sent_color(sent)
        arrow   = _tendencia_arrow(tend)
        st.markdown(
            f'<div class="cc-persona-row">'
            f'<div style="width:32px;height:32px;border-radius:50%;background:{BG3};'
            f'border:2px solid {sc};display:flex;align-items:center;justify-content:center;'
            f'font-size:.65rem;font-weight:800;color:{sc};flex-shrink:0">'
            f'{nombre[:2].upper()}</div>'
            f'<div style="flex:1;min-width:0">'
            f'<div style="font-size:.78rem;font-weight:600;color:{TEXT};'
            f'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{nombre}</div>'
            f'<div style="font-size:.62rem;color:{MUTED}">{partido}</div>'
            f'</div>'
            f'<div style="text-align:right;flex-shrink:0">'
            f'<div style="font-size:.78rem;font-weight:700;color:{sc}">'
            f'{arrow} {sent:+.2f}</div>'
            f'<div style="font-size:.58rem;color:{MUTED}">inf {inf_sc} | risk {riesgo}</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

with col_media:
    st.markdown('<div class="cc-section-title">PULSO MEDIATICO</div>', unsafe_allow_html=True)

    # Bar chart horizontal de sentimiento
    _media_data = {
        "El Pais":   0.18, "El Mundo": -0.12, "La Vanguardia": 0.05,
        "ABC":      -0.21, "El Confidencial": 0.09, "RTVE": 0.02,
        "La Sexta":  0.14, "Antena 3": -0.08,
    }
    medios  = list(_media_data.keys())
    valores = list(_media_data.values())
    colors  = [GREEN if v > 0 else RED for v in valores]

    fig_media = go.Figure(go.Bar(
        x=valores, y=medios,
        orientation="h",
        marker_color=colors,
        marker_opacity=0.85,
        text=[f"{v:+.2f}" for v in valores],
        textposition="auto",
        textfont=dict(size=9, color=TEXT),
    ))
    fig_media.add_vline(x=0, line_color=BORDER, line_width=1)
    fig_media.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        font=dict(color=TEXT2, size=9),
        xaxis=dict(showgrid=False, zeroline=False, range=[-0.35, 0.35],
                   tickfont=dict(color=MUTED, size=8)),
        yaxis=dict(showgrid=False, tickfont=dict(color=TEXT2, size=9)),
        margin=dict(l=5, r=10, t=5, b=5),
        height=210,
    )
    st.plotly_chart(fig_media, use_container_width=True, config={"displayModeBar": False}, key="cc_media")

    st.markdown(
        f'<div style="font-size:.62rem;color:{MUTED};text-align:center;margin-top:-.3rem">'
        f'Tono editorial medio — ultimas 24h</div>',
        unsafe_allow_html=True,
    )

# ── Seccion electoral: propensity + swing districts ──────────────────────────

st.markdown(
    f'<div style="height:4px;background:linear-gradient(90deg,{BORDER},{BORDER});border-radius:2px;margin:.8rem 0"></div>',
    unsafe_allow_html=True,
)
st.markdown('<div class="cc-section-title">INTELIGENCIA ELECTORAL — PROPENSITY & SWING DISTRICTS</div>', unsafe_allow_html=True)

col_prop, col_swing = st.columns([3, 2])

with col_prop:
    # Choropleth simulado por provincia (mapa de calor electoral)
    _PROVINCIAS = {
        "Madrid": (40.4, -3.7, 0.48, 0.40), "Barcelona": (41.4, 2.2, 0.38, 0.46),
        "Valencia": (39.5, -0.4, 0.41, 0.43), "Sevilla": (37.4, -5.9, 0.35, 0.50),
        "Zaragoza": (41.7, -0.9, 0.46, 0.37), "Bilbao": (43.3, -2.9, 0.30, 0.34),
        "Murcia": (37.9, -1.1, 0.51, 0.31), "Valladolid": (41.7, -4.7, 0.50, 0.33),
        "Alicante": (38.3, -0.5, 0.44, 0.39), "Cordoba": (37.9, -4.8, 0.39, 0.46),
        "Granada": (37.2, -3.6, 0.42, 0.43), "Malaga": (36.7, -4.4, 0.46, 0.38),
        "Las Palmas": (28.1, -15.4, 0.36, 0.44), "Oviedo": (43.4, -5.8, 0.43, 0.41),
        "Santander": (43.5, -3.8, 0.47, 0.38), "Logrono": (42.5, -2.4, 0.48, 0.37),
        "Pamplona": (42.8, -1.6, 0.38, 0.35), "Vitoria": (42.8, -2.7, 0.29, 0.32),
    }
    prov_names   = list(_PROVINCIAS.keys())
    prov_lats    = [v[0] for v in _PROVINCIAS.values()]
    prov_lons    = [v[1] for v in _PROVINCIAS.values()]
    prov_pp      = [v[2] for v in _PROVINCIAS.values()]
    prov_psoe    = [v[3] for v in _PROVINCIAS.values()]
    prov_gap     = [pp - ps for pp, ps in zip(prov_pp, prov_psoe)]
    prov_hover   = [
        f"<b>{n}</b><br>PP: {pp:.0%}<br>PSOE: {ps:.0%}<br>Gap: {g:+.0%}"
        for n, pp, ps, g in zip(prov_names, prov_pp, prov_psoe, prov_gap)
    ]

    fig_prop = go.Figure(go.Scattergeo(
        lat=prov_lats, lon=prov_lons,
        mode="markers",
        marker=dict(
            size=20,
            color=prov_gap,
            colorscale=[[0, "#E30613"], [0.5, "#888888"], [1, "#009FDB"]],
            cmin=-0.15, cmax=0.15,
            colorbar=dict(
                title=dict(text="PP - PSOE", font=dict(color=TEXT2, size=9)),
                tickfont=dict(color=TEXT2, size=8),
                len=0.6, x=1.01,
            ),
            line=dict(width=1, color=BORDER),
            opacity=0.9,
        ),
        hovertext=prov_hover,
        hoverinfo="text",
        showlegend=False,
    ))
    fig_prop.update_layout(
        geo=dict(
            bgcolor=BG2,
            showland=True, landcolor="#1a2035",
            showocean=True, oceancolor="#0a1020",
            showcoastlines=True, coastlinecolor=BORDER,
            showcountries=True, countrycolor=BORDER,
            showframe=False,
            projection_type="natural earth",
            center=dict(lat=40.0, lon=-3.5),
            projection_scale=5.5,
            lataxis_range=[35, 45],
            lonaxis_range=[-10, 5],
        ),
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        margin=dict(l=0, r=0, t=25, b=0),
        height=280,
        title=dict(
            text="Propensity PP vs PSOE por provincia",
            font=dict(color=TEXT2, size=10),
            x=0.5,
        ),
    )
    st.plotly_chart(fig_prop, use_container_width=True, config={"displayModeBar": False}, key="cc_propensity")

with col_swing:
    st.markdown(
        f'<div style="font-size:.75rem;font-weight:600;color:{TEXT2};margin-bottom:.5rem">'
        f'Top swing districts (PP vs PSOE)</div>',
        unsafe_allow_html=True,
    )

    if swing:
        df_swing = pd.DataFrame(swing)
        if "score_a" in df_swing.columns and "score_b" in df_swing.columns:
            fig_swing = go.Figure(go.Scatter(
                x=df_swing["score_a"].tolist(),
                y=df_swing["score_b"].tolist(),
                mode="markers",
                marker=dict(
                    size=8,
                    color=df_swing.get("diferencia", pd.Series([0.05]*len(df_swing))).tolist(),
                    colorscale=[[0, CYAN], [1, AMBER]],
                    showscale=False,
                    opacity=0.75,
                    line=dict(width=0.5, color=BORDER),
                ),
                hovertext=df_swing.get("seccion_censal", pd.Series([""]*len(df_swing))).tolist(),
                hoverinfo="text+x+y",
            ))
            # Linea diagonal (empate)
            fig_swing.add_shape(
                type="line", x0=0.2, y0=0.2, x1=0.7, y1=0.7,
                line=dict(color=MUTED, dash="dot", width=1),
            )
            fig_swing.add_annotation(
                x=0.62, y=0.58, text="Empate",
                font=dict(color=MUTED, size=8), showarrow=False,
            )
            fig_swing.update_layout(
                paper_bgcolor=BG2, plot_bgcolor=BG2,
                font=dict(color=TEXT2, size=9),
                xaxis=dict(title="PP", showgrid=True, gridcolor=BORDER,
                           tickfont=dict(color=MUTED, size=8), range=[0.25, 0.65]),
                yaxis=dict(title="PSOE", showgrid=True, gridcolor=BORDER,
                           tickfont=dict(color=MUTED, size=8), range=[0.25, 0.65]),
                margin=dict(l=40, r=10, t=10, b=40),
                height=280,
            )
            st.plotly_chart(fig_swing, use_container_width=True, config={"displayModeBar": False}, key="cc_swing")
        else:
            st.info("Sin datos de swing districts disponibles")
    else:
        st.info("Modelos de propensity no entrenados")

    # Tabla resumen swing
    if swing:
        df_tbl = pd.DataFrame(swing[:5])
        cols_show = [c for c in ["seccion_censal", "ccaa", "diferencia", "competitividad"] if c in df_tbl.columns]
        if cols_show:
            st.dataframe(
                df_tbl[cols_show].rename(columns={
                    "seccion_censal": "Seccion",
                    "ccaa": "CCAA",
                    "diferencia": "Gap",
                    "competitividad": "Compet.",
                }),
                hide_index=True,
                use_container_width=True,
                height=160,
            )

# ── Footer + auto-refresh ─────────────────────────────────────────────────────

st.markdown(
    f'<div style="height:1px;background:{BORDER};margin:.8rem 0"></div>'
    f'<div style="display:flex;justify-content:space-between;font-size:.62rem;color:{MUTED}">'
    f'<span>ElectSim Command Center &nbsp;|&nbsp; API: {_API}</span>'
    f'<span>Refresh cada {_REFRESH_SECS}s &nbsp;|&nbsp; '
    f'{datetime.now().strftime("%H:%M:%S")}</span>'
    f'</div>',
    unsafe_allow_html=True,
)

if auto_refresh:
    time.sleep(_REFRESH_SECS)
    st.rerun()
