"""
D4 — Monitor Legislativo (v2 Premium)
======================================
Legislative Intelligence Monitor para ElectSim España.
Cobertura completa: actividad parlamentaria, seguimiento de leyes,
BOE en directo, matemáticas de coalición, productividad legislativa por actor.

Tabs:
  1. ACTIVIDAD PARLAMENTARIA — agenda semanal, votaciones próximas, math coalición
  2. SEGUIMIENTO DE LEYES — pipeline por fases, filtros, tracker 8 leyes clave
  3. BOE & NORMATIVA — sumario diario clasificado por impacto, IA por entrada
  4. COALICIONES PARLAMENTARIAS — math de escaños, heatmap alineación, sorpresas
  5. INICIATIVAS POR ACTOR — productividad, score legislativo, temas por actor
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina, aplicar_estilos,
    intel_header, apply_plotly_theme, section_header, kpi_card,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, COLORES_PARTIDOS,
)
import dashboard.db as _db

try:
    from dashboard.services import git_amigos_bridge as _git_amigos
except Exception:
    _git_amigos = None  # type: ignore

# ── Bloque 1 Core Legislativo — imports defensivos ────────────────────────────
try:
    from dashboard.services.legislative_core import (
        cargar_boe_reciente,
        cargar_boe_hoy,
        cargar_iniciativas_recientes,
        cargar_kpis_legislativos,
        cargar_alertas_legislativas,
        buscar_items_legislativos,
        enriquecer_boe_legacy,
    )
    _LEG_CORE_OK = True
except Exception as _leg_err:
    _LEG_CORE_OK = False
    def cargar_boe_reciente(**kw): import pandas as pd; return pd.DataFrame()
    def cargar_boe_hoy(): import pandas as pd; return pd.DataFrame()
    def cargar_iniciativas_recientes(**kw): import pandas as pd; return pd.DataFrame()
    def cargar_kpis_legislativos(): return {"hay_datos": False}
    def cargar_alertas_legislativas(**kw): import pandas as pd; return pd.DataFrame()
    def buscar_items_legislativos(q, **kw): import pandas as pd; return pd.DataFrame()
    def enriquecer_boe_legacy(items): return items

st.set_page_config(
    page_title="Monitor Legislativo — ElectSim",
    page_icon="",
    layout="wide",
)
aplicar_estilos()
sidebar_nav()
mostrar_alertas_pagina("legislativo")

# ═══════════════════════════════════════════════════════════════════════════════
# DEMO DATA
# ═══════════════════════════════════════════════════════════════════════════════

DEMO_LEYES = [
    {"id": "LV-001", "ley": "Ley de Vivienda 2.0", "proponente": "PSOE-SUMAR", "area": "Social",
     "fase": 2, "urgencia": "alta", "prob_aprobacion": 0.52,
     "descripcion": "Reforma de la ley de vivienda que amplía el parque público de alquiler y refuerza las medidas de control de precios en zonas tensionadas.",
     "fecha_inicio": "2025-10-01", "plazo_estimado": "2026-06-30", "partidos_clave": ["PSOE", "SUMAR", "PNV"]},
    {"id": "RF-002", "ley": "Reforma Fiscal IRPF", "proponente": "PSOE", "area": "Económico",
     "fase": 1, "urgencia": "alta", "prob_aprobacion": 0.45,
     "descripcion": "Subida del tipo marginal máximo del IRPF para rentas superiores a 300.000€ y creación de un nuevo tramo para grandes fortunas.",
     "fecha_inicio": "2025-11-15", "plazo_estimado": "2026-09-30", "partidos_clave": ["PSOE", "SUMAR", "ERC"]},
    {"id": "IA-003", "ley": "Ley de IA y Regulación Digital", "proponente": "PP", "area": "Tecnología",
     "fase": 1, "urgencia": "media", "prob_aprobacion": 0.61,
     "descripcion": "Marco regulatorio nacional para sistemas de inteligencia artificial de alto riesgo, complementando el AI Act europeo con medidas específicas para España.",
     "fecha_inicio": "2025-09-20", "plazo_estimado": "2026-03-31", "partidos_clave": ["PP", "PSOE", "SUMAR"]},
    {"id": "PJ-004", "ley": "Reforma Ley Orgánica Poder Judicial", "proponente": "PSOE", "area": "Institucional",
     "fase": 3, "urgencia": "critica", "prob_aprobacion": 0.38,
     "descripcion": "Renovación del CGPJ y reforma del sistema de elección de vocales para reducir la influencia partidista en el órgano de gobierno de los jueces.",
     "fecha_inicio": "2024-06-01", "plazo_estimado": "2026-04-15", "partidos_clave": ["PSOE", "PP"]},
    {"id": "PGE-005", "ley": "Presupuestos Generales 2026", "proponente": "Gobierno", "area": "Fiscal",
     "fase": 0, "urgencia": "critica", "prob_aprobacion": 0.31,
     "descripcion": "Proyecto de Ley de Presupuestos Generales del Estado para 2026. Requiere mayoría absoluta en el Congreso. La negociación con los socios del gobierno es crítica.",
     "fecha_inicio": "2025-12-01", "plazo_estimado": "2026-10-01", "partidos_clave": ["PSOE", "SUMAR", "PNV", "ERC", "JUNTS"]},
    {"id": "MD-006", "ley": "Ley de Memoria Democrática (reforma)", "proponente": "PSOE-ERC", "area": "Social",
     "fase": 2, "urgencia": "media", "prob_aprobacion": 0.57,
     "descripcion": "Ampliación de la ley de memoria democrática para incluir la represión franquista en el ámbito judicial y crear un banco de ADN de víctimas del franquismo.",
     "fecha_inicio": "2025-08-15", "plazo_estimado": "2026-05-31", "partidos_clave": ["PSOE", "SUMAR", "ERC", "EH Bildu"]},
    {"id": "DC-007", "ley": "Plan de Descarbonización 2030", "proponente": "SUMAR", "area": "Medioambiental",
     "fase": 1, "urgencia": "media", "prob_aprobacion": 0.48,
     "descripcion": "Hoja de ruta para alcanzar el 74% de energía renovable en 2030 y reducir las emisiones de CO2 un 55% respecto a 1990. Incluye fondos de transición justa.",
     "fecha_inicio": "2025-10-20", "plazo_estimado": "2026-08-31", "partidos_clave": ["SUMAR", "PSOE", "PNV"]},
    {"id": "CP-008", "ley": "Reforma Código Penal (sedición)", "proponente": "PSOE-JUNTS", "area": "Institucional",
     "fase": 4, "urgencia": "alta", "prob_aprobacion": 0.71,
     "descripcion": "Modificación del articulado del Código Penal en materia de sedición y desórdenes públicos, como parte del acuerdo de investidura con los partidos independentistas catalanes.",
     "fecha_inicio": "2024-01-15", "plazo_estimado": "2026-03-01", "partidos_clave": ["PSOE", "JUNTS", "ERC", "EH Bildu"]},
]

FASES_LEGISLATIVAS = [
    "Iniciativa",
    "Ponencia",
    "Pleno Congreso",
    "Senado",
    "Promulgación",
]

URGENCIA_CFG = {
    "critica": {"color": RED, "label": "CRÍTICA", "border": "#7F1D1D"},
    "alta": {"color": AMBER, "label": "ALTA", "border": "#78350F"},
    "media": {"color": BLUE, "label": "MEDIA", "border": "#1E3A5F"},
    "baja": {"color": GREEN, "label": "BAJA", "border": "#064E3B"},
}

AREAS_COLOR = {
    "Social": CYAN,
    "Económico": AMBER,
    "Tecnología": PURPLE,
    "Institucional": RED,
    "Fiscal": BLUE,
    "Medioambiental": GREEN,
}

PARTIDOS_ESCANOS = {
    "PSOE": 120, "PP": 137, "VOX": 33, "SUMAR": 31,
    "JUNTS": 7, "ERC": 7, "EH Bildu": 6, "PNV": 5,
    "PODEMOS": 5, "CC": 1, "Otros": 4,
}
TOTAL_ESCANOS = 350
MAYORIA_ABS = 176
MAYORIA_SIMPLE = 176  # in practice

HISTORICO_ALINEACION = {
    "PP": {"PP": 1.0, "VOX": 0.62, "PSOE": 0.12, "SUMAR": 0.08, "JUNTS": 0.05, "ERC": 0.06},
    "VOX": {"PP": 0.62, "VOX": 1.0, "PSOE": 0.04, "SUMAR": 0.03, "JUNTS": 0.02, "ERC": 0.03},
    "PSOE": {"PP": 0.12, "VOX": 0.04, "PSOE": 1.0, "SUMAR": 0.87, "JUNTS": 0.41, "ERC": 0.65},
    "SUMAR": {"PP": 0.08, "VOX": 0.03, "PSOE": 0.87, "SUMAR": 1.0, "JUNTS": 0.32, "ERC": 0.71},
    "JUNTS": {"PP": 0.05, "VOX": 0.02, "PSOE": 0.41, "SUMAR": 0.32, "JUNTS": 1.0, "ERC": 0.48},
    "ERC": {"PP": 0.06, "VOX": 0.03, "PSOE": 0.65, "SUMAR": 0.71, "JUNTS": 0.48, "ERC": 1.0},
}

# Votaciones demo
DEMO_VOTACIONES = [
    {"id": "VOT-2026-0012", "fecha": "2026-04-28", "iniciativa": "Prórroga medidas antiinflación", "tipo": "RDL",
     "resultado": "APROBADA", "PP": "contra", "PSOE": "favor", "VOX": "contra", "SUMAR": "favor", "JUNTS": "favor"},
    {"id": "VOT-2026-0013", "fecha": "2026-04-29", "iniciativa": "Proposición no de Ley sobre vivienda joven", "tipo": "PNL",
     "resultado": "APROBADA", "PP": "favor", "PSOE": "favor", "VOX": "contra", "SUMAR": "favor", "JUNTS": "abstencion"},
    {"id": "VOT-2026-0014", "fecha": "2026-04-30", "iniciativa": "Moción de censura al gobierno regional de Murcia", "tipo": "MOCIÓN",
     "resultado": "RECHAZADA", "PP": "contra", "PSOE": "favor", "VOX": "contra", "SUMAR": "favor", "JUNTS": "abstencion"},
    {"id": "VOT-2026-0015", "fecha": "2026-05-02", "iniciativa": "Presupuestos CAM 2026", "tipo": "PL",
     "resultado": "APROBADA", "PP": "favor", "PSOE": "contra", "VOX": "favor", "SUMAR": "contra", "JUNTS": "abstencion"},
]

AGENDA_HOY = [
    {"hora": "09:00", "tipo": "Comisión", "descripcion": "Comisión de Justicia — Ponencia Reforma LOPJ", "sala": "Sala Constitucional"},
    {"hora": "10:30", "tipo": "Comisión", "descripcion": "Comisión de Hacienda — Reforma Fiscal IRPF (fase 1)", "sala": "Sala del Senado"},
    {"hora": "12:00", "tipo": "Pleno", "descripcion": "Pleno Congreso — Debate Ley de Vivienda 2.0 (enmiendas)", "sala": "Hemiciclo"},
    {"hora": "16:00", "tipo": "Comparecencia", "descripcion": "Comparecencia Ministra de Hacienda sobre Presupuestos", "sala": "Comisión Mixta"},
    {"hora": "18:00", "tipo": "Votación", "descripcion": "Votación Proposición de Ley Plan Descarbonización 2030", "sala": "Hemiciclo"},
]

PROXIMAS_VOTACIONES = [
    {"ley": "Reforma CGPJ", "fecha": "2026-05-06", "requiere": "Mayoría absoluta", "prob": 0.38, "partidos_clave": ["PP", "PSOE"]},
    {"ley": "Ley IA Digital", "fecha": "2026-05-08", "requiere": "Mayoría simple", "prob": 0.61, "partidos_clave": ["PP", "PSOE", "SUMAR"]},
    {"ley": "Plan Descarbonización", "fecha": "2026-05-10", "requiere": "Mayoría simple", "prob": 0.48, "partidos_clave": ["SUMAR", "PSOE", "ERC"]},
    {"ley": "Presupuestos 2026 (admisión)", "fecha": "2026-05-15", "requiere": "Mayoría simple", "prob": 0.31, "partidos_clave": ["PSOE", "SUMAR", "JUNTS", "ERC", "PNV"]},
]

INICIATIVAS_ACTOR = [
    {"actor": "Pedro Sánchez", "partido": "PSOE", "presentadas": 18, "debate": 7, "aprobadas": 4, "rechazadas": 3,
     "temas": ["Vivienda", "Social", "Fiscal", "Institucional", "Digitalización"]},
    {"actor": "Alberto Núñez Feijóo", "partido": "PP", "presentadas": 24, "debate": 5, "aprobadas": 2, "rechazadas": 12,
     "temas": ["Economía", "Seguridad", "Sanidad", "Tecnología", "Energía"]},
    {"actor": "Santiago Abascal", "partido": "VOX", "presentadas": 31, "debate": 4, "aprobadas": 0, "rechazadas": 24,
     "temas": ["Inmigración", "Seguridad", "Identidad", "Economía", "Defensa"]},
    {"actor": "Yolanda Díaz", "partido": "SUMAR", "presentadas": 15, "debate": 9, "aprobadas": 6, "rechazadas": 2,
     "temas": ["Laboral", "Social", "Medioambiente", "Igualdad", "Vivienda"]},
    {"actor": "Carles Puigdemont", "partido": "JUNTS", "presentadas": 8, "debate": 3, "aprobadas": 1, "rechazadas": 2,
     "temas": ["Cataluña", "Autodeterminación", "Fiscal", "Infraestructuras"]},
    {"actor": "Oriol Junqueras", "partido": "ERC", "presentadas": 11, "debate": 4, "aprobadas": 2, "rechazadas": 3,
     "temas": ["Cataluña", "Social", "Fiscal", "Laboral", "Medioambiente"]},
]

# ── Funciones de carga ────────────────────────────────────────────────────────

IMPACT_CFG = {
    "CRÍTICO":     {"color": RED,    "border": "#7F1D1D", "bg": "#1A0A0A", "icon": "●"},
    "ALTO":        {"color": AMBER,  "border": "#78350F", "bg": "#1A1000", "icon": "●"},
    "MEDIO":       {"color": "#F59E0B", "border": "#92400E", "bg": "#171000", "icon": "●"},
    "BAJO":        {"color": GREEN,  "border": "#064E3B", "bg": "#091510", "icon": "●"},
    "INFORMATIVO": {"color": MUTED,  "border": BORDER,   "bg": BG2,       "icon": "○"},
}


@st.cache_data(ttl=300)
def _cargar_boe(fecha: str | None = None) -> list[dict]:
    """
    Carga ítems del BOE en este orden de prioridad:
      1. Tabla legal_items (Bloque 1 Core — datos reales)
      2. API BOE en tiempo real (boe_api.py)
      3. Lista vacía (D4 mostrará demo data)
    """
    # 1. Tabla legal_items (ingesta real via BOEMonitor)
    if _LEG_CORE_OK:
        try:
            df = cargar_boe_hoy() if fecha is None else cargar_boe_reciente(limit=200, days=1)
            if not df.empty:
                return df.to_dict("records")
        except Exception:
            pass

    # 2. Fallback: API BOE tiempo real
    try:
        from dashboard.services.boe_api import obtener_sumario
        items = obtener_sumario(fecha)
        if items:
            return enriquecer_boe_legacy(items)
    except Exception:
        pass

    return []


@st.cache_data(ttl=300)
def _clasificar_impacto(titulo: str, seccion: str, dept: str) -> str:
    try:
        from dashboard.services.boe_api import clasificar_impacto
        return clasificar_impacto(titulo, seccion, dept)
    except Exception:
        titulo_l = titulo.lower()
        if any(w in titulo_l for w in ["real decreto-ley", "estado de alarma", "presupuesto general"]):
            return "CRÍTICO"
        if any(w in titulo_l for w in ["real decreto", "ley orgánica", "ley "]):
            return "ALTO"
        if any(w in titulo_l for w in ["orden", "resolución", "instrucción"]):
            return "MEDIO"
        if any(w in titulo_l for w in ["anuncio", "convocatoria", "licitación"]):
            return "BAJO"
        return "INFORMATIVO"


def _prob_bar(prob: float, color: str) -> str:
    pct = int(prob * 100)
    bar_color = GREEN if prob >= 0.6 else (AMBER if prob >= 0.4 else RED)
    return (
        f'<div style="display:flex;align-items:center;gap:.5rem;">'
        f'<div style="flex:1;height:6px;background:{BORDER};border-radius:3px;">'
        f'<div style="height:6px;width:{pct}%;background:{bar_color};border-radius:3px;"></div>'
        f'</div>'
        f'<span style="font-size:.72rem;font-weight:700;color:{bar_color};min-width:36px;">{pct}%</span>'
        f'</div>'
    )


def _fase_bar(fase: int, n_fases: int = 5) -> str:
    pills = ""
    for i in range(n_fases):
        if i < fase:
            c = CYAN
        elif i == fase:
            c = AMBER
        else:
            c = f"{BORDER}"
        pills += f'<div class="stage-pill" style="background:{c};"></div>'
    return f'<div class="stage-bar">{pills}</div>'


def _urgencia_badge(urgencia: str) -> str:
    cfg = URGENCIA_CFG.get(urgencia, URGENCIA_CFG["media"])
    return (
        f'<span style="background:{cfg["color"]}22;color:{cfg["color"]};'
        f'font-size:.6rem;font-weight:800;padding:.2rem .55rem;'
        f'border-radius:6px;letter-spacing:.08em">{cfg["label"]}</span>'
    )


def _area_badge(area: str) -> str:
    c = AREAS_COLOR.get(area, MUTED)
    return (
        f'<span style="background:{c}22;color:{c};font-size:.6rem;'
        f'font-weight:700;padding:.15rem .5rem;border-radius:5px">{area}</span>'
    )


def _render_boe_card(item: dict) -> None:
    imp = item.get("impacto", "INFORMATIVO")
    cfg = IMPACT_CFG.get(imp, IMPACT_CFG["INFORMATIVO"])
    titulo = item.get("titulo", "Sin título")[:160]
    dept = item.get("departamento", "—")
    sec = item.get("seccion", "—")
    epi = item.get("epigrafe", "")
    url = item.get("url_html", item.get("url", "#"))
    id_boe = item.get("id", "")
    link_html = (
        f'<a href="{url}" target="_blank" rel="noopener noreferrer" '
        f'style="font-size:.72rem;color:{CYAN};text-decoration:none">Ver en BOE ↗</a>'
        if url and url != "#" else ""
    )
    st.markdown(
        f'<div style="background:{cfg["bg"]};border:1px solid {cfg["border"]};'
        f'border-left:4px solid {cfg["color"]};border-radius:10px;'
        f'padding:.85rem 1rem;margin-bottom:.55rem">'
        f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem">'
        f'<span style="background:{cfg["color"]}22;color:{cfg["color"]};'
        f'font-size:.62rem;font-weight:800;letter-spacing:.1em;padding:.2rem .6rem;'
        f'border-radius:99px;border:1px solid {cfg["color"]}44">'
        f'{cfg["icon"]} {imp}</span>'
        f'<span style="font-size:.68rem;color:{MUTED};font-family:monospace">Sección {sec}</span>'
        f'<span style="margin-left:auto;font-size:.68rem;color:{MUTED}">{id_boe}</span>'
        f'</div>'
        f'<div style="color:{TEXT};font-size:.88rem;font-weight:600;line-height:1.4;margin-bottom:.4rem">{titulo}</div>'
        f'<div style="display:flex;align-items:center;gap:1rem">'
        f'<span style="font-size:.72rem;color:{TEXT2}"> {dept}</span>'
        + (f'<span style="font-size:.72rem;color:{TEXT2}"> {epi[:60]}</span>' if epi else "")
        + f'<span style="margin-left:auto">{link_html}</span>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ─── CSS extra ───────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
.stage-bar {{display:flex;gap:3px;align-items:center;width:100%;}}
.stage-pill {{flex:1;height:7px;border-radius:4px;}}
.ley-card {{
  background:{BG2};border:1px solid {BORDER};border-radius:12px;
  padding:1rem 1.2rem;margin-bottom:.7rem;
  transition:border-color .2s ease;
}}
.ley-card:hover {{border-color:{CYAN}44;}}
.agenda-item {{
  display:flex;gap:.8rem;align-items:flex-start;
  padding:.65rem 0;border-bottom:1px solid {BORDER};
}}
.agenda-hora {{
  font-family:monospace;font-size:.8rem;font-weight:700;color:{CYAN};
  min-width:48px;margin-top:2px;
}}
.agenda-tipo {{
  font-size:.6rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  padding:.15rem .5rem;border-radius:4px;margin-top:2px;flex-shrink:0;
}}
.actor-prod-card {{
  background:{BG2};border:1px solid {BORDER};border-radius:12px;
  padding:.9rem 1.1rem;margin-bottom:.6rem;
}}
.tema-tag {{
  display:inline-block;font-size:.62rem;font-weight:600;
  background:{CYAN}15;color:{CYAN};border:1px solid {CYAN}33;
  border-radius:4px;padding:.15rem .5rem;margin:.1rem;
}}
</style>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HEADER + KPIs GLOBALES
# ═══════════════════════════════════════════════════════════════════════════════

intel_header(
    "Monitor Legislativo",
    "Legislative Intelligence",
    "LIVE",
    datetime.now().strftime("%d/%m/%Y %H:%M"),
)

# KPIs globales
total_activas = len(DEMO_LEYES)
votaciones_semana = 4
dias_fin_sesion = (datetime(2026, 7, 15) - datetime.now()).days
tasa_aprobacion = round(
    sum(1 for l in DEMO_LEYES if l.get("prob_aprobacion", 0) >= 0.5) / len(DEMO_LEYES) * 100
)

c1, c2, c3, c4 = st.columns(4)
with c1:
    st.markdown(kpi_card("Iniciativas activas", str(total_activas), "en tramitación", color=CYAN), unsafe_allow_html=True)
with c2:
    st.markdown(kpi_card("Votaciones esta semana", str(votaciones_semana), "en el Congreso", color=AMBER), unsafe_allow_html=True)
with c3:
    st.markdown(kpi_card("Tasa aprobación esperada", f"{tasa_aprobacion}%", "de iniciativas monitorizadas", color=GREEN if tasa_aprobacion > 50 else RED), unsafe_allow_html=True)
with c4:
    st.markdown(kpi_card("Días fin de sesión", str(max(0, dias_fin_sesion)), "hasta julio 2026", color=PURPLE), unsafe_allow_html=True)

st.markdown("---")

# ═══════════════════════════════════════════════════════════════════════════════
# TABS
# ═══════════════════════════════════════════════════════════════════════════════

tab_actividad, tab_leyes, tab_boe, tab_coaliciones, tab_actores_leg, tab_multinivel = st.tabs([
    "ACTIVIDAD PARLAMENTARIA",
    "SEGUIMIENTO DE LEYES",
    "BOE & NORMATIVA",
    "COALICIONES PARLAMENTARIAS",
    "INICIATIVAS POR ACTOR",
    "LEGISLACION MULTINIVEL",
])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — ACTIVIDAD PARLAMENTARIA
# ═══════════════════════════════════════════════════════════════════════════════

with tab_actividad:

    # ── Gráfico actividad semanal 90 días ────────────────────────────────────
    section_header("Actividad parlamentaria — últimas 13 semanas", CYAN)

    rng = random.Random(42)
    semanas = [(datetime.now() - timedelta(weeks=12 - i)).strftime("S%W") for i in range(13)]
    proposiciones = [rng.randint(8, 28) for _ in range(13)]
    debates = [rng.randint(3, 12) for _ in range(13)]
    votaciones_hist = [rng.randint(1, 8) for _ in range(13)]

    fig_act = go.Figure()
    fig_act.add_trace(go.Bar(
        name="Proposiciones presentadas",
        x=semanas, y=proposiciones,
        marker_color=CYAN,
    ))
    fig_act.add_trace(go.Bar(
        name="Debates en comisión",
        x=semanas, y=debates,
        marker_color=PURPLE,
    ))
    fig_act.add_trace(go.Bar(
        name="Votaciones",
        x=semanas, y=votaciones_hist,
        marker_color=AMBER,
    ))
    fig_act.update_layout(
        barmode="group",
        height=300,
        legend=dict(bgcolor=BG3, bordercolor=BORDER, font=dict(color=TEXT2, size=11)),
        xaxis=dict(title="Semana"),
        yaxis=dict(title="N.º actos"),
        margin=dict(l=0, r=0, t=10, b=0),
    )
    apply_plotly_theme(fig_act)
    st.plotly_chart(fig_act, use_container_width=True)

    # ── Agenda de hoy ─────────────────────────────────────────────────────────
    section_header(f"Agenda parlamentaria — {datetime.now().strftime('%A %d de %B de %Y').capitalize()}", BLUE)

    tipo_color_agenda = {
        "Comisión": PURPLE,
        "Pleno": CYAN,
        "Comparecencia": AMBER,
        "Votación": RED,
    }

    for item in AGENDA_HOY:
        tipo = item.get("tipo", "")
        c_tipo = tipo_color_agenda.get(tipo, MUTED)
        st.markdown(
            f'<div class="agenda-item">'
            f'<div class="agenda-hora">{item["hora"]}</div>'
            f'<span class="agenda-tipo" style="background:{c_tipo}22;color:{c_tipo};border:1px solid {c_tipo}33">'
            f'{tipo}</span>'
            f'<div style="flex:1;">'
            f'<div style="font-size:.85rem;font-weight:600;color:{TEXT}">{item["descripcion"]}</div>'
            f'<div style="font-size:.7rem;color:{MUTED};margin-top:.1rem"> {item["sala"]}</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Próximas votaciones ────────────────────────────────────────────────────
    section_header("Votaciones próximas clave", RED)

    for voto in PROXIMAS_VOTACIONES:
        prob = voto["prob_aprobacion"] if "prob_aprobacion" in voto else voto.get("prob", 0)
        prob_color = GREEN if prob >= 0.6 else (AMBER if prob >= 0.4 else RED)
        partidos_tags = " ".join(
            f'<span style="background:{COLORES_PARTIDOS.get(p,CYAN)}22;color:{COLORES_PARTIDOS.get(p,CYAN)};'
            f'font-size:.6rem;font-weight:700;padding:.15rem .45rem;border-radius:4px">{p}</span>'
            for p in voto.get("partidos_clave", [])
        )
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
            f'padding:.85rem 1.1rem;margin-bottom:.5rem">'
            f'<div style="display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.5rem">'
            f'<div style="flex:1">'
            f'<div style="font-size:.88rem;font-weight:700;color:{TEXT}">{voto["ley"]}</div>'
            f'<div style="font-size:.72rem;color:{TEXT2};margin-top:.1rem">'
            f' {voto["fecha"]} · {voto["requiere"]}</div>'
            f'</div>'
            f'<div style="text-align:right">'
            f'<div style="font-size:1.3rem;font-weight:900;color:{prob_color}">{int(prob*100)}%</div>'
            f'<div style="font-size:.6rem;color:{MUTED}">prob. aprobación</div>'
            f'</div>'
            f'</div>'
            f'{_prob_bar(prob, prob_color)}'
            f'<div style="margin-top:.5rem">{partidos_tags}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Calculadora de coaliciones para votar ─────────────────────────────────
    section_header("Calculadora de mayoría parlamentaria", GREEN)

    partidos_calc = list(PARTIDOS_ESCANOS.keys())
    sel_coalicion = st.multiselect(
        "Partidos en favor",
        options=partidos_calc,
        default=["PSOE", "SUMAR", "ERC", "PNV", "EH Bildu"],
        key="calc_coalicion",
    )

    escanos_favor = sum(PARTIDOS_ESCANOS.get(p, 0) for p in sel_coalicion)
    escanos_contra = TOTAL_ESCANOS - escanos_favor
    tiene_mayoria_abs = escanos_favor >= MAYORIA_ABS

    col_calc1, col_calc2, col_calc3 = st.columns(3)
    with col_calc1:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {GREEN};'
            f'border-radius:10px;padding:.9rem;text-align:center">'
            f'<div style="font-size:2rem;font-weight:900;color:{GREEN}">{escanos_favor}</div>'
            f'<div style="font-size:.65rem;color:{MUTED}">escaños a favor</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
    with col_calc2:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {RED};'
            f'border-radius:10px;padding:.9rem;text-align:center">'
            f'<div style="font-size:2rem;font-weight:900;color:{RED}">{escanos_contra}</div>'
            f'<div style="font-size:.65rem;color:{MUTED}">escaños en contra / abstención</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
    with col_calc3:
        resultado_color = GREEN if tiene_mayoria_abs else RED
        resultado_txt = "MAYORÍA ABSOLUTA" if tiene_mayoria_abs else f"FALTAN {MAYORIA_ABS - escanos_favor}"
        st.markdown(
            f'<div style="background:{resultado_color}18;border:1px solid {resultado_color}44;'
            f'border-radius:10px;padding:.9rem;text-align:center">'
            f'<div style="font-size:1rem;font-weight:900;color:{resultado_color}">{resultado_txt}</div>'
            f'<div style="font-size:.65rem;color:{MUTED}">umbral: {MAYORIA_ABS} escaños</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Barra visual de escaños
    pct_favor = escanos_favor / TOTAL_ESCANOS * 100
    pct_contra = escanos_contra / TOTAL_ESCANOS * 100
    umbral_pct = MAYORIA_ABS / TOTAL_ESCANOS * 100
    st.markdown(
        f'<div style="margin:.8rem 0;height:20px;background:{RED}44;border-radius:6px;overflow:hidden;position:relative">'
        f'<div style="height:100%;width:{pct_favor:.1f}%;background:{GREEN};border-radius:6px 0 0 6px;'
        f'display:flex;align-items:center;padding-left:.5rem;font-size:.68rem;font-weight:700;color:{BG}">'
        f'{escanos_favor} escaños</div>'
        f'<div style="position:absolute;top:0;left:{umbral_pct:.1f}%;height:100%;width:2px;'
        f'background:{CYAN};z-index:2"></div>'
        f'</div>'
        f'<div style="font-size:.65rem;color:{MUTED};margin-top:.2rem;">Umbral mayoría absoluta: {MAYORIA_ABS} escaños ({umbral_pct:.0f}% del hemiciclo)</div>',
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — SEGUIMIENTO DE LEYES
# ═══════════════════════════════════════════════════════════════════════════════

with tab_leyes:
    section_header("Tracker de iniciativas legislativas", CYAN)

    # ── Carga de datos reales (Bloque 1 Core) ─────────────────────────────────
    _df_init_real = cargar_iniciativas_recientes(limit=50, days=90)
    _modo_demo_init = _df_init_real.empty

    if not _modo_demo_init and not _df_init_real.empty:
        # Mostrar iniciativas reales + búsqueda
        st.markdown(
            f'<div style="background:#0a1f10;border:1px solid {GREEN}44;border-radius:8px;'
            f'padding:.5rem .9rem;margin-bottom:.8rem;font-size:.78rem;color:{GREEN}">'
            f'Datos reales — {len(_df_init_real)} iniciativas del Congreso (últimos 90 días) · '
            f'Fuente: Congreso datos abiertos'
            f'</div>',
            unsafe_allow_html=True,
        )
        _search_q = st.text_input("Buscar iniciativa", placeholder="ej: vivienda, pensiones, IA…", key="init_search")
        if _search_q:
            _df_search = buscar_items_legislativos(_search_q, limit=30)
            if not _df_search.empty:
                _init_cols = ["titulo", "tipo", "fecha", "impacto"]
                _cols_show = [c for c in _init_cols if c in _df_search.columns]
                st.dataframe(_df_search[_cols_show], use_container_width=True, hide_index=True, height=280)
            else:
                st.info("Sin resultados para esa búsqueda.")

        # Tabla resumen de iniciativas reales
        _rename = {
            "source_id": "ID", "initiative_type": "Tipo", "title": "Título",
            "presented_date": "Presentación", "status": "Estado", "impact_level": "Impacto",
        }
        _cols_real = [c for c in ["source_id", "initiative_type", "title", "presented_date", "status", "impact_level"]
                      if c in _df_init_real.columns]
        st.dataframe(
            _df_init_real[_cols_real].rename(columns=_rename),
            use_container_width=True, hide_index=True, height=340,
        )
        st.markdown("---")
        section_header("Iniciativas clave (histórico curado)", MUTED)
        st.caption("Datos de referencia — histórico curado para análisis de coaliciones")
    else:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {AMBER}33;border-radius:8px;'
            f'padding:.45rem .9rem;margin-bottom:.7rem;font-size:.75rem;color:{AMBER}">'
            f'Modo demo — ejecuta el monitor para datos reales: '
            f'<code>python -m pipelines.legislative_core --source congreso</code>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Filtros
    fl1, fl2, fl3 = st.columns(3)
    with fl1:
        filtro_proponente = st.selectbox(
            "Proponente",
            ["Todos", "PSOE", "PP", "VOX", "SUMAR", "JUNTS", "ERC", "Gobierno", "PSOE-SUMAR", "PSOE-ERC", "PSOE-JUNTS"],
            key="leg_proponente",
        )
    with fl2:
        filtro_area = st.selectbox(
            "Área temática",
            ["Todas", "Social", "Económico", "Tecnología", "Institucional", "Fiscal", "Medioambiental"],
            key="leg_area",
        )
    with fl3:
        filtro_urgencia = st.selectbox(
            "Urgencia",
            ["Todas", "critica", "alta", "media", "baja"],
            key="leg_urgencia",
        )

    leyes_filtradas = DEMO_LEYES[:]
    if filtro_proponente != "Todos":
        leyes_filtradas = [l for l in leyes_filtradas if l["proponente"] == filtro_proponente]
    if filtro_area != "Todas":
        leyes_filtradas = [l for l in leyes_filtradas if l["area"] == filtro_area]
    if filtro_urgencia != "Todas":
        leyes_filtradas = [l for l in leyes_filtradas if l["urgencia"] == filtro_urgencia]

    _URGENCIA_ORDER = {"critica": 0, "alta": 1, "media": 2, "baja": 3}
    leyes_filtradas = sorted(leyes_filtradas, key=lambda l: (_URGENCIA_ORDER.get(l["urgencia"], 99), -l["prob_aprobacion"]))

    st.markdown(f"<div style='color:{MUTED};font-size:.78rem;margin-bottom:.8rem'>Mostrando {len(leyes_filtradas)} de {len(DEMO_LEYES)} iniciativas</div>", unsafe_allow_html=True)

    for ley in leyes_filtradas:
        fase = ley["fase"]
        prob = ley["prob_aprobacion"]
        prob_color = GREEN if prob >= 0.6 else (AMBER if prob >= 0.4 else RED)
        urgencia_cfg = URGENCIA_CFG.get(ley["urgencia"], URGENCIA_CFG["media"])
        partidos_tags = " ".join(
            f'<span style="background:{COLORES_PARTIDOS.get(p,CYAN)}22;color:{COLORES_PARTIDOS.get(p,CYAN)};'
            f'font-size:.6rem;font-weight:700;padding:.12rem .42rem;border-radius:4px">{p}</span>'
            for p in ley.get("partidos_clave", [])
        )

        with st.expander(f"{ley['ley']}  ·  Fase {fase}/4: {FASES_LEGISLATIVAS[min(fase, len(FASES_LEGISLATIVAS)-1)]}  ·  Prob. {int(prob*100)}%", expanded=False):
            exp_col1, exp_col2 = st.columns([3, 1])
            with exp_col1:
                st.markdown(
                    f'<div class="ley-card">'
                    f'<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.6rem;flex-wrap:wrap">'
                    f'{_urgencia_badge(ley["urgencia"])}'
                    f'{_area_badge(ley["area"])}'
                    f'<span style="font-size:.7rem;color:{TEXT2}"> {ley["proponente"]}</span>'
                    f'<span style="margin-left:auto;font-size:.7rem;color:{MUTED}">ID: {ley["id"]}</span>'
                    f'</div>'
                    f'<div style="font-size:.83rem;color:{TEXT2};line-height:1.6;margin-bottom:.8rem">{ley["descripcion"]}</div>'
                    f'<div style="font-size:.72rem;color:{MUTED};margin-bottom:.5rem">Inicio: {ley.get("fecha_inicio","—")} · Plazo estimado: {ley.get("plazo_estimado","—")}</div>'
                    f'<div style="font-size:.7rem;color:{TEXT2};margin-bottom:.4rem">Partidos clave para aprobación:</div>'
                    f'{partidos_tags}'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            with exp_col2:
                st.markdown(
                    f'<div style="background:{prob_color}18;border:1px solid {prob_color}44;'
                    f'border-radius:10px;padding:1rem;text-align:center">'
                    f'<div style="font-size:2rem;font-weight:900;color:{prob_color}">{int(prob*100)}%</div>'
                    f'<div style="font-size:.62rem;color:{MUTED}">prob. aprobación</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

            # Pipeline de fases
            st.markdown("<div style='margin-top:.6rem'>", unsafe_allow_html=True)
            fase_labels_html = "".join(
                f'<div style="flex:1;text-align:center;font-size:.6rem;'
                f'color:{""+CYAN+"" if i < fase else (AMBER if i == fase else MUTED)};'
                f'font-weight:{"700" if i <= fase else "400"}">'
                f'{FASES_LEGISLATIVAS[i]}</div>'
                for i in range(5)
            )
            st.markdown(
                f'<div style="display:flex;gap:3px;margin-bottom:.3rem">{fase_labels_html}</div>'
                f'{_fase_bar(fase)}'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Vista resumen en tabla
    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
    section_header("Resumen tabular", MUTED)
    df_leyes = pd.DataFrame([{
        "ID": l["id"],
        "Ley": l["ley"][:45] + ("…" if len(l["ley"]) > 45 else ""),
        "Proponente": l["proponente"],
        "Área": l["area"],
        "Fase": f'{l["fase"]}/4: {FASES_LEGISLATIVAS[min(l["fase"], 4)]}',
        "Urgencia": l["urgencia"].upper(),
        "Prob. aprobación": f'{int(l["prob_aprobacion"]*100)}%',
    } for l in DEMO_LEYES])
    st.dataframe(df_leyes, use_container_width=True, hide_index=True, height=320)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — BOE & NORMATIVA
# ═══════════════════════════════════════════════════════════════════════════════

with tab_boe:
    section_header("BOE — Boletín Oficial del Estado", RED)

    # ── Carga de datos — Bloque 1 Core primero, luego API legacy ─────────────
    with st.spinner("Cargando sumario BOE…"):
        items_raw = _cargar_boe()

    _fuente_boe = "tabla legal_items" if (_LEG_CORE_OK and items_raw) else "API BOE tiempo real"
    _modo_demo_boe = not bool(items_raw)

    if items_raw and _LEG_CORE_OK:
        st.markdown(
            f'<div style="background:#0a1f10;border:1px solid {GREEN}44;border-radius:8px;'
            f'padding:.45rem .9rem;margin-bottom:.6rem;font-size:.75rem;color:{GREEN}">'
            f'Datos reales ({_fuente_boe}) — {len(items_raw)} disposiciones'
            f'</div>',
            unsafe_allow_html=True,
        )

    if not items_raw:
        items_raw = []

    items: list[dict] = []
    for item in items_raw:
        # Normalizar campos del schema nuevo al esperado por la UI
        if "titulo" not in item and "title" in item:
            item["titulo"] = item["title"]
        if "departamento" not in item and "department" in item:
            item["departamento"] = item["department"]
        if "seccion" not in item and "section" in item:
            item["seccion"] = item["section"]
        if "id" not in item and "source_id" in item:
            item["id"] = item["source_id"]
        if "impacto" not in item:
            item["impacto"] = item.get("impact_level") or _clasificar_impacto(
                item.get("titulo", ""),
                item.get("seccion", ""),
                item.get("departamento", ""),
            )
        items.append(item)

    counts = {lvl: sum(1 for i in items if i.get("impacto") == lvl) for lvl in IMPACT_CFG}
    total_items = len(items)

    st.markdown(f"""
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem;margin-bottom:1.2rem">
      {kpi_card("CRÍTICO",   str(counts.get("CRÍTICO",0)),     "disposiciones críticas", RED)}
      {kpi_card("ALTO",      str(counts.get("ALTO",0)),        "alto impacto",           AMBER)}
      {kpi_card("MEDIO",     str(counts.get("MEDIO",0)),       "impacto medio",          "#F59E0B")}
      {kpi_card("BAJO",      str(counts.get("BAJO",0)),        "bajo impacto",           GREEN)}
      {kpi_card("TOTAL BOE", str(total_items),                 "disposiciones hoy",      CYAN)}
    </div>
    """, unsafe_allow_html=True)

    if items:
        col_f1, col_f2, col_f3 = st.columns([2, 2, 1])
        with col_f1:
            all_depts = sorted({i.get("departamento", "—") for i in items if i.get("departamento")})
            sel_depts = st.multiselect("Departamento", options=all_depts, default=[], placeholder="Todos", key="boe_depts")
        with col_f2:
            sel_impact = st.multiselect("Nivel de impacto", options=list(IMPACT_CFG.keys()), default=[], placeholder="Todos", key="boe_impact")
        with col_f3:
            modo_agrupado = st.toggle("Agrupar por dpto.", value=False, key="boe_agrupar")

        items_filtrados = items
        if sel_depts:
            items_filtrados = [i for i in items_filtrados if i.get("departamento") in sel_depts]
        if sel_impact:
            items_filtrados = [i for i in items_filtrados if i.get("impacto") in sel_impact]

        st.markdown(f"<div style='color:{MUTED};font-size:.78rem;margin-bottom:.5rem'>Mostrando {len(items_filtrados)} de {total_items} disposiciones</div>", unsafe_allow_html=True)

        if not modo_agrupado:
            orden_imp = {"CRÍTICO": 0, "ALTO": 1, "MEDIO": 2, "BAJO": 3, "INFORMATIVO": 4}
            items_ord = sorted(items_filtrados, key=lambda x: orden_imp.get(x.get("impacto", "INFORMATIVO"), 9))
            for item in items_ord:
                col_boe, col_ia = st.columns([5, 1])
                with col_boe:
                    _render_boe_card(item)
                with col_ia:
                    st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
                    if st.button("IA", key=f"boe_ia_{item.get('id','')}", help="Análisis IA de este ítem", use_container_width=True):
                        st.session_state[f"boe_ia_resp_{item.get('id','')}"] = (
                            f"[Análisis IA de: {item.get('titulo','')[:80]}]\n\n"
                            "Esta disposición tiene impacto relevante en el sector afectado. "
                            "Activa Ollama para obtener un análisis completo de implicaciones legales, "
                            "económicas y políticas."
                        )
                    resp_key = f"boe_ia_resp_{item.get('id','')}"
                    if st.session_state.get(resp_key):
                        st.markdown(
                            f'<div style="background:{BG3};border:1px solid {PURPLE}33;border-radius:8px;'
                            f'padding:.6rem .8rem;font-size:.72rem;color:{TEXT2};margin-top:.2rem">'
                            f'{st.session_state[resp_key][:180]}'
                            f'</div>',
                            unsafe_allow_html=True,
                        )
        else:
            grupos: dict[str, list[dict]] = {}
            for item in items_filtrados:
                d = item.get("departamento", "Sin departamento")
                grupos.setdefault(d, []).append(item)
            for dept_name, dept_items in sorted(grupos.items()):
                criticos = sum(1 for x in dept_items if x.get("impacto") == "CRÍTICO")
                altos = sum(1 for x in dept_items if x.get("impacto") == "ALTO")
                badge_extra = ""
                if criticos:
                    badge_extra += f' <span style="color:{RED};font-weight:700">● {criticos} crítico(s)</span>'
                if altos:
                    badge_extra += f' <span style="color:{AMBER};font-weight:700">● {altos} alto(s)</span>'
                with st.expander(f" {dept_name}  ({len(dept_items)} disposiciones){badge_extra}", expanded=(criticos > 0)):
                    for item in dept_items:
                        _render_boe_card(item)
    else:
        # Demo BOE con normas ficticias de calidad
        section_header("Normativa de referencia (demo — fuente oficial no disponible)", AMBER)
        st.info("La API del BOE no está disponible en este momento. Mostrando normativa de referencia reciente.")

        demo_boe = [
            {"id": "BOE-A-2026-1823", "titulo": "Real Decreto-ley 4/2026 sobre medidas urgentes en materia de vivienda asequible", "departamento": "Ministerio de Vivienda", "seccion": "I", "impacto": "CRÍTICO", "url_html": "https://boe.es"},
            {"id": "BOE-A-2026-1824", "titulo": "Orden HAC/381/2026 por la que se regulan los plazos para la presentación del IRPF 2025", "departamento": "Ministerio de Hacienda", "seccion": "I", "impacto": "ALTO", "url_html": "https://boe.es"},
            {"id": "BOE-A-2026-1825", "titulo": "Resolución de la Secretaría de Estado Digital sobre el Registro de Sistemas de IA de Alto Riesgo", "departamento": "Ministerio para la Transformación Digital", "seccion": "II", "impacto": "ALTO", "url_html": "https://boe.es"},
            {"id": "BOE-A-2026-1826", "titulo": "Anuncio de licitación del contrato de servicios para la digitalización de archivos del Congreso", "departamento": "Congreso de los Diputados", "seccion": "V", "impacto": "BAJO", "url_html": "https://boe.es"},
            {"id": "BOE-A-2026-1827", "titulo": "Convocatoria de subvenciones para energías renovables en PYME industriales 2026", "departamento": "Ministerio de Transición Ecológica", "seccion": "III", "impacto": "MEDIO", "url_html": "https://boe.es"},
        ]
        for demo_item in demo_boe:
            _render_boe_card(demo_item)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4 — COALICIONES PARLAMENTARIAS
# ═══════════════════════════════════════════════════════════════════════════════

with tab_coaliciones:
    section_header("Mapa de fuerzas parlamentarias", BLUE)

    # Hemiciclo visual — barras de escaños por partido
    partidos_sorted = sorted(PARTIDOS_ESCANOS.items(), key=lambda x: -x[1])
    nombres_par = [p for p, e in partidos_sorted]
    escanos_par = [e for p, e in partidos_sorted]
    colores_par = [COLORES_PARTIDOS.get(p, MUTED) for p in nombres_par]

    fig_escanos = go.Figure(go.Bar(
        x=nombres_par, y=escanos_par,
        marker_color=colores_par,
        text=escanos_par, textposition="outside",
        textfont=dict(color=TEXT, size=11),
    ))
    fig_escanos.add_hline(y=MAYORIA_ABS, line_dash="dash", line_color=RED, opacity=0.7,
                          annotation_text=f"Mayoría absoluta ({MAYORIA_ABS})",
                          annotation_font_color=RED)
    fig_escanos.update_layout(
        height=300,
        xaxis=dict(title="Partido"),
        yaxis=dict(title="Escaños"),
        margin=dict(l=0, r=0, t=10, b=0),
    )
    apply_plotly_theme(fig_escanos)
    st.plotly_chart(fig_escanos, use_container_width=True)

    # ── Probabilidades por votación ────────────────────────────────────────────
    section_header("Probabilidades por votación clave", CYAN)

    voto_col_a, voto_col_b = st.columns(2)
    for i, voto in enumerate(PROXIMAS_VOTACIONES):
        prob = voto.get("prob", 0)
        prob_color = GREEN if prob >= 0.6 else (AMBER if prob >= 0.4 else RED)
        partidos_tags = " ".join(
            f'<span style="background:{COLORES_PARTIDOS.get(p,CYAN)}22;color:{COLORES_PARTIDOS.get(p,CYAN)};'
            f'font-size:.6rem;font-weight:700;padding:.12rem .42rem;border-radius:4px">{p}</span>'
            for p in voto.get("partidos_clave", [])
        )
        col = voto_col_a if i % 2 == 0 else voto_col_b
        with col:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {prob_color};'
                f'border-radius:10px;padding:.9rem 1rem;margin-bottom:.6rem">'
                f'<div style="font-size:.88rem;font-weight:700;color:{TEXT};margin-bottom:.3rem">{voto["ley"]}</div>'
                f'<div style="font-size:.7rem;color:{TEXT2};margin-bottom:.4rem">'
                f' {voto["fecha"]} · {voto["requiere"]}</div>'
                f'{_prob_bar(prob, prob_color)}'
                f'<div style="margin-top:.5rem">{partidos_tags}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # ── Heatmap histórico de alineación ───────────────────────────────────────
    section_header("Matriz histórica de alineación de voto (% votos coincidentes)", PURPLE)

    partidos_hm = list(HISTORICO_ALINEACION.keys())
    z_matrix = [[HISTORICO_ALINEACION[p1].get(p2, 0) for p2 in partidos_hm] for p1 in partidos_hm]

    colorscale_hm = [
        [0.0, f"{RED}"],
        [0.5, f"{AMBER}"],
        [1.0, f"{GREEN}"],
    ]

    hover_hm = [
        [f"<b>{p1} ↔ {p2}</b><br>{int(HISTORICO_ALINEACION[p1].get(p2,0)*100)}% alineación histórica" for p2 in partidos_hm]
        for p1 in partidos_hm
    ]

    fig_hm = go.Figure(go.Heatmap(
        z=z_matrix,
        x=partidos_hm,
        y=partidos_hm,
        colorscale=colorscale_hm,
        zmin=0, zmax=1,
        text=[[f"{int(v*100)}%" for v in row] for row in z_matrix],
        texttemplate="%{text}",
        textfont=dict(color=TEXT, size=10),
        hovertemplate="%{customdata}<extra></extra>",
        customdata=hover_hm,
        showscale=True,
        colorbar=dict(
            title=dict(text="Alineación", font=dict(color=TEXT2)),
            tickvals=[0, 0.5, 1],
            ticktext=["0%", "50%", "100%"],
            tickfont=dict(color=TEXT2, size=10),
        ),
    ))
    fig_hm.update_layout(
        height=380,
        margin=dict(l=10, r=10, t=10, b=10),
        xaxis=dict(tickfont=dict(color=TEXT, size=11)),
        yaxis=dict(tickfont=dict(color=TEXT, size=11)),
    )
    apply_plotly_theme(fig_hm)
    st.plotly_chart(fig_hm, use_container_width=True)

    # ── Sorpresas recientes ────────────────────────────────────────────────────
    section_header("Sorpresas recientes en votaciones", AMBER)

    sorpresas = [
        {"fecha": "2026-04-29", "ley": "PNL sobre energía nuclear", "sorpresa": "PP vota a favor con PSOE",
         "esperado": "PP en contra", "resultado": "APROBADA", "impacto": "alto"},
        {"fecha": "2026-04-22", "ley": "Moción censura Valencia", "sorpresa": "JUNTS se abstiene",
         "esperado": "JUNTS a favor oposición", "resultado": "RECHAZADA", "impacto": "medio"},
        {"fecha": "2026-04-15", "ley": "Reforma laboral sectorial", "sorpresa": "EH Bildu vota contra PSOE",
         "esperado": "EH Bildu a favor gobierno", "resultado": "RECHAZADA", "impacto": "alto"},
    ]

    for s in sorpresas:
        c_imp = AMBER if s["impacto"] == "medio" else RED
        resultado_c = GREEN if s["resultado"] == "APROBADA" else RED
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {c_imp}44;border-left:3px solid {c_imp};'
            f'border-radius:10px;padding:.85rem 1rem;margin-bottom:.5rem">'
            f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.3rem">'
            f'<span style="font-size:.8rem;font-weight:700;color:{TEXT};flex:1">{s["ley"]}</span>'
            f'<span style="background:{resultado_c}22;color:{resultado_c};font-size:.62rem;font-weight:700;'
            f'padding:.15rem .5rem;border-radius:4px">{s["resultado"]}</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">{s["fecha"]}</span>'
            f'</div>'
            f'<div style="font-size:.78rem;color:{c_imp};font-weight:600;margin-bottom:.15rem">'
            f'Sorpresa: {s["sorpresa"]}</div>'
            f'<div style="font-size:.72rem;color:{MUTED}">Esperado: {s["esperado"]}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Votaciones recientes detalladas ────────────────────────────────────────
    section_header("Votaciones recientes — detalle por partido", BLUE)

    partidos_voto = ["PP", "PSOE", "VOX", "SUMAR", "JUNTS"]
    voto_val = {"favor": 1, "abstencion": 0, "contra": -1}
    voto_label = {"favor": "A FAVOR", "abstencion": "ABSTENCIÓN", "contra": "EN CONTRA"}
    voto_color_map = {"favor": GREEN, "abstencion": AMBER, "contra": RED}

    for v in DEMO_VOTACIONES:
        res_color = GREEN if v["resultado"] == "APROBADA" else RED
        disciplina_items = []
        for p in partidos_voto:
            voto = v.get(p, "abstencion")
            c = voto_color_map.get(voto, MUTED)
            disciplina_items.append(
                f'<span style="background:{c}22;color:{c};font-size:.65rem;font-weight:700;'
                f'padding:.15rem .45rem;border-radius:6px;border:1px solid {c}44">{p}: {voto_label[voto][:1]}</span>'
            )
        disciplina_html = " ".join(disciplina_items)
        tipo_color = PURPLE if v["tipo"] in ("PL", "PLO", "RDL") else CYAN
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
            f'padding:.85rem 1.1rem;margin-bottom:.5rem">'
            f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">'
            f'<span style="background:{tipo_color}22;color:{tipo_color};font-size:.62rem;font-weight:800;'
            f'padding:.18rem .55rem;border-radius:6px;border:1px solid {tipo_color}44">{v["tipo"]}</span>'
            f'<span style="font-size:.8rem;font-weight:700;color:{TEXT}">{v["iniciativa"][:90]}</span>'
            f'<span style="margin-left:auto;background:{res_color}22;color:{res_color};font-size:.65rem;'
            f'font-weight:800;padding:.2rem .6rem;border-radius:6px;border:1px solid {res_color}44">'
            f'{v["resultado"]}</span>'
            f'</div>'
            f'<div style="display:flex;align-items:center;gap:.45rem;flex-wrap:wrap">'
            f'{disciplina_html}'
            f'<span style="margin-left:auto;font-size:.65rem;color:{MUTED}">{v["fecha"]} · {v["id"]}</span>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5 — INICIATIVAS POR ACTOR
# ═══════════════════════════════════════════════════════════════════════════════

with tab_actores_leg:
    section_header("Productividad legislativa por actor", PURPLE)

    # Score de productividad = iniciativas presentadas * 0.3 + (aprobadas * 10) - (rechazadas * 2)
    def _score_prod(actor: dict) -> float:
        return (
            actor["presentadas"] * 0.3
            + actor["aprobadas"] * 10
            - actor["rechazadas"] * 2
            + actor["debate"] * 1.5
        )

    actores_leg_sorted = sorted(INICIATIVAS_ACTOR, key=lambda a: -_score_prod(a))

    # Gráfico de barras comparativo
    nombres_leg = [a["actor"].split()[-1] for a in actores_leg_sorted]
    scores_leg = [round(_score_prod(a), 1) for a in actores_leg_sorted]
    colores_leg = [COLORES_PARTIDOS.get(a["partido"], CYAN) for a in actores_leg_sorted]

    fig_prod = go.Figure(go.Bar(
        x=nombres_leg, y=scores_leg,
        marker_color=colores_leg,
        text=[f"{s:.0f}" for s in scores_leg],
        textposition="outside",
        textfont=dict(color=TEXT, size=11),
    ))
    fig_prod.update_layout(
        height=280,
        xaxis=dict(title="Actor"),
        yaxis=dict(title="Score productividad"),
        margin=dict(l=0, r=0, t=10, b=0),
    )
    apply_plotly_theme(fig_prod)
    st.plotly_chart(fig_prod, use_container_width=True)

    # Métricas comparativas en gráfico apilado
    section_header("Iniciativas: presentadas / aprobadas / rechazadas", CYAN)

    fig_stack = go.Figure()
    fig_stack.add_trace(go.Bar(
        name="Presentadas",
        x=nombres_leg,
        y=[a["presentadas"] for a in actores_leg_sorted],
        marker_color=BLUE,
    ))
    fig_stack.add_trace(go.Bar(
        name="En debate",
        x=nombres_leg,
        y=[a["debate"] for a in actores_leg_sorted],
        marker_color=AMBER,
    ))
    fig_stack.add_trace(go.Bar(
        name="Aprobadas",
        x=nombres_leg,
        y=[a["aprobadas"] for a in actores_leg_sorted],
        marker_color=GREEN,
    ))
    fig_stack.add_trace(go.Bar(
        name="Rechazadas",
        x=nombres_leg,
        y=[a["rechazadas"] for a in actores_leg_sorted],
        marker_color=RED,
    ))
    fig_stack.update_layout(
        barmode="group",
        height=300,
        legend=dict(bgcolor=BG3, bordercolor=BORDER, font=dict(color=TEXT2, size=10)),
        margin=dict(l=0, r=0, t=10, b=0),
    )
    apply_plotly_theme(fig_stack)
    st.plotly_chart(fig_stack, use_container_width=True)

    # Tarjetas por actor con temas
    section_header("Detalle por actor — temas y productividad", AMBER)

    for actor in actores_leg_sorted:
        score = _score_prod(actor)
        c_partido = COLORES_PARTIDOS.get(actor["partido"], CYAN)
        tasa_exit = actor["aprobadas"] / max(actor["presentadas"], 1) * 100
        temas_tags = "".join(
            f'<span class="tema-tag">{tema}</span>'
            for tema in actor["temas"]
        )
        st.markdown(
            f'<div class="actor-prod-card">'
            f'<div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.7rem">'
            f'<div style="width:42px;height:42px;border-radius:50%;background:{c_partido}22;border:2px solid {c_partido};'
            f'display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:900;color:{c_partido}">'
            f'{actor["actor"][0]}</div>'
            f'<div style="flex:1">'
            f'<div style="font-size:.95rem;font-weight:800;color:{TEXT}">{actor["actor"]}</div>'
            f'<div style="font-size:.7rem;color:{MUTED}">{actor["partido"]} · Score: <span style="color:{CYAN};font-weight:700">{score:.0f}</span></div>'
            f'</div>'
            f'<div style="display:flex;gap:1rem;text-align:center">'
            f'<div><div style="font-size:1.1rem;font-weight:900;color:{BLUE}">{actor["presentadas"]}</div><div style="font-size:.58rem;color:{MUTED}">presentadas</div></div>'
            f'<div><div style="font-size:1.1rem;font-weight:900;color:{GREEN}">{actor["aprobadas"]}</div><div style="font-size:.58rem;color:{MUTED}">aprobadas</div></div>'
            f'<div><div style="font-size:1.1rem;font-weight:900;color:{RED}">{actor["rechazadas"]}</div><div style="font-size:.58rem;color:{MUTED}">rechazadas</div></div>'
            f'<div><div style="font-size:1.1rem;font-weight:900;color:{AMBER}">{tasa_exit:.0f}%</div><div style="font-size:.58rem;color:{MUTED}">éxito</div></div>'
            f'</div>'
            f'</div>'
            f'<div style="font-size:.68rem;color:{MUTED};margin-bottom:.35rem">Temas principales:</div>'
            f'{temas_tags}'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Tabla comparativa final
    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
    section_header("Tabla comparativa completa", MUTED)
    df_actores_leg = pd.DataFrame([{
        "Actor": a["actor"],
        "Partido": a["partido"],
        "Presentadas": a["presentadas"],
        "En debate": a["debate"],
        "Aprobadas": a["aprobadas"],
        "Rechazadas": a["rechazadas"],
        "Tasa éxito": f'{a["aprobadas"]/max(a["presentadas"],1)*100:.0f}%',
        "Score": f'{_score_prod(a):.0f}',
    } for a in actores_leg_sorted])
    st.dataframe(df_actores_leg, use_container_width=True, hide_index=True, height=280)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 6 — LEGISLACION MULTINIVEL
# ═══════════════════════════════════════════════════════════════════════════════

# -- Demo data ----------------------------------------------------------------
_DEMO_MULTINIVEL = [
    {
        "level": "european", "region": "UE", "doc_type": "Reglamento",
        "title": "Reglamento (UE) 2025/847 relativo a la resiliencia cibernética de las infraestructuras críticas",
        "reference_id": "EUR-Lex 2025/847",
        "url": "https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32025R0847",
        "status": "published",
        "published_at": "2025-03-12",
        "ai_summary": "Establece requisitos obligatorios de ciberseguridad para operadores de infraestructuras críticas (energía, transporte, agua, banca) en toda la UE. Introduce auditorías cada 24 meses y notificación de incidentes en 24h.",
        "ai_impact_level": "high", "ai_relevance": 9,
        "ai_sectors": ["ciberseguridad", "energía", "transporte"],
        "ai_obligations": "Planes de continuidad de negocio, pruebas de penetración anuales, registro de incidentes 24h.",
        "ai_deadlines": [{"plazo": "Transposición nacional", "fecha": "2026-01-01"}, {"plazo": "Auditoría inicial", "fecha": "2026-06-30"}],
        "ai_affected_regions": ["España", "UE-27"],
        "ai_category": "ciberseguridad",
        "ai_eu_relation": "Norma primaria UE — aplicación directa",
    },
    {
        "level": "european", "region": "UE", "doc_type": "Directiva",
        "title": "Directiva (UE) 2025/312 sobre transparencia algorítmica en plataformas de contenido político",
        "reference_id": "EUR-Lex 2025/312",
        "url": "https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32025L0312",
        "status": "pending",
        "published_at": "2025-04-01",
        "ai_summary": "Obliga a plataformas de >10M usuarios en la UE a publicar sus algoritmos de recomendación de contenido político y permitir auditorías independientes antes de cada proceso electoral.",
        "ai_impact_level": "high", "ai_relevance": 8,
        "ai_sectors": ["tecnología", "medios", "electoral"],
        "ai_obligations": "Publicación de parámetros algorítmicos, acceso a investigadores acreditados, informe anual al regulador.",
        "ai_deadlines": [{"plazo": "Transposición", "fecha": "2026-09-01"}],
        "ai_affected_regions": ["España", "UE-27"],
        "ai_category": "tecnología",
        "ai_eu_relation": "Transponer en legislación nacional",
    },
    {
        "level": "european", "region": "UE", "doc_type": "Decisión",
        "title": "Decisión del Parlamento Europeo y del Consejo sobre el mecanismo de ajuste en frontera por carbono (MACF) fase II",
        "reference_id": "EUR-Lex 2025/501",
        "url": "https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32025D0501",
        "status": "published",
        "published_at": "2025-02-20",
        "ai_summary": "Amplía el MACF a nuevos sectores (polímeros, productos químicos) y acelera el calendario de eliminación de derechos de emisión gratuitos para la industria pesada. Impacto fiscal estimado: 4.200M€ anuales para industria española.",
        "ai_impact_level": "high", "ai_relevance": 9,
        "ai_sectors": ["industria", "clima", "fiscal"],
        "ai_obligations": "Declaración de emisiones embebidas en importaciones, pago de certificados MACF.",
        "ai_deadlines": [{"plazo": "Aplicación plena", "fecha": "2026-01-01"}],
        "ai_affected_regions": ["España", "UE-27"],
        "ai_category": "medioambiente",
        "ai_eu_relation": "Norma primaria UE — aplicación directa",
    },
    {
        "level": "national", "region": "Nacional", "doc_type": "Ley",
        "title": "Real Decreto-ley 8/2025, por el que se adoptan medidas urgentes en materia de acceso a la vivienda",
        "reference_id": "BOE-A-2025-4123",
        "url": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-4123",
        "status": "published",
        "published_at": "2025-04-05",
        "ai_summary": "Medidas urgentes para contener el precio del alquiler en zonas tensionadas: ampliación del índice de referencia, extensión de la bonificación fiscal al 90% para nuevos contratos por debajo del índice, y creación del Registro Nacional de Grandes Tenedores.",
        "ai_impact_level": "high", "ai_relevance": 9,
        "ai_sectors": ["vivienda", "fiscal", "social"],
        "ai_obligations": "Registro de contratos en plataforma MITMA en 30 días. Notificación de grandes tenedores en 60 días.",
        "ai_deadlines": [{"plazo": "Entrada en vigor", "fecha": "2025-04-06"}, {"plazo": "Registro grandes tenedores", "fecha": "2025-06-05"}],
        "ai_affected_regions": ["España"],
        "ai_category": "vivienda",
        "ai_eu_relation": "Ninguna relación directa",
    },
    {
        "level": "national", "region": "Nacional", "doc_type": "Decreto",
        "title": "Real Decreto 312/2025, por el que se aprueba el estatuto de la Agencia Española de Supervisión de la Inteligencia Artificial",
        "reference_id": "BOE-A-2025-5500",
        "url": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-5500",
        "status": "published",
        "published_at": "2025-04-18",
        "ai_summary": "Crea y estructura la AESIA como autoridad nacional competente para la aplicación del AI Act europeo. Define competencias sancionadoras (hasta 35M€ o 7% facturación), procedimientos de evaluación de conformidad y registro de sistemas de alto riesgo.",
        "ai_impact_level": "high", "ai_relevance": 8,
        "ai_sectors": ["tecnología", "regulación", "IA"],
        "ai_obligations": "Registro de sistemas IA de alto riesgo, evaluación conformidad obligatoria, designación responsable IA.",
        "ai_deadlines": [{"plazo": "Constitución AESIA", "fecha": "2025-07-01"}],
        "ai_affected_regions": ["España"],
        "ai_category": "tecnología",
        "ai_eu_relation": "Implementa AI Act (Reglamento 2024/1689)",
    },
    {
        "level": "national", "region": "Nacional", "doc_type": "Resolución",
        "title": "Orden TED/721/2025 por la que se establecen las subastas de capacidad renovable para el cuatrienio 2026-2029",
        "reference_id": "BOE-A-2025-6201",
        "url": "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-6201",
        "status": "pending",
        "published_at": "2025-04-25",
        "ai_summary": "Convoca subastas de capacidad eléctrica renovable por un total de 22 GW distribuidos en cuatro anualidades. Fija precios de referencia por tecnología (solar, eólica terrestre, eólica marina, almacenamiento). Prioridad a proyectos con contenido industrial nacional.",
        "ai_impact_level": "medium", "ai_relevance": 7,
        "ai_sectors": ["energía", "medioambiente", "industria"],
        "ai_obligations": "Acreditación capacidad técnica, garantía financiera 50k€/MW, plazo construcción 48 meses.",
        "ai_deadlines": [{"plazo": "Primera subasta", "fecha": "2025-10-15"}, {"plazo": "Segunda subasta", "fecha": "2026-03-20"}],
        "ai_affected_regions": ["España"],
        "ai_category": "energía",
        "ai_eu_relation": "Alineada con Directiva Energías Renovables III",
    },
    {
        "level": "regional", "region": "Cataluña", "doc_type": "Ley",
        "title": "Llei 5/2025, del Parlament de Catalunya, de mesures fiscals, financeres i administratives",
        "reference_id": "DOGC-2025-1847",
        "url": "https://portaldogc.gencat.cat/",
        "status": "published",
        "published_at": "2025-03-28",
        "ai_summary": "Ley ómnibus autonómica que modifica 47 normas catalanas. Destacan: nuevo gravamen sobre grandes establecimientos comerciales, extensión del tributo sobre las emisiones de CO2 de vehículos industriales, y modificación del régimen de licencias urbanísticas.",
        "ai_impact_level": "medium", "ai_relevance": 7,
        "ai_sectors": ["fiscal", "comercio", "urbanismo"],
        "ai_obligations": "Declaración nuevo gravamen grandes superficies (>2500m²) antes del 30/06.",
        "ai_deadlines": [{"plazo": "Entrada en vigor", "fecha": "2025-04-01"}],
        "ai_affected_regions": ["Cataluña"],
        "ai_category": "fiscal",
        "ai_eu_relation": "Ninguna relación directa",
    },
    {
        "level": "regional", "region": "Andalucía", "doc_type": "Decreto",
        "title": "Decreto 112/2025, de la Junta de Andalucía, por el que se aprueba el Plan Energético de Andalucía 2025-2030",
        "reference_id": "BOJA-2025-82",
        "url": "https://www.juntadeandalucia.es/boja/",
        "status": "published",
        "published_at": "2025-04-10",
        "ai_summary": "Plan estratégico para que Andalucía alcance el 85% de generación renovable en 2030. Contempla 14.000 MW nuevos de solar fotovoltaica, 3.200 MW de eólica y 2.000 MW de almacenamiento con baterías. Inversión estimada 18.000M€.",
        "ai_impact_level": "medium", "ai_relevance": 7,
        "ai_sectors": ["energía", "medioambiente", "inversión"],
        "ai_obligations": "Evaluación de impacto ambiental acelerada (3 meses) para proyectos prioritarios.",
        "ai_deadlines": [{"plazo": "Primera revisión", "fecha": "2027-06-30"}],
        "ai_affected_regions": ["Andalucía"],
        "ai_category": "energía",
        "ai_eu_relation": "Alineado con objetivos REPowerEU",
    },
    {
        "level": "regional", "region": "Madrid", "doc_type": "Ley",
        "title": "Ley 3/2025, de la Comunidad de Madrid, de simplificación administrativa y reducción de cargas",
        "reference_id": "BOCM-2025-4521",
        "url": "https://www.bocm.es/",
        "status": "published",
        "published_at": "2025-04-02",
        "ai_summary": "Elimina 230 trámites administrativos, reduce plazos de licencia de actividad a 15 días para empresas <50 empleados y digitaliza el expediente administrativo completo. Amplía el silencio administrativo positivo a nuevos supuestos.",
        "ai_impact_level": "medium", "ai_relevance": 6,
        "ai_sectors": ["administración", "empresas", "digitalización"],
        "ai_obligations": "Adaptación plataformas digitales de los ayuntamientos antes del 01/01/2026.",
        "ai_deadlines": [{"plazo": "Implementación digital", "fecha": "2026-01-01"}],
        "ai_affected_regions": ["Madrid"],
        "ai_category": "administración",
        "ai_eu_relation": "Ninguna relación directa",
    },
    {
        "level": "regional", "region": "País Vasco", "doc_type": "Decreto",
        "title": "Decreto 89/2025, del Gobierno Vasco, de impulso a la industria avanzada y la IA en el sector manufacturero",
        "reference_id": "BOPV-2025-3301",
        "url": "https://www.euskadi.eus/bopv/",
        "status": "pending",
        "published_at": "2025-04-20",
        "ai_summary": "Programa de ayudas de 450M€ para digitalización industrial y adopción de IA en pymes manufactureras vascas. Incluye formación dual, incentivos fiscales adicionales y centros de demostración tecnológica en los tres territorios históricos.",
        "ai_impact_level": "medium", "ai_relevance": 7,
        "ai_sectors": ["industria", "tecnología", "formación"],
        "ai_obligations": "Cofinanciación mínima 30% por empresa beneficiaria.",
        "ai_deadlines": [{"plazo": "Apertura convocatoria", "fecha": "2025-06-01"}, {"plazo": "Cierre solicitudes", "fecha": "2025-09-30"}],
        "ai_affected_regions": ["País Vasco"],
        "ai_category": "tecnología",
        "ai_eu_relation": "Financiado parcialmente con fondos FEDER 2021-2027",
    },
]

_LEVEL_CFG = {
    "european": {"label": "Europeo", "color": BLUE,   "border": "#1E3A5F"},
    "national":  {"label": "Nacional", "color": PURPLE, "border": "#3B1F6E"},
    "regional":  {"label": "Regional", "color": CYAN,   "border": "#0E3D45"},
}

_IMPACT_CFG = {
    "high":   {"label": "Alto impacto",  "color": RED},
    "medium": {"label": "Impacto medio", "color": AMBER},
    "low":    {"label": "Bajo impacto",  "color": GREEN},
}

_ALL_CCAA = sorted({
    d["region"] for d in _DEMO_MULTINIVEL if d["level"] == "regional"
} | {
    "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias",
    "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña",
    "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia",
    "Navarra", "País Vasco", "Valenciana",
})


with tab_multinivel:

    section_header("Legislacion multinivel — EU · Nacional · Autonomico", CYAN)

    # ── Intento de carga desde BD ─────────────────────────────────────────────
    _leg_from_db: list[dict] = []
    _leg_kpis: dict = {}
    _using_demo = True
    try:
        from dashboard.services.legislation_scraper import get_legislation, get_legislation_kpis
        _leg_kpis = get_legislation_kpis()
        if _leg_kpis.get("total_eu", 0) + _leg_kpis.get("total_national", 0) + _leg_kpis.get("total_regional", 0) > 0:
            _leg_from_db = get_legislation(limit=200)
            _using_demo = False
    except Exception:
        pass

    _leg_data = _leg_from_db if not _using_demo else _DEMO_MULTINIVEL

    if _using_demo:
        st.info(
            "Mostrando datos de demostración. Activa el scheduler de legislación "
            "(`python -m dashboard.workers.legislation_scheduler`) para ver datos en tiempo real.",
            icon=None,
        )

    # ── KPIs ──────────────────────────────────────────────────────────────────
    if not _using_demo and _leg_kpis:
        k_eu  = _leg_kpis.get("total_eu", 0)
        k_nat = _leg_kpis.get("total_national", 0)
        k_reg = _leg_kpis.get("total_regional", 0)
        k_hi  = _leg_kpis.get("high_impact", 0)
        k_pend= _leg_kpis.get("pending", 0)
        k_upd = _leg_kpis.get("last_update", "—")
    else:
        k_eu  = sum(1 for d in _leg_data if d["level"] == "european")
        k_nat = sum(1 for d in _leg_data if d["level"] == "national")
        k_reg = sum(1 for d in _leg_data if d["level"] == "regional")
        k_hi  = sum(1 for d in _leg_data if d.get("ai_impact_level") == "high")
        k_pend= sum(1 for d in _leg_data if d.get("status") == "pending")
        k_upd = "Demo"

    _kpi_cols = st.columns(5)
    _kpi_cols[0].markdown(kpi_card("Normas UE", str(k_eu), color=BLUE), unsafe_allow_html=True)
    _kpi_cols[1].markdown(kpi_card("Nacionales", str(k_nat), color=PURPLE), unsafe_allow_html=True)
    _kpi_cols[2].markdown(kpi_card("Autonomicas", str(k_reg), color=CYAN), unsafe_allow_html=True)
    _kpi_cols[3].markdown(kpi_card("Alto impacto", str(k_hi), color=RED), unsafe_allow_html=True)
    _kpi_cols[4].markdown(kpi_card("Pendientes", str(k_pend), color=AMBER), unsafe_allow_html=True)

    st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)

    # ── Filtros ───────────────────────────────────────────────────────────────
    _f_col1, _f_col2, _f_col3, _f_col4 = st.columns([2, 2, 2, 2])

    with _f_col1:
        _f_level = st.selectbox(
            "Nivel", ["Todos", "Europeo", "Nacional", "Regional"],
            key="ml_level",
        )
    with _f_col2:
        _f_status = st.selectbox(
            "Estado", ["Todos", "Publicada", "Pendiente"],
            key="ml_status",
        )
    with _f_col3:
        _all_cats = sorted({d.get("ai_category", "—") or "—" for d in _leg_data})
        _f_cat = st.selectbox("Categoria IA", ["Todas"] + _all_cats, key="ml_cat")
    with _f_col4:
        _f_impact = st.selectbox(
            "Impacto IA", ["Todos", "Alto", "Medio", "Bajo"],
            key="ml_impact",
        )

    _f_ccaa_active = _f_level in ("Todos", "Regional")
    if _f_ccaa_active:
        _f_ccaa = st.multiselect(
            "Comunidad Autonoma (solo nivel regional)",
            _ALL_CCAA,
            default=[],
            key="ml_ccaa",
            placeholder="Todas las CCAA",
        )
    else:
        _f_ccaa = []

    # ── Aplicar filtros ───────────────────────────────────────────────────────
    _level_map = {"Europeo": "european", "Nacional": "national", "Regional": "regional"}
    _status_map = {"Publicada": "published", "Pendiente": "pending"}
    _impact_map = {"Alto": "high", "Medio": "medium", "Bajo": "low"}

    _filtered = _leg_data
    if _f_level != "Todos":
        _filtered = [d for d in _filtered if d["level"] == _level_map[_f_level]]
    if _f_status != "Todos":
        _filtered = [d for d in _filtered if d.get("status") == _status_map[_f_status]]
    if _f_cat != "Todas":
        _filtered = [d for d in _filtered if (d.get("ai_category") or "—") == _f_cat]
    if _f_impact != "Todos":
        _filtered = [d for d in _filtered if d.get("ai_impact_level") == _impact_map[_f_impact]]
    if _f_ccaa:
        _filtered = [
            d for d in _filtered
            if d["level"] != "regional" or d.get("region") in _f_ccaa
        ]

    # Ordenar: alto impacto primero, luego relevancia IA descendente
    _impact_ord = {"high": 0, "medium": 1, "low": 2, None: 3}
    _filtered = sorted(
        _filtered,
        key=lambda d: (_impact_ord.get(d.get("ai_impact_level")), -(d.get("ai_relevance") or 0)),
    )

    st.markdown(
        f'<div style="font-size:.75rem;color:{MUTED};margin-bottom:.5rem">'
        f'{len(_filtered)} normas encontradas</div>',
        unsafe_allow_html=True,
    )

    # ── Cards ─────────────────────────────────────────────────────────────────
    for _item in _filtered:
        _lv = _item.get("level", "national")
        _lv_cfg = _LEVEL_CFG.get(_lv, _LEVEL_CFG["national"])
        _imp = _item.get("ai_impact_level")
        _imp_cfg = _IMPACT_CFG.get(_imp, {"label": "—", "color": MUTED})
        _rel = _item.get("ai_relevance") or "—"
        _status = _item.get("status", "pending")
        _status_color = GREEN if _status == "published" else AMBER
        _status_label = "Publicada" if _status == "published" else "Pendiente"

        # Tags de sectores
        _sectors = _item.get("ai_sectors") or []
        _sector_tags = " ".join([
            f'<span style="background:{BG3};border:1px solid {BORDER};border-radius:3px;'
            f'padding:1px 6px;font-size:.62rem;color:{TEXT2}">{s}</span>'
            for s in _sectors[:4]
        ])

        # Plazos
        _deadlines = _item.get("ai_deadlines") or []
        _deadline_html = ""
        if _deadlines:
            _dl_items = []
            for _dl in _deadlines[:2]:
                _plazo = _dl.get("plazo", "")
                _fecha = _dl.get("fecha") or ""
                _dl_items.append(
                    f'<span style="color:{AMBER};font-weight:600">{_plazo}</span>'
                    + (f' — <span style="color:{TEXT2}">{_fecha}</span>' if _fecha else "")
                )
            _deadline_html = (
                f'<div style="font-size:.68rem;margin-top:.4rem;color:{MUTED}">'
                f'Plazos: {" · ".join(_dl_items)}</div>'
            )

        # Obligaciones
        _oblig = _item.get("ai_obligations") or ""
        _oblig_html = ""
        if _oblig:
            _oblig_html = (
                f'<div style="font-size:.68rem;color:{TEXT2};margin-top:.3rem">'
                f'<span style="color:{MUTED}">Obligaciones:</span> {_oblig[:200]}'
                + ("..." if len(_oblig) > 200 else "") + "</div>"
            )

        # Relación EU
        _eu_rel = _item.get("ai_eu_relation") or ""
        _eu_html = ""
        if _eu_rel and _lv != "european":
            _eu_html = (
                f'<div style="font-size:.63rem;color:{MUTED};margin-top:.25rem">'
                f'Relacion UE: <span style="color:{BLUE}">{_eu_rel[:100]}</span></div>'
            )

        # URL
        _url = _item.get("url") or ""
        _url_html = ""
        if _url:
            _ref = _item.get("reference_id") or _url[:40]
            _url_html = (
                f'<a href="{_url}" target="_blank" style="font-size:.65rem;color:{CYAN};'
                f'text-decoration:none">{_ref}</a>'
            )

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {_lv_cfg["border"]};'
            f'border-left:4px solid {_lv_cfg["color"]};border-radius:8px;'
            f'padding:1rem 1.2rem;margin-bottom:.7rem">'

            # Cabecera
            f'<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem">'
            f'<span style="background:{_lv_cfg["color"]}22;border:1px solid {_lv_cfg["color"]}55;'
            f'border-radius:4px;padding:2px 8px;font-size:.65rem;font-weight:800;'
            f'color:{_lv_cfg["color"]};letter-spacing:.05em">{_lv_cfg["label"].upper()}</span>'
            f'<span style="font-size:.65rem;font-weight:700;color:{_imp_cfg["color"]}">'
            f'{_imp_cfg["label"].upper()}</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">Relevancia IA: '
            f'<span style="color:{CYAN};font-weight:700">{_rel}/10</span></span>'
            f'<span style="font-size:.65rem;color:{MUTED}">|</span>'
            f'<span style="font-size:.65rem;color:{_status_color};font-weight:600">{_status_label}</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">|</span>'
            f'<span style="font-size:.65rem;font-weight:600;color:{TEXT2}">{_item.get("region","")}</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">|</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">{_item.get("doc_type","")}</span>'
            f'</div>'

            # Título
            f'<div style="font-size:.95rem;font-weight:800;color:{TEXT};line-height:1.35;margin-bottom:.4rem">'
            f'{_item.get("title","")}</div>'

            # Sectores
            f'<div style="margin-bottom:.4rem">{_sector_tags}</div>'

            # Resumen IA
            f'<div style="font-size:.75rem;color:{TEXT2};line-height:1.5;margin-bottom:.3rem">'
            f'{_item.get("ai_summary","")}</div>'

            # Obligaciones
            + _oblig_html

            # Plazos
            + _deadline_html

            # Relación EU
            + _eu_html

            # Referencia / enlace
            + (f'<div style="margin-top:.5rem">{_url_html}</div>' if _url_html else "")

            + '</div>',
            unsafe_allow_html=True,
        )

    if not _filtered:
        st.markdown(
            f'<div style="text-align:center;padding:3rem;color:{MUTED};'
            f'font-size:.9rem">No hay normas que coincidan con los filtros seleccionados</div>',
            unsafe_allow_html=True,
        )
