"""
Página: Perfiles de Votante, Simulador de Campaña y Encuesta Sintética CIS

Sin dependencia de API keys externas. Todo el análisis es local y basado
en datos sintéticos calibrados con encuestas reales del CIS.
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st
from sqlalchemy import text
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard import db as _db


def _fallback_df(*_args, **_kwargs) -> pd.DataFrame:
    return pd.DataFrame()


def _fallback_dict(*_args, **_kwargs) -> dict:
    return {}


def _fallback_none(*_args, **_kwargs) -> None:
    return None


def _to_float_safe(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or (hasattr(pd, "isna") and pd.isna(value)):
            return default
        if isinstance(value, str):
            txt = value.strip().replace("%", "").replace(",", ".")
            if txt == "":
                return default
            return float(txt)
        return float(value)
    except Exception:
        return default


def _to_int_safe(value: Any, default: int = 0) -> int:
    try:
        return int(round(_to_float_safe(value, float(default))))
    except Exception:
        return default


cargar_ccaa_perfil_microdatos = getattr(_db, "cargar_ccaa_perfil_microdatos", _fallback_df)
cargar_distribucion_campo_perfil_microdatos = getattr(_db, "cargar_distribucion_campo_perfil_microdatos", _fallback_df)
cargar_intencion_perfil_microdatos = getattr(_db, "cargar_intencion_perfil_microdatos", _fallback_df)
cargar_opciones_perfil_microdatos = getattr(_db, "cargar_opciones_perfil_microdatos", _fallback_dict)
cargar_recuerdo_perfil_microdatos = getattr(_db, "cargar_recuerdo_perfil_microdatos", _fallback_df)
cargar_resumen_perfil_microdatos = getattr(_db, "cargar_resumen_perfil_microdatos", _fallback_df)
cargar_resumen_perfil_microdatos_robusto = getattr(
    _db,
    "cargar_resumen_perfil_microdatos_robusto",
    lambda filtros, **kwargs: {
        "resumen": _db.cargar_resumen_perfil_microdatos(filtros)
        if hasattr(_db, "cargar_resumen_perfil_microdatos")
        else pd.DataFrame(),
        "precision": "alta",
        "n_efectivo": 999,
        "filtros_activos": filtros,
        "filtros_relajados": [],
    },
)
cargar_nowcasting = getattr(_db, "cargar_nowcasting", _fallback_df)
cargar_perfiles_votante = getattr(_db, "cargar_perfiles_votante", _fallback_df)
cargar_perfiles_usuario_custom = getattr(_db, "cargar_perfiles_usuario_custom", _fallback_df)
guardar_perfil_usuario_custom = getattr(_db, "guardar_perfil_usuario_custom", _fallback_dict)
get_engine = getattr(_db, "get_engine", _fallback_none)
get_conn = getattr(_db, "get_conn", _fallback_none)

# Funciones nuevas: en despliegues con db.py antiguo no existen todavía.
cargar_lista_perfiles = getattr(_db, "cargar_lista_perfiles", _fallback_df)
cargar_perfil_completo = getattr(
    _db,
    "cargar_perfil_completo",
    lambda _conn, _cluster_id: {
        "perfil": {},
        "problemas": pd.DataFrame(),
        "ccaa": pd.DataFrame(),
        "voto": pd.DataFrame(),
        "ejes": pd.DataFrame(),
        "evolucion": pd.DataFrame(),
    },
)
cargar_perfiles_personalizados = getattr(_db, "cargar_perfiles_personalizados", _fallback_df)
cargar_perfil_personalizado_detalle = getattr(_db, "cargar_perfil_personalizado_detalle", _fallback_dict)
guardar_descripcion_llm_perfil = getattr(_db, "guardar_descripcion_llm_perfil", _fallback_none)
from dashboard.adapters import create_simulation_adapter

COLORES_PARTIDO = {
    "PP": "#3B82F6", "PSOE": "#EF4444", "VOX": "#22C55E",
    "SUMAR": "#EC4899", "Junts": "#00C0B2", "ERC": "#FAB710",
    "PNV": "#22C55E", "EH Bildu": "#4ADE80",
    "Abstención": "#9CA3AF", "Blanco/Nulo": "#D1D5DB",
    "JUNTS": "#00C0B2", "EH BILDU": "#4ADE80", "Otros": "#94A3B8",
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


def _party_alias(name: str) -> str:
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
    if key in alias:
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
        kk = _party_alias(k)
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


def _get_page_engine() -> Any | None:
    if "_engine" not in st.session_state:
        try:
            st.session_state["_engine"] = get_engine()
        except Exception:
            st.session_state["_engine"] = None
    return st.session_state.get("_engine")


def _get_page_conn() -> Any | None:
    if "_db_conn" not in st.session_state:
        try:
            st.session_state["_db_conn"] = get_conn()
        except Exception:
            st.session_state["_db_conn"] = None
    return st.session_state.get("_db_conn")


def _opinions_from_signals(
    voto: dict[str, float],
    ideologia: float,
    edad_media: float,
    econ_personal: str = "",
    econ_esp: str = "",
    sat_demo: str = "",
) -> dict[str, str]:
    top_party, top_pct = next(iter(sorted(voto.items(), key=lambda x: x[1], reverse=True)), ("Otros", 0.0))
    ideotxt = f"{ideologia:.1f}/10"
    edadtxt = f"{edad_media:.0f}"

    sat_l = sat_demo.lower()
    if any(x in sat_l for x in ["nada", "poco"]):
        op_gob = f"Evaluación crítica ({top_pct:.0f}% en {top_party}), con baja satisfacción democrática y eje ideológico {ideotxt}."
    elif top_party in {"PP", "VOX"}:
        op_gob = f"Muy críticos con la gestión actual: {top_party} concentra {top_pct:.0f}% y el bloque exige giro de políticas ({ideotxt})."
    elif top_party in {"PSOE", "SUMAR"}:
        op_gob = f"Apoyo condicionado a resultados: {top_party} lidera con {top_pct:.0f}% pero la valoración depende de ejecución y estabilidad."
    elif abs(ideologia - 5.0) < 1.5:
        op_gob = f"Valoración mixta y pragmática: segmento de centro ({ideotxt}) con preferencia dominante del {top_pct:.0f}%."
    else:
        op_gob = f"Valoración heterogénea, con preferencia electoral del {top_pct:.0f}% y perfil ideológico {ideotxt}."

    econ_p_l = econ_personal.lower()
    if any(x in econ_p_l for x in ["muy mala", "mala"]):
        op_econ = f"Muy pesimistas en economía personal; con edad media {edadtxt}, priorizan aliviar pérdida de poder adquisitivo."
    elif edad_media < 35:
        op_econ = f"Con edad media {edadtxt}, la presión en vivienda y empleo juvenil domina la percepción económica del segmento."
    elif edad_media > 55:
        op_econ = f"Con edad media {edadtxt}, pesan más pensiones, ahorro y costes fijos en su valoración económica."
    else:
        op_econ = f"Percepción económica intermedia en cohortes de {edadtxt} años, condicionada por empleo estable e inflación."
    if econ_esp:
        op_econ += f" Señal sobre economía nacional: {econ_esp}."

    if ideologia < 4:
        op_terr = f"Abiertos al diálogo territorial desde posiciones {ideotxt}, con enfoque pactista y negociación institucional."
    elif ideologia > 7:
        op_terr = f"Rechazan concesiones constitucionales; el eje {ideotxt} y el bloque dominante ({top_pct:.0f}%) priorizan unidad competencial."
    else:
        op_terr = f"Prefieren negociación sin cambios constitucionales amplios, en un perfil de centro ({ideotxt}) con enfoque gradualista."

    return {
        "opinion_gobierno": op_gob,
        "opinion_economia": op_econ,
        "opinion_territorial": op_terr,
    }


@st.cache_data(ttl=300)
def _cargar_impactos_desde_bd(_engine=None) -> dict[str, dict[str, dict]]:
    if _engine is None:
        return {}
    try:
        sql = text(
            """
            SELECT cluster_id, label, peso_demografico_pct, distribucion_voto_json, temas_relevantes_json
            FROM perfiles_votante
            WHERE cluster_id IS NOT NULL
            ORDER BY peso_demografico_pct DESC NULLS LAST, cluster_id
            """
        )
        with _engine.connect() as conn:
            df = pd.read_sql(sql, conn)
    except Exception:
        return {}
    if df.empty:
        return {}

    tema_rows: list[dict[str, Any]] = []
    for _, r in df.iterrows():
        peso = float(r.get("peso_demografico_pct") or 0.0)
        voto = _safe_vote_dist(r.get("distribucion_voto_json"), 5.0)
        temas_raw = r.get("temas_relevantes_json")
        temas: list[str] = []
        if isinstance(temas_raw, str) and temas_raw.strip():
            try:
                parsed = json.loads(temas_raw)
                if isinstance(parsed, list):
                    temas = [str(x) for x in parsed if str(x).strip()]
            except Exception:
                temas = []
        if not temas:
            top_party = next(iter(voto.keys()), "general")
            temas = [f"agenda_{top_party.lower()}"]
        for t in temas[:4]:
            tema_rows.append(
                {
                    "tema": t,
                    "label": str(r.get("label") or f"Cluster {int(r.get('cluster_id') or 0)}"),
                    "peso": peso,
                    "voto": voto,
                }
            )
    if len(tema_rows) < 3:
        return {}

    df_t = pd.DataFrame(tema_rows)
    all_parties = sorted({p for v in df_t["voto"] for p in v.keys()})
    base_means: dict[str, float] = {}
    for p in all_parties:
        num = sum(float(row["peso"]) * float(row["voto"].get(p, 0.0)) for _, row in df_t.iterrows())
        den = sum(float(row["peso"]) for _, row in df_t.iterrows()) or 1.0
        base_means[p] = num / den

    out: dict[str, dict[str, dict]] = {}
    for tema, sub in df_t.groupby("tema"):
        trow: dict[str, dict] = {}
        for p in all_parties:
            num = sum(float(row["peso"]) * float(row["voto"].get(p, 0.0)) for _, row in sub.iterrows())
            den = sum(float(row["peso"]) for _, row in sub.iterrows()) or 1.0
            tema_mean = num / den
            delta = round((tema_mean - base_means.get(p, 0.0)) / 2.0, 2)
            data: dict[str, Any] = {"pp_impacto": float(delta)}
            if delta > 0:
                data["perfiles"] = sorted(set(sub["label"].astype(str).tolist()))[:4]
            trow[p] = data
        out[str(tema)] = trow
    return out


def _receptividad_tema_perfil(
    tema: str,
    perfil: dict,
    impactos_raw: dict,
) -> float:
    top3 = [str(t[0]).lower() for t in perfil.get("preocupaciones", [])[:3]]
    score = 2.5
    if any(tok and tok in tema.lower() for tok in top3):
        score += 3.5
    perfiles_focus = set(impactos_raw.get("perfiles", []) if isinstance(impactos_raw, dict) else [])
    if perfil.get("etiqueta") in perfiles_focus:
        score += 3.5
    ideo = float(perfil.get("ideo_media", 5.0))
    tema_l = tema.lower()
    if any(k in tema_l for k in ["impuesto", "unidad", "migratoria", "gasto"]):
        mult = 1.0 if ideo >= 5.5 else 0.6
    elif any(k in tema_l for k in ["alquiler", "sanidad", "salario", "verde"]):
        mult = 1.0 if ideo <= 5.5 else 0.6
    else:
        mult = 0.85
    score *= mult
    noise = ((abs(hash(f"{tema}|{perfil.get('etiqueta','')}")) % 61) / 100.0) - 0.3
    return round(max(0.0, min(10.0, score + noise)), 1)


def _narrativa_impacto(
    tema: str,
    partido_emisor: str,
    ganadores: list[str],
    perjudicados: list[str],
    perfiles_beneficiados: list[str],
    impactos_partido: dict[str, float],
    perfiles_unificados: list[dict],
) -> str:
    focus_parts: list[str] = []
    for g in ganadores[:2]:
        perf_hits = []
        for pf in perfiles_unificados:
            voto = pf.get("intencion_voto", {})
            top = next(iter(sorted(voto.items(), key=lambda x: x[1], reverse=True)), ("", 0.0))
            if top[0] == g:
                prio = pf.get("preocupaciones", [("sin señal", 0)])
                perf_hits.append(
                    f"{pf.get('etiqueta','Perfil')} ({pf.get('ideo_media',5):.1f}/10; {prio[0][0]} {prio[0][1]}%)"
                )
        if perf_hits:
            focus_parts.append(f"{g}: " + ", ".join(perf_hits[:2]))
    pos_total = sum(v for v in impactos_partido.values() if v > 0)
    neg_total = sum(v for v in impactos_partido.values() if v < 0)
    txt = (
        f"El mensaje sobre '{tema}' para {partido_emisor} proyecta un efecto agregado de {pos_total:+.1f}pp "
        f"en ganadores y {neg_total:.1f}pp en perdedores."
    )
    if focus_parts:
        txt += " Segmentos más explicativos: " + " | ".join(focus_parts) + "."
    if perjudicados:
        txt += f" Las mayores pérdidas se concentran en {', '.join(perjudicados[:3])}."
    if perfiles_beneficiados:
        txt += f" Receptividad prioritaria en: {', '.join(perfiles_beneficiados[:3])}."
    return txt


@st.cache_data(ttl=300)
def _generar_barometro_desde_bd(_engine=None) -> dict[str, Any]:
    fallback = {
        "intencion": {
            "PP": 33.1, "PSOE": 27.8, "VOX": 11.4, "SUMAR": 8.9,
            "Junts": 2.1, "ERC": 1.8, "PNV": 1.5, "EH Bildu": 1.2,
            "Otros": 3.8, "En blanco": 2.9, "No sabe/No contesta": 5.5,
        },
        "intencion_estimada": {
            "PP": 35.4, "PSOE": 29.0, "VOX": 12.1, "SUMAR": 9.4,
            "Junts": 2.3, "ERC": 2.0, "PNV": 1.7, "EH Bildu": 1.3, "Otros": 6.8,
        },
        "problemas": {
            "Vivienda": 62, "Economía/paro": 58, "Inmigración": 41,
            "Sanidad": 38, "Corrupción": 35, "Educación": 28,
            "Pensiones": 25, "Cambio climático": 22, "Violencia de género": 18, "Política territorial": 15,
        },
        "valoracion_gobierno": {"Muy buena": 5, "Buena": 22, "Regular": 31, "Mala": 24, "Muy mala": 18},
        "situacion_eco": {"Mucho mejor": 3, "Algo mejor": 14, "Igual": 28, "Algo peor": 35, "Mucho peor": 20},
        "y_ideo": [4, 8, 10, 13, 18, 14, 12, 9, 7, 5],
        "source": "fallback",
    }
    if _engine is None:
        return fallback
    misses = 0
    out = dict(fallback)
    try:
        with _engine.connect() as conn:
            df = pd.read_sql(
                text("SELECT peso_demografico_pct, distribucion_voto_json FROM perfiles_votante"),
                conn,
            )
        if not df.empty:
            raw: dict[str, float] = {}
            total_w = 0.0
            for _, r in df.iterrows():
                w = float(r.get("peso_demografico_pct") or 0.0)
                dist = _safe_vote_dist(r.get("distribucion_voto_json"), 5.0)
                for p, v in dist.items():
                    raw[p] = raw.get(p, 0.0) + w * float(v)
                total_w += w
            if total_w > 0:
                intencion = {k: round(v / total_w, 1) for k, v in sorted(raw.items(), key=lambda x: x[1], reverse=True)}
                out["intencion"] = dict(list(intencion.items())[:10])
                nsnc = float(out["intencion"].pop("NS/NC", 0.0) + out["intencion"].pop("No sabe/No contesta", 0.0))
                abst = float(out["intencion"].pop("Abstención", 0.0))
                cooking = {k: v for k, v in out["intencion"].items() if k not in {"En blanco", "Blanco/Nulo"}}
                denom = sum(cooking.values()) or 1.0
                est = {}
                for k, v in cooking.items():
                    est[k] = v + (nsnc * (v / denom))
                est_denom = sum(est.values()) or 1.0
                out["intencion_estimada"] = {k: round(v / est_denom * 100.0, 1) for k, v in est.items()}
            else:
                misses += 1
        else:
            misses += 1
    except Exception:
        misses += 1

    try:
        probs = cargar_distribucion_campo_perfil_microdatos({}, "principal_problema", limit=10)
        if not probs.empty:
            total = float(probs["peso"].sum() or 1.0)
            out["problemas"] = {
                _decode_micro_label("principal_problema", str(r["categoria"])): int(round(float(r["peso"]) * 100.0 / total))
                for _, r in probs.iterrows()
            }
        else:
            misses += 1
    except Exception:
        misses += 1

    def _map_eco(v: str) -> str:
        vv = _decode_micro_label("situacion_economica_personal", v)
        return vv if vv in {"Muy buena", "Buena", "Regular", "Mala", "Muy mala"} else "Regular"

    try:
        vg = cargar_distribucion_campo_perfil_microdatos({}, "situacion_economica_españa", limit=8)
        if not vg.empty:
            total = float(vg["peso"].sum() or 1.0)
            agg = {"Muy buena": 0, "Buena": 0, "Regular": 0, "Mala": 0, "Muy mala": 0}
            for _, r in vg.iterrows():
                agg[_map_eco(str(r["categoria"]))] += int(round(float(r["peso"]) * 100.0 / total))
            out["valoracion_gobierno"] = agg
        else:
            misses += 1
    except Exception:
        misses += 1

    try:
        se = cargar_distribucion_campo_perfil_microdatos({}, "situacion_economica_personal", limit=8)
        if not se.empty:
            total = float(se["peso"].sum() or 1.0)
            mapped = {"Mucho mejor": 0, "Algo mejor": 0, "Igual": 0, "Algo peor": 0, "Mucho peor": 0}
            for _, r in se.iterrows():
                lab = _map_eco(str(r["categoria"]))
                pct = int(round(float(r["peso"]) * 100.0 / total))
                if lab == "Muy buena":
                    mapped["Mucho mejor"] += pct
                elif lab == "Buena":
                    mapped["Algo mejor"] += pct
                elif lab == "Regular":
                    mapped["Igual"] += pct
                elif lab == "Mala":
                    mapped["Algo peor"] += pct
                else:
                    mapped["Mucho peor"] += pct
            out["situacion_eco"] = mapped
        else:
            misses += 1
    except Exception:
        misses += 1

    try:
        with _engine.connect() as conn:
            ideo = pd.read_sql(
                text(
                    """
                    SELECT ROUND(escala_ideologica)::int AS ide, SUM(COALESCE(peso_muestral,1)) AS w
                    FROM microdatos_encuesta
                    WHERE escala_ideologica IS NOT NULL
                    GROUP BY ROUND(escala_ideologica)::int
                    """
                ),
                conn,
            )
        if not ideo.empty:
            total = float(ideo["w"].sum() or 1.0)
            arr = [0] * 10
            for _, r in ideo.iterrows():
                i = int(max(1, min(10, int(r["ide"]))))
                arr[i - 1] = int(round(float(r["w"]) * 100.0 / total))
            out["y_ideo"] = arr
        else:
            misses += 1
    except Exception:
        misses += 1

    if misses > 3:
        return fallback
    out["source"] = "real"
    return out


@st.cache_data(ttl=300)
def _cargar_evolucion_cluster(_engine=None, cluster_id: int = 0) -> pd.DataFrame:
    if _engine is None or not cluster_id:
        return pd.DataFrame()
    try:
        with _engine.connect() as conn:
            df = pd.read_sql(
                text(
                    """
                    SELECT fecha_estimacion, partido, estimacion_pct
                    FROM estimaciones_voto_agregadas
                    WHERE cluster_id = :cid
                    ORDER BY fecha_estimacion ASC
                    """
                ),
                conn,
                params={"cid": int(cluster_id)},
            )
        if df.empty:
            return df
        df = df.rename(columns={"estimacion_pct": "pct"})
        keep = (
            df.groupby("partido")["pct"]
            .max()
            .reset_index()
            .query("pct > 1.0")["partido"]
            .tolist()
        )
        return df[df["partido"].isin(keep)][["fecha_estimacion", "partido", "pct"]]
    except Exception:
        return pd.DataFrame()


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


def _micro_profile_to_ui(row: pd.Series, idx: int, engine=None) -> dict:
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
    filtros_cluster = {"cluster_id": (str(int(row.get("cluster_id") or 0)),)}

    ccaa_dict: dict[str, int] = {"Norte": 18, "Centro": 22, "Mediterráneo": 20, "Sur": 20, "Islas": 8, "Resto": 12}
    if engine is not None:
        try:
            ccaa_df = cargar_distribucion_campo_perfil_microdatos(filtros_cluster, "ccaa_residencia", limit=8)
            if ccaa_df.empty:
                ccaa_df = cargar_ccaa_perfil_microdatos(filtros_cluster, limit=8)
            if not ccaa_df.empty:
                total_ccaa = float(ccaa_df["peso"].sum() or 1.0)
                out_ccaa: dict[str, int] = {}
                for _, crow in ccaa_df.iterrows():
                    nombre_ccaa = _decode_micro_label("ccaa_id", str(crow["categoria"]))
                    if nombre_ccaa and nombre_ccaa != "CCAA sin identificar":
                        pct = int(round(float(crow["peso"]) * 100.0 / total_ccaa))
                        if pct >= 1:
                            out_ccaa[nombre_ccaa] = pct
                if len(out_ccaa) >= 2:
                    tot = sum(out_ccaa.values()) or 1
                    ccaa_dict = {k: int(round(v * 100 / tot)) for k, v in out_ccaa.items()}
        except Exception:
            pass

    preocupaciones = _preocupaciones_genericas(ideologia, edad_media)
    econ_personal = ""
    econ_esp = ""
    sat_demo = ""
    if engine is not None:
        try:
            preocup_df = cargar_distribucion_campo_perfil_microdatos(
                filtros_cluster, "principal_problema", limit=8
            )
            if not preocup_df.empty:
                tot = float(preocup_df["peso"].sum() or 1.0)
                rows = []
                for _, rr in preocup_df.iterrows():
                    tema = _decode_micro_label("principal_problema", str(rr["categoria"]))
                    pct = int(round(float(rr["peso"]) * 100.0 / tot))
                    rows.append((tema, max(1, min(95, pct))))
                if rows:
                    preocupaciones = rows[:8]
            econ_p_df = cargar_distribucion_campo_perfil_microdatos(
                filtros_cluster, "situacion_economica_personal", limit=1
            )
            econ_e_df = cargar_distribucion_campo_perfil_microdatos(
                filtros_cluster, "situacion_economica_españa", limit=1
            )
            sat_df = cargar_distribucion_campo_perfil_microdatos(
                filtros_cluster, "satisfaccion_democracia", limit=1
            )
            econ_personal = _decode_micro_label("situacion_economica_personal", str(econ_p_df.iloc[0]["categoria"])) if not econ_p_df.empty else ""
            econ_esp = _decode_micro_label("situacion_economica_españa", str(econ_e_df.iloc[0]["categoria"])) if not econ_e_df.empty else ""
            sat_demo = _decode_micro_label("satisfaccion_democracia", str(sat_df.iloc[0]["categoria"])) if not sat_df.empty else ""
        except Exception:
            pass

    opinions = _opinions_from_signals(
        voto=voto,
        ideologia=ideologia,
        edad_media=edad_media,
        econ_personal=econ_personal,
        econ_esp=econ_esp,
        sat_demo=sat_demo,
    )

    ingresos_modal = str(row.get("ingresos_hogar_modal") or "").strip()
    paro_cluster = row.get("tasa_paro_cluster")
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
        "ccaa": ccaa_dict,
        "preocupaciones": preocupaciones,
        "intencion_voto": voto,
        "tendencia_voto": f"Preferencia principal: {top1}.",
        "opinion_gobierno": opinions["opinion_gobierno"],
        "opinion_economia": opinions["opinion_economia"],
        "opinion_territorial": opinions["opinion_territorial"],
        "micro_eco": {
            "Renta media anual": ingresos_modal or f"{renta_est:,.0f} €".replace(",", "."),
            "Tasa de paro": f"{float(paro_cluster):.1f}%" if paro_cluster is not None and not pd.isna(paro_cluster) else f"{paro_est:.1f}%",
            "Ahorro mensual": f"{ahorro_est:,.0f} €".replace(",", "."),
            "Gasto vivienda": f"{vivienda_est:.1f}% renta",
            "Acceso a servicios": acceso_servicios,
            "Riesgo social": riesgo_social,
        },
        "descripcion_origen": desc,
    }


def _build_unified_profiles(max_total: int = 20, engine=None) -> list[dict]:
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
            ui = _micro_profile_to_ui(row, idx, engine=engine)
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


@st.cache_data(ttl=600, show_spinner="Cargando perfiles...")
def _build_unified_profiles_cached(max_total: int = 20, _engine=None) -> list[dict]:
    return _build_unified_profiles(max_total=max_total, engine=_engine)


def _values_to_shares(df: pd.DataFrame) -> dict[str, float]:
    if df.empty:
        return {}
    total = float(df["peso"].sum() or 0.0)
    if total <= 0:
        return {}
    out: dict[str, float] = {}
    for _, r in df.iterrows():
        k = _party_alias(str(r["categoria"]))
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
        "id": 900001,
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
            bar_w = int(float(pct) * 1.8)
            st.markdown(
                f"""
                <div class="preocupacion-bar">
                  <div style="width:160px;font-size:.83rem">{tema}</div>
                  <div style="flex:1;background:{BG3};border-radius:4px;height:14px;max-width:280px">
                    <div style="width:{bar_w}px;max-width:280px;background:{p['ideo_color']};border-radius:4px;height:14px"></div>
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
        st.plotly_chart(fig_donut, use_container_width=True, key=f"donut_{key_suffix}")

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


