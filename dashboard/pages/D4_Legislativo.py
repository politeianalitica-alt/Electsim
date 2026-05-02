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
    try:
        from dashboard.services.boe_api import obtener_sumario
        return obtener_sumario(fecha)
    except Exception:
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

tab_actividad, tab_leyes, tab_boe, tab_coaliciones, tab_actores_leg = st.tabs([
    "ACTIVIDAD PARLAMENTARIA",
    "SEGUIMIENTO DE LEYES",
    "BOE & NORMATIVA",
    "COALICIONES PARLAMENTARIAS",
    "INICIATIVAS POR ACTOR",
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

    leyes_filtradas = sorted(leyes_filtradas, key=lambda l: (-URGENCIA_CFG.get(l["urgencia"], {}).get("color", "") == RED, -l["prob_aprobacion"]))

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

    # Carga de datos
    with st.spinner("Cargando sumario BOE…"):
        items_raw = _cargar_boe()

    if not items_raw:
        items_raw = []

    items: list[dict] = []
    for item in items_raw:
        if "impacto" not in item:
            item["impacto"] = _clasificar_impacto(
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
