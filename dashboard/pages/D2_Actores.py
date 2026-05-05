"""
ELECTSIM — Mapa de Actores (v3 — Intel Premium)
=================================================
Red de actores políticos, empresariales, mediáticos y de influencia.
Grafo force-directed (pyvis) con datos reales de actors_service,
métricas networkx, scraping Wikipedia/Wikidata, NER via Ollama,
y pipeline de actualización automática en background.

Nuevas features v3:
  • DOSSIER EJECUTIVO — ficha 360° con KPIs, bio, noticias, red ego, IA
  • RED DE INFLUENCIA — grafo Plotly interactivo con alianzas/rivales
  • COMPARATIVA — radar + timeline + head-to-head hasta 4 actores

Inspirado en:
  • Osintgraph (Neo4j + LLM OSINT agent)
  • NER-for-News-Headlines (NER en titulares)
  • news-briefing-generator (clustering + Ollama)
  • congreso-scrapper (modelo de datos parlamentarios)
"""
from __future__ import annotations

import json
import math
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina, aplicar_estilos,
    intel_header, apply_plotly_theme, news_card, hex_to_rgba,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card, COLORES_PARTIDOS,
)

# ── CRM Core (Bloque 15) ──────────────────────────────────────────────────────
try:
    from dashboard.services.crm_core import cargar_contactos, cargar_stakeholders_prioritarios
    from dashboard.components.crm_components import render_contact_card, render_stakeholder_priority_card
    _crm_d2_available = True
except Exception:
    _crm_d2_available = False
    def cargar_contactos(**kw): return []
    def cargar_stakeholders_prioritarios(**kw): return []
    def render_contact_card(*a, **kw): pass
    def render_stakeholder_priority_card(*a, **kw): pass

st.set_page_config(
    page_title="Mapa de Actores — ElectSim",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)
aplicar_estilos()
sidebar_nav()
mostrar_alertas_pagina("D2_Actores")

# ── Demo data (cuando DB no disponible) ───────────────────────────────────────
DEMO_ACTORES_FULL = [
    {"id": "sanchez", "nombre": "Pedro Sánchez", "partido": "PSOE", "cargo": "Presidente del Gobierno",
     "exposicion": 94, "sentimiento": -0.28, "tendencia": "bajista", "influencia": 98, "riesgo": 65,
     "escanos_partido": 120, "tipo": "politico", "poder": 10, "rol": "Presidente del Gobierno",
     "org": "PSOE", "region": "Nacional",
     "bio": "Político español, secretario general del PSOE desde 2014 y Presidente del Gobierno desde 2018. Licenciado en Economía por la UCM, doctor en economía por la UCM en 2017. Ha liderado dos gobiernos en minoría y ha impulsado la reforma laboral, la ley de vivienda y los Presupuestos de 2022.",
     "aliados": ["diaz", "junqueras", "otegi"], "rivales": ["feijoo", "abascal", "puigdemont"]},
    {"id": "feijoo", "nombre": "Alberto Núñez Feijóo", "partido": "PP", "cargo": "Líder PP / Jefe Oposición",
     "exposicion": 87, "sentimiento": 0.12, "tendencia": "estable", "influencia": 91, "riesgo": 42,
     "escanos_partido": 137, "tipo": "politico", "poder": 9, "rol": "Presidente PP",
     "org": "PP", "region": "Nacional",
     "bio": "Político gallego, presidente del Partido Popular desde abril de 2022 tras ganar las primarias. Fue presidente de la Xunta de Galicia durante cuatro mandatos consecutivos (2009-2022). Abogado del Estado, ha centrado su oposición en economía, seguridad y crítica a los pactos del gobierno con partidos independentistas.",
     "aliados": ["ayuso", "moreno"], "rivales": ["sanchez", "diaz", "abascal"]},
    {"id": "abascal", "nombre": "Santiago Abascal", "partido": "VOX", "cargo": "Presidente VOX",
     "exposicion": 61, "sentimiento": -0.71, "tendencia": "alcista", "influencia": 67, "riesgo": 38,
     "escanos_partido": 33, "tipo": "politico", "poder": 7, "rol": "Presidente VOX",
     "org": "VOX", "region": "Nacional",
     "bio": "Político vasco, presidente de VOX desde su fundación en 2013. Ex militante del PP, fue diputado en el Parlamento Vasco. VOX es el tercer partido con representación en el Congreso de los Diputados. Ha protagonizado una rápida ascensión electoral con un programa de ultraderecha nativista.",
     "aliados": ["feijoo"], "rivales": ["sanchez", "diaz", "junqueras"]},
    {"id": "diaz", "nombre": "Yolanda Díaz", "partido": "SUMAR", "cargo": "Vicepresidenta 2ª",
     "exposicion": 55, "sentimiento": 0.08, "tendencia": "estable", "influencia": 72, "riesgo": 48,
     "escanos_partido": 31, "tipo": "politico", "poder": 8, "rol": "Vicepresidenta 2ª del Gobierno",
     "org": "SUMAR", "region": "Nacional",
     "bio": "Política gallega, abogada laboralista. Fue ministra de Trabajo desde 2020 y lideró la reforma laboral de 2021. Fundó SUMAR en 2022, plataforma de izquierdas que integró a Podemos y otras fuerzas. Es la representante de la izquierda dentro del gobierno de coalición.",
     "aliados": ["sanchez", "belarra"], "rivales": ["feijoo", "abascal"]},
    {"id": "puigdemont", "nombre": "Carles Puigdemont", "partido": "JUNTS", "cargo": "Secretario General JUNTS",
     "exposicion": 48, "sentimiento": -0.52, "tendencia": "alcista", "influencia": 61, "riesgo": 75,
     "escanos_partido": 7, "tipo": "politico", "poder": 7, "rol": "Secretario General JUNTS",
     "org": "JUNTS", "region": "Catalunya",
     "bio": "Político catalán en el exilio desde 2017. Fue president de la Generalitat de Catalunya (2016-2017) y lideró el referéndum de independencia del 1-O. Vive en Waterloo (Bélgica) evitando la extradición. Es una pieza clave de la investidura de Sánchez pero mantiene una posición de presión constante.",
     "aliados": [], "rivales": ["sanchez", "feijoo", "abascal"]},
    {"id": "ayuso", "nombre": "Isabel Díaz Ayuso", "partido": "PP", "cargo": "Presidenta CAM",
     "exposicion": 72, "sentimiento": -0.15, "tendencia": "estable", "influencia": 78, "riesgo": 35,
     "escanos_partido": 71, "tipo": "politico", "poder": 8, "rol": "Presidenta Comunidad de Madrid",
     "org": "PP", "region": "Madrid",
     "bio": "Política madrileña, presidenta de la Comunidad de Madrid desde 2021. Ganó las elecciones de mayo de 2021 por mayoría absoluta. Periodista de formación. Su perfil liberal y confrontacional con el gobierno central la ha convertido en referente de la derecha española y en rival interna de Feijóo.",
     "aliados": ["feijoo"], "rivales": ["sanchez", "diaz"]},
    {"id": "belarra", "nombre": "Ione Belarra", "partido": "PODEMOS", "cargo": "Secretaria General Podemos",
     "exposicion": 41, "sentimiento": -0.22, "tendencia": "bajista", "influencia": 45, "riesgo": 31,
     "escanos_partido": 5, "tipo": "politico", "poder": 5, "rol": "Secretaria General Podemos",
     "org": "PODEMOS", "region": "Nacional",
     "bio": "Política navarra, secretaria general de Podemos desde 2021. Fue ministra de Derechos Sociales en el gobierno de coalición PSOE-Unidas Podemos. Mantiene una posición crítica con el gobierno de Sánchez desde la creación de SUMAR, que consideran una operación de absorción.",
     "aliados": ["diaz"], "rivales": ["feijoo", "abascal", "sanchez"]},
    {"id": "junqueras", "nombre": "Oriol Junqueras", "partido": "ERC", "cargo": "Presidente ERC",
     "exposicion": 35, "sentimiento": -0.41, "tendencia": "bajista", "influencia": 52, "riesgo": 44,
     "escanos_partido": 7, "tipo": "politico", "poder": 6, "rol": "Presidente ERC",
     "org": "ERC", "region": "Catalunya",
     "bio": "Político catalán, presidente de ERC. Fue vicepresidente de la Generalitat de Catalunya y organizador del 1-O. Condenado por sedición y malversación, fue indultado en 2021. Ha liderado una estrategia de diálogo con el gobierno a cambio de concesiones para Cataluña, en tensión con JUNTS.",
     "aliados": ["sanchez"], "rivales": ["puigdemont", "abascal"]},
]

# Demo de noticias por actor
DEMO_NOTICIAS = {
    "sanchez": [
        {"titulo": "Sánchez anuncia nuevas medidas de apoyo al alquiler asequible", "medio": "El País", "sentimiento": "neutral", "hace": "2h", "url": "", "snippet": "El presidente del Gobierno presentó un paquete de medidas que incluye incentivos fiscales para propietarios que bajen precios."},
        {"titulo": "La oposición critica la gestión de Sánchez en la crisis migratoria", "medio": "El Mundo", "sentimiento": "negativo", "hace": "4h", "url": "", "snippet": "PP y VOX exigen al gobierno soluciones concretas ante el aumento de llegadas a Canarias."},
        {"titulo": "Sánchez viaja a Bruselas para la cumbre del Consejo Europeo", "medio": "RTVE", "sentimiento": "neutral", "hace": "6h", "url": "", "snippet": "El presidente participa en la reunión sobre defensa y migración con sus homólogos europeos."},
        {"titulo": "El CIS mejora ligeramente la valoración de Sánchez", "medio": "La Vanguardia", "sentimiento": "positivo", "hace": "1d", "url": "", "snippet": "El barómetro mensual refleja una subida de 0.3 puntos en la valoración del presidente."},
        {"titulo": "Tensión en la coalición por el debate sobre el CGPJ", "medio": "Expansión", "sentimiento": "negativo", "hace": "1d", "url": "", "snippet": "SUMAR y PSOE discrepan sobre el ritmo de la renovación del Consejo General del Poder Judicial."},
    ],
    "feijoo": [
        {"titulo": "Feijóo propone una gran reforma fiscal para 2027 si llega al gobierno", "medio": "ABC", "sentimiento": "positivo", "hace": "3h", "url": "", "snippet": "El líder popular presenta su programa económico centrado en bajada de IRPF y reducción del gasto."},
        {"titulo": "PP supera al PSOE en intención de voto por tercer mes consecutivo", "medio": "El Confidencial", "sentimiento": "positivo", "hace": "5h", "url": "", "snippet": "La encuesta mensual da al PP una ventaja de 4 puntos sobre el PSOE."},
        {"titulo": "Feijóo acusa a Sánchez de favorecer la corrupción", "medio": "La Razón", "sentimiento": "negativo", "hace": "8h", "url": "", "snippet": "El presidente del PP arremete contra el ejecutivo por los escándalos de sus socios de coalición."},
        {"titulo": "El PP gana las elecciones regionales en Murcia", "medio": "El Mundo", "sentimiento": "positivo", "hace": "2d", "url": "", "snippet": "Los populares amplían su mayoría absoluta en la región murciana."},
        {"titulo": "Desacuerdo interno en el PP sobre la política migratoria", "medio": "El País", "sentimiento": "negativo", "hace": "2d", "url": "", "snippet": "Ayuso defiende posiciones más duras que la dirección nacional sobre el pacto migratorio europeo."},
    ],
}

# Relaciones para el grafo de influencia
DEMO_RELACIONES = [
    {"from": "sanchez", "to": "diaz", "tipo": "alianza", "fuerza": 8},
    {"from": "sanchez", "to": "junqueras", "tipo": "alianza", "fuerza": 5},
    {"from": "feijoo", "to": "ayuso", "tipo": "alianza", "fuerza": 7},
    {"from": "abascal", "to": "feijoo", "tipo": "alianza", "fuerza": 3},
    {"from": "diaz", "to": "belarra", "tipo": "alianza", "fuerza": 4},
    {"from": "sanchez", "to": "feijoo", "tipo": "rival", "fuerza": 9},
    {"from": "sanchez", "to": "abascal", "tipo": "rival", "fuerza": 9},
    {"from": "feijoo", "to": "abascal", "tipo": "rival", "fuerza": 5},
    {"from": "sanchez", "to": "puigdemont", "tipo": "neutral", "fuerza": 6},
    {"from": "puigdemont", "to": "junqueras", "tipo": "rival", "fuerza": 7},
    {"from": "diaz", "to": "feijoo", "tipo": "rival", "fuerza": 8},
    {"from": "belarra", "to": "sanchez", "tipo": "neutral", "fuerza": 4},
]