def _build_profile_evolution(
    voto_share: dict[str, float],
    ideologia_media: float,
    seed_text: str,
    engine=None,
    cluster_id: int | None = None,
) -> pd.DataFrame:
    if engine is not None and cluster_id is not None:
        evo_real = _cargar_evolucion_cluster(engine, int(cluster_id))
        if not evo_real.empty:
            rows: list[dict[str, object]] = []
            for _, r in evo_real.iterrows():
                rows.append(
                    {
                        "periodo": str(pd.to_datetime(r["fecha_estimacion"]).date()),
                        "serie": str(r["partido"]),
                        "valor": float(r["pct"]),
                    }
                )
            return pd.DataFrame(rows)

    seed = sum(ord(c) for c in (seed_text or "perfil")) % 997
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
            return _party_alias(party_map[u])
        if re.fullmatch(r"\d+(\.\d+)?", v):
            return "Otros / No especificado"
        return _party_alias(v)
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
            return _party_alias(rec_map[u])
        if re.fullmatch(r"\d+(\.\d+)?", v):
            return "Otros / No especificado"
        return _party_alias(v)
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


def _legacy_profile_to_data(p: dict[str, Any]) -> dict[str, Any]:
    voto_rows = [
        {"partido": k, "pct_intencion": float(v), "pct_recuerdo": None}
        for k, v in (p.get("intencion_voto") or {}).items()
    ]
    problemas_rows = [
        {"problema": tema, "pct": float(pct), "ranking": i}
        for i, (tema, pct) in enumerate(p.get("preocupaciones") or [], 1)
    ]
    ccaa_rows = [
        {"ccaa": k, "pct": float(v)}
        for k, v in (p.get("ccaa") or {}).items()
    ]
    ejes_rows = [
        {
            "eje": "ideologia",
            "media": float(p.get("ideo_media") or 5.0),
            "mediana": float(p.get("ideo_media") or 5.0),
            "sd": 0.0,
            "pct_izq": None,
            "pct_centro": None,
            "pct_der": None,
        }
    ]
    perfil = {
        "nombre_perfil": p.get("etiqueta", "Perfil"),
        "color": p.get("ideo_color", "#666666"),
        "fuente_datos": "sintetico",
        "cohorte_generacional": None,
        "edad_media": p.get("edad_media"),
        "n_respondentes": None,
        "peso_demografico_pct": float(p.get("peso", 0.0)) * 100.0,
        "ideologia_media": p.get("ideo_media"),
        "satisfaccion_demo_media": None,
        "pct_pesimistas_eco": None,
        "eco_personal_media": None,
        "eco_espana_media": None,
        "eje_redistribucion": None,
        "eje_inmigracion": None,
        "eje_territorial": None,
        "eje_valores": None,
        "clase_social_modal": (p.get("atributos") or {}).get("Clase social"),
        "estudios_modal": (p.get("atributos") or {}).get("Estudios"),
        "situacion_laboral_modal": (p.get("atributos") or {}).get("Situación laboral"),
        "habitat_dominante": (p.get("atributos") or {}).get("Hábitat"),
        "renta_media_anual": None,
        "pct_alquiler": None,
        "pct_paro": None,
        "descripcion_perfil_llm": p.get("descripcion_origen"),
    }
    return {
        "perfil": perfil,
        "voto": pd.DataFrame(voto_rows),
        "problemas": pd.DataFrame(problemas_rows),
        "ccaa": pd.DataFrame(ccaa_rows),
        "ejes": pd.DataFrame(ejes_rows),
        "evolucion": pd.DataFrame(),
    }


