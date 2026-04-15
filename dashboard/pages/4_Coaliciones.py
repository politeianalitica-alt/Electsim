"""
Página: Análisis de Coaliciones — Dark Tech v2

Configuraciones parlamentarias viables, motivaciones de cada partido
y matriz de compatibilidad entre formaciones.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav, COLORES_PARTIDOS,
    BG, BG2, BG3, BORDER,
    CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)
from dashboard.db import cargar_nowcasting

# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Coaliciones — ElectSim", layout="wide")
sidebar_nav()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _color(siglas: str) -> str:
    return COLORES_PARTIDOS.get(siglas, COLORES_PARTIDOS.get(siglas.upper(), CYAN))


def _section_header(label: str, color: str):
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:.7rem;margin:1.2rem 0 .8rem">
        <div style="width:4px;height:20px;background:linear-gradient({color},{BLUE});border-radius:2px"></div>
        <span style="font-size:.72rem;font-weight:700;color:{color};
                     letter-spacing:.15em;text-transform:uppercase">{label}</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG})"></div>
    </div>
    """, unsafe_allow_html=True)


def _pill(label: str, color: str) -> str:
    return (
        f'<span style="background:{color}15;border:1px solid {color}44;color:{color};'
        f'padding:.2rem .5rem;border-radius:6px;font-size:.65rem;font-weight:700;'
        f'font-family:\'JetBrains Mono\',monospace;display:inline-block;margin:.1rem .15rem">'
        f'{label}</span>'
    )


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

@keyframes fadeInUp {{
  from {{ opacity: 0; transform: translateY(16px); }}
  to   {{ opacity: 1; transform: translateY(0); }}
}}
@keyframes pulseGlow {{
  0%, 100% {{ box-shadow: 0 0 0 0 rgba(0,212,255,0); }}
  50%       {{ box-shadow: 0 0 12px 3px rgba(0,212,255,0.18); }}
}}
@keyframes gradientMove {{
  0%   {{ background-position: 0% 50%; }}
  50%  {{ background-position: 100% 50%; }}
  100% {{ background-position: 0% 50%; }}
}}

.coal-animate {{ animation: fadeInUp .5s ease-out both; }}

.coal-card {{
  background: linear-gradient(135deg, {BG2}ee, {BG3}cc);
  border: 1px solid {BORDER};
  border-radius: 12px;
  transition: all .25s ease;
  padding: 1rem 1.2rem;
  margin-bottom: .8rem;
}}
.coal-card:hover {{
  border-color: {CYAN}55;
  box-shadow: 0 4px 20px rgba(0,212,255,0.08);
  transform: translateY(-1px);
}}

.pill-item {{
  display: inline-block;
  padding: .2rem .5rem;
  border-radius: 6px;
  font-size: .65rem;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  margin: .1rem .15rem;
}}

.kpi-card {{
  background: linear-gradient(135deg, {BG2}ee, {BG3}cc);
  border: 1px solid {BORDER};
  border-radius: 12px;
  padding: 1rem 1.2rem;
  text-align: center;
  transition: all .25s ease;
}}
.kpi-card:hover {{
  border-color: {CYAN}55;
  box-shadow: 0 4px 20px rgba(0,212,255,0.08);
  transform: translateY(-1px);
}}

.info-box {{
  background: {CYAN}0d;
  border: 1px solid {CYAN}33;
  border-left: 3px solid {CYAN};
  border-radius: 0 8px 8px 0;
  padding: .8rem 1rem;
  color: {TEXT2};
  font-size: .82rem;
  line-height: 1.55;
  margin: .5rem 0;
}}