# ── Servicios ─────────────────────────────────────────────────────────────────
try:
    from dashboard.services import actors_service as _svc
    _SVC_OK = True
except Exception as _e:
    _SVC_OK = False

try:
    from dashboard.services import actors_scraper as _scraper
    _SCRAPER_OK = True
except Exception:
    _SCRAPER_OK = False

try:
    from dashboard.services import llm_local as _llm
    _LLM_OK = _llm.esta_disponible()
except Exception:
    _LLM_OK = False

try:
    from pyvis.network import Network as _PyvisNetwork
    _PYVIS_OK = True
except ImportError:
    _PYVIS_OK = False

# ── OSINT / Risk Graph (Bloque 4) ─────────────────────────────────────────────
try:
    from dashboard.services.actor_risk_core import (
        cargar_kpis_riesgo as _arc_kpis,
        cargar_top_risk_entities as _arc_top,
        buscar_entidades as _arc_buscar,
        cargar_grafo_actor as _arc_grafo,
        cargar_flags_entidad as _arc_flags,
        cargar_identidades_pendientes as _arc_id_pendientes,
    )
    _RISK_OK = True
except Exception:
    _RISK_OK = False
    def _arc_kpis() -> dict: return {"hay_datos": False}
    def _arc_top(limit=20): import pandas as pd; return pd.DataFrame()
    def _arc_buscar(q, limit=25): import pandas as pd; return pd.DataFrame()
    def _arc_grafo(entity_id, depth=2): return {"nodes": [], "edges": [], "meta": {}}
    def _arc_flags(entity_id): import pandas as pd; return pd.DataFrame()
    def _arc_id_pendientes(limit=50): import pandas as pd; return pd.DataFrame()

# ── Paleta por tipo ───────────────────────────────────────────────────────────
_COLOR_TIPO = {
    "politico":    CYAN,
    "empresarial": AMBER,
    "mediatico":   GREEN,
    "influencia":  PURPLE,
}
_ICON_TIPO = {
    "politico":    "",
    "empresarial": "",
    "mediatico":   "",
    "influencia":  "",
}
_COLOR_REL = {
    "gubernamental": "#1E40AF",
    "adversarial":   RED,
    "mediatico":     AMBER,
    "empresarial":   GREEN,
    "lobby":         PURPLE,
    "alianza":       CYAN,
    "sindical":      "#F472B6",
    "rss":           "#94A3B8",
    "rival":         RED,
    "neutral":       MUTED,
}
_COMM_COLORS = [CYAN, AMBER, GREEN, PURPLE, RED, "#F97316", "#06B6D4", "#84CC16"]

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
[data-testid="stAppViewContainer"] {{background:{BG};}}
.actor-card {{
  background:linear-gradient(135deg,{BG2},{BG3});
  border:1px solid {BORDER}; border-radius:14px;
  padding:1.1rem 1.4rem; margin-bottom:.7rem;
}}
.actor-name  {{font-size:1rem; font-weight:900; color:{TEXT}; margin-bottom:.15rem;}}
.actor-role  {{font-size:.73rem; color:{TEXT2}; margin-bottom:.3rem;}}
.tag {{
  display:inline-block; font-size:.58rem; font-weight:800;
  letter-spacing:.07em; text-transform:uppercase;
  border-radius:5px; padding:2px 7px; margin-right:.3rem;
}}
.conn-item {{
  background:{BG2}; border:1px solid {BORDER};
  border-radius:8px; padding:.5rem .8rem; margin-bottom:.3rem;
  display:flex; align-items:center; justify-content:space-between;
  font-size:.77rem;
}}
.metric-box {{
  background:{BG2}; border:1px solid {BORDER};
  border-top:2px solid {PURPLE};
  border-radius:10px; padding:.7rem .9rem; text-align:center;
}}
.metric-val {{font-size:1.3rem; font-weight:900; color:{CYAN};}}
.metric-lbl {{font-size:.68rem; color:{MUTED}; margin-top:.1rem;}}
.log-row {{
  font-family:monospace; font-size:.72rem; color:{TEXT2};
  border-bottom:1px solid {BORDER}; padding:.25rem 0;
}}
.log-ok  {{color:{GREEN};}} .log-err {{color:{RED};}}
.wiki-box {{
  background:linear-gradient(135deg,{CYAN}09,{BG2});
  border:1px solid {CYAN}33; border-radius:10px;
  padding:.8rem 1rem; font-size:.82rem; color:{TEXT}; line-height:1.65;
  margin-bottom:.6rem;
}}
.ner-chip {{
  display:inline-block; font-size:.68rem; font-weight:700;
  border-radius:6px; padding:2px 8px; margin:2px;
}}
.chat-msg {{
  background:linear-gradient(135deg,{CYAN}08,{BG2});
  border:1px solid {CYAN}33; border-radius:12px;
  padding:.9rem 1.1rem; margin-bottom:.5rem;
  font-size:.84rem; color:{TEXT}; line-height:1.6;
}}
.kpi-dossier {{
  background:{BG2}; border:1px solid {BORDER};
  border-radius:12px; padding:.9rem 1rem; text-align:center;
  position:relative; overflow:hidden;
}}
.dossier-val {{font-size:1.65rem; font-weight:900; line-height:1; margin:.3rem 0 .1rem;}}
.dossier-lbl {{font-size:.6rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:{MUTED};}}
.dossier-bio {{
  background:linear-gradient(135deg,{BG3},{BG2});
  border:1px solid {BORDER}; border-left:3px solid {CYAN};
  border-radius:10px; padding:1rem 1.2rem;
  font-size:.84rem; color:{TEXT2}; line-height:1.7; margin-bottom:.8rem;
}}
.avatar-circle {{
  width:64px; height:64px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:1.6rem; font-weight:900;
  border:2px solid; flex-shrink:0;
}}
.stage-bar {{
  display:flex; gap:3px; align-items:center; width:100%;
}}
.stage-pill {{
  flex:1; height:8px; border-radius:4px;
  transition:all .3s ease;
}}
</style>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _color_tipo(tipo: str) -> str:
    return _COLOR_TIPO.get(tipo, CYAN)

def _icon_tipo(tipo: str) -> str:
    return _ICON_TIPO.get(tipo, "")

def _actor_badge(tipo: str) -> str:
    c = _color_tipo(tipo)
    return (f'<span class="tag"style="background:{c}22;color:{c};">'
            f'{_icon_tipo(tipo)} {tipo}</span>')

def _rel_badge(tipo: str) -> str:
    c = _COLOR_REL.get(tipo, MUTED)
    return f'<span class="tag"style="background:{c}22;color:{c};">{tipo}</span>'

def _node_color(actor: dict, comm: dict) -> str:
    cid = comm.get(actor["id"])
    if cid is not None:
        return _COMM_COLORS[int(cid) % len(_COMM_COLORS)]
    return _color_tipo(actor.get("tipo", ""))

def _get_actores() -> list[dict]:
    if _SVC_OK:
        try:
            return _svc.get_actores()
        except Exception:
            pass
    return DEMO_ACTORES_FULL

def _get_actor_by_nombre(nombre: str) -> dict | None:
    for a in DEMO_ACTORES_FULL:
        if a["nombre"] == nombre:
            return a
    if _SVC_OK:
        try:
            for a in _svc.get_actores():
                if a.get("nombre") == nombre:
                    return a
        except Exception:
            pass
    return None

def _sentimiento_label(s: float) -> str:
    if s > 0.1:
        return "positivo"
    if s < -0.1:
        return "negativo"
    return "neutral"

def _sentimiento_color(s: float) -> str:
    if s > 0.1:
        return GREEN
    if s < -0.1:
        return RED
    return AMBER

def _tendencia_color(t: str) -> str:
    mapping = {"alcista": GREEN, "bajista": RED, "estable": AMBER}
    return mapping.get(t, MUTED)

def _tendencia_icon(t: str) -> str:
    mapping = {"alcista": "↑", "bajista": "↓", "estable": "→"}
    return mapping.get(t, "—")

@st.cache_data(ttl=120, show_spinner=False)
def _load_metricas() -> dict:
    if _SVC_OK:
        try:
            return _svc.calcular_metricas()
        except Exception:
            pass
    return {"n_nodos": len(DEMO_ACTORES_FULL), "n_aristas": len(DEMO_RELACIONES),
            "densidad": 0.42, "n_comunidades": 3,
            "pagerank": {a["id"]: a["influencia"] / 100 for a in DEMO_ACTORES_FULL},
            "betweenness": {a["id"]: a["riesgo"] / 200 for a in DEMO_ACTORES_FULL},
            "degree": {a["id"]: 4 for a in DEMO_ACTORES_FULL},
            "comunidades": {a["id"]: i % 3 for i, a in enumerate(DEMO_ACTORES_FULL)}}


# ═══════════════════════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════════════════════

intel_header(
    "Mapa de Actores",
    "Actor Intelligence",
    "LIVE",
    datetime.now().strftime("%d/%m/%Y %H:%M"),
)

_actores_todos = _get_actores()
_metricas = _load_metricas()

# KPIs globales
if _SVC_OK:
    try:
        _estado_w = _svc.estado_worker_actores()
    except Exception:
        _estado_w = {"n_actores": len(_actores_todos), "n_relaciones": len(DEMO_RELACIONES), "n_menciones": 0, "running": False}
else:
    _estado_w = {"n_actores": len(_actores_todos), "n_relaciones": len(DEMO_RELACIONES), "n_menciones": 0, "running": False}

c1, c2, c3, c4, c5 = st.columns(5)
with c1:
    st.markdown(kpi_card("Actores", str(_estado_w.get("n_actores", 0)), "en red", color=CYAN), unsafe_allow_html=True)
with c2:
    st.markdown(kpi_card("Relaciones", str(_estado_w.get("n_relaciones", 0)), "aristas totales", color=PURPLE), unsafe_allow_html=True)
with c3:
    st.markdown(kpi_card("Menciones", str(_estado_w.get("n_menciones", 0)), "últ. 24h", color=AMBER), unsafe_allow_html=True)
with c4:
    st.markdown(kpi_card("Comunidades", str(_metricas.get("n_comunidades", 0)), "bloques Louvain", color=GREEN), unsafe_allow_html=True)
with c5:
    w_on = _estado_w.get("running", False)
    st.markdown(kpi_card("Worker", "● Activo" if w_on else "⏸ Parado", "scraper", color=GREEN if w_on else MUTED), unsafe_allow_html=True)

st.markdown("---")


# ═══════════════════════════════════════════════════════════════════════════════
# TABS PRINCIPALES
# ═══════════════════════════════════════════════════════════════════════════════

tab_dossier, tab_red_influencia, tab_comparativa, tab_red, tab_perfil, tab_rels, tab_analisis, tab_update, tab_query, tab_risk = st.tabs([
    "DOSSIER EJECUTIVO",
    "RED DE INFLUENCIA",
    "COMPARATIVA",
    "Red Dinámica",
    "Perfiles",
    "Relaciones",
    "Análisis networkx",
    "Actualización",
    "Query IA",
    "⚠️ Riesgo OSINT",
])


# ─────────────────────────────────────────────────────────────────────────────
# TAB 1 — DOSSIER EJECUTIVO
# ─────────────────────────────────────────────────────────────────────────────

