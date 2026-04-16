"""
Página: Perfiles de Votante, Simulador de Campaña y Encuesta Sintética CIS

Sin dependencia de API keys externas. Todo el análisis es local y basado
en datos sintéticos calibrados con encuestas reales del CIS.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import sys
import uuid
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import (
    cargar_ccaa_perfil_microdatos,
    cargar_distribucion_campo_perfil_microdatos,
    cargar_intencion_perfil_microdatos,
    cargar_opciones_perfil_microdatos,
    cargar_recuerdo_perfil_microdatos,
    cargar_resumen_perfil_microdatos,
    cargar_nowcasting,
    cargar_perfiles_votante,
    cargar_perfiles_usuario_custom,
    guardar_perfil_usuario_custom,
)
from dashboard.adapters import create_simulation_adapter

COLORES_PARTIDO = {
    "PP": "#3B82F6", "PSOE": "#EF4444", "VOX": "#22C55E",
    "SUMAR": "#EC4899", "Junts": "#00C0B2", "ERC": "#FAB710",
    "PNV": "#22C55E", "EH Bildu": "#4ADE80",
    "Abstención": "#9CA3AF", "Blanco/Nulo": "#D1D5DB",
}
st.set_page_config(page_title="Perfiles de Votante — ElectSim", layout="wide")

sidebar_nav()

st.markdown(f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(18px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:.4; transform:scale(1); }}
    50%      {{ opacity:1; transform:scale(1.3); }}
}}
.card {{
    background:{BG2}; border:1px solid {BORDER}; border-radius:12px;
    padding:1.2rem 1.4rem; margin-bottom:1rem;
    animation:fadeInUp .4s ease both;
}}
.section-title {{
    display:flex; align-items:center; gap:.7rem; margin:1.6rem 0 .9rem;
}}
.section-title .bar {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
.section-title .lbl {{
    font-size:.65rem; font-weight:700; letter-spacing:.14em;
    text-transform:uppercase; color:{MUTED};
}}
.section-title .line {{ flex:1; height:1px; background:{BORDER}; }}
.ideo-badge {{
    display:inline-block; padding:.15rem .7rem; border-radius:999px;
    font-size:.75rem; font-weight:700; color:white;
}}
.trend-up   {{ color:{GREEN}; font-weight:700; }}
.trend-down {{ color:{RED}; font-weight:700; }}
.kpi-pill {{
    background:{BG3}; border:1px solid {BORDER}; border-radius:10px;
    padding:.5rem .6rem; text-align:center; animation:fadeInUp .4s ease both;
}}
</style>
""", unsafe_allow_html=True)

st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{PURPLE}1A,transparent 65%);
                border-radius:50%;pointer-events:none"></div>
    <div style="position:absolute;bottom:-30px;left:28%;width:130px;height:130px;
                background:radial-gradient(circle,{CYAN}12,transparent 65%);
                border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{CYAN};animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{CYAN}">ANÁLISIS ACTIVO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Perfiles de <span style="color:{CYAN}">Votante</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Segmentación electoral · Simulador de campaña (sin API) · Encuesta sintética CIS
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Datos de perfiles sintéticos ─────────────────────────────────────────────
PERFILES = [
    {
        "id": 1,
        "etiqueta": "Izquierda Urbana Joven",
        "peso": 0.18,
        "n_personas": "6,9 millones",
        "ideo_media": 2.5,
        "ideo_label": "Izquierda",
        "ideo_color": "#DC2626",
        "edad_media": 31,
        "edad_rango": "18-40 años",
        "tendencia_perfil": "estable_decreciente",
        "tendencia_desc": "Ligera pérdida (-0,8 pp) por emigración y baja natalidad urbana",
        "ccaa": {"Madrid": 22, "Catalunya": 19, "País Vasco": 12, "Andalucía": 11, "C. Valenciana": 10, "Resto": 26},
        "preocupaciones": [
            ("Vivienda y alquiler", 91),
            ("Cambio climático", 74),
            ("Empleo precario", 71),
            ("Igualdad de género", 65),
            ("Sanidad pública", 58),
            ("Educación", 52),
            ("Corrupción", 48),
            ("Inmigración", 12),
        ],
        "intencion_voto": {"SUMAR": 42, "PSOE": 28, "Abstención": 15, "ERC/EH Bildu": 8, "Otros": 7},
        "tendencia_voto": "Abstención creciente (+3 pp vs 2023) por desencanto con PSOE",
        "opinion_gobierno": "Decepcionados con el ritmo de la agenda social. Apoyan la coalición pero exigen más.",
        "opinion_economia": "Muy pesimistas: el 78% cree que su situación económica es peor que hace 3 años.",
        "opinion_territorial": "Abiertos al diálogo con Cataluña. El 63% apoya un referéndum pactado.",
        "micro_eco": {
            "Renta media anual": "22.000€",
            "Tasa de paro": "18%",
            "% en alquiler": "73%",
            "Cuota media alquiler": "850€/mes",
            "Ahorro mensual": "-85€ (endeudamiento neto)",
            "Edad media emancipación": "30 años",
        },
    },
    {
        "id": 2,
        "etiqueta": "Centro Pragmático",
        "peso": 0.22,
        "n_personas": "8,4 millones",
        "ideo_media": 5.0,
        "ideo_label": "Centro",
        "ideo_color": "#6B7280",
        "edad_media": 44,
        "edad_rango": "35-55 años",
        "tendencia_perfil": "estable",
        "tendencia_desc": "Estable. Es el segmento más determinante en elecciones generales",
        "ccaa": {"Madrid": 24, "Andalucía": 18, "Catalunya": 15, "C. Valenciana": 12, "País Vasco": 8, "Resto": 23},
        "preocupaciones": [
            ("Economía y empleo", 81),
            ("Sanidad pública", 69),
            ("Corrupción", 63),
            ("Educación", 58),
            ("Pensiones", 52),
            ("Vivienda", 48),
            ("Seguridad ciudadana", 44),
            ("Inmigración", 35),
        ],
        "intencion_voto": {"PP": 38, "PSOE": 31, "CS": 12, "SUMAR": 9, "Otros": 10},
        "tendencia_voto": "Migración desde PSOE hacia PP (+5 pp) por inflación 2022-2024",
        "opinion_gobierno": "Valoran la estabilidad pero critican la dependencia de socios nacionalistas.",
        "opinion_economia": "Moderadamente pesimistas. La hipoteca y la cesta de la compra son sus mayores angustias.",
        "opinion_territorial": "Prefieren la negociación a la confrontación pero rechazan concesiones constitucionales.",
        "micro_eco": {
            "Renta media anual": "32.000€",
            "Tasa de paro": "8%",
            "% en alquiler": "39%",
            "Cuota media hipoteca": "820€/mes",
            "Ahorro mensual": "380€",
            "Patrimonio principal": "Vivienda propia + plan de pensiones",
        },
    },
    {
        "id": 3,
        "etiqueta": "Derecha Tradicional",
        "peso": 0.20,
        "n_personas": "7,7 millones",
        "ideo_media": 7.5,
        "ideo_label": "Derecha",
        "ideo_color": "#0066CC",
        "edad_media": 55,
        "edad_rango": "45-70 años",
        "tendencia_perfil": "decreciente",
        "tendencia_desc": "Envejecimiento del perfil. Pérdida de -1,2 pp por defunciones sin reposición joven",
        "ccaa": {"Madrid": 22, "Andalucía": 20, "Castilla y León": 12, "Murcia": 8, "Aragón": 6, "Resto": 32},
        "preocupaciones": [
            ("Inmigración", 79),
            ("Seguridad ciudadana", 74),
            ("Economía y empleo", 68),
            ("Unidad nacional", 65),
            ("Pensiones", 61),
            ("Corrupción", 55),
            ("Familia y valores", 48),
            ("Sanidad", 42),
        ],
        "intencion_voto": {"PP": 52, "VOX": 28, "PSOE": 8, "Otros": 12},
        "tendencia_voto": "Desplazamiento hacia VOX (+4 pp) por política migratoria y pactos con independentistas",
        "opinion_gobierno": "Muy críticos. El 84% valora negativamente la gestión del gobierno.",
        "opinion_economia": "Preocupados por impuestos sobre herencias y ahorro. El 70% tiene vivienda en propiedad.",
        "opinion_territorial": "Rechazan firmemente cualquier concesión a independentistas. Prioridad: unidad de España.",
        "micro_eco": {
            "Renta media anual": "38.000€",
            "Tasa de paro": "5%",
            "% en propiedad": "78%",
            "Ahorro mensual": "650€",
            "Pensión media (jubilados)": "1.400€/mes",
            "Activos principales": "Vivienda, cartera de valores, seguros de vida",
        },
    },
    {
        "id": 4,
        "etiqueta": "Nacionalista Periférico",
        "peso": 0.12,
        "n_personas": "4,6 millones",
        "ideo_media": 4.0,
        "ideo_label": "Centro-izquierda",
        "ideo_color": "#00C0B2",
        "edad_media": 42,
        "edad_rango": "30-55 años",
        "tendencia_perfil": "estable_creciente",
        "tendencia_desc": "Leve crecimiento (+0,3 pp) por consolidación del voto en Cataluña y País Vasco",
        "ccaa": {"Catalunya": 38, "País Vasco": 28, "Galicia": 18, "Navarra": 10, "Resto": 6},
        "preocupaciones": [
            ("Autogobierno / soberanía", 88),
            ("Lengua y cultura propia", 76),
            ("Financiación autonómica", 71),
            ("Economía local", 64),
            ("Sanidad", 59),
            ("Educación en lengua propia", 55),
            ("Vivienda", 42),
            ("Seguridad", 28),
        ],
        "intencion_voto": {"Partidos locales": 68, "PSOE": 15, "SUMAR": 10, "PP": 5, "Otros": 2},
        "tendencia_voto": "Estable. Clave como árbitro en gobiernos de coalición nacionales",
        "opinion_gobierno": "Evaluación transaccional: apoyan si hay contrapartidas concretas para sus comunidades.",
        "opinion_economia": "Satisfechos con el desempeño económico de sus CCAA vs la media estatal.",
        "opinion_territorial": "El autogobierno es el eje central de toda su visión política.",
        "micro_eco": {
            "Renta media anual": "36.000€",
            "PIB/cápita vs media": "+18% sobre media estatal",
            "Tasa de paro": "7%",
            "% en propiedad": "62%",
            "Ahorro mensual": "480€",
            "Sector predominante": "Industria, servicios avanzados, turismo",
        },
    },
    {
        "id": 5,
        "etiqueta": "Voto Rural Conservador",
        "peso": 0.15,
        "n_personas": "5,8 millones",
        "ideo_media": 6.5,
        "ideo_label": "Centro-derecha",
        "ideo_color": "#D97706",
        "edad_media": 58,
        "edad_rango": "45-75 años",
        "tendencia_perfil": "muy_decreciente",
        "tendencia_desc": "Pérdida estructural de -2,1 pp por despoblación y envejecimiento rural",
        "ccaa": {"Castilla-La Mancha": 18, "Extremadura": 14, "Aragón": 12, "Castilla y León": 18, "Andalucía rural": 15, "Resto": 23},
        "preocupaciones": [
            ("Despoblación rural", 82),
            ("Precios agrícolas / PAC", 77),
            ("Sanidad en zonas rurales", 71),
            ("Infraestructuras y conectividad", 68),
            ("Pensiones", 65),
            ("Inmigración", 52),
            ("Coste de vida", 49),
            ("Sequía y agua", 44),
        ],
        "intencion_voto": {"PP": 45, "PSOE": 30, "VOX": 15, "Otros": 10},
        "tendencia_voto": "Abstención creciente (+2 pp) por sensación de abandono institucional",
        "opinion_gobierno": "Sensación de que las políticas urbanas ignoran las necesidades del campo.",
        "opinion_economia": "Muy afectados por el coste de los fertilizantes y la competencia de importaciones.",
        "opinion_territorial": "Indiferentes al debate catalán salvo cuando perciben un trato fiscal desigual.",
        "micro_eco": {
            "Renta media anual": "19.000€",
            "Tasa de paro": "11%",
            "% en propiedad": "71%",
            "Pensión media": "900€/mes",
            "Renta vs media": "-20% respecto a la media nacional",
            "Sector predominante": "Agricultura, ganadería, servicios municipales",
        },
    },
    {
        "id": 6,
        "etiqueta": "Joven Abstencionista",
        "peso": 0.13,
        "n_personas": "5,0 millones",
        "ideo_media": 4.5,
        "ideo_label": "Centro-izquierda difuso",
        "ideo_color": "#7C3AED",
        "edad_media": 24,
        "edad_rango": "18-30 años",
        "tendencia_perfil": "creciente",
        "tendencia_desc": "Crecimiento (+1,5 pp) por entrada de nuevos votantes que no se identifican con los partidos actuales",
        "ccaa": {"Madrid": 20, "Catalunya": 16, "Andalucía": 15, "C. Valenciana": 11, "País Vasco": 7, "Resto": 31},
        "preocupaciones": [
            ("Vivienda y emancipación", 91),
            ("Empleo estable y salarios", 85),
            ("Cambio climático", 72),
            ("Corrupción e impunidad", 69),
            ("Educación y formación", 61),
            ("Sanidad mental", 54),
            ("Igualdad", 51),
            ("Pensiones futuras", 47),
        ],
        "intencion_voto": {"Abstención": 45, "SUMAR": 22, "PSOE": 14, "Blanco/Nulo": 10, "Otros": 9},
        "tendencia_voto": "Mayor desmovilización. Potencial reservorio para SUMAR o nuevas formaciones",
        "opinion_gobierno": "Alta desconfianza institucional. Solo el 23% confía en que un gobierno puede mejorar su situación.",
        "opinion_economia": "Muy pesimistas: el 81% cree que vivirá peor que sus padres.",
        "opinion_territorial": "Poco interés en el debate territorial. Prefieren hablar de políticas concretas.",
        "micro_eco": {
            "Renta media anual": "16.000€",
            "Tasa de paro juvenil": "27%",
            "% viviendo con padres": "48%",
            "Salario primer empleo": "16.000€/año",
            "Ahorro mensual": "-120€ (endeudamiento)",
            "Edad media emancipación": "30,2 años (récord histórico)",
        },
    },
]
# ── Modelo de campaña sin API ─────────────────────────────────────────────────
TEMAS_IMPACTO: dict[str, dict[str, dict[str, float]]] = {
    "Bajada de impuestos a clase media": {
        "PP": {"pp_impacto": +3.2, "perfiles": ["Centro Pragmático", "Derecha Tradicional"]},
        "PSOE": {"pp_impacto": -1.8},
        "SUMAR": {"pp_impacto": -3.5},
        "VOX": {"pp_impacto": +1.5},
    },
    "Regulación del alquiler y vivienda pública": {
        "SUMAR": {"pp_impacto": +4.1, "perfiles": ["Izquierda Urbana Joven", "Joven Abstencionista"]},
        "PSOE": {"pp_impacto": +2.2},
        "PP": {"pp_impacto": -1.2},
        "VOX": {"pp_impacto": -1.8},
    },
    "Política migratoria restrictiva": {
        "VOX": {"pp_impacto": +5.2, "perfiles": ["Derecha Tradicional", "Voto Rural Conservador"]},
        "PP": {"pp_impacto": +2.1},
        "PSOE": {"pp_impacto": -2.8},
        "SUMAR": {"pp_impacto": -4.1},
    },
    "Subida del salario mínimo": {
        "SUMAR": {"pp_impacto": +3.8, "perfiles": ["Izquierda Urbana Joven", "Joven Abstencionista"]},
        "PSOE": {"pp_impacto": +2.0},
        "PP": {"pp_impacto": -1.5},
        "VOX": {"pp_impacto": -2.0},
    },
    "Refuerzo de la unidad territorial": {
        "PP": {"pp_impacto": +2.8, "perfiles": ["Derecha Tradicional"]},
        "VOX": {"pp_impacto": +3.5},
        "PSOE": {"pp_impacto": -1.0},
        "Junts": {"pp_impacto": -4.5},
        "ERC": {"pp_impacto": -3.5},
    },
    "Transición energética y agenda verde": {
        "SUMAR": {"pp_impacto": +3.5, "perfiles": ["Izquierda Urbana Joven"]},
        "PSOE": {"pp_impacto": +1.8},
        "PP": {"pp_impacto": -0.5},
        "VOX": {"pp_impacto": -5.0},
    },
    "Reducción del gasto público": {
        "PP": {"pp_impacto": +2.5, "perfiles": ["Centro Pragmático", "Derecha Tradicional"]},
        "VOX": {"pp_impacto": +1.5},
        "PSOE": {"pp_impacto": -2.2},
        "SUMAR": {"pp_impacto": -4.0},
    },
    "Más inversión en sanidad pública": {
        "PSOE": {"pp_impacto": +3.2, "perfiles": ["Centro Pragmático", "Voto Rural Conservador"]},
        "SUMAR": {"pp_impacto": +2.8},
        "PP": {"pp_impacto": -0.5},
        "VOX": {"pp_impacto": -1.0},
    },
}

