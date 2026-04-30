"""
Página: Congreso & Actividad Institucional
BOE, votaciones, agenda de decisores, leyes aprobadas y comisiones de investigación.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import feedparser
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import (
    cargar_actividad_reciente_congreso,
    cargar_stats_legislativas,
    cargar_votaciones,
)
from etl.sources.agendas_dinamicas import fetch_all_agendas

ORANGE = "#F97316"

PARTY_COLORS = {
    "PP":       "#3B82F6",
    "PSOE":     "#EF4444",
    "VOX":      "#22C55E",
    "SUMAR":    "#EC4899",
    "JUNTS":    "#06B6D4",
    "ERC":      "#F97316",
    "EH Bildu": "#84CC16",
    "PNV":      "#10B981",
    "BNG":      "#60A5FA",
    "CC":       "#FBBF24",
    "Junts":    "#06B6D4",
    "OTROS":    MUTED,
}


@st.cache_data(ttl=3600)
def cargar_boe_hoy_real() -> list[dict]:
    feed_urls = [
        "https://www.boe.es/rss/boe.php",
        "https://www.boe.es/rss/diario_boe.xml",
    ]
    items: list[dict] = []
    for url in feed_urls:
        try:
            feed = feedparser.parse(url)
            for e in getattr(feed, "entries", [])[:20]:
                title   = str(getattr(e, "title",   "")).strip()
                summary = str(getattr(e, "summary", "")).strip()
                if not title:
                    continue
                rel = "Alta" if any(k in title.lower() for k in ["ley", "real decreto", "presupuesto"]) else "Media"
                items.append({
                    "seccion":            "BOE",
                    "organismo":          "BOE",
                    "tipo":               "Disposición",
                    "numero":             "BOE",
                    "titulo":             title[:320],
                    "resumen":            summary[:420] or "Publicación oficial en BOE.",
                    "relevancia_politica": rel,
                })
        except Exception:
            continue
    dedup = {}
    for it in items:
        dedup[it["titulo"]] = it
    return list(dedup.values())[:8]


@st.cache_data(ttl=3600)
def cargar_comunicados_oficiales(limit: int = 25) -> pd.DataFrame:
    rows = fetch_all_agendas(max_items_per_source=max(6, limit // 4))
    df   = pd.DataFrame(rows)
    if df.empty:
        return df
    if "resumen" not in df.columns:
        df["resumen"] = "Comunicación oficial agenda/actividad institucional."
    return df.drop_duplicates(subset=["titulo"]).head(limit)


def sec_hdr(title: str, color: str = CYAN) -> None:
    """Encabezado de sección dark/tech."""
    st.markdown(
        f'<div style="display:flex;align-items:center;gap:.8rem;margin:1.5rem 0 .8rem">'
        f'<div style="width:4px;height:16px;background:{color};border-radius:2px"></div>'
        f'<div style="font-size:.68rem;font-weight:700;letter-spacing:.12em;color:{MUTED};text-transform:uppercase">{title}</div>'
        f'<div style="flex:1;height:1px;background:{BORDER}"></div>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ── Datos sintéticos ─────────────────────────────────────────────────────────
BOE_HOY = [
    {
        "seccion":            "I — Disposiciones generales",
        "organismo":          "Ministerio de Hacienda",
        "tipo":               "Real Decreto",
        "numero":             "RD 412/2026",
        "titulo":             "Real Decreto por el que se aprueba el Reglamento de desarrollo de la Ley de Presupuestos Generales del Estado para 2025",
        "resumen":            "Desarrolla el marco de ejecución presupuestaria para el ejercicio 2025, incluyendo modificaciones en los límites de gasto de los departamentos ministeriales.",
        "relevancia_politica": "Alta",
    },
    {
        "seccion":            "I — Disposiciones generales",
        "organismo":          "Ministerio de Trabajo",
        "tipo":               "Orden Ministerial",
        "numero":             "TM/234/2026",
        "titulo":             "Orden por la que se fijan las bases de cotización a la Seguridad Social para el año 2026",
        "resumen":            "Actualiza las bases máximas y mínimas de cotización. La base máxima sube un 4,1% respecto a 2025.",
        "relevancia_politica": "Media",
    },
    {
        "seccion":            "II — Autoridades y personal",
        "organismo":          "Presidencia del Gobierno",
        "tipo":               "Real Decreto",
        "numero":             "RD 415/2026",
        "titulo":             "Real Decreto de nombramiento de la Secretaria de Estado de Digitalización e Inteligencia Artificial",
        "resumen":            "Nombramiento de nuevo cargo en la estructura del Ministerio para la Transformación Digital.",
        "relevancia_politica": "Baja",
    },
    {
        "seccion":            "III — Otras disposiciones",
        "organismo":          "Ministerio de Vivienda",
        "tipo":               "Resolución",
        "numero":             "VIV/891/2026",
        "titulo":             "Resolución por la que se convocan las ayudas del Plan Estatal de Acceso a la Vivienda 2026",
        "resumen":            "Convoca 1.200M€ en ayudas para alquiler y compra de primera vivienda para menores de 35 años con renta inferior a 37.800€/año.",
        "relevancia_politica": "Alta",
    },
    {
        "seccion":            "V — Anuncios",
        "organismo":          "Ministerio de Defensa",
        "tipo":               "Licitación",
        "numero":             "DEF/2026/045",
        "titulo":             "Licitación para la adquisición de 24 vehículos blindados de transporte de personal",
        "resumen":            "Contrato de 180M€ en el marco del plan de modernización de las Fuerzas Armadas para cumplir el objetivo del 2% del PIB en defensa.",
        "relevancia_politica": "Media",
    },
]

VOTACIONES_SEMANA = [
    {
        "fecha":          "11 abril 2026",
        "tipo":           "Proposición de Ley",
        "titulo":         "Ley de Vivienda: modificación del artículo 17 sobre contención de alquileres en zonas tensionadas",
        "resultado":      "APROBADA",
        "votos_favor":    178,
        "votos_contra":   168,
        "abstenciones":   4,
        "partidos_favor": ["PSOE", "SUMAR", "ERC", "EH Bildu", "BNG"],
        "partidos_contra": ["PP", "VOX"],
        "tema":           "Vivienda",
        "implicaciones":  "Amplía las zonas tensionadas donde se puede limitar el precio del alquiler a 50 nuevas ciudades.",
    },
    {
        "fecha":          "10 abril 2026",
        "tipo":           "Moción",
        "titulo":         "Moción consecuencia de interpelación al Gobierno sobre política migratoria",
        "resultado":      "RECHAZADA",
        "votos_favor":    148,
        "votos_contra":   192,
        "abstenciones":   10,
        "partidos_favor": ["PP", "VOX"],
        "partidos_contra": ["PSOE", "SUMAR", "PNV", "ERC", "EH Bildu", "Junts"],
        "tema":           "Inmigración",
        "implicaciones":  "El gobierno rechaza los cambios en política de asilo propuestos por PP y VOX.",
    },
    {
        "fecha":          "9 abril 2026",
        "tipo":           "Proposición No de Ley",
        "titulo":         "PNL para instar al gobierno a impulsar la reforma del sistema de financiación autonómica antes de 2027",
        "resultado":      "APROBADA",
        "votos_favor":    220,
        "votos_contra":   90,
        "abstenciones":   40,
        "partidos_favor": ["PP", "PSOE", "PNV", "Junts", "ERC"],
        "partidos_contra": ["VOX"],
        "tema":           "Financiación Autonómica",
        "implicaciones":  "Mayoría transversal exige al gobierno acelerar la reforma del modelo de financiación territorial.",
    },
    {
        "fecha":          "8 abril 2026",
        "tipo":           "Presupuesto",
        "titulo":         "Enmienda a los Presupuestos Generales: dotación adicional para sanidad en 1.800M€",
        "resultado":      "APROBADA",
        "votos_favor":    186,
        "votos_contra":   154,
        "abstenciones":   10,
        "partidos_favor": ["PSOE", "SUMAR", "EH Bildu", "ERC", "PNV"],
        "partidos_contra": ["PP", "VOX"],
        "tema":           "Sanidad / Presupuestos",
        "implicaciones":  "Amplía la dotación para refuerzo de atención primaria y reducción de listas de espera.",
    },
]

AGENDA_SEMANA = {
    "Pedro Sánchez (Presidente)": [
        {"dia": "Lunes 14 abril",    "evento": "Consejo de Ministros ordinario",                                        "tipo": "institucional"},
        {"dia": "Martes 15 abril",   "evento": "Comparecencia en el Congreso — control al gobierno",                    "tipo": "parlamento"},
        {"dia": "Miércoles 16 abril","evento": "Reunión bilateral con el Presidente de la Generalitat de Catalunya",     "tipo": "territorial"},
        {"dia": "Jueves 17 abril",   "evento": "Cumbre bilateral España-Francia (París)",                               "tipo": "exterior"},
        {"dia": "Viernes 18 abril",  "evento": "Actos conmemorativos 14 de Abril en Madrid",                            "tipo": "institucional"},
    ],
    "Rey Felipe VI": [
        {"dia": "Lunes 14 abril",    "evento": "Despacho ordinario con el Presidente del Gobierno",                     "tipo": "institucional"},
        {"dia": "Martes 15 abril",   "evento": "Audiencias en el Palacio de la Zarzuela",                               "tipo": "institucional"},
        {"dia": "Jueves 17 abril",   "evento": "Reunión con los presidentes autonómicos (Conferencia de Presidentes)",  "tipo": "territorial"},
    ],
    "Alberto Núñez Feijóo (Líder PP)": [
        {"dia": "Lunes 14 abril",    "evento": "Rueda de prensa tras el Consejo de Ministros — respuesta oposición",    "tipo": "partido"},
        {"dia": "Martes 15 abril",   "evento": "Intervención en el Pleno del Congreso",                                 "tipo": "parlamento"},
        {"dia": "Miércoles 16 abril","evento": "Reunión de la Junta Directiva Nacional del PP",                         "tipo": "partido"},
    ],
    "Santiago Abascal (Líder VOX)": [
        {"dia": "Martes 15 abril",   "evento": "Interpelación al Gobierno sobre política migratoria en el Pleno",       "tipo": "parlamento"},
        {"dia": "Jueves 17 abril",   "evento": "Mitin en Sevilla — actos 18 de Julio",                                  "tipo": "partido"},
    ],
    "Yolanda Díaz (Vicepresidenta / SUMAR)": [
        {"dia": "Lunes 14 abril",    "evento": "Consejo de Ministros — presentación de reforma del Estatuto de los Trabajadores", "tipo": "gobierno"},
        {"dia": "Miércoles 16 abril","evento": "Reunión con sindicatos CCOO y UGT — mesa de negociación social",        "tipo": "laboral"},
        {"dia": "Viernes 18 abril",  "evento": "Foro económico — Jornadas de Economía Social",                          "tipo": "social"},
    ],
}

LEYES_LEGISLATURA = [
    {
        "nombre":           "Ley Orgánica de Amnistía",
        "numero":           "LO 1/2026",
        "fecha_aprobacion": "Enero 2026",
        "ministerio":       "Ministerio de Justicia",
        "descripcion":      "Amnistía a los condenados por el procés independentista catalán de 2017. Afecta a más de 400 personas.",
        "relevancia":       "Muy Alta",
        "estado":           "En vigor",
        "apoyos":           ["PSOE", "SUMAR", "ERC", "Junts", "EH Bildu", "BNG"],
        "oposicion":        ["PP", "VOX"],
        "votos_favor":      178,
        "votos_contra":     172,
    },
    {
        "nombre":           "Ley de Vivienda — Segunda Reforma",
        "numero":           "Ley 3/2026",
        "fecha_aprobacion": "Febrero 2026",
        "ministerio":       "Ministerio de Vivienda",
        "descripcion":      "Amplía las zonas de mercado residencial tensionado. Permite a las CCAA fijar índices de referencia de precio del alquiler.",
        "relevancia":       "Alta",
        "estado":           "En vigor",
        "apoyos":           ["PSOE", "SUMAR", "EH Bildu", "ERC"],
        "oposicion":        ["PP", "VOX", "Junts"],
        "votos_favor":      181,
        "votos_contra":     169,
    },
    {
        "nombre":           "Ley de Inteligencia Artificial",
        "numero":           "Ley 4/2026",
        "fecha_aprobacion": "Febrero 2026",
        "ministerio":       "Ministerio para la Transformación Digital",
        "descripcion":      "Transpone el Reglamento europeo de IA. Crea la Agencia Española de Supervisión de la Inteligencia Artificial (AESIA).",
        "relevancia":       "Alta",
        "estado":           "En vigor",
        "apoyos":           ["PSOE", "SUMAR", "PP", "PNV"],
        "oposicion":        ["VOX"],
        "votos_favor":      280,
        "votos_contra":     58,
    },
    {
        "nombre":           "Ley de Familias",
        "numero":           "Ley 5/2026",
        "fecha_aprobacion": "Marzo 2026",
        "ministerio":       "Ministerio de Derechos Sociales",
        "descripcion":      "Permiso parental de 5 días, prestación por hijos a cargo, reconocimiento de nuevos modelos de familia.",
        "relevancia":       "Media",
        "estado":           "En vigor",
        "apoyos":           ["PSOE", "SUMAR", "PNV", "ERC", "EH Bildu"],
        "oposicion":        ["PP", "VOX"],
        "votos_favor":      184,
        "votos_contra":     166,
    },
    {
        "nombre":           "Reforma del Código Penal — Delitos económicos",
        "numero":           "LO 2/2026",
        "fecha_aprobacion": "Marzo 2026",
        "ministerio":       "Ministerio de Justicia",
        "descripcion":      "Agrava las penas por corrupción pública, malversación y fraude fiscal. Elimina la prescripción para los delitos de corrupción más graves.",
        "relevancia":       "Alta",
        "estado":           "En vigor",
        "apoyos":           ["PSOE", "SUMAR", "PP", "PNV", "ERC"],
        "oposicion":        ["VOX"],
        "votos_favor":      290,
        "votos_contra":     50,
    },
    {
        "nombre":           "Ley de Memoria Democrática — Reglamento de desarrollo",
        "numero":           "RD 187/2026",
        "fecha_aprobacion": "Enero 2026",
        "ministerio":       "Ministerio de la Presidencia",
        "descripcion":      "Desarrolla el mapa de fosas comunes, crea el censo de víctimas del franquismo y regula las ayudas a familiares.",
        "relevancia":       "Media",
        "estado":           "En vigor",
        "apoyos":           ["PSOE", "SUMAR", "EH Bildu", "ERC"],
        "oposicion":        ["PP", "VOX"],
        "votos_favor":      180,
        "votos_contra":     170,
    },
    {
        "nombre":           "Ley de Presupuestos Generales del Estado 2026",
        "numero":           "Ley 6/2026",
        "fecha_aprobacion": "Abril 2026",
        "ministerio":       "Ministerio de Hacienda",
        "descripcion":      "PGE 2026 con un gasto total de 587.000M€. Incremento del 5,2% respecto a 2025. Prioriza sanidad, educación y defensa.",
        "relevancia":       "Muy Alta",
        "estado":           "Aprobados — en tramitación reglamentos",
        "apoyos":           ["PSOE", "SUMAR", "PNV", "EH Bildu"],
        "oposicion":        ["PP", "VOX", "Junts", "ERC"],
        "votos_favor":      176,
        "votos_contra":     174,
    },
]

COMISIONES_INVESTIGACION = [
    {
        "nombre":              "Comisión de investigación sobre el uso de Pegasus y el espionaje a líderes independentistas",
        "estado":              "Activa",
        "inicio":              "Octubre 2025",
        "prevision_fin":       "Octubre 2026",
        "presidencia":         "PSOE",
        "partidos_impulso":    ["ERC", "Junts", "EH Bildu"],
        "partidos_oposicion":  ["PP", "VOX"],
        "descripcion":         "Investiga el uso del spyware Pegasus para interceptar comunicaciones de dirigentes del movimiento independentista catalán y vasco. Ha llamado a declarar a exdirectores del CNI.",
        "relevancia_politica": "Muy Alta",
        "ultimos_avances":     "Comparecencia del exdirector del CNI (febrero 2026). Petición de documentación clasificada al Gobierno pendiente de resolución.",
    },
    {
        "nombre":              "Comisión de investigación sobre la gestión de la DANA de Valencia (noviembre 2024)",
        "estado":              "Activa",
        "inicio":              "Enero 2026",
        "prevision_fin":       "Julio 2026",
        "presidencia":         "PP",
        "partidos_impulso":    ["PP", "VOX"],
        "partidos_oposicion":  ["PSOE", "SUMAR"],
        "descripcion":         "Examina la actuación del Gobierno central, la Generalitat Valenciana y los servicios de emergencia ante la catástrofe que causó más de 220 muertos.",
        "relevancia_politica": "Alta",
        "ultimos_avances":     "Comparecencia del ministro del Interior (marzo 2026). Debate sobre la petición de comparecencia del Presidente de la Generalitat.",
    },
    {
        "nombre":              "Comisión de investigación sobre el contrato de mascarillas (Soluciones de Gestión SL)",
        "estado":              "Cerrada — Informe final aprobado",
        "inicio":              "Septiembre 2024",
        "prevision_fin":       "Diciembre 2025",
        "presidencia":         "PP",
        "partidos_impulso":    ["PP", "VOX"],
        "partidos_oposicion":  ["PSOE", "SUMAR"],
        "descripcion":         "Investigó la adjudicación irregular de contratos de mascarillas durante el COVID-19. El informe final señala irregularidades en el procedimiento pero no delito penal.",
        "relevancia_politica": "Media",
        "ultimos_avances":     "Informe final aprobado en diciembre 2025 con votos divididos. PSOE y SUMAR presentaron voto particular.",
    },
    {
        "nombre":              "Comisión de investigación sobre la financiación de VOX",
        "estado":              "En tramitación",
        "inicio":              "Marzo 2026",
        "prevision_fin":       "Pendiente de constitución formal",
        "presidencia":         "Por determinar",
        "partidos_impulso":    ["PSOE", "SUMAR", "EH Bildu"],
        "partidos_oposicion":  ["PP", "VOX"],
        "descripcion":         "Investigará la presunta financiación irregular de VOX por parte de entidades vinculadas a Irán y a fondos de origen opaco en varios países.",
        "relevancia_politica": "Alta",
        "ultimos_avances":     "Aprobada la creación por mayoría simple en marzo 2026. PP se abstuvo. VOX la impugna ante el Tribunal Constitucional.",
    },
]

# ── Config ────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Congreso — ElectSim", layout="wide")
sidebar_nav()

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(16px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:1; transform:scale(1); }}
    50%     {{ opacity:.5; transform:scale(.8); }}
}}

/* ── BOE card ──────────────────────────────────── */
.boe-card {{
    background:{BG2};
    border:1px solid {BORDER};
    border-left:4px solid {BLUE};
    border-radius:10px;
    padding:.9rem 1.1rem;
    margin-bottom:.6rem;
    animation:fadeInUp .35s ease both;
    transition:box-shadow .2s ease;
}}
.boe-card:hover {{ box-shadow:0 0 14px rgba(0,212,255,0.07); }}
.boe-alta  {{ border-left-color:{RED}   !important; }}
.boe-media {{ border-left-color:{AMBER} !important; }}
.boe-baja  {{ border-left-color:{BORDER} !important; }}

/* ── Votación / ley / comisión card ────────────── */
.data-card {{
    background:{BG2};
    border:1px solid {BORDER};
    border-radius:10px;
    padding:.9rem 1.1rem;
    margin-bottom:.7rem;
    animation:fadeInUp .35s ease both;
}}

/* ── Agenda item ───────────────────────────────── */
.agenda-item {{
    background:{BG3};
    border:1px solid {BORDER};
    border-radius:8px;
    padding:.6rem .9rem;
    margin:.3rem 0;
    border-left:3px solid {CYAN};
}}

/* ── Badge ─────────────────────────────────────── */
.badge {{
    display:inline-block;
    padding:.15rem .5rem;
    border-radius:4px;
    font-size:.7rem;
    font-weight:600;
    letter-spacing:.04em;
}}

/* ── Info banner ───────────────────────────────── */
.info-banner {{
    background:{BG2};
    border:1px solid {BORDER};
    border-radius:10px;
    padding:.8rem 1.1rem;
    margin-bottom:1rem;
    display:flex;
    justify-content:space-between;
    align-items:center;
}}
</style>
""", unsafe_allow_html=True)