def _merge_profile_data_with_fallback(
    data: dict[str, Any],
    fallback_profile: dict[str, Any] | None,
) -> dict[str, Any]:
    """
    Si la BD devuelve una ficha parcial (sin tablas satélite),
    rellena voto/issues/geo/ejes con el fallback sintético local.
    """
    if not fallback_profile:
        return data
    fallback_data = _legacy_profile_to_data(fallback_profile)
    out = dict(data)
    if not (out.get("perfil") or {}):
        out["perfil"] = fallback_data.get("perfil", {})
    else:
        merged = dict(fallback_data.get("perfil", {}))
        merged.update(out.get("perfil", {}))
        out["perfil"] = merged
    for key in ("voto", "problemas", "ccaa", "ejes", "evolucion"):
        df = out.get(key, pd.DataFrame())
        if not isinstance(df, pd.DataFrame) or df.empty:
            out[key] = fallback_data.get(key, pd.DataFrame())
    return out


def _resultado_personalizado_to_data(
    nombre_perfil: str,
    resultado: dict[str, Any],
    color: str = "#6366F1",
) -> dict[str, Any]:
    voto_rows = []
    for item in resultado.get("voto_dist", []) or []:
        raw_cat = str(item.get("categoria", ""))
        partido = _decode_micro_label("intencion_voto", raw_cat) or raw_cat
        voto_rows.append(
            {
                "partido": partido,
                "pct_intencion": float(item.get("pct") or 0.0),
                "pct_recuerdo": None,
            }
        )
    problemas_rows = [
        {
            "problema": p.get("label", str(p.get("categoria", ""))),
            "pct": float(p.get("pct") or 0.0),
            "ranking": i,
        }
        for i, p in enumerate(resultado.get("problemas_dist", []) or [], 1)
    ]
    ccaa_rows = [
        {
            "ccaa": p.get("label", str(p.get("categoria", ""))),
            "pct": float(p.get("pct") or 0.0),
        }
        for p in resultado.get("ccaa_dist", []) or []
    ]
    ejes_rows = [
        {"eje": k, **v}
        for k, v in (resultado.get("ejes_detalle") or {}).items()
        if (v or {}).get("media") is not None
    ]
    perfil = {
        "nombre_perfil": nombre_perfil,
        "color": color,
        "fuente_datos": "microdatos_cis",
        "cohorte_generacional": resultado.get("cohorte_generacional"),
        "edad_media": resultado.get("edad_media"),
        "n_respondentes": resultado.get("n_respondentes"),
        "peso_demografico_pct": resultado.get("pct_poblacion"),
        "ideologia_media": resultado.get("ideologia_media"),
        "satisfaccion_demo_media": resultado.get("satisfaccion_demo_media"),
        "pct_pesimistas_eco": resultado.get("pct_pesimistas_eco"),
        "eco_personal_media": resultado.get("eco_personal_media"),
        "eco_espana_media": resultado.get("eco_espana_media"),
        "eje_redistribucion": resultado.get("eje_redistribucion"),
        "eje_inmigracion": resultado.get("eje_inmigracion"),
        "eje_territorial": resultado.get("eje_territorial"),
        "eje_valores": resultado.get("eje_valores"),
        "clase_social_modal": resultado.get("clase_social_modal"),
        "estudios_modal": resultado.get("estudios_modal"),
        "situacion_laboral_modal": resultado.get("situacion_laboral_modal"),
        "habitat_dominante": resultado.get("habitat_dominante"),
        "renta_media_anual": resultado.get("renta_media_anual"),
        "pct_alquiler": resultado.get("pct_alquiler"),
        "pct_paro": resultado.get("pct_paro"),
        "descripcion_perfil_llm": resultado.get("descripcion_perfil_llm"),
    }
    return {
        "perfil": perfil,
        "voto": pd.DataFrame(voto_rows),
        "problemas": pd.DataFrame(problemas_rows),
        "ccaa": pd.DataFrame(ccaa_rows),
        "ejes": pd.DataFrame(ejes_rows),
        "evolucion": pd.DataFrame(),
    }


