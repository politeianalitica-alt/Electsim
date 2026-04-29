"""
ELECTSIM — Briefings Diarios IA
=================================
Dashboard ejecutivo de inteligencia politica. Genera un briefing completo con
IA (Politeia Brain / Claude), feed de noticias con sentimiento, narrativas
tendencia, watchlist y preguntas estrategicas. Exportacion PDF/TXT.
"""
from __future__ import annotations
import sys
import io
import json
import datetime
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card, COLORES_PARTIDOS,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Briefings Diarios IA — Politeia",
    page_icon="📋",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()
mostrar_alertas_pagina("D1_Briefings")

# ── Servicios externos ────────────────────────────────────────────────────────
try:
    from dashboard.services import llm_local as _llm
    _LLM_OK = _llm.esta_disponible()
    _STATUS_LLM = _llm.disponible()
    _MODELO = _llm.modelo_principal()
except Exception:
    _LLM_OK = False
    _STATUS_LLM = {"ollama": False, "claude_api": False}
    _MODELO = "no disponible"

try:
    from dashboard.services.news_crawler import cargar_noticias as _cargar_noticias
    _CRAWLER_OK = True
except Exception:
    _CRAWLER_OK = False
    def _cargar_noticias(*a, **kw):
        return []

try:
    from dashboard.services.nlp_service import resumen_sentimiento_partidos as _sent_partidos
    _NLP_OK = True
except Exception:
    _NLP_OK = False
    def _sent_partidos(*a, **kw):
        return {}

try:
    from dashboard.services.boe_api import obtener_sumario as _boe_sumario, clasificar_impacto as _boe_impacto
    _BOE_OK = True
except Exception:
    _BOE_OK = False
    def _boe_sumario():
        return []
    def _boe_impacto(*a, **kw):
        return "NORMAL"

