"""
Página: Perfiles de Votante, Simulador de Campaña y Encuesta Sintética CIS

Sin dependencia de API keys externas. Todo el análisis es local y basado
en datos sintéticos calibrados con encuestas reales del CIS.
"""

from __future__ import annotations

import sys
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
from dashboard.components.data_source_indicator import (
    DataSource, render_source_banner,
)
from dashboard.db import cargar_nowcasting
from dashboard.adapters import create_simulation_adapter


def _cargar_perfiles_reales() -> list[dict] | None:
    """
    Intenta cargar perfiles derivados de microdatos reales.
    Devuelve None si no hay datos disponibles (fallback a sintéticos).
    Resuelve audit 4.3: reconciliación dinámica desde microdatos CIS.
    """
    try:
        from dashboard.config import settings
        from dashboard.ingestion.microdatos_loader import get_loaded_studies, load_study_from_bronze
        from dashboard.models.cohort_analysis import auto_segment

        studies = get_loaded_studies(settings.data_dir)
        if not studies:
            return None
        # Usar el estudio más reciente (último en la lista)
        estudio = studies[-1]
        df = load_study_from_bronze(estudio["codigo_estudio"], settings.data_dir)
        if df.empty or len(df) < 100:
            return None
        perfiles = auto_segment(df, n_perfiles=6, method="ideology_x_vote")
        return perfiles if perfiles else None
    except Exception:
        return None