# ── Header animado ────────────────────────────────────────────────────────────
st.markdown(
    f'<div style="position:relative;overflow:hidden;background:{BG2};border:1px solid {BORDER};'
    f'border-radius:16px;padding:2rem 2.5rem;margin-bottom:1.5rem;animation:fadeInUp .5s ease both">'
    f'<div style="position:absolute;top:-40px;right:-40px;width:220px;height:220px;border-radius:50%;'
    f'background:radial-gradient(circle,rgba(59,130,246,0.10) 0%,transparent 70%);pointer-events:none"></div>'
    f'<div style="position:absolute;bottom:-50px;left:30%;width:160px;height:160px;border-radius:50%;'
    f'background:radial-gradient(circle,rgba(0,212,255,0.07) 0%,transparent 70%);pointer-events:none"></div>'
    f'<div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">'
    f'<div style="width:8px;height:8px;border-radius:50%;background:{CYAN};'
    f'animation:dotPulse 2s ease-in-out infinite;box-shadow:0 0 8px {CYAN}"></div>'
    f'<span style="font-size:.65rem;font-weight:700;letter-spacing:.16em;color:{CYAN};text-transform:uppercase">XV LEGISLATURA · EN TIEMPO REAL</span>'
    f'</div>'
    f'<h1 style="font-size:1.7rem;font-weight:800;color:{TEXT};margin:0 0 .3rem;letter-spacing:-.02em">Congreso & Actividad Institucional</h1>'
    f'<p style="color:{TEXT2};font-size:.88rem;margin:0">BOE · votaciones semanales · agenda de decisores · leyes aprobadas · comisiones de investigación</p>'
    f'</div>',
    unsafe_allow_html=True,
)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_boe, tab_votaciones, tab_agenda, tab_comunicados, tab_leyes, tab_comisiones = st.tabs([
    "▤  BOE de Hoy",
    "●  Votaciones",
    "○  Agenda Decisores",
    "◈  Comunicados",
    "◇  Leyes Aprobadas",
    "≡  Comisiones",
])