def _render_ficha_perfil(data: dict[str, Any]) -> None:
    """Renderiza la ficha completa de un perfil electoral."""
    perfil = data.get("perfil") or {}
    if not perfil:
        st.error("Perfil no encontrado.")
        return

    color = str(perfil.get("color") or "#666666")
    fuente = str(perfil.get("fuente_datos") or "")
    es_real = fuente in {"microdatos_cis", "microdatos_propio"}
    if not es_real:
        st.warning(
            "⚠️ Este perfil usa datos sintéticos. Ejecuta el ETL de microdatos para obtener datos reales."
        )

    edad_media = perfil.get("edad_media")
    edad_num = _to_float_safe(edad_media, -1)
    edad_txt = f"{edad_num:.0f}" if edad_num >= 0 else "–"
    n_enc_txt = str(_to_int_safe(perfil.get("n_respondentes"), 0)) if perfil.get("n_respondentes") is not None else "–"
    cohorte = str(perfil.get("cohorte_generacional") or "").strip()
    nombre = str(perfil.get("nombre_perfil") or "Perfil")

    st.markdown(
        f"<h2 style='margin-bottom:0;color:{color}'>{nombre}</h2>",
        unsafe_allow_html=True,
    )
    if cohorte:
        st.caption(cohorte)
    st.caption(f"Edad media: {edad_txt} años · {n_enc_txt} encuestados")
    st.divider()

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Peso electoral", f"{_to_float_safe(perfil.get('peso_demografico_pct'), 0.0):.1f}%")
    col2.metric("Ideología media", f"{_to_float_safe(perfil.get('ideologia_media'), 5.0):.1f}/10")
    sat_demo = perfil.get("satisfaccion_demo_media")
    col3.metric(
        "Satisfacción democracia",
        f"{_to_float_safe(sat_demo, 0.0):.1f}/4" if sat_demo is not None and not pd.isna(sat_demo) else "–",
    )
    pes_eco = perfil.get("pct_pesimistas_eco")
    col4.metric(
        "% Pesimistas economía",
        f"{_to_float_safe(pes_eco, 0.0):.0f}%" if pes_eco is not None and not pd.isna(pes_eco) else "–",
    )

    tab_voto, tab_issues, tab_geo, tab_ejes, tab_eco, tab_socio = st.tabs(
        ["🗳️ Voto", "⚡ Issues", "🗺️ Geografía", "🧭 Ejes", "💰 Economía", "👤 Sociodemografía"]
    )

    with tab_voto:
        df_voto = data.get("voto", pd.DataFrame())
        if (
            not df_voto.empty
            and "partido" in df_voto.columns
            and ("pct_intencion" in df_voto.columns or "pct_recuerdo" in df_voto.columns)
        ):
            if "pct_intencion" not in df_voto.columns:
                df_voto = df_voto.copy()
                df_voto["pct_intencion"] = pd.NA
            if "pct_recuerdo" not in df_voto.columns:
                df_voto = df_voto.copy()
                df_voto["pct_recuerdo"] = pd.NA
            df_voto = df_voto.copy()
            df_voto["pct_intencion"] = pd.to_numeric(df_voto["pct_intencion"], errors="coerce")
            df_voto["pct_recuerdo"] = pd.to_numeric(df_voto["pct_recuerdo"], errors="coerce")
            fig = px.pie(
                df_voto[df_voto["pct_intencion"].notna()],
                names="partido",
                values="pct_intencion",
                hole=0.45,
                title="Intención de voto",
                color="partido",
                color_discrete_map=COLORES_PARTIDO,
            )
            fig.update_traces(textposition="inside", textinfo="percent+label")
            fig.update_layout(
                showlegend=True,
                height=380,
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig, use_container_width=True)

            if "pct_recuerdo" in df_voto.columns and df_voto["pct_recuerdo"].notna().any():
                st.markdown("**Comparativa intención vs recuerdo de voto**")
                df_comp = (
                    df_voto.melt(
                        id_vars="partido",
                        value_vars=["pct_intencion", "pct_recuerdo"],
                        var_name="tipo",
                        value_name="pct",
                    )
                    .dropna(subset=["pct"])
                )
                df_comp["tipo"] = df_comp["tipo"].map(
                    {
                        "pct_intencion": "Intención actual",
                        "pct_recuerdo": "Recuerdo 2023",
                    }
                )
                fig2 = px.bar(
                    df_comp,
                    x="partido",
                    y="pct",
                    color="tipo",
                    barmode="group",
                    color_discrete_map={
                        "Intención actual": color,
                        "Recuerdo 2023": "#94A3B8",
                    },
                )
                fig2.update_layout(
                    height=320,
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                )
                st.plotly_chart(fig2, use_container_width=True)
        else:
            st.info("Sin datos de voto para este perfil.")

    with tab_issues:
        df_prob = data.get("problemas", pd.DataFrame())
        if not df_prob.empty and {"problema", "pct"}.issubset(set(df_prob.columns)):
            df_prob_plot = df_prob.copy()
            df_prob_plot["pct"] = pd.to_numeric(df_prob_plot["pct"], errors="coerce")
            df_prob_plot = df_prob_plot.dropna(subset=["pct"])
            if df_prob_plot.empty:
                st.info("Sin datos de issues para este perfil.")
            else:
                fig = px.bar(
                    df_prob_plot.head(10),
                    x="pct",
                    y="problema",
                    orientation="h",
                    title="Principales preocupaciones (%)",
                    color_discrete_sequence=[color],
                )
                fig.update_layout(
                    yaxis={"categoryorder": "total ascending"},
                    height=420,
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                )
                fig.update_traces(texttemplate="%{x:.0f}%", textposition="outside")
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Sin datos de issues para este perfil.")

    with tab_geo:
        df_ccaa = data.get("ccaa", pd.DataFrame())
        if not df_ccaa.empty and {"ccaa", "pct"}.issubset(set(df_ccaa.columns)):
            df_ccaa = df_ccaa.copy()
            df_ccaa["pct"] = pd.to_numeric(df_ccaa["pct"], errors="coerce")
            df_ccaa = df_ccaa.dropna(subset=["pct"])
            if df_ccaa.empty:
                st.info("Sin datos geográficos para este perfil.")
            else:
                fig = px.bar(
                    df_ccaa.sort_values("pct", ascending=True).tail(10),
                    x="pct",
                    y="ccaa",
                    orientation="h",
                    title="Distribución geográfica (%)",
                    color_discrete_sequence=[color],
                )
                fig.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)",
                    plot_bgcolor="rgba(0,0,0,0)",
                    height=380,
                )
                fig.update_traces(texttemplate="%{x:.0f}%", textposition="outside")
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Sin datos geográficos para este perfil.")

    with tab_ejes:
        df_ejes = data.get("ejes", pd.DataFrame())
        if not df_ejes.empty and {"eje", "media"}.issubset(set(df_ejes.columns)):
            ejes_labels = {
                "ideologia": "Ideología (1=Izq, 10=Der)",
                "eje_redistribucion": "Redistribución (1=Liberal, 10=Igualitario)",
                "eje_inmigracion": "Inmigración (1=Abierta, 10=Restrictiva)",
                "eje_territorial": "Territorial (1=Centralista, 10=Autonomista)",
                "eje_valores": "Valores (1=Progresista, 10=Conservador)",
            }
            for _, row in df_ejes.iterrows():
                media = row.get("media")
                if media is None or pd.isna(media):
                    continue
                label = ejes_labels.get(str(row.get("eje")), str(row.get("eje")))
                col_izq, col_bar, col_der = st.columns([1, 6, 1])
                col_izq.caption("1")
                col_der.caption("10")
                pct_pos = max(0.0, min(1.0, (float(media) - 1.0) / 9.0))
                col_bar.markdown(
                    f"""
                    <div style='position:relative;height:28px;background:#1e293b;
                                border-radius:14px;overflow:hidden;margin-bottom:4px'>
                        <div style='position:absolute;left:{pct_pos*100:.1f}%;top:50%;
                                    transform:translate(-50%,-50%);width:18px;height:18px;
                                    background:{color};border-radius:50%;border:2px solid white'></div>
                    </div>
                    <small style='color:#94a3b8'>{label} — media: {float(media):.1f}
                    &nbsp;(±{float(row.get('sd') or 0):.1f})</small>
                    """,
                    unsafe_allow_html=True,
                )

            if {"pct_izq", "pct_centro", "pct_der"}.issubset(set(df_ejes.columns)):
                df_dist = df_ejes[["eje", "pct_izq", "pct_centro", "pct_der"]].copy()
                df_dist = df_dist.melt(id_vars="eje", var_name="posicion", value_name="pct")
                df_dist["posicion"] = df_dist["posicion"].map(
                    {
                        "pct_izq": "Izquierda (1-4)",
                        "pct_centro": "Centro (5-6)",
                        "pct_der": "Derecha (7-10)",
                    }
                )
                df_dist_plot = df_dist.dropna(subset=["pct"])
                if not df_dist_plot.empty:
                    fig = px.bar(
                        df_dist_plot,
                        x="eje",
                        y="pct",
                        color="posicion",
                        barmode="stack",
                        color_discrete_map={
                            "Izquierda (1-4)": "#E31C1C",
                            "Centro (5-6)": "#F59E0B",
                            "Derecha (7-10)": "#1A56DB",
                        },
                        title="Distribución ideológica por eje",
                    )
                    fig.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)",
                        plot_bgcolor="rgba(0,0,0,0)",
                        height=340,
                    )
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("Sin distribución detallada por ejes para este perfil.")
        else:
            st.info("Sin datos de ejes para este perfil.")

    with tab_eco:
        c1, c2, c3 = st.columns(3)
        renta = perfil.get("renta_media_anual")
        c1.metric(
            "Renta media anual",
            f"{float(renta):,.0f} €".replace(",", ".") if renta is not None and not pd.isna(renta) else "–",
        )
        pct_alq = perfil.get("pct_alquiler")
        c2.metric("% en alquiler", f"{float(pct_alq):.0f}%" if pct_alq is not None and not pd.isna(pct_alq) else "–")
        pct_paro = perfil.get("pct_paro")
        c3.metric("Tasa de paro estimada", f"{float(pct_paro):.0f}%" if pct_paro is not None and not pd.isna(pct_paro) else "–")

        col_a, col_b = st.columns(2)
        with col_a:
            val = perfil.get("eco_personal_media")
            if val is not None and not pd.isna(val):
                st.markdown("**Situación económica personal subjetiva**")
                st.progress(float(val) / 5.0, text=f"{float(val):.1f} / 5.0")
        with col_b:
            if pes_eco is not None and not pd.isna(pes_eco):
                st.markdown("**% que cree que la economía empeorará**")
                st.metric(
                    "",
                    f"{float(pes_eco):.0f}%",
                    delta=None,
                    help="% del subconjunto con perspectiva económica negativa",
                )

    with tab_socio:
        datos_socio = {
            "Cohorte generacional": perfil.get("cohorte_generacional"),
            "Hábitat dominante": perfil.get("habitat_dominante"),
            "Clase social modal": perfil.get("clase_social_modal"),
            "Estudios modales": perfil.get("estudios_modal"),
            "Situación laboral modal": perfil.get("situacion_laboral_modal"),
            "Edad media": f"{float(edad_media):.1f} años" if edad_media is not None and not pd.isna(edad_media) else None,
        }
        for k, v in datos_socio.items():
            if v:
                st.write(f"**{k}:** {v}")

        if perfil.get("descripcion_perfil_llm"):
            st.divider()
            st.markdown("**Análisis cualitativo (generado por IA)**")
            st.markdown(f"_{perfil['descripcion_perfil_llm']}_")