# ── CSS personalizado ─────────────────────────────────────────────────────────
st.markdown(f"""
<style>
[data-testid="stAppViewContainer"] {{background: {BG};}}
.risk-bar {{
  display: flex; gap: .5rem; align-items: center;
  background: {BG2}; border: 1px solid {BORDER}; border-radius: 12px;
  padding: .7rem 1.2rem; margin-bottom: 1rem;
}}
.risk-module {{
  display: flex; flex-direction: column; align-items: center;
  min-width: 90px;
}}
.risk-dot {{
  width: 10px; height: 10px; border-radius: 50%;
  margin-bottom: 3px;
}}
.risk-label {{
  font-size: .55rem; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: {MUTED};
}}
.briefing-box {{
  background: linear-gradient(135deg, {BG2}, {BG3});
  border: 1px solid {BORDER}; border-left: 3px solid {CYAN};
  border-radius: 12px; padding: 1.4rem 1.6rem;
  color: {TEXT}; font-size: .88rem; line-height: 1.7;
}}
.noticia-card {{
  background: {BG2}; border: 1px solid {BORDER};
  border-radius: 10px; padding: .8rem 1rem; margin-bottom: .5rem;
}}
.noticia-titulo {{
  font-size: .82rem; font-weight: 700; color: {TEXT}; margin-bottom: .25rem;
}}
.noticia-meta {{
  font-size: .65rem; color: {MUTED}; display: flex; gap: .8rem;
}}
.sent-badge {{
  display: inline-block; border-radius: 6px;
  padding: 2px 7px; font-size: .6rem; font-weight: 800;
  letter-spacing: .07em; text-transform: uppercase;
}}
.sent-pos  {{background: {GREEN}22; color: {GREEN}; border: 1px solid {GREEN}44;}}
.sent-neg  {{background: {RED}22;   color: {RED};   border: 1px solid {RED}44;}}
.sent-neu  {{background: {MUTED}22; color: {TEXT2}; border: 1px solid {MUTED}44;}}
.narrativa-card {{
  background: {BG3}; border: 1px solid {BORDER};
  border-radius: 10px; padding: .8rem 1rem; margin-bottom: .5rem;
  border-left: 3px solid {PURPLE};
}}
.q-card {{
  background: linear-gradient(135deg, {PURPLE}11, {BG2});
  border: 1px solid {PURPLE}44; border-radius: 10px;
  padding: .8rem 1.1rem; margin-bottom: .5rem;
  font-size: .82rem; color: {TEXT}; line-height: 1.5;
}}
.watchlist-item {{
  background: {BG3}; border: 1px solid {BORDER};
  border-radius: 8px; padding: .6rem .9rem; margin-bottom: .4rem;
  font-size: .8rem; color: {TEXT};
}}
.module-status-card {{
  background: {BG2}; border: 1px solid {BORDER};
  border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: .5rem;
}}
.ms-name {{font-size: .75rem; font-weight: 800; color: {TEXT}; margin-bottom: .2rem;}}
.ms-status {{font-size: .62rem; color: {MUTED};}}
.audio-placeholder {{
  background: linear-gradient(135deg, {BLUE}11, {BG2});
  border: 1px dashed {BLUE}66; border-radius: 12px;
  padding: 1rem 1.2rem; text-align: center;
  color: {TEXT2}; font-size: .8rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Datos con cache ───────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def _get_noticias(n: int = 20):
    try:
        return _cargar_noticias(max_noticias=n)
    except Exception:
        return []


@st.cache_data(ttl=300)
def _get_boe():
    try:
        return _boe_sumario()
    except Exception:
        return []


@st.cache_data(ttl=300)
def _get_sentimiento(noticias_json: str):
    try:
        noticias = json.loads(noticias_json)
        return _sent_partidos(noticias)
    except Exception:
        return {}


@st.cache_data(ttl=600)
def _gen_briefing(contexto: str) -> str:
    if not _LLM_OK:
        return (
            "**Briefing no disponible** — Politeia Brain no esta conectado. "
            "Inicia Ollama (`ollama serve`) o configura tu clave Claude API "
            "para generar el briefing automatico.\n\n"
            "Mientras tanto, revisa el feed de noticias y los modulos de estado "
            "para el resumen de situacion politica actual."
        )
    try:
        prompt = (
            "Actua como analista politico senior especializado en Espana. "
            "Genera un briefing ejecutivo del dia en formato estructurado:\n"
            "1. SITUACION GENERAL (2 parrafos)\n"
            "2. PUNTOS CRITICOS (lista de 3-5 items)\n"
            "3. TENDENCIAS RELEVANTES (2-3 items)\n"
            "4. PERSPECTIVA 48H\n\n"
            f"Contexto:\n{contexto}"
        )
        from dashboard.services import llm_local as _llm2
        return _llm2.chat(prompt)
    except Exception as exc:
        return f"Error generando briefing: {exc}"


# ── Helpers de render ─────────────────────────────────────────────────────────
_MODULOS = [
    ("Electoral",     GREEN,  "✓"),
    ("Medios",        GREEN,  "✓"),
    ("Institucional", AMBER,  "~"),
    ("Economico",     GREEN,  "✓"),
    ("Riesgo",        RED,    "!"),
]

def _render_risk_bar():
    dots_html = "".join(
        f'<div class="risk-module">'
        f'<div class="risk-dot" style="background:{c};box-shadow:0 0 6px {c}88"></div>'
        f'<span class="risk-label">{n}</span>'
        f'</div>'
        for n, c, _ in _MODULOS
    )
    now = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    st.markdown(
        f'<div class="risk-bar">'
        f'<span style="font-size:.6rem;font-weight:800;color:{CYAN};letter-spacing:.1em;'
        f'text-transform:uppercase;margin-right:.5rem">ESTADO MODULOS</span>'
        f'{dots_html}'
        f'<div style="flex:1"></div>'
        f'<span style="font-size:.62rem;color:{MUTED}">Actualizado: {now}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


def _sent_badge(sesgo: str | None) -> str:
    if sesgo is None:
        sesgo = "neutro"
    s = str(sesgo).lower()
    if any(k in s for k in ("pos", "favor", "bueno")):
        return '<span class="sent-badge sent-pos">Positivo</span>'
    if any(k in s for k in ("neg", "critic", "malo", "advers")):
        return '<span class="sent-badge sent-neg">Negativo</span>'
    return '<span class="sent-badge sent-neu">Neutro</span>'


def _render_noticia_card(n: dict, idx: int):
    titulo = n.get("titulo", "Sin titulo")[:120]
    medio = n.get("medio", "—")
    tema = n.get("tema", "")
    url = n.get("url", "#")
    sesgo = n.get("sesgo", None)
    partidos = n.get("partidos", [])
    partidos_str = ", ".join(partidos[:3]) if partidos else "—"
    badge = _sent_badge(sesgo)
    with st.container():
        st.markdown(
            f'<div class="noticia-card">'
            f'<div class="noticia-titulo"><a href="{url}" target="_blank" '
            f'style="color:{TEXT};text-decoration:none">{titulo}</a></div>'
            f'<div class="noticia-meta">'
            f'<span>📰 {medio}</span>'
            f'<span>🏷️ {tema}</span>'
            f'<span>🔵 {partidos_str}</span>'
            f'{badge}'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


def _render_narrative_card(titulo: str, desc: str, trend: str, color: str = PURPLE):
    arrow = "↑" if trend == "up" else ("↓" if trend == "down" else "→")
    st.markdown(
        f'<div class="narrativa-card" style="border-left-color:{color}">'
        f'<div style="font-size:.78rem;font-weight:800;color:{TEXT};margin-bottom:.2rem">'
        f'{arrow} {titulo}</div>'
        f'<div style="font-size:.72rem;color:{TEXT2}">{desc}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ── Narrativas de ejemplo (demo data si no hay LLM) ──────────────────────────
_NARRATIVAS_DEMO = [
    ("Investidura — pacto presupuestario", "Negociaciones entre PSOE y partidos minoritarios centran el debate parlamentario de la semana.", "up", AMBER),
    ("Economia — datos paro EPA", "El dato trimestral del INE domina la agenda mediatica con lecturas contrapuestas por la oposicion.", "down", GREEN),
    ("Cataluna — tension territorial", "La aplicacion del acuerdo de financiacion singular vuelve a primer plano en medios nacionales.", "up", RED),
    ("VOX y extrema derecha europea", "Coordinacion transnacional de partidos de derecha radical recibe cobertura creciente.", "up", PURPLE),
    ("Reforma judicial — CGPJ", "Debate sobre composicion del organo de gobierno del poder judicial se reabre en el Congreso.", "right", CYAN),
]

_WATCHLIST_DEMO = [
    ("Pedro Sanchez", "PSOE", "Declaraciones sobre presupuestos 2026", AMBER),
    ("Alberto N. Feijoo", "PP", "Gira territorial — galicia y madrid", CYAN),
    ("Santiago Abascal", "VOX", "Cumbre Madrid — liders europeos derecha", RED),
    ("Yolanda Diaz", "SUMAR", "Proyecto ley reduccion jornada laboral", GREEN),
    ("Carlos Mazon", "PP-Valencia", "Comparecencia post-DANA informe", PURPLE),
]

_STRATEGIC_QS_DEMO = [
    "¿Puede el gobierno aprobar los Presupuestos 2026 con el actual mapa parlamentario o recurrira a la prorroga?",
    "¿Como afectara la coordinacion de VOX con Le Pen / AfD al posicionamiento europeo del PP frente a sus potenciales socios de gobierno?",
    "¿Que impacto tendran las proximas encuestas del CIS en la aritmetica de investidura si hubiera elecciones anticipadas antes de noviembre?",
]


def _render_pdf_export(briefing_text: str, noticias: list):
    section_header("EXPORTAR BRIEFING", BLUE)
    col_pdf, col_audio = st.columns(2)
    with col_pdf:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm
            from reportlab.lib import colors as rl_colors

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4,
                                    rightMargin=2*cm, leftMargin=2*cm,
                                    topMargin=2.5*cm, bottomMargin=2*cm)
            styles = getSampleStyleSheet()
            story = []
            title_style = ParagraphStyle(
                "title", parent=styles["Heading1"],
                textColor=rl_colors.HexColor("#00D4FF"),
                fontSize=18, spaceAfter=8,
            )
            body_style = ParagraphStyle(
                "body", parent=styles["Normal"],
                fontSize=9, leading=14, spaceAfter=6,
            )
            fecha = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
            story.append(Paragraph(f"Politeia — Briefing Diario IA", title_style))
            story.append(Paragraph(f"Generado: {fecha} | Modelo: {_MODELO}", body_style))
            story.append(Spacer(1, 0.5*cm))
            for line in briefing_text.replace("**", "").split("\n"):
                if line.strip():
                    story.append(Paragraph(line.strip(), body_style))
                    story.append(Spacer(1, 0.15*cm))
            story.append(Spacer(1, 0.5*cm))
            story.append(Paragraph("NOTICIAS PRINCIPALES", title_style))
            for n in noticias[:10]:
                titulo = n.get("titulo", "")[:100]
                medio = n.get("medio", "")
                story.append(Paragraph(f"• [{medio}] {titulo}", body_style))
            doc.build(story)
            buffer.seek(0)
            st.download_button(
                "📄 Descargar PDF",
                buffer.getvalue(),
                f"briefing_{datetime.date.today().isoformat()}.pdf",
                "application/pdf",
                use_container_width=True,
            )
        except ImportError:
            fecha = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
            txt = f"POLITEIA — BRIEFING DIARIO IA\nGenerado: {fecha}\n\n{briefing_text}\n\nNOTICIAS:\n"
            txt += "\n".join(f"- [{n.get('medio','')}] {n.get('titulo','')}" for n in noticias[:10])
            st.download_button(
                "📄 Descargar TXT",
                txt,
                f"briefing_{datetime.date.today().isoformat()}.txt",
                "text/plain",
                use_container_width=True,
            )
    with col_audio:
        st.markdown(
            f'<div class="audio-placeholder">'
            f'<div style="font-size:1.6rem;margin-bottom:.4rem">🎙️</div>'
            f'<div style="font-weight:800;color:{BLUE};font-size:.78rem">AUDIO BRIEFING</div>'
            f'<div style="margin-top:.3rem;font-size:.68rem">ElevenLabs TTS — proximamente</div>'
            f'<div style="font-size:.6rem;color:{MUTED};margin-top:.2rem">Narracion automatica del briefing en voz sintetizada</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


# ── Header principal ──────────────────────────────────────────────────────────
fecha_display = datetime.datetime.now().strftime("%A, %d de %B de %Y").capitalize()

st.markdown(
    f'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">'
    f'<div>'
    f'<div style="font-size:1.6rem;font-weight:900;color:{CYAN};letter-spacing:-.01em">📋 Briefing Diario IA</div>'
    f'<div style="font-size:.75rem;color:{TEXT2};margin-top:.2rem">{fecha_display} · Politeia Intelligence Platform</div>'
    f'</div>'
    f'<div style="text-align:right">'
    f'<div style="font-size:.6rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:{MUTED}">MODELO</div>'
    f'<div style="font-size:.82rem;font-weight:700;color:{"" + GREEN if _LLM_OK else RED}">'
    f'{"🟢" if _LLM_OK else "🔴"} {_MODELO}</div>'
    f'</div>'
    f'</div>',
    unsafe_allow_html=True,
)

_render_risk_bar()

# ── Carga de datos ────────────────────────────────────────────────────────────
with st.spinner("Cargando noticias y datos..."):
    noticias = _get_noticias(20)
    boe_items = _get_boe()

boe_criticos = [
    i for i in boe_items
    if _boe_impacto(
        i.get("titulo", ""),
        i.get("seccion", ""),
        i.get("departamento", "")
    ) in ("CRITICO", "ALTO", "CRÍTICO")
]

# Generar contexto para briefing
contexto_briefing = (
    f"Fecha: {datetime.date.today().isoformat()}\n"
    f"Noticias hoy: {[n.get('titulo','') for n in noticias[:10]]}\n"
    f"BOE critico: {[i.get('titulo','') for i in boe_criticos[:5]]}"
)

# ── Brain widget ─────────────────────────────────────────────────────────────
try:
    from dashboard.components.brain_widget import brain_insight_card as _brain_card
    _BRAIN_WIDGET_OK = True
except Exception:
    _BRAIN_WIDGET_OK = False

# ── Tabs principales ──────────────────────────────────────────────────────────
tab_briefing, tab_feed, tab_modulos, tab_brain, tab_config = st.tabs([
    "📋 Briefing del Día",
    "📰 Feed de Noticias",
    "📊 Módulos Status",
    "🧠 Brain Analysis",
    "⚙️ Configurar",
])

# ─── TAB 1: Briefing del Dia ─────────────────────────────────────────────────
with tab_briefing:
    col_main, col_side = st.columns([3, 2], gap="large")

    with col_main:
        section_header("BRIEFING EJECUTIVO IA", CYAN)

        if "briefing_generado" not in st.session_state:
            st.session_state["briefing_generado"] = None

        if st.session_state["briefing_generado"] is None:
            with st.spinner("Generando briefing con Politeia Brain..."):
                briefing_txt = _gen_briefing(contexto_briefing)
                st.session_state["briefing_generado"] = briefing_txt
        else:
            briefing_txt = st.session_state["briefing_generado"]

        st.markdown(
            f'<div class="briefing-box">{briefing_txt.replace(chr(10), "<br>")}</div>',
            unsafe_allow_html=True,
        )

        if st.button("🔄 Regenerar briefing", key="regen_briefing"):
            st.session_state["briefing_generado"] = None
            st.cache_data.clear()
            st.rerun()

        st.markdown("<br>", unsafe_allow_html=True)
        _render_pdf_export(briefing_txt, noticias)

        st.markdown("<br>", unsafe_allow_html=True)
        section_header("NOTICIAS PRINCIPALES", BLUE)
        for idx, n in enumerate(noticias[:6]):
            _render_noticia_card(n, idx)

        st.markdown("<br>", unsafe_allow_html=True)
        section_header("NARRATIVAS EN TENDENCIA", PURPLE)
        for titulo, desc, trend, col in _NARRATIVAS_DEMO:
            _render_narrative_card(titulo, desc, trend, col)

    with col_side:
        # KPIs rapidos
        section_header("INDICADORES RAPIDOS", AMBER)
        k1, k2 = st.columns(2)
        with k1:
            st.markdown(kpi_card("Noticias hoy", str(len(noticias)), "ultimas 24h", CYAN), unsafe_allow_html=True)
        with k2:
            st.markdown(kpi_card("BOE critico", str(len(boe_criticos)), "items prioritarios", RED if boe_criticos else GREEN), unsafe_allow_html=True)

        k3, k4 = st.columns(2)
        with k3:
            n_medios = len(set(n.get("medio","") for n in noticias if n.get("medio")))
            st.markdown(kpi_card("Medios", str(n_medios), "fuentes activas", BLUE), unsafe_allow_html=True)
        with k4:
            n_neg = sum(1 for n in noticias if "neg" in str(n.get("sesgo","")).lower() or "critic" in str(n.get("sesgo","")).lower())
            pct_neg = round(100 * n_neg / max(len(noticias), 1))
            st.markdown(kpi_card("Tono negativo", f"{pct_neg}%", "de noticias hoy", RED if pct_neg > 40 else AMBER), unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        section_header("WATCHLIST", RED)
        for nombre, partido, actividad, color in _WATCHLIST_DEMO:
            c_partido = COLORES_PARTIDOS.get(partido, CYAN)
            st.markdown(
                f'<div class="watchlist-item">'
                f'<div style="display:flex;align-items:center;justify-content:space-between">'
                f'<span style="font-weight:800;color:{color}">{nombre}</span>'
                f'<span style="font-size:.6rem;font-weight:800;color:{c_partido};'
                f'background:{c_partido}22;border-radius:4px;padding:1px 6px">{partido}</span>'
                f'</div>'
                f'<div style="font-size:.68rem;color:{TEXT2};margin-top:.2rem">{actividad}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

        st.markdown("<br>", unsafe_allow_html=True)
        section_header("PREGUNTAS ESTRATEGICAS IA", PURPLE)
        for i, q in enumerate(_STRATEGIC_QS_DEMO, 1):
            st.markdown(
                f'<div class="q-card">'
                f'<span style="font-weight:900;color:{PURPLE};margin-right:.5rem">Q{i}</span>{q}'
                f'</div>',
                unsafe_allow_html=True,
            )

        if boe_criticos:
            st.markdown("<br>", unsafe_allow_html=True)
            section_header("BOE CRITICO", AMBER)
            for item in boe_criticos[:4]:
                titulo_boe = item.get("titulo", "—")[:80]
                dept = item.get("departamento", "—")
                st.markdown(
                    f'<div style="background:{AMBER}11;border:1px solid {AMBER}44;'
                    f'border-radius:8px;padding:.6rem .9rem;margin-bottom:.35rem">'
                    f'<div style="font-size:.75rem;font-weight:700;color:{AMBER}">{titulo_boe}</div>'
                    f'<div style="font-size:.62rem;color:{MUTED}">Dept.: {dept}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )


# ─── TAB 2: Feed de Noticias ─────────────────────────────────────────────────
with tab_feed:
    section_header("FEED COMPLETO DE NOTICIAS", BLUE)

    # Filtros
    f1, f2, f3 = st.columns([2, 2, 2])
    with f1:
        medios_disponibles = sorted(set(n.get("medio","") for n in noticias if n.get("medio")))
        filtro_medio = st.multiselect("Filtrar por medio", medios_disponibles, key="filtro_medio")
    with f2:
        temas_disp = sorted(set(n.get("tema","") for n in noticias if n.get("tema")))
        filtro_tema = st.multiselect("Filtrar por tema", temas_disp, key="filtro_tema")
    with f3:
        filtro_sent = st.selectbox("Sentimiento", ["Todos", "Positivo", "Negativo", "Neutro"], key="filtro_sent")

    noticias_filtradas = noticias
    if filtro_medio:
        noticias_filtradas = [n for n in noticias_filtradas if n.get("medio","") in filtro_medio]
    if filtro_tema:
        noticias_filtradas = [n for n in noticias_filtradas if n.get("tema","") in filtro_tema]
    if filtro_sent != "Todos":
        def _matches_sent(n: dict, f: str) -> bool:
            s = str(n.get("sesgo","")).lower()
            if f == "Positivo":
                return any(k in s for k in ("pos","favor","bueno"))
            if f == "Negativo":
                return any(k in s for k in ("neg","critic","malo","advers"))
            return True
        noticias_filtradas = [n for n in noticias_filtradas if _matches_sent(n, filtro_sent)]

    st.caption(f"{len(noticias_filtradas)} noticias mostradas")

    if noticias_filtradas:
        for idx, n in enumerate(noticias_filtradas):
            _render_noticia_card(n, idx)

        # Grafico de temas
        st.markdown("<br>", unsafe_allow_html=True)
        section_header("DISTRIBUCION POR TEMAS", PURPLE)
        temas_count: dict[str, int] = {}
        for n in noticias_filtradas:
            t = n.get("tema","Otros") or "Otros"
            temas_count[t] = temas_count.get(t, 0) + 1
        if temas_count:
            temas_df = pd.Series(temas_count).sort_values(ascending=True)
            fig_temas = go.Figure(go.Bar(
                y=temas_df.index.tolist(),
                x=temas_df.values.tolist(),
                orientation="h",
                marker_color=CYAN,
                marker_line_width=0,
            ))
            fig_temas.update_layout(
                paper_bgcolor=BG2, plot_bgcolor=BG2,
                height=max(250, len(temas_count)*32),
                margin=dict(l=0, r=10, t=20, b=10),
                font=dict(color=TEXT2, size=11),
                xaxis=dict(gridcolor=BORDER, zeroline=False),
                yaxis=dict(gridcolor="rgba(0,0,0,0)"),
            )
            st.plotly_chart(fig_temas, use_container_width=True)
    else:
        st.info("No hay noticias disponibles con los filtros actuales.")

    # Sentimiento por partido
    if noticias:
        section_header("SENTIMIENTO POR PARTIDO", AMBER)
        try:
            sent_data = _get_sentimiento(json.dumps(noticias))
            if sent_data:
                partidos_s = list(sent_data.keys())
                scores = [float(sent_data[p]) if isinstance(sent_data[p], (int, float)) else float(sent_data[p].get("score",0) if isinstance(sent_data[p], dict) else 0) for p in partidos_s]
                colors_s = [GREEN if s >= 0 else RED for s in scores]
                fig_sent = go.Figure(go.Bar(
                    x=partidos_s, y=scores,
                    marker_color=colors_s, marker_line_width=0,
                    text=[f"{s:+.2f}" for s in scores],
                    textposition="outside",
                ))
                fig_sent.update_layout(
                    paper_bgcolor=BG2, plot_bgcolor=BG2,
                    height=280, margin=dict(l=10, r=10, t=20, b=10),
                    font=dict(color=TEXT2, size=11),
                    yaxis=dict(gridcolor=BORDER, zeroline=True, zerolinecolor=MUTED),
                    xaxis=dict(gridcolor="rgba(0,0,0,0)"),
                )
                st.plotly_chart(fig_sent, use_container_width=True)
        except Exception:
            st.caption("Sentimiento por partido no disponible.")


# ─── TAB 3: Modulos Status ────────────────────────────────────────────────────
with tab_modulos:
    section_header("ESTADO DE MODULOS DEL SISTEMA", CYAN)

    _ALL_MODULES = [
        ("Electoral & Simulacion",  "Nowcasting, simulacion D'Hondt, escenarios",         GREEN, "✓ Operativo",  "Ultima actualizacion: hace 2h"),
        ("Medios & Narrativa",      "RSS 10 medios, analisis sentimiento, tracker temas",  GREEN, "✓ Operativo",  "Feed actualizado: hace 15min"),
        ("Institucional",           "BOE ETL, Congreso iniciativas, agenda gobierno",      AMBER, "~ Parcial",    "BOE actualizado; Congreso ETL en mantenimiento"),
        ("Economia & Macro",        "INE, BCE, indicadores mercados, deuda",               GREEN, "✓ Operativo",  "Datos diarios OK"),
        ("Riesgo Politico",         "Indices Politeia, alertas, monitor situacion",        RED,   "! Atencion",   "3 alertas criticas pendientes de revision"),
        ("Agentes IA",              "Politeia Brain, Claude API, RAG politico",             GREEN if _LLM_OK else AMBER, "✓ Conectado" if _LLM_OK else "~ Sin modelo", f"Modelo: {_MODELO}"),
        ("Campana & Estrategia",    "Impacto campana, war room, coordinacion",             GREEN, "✓ Operativo",  "Herramientas disponibles"),
        ("Coalition Builder",       "Coaliciones, hemiciclo, calculo D'Hondt",             GREEN, "✓ Operativo",  "Servicio activo"),
        ("Opposition Research",     "Fichas politicos, datos contradicciones",             AMBER, "~ En desarrollo", "Datos parciales cargados"),
        ("NLP & Analisis Texto",    "Clasificacion temas, keywords, entidades",            GREEN if _NLP_OK else AMBER, "✓ Activo" if _NLP_OK else "~ Sin servicio", "YAKE + spaCy"),
    ]

    cols_mods = st.columns(2)
    for i, (nombre, desc, color, estado, detalle) in enumerate(_ALL_MODULES):
        with cols_mods[i % 2]:
            st.markdown(
                f'<div class="module-status-card" style="border-top:2px solid {color}">'
                f'<div style="display:flex;align-items:center;justify-content:space-between">'
                f'<div class="ms-name">{nombre}</div>'
                f'<div style="font-size:.65rem;font-weight:800;color:{color};'
                f'background:{color}22;border-radius:5px;padding:2px 8px">{estado}</div>'
                f'</div>'
                f'<div class="ms-status" style="margin-top:.3rem">{desc}</div>'
                f'<div style="font-size:.6rem;color:{MUTED};margin-top:.2rem;'
                f'border-top:1px solid {BORDER};padding-top:.3rem">{detalle}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Grafico de salud global
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("SALUD GLOBAL DEL SISTEMA", GREEN)
    estados_count = {GREEN: 0, AMBER: 0, RED: 0}
    for _, _, color, _, _ in _ALL_MODULES:
        estados_count[color] = estados_count.get(color, 0) + 1

    fig_health = go.Figure(go.Pie(
        labels=["Operativo", "Parcial / Atencion", "Critico"],
        values=[estados_count[GREEN], estados_count[AMBER], estados_count[RED]],
        hole=0.6,
        marker_colors=[GREEN, AMBER, RED],
        textfont_color=TEXT,
        textinfo="label+percent",
    ))
    fig_health.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        height=260, margin=dict(l=20, r=20, t=20, b=20),
        font=dict(color=TEXT2, size=11),
        showlegend=False,
        annotations=[dict(
            text=f'<b style="color:{CYAN}">Sistema</b>',
            x=0.5, y=0.5, showarrow=False,
            font=dict(size=13, color=CYAN),
        )],
    )
    st.plotly_chart(fig_health, use_container_width=True)


# ─── TAB BRAIN: Análisis IA del día ──────────────────────────────────────────
with tab_brain:
    if _BRAIN_WIDGET_OK:
        from dashboard.components.brain_widget import (
            brain_analysis_panel, brain_inline_chat, brain_insight_card,
        )
        bra1, bra2 = st.columns([1, 1])
        with bra1:
            brain_insight_card(
                "briefings",
                datos_especificos={
                    "n_noticias": len(noticias),
                    "n_boe_critico": len(boe_criticos),
                    "titulares": [n.get("titulo", "") for n in noticias[:6]],
                },
                titulo_override="🧠 Insight IA del Briefing",
                key_suffix="d1_brief",
                altura=200,
            )
        with bra2:
            brain_insight_card(
                "medios",
                titulo_override="📺 Narrativa mediática hoy",
                key_suffix="d1_medios",
                altura=200,
            )

        st.markdown("---")
        brain_analysis_panel(
            foco="general",
            titulo="🔍 Análisis autónomo del día",
            key_prefix="d1_autonomo",
        )

        st.markdown("---")
        from dashboard.shared import section_header as _sh
        _sh("CHAT CON EL BRAIN SOBRE EL BRIEFING", CYAN)
        brain_inline_chat(
            modulo_origen="briefings",
            placeholder="Pregunta sobre el briefing de hoy, noticias o el BOE…",
            key_prefix="d1_chat",
            preguntas_sugeridas=[
                "¿Cuál es la noticia más relevante?",
                "Análisis del BOE de hoy",
                "¿Qué riesgos hay esta semana?",
            ],
        )
    else:
        st.warning("⚠️ Brain Widget no disponible. Verifica la instalación de Ollama.")

# ─── TAB 5: Configurar ────────────────────────────────────────────────────────
with tab_config:
    section_header("CONFIGURACION DEL CLIENTE", PURPLE)

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Perfil")
        perfil_nombre = st.text_input("Nombre / Organizacion", value="Analista Politeia", key="cfg_nombre")
        perfil_rol = st.selectbox("Rol", ["Analista politico", "Consultor campana", "Periodista", "Investigador", "Otro"], key="cfg_rol")
        partidos_interes = st.multiselect(
            "Partidos de interes",
            ["PP", "PSOE", "VOX", "SUMAR", "PODEMOS", "ERC", "JUNTS", "PNV", "EH Bildu"],
            default=["PP", "PSOE"],
            key="cfg_partidos",
        )

    with c2:
        st.subheader("Watchlist de Entidades")
        watchlist_raw = st.text_area(
            "Entidades a monitorizar (una por linea)",
            value="\n".join(n for n, *_ in _WATCHLIST_DEMO),
            height=140,
            key="cfg_watchlist",
        )
        st.subheader("Frecuencia de briefing")
        freq = st.radio("Actualizar briefing cada:", ["5 min", "15 min", "30 min", "1 hora"], index=1, horizontal=True, key="cfg_freq")

    st.markdown("<br>", unsafe_allow_html=True)
    section_header("PREFERENCIAS DE ENTREGA", BLUE)
    c3, c4 = st.columns(2)
    with c3:
        st.checkbox("Email matutino (8:00h)", value=True, key="cfg_email")
        st.checkbox("Notificaciones push alertas criticas", value=True, key="cfg_push")
        st.checkbox("Audio briefing automatico", value=False, key="cfg_audio")
    with c4:
        st.checkbox("Incluir BOE en briefing", value=True, key="cfg_boe")
        st.checkbox("Incluir sentimiento medios", value=True, key="cfg_sent")
        st.checkbox("Incluir preguntas estrategicas IA", value=True, key="cfg_qa")

    if st.button("💾 Guardar configuracion", type="primary", key="btn_save_config"):
        st.success("Configuracion guardada correctamente.")