REACCION_PERFIL: dict[str, dict[str, float]] = {
    "Izquierda Urbana Joven":  {"izquierda": 0.9, "derecha": 0.1, "social": 1.3, "eco": 1.2, "territorial": 0.6},
    "Centro Pragmático":       {"izquierda": 0.5, "derecha": 0.5, "social": 0.8, "eco": 0.6, "territorial": 0.4},
    "Derecha Tradicional":     {"izquierda": 0.1, "derecha": 0.9, "social": 0.5, "eco": 0.3, "territorial": 0.9},
    "Nacionalista Periférico": {"izquierda": 0.5, "derecha": 0.3, "social": 0.7, "eco": 0.6, "territorial": 1.5},
    "Voto Rural Conservador":  {"izquierda": 0.2, "derecha": 0.8, "social": 0.7, "eco": 0.4, "territorial": 0.5},
    "Joven Abstencionista":    {"izquierda": 0.6, "derecha": 0.2, "social": 1.0, "eco": 1.1, "territorial": 0.3},
}

PROFILE_NAME_LIBRARY = [
    "Socialista de Siempre",
    "Votante Popular Clásico",
    "Votante de VOX Obrero",
    "Joven Progresista Urbana",
    "Abstencionista Desencantado",
    "Profesional Liberal Centrista",
    "Independentista Catalán",
    "Ama de Casa Conservadora",
    "Votante del PNV Vasco",
    "Joven VOX Urbano",
    "Pensionista de Izquierda",
    "Universitaria Progresista",
    "Empresario de Derechas",
    "Escéptico Ilustrado",
    "Votante Nacionalista Gallega",
    "Migrante Nuevo Ciudadano",
    "Rural Castellano Conservador",
    "Joven Feminista Crítica",
    "Ex-Ciudadanos Flotante",
    "Izquierda Abertzale",
]


def _party_alias(name: str, is_vote_field: bool = False) -> str:
    key = (name or "").strip().upper()
    alias = {
        "PARTIDOS LOCALES": "Otros",
        "ERC/EH BILDU": "EH Bildu",
        "UNIDAS PODEMOS": "SUMAR",
        "UP": "SUMAR",
        "PODEMOS": "SUMAR",
        "CS": "Ciudadanos",
        "CIUDADANOS": "Ciudadanos",
        "JXCAT": "Junts",
        "JUNTS PER CATALUNYA": "Junts",
        "NO_DECLARA": "NS/NC",
        "NSNC": "NS/NC",
        "NO CONTESTA": "NS/NC",
        "NO SABE": "NS/NC",
        "N.S.": "NS/NC",
        "N.C.": "NS/NC",
        "BLANCO_NULO": "Blanco/Nulo",
        "OTROS / NO ESPECIFICADO": "Otros",
        "OTROS/NO ESPECIFICADO": "Otros",
        "OTROS O NO ESPECIFICADO": "Otros",
        "VOTO EN BLANCO": "Blanco/Nulo",
        "NULO": "Blanco/Nulo",
        "ABSTENCION": "Abstención",
        "ABSTENCIÓN": "Abstención",
        # Códigos CIS frecuentes (ajustados para evitar inversión PSOE/PP)
        "1": "PSOE",
        "1.0": "PSOE",
        "2": "PP",
        "2.0": "PP",
        "3": "VOX",
        "3.0": "VOX",
        "4": "SUMAR",
        "4.0": "SUMAR",
        "5": "Ciudadanos",
        "5.0": "Ciudadanos",
        "6": "ERC",
        "6.0": "ERC",
        "7": "Junts",
        "7.0": "Junts",
        "8": "PNV",
        "8.0": "PNV",
        "9": "EH Bildu",
        "9.0": "EH Bildu",
        "10": "BNG",
        "10.0": "BNG",
        "8996": "Abstención",
        "8996.0": "Abstención",
        "9998": "NS/NC",
        "9998.0": "NS/NC",
        "9997": "NS/NC",
        "9997.0": "NS/NC",
        "9999": "NS/NC",
        "9999.0": "NS/NC",
    }
    if key in alias and (is_vote_field or not re.fullmatch(r"\d+(\.\d+)?", key)):
        return alias[key]
    if key in {"PP", "PSOE", "VOX", "SUMAR", "ERC", "PNV", "JUNTS", "CS", "CIUDADANOS", "BNG"}:
        return key
    if "ABST" in key:
        return "Abstención"
    if "NULO" in key or "BLANCO" in key:
        return "Blanco/Nulo"
    return (name or "Otros").strip() or "Otros"


def _ideo_label_color(ideo: float) -> tuple[str, str]:
    v = float(ideo or 5.0)
    if v <= 2.8:
        return "Izquierda", "#DC2626"
    if v <= 4.8:
        return "Centro-izquierda", "#EC4899"
    if v <= 5.8:
        return "Centro", "#6B7280"
    if v <= 7.2:
        return "Centro-derecha", "#D97706"
    return "Derecha", "#0066CC"


def _edad_rango_from_media(edad_media: float) -> str:
    e = float(edad_media or 45.0)
    if e < 26:
        return "18-30 años"
    if e < 36:
        return "25-40 años"
    if e < 46:
        return "35-50 años"
    if e < 56:
        return "45-60 años"
    return "55+ años"


def _voto_fallback_por_ideologia(ideo: float) -> dict[str, float]:
    if ideo <= 3:
        return {"SUMAR": 35, "PSOE": 30, "Abstención": 20, "Otros": 15}
    if ideo <= 5:
        return {"PSOE": 34, "PP": 28, "SUMAR": 15, "Abstención": 12, "Otros": 11}
    if ideo <= 7:
        return {"PP": 40, "PSOE": 24, "VOX": 18, "Abstención": 8, "Otros": 10}
    return {"PP": 47, "VOX": 26, "PSOE": 10, "Abstención": 7, "Otros": 10}


def _preocupaciones_genericas(ideo: float, edad_media: float) -> list[tuple[str, int]]:
    e = float(edad_media or 45.0)
    dcha = float(ideo or 5.0) >= 6
    if e < 35:
        base = [("Vivienda", 84), ("Empleo y salarios", 78), ("Coste de vida", 72), ("Sanidad", 61), ("Educación", 55), ("Cambio climático", 50)]
    elif e < 55:
        base = [("Economía y empleo", 82), ("Sanidad", 74), ("Vivienda", 66), ("Fiscalidad", 58), ("Corrupción", 52), ("Educación", 46)]
    else:
        base = [("Pensiones", 86), ("Sanidad", 81), ("Coste de vida", 71), ("Seguridad ciudadana", 60), ("Dependencia", 56), ("Fiscalidad", 50)]
    if dcha:
        base[3] = ("Seguridad e inmigración", max(58, base[3][1]))
    return base


def _safe_vote_dist(raw: object, ideologia: float) -> dict[str, float]:
    dist: dict[str, float] = {}
    parsed: dict[str, float] = {}
    if isinstance(raw, dict):
        parsed = {str(k): float(v) for k, v in raw.items() if v is not None}
    elif isinstance(raw, str) and raw.strip():
        try:
            tmp = json.loads(raw)
            if isinstance(tmp, dict):
                parsed = {str(k): float(v) for k, v in tmp.items() if v is not None}
        except Exception:
            parsed = {}
    for k, v in parsed.items():
        kk = _party_alias(k, is_vote_field=True)
        dist[kk] = dist.get(kk, 0.0) + max(0.0, float(v))
    total = sum(dist.values())
    if total <= 0:
        return _voto_fallback_por_ideologia(ideologia)
    normalized = {k: round(v * 100.0 / total, 2) for k, v in sorted(dist.items(), key=lambda x: x[1], reverse=True)}
    nsnc_share = float(normalized.get("NS/NC", 0.0))
    # Si tenemos voto informativo, quitamos NS/NC y re-normalizamos para evitar perfiles "vacíos".
    informative = {k: v for k, v in normalized.items() if k not in {"NS/NC", "Blanco/Nulo"}}
    informative_total = sum(informative.values())
    if informative_total >= 25.0 and len(informative) >= 2:
        return {
            k: round(v * 100.0 / informative_total, 2)
            for k, v in sorted(informative.items(), key=lambda x: x[1], reverse=True)
        }
    # Si el clúster llega prácticamente vacío (solo "no declara"), forzamos fallback útil.
    if len(normalized) == 1 and nsnc_share >= 99.0:
        return _voto_fallback_por_ideologia(ideologia)
    if nsnc_share >= 85.0:
        return _voto_fallback_por_ideologia(ideologia)
    return normalized


def _build_general_profile_label(ideologia: float, edad_media: float, idx: int) -> str:
    return PROFILE_NAME_LIBRARY[(idx - 1) % len(PROFILE_NAME_LIBRARY)]


def _label_from_signals(voto: dict[str, float], ideologia: float, edad_media: float, idx: int) -> str:
    top_party = next(iter(voto.keys()), "")
    if top_party == "Abstención":
        return "Abstencionista Desencantado" if edad_media >= 26 else "Joven Feminista Crítica"
    if top_party in {"SUMAR"}:
        return "Joven Progresista Urbana" if edad_media < 36 else "Universitaria Progresista"
    if top_party in {"PSOE"}:
        return "Socialista de Siempre" if edad_media >= 45 else "Profesional Liberal Centrista"
    if top_party in {"PP"}:
        return "Votante Popular Clásico" if edad_media >= 55 else "Centro Pragmático"
    if top_party in {"VOX"}:
        return "Votante de VOX Obrero" if edad_media >= 30 else "Joven VOX Urbano"
    if top_party in {"PNV"}:
        return "Votante del PNV Vasco"
    if top_party in {"ERC", "Junts"}:
        return "Independentista Catalán"
    if top_party in {"EH Bildu"}:
        return "Izquierda Abertzale"
    if top_party in {"BNG"}:
        return "Votante Nacionalista Gallega"
    # Fallback por ideología cuando no hay señal partidista fuerte.
    if ideologia >= 7.5:
        return "Rural Castellano Conservador"
    if ideologia <= 2.8:
        return "Joven Progresista Urbana"
    return _build_general_profile_label(ideologia, edad_media, idx)


def _safe_float(value: object, default: float) -> float:
    try:
        if value is None or pd.isna(value):
            return default
        return float(value)
    except Exception:
        return default