# ── Tab 1: BOE de Hoy ────────────────────────────────────────────────────────
with tab_boe:
    with st.spinner("Cargando datos..."):
        boe_real = cargar_boe_hoy_real()
    boe_data = boe_real if boe_real else BOE_HOY

    st.markdown(
        f'<div class="info-banner">'
        f'<div>'
        f'<span style="font-weight:700;font-size:.95rem;color:{TEXT}">Boletín Oficial del Estado</span>'
        f'<span style="margin-left:.8rem;font-size:.82rem;color:{MUTED}">Lunes, 13 de abril de 2026 · Núm. 89</span>'
        f'</div>'
        f'<span class="badge" style="background:rgba(59,130,246,0.15);color:{BLUE};border:1px solid rgba(59,130,246,0.3)">5 disposiciones relevantes</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

    total_boe = len(boe_data)
    alta      = sum(1 for b in boe_data if b["relevancia_politica"] == "Alta")
    media     = sum(1 for b in boe_data if b["relevancia_politica"] == "Media")
    baja      = sum(1 for b in boe_data if b["relevancia_politica"] == "Baja")

    kb1, kb2, kb3, kb4 = st.columns(4)
    with kb1:
        st.metric("Disposiciones totales", total_boe)
    with kb2:
        st.metric("Relevancia Alta", alta)
    with kb3:
        st.metric("Relevancia Media", media)
    with kb4:
        st.metric("Relevancia Baja", baja)

    st.divider()

    secciones_boe = ["Todas"] + sorted(list({b["seccion"] for b in boe_data}))
    seccion_sel   = st.selectbox("Filtrar por sección", secciones_boe)
    relevancia_sel = st.selectbox("Filtrar por relevancia política", ["Todas", "Alta", "Media", "Baja"])

    boe_mostrar = boe_data
    if seccion_sel != "Todas":
        boe_mostrar = [b for b in boe_mostrar if b["seccion"] == seccion_sel]
    if relevancia_sel != "Todas":
        boe_mostrar = [b for b in boe_mostrar if b["relevancia_politica"] == relevancia_sel]

    for item in boe_mostrar:
        rel       = item["relevancia_politica"]
        rel_color = RED if rel == "Alta" else AMBER if rel == "Media" else MUTED
        css_rel   = f"boe-{rel.lower()}"
        card = (
            f'<div class="boe-card {css_rel}">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.4rem">'
            f'<div style="flex:1">'
            f'<span class="badge" style="background:{BG3};color:{CYAN};border:1px solid {BORDER};margin-right:.5rem">{item["numero"]}</span>'
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER}">{item["tipo"]}</span>'
            f'</div>'
            f'<span class="badge" style="background:{rel_color}25;color:{rel_color};border:1px solid {rel_color}55;flex-shrink:0">Relevancia {rel}</span>'
            f'</div>'
            f'<div style="font-weight:700;font-size:.9rem;color:{TEXT};margin-bottom:.3rem;line-height:1.4">{item["titulo"]}</div>'
            f'<div style="font-size:.78rem;color:{MUTED};margin-bottom:.3rem">{item["organismo"]} &nbsp;&bull;&nbsp; {item["seccion"]}</div>'
            f'<div style="font-size:.82rem;color:{TEXT2};line-height:1.5">{item["resumen"]}</div>'
            f'</div>'
        )
        st.markdown(card, unsafe_allow_html=True)

    st.caption("Fuente: BOE RSS en tiempo real (fallback sintético si falla el feed).")

