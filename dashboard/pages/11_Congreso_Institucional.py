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
from dashboard.shared import sidebar_nav

from dashboard.db import (
    cargar_actividad_reciente_congreso,
    cargar_stats_legislativas,
    cargar_votaciones,
)
from etl.sources.agendas_dinamicas import fetch_all_agendas

NAVY  = "#1E3A5F"
BLUE  = "#2563EB"
LBLUE = "#60A5FA"
PALE  = "#EFF6FF"
WHITE = "#FFFFFF"
SURF  = "#F8FAFC"
BORD  = "#CBD5E1"
TEXT  = "#0F172A"
MUTED = "#64748B"
GREEN = "#10B981"
AMBER = "#F59E0B"
RED   = "#EF4444"
ORANGE = "#F97316"
PURPLE = "#8B5CF6"

PARTY_COLORS = {
    "PP": "#0057A8", "PSOE": "#E4000F", "VOX": "#63BE21",
    "SUMAR": "#E91E8C", "JUNTS": "#00AACC", "ERC": "#FF8000",
    "EH Bildu": "#95C11F", "PNV": "#009F4D", "BNG": "#A0C0E8", "CC": "#FFB61E",
    "Junts": "#00AACC", "OTROS": MUTED,
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
                title = str(getattr(e, "title", "")).strip()
                summary = str(getattr(e, "summary", "")).strip()
                if not title:
                    continue
                rel = "Alta" if any(k in title.lower() for k in ["ley", "real decreto", "presupuesto"]) else "Media"
                items.append({
                    "seccion": "BOE",
                    "organismo": "BOE",
                    "tipo": "Disposición",
                    "numero": "BOE",
                    "titulo": title[:320],
                    "resumen": summary[:420] or "Publicación oficial en BOE.",
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
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    if "resumen" not in df.columns:
        df["resumen"] = "Comunicación oficial agenda/actividad institucional."
    return df.drop_duplicates(subset=["titulo"]).head(limit)

# ── Datos sintéticos ─────────────────────────────────────────────────────────

BOE_HOY = [
    {
        "seccion": "I — Disposiciones generales",
        "organismo": "Ministerio de Hacienda",
        "tipo": "Real Decreto",
        "numero": "RD 412/2026",
        "titulo": "Real Decreto por el que se aprueba el Reglamento de desarrollo de la Ley de Presupuestos Generales del Estado para 2025",
        "resumen": "Desarrolla el marco de ejecución presupuestaria para el ejercicio 2025, incluyendo modificaciones en los límites de gasto de los departamentos ministeriales.",
        "relevancia_politica": "Alta",
    },
    {
        "seccion": "I — Disposiciones generales",
        "organismo": "Ministerio de Trabajo",
        "tipo": "Orden Ministerial",
        "numero": "TM/234/2026",
        "titulo": "Orden por la que se fijan las bases de cotización a la Seguridad Social para el año 2026",
        "resumen": "Actualiza las bases máximas y mínimas de cotización. La base máxima sube un 4,1% respecto a 2025.",
        "relevancia_politica": "Media",
    },
    {
        "seccion": "II — Autoridades y personal",
        "organismo": "Presidencia del Gobierno",
        "tipo": "Real Decreto",
        "numero": "RD 415/2026",
        "titulo": "Real Decreto de nombramiento de la Secretaria de Estado de Digitalización e Inteligencia Artificial",
        "resumen": "Nombramiento de nuevo cargo en la estructura del Ministerio para la Transformación Digital.",
        "relevancia_politica": "Baja",
    },
    {
        "seccion": "III — Otras disposiciones",
        "organismo": "Ministerio de Vivienda",
        "tipo": "Resolución",
        "numero": "VIV/891/2026",
        "titulo": "Resolución por la que se convocan las ayudas del Plan Estatal de Acceso a la Vivienda 2026",
        "resumen": "Convoca 1.200M€ en ayudas para alquiler y compra de primera vivienda para menores de 35 años con renta inferior a 37.800€/año.",
        "relevancia_politica": "Alta",
    },
    {
        "seccion": "V — Anuncios",
        "organismo": "Ministerio de Defensa",
        "tipo": "Licitación",
        "numero": "DEF/2026/045",
        "titulo": "Licitación para la adquisición de 24 vehículos blindados de transporte de personal",
        "resumen": "Contrato de 180M€ en el marco del plan de modernización de las Fuerzas Armadas para cumplir el objetivo del 2% del PIB en defensa.",
        "relevancia_politica": "Media",
    },
]

VOTACIONES_SEMANA = [
    {
        "fecha": "11 abril 2026",
        "tipo": "Proposición de Ley",
        "titulo": "Ley de Vivienda: modificación del artículo 17 sobre contención de alquileres en zonas tensionadas",
        "resultado": "APROBADA",
        "votos_favor": 178,
        "votos_contra": 168,
        "abstenciones": 4,
        "partidos_favor": ["PSOE", "SUMAR", "ERC", "EH Bildu", "BNG"],
        "partidos_contra": ["PP", "VOX"],
        "tema": "Vivienda",
        "implicaciones": "Amplía las zonas tensionadas donde se puede limitar el precio del alquiler a 50 nuevas ciudades.",
    },
    {
        "fecha": "10 abril 2026",
        "tipo": "Moción",
        "titulo": "Moción consecuencia de interpelación al Gobierno sobre política migratoria",
        "resultado": "RECHAZADA",
        "votos_favor": 148,
        "votos_contra": 192,
        "abstenciones": 10,
        "partidos_favor": ["PP", "VOX"],
        "partidos_contra": ["PSOE", "SUMAR", "PNV", "ERC", "EH Bildu", "Junts"],
        "tema": "Inmigración",
        "implicaciones": "El gobierno rechaza los cambios en política de asilo propuestos por PP y VOX.",
    },
    {
        "fecha": "9 abril 2026",
        "tipo": "Proposición No de Ley",
        "titulo": "PNL para instar al gobierno a impulsar la reforma del sistema de financiación autonómica antes de 2027",
        "resultado": "APROBADA",
        "votos_favor": 220,
        "votos_contra": 90,
        "abstenciones": 40,
        "partidos_favor": ["PP", "PSOE", "PNV", "Junts", "ERC"],
        "partidos_contra": ["VOX"],
        "tema": "Financiación Autonómica",
        "implicaciones": "Mayoría transversal exige al gobierno acelerar la reforma del modelo de financiación territorial.",
    },
    {
        "fecha": "8 abril 2026",
        "tipo": "Presupuesto",
        "titulo": "Enmienda a los Presupuestos Generales: dotación adicional para sanidad en 1.800M€",
        "resultado": "APROBADA",
        "votos_favor": 186,
        "votos_contra": 154,
        "abstenciones": 10,
        "partidos_favor": ["PSOE", "SUMAR", "EH Bildu", "ERC", "PNV"],
        "partidos_contra": ["PP", "VOX"],
        "tema": "Sanidad / Presupuestos",
        "implicaciones": "Amplía la dotación para refuerzo de atención primaria y reducción de listas de espera.",
    },
]

AGENDA_SEMANA = {
    "Pedro Sánchez (Presidente)": [
        {"dia": "Lunes 14 abril", "evento": "Consejo de Ministros ordinario", "tipo": "institucional"},
        {"dia": "Martes 15 abril", "evento": "Comparecencia en el Congreso — control al gobierno", "tipo": "parlamento"},
        {"dia": "Miércoles 16 abril", "evento": "Reunión bilateral con el Presidente de la Generalitat de Catalunya", "tipo": "territorial"},
        {"dia": "Jueves 17 abril", "evento": "Cumbre bilateral España-Francia (París)", "tipo": "exterior"},
        {"dia": "Viernes 18 abril", "evento": "Actos conmemorativos 14 de Abril en Madrid", "tipo": "institucional"},
    ],
    "Rey Felipe VI": [
        {"dia": "Lunes 14 abril", "evento": "Despacho ordinario con el Presidente del Gobierno", "tipo": "institucional"},
        {"dia": "Martes 15 abril", "evento": "Audiencias en el Palacio de la Zarzuela", "tipo": "institucional"},
        {"dia": "Jueves 17 abril", "evento": "Reunión con los presidentes autonómicos (Conferencia de Presidentes)", "tipo": "territorial"},
    ],
    "Alberto Núñez Feijóo (Líder PP)": [
        {"dia": "Lunes 14 abril", "evento": "Rueda de prensa tras el Consejo de Ministros — respuesta oposición", "tipo": "partido"},
        {"dia": "Martes 15 abril", "evento": "Intervención en el Pleno del Congreso", "tipo": "parlamento"},
        {"dia": "Miércoles 16 abril", "evento": "Reunión de la Junta Directiva Nacional del PP", "tipo": "partido"},
    ],
    "Santiago Abascal (Líder VOX)": [
        {"dia": "Martes 15 abril", "evento": "Interpelación al Gobierno sobre política migratoria en el Pleno", "tipo": "parlamento"},
        {"dia": "Jueves 17 abril", "evento": "Mitin en Sevilla — actos 18 de Julio", "tipo": "partido"},
    ],
    "Yolanda Díaz (Vicepresidenta / SUMAR)": [
        {"dia": "Lunes 14 abril", "evento": "Consejo de Ministros — presentación de reforma del Estatuto de los Trabajadores", "tipo": "gobierno"},
        {"dia": "Miércoles 16 abril", "evento": "Reunión con sindicatos CCOO y UGT — mesa de negociación social", "tipo": "laboral"},
        {"dia": "Viernes 18 abril", "evento": "Foro económico — Jornadas de Economía Social", "tipo": "social"},
    ],
}

LEYES_LEGISLATURA = [
    {
        "nombre": "Ley Orgánica de Amnistía",
        "numero": "LO 1/2026",
        "fecha_aprobacion": "Enero 2026",
        "ministerio": "Ministerio de Justicia",
        "descripcion": "Amnistía a los condenados por el procés independentista catalán de 2017. Afecta a más de 400 personas.",
        "relevancia": "Muy Alta",
        "estado": "En vigor",
        "apoyos": ["PSOE", "SUMAR", "ERC", "Junts", "EH Bildu", "BNG"],
        "oposicion": ["PP", "VOX"],
        "votos_favor": 178,
        "votos_contra": 172,
    },
    {
        "nombre": "Ley de Vivienda — Segunda Reforma",
        "numero": "Ley 3/2026",
        "fecha_aprobacion": "Febrero 2026",
        "ministerio": "Ministerio de Vivienda",
        "descripcion": "Amplía las zonas de mercado residencial tensionado. Permite a las CCAA fijar índices de referencia de precio del alquiler.",
        "relevancia": "Alta",
        "estado": "En vigor",
        "apoyos": ["PSOE", "SUMAR", "EH Bildu", "ERC"],
        "oposicion": ["PP", "VOX", "Junts"],
        "votos_favor": 181,
        "votos_contra": 169,
    },
    {
        "nombre": "Ley de Inteligencia Artificial",
        "numero": "Ley 4/2026",
        "fecha_aprobacion": "Febrero 2026",
        "ministerio": "Ministerio para la Transformación Digital",
        "descripcion": "Transpone el Reglamento europeo de IA. Crea la Agencia Española de Supervisión de la Inteligencia Artificial (AESIA).",
        "relevancia": "Alta",
        "estado": "En vigor",
        "apoyos": ["PSOE", "SUMAR", "PP", "PNV"],
        "oposicion": ["VOX"],
        "votos_favor": 280,
        "votos_contra": 58,
    },
    {
        "nombre": "Ley de Familias",
        "numero": "Ley 5/2026",
        "fecha_aprobacion": "Marzo 2026",
        "ministerio": "Ministerio de Derechos Sociales",
        "descripcion": "Permiso parental de 5 días, prestación por hijos a cargo, reconocimiento de nuevos modelos de familia.",
        "relevancia": "Media",
        "estado": "En vigor",
        "apoyos": ["PSOE", "SUMAR", "PNV", "ERC", "EH Bildu"],
        "oposicion": ["PP", "VOX"],
        "votos_favor": 184,
        "votos_contra": 166,
    },
    {
        "nombre": "Reforma del Código Penal — Delitos económicos",
        "numero": "LO 2/2026",
        "fecha_aprobacion": "Marzo 2026",
        "ministerio": "Ministerio de Justicia",
        "descripcion": "Agrava las penas por corrupción pública, malversación y fraude fiscal. Elimina la prescripción para los delitos de corrupción más graves.",
        "relevancia": "Alta",
        "estado": "En vigor",
        "apoyos": ["PSOE", "SUMAR", "PP", "PNV", "ERC"],
        "oposicion": ["VOX"],
        "votos_favor": 290,
        "votos_contra": 50,
    },
    {
        "nombre": "Ley de Memoria Democrática — Reglamento de desarrollo",
        "numero": "RD 187/2026",
        "fecha_aprobacion": "Enero 2026",
        "ministerio": "Ministerio de la Presidencia",
        "descripcion": "Desarrolla el mapa de fosas comunes, crea el censo de víctimas del franquismo y regula las ayudas a familiares.",
        "relevancia": "Media",
        "estado": "En vigor",
        "apoyos": ["PSOE", "SUMAR", "EH Bildu", "ERC"],
        "oposicion": ["PP", "VOX"],
        "votos_favor": 180,
        "votos_contra": 170,
    },
    {
        "nombre": "Ley de Presupuestos Generales del Estado 2026",
        "numero": "Ley 6/2026",
        "fecha_aprobacion": "Abril 2026",
        "ministerio": "Ministerio de Hacienda",
        "descripcion": "PGE 2026 con un gasto total de 587.000M€. Incremento del 5,2% respecto a 2025. Prioriza sanidad, educación y defensa.",
        "relevancia": "Muy Alta",
        "estado": "Aprobados — en tramitación reglamentos",
        "apoyos": ["PSOE", "SUMAR", "PNV", "EH Bildu"],
        "oposicion": ["PP", "VOX", "Junts", "ERC"],
        "votos_favor": 176,
        "votos_contra": 174,
    },
]

COMISIONES_INVESTIGACION = [
    {
        "nombre": "Comisión de investigación sobre el uso de Pegasus y el espionaje a líderes independentistas",
        "estado": "Activa",
        "inicio": "Octubre 2025",
        "prevision_fin": "Octubre 2026",
        "presidencia": "PSOE",
        "partidos_impulso": ["ERC", "Junts", "EH Bildu"],
        "partidos_oposicion": ["PP", "VOX"],
        "descripcion": "Investiga el uso del spyware Pegasus para interceptar comunicaciones de dirigentes del movimiento independentista catalán y vasco. Ha llamado a declarar a exdirectores del CNI.",
        "relevancia_politica": "Muy Alta",
        "ultimos_avances": "Comparecencia del exdirector del CNI (febrero 2026). Petición de documentación clasificada al Gobierno pendiente de resolución.",
    },
    {
        "nombre": "Comisión de investigación sobre la gestión de la DANA de Valencia (noviembre 2024)",
        "estado": "Activa",
        "inicio": "Enero 2026",
        "prevision_fin": "Julio 2026",
        "presidencia": "PP",
        "partidos_impulso": ["PP", "VOX"],
        "partidos_oposicion": ["PSOE", "SUMAR"],
        "descripcion": "Examina la actuación del Gobierno central, la Generalitat Valenciana y los servicios de emergencia ante la catástrofe que causó más de 220 muertos.",
        "relevancia_politica": "Alta",
        "ultimos_avances": "Comparecencia del ministro del Interior (marzo 2026). Debate sobre la petición de comparecencia del Presidente de la Generalitat.",
    },
    {
        "nombre": "Comisión de investigación sobre el contrato de mascarillas (Soluciones de Gestión SL)",
        "estado": "Cerrada — Informe final aprobado",
        "inicio": "Septiembre 2024",
        "prevision_fin": "Diciembre 2025",
        "presidencia": "PP",
        "partidos_impulso": ["PP", "VOX"],
        "partidos_oposicion": ["PSOE", "SUMAR"],
        "descripcion": "Investigó la adjudicación irregular de contratos de mascarillas durante el COVID-19. El informe final señala irregularidades en el procedimiento pero no delito penal.",
        "relevancia_politica": "Media",
        "ultimos_avances": "Informe final aprobado en diciembre 2025 con votos divididos. PSOE y SUMAR presentaron voto particular.",
    },
    {
        "nombre": "Comisión de investigación sobre la financiación de VOX",
        "estado": "En tramitación",
        "inicio": "Marzo 2026",
        "prevision_fin": "Pendiente de constitución formal",
        "presidencia": "Por determinar",
        "partidos_impulso": ["PSOE", "SUMAR", "EH Bildu"],
        "partidos_oposicion": ["PP", "VOX"],
        "descripcion": "Investigará la presunta financiación irregular de VOX por parte de entidades vinculadas a Irán y a fondos de origen opaco en varios países.",
        "relevancia_politica": "Alta",
        "ultimos_avances": "Aprobada la creación por mayoría simple en marzo 2026. PP se abstuvo. VOX la impugna ante el Tribunal Constitucional.",
    },
]

# ── Config y estilos ──────────────────────────────────────────────────────────
st.set_page_config(page_title="Congreso — ElectSim", layout="wide")

sidebar_nav()

st.markdown(f"""
<style>
body, .stApp {{ background: {WHITE}; color: {TEXT}; }}
.section-title {{
    font-size:.75rem;font-weight:700;color:{MUTED};
    letter-spacing:.1em;text-transform:uppercase;
    border-bottom:2px solid {PALE};padding-bottom:.4rem;margin:1.5rem 0 1rem;
}}
.boe-card {{
    background:{WHITE};border:1px solid {BORD};border-radius:10px;
    padding:.9rem 1.1rem;margin-bottom:.6rem;
    border-left:4px solid {BLUE};
}}
.boe-card-alta {{ border-left-color: {RED} !important; }}
.boe-card-media {{ border-left-color: {AMBER} !important; }}
.boe-card-baja {{ border-left-color: {BORD} !important; }}
.votacion-card {{
    background:{WHITE};border:1px solid {BORD};border-radius:10px;
    padding:.9rem 1.1rem;margin-bottom:.7rem;
}}
.agenda-card {{
    background:{SURF};border:1px solid {BORD};border-radius:8px;
    padding:.6rem .9rem;margin:.3rem 0;
    border-left:3px solid {BLUE};
}}
.ley-card {{
    background:{WHITE};border:1px solid {BORD};border-radius:10px;
    padding:.9rem 1.1rem;margin-bottom:.6rem;
}}
.comision-card {{
    background:{WHITE};border:1px solid {BORD};border-radius:10px;
    padding:1rem 1.2rem;margin-bottom:.7rem;
}}
.badge {{
    display:inline-block;
    padding:.15rem .5rem;
    border-radius:4px;
    font-size:.7rem;
    font-weight:600;
    letter-spacing:.04em;
}}
</style>
""", unsafe_allow_html=True)

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="background:linear-gradient(135deg,{NAVY} 0%,{BLUE} 100%);
            color:white;padding:1.8rem 2.2rem;border-radius:16px;margin-bottom:1.5rem">
    <div style="font-size:1.5rem;font-weight:800">Congreso & Actividad Institucional</div>
    <div style="opacity:.8;font-size:.88rem;margin-top:.2rem">
        XV Legislatura · BOE, votaciones semanales, agenda de decisores, leyes aprobadas y comisiones de investigación
    </div>
</div>
""", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_boe, tab_votaciones, tab_agenda, tab_comunicados, tab_leyes, tab_comisiones = st.tabs([
    "BOE de Hoy",
    "Votaciones de la Semana",
    "Agenda de Decisores",
    "Comunicados Oficiales",
    "Leyes Aprobadas",
    "Comisiones de Investigación",
])

# ── Tab 1: BOE de Hoy ────────────────────────────────────────────────────────
with tab_boe:
    boe_real = cargar_boe_hoy_real()
    boe_data = boe_real if boe_real else BOE_HOY
    st.markdown(f"""
    <div style="background:{SURF};border:1px solid {BORD};border-radius:8px;padding:.8rem 1rem;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center">
        <div>
            <span style="font-weight:700;font-size:.95rem;color:{TEXT}">Boletín Oficial del Estado</span>
            <span style="margin-left:.8rem;font-size:.82rem;color:{MUTED}">Lunes, 13 de abril de 2026 · Núm. 89</span>
        </div>
        <span class="badge" style="background:{BLUE};color:{WHITE}">5 disposiciones relevantes</span>
    </div>
    """, unsafe_allow_html=True)

    # KPIs
    total_boe = len(boe_data)
    alta = sum(1 for b in boe_data if b["relevancia_politica"] == "Alta")
    media = sum(1 for b in boe_data if b["relevancia_politica"] == "Media")
    baja = sum(1 for b in boe_data if b["relevancia_politica"] == "Baja")

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

    # Filtro por sección
    secciones_boe = ["Todas"] + sorted(list({b["seccion"] for b in boe_data}))
    seccion_sel = st.selectbox("Filtrar por sección", secciones_boe)
    relevancia_sel = st.selectbox("Filtrar por relevancia política", ["Todas", "Alta", "Media", "Baja"])

    boe_mostrar = boe_data
    if seccion_sel != "Todas":
        boe_mostrar = [b for b in boe_mostrar if b["seccion"] == seccion_sel]
    if relevancia_sel != "Todas":
        boe_mostrar = [b for b in boe_mostrar if b["relevancia_politica"] == relevancia_sel]

    for item in boe_mostrar:
        rel = item["relevancia_politica"]
        rel_color = RED if rel == "Alta" else AMBER if rel == "Media" else MUTED
        rel_bg = "#FEF2F2" if rel == "Alta" else "#FFFBEB" if rel == "Media" else SURF
        css_rel = f"boe-card-{rel.lower()}"
        st.markdown(f"""
        <div class="boe-card {css_rel}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.4rem">
                <div style="flex:1">
                    <span class="badge" style="background:{PALE};color:{NAVY};margin-right:.5rem">{item['numero']}</span>
                    <span class="badge" style="background:{SURF};color:{MUTED}">{item['tipo']}</span>
                </div>
                <span class="badge" style="background:{rel_bg};color:{rel_color};flex-shrink:0">
                    Relevancia {rel}
                </span>
            </div>
            <div style="font-weight:700;font-size:.9rem;color:{TEXT};margin-bottom:.3rem;line-height:1.4">
                {item['titulo']}
            </div>
            <div style="font-size:.78rem;color:{MUTED};margin-bottom:.3rem">
                {item['organismo']} &nbsp;&bull;&nbsp; {item['seccion']}
            </div>
            <div style="font-size:.82rem;color:{TEXT};line-height:1.5">
                {item['resumen']}
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.caption("Fuente: BOE RSS en tiempo real (fallback sintético si falla el feed).")

# ── Tab 2: Votaciones de la Semana ───────────────────────────────────────────
with tab_votaciones:
    st.markdown('<div class="section-title">Votaciones del Pleno — Semana del 7 al 11 de abril de 2026</div>', unsafe_allow_html=True)

    # KPIs votaciones
    aprobadas = sum(1 for v in VOTACIONES_SEMANA if v["resultado"] == "APROBADA")
    rechazadas = sum(1 for v in VOTACIONES_SEMANA if v["resultado"] == "RECHAZADA")
    total_vot = len(VOTACIONES_SEMANA)

    kv1, kv2, kv3 = st.columns(3)
    with kv1:
        st.metric("Votaciones esta semana", total_vot)
    with kv2:
        st.metric("Aprobadas", aprobadas)
    with kv3:
        st.metric("Rechazadas", rechazadas)

    st.divider()

    # Timeline de votaciones
    st.markdown('<div class="section-title">Línea Temporal</div>', unsafe_allow_html=True)

    fig_vot_timeline = go.Figure()
    for i, v in enumerate(VOTACIONES_SEMANA):
        color = GREEN if v["resultado"] == "APROBADA" else RED
        total = v["votos_favor"] + v["votos_contra"] + v["abstenciones"] or 1
        fig_vot_timeline.add_trace(go.Scatter(
            x=[v["fecha"]],
            y=[i],
            mode="markers+text",
            marker=dict(size=22, color=color, line=dict(color=WHITE, width=2)),
            text=[v["resultado"]],
            textposition="middle right",
            textfont=dict(size=9, color=TEXT),
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
        height=220, paper_bgcolor=WHITE, plot_bgcolor=SURF,
        xaxis=dict(title=None, showgrid=False, tickfont=dict(size=10)),
        yaxis=dict(
            tickvals=list(range(len(VOTACIONES_SEMANA))),
            ticktext=[v["titulo"][:50] + "..." if len(v["titulo"]) > 50 else v["titulo"] for v in VOTACIONES_SEMANA],
            tickfont=dict(size=9),
            title=None,
        ),
        margin=dict(t=10, b=10, l=340, r=80),
        showlegend=False,
    )
    st.plotly_chart(fig_vot_timeline, use_container_width=True)

    # Detalle de cada votación
    st.markdown('<div class="section-title">Detalle por Votación</div>', unsafe_allow_html=True)

    for v in VOTACIONES_SEMANA:
        res_color = GREEN if v["resultado"] == "APROBADA" else RED
        res_bg = "#F0FDF4" if v["resultado"] == "APROBADA" else "#FEF2F2"
        total = v["votos_favor"] + v["votos_contra"] + v["abstenciones"] or 1
        pct_favor = v["votos_favor"] / total * 100
        pct_contra = v["votos_contra"] / total * 100

        partidos_favor_html = "".join(
            f'<span class="badge" style="background:{PARTY_COLORS.get(p,"#eee")};color:{WHITE};margin-right:3px">{p}</span>'
            for p in v["partidos_favor"]
        )
        partidos_contra_html = "".join(
            f'<span class="badge" style="background:{SURF};color:{TEXT};border:1px solid {BORD};margin-right:3px">{p}</span>'
            for p in v["partidos_contra"]
        )

        with st.expander(f"{v['fecha']}  —  {v['titulo'][:70]}{'...' if len(v['titulo']) > 70 else ''}", expanded=False):
            col_info, col_donut = st.columns([2, 1])
            with col_info:
                st.markdown(f"""
                <div style="margin-bottom:.5rem">
                    <span class="badge" style="background:{PALE};color:{NAVY};margin-right:.4rem">{v['tipo']}</span>
                    <span class="badge" style="background:{SURF};color:{MUTED};margin-right:.4rem">{v['tema']}</span>
                    <span class="badge" style="background:{res_bg};color:{res_color};font-size:.78rem">{v['resultado']}</span>
                </div>
                <div style="font-weight:700;font-size:.95rem;color:{TEXT};margin-bottom:.5rem">{v['titulo']}</div>
                <div style="margin-bottom:.5rem">
                    <div style="font-size:.75rem;color:{MUTED};margin-bottom:.2rem">A favor ({v['votos_favor']} votos)</div>
                    {partidos_favor_html}
                </div>
                <div style="margin-bottom:.5rem">
                    <div style="font-size:.75rem;color:{MUTED};margin-bottom:.2rem">En contra ({v['votos_contra']} votos)</div>
                    {partidos_contra_html}
                </div>
                <div style="font-size:.82rem;color:{TEXT};background:{SURF};border-radius:6px;padding:.5rem .8rem;margin-top:.4rem">
                    <b>Implicaciones:</b> {v['implicaciones']}
                </div>
                """, unsafe_allow_html=True)

                # Barra de resultado
                st.markdown(f"""
                <div style="margin-top:.6rem;border-radius:4px;overflow:hidden;height:8px;background:{BORD}">
                    <div style="background:{GREEN};width:{pct_favor:.1f}%;height:8px;display:inline-block;border-radius:4px 0 0 4px"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:.7rem;color:{MUTED};margin-top:.2rem">
                    <span>A favor {pct_favor:.1f}%</span>
                    <span>Abs. {v['abstenciones']}</span>
                    <span>En contra {pct_contra:.1f}%</span>
                </div>
                """, unsafe_allow_html=True)

            with col_donut:
                fig_donut_vot = go.Figure(go.Pie(
                    labels=["A favor", "En contra", "Abstención"],
                    values=[v["votos_favor"], v["votos_contra"], v["abstenciones"]],
                    marker_colors=[GREEN, RED, AMBER],
                    hole=0.5,
                    textinfo="value",
                    textfont=dict(size=11),
                ))
                fig_donut_vot.update_layout(
                    height=200, paper_bgcolor=WHITE,
                    margin=dict(t=5, b=5, l=5, r=5),
                    showlegend=True,
                    legend=dict(font=dict(size=9), orientation="v"),
                    annotations=[dict(text=f"{v['votos_favor']}/{total}", x=0.5, y=0.5,
                                      font_size=11, showarrow=False, font_color=MUTED)],
                )
                st.plotly_chart(fig_donut_vot, use_container_width=True)

    st.caption("Fuente: Congreso de los Diputados — datos sintéticos representativos semana del 7-11 abril 2026")

# ── Tab 3: Agenda de Decisores ───────────────────────────────────────────────
with tab_agenda:
    st.markdown(f"""
    <div style="background:{SURF};border:1px solid {BORD};border-radius:8px;padding:.7rem 1rem;margin-bottom:1rem">
        <span style="font-weight:700;font-size:.92rem;color:{TEXT}">Agenda institucional y política</span>
        <span style="margin-left:.8rem;font-size:.82rem;color:{MUTED}">Semana del 14 al 18 de abril de 2026</span>
    </div>
    """, unsafe_allow_html=True)

    TIPO_COLORS = {
        "institucional": NAVY,
        "parlamento": BLUE,
        "territorial": AMBER,
        "exterior": PURPLE,
        "partido": "#DC2626",
        "gobierno": GREEN,
        "laboral": "#0891B2",
        "social": "#059669",
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
                st.markdown(f"""
                <div class="agenda-card" style="border-left-color:{tipo_color}">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <span style="font-size:.75rem;font-weight:600;color:{MUTED};margin-right:.6rem">{ev['dia']}</span>
                            <span style="font-size:.88rem;color:{TEXT}">{ev['evento']}</span>
                        </div>
                        <span class="badge" style="background:{tipo_color}22;color:{tipo_color};margin-left:.8rem;flex-shrink:0">
                            {ev['tipo']}
                        </span>
                    </div>
                </div>
                """, unsafe_allow_html=True)

    # Gráfico: distribución de tipos de acto por decisor
    st.markdown('<div class="section-title">Distribución de Actividad por Tipo</div>', unsafe_allow_html=True)

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
        ))
        fig_tipos_agenda.update_layout(
            height=280, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
            xaxis=dict(title=None),
            yaxis=dict(title="Numero de actos", gridcolor=BORD),
            margin=dict(t=10, b=10),
            showlegend=False,
        )
        st.plotly_chart(fig_tipos_agenda, use_container_width=True)

    st.caption("Agenda sintética representativa — semana del 14-18 abril 2026")

# ── Tab 4: Comunicados oficiales ─────────────────────────────────────────────
with tab_comunicados:
    st.markdown('<div class="section-title">Comunicados y Notas Oficiales (semana actual)</div>', unsafe_allow_html=True)
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
            st.markdown(
                f"""
                <div style="background:{WHITE};border:1px solid {BORD};border-radius:8px;padding:.7rem .9rem;margin-bottom:.5rem">
                    <div style="font-weight:700;color:{TEXT};font-size:.9rem">{row.get('titulo','')}</div>
                    <div style="font-size:.75rem;color:{MUTED};margin:.25rem 0">{row.get('fuente','')} · {row.get('fecha','')}</div>
                    <div style="font-size:.8rem;color:{TEXT};line-height:1.45">{row.get('cita', row.get('resumen',''))}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

# ── Tab 4: Leyes Aprobadas esta Legislatura ──────────────────────────────────
with tab_leyes:
    st.markdown('<div class="section-title">Leyes y Normas Aprobadas — XV Legislatura (2023-2026)</div>', unsafe_allow_html=True)

    # KPIs
    kl1, kl2, kl3, kl4 = st.columns(4)
    muy_alta = sum(1 for l in LEYES_LEGISLATURA if l["relevancia"] == "Muy Alta")
    alta_l = sum(1 for l in LEYES_LEGISLATURA if l["relevancia"] == "Alta")
    media_l = sum(1 for l in LEYES_LEGISLATURA if l["relevancia"] == "Media")
    with kl1:
        st.metric("Total normas destacadas", len(LEYES_LEGISLATURA))
    with kl2:
        st.metric("Relevancia Muy Alta", muy_alta)
    with kl3:
        st.metric("Relevancia Alta", alta_l)
    with kl4:
        st.metric("Relevancia Media", media_l)

    st.divider()

    # Gráficos de apoyo
    col_ley1, col_ley2 = st.columns(2)
    with col_ley1:
        st.markdown('<div class="section-title">Margen de Aprobación por Ley</div>', unsafe_allow_html=True)
        nombres_cortos = [l["nombre"][:35] + "..." if len(l["nombre"]) > 35 else l["nombre"] for l in LEYES_LEGISLATURA]
        margenes = [l["votos_favor"] - l["votos_contra"] for l in LEYES_LEGISLATURA]
        colores_margen = [GREEN if m > 0 else RED for m in margenes]
        fig_margen = go.Figure(go.Bar(
            x=margenes,
            y=nombres_cortos,
            orientation="h",
            marker_color=colores_margen,
            text=[f"+{m}" if m > 0 else str(m) for m in margenes],
            textposition="outside",
        ))
        fig_margen.update_layout(
            height=320, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
            xaxis=dict(title="Diferencia votos (favor - contra)", zeroline=True, zerolinecolor=MUTED, gridcolor=BORD),
            yaxis=dict(title=None, tickfont=dict(size=9)),
            margin=dict(t=10, b=10, l=10, r=60),
            showlegend=False,
        )
        st.plotly_chart(fig_margen, use_container_width=True)

    with col_ley2:
        st.markdown('<div class="section-title">Apoyos y Oposición por Ley</div>', unsafe_allow_html=True)
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
            height=320, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
            xaxis=dict(title=None, tickfont=dict(size=8), tickangle=-25),
            yaxis=dict(title="Votos", gridcolor=BORD, zeroline=True, zerolinecolor=MUTED),
            legend=dict(orientation="h", y=1.05),
            margin=dict(t=30, b=60),
        )
        st.plotly_chart(fig_apoyos, use_container_width=True)

    # Detalle de leyes
    st.markdown('<div class="section-title">Detalle de Normas Aprobadas</div>', unsafe_allow_html=True)

    relevancia_ley_sel = st.selectbox("Filtrar por relevancia", ["Todas", "Muy Alta", "Alta", "Media"], key="rel_ley")
    leyes_mostrar = LEYES_LEGISLATURA if relevancia_ley_sel == "Todas" else [
        l for l in LEYES_LEGISLATURA if l["relevancia"] == relevancia_ley_sel
    ]

    for ley in leyes_mostrar:
        rel = ley["relevancia"]
        rel_color = RED if rel == "Muy Alta" else ORANGE if rel == "Alta" else AMBER
        margen = ley["votos_favor"] - ley["votos_contra"]
        apoyos_html = "".join(
            f'<span class="badge" style="background:{PARTY_COLORS.get(p,"#eee")};color:{WHITE};margin-right:3px">{p}</span>'
            for p in ley["apoyos"]
        )
        oposicion_html = "".join(
            f'<span class="badge" style="background:{SURF};color:{TEXT};border:1px solid {BORD};margin-right:3px">{p}</span>'
            for p in ley["oposicion"]
        )
        st.markdown(f"""
        <div class="ley-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.4rem">
                <div>
                    <span class="badge" style="background:{PALE};color:{NAVY};margin-right:.4rem">{ley['numero']}</span>
                    <span class="badge" style="background:{SURF};color:{MUTED};margin-right:.4rem">{ley['fecha_aprobacion']}</span>
                    <span class="badge" style="background:{SURF};color:{rel_color}">Relevancia {rel}</span>
                </div>
                <span class="badge" style="background:{'#F0FDF4' if margen > 0 else '#FEF2F2'};color:{'#166534' if margen > 0 else '#991B1B'}">
                    {'+'}{margen} votos
                </span>
            </div>
            <div style="font-weight:700;font-size:.95rem;color:{TEXT};margin-bottom:.3rem">{ley['nombre']}</div>
            <div style="font-size:.78rem;color:{MUTED};margin-bottom:.4rem">{ley['ministerio']} &nbsp;&bull;&nbsp; Estado: {ley['estado']}</div>
            <div style="font-size:.82rem;color:{TEXT};margin-bottom:.5rem;line-height:1.5">{ley['descripcion']}</div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
                <div>
                    <div style="font-size:.7rem;color:{MUTED};margin-bottom:.2rem">A favor</div>
                    {apoyos_html}
                </div>
                <div>
                    <div style="font-size:.7rem;color:{MUTED};margin-bottom:.2rem">En contra</div>
                    {oposicion_html}
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.caption("Selección de normas destacadas de la XV Legislatura — datos sintéticos representativos")

# ── Tab 5: Comisiones de Investigación ───────────────────────────────────────
with tab_comisiones:
    st.markdown('<div class="section-title">Comisiones de Investigación — XV Legislatura</div>', unsafe_allow_html=True)

    ESTADO_COLORS = {
        "Activa": GREEN,
        "En tramitación": AMBER,
        "Cerrada — Informe final aprobado": MUTED,
    }

    # KPIs
    activas = sum(1 for c in COMISIONES_INVESTIGACION if c["estado"] == "Activa")
    en_tram = sum(1 for c in COMISIONES_INVESTIGACION if c["estado"] == "En tramitación")
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
        rel = comision["relevancia_politica"]
        rel_color = RED if rel == "Muy Alta" else ORANGE if rel == "Alta" else AMBER

        impulso_html = "".join(
            f'<span class="badge" style="background:{PARTY_COLORS.get(p,"#eee")};color:{WHITE};margin-right:3px">{p}</span>'
            for p in comision["partidos_impulso"]
        )
        oposicion_html = "".join(
            f'<span class="badge" style="background:{SURF};color:{TEXT};border:1px solid {BORD};margin-right:3px">{p}</span>'
            for p in comision["partidos_oposicion"]
        )

        st.markdown(f"""
        <div class="comision-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">
                <div style="flex:1;margin-right:1rem">
                    <div style="font-weight:700;font-size:.95rem;color:{TEXT};line-height:1.4;margin-bottom:.3rem">
                        {comision['nombre']}
                    </div>
                    <div style="font-size:.75rem;color:{MUTED}">
                        Inicio: {comision['inicio']} &nbsp;&bull;&nbsp;
                        Previsión de fin: {comision['prevision_fin']} &nbsp;&bull;&nbsp;
                        Presidencia: {comision['presidencia']}
                    </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                    <div><span class="badge" style="background:{estado_color}22;color:{estado_color}">{comision['estado']}</span></div>
                    <div style="margin-top:.3rem"><span class="badge" style="background:{SURF};color:{rel_color}">Relevancia {rel}</span></div>
                </div>
            </div>
            <div style="font-size:.83rem;color:{TEXT};line-height:1.5;margin-bottom:.5rem">{comision['descripcion']}</div>
            <div style="background:{SURF};border-radius:6px;padding:.5rem .8rem;margin-bottom:.5rem;font-size:.82rem">
                <span style="font-weight:600;color:{TEXT}">Últimos avances:</span>
                <span style="color:{MUTED}"> {comision['ultimos_avances']}</span>
            </div>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
                <div>
                    <div style="font-size:.7rem;color:{MUTED};margin-bottom:.2rem">Impulsada por</div>
                    {impulso_html}
                </div>
                <div>
                    <div style="font-size:.7rem;color:{MUTED};margin-bottom:.2rem">Oposición</div>
                    {oposicion_html}
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # Gráfico: comisiones por partido impulsador
    st.markdown('<div class="section-title">Comisiones Impulsadas por Partido</div>', unsafe_allow_html=True)

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
    ))
    fig_com_bar.update_layout(
        height=280, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
        xaxis=dict(title=None),
        yaxis=dict(title="Numero de comisiones impulsadas", gridcolor=BORD),
        margin=dict(t=10, b=10),
        showlegend=False,
    )
    st.plotly_chart(fig_com_bar, use_container_width=True)

    st.caption("Fuente: Congreso de los Diputados — datos sintéticos representativos · XV Legislatura")