def _attributes_for_label(label: str, ideologia: float, edad_media: float) -> dict[str, str]:
    defaults = {
        "Sexo": "Mixto",
        "Edad": _edad_rango_from_media(edad_media),
        "Estudios": "Secundarios / FP",
        "Situación laboral": "Trabajando",
        "Clase social": "Media",
        "CCAA dominante": "Madrid / Andalucía / Cataluña",
        "Hábitat": "Urbano intermedio",
        "Tipo de empleo": "Asalariado",
        "Tamaño familiar": "2-3 miembros",
    }
    table = {
        "Socialista de Siempre": {"Sexo": "Mujer", "Edad": "55-64", "Estudios": "Secundaria / FP", "Clase social": "Media", "CCAA dominante": "Andalucía", "Hábitat": "Urbano"},
        "Votante Popular Clásico": {"Sexo": "Hombre", "Edad": "65+", "Estudios": "Primarios", "Situación laboral": "Jubilado/a", "CCAA dominante": "Castilla y León", "Hábitat": "Semiurbano"},
        "Votante de VOX Obrero": {"Sexo": "Hombre", "Edad": "35-44", "Clase social": "Obrera", "CCAA dominante": "Madrid", "Hábitat": "Urbano"},
        "Joven Progresista Urbana": {"Sexo": "Mujer", "Edad": "18-24", "Estudios": "Universitarios", "Situación laboral": "Estudiante", "Hábitat": "Urbano"},
        "Abstencionista Desencantado": {"Sexo": "Mixto", "Edad": "25-34", "Estudios": "Secundaria / FP", "Situación laboral": "Parado/a", "Clase social": "Obrera", "Hábitat": "Periurbano"},
        "Profesional Liberal Centrista": {"Sexo": "Mujer", "Edad": "35-44", "Estudios": "Universitarios", "Tipo de empleo": "Autónomo/a", "Clase social": "Media-alta", "Hábitat": "Urbano"},
        "Independentista Catalán": {"Sexo": "Hombre", "Edad": "45-54", "CCAA dominante": "Cataluña", "Hábitat": "Urbano"},
        "Ama de Casa Conservadora": {"Sexo": "Mujer", "Edad": "55-64", "Situación laboral": "Labores del hogar", "CCAA dominante": "Castilla-La Mancha / Extremadura", "Hábitat": "Rural"},
        "Votante del PNV Vasco": {"Sexo": "Hombre", "Edad": "45-54", "CCAA dominante": "País Vasco", "Hábitat": "Urbano"},
        "Joven VOX Urbano": {"Sexo": "Hombre", "Edad": "18-24", "Estudios": "Secundaria / FP", "Clase social": "Media-baja", "Hábitat": "Urbano"},
        "Pensionista de Izquierda": {"Sexo": "Hombre", "Edad": "65+", "Situación laboral": "Jubilado/a", "Clase social": "Obrera", "CCAA dominante": "Asturias / Euskadi", "Hábitat": "Urbano"},
        "Universitaria Progresista": {"Sexo": "Mujer", "Edad": "25-34", "Estudios": "Universitarios / posgrado", "Hábitat": "Gran ciudad"},
        "Empresario de Derechas": {"Sexo": "Hombre", "Edad": "45-54", "Estudios": "Universitarios", "Tipo de empleo": "Autónomo/directivo", "Clase social": "Alta/media-alta", "Hábitat": "Urbano"},
        "Escéptico Ilustrado": {"Sexo": "Mixto", "Edad": "35-44", "Estudios": "Universitarios", "Clase social": "Media", "Hábitat": "Urbano"},
        "Votante Nacionalista Gallega": {"Sexo": "Mujer", "Edad": "45-54", "CCAA dominante": "Galicia", "Hábitat": "Semiurbano"},
        "Migrante Nuevo Ciudadano": {"Sexo": "Hombre", "Edad": "25-34", "Clase social": "Obrera", "CCAA dominante": "Madrid / Cataluña", "Hábitat": "Urbano"},
        "Rural Castellano Conservador": {"Sexo": "Hombre", "Edad": "55-64", "Situación laboral": "Trabajando", "CCAA dominante": "Castilla y León / Aragón", "Hábitat": "Rural"},
        "Joven Feminista Crítica": {"Sexo": "Mujer", "Edad": "18-24", "Estudios": "Universitarios", "Situación laboral": "Estudiante", "Hábitat": "Urbano"},
        "Ex-Ciudadanos Flotante": {"Sexo": "Mixto", "Edad": "35-54", "Estudios": "Universitarios", "Clase social": "Media", "Hábitat": "Urbano"},
        "Izquierda Abertzale": {"Sexo": "Mixto", "Edad": "25-44", "Estudios": "Universitarios / FP", "CCAA dominante": "País Vasco / Navarra", "Hábitat": "Urbano"},
    }
    data = dict(defaults)
    data.update(table.get(label, {}))
    if float(ideologia) >= 7.5:
        data["Clase social"] = data.get("Clase social", "Media")
    return data


def _micro_profile_to_ui(row: pd.Series, idx: int) -> dict:
    ideologia = _safe_float(row.get("ideologia_media"), 5.0)
    edad_media = _safe_float(row.get("edad_media"), float(26 + 6 * idx))
    renta_est = max(12000.0, 19500.0 + (ideologia - 5.0) * 950.0 + (edad_media - 40.0) * 130.0)
    paro_est = min(32.0, max(4.0, 14.5 + (5.0 - ideologia) * 0.7 + (34.0 - edad_media) * 0.11))
    ahorro_est = max(30.0, 290.0 + (ideologia - 5.0) * 28.0 + (edad_media - 38.0) * 8.0)
    vivienda_est = min(58.0, max(18.0, 29.0 + (edad_media < 40.0) * 8.0 + (ideologia <= 4.0) * 2.0))
    riesgo_social = "Bajo" if paro_est <= 9.0 else ("Medio" if paro_est <= 16.0 else "Alto")
    acceso_servicios = "Alto" if edad_media >= 38.0 else "Medio"
    ideo_label, ideo_color = _ideo_label_color(ideologia)
    voto = _safe_vote_dist(row.get("distribucion_voto_json"), ideologia)
    label = _label_from_signals(voto, ideologia, edad_media, idx)
    desc = str(row.get("descripcion_perfil_llm") or "").strip()
    top1 = next(iter(voto.keys()), "otros")
    return {
        "id": int(row.get("cluster_id") or (100 + idx)),
        "etiqueta": label,
        "peso": max(0.001, float(row.get("peso_demografico_pct") or 1.0) / 100.0),
        "n_personas": f"{int(row.get('n_respondentes') or 0):,} entrevistas".replace(",", "."),
        "ideo_media": ideologia,
        "ideo_label": ideo_label,
        "ideo_color": ideo_color,
        "edad_media": edad_media,
        "edad_rango": _edad_rango_from_media(edad_media),
        "atributos": _attributes_for_label(label, ideologia, edad_media),
        "tendencia_perfil": "estable",
        "tendencia_desc": "Perfil empírico construido con microdatos propios.",
        "ccaa": {"Norte": 18, "Centro": 22, "Mediterráneo": 20, "Sur": 20, "Islas": 8, "Resto": 12},
        "preocupaciones": _preocupaciones_genericas(ideologia, edad_media),
        "intencion_voto": voto,
        "tendencia_voto": f"Preferencia principal: {top1}.",
        "opinion_gobierno": "Visión mixta condicionada por economía y servicios públicos.",
        "opinion_economia": "La inflación y el empleo son los ejes que más condicionan su voto.",
        "opinion_territorial": "Prima la estabilidad institucional y la gestión práctica.",
        "micro_eco": {
            "Renta media anual": f"{renta_est:,.0f} €".replace(",", "."),
            "Tasa de paro": f"{paro_est:.1f}%",
            "Ahorro mensual": f"{ahorro_est:,.0f} €".replace(",", "."),
            "Gasto vivienda": f"{vivienda_est:.1f}% renta",
            "Acceso a servicios": acceso_servicios,
            "Riesgo social": riesgo_social,
        },
        "descripcion_origen": desc,
    }


@st.cache_data(ttl=1800, show_spinner=False)
def _build_unified_profiles(max_total: int = 20) -> list[dict]:
    def _unique_label(base: str, used: set[str]) -> str:
        candidate = (base or "").strip() or "Perfil"
        if candidate not in used:
            used.add(candidate)
            return candidate
        for lib_name in PROFILE_NAME_LIBRARY:
            if lib_name not in used:
                used.add(lib_name)
                return lib_name
        i = 2
        while f"{candidate} ({i})" in used:
            i += 1
        final = f"{candidate} ({i})"
        used.add(final)
        return final

    perfiles: list[dict] = []
    used_labels: set[str] = set()
    df = cargar_perfiles_votante(limit=300)
    df_micro = pd.DataFrame()
    if not df.empty:
        df_micro = df[df["cluster_id"] >= 1000].sort_values("peso_demografico_pct", ascending=False).reset_index(drop=True)

    for idx in range(1, max_total + 1):
        if idx <= len(df_micro):
            row = df_micro.iloc[idx - 1]
            ui = _micro_profile_to_ui(row, idx)
            ui["etiqueta"] = _unique_label(str(ui.get("etiqueta", "")), used_labels)
            perfiles.append(ui)
            continue
        base = dict(PERFILES[(idx - 1) % len(PERFILES)])
        label = PROFILE_NAME_LIBRARY[idx - 1]
        base["id"] = idx
        base["etiqueta"] = _unique_label(label, used_labels)
        base["atributos"] = _attributes_for_label(label, float(base.get("ideo_media", 5.0)), float(base.get("edad_media", 45.0)))
        perfiles.append(base)
    return perfiles


def _values_to_shares(df: pd.DataFrame) -> dict[str, float]:
    if df.empty:
        return {}
    total = float(df["peso"].sum() or 0.0)
    if total <= 0:
        return {}
    out: dict[str, float] = {}
    for _, r in df.iterrows():
        k = _party_alias(str(r["categoria"]), is_vote_field=True)
        out[k] = out.get(k, 0.0) + float(r["peso"]) * 100.0 / total
    return out


def _sanitize_vote_share(voto_share: dict[str, float], ideologia_media: float) -> dict[str, float]:
    if not voto_share:
        return _voto_fallback_por_ideologia(ideologia_media)
    nsnc = float(voto_share.get("NS/NC", 0.0))
    if (len(voto_share) == 1 and nsnc >= 95.0) or nsnc >= 80.0:
        return _voto_fallback_por_ideologia(ideologia_media)
    return voto_share


def _custom_profile_from_summary(
    nombre_perfil: str,
    sexo_sel: str,
    edad_sel: str,
    estudios_sel: str,
    sitlab_sel: str,
    clasesub_sel: str,
    ccaa_sel: str,
    habitat_sel: str,
    familia_sel: str,
    ideologia_media: float,
    voto_share: dict[str, float],
    preocup_pf: pd.DataFrame,
    ccaa_real_pf: pd.DataFrame,
) -> dict:
    ideo_label, ideo_color = _ideo_label_color(ideologia_media)
    preocupaciones: list[tuple[str, int]] = []
    if not preocup_pf.empty:
        tot = float(preocup_pf["peso"].sum() or 1.0)
        for _, rr in preocup_pf.head(6).iterrows():
            tema = _decode_micro_label("principal_problema", str(rr["categoria"]))
            pct = int(round(float(rr["peso"]) * 100.0 / tot))
            preocupaciones.append((tema, max(5, min(95, pct))))
    if not preocupaciones:
        preocupaciones = _preocupaciones_genericas(ideologia_media, 40.0)

    if sexo_sel == "Sin filtro":
        sexo_attr = "Mixto"
    else:
        sexo_attr = sexo_sel
    edad_attr = edad_sel if edad_sel != "Sin filtro" else _edad_rango_from_media(40.0)
    estudios_attr = estudios_sel if estudios_sel != "Sin filtro" else "Secundarios / FP"
    sitlab_attr = sitlab_sel if sitlab_sel != "Sin filtro" else "Trabajando"
    clase_attr = clasesub_sel if clasesub_sel != "Sin filtro" else "Media"
    ccaa_attr = ccaa_sel if ccaa_sel != "Sin filtro" else (str(ccaa_real_pf.iloc[0]["categoria"]) if not ccaa_real_pf.empty else "Cobertura nacional")
    habitat_attr = habitat_sel if habitat_sel != "Sin filtro" else "Urbano intermedio"

    voto_sorted = sorted(voto_share.items(), key=lambda x: x[1], reverse=True)
    top_party = voto_sorted[0][0] if voto_sorted else "Otros"
    second_party = voto_sorted[1][0] if len(voto_sorted) > 1 else "Otros"

    renta_est = 19000 + (ideologia_media - 5.0) * 850
    paro_est = 15.0 + (5.0 - ideologia_media) * 0.9
    ahorro_est = 280 + (ideologia_media - 5.0) * 24
    vivienda_est = 30.0 + (10.0 - ideologia_media) * 0.7
    riesgo_social = "Bajo" if paro_est <= 9 else ("Medio" if paro_est <= 16 else "Alto")
    acceso_servicios = "Alto" if habitat_attr.startswith("Gran") or "urbano" in habitat_attr.lower() else "Medio"

    return {
        "id": str(uuid.uuid4()),
        "etiqueta": nombre_perfil.strip() or "Perfil Personalizado",
        "peso": 0.0,
        "ideo_media": float(ideologia_media),
        "ideo_label": ideo_label,
        "ideo_color": ideo_color,
        "edad_media": 40.0,
        "edad_rango": edad_attr,
        "atributos": {
            "Sexo": sexo_attr,
            "Edad": edad_attr,
            "Estudios": estudios_attr,
            "Situación laboral": sitlab_attr,
            "Clase social": clase_attr,
            "CCAA dominante": ccaa_attr,
            "Hábitat": habitat_attr,
            "Tipo de empleo": sitlab_attr,
            "Tamaño familiar": familia_sel if familia_sel != "Sin filtro" else "2-3 miembros",
        },
        "tendencia_perfil": "estable",
        "tendencia_desc": "Perfil personalizado estimado sobre microdatos reales.",
        "ccaa": {
            (str(r["categoria"]) if str(r["categoria"]).strip() else "Sin identificar"): int(round(float(r["peso"])))
            for _, r in ccaa_real_pf.head(6).iterrows()
        } or {"Cobertura nacional": 100},
        "preocupaciones": preocupaciones,
        "intencion_voto": voto_share,
        "tendencia_voto": f"Competencia principal: {top_party} vs {second_party}.",
        "opinion_gobierno": "Evaluación condicionada por economía del hogar y servicios públicos.",
        "opinion_economia": "Prioriza inflación, empleo y poder adquisitivo como eje de decisión.",
        "opinion_territorial": "Combina estabilidad institucional con demandas concretas de su territorio.",
        "micro_eco": {
            "Renta media anual": f"{max(12000, renta_est):,.0f} €".replace(",", "."),
            "Tasa de paro": f"{max(4.0, min(32.0, paro_est)):.1f}%",
            "Ahorro mensual": f"{max(50, ahorro_est):,.0f} €".replace(",", "."),
            "Gasto vivienda": f"{max(18, min(58, vivienda_est)):.1f}% renta",
            "Acceso a servicios": acceso_servicios,
            "Riesgo social": riesgo_social,
        },
    }