# ── Tab 2: Votaciones de la Semana ───────────────────────────────────────────
with tab_votaciones:
    sec_hdr("Votaciones del Pleno — Semana del 7 al 11 de Abril de 2026")

    aprobadas  = sum(1 for v in VOTACIONES_SEMANA if v["resultado"] == "APROBADA")
    rechazadas = sum(1 for v in VOTACIONES_SEMANA if v["resultado"] == "RECHAZADA")
    total_vot  = len(VOTACIONES_SEMANA)

    kv1, kv2, kv3 = st.columns(3)
    with kv1:
        st.metric("Votaciones esta semana", total_vot)
    with kv2:
        st.metric("Aprobadas", aprobadas)
    with kv3:
        st.metric("Rechazadas", rechazadas)

    st.divider()

    # Timeline
    sec_hdr("Línea Temporal", BLUE)
    fig_vot_timeline = go.Figure()
    for i, v in enumerate(VOTACIONES_SEMANA):
        color = GREEN if v["resultado"] == "APROBADA" else RED
        fig_vot_timeline.add_trace(go.Scatter(
            x=[v["fecha"]],
            y=[i],
            mode="markers+text",
            marker=dict(size=22, color=color, line=dict(color=BG2, width=2)),
            text=[v["resultado"]],
            textposition="middle right",
            textfont=dict(size=9, color=TEXT2),
            hovertemplate=(
                f"<b>{v['fecha']}</b><br>"
                f"{v['titulo'][:70]}<br>"
                f"Resultado: <b>{v['resultado']}</b><br>"
                f"A favor: {v['votos_favor']} · En contra: {v['votos_contra']} · Abs: {v['abstenciones']}"
                "<extra></extra>"
            ),
            showlegend=False,
        ))
    fig_vot_timeline.update_layout(
        height=220,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(title=None, showgrid=False, tickfont=dict(size=10, color=TEXT2)),
        yaxis=dict(
            tickvals=list(range(len(VOTACIONES_SEMANA))),
            ticktext=[v["titulo"][:50] + "..." if len(v["titulo"]) > 50 else v["titulo"]
                      for v in VOTACIONES_SEMANA],
            tickfont=dict(size=9, color=TEXT2),
            title=None,
        ),
        margin=dict(t=10, b=10, l=340, r=80),
        showlegend=False,
    )
    st.plotly_chart(fig_vot_timeline, use_container_width=True)

    # Detalle por votación
    sec_hdr("Detalle por Votación")
    for v in VOTACIONES_SEMANA:
        res_color = GREEN if v["resultado"] == "APROBADA" else RED
        total     = v["votos_favor"] + v["votos_contra"] + v["abstenciones"] or 1
        pct_favor = v["votos_favor"] / total * 100
        pct_contra = v["votos_contra"] / total * 100

        partidos_favor_html = "".join(
            f'<span class="badge" style="background:{PARTY_COLORS.get(p, BG3)};color:#ffffff;margin-right:3px">{p}</span>'
            for p in v["partidos_favor"]
        )
        partidos_contra_html = "".join(
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{p}</span>'
            for p in v["partidos_contra"]
        )

        with st.expander(f"{v['fecha']}  —  {v['titulo'][:70]}{'...' if len(v['titulo']) > 70 else ''}", expanded=False):
            col_info, col_donut = st.columns([2, 1])
            with col_info:
                header_html = (
                    f'<div style="margin-bottom:.5rem">'
                    f'<span class="badge" style="background:{BG3};color:{CYAN};border:1px solid {BORDER};margin-right:.4rem">{v["tipo"]}</span>'
                    f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:.4rem">{v["tema"]}</span>'
                    f'<span class="badge" style="background:{res_color}25;color:{res_color};border:1px solid {res_color}55">{v["resultado"]}</span>'
                    f'</div>'
                    f'<div style="font-weight:700;font-size:.95rem;color:{TEXT};margin-bottom:.5rem">{v["titulo"]}</div>'
                    f'<div style="margin-bottom:.5rem">'
                    f'<div style="font-size:.75rem;color:{MUTED};margin-bottom:.2rem">A favor ({v["votos_favor"]} votos)</div>'
                    f'{partidos_favor_html}'
                    f'</div>'
                    f'<div style="margin-bottom:.5rem">'
                    f'<div style="font-size:.75rem;color:{MUTED};margin-bottom:.2rem">En contra ({v["votos_contra"]} votos)</div>'
                    f'{partidos_contra_html}'
                    f'</div>'
                    f'<div style="font-size:.82rem;color:{TEXT2};background:{BG3};border-radius:6px;padding:.5rem .8rem;margin-top:.4rem;border-left:3px solid {AMBER}">'
                    f'<b style="color:{AMBER}">Implicaciones:</b> {v["implicaciones"]}'
                    f'</div>'
                )
                st.markdown(header_html, unsafe_allow_html=True)
                bar_html = (
                    f'<div style="margin-top:.6rem;border-radius:4px;overflow:hidden;height:8px;background:{BG3}">'
                    f'<div style="background:{GREEN};width:{pct_favor:.1f}%;height:8px;display:inline-block;border-radius:4px 0 0 4px"></div>'
                    f'</div>'
                    f'<div style="display:flex;justify-content:space-between;font-size:.7rem;color:{MUTED};margin-top:.2rem">'
                    f'<span>A favor {pct_favor:.1f}%</span>'
                    f'<span>Abs. {v["abstenciones"]}</span>'
                    f'<span>En contra {pct_contra:.1f}%</span>'
                    f'</div>'
                )
                st.markdown(bar_html, unsafe_allow_html=True)

            with col_donut:
                fig_donut_vot = go.Figure(go.Pie(
                    labels=["A favor", "En contra", "Abstención"],
                    values=[v["votos_favor"], v["votos_contra"], v["abstenciones"]],
                    marker_colors=[GREEN, RED, AMBER],
                    hole=0.5,
                    textinfo="value",
                    textfont=dict(size=11, color=TEXT),
                ))
                fig_donut_vot.update_layout(
                    height=200,
                    paper_bgcolor="rgba(0,0,0,0)",
                    margin=dict(t=5, b=5, l=5, r=5),
                    showlegend=True,
                    legend=dict(font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
                    annotations=[dict(text=f"{v['votos_favor']}/{total}", x=0.5, y=0.5,
                                      font_size=11, showarrow=False, font_color=TEXT2)],
                )
                st.plotly_chart(fig_donut_vot, use_container_width=True)

    st.caption("Fuente: Congreso de los Diputados — datos sintéticos representativos semana del 7-11 abril 2026")

# ── Tab 3: Agenda de Decisores ───────────────────────────────────────────────
with tab_agenda:
    st.markdown(
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;padding:.7rem 1rem;margin-bottom:1rem">'
        f'<span style="font-weight:700;font-size:.92rem;color:{TEXT}">Agenda institucional y política</span>'
        f'<span style="margin-left:.8rem;font-size:.82rem;color:{MUTED}">Semana del 14 al 18 de abril de 2026</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

    TIPO_COLORS = {
        "institucional": BLUE,
        "parlamento":    PURPLE,
        "territorial":   AMBER,
        "exterior":      "#EC4899",
        "partido":       RED,
        "gobierno":      GREEN,
        "laboral":       "#06B6D4",
        "social":        "#22C55E",
    }

    decisores_sel = st.multiselect(
        "Seleccionar decisores",
        list(AGENDA_SEMANA.keys()),
        default=list(AGENDA_SEMANA.keys()),
    )

    for decisor in decisores_sel:
        eventos = AGENDA_SEMANA[decisor]
        with st.expander(decisor, expanded=True):
            for ev in eventos:
                tipo_color = TIPO_COLORS.get(ev["tipo"], MUTED)
                item_html = (
                    f'<div class="agenda-item" style="border-left-color:{tipo_color}">'
                    f'<div style="display:flex;justify-content:space-between;align-items:center">'
                    f'<div>'
                    f'<span style="font-size:.75rem;font-weight:600;color:{MUTED};margin-right:.6rem">{ev["dia"]}</span>'
                    f'<span style="font-size:.88rem;color:{TEXT}">{ev["evento"]}</span>'
                    f'</div>'
                    f'<span class="badge" style="background:{tipo_color}20;color:{tipo_color};border:1px solid {tipo_color}44;margin-left:.8rem;flex-shrink:0">{ev["tipo"]}</span>'
                    f'</div>'
                    f'</div>'
                )
                st.markdown(item_html, unsafe_allow_html=True)

    sec_hdr("Distribución de Actividad por Tipo", BLUE)
    conteo_tipos: dict[str, int] = {}
    for decisor in decisores_sel:
        for ev in AGENDA_SEMANA.get(decisor, []):
            conteo_tipos[ev["tipo"]] = conteo_tipos.get(ev["tipo"], 0) + 1

    if conteo_tipos:
        fig_tipos_agenda = go.Figure(go.Bar(
            x=list(conteo_tipos.keys()),
            y=list(conteo_tipos.values()),
            marker_color=[TIPO_COLORS.get(t, MUTED) for t in conteo_tipos.keys()],
            text=list(conteo_tipos.values()),
            textposition="outside",
            textfont=dict(color=TEXT2, size=10),
        ))
        fig_tipos_agenda.update_layout(
            height=280,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
            yaxis=dict(title="Nº de actos", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
            margin=dict(t=10, b=10),
            showlegend=False,
        )
        st.plotly_chart(fig_tipos_agenda, use_container_width=True)

    st.caption("Agenda sintética representativa — semana del 14-18 abril 2026")

# ── Tab 4: Comunicados Oficiales ─────────────────────────────────────────────
with tab_comunicados:
    sec_hdr("Comunicados y Notas Oficiales — Semana Actual")
    df_com = cargar_comunicados_oficiales(limit=30)
    if df_com.empty:
        st.info("No se pudieron cargar comunicados en tiempo real.")
    else:
        fuentes = ["Todas"] + sorted(df_com["fuente"].dropna().unique().tolist())
        fuente_sel = st.selectbox("Filtrar por fuente oficial", fuentes)
        if fuente_sel != "Todas":
            df_com = df_com[df_com["fuente"] == fuente_sel]

        st.metric("Comunicados monitorizados", len(df_com))
        for _, row in df_com.iterrows():
            card = (
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {CYAN};border-radius:8px;padding:.7rem .9rem;margin-bottom:.5rem">'
                f'<div style="font-weight:700;color:{TEXT};font-size:.9rem">{row.get("titulo", "")}</div>'
                f'<div style="font-size:.75rem;color:{MUTED};margin:.25rem 0">{row.get("fuente", "")} · {row.get("fecha", "")}</div>'
                f'<div style="font-size:.8rem;color:{TEXT2};line-height:1.45">{row.get("cita", row.get("resumen", ""))}</div>'
                f'</div>'
            )
            st.markdown(card, unsafe_allow_html=True)

# ── Tab 5: Leyes Aprobadas esta Legislatura ──────────────────────────────────
with tab_leyes:
    sec_hdr("Leyes y Normas Aprobadas — XV Legislatura (2023-2026)")

    muy_alta = sum(1 for l in LEYES_LEGISLATURA if l["relevancia"] == "Muy Alta")
    alta_l   = sum(1 for l in LEYES_LEGISLATURA if l["relevancia"] == "Alta")
    media_l  = sum(1 for l in LEYES_LEGISLATURA if l["relevancia"] == "Media")

    kl1, kl2, kl3, kl4 = st.columns(4)
    with kl1:
        st.metric("Total normas destacadas", len(LEYES_LEGISLATURA))
    with kl2:
        st.metric("Relevancia Muy Alta", muy_alta)
    with kl3:
        st.metric("Relevancia Alta", alta_l)
    with kl4:
        st.metric("Relevancia Media", media_l)

    st.divider()

    col_ley1, col_ley2 = st.columns(2)
    nombres_cortos = [
        l["nombre"][:35] + "..." if len(l["nombre"]) > 35 else l["nombre"]
        for l in LEYES_LEGISLATURA
    ]
    margenes = [l["votos_favor"] - l["votos_contra"] for l in LEYES_LEGISLATURA]

    with col_ley1:
        sec_hdr("Margen de Aprobación por Ley", GREEN)
        fig_margen = go.Figure(go.Bar(
            x=margenes,
            y=nombres_cortos,
            orientation="h",
            marker_color=[GREEN if m > 0 else RED for m in margenes],
            text=[f"+{m}" if m > 0 else str(m) for m in margenes],
            textposition="outside",
            textfont=dict(color=TEXT2, size=9),
        ))
        fig_margen.update_layout(
            height=320,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(
                title="Diferencia votos (favor - contra)",
                zeroline=True, zerolinecolor=MUTED,
                gridcolor=BORDER,
                tickfont=dict(color=TEXT2, size=9),
                titlefont=dict(color=MUTED, size=9),
            ),
            yaxis=dict(title=None, tickfont=dict(size=9, color=TEXT2)),
            margin=dict(t=10, b=10, l=10, r=60),
            showlegend=False,
        )
        st.plotly_chart(fig_margen, use_container_width=True)

    with col_ley2:
        sec_hdr("Apoyos y Oposición por Ley", BLUE)
        fig_apoyos = go.Figure()
        fig_apoyos.add_trace(go.Bar(
            name="Votos a favor",
            x=nombres_cortos,
            y=[l["votos_favor"] for l in LEYES_LEGISLATURA],
            marker_color=GREEN,
        ))
        fig_apoyos.add_trace(go.Bar(
            name="Votos en contra",
            x=nombres_cortos,
            y=[-l["votos_contra"] for l in LEYES_LEGISLATURA],
            marker_color=RED,
        ))
        fig_apoyos.update_layout(
            barmode="overlay",
            height=320,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(title=None, tickfont=dict(size=8, color=TEXT2), tickangle=-25),
            yaxis=dict(
                title="Votos",
                gridcolor=BORDER,
                zeroline=True, zerolinecolor=MUTED,
                tickfont=dict(color=TEXT2, size=9),
            ),
            legend=dict(orientation="h", y=1.05, font=dict(color=TEXT2, size=9),
                        bgcolor="rgba(0,0,0,0)"),
            margin=dict(t=30, b=60),
        )
        st.plotly_chart(fig_apoyos, use_container_width=True)

    sec_hdr("Detalle de Normas Aprobadas")
    relevancia_ley_sel = st.selectbox("Filtrar por relevancia", ["Todas", "Muy Alta", "Alta", "Media"], key="rel_ley")
    leyes_mostrar = LEYES_LEGISLATURA if relevancia_ley_sel == "Todas" else [
        l for l in LEYES_LEGISLATURA if l["relevancia"] == relevancia_ley_sel
    ]

    for ley in leyes_mostrar:
        rel       = ley["relevancia"]
        rel_color = RED if rel == "Muy Alta" else ORANGE if rel == "Alta" else AMBER
        margen    = ley["votos_favor"] - ley["votos_contra"]
        mg_color  = GREEN if margen > 0 else RED

        apoyos_html = "".join(
            f'<span class="badge" style="background:{PARTY_COLORS.get(p, BG3)};color:#ffffff;margin-right:3px">{p}</span>'
            for p in ley["apoyos"]
        )
        oposicion_html = "".join(
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{p}</span>'
            for p in ley["oposicion"]
        )
        card = (
            f'<div class="data-card" style="border-left:3px solid {rel_color}">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.4rem">'
            f'<div>'
            f'<span class="badge" style="background:{BG3};color:{CYAN};border:1px solid {BORDER};margin-right:.4rem">{ley["numero"]}</span>'
            f'<span class="badge" style="background:{BG3};color:{MUTED};border:1px solid {BORDER};margin-right:.4rem">{ley["fecha_aprobacion"]}</span>'
            f'<span class="badge" style="background:{rel_color}25;color:{rel_color};border:1px solid {rel_color}55">Relevancia {rel}</span>'
            f'</div>'
            f'<span class="badge" style="background:{mg_color}25;color:{mg_color};border:1px solid {mg_color}55">{"+" if margen > 0 else ""}{margen} votos</span>'
            f'</div>'
            f'<div style="font-weight:700;font-size:.95rem;color:{TEXT};margin-bottom:.3rem">{ley["nombre"]}</div>'
            f'<div style="font-size:.78rem;color:{MUTED};margin-bottom:.4rem">{ley["ministerio"]} &nbsp;&bull;&nbsp; Estado: {ley["estado"]}</div>'
            f'<div style="font-size:.82rem;color:{TEXT2};margin-bottom:.5rem;line-height:1.5">{ley["descripcion"]}</div>'
            f'<div style="display:flex;gap:1.5rem;flex-wrap:wrap">'
            f'<div><div style="font-size:.7rem;color:{MUTED};margin-bottom:.2rem">A favor</div>{apoyos_html}</div>'
            f'<div><div style="font-size:.7rem;color:{MUTED};margin-bottom:.2rem">En contra</div>{oposicion_html}</div>'
            f'</div>'
            f'</div>'
        )
        st.markdown(card, unsafe_allow_html=True)

    st.caption("Selección de normas destacadas de la XV Legislatura — datos sintéticos representativos")

# ── Tab 6: Comisiones de Investigación ───────────────────────────────────────
with tab_comisiones:
    sec_hdr("Comisiones de Investigación — XV Legislatura")

    ESTADO_COLORS = {
        "Activa":                                GREEN,
        "En tramitación":                        AMBER,
        "Cerrada — Informe final aprobado":      MUTED,
    }

    activas  = sum(1 for c in COMISIONES_INVESTIGACION if c["estado"] == "Activa")
    en_tram  = sum(1 for c in COMISIONES_INVESTIGACION if c["estado"] == "En tramitación")
    cerradas = sum(1 for c in COMISIONES_INVESTIGACION if "Cerrada" in c["estado"])

    kc1, kc2, kc3, kc4 = st.columns(4)
    with kc1:
        st.metric("Total comisiones", len(COMISIONES_INVESTIGACION))
    with kc2:
        st.metric("Activas", activas)
    with kc3:
        st.metric("En tramitación", en_tram)
    with kc4:
        st.metric("Cerradas", cerradas)

    st.divider()

    for comision in COMISIONES_INVESTIGACION:
        estado_color = ESTADO_COLORS.get(comision["estado"], MUTED)
        rel          = comision["relevancia_politica"]
        rel_color    = RED if rel == "Muy Alta" else ORANGE if rel == "Alta" else AMBER

        impulso_html = "".join(
            f'<span class="badge" style="background:{PARTY_COLORS.get(p, BG3)};color:#ffffff;margin-right:3px">{p}</span>'
            for p in comision["partidos_impulso"]
        )
        oposicion_html = "".join(
            f'<span class="badge" style="background:{BG3};color:{TEXT2};border:1px solid {BORDER};margin-right:3px">{p}</span>'
            for p in comision["partidos_oposicion"]
        )
        card = (
            f'<div class="data-card" style="border-left:3px solid {estado_color}">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">'
            f'<div style="flex:1;margin-right:1rem">'
            f'<div style="font-weight:700;font-size:.95rem;color:{TEXT};line-height:1.4;margin-bottom:.3rem">{comision["nombre"]}</div>'
            f'<div style="font-size:.75rem;color:{MUTED}">Inicio: {comision["inicio"]} &nbsp;&bull;&nbsp; Previsión: {comision["prevision_fin"]} &nbsp;&bull;&nbsp; Presidencia: {comision["presidencia"]}</div>'
            f'</div>'
            f'<div style="text-align:right;flex-shrink:0">'
            f'<div><span class="badge" style="background:{estado_color}25;color:{estado_color};border:1px solid {estado_color}55">{comision["estado"]}</span></div>'
            f'<div style="margin-top:.3rem"><span class="badge" style="background:{rel_color}25;color:{rel_color};border:1px solid {rel_color}55">Relevancia {rel}</span></div>'
            f'</div>'
            f'</div>'
            f'<div style="font-size:.83rem;color:{TEXT2};line-height:1.5;margin-bottom:.5rem">{comision["descripcion"]}</div>'
            f'<div style="background:{BG3};border-radius:6px;padding:.5rem .8rem;margin-bottom:.5rem;font-size:.82rem;border-left:2px solid {CYAN}55">'
            f'<span style="font-weight:600;color:{CYAN}">Últimos avances:</span>'
            f'<span style="color:{TEXT2}"> {comision["ultimos_avances"]}</span>'
            f'</div>'
            f'<div style="display:flex;gap:1.5rem;flex-wrap:wrap">'
            f'<div><div style="font-size:.7rem;color:{MUTED};margin-bottom:.2rem">Impulsada por</div>{impulso_html}</div>'
            f'<div><div style="font-size:.7rem;color:{MUTED};margin-bottom:.2rem">Oposición</div>{oposicion_html}</div>'
            f'</div>'
            f'</div>'
        )
        st.markdown(card, unsafe_allow_html=True)

    # Gráfico
    sec_hdr("Comisiones Impulsadas por Partido", PURPLE)
    conteo_comisiones: dict[str, int] = {}
    for c in COMISIONES_INVESTIGACION:
        for p in c["partidos_impulso"]:
            conteo_comisiones[p] = conteo_comisiones.get(p, 0) + 1
    ord_com = sorted(conteo_comisiones.items(), key=lambda x: x[1], reverse=True)

    fig_com_bar = go.Figure(go.Bar(
        x=[x[0] for x in ord_com],
        y=[x[1] for x in ord_com],
        marker_color=[PARTY_COLORS.get(x[0], MUTED) for x in ord_com],
        text=[x[1] for x in ord_com],
        textposition="outside",
        textfont=dict(color=TEXT2, size=10),
    ))
    fig_com_bar.update_layout(
        height=280,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(title=None, tickfont=dict(color=TEXT2, size=10)),
        yaxis=dict(title="Nº de comisiones", gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
        margin=dict(t=10, b=10),
        showlegend=False,
    )
    st.plotly_chart(fig_com_bar, use_container_width=True)

    st.caption("Fuente: Congreso de los Diputados — datos sintéticos representativos · XV Legislatura")