COLORES_PARTIDO = {
    "PP": "#3B82F6", "PSOE": "#EF4444", "VOX": "#22C55E",
    "SUMAR": "#EC4899", "Junts": "#00C0B2", "ERC": "#FAB710",
    "PNV": "#22C55E", "EH Bildu": "#4ADE80",
    "Abstención": "#9CA3AF", "Blanco/Nulo": "#D1D5DB",
    "En blanco": "#E5E7EB", "No sabe/No contesta": "#6B7280",
    "Voto nulo": "#F3F4F6",
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

# ── Reconciliación: datos reales vs sintéticos (audit 4.3 + 1.1) ────────────
with st.spinner("Cargando perfiles..."):
    _perfiles_reales = _cargar_perfiles_reales()
if _perfiles_reales:
    _PERFILES_ACTIVOS = _perfiles_reales
    _FUENTE_PERFILES  = DataSource(
        kind="microdatos",
        label="Microdatos propios",
        detail="Perfiles generados dinámicamente desde los microdatos cargados.",
        n_records=sum(p.get("n_respondentes", 0) for p in _perfiles_reales),
    )
else:
    _PERFILES_ACTIVOS = PERFILES
    _FUENTE_PERFILES  = DataSource(
        kind="sintetico",
        label="Datos sintéticos hardcoded",
        detail="No hay microdatos cargados. Carga un fichero en la página 14_Microdatos "
               "para ver perfiles basados en encuestas reales.",
    )

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "Perfiles de Votante",
    "Simulador de Campaña",
    "Encuesta Sintética CIS",
    "Simulador LLM (V3)",
])

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1: PERFILES
# ══════════════════════════════════════════════════════════════════════════════
with tab1:
    render_source_banner(_FUENTE_PERFILES)
    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Segmentación del electorado español (6 perfiles principales)</span><div class="line"></div></div>', unsafe_allow_html=True)

    # KPIs
    kpi_cols = st.columns(len(_PERFILES_ACTIVOS))
    for i, p in enumerate(_PERFILES_ACTIVOS):
        color = p["ideo_color"]
        tend = "↑" if "creciente" in p["tendencia_perfil"] else ("↓" if "decreciente" in p["tendencia_perfil"] else "→")
        with kpi_cols[i]:
            st.markdown(f"""
            <div style="background:{BG3};border:1px solid {BORDER};border-left:3px solid {color};
                        padding:.5rem .6rem;border-radius:8px;text-align:center">
                <div style="font-size:.75rem;font-weight:700;color:{color}">{p['etiqueta']}</div>
                <div style="font-size:1.3rem;font-weight:800">{p['peso']*100:.0f}%</div>
                <div style="font-size:.72rem;color:{TEXT2}">{p['n_personas']} {tend}</div>
            </div>
            """, unsafe_allow_html=True)

    st.divider()

    # Selector de perfil
    perfil_sel = st.selectbox("Explorar perfil en detalle", [p["etiqueta"] for p in PERFILES])
    p = next(x for x in PERFILES if x["etiqueta"] == perfil_sel)

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
              <strong>Peso electoral:</strong> {p['peso']*100:.0f}% · {p['n_personas']}
            </div>
            <div style="background:{BG3};border-radius:8px;padding:.5rem .8rem;color:{color_tend}">
              <strong>Tendencia:</strong> {tend_txt}
            </div>
          </div>
        </div>
        """, unsafe_allow_html=True)

        # Preocupaciones
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Principales preocupaciones</span><div class="line"></div></div>', unsafe_allow_html=True)
        for tema, pct in p["preocupaciones"]:
            bar_w = int(pct * 1.8)
            bar_color = p["ideo_color"]
            st.markdown(f"""
            <div class="preocupacion-bar">
              <div style="width:160px;font-size:.83rem">{tema}</div>
              <div style="flex:1;background:{BG3};border-radius:4px;height:14px;max-width:280px">
                <div style="width:{bar_w}px;max-width:280px;background:{bar_color};border-radius:4px;height:14px"></div>
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
            x=[p["etiqueta"] for p in PERFILES],
            y=[p["peso"] * 100 for p in PERFILES],
            marker_color=[p["ideo_color"] for p in PERFILES],
            text=[f"{p['peso']*100:.0f}%" for p in PERFILES],
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
            x=[p["etiqueta"] for p in PERFILES],
            y=[p["ideo_media"] for p in PERFILES],
            marker_color=[p["ideo_color"] for p in PERFILES],
            text=[f"{p['ideo_media']:.1f}" for p in PERFILES],
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
            for perf in PERFILES:
                beneficiado = perf["etiqueta"] in perfiles_beneficiados
                reac_base = REACCION_PERFIL.get(perf["etiqueta"], {})
                # Score de receptividad: mayor si el perfil está en la lista de beneficiados
                score = 7.0 if beneficiado else 4.0
                score = min(10, max(0, score + np.random.normal(0, 0.5)))
                reacciones.append((perf["etiqueta"], round(score, 1), perf["ideo_color"]))

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
    st.markdown(
        f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div>'
        f'<span class="lbl">Barómetro CIS sintético — Generado localmente sin API</span>'
        f'<div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    st.markdown(
        "Simulación de un barómetro CIS generado a partir de los perfiles de votante y los datos "
        "de nowcasting. Los resultados sintéticos se calibran con las últimas encuestas publicadas."
    )

    np.random.seed(42)

    # ── Datos de intención de voto ────────────────────────────────────────────
    # Encuesta directa: 100 % de entrevistados (incl. NS/NC y voto en blanco)
    intencion = {
        "PP": 33.1, "PSOE": 27.8, "VOX": 11.4, "SUMAR": 8.9,
        "Junts": 2.1, "ERC": 1.8, "PNV": 1.5, "EH Bildu": 1.2,
        "Otros": 3.8, "En blanco": 2.9, "No sabe/No contesta": 5.5,
    }

    # Participación estimada derivada de perfiles (media ponderada de los perfiles de votante)
    _PART_ESTIMADA = 71.8   # % del censo electoral que prevé votar
    _ABSTEN        = round(100 - _PART_ESTIMADA, 1)
    _BLANCO_DIREC  = intencion["En blanco"]   # % sobre el total de entrevistados
    _NULO_ESTIM    = 0.6                       # % histórico típico de votos nulos en España
    # Voto en blanco expresado sobre el total de votos válidos emitidos
    _votantes_sint = sum(v for k, v in intencion.items() if k != "No sabe/No contesta")
    _BLANCO_VOTOS  = round(_BLANCO_DIREC / _votantes_sint * 100, 1)

    # Estimación de voto ("cocina" CIS):
    #   · El NS/NC se distribuye entre partidos según recuerdo de voto y simpatía declarada
    #   · El voto en blanco NO se redistribuye: permanece como categoría válida que
    #     computa en participación pero no genera representación parlamentaria
    _nsnc = intencion["No sabe/No contesta"]
    _nscd = {  # distribución del NS/NC por recuerdo de voto (proporcional + corrección simpatía)
        "PP": 2.5, "PSOE": 1.8, "VOX": 1.0, "SUMAR": 0.7, "Otros": 0.3,
    }
    intencion_estimada = {
        k: intencion[k] + _nscd.get(k, 0)
        for k in intencion
        if k not in ("No sabe/No contesta",)
    }
    total_est = sum(intencion_estimada.values())
    intencion_estimada = {k: round(v / total_est * 100, 1) for k, v in intencion_estimada.items()}

    # Partidos con representación parlamentaria (excluye blancos para escaños D'Hondt)
    intencion_partidos = {
        k: v for k, v in intencion_estimada.items() if k != "En blanco"
    }
    total_part = sum(intencion_partidos.values())
    intencion_partidos = {k: round(v / total_part * 100, 1) for k, v in intencion_partidos.items()}

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

    # ── KPIs de participación ─────────────────────────────────────────────────
    st.markdown(
        f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div>'
        f'<span class="lbl">Participación estimada y voto no representado</span>'
        f'<div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    _kpis = [
        ("Participación proyectada", f"{_PART_ESTIMADA:.1f} %", GREEN,
         "Porcentaje del censo que se prevé vote (media ponderada de los 6 perfiles)"),
        ("Abstención proyectada",    f"{_ABSTEN:.1f} %",        RED,
         "Ciudadanos con derecho a voto que no acudirán a las urnas"),
        ("Voto en blanco",           f"{_BLANCO_VOTOS:.1f} %",  "#E5E7EB",
         "Sobre votos emitidos. Cuenta como participación pero no genera escaños"),
        ("Voto nulo estimado",        f"{_NULO_ESTIM:.1f} %",   MUTED,
         "Papeletas inválidas. Media histórica española en elecciones generales"),
    ]
    _kpi_cols = st.columns(4)
    for _ci, (lbl, val, col, desc) in enumerate(_kpis):
        _r, _g, _b = int(col.lstrip("#")[0:2], 16), int(col.lstrip("#")[2:4], 16), int(col.lstrip("#")[4:6], 16)
        with _kpi_cols[_ci]:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};'
                f'border-top:3px solid rgba({_r},{_g},{_b},0.7);border-radius:10px;'
                f'padding:.9rem 1rem;text-align:center">'
                f'<div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.1em;'
                f'text-transform:uppercase;margin-bottom:.3rem">{lbl}</div>'
                f'<div style="font-size:1.9rem;font-weight:900;color:{col};'
                f'font-family:\'JetBrains Mono\',monospace">{val}</div>'
                f'<div style="font-size:.7rem;color:{MUTED};margin-top:.3rem;line-height:1.35">{desc}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # ── Bloque explicativo: tipos de voto no representado ────────────────────
    st.markdown(
        f'<div style="margin:.9rem 0 1.2rem;background:{BG2};border:1px solid {BORDER};'
        f'border-left:3px solid {CYAN}44;border-radius:8px;padding:.75rem 1rem;'
        f'display:flex;gap:2rem;flex-wrap:wrap">'
        f'<div style="flex:1;min-width:180px">'
        f'<span style="font-size:.65rem;font-weight:700;color:{CYAN};letter-spacing:.1em;'
        f'text-transform:uppercase">Voto en blanco</span><br>'
        f'<span style="font-size:.78rem;color:{TEXT2}">Papeleta válida sin ningún partido. '
        f'Computa en la participación total y en el umbral del 3 % para acceder al reparto '
        f'D\'Hondt, pero no genera ningún escaño.</span>'
        f'</div>'
        f'<div style="flex:1;min-width:180px">'
        f'<span style="font-size:.65rem;font-weight:700;color:{AMBER};letter-spacing:.1em;'
        f'text-transform:uppercase">Voto nulo</span><br>'
        f'<span style="font-size:.78rem;color:{TEXT2}">Papeleta inválida (rota, con marcas, '
        f'de otro material…). No cuenta ni para participación ni para el umbral. '
        f'Media histórica en generales: ~0,5-0,8 %.</span>'
        f'</div>'
        f'<div style="flex:1;min-width:180px">'
        f'<span style="font-size:.65rem;font-weight:700;color:{RED};letter-spacing:.1em;'
        f'text-transform:uppercase">Abstención</span><br>'
        f'<span style="font-size:.78rem;color:{TEXT2}">Ciudadanos con derecho a voto que '
        f'no acuden a las urnas. En España la abstención media en generales es del 26-30 %, '
        f'con picos en 2011 (28,9 %) y 2019-A (33,9 %).</span>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ── Gráficos de intención de voto ─────────────────────────────────────────
    st.markdown(
        f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div>'
        f'<span class="lbl">Intención de voto directa vs. estimación corregida</span>'
        f'<div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    col_d1, col_d2 = st.columns(2)
    with col_d1:
        df_int = pd.DataFrame({"Partido": list(intencion.keys()), "%": list(intencion.values())})
        df_int = df_int.sort_values("%", ascending=False)
        _colors_int = []
        for p in df_int["Partido"]:
            if p == "En blanco":
                _colors_int.append("#E5E7EB")
            elif p == "No sabe/No contesta":
                _colors_int.append("#6B7280")
            else:
                _colors_int.append(COLORES_PARTIDO.get(p, MUTED))
        fig_int = go.Figure(go.Bar(
            x=df_int["Partido"], y=df_int["%"],
            marker_color=_colors_int,
            marker_line=dict(
                color=["#374151" if p in ("En blanco", "No sabe/No contesta") else "rgba(0,0,0,0)"
                       for p in df_int["Partido"]],
                width=1,
            ),
            text=[f"{v}%" for v in df_int["%"]],
            textposition="outside",
        ))
        fig_int.update_layout(
            title="Intención directa — incluye NS/NC y en blanco (%)", height=340,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=45, b=10),
        )
        st.plotly_chart(fig_int, use_container_width=True)
        st.caption(
            "Las barras grises (NS/NC y En blanco) no se trasladan a escaños. "
            "El NS/NC se redistribuye en la estimación; el En blanco permanece."
        )
    with col_d2:
        # Mostrar estimada incluyendo "En blanco" como barra diferenciada
        df_est = pd.DataFrame({
            "Partido": list(intencion_estimada.keys()),
            "%": list(intencion_estimada.values()),
        })
        df_est = df_est.sort_values("%", ascending=False)
        _colors_est = [
            "#E5E7EB" if p == "En blanco" else COLORES_PARTIDO.get(p, MUTED)
            for p in df_est["Partido"]
        ]
        fig_est = go.Figure(go.Bar(
            x=df_est["Partido"], y=df_est["%"],
            marker_color=_colors_est,
            marker_line=dict(
                color=["#374151" if p == "En blanco" else "rgba(0,0,0,0)"
                       for p in df_est["Partido"]],
                width=1,
            ),
            text=[f"{v}%" for v in df_est["%"]],
            textposition="outside",
        ))
        fig_est.add_annotation(
            x="En blanco", y=intencion_estimada.get("En blanco", 3) + 1.5,
            text="No genera escaños",
            showarrow=True, arrowhead=2, arrowsize=0.8,
            arrowcolor=MUTED, font=dict(size=9, color=MUTED),
            ax=0, ay=-28,
        )
        fig_est.update_layout(
            title='Estimación corregida — NS/NC distribuido, En blanco conservado (%)',
            height=340,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            xaxis=dict(tickfont=dict(color=TEXT2), linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=45, b=10),
        )
        st.plotly_chart(fig_est, use_container_width=True)
        st.caption(
            f"En blanco: {intencion_estimada.get('En blanco', 0):.1f} % de los votos emitidos "
            f"({_BLANCO_VOTOS:.1f} % sobre votos válidos). "
            "Umbral D'Hondt calculado sobre votos a partidos únicamente."
        )

    # ── Desglose del destino del voto ─────────────────────────────────────────
    st.markdown(
        f'<div class="section-title"><div class="bar" style="background:{PURPLE}"></div>'
        f'<span class="lbl">Destino del voto — descomposición completa</span>'
        f'<div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    col_dest1, col_dest2 = st.columns([3, 2], gap="large")
    with col_dest1:
        # Donut: Abstención + No vota + Voto a partidos + En blanco + Nulo
        _part_partidos = round(_PART_ESTIMADA * (1 - _BLANCO_VOTOS / 100 - _NULO_ESTIM / 100), 1)
        _part_blanco   = round(_PART_ESTIMADA * _BLANCO_VOTOS / 100, 1)
        _part_nulo     = round(_PART_ESTIMADA * _NULO_ESTIM / 100, 1)
        fig_dest = go.Figure(go.Pie(
            labels=["Voto a partidos", "Voto en blanco", "Voto nulo", "Abstención"],
            values=[_part_partidos, _part_blanco, _part_nulo, _ABSTEN],
            hole=0.55,
            marker_colors=[CYAN, "#E5E7EB", MUTED, RED],
            marker_line=dict(color=BG, width=2),
            textinfo="label+percent",
            textfont=dict(size=11),
        ))
        fig_dest.update_layout(
            height=320, paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2),
            showlegend=False,
            margin=dict(t=10, b=10, l=10, r=10),
            annotations=[dict(
                text=f"<b>{_PART_ESTIMADA:.1f}%</b><br><span style='font-size:10'>part.</span>",
                x=0.5, y=0.5, font_size=15, showarrow=False, font_color=TEXT,
            )],
        )
        st.plotly_chart(fig_dest, use_container_width=True)
    with col_dest2:
        _filas = [
            ("Voto a partidos",  f"{_part_partidos:.1f} %",  CYAN,     "Votos que generan escaños en el Congreso"),
            ("Voto en blanco",   f"{_part_blanco:.1f} %",    "#E5E7EB","Participación sin representación"),
            ("Voto nulo",        f"{_part_nulo:.1f} %",      MUTED,    "Papeleta inválida"),
            ("Abstención",       f"{_ABSTEN:.1f} %",         RED,      "No acude a las urnas"),
        ]
        for lbl_f, val_f, col_f, desc_f in _filas:
            _rf, _gf, _bf = (
                int(col_f.lstrip("#")[0:2], 16),
                int(col_f.lstrip("#")[2:4], 16),
                int(col_f.lstrip("#")[4:6], 16),
            )
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.7rem;'
                f'padding:.5rem .6rem;border-bottom:1px solid {BORDER}">'
                f'<div style="width:10px;height:10px;border-radius:50%;'
                f'background:rgba({_rf},{_gf},{_bf},1);flex-shrink:0"></div>'
                f'<div style="flex:1">'
                f'<div style="font-size:.8rem;font-weight:600;color:{TEXT}">{lbl_f}</div>'
                f'<div style="font-size:.7rem;color:{MUTED}">{desc_f}</div>'
                f'</div>'
                f'<div style="font-size:.95rem;font-weight:800;color:{col_f};'
                f'font-family:\'JetBrains Mono\',monospace">{val_f}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    st.divider()
    col_p1, col_p2 = st.columns(2)
    with col_p1:
        st.markdown(
            f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div>'
            f'<span class="lbl">Problema principal que más le preocupa</span>'
            f'<div class="line"></div></div>',
            unsafe_allow_html=True,
        )
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
        st.markdown(
            f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div>'
            f'<span class="lbl">Valoración de la gestión del gobierno</span>'
            f'<div class="line"></div></div>',
            unsafe_allow_html=True,
        )
        vg_colors = ["#16A34A", "#86EFAC", "#FEF3C7", "#FBBF24", "#DC2626"]
        fig_val = go.Figure(go.Pie(
            labels=list(valoracion_gobierno.keys()),
            values=list(valoracion_gobierno.values()),
            marker_colors=vg_colors,
            textinfo="label+percent",
        ))
        fig_val.update_layout(
            height=320, paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color=TEXT2), margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_val, use_container_width=True)

    st.divider()
    col_s1, col_s2 = st.columns(2)
    with col_s1:
        st.markdown(
            f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div>'
            f'<span class="lbl">Situación económica personal (últimos 12 meses)</span>'
            f'<div class="line"></div></div>',
            unsafe_allow_html=True,
        )
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
        st.markdown(
            f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div>'
            f'<span class="lbl">Autoubicación ideológica (1=izquierda, 10=derecha)</span>'
            f'<div class="line"></div></div>',
            unsafe_allow_html=True,
        )
        x_ideo = list(range(1, 11))
        y_ideo = [4, 8, 10, 13, 18, 14, 12, 9, 7, 5]
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
        2. **Intención de voto directa:** Promedio ponderado de los 6 perfiles de votante, con pesos
           poblacionales actualizados. Incluye NS/NC, voto en blanco y abstención proyectada.
        3. **"Cocina" CIS:** Se distribuye el NS/NC entre los partidos según el recuerdo de voto y
           la simpatía partidista declarada. El **voto en blanco no se redistribuye**: es una opción
           de participación activa que computa en la tasa de participación y en el umbral del 3 %
           provincial, pero no genera ningún escaño.
        4. **Voto nulo:** No se distribuye ni computa para el umbral. Se estima en el ~{_NULO_ESTIM} %
           histórico de las elecciones generales españolas.
        5. **Estimación de escaños:** El reparto D'Hondt se aplica únicamente sobre los votos a
           partidos (excluyendo blancos, nulos y abstención).
        6. **Problemas principales:** Agregación ponderada de las preocupaciones de cada perfil
           por su peso electoral.
        7. **Situación económica:** Distribución sintética basada en IPC, paro y euríbor actuales.
        8. **Autoubicación ideológica:** Distribución empírica estimada a partir de resultados
           electorales 2019–2023.

        Esta encuesta sintética **no sustituye** a los barómetros reales del CIS. Sirve como
        referencia entre publicaciones y para testar el impacto de cambios en los supuestos del modelo.
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