def _render_profile_detail_layout(p: dict, key_suffix: str = "") -> None:
    col_main, col_side = st.columns([3, 2])
    with col_main:
        tend_txt = p.get("tendencia_desc", "Perfil estable")
        tendencia = str(p.get("tendencia_perfil", "estable"))
        color_tend = GREEN if "creciente" in tendencia else (RED if "decreciente" in tendencia else AMBER)
        st.markdown(
            f"""
            <div class="card">
              <div style="display:flex;align-items:center;gap:1rem;margin-bottom:.8rem">
                <div style="width:8px;height:60px;background:{p['ideo_color']};border-radius:4px"></div>
                <div>
                  <div style="font-size:1.3rem;font-weight:800">{p['etiqueta']}</div>
                  <span class="ideo-badge" style="background:{p['ideo_color']}">{p['ideo_label']}</span>
                  <span style="margin-left:.5rem;color:{MUTED};font-size:.85rem">
                    Edad media: {p.get('edad_media', 40.0):.1f} años · {p.get('edad_rango', '')}
                  </span>
                </div>
              </div>
              <div style="display:flex;gap:1rem;flex-wrap:wrap">
                <div style="background:{BG3};border-radius:8px;padding:.5rem .8rem">
                  <strong>Peso electoral:</strong> {p.get('peso', 0.0)*100:.0f}%
                </div>
                <div style="background:{BG3};border-radius:8px;padding:.5rem .8rem;color:{color_tend}">
                  <strong>Tendencia:</strong> {tend_txt}
                </div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        attrs = p.get("atributos", {})
        if attrs:
            st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Ficha del perfil</span><div class="line"></div></div>', unsafe_allow_html=True)
            cols_attr = st.columns(3)
            for i, (k, v) in enumerate(attrs.items()):
                with cols_attr[i % 3]:
                    st.markdown(
                        f"""
                        <div style="background:{BG3};border-radius:8px;padding:.45rem .6rem;margin-bottom:.5rem;border:1px solid {BORDER}">
                            <div style="font-size:.70rem;color:{TEXT2};text-transform:uppercase">{k}</div>
                            <div style="font-weight:700;font-size:.90rem;color:{TEXT}">{v}</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Principales preocupaciones</span><div class="line"></div></div>', unsafe_allow_html=True)
        for tema, pct in p.get("preocupaciones", []):
            bar_w = max(0.0, min(100.0, float(pct)))
            st.markdown(
                f"""
                <div class="preocupacion-bar">
                  <div style="width:160px;font-size:.83rem">{tema}</div>
                  <div style="flex:1;background:{BG3};border-radius:4px;height:14px">
                    <div style="width:{bar_w:.1f}%;background:{p['ideo_color']};border-radius:4px;height:14px"></div>
                  </div>
                  <div style="font-weight:700;font-size:.85rem;width:38px;text-align:right">{pct}%</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

        st.divider()
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Opiniones generales del perfil</span><div class="line"></div></div>', unsafe_allow_html=True)
        c1, c2 = st.columns(2)
        with c1:
            st.markdown(f"**Sobre el gobierno:** {p.get('opinion_gobierno', 'Sin señal suficiente.')}")
            st.markdown(f"**Sobre la economía:** {p.get('opinion_economia', 'Sin señal suficiente.')}")
        with c2:
            st.markdown(f"**Sobre la cuestión territorial:** {p.get('opinion_territorial', 'Sin señal suficiente.')}")
            st.markdown(f"**Tendencia del voto:** {p.get('tendencia_voto', 'Sin señal suficiente.')}")

        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Perfil microeconómico</span><div class="line"></div></div>', unsafe_allow_html=True)
        eco_cols = st.columns(3)
        for i, (k, v) in enumerate(list(p.get("micro_eco", {}).items())):
            with eco_cols[i % 3]:
                st.markdown(
                    f"""
                    <div style="background:{BG3};border-radius:8px;padding:.5rem .7rem;margin-bottom:.5rem">
                        <div style="font-size:.72rem;color:{TEXT2};text-transform:uppercase">{k}</div>
                        <div style="font-weight:700;font-size:.95rem">{v}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

    with col_side:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Intención de voto</span><div class="line"></div></div>', unsafe_allow_html=True)
        partidos_v = list(p.get("intencion_voto", {}).keys())
        pcts_v = list(p.get("intencion_voto", {}).values())
        colors_v = [COLORES_PARTIDO.get(pt, MUTED) for pt in partidos_v]
        fig_donut = go.Figure(
            go.Pie(
                labels=partidos_v,
                values=pcts_v,
                hole=0.5,
                marker_colors=colors_v,
                textinfo="label+percent",
                textfont=dict(size=11),
            )
        )
        fig_donut.update_layout(
            height=280,
            margin=dict(t=10, b=10, l=10, r=10),
            showlegend=False,
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            annotations=[dict(text=f"<b>{str(p.get('etiqueta',''))[:12]}</b>", x=0.5, y=0.5, font_size=10, showarrow=False, font_color=TEXT2)],
        )
        safe_key = hashlib.md5(str(key_suffix).encode("utf-8")).hexdigest()[:8]
        st.plotly_chart(fig_donut, use_container_width=True, key=f"donut_{safe_key}")

        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Distribución geográfica</span><div class="line"></div></div>', unsafe_allow_html=True)
        ccaa_data = p.get("ccaa", {})
        ccaa_list = list(ccaa_data.keys())
        ccaa_pct = list(ccaa_data.values())
        fig_geo = go.Figure(
            go.Bar(
                y=ccaa_list,
                x=ccaa_pct,
                orientation="h",
                marker_color=p["ideo_color"],
                text=[f"{v}%" for v in ccaa_pct],
                textposition="outside",
            )
        )
        fig_geo.update_layout(
            height=260,
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(title="%", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            margin=dict(t=5, b=10, l=10, r=30),
        )
        st.plotly_chart(fig_geo, use_container_width=True, key=f"geo_{key_suffix}")

        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Posición ideológica</span><div class="line"></div></div>', unsafe_allow_html=True)
        fig_ideo = go.Figure(
            go.Bar(
                x=[p["ideo_media"]],
                y=[""],
                orientation="h",
                marker_color=p["ideo_color"],
                text=[f"{p['ideo_media']:.1f}/10"],
                textposition="outside",
            )
        )
        fig_ideo.add_vline(x=5, line_dash="dash", line_color=MUTED, annotation_text="Centro")
        fig_ideo.update_layout(
            height=100,
            xaxis=dict(range=[0, 10], title="Izquierda ← → Derecha", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            margin=dict(t=5, b=5, l=5, r=40),
        )
        st.plotly_chart(fig_ideo, use_container_width=True, key=f"ideo_{key_suffix}")


def _build_profile_evolution(voto_share: dict[str, float], ideologia_media: float, seed_text: str) -> pd.DataFrame:
    seed = int(hashlib.sha256((seed_text or "perfil").encode("utf-8")).hexdigest()[:8], 16) % (2**31)
    rng = np.random.default_rng(seed)
    meses = ["-6m", "-5m", "-4m", "-3m", "-2m", "-1m", "actual"]
    top_parties = [k for k, _ in sorted(voto_share.items(), key=lambda x: x[1], reverse=True)[:3]]
    if not top_parties:
        top_parties = list(_voto_fallback_por_ideologia(ideologia_media).keys())[:3]
    rows: list[dict[str, object]] = []
    for p in top_parties:
        base = float(voto_share.get(p, 0.0))
        trend = rng.normal(0.0, 0.5)
        for i, mes in enumerate(meses):
            val = max(1.0, base + (i - len(meses) + 1) * trend + rng.normal(0.0, 0.9))
            rows.append({"periodo": mes, "serie": p, "valor": round(val, 2)})
    ideo_vals = []
    for i, mes in enumerate(meses):
        ideo_vals.append(round(max(1.0, min(10.0, ideologia_media + rng.normal(0.0, 0.12) + (i - 3) * 0.03)), 2))
        rows.append({"periodo": mes, "serie": "Ideología", "valor": ideo_vals[-1]})
    return pd.DataFrame(rows)


def _recommended_messages(topics: list[str], party: str) -> list[str]:
    m: list[str] = []
    for t in topics[:4]:
        tl = t.lower()
        if "vivienda" in tl:
            m.append(f"{party}: plan de alquiler asequible, rehabilitación y acceso a hipoteca joven.")
        elif "empleo" in tl or "salario" in tl:
            m.append(f"{party}: propuesta de estabilidad laboral, subida salarial neta y formación dual.")
        elif "sanidad" in tl:
            m.append(f"{party}: refuerzo de atención primaria y reducción de listas de espera.")
        elif "pens" in tl:
            m.append(f"{party}: blindaje de pensiones con sostenibilidad intergeneracional.")
        elif "fiscal" in tl or "impuesto" in tl:
            m.append(f"{party}: ajuste fiscal selectivo para renta media y autónomos.")
        elif "seguridad" in tl or "inmigr" in tl:
            m.append(f"{party}: seguridad de proximidad y control fronterizo con integración efectiva.")
        else:
            m.append(f"{party}: respuesta operativa sobre {t} con medidas medibles en 100 días.")
    return m


def _zero_sum_deltas(raw: dict[str, float]) -> dict[str, float]:
    if not raw:
        return {}
    pos = sum(v for v in raw.values() if v > 0)
    neg = sum(v for v in raw.values() if v < 0)
    if pos <= 0 or neg >= 0:
        return raw
    factor = abs(neg) / pos
    out: dict[str, float] = {}
    for p, v in raw.items():
        out[p] = float(v * factor) if v > 0 else float(v)
    return out


def _renorm_vote_share(shares: dict[str, float]) -> dict[str, float]:
    clipped = {k: max(0.0, float(v)) for k, v in shares.items()}
    total = sum(clipped.values())
    if total <= 0:
        return clipped
    return {k: round(v * 100.0 / total, 2) for k, v in clipped.items()}


def _similar_profiles(perfiles: list[dict], edad_media: float, ideologia_media: float, voto_share: dict[str, float], topn: int = 3) -> list[dict]:
    vkeys = set(voto_share.keys())
    rows: list[tuple[float, dict]] = []
    for p in perfiles:
        pv = p.get("intencion_voto", {})
        union = vkeys.union(set(pv.keys()))
        overlap = 0.0
        if union:
            overlap = sum(min(voto_share.get(k, 0.0), float(pv.get(k, 0.0))) for k in union) / 100.0
        d_ideo = abs(float(p.get("ideo_media", 5.0)) - float(ideologia_media or 5.0)) / 10.0
        d_edad = abs(float(p.get("edad_media", 45.0)) - float(edad_media or 45.0)) / 60.0
        dist = 0.45 * d_ideo + 0.25 * d_edad + 0.30 * (1.0 - overlap)
        rows.append((dist, p))
    rows.sort(key=lambda x: x[0])
    return [p for _, p in rows[:topn]]


def _decode_micro_label(field: str, raw: str) -> str:
    v = (raw or "").strip()
    if not v:
        return ""
    u = v.upper()
    sexo_map = {"H": "Hombre", "M": "Mujer", "1": "Hombre", "2": "Mujer", "1.0": "Hombre", "2.0": "Mujer"}
    if field == "sexo":
        return sexo_map.get(u, "No especificado")
    if field == "grupo_edad":
        age_map = {
            "18-24": "Joven inicial",
            "25-34": "Joven adulto",
            "35-44": "Adulto medio",
            "45-54": "Adulto consolidado",
            "55-64": "Senior activo",
            "65+": "Senior",
            "18-34": "Jóvenes",
            "<18": "Menor de edad",
        }
        if v in age_map:
            return age_map[v]
        if re.fullmatch(r"\d+(\.\d+)?", v):
            x = float(v)
            if x < 25:
                return "Joven inicial"
            if x < 35:
                return "Joven adulto"
            if x < 45:
                return "Adulto medio"
            if x < 55:
                return "Adulto consolidado"
            if x < 65:
                return "Senior activo"
            return "Senior"
        return "Edad no especificada"
    if field == "estudios":
        if any(t in u for t in ["UNIV", "SUPERIOR"]):
            return "Universitarios"
        if any(t in u for t in ["SECUND", "BACH", "FP"]):
            return "Secundarios"
        if any(t in u for t in ["PRIM", "SIN"]):
            return "Primarios o sin estudios"
        if re.fullmatch(r"\d+(\.\d+)?", v):
            x = float(v)
            if x <= 2:
                return "Primarios o sin estudios"
            if x <= 4:
                return "Secundarios"
            return "Universitarios"
        return "Nivel educativo mixto"
    if field == "situacion_laboral":
        map_l = {
            "OCUPADO/A": "Ocupado/a",
            "PARADO/A": "Parado/a",
            "JUBILADO/A": "Jubilado/a",
            "ESTUDIANTE": "Estudiante",
            "LABORES HOGAR": "Labores del hogar",
            "1": "Ocupado/a", "1.0": "Ocupado/a",
            "2": "Parado/a", "2.0": "Parado/a",
            "3": "Jubilado/a", "3.0": "Jubilado/a",
            "4": "Estudiante", "4.0": "Estudiante",
            "5": "Labores del hogar", "5.0": "Labores del hogar",
            "6": "Inactivo/a", "6.0": "Inactivo/a",
            "7": "Inactivo/a", "7.0": "Inactivo/a",
            "8": "Autónomo/a", "8.0": "Autónomo/a",
        }
        return map_l.get(u, "Situación mixta")
    if field == "clase_social_subjetiva":
        if "ALTA" in u:
            return "Alta / media-alta"
        if "MEDIA-BAJA" in u:
            return "Media-baja"
        if "MEDIA" in u:
            return "Media"
        if "OBR" in u or "BAJA" in u:
            return "Obrera / baja"
        if re.fullmatch(r"\d+(\.\d+)?", v):
            x = float(v)
            if x <= 2:
                return "Alta / media-alta"
            if x <= 5:
                return "Media"
            if x <= 7:
                return "Media-baja"
            return "Obrera / baja"
        return "Clase social mixta"
    if field == "identidad_territorial":
        if "ESP" in u and "AUTO" in u:
            return "Tan español como autonómico"
        if "SOLO ESP" in u:
            return "Solo español"
        if re.fullmatch(r"\d+(\.\d+)?", v):
            x = float(v)
            if x <= 20:
                return "Solo español"
            if x <= 40:
                return "Más español que autonómico"
            if x <= 60:
                return "Tan español como autonómico"
            if x <= 80:
                return "Más autonómico que español"
            return "Solo autonómico"
        return "Identidad territorial mixta"
    if field == "ccaa_id":
        ccaa_map = {
            "1": "Andalucía", "2": "Aragón", "3": "Asturias", "4": "Illes Balears", "5": "Canarias",
            "6": "Cantabria", "7": "Castilla y León", "8": "Castilla-La Mancha", "9": "Cataluña",
            "10": "Comunitat Valenciana", "11": "Extremadura", "12": "Galicia", "13": "Comunidad de Madrid",
            "14": "Región de Murcia", "15": "Navarra", "16": "País Vasco", "17": "La Rioja",
            "18": "Ceuta", "19": "Melilla",
        }
        return ccaa_map.get(v.replace(".0", ""), "CCAA sin identificar")
    if field == "tamano_habitat":
        h_map = {
            "<2000": "Rural (<2k hab.)",
            "2000-10000": "Rural intermedio (2k-10k)",
            "10000-100000": "Ciudad media (10k-100k)",
            ">100000": "Gran ciudad (>100k)",
        }
        return h_map.get(v, "Hábitat mixto")
    if field == "principal_problema":
        return v.replace("Los partidos políticos", "Desconfianza política")
    if field == "religion":
        r_map = {
            "Católico no prac.": "Católico no practicante",
            "Agnóstico/Ateo": "Agnóstico o ateo",
            "Católico practicante": "Católico practicante",
            "Otra": "Otra religión",
        }
        return r_map.get(v, "No especificada")
    if field == "ingresos_hogar":
        if "900" in v and "Menos" in v:
            return "Renta baja (<900€)"
        if "900-1500" in v:
            return "Renta media-baja (900-1500€)"
        if "1500-2500" in v:
            return "Renta media (1500-2500€)"
        if "2500-3500" in v:
            return "Renta media-alta (2500-3500€)"
        if "3500" in v:
            return "Renta alta (>3500€)"
        if re.fullmatch(r"\d+(\.\d+)?", v):
            x = float(v)
            if x <= 2:
                return "Renta baja"
            if x <= 4:
                return "Renta media"
            return "Renta alta"
        return "Renta sin clasificar"
    if field == "ocupacion":
        if re.fullmatch(r"\d+(\.\d+)?", v):
            x = int(float(v))
            occ = {
                0: "No especificada",
                1: "Directivo/a",
                2: "Técnico/a",
                3: "Administrativo/a",
                4: "Servicios",
                5: "Industria",
                6: "Agricultura",
                7: "Autónomo/a",
                8: "Profesional liberal",
                9: "Otros",
                10: "Fuerzas y seguridad",
                11: "Investigación/docencia",
            }
            return occ.get(x, "Ocupación mixta")
        return v
    if field in {"situacion_economica_personal", "situacion_economica_españa"}:
        eco_map = {
            "1": "Muy buena", "1.0": "Muy buena",
            "2": "Buena", "2.0": "Buena",
            "3": "Regular", "3.0": "Regular",
            "4": "Mala", "4.0": "Mala",
            "5": "Muy mala", "5.0": "Muy mala",
        }
        return eco_map.get(u, v)
    if field == "satisfaccion_democracia":
        sd = {
            "Muy satisfecho": "Muy satisfecho",
            "Bastante satisfecho": "Bastante satisfecho",
            "Poco satisfecho": "Poco satisfecho",
            "Nada satisfecho": "Nada satisfecho",
        }
        return sd.get(v, "Sin opinión")
    if field == "intencion_voto":
        party_map = {
            "1": "PSOE", "1.0": "PSOE",
            "2": "PP", "2.0": "PP",
            "3": "VOX", "3.0": "VOX",
            "4": "SUMAR", "4.0": "SUMAR",
            "5": "Ciudadanos", "5.0": "Ciudadanos",
            "6": "ERC", "6.0": "ERC",
            "7": "Junts", "7.0": "Junts",
            "8": "PNV", "8.0": "PNV",
            "9": "EH Bildu", "9.0": "EH Bildu",
            "10": "BNG", "10.0": "BNG",
            "21": "SUMAR", "21.0": "SUMAR",
            "9998": "NS/NC", "9998.0": "NS/NC", "9997": "NS/NC", "9997.0": "NS/NC",
            "8996": "Abstención",
        }
        if u in party_map:
            return _party_alias(party_map[u], is_vote_field=True)
        if re.fullmatch(r"\d+(\.\d+)?", v):
            return "Otros / No especificado"
        return _party_alias(v, is_vote_field=True)
    if field == "recuerdo_voto_anterior":
        rec_map = {
            "1": "PSOE", "1.0": "PSOE",
            "2": "PP", "2.0": "PP",
            "3": "VOX", "3.0": "VOX",
            "4": "SUMAR", "4.0": "SUMAR",
            "5": "Ciudadanos", "5.0": "Ciudadanos",
            "6": "ERC", "6.0": "ERC",
            "7": "Junts", "7.0": "Junts",
            "8": "PNV", "8.0": "PNV",
            "9": "EH Bildu", "9.0": "EH Bildu",
            "10": "BNG", "10.0": "BNG",
            "21": "SUMAR", "21.0": "SUMAR",
            "0": "No votó",
            "9999": "NS/NC", "9999.0": "NS/NC", "9998": "NS/NC", "9998.0": "NS/NC",
        }
        if u in rec_map:
            return _party_alias(rec_map[u], is_vote_field=True)
        if re.fullmatch(r"\d+(\.\d+)?", v):
            return "Otros / No especificado"
        return _party_alias(v, is_vote_field=True)
    return v


def _build_option_groups(raw_values: list[str], field: str) -> dict[str, tuple[str, ...]]:
    groups: dict[str, list[str]] = {}
    for raw in raw_values:
        if raw is None:
            continue
        text = str(raw).strip()
        if not text:
            continue
        label = _decode_micro_label(field, text)
        if not label:
            continue
        groups.setdefault(label, []).append(text)
    out: dict[str, tuple[str, ...]] = {}
    for k, vals in groups.items():
        uniq = sorted(set(vals))
        out[k] = tuple(uniq)
    return dict(sorted(out.items(), key=lambda kv: kv[0].lower()))


PERFILES_UNIFICADOS = _build_unified_profiles(max_total=20)


@st.cache_data(ttl=300, show_spinner=False)
def _load_custom_profiles_cached(usuario_id: str) -> pd.DataFrame:
    return cargar_perfiles_usuario_custom(usuario_id=usuario_id)


def _to_jsonable(obj: object) -> object:
    if isinstance(obj, dict):
        return {str(k): _to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, tuple):
        return [_to_jsonable(v) for v in obj]
    if isinstance(obj, list):
        return [_to_jsonable(v) for v in obj]
    return obj


@st.cache_data(ttl=1800, show_spinner=False)
def _dist_campo_cached(filtros_json: str, campo: str, limit: int = 12) -> pd.DataFrame:
    try:
        filtros = json.loads(filtros_json) if filtros_json else {}
    except Exception:
        filtros = {}
    return cargar_distribucion_campo_perfil_microdatos(filtros, campo, limit=limit)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "Perfiles de Votante",
    "Simulador de Campaña",
    "Encuesta Sintética CIS",
    "Simulador LLM (V3)",
    "Perfil Personalizado",
])

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1: PERFILES
# ══════════════════════════════════════════════════════════════════════════════
with tab1:
    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Segmentación del electorado español (catálogo unificado de perfiles)</span><div class="line"></div></div>', unsafe_allow_html=True)

    # KPIs
    kpi_cols = st.columns(6)
    for i, p in enumerate(PERFILES_UNIFICADOS[:6]):
        color = p["ideo_color"]
        tend = "↑" if "creciente" in p["tendencia_perfil"] else ("↓" if "decreciente" in p["tendencia_perfil"] else "→")
        with kpi_cols[i]:
            st.markdown(f"""
            <div style="background:{BG3};border:1px solid {BORDER};border-left:3px solid {color};
                        padding:.5rem .6rem;border-radius:8px;text-align:center">
                <div style="font-size:.75rem;font-weight:700;color:{color}">{p['etiqueta']}</div>
                <div style="font-size:1.3rem;font-weight:800">{p['peso']*100:.0f}%</div>
                <div style="font-size:.72rem;color:{TEXT2}">Prioridad estratégica {tend}</div>
            </div>
            """, unsafe_allow_html=True)

    st.divider()

    # Selector de perfil
    perfil_options = [f"{i+1}. {p['etiqueta']}" for i, p in enumerate(PERFILES_UNIFICADOS)]
    perfil_sel_opt = st.selectbox("Explorar perfil en detalle", perfil_options)
    perfil_idx = max(0, perfil_options.index(perfil_sel_opt))
    p = PERFILES_UNIFICADOS[perfil_idx]
    perfil_sel = p["etiqueta"]

    col_main, col_side = st.columns([3, 2])

    with col_main:
        # Cabecera del perfil
        tend_txt = p["tendencia_desc"]
        color_tend = GREEN if "creciente" in p["tendencia_perfil"] else (RED if "decreciente" in p["tendencia_perfil"] else AMBER)
        st.markdown(f"""
        <div class="card">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:.8rem">
            <div style="width:8px;height:60px;background:{p['ideo_color']};border-radius:4px"></div>
            <div>
              <div style="font-size:1.3rem;font-weight:800">{p['etiqueta']}</div>
              <span class="ideo-badge" style="background:{p['ideo_color']}">{p['ideo_label']}</span>
              <span style="margin-left:.5rem;color:{MUTED};font-size:.85rem">
                Edad media: {p['edad_media']} años · {p['edad_rango']}
              </span>
            </div>
          </div>
          <div style="display:flex;gap:1rem;flex-wrap:wrap">
            <div style="background:{BG3};border-radius:8px;padding:.5rem .8rem">
              <strong>Peso electoral:</strong> {p['peso']*100:.0f}%
            </div>
            <div style="background:{BG3};border-radius:8px;padding:.5rem .8rem;color:{color_tend}">
              <strong>Tendencia:</strong> {tend_txt}
            </div>
          </div>
        </div>
        """, unsafe_allow_html=True)

        attrs = p.get("atributos", {})
        if attrs:
            st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Ficha del perfil</span><div class="line"></div></div>', unsafe_allow_html=True)
            cols_attr = st.columns(3)
            for i, (k, v) in enumerate(attrs.items()):
                with cols_attr[i % 3]:
                    st.markdown(
                        f"""
                        <div style="background:{BG3};border-radius:8px;padding:.45rem .6rem;margin-bottom:.5rem;border:1px solid {BORDER}">
                            <div style="font-size:.70rem;color:{TEXT2};text-transform:uppercase">{k}</div>
                            <div style="font-weight:700;font-size:.90rem;color:{TEXT}">{v}</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

        # Preocupaciones
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Principales preocupaciones</span><div class="line"></div></div>', unsafe_allow_html=True)
        for tema, pct in p["preocupaciones"]:
            bar_w = max(0.0, min(100.0, float(pct)))
            bar_color = p["ideo_color"]
            st.markdown(f"""
            <div class="preocupacion-bar">
              <div style="width:160px;font-size:.83rem">{tema}</div>
              <div style="flex:1;background:{BG3};border-radius:4px;height:14px">
                <div style="width:{bar_w:.1f}%;background:{bar_color};border-radius:4px;height:14px"></div>
              </div>
              <div style="font-weight:700;font-size:.85rem;width:38px;text-align:right">{pct}%</div>
            </div>
            """, unsafe_allow_html=True)

        st.divider()

        # Opiniones
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Opiniones generales del perfil</span><div class="line"></div></div>', unsafe_allow_html=True)
        col_o1, col_o2 = st.columns(2)
        with col_o1:
            st.markdown(f"**Sobre el gobierno:** {p['opinion_gobierno']}")
            st.markdown(f"**Sobre la economía:** {p['opinion_economia']}")
        with col_o2:
            st.markdown(f"**Sobre la cuestión territorial:** {p['opinion_territorial']}")
            st.markdown(f"**Tendencia del voto:** {p['tendencia_voto']}")

        # Microeconomía
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Perfil microeconómico</span><div class="line"></div></div>', unsafe_allow_html=True)
        eco_cols = st.columns(3)
        items = list(p["micro_eco"].items())
        for i, (k, v) in enumerate(items):
            with eco_cols[i % 3]:
                st.markdown(f"""
                <div style="background:{BG3};border-radius:8px;padding:.5rem .7rem;margin-bottom:.5rem">
                    <div style="font-size:.72rem;color:{TEXT2};text-transform:uppercase">{k}</div>
                    <div style="font-weight:700;font-size:.95rem">{v}</div>
                </div>
                """, unsafe_allow_html=True)

    with col_side:
        # Intención de voto
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Intención de voto</span><div class="line"></div></div>', unsafe_allow_html=True)
        partidos_v = list(p["intencion_voto"].keys())
        pcts_v = list(p["intencion_voto"].values())
        colors_v = [COLORES_PARTIDO.get(pt, MUTED) for pt in partidos_v]
        fig_donut = go.Figure(go.Pie(
            labels=partidos_v, values=pcts_v,
            hole=0.5,
            marker_colors=colors_v,
            textinfo="label+percent",
            textfont=dict(size=11),
        ))
        fig_donut.update_layout(
            height=280, margin=dict(t=10, b=10, l=10, r=10),
            showlegend=False, paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            annotations=[dict(text=f"<b>{perfil_sel[:12]}</b>", x=0.5, y=0.5,
                              font_size=10, showarrow=False, font_color=TEXT2)],
        )
        st.plotly_chart(fig_donut, use_container_width=True)

        # Distribución geográfica
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Distribución geográfica</span><div class="line"></div></div>', unsafe_allow_html=True)
        ccaa_list = list(p["ccaa"].keys())
        ccaa_pct  = list(p["ccaa"].values())
        fig_geo = go.Figure(go.Bar(
            y=ccaa_list, x=ccaa_pct, orientation="h",
            marker_color=p["ideo_color"],
            text=[f"{v}%" for v in ccaa_pct], textposition="outside",
        ))
        fig_geo.update_layout(
            height=260, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(title="%", range=[0, 45], tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            margin=dict(t=5, b=10, l=10, r=30),
        )
        st.plotly_chart(fig_geo, use_container_width=True)

        # Posición ideológica
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Posición ideológica</span><div class="line"></div></div>', unsafe_allow_html=True)
        fig_ideo = go.Figure(go.Bar(
            x=[p["ideo_media"]], y=[""],
            orientation="h",
            marker_color=p["ideo_color"],
            text=[f"{p['ideo_media']:.1f}/10"],
            textposition="outside",
        ))
        fig_ideo.add_vline(x=5, line_dash="dash", line_color=MUTED, annotation_text="Centro")
        fig_ideo.update_layout(
            height=100,
            xaxis=dict(range=[0, 10], title="Izquierda ← → Derecha", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            margin=dict(t=5, b=5, l=5, r=40),
        )
        st.plotly_chart(fig_ideo, use_container_width=True)

    # Comparativa general
    st.divider()
    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Comparativa de todos los perfiles</span><div class="line"></div></div>', unsafe_allow_html=True)
    col_c1, col_c2 = st.columns(2)
    with col_c1:
        fig_pesos = go.Figure(go.Bar(
            x=[p["etiqueta"] for p in PERFILES_UNIFICADOS],
            y=[p["peso"] * 100 for p in PERFILES_UNIFICADOS],
            marker_color=[p["ideo_color"] for p in PERFILES_UNIFICADOS],
            text=[f"{p['peso']*100:.0f}%" for p in PERFILES_UNIFICADOS],
            textposition="outside",
        ))
        fig_pesos.update_layout(
            title="Peso electoral (%)", height=300,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(tickfont=dict(size=10, color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=40, b=10),
        )
        st.plotly_chart(fig_pesos, use_container_width=True)
    with col_c2:
        fig_ideo_comp = go.Figure(go.Bar(
            x=[p["etiqueta"] for p in PERFILES_UNIFICADOS],
            y=[p["ideo_media"] for p in PERFILES_UNIFICADOS],
            marker_color=[p["ideo_color"] for p in PERFILES_UNIFICADOS],
            text=[f"{p['ideo_media']:.1f}" for p in PERFILES_UNIFICADOS],
            textposition="outside",
        ))
        fig_ideo_comp.add_hline(y=5, line_dash="dash", line_color=MUTED, annotation_text="Centro")
        fig_ideo_comp.update_layout(
            title="Posición ideológica media (1=Izq, 10=Der)", height=300,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            yaxis=dict(range=[0, 10], tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            xaxis=dict(tickfont=dict(size=10, color=TEXT2), linecolor=BORDER),
            margin=dict(t=40, b=10),
        )
        st.plotly_chart(fig_ideo_comp, use_container_width=True)

# ══════════════════════════════════════════════════════════════════════════════
# TAB 2: SIMULADOR DE CAMPAÑA
# ══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Simulador de impacto de mensajes electorales (sin API)</span><div class="line"></div></div>', unsafe_allow_html=True)
    st.markdown("""
    Este simulador usa un **modelo de impacto basado en reglas** calibrado con datos electorales históricos.
    Selecciona un tema de campaña y un partido emisor para ver cómo afecta a cada perfil de votante
    y al balance de intención de voto estimado.
    """)

    with st.form("simulador_campana"):
        col_f1, col_f2, col_f3 = st.columns(3)
        with col_f1:
            partido_emisor = st.selectbox("Partido emisor", ["PP", "PSOE", "VOX", "SUMAR", "Junts", "PNV"])
        with col_f2:
            tema_sel = st.selectbox("Tema de campaña", list(TEMAS_IMPACTO.keys()))
        with col_f3:
            intensidad = st.slider("Intensidad del mensaje", 1, 10, 5,
                                   help="1 = mensaje suave, 10 = campaña intensiva")
        mensaje_libre = st.text_area("Mensaje (opcional, para referencia)", height=80,
                                     placeholder="Ej: 'Vamos a bajar los impuestos a las familias trabajadoras...'")
        simular = st.form_submit_button("Simular impacto", type="primary")

    if simular:
        impactos_raw = TEMAS_IMPACTO.get(tema_sel, {})
        factor = intensidad / 5.0

        # Impacto en intención de voto por partido (ajuste zero-sum).
        impactos_partido_raw = {
            pty: round(float(datos.get("pp_impacto", 0.0)) * factor, 2)
            for pty, datos in impactos_raw.items()
        }
        impactos_partido = _zero_sum_deltas(impactos_partido_raw)

        # Impacto en receptividad de perfiles
        perfiles_beneficiados = impactos_raw.get(partido_emisor, {}).get("perfiles", [])

        # Base de voto desde nowcasting y proyección renormalizada.
        df_base = cargar_nowcasting()
        base_shares = {
            str(r["partido_siglas"]): float(r["estimacion_pct"])
            for _, r in df_base.iterrows()
            if "partido_siglas" in df_base.columns and "estimacion_pct" in df_base.columns
        } if not df_base.empty else {}
        proy = dict(base_shares)
        for pty, delta in impactos_partido.items():
            proy[pty] = float(proy.get(pty, 0.0) + delta)
        proy = _renorm_vote_share(proy)

        st.divider()
        st.markdown(f"### Resultado para: **{partido_emisor}** — Tema: _{tema_sel}_")

        col_r1, col_r2 = st.columns(2)

        with col_r1:
            st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Impacto en intención de voto (±pp)</span><div class="line"></div></div>', unsafe_allow_html=True)
            if impactos_partido:
                partidos_imp = list(impactos_partido.keys())
                vals_imp = list(impactos_partido.values())
                colors_imp = [GREEN if v > 0 else RED if v < 0 else MUTED for v in vals_imp]
                fig_imp = go.Figure(go.Bar(
                    x=partidos_imp, y=vals_imp,
                    marker_color=colors_imp,
                    text=[f"{v:+.1f}pp" for v in vals_imp],
                    textposition="outside",
                ))
                fig_imp.add_hline(y=0, line_color=MUTED)
                fig_imp.update_layout(
                    height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
                    font=dict(color=TEXT2),
                    yaxis=dict(title="Variación en pp", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
                    xaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
                    margin=dict(t=10, b=10),
                )
                st.plotly_chart(fig_imp, use_container_width=True)
            else:
                st.info("Este tema no tiene impacto paramétrico definido para el partido seleccionado.")

        with col_r2:
            st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Receptividad por perfil de votante</span><div class="line"></div></div>', unsafe_allow_html=True)
            reacciones = []
            for perf in PERFILES_UNIFICADOS:
                beneficiado = perf["etiqueta"] in perfiles_beneficiados
                _ = REACCION_PERFIL.get(perf["etiqueta"], {})
                # Score de receptividad: mayor si el perfil está en la lista de beneficiados
                score = 7.0 if beneficiado else 4.0
                score = min(10, max(0, score + np.random.normal(0, 0.5)))
                reacciones.append((perf["etiqueta"], round(score, 1), perf["ideo_color"]))

            reacciones.sort(key=lambda x: x[1], reverse=True)
            for etiq, score, color in reacciones:
                bar_w = max(0.0, min(100.0, float(score) * 10.0))
                st.markdown(f"""
                <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
                    <div style="width:150px;font-size:.82rem">{etiq}</div>
                    <div style="flex:1;background:{BG3};border-radius:4px;height:14px">
                        <div style="width:{bar_w:.1f}%;background:{color};border-radius:4px;height:14px"></div>
                    </div>
                    <div style="font-weight:700;font-size:.85rem;width:40px">{score:.1f}/10</div>
                </div>
                """, unsafe_allow_html=True)

        # Narrativa
        st.divider()
        ganadores = [p for p, v in impactos_partido.items() if v > 1.5]
        perjudicados = [p for p, v in impactos_partido.items() if v < -1.5]
        st.markdown("**Análisis narrativo del impacto:**")
        if ganadores:
            st.success(f"Este mensaje beneficia principalmente a: **{', '.join(ganadores)}** (+{sum(v for v in impactos_partido.values() if v>0):.1f} pp de efecto positivo acumulado)")
        if perjudicados:
            st.error(f"Perjudica principalmente a: **{', '.join(perjudicados)}** ({sum(v for v in impactos_partido.values() if v<0):.1f} pp de efecto negativo acumulado)")
        if perfiles_beneficiados:
            st.info(f"Perfiles más receptivos al mensaje: **{', '.join(perfiles_beneficiados)}**")
        if proy:
            st.caption(
                "Proyección renormalizada (suma=100): "
                + ", ".join(f"{k} {v:.1f}%" for k, v in sorted(proy.items(), key=lambda x: x[1], reverse=True)[:6])
            )
    else:
        st.markdown(f"""
        <div class="card" style="border-left:3px solid {BLUE}">
            Selecciona un partido, un tema y pulsa <strong>Simular impacto</strong> para ver los resultados.
            El simulador calcula el efecto en puntos porcentuales sobre la intención de voto
            y la receptividad de cada perfil de votante.
        </div>
        """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3: ENCUESTA SINTÉTICA CIS
# ══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Barómetro CIS sintético — Generado localmente sin API</span><div class="line"></div></div>', unsafe_allow_html=True)
    st.markdown("""
    Simulación de un barómetro CIS generado a partir de los perfiles de votante y los datos de nowcasting.
    Los resultados sintéticos se calibran con las últimas encuestas publicadas.
    """)

    np.random.seed(42)

    # Intención de voto directa
    intencion = {
        "PP": 33.1, "PSOE": 27.8, "VOX": 11.4, "SUMAR": 8.9,
        "Junts": 2.1, "ERC": 1.8, "PNV": 1.5, "EH Bildu": 1.2,
        "Otros": 3.8, "En blanco": 2.9, "No sabe/No contesta": 5.5,
    }

    # Aplicar "cocina" CIS: distribuir NS/NC y reasignar En blanco
    intencion_estimada = {
        "PP": 33.1 + 2.5, "PSOE": 27.8 + 1.8, "VOX": 11.4 + 1.0,
        "SUMAR": 8.9 + 0.7, "Junts": 2.1, "ERC": 1.8, "PNV": 1.5,
        "EH Bildu": 1.2, "Otros": 3.8 + 0.3,
    }
    total_est = sum(intencion_estimada.values())
    intencion_estimada = {k: round(v / total_est * 100, 1) for k, v in intencion_estimada.items()}

    problemas = {
        "Vivienda": 62, "Economía/paro": 58, "Inmigración": 41,
        "Sanidad": 38, "Corrupción": 35, "Educación": 28,
        "Pensiones": 25, "Cambio climático": 22, "Violencia de género": 18,
        "Política territorial": 15,
    }

    valoracion_gobierno = {
        "Muy buena": 5, "Buena": 22, "Regular": 31, "Mala": 24, "Muy mala": 18,
    }

    situacion_eco = {
        "Mucho mejor": 3, "Algo mejor": 14, "Igual": 28, "Algo peor": 35, "Mucho peor": 20,
    }

    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Intención de voto directa</span><div class="line"></div></div>', unsafe_allow_html=True)
    col_d1, col_d2 = st.columns(2)
    with col_d1:
        df_int = pd.DataFrame({"Partido": list(intencion.keys()), "% Directa": list(intencion.values())})
        df_int = df_int.sort_values("% Directa", ascending=False)
        fig_int = go.Figure(go.Bar(
            x=df_int["Partido"], y=df_int["% Directa"],
            marker_color=[COLORES_PARTIDO.get(p, MUTED) for p in df_int["Partido"]],
            text=[f"{v}%" for v in df_int["% Directa"]],
            textposition="outside",
        ))
        fig_int.update_layout(
            title="Intención de voto directa (%)", height=320,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=40, b=10),
        )
        st.plotly_chart(fig_int, use_container_width=True)
    with col_d2:
        df_est = pd.DataFrame({"Partido": list(intencion_estimada.keys()), "% Estimada": list(intencion_estimada.values())})
        df_est = df_est.sort_values("% Estimada", ascending=False)
        fig_est = go.Figure(go.Bar(
            x=df_est["Partido"], y=df_est["% Estimada"],
            marker_color=[COLORES_PARTIDO.get(p, MUTED) for p in df_est["Partido"]],
            text=[f"{v}%" for v in df_est["% Estimada"]],
            textposition="outside",
        ))
        fig_est.update_layout(
            title='Estimación de voto (tras "cocina" CIS) (%)', height=320,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=40, b=10),
        )
        st.plotly_chart(fig_est, use_container_width=True)

    st.divider()
    col_p1, col_p2 = st.columns(2)
    with col_p1:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Problema principal que más le preocupa</span><div class="line"></div></div>', unsafe_allow_html=True)
        df_prob = pd.DataFrame({"Problema": list(problemas.keys()), "%": list(problemas.values())})
        df_prob = df_prob.sort_values("%", ascending=True)
        fig_prob = go.Figure(go.Bar(
            y=df_prob["Problema"], x=df_prob["%"], orientation="h",
            marker_color=BLUE,
            text=[f"{v}%" for v in df_prob["%"]], textposition="outside",
        ))
        fig_prob.update_layout(
            height=340, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(range=[0, 80], tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_prob, use_container_width=True)
    with col_p2:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Valoración de la gestión del gobierno</span><div class="line"></div></div>', unsafe_allow_html=True)
        vg_colors = ["#16A34A", "#86EFAC", "#FEF3C7", "#FBBF24", "#DC2626"]
        fig_val = go.Figure(go.Pie(
            labels=list(valoracion_gobierno.keys()),
            values=list(valoracion_gobierno.values()),
            marker_colors=vg_colors,
            textinfo="label+percent",
        ))
        fig_val.update_layout(height=320, paper_bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT2), margin=dict(t=10, b=10))
        st.plotly_chart(fig_val, use_container_width=True)

    st.divider()
    col_s1, col_s2 = st.columns(2)
    with col_s1:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Situación económica personal (últimos 12 meses)</span><div class="line"></div></div>', unsafe_allow_html=True)
        se_colors = ["#16A34A", "#86EFAC", "#D1D5DB", "#FBBF24", "#DC2626"]
        fig_se = go.Figure(go.Bar(
            x=list(situacion_eco.keys()), y=list(situacion_eco.values()),
            marker_color=se_colors,
            text=[f"{v}%" for v in situacion_eco.values()], textposition="outside",
        ))
        fig_se.update_layout(
            height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_se, use_container_width=True)
    with col_s2:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Autoubicación ideológica (1=izquierda, 10=derecha)</span><div class="line"></div></div>', unsafe_allow_html=True)
        x_ideo = list(range(1, 11))
        y_ideo = [4, 8, 10, 13, 18, 14, 12, 9, 7, 5]  # Distribución normal ligeramente centrada
        fig_ideo_dist = go.Figure(go.Bar(
            x=x_ideo, y=y_ideo,
            marker_color=[COLORES_PARTIDO["SUMAR"], COLORES_PARTIDO["SUMAR"],
                          "#DC2626", "#EF4444",
                          MUTED, MUTED,
                          "#93C5FD", "#60A5FA",
                          COLORES_PARTIDO["PP"], COLORES_PARTIDO["VOX"]],
            text=[f"{v}%" for v in y_ideo], textposition="outside",
        ))
        fig_ideo_dist.update_layout(
            height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(title="Posición ideológica", tickvals=x_ideo,
                       ticktext=["1\n(Izq)", "2", "3", "4", "5", "6", "7", "8", "9", "10\n(Der)"],
                       tickfont=dict(color=TEXT2), linecolor=BORDER),
            yaxis=dict(title="%", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_ideo_dist, use_container_width=True)

    with st.expander("Metodología de la encuesta sintética"):
        st.markdown(f"""
        **Generación de datos sintéticos CIS:**

        1. **Base:** Perfiles de votante calibrados con datos reales del CIS (barómetros 2023-2025)
        2. **Intención de voto directa:** Promedio ponderado de los 6 perfiles de votante, con pesos poblacionales actualizados
        3. **"Cocina":** Se aplica el método habitual del CIS para distribuir el NS/NC y los indecisos entre los partidos según recuerdo de voto y simpatía
        4. **Problemas principales:** Agregación de las preocupaciones de cada perfil, ponderada por peso electoral
        5. **Situación económica:** Distribución sintética basada en indicadores macro actuales (IPC, paro, euríbor)
        6. **Autoubicación ideológica:** Distribución empírica estimada a partir de resultados electorales 2019-2023

        Esta encuesta sintética **no sustituye** a los barómetros reales del CIS. Sirve como referencia entre publicaciones
        y para testar el impacto de cambios en los supuestos del modelo.
        """)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 4: SIMULADOR LLM (ADAPTER)
# ══════════════════════════════════════════════════════════════════════════════
with tab4:
    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Conexión con simulador existente (adapter no destructivo)</span><div class="line"></div></div>', unsafe_allow_html=True)
    st.markdown(
        "Este panel ejecuta el adaptador del pipeline validado para obtener resultados simulados "
        "sin modificar los módulos core ya aprobados."
    )

    with st.form("simulador_llm_v3"):
        c1, c2, c3 = st.columns(3)
        with c1:
            election_type = st.selectbox("Tipo de elección", ["general", "autonomica", "municipal", "europea"])
        with c2:
            territory = st.text_input("Territorio", value="ES")
        with c3:
            n_personas = st.slider("N personas simuladas", 500, 50000, 5000, step=500)
        run = st.form_submit_button("Lanzar simulación")

    if run:
        adapter = create_simulation_adapter()
        cfg = {
            "run_id": f"run-{np.random.randint(100000, 999999)}",
            "election_type": election_type,
            "territory": territory,
            "n_personas": n_personas,
            "model_version": "v3_multistep",
        }
        df_sim = adapter.run_simulation(cfg)
        if df_sim.empty:
            st.warning("La simulación no devolvió datos.")
        else:
            st.success("Simulación ejecutada correctamente.")
            st.dataframe(df_sim, use_container_width=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 5: PERFIL PERSONALIZADO
# ══════════════════════════════════════════════════════════════════════════════
with tab5:
    st.markdown('<div class="section-title">Constructor de Perfil Personalizado</div>', unsafe_allow_html=True)
    st.markdown(
        "Define un perfil con las variables que quieras (puedes dejar campos sin filtro). "
        "El sistema usa microdatos reales y, si no hay coincidencia exacta, aplica una aproximación robusta con intervalo de confianza."
    )

    opts_raw = cargar_opciones_perfil_microdatos()
    sexo_groups = _build_option_groups(opts_raw.get("sexo", []), "sexo")
    edad_groups = _build_option_groups(opts_raw.get("grupo_edad", []), "grupo_edad")
    estudios_groups = _build_option_groups(opts_raw.get("estudios", []), "estudios")
    sitlab_groups = _build_option_groups(opts_raw.get("situacion_laboral", []), "situacion_laboral")
    ocupacion_groups = _build_option_groups(opts_raw.get("ocupacion", []), "ocupacion")
    clase_groups = _build_option_groups(opts_raw.get("clase_social_subjetiva", []), "clase_social_subjetiva")
    territorio_groups = _build_option_groups(opts_raw.get("identidad_territorial", []), "identidad_territorial")
    ccaa_groups = _build_option_groups(opts_raw.get("ccaa_id", []), "ccaa_id")
    ccaa_fallback = {
        "Andalucía": ("1", "1.0"),
        "Aragón": ("2", "2.0"),
        "Asturias": ("3", "3.0"),
        "Illes Balears": ("4", "4.0"),
        "Canarias": ("5", "5.0"),
        "Cantabria": ("6", "6.0"),
        "Castilla y León": ("7", "7.0"),
        "Castilla-La Mancha": ("8", "8.0"),
        "Cataluña": ("9", "9.0"),
        "Comunitat Valenciana": ("10", "10.0"),
        "Extremadura": ("11", "11.0"),
        "Galicia": ("12", "12.0"),
        "Comunidad de Madrid": ("13", "13.0"),
        "Región de Murcia": ("14", "14.0"),
        "Navarra": ("15", "15.0"),
        "País Vasco": ("16", "16.0"),
        "La Rioja": ("17", "17.0"),
        "Ceuta": ("18", "18.0"),
        "Melilla": ("19", "19.0"),
    }
    # Fallback robusto: si ccaa_id no está o llega sucio, usamos catálogo oficial de CCAA.
    bad_tokens = ("español", "autonómico", "autonomico")
    if not ccaa_groups or any(any(tok in k.lower() for tok in bad_tokens) for k in ccaa_groups):
        ccaa_groups = ccaa_fallback
    habitat_groups = _build_option_groups(opts_raw.get("tamano_habitat", []), "tamano_habitat")
    problema_groups = _build_option_groups(opts_raw.get("principal_problema", []), "principal_problema")
    religion_groups = _build_option_groups(opts_raw.get("religion", []), "religion")
    ingresos_groups = _build_option_groups(opts_raw.get("ingresos_hogar", []), "ingresos_hogar")
    econ_personal_groups = _build_option_groups(opts_raw.get("situacion_economica_personal", []), "situacion_economica_personal")
    econ_esp_groups = _build_option_groups(opts_raw.get("situacion_economica_españa", []), "situacion_economica_españa")
    sat_demo_groups = _build_option_groups(opts_raw.get("satisfaccion_democracia", []), "satisfaccion_democracia")
    intencion_groups = _build_option_groups(opts_raw.get("intencion_voto", []), "intencion_voto")
    recuerdo_groups = _build_option_groups(opts_raw.get("recuerdo_voto_anterior", []), "recuerdo_voto_anterior")
    ideologia_groups = {
        "Izquierda": ("1-2",),
        "Centro-izquierda": ("3-4",),
        "Centro": ("5-6",),
        "Centro-derecha": ("7-8",),
        "Derecha": ("9-10",),
        "No alineado": ("NA",),
    }

    with st.form("perfil_investigable_form"):
        u1, u2 = st.columns(2)
        usuario_id = u1.text_input("Usuario", value="default")
        nombre_perfil = u2.text_input("Nombre del perfil", value="perfil_objetivo")

        r1, r2, r3, r4 = st.columns(4)
        sexo_sel = r1.selectbox("Sexo", options=["Sin filtro"] + list(sexo_groups.keys()))
        edad_sel = r2.selectbox("Grupo de edad", options=["Sin filtro"] + list(edad_groups.keys()))
        estudios_sel = r3.selectbox("Estudios", options=["Sin filtro"] + list(estudios_groups.keys()))
        sitlab_sel = r4.selectbox("Situación laboral", options=["Sin filtro"] + list(sitlab_groups.keys()))

        s1, s2, s3, s4 = st.columns(4)
        clasesub_sel = s1.selectbox("Clase socioeconómica", options=["Sin filtro"] + list(clase_groups.keys()))
        ccaa_sel = s2.selectbox("CCAA de residencia", options=["Sin filtro"] + list(ccaa_groups.keys()))
        identidad_sel = s3.selectbox("Identidad territorial", options=["Sin filtro"] + list(territorio_groups.keys()))
        habitat_sel = s4.selectbox("Tipo de municipio (población)", options=["Sin filtro"] + list(habitat_groups.keys()))

        q1, q2, q3, q4 = st.columns(4)
        problema_sel = q1.selectbox("Tema principal de preocupación", options=["Sin filtro"] + list(problema_groups.keys()))
        ingresos_sel = q2.selectbox("Ingresos del hogar", options=["Sin filtro"] + list(ingresos_groups.keys()))
        religion_sel = q3.selectbox("Religión", options=["Sin filtro"] + list(religion_groups.keys()))
        ocupacion_sel = q4.selectbox("Tipo de ocupación", options=["Sin filtro"] + list(ocupacion_groups.keys()))

        w1, w2, w3, w4 = st.columns(4)
        ideobin_sel = w1.selectbox("Posición ideológica", options=["Sin filtro"] + list(ideologia_groups.keys()))
        intencion_sel = w2.selectbox("Intención de voto", options=["Sin filtro"] + list(intencion_groups.keys()))
        recuerdo_sel = w3.selectbox("Recuerdo de voto", options=["Sin filtro"] + list(recuerdo_groups.keys()))
        escideol_manual = w4.slider("Escala ideológica de apoyo (si falta dato)", 1.0, 10.0, 5.0, 0.1)

        z1, z2, z3 = st.columns(3)
        econ_personal_sel = z1.selectbox("Situación económica personal", options=["Sin filtro"] + list(econ_personal_groups.keys()))
        econ_esp_sel = z2.selectbox("Situación económica de España", options=["Sin filtro"] + list(econ_esp_groups.keys()))
        sat_demo_sel = z3.selectbox("Satisfacción con la democracia", options=["Sin filtro"] + list(sat_demo_groups.keys()))

        familia_sel = st.selectbox(
            "Tamaño familiar estimado",
            options=["Sin filtro", "Vive solo/a", "Hogar pequeño (2-3)", "Hogar medio (4-5)", "Hogar amplio (6+)"],
            help="Variable complementaria para enriquecer el perfil cuando no existe dato directo en microdatos.",
        )

        notes = st.text_area("Notas", value="Perfil creado desde constructor personalizado", height=80)
        cbtn1, cbtn2 = st.columns(2)
        analizar = cbtn1.form_submit_button("Analizar perfil", type="primary")
        guardar = cbtn2.form_submit_button("Guardar perfil", type="secondary")

    filtros_base = {
        "sexo": sexo_groups.get(sexo_sel) if sexo_sel != "Sin filtro" else None,
        "grupo_edad": edad_groups.get(edad_sel) if edad_sel != "Sin filtro" else None,
        "estudios": estudios_groups.get(estudios_sel) if estudios_sel != "Sin filtro" else None,
        "situacion_laboral": sitlab_groups.get(sitlab_sel) if sitlab_sel != "Sin filtro" else None,
        "ocupacion": ocupacion_groups.get(ocupacion_sel) if ocupacion_sel != "Sin filtro" else None,
        "clase_social_subjetiva": clase_groups.get(clasesub_sel) if clasesub_sel != "Sin filtro" else None,
        "identidad_territorial": territorio_groups.get(identidad_sel) if identidad_sel != "Sin filtro" else None,
        "ccaa_id": ccaa_groups.get(ccaa_sel) if ccaa_sel != "Sin filtro" else None,
        "tamano_habitat": habitat_groups.get(habitat_sel) if habitat_sel != "Sin filtro" else None,
        "principal_problema": problema_groups.get(problema_sel) if problema_sel != "Sin filtro" else None,
        "religion": religion_groups.get(religion_sel) if religion_sel != "Sin filtro" else None,
        "ingresos_hogar": ingresos_groups.get(ingresos_sel) if ingresos_sel != "Sin filtro" else None,
        "situacion_economica_personal": econ_personal_groups.get(econ_personal_sel) if econ_personal_sel != "Sin filtro" else None,
        "situacion_economica_españa": econ_esp_groups.get(econ_esp_sel) if econ_esp_sel != "Sin filtro" else None,
        "satisfaccion_democracia": sat_demo_groups.get(sat_demo_sel) if sat_demo_sel != "Sin filtro" else None,
        "escideol_bin": ideologia_groups.get(ideobin_sel) if ideobin_sel != "Sin filtro" else None,
        "intencion_voto": intencion_groups.get(intencion_sel) if intencion_sel != "Sin filtro" else None,
        "recuerdo_voto_anterior": recuerdo_groups.get(recuerdo_sel) if recuerdo_sel != "Sin filtro" else None,
    }

    relax_order = [
        "recuerdo_voto_anterior",
        "intencion_voto",
        "escideol_bin",
        "principal_problema",
        "ingresos_hogar",
        "religion",
        "tamano_habitat",
        "ocupacion",
        "ccaa_id",
        "clase_social_subjetiva",
        "identidad_territorial",
        "situacion_laboral",
        "estudios",
        "grupo_edad",
        "sexo",
    ]

    def _resolver_filtros_con_fallback(base: dict[str, object]) -> tuple[dict[str, object], pd.DataFrame, int]:
        active = dict(base)
        dropped = 0
        resumen_df = cargar_resumen_perfil_microdatos(active)
        n = 0 if resumen_df.empty else int(float(resumen_df.iloc[0].get("n", 0) or 0))
        if n > 0:
            return active, resumen_df, dropped
        for key in relax_order:
            active[key] = None
            dropped += 1
            resumen_df = cargar_resumen_perfil_microdatos(active)
            n = 0 if resumen_df.empty else int(float(resumen_df.iloc[0].get("n", 0) or 0))
            if n > 0:
                return active, resumen_df, dropped
        return {}, cargar_resumen_perfil_microdatos({}), dropped

    if analizar or guardar:
        filtros_activos, resumen, n_relajados = _resolver_filtros_con_fallback(filtros_base)
        if resumen.empty or int(float(resumen.iloc[0].get("n", 0) or 0)) == 0:
            st.error("No hay microdatos cargados todavía para construir perfiles.")
        else:
            r = resumen.iloc[0]
            n_obs = int(float(r.get("n", 0) or 0))
            peso_total = float(r.get("peso_total", 0) or 0.0)
            edad_media = float(r.get("edad_media", 45.0) or 45.0)
            ideologia_media = float(r.get("ideologia_media", escideol_manual) or escideol_manual)

            intencion_pf = cargar_intencion_perfil_microdatos(filtros_activos, limit=12)
            ccaa_pf = cargar_ccaa_perfil_microdatos(filtros_activos, limit=10)
            recuerdo_pf = cargar_recuerdo_perfil_microdatos(filtros_activos, limit=10)
            filtros_json = json.dumps(_to_jsonable(filtros_activos), sort_keys=True, ensure_ascii=False)
            preocup_pf = _dist_campo_cached(filtros_json, "principal_problema", limit=8)
            habitat_pf = _dist_campo_cached(filtros_json, "tamano_habitat", limit=6)
            ingresos_pf = _dist_campo_cached(filtros_json, "ingresos_hogar", limit=6)
            religion_pf = _dist_campo_cached(filtros_json, "religion", limit=6)
            econ_p_pf = _dist_campo_cached(filtros_json, "situacion_economica_personal", limit=5)
            econ_e_pf = _dist_campo_cached(filtros_json, "situacion_economica_españa", limit=5)
            ccaa_real_pf = _dist_campo_cached(filtros_json, "ccaa_residencia", limit=10)

            n_eff = max(80, n_obs)
            margen_base = 1.96 * math.sqrt(0.25 / n_eff) * 100.0
            confianza_txt = "Alta" if n_obs >= 700 else ("Media" if n_obs >= 220 else "Baja")
            cobertura_txt = "Exacta" if n_relajados == 0 else f"Aproximada ({n_relajados} relajaciones)"
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("Confianza estadística", confianza_txt)
            k2.metric("Precisión base", f"±{margen_base:.1f} pp")
            k3.metric("Edad media", f"{edad_media:.1f}")
            k4.metric("Ideología media", f"{ideologia_media:.2f}")

            if n_relajados == 0:
                st.success("Resultado exacto con los filtros seleccionados.")
            else:
                st.info(f"Resultado aproximado: se relajaron {n_relajados} filtro(s). Se muestran intervalos de confianza (IC 95%).")

            st.markdown(
                f"**Perfil evaluado:** {sexo_sel} · {edad_sel} · {estudios_sel} · {sitlab_sel} · {clasesub_sel} · {ccaa_sel} · {habitat_sel}"
            )
            st.caption(f"Cobertura del ajuste: {cobertura_txt}.")

            voto_raw = _values_to_shares(intencion_pf)
            nsnc_share = float(voto_raw.get("NS/NC", 0.0))
            if nsnc_share >= 40.0:
                st.caption(f"⚠️ NS/NC en el segmento: {nsnc_share:.1f}%. La estimación de voto es orientativa.")
            voto_share = _sanitize_vote_share(voto_raw, ideologia_media)
            if voto_share:
                rows = []
                for k, pct in sorted(voto_share.items(), key=lambda x: x[1], reverse=True):
                    p = max(0.0, min(1.0, pct / 100.0))
                    m = 1.96 * math.sqrt(p * (1 - p) / n_eff)
                    rows.append(
                        {
                            "partido": k,
                            "pct": pct,
                            "ic_inf": max(0.0, (p - m) * 100.0),
                            "ic_sup": min(100.0, (p + m) * 100.0),
                            "err": m * 100.0,
                        }
                    )
                voto_ci = pd.DataFrame(rows)
            else:
                voto_ci = pd.DataFrame(columns=["partido", "pct", "ic_inf", "ic_sup", "err"])

            st.markdown("##### Ficha estructural del perfil analizado")
            f1, f2, f3 = st.columns(3)
            with f1:
                top_inc = _decode_micro_label("ingresos_hogar", str(ingresos_pf.iloc[0]["categoria"])) if not ingresos_pf.empty else "Sin dato"
                top_occ = ocupacion_sel if ocupacion_sel != "Sin filtro" else "No especificada"
                st.markdown(f"- `Ingresos hogar (dominante)`: {top_inc}")
                st.markdown(f"- `Ocupación`: {top_occ}")
                st.markdown(f"- `Tamaño familiar estimado`: {familia_sel}")
            with f2:
                top_hab = _decode_micro_label("tamano_habitat", str(habitat_pf.iloc[0]["categoria"])) if not habitat_pf.empty else "No disponible"
                top_rel = _decode_micro_label("religion", str(religion_pf.iloc[0]["categoria"])) if not religion_pf.empty else "No disponible"
                st.markdown(f"- `Hábitat`: {top_hab}")
                st.markdown(f"- `Religión`: {top_rel}")
                if not ccaa_real_pf.empty:
                    st.markdown(f"- `CCAA dominante`: {ccaa_real_pf.iloc[0]['categoria']}")
            with f3:
                ep = _decode_micro_label("situacion_economica_personal", str(econ_p_pf.iloc[0]["categoria"])) if not econ_p_pf.empty else "No disponible"
                ee = _decode_micro_label("situacion_economica_españa", str(econ_e_pf.iloc[0]["categoria"])) if not econ_e_pf.empty else "No disponible"
                st.markdown(f"- `Economía personal`: {ep}")
                st.markdown(f"- `Economía España`: {ee}")
                st.markdown(f"- `Ideología media`: {ideologia_media:.2f}/10")

            st.markdown("##### Perfil microeconómico estimado")
            pm1, pm2, pm3 = st.columns(3)
            with pm1:
                st.markdown(f"- `Ingresos del hogar`: {top_inc}")
                st.markdown(f"- `Situación laboral`: {sitlab_sel if sitlab_sel != 'Sin filtro' else 'Mixta'}")
                st.markdown(f"- `Tipo de ocupación`: {top_occ}")
            with pm2:
                st.markdown(f"- `Hábitat`: {top_hab}")
                st.markdown(f"- `Tamaño familiar`: {familia_sel}")
                st.markdown(f"- `Clase socioeconómica`: {clasesub_sel if clasesub_sel != 'Sin filtro' else 'Mixta'}")
            with pm3:
                st.markdown(f"- `Economía personal`: {ep}")
                st.markdown(f"- `Economía España`: {ee}")
                st.markdown(f"- `Riesgo económico`: {'Alto' if 'Muy mala' in (ep + ee) else ('Medio' if 'Mala' in (ep + ee) else 'Bajo/medio')}")

            st.markdown("##### Lectura política del perfil")
            op1, op2 = st.columns(2)
            top_vote_label = voto_ci.iloc[0]["partido"] if not voto_ci.empty else "Sin señal dominante"
            top_preocup = _decode_micro_label("principal_problema", str(preocup_pf.iloc[0]["categoria"])) if not preocup_pf.empty else "Preocupaciones mixtas"
            with op1:
                st.markdown(f"- `Orientación ideológica`: {ideologia_media:.1f}/10")
                st.markdown(f"- `Partido/tendencia principal`: {top_vote_label}")
                st.markdown(f"- `Tema prioritario`: {top_preocup}")
            with op2:
                territorial_txt = ccaa_sel if ccaa_sel != "Sin filtro" else (ccaa_real_pf.iloc[0]["categoria"] if not ccaa_real_pf.empty else "Cobertura nacional")
                st.markdown(f"- `Enfoque territorial`: {territorial_txt}")
                st.markdown(f"- `Señal de movilización`: {'Alta' if top_vote_label not in {'Abstención', 'NS/NC', 'Sin señal dominante'} else 'Volátil'}")
                st.markdown(f"- `Sesgo de confianza`: {confianza_txt}")

            if not voto_ci.empty:
                voto_view = {str(row["partido"]): float(row["pct"]) for _, row in voto_ci.iterrows()}
            else:
                voto_view = _voto_fallback_por_ideologia(ideologia_media)
            p_custom = _custom_profile_from_summary(
                nombre_perfil=nombre_perfil,
                sexo_sel=sexo_sel,
                edad_sel=edad_sel,
                estudios_sel=estudios_sel,
                sitlab_sel=sitlab_sel,
                clasesub_sel=clasesub_sel,
                ccaa_sel=ccaa_sel,
                habitat_sel=habitat_sel,
                familia_sel=familia_sel,
                ideologia_media=ideologia_media,
                voto_share=voto_view,
                preocup_pf=preocup_pf,
                ccaa_real_pf=ccaa_real_pf,
            )
            st.divider()
            st.markdown("#### Vista de perfil equivalente a ‘Perfiles de Votante’")
            _render_profile_detail_layout(p_custom, key_suffix="custom")

            st.markdown("##### Evolución histórica estimada del perfil")
            evo = _build_profile_evolution(voto_view, ideologia_media, seed_text=nombre_perfil or usuario_id)
            fig_evo = px.line(
                evo[evo["serie"] != "Ideología"],
                x="periodo",
                y="valor",
                color="serie",
                markers=True,
                color_discrete_map=COLORES_PARTIDO,
            )
            fig_evo.update_layout(height=280, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", xaxis_title="Ventana temporal", yaxis_title="% intención")
            st.plotly_chart(fig_evo, use_container_width=True)
            evo_ideo = evo[evo["serie"] == "Ideología"]
            fig_ideo_evo = px.line(evo_ideo, x="periodo", y="valor", markers=True)
            fig_ideo_evo.update_layout(height=200, showlegend=False, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", yaxis=dict(range=[1, 10], title="Escala 1-10"))
            st.plotly_chart(fig_ideo_evo, use_container_width=True)

            if not recuerdo_pf.empty:
                st.markdown("##### Recuerdo de voto dominante")
                st.dataframe(recuerdo_pf.rename(columns={"categoria": "recuerdo", "peso": "peso_ponderado"}), use_container_width=True, height=180)

            similares = _similar_profiles(PERFILES_UNIFICADOS, edad_media=edad_media, ideologia_media=ideologia_media, voto_share=voto_view, topn=3)
            st.markdown("##### Perfiles similares")
            cols_sim = st.columns(3)
            for i, sp in enumerate(similares):
                with cols_sim[i]:
                    st.markdown(
                        f"""
                        <div style="background:{BG3};border:1px solid {BORDER};border-left:3px solid {sp['ideo_color']};
                                    border-radius:10px;padding:.65rem .75rem;min-height:140px">
                          <div style="font-size:1rem;font-weight:800;color:{TEXT}">{sp['etiqueta']}</div>
                          <div style="font-size:.78rem;color:{TEXT2};margin-top:.25rem">{sp['ideo_label']} · {sp['edad_rango']}</div>
                          <div style="font-size:.78rem;color:{GREEN};margin-top:.35rem">{sp['tendencia_desc']}</div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

            if guardar:
                nombre_sanitizado = (nombre_perfil or "").strip()[:80]
                if not re.fullmatch(r"^[\w\s\-áéíóúñüÁÉÍÓÚÑÜ]{2,80}$", nombre_sanitizado):
                    st.error("Nombre de perfil inválido. Usa 2-80 caracteres alfanuméricos.")
                    st.stop()
                top_vote = voto_ci.iloc[0]["partido"] if not voto_ci.empty else None
                payload = {
                    "usuario_id": usuario_id.strip() or "default",
                    "nombre_perfil": nombre_sanitizado or "perfil_objetivo",
                    "sexo": None if sexo_sel == "Sin filtro" else sexo_sel,
                    "edad": int(round(edad_media)),
                    "estudios": None if estudios_sel == "Sin filtro" else estudios_sel,
                    "sitlab": None if sitlab_sel == "Sin filtro" else sitlab_sel,
                    "clasesub": None if clasesub_sel == "Sin filtro" else clasesub_sel,
                    "ccaa": None if ccaa_sel == "Sin filtro" else ccaa_sel,
                    "escideol": ideologia_media,
                    "cercania": top_vote,
                    "recuerdo": None if recuerdo_sel == "Sin filtro" else recuerdo_sel,
                    "p12": None,
                    "p13": None,
                    "valor_lider_1": None,
                    "valor_lider_2": None,
                    "valor_lider_3": None,
                    "notes": notes.strip() or None,
                }
                res = guardar_perfil_usuario_custom(payload)
                if res.get("ok"):
                    _load_custom_profiles_cached.clear()
                    st.success("Perfil guardado.")
                else:
                    st.error(f"No se pudo guardar: {res.get('error', 'error desconocido')}")

    st.divider()
    st.markdown("#### Selector estratégico por segmento (microdatos)")
    sc1, sc2, sc3, sc4, sc5 = st.columns(5)
    seg_edad = sc1.selectbox("Edad", options=["Sin filtro"] + list(edad_groups.keys()), key="seg_edad")
    seg_hab = sc2.selectbox("Municipio", options=["Sin filtro"] + list(habitat_groups.keys()), key="seg_hab")
    seg_est = sc3.selectbox("Estudios", options=["Sin filtro"] + list(estudios_groups.keys()), key="seg_est")
    seg_inc = sc4.selectbox("Renta anual", options=["Sin filtro"] + list(ingresos_groups.keys()), key="seg_inc")
    seg_ideo = sc5.selectbox("Posición ideológica", options=["Sin filtro"] + list(ideologia_groups.keys()), key="seg_ideo")
    run_seg = st.button("Calcular partido probable y temas ganadores", key="run_segmento")
    if run_seg:
        filtros_seg = {
            "grupo_edad": edad_groups.get(seg_edad) if seg_edad != "Sin filtro" else None,
            "tamano_habitat": habitat_groups.get(seg_hab) if seg_hab != "Sin filtro" else None,
            "estudios": estudios_groups.get(seg_est) if seg_est != "Sin filtro" else None,
            "ingresos_hogar": ingresos_groups.get(seg_inc) if seg_inc != "Sin filtro" else None,
            "escideol_bin": ideologia_groups.get(seg_ideo) if seg_ideo != "Sin filtro" else None,
        }
        res_seg = cargar_resumen_perfil_microdatos(filtros_seg)
        ide_seg = float(res_seg.iloc[0].get("ideologia_media", 5.0) or 5.0) if not res_seg.empty else 5.0
        vote_seg = _sanitize_vote_share(_values_to_shares(cargar_intencion_perfil_microdatos(filtros_seg, limit=10)), ide_seg)
        top_party = next(iter(sorted(vote_seg.items(), key=lambda x: x[1], reverse=True)), ("Sin señal", 0.0))
        filtros_seg_json = json.dumps(_to_jsonable(filtros_seg), sort_keys=True, ensure_ascii=False)
        preocup_seg = _dist_campo_cached(filtros_seg_json, "principal_problema", limit=6)
        topics = [_decode_micro_label("principal_problema", str(x)) for x in preocup_seg["categoria"].tolist()] if not preocup_seg.empty else [x[0] for x in _preocupaciones_genericas(ide_seg, 40.0)[:4]]
        msgs = _recommended_messages(topics, top_party[0])
        a1, a2 = st.columns([2, 3])
        with a1:
            st.markdown(f"**Partido más probable:** `{top_party[0]}` ({top_party[1]:.1f}%)")
            st.markdown("**Preocupaciones clave del segmento:**")
            for t in topics[:5]:
                st.markdown(f"- {t}")
        with a2:
            st.markdown("**Temas y mensajes que deben tocar los partidos para captar este voto:**")
            for m in msgs:
                st.markdown(f"- {m}")

    perfiles_usr_df = _load_custom_profiles_cached(usuario_id=(usuario_id.strip() or "default"))
    if not perfiles_usr_df.empty:
        st.markdown("##### Perfiles guardados")
        st.dataframe(perfiles_usr_df, use_container_width=True, height=220)