with tab_dossier:
    section_header("Dossier 360° de Actor Político", CYAN)

    # Actor selector
    nombres_actores = [a["nombre"] for a in sorted(_actores_todos, key=lambda x: -x.get("poder", x.get("influencia", 0)))]
    # Fusionar con demo si hay pocos
    demo_nombres = [a["nombre"] for a in DEMO_ACTORES_FULL]
    for dn in demo_nombres:
        if dn not in nombres_actores:
            nombres_actores.insert(0, dn)
    nombres_actores = list(dict.fromkeys(nombres_actores))

    ds_col1, ds_col2 = st.columns([3, 1])
    with ds_col1:
        actor_dossier_n = st.selectbox(
            "Seleccionar actor para dossier",
            nombres_actores,
            key="dossier_actor_sel",
        )
    with ds_col2:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        refresh_dossier = st.button("Actualizar dossier", key="btn_refresh_dossier", use_container_width=True)

    # Buscar datos del actor
    actor_d = _get_actor_by_nombre(actor_dossier_n)
    if actor_d is None:
        st.info("No hay datos disponibles para este actor.")
        st.stop()

    # ── Sección 1: Avatar + KPIs ───────────────────────────────────────────
    d_col_av, d_col_kpis = st.columns([1, 4])
    with d_col_av:
        partido = actor_d.get("partido", actor_d.get("org", ""))
        c_partido = COLORES_PARTIDOS.get(partido, CYAN)
        inicial = actor_d["nombre"][0].upper()
        st.markdown(
            f'<div class="avatar-circle" style="background:{c_partido}22;border-color:{c_partido};'
            f'color:{c_partido};margin:0 auto;margin-bottom:.6rem;">{inicial}</div>',
            unsafe_allow_html=True,
        )
        tendencia = actor_d.get("tendencia", "estable")
        t_color = _tendencia_color(tendencia)
        st.markdown(
            f'<div style="text-align:center;font-size:.7rem;font-weight:700;color:{t_color};">'
            f'{_tendencia_icon(tendencia)} {tendencia.upper()}</div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<div style="text-align:center;font-size:.65rem;color:{MUTED};margin-top:.3rem;">'
            f'{actor_d.get("cargo", actor_d.get("rol", ""))}</div>',
            unsafe_allow_html=True,
        )

    with d_col_kpis:
        st.markdown(
            f'<div style="font-size:1.25rem;font-weight:900;color:{TEXT};margin-bottom:.2rem;">'
            f'{actor_d["nombre"]}</div>'
            f'<div style="font-size:.8rem;color:{TEXT2};margin-bottom:.8rem;">'
            f'{actor_d.get("partido", actor_d.get("org", ""))} · {actor_d.get("cargo", actor_d.get("rol", ""))}'
            f'</div>',
            unsafe_allow_html=True,
        )

        kpi_cols = st.columns(6)
        kpi_data = [
            ("Exposición", f'{actor_d.get("exposicion", 0)}', "/ 100", CYAN),
            ("Sentimiento", f'{actor_d.get("sentimiento", 0):+.2f}', "", _sentimiento_color(actor_d.get("sentimiento", 0))),
            ("Escaños partido", f'{actor_d.get("escanos_partido", 0)}', "diputados", BLUE),
            ("Influencia", f'{actor_d.get("influencia", actor_d.get("poder", 0) * 10)}', "/ 100", PURPLE),
            ("Riesgo", f'{actor_d.get("riesgo", 0)}', "/ 100", AMBER if actor_d.get("riesgo", 0) < 60 else RED),
            ("Tendencia", _tendencia_icon(actor_d.get("tendencia", "estable")), actor_d.get("tendencia", "estable"), _tendencia_color(actor_d.get("tendencia", "estable"))),
        ]
        for col, (lbl, val, sub, color) in zip(kpi_cols, kpi_data):
            with col:
                st.markdown(
                    f'<div class="kpi-dossier" style="border-top:2px solid {color};">'
                    f'<div class="dossier-lbl">{lbl}</div>'
                    f'<div class="dossier-val" style="color:{color};">{val}</div>'
                    f'<div style="font-size:.62rem;color:{MUTED};">{sub}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    st.markdown("<div style='height:.8rem'></div>", unsafe_allow_html=True)

    # ── Sección 2: Bio ─────────────────────────────────────────────────────
    bio = actor_d.get("bio", actor_d.get("wikipedia_extracto", actor_d.get("extracto", actor_d.get("descripcion", ""))))
    if bio:
        section_header("Perfil biográfico", CYAN)
        st.markdown(
            f'<div class="dossier-bio">{bio}</div>',
            unsafe_allow_html=True,
        )

    # ── Sección 3: Noticias recientes ─────────────────────────────────────
    section_header("Últimas noticias", AMBER)

    # Intentar servicio real; fallback a demo
    noticias_actor = []
    if _SVC_OK:
        try:
            menciones = _svc.get_menciones(actor_id=actor_d.get("id", ""), limit=5)
            noticias_actor = [
                {"titulo": m.get("titular", ""), "medio": m.get("medio", ""), "sentimiento": "neutral",
                 "hace": m.get("fecha", "")[:10], "url": m.get("url", ""), "snippet": m.get("titular", "")}
                for m in menciones
            ]
        except Exception:
            pass

    if not noticias_actor:
        actor_id = actor_d.get("id", "")
        noticias_actor = DEMO_NOTICIAS.get(actor_id, DEMO_NOTICIAS.get("sanchez", []))

    for noticia in noticias_actor[:5]:
        st.markdown(
            news_card(
                title=noticia.get("titulo", ""),
                source=noticia.get("medio", ""),
                sentiment=noticia.get("sentimiento", "neutral"),
                time_ago=noticia.get("hace", ""),
                url=noticia.get("url", ""),
                snippet=noticia.get("snippet", ""),
            ),
            unsafe_allow_html=True,
        )

    # ── Sección 4: Assessment IA + Red ego ────────────────────────────────
    sec_col1, sec_col2 = st.columns([1, 1])

    with sec_col1:
        section_header("Valoración estratégica IA", PURPLE)
        if st.button(f"Generar dossier IA para {actor_d['nombre']}", key="btn_dossier_ia", disabled=not _LLM_OK):
            bio_ctx = bio[:400] if bio else ""
            prompt_dos = (
                f"Genera una valoración estratégica concisa para analistas sobre {actor_d['nombre']}.\n"
                f"Cargo: {actor_d.get('cargo', actor_d.get('rol', ''))}\n"
                f"Partido: {actor_d.get('partido', actor_d.get('org', ''))}\n"
                f"Exposición mediática: {actor_d.get('exposicion', 0)}/100\n"
                f"Sentimiento neto: {actor_d.get('sentimiento', 0):+.2f}\n"
                f"Influencia: {actor_d.get('influencia', 0)}/100\n"
                f"Riesgo político: {actor_d.get('riesgo', 0)}/100\n"
                f"Bio: {bio_ctx}\n\n"
                "Estructura: 1. Posición actual 2. Vectores de riesgo 3. Oportunidades 4. Palancas clave. Máx. 200 palabras. Español. Muy analítico."
            )
            with st.spinner("Politeia Brain analizando..."):
                try:
                    respuesta_dos = _llm.chat(
                        prompt_dos,
                        sistema="Eres analista político senior especializado en España. Responde en español.",
                        modo="normal",
                    )
                    st.markdown(f'<div class="chat-msg">{respuesta_dos}</div>', unsafe_allow_html=True)
                except Exception as e:
                    st.error(f"Error LLM: {e}")
        elif not _LLM_OK:
            st.markdown(
                f'<div class="chat-msg">'
                f'<b style="color:{AMBER};"> Ollama no disponible</b><br>'
                f'<span style="color:{TEXT2};font-size:.82rem;">'
                f'Activa Ollama (`ollama serve`) para generar dossiers estratégicos con IA. '
                f'El análisis incluye vectores de riesgo, palancas de acceso y escenarios a 6 meses.'
                f'</span></div>',
                unsafe_allow_html=True,
            )

    with sec_col2:
        section_header("Relaciones clave", BLUE)
        # Mini-red ego con Plotly
        actor_id_d = actor_d.get("id", "")
        aliados = actor_d.get("aliados", [])
        rivales = actor_d.get("rivales", [])

        # Construir nodos
        nodos_ego = [actor_d]
        for aid in aliados[:3]:
            nodo = next((a for a in DEMO_ACTORES_FULL if a["id"] == aid), None)
            if nodo:
                nodos_ego.append(nodo)
        for rid in rivales[:3]:
            nodo = next((a for a in DEMO_ACTORES_FULL if a["id"] == rid), None)
            if nodo:
                nodos_ego.append(nodo)

        if len(nodos_ego) > 1:
            # Posicionar nodos en círculo
            n = len(nodos_ego)
            angles = [2 * math.pi * i / max(n - 1, 1) for i in range(n)]
            xs = [0.0] + [math.cos(a) for a in angles[1:]]
            ys = [0.0] + [math.sin(a) for a in angles[1:]]

            node_ids = [nodo["id"] for nodo in nodos_ego]
            idx_map = {nid: i for i, nid in enumerate(node_ids)}

            edge_traces = []
            # Aristas aliados
            for aid in aliados[:3]:
                if aid in idx_map:
                    i0, i1 = 0, idx_map[aid]
                    edge_traces.append(go.Scatter(
                        x=[xs[i0], xs[i1], None], y=[ys[i0], ys[i1], None],
                        mode="lines", line=dict(color=GREEN, width=2),
                        hoverinfo="none", showlegend=False,
                    ))
            # Aristas rivales
            for rid in rivales[:3]:
                if rid in idx_map:
                    i0, i1 = 0, idx_map[rid]
                    edge_traces.append(go.Scatter(
                        x=[xs[i0], xs[i1], None], y=[ys[i0], ys[i1], None],
                        mode="lines", line=dict(color=RED, width=2, dash="dot"),
                        hoverinfo="none", showlegend=False,
                    ))

            node_colors = []
            node_sizes = []
            node_texts = []
            for j, nodo in enumerate(nodos_ego):
                nid = nodo["id"]
                is_center = nid == actor_id_d
                is_aliado = nid in aliados
                c = GREEN if is_aliado and not is_center else (RED if nid in rivales else CYAN)
                node_colors.append(c)
                node_sizes.append(22 if is_center else 14)
                node_texts.append(
                    f"<b>{nodo['nombre']}</b><br>{nodo.get('partido', nodo.get('org',''))}"
                    + ("<br>ALIADO" if is_aliado else ("<br>RIVAL" if nid in rivales else ""))
                )

            node_trace = go.Scatter(
                x=xs, y=ys, mode="markers+text",
                marker=dict(color=node_colors, size=node_sizes, line=dict(color=BG2, width=2)),
                text=[n["nombre"].split()[0] for n in nodos_ego],
                textposition="top center",
                textfont=dict(color=TEXT, size=9),
                hovertemplate="%{customdata}<extra></extra>",
                customdata=node_texts,
            )

            fig_ego = go.Figure(data=edge_traces + [node_trace])
            fig_ego.update_layout(
                height=260, margin=dict(l=0, r=0, t=5, b=0),
                xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            )
            apply_plotly_theme(fig_ego)
            st.plotly_chart(fig_ego, use_container_width=True)

            # Leyenda
            st.markdown(
                f'<div style="display:flex;gap:.8rem;font-size:.65rem;justify-content:center;">'
                f'<span><span style="color:{GREEN};">●</span> Aliado</span>'
                f'<span><span style="color:{RED};">●</span> Rival</span>'
                f'<span><span style="color:{CYAN};">●</span> Actor central</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
        else:
            st.info("Sin relaciones disponibles para este actor.")


# ─────────────────────────────────────────────────────────────────────────────
# TAB 2 — RED DE INFLUENCIA
# ─────────────────────────────────────────────────────────────────────────────

with tab_red_influencia:
    section_header("Red de Influencia Política", PURPLE)

    ri_c1, ri_c2, ri_c3, ri_c4 = st.columns(4)
    with ri_c1:
        show_alianzas = st.checkbox("Alianzas", value=True, key="ri_alianzas")
    with ri_c2:
        show_rivales = st.checkbox("Rivalidades", value=True, key="ri_rivales")
    with ri_c3:
        show_neutral = st.checkbox("Neutrales", value=False, key="ri_neutral")
    with ri_c4:
        filtro_partido_ri = st.selectbox(
            "Partido",
            ["Todos", "PSOE", "PP", "VOX", "SUMAR", "PODEMOS", "JUNTS", "ERC"],
            key="ri_partido",
        )

    # Filtrar actores
    actores_ri = DEMO_ACTORES_FULL[:]
    if filtro_partido_ri != "Todos":
        actores_ri = [a for a in actores_ri if a.get("partido", a.get("org", "")) == filtro_partido_ri]
    ids_ri = {a["id"] for a in actores_ri}

    # Filtrar relaciones
    rels_ri = [r for r in DEMO_RELACIONES if r["from"] in ids_ri and r["to"] in ids_ri]
    tipos_activos = set()
    if show_alianzas:
        tipos_activos.add("alianza")
    if show_rivales:
        tipos_activos.add("rival")
    if show_neutral:
        tipos_activos.add("neutral")
    rels_ri = [r for r in rels_ri if r["tipo"] in tipos_activos]

    if actores_ri:
        # Layout circular para nodos
        n_nodes = len(actores_ri)
        cx, cy = 0.0, 0.0
        nodo_pos: dict[str, tuple[float, float]] = {}
        for i, actor in enumerate(actores_ri):
            angle = 2 * math.pi * i / n_nodes
            r = 1.0
            nodo_pos[actor["id"]] = (cx + r * math.cos(angle), cy + r * math.sin(angle))

        # Trazas de aristas
        edge_traces_ri: list[go.Scatter] = []
        for rel in rels_ri:
            if rel["from"] not in nodo_pos or rel["to"] not in nodo_pos:
                continue
            x0, y0 = nodo_pos[rel["from"]]
            x1, y1 = nodo_pos[rel["to"]]
            tipo_r = rel["tipo"]
            col_r = GREEN if tipo_r == "alianza" else (RED if tipo_r == "rival" else MUTED)
            width_r = max(1, rel.get("fuerza", 3) / 3)
            dash_r = "dot" if tipo_r == "rival" else "solid"
            edge_traces_ri.append(go.Scatter(
                x=[x0, x1, None], y=[y0, y1, None],
                mode="lines",
                line=dict(color=col_r, width=width_r, dash=dash_r),
                hoverinfo="none", showlegend=False,
            ))

        # Nodos
        node_x, node_y, node_colors_ri, node_sizes_ri = [], [], [], []
        node_texts_ri, node_hover_ri = [], []
        for actor in actores_ri:
            x, y = nodo_pos[actor["id"]]
            node_x.append(x)
            node_y.append(y)
            partido = actor.get("partido", actor.get("org", ""))
            c = COLORES_PARTIDOS.get(partido, CYAN)
            node_colors_ri.append(c)
            influencia = actor.get("influencia", actor.get("poder", 5) * 10)
            node_sizes_ri.append(10 + int(influencia / 10))
            node_texts_ri.append(actor["nombre"].split()[0])
            node_hover_ri.append(
                f"<b>{actor['nombre']}</b><br>"
                f"Partido: {partido}<br>"
                f"Influencia: {influencia}/100<br>"
                f"Cargo: {actor.get('cargo', actor.get('rol', ''))}"
            )

        node_trace_ri = go.Scatter(
            x=node_x, y=node_y,
            mode="markers+text",
            marker=dict(
                color=node_colors_ri, size=node_sizes_ri,
                line=dict(color=BG, width=2),
                symbol="circle",
            ),
            text=node_texts_ri,
            textposition="top center",
            textfont=dict(color=TEXT, size=10),
            hovertemplate="%{customdata}<extra></extra>",
            customdata=node_hover_ri,
            name="Actores",
        )

        fig_ri = go.Figure(data=edge_traces_ri + [node_trace_ri])
        fig_ri.update_layout(
            height=520,
            margin=dict(l=10, r=10, t=10, b=10),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False,
                       range=[-1.4, 1.4]),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False,
                       range=[-1.4, 1.4]),
        )
        apply_plotly_theme(fig_ri)
        st.plotly_chart(fig_ri, use_container_width=True)

        # Leyenda y estadísticas
        leg_cols = st.columns(4)
        with leg_cols[0]:
            st.markdown(f'<span style="color:{GREEN};font-size:.72rem;">━━ Alianza ({sum(1 for r in rels_ri if r["tipo"]=="alianza")})</span>', unsafe_allow_html=True)
        with leg_cols[1]:
            st.markdown(f'<span style="color:{RED};font-size:.72rem;">┅┅ Rivalidad ({sum(1 for r in rels_ri if r["tipo"]=="rival")})</span>', unsafe_allow_html=True)
        with leg_cols[2]:
            st.markdown(f'<span style="color:{MUTED};font-size:.72rem;">── Neutral ({sum(1 for r in rels_ri if r["tipo"]=="neutral")})</span>', unsafe_allow_html=True)
        with leg_cols[3]:
            st.markdown(f'<span style="color:{TEXT2};font-size:.72rem;"> Tamaño = Influencia</span>', unsafe_allow_html=True)

        # Tabla de actores más influyentes
        st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
        section_header("Ranking de influencia", PURPLE)
        sorted_actors = sorted(actores_ri, key=lambda a: -a.get("influencia", a.get("poder", 0) * 10))
        rank_cols = st.columns(min(4, len(sorted_actors)))
        for i, actor in enumerate(sorted_actors[:4]):
            with rank_cols[i % 4]:
                partido = actor.get("partido", actor.get("org", ""))
                c = COLORES_PARTIDOS.get(partido, CYAN)
                influencia = actor.get("influencia", actor.get("poder", 5) * 10)
                st.markdown(
                    f'<div class="metric-box" style="border-top-color:{c};">'
                    f'<div style="font-size:.85rem;font-weight:800;color:{TEXT};">{actor["nombre"].split()[-1]}</div>'
                    f'<div style="font-size:.65rem;color:{MUTED};">{partido}</div>'
                    f'<div class="metric-val" style="color:{c};">{influencia}</div>'
                    f'<div class="metric-lbl">influencia</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.info("No hay actores del partido seleccionado con relaciones disponibles.")


# ─────────────────────────────────────────────────────────────────────────────
# TAB 3 — COMPARATIVA
# ─────────────────────────────────────────────────────────────────────────────

with tab_comparativa:
    section_header("Comparativa Multi-Actor", AMBER)

    nombres_comp = [a["nombre"] for a in DEMO_ACTORES_FULL]
    comp_sel = st.multiselect(
        "Seleccionar hasta 4 actores para comparar",
        nombres_comp,
        default=nombres_comp[:2],
        max_selections=4,
        key="comp_actores",
    )

    if not comp_sel:
        st.info("Selecciona al menos 1 actor para la comparativa.")
    else:
        actores_comp = [next((a for a in DEMO_ACTORES_FULL if a["nombre"] == n), None) for n in comp_sel]
        actores_comp = [a for a in actores_comp if a is not None]

        # Radar chart
        section_header("Radar de métricas", CYAN)
        categorias = ["Exposición", "Sentimiento (+)", "Influencia", "Riesgo inverso", "Escaños norm.", "Consistencia"]

        def _normalize_actor_metrics(actor: dict) -> list[float]:
            exp = actor.get("exposicion", 50) / 100
            sent = (actor.get("sentimiento", 0) + 1) / 2
            inf = actor.get("influencia", actor.get("poder", 5) * 10) / 100
            riesgo_inv = 1 - (actor.get("riesgo", 50) / 100)
            escanos = min(actor.get("escanos_partido", 30) / 180, 1.0)
            consistencia = 0.65 + (hash(actor["nombre"]) % 30) / 100
            return [exp, sent, inf, riesgo_inv, escanos, consistencia]

        colors_radar = [CYAN, AMBER, GREEN, RED, PURPLE, BLUE]
        fig_radar = go.Figure()
        for i, actor in enumerate(actores_comp):
            vals = _normalize_actor_metrics(actor)
            vals_closed = vals + [vals[0]]
            cats_closed = categorias + [categorias[0]]
            c = colors_radar[i % len(colors_radar)]
            fig_radar.add_trace(go.Scatterpolar(
                r=vals_closed,
                theta=cats_closed,
                fill="toself",
                fillcolor=hex_to_rgba(c, 0.13),
                line=dict(color=c, width=2),
                name=actor["nombre"].split()[0] + " " + actor["nombre"].split()[-1],
            ))
        fig_radar.update_layout(
            polar=dict(
                bgcolor=BG2,
                radialaxis=dict(visible=True, range=[0, 1], gridcolor=BORDER, color=MUTED),
                angularaxis=dict(gridcolor=BORDER, color=TEXT2),
            ),
            height=400,
            legend=dict(bgcolor=BG3, bordercolor=BORDER, font=dict(color=TEXT2)),
        )
        apply_plotly_theme(fig_radar)
        st.plotly_chart(fig_radar, use_container_width=True)

        # Timeline de sentimiento
        section_header("Evolución del sentimiento (últimas 12 semanas)", BLUE)
        import random
        weeks = [f"S{i+1}" for i in range(12)]

        fig_timeline = go.Figure()
        for i, actor in enumerate(actores_comp):
            c = colors_radar[i % len(colors_radar)]
            base_sent = actor.get("sentimiento", 0)
            rng = random.Random(hash(actor["nombre"]))
            sent_vals = [base_sent + rng.uniform(-0.15, 0.15) for _ in range(12)]
            fig_timeline.add_trace(go.Scatter(
                x=weeks, y=sent_vals,
                name=actor["nombre"].split()[-1],
                line=dict(color=c, width=2),
                mode="lines+markers",
                marker=dict(size=6, color=c),
                hovertemplate=f"<b>{actor['nombre']}</b><br>Semana: %{{x}}<br>Sentimiento: %{{y:.3f}}<extra></extra>",
            ))
        fig_timeline.add_hline(y=0, line_dash="dot", line_color=MUTED, opacity=0.5)
        fig_timeline.update_layout(
            height=300,
            xaxis=dict(title="Semana"),
            yaxis=dict(title="Sentimiento neto", range=[-1.1, 1.1]),
            legend=dict(bgcolor=BG3, bordercolor=BORDER),
        )
        apply_plotly_theme(fig_timeline)
        st.plotly_chart(fig_timeline, use_container_width=True)

        # Head-to-head table
        section_header("Head to head — métricas comparadas", PURPLE)
        metricas_hth = {
            "Exposición": lambda a: f'{a.get("exposicion", 0)}/100',
            "Sentimiento": lambda a: f'{a.get("sentimiento", 0):+.2f}',
            "Influencia": lambda a: f'{a.get("influencia", a.get("poder", 0)*10)}/100',
            "Riesgo": lambda a: f'{a.get("riesgo", 0)}/100',
            "Escaños partido": lambda a: str(a.get("escanos_partido", 0)),
            "Tendencia": lambda a: _tendencia_icon(a.get("tendencia", "estable")) + " " + a.get("tendencia", "estable"),
            "Cargo": lambda a: a.get("cargo", a.get("rol", ""))[:35],
            "Partido": lambda a: a.get("partido", a.get("org", "")),
        }

        hth_rows = []
        for metrica, fn in metricas_hth.items():
            row = {"Métrica": metrica}
            for actor in actores_comp:
                row[actor["nombre"].split()[0]] = fn(actor)
            hth_rows.append(row)

        df_hth = pd.DataFrame(hth_rows)
        st.dataframe(df_hth, use_container_width=True, hide_index=True, height=320)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 4 — RED DINÁMICA
# ─────────────────────────────────────────────────────────────────────────────

with tab_red:
    st.markdown("###  Grafo Force-Directed")
    st.caption("Tamaño = PageRank · Color = comunidad Louvain · Arista = tipo de relación")

    if not _SVC_OK:
        st.warning("actors_service no disponible — mostrando datos de demostración.")
        st.info("La red dinámica con pyvis requiere el servicio de actores. Usa la pestaña 'RED DE INFLUENCIA' para el grafo Plotly interactivo.")
    else:
        fc1, fc2, fc3, fc4 = st.columns([2, 2, 2, 1])
        with fc1:
            tipo_sel = st.selectbox(
                "Tipo actor", ["Todos", "politico", "empresarial", "mediatico", "influencia"],
                key="red_tipo"
            )
        with fc2:
            rel_sel = st.selectbox(
                "Tipo relación", ["Todas"] + list(_COLOR_REL.keys()),
                key="red_rel"
            )
        with fc3:
            opciones_actor = ["(Todo el grafo)"] + [
                a["nombre"] for a in sorted(_actores_todos, key=lambda x: -x.get("poder", 0))
            ]
            actor_ego_nombre = st.selectbox("Foco en actor (red ego)", opciones_actor, key="red_ego")
        with fc4:
            mostrar_labels = st.checkbox("Nombres", value=True, key="red_labels")

        _t_f = None if tipo_sel == "Todos" else tipo_sel
        _r_f = None if rel_sel == "Todas" else rel_sel
        _comm = _metricas.get("comunidades", {})
        _pgr = _metricas.get("pagerank", {})
        _max_pgr = max(_pgr.values()) if _pgr else 1.0

        if actor_ego_nombre != "(Todo el grafo)":
            actor_ego_obj = next((a for a in _actores_todos if a["nombre"] == actor_ego_nombre), None)
            if actor_ego_obj:
                try:
                    actores_g, relaciones_g = _svc.egocentric_network(actor_ego_obj["id"], profundidad=1)
                except Exception:
                    actores_g = _svc.get_actores(tipo=_t_f)
                    relaciones_g = _svc.get_relaciones(tipo=_r_f)
            else:
                actores_g = _svc.get_actores(tipo=_t_f)
                relaciones_g = _svc.get_relaciones(tipo=_r_f)
        else:
            actores_g = _svc.get_actores(tipo=_t_f)
            relaciones_g = _svc.get_relaciones(tipo=_r_f)

        if _r_f:
            relaciones_g = [r for r in relaciones_g if r.get("tipo") == _r_f]
        ids_grafo = {a["id"] for a in actores_g}
        relaciones_g = [r for r in relaciones_g
                        if r.get("from") in ids_grafo and r.get("to") in ids_grafo]

        if _PYVIS_OK and actores_g:
            net = _PyvisNetwork(
                height="580px", width="100%",
                bgcolor=BG, font_color=TEXT,
                directed=True,
            )
            net.set_options("""{
              "physics": {
                "enabled": true,
                "solver": "forceAtlas2Based",
                "forceAtlas2Based": {
                  "gravitationalConstant": -60,
                  "centralGravity": 0.005,
                  "springLength": 100,
                  "springConstant": 0.06,
                  "damping": 0.4
                },
                "stabilization": {"iterations": 180}
              },
              "interaction": {
                "hover": true,
                "tooltipDelay": 150,
                "navigationButtons": true,
                "keyboard": true
              },
              "edges": {
                "smooth": {"type": "dynamic"},
                "arrows": {"to": {"enabled": true, "scaleFactor": 0.5}}
              },
              "nodes": {"shadow": true, "shape": "dot"}
            }""")

            for a in actores_g:
                pgr_v = _pgr.get(a["id"], 0.01)
                size = 10 + int(pgr_v / _max_pgr * 35)
                color = _node_color(a, _comm)
                comm_id = _comm.get(a["id"])
                tooltip = (
                    f"<b>{a.get('nombre','')}</b><br>"
                    f"<i>{a.get('rol','')}</i><br>"
                    f"Org: {a.get('org','')} | Región: {a.get('region','')}<br>"
                    f"Poder: {a.get('poder',0)}/10 | PageRank: {pgr_v:.4f}<br>"
                    f"Comunidad: {comm_id if comm_id is not None else 'n/a'}"
                )
                net.add_node(
                    a["id"],
                    label=a.get("nombre", a["id"]) if mostrar_labels else "",
                    title=tooltip,
                    color={"background": color, "border": color,
                           "highlight": {"background": "#FFFFFF", "border": color}},
                    size=size,
                )

            for r in relaciones_g:
                col = _COLOR_REL.get(r.get("tipo", ""), MUTED)
                fuerza = float(r.get("fuerza", 1))
                net.add_edge(
                    r["from"], r["to"],
                    title=r.get("label", ""),
                    color=col,
                    width=max(0.5, fuerza * 0.4),
                    label=r.get("tipo", "") if _r_f else "",
                )

            _html_path = _ROOT / "dashboard" / "data" / "actors_graph_vis.html"
            _html_path.parent.mkdir(parents=True, exist_ok=True)
            net.save_graph(str(_html_path))
            with open(_html_path, "r", encoding="utf-8") as f:
                _html_content = f.read()
            components.html(_html_content, height=590, scrolling=False)

            leg_cols = st.columns(len(_COLOR_TIPO) + 1)
            for i, (t, c) in enumerate(_COLOR_TIPO.items()):
                with leg_cols[i]:
                    n = len([a for a in actores_g if a.get("tipo") == t])
                    st.markdown(
                        f'<div style="font-size:.72rem;"><span style="color:{c};">●</span> {_icon_tipo(t)} {t} ({n})</div>',
                        unsafe_allow_html=True
                    )
            with leg_cols[-1]:
                st.markdown(
                    f'<div style="font-size:.72rem;color:{MUTED};"> {_metricas.get("n_comunidades",0)} comunidades</div>',
                    unsafe_allow_html=True
                )
        elif not _PYVIS_OK:
            st.warning("pyvis no disponible — instala `pyvis>=0.3.2`")
        else:
            st.info("Sin actores que mostrar con los filtros actuales")


# ─────────────────────────────────────────────────────────────────────────────
# TAB 5 — PERFILES
# ─────────────────────────────────────────────────────────────────────────────

with tab_perfil:
    st.markdown("###  Perfiles de Actores")

    pc1, pc2 = st.columns([3, 1])
    with pc1:
        _todos = sorted(_actores_todos, key=lambda x: -x.get("poder", 0))
        actor_nombre_p = st.selectbox("Seleccionar actor", [a["nombre"] for a in _todos], key="perfil_actor")
    with pc2:
        if _SVC_OK and _SCRAPER_OK and st.button("Enriquecer Wikipedia", key="btn_wiki"):
            actor_sel = next((a for a in _todos if a["nombre"] == actor_nombre_p), None)
            if actor_sel:
                with st.spinner(f"Scrapeando {actor_sel['nombre']}…"):
                    try:
                        perfil_wiki = _scraper.wikipedia_perfil(
                            actor_sel["nombre"],
                            actor_sel.get("wikipedia_titulo", "")
                        )
                        if perfil_wiki:
                            actor_sel.update(perfil_wiki)
                            _svc.upsert_actor(actor_sel)
                            st.success(" Perfil enriquecido")
                            _load_metricas.clear()
                        else:
                            st.warning("No encontrado en Wikipedia")
                    except Exception as e:
                        st.error(f"Error: {e}")

    actor = next((a for a in _todos if a["nombre"] == actor_nombre_p), None)
    if not actor:
        actor = next((a for a in DEMO_ACTORES_FULL if a["nombre"] == actor_nombre_p), None)
    if not actor:
        st.info("Selecciona un actor")
    else:
        col_foto, col_info = st.columns([1, 3])

        with col_foto:
            foto_url = actor.get("foto_url", "")
            if foto_url:
                st.image(foto_url, width=160)
            else:
                c_av = _color_tipo(actor.get("tipo", ""))
                st.markdown(f"""
                <div style="width:140px;height:140px;border-radius:50%;
                            background:{c_av}22;border:2px solid {c_av};
                            display:flex;align-items:center;justify-content:center;font-size:3rem;">
                  {_icon_tipo(actor.get("tipo",""))}
                </div>""", unsafe_allow_html=True)

            m_a = _load_metricas()
            pgr_a = m_a.get("pagerank", {}).get(actor.get("id", ""), 0)
            btw_a = m_a.get("betweenness", {}).get(actor.get("id", ""), 0)
            deg_a = m_a.get("degree", {}).get(actor.get("id", ""), 0)
            com_a = m_a.get("comunidades", {}).get(actor.get("id", ""))

            for val, lbl in [(f"{pgr_a:.4f}", "PageRank"), (str(deg_a), "Conexiones"), (f"{btw_a:.4f}", "Betweenness")]:
                st.markdown(
                    f'<div class="metric-box"style="margin-top:.4rem;">'
                    f'<div class="metric-val">{val}</div>'
                    f'<div class="metric-lbl">{lbl}</div></div>',
                    unsafe_allow_html=True
                )
            if com_a is not None:
                cc = _COMM_COLORS[int(com_a) % len(_COMM_COLORS)]
                st.markdown(
                    f'<div class="metric-box"style="margin-top:.4rem;border-top-color:{cc};">'
                    f'<div class="metric-val"style="color:{cc};">#{com_a}</div>'
                    f'<div class="metric-lbl">Comunidad</div></div>',
                    unsafe_allow_html=True
                )

        with col_info:
            c_t = _color_tipo(actor.get("tipo", ""))
            st.markdown(f"""
            <div class="actor-card">
              <div class="actor-name">{actor.get("nombre","")}</div>
              <div class="actor-role">{actor.get("rol", actor.get("cargo",""))}</div>
              <div>
                {_actor_badge(actor.get("tipo",""))}
                <span class="tag"style="background:{BORDER};color:{TEXT2};">{actor.get("org", actor.get("partido",""))}</span>
                <span class="tag"style="background:{BORDER};color:{TEXT2};"> {actor.get("region","")}</span>
                <span class="tag"style="background:{AMBER}22;color:{AMBER};">! Poder {actor.get("poder",0)}/10</span>
              </div>
              {"<div style='margin-top:.4rem;font-size:.73rem;color:"+TEXT2+";'> "+actor.get("twitter","")+"</div>"if actor.get("twitter") else ""}
              {"<div style='margin-top:.3rem;font-size:.73rem;color:"+TEXT2+";'>"+actor.get("descripcion","")+"</div>"if actor.get("descripcion") else ""}
            </div>
            """, unsafe_allow_html=True)

            wiki_txt = actor.get("wikipedia_extracto", actor.get("extracto", actor.get("bio", "")))
            if wiki_txt:
                wiki_link = ""
                if actor.get("wikipedia_url"):
                    wiki_link = f"· <a href='{actor['wikipedia_url']}'target='_blank'style='color:{CYAN};'>ver artículo ↗</a>"
                st.markdown(f"""
                <div class="wiki-box">
                  <div style="font-size:.7rem;font-weight:700;color:{CYAN};margin-bottom:.4rem;"> Perfil {wiki_link}</div>
                  {wiki_txt[:600]}{"…"if len(wiki_txt)>600 else ""}
                </div>
                """, unsafe_allow_html=True)

            if _SVC_OK:
                try:
                    rels_a = _svc.get_relaciones(actor_id=actor["id"])
                    if rels_a:
                        st.markdown(f"** Conexiones ({len(rels_a)})**")
                        for r in sorted(rels_a, key=lambda x: -float(x.get("fuerza", 1)))[:12]:
                            otro_id = r["to"] if r["from"] == actor["id"] else r["from"]
                            otro = _svc.get_actor(otro_id)
                            if not otro:
                                continue
                            direction = "→" if r["from"] == actor["id"] else "←"
                            cr = _COLOR_REL.get(r.get("tipo", ""), MUTED)
                            st.markdown(f"""
                            <div class="conn-item">
                              <span>{_icon_tipo(otro.get("tipo",""))} {otro.get("nombre",otro_id)}</span>
                              <span style="display:flex;align-items:center;gap:.4rem;">
                                <span style="color:{cr};">{direction} {r.get("label","")}</span>
                                {_rel_badge(r.get("tipo",""))}
                              </span>
                            </div>
                            """, unsafe_allow_html=True)
                except Exception:
                    pass

            menciones = []
            if _SVC_OK:
                try:
                    menciones = _svc.get_menciones(actor_id=actor.get("id", ""), limit=6)
                except Exception:
                    pass
            if menciones:
                st.markdown(f"** Menciones recientes ({len(menciones)})**")
                for m in menciones:
                    st.markdown(f"""
                    <div style="font-size:.75rem;border-left:2px solid {CYAN};
                                padding-left:.6rem;margin-bottom:.3rem;color:{TEXT2};">
                      {m.get("titular","")[:120]}
                      <span style="color:{MUTED};"> — {m.get("medio","")}, {m.get("fecha","")[:10]}</span>
                    </div>
                    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 6 — RELACIONES
# ─────────────────────────────────────────────────────────────────────────────

with tab_rels:
    st.markdown("###  Explorer de Relaciones")

    if not _SVC_OK:
        st.info("actors_service no disponible — mostrando relaciones de demostración.")
        rels_demo_df = pd.DataFrame([
            {"Desde": next((a["nombre"] for a in DEMO_ACTORES_FULL if a["id"] == r["from"]), r["from"]),
             "Hasta": next((a["nombre"] for a in DEMO_ACTORES_FULL if a["id"] == r["to"]), r["to"]),
             "Tipo": r["tipo"], "Fuerza": r["fuerza"]}
            for r in DEMO_RELACIONES
        ])
        st.dataframe(rels_demo_df, use_container_width=True, height=320)

        cnt_demo = Counter(r["tipo"] for r in DEMO_RELACIONES)
        fig_hist_demo = go.Figure(go.Bar(
            x=list(cnt_demo.keys()), y=list(cnt_demo.values()),
            marker_color=[_COLOR_REL.get(t, MUTED) for t in cnt_demo.keys()],
        ))
        apply_plotly_theme(fig_hist_demo)
        fig_hist_demo.update_layout(height=220, margin=dict(l=0, r=0, t=20, b=0))
        st.plotly_chart(fig_hist_demo, use_container_width=True)
    else:
        rc1, rc2, rc3 = st.columns(3)
        with rc1:
            tipo_rel_f = st.selectbox("Tipo", ["Todas"] + list(_COLOR_REL.keys()), key="rel_tipo")
        with rc2:
            fuente_f = st.selectbox("Fuente", ["Todas", "manual", "rss", "wikipedia", "wikidata", "ner_ollama"], key="rel_fuente")
        with rc3:
            min_fuerza = st.slider("Fuerza mínima", 0.0, 10.0, 0.0, 0.5, key="rel_fuerza")

        _rels_all = _svc.get_relaciones(tipo=tipo_rel_f if tipo_rel_f != "Todas" else None)
        if fuente_f != "Todas":
            _rels_all = [r for r in _rels_all if r.get("fuente", "manual") == fuente_f]
        if min_fuerza > 0:
            _rels_all = [r for r in _rels_all if float(r.get("fuerza", 0)) >= min_fuerza]

        st.caption(f"Mostrando **{len(_rels_all)}** relaciones")

        if _rels_all:
            rows = []
            for r in _rels_all:
                a_f = _svc.get_actor(r.get("from", ""))
                a_t = _svc.get_actor(r.get("to", ""))
                rows.append({
                    "Desde": a_f.get("nombre", r.get("from", "")) if a_f else r.get("from", ""),
                    "Hasta": a_t.get("nombre", r.get("to", "")) if a_t else r.get("to", ""),
                    "Tipo": r.get("tipo", ""),
                    "Etiqueta": r.get("label", ""),
                    "Fuerza": float(r.get("fuerza", 1)),
                    "Fuente": r.get("fuente", "manual"),
                    "N.menciones": r.get("n_menciones", 0),
                })
            df_rels = pd.DataFrame(rows).sort_values("Fuerza", ascending=False)
            st.dataframe(df_rels, use_container_width=True, height=320)

            cnt = Counter(r.get("tipo", "") for r in _rels_all)
            fig_hist = go.Figure(go.Bar(
                x=list(cnt.keys()), y=list(cnt.values()),
                marker_color=[_COLOR_REL.get(t, MUTED) for t in cnt.keys()],
            ))
            apply_plotly_theme(fig_hist)
            fig_hist.update_layout(height=220, margin=dict(l=0, r=0, t=20, b=0))
            st.plotly_chart(fig_hist, use_container_width=True)

        with st.expander(" Añadir / editar relación manual"):
            _todos_n = sorted(_svc.get_actores(), key=lambda x: x.get("nombre", ""))
            ae1, ae2 = st.columns(2)
            with ae1:
                from_actor = st.selectbox("Desde", [a["nombre"] for a in _todos_n], key="new_rel_from")
            with ae2:
                to_actor = st.selectbox("Hasta", [a["nombre"] for a in _todos_n], key="new_rel_to")
            ae3, ae4, ae5 = st.columns(3)
            with ae3:
                new_tipo = st.selectbox("Tipo", list(_COLOR_REL.keys()), key="new_rel_tipo")
            with ae4:
                new_label = st.text_input("Etiqueta", key="new_rel_label")
            with ae5:
                new_fuerza = st.slider("Fuerza", 1.0, 10.0, 5.0, 0.5, key="new_rel_fuerza")

            if st.button("Guardar relación", key="btn_save_rel"):
                a_f2 = next((a for a in _todos_n if a["nombre"] == from_actor), None)
                a_t2 = next((a for a in _todos_n if a["nombre"] == to_actor), None)
                if a_f2 and a_t2 and a_f2["id"] != a_t2["id"]:
                    _svc.upsert_relacion({
                        "from": a_f2["id"], "to": a_t2["id"],
                        "tipo": new_tipo, "label": new_label,
                        "fuerza": new_fuerza, "fuente": "manual",
                    })
                    st.success(f" {from_actor} → {to_actor} guardada")
                    st.cache_data.clear()
                else:
                    st.error("Selecciona dos actores distintos")


# ─────────────────────────────────────────────────────────────────────────────
# TAB 7 — ANÁLISIS NETWORKX
# ─────────────────────────────────────────────────────────────────────────────

with tab_analisis:
    st.markdown("###  Análisis de Red — networkx")
    st.caption("Degree · Betweenness · PageRank · Closeness · Comunidades Louvain (greedy_modularity)")

    m = _load_metricas()
    ac1, ac2, ac3, ac4 = st.columns(4)
    for col, (val, lbl) in zip(
        [ac1, ac2, ac3, ac4],
        [(m.get("n_nodos", 0), "Nodos"), (m.get("n_aristas", 0), "Aristas"),
         (f"{m.get('densidad', 0):.4f}", "Densidad"), (m.get("n_comunidades", 0), "Comunidades")]
    ):
        with col:
            st.markdown(
                f'<div class="metric-box"><div class="metric-val">{val}</div>'
                f'<div class="metric-lbl">{lbl}</div></div>',
                unsafe_allow_html=True
            )

    st.markdown("")

    if _SVC_OK:
        metrica_sel = st.selectbox(
            "Métrica de centralidad",
            ["pagerank", "degree", "betweenness", "closeness"],
            format_func=lambda x: {"pagerank": "PageRank", "degree": "Grado",
                                   "betweenness": "Betweenness", "closeness": "Closeness"}[x],
            key="analisis_metrica",
        )
        top_n = st.slider("Top N", 5, 30, 15, key="analisis_topn")
        top_items = _svc.top_actores_por_metrica(metrica_sel, top_n)

        if top_items:
            labels, vals = zip(*top_items)
            nombres, colores = [], []
            for lid in labels:
                a = _svc.get_actor(lid)
                nombres.append(a["nombre"] if a else lid)
                colores.append(_color_tipo(a.get("tipo", "") if a else ""))

            fig_top = go.Figure(go.Bar(
                x=list(vals), y=nombres, orientation="h",
                marker_color=colores,
                text=[f"{v:.4f}" for v in vals], textposition="outside",
            ))
            apply_plotly_theme(fig_top)
            fig_top.update_layout(
                height=max(300, top_n * 28),
                margin=dict(l=0, r=80, t=10, b=0),
                yaxis=dict(autorange="reversed"),
            )
            st.plotly_chart(fig_top, use_container_width=True)

        st.markdown("####  Actores Puente — Brokers de Información")
        puentes = _svc.actores_puente()
        if puentes:
            p_cols = st.columns(min(4, len(puentes)))
            for i, p in enumerate(puentes[:8]):
                a = _svc.get_actor(p["id"])
                c = _color_tipo(a.get("tipo", "") if a else "")
                with p_cols[i % len(p_cols)]:
                    st.markdown(f"""
                    <div class="metric-box"style="border-top-color:{c};">
                      <div style="font-size:.9rem;font-weight:800;color:{TEXT};">
                        {_icon_tipo(a.get("tipo","") if a else "")} {p["nombre"]}
                      </div>
                      <div style="font-size:.65rem;color:{MUTED};">{a.get("org","") if a else ""}</div>
                      <div class="metric-val"style="font-size:1rem;margin-top:.4rem;">{p["betweenness"]:.4f}</div>
                      <div class="metric-lbl">Betweenness · {p["grado"]} conexiones</div>
                    </div>
                    """, unsafe_allow_html=True)
        else:
            st.info("Networkx no disponible o sin suficientes datos")

        st.markdown("####  Camino Más Corto entre Dos Actores")
        _todos_s = sorted(_svc.get_actores(), key=lambda x: x.get("nombre", ""))
        sp1, sp2 = st.columns(2)
        with sp1:
            actor_a_n = st.selectbox("Actor A", [a["nombre"] for a in _todos_s], key="path_a")
        with sp2:
            actor_b_n = st.selectbox("Actor B", [a["nombre"] for a in _todos_s], index=1, key="path_b")

        if st.button("Calcular camino", key="btn_path"):
            obj_a = next((a for a in _todos_s if a["nombre"] == actor_a_n), None)
            obj_b = next((a for a in _todos_s if a["nombre"] == actor_b_n), None)
            if obj_a and obj_b:
                path = _svc.camino_entre_actores(obj_a["id"], obj_b["id"])
                if path:
                    path_n = []
                    for pid in path:
                        pa = _svc.get_actor(pid)
                        path_n.append(f"**{pa['nombre']}**" if pa else pid)
                    st.success(f" Distancia: {len(path)-1} pasos")
                    st.markdown(" → ".join(path_n))
                else:
                    st.warning("No hay camino entre estos actores")

    else:
        # Demo con datos disponibles
        st.info("actors_service no disponible — mostrando análisis sobre datos de demostración.")
        pgr_demo = {a["id"]: a["influencia"] / 100 for a in DEMO_ACTORES_FULL}
        sorted_pgr = sorted(pgr_demo.items(), key=lambda x: -x[1])
        nombres_pgr = [next((a["nombre"] for a in DEMO_ACTORES_FULL if a["id"] == k), k) for k, v in sorted_pgr]
        vals_pgr = [v for k, v in sorted_pgr]
        cols_pgr = [COLORES_PARTIDOS.get(next((a.get("partido", CYAN) for a in DEMO_ACTORES_FULL if a["id"] == k), ""), CYAN) for k, v in sorted_pgr]

        fig_demo_pgr = go.Figure(go.Bar(
            x=vals_pgr, y=nombres_pgr, orientation="h",
            marker_color=cols_pgr,
            text=[f"{v:.2f}" for v in vals_pgr], textposition="outside",
        ))
        apply_plotly_theme(fig_demo_pgr)
        fig_demo_pgr.update_layout(
            height=350, margin=dict(l=0, r=80, t=10, b=0),
            yaxis=dict(autorange="reversed"),
            title="Influencia relativa (demo)",
        )
        st.plotly_chart(fig_demo_pgr, use_container_width=True)

    # Scatter PageRank vs Betweenness
    st.markdown("####  PageRank vs Betweenness")
    _all_a = _actores_todos if _actores_todos else DEMO_ACTORES_FULL
    sdata = [{
        "nombre": a.get("nombre", a.get("id", "")),
        "tipo": a.get("tipo", "politico"),
        "poder": a.get("poder", 5),
        "pagerank": m.get("pagerank", {}).get(a.get("id", ""), a.get("influencia", 50) / 100),
        "betweenness": m.get("betweenness", {}).get(a.get("id", ""), a.get("riesgo", 30) / 200),
    } for a in _all_a]
    df_sc = pd.DataFrame(sdata)

    if not df_sc.empty and df_sc["pagerank"].sum() > 0:
        fig_sc = px.scatter(
            df_sc, x="pagerank", y="betweenness",
            color="tipo", size="poder", hover_name="nombre",
            color_discrete_map=_COLOR_TIPO,
        )
        apply_plotly_theme(fig_sc)
        fig_sc.update_layout(
            height=380, margin=dict(l=0, r=0, t=20, b=0),
            legend=dict(bgcolor=BG3, bordercolor=BORDER),
        )
        st.plotly_chart(fig_sc, use_container_width=True)


# ─────────────────────────────────────────────────────────────────────────────
# TAB 8 — ACTUALIZACIÓN
# ─────────────────────────────────────────────────────────────────────────────

with tab_update:
    st.markdown("###  Motor de Actualización Dinámica")
    st.caption("Worker background · Scraping Wikipedia/Wikidata · NER RSS · Relaciones inferidas")

    if not _SVC_OK:
        st.warning("actors_service no disponible — la actualización dinámica requiere el servicio.")
    else:
        est = _svc.estado_worker_actores()

        uw1, uw2, uw3 = st.columns(3)
        with uw1:
            w_running = est.get("running", False)
            if w_running:
                st.markdown(f'<div style="color:{GREEN};font-weight:800;">● Worker activo</div>', unsafe_allow_html=True)
                if st.button("⏹ Detener worker", key="btn_stop"):
                    _svc.detener_worker_actores()
                    st.info("Worker detenido")
                    st.rerun()
            else:
                st.markdown(f'<div style="color:{MUTED};font-weight:800;">⏸ Worker parado</div>', unsafe_allow_html=True)
                if st.button("▶ Iniciar worker", key="btn_start"):
                    _svc.iniciar_worker_actores()
                    st.success("Worker iniciado")
                    st.rerun()
        with uw2:
            st.metric("Actores en store", est.get("n_actores", 0))
            st.metric("Relaciones totales", est.get("n_relaciones", 0))
        with uw3:
            st.metric("Menciones", est.get("n_menciones", 0))
            ultima = est.get("meta", {}).get("ultima_actualizacion", "")
            if ultima:
                st.caption(f"Última actualiz.: {ultima[:19]}")

        proximas = est.get("proximas", {})
        if proximas:
            st.markdown("** Próximas ejecuciones:**")
            df_prx = pd.DataFrame([
                {"Tarea": k, "En (s)": max(0, v), "En (min)": round(max(0, v) / 60, 1)}
                for k, v in proximas.items()
            ])
            st.dataframe(df_prx, hide_index=True, use_container_width=True, height=140)

        st.markdown("#### ! Actualización Manual por Módulo")
        mu1, mu2, mu3 = st.columns(3)
        with mu1:
            if st.button("Menciones RSS", key="btn_mencion"):
                with st.spinner("Scrapeando menciones…"):
                    n = _svc.ejecutar_actualizacion_manual("menciones_rss")
                st.success(f" {n} menciones nuevas")
                st.cache_data.clear()
        with mu2:
            if st.button("Inferir relaciones RSS", key="btn_rel"):
                with st.spinner("Analizando co-menciones…"):
                    n = _svc.ejecutar_actualizacion_manual("relaciones_rss")
                st.success(f" {n} relaciones inferidas")
                st.cache_data.clear()
        with mu3:
            if st.button("Enriquecer Wikipedia (lote)", key="btn_wiki_lote"):
                with st.spinner("Enriqueciendo lote de 5 actores…"):
                    n = _svc.ejecutar_actualizacion_manual("enriquecimiento")
                st.success(f" {n} actores enriquecidos")
                st.cache_data.clear()

        st.markdown("####  Enriquecimiento Individual")
        _todos_e = sorted(_svc.get_actores(), key=lambda x: x.get("nombre", ""))
        enr1, enr2 = st.columns([3, 1])
        with enr1:
            actor_enr_n = st.selectbox("Actor a enriquecer", [a["nombre"] for a in _todos_e], key="actor_enr")
        with enr2:
            force_r = st.checkbox("Forzar refresh", key="enr_force")

        if _SCRAPER_OK:
            if st.button("Enriquecer este actor", key="btn_enr_ind"):
                actor_enr = next((a for a in _todos_e if a["nombre"] == actor_enr_n), None)
                if actor_enr:
                    with st.spinner(f"Enriqueciendo {actor_enr['nombre']}…"):
                        enriquecidos = _scraper.enriquecer_lote([actor_enr], max_actores=1, force=force_r)
                        for ae in enriquecidos:
                            _svc.upsert_actor(ae)
                        if enriquecidos:
                            res = enriquecidos[0]
                            st.success(f" {actor_enr['nombre']} actualizado")
                            if res.get("extracto"):
                                st.markdown(
                                    f'<div class="wiki-box"><b>Wikipedia:</b> {res["extracto"][:400]}…</div>',
                                    unsafe_allow_html=True
                                )
                        else:
                            st.warning("Sin datos adicionales encontrados")
                    st.cache_data.clear()

            st.markdown("####  Descarga Bulk — Wikidata SPARQL")
            if st.button("⬇ Descargar políticos de Wikidata", key="btn_wikidata"):
                with st.spinner("Consultando Wikidata (10-20s)…"):
                    wd_pol = _scraper.wikidata_politicos_espana()
                if wd_pol:
                    st.success(f" {len(wd_pol)} políticos encontrados")
                    df_wd = pd.DataFrame(wd_pol)
                    st.dataframe(
                        df_wd[["nombre", "partido", "cargo", "nacimiento"]].head(30),
                        use_container_width=True, height=300
                    )
                else:
                    st.warning("Sin respuesta de Wikidata")
        else:
            st.info("actors_scraper no disponible")

        log_entries = est.get("log", [])
        if log_entries:
            st.markdown("####  Log de Operaciones")
            for entry in log_entries[:20]:
                ok = entry.get("ok", True)
                info = (f" — {entry.get('error','')}" if not ok and entry.get("error")
                        else f" ({entry.get('n', 0)} items)")
                st.markdown(f"""
                <div class="log-row">
                  <span class="{'log-ok'if ok else 'log-err'}">{''if ok else ''}</span>
                  <span style="color:{MUTED};">[{entry.get("ts","")[:19]}]</span>
                  <span style="color:{TEXT2};"> {entry.get("tipo","")}{info}</span>
                </div>
                """, unsafe_allow_html=True)

        if st.button("Reset a datos seed", key="btn_reset", type="secondary"):
            _svc.reset_a_seed()
            st.cache_data.clear()
            st.success(" Store reseteado a datos base")
            st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
# TAB 9 — QUERY IA
# ─────────────────────────────────────────────────────────────────────────────

with tab_query:
    st.markdown("###  Motor de Consulta IA — Ollama Local")
    st.caption("Consulta libre · NER de noticias · Ficha ejecutiva · Analisis de relacion")

    if not _LLM_OK:
        st.warning(" Ollama no disponible — `ollama serve` para activarlo")
    else:
        st.success("● Ollama activo")

    qt1, qt2, qt3, qt4, qt5 = st.tabs([
        "Consulta libre",
        "NER — Extraer actores",
        "Ficha de actor IA",
        "Analisis de relacion",
        "Normativa + Herramientas",
    ])

    with qt1:
        st.markdown("####  Consulta en lenguaje natural sobre el grafo")
        _preguntas = [
            "¿Quién tiene más influencia en el grafo político actual?",
            "¿Qué actores conectan el bloque gubernamental con los medios?",
            "¿Cuáles son los principales brokers de información entre bloques?",
            "¿Qué lobbies tienen mayor acceso al Gobierno de Sánchez?",
            "¿Qué actores tienen relaciones adversariales con el PP?",
            "Explica las comunidades detectadas en el grafo",
        ]
        for pq in _preguntas:
            if st.button(f" {pq}", key=f"pq_{hash(pq)}"):
                st.session_state["qia_input"] = pq

        pregunta = st.text_area(
            "Tu pregunta",
            value=st.session_state.get("qia_input", ""),
            height=90, key="qia_input_area",
            placeholder="Ej: ¿Qué actores conectan a Puigdemont con el Gobierno?",
        )

        if st.button("Consultar", key="btn_query", disabled=not _LLM_OK):
            if pregunta.strip():
                m_ctx = _load_metricas()
                contexto = (
                    "GRAFO POLÍTICO ESPAÑOL — 8 actores principales:\n"
                    + "\n".join(
                        f"• {a['nombre']} ({a.get('partido',a.get('org',''))}) — "
                        f"Influencia {a.get('influencia',0)}/100, Sentimiento {a.get('sentimiento',0):+.2f}"
                        for a in DEMO_ACTORES_FULL
                    )
                )
                sistema = ("Eres un analista experto en política española con acceso a un grafo "
                           "de relaciones entre actores. Responde en español, conciso y preciso.")

                with st.spinner("Analizando con IA…"):
                    try:
                        try:
                            respuesta = _llm.chat_legislativo(
                                pregunta, contexto=contexto,
                                herramientas=["actor_relaciones", "boe_search"],
                            )
                        except AttributeError:
                            respuesta = _llm.chat(pregunta, contexto=contexto, sistema=sistema, modo="normal")
                    except Exception as e:
                        respuesta = f"Error: {e}"

                st.markdown(f'<div class="chat-msg">{respuesta}</div>', unsafe_allow_html=True)
                st.session_state.setdefault("qia_historia", []).append(
                    {"q": pregunta, "a": respuesta, "ts": time.strftime("%H:%M")}
                )

        if st.session_state.get("qia_historia"):
            with st.expander(f"Historial ({len(st.session_state['qia_historia'])} consultas)"):
                for item in reversed(st.session_state["qia_historia"][-8:]):
                    st.markdown(f"**[{item['ts']}]** {item['q']}")
                    st.markdown(
                        f'<div class="chat-msg">{item["a"][:300]}{"…"if len(item["a"])>300 else ""}</div>',
                        unsafe_allow_html=True
                    )

    with qt2:
        st.markdown("####  NER — Extracción de Actores y Relaciones desde Texto")
        _ejemplos_ner = [
            "Pedro Sánchez y Yolanda Díaz discrepan sobre la reforma de las pensiones ante las presiones de CEOE y los sindicatos.",
            "Isabel Díaz Ayuso acusa a Sánchez de favorecer a Iberdrola con la regulación energética, mientras el PP de Feijóo exige transparencia.",
            "Junts per Catalunya, liderado por Puigdemont, anuncia que retirará su apoyo al gobierno si no avanza la negociación sobre Catalunya.",
        ]
        for ej in _ejemplos_ner:
            if st.button(f" {ej[:65]}…", key=f"ner_ej_{hash(ej)}"):
                st.session_state["ner_texto"] = ej

        texto_ner = st.text_area(
            "Texto a analizar",
            value=st.session_state.get("ner_texto", ""),
            height=130, key="ner_texto_area",
            placeholder="Pega un titular o párrafo de noticia política española…",
        )

        if st.button("Extraer entidades y relaciones", key="btn_ner", disabled=not _LLM_OK):
            txt = texto_ner.strip()
            if txt:
                actores_bbdd = [a["nombre"] for a in (_actores_todos or DEMO_ACTORES_FULL)][:35]
                prompt_ner = f"""Analiza el texto político español y extrae entidades y relaciones.

Texto: "{txt}"

Tipos de relación válidos: {list(_COLOR_REL.keys())}
Actores en base de datos: {', '.join(actores_bbdd[:20])}

Responde SOLO con JSON válido (sin texto adicional):
{{
  "entidades": [
    {{"nombre": "...", "tipo": "persona|partido|organizacion", "en_bbdd": true}}
  ],
  "relaciones": [
    {{"sujeto": "...", "tipo": "...", "objeto": "...", "descripcion": "..."}}
  ],
  "resumen": "una frase sobre la noticia en clave política"
}}"""

                with st.spinner("Extrayendo entidades…"):
                    resp_ner = _llm.chat(prompt_ner,
                                         sistema="Eres un sistema NER político. Devuelve SOLO JSON.",
                                         modo="fast")

                try:
                    import re as _re
                    jm = _re.search(r'\{.*\}', resp_ner, _re.DOTALL)
                    ner_data = json.loads(jm.group() if jm else resp_ner)

                    resumen = ner_data.get("resumen", "")
                    if resumen:
                        st.info(f" {resumen}")

                    entidades = ner_data.get("entidades", [])
                    if entidades:
                        st.markdown("**Entidades detectadas:**")
                        chips = ""
                        for e in entidades:
                            bg = CYAN if e.get("en_bbdd") else AMBER
                            chips += f'<span class="ner-chip"style="background:{bg}22;color:{bg};">{e["nombre"]} <small>({e.get("tipo","")})</small></span>'
                        st.markdown(chips, unsafe_allow_html=True)

                    rels_ner = ner_data.get("relaciones", [])
                    if rels_ner:
                        st.markdown("**Relaciones inferidas:**")
                        for r_n in rels_ner:
                            cr = _COLOR_REL.get(r_n.get("tipo", ""), MUTED)
                            st.markdown(f"""
                            <div class="conn-item">
                              <span style="font-weight:700;">{r_n.get("sujeto","")}</span>
                              <span style="color:{cr};">→ {r_n.get("tipo","")} →</span>
                              <span style="font-weight:700;">{r_n.get("objeto","")}</span>
                              <span style="color:{MUTED};font-size:.72rem;">{r_n.get("descripcion","")}</span>
                            </div>
                            """, unsafe_allow_html=True)

                        if _SVC_OK and st.button("Añadir relaciones al grafo", key="btn_save_ner"):
                            _ids = {a["nombre"]: a["id"] for a in _svc.get_actores()}
                            n_s = 0
                            for r_n in rels_ner:
                                fid = _ids.get(r_n.get("sujeto", ""))
                                tid = _ids.get(r_n.get("objeto", ""))
                                if fid and tid:
                                    _svc.upsert_relacion({
                                        "from": fid, "to": tid,
                                        "tipo": r_n.get("tipo", "adversarial"),
                                        "label": r_n.get("descripcion", "")[:60],
                                        "fuerza": 3.0, "fuente": "ner_ollama",
                                    })
                                    n_s += 1
                            st.success(f" {n_s} relaciones añadidas")
                            st.cache_data.clear()

                except Exception:
                    st.markdown(f'<div class="chat-msg">{resp_ner}</div>', unsafe_allow_html=True)

    with qt3:
        st.markdown("####  Ficha Ejecutiva de Actor")
        st.caption("Briefing completo generado por Ollama con datos del grafo")

        _todos_f = sorted(DEMO_ACTORES_FULL, key=lambda x: -x.get("poder", 0))
        if _SVC_OK:
            try:
                _todos_f_svc = sorted(_svc.get_actores(), key=lambda x: -x.get("poder", 0))
                if _todos_f_svc:
                    _todos_f = _todos_f_svc
            except Exception:
                pass

        ficha_n = st.selectbox("Actor", [a["nombre"] for a in _todos_f], key="ficha_actor")

        if st.button("Generar ficha ejecutiva", key="btn_ficha", disabled=not _LLM_OK):
            actor_f = next((a for a in _todos_f if a["nombre"] == ficha_n), None)
            if actor_f:
                m_f = _load_metricas()
                pgr_f = m_f.get("pagerank", {}).get(actor_f.get("id", ""), actor_f.get("influencia", 50) / 100)
                btw_f = m_f.get("betweenness", {}).get(actor_f.get("id", ""), 0)
                deg_f = m_f.get("degree", {}).get(actor_f.get("id", ""), 0)
                com_f = m_f.get("comunidades", {}).get(actor_f.get("id", ""))
                wiki_e = actor_f.get("bio", actor_f.get("wikipedia_extracto", actor_f.get("extracto", "")))

                prompt_f = f"""Genera una ficha ejecutiva para analistas sobre este actor político español:

DATOS: {actor_f.get("nombre","")} | {actor_f.get("rol", actor_f.get("cargo",""))} | {actor_f.get("org", actor_f.get("partido",""))} | Poder {actor_f.get("poder",0)}/10
MÉTRICAS RED: Influencia {actor_f.get("influencia",0)}/100 | PageRank {pgr_f:.4f} | Betweenness {btw_f:.4f} | Conexiones {deg_f} | Comunidad #{com_f}
SENTIMIENTO: {actor_f.get("sentimiento",0):+.2f} | Tendencia: {actor_f.get("tendencia","estable")}
ESCAÑOS PARTIDO: {actor_f.get("escanos_partido",0)}
PERFIL: {wiki_e[:400] if wiki_e else "Sin datos"}

Estructura:
1. **Quién es** (2-3 frases)
2. **Influencia real en el grafo** (posición, relevancia)
3. **Relaciones estratégicas clave** (top 3)
4. **Riesgos y oportunidades** para terceros
5. **Palancas de acceso** (cómo interactuar con este actor)

Español. Analítico. Orientado a decisores."""

                with st.spinner(f"Generando ficha de {ficha_n}…"):
                    try:
                        ficha_txt = _llm.chat(prompt_f,
                                              sistema="Eres un analista político de alto nivel especializado en España.",
                                              modo="normal")
                        st.markdown(f'<div class="chat-msg">{ficha_txt}</div>', unsafe_allow_html=True)
                    except Exception as e:
                        st.error(f"Error LLM: {e}")

    with qt4:
        st.markdown("####  Analisis de Relacion entre Dos Actores")
        st.caption("Solidez · Historia · Palancas de negociacion · Escenarios futuros")

        _todos_b = sorted(DEMO_ACTORES_FULL, key=lambda x: -x.get("poder", 0))
        br1, br2 = st.columns(2)
        with br1:
            b_a_n = st.selectbox("Actor A", [a["nombre"] for a in _todos_b], key="brief_a")
        with br2:
            b_b_n = st.selectbox("Actor B", [a["nombre"] for a in _todos_b], index=1, key="brief_b")

        if st.button("Analizar relacion", key="btn_briefing", disabled=not _LLM_OK):
            obj_a = next((a for a in _todos_b if a["nombre"] == b_a_n), None)
            obj_b = next((a for a in _todos_b if a["nombre"] == b_b_n), None)
            if obj_a and obj_b:
                # Buscar relación directa en demo
                rel_directa = next(
                    (r for r in DEMO_RELACIONES
                     if (r["from"] == obj_a.get("id") and r["to"] == obj_b.get("id")) or
                        (r["from"] == obj_b.get("id") and r["to"] == obj_a.get("id"))),
                    None
                )
                tipo_rel = rel_directa["tipo"] if rel_directa else "sin relación directa"
                fuerza_rel = rel_directa.get("fuerza", 0) if rel_directa else 0

                prompt_br = f"""Analiza la relación entre:
A: {obj_a.get("nombre","")} — {obj_a.get("rol", obj_a.get("cargo",""))} ({obj_a.get("org", obj_a.get("partido",""))}) · Poder {obj_a.get("poder",0)}/10
B: {obj_b.get("nombre","")} — {obj_b.get("rol", obj_b.get("cargo",""))} ({obj_b.get("org", obj_b.get("partido",""))}) · Poder {obj_b.get("poder",0)}/10

RELACIÓN EN EL GRAFO: {tipo_rel} (fuerza: {fuerza_rel}/10)
SENTIMIENTO A: {obj_a.get("sentimiento",0):+.2f} | SENTIMIENTO B: {obj_b.get("sentimiento",0):+.2f}

Analiza:
1. **Naturaleza** (alianza, tensión, dependencia, competencia)
2. **Contexto histórico** de esta relación
3. **Solidez**: ¿estable o frágil? ¿qué la rompería?
4. **Palancas de negociación**: ¿qué tiene cada uno que el otro necesita?
5. **Escenarios futuros** (6 meses)

Español. Accionable."""

                with st.spinner(f"Analizando relación {b_a_n} ↔ {b_b_n}…"):
                    try:
                        br_txt = _llm.chat(prompt_br,
                                           sistema="Eres analista de relaciones de poder en política española.",
                                           modo="normal")
                        st.markdown(f'<div class="chat-msg">{br_txt}</div>', unsafe_allow_html=True)
                    except Exception as e:
                        st.error(f"Error LLM: {e}")

    with qt5:
        st.markdown("####  Consulta con Herramientas Legislativas")
        st.caption("Accede al BOE, EUR-Lex, AI Act compliance y votaciones del Congreso")

        _herr_opts = {
            "BOE — Legislación española": "boe_search",
            "BOE — Sumario del día": "boe_sumario",
            "EUR-Lex — Normativa UE": "euparl_query",
            "AI Act — Cumplimiento IA": "ai_act_compliance",
            "Congreso — Votaciones recientes": "congreso_votaciones",
            "Actores — Red de relaciones": "actor_relaciones",
        }

        _herr_sel = st.multiselect(
            "Herramientas activas",
            options=list(_herr_opts.keys()),
            default=list(_herr_opts.keys())[:3],
            key="qt5_herramientas",
        )
        _herr_ids = [_herr_opts[h] for h in _herr_sel]

        _preguntas_leg = [
            "¿Qué normativa española regula la inteligencia artificial?",
            "¿Cuáles son los últimos reglamentos UE aprobados sobre datos?",
            "¿Cómo ha votado el PP las últimas leyes laborales?",
            "Resume la actividad legislativa de esta semana en España",
        ]
        for _pq_leg in _preguntas_leg:
            if st.button(f" {_pq_leg}", key=f"pqleg_{hash(_pq_leg)}"):
                st.session_state["qt5_pregunta"] = _pq_leg

        _pregunta_leg = st.text_area(
            "Pregunta con acceso a fuentes legislativas",
            value=st.session_state.get("qt5_pregunta", ""),
            height=90, key="qt5_pregunta_area",
            placeholder="Ej: ¿Qué dice la normativa española sobre IA?",
        )

        if st.button("Consultar con herramientas", key="btn_qt5_query", disabled=not _LLM_OK):
            if _pregunta_leg.strip():
                with st.spinner("Consultando fuentes legislativas…"):
                    try:
                        try:
                            respuesta_leg = _llm.chat_legislativo(
                                _pregunta_leg,
                                herramientas=_herr_ids if _herr_ids else None,
                            )
                        except AttributeError:
                            respuesta_leg = _llm.chat(_pregunta_leg)
                    except Exception as e:
                        respuesta_leg = f"Error: {e}"
                st.markdown(f'<div class="chat-msg">{respuesta_leg}</div>', unsafe_allow_html=True)
                st.session_state.setdefault("qt5_historia", []).append(
                    {"q": _pregunta_leg, "a": respuesta_leg, "ts": time.strftime("%H:%M")}
                )

        if st.session_state.get("qt5_historia"):
            with st.expander(f"Historial ({len(st.session_state['qt5_historia'])} consultas)"):
                for _item in reversed(st.session_state["qt5_historia"][-5:]):
                    st.markdown(f"**[{_item['ts']}]** {_item['q']}")
                    st.markdown(
                        f'<div class="chat-msg">{_item["a"][:400]}{"…"if len(_item["a"])>400 else ""}</div>',
                        unsafe_allow_html=True,
                    )


# ─────────────────────────────────────────────────────────────────────────────
# AUTO-INICIAR WORKER
# ─────────────────────────────────────────────────────────────────────────────

if _SVC_OK:
    try:
        if not _svc.estado_worker_actores().get("running", False):
            _svc.iniciar_worker_actores()
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# TAB 10 — RIESGO OSINT (Bloque 4)
# ─────────────────────────────────────────────────────────────────────────────

with tab_risk:
    section_header("OSINT & RISK GRAPH", RED)

    if not _RISK_OK:
        st.info(
            "Módulo OSINT/Risk no disponible. "
            "Ejecuta la migración 0041 y el pipeline con:\n\n"
            "```bash\nalembic upgrade head\npython -m pipelines.osint_core --source all\n```"
        )
    else:
        # KPIs
        _risk_kpis = _arc_kpis()

        if not _risk_kpis.get("hay_datos", False):
            st.warning(
                "No hay datos OSINT en BD. "
                "Carga datos con: `python -m pipelines.osint_core --source opensanctions --file data/raw/...`"
            )
        else:
            kr1, kr2, kr3, kr4, kr5 = st.columns(5)
            with kr1:
                st.markdown(kpi_card(
                    "Entidades", str(_risk_kpis.get("total_entities", 0)),
                    "en grafo de riesgo", color=CYAN,
                ), unsafe_allow_html=True)
            with kr2:
                st.markdown(kpi_card(
                    "Críticas", str(_risk_kpis.get("critical_count", 0)),
                    "score ≥ 71", color=RED,
                ), unsafe_allow_html=True)
            with kr3:
                st.markdown(kpi_card(
                    "PEPs", str(_risk_kpis.get("pep_count", 0)),
                    "políticamente expuestas", color=AMBER,
                ), unsafe_allow_html=True)
            with kr4:
                st.markdown(kpi_card(
                    "Sancionadas", str(_risk_kpis.get("sanctioned_count", 0)),
                    "en listas de sanciones", color=RED,
                ), unsafe_allow_html=True)
            with kr5:
                st.markdown(kpi_card(
                    "Pendientes revisión", str(_risk_kpis.get("pending_identities", 0)),
                    "identidades sin verificar", color=PURPLE,
                ), unsafe_allow_html=True)

        st.markdown("---")

        # Sub-tabs de riesgo
        rtab_top, rtab_search, rtab_pending = st.tabs([
            "Top Riesgo", "Búsqueda", "Revisión Manual",
        ])

        with rtab_top:
            section_header("ENTIDADES CON MAYOR RIESGO", RED)
            _df_top = _arc_top(limit=20)
            if _df_top is not None and not _df_top.empty:
                _display_cols = [c for c in [
                    "name", "entity_type", "risk_score",
                    "pep_status", "sanctions_status", "countries", "source",
                ] if c in _df_top.columns]
                st.dataframe(_df_top[_display_cols], use_container_width=True)
            else:
                st.info("No hay entidades de riesgo cargadas todavía.")

        with rtab_search:
            section_header("BÚSQUEDA DE ENTIDADES", CYAN)
            _risk_query = st.text_input(
                "Buscar entidad por nombre",
                placeholder="Ej: Banco Santander, Pedro Sánchez…",
                key="risk_entity_search",
            )
            if _risk_query and len(_risk_query) >= 3:
                _df_search = _arc_buscar(_risk_query, limit=10)
                if _df_search is not None and not _df_search.empty:
                    for _, _row in _df_search.iterrows():
                        _score = float(_row.get("risk_score", 0) or 0)
                        _score_color = RED if _score >= 71 else (AMBER if _score >= 46 else GREEN)
                        _pep = "PEP" if _row.get("pep_status") else ""
                        _sanc = "SANCIONADO" if _row.get("sanctions_status") else ""
                        _badges = " ".join(b for b in [_pep, _sanc] if b)
                        _badge_html = (
                            f'&nbsp;<span style="font-size:.6rem;font-weight:700;color:{RED}">{_badges}</span>'
                            if _badges else ""
                        )
                        st.markdown(
                            f'<div style="background:{BG2};border:1px solid {BORDER};'
                            f'border-radius:8px;padding:.8rem 1rem;margin-bottom:.5rem">'
                            f'<div style="display:flex;justify-content:space-between;align-items:center">'
                            f'<div>'
                            f'<span style="font-weight:800;color:{TEXT}">{_row.get("name","")}</span>'
                            f'&nbsp;<span style="font-size:.65rem;color:{MUTED}">{_row.get("entity_type","")}</span>'
                            f'{_badge_html}'
                            f'</div>'
                            f'<div style="font-size:1.1rem;font-weight:900;color:{_score_color};'
                            f'font-family:\'JetBrains Mono\',monospace">{_score:.0f}</div>'
                            f'</div>'
                            f'</div>',
                            unsafe_allow_html=True,
                        )
                else:
                    st.info(f"No se encontraron entidades para '{_risk_query}'.")
            elif _risk_query:
                st.caption("Escribe al menos 3 caracteres.")

        with rtab_pending:
            section_header("IDENTIDADES SOCIALES PENDIENTES DE VERIFICACIÓN", AMBER)
            st.caption(
                "Estos perfiles son candidatos generados automáticamente. "
                "Requieren revisión manual antes de ser usados en análisis."
            )
            _df_pend = _arc_id_pendientes(limit=50)
            if _df_pend is not None and not _df_pend.empty:
                _pend_cols = [c for c in [
                    "entity_name", "platform", "handle", "profile_url",
                    "confidence", "discovery_method", "created_at",
                ] if c in _df_pend.columns]
                st.dataframe(_df_pend[_pend_cols], use_container_width=True)
                st.caption(
                    f"{len(_df_pend)} identidades pendientes. "
                    "Verifica manualmente antes de dar por correctas."
                )
            else:
                st.info("No hay identidades pendientes de verificación.")