.progress-track {{
  background: {BORDER};
  border-radius: 4px;
  height: 6px;
  overflow: hidden;
  margin-top: .35rem;
}}
</style>
""", unsafe_allow_html=True)


# ── Datos ─────────────────────────────────────────────────────────────────────

MOTIVACIONES = {
    "PP": {
        "nombre": "Partido Popular",
        "lider": "Alberto Núñez Feijóo",
        "color": _color("PP"),
        "bloque": "derecha",
        "objetivo": "Llegar a La Moncloa con estabilidad presupuestaria y mayoría sólida",
        "lineas_rojas": [
            "Amnistía a independentistas",
            "Plurinacionalidad constitucional",
            "Derogación de la reforma laboral de 2021",
            "Cualquier acuerdo que debilite la unidad territorial",
        ],
        "concesiones": [
            "Bajada conjunta de impuestos sobre la renta",
            "Refuerzo del gasto en defensa y seguridad",
            "Política migratoria más restrictiva",
            "Reforma del sistema de financiación autonómica",
        ],
        "socios_preferentes": ["VOX (si es necesario)", "CC", "PRC", "UPN", "Foro Asturias"],
        "socios_vetados": ["ERC", "EH Bildu", "Junts en cuestiones constitucionales", "CUP"],
        "precio_coalicion": "Vicepresidencia + Ministerios de Economía e Interior + agenda propia en seguridad",
        "estrategia": "Máxima exigencia inicial, cede en temas simbólicos pero no en sustantivos. Prefiere gobernar en solitario con apoyos puntuales.",
        "fortaleza": 85,
    },
    "PSOE": {
        "nombre": "Partido Socialista Obrero Español",
        "lider": "Pedro Sánchez",
        "color": _color("PSOE"),
        "bloque": "izquierda",
        "objetivo": "Revalidar el gobierno preservando la coalición progresista más el apoyo nacionalista",
        "lineas_rojas": [
            "Recortes en gasto social o en el Estado del bienestar",
            "Reversión de derechos civiles (matrimonio igualitario, aborto, eutanasia)",
            "Cualquier gobierno con VOX",
        ],
        "concesiones": [
            "Mayor autonomía fiscal a las CCAA (concierto ampliado)",
            "Política lingüística más flexible en Cataluña",
            "Reforma del sistema de financiación autonómica",
            "Transferencias de competencias pendientes",
        ],
        "socios_preferentes": ["SUMAR", "PNV", "Junts (transaccional)", "ERC", "EH Bildu", "BNG"],
        "socios_vetados": ["VOX en cualquier caso"],
        "precio_coalicion": "Ministerios clave para socios, concesiones territoriales graduales, agenda social compartida",
        "estrategia": "Pragmatismo extremo, gestión de las contradicciones internas de la coalición. Cada acuerdo se negocia caso a caso.",
        "fortaleza": 80,
    },
    "VOX": {
        "nombre": "VOX",
        "lider": "Santiago Abascal",
        "color": _color("VOX"),
        "bloque": "derecha radical",
        "objetivo": "Entrar en el gobierno, marcar la agenda cultural y migratoria",
        "lineas_rojas": [
            "Cualquier política de género o identitaria",
            "Amnistía o beneficios a independentistas",
            "Más autonomía territorial para las CCAA",
            "Agenda climática o impuestos ecológicos",
        ],
        "concesiones": [
            "Apoyar presupuestos a cambio de política migratoria restrictiva",
            "Derogación de leyes de violencia de género y memoria democrática",
            "Políticas de seguridad y orden público",
        ],
        "socios_preferentes": ["PP (única opción viable)"],
        "socios_vetados": ["Todos los demás — incompatibilidad ideológica total"],
        "precio_coalicion": "Ministerio del Interior + Vicepresidencia + control de fronteras + derogación de leyes identitarias",
        "estrategia": "Presión máxima en temas migratorio y cultural. No ceden en identidad. Prefieren la oposición dura a un acuerdo sin contenido.",
        "fortaleza": 60,
    },
    "SUMAR": {
        "nombre": "SUMAR",
        "lider": "Yolanda Díaz",
        "color": _color("SUMAR"),
        "bloque": "izquierda",
        "objetivo": "Mantener carteras sociales y laborales, avanzar en derechos y transición ecológica",
        "lineas_rojas": [
            "Recortes en prestaciones sociales o derechos laborales",
            "Privatizaciones de servicios públicos",
            "Reforma laboral regresiva",
            "Gasto excesivo en defensa",
        ],
        "concesiones": [
            "Flexibilidad en política exterior si hay contraprestaciones sociales",
            "Apoyar la agenda del PSOE en temas no nucleares",
        ],
        "socios_preferentes": ["PSOE", "EH Bildu en temas sociales"],
        "socios_vetados": ["PP", "VOX", "cualquier gobierno de derecha"],
        "precio_coalicion": "Vicepresidencia Social + Ministerio de Trabajo + Ministerio de Vivienda + agenda verde",
        "estrategia": "Negociación desde la izquierda del PSOE. Su debilidad es la fragmentación interna.",
        "fortaleza": 55,
    },
    "PNV": {
        "nombre": "Partido Nacionalista Vasco",
        "lider": "Andoni Ortuzar",
        "color": _color("PNV"),
        "bloque": "nacionalismo vasco moderado",
        "objetivo": "Ampliar el cupo vasco, transferencias pendientes, autogobierno máximo",
        "lineas_rojas": [
            "Recentralización de competencias",
            "Intervención del gobierno en la política autonómica vasca",
            "Cualquier medida que afecte al concierto económico",
        ],
        "concesiones": [
            "Apoyo estable a la investidura a cambio de transferencias concretas",
            "Son un socio muy fiable una vez cerrado el acuerdo",
        ],
        "socios_preferentes": ["PSOE (socio histórico)", "PP (si ofrece más autonomía)"],
        "socios_vetados": ["VOX", "EH Bildu en coalición nacional"],
        "precio_coalicion": "Concierto ampliado + transferencias de Seguridad Social + inversiones en el País Vasco",
        "estrategia": "Extremadamente precisos en sus demandas. Muy fiables como socios una vez firmado el acuerdo.",
        "fortaleza": 78,
    },
    "Junts": {
        "nombre": "Junts per Catalunya",
        "lider": "Carles Puigdemont",
        "color": _color("JUNTS"),
        "bloque": "independentismo catalán",
        "objetivo": "Amnistía plena, autodeterminación, retorno de Puigdemont sin consecuencias",
        "lineas_rojas": [
            "Amnistía parcial o con condiciones",
            "Sin negociación explícita sobre autodeterminación",
            "Recentralización o ataque al autogobierno catalán",
        ],
        "concesiones": [
            "Apoyo puntual a presupuestos a cambio de avances concretos y verificables",
        ],
        "socios_preferentes": ["PSOE (relación transaccional)"],
        "socios_vetados": ["PP", "VOX"],
        "precio_coalicion": "Amnistía plena + referéndum o consulta pactada + financiación singular para Cataluña",
        "estrategia": "Máxima exigencia. Retirada de apoyo ante cualquier incumplimiento percibido. El socio más volátil del arco parlamentario.",
        "fortaleza": 72,
    },
    "ERC": {
        "nombre": "Esquerra Republicana de Catalunya",
        "lider": "Oriol Junqueras",
        "color": _color("ERC"),
        "bloque": "independentismo catalán",
        "objetivo": "Diálogo permanente, financiación singular, avance gradual hacia la independencia",
        "lineas_rojas": [
            "Represión policial o judicial del activismo independentista",
            "Sin avances verificables en autogobierno",
        ],
        "concesiones": [
            "Más flexible que Junts en plazos y formas",
            "Acepta avances graduales si son reales",
        ],
        "socios_preferentes": ["PSOE"],
        "socios_vetados": ["PP", "VOX"],
        "precio_coalicion": "Mesa de negociación activa + financiación singular + inversiones en Cataluña",
        "estrategia": "Más pragmática que Junts. Su debilidad es la competencia con Junts por el electorado independentista.",
        "fortaleza": 65,
    },
    "EH Bildu": {
        "nombre": "EH Bildu",
        "lider": "Arnaldo Otegi (portavoz)",
        "color": _color("EH Bildu"),
        "bloque": "izquierda abertzale",
        "objetivo": "Políticas sociales, acercamiento de presos de ETA, ampliación del autogobierno vasco",
        "lineas_rojas": [
            "Militarismo o política de defensa agresiva",
            "Recortes en derechos sociales o laborales",
        ],
        "concesiones": [
            "Apoyo a presupuestos con fuerte contenido social",
            "Transversalidad en temas de bienestar",
        ],
        "socios_preferentes": ["PSOE + SUMAR (coalición progresista)"],
        "socios_vetados": ["VOX", "PP en gobiernos de derecha"],
        "precio_coalicion": "Acercamiento de presos + más competencias autonómicas + políticas de vivienda",
        "estrategia": "Transversal en lo social, firme en lo identitario. Han moderado su imagen electoral.",
        "fortaleza": 62,
    },
}

COMPATIBILIDAD = {
    ("PP",       "VOX"):      +1,
    ("PP",       "PSOE"):     -1,
    ("PP",       "SUMAR"):    -2,
    ("PP",       "PNV"):      +1,
    ("PP",       "Junts"):    -2,
    ("PP",       "ERC"):      -2,
    ("PP",       "EH Bildu"): -2,
    ("PSOE",     "SUMAR"):    +2,
    ("PSOE",     "PNV"):      +2,
    ("PSOE",     "Junts"):     0,
    ("PSOE",     "ERC"):      +1,
    ("PSOE",     "EH Bildu"): +1,
    ("PSOE",     "VOX"):      -2,
    ("SUMAR",    "EH Bildu"): +2,
    ("SUMAR",    "ERC"):      +1,
    ("SUMAR",    "PNV"):       0,
    ("SUMAR",    "VOX"):      -2,
    ("SUMAR",    "Junts"):     0,
    ("VOX",      "PNV"):      -2,
    ("VOX",      "Junts"):    -2,
    ("VOX",      "ERC"):      -2,
    ("VOX",      "EH Bildu"): -2,
    ("PNV",      "EH Bildu"): -1,
    ("PNV",      "ERC"):       0,
    ("PNV",      "Junts"):     0,
    ("Junts",    "ERC"):      +1,
    ("Junts",    "EH Bildu"):  0,
    ("ERC",      "EH Bildu"): +1,
}

ESCENARIOS = [
    {
        "nombre": "Gobierno PP con apoyo de VOX",
        "partidos": ["PP", "VOX"],
        "escanos_est": 171, "prob": 38, "color": _color("PP"),
        "tipo": "Mayoría simple con apoyos",
        "desc": "Gobierno PP en solitario con apoyo externo de VOX en votaciones clave. PP intentaría evitar una coalición formal.",
        "condicion": "PP necesita ~140+ escaños y VOX obtiene 30+",
    },
    {
        "nombre": "Mayoría progresista ampliada",
        "partidos": ["PSOE", "SUMAR", "PNV", "ERC", "EH Bildu"],
        "escanos_est": 178, "prob": 29, "color": _color("PSOE"),
        "tipo": "Mayoría absoluta multipartidista",
        "desc": "Renovación del gobierno actual con acuerdos reforzados con PNV, ERC y EH Bildu.",
        "condicion": "PSOE+SUMAR necesitan ~155 escaños + apoyos nacionalistas",
    },
    {
        "nombre": "Bloqueo / elecciones repetidas",
        "partidos": [],
        "escanos_est": 0, "prob": 18, "color": MUTED,
        "tipo": "Sin mayoría viable",
        "desc": "España repite elecciones tras fallo de investidura (ocurrió en 2015-16 y 2019).",
        "condicion": "Ni PP ni PSOE alcanza 176 escaños con socios viables",
    },
    {
        "nombre": "PP con PNV y CC",
        "partidos": ["PP", "PNV", "CC"],
        "escanos_est": 176, "prob": 8, "color": "#336699",
        "tipo": "Mayoría ajustada",
        "desc": "Gobierno de centroderecha con socios nacionalistas moderados. Requiere concesiones al PNV en el cupo vasco.",
        "condicion": "PP necesita ~165 escaños y VOX queda fuera de la mayoría",
    },
    {
        "nombre": "Gran coalición PP-PSOE",
        "partidos": ["PP", "PSOE"],
        "escanos_est": 255, "prob": 7, "color": "#6B7280",
        "tipo": "Mayoría absoluta amplia",
        "desc": "Escenario extremo. Ambos partidos lo rechazan públicamente pero no es imposible ante una crisis institucional.",
        "condicion": "Crisis sistémica grave o necesidad de reforma constitucional",
    },
]


# ── Animated header ───────────────────────────────────────────────────────────
st.markdown(f"""
<div class="coal-animate" style="
    background:linear-gradient(135deg,{BG2} 0%,#0a1628 50%,{BG3} 100%);
    border:1px solid {BORDER};border-radius:16px;
    padding:2rem 2.5rem;margin-bottom:1.5rem;
    position:relative;overflow:hidden">
    <div style="position:absolute;top:-50px;right:-30px;width:200px;height:200px;
                background:radial-gradient(circle,{PURPLE}10,transparent 70%);pointer-events:none"></div>
    <div style="position:absolute;bottom:-40px;left:15%;width:160px;height:160px;
                background:radial-gradient(circle,{CYAN}08,transparent 70%);pointer-events:none"></div>
    <div style="display:flex;align-items:center;gap:1rem">
        <div style="width:44px;height:44px;background:linear-gradient(135deg,{PURPLE},{CYAN});
                    border-radius:12px;display:flex;align-items:center;justify-content:center;
                    font-size:1.1rem;flex-shrink:0;box-shadow:0 4px 16px {PURPLE}33">&#9878;</div>
        <div>
            <div style="font-size:1.6rem;font-weight:900;color:{TEXT};letter-spacing:-.03em">
                Análisis de Coaliciones
            </div>
            <div style="font-size:.78rem;color:{TEXT2};margin-top:.15rem">
                Configuraciones parlamentarias viables &mdash; Motivaciones por partido &mdash; Matriz de compatibilidad
            </div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)


# ── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs([
    "Escenarios de Coalición",
    "Motivaciones por Partido",
    "Matriz de Compatibilidad",
])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — Escenarios de Coalición
# ═══════════════════════════════════════════════════════════════════════════════
with tab1:

    # ── KPI row ───────────────────────────────────────────────────────────────
    total_esc = len(ESCENARIOS)
    prob_derecha  = sum(e["prob"] for e in ESCENARIOS if "PP" in e["partidos"] and "PSOE" not in e["partidos"])
    prob_izq      = sum(e["prob"] for e in ESCENARIOS if "PSOE" in e["partidos"])
    prob_bloqueo  = next((e["prob"] for e in ESCENARIOS if not e["partidos"]), 0)

    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    with kpi_col1:
        st.markdown(f"""
        <div class="kpi-card coal-animate" style="border-top:3px solid {CYAN};animation-delay:.00s">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.3rem">Escenarios</div>
            <div style="font-size:2.2rem;font-weight:900;color:{CYAN};
                        font-family:'JetBrains Mono',monospace;line-height:1">{total_esc}</div>
            <div style="font-size:.65rem;color:{TEXT2};margin-top:.2rem">configuraciones viables</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_col2:
        r, g, b = _hex_to_rgb(_color("PP"))
        st.markdown(f"""
        <div class="kpi-card coal-animate" style="border-top:3px solid {_color('PP')};animation-delay:.08s">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.3rem">Bloque Derecha</div>
            <div style="font-size:2.2rem;font-weight:900;
                        color:{_color('PP')};font-family:'JetBrains Mono',monospace;line-height:1;
                        text-shadow:0 0 20px rgba({r},{g},{b},0.3)">{prob_derecha}%</div>
            <div style="font-size:.65rem;color:{TEXT2};margin-top:.2rem">prob. acumulada PP-liderado</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_col3:
        r2, g2, b2 = _hex_to_rgb(_color("PSOE"))
        st.markdown(f"""
        <div class="kpi-card coal-animate" style="border-top:3px solid {_color('PSOE')};animation-delay:.16s">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.3rem">Bloque Izquierda</div>
            <div style="font-size:2.2rem;font-weight:900;
                        color:{_color('PSOE')};font-family:'JetBrains Mono',monospace;line-height:1;
                        text-shadow:0 0 20px rgba({r2},{g2},{b2},0.3)">{prob_izq}%</div>
            <div style="font-size:.65rem;color:{TEXT2};margin-top:.2rem">prob. acumulada PSOE-liderado</div>
        </div>
        """, unsafe_allow_html=True)
    with kpi_col4:
        st.markdown(f"""
        <div class="kpi-card coal-animate" style="border-top:3px solid {AMBER};animation-delay:.24s">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.3rem">Bloqueo</div>
            <div style="font-size:2.2rem;font-weight:900;color:{AMBER};
                        font-family:'JetBrains Mono',monospace;line-height:1">{prob_bloqueo}%</div>
            <div style="font-size:.65rem;color:{TEXT2};margin-top:.2rem">prob. elecciones repetidas</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)

    # ── Nowcasting pill strip ─────────────────────────────────────────────────
    df_nc = cargar_nowcasting()
    if not df_nc.empty and "estimacion_pct" in df_nc.columns:
        _section_header("Estimación Actual de Voto", CYAN)
        pills_html = '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem">'
        for _, row in df_nc.head(8).iterrows():
            p = row["partido_siglas"]
            col = _color(p)
            pct = row["estimacion_pct"]
            pills_html += (
                f'<div style="background:{col}15;border:1px solid {col}44;'
                f'border-radius:8px;padding:.35rem .7rem;text-align:center;min-width:70px">'
                f'<div style="font-size:.6rem;font-weight:700;color:{col};'
                f'letter-spacing:.08em;text-transform:uppercase">{p}</div>'
                f'<div style="font-size:1.1rem;font-weight:900;color:{col};'
                f'font-family:\'JetBrains Mono\',monospace;line-height:1.2">{pct:.1f}%</div>'
                f'</div>'
            )
        pills_html += "</div>"
        st.markdown(pills_html, unsafe_allow_html=True)

    # ── Scenario cards ────────────────────────────────────────────────────────
    _section_header("Configuraciones más probables", PURPLE)

    for i, esc in enumerate(ESCENARIOS):
        col = esc["color"]
        prob = esc["prob"]
        prob_color = GREEN if prob >= 30 else (AMBER if prob >= 15 else MUTED)
        party_pills = "".join(_pill(p, _color(p)) for p in esc["partidos"]) if esc["partidos"] else _pill("Sin coalición", MUTED)

        st.markdown(f"""
        <div class="coal-card coal-animate" style="border-left:3px solid {col};animation-delay:{i*0.07:.2f}s">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.6rem">
                <div>
                    <div style="font-size:1rem;font-weight:800;color:{TEXT};letter-spacing:-.01em">
                        {esc['nombre']}
                    </div>
                    <div style="font-size:.68rem;color:{TEXT2};margin-top:.1rem">{esc['tipo']} &nbsp;·&nbsp; {esc['escanos_est']} / 350 escaños est.</div>
                </div>
                <div style="background:{prob_color}18;border:1px solid {prob_color}44;
                            border-radius:8px;padding:.3rem .7rem;text-align:center;flex-shrink:0">
                    <div style="font-size:1.4rem;font-weight:900;color:{prob_color};
                                font-family:'JetBrains Mono',monospace;line-height:1">{prob}%</div>
                    <div style="font-size:.55rem;color:{MUTED};text-transform:uppercase;letter-spacing:.08em">prob.</div>
                </div>
            </div>
            <div style="margin-bottom:.55rem">{party_pills}</div>
            <div style="margin-bottom:.45rem">
                <div style="display:flex;justify-content:space-between;font-size:.62rem;
                            color:{MUTED};margin-bottom:.2rem">
                    <span>Probabilidad</span><span style="color:{prob_color};font-weight:700">{prob}%</span>
                </div>
                <div class="progress-track">
                    <div style="width:{prob}%;height:100%;
                                background:linear-gradient(90deg,{prob_color},{prob_color}99);
                                border-radius:4px;transition:width .6s ease"></div>
                </div>
            </div>
            <div style="font-size:.7rem;color:{MUTED};font-style:italic">{esc['condicion']}</div>
        </div>
        """, unsafe_allow_html=True)

        with st.expander(f"Descripción detallada — {esc['nombre']}", expanded=False):
            st.markdown(f"<span style='color:{TEXT2};font-size:.82rem'>{esc['desc']}</span>", unsafe_allow_html=True)

    # ── Horizontal bar chart ──────────────────────────────────────────────────
    _section_header("Comparativa de probabilidades", CYAN)

    nombres  = [e["nombre"][:45] + ("…" if len(e["nombre"]) > 45 else "") for e in ESCENARIOS]
    probs    = [e["prob"] for e in ESCENARIOS]
    colors_b = [e["color"] for e in ESCENARIOS]

    fig_bar = go.Figure(go.Bar(
        y=nombres, x=probs, orientation="h",
        marker=dict(
            color=colors_b,
            line=dict(width=0),
        ),
        text=[f"{p}%" for p in probs],
        textposition="outside",
        textfont=dict(color=TEXT2, size=11, family="JetBrains Mono, monospace"),
        hoverlabel=dict(
            bgcolor=BG2,
            font=dict(size=11, family="JetBrains Mono, monospace"),
            bordercolor=BORDER,
        ),
        hovertemplate="<b>%{y}</b><br>Probabilidad: %{x}%<extra></extra>",
    ))
    fig_bar.update_layout(
        height=280,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(
            title="Probabilidad (%)",
            range=[0, 55],
            tickfont=dict(color=MUTED, size=9),
            gridcolor="rgba(30,41,59,0.5)",
            title_font=dict(color=TEXT2, size=10),
        ),
        yaxis=dict(
            tickfont=dict(color=TEXT2, size=10),
            gridcolor="rgba(0,0,0,0)",
        ),
        margin=dict(t=10, b=20, l=10, r=50),
        font=dict(color=TEXT),
    )
    st.plotly_chart(fig_bar, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — Motivaciones por Partido
# ═══════════════════════════════════════════════════════════════════════════════
with tab2:
    _section_header("¿Qué busca cada partido en la negociación?", CYAN)

    partido_sel = st.selectbox(
        "Seleccionar partido",
        list(MOTIVACIONES.keys()),
        format_func=lambda k: f"{k}  —  {MOTIVACIONES[k]['nombre']}",
    )
    m = MOTIVACIONES[partido_sel]
    mc = m["color"]
    mr, mg, mb = _hex_to_rgb(mc)

    # ── Party header card ─────────────────────────────────────────────────────
    st.markdown(f"""
    <div class="coal-card coal-animate" style="border-top:3px solid {mc};margin-bottom:1rem">
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:.8rem">
            <div style="width:10px;height:52px;background:linear-gradient({mc},{mc}55);
                        border-radius:3px;flex-shrink:0"></div>
            <div>
                <div style="font-size:1.25rem;font-weight:900;color:{TEXT};
                            letter-spacing:-.02em;text-shadow:0 0 24px rgba({mr},{mg},{mb},0.25)">
                    {m['nombre']}
                </div>
                <div style="font-size:.75rem;color:{TEXT2};margin-top:.15rem">
                    Líder: <span style="color:{mc};font-weight:600">{m['lider']}</span>
                    &nbsp;·&nbsp; Bloque: <span style="color:{TEXT}">{m['bloque']}</span>
                </div>
            </div>
        </div>
        <div style="background:{mc}0d;border:1px solid {mc}22;border-radius:8px;
                    padding:.75rem 1rem;font-size:.8rem;color:{TEXT2};line-height:1.55">
            <span style="color:{mc};font-weight:700;font-size:.65rem;text-transform:uppercase;
                         letter-spacing:.1em">Objetivo principal &nbsp;</span>
            {m['objetivo']}
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ── Main two columns: red lines + concessions ────────────────────────────
    col_l, col_r = st.columns(2)

    with col_l:
        _section_header("Líneas rojas (no negociables)", RED)
        lr_items = "".join(
            f'<div style="display:flex;gap:.5rem;align-items:flex-start;'
            f'margin-bottom:.4rem;font-size:.78rem;color:{TEXT2}">'
            f'<span style="color:{RED};font-weight:700;flex-shrink:0">✗</span>'
            f'<span>{lr}</span></div>'
            for lr in m["lineas_rojas"]
        )
        st.markdown(f"""
        <div class="coal-card" style="border-left:3px solid {RED}55;padding:.9rem 1rem">
            {lr_items}
        </div>
        """, unsafe_allow_html=True)

        _section_header("Socios vetados", RED)
        veto_pills = "".join(_pill(sv, RED) for sv in m["socios_vetados"])
        st.markdown(f"<div style='margin-bottom:.5rem'>{veto_pills}</div>", unsafe_allow_html=True)

    with col_r:
        _section_header("Concesiones posibles", GREEN)
        con_items = "".join(
            f'<div style="display:flex;gap:.5rem;align-items:flex-start;'
            f'margin-bottom:.4rem;font-size:.78rem;color:{TEXT2}">'
            f'<span style="color:{GREEN};font-weight:700;flex-shrink:0">✓</span>'
            f'<span>{c}</span></div>'
            for c in m["concesiones"]
        )
        st.markdown(f"""
        <div class="coal-card" style="border-left:3px solid {GREEN}55;padding:.9rem 1rem">
            {con_items}
        </div>
        """, unsafe_allow_html=True)

        _section_header("Socios preferentes", GREEN)
        pref_pills = "".join(_pill(sp, GREEN) for sp in m["socios_preferentes"])
        st.markdown(f"<div style='margin-bottom:.5rem'>{pref_pills}</div>", unsafe_allow_html=True)

    # ── Precio de coalición ───────────────────────────────────────────────────
    _section_header("Precio de coalición", AMBER)
    st.markdown(f"""
    <div class="info-box" style="border-color:{AMBER}33;border-left-color:{AMBER};
                background:{AMBER}0d">
        <span style="color:{AMBER};font-weight:700;font-size:.65rem;text-transform:uppercase;
                     letter-spacing:.1em">Demandas clave &nbsp;</span><br>
        <span style="color:{TEXT};font-size:.82rem">{m['precio_coalicion']}</span>
    </div>
    """, unsafe_allow_html=True)

    # ── Estrategia negociadora ────────────────────────────────────────────────
    _section_header("Estrategia negociadora", CYAN)
    st.markdown(f"""
    <div style="font-size:.82rem;color:{TEXT2};line-height:1.65;
                padding:.6rem 0 .6rem .2rem;border-left:2px solid {CYAN}33;
                padding-left:.9rem;margin-bottom:.5rem">
        {m['estrategia']}
    </div>
    """, unsafe_allow_html=True)

    # ── Fortaleza negociadora — big number + progress bar ─────────────────────
    _section_header("Fortaleza negociadora", mc)
    fort = m["fortaleza"]
    fort_color = GREEN if fort >= 75 else (AMBER if fort >= 55 else RED)
    fr, fg, fb = _hex_to_rgb(fort_color)

    col_fort, col_pad = st.columns([1, 2])
    with col_fort:
        st.markdown(f"""
        <div class="coal-card" style="border-top:3px solid {fort_color};text-align:center;padding:1.2rem">
            <div style="font-size:.6rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.4rem">Fortaleza negociadora</div>
            <div style="font-size:3.2rem;font-weight:900;color:{fort_color};
                        font-family:'JetBrains Mono',monospace;line-height:1;
                        text-shadow:0 0 28px rgba({fr},{fg},{fb},0.35)">{fort}</div>
            <div style="font-size:.7rem;color:{MUTED};margin:.2rem 0 .6rem">/ 100</div>
            <div class="progress-track" style="height:8px">
                <div style="width:{fort}%;height:100%;
                            background:linear-gradient(90deg,{fort_color},{fort_color}88);
                            border-radius:4px"></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # ── Comparison bar chart ──────────────────────────────────────────────────
    _section_header("Comparativa de fortaleza — todos los partidos", PURPLE)

    partidos_l  = list(MOTIVACIONES.keys())
    fort_vals   = [MOTIVACIONES[p]["fortaleza"] for p in partidos_l]
    fort_colors = [MOTIVACIONES[p]["color"] for p in partidos_l]

    fig_comp = go.Figure(go.Bar(
        x=partidos_l,
        y=fort_vals,
        marker=dict(color=fort_colors, line=dict(width=0)),
        text=fort_vals,
        textposition="outside",
        textfont=dict(color=TEXT2, size=10, family="JetBrains Mono, monospace"),
        hoverlabel=dict(
            bgcolor=BG2,
            font=dict(size=11, family="JetBrains Mono, monospace"),
            bordercolor=BORDER,
        ),
        hovertemplate="<b>%{x}</b><br>Fortaleza: %{y}/100<extra></extra>",
    ))
    fig_comp.update_layout(
        height=300,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(
            tickfont=dict(color=TEXT2, size=10),
            gridcolor="rgba(0,0,0,0)",
        ),
        yaxis=dict(
            title="Fortaleza (0–100)",
            range=[0, 105],
            tickfont=dict(color=MUTED, size=9),
            gridcolor="rgba(30,41,59,0.5)",
            title_font=dict(color=TEXT2, size=10),
        ),
        margin=dict(t=15, b=10, l=10, r=10),
        font=dict(color=TEXT),
    )
    # Highlight selected party
    sel_idx = partidos_l.index(partido_sel)
    fig_comp.add_shape(
        type="rect",
        x0=sel_idx - 0.4, x1=sel_idx + 0.4,
        y0=0, y1=fort_vals[sel_idx],
        line=dict(color=mc, width=2),
        fillcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig_comp, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — Matriz de Compatibilidad
# ═══════════════════════════════════════════════════════════════════════════════
with tab3:
    _section_header("Compatibilidad entre partidos", CYAN)

    st.markdown(f"""
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">
        {_pill("+2 muy compatible", GREEN)}
        {_pill("+1 compatible", CYAN)}
        {_pill("0 neutral", MUTED)}
        {_pill("-1 difícil", AMBER)}
        {_pill("-2 veto total", RED)}
    </div>
    """, unsafe_allow_html=True)

    partidos_m = ["PP", "PSOE", "VOX", "SUMAR", "PNV", "Junts", "ERC", "EH Bildu"]
    matrix: list[list[int]] = []
    for p1 in partidos_m:
        row_vals: list[int] = []
        for p2 in partidos_m:
            if p1 == p2:
                row_vals.append(2)
            else:
                key = (p1, p2) if (p1, p2) in COMPATIBILIDAD else (p2, p1)
                row_vals.append(COMPATIBILIDAD.get(key, 0))
        matrix.append(row_vals)

    # Custom colorscale: -2 deep red → 0 dark neutral → +2 deep green
    dark_colorscale = [
        [0.00, "#7F1D1D"],
        [0.25, "#991B1B"],
        [0.50, BG3],
        [0.75, "#14532D"],
        [1.00, "#166534"],
    ]

    fig_hm = go.Figure(go.Heatmap(
        z=matrix,
        x=partidos_m,
        y=partidos_m,
        colorscale=dark_colorscale,
        zmin=-2, zmax=2,
        text=[[str(v) for v in row_vals] for row_vals in matrix],
        texttemplate="%{text}",
        textfont=dict(color=TEXT, size=11, family="JetBrains Mono, monospace"),
        showscale=True,
        colorbar=dict(
            title=dict(text="Compatibilidad", font=dict(color=TEXT2, size=10)),
            tickvals=[-2, -1, 0, 1, 2],
            ticktext=["Veto", "−1", "Neutral", "+1", "Muy comp."],
            tickfont=dict(color=TEXT2, size=9),
            bgcolor=BG2,
            bordercolor=BORDER,
            borderwidth=1,
            len=0.85,
        ),
        hoverlabel=dict(
            bgcolor=BG2,
            font=dict(size=11, family="JetBrains Mono, monospace"),
            bordercolor=BORDER,
        ),
        hovertemplate="<b>%{y}</b> ↔ <b>%{x}</b><br>Compatibilidad: %{z}<extra></extra>",
    ))
    fig_hm.update_layout(
        height=500,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(
            side="top",
            tickfont=dict(color=TEXT2, size=10),
            gridcolor="rgba(0,0,0,0)",
        ),
        yaxis=dict(
            tickfont=dict(color=TEXT2, size=10),
            gridcolor="rgba(0,0,0,0)",
            autorange="reversed",
        ),
        margin=dict(t=30, b=10, l=10, r=10),
        font=dict(color=TEXT),
    )
    st.plotly_chart(fig_hm, use_container_width=True)

    # ── Bloc cards ────────────────────────────────────────────────────────────
    _section_header("Lógica de bloques parlamentarios", PURPLE)

    col_b1, col_b2, col_b3 = st.columns(3)
    with col_b1:
        bc = _color("PP")
        st.markdown(f"""
        <div class="coal-card coal-animate" style="border-top:3px solid {bc};animation-delay:.00s">
            <div style="font-size:.62rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.5rem">Bloque de derecha</div>
            <div style="margin-bottom:.6rem">
                {_pill("PP", _color("PP"))}
                {_pill("VOX", _color("VOX"))}
                {_pill("CC", _color("CC"))}
                {_pill("UPN", CYAN)}
                {_pill("PRC", CYAN)}
            </div>
            <div style="font-size:.75rem;color:{TEXT2};line-height:1.5">
                Máximo ~175 escaños. Posible con alta participación conservadora.
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_b2:
        bc2 = _color("PSOE")
        st.markdown(f"""
        <div class="coal-card coal-animate" style="border-top:3px solid {bc2};animation-delay:.08s">
            <div style="font-size:.62rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.5rem">Bloque progresista</div>
            <div style="margin-bottom:.6rem">
                {_pill("PSOE", _color("PSOE"))}
                {_pill("SUMAR", _color("SUMAR"))}
                {_pill("PNV", _color("PNV"))}
                {_pill("ERC", _color("ERC"))}
                {_pill("EH Bildu", _color("EH Bildu"))}
                {_pill("BNG", _color("BNG"))}
            </div>
            <div style="font-size:.75rem;color:{TEXT2};line-height:1.5">
                Posible con ~178–185 escaños. Alta complejidad de negociación.
            </div>
        </div>
        """, unsafe_allow_html=True)
    with col_b3:
        st.markdown(f"""
        <div class="coal-card coal-animate" style="border-top:3px solid {PURPLE};animation-delay:.16s">
            <div style="font-size:.62rem;font-weight:700;color:{MUTED};letter-spacing:.12em;
                        text-transform:uppercase;margin-bottom:.5rem">Actores bisagra</div>
            <div style="margin-bottom:.6rem">
                {_pill("PNV", _color("PNV"))}
                {_pill("CC", _color("CC"))}
                {_pill("UPN", CYAN)}
            </div>
            <div style="font-size:.75rem;color:{TEXT2};line-height:1.5">
                Pueden inclinar la balanza. Precio: concesiones autonómicas concretas.
            </div>
        </div>
        """, unsafe_allow_html=True)