def _render_constructor_perfil(conn) -> None:
    """Constructor de perfiles personalizados con analisis en tiempo real."""
    st.subheader("🔬 Constructor de Perfil Personalizado")
    st.caption(
        "Define el segmento combinando filtros. El sistema buscara en microdatos reales y generara el perfil."
    )

    with st.form("constructor_perfil_form"):
        col_meta1, col_meta2 = st.columns(2)
        usuario = col_meta1.text_input("Usuario", value="default")
        nombre_perfil = col_meta2.text_input("Nombre del perfil", value="Mi perfil")

        st.markdown("**Sociodemografía**")
        c1, c2, c3, c4 = st.columns(4)
        sexo = c1.multiselect("Sexo", ["1=Hombre", "2=Mujer"])
        grupo_edad = c2.selectbox("Grupo de edad", ["Sin filtro", "18-29", "30-44", "45-64", "65+"])
        estudios = c3.multiselect(
            "Estudios",
            [
                "1=Sin estudios",
                "2=Primaria",
                "3=Secundaria/FP",
                "4=Bachillerato",
                "5=FP Superior",
                "6=Universitarios",
                "7=Posgrado",
            ],
        )
        sit_lab = c4.multiselect(
            "Situación laboral",
            [
                "1=Trabajando",
                "2=Parado/a",
                "3=Jubilado/a",
                "4=Estudiante",
                "5=Labores del hogar",
            ],
        )

        c5, c6, c7, c8 = st.columns(4)
        clase = c5.multiselect(
            "Clase social",
            [
                "1=Alta/Media-alta",
                "2=Media-alta",
                "3=Media-media",
                "4=Media-baja",
                "5=Obrera",
                "6=Baja",
            ],
        )
        habitat = c6.multiselect(
            "Tipo de municipio",
            [
                "1=Rural <2k",
                "2=Pequeño 2-10k",
                "3=Medio 10-50k",
                "4=Ciudad 50-100k",
                "5=Gran ciudad 100-400k",
                "6=Metrópoli 400k+",
            ],
        )
        ccaa_sel = c7.multiselect(
            "CCAA de residencia",
            [
                "01=Andalucía",
                "02=Aragón",
                "03=Asturias",
                "04=Baleares",
                "05=Canarias",
                "06=Cantabria",
                "07=C-La Mancha",
                "08=C y León",
                "09=Cataluña",
                "10=C. Valenciana",
                "11=Extremadura",
                "12=Galicia",
                "13=Madrid",
                "14=Murcia",
                "15=Navarra",
                "16=País Vasco",
                "17=La Rioja",
            ],
        )
        religion = c8.multiselect(
            "Religión",
            [
                "1=Católico practicante",
                "2=Católico no practicante",
                "3=Otras religiones",
                "4=No creyente/Ateo",
            ],
        )

        st.markdown("**Comportamiento electoral**")
        c9, c10, c11 = st.columns(3)
        intencion = c9.multiselect(
            "Intención de voto",
            [
                "1=PP",
                "2=PSOE",
                "3=VOX",
                "4=SUMAR",
                "5=ERC",
                "6=JUNTS",
                "7=PNV",
                "8=EH BILDU",
                "97=Otros",
                "98=Abstención",
                "99=NS/NC",
            ],
        )
        recuerdo = c10.multiselect(
            "Recuerdo de voto (2023)",
            [
                "1=PP",
                "2=PSOE",
                "3=VOX",
                "4=SUMAR",
                "5=ERC",
                "6=JUNTS",
                "7=PNV",
                "8=EH BILDU",
                "97=Otros",
                "98=Abstención",
                "99=No votó",
            ],
        )
        ideologia_rango = c11.slider("Rango ideológico (1=Izquierda, 10=Derecha)", 1, 10, (1, 10))

        st.markdown("**Actitudes y valoraciones**")
        c12, c13, c14 = st.columns(3)
        eco_personal = c12.multiselect(
            "Situación económica personal",
            ["1=Muy mala", "2=Mala", "3=Regular", "4=Buena", "5=Muy buena"],
        )
        eco_espana = c13.multiselect(
            "Situación económica de España",
            ["1=Muy mala", "2=Mala", "3=Regular", "4=Buena", "5=Muy buena"],
        )
        satisf_demo = c14.multiselect(
            "Satisfacción con la democracia",
            ["1=Muy satisfecho", "2=Satisfecho", "3=Poco satisfecho", "4=Nada satisfecho"],
        )

        notas = st.text_area("Notas", value="Perfil creado desde constructor personalizado")
        submitted = st.form_submit_button("🔍 Analizar perfil", type="primary")

    if not submitted:
        return

    def extraer_codigos(lista: list[str]) -> list[str]:
        return [item.split("=")[0].strip() for item in lista]

    filtros: dict[str, Any] = {}
    if sexo:
        filtros["sexo"] = extraer_codigos(sexo)
    if grupo_edad != "Sin filtro":
        rangos = {"18-29": (18, 29), "30-44": (30, 44), "45-64": (45, 64), "65+": (65, 100)}
        filtros["edad"] = rangos[grupo_edad]
    if estudios:
        filtros["estudios"] = extraer_codigos(estudios)
    if sit_lab:
        filtros["situacion_laboral"] = extraer_codigos(sit_lab)
    if clase:
        filtros["clase_social"] = extraer_codigos(clase)
    if habitat:
        filtros["habitat"] = extraer_codigos(habitat)
    if ccaa_sel:
        filtros["ccaa"] = extraer_codigos(ccaa_sel)
    if religion:
        filtros["religion"] = extraer_codigos(religion)
    if intencion:
        filtros["intencion_voto"] = extraer_codigos(intencion)
    if recuerdo:
        filtros["recuerdo_voto"] = extraer_codigos(recuerdo)
    if ideologia_rango != (1, 10):
        filtros["ideologia"] = ideologia_rango
    if eco_personal:
        filtros["eco_personal"] = extraer_codigos(eco_personal)
    if eco_espana:
        filtros["eco_espana"] = extraer_codigos(eco_espana)
    if satisf_demo:
        filtros["satisfaccion_demo"] = extraer_codigos(satisf_demo)

    if not filtros:
        st.warning("Debes aplicar al menos un filtro.")
        return
    if conn is None:
        st.error("No hay conexión activa a BD para analizar el perfil.")
        return

    with st.spinner("Analizando subconjunto en microdatos..."):
        try:
            from etl.models.segmentacion_microdatos import analizar_perfil_personalizado

            resultado = analizar_perfil_personalizado(conn, filtros, nombre=nombre_perfil, usuario=usuario)
        except Exception as exc:
            st.error(f"No se pudo analizar el perfil: {exc}")
            return

    if "error" in resultado:
        st.error(str(resultado["error"]))
        return

    st.success(
        f"✅ Perfil calculado sobre **{resultado.get('n_respondentes', 0)} encuestados** "
        f"({float(resultado.get('pct_poblacion', 0) or 0):.1f}% de la población ponderada)"
    )
    if resultado.get("cluster_mas_cercano"):
        st.info(
            f"🔗 Perfil más similar en la base: **cluster {resultado['cluster_mas_cercano']}** "
            f"(similitud coseno: {float(resultado.get('similitud_cluster', 0)):.2f})"
        )
    st.caption(notas)
    _render_ficha_perfil(_resultado_personalizado_to_data(nombre_perfil, resultado))


