"""
ELECTSIM — Mapa de Actores
============================
Red de actores politicos, empresariales, mediaticos y de influencia en Espana.
Grafo force-directed con pyvis, perfiles detallados, analisis de red y
consultas en lenguaje natural via IA.
"""
from __future__ import annotations
import sys
import html
import json
import random
from collections import Counter
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card, COLORES_PARTIDOS,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Mapa de Actores — Politeia",
    page_icon="🕸️",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()
mostrar_alertas_pagina("D2_Actores")

# ── Servicios ─────────────────────────────────────────────────────────────────
try:
    from dashboard.services import llm_local as _llm
    _LLM_OK = _llm.esta_disponible()
except Exception:
    _LLM_OK = False

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
[data-testid="stAppViewContainer"] {{background: {BG};}}
.actor-profile-header {{
  background: linear-gradient(135deg, {BG2}, {BG3});
  border: 1px solid {BORDER}; border-radius: 14px;
  padding: 1.2rem 1.5rem; margin-bottom: 1rem;
  display: flex; align-items: center; gap: 1.2rem;
}}
.actor-avatar {{
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; font-weight: 900; flex-shrink: 0;
}}
.actor-name {{
  font-size: 1.1rem; font-weight: 900; color: {TEXT}; margin-bottom: .2rem;
}}
.actor-role {{
  font-size: .75rem; color: {TEXT2}; margin-bottom: .2rem;
}}
.actor-tags {{display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .3rem;}}
.tag {{
  font-size: .58rem; font-weight: 800; letter-spacing: .07em;
  text-transform: uppercase; border-radius: 5px; padding: 2px 7px;
}}
.connection-item {{
  background: {BG2}; border: 1px solid {BORDER};
  border-radius: 8px; padding: .55rem .85rem; margin-bottom: .35rem;
  display: flex; align-items: center; justify-content: space-between;
  font-size: .78rem;
}}
.mention-bar-row {{
  display: flex; align-items: center; gap: .5rem; margin-bottom: .3rem;
}}
.mention-bar-bg {{
  flex: 1; height: 6px; background: {BORDER}; border-radius: 3px; overflow: hidden;
}}
.chat-box {{
  background: linear-gradient(135deg, {CYAN}08, {BG2});
  border: 1px solid {CYAN}33; border-radius: 12px;
  padding: 1rem 1.2rem; margin-bottom: .5rem;
  font-size: .85rem; color: {TEXT}; line-height: 1.6;
}}
.centrality-card {{
  background: {BG2}; border: 1px solid {BORDER};
  border-top: 2px solid {PURPLE};
  border-radius: 10px; padding: .8rem 1rem;
  text-align: center;
}}
</style>
""", unsafe_allow_html=True)

# ── Datos de actores ──────────────────────────────────────────────────────────
# tipo: politico | empresarial | mediatico | influencia
# color: segun tipo
_COLOR_MAP = {
    "politico":    CYAN,
    "empresarial": AMBER,
    "mediatico":   GREEN,
    "influencia":  PURPLE,
}
_ICON_MAP = {
    "politico":    "🏛️",
    "empresarial": "🏢",
    "mediatico":   "📰",
    "influencia":  "🔮",
}

ACTORES: list[dict] = [
    # ── Politicos ─────────────────────────────────────────────────────────────
    {"id": "sanchez",      "nombre": "Pedro Sanchez",             "tipo": "politico",    "org": "PSOE",   "rol": "Presidente del Gobierno",              "poder": 10, "region": "Nacional"},
    {"id": "feijoo",       "nombre": "Alberto N. Feijoo",         "tipo": "politico",    "org": "PP",     "rol": "Lider de la Oposicion / PP",           "poder": 9,  "region": "Nacional"},
    {"id": "abascal",      "nombre": "Santiago Abascal",          "tipo": "politico",    "org": "VOX",    "rol": "Secretario General VOX",               "poder": 7,  "region": "Nacional"},
    {"id": "diaz_y",       "nombre": "Yolanda Diaz",              "tipo": "politico",    "org": "SUMAR",  "rol": "Ministra Trabajo / Lider SUMAR",        "poder": 7,  "region": "Nacional"},
    {"id": "puigdemont",   "nombre": "Carles Puigdemont",         "tipo": "politico",    "org": "JUNTS",  "rol": "Lider JUNTS (exilio)",                 "poder": 8,  "region": "Cataluna"},
    {"id": "junqueras",    "nombre": "Oriol Junqueras",           "tipo": "politico",    "org": "ERC",    "rol": "Lider ERC",                            "poder": 6,  "region": "Cataluna"},
    {"id": "urkullu",      "nombre": "Inigo Urkullu",             "tipo": "politico",    "org": "PNV",    "rol": "Lendakari / PNV",                      "poder": 7,  "region": "Pais Vasco"},
    {"id": "otegi",        "nombre": "Arnaldo Otegi",             "tipo": "politico",    "org": "EH Bildu","rol": "Coordinador EH Bildu",               "poder": 6,  "region": "Pais Vasco"},
    {"id": "mazon",        "nombre": "Carlos Mazon",              "tipo": "politico",    "org": "PP",     "rol": "Pres. Generalitat Valenciana",         "poder": 5,  "region": "Valencia"},
    {"id": "ayuso",        "nombre": "Isabel D. Ayuso",           "tipo": "politico",    "org": "PP",     "rol": "Presidenta Comunidad Madrid",          "poder": 8,  "region": "Madrid"},
    {"id": "moreno",       "nombre": "Juan Manuel Moreno",        "tipo": "politico",    "org": "PP",     "rol": "Presidente Junta de Andalucia",        "poder": 7,  "region": "Andalucia"},
    {"id": "caamaño",      "nombre": "Felix Bolanos",             "tipo": "politico",    "org": "PSOE",   "rol": "Ministro Presidencia",                 "poder": 6,  "region": "Nacional"},
    # ── Empresariales ─────────────────────────────────────────────────────────
    {"id": "iberdrola",    "nombre": "Iberdrola",                 "tipo": "empresarial", "org": "Energia","rol": "Corporacion energetica global",        "poder": 9,  "region": "Internacional"},
    {"id": "santander",    "nombre": "Banco Santander",           "tipo": "empresarial", "org": "Banca",  "rol": "Mayor banco espanol por activos",      "poder": 9,  "region": "Internacional"},
    {"id": "telefonica",   "nombre": "Telefonica",                "tipo": "empresarial", "org": "Teleco", "rol": "Operador teleco e infraestructura",    "poder": 8,  "region": "Internacional"},
    {"id": "inditex",      "nombre": "Inditex / Amancio Ortega",  "tipo": "empresarial", "org": "Moda",   "rol": "Mayor grupo moda del mundo (Zara)",    "poder": 9,  "region": "Internacional"},
    {"id": "repsol",       "nombre": "Repsol",                    "tipo": "empresarial", "org": "Energia","rol": "Corporacion petroleo y gas",           "poder": 8,  "region": "Internacional"},
    {"id": "acs",          "nombre": "ACS / Florentino Perez",    "tipo": "empresarial", "org": "Construccion","rol": "Grupo infraestructuras + Real Madrid", "poder": 8, "region": "Internacional"},
    # ── Medios ────────────────────────────────────────────────────────────────
    {"id": "elpais",       "nombre": "El Pais",                   "tipo": "mediatico",   "org": "PRISA",  "rol": "Diario nacional progresista",          "poder": 8,  "region": "Nacional"},
    {"id": "elmundo",      "nombre": "El Mundo",                  "tipo": "mediatico",   "org": "Unidad Editorial","rol": "Diario nacional centroderecha", "poder": 7,  "region": "Nacional"},
    {"id": "abc",          "nombre": "ABC",                       "tipo": "mediatico",   "org": "Vocento","rol": "Diario conservador / monarquico",      "poder": 6,  "region": "Nacional"},
    {"id": "lavanguardia", "nombre": "La Vanguardia",             "tipo": "mediatico",   "org": "Grupo Godó","rol": "Referencia Cataluna y nacional",    "poder": 6,  "region": "Cataluna"},
    {"id": "eldiario",     "nombre": "elDiario.es",               "tipo": "mediatico",   "org": "Progres","rol": "Diario progresista digital",           "poder": 6,  "region": "Nacional"},
    # ── Think tanks / Influencia ───────────────────────────────────────────────
    {"id": "faes",         "nombre": "FAES",                      "tipo": "influencia",  "org": "PP",     "rol": "Fundacion think tank PP / Aznar",      "poder": 7,  "region": "Nacional"},
    {"id": "alternativas", "nombre": "Fundacion Alternativas",    "tipo": "influencia",  "org": "PSOE",   "rol": "Think tank progresista",               "poder": 5,  "region": "Nacional"},
    {"id": "cidob",        "nombre": "CIDOB",                     "tipo": "influencia",  "org": "Independiente","rol": "Think tank relaciones internacionales", "poder": 5, "region": "Cataluna"},
    {"id": "ceoe",         "nombre": "CEOE",                      "tipo": "influencia",  "org": "Empresarial","rol": "Patronal espanola / lobby empresarial", "poder": 8, "region": "Nacional"},
    {"id": "ccoo",         "nombre": "CCOO",                      "tipo": "influencia",  "org": "Sindical","rol": "Mayor sindicato espanol",              "poder": 7,  "region": "Nacional"},
    {"id": "ugt",          "nombre": "UGT",                       "tipo": "influencia",  "org": "Sindical","rol": "Segundo sindicato espanol / PSOE",     "poder": 7,  "region": "Nacional"},
    {"id": "church",       "nombre": "Conferencia Episcopal",     "tipo": "influencia",  "org": "Iglesia","rol": "Iglesia Catolica espanola",             "poder": 6,  "region": "Nacional"},
]

# ── Relaciones ────────────────────────────────────────────────────────────────
# tipo_rel: gubernamental | adversarial | mediatico | empresarial | lobby
_REL_COLORS = {
    "gubernamental": "#1E40AF",  # azul oscuro
    "adversarial":   RED,
    "mediatico":     AMBER,
    "empresarial":   GREEN,
    "lobby":         PURPLE,
    "alianza":       CYAN,
    "sindical":      "#F472B6",
}

RELACIONES: list[dict] = [
    # Gobierno
    {"from": "sanchez",    "to": "diaz_y",      "tipo": "gubernamental", "label": "Coalicion"},
    {"from": "sanchez",    "to": "caamaño",      "tipo": "gubernamental", "label": "Ministro"},
    {"from": "sanchez",    "to": "puigdemont",   "tipo": "adversarial",   "label": "Tension amnistia"},
    {"from": "sanchez",    "to": "junqueras",    "tipo": "alianza",       "label": "Acuerdo investidura"},
    {"from": "sanchez",    "to": "otegi",        "tipo": "alianza",       "label": "Apoyo parlamentario"},
    {"from": "sanchez",    "to": "urkullu",      "tipo": "alianza",       "label": "Financiacion singular"},
    # Oposicion
    {"from": "feijoo",     "to": "abascal",      "tipo": "adversarial",   "label": "Competencia derechas"},
    {"from": "feijoo",     "to": "sanchez",      "tipo": "adversarial",   "label": "Oposicion"},
    {"from": "feijoo",     "to": "ayuso",        "tipo": "gubernamental", "label": "PP Madrid"},
    {"from": "feijoo",     "to": "moreno",       "tipo": "gubernamental", "label": "PP Andalucia"},
    {"from": "ayuso",      "to": "abascal",      "tipo": "adversarial",   "label": "Rivalidad Madrid"},
    # Empresarial - politico
    {"from": "iberdrola",  "to": "sanchez",      "tipo": "lobby",         "label": "Energias renovables"},
    {"from": "iberdrola",  "to": "feijoo",       "tipo": "lobby",         "label": "Regulacion energia"},
    {"from": "santander",  "to": "sanchez",      "tipo": "lobby",         "label": "Regulacion banca"},
    {"from": "ceoe",       "to": "feijoo",       "tipo": "lobby",         "label": "Agenda empresarial"},
    {"from": "ceoe",       "to": "sanchez",      "tipo": "lobby",         "label": "Dialogo social"},
    {"from": "acs",        "to": "feijoo",       "tipo": "lobby",         "label": "Infraestructuras"},
    {"from": "repsol",     "to": "sanchez",      "tipo": "lobby",         "label": "Transicion energetica"},
    # Medios - politico
    {"from": "elpais",     "to": "sanchez",      "tipo": "mediatico",     "label": "Cobertura favorable"},
    {"from": "elmundo",    "to": "feijoo",       "tipo": "mediatico",     "label": "Cobertura favorable"},
    {"from": "abc",        "to": "abascal",      "tipo": "mediatico",     "label": "Cobertura favorable"},
    {"from": "eldiario",   "to": "diaz_y",       "tipo": "mediatico",     "label": "Cobertura progresista"},
    {"from": "lavanguardia","to": "puigdemont",  "tipo": "mediatico",     "label": "Cobertura Cataluna"},
    # Think tanks
    {"from": "faes",       "to": "feijoo",       "tipo": "alianza",       "label": "Programa PP"},
    {"from": "alternativas","to": "sanchez",     "tipo": "alianza",       "label": "Ideas PSOE"},
    {"from": "ccoo",       "to": "diaz_y",       "tipo": "sindical",      "label": "Concertacion laboral"},
    {"from": "ugt",        "to": "sanchez",      "tipo": "sindical",      "label": "Dialogo social"},
    {"from": "church",     "to": "feijoo",       "tipo": "alianza",       "label": "Educacion / valores"},
    # Empresarial entre si
    {"from": "iberdrola",  "to": "repsol",       "tipo": "empresarial",   "label": "Competencia energia"},
    {"from": "santander",  "to": "telefonica",   "tipo": "empresarial",   "label": "Accionariado cruzado"},
]

_ACTORES_BY_ID = {a["id"]: a for a in ACTORES}

# ── Helpers ───────────────────────────────────────────────────────────────────
def _actor_color(tipo: str) -> str:
    return _COLOR_MAP.get(tipo, CYAN)


def _actor_icon(tipo: str) -> str:
    return _ICON_MAP.get(tipo, "•")


def _degree_centrality() -> dict[str, int]:
    deg: dict[str, int] = {a["id"]: 0 for a in ACTORES}
    for r in RELACIONES:
        deg[r["from"]] = deg.get(r["from"], 0) + 1
        deg[r["to"]] = deg.get(r["to"], 0) + 1
    return deg


def _betweenness_approx() -> dict[str, float]:
    """Betweenness aproximado (conteo caminos directos como proxy)."""
    deg = _degree_centrality()
    max_deg = max(deg.values()) if deg else 1
    return {k: round(v / max_deg, 3) for k, v in deg.items()}


def _connections_for(actor_id: str) -> list[dict]:
    conns = []
    for r in RELACIONES:
        if r["from"] == actor_id:
            other = _ACTORES_BY_ID.get(r["to"])
            if other:
                conns.append({"actor": other, "rel": r["label"], "tipo": r["tipo"], "direction": "out"})
        elif r["to"] == actor_id:
            other = _ACTORES_BY_ID.get(r["from"])
            if other:
                conns.append({"actor": other, "rel": r["label"], "tipo": r["tipo"], "direction": "in"})
    return conns


def _fallback_actor_analysis(actor_id: str) -> str:
    actor = _ACTORES_BY_ID.get(actor_id, {})
    conns = _connections_for(actor_id)
    rels = Counter(c["tipo"] for c in conns)
    deg = _degree_centrality().get(actor_id, 0)
    main_rel = rels.most_common(1)[0][0] if rels else "sin relaciones dominantes"
    return (
        f"**Lectura operativa:** {actor.get('nombre', 'Este actor')} tiene centralidad {deg} y "
        f"un poder estimado de {actor.get('poder', 0)}/10. Su rol principal es "
        f"{actor.get('rol', 'n/d')}. La relación dominante en el grafo es `{main_rel}`, "
        "por lo que conviene vigilar cambios de narrativa, alianzas y menciones cruzadas con sus nodos conectados."
    )


def _network_payload() -> dict:
    deg = _degree_centrality()
    top = sorted(deg.items(), key=lambda x: x[1], reverse=True)[:8]
    return {
        "n_actores": len(ACTORES),
        "n_relaciones": len(RELACIONES),
        "top_centralidad": [
            {
                "actor": _ACTORES_BY_ID[aid]["nombre"],
                "tipo": _ACTORES_BY_ID[aid]["tipo"],
                "org": _ACTORES_BY_ID[aid]["org"],
                "conexiones": val,
            }
            for aid, val in top
            if aid in _ACTORES_BY_ID
        ],
        "tipos_relacion": dict(Counter(r["tipo"] for r in RELACIONES)),
    }


def _fallback_network_analysis() -> str:
    payload = _network_payload()
    return (
        f"Red con {len(ACTORES)} actores y {len(RELACIONES)} relaciones. "
        f"Los hubs principales son {', '.join(item['actor'] for item in payload['top_centralidad'][:4])}. "
        "La lectura operativa es priorizar brokers con alta centralidad y relaciones de lobby, medios o apoyo parlamentario."
    )


@st.cache_data(ttl=900, show_spinner=False)
def _ai_actor_analysis(actor_id: str) -> str:
    actor = _ACTORES_BY_ID.get(actor_id)
    if not actor:
        return ""
    conns = _connections_for(actor_id)
    context = {
        "actor": actor,
        "centralidad": _degree_centrality().get(actor_id, 0),
        "betweenness_proxy": _betweenness_approx().get(actor_id, 0),
        "conexiones": [
            {
                "nombre": c["actor"]["nombre"],
                "tipo_actor": c["actor"]["tipo"],
                "relacion": c["rel"],
                "tipo_relacion": c["tipo"],
                "direccion": c["direction"],
            }
            for c in conns
        ],
    }
    try:
        from agents.ai_engine import get_ai_engine

        engine = get_ai_engine()
        if not engine.is_ollama_available():
            return _fallback_actor_analysis(actor_id)
        system = (
            "Eres ATLAS, analista de redes de poder politico en España. "
            "Responde en español, con hechos del contexto, sin inventar datos externos."
        )
        user = (
            "Analiza esta ficha de actor para un dashboard ejecutivo. "
            "Incluye: rol real en la red, riesgos, oportunidades y señales a monitorizar. "
            f"Datos:\n{json.dumps(context, ensure_ascii=False, default=str)[:3500]}"
        )
        return engine.ollama_chat(system, user, temperature=0.2, max_tokens=320)
    except Exception:
        return _fallback_actor_analysis(actor_id)


@st.cache_data(ttl=900, show_spinner=False)
def _ai_network_analysis() -> str:
    payload = _network_payload()
    fallback = _fallback_network_analysis()
    try:
        from agents.ai_engine import get_ai_engine

        engine = get_ai_engine()
        if not engine.is_ollama_available():
            return fallback
        system = "Eres ATLAS, analista senior de redes politicas. Responde en español con criterio operativo."
        user = (
            "Evalúa esta red de actores. Señala hubs, dependencias, riesgos de coalición, "
            "actores puente y prioridades de seguimiento.\n"
            f"Datos:\n{json.dumps(payload, ensure_ascii=False, default=str)}"
        )
        return engine.ollama_chat(system, user, temperature=0.2, max_tokens=380)
    except Exception:
        return fallback


@st.cache_data(ttl=300)
def _build_pyvis_html(selected_tipos: tuple, selected_rels: tuple) -> str:
    try:
        from pyvis.network import Network

        net = Network(height="500px", width="100%", bgcolor=BG2, font_color=TEXT)
        net.set_options(json.dumps({
            "nodes": {
                "borderWidth": 2,
                "shadow": {"enabled": True, "size": 8},
                "font": {"size": 13, "face": "Inter, Arial, sans-serif"},
            },
            "edges": {
                "smooth": {"type": "continuous"},
                "color": {"opacity": 0.55},
                "arrows": {"to": {"enabled": True, "scaleFactor": 0.5}},
            },
            "physics": {
                "solver": "forceAtlas2Based",
                "forceAtlas2Based": {
                    "gravitationalConstant": -60,
                    "centralGravity": 0.01,
                    "springLength": 110,
                    "springConstant": 0.08,
                },
                "stabilization": {"iterations": 120},
            },
            "interaction": {
                "hover": True,
                "tooltipDelay": 200,
            },
        }))

        for actor in ACTORES:
            if actor["tipo"] not in selected_tipos:
                continue
            color = _actor_color(actor["tipo"])
            size = 15 + actor.get("poder", 5) * 3
            label = actor["nombre"]
            title = (
                f"<b style='color:{color}'>{actor['nombre']}</b><br>"
                f"<i>{actor['rol']}</i><br>"
                f"Org: {actor['org']} | Zona: {actor['region']}<br>"
                f"Influencia: {'★' * actor.get('poder',5)}"
            )
            net.add_node(
                actor["id"],
                label=label,
                title=title,
                color={"background": color + "33", "border": color, "highlight": {"background": color + "66", "border": color}},
                size=size,
                font={"color": TEXT, "size": 12},
                shape="dot",
            )

        active_ids = {a["id"] for a in ACTORES if a["tipo"] in selected_tipos}
        for rel in RELACIONES:
            if rel["from"] not in active_ids or rel["to"] not in active_ids:
                continue
            if rel["tipo"] not in selected_rels:
                continue
            rel_color = _REL_COLORS.get(rel["tipo"], BORDER)
            net.add_edge(
                rel["from"], rel["to"],
                title=rel["label"],
                label=rel["label"],
                color=rel_color,
                width=1.5,
                font={"size": 9, "color": TEXT2},
            )

        return net.generate_html()
    except ImportError:
        return (
            f"<div style='background:{BG2};color:{TEXT2};padding:2rem;text-align:center;"
            f"border:1px dashed {BORDER};border-radius:12px;font-family:monospace'>"
            f"<b style='color:{AMBER}'>pyvis no instalado</b><br>"
            f"Ejecuta: <code>pip install pyvis</code>"
            f"</div>"
        )
    except Exception as exc:
        return (
            f"<div style='background:{BG2};color:{RED};padding:2rem;text-align:center'>"
            f"Error generando grafo: {exc}</div>"
        )


def _render_actor_profile(actor_id: str, *, key_prefix: str = "perfil"):
    actor = _ACTORES_BY_ID.get(actor_id)
    if not actor:
        st.warning("Actor no encontrado.")
        return

    color = _actor_color(actor["tipo"])
    icon = _actor_icon(actor["tipo"])
    tipo_label = actor["tipo"].capitalize()
    c_org = COLORES_PARTIDOS.get(actor["org"], color)

    st.markdown(
        f'<div class="actor-profile-header">'
        f'<div class="actor-avatar" style="background:{color}22;border:2px solid {color}">'
        f'{icon}</div>'
        f'<div style="flex:1">'
        f'<div class="actor-name">{actor["nombre"]}</div>'
        f'<div class="actor-role">{actor["rol"]}</div>'
        f'<div class="actor-tags">'
        f'<span class="tag" style="background:{color}22;color:{color};border:1px solid {color}44">{tipo_label}</span>'
        f'<span class="tag" style="background:{c_org}22;color:{c_org};border:1px solid {c_org}44">{actor["org"]}</span>'
        f'<span class="tag" style="background:{MUTED}22;color:{TEXT2};border:1px solid {MUTED}44">{actor["region"]}</span>'
        f'</div>'
        f'</div>'
        f'<div style="text-align:center">'
        f'<div style="font-size:1.4rem;font-weight:900;color:{color}">{actor.get("poder",5)}/10</div>'
        f'<div style="font-size:.6rem;color:{MUTED};text-transform:uppercase;letter-spacing:.08em">Influencia</div>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    tp1, tp2, tp3, tp4 = st.tabs(["📝 Perfil", "📈 Actividad", "🔗 Red", "🔔 Alertas"])

    with tp1:
        c1, c2 = st.columns(2)
        with c1:
            st.markdown(kpi_card("Tipo", tipo_label, "", color), unsafe_allow_html=True)
            st.markdown("<br>", unsafe_allow_html=True)
            st.markdown(kpi_card("Organizacion", actor["org"], "", c_org), unsafe_allow_html=True)
        with c2:
            st.markdown(kpi_card("Region", actor["region"], "", BLUE), unsafe_allow_html=True)
            st.markdown("<br>", unsafe_allow_html=True)
            conns = _connections_for(actor_id)
            st.markdown(kpi_card("Conexiones", str(len(conns)), "en el grafo", PURPLE), unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        section_header("ROL Y DESCRIPCION", color)
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {color};'
            f'border-radius:10px;padding:1rem 1.2rem;color:{TEXT};font-size:.85rem;line-height:1.7">'
            f'<b>{actor["nombre"]}</b> ocupa el rol de <i>{actor["rol"]}</i> en el ecosistema politico espanol. '
            f'Su organizacion de referencia es <b>{actor["org"]}</b>, con base en {actor["region"]}. '
            f'Su nivel de influencia estimado es <b>{actor.get("poder",5)}/10</b>.'
            f'</div>',
            unsafe_allow_html=True,
        )
        section_header("ANÁLISIS IA DEL ACTOR", CYAN)
        if st.button("Generar lectura IA de esta ficha", key=f"{key_prefix}_{actor_id}_ai_profile", use_container_width=True):
            with st.spinner("ATLAS analizando actor..."):
                st.session_state[f"{key_prefix}_{actor_id}_ai_profile_text"] = _ai_actor_analysis(actor_id)
        analysis_text = st.session_state.get(f"{key_prefix}_{actor_id}_ai_profile_text") or _fallback_actor_analysis(actor_id)
        st.markdown(
            f'<div style="background:{CYAN}0c;border:1px solid {CYAN}33;border-radius:10px;'
            f'padding:.85rem 1rem;color:{TEXT2};font-size:.8rem;line-height:1.65;white-space:pre-wrap">'
            f'{html.escape(analysis_text)}</div>',
            unsafe_allow_html=True,
        )

    with tp2:
        section_header("ACTIVIDAD MENSUAL (MENCIONES ESTIMADAS)", color)
        meses = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr"]
        base = actor.get("poder", 5) * 12
        # Seed reproducible por actor_id para consistencia entre renders
        rng = random.Random(hash(actor_id))
        menciones = [max(5, int(base + rng.gauss(0, base * 0.3))) for _ in meses]
        fig_act = go.Figure(go.Bar(
            x=meses, y=menciones,
            marker_color=[color] * len(meses),
            marker_line_width=0,
            text=menciones, textposition="outside",
            textfont=dict(color=TEXT2, size=10),
        ))
        fig_act.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=220, margin=dict(l=10, r=10, t=20, b=10),
            font=dict(color=TEXT2, size=11),
            yaxis=dict(gridcolor=BORDER, zeroline=False),
            xaxis=dict(gridcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_act, use_container_width=True, key=f"{key_prefix}_{actor_id}_actividad")

        section_header("DISTRIBUCION DE TONO MEDIÁTICO", AMBER)
        rng2 = random.Random(hash(actor_id + "_tone"))
        pos_pct = rng2.randint(20, 60)
        neg_pct = rng2.randint(10, 40)
        neu_pct = 100 - pos_pct - neg_pct
        fig_tone = go.Figure(go.Pie(
            labels=["Positivo", "Negativo", "Neutro"],
            values=[pos_pct, neg_pct, neu_pct],
            hole=0.55,
            marker_colors=[GREEN, RED, MUTED],
            textfont_color=TEXT,
        ))
        fig_tone.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=200, margin=dict(l=20, r=20, t=10, b=10),
            font=dict(color=TEXT2, size=11), showlegend=True,
            legend=dict(font=dict(color=TEXT2, size=10)),
        )
        st.plotly_chart(fig_tone, use_container_width=True, key=f"{key_prefix}_{actor_id}_tono")

    with tp3:
        conns = _connections_for(actor_id)
        section_header(f"CONEXIONES DE {actor['nombre'].upper()}", color)
        if conns:
            tipos_rel_presentes = sorted(set(c["tipo"] for c in conns))
            filtro_tipo_rel = st.selectbox("Filtrar relacion", ["Todas"] + tipos_rel_presentes, key=f"filtro_rel_{actor_id}")
            conns_fil = conns if filtro_tipo_rel == "Todas" else [c for c in conns if c["tipo"] == filtro_tipo_rel]
            for conn in conns_fil:
                other = conn["actor"]
                other_color = _actor_color(other["tipo"])
                rel_color = _REL_COLORS.get(conn["tipo"], BORDER)
                arrow = "→" if conn["direction"] == "out" else "←"
                st.markdown(
                    f'<div class="connection-item">'
                    f'<div style="display:flex;align-items:center;gap:.6rem">'
                    f'<span style="color:{rel_color};font-weight:900">{arrow}</span>'
                    f'<span style="font-weight:800;color:{other_color}">{other["nombre"]}</span>'
                    f'<span style="font-size:.65rem;color:{MUTED}">{other["rol"][:40]}</span>'
                    f'</div>'
                    f'<span style="font-size:.65rem;font-weight:800;color:{rel_color};'
                    f'background:{rel_color}22;border-radius:5px;padding:2px 7px">{conn["rel"]}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
        else:
            st.info("Sin conexiones registradas.")

    with tp4:
        section_header("ALERTAS RELACIONADAS", RED)
        rng3 = random.Random(hash(actor_id + "_alerts"))
        n_alertas = rng3.randint(0, 3)
        if n_alertas == 0:
            st.success("Sin alertas activas para este actor.")
        else:
            alertas_demo = [
                (RED,   "CRITICO",  f"Declaracion polémica de {actor['nombre']} en rueda de prensa"),
                (AMBER, "ALTO",     f"Mencion en BOE: legislacion que afecta a {actor['org']}"),
                (AMBER, "MEDIO",    f"Pico de menciones negativas en Twitter (x2 media semanal)"),
            ]
            for i in range(n_alertas):
                col, nivel, txt = alertas_demo[i % len(alertas_demo)]
                st.markdown(
                    f'<div style="background:{col}11;border:1px solid {col}44;border-radius:8px;'
                    f'padding:.6rem .9rem;margin-bottom:.4rem">'
                    f'<div style="font-size:.65rem;font-weight:800;color:{col};margin-bottom:.15rem">{nivel}</div>'
                    f'<div style="font-size:.78rem;color:{TEXT}">{txt}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )


# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(
    f'<div style="margin-bottom:.5rem">'
    f'<div style="font-size:1.6rem;font-weight:900;color:{CYAN};letter-spacing:-.01em">🕸️ Mapa de Actores</div>'
    f'<div style="font-size:.75rem;color:{TEXT2};margin-top:.2rem">'
    f'Red de influencias politica espanola · {len(ACTORES)} actores · {len(RELACIONES)} relaciones'
    f'</div>'
    f'</div>',
    unsafe_allow_html=True,
)

# ── KPIs rapidos ──────────────────────────────────────────────────────────────
kc1, kc2, kc3, kc4 = st.columns(4)
with kc1:
    n_pol = sum(1 for a in ACTORES if a["tipo"] == "politico")
    st.markdown(kpi_card("Politicos", str(n_pol), "actores registrados", CYAN), unsafe_allow_html=True)
with kc2:
    n_emp = sum(1 for a in ACTORES if a["tipo"] == "empresarial")
    st.markdown(kpi_card("Empresariales", str(n_emp), "corporaciones", AMBER), unsafe_allow_html=True)
with kc3:
    n_med = sum(1 for a in ACTORES if a["tipo"] == "mediatico")
    st.markdown(kpi_card("Medios", str(n_med), "outlets registrados", GREEN), unsafe_allow_html=True)
with kc4:
    n_inf = sum(1 for a in ACTORES if a["tipo"] == "influencia")
    st.markdown(kpi_card("Influencia", str(n_inf), "think tanks / lobbies", PURPLE), unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_mapa, tab_busqueda, tab_analisis, tab_ia = st.tabs([
    "🕸️ Mapa de Red",
    "🔍 Búsqueda de Actores",
    "📊 Análisis de Red",
    "🤖 Query IA",
])

# ─── TAB 1: Mapa de Red ───────────────────────────────────────────────────────
with tab_mapa:
    c_ctrl, c_info = st.columns([3, 1])
    with c_ctrl:
        tipos_seleccionados = st.multiselect(
            "Tipos de actor",
            ["politico", "empresarial", "mediatico", "influencia"],
            default=["politico", "empresarial", "mediatico", "influencia"],
            format_func=lambda x: f"{_actor_icon(x)} {x.capitalize()}",
            key="tipos_sel",
        )
        rels_seleccionadas = st.multiselect(
            "Tipos de relacion",
            list(_REL_COLORS.keys()),
            default=list(_REL_COLORS.keys()),
            key="rels_sel",
        )
    with c_info:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:.8rem 1rem">'
            f'<div style="font-size:.6rem;font-weight:800;color:{MUTED};text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">LEYENDA</div>'
            + "".join(
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
                f'<div style="width:10px;height:10px;border-radius:50%;background:{_actor_color(t)}"></div>'
                f'<span style="font-size:.7rem;color:{TEXT2}">{_actor_icon(t)} {t.capitalize()}</span>'
                f'</div>'
                for t in ["politico", "empresarial", "mediatico", "influencia"]
            )
            + f'</div>',
            unsafe_allow_html=True,
        )

    if not tipos_seleccionados:
        st.warning("Selecciona al menos un tipo de actor.")
    else:
        with st.spinner("Renderizando red..."):
            html_grafo = _build_pyvis_html(
                tuple(sorted(tipos_seleccionados)),
                tuple(sorted(rels_seleccionadas)),
            )
        components.html(html_grafo, height=530, scrolling=False)
        st.caption("Arrastra nodos para reorganizar. Pasa el cursor para ver detalles. Usa el zoom con la rueda del raton.")

    # Selector de perfil desde el mapa
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("PERFIL DE ACTOR (seleccionar desde lista)", CYAN)
    actores_opciones = {a["nombre"]: a["id"] for a in ACTORES}
    sel_nombre = st.selectbox(
        "Seleccionar actor para ver perfil completo",
        list(actores_opciones.keys()),
        key="sel_actor_mapa",
    )
    _render_actor_profile(actores_opciones[sel_nombre], key_prefix="mapa")


# ─── TAB 2: Busqueda ─────────────────────────────────────────────────────────
with tab_busqueda:
    section_header("BUSCADOR DE ACTORES", BLUE)

    c_search, c_tipo_fil = st.columns([3, 2])
    with c_search:
        query = st.text_input("Buscar actor por nombre, rol u organizacion...", key="search_actor", placeholder="ej: Sanchez, Iberdrola, think tank...")
    with c_tipo_fil:
        tipo_fil = st.selectbox("Tipo", ["Todos", "Politico", "Empresarial", "Mediatico", "Influencia"], key="tipo_fil_tab2")

    actores_fil = ACTORES
    if query:
        q = query.lower()
        actores_fil = [
            a for a in actores_fil
            if q in a["nombre"].lower() or q in a["rol"].lower() or q in a["org"].lower()
        ]
    if tipo_fil != "Todos":
        actores_fil = [a for a in actores_fil if a["tipo"] == tipo_fil.lower()]

    st.caption(f"{len(actores_fil)} actores encontrados")

    if actores_fil:
        # Tabla
        df_actores = pd.DataFrame([
            {
                "Nombre": a["nombre"],
                "Tipo": a["tipo"].capitalize(),
                "Organizacion": a["org"],
                "Rol": a["rol"][:55] + ("..." if len(a["rol"]) > 55 else ""),
                "Region": a["region"],
                "Poder": "★" * a.get("poder", 5),
            }
            for a in actores_fil
        ])
        st.dataframe(
            df_actores,
            use_container_width=True,
            hide_index=True,
            height=min(420, 40 + len(actores_fil) * 38),
        )

        st.markdown("<br>", unsafe_allow_html=True)
        section_header("VER PERFIL COMPLETO", PURPLE)
        nombres_fil = [a["nombre"] for a in actores_fil]
        sel_nombre_tab2 = st.selectbox("Seleccionar actor", nombres_fil, key="sel_actor_tab2")
        sel_id_tab2 = next((a["id"] for a in actores_fil if a["nombre"] == sel_nombre_tab2), None)
        if sel_id_tab2:
            _render_actor_profile(sel_id_tab2, key_prefix="busqueda")
    else:
        st.info("No se encontraron actores con los criterios de busqueda.")


# ─── TAB 3: Analisis de Red ──────────────────────────────────────────────────
with tab_analisis:
    section_header("ANALISIS DE RED POLITICA", PURPLE)

    deg = _degree_centrality()
    bet = _betweenness_approx()

    # Top 10 por grado
    top10 = sorted(deg.items(), key=lambda x: x[1], reverse=True)[:12]
    top10_nombres = [_ACTORES_BY_ID[aid]["nombre"] for aid, _ in top10 if aid in _ACTORES_BY_ID]
    top10_valores = [v for _, v in top10 if _ACTORES_BY_ID.get(_[0])]
    # Rebuild after filter
    top10_nombres = []
    top10_valores = []
    top10_colors = []
    for aid, val in top10:
        if aid in _ACTORES_BY_ID:
            actor = _ACTORES_BY_ID[aid]
            top10_nombres.append(actor["nombre"])
            top10_valores.append(val)
            top10_colors.append(_actor_color(actor["tipo"]))

    col_deg, col_bet = st.columns(2)
    with col_deg:
        section_header("CENTRALIDAD DE GRADO (TOP 12)", CYAN)
        fig_deg = go.Figure(go.Bar(
            y=top10_nombres[::-1],
            x=top10_valores[::-1],
            orientation="h",
            marker_color=top10_colors[::-1],
            marker_line_width=0,
            text=top10_valores[::-1],
            textposition="outside",
            textfont=dict(color=TEXT2, size=10),
        ))
        fig_deg.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=380, margin=dict(l=10, r=40, t=20, b=10),
            font=dict(color=TEXT2, size=11),
            xaxis=dict(gridcolor=BORDER, zeroline=False, title="Conexiones"),
            yaxis=dict(gridcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_deg, use_container_width=True, key="actores_centralidad_grado")

    with col_bet:
        section_header("BETWEENNESS CENTRALIDAD", PURPLE)
        top_bet = sorted(bet.items(), key=lambda x: x[1], reverse=True)[:12]
        bet_nombres = [_ACTORES_BY_ID[a]["nombre"] for a, _ in top_bet if a in _ACTORES_BY_ID]
        bet_valores = [v for a, v in top_bet if a in _ACTORES_BY_ID]
        bet_colors = [_actor_color(_ACTORES_BY_ID[a]["tipo"]) for a, _ in top_bet if a in _ACTORES_BY_ID]
        fig_bet = go.Figure(go.Bar(
            y=bet_nombres[::-1],
            x=bet_valores[::-1],
            orientation="h",
            marker_color=bet_colors[::-1],
            marker_line_width=0,
            text=[f"{v:.2f}" for v in bet_valores[::-1]],
            textposition="outside",
            textfont=dict(color=TEXT2, size=10),
        ))
        fig_bet.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=380, margin=dict(l=10, r=50, t=20, b=10),
            font=dict(color=TEXT2, size=11),
            xaxis=dict(gridcolor=BORDER, zeroline=False, title="Betweenness (norm.)"),
            yaxis=dict(gridcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_bet, use_container_width=True, key="actores_betweenness")

    # Distribucion por tipo
    section_header("DISTRIBUCION POR TIPO DE ACTOR Y CONEXIONES PROMEDIO", AMBER)
    col_tipo1, col_tipo2 = st.columns(2)
    with col_tipo1:
        tipos_count = {}
        for a in ACTORES:
            tipos_count[a["tipo"]] = tipos_count.get(a["tipo"], 0) + 1
        fig_tipo = go.Figure(go.Pie(
            labels=[t.capitalize() for t in tipos_count.keys()],
            values=list(tipos_count.values()),
            hole=0.55,
            marker_colors=[_actor_color(t) for t in tipos_count.keys()],
            textfont_color=TEXT,
        ))
        fig_tipo.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=240, margin=dict(l=10, r=10, t=20, b=10),
            font=dict(color=TEXT2, size=11), showlegend=True,
            legend=dict(font=dict(color=TEXT2, size=10)),
        )
        st.plotly_chart(fig_tipo, use_container_width=True, key="actores_tipo_pie")

    with col_tipo2:
        # Conexiones promedio por tipo
        tipo_deg: dict[str, list[int]] = {}
        for a in ACTORES:
            tipo_deg.setdefault(a["tipo"], []).append(deg.get(a["id"], 0))
        tipos_list = list(tipo_deg.keys())
        avg_deg = [round(sum(v) / len(v), 1) for v in tipo_deg.values()]
        fig_avg = go.Figure(go.Bar(
            x=[t.capitalize() for t in tipos_list],
            y=avg_deg,
            marker_color=[_actor_color(t) for t in tipos_list],
            marker_line_width=0,
            text=avg_deg, textposition="outside",
            textfont=dict(color=TEXT2, size=11),
        ))
        fig_avg.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=240, margin=dict(l=10, r=10, t=20, b=10),
            font=dict(color=TEXT2, size=11),
            yaxis=dict(gridcolor=BORDER, zeroline=False, title="Conexiones promedio"),
            xaxis=dict(gridcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_avg, use_container_width=True, key="actores_avg_degree")

    # Tarjetas de estadisticas globales
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("ESTADISTICAS GLOBALES DE LA RED", GREEN)
    sc1, sc2, sc3, sc4 = st.columns(4)
    n_nodos = len(ACTORES)
    n_aristas = len(RELACIONES)
    densidad = round(2 * n_aristas / max(n_nodos * (n_nodos - 1), 1), 3)
    actor_max_deg = max(deg.items(), key=lambda x: x[1], default=("—", 0))
    actor_max_nombre = _ACTORES_BY_ID.get(actor_max_deg[0], {}).get("nombre", "—")
    with sc1:
        st.markdown(kpi_card("Nodos", str(n_nodos), "actores totales", CYAN), unsafe_allow_html=True)
    with sc2:
        st.markdown(kpi_card("Aristas", str(n_aristas), "relaciones totales", PURPLE), unsafe_allow_html=True)
    with sc3:
        st.markdown(kpi_card("Densidad", f"{densidad:.3f}", "0=dispersa 1=completa", AMBER), unsafe_allow_html=True)
    with sc4:
        st.markdown(kpi_card("Hub principal", actor_max_nombre.split()[-1], f"{actor_max_deg[1]} conexiones", GREEN), unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    section_header("LECTURA IA DE LA RED", CYAN)
    if st.button("Generar análisis IA de la red", key="actores_ai_network", use_container_width=True):
        with st.spinner("ATLAS evaluando red de poder..."):
            st.session_state["actores_ai_network_text"] = _ai_network_analysis()
    network_ai = st.session_state.get("actores_ai_network_text") or _fallback_network_analysis()
    st.markdown(
        f'<div style="background:{CYAN}0c;border:1px solid {CYAN}33;border-radius:10px;'
        f'padding:.9rem 1rem;color:{TEXT2};font-size:.82rem;line-height:1.7;white-space:pre-wrap">'
        f'{html.escape(network_ai)}</div>',
        unsafe_allow_html=True,
    )


# ─── TAB 4: Query IA ─────────────────────────────────────────────────────────
with tab_ia:
    section_header("CONSULTAS EN LENGUAJE NATURAL — GRAFO POLITICO", CYAN)

    estado_ia = "conectado" if _LLM_OK else "sin conexion"
    color_ia = GREEN if _LLM_OK else RED
    st.markdown(
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
        f'padding:.6rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:.6rem">'
        f'<div style="width:8px;height:8px;border-radius:50%;background:{color_ia};'
        f'box-shadow:0 0 6px {color_ia}88"></div>'
        f'<span style="font-size:.72rem;color:{TEXT2}">Politeia Brain: <b style="color:{color_ia}">{estado_ia}</b></span>'
        f'</div>',
        unsafe_allow_html=True,
    )

    preguntas_ejemplo = [
        "¿Quiénes son los actores más influyentes entre PP y medios conservadores?",
        "¿Qué empresas tienen más conexiones de lobby con el gobierno?",
        "Analiza las conexiones adversariales entre los partidos principales",
        "¿Qué think tanks tienen mayor centralidad en la red?",
        "Describe el papel de los sindicatos en la red de influencia española",
    ]

    st.markdown(
        f'<div style="font-size:.72rem;color:{MUTED};margin-bottom:.5rem">Ejemplos de consulta:</div>',
        unsafe_allow_html=True,
    )
    cols_ex = st.columns(len(preguntas_ejemplo))
    for i, pej in enumerate(preguntas_ejemplo):
        with cols_ex[i]:
            if st.button(f"💬 {pej[:35]}...", key=f"ej_{i}", use_container_width=True):
                st.session_state["ia_query_input"] = pej

    query_ia = st.text_area(
        "Escribe tu consulta sobre el grafo politico:",
        value=st.session_state.get("ia_query_input", ""),
        height=90,
        placeholder="ej: ¿Quiénes son los brokers de información entre el gobierno y los medios?",
        key="ia_query_input",
    )

    if st.button("🔍 Consultar al grafo", type="primary", key="btn_ia_query", use_container_width=False):
        if not query_ia.strip():
            st.warning("Escribe una consulta primero.")
        else:
            # Construir contexto del grafo para el LLM
            grafo_resumen = (
                f"Red politica espanola con {len(ACTORES)} actores y {len(RELACIONES)} relaciones.\n"
                f"ACTORES: " + "; ".join(f"{a['nombre']} ({a['tipo']}, {a['org']})" for a in ACTORES) + "\n"
                f"RELACIONES PRINCIPALES: " + "; ".join(f"{r['from']}--[{r['label']}]-->{r['to']}" for r in RELACIONES[:20])
            )
            if _LLM_OK:
                try:
                    with st.spinner("Analizando el grafo con IA..."):
                        prompt = (
                            f"Eres un experto en analisis de redes politicas espanolas. "
                            f"Responde esta consulta sobre el grafo de actores politicos:\n\n"
                            f"CONSULTA: {query_ia}\n\n"
                            f"DATOS DEL GRAFO:\n{grafo_resumen}"
                        )
                        respuesta = _llm.chat(prompt)
                except Exception as exc:
                    respuesta = f"Error consultando la IA: {exc}"
            else:
                # Respuesta generativa demo sin LLM
                respuesta = (
                    f"**Analisis del grafo** (modo demo — conecta Politeia Brain para respuestas reales):\n\n"
                    f"Consulta recibida: *{query_ia}*\n\n"
                    f"La red contiene **{len(ACTORES)} actores** con **{len(RELACIONES)} relaciones**. "
                    f"Los actores con mayor centralidad son Pedro Sanchez ({deg.get('sanchez',0)} conexiones), "
                    f"Alberto N. Feijoo ({deg.get('feijoo',0)} conexiones) e Iberdrola ({deg.get('iberdrola',0)} conexiones). "
                    f"Para analisis mas profundos, activa Ollama (`ollama serve`) o configura tu clave Claude API."
                )

            st.session_state["ia_last_response"] = respuesta
            st.session_state["ia_last_query"] = query_ia

    if "ia_last_response" in st.session_state:
        st.markdown("<br>", unsafe_allow_html=True)
        section_header("RESPUESTA DEL ANALIZADOR", CYAN)
        st.markdown(
            f'<div class="chat-box">'
            f'<div style="font-size:.6rem;font-weight:800;color:{CYAN};letter-spacing:.1em;'
            f'text-transform:uppercase;margin-bottom:.5rem">POLITEIA BRAIN</div>'
            f'{st.session_state["ia_last_response"].replace(chr(10), "<br>")}'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Historial de queries
    if "ia_query_history" not in st.session_state:
        st.session_state["ia_query_history"] = []
    if "ia_last_query" in st.session_state and "ia_last_response" in st.session_state:
        entry = (st.session_state["ia_last_query"], st.session_state["ia_last_response"])
        if not st.session_state["ia_query_history"] or st.session_state["ia_query_history"][0] != entry:
            st.session_state["ia_query_history"].insert(0, entry)
            st.session_state["ia_query_history"] = st.session_state["ia_query_history"][:5]

    if len(st.session_state.get("ia_query_history", [])) > 1:
        with st.expander("📜 Historial de consultas"):
            for q, r in st.session_state["ia_query_history"][1:]:
                st.markdown(
                    f'<div style="border:1px solid {BORDER};border-radius:8px;padding:.6rem .9rem;'
                    f'margin-bottom:.5rem;background:{BG2}">'
                    f'<div style="font-size:.68rem;font-weight:800;color:{PURPLE};margin-bottom:.2rem">Q: {q}</div>'
                    f'<div style="font-size:.74rem;color:{TEXT2}">{r[:200]}...</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