engine = _get_page_engine()
conn = _get_page_conn()
PERFILES_UNIFICADOS = _build_unified_profiles_cached(max_total=20, _engine=engine)

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
    st.markdown(
        f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Perfiles electorales (microdatos + constructor personalizado)</span><div class="line"></div></div>',
        unsafe_allow_html=True,
    )

    modo = st.radio(
        "",
        ["Perfiles predefinidos", "Mis perfiles guardados", "Constructor"],
        horizontal=True,
        label_visibility="collapsed",
    )

    if modo == "Perfiles predefinidos":
        if conn is None:
            st.warning("Sin conexión a BD. Mostrando catálogo sintético local.")
            opciones_local = {p.get("etiqueta", f"Perfil {i+1}"): i for i, p in enumerate(PERFILES_UNIFICADOS)}
            sel_local = st.selectbox("Selecciona perfil", list(opciones_local.keys()))
            if sel_local:
                _render_ficha_perfil(_legacy_profile_to_data(PERFILES_UNIFICADOS[opciones_local[sel_local]]))
        else:
            df_perfiles = cargar_lista_perfiles(conn, tipo="predefinido")
            if df_perfiles.empty:
                st.info("No hay perfiles calculados. Ejecuta: `python -m etl.models.segmentacion_microdatos`")
                if PERFILES_UNIFICADOS:
                    opciones_local = {p.get("etiqueta", f"Perfil {i+1}"): i for i, p in enumerate(PERFILES_UNIFICADOS)}
                    sel_local = st.selectbox("Selecciona perfil (fallback)", list(opciones_local.keys()))
                    if sel_local:
                        _render_ficha_perfil(_legacy_profile_to_data(PERFILES_UNIFICADOS[opciones_local[sel_local]]))
            else:
                opciones = {
                    f"{row['nombre_perfil']} ({_to_float_safe(row.get('peso_demografico_pct'), 0.0):.0f}%)": _to_int_safe(row["cluster_id"], -1)
                    for _, row in df_perfiles.iterrows()
                }
                seleccion = st.selectbox("Selecciona perfil", list(opciones.keys()))
                if seleccion:
                    cluster_id = opciones[seleccion]
                    data = cargar_perfil_completo(conn, cluster_id)
                    fallback = next(
                        (p for p in PERFILES_UNIFICADOS if int(p.get("id", -1)) == int(cluster_id)),
                        None,
                    )
                    data = _merge_profile_data_with_fallback(data, fallback)
                    if not (data.get("perfil") or {}):
                        st.warning("No se pudo cargar ficha completa. Mostrando fallback sintético.")
                        if fallback:
                            _render_ficha_perfil(_legacy_profile_to_data(fallback))
                    else:
                        _render_ficha_perfil(data)

    elif modo == "Mis perfiles guardados":
        usuario = st.text_input("Usuario", value="default")
        if conn is None:
            st.error("No hay conexión a BD para cargar perfiles guardados.")
        else:
            df_guardados = cargar_perfiles_personalizados(conn, usuario=usuario)
            if df_guardados.empty:
                st.info("No tienes perfiles guardados. Crea uno en el Constructor.")
            else:
                opciones_g = {
                    f"{row['nombre']} ({int(row.get('n_respondentes') or 0)} enc.)": int(row["perfil_id"])
                    for _, row in df_guardados.iterrows()
                }
                sel_g = st.selectbox("Selecciona perfil guardado", list(opciones_g.keys()))
                if sel_g:
                    detalle = cargar_perfil_personalizado_detalle(conn, opciones_g[sel_g])
                    st.json(detalle.get("filtros") or {}, expanded=False)
                    if detalle.get("resultado"):
                        data_custom = _resultado_personalizado_to_data(
                            str(detalle.get("nombre") or "Perfil guardado"),
                            dict(detalle.get("resultado") or {}),
                            color=str(detalle.get("color_cluster") or "#6366F1"),
                        )
                        _render_ficha_perfil(data_custom)
                    else:
                        st.info("Este perfil guardado no tiene snapshot de resultados reutilizable.")

    elif modo == "Constructor":
        _render_constructor_perfil(conn)

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

    impactos_fuente = _cargar_impactos_desde_bd(_engine=engine)
    impactos_catalogo = impactos_fuente or TEMAS_IMPACTO

    with st.form("simulador_campana"):
        col_f1, col_f2, col_f3 = st.columns(3)
        with col_f1:
            partido_emisor = st.selectbox("Partido emisor", ["PP", "PSOE", "VOX", "SUMAR", "Junts", "PNV"])
        with col_f2:
            tema_sel = st.selectbox("Tema de campaña", list(impactos_catalogo.keys()))
        with col_f3:
            intensidad = st.slider("Intensidad del mensaje", 1, 10, 5,
                                   help="1 = mensaje suave, 10 = campaña intensiva")
        mensaje_libre = st.text_area("Mensaje (opcional, para referencia)", height=80,
                                     placeholder="Ej: 'Vamos a bajar los impuestos a las familias trabajadoras...'")
        simular = st.form_submit_button("Simular impacto", type="primary")

    if simular:
        impactos_raw = impactos_catalogo.get(tema_sel, {})
        factor = intensidad / 5.0

        # Impacto en intención de voto por partido
        impactos_partido = {}
        for pty, datos in impactos_raw.items():
            pp_base = datos.get("pp_impacto", 0.0)
            impactos_partido[pty] = round(pp_base * factor, 2)

        # Impacto en receptividad de perfiles
        perfiles_beneficiados = impactos_raw.get(partido_emisor, {}).get("perfiles", [])

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
                score = _receptividad_tema_perfil(
                    tema=tema_sel,
                    perfil=perf,
                    impactos_raw=impactos_raw.get(partido_emisor, {}),
                )
                reacciones.append((perf["etiqueta"], score, perf["ideo_color"]))

            reacciones.sort(key=lambda x: x[1], reverse=True)
            for etiq, score, color in reacciones:
                bar_w = int(score * 18)
                st.markdown(f"""
                <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
                    <div style="width:150px;font-size:.82rem">{etiq}</div>
                    <div style="flex:1;background:{BG3};border-radius:4px;height:14px;max-width:180px">
                        <div style="width:{bar_w}px;background:{color};border-radius:4px;height:14px"></div>
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
        st.caption(
            _narrativa_impacto(
                tema=tema_sel,
                partido_emisor=partido_emisor,
                ganadores=ganadores,
                perjudicados=perjudicados,
                perfiles_beneficiados=perfiles_beneficiados,
                impactos_partido=impactos_partido,
                perfiles_unificados=PERFILES_UNIFICADOS,
            )
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

    baro = _generar_barometro_desde_bd(_engine=engine)
    intencion = baro["intencion"]
    intencion_estimada = baro["intencion_estimada"]
    problemas = baro["problemas"]
    valoracion_gobierno = baro["valoracion_gobierno"]
    situacion_eco = baro["situacion_eco"]
    y_ideo = baro["y_ideo"]
    fuente_real = baro.get("source") == "real"
    fuente_tag = "[Fuente: microdatos reales]" if fuente_real else "[Fuente: sintético calibrado]"

    n_total_micro = 0
    try:
        if engine is not None:
            with engine.connect() as conn:
                n_total_micro = int(conn.execute(text("SELECT COUNT(*) FROM microdatos_encuesta")).scalar() or 0)
    except Exception:
        n_total_micro = 0
    margen_barometro = round(1.96 * math.sqrt(0.25 / max(1, n_total_micro)) * 100, 1)
    fuente_txt = "Microdatos reales" if n_total_micro > 100 else ("Sintético calibrado" if engine is not None else "Sin conexión a BD")
    kpi_b1, kpi_b2, kpi_b3, kpi_b4 = st.columns(4)
    kpi_b1.metric("Respondentes base", f"{n_total_micro:,}".replace(",", ".") if n_total_micro else ("Sin conexión a BD" if engine is None else "Sin datos"))
    kpi_b2.metric("Margen de error", f"±{margen_barometro} pp" if n_total_micro > 100 else "N/A")
    kpi_b3.metric("Intervalo de confianza", "95%" if n_total_micro > 100 else "N/A")
    kpi_b4.metric("Fuente", fuente_txt)

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
            title=f"Intención de voto directa (%) {fuente_tag}", height=320,
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
            title=f'Estimación de voto (tras "cocina" CIS) (%) {fuente_tag}', height=320,
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
            title=f"Problemas principales {fuente_tag}",
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
        fig_val.update_layout(
            title=f"Valoración del gobierno {fuente_tag}",
            height=320, paper_bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT2), margin=dict(t=10, b=10)
        )
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
            title=f"Situación económica personal {fuente_tag}",
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
            title=f"Distribución ideológica {fuente_tag}",
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
        **Generación de datos del barómetro:**

        1. **Base:** Perfiles de votante calibrados con datos reales del CIS (barómetros 2023-2025)
        2. **Intención de voto directa:** Promedio ponderado de los 6 perfiles de votante, con pesos poblacionales actualizados
        3. **"Cocina":** Se aplica el método habitual del CIS para distribuir el NS/NC y los indecisos entre los partidos según recuerdo de voto y simpatía
        4. **Problemas principales:** Agregación de las preocupaciones de cada perfil, ponderada por peso electoral
        5. **Situación económica:** si hay microdatos cargados se usa distribución empírica real; si no, fallback sintético calibrado.
        6. **Autoubicación ideológica:** si hay microdatos, se agrega escala ideológica real; si no, distribución calibrada.
        5b. Si los microdatos están cargados, los puntos 3-6 usan datos empíricos reales en lugar de distribuciones sintéticas calibradas manualmente.
            Se indica en cada gráfico si la fuente es empírica o sintética.

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

    if analizar or guardar:
        resultado_robusto = cargar_resumen_perfil_microdatos_robusto(filtros_base)
        resumen = resultado_robusto["resumen"]
        precision = str(resultado_robusto.get("precision", "alta"))
        n_efectivo = int(resultado_robusto.get("n_efectivo", 0) or 0)
        filtros_relajados = list(resultado_robusto.get("filtros_relajados", []) or [])
        filtros_activos_reales = dict(resultado_robusto.get("filtros_activos", {}) or {})

        if filtros_relajados:
            nombres_legibles = {
                "religion": "Religión",
                "situacion_economica_españa": "Situación económica España",
                "situacion_economica_personal": "Situación económica personal",
                "satisfaccion_democracia": "Satisfacción con la democracia",
                "ingresos_hogar": "Ingresos del hogar",
                "ocupacion": "Ocupación",
                "clase_social_subjetiva": "Clase social",
                "principal_problema": "Principal problema",
                "tamano_habitat": "Tipo de municipio",
                "ccaa_id": "CCAA",
                "identidad_territorial": "Identidad territorial",
                "situacion_laboral": "Situación laboral",
                "estudios": "Estudios",
                "grupo_edad": "Grupo de edad",
                "sexo": "Sexo",
            }
            relajados_nombres = [nombres_legibles.get(f, str(f)) for f in filtros_relajados]

            if precision == "baja":
                st.warning(
                    f"⚠️ Muestra ajustada (N={n_efectivo} casos). Para ampliar la representatividad "
                    f"se han omitido los filtros: **{', '.join(relajados_nombres)}**. "
                    f"El perfil es orientativo."
                )
            elif precision == "minima":
                st.warning(
                    f"⚠️ Muestra muy pequeña (N={n_efectivo}). Perfil basado en características "
                    f"generales. Se omitieron: **{', '.join(relajados_nombres)}**."
                )
            elif precision == "media":
                st.info(
                    f"ℹ️ Perfil basado en N={n_efectivo} casos. "
                    + (
                        f"Filtros omitidos para ampliar muestra: {', '.join(relajados_nombres)}."
                        if relajados_nombres
                        else ""
                    )
                )

        if resumen.empty or int(float(resumen.iloc[0].get("n", 0) or 0)) == 0:
            st.error("No hay microdatos cargados todavía para construir perfiles.")
        else:
            r = resumen.iloc[0]
            n_obs = int(float(r.get("n", 0) or 0))
            peso_total = float(r.get("peso_total", 0) or 0.0)
            edad_media = float(r.get("edad_media", 45.0) or 45.0)
            ideologia_media = float(r.get("ideologia_media", escideol_manual) or escideol_manual)

            intencion_pf = cargar_intencion_perfil_microdatos(filtros_activos_reales, limit=12)
            ccaa_pf = cargar_ccaa_perfil_microdatos(filtros_activos_reales, limit=10)
            recuerdo_pf = cargar_recuerdo_perfil_microdatos(filtros_activos_reales, limit=10)
            preocup_pf = cargar_distribucion_campo_perfil_microdatos(filtros_activos_reales, "principal_problema", limit=8)
            habitat_pf = cargar_distribucion_campo_perfil_microdatos(filtros_activos_reales, "tamano_habitat", limit=6)
            ingresos_pf = cargar_distribucion_campo_perfil_microdatos(filtros_activos_reales, "ingresos_hogar", limit=6)
            religion_pf = cargar_distribucion_campo_perfil_microdatos(filtros_activos_reales, "religion", limit=6)
            econ_p_pf = cargar_distribucion_campo_perfil_microdatos(filtros_activos_reales, "situacion_economica_personal", limit=5)
            econ_e_pf = cargar_distribucion_campo_perfil_microdatos(filtros_activos_reales, "situacion_economica_españa", limit=5)
            ccaa_real_pf = cargar_distribucion_campo_perfil_microdatos(filtros_activos_reales, "ccaa_residencia", limit=10)

            n_eff = max(80, n_obs)
            margen_base = 1.96 * math.sqrt(0.25 / n_eff) * 100.0
            confianza_txt = "Alta" if n_obs >= 700 else ("Media" if n_obs >= 220 else "Baja")
            cobertura_txt = "Exacta" if not filtros_relajados else f"Aproximada ({len(filtros_relajados)} relajaciones)"
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("Confianza estadística", confianza_txt)
            k2.metric("Precisión base", f"±{margen_base:.1f} pp")
            k3.metric("Edad media", f"{edad_media:.1f}")
            k4.metric("Ideología media", f"{ideologia_media:.2f}")

            st.markdown(
                f"**Perfil evaluado:** {sexo_sel} · {edad_sel} · {estudios_sel} · {sitlab_sel} · {clasesub_sel} · {ccaa_sel} · {habitat_sel}"
            )
            st.caption(f"Cobertura del ajuste: {cobertura_txt}.")

            voto_share = _sanitize_vote_share(_values_to_shares(intencion_pf), ideologia_media)
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
                top_vote = voto_ci.iloc[0]["partido"] if not voto_ci.empty else None
                payload = {
                    "usuario_id": usuario_id.strip() or "default",
                    "nombre_perfil": nombre_perfil.strip() or "perfil_objetivo",
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
        preocup_seg = cargar_distribucion_campo_perfil_microdatos(filtros_seg, "principal_problema", limit=6)
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

    perfiles_usr_df = cargar_perfiles_usuario_custom(usuario_id=(usuario_id.strip() or "default"))
    if not perfiles_usr_df.empty:
        st.markdown("##### Perfiles guardados")
        st.dataframe(perfiles_usr_df, use_container_width=True, height=220)
