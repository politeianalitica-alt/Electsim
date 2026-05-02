"""
ELECTSIM — D1 Briefings de Inteligencia
=========================================
Crown-jewel page: AI-generated executive briefings, news sentiment,
narrative tracking, strategic agenda, and key intelligence questions.
Designed to look and feel like a €1,000/month Palantir-grade product.
"""
from __future__ import annotations

import datetime
import html as _html
import io
import json
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS,
    section_header, kpi_card,
    intel_header, news_card, signal_card, scrolling_ticker, confidence_badge,
    sidebar_nav, mostrar_alertas_pagina,
    apply_plotly_theme, PLOTLY_THEME,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Briefings de Inteligencia — Politeia",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()
mostrar_alertas_pagina("D1_Briefings")

# ── External service probes ────────────────────────────────────────────────────
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
    from dashboard.services.boe_api import (
        obtener_sumario as _boe_sumario,
        clasificar_impacto as _boe_impacto,
    )
    _BOE_OK = True
except Exception:
    _BOE_OK = False
    def _boe_sumario():
        return []
    def _boe_impacto(*a, **kw):
        return "NORMAL"

# ── Global CSS ─────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
[data-testid="stAppViewContainer"] {{background: {BG};}}

/* ── Risk bar ────────────────────────────────────────────────────────────── */
.risk-strip {{
  display: flex; gap: .4rem; align-items: center;
  background: linear-gradient(135deg, {BG2}, {BG3});
  border: 1px solid {BORDER}; border-top: 2px solid {CYAN}33;
  border-radius: 10px; padding: .65rem 1.2rem;
  margin-bottom: 1rem;
}}
.risk-module {{
  display: flex; flex-direction: column; align-items: center;
  flex: 1; min-width: 80px;
}}
.risk-dot {{
  width: 10px; height: 10px; border-radius: 50%; margin-bottom: 4px;
}}
.risk-label {{
  font-size: .53rem; font-weight: 800; letter-spacing: .09em;
  text-transform: uppercase; color: {MUTED}; text-align: center;
}}
.risk-score {{
  font-size: .7rem; font-weight: 700; letter-spacing: .03em; margin-top: 1px;
}}

/* ── Control bar ─────────────────────────────────────────────────────────── */
.ctrl-bar {{
  background: {BG2}; border: 1px solid {BORDER};
  border-radius: 10px; padding: .7rem 1rem;
  margin-bottom: .8rem;
}}

/* ── Briefing box ────────────────────────────────────────────────────────── */
.briefing-box {{
  background: linear-gradient(135deg, {BG2} 0%, {BG3} 100%);
  border: 1px solid {BORDER}; border-left: 3px solid {CYAN};
  border-radius: 12px; padding: 1.6rem 1.8rem;
  color: {TEXT}; font-size: .88rem; line-height: 1.75;
  white-space: pre-wrap;
}}
.briefing-meta {{
  display: flex; align-items: center; gap: .8rem;
  margin-top: .8rem; padding-top: .7rem;
  border-top: 1px solid {BORDER};
  font-size: .65rem; color: {MUTED};
}}
.briefing-meta span {{
  display: inline-flex; align-items: center; gap: .3rem;
}}

/* ── Narrativa card ──────────────────────────────────────────────────────── */
.narrativa-card {{
  background: {BG3}; border: 1px solid {BORDER};
  border-radius: 10px; padding: .8rem 1rem;
  margin-bottom: .5rem;
}}
.nar-trend-up   {{ color: {GREEN}; font-weight: 800; }}
.nar-trend-down {{ color: {RED}; font-weight: 800; }}
.nar-trend-flat {{ color: {MUTED}; font-weight: 800; }}

/* ── Agenda event ────────────────────────────────────────────────────────── */
.agenda-item {{
  display: flex; gap: .9rem; align-items: flex-start;
  background: {BG2}; border: 1px solid {BORDER};
  border-radius: 10px; padding: .8rem 1.1rem;
  margin-bottom: .45rem;
}}
.agenda-date {{
  min-width: 52px; text-align: center;
  background: {BG3}; border-radius: 8px; padding: .4rem .3rem;
  font-size: .62rem; line-height: 1.3;
}}
.agenda-body {{ flex: 1; }}
.agenda-title {{ font-size: .82rem; font-weight: 700; color: {TEXT}; }}
.agenda-sub   {{ font-size: .68rem; color: {TEXT2}; margin-top: .15rem; }}

/* ── Priority badge ──────────────────────────────────────────────────────── */
.badge-critico   {{ background: {RED}22; color: {RED}; border: 1px solid {RED}44; }}
.badge-importante{{ background: {AMBER}22; color: {AMBER}; border: 1px solid {AMBER}44; }}
.badge-seguimiento{{ background: {BLUE}22; color: {BLUE}; border: 1px solid {BLUE}44; }}
.priority-badge {{
  display: inline-block; border-radius: 5px;
  padding: 2px 7px; font-size: .57rem; font-weight: 800;
  letter-spacing: .08em; text-transform: uppercase;
}}

/* ── Strategic question card ─────────────────────────────────────────────── */
.q-card {{
  background: linear-gradient(135deg, {PURPLE}0D, {BG2});
  border: 1px solid {PURPLE}33; border-radius: 10px;
  padding: .9rem 1.2rem; margin-bottom: .6rem;
}}
.q-number {{
  font-size: .62rem; font-weight: 900; color: {PURPLE};
  letter-spacing: .1em; text-transform: uppercase; margin-bottom: .3rem;
}}
.q-text {{ font-size: .85rem; font-weight: 700; color: {TEXT}; line-height: 1.4; }}
.q-context {{ font-size: .75rem; color: {TEXT2}; line-height: 1.5; margin-top: .4rem; }}
.q-implication {{
  font-size: .7rem; color: {CYAN}; margin-top: .4rem; padding-top: .4rem;
  border-top: 1px solid {BORDER};
}}

/* ── Watchlist ───────────────────────────────────────────────────────────── */
.watchlist-row {{
  display: grid; grid-template-columns: 2fr 3fr 1fr 2fr;
  align-items: center; gap: .5rem;
  background: {BG2}; border: 1px solid {BORDER};
  border-radius: 8px; padding: .55rem .9rem;
  margin-bottom: .35rem; font-size: .75rem; color: {TEXT};
}}
.watchlist-header {{
  display: grid; grid-template-columns: 2fr 3fr 1fr 2fr;
  gap: .5rem; padding: .3rem .9rem;
  font-size: .58rem; font-weight: 800; letter-spacing: .1em;
  text-transform: uppercase; color: {MUTED}; margin-bottom: .25rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Demo / static data ────────────────────────────────────────────────────────
_DEMO_BRIEFING = """\
BRIEFING EJECUTIVO — ANÁLISIS POLÍTICO ESPAÑA
{date} | Clasificación: CONFIDENCIAL

RESUMEN EJECUTIVO
El panorama político español muestra una estabilización de las intenciones de \
voto tras semanas de volatilidad. El PP mantiene su ventaja estimada en 4,7 \
puntos porcentuales sobre el PSOE, aunque la tendencia muestra una ligera \
convergencia en los últimos 14 días. La cuestión de la vivienda emerge como \
el principal vector de desgaste para el Gobierno, con un 67 % de encuestados \
considerando la política habitacional "insuficiente" o "muy insuficiente".

SEÑALES DE ALERTA
1. RIESGO ALTO — El debate sobre la financiación autonómica amenaza con \
fracturar la coalición de investidura. Tres socios parlamentarios han emitido \
señales contradictorias en las últimas 48 horas.
2. RIESGO MEDIO — La cobertura negativa en medios conservadores sobre la \
reforma fiscal alcanza máximos de 6 meses. El encuadre dominante asocia la \
medida con "subida de impuestos a la clase media".
3. OPORTUNIDAD — Los datos del INE sobre empleo publicados mañana podrían \
ofrecer una narrativa positiva si se sitúan por encima de las previsiones del \
consenso (esperado: +45.000 afiliados).

ANÁLISIS DE ACTORES
Pedro Sánchez: exposición mediática alta (94 menciones/24h), sentimiento \
ligeramente negativo (-0.28). Su agenda esta semana está dominada por política \
europea, lo que reduce su exposición doméstica y puede ser beneficioso.
Alberto Núñez Feijóo: posición consolidada, beneficiándose del ciclo de \
desgaste gubernamental. Riesgo: posible sobreexposición en el debate de \
financiación autonómica donde su posición es ambigua.

RECOMENDACIONES ESTRATÉGICAS
· Priorizar comunicación sobre empleo y economía los próximos 3 días
· Activar escudo mediático ante posible escalada en debate de financiación
· Monitorizar señales de VOX sobre posible moción de censura en CCAA \
gobernadas con PP\
"""

_RIESGOS = [
    ("Electoral",    62, AMBER),
    ("Mediático",    74, RED),
    ("Legislativo",  38, GREEN),
    ("Económico",    51, AMBER),
    ("Geopolítico",  29, GREEN),
]

_ACTORES = ["Sánchez", "Feijóo", "Abascal", "Díaz", "Puigdemont"]

_NARRATIVAS_DEMO = [
    {
        "nombre": "Financiación autonómica — fractura de coalición",
        "menciones_7d": 312,
        "sentimiento": "negativo",
        "tendencia": "up",
        "plataformas": "Prensa · Twitter · Radio",
        "color": RED,
        "framing": {
            "PSOE": "Marco de solidaridad interterritorial y cohesión del Estado",
            "PP": "Privilegio fiscal inaceptable que divide España en dos velocidades",
            "VOX": "Capitulación del gobierno central ante el separatismo",
        },
    },
    {
        "nombre": "Vivienda — crisis de acceso para jóvenes",
        "menciones_7d": 289,
        "sentimiento": "negativo",
        "tendencia": "up",
        "plataformas": "Prensa · Instagram · TikTok",
        "color": AMBER,
        "framing": {
            "PSOE": "Reforma necesaria con regulación de alquileres de emergencia",
            "PP": "Intervencionismo que destruye la oferta y encarece el mercado",
            "SUMAR": "Fallo estructural del capitalismo inmobiliario desregulado",
        },
    },
    {
        "nombre": "Reforma judicial — renovación del CGPJ",
        "menciones_7d": 198,
        "sentimiento": "mixto",
        "tendencia": "flat",
        "plataformas": "Prensa · Radio",
        "color": PURPLE,
        "framing": {
            "PSOE": "Restauración del Estado de Derecho bloqueado por el PP",
            "PP": "Politización de la justicia para blindar al gobierno",
            "VOX": "Lawfare contra la soberanía nacional",
        },
    },
    {
        "nombre": "Coordinación ultraderecha europea — VOX & AfD",
        "menciones_7d": 156,
        "sentimiento": "negativo",
        "tendencia": "up",
        "plataformas": "Prensa · Twitter",
        "color": RED,
        "framing": {
            "PSOE": "Riesgo para la democracia y los derechos humanos en Europa",
            "PP": "Distancia táctica, pero sin condena explícita de sus socios potenciales",
            "VOX": "Frente patriota europeo contra el globalismo progresista",
        },
    },
    {
        "nombre": "Empleo EPA — datos positivos del INE",
        "menciones_7d": 143,
        "sentimiento": "positivo",
        "tendencia": "up",
        "plataformas": "Prensa · Radio · TV",
        "color": GREEN,
        "framing": {
            "PSOE": "Récord histórico de empleo que valida el modelo económico",
            "PP": "Precarización laboral encubierta en los datos de afiliación",
            "SUMAR": "Avance insuficiente sin reducción de jornada laboral",
        },
    },
    {
        "nombre": "Presupuestos 2026 — negociación parlamentaria",
        "menciones_7d": 134,
        "sentimiento": "negativo",
        "tendencia": "flat",
        "plataformas": "Prensa · Twitter",
        "color": AMBER,
        "framing": {
            "PSOE": "Diálogo social constructivo en proceso de maduración",
            "PP": "Gobierno incapaz de aprobar sus propias cuentas",
            "JUNTS": "Condicionado a avances en la agenda soberanista",
        },
    },
    {
        "nombre": "Desinformación sobre inundaciones DANA",
        "menciones_7d": 112,
        "sentimiento": "negativo",
        "tendencia": "down",
        "plataformas": "Twitter · Telegram · WhatsApp",
        "color": RED,
        "framing": {
            "PSOE": "Campaña coordinada de bulos desde la extrema derecha",
            "PP": "Necesidad de transparencia y rendición de cuentas del gobierno",
            "VOX": "Censura progresista contra la libertad de expresión",
        },
    },
    {
        "nombre": "Política exterior — Marruecos y Sahara Occidental",
        "menciones_7d": 89,
        "sentimiento": "mixto",
        "tendencia": "down",
        "plataformas": "Prensa · Radio",
        "color": CYAN,
        "framing": {
            "PSOE": "Estabilidad estratégica y acuerdo migratorio esencial",
            "PP": "Cesión inaceptable a intereses marroquíes en detrimento del pueblo saharaui",
            "VOX": "Traición a la soberanía española en el Sáhara",
        },
    },
]

_AGENDA_DEMO = [
    {
        "fecha": "Hoy",
        "hora": "09:00",
        "titulo": "Consejo de Ministros — Reforma fiscal IRPF",
        "tipo": "Gobierno",
        "prioridad": "CRITICO",
        "detalle": "Aprobación previsional del proyecto de ley de reforma del IRPF para rentas medias. Posible comparecencia posterior de ministra de Hacienda.",
    },
    {
        "fecha": "Hoy",
        "hora": "12:30",
        "titulo": "Rueda de prensa PP — Feijóo en el Senado",
        "tipo": "Oposición",
        "prioridad": "IMPORTANTE",
        "detalle": "Respuesta oficial del PP a la agenda legislativa del Gobierno. Contexto: debate sobre financiación autonómica.",
    },
    {
        "fecha": "Mañana",
        "hora": "10:00",
        "titulo": "INE — Publicación Encuesta de Población Activa (EPA) Q1",
        "tipo": "Dato macro",
        "prioridad": "CRITICO",
        "detalle": "Dato clave para el relato económico del Gobierno. Consenso: +45.000 afiliados. Desviación positiva activaría narrativa de empleo.",
    },
    {
        "fecha": "Mañana",
        "hora": "16:00",
        "titulo": "Pleno Congreso — Votación enmiendas Ley de Vivienda",
        "tipo": "Legislativo",
        "prioridad": "CRITICO",
        "detalle": "Votación de 23 enmiendas al articulado. El resultado determinará si el Gobierno puede aprobar el texto completo antes del verano.",
    },
    {
        "fecha": "+2 días",
        "hora": "18:00",
        "titulo": "BOE — Entrada en vigor nueva normativa de alquiler turístico",
        "tipo": "Regulatorio",
        "prioridad": "IMPORTANTE",
        "detalle": "Real Decreto sobre límites de alquiler turístico en zonas tensionadas. Alto impacto en CCAA: Madrid, Cataluña, Baleares, Canarias.",
    },
    {
        "fecha": "+3 días",
        "hora": "10:30",
        "titulo": "Cumbre europea — Sánchez en Bruselas (Consejo Europeo)",
        "tipo": "Exterior",
        "prioridad": "IMPORTANTE",
        "detalle": "Agenda: fondo defensa europeo, política migratoria y financiación verde. Oportunidad para reencuadre europeísta del gobierno.",
    },
    {
        "fecha": "+5 días",
        "hora": "09:00",
        "titulo": "Comparecencia Maján (PP-Valencia) ante comisión DANA",
        "tipo": "Institucional",
        "prioridad": "SEGUIMIENTO",
        "detalle": "Comparecencia en comisión de investigación sobre gestión de emergencias en las inundaciones de octubre.",
    },
]

_STRATEGIC_QS_DEMO = [
    {
        "pregunta": "¿Puede el Gobierno aprobar los Presupuestos 2026 con el actual mapa parlamentario o recurrirá a la prórroga?",
        "contexto": "La aritmética parlamentaria actual muestra una mayoría de bloqueo en la derecha y exigencias crecientes de JUNTS y ERC. Los plazos constitucionales presionan para una resolución antes de septiembre.",
        "implicacion": "Una prórroga presupuestaria reforzaría el relato de gobierno débil de la oposición y podría precipitar el adelanto electoral.",
        "fuentes": "Congreso de los Diputados · CIS · encuestas propias · fuentes parlamentarias",
    },
    {
        "pregunta": "¿Cómo afectará la coordinación de VOX con Le Pen y AfD al posicionamiento europeo del PP frente a sus potenciales socios de gobierno?",
        "contexto": "La reciente cumbre de Madrid entre líderes de la ultraderecha europea pone al PP en una posición incómoda: necesita a VOX para gobernar en CCAA pero debe diferenciarse en el eje europeo.",
        "implicacion": "El PP podría verse forzado a posicionarse explícitamente ante el MAGA-europeo antes de las próximas elecciones europeas, erosionando su flanco centrista.",
        "fuentes": "Prensa europea · Eurobarómetro · análisis electoral propio",
    },
    {
        "pregunta": "¿Qué impacto tendrán las próximas encuestas del CIS en la aritmética de investidura si se convocaran elecciones antes de noviembre?",
        "contexto": "El CIS de mayo-junio será el primer barómetro post-escándalo de financiación autonómica. Históricamente, el efecto CIS en la intención de voto PSOE es de +2-3 puntos sobre el dato real.",
        "implicacion": "Si el CIS muestra convergencia PP-PSOE por debajo de 3 puntos, el gobierno puede sentirse legitimado para adelantar. Si la brecha supera 6 puntos, la presión para elecciones vendrá desde dentro del PSOE.",
        "fuentes": "CIS histórico · nowcasting Politeia · modelos predictivos electorales",
    },
    {
        "pregunta": "¿Es la reforma de la financiación autonómica singular el principal riesgo de ruptura del bloque de investidura?",
        "contexto": "ERC condiciona su apoyo a avances concretos en la financiación singular de Cataluña. El PNV mantiene una posición más flexible pero también reclama mejoras para el Concierto vasco.",
        "implicacion": "Una negociación que satisfaga a Cataluña puede alienar a socios de otras CCAA y dar argumentos a PP y VOX para el relato de 'España a dos velocidades'.",
        "fuentes": "Análisis parlamentario Politeia · medios regionales · declaraciones parlamentarias",
    },
    {
        "pregunta": "¿Representa el crecimiento del voto joven hacia SUMAR una transferencia permanente o coyuntural desde el PSOE?",
        "contexto": "Los datos del barómetro CIS muestran que el segmento 18-34 años ha reducido su intención de voto PSOE en 6 puntos desde 2023. La crisis de vivienda y el coste de vida son los factores principales identificados.",
        "implicacion": "Si la tendencia se consolida, el PSOE deberá competir por el electorado de centro para compensar la pérdida izquierda, cambiando su estrategia de comunicación y política económica.",
        "fuentes": "CIS · Ipsos · análisis demográfico electoral · redes sociales jóvenes",
    },
]

_WATCHLIST_DEMO = [
    {
        "actor": "Pedro Sánchez",
        "senal": "Declaraciones sobre presupuestos 2026",
        "cambio": "+12% menciones",
        "alerta": "MEDIO",
        "accion": "Monitorizar encuadre mediático posterior",
    },
    {
        "actor": "Alberto N. Feijóo",
        "senal": "Gira territorial — Galicia y Madrid",
        "cambio": "+8% menciones",
        "alerta": "BAJO",
        "accion": "Seguimiento de agenda y declaraciones",
    },
    {
        "actor": "Santiago Abascal",
        "senal": "Cumbre Madrid — líderes europeos derecha",
        "cambio": "+31% menciones",
        "alerta": "ALTO",
        "accion": "Analizar coordinación transnacional y reacción PP",
    },
    {
        "actor": "Yolanda Díaz",
        "senal": "Votación ley reducción jornada laboral",
        "cambio": "+19% menciones",
        "alerta": "MEDIO",
        "accion": "Seguimiento votación parlamentaria",
    },
    {
        "actor": "Carles Puigdemont",
        "senal": "Señales sobre pacto de investidura",
        "cambio": "+44% menciones",
        "alerta": "ALTO",
        "accion": "Activar monitorización 24h — posible movimiento crítico",
    },
]

_FUENTES_DEMO = [
    "El País", "El Mundo", "La Vanguardia", "ABC", "elDiario.es",
    "La Razón", "El Confidencial", "Vozpópuli", "20minutos", "Público",
]

_NOTICIAS_DEMO = [
    {
        "titulo": "El Gobierno aprueba en Consejo de Ministros el borrador de la reforma fiscal del IRPF",
        "medio": "El País",
        "tema": "Economía",
        "url": "#",
        "sesgo": "neutral",
        "snippet": "La ministra de Hacienda ha presentado un texto que eleva el mínimo exento hasta 25.000 euros anuales y crea un nuevo tramo para rentas superiores a 300.000 euros.",
    },
    {
        "titulo": "Feijóo avisa: 'Los Presupuestos de Sánchez son una quimera matemática que nadie le aprobará'",
        "medio": "El Mundo",
        "tema": "Política",
        "url": "#",
        "sesgo": "negativo",
        "snippet": "El líder del PP ha protagonizado una rueda de prensa en el Senado en la que ha cifrado en 'menos de 20' los votos disponibles para el gobierno.",
    },
    {
        "titulo": "La EPA del primer trimestre registra 52.000 nuevos afiliados, superando el consenso",
        "medio": "Expansión",
        "tema": "Economía",
        "url": "#",
        "sesgo": "positivo",
        "snippet": "El dato bate las previsiones del consenso de analistas en 7.000 empleos y consolida la tendencia de creación de empleo iniciada en el tercer trimestre del año pasado.",
    },
    {
        "titulo": "Junts endurece su postura: sin financiación singular no hay votos para el gobierno",
        "medio": "La Vanguardia",
        "tema": "Política",
        "url": "#",
        "sesgo": "negativo",
        "snippet": "Puigdemont ha convocado una videoconferencia con los portavoces parlamentarios para reforzar la posición antes de la ronda de negociaciones de la semana próxima.",
    },
    {
        "titulo": "La cumbre de la ultraderecha europea en Madrid genera rechazo en el Parlamento Europeo",
        "medio": "elDiario.es",
        "tema": "Europa",
        "url": "#",
        "sesgo": "negativo",
        "snippet": "Grupos socialdemócratas y liberales han exigido una condena explícita de la coordinación entre VOX, AfD y Rassemblement National ante la Presidencia española del Consejo.",
    },
    {
        "titulo": "El precio del alquiler en Madrid supera por primera vez los 22 euros el metro cuadrado",
        "medio": "El Confidencial",
        "tema": "Vivienda",
        "url": "#",
        "sesgo": "negativo",
        "snippet": "Los datos del portal Idealista confirman una subida del 14 % interanual en el precio del alquiler en la capital, consolidando el máximo histórico.",
    },
    {
        "titulo": "La reducción de jornada laboral a 37,5 horas supera el primer trámite parlamentario",
        "medio": "Público",
        "tema": "Laboral",
        "url": "#",
        "sesgo": "positivo",
        "snippet": "El texto promovido por Yolanda Díaz ha obtenido 176 votos favorables y pasa a comisión, donde PP y VOX han anunciado una batería de enmiendas.",
    },
    {
        "titulo": "Sánchez cierra su agenda europea con un acuerdo de financiación verde por 3.200 millones",
        "medio": "ABC",
        "tema": "Europa",
        "url": "#",
        "sesgo": "positivo",
        "snippet": "El presidente del Gobierno ha anunciado la rúbrica del acuerdo al término del Consejo Europeo en Bruselas, donde también ha participado en la cumbre de defensa de la OTAN.",
    },
    {
        "titulo": "VOX registra una moción de censura en la Asamblea de Madrid contra el gobierno regional del PP",
        "medio": "La Razón",
        "tema": "Política",
        "url": "#",
        "sesgo": "negativo",
        "snippet": "Abascal ha defendido el movimiento como 'respuesta a la traición de Ayuso a sus votantes' en referencia al pacto de estabilidad con PSOE en el Ayuntamiento.",
    },
    {
        "titulo": "El Banco de España rebaja su previsión de crecimiento al 2,3 % por la incertidumbre arancelaria",
        "medio": "Cinco Días",
        "tema": "Economía",
        "url": "#",
        "sesgo": "negativo",
        "snippet": "La institución advierte del impacto de los aranceles de Trump sobre las exportaciones españolas, especialmente en el sector del automóvil y el agroalimentario.",
    },
]

# ── Cached loaders ─────────────────────────────────────────────────────────────
@st.cache_data(ttl=600)
def _get_noticias(n: int = 30) -> list[dict]:
    try:
        return _cargar_noticias(max_noticias=n) or []
    except Exception:
        return []


@st.cache_data(ttl=600)
def _get_boe() -> list[dict]:
    try:
        return _boe_sumario() or []
    except Exception:
        return []


@st.cache_data(ttl=600)
def _get_sentimiento(noticias_json: str) -> dict:
    try:
        return _sent_partidos(json.loads(noticias_json)) or {}
    except Exception:
        return {}


@st.cache_data(ttl=600)
def _gen_briefing_llm(contexto: str, tipo: str) -> str:
    if not _LLM_OK:
        return ""
    try:
        tipo_prompt = {
            "Matutino": "Briefing matutino: resumen del dia anterior y agenda del dia actual.",
            "Vespertino": "Briefing vespertino: analisis de noticias del dia y perspectiva para manana.",
            "Crisis": "Briefing de crisis: analisis urgente de la situacion critica, opciones de respuesta y recomendaciones inmediatas.",
            "Semanal": "Briefing semanal: balance de la semana, tendencias emergentes y escenarios para la proxima semana.",
        }.get(tipo, "Briefing ejecutivo general.")

        prompt = (
            f"Eres un analista politico senior especializado en Espana. "
            f"{tipo_prompt}\n\n"
            "Genera un briefing ejecutivo CONFIDENCIAL estructurado:\n"
            "1. RESUMEN EJECUTIVO (2 parrafos)\n"
            "2. SENALES DE ALERTA (3-5 items numerados con nivel de riesgo)\n"
            "3. ANALISIS DE ACTORES (actores clave, menciones, sentimiento)\n"
            "4. PERSPECTIVA 48H\n"
            "5. RECOMENDACIONES ESTRATEGICAS (3-5 bullets)\n\n"
            f"Contexto actual:\n{contexto}"
        )
        from dashboard.services import llm_local as _llm2
        return _llm2.chat(prompt)
    except Exception as exc:
        return f"[Error al generar briefing con IA: {exc}]"


# ── Helper render functions ────────────────────────────────────────────────────
def _risk_score_color(score: int) -> str:
    if score >= 65:
        return RED
    if score >= 40:
        return AMBER
    return GREEN


def _render_risk_bar(riesgos: list[tuple]) -> None:
    dots_html = ""
    for nombre, score, _ in riesgos:
        color = _risk_score_color(score)
        dots_html += (
            f'<div class="risk-module">'
            f'<div class="risk-dot" style="background:{color};box-shadow:0 0 8px {color}99"></div>'
            f'<span class="risk-score" style="color:{color}">{score}</span>'
            f'<span class="risk-label">{nombre}</span>'
            f'</div>'
        )
    sep = f'<div style="width:1px;background:{BORDER};align-self:stretch;margin:0 .2rem"></div>'
    dots_with_sep = sep.join(
        f'<div class="risk-module">'
        f'<div class="risk-dot" style="background:{_risk_score_color(s)};box-shadow:0 0 8px {_risk_score_color(s)}99"></div>'
        f'<span class="risk-score" style="color:{_risk_score_color(s)}">{s}</span>'
        f'<span class="risk-label">{n}</span>'
        f'</div>'
        for n, s, _ in riesgos
    )
    now = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    st.markdown(
        f'<div class="risk-strip">'
        f'<span style="font-size:.58rem;font-weight:900;color:{CYAN};letter-spacing:.12em;'
        f'text-transform:uppercase;margin-right:.8rem;white-space:nowrap">RISK STATUS</span>'
        f'{dots_with_sep}'
        f'<div style="flex:1"></div>'
        f'<span style="font-size:.6rem;color:{MUTED};white-space:nowrap">Actualizado: {now}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


def _priority_badge(prioridad: str) -> str:
    cls = {
        "CRITICO": "badge-critico",
        "IMPORTANTE": "badge-importante",
        "SEGUIMIENTO": "badge-seguimiento",
    }.get(prioridad.upper(), "badge-seguimiento")
    return f'<span class="priority-badge {cls}">{prioridad}</span>'


def _sent_color(sent: str) -> str:
    s = sent.lower()
    if "pos" in s:
        return GREEN
    if "neg" in s:
        return RED
    if "mix" in s:
        return AMBER
    return MUTED


def _trend_arrow(trend: str) -> str:
    return {"up": "↑", "down": "↓", "flat": "→"}.get(trend, "→")


def _trend_class(trend: str) -> str:
    return {"up": "nar-trend-up", "down": "nar-trend-down"}.get(trend, "nar-trend-flat")


def _watchlist_alert_color(alerta: str) -> str:
    return {"ALTO": RED, "MEDIO": AMBER, "BAJO": GREEN}.get(alerta.upper(), MUTED)


# ── Data load ──────────────────────────────────────────────────────────────────
with st.spinner("Cargando inteligencia..."):
    _noticias_live = _get_noticias(30)
    _boe_items = _get_boe()

noticias: list[dict] = _noticias_live if _noticias_live else _NOTICIAS_DEMO
boe_criticos = [
    i for i in _boe_items
    if _boe_impacto(
        i.get("titulo", ""),
        i.get("seccion", ""),
        i.get("departamento", ""),
    ) in ("CRITICO", "ALTO", "CRÍTICO")
]

# ── Scrolling ticker ───────────────────────────────────────────────────────────
_ticker_items = [n.get("titulo", "") for n in noticias[:12] if n.get("titulo")]
if _ticker_items:
    scrolling_ticker(_ticker_items)

# ── Page header ────────────────────────────────────────────────────────────────
_now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
_briefing_fresh = True  # updated once LLM state is checked below
intel_header(
    title="Briefings de Inteligencia",
    subtitle="Análisis Ejecutivo IA",
    status="LIVE" if _LLM_OK else "DEMO",
    time_str=_now_str,
)

# ── Risk bar ───────────────────────────────────────────────────────────────────
_render_risk_bar(_RIESGOS)

# ── Control bar ────────────────────────────────────────────────────────────────
with st.container():
    cb_left, cb_center, cb_right = st.columns([3, 3, 3], gap="medium")

    with cb_left:
        _fecha_sel = st.date_input(
            "Fecha del briefing",
            value=datetime.date.today(),
            label_visibility="collapsed",
            key="briefing_fecha",
        )
        _tipo_briefing = st.selectbox(
            "Tipo",
            ["Matutino", "Vespertino", "Crisis", "Semanal"],
            label_visibility="collapsed",
            key="briefing_tipo",
        )

    with cb_center:
        _actores_sel = st.multiselect(
            "Actores monitorizados",
            _ACTORES,
            default=_ACTORES[:3],
            label_visibility="collapsed",
            key="briefing_actores",
        )

    with cb_right:
        _btn_gen = st.button(
            "Generar Briefing",
            type="primary",
            use_container_width=True,
            key="btn_gen_briefing",
        )
        ex_col1, ex_col2 = st.columns(2)
        with ex_col1:
            _btn_txt = st.button("Exportar TXT", use_container_width=True, key="btn_exp_txt")
        with ex_col2:
            _btn_pdf = st.button("Exportar PDF", use_container_width=True, key="btn_exp_pdf")

# Trigger regeneration
if _btn_gen:
    st.session_state.pop("d1_briefing_text", None)
    st.cache_data.clear()

# ── Main tabs ──────────────────────────────────────────────────────────────────
tab_exec, tab_news, tab_narratives, tab_agenda, tab_questions = st.tabs([
    "BRIEFING EJECUTIVO",
    "NOTICIAS & SENTIMIENTO",
    "NARRATIVAS & ENCUADRE",
    "AGENDA ESTRATÉGICA",
    "PREGUNTAS CLAVE",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — BRIEFING EJECUTIVO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_exec:
    col_main, col_side = st.columns([3, 2], gap="large")

    with col_main:
        section_header("BRIEFING EJECUTIVO IA", CYAN)

        # Build context for LLM
        _fecha_str = str(_fecha_sel)
        _contexto = (
            f"Fecha: {_fecha_str}\n"
            f"Tipo de briefing: {_tipo_briefing}\n"
            f"Actores monitorizados: {', '.join(_actores_sel)}\n"
            f"Noticias recientes: {[n.get('titulo','') for n in noticias[:10]]}\n"
            f"BOE critico: {[i.get('titulo','') for i in boe_criticos[:5]]}\n"
            f"Riesgos: {[(n, s) for n, s, _ in _RIESGOS]}"
        )

        # Get or generate briefing
        if "d1_briefing_text" not in st.session_state:
            if _LLM_OK:
                with st.spinner("Politeia Brain generando briefing..."):
                    _raw = _gen_briefing_llm(_contexto, _tipo_briefing)
                    st.session_state["d1_briefing_text"] = _raw if _raw else (
                        _DEMO_BRIEFING.format(date=_fecha_str)
                    )
            else:
                st.session_state["d1_briefing_text"] = _DEMO_BRIEFING.format(date=_fecha_str)

        briefing_txt: str = st.session_state["d1_briefing_text"]

        # Render premium briefing box
        _safe_brief = _html.escape(briefing_txt)
        st.markdown(
            f'<div class="briefing-box">{_safe_brief}</div>',
            unsafe_allow_html=True,
        )

        # Metadata line
        _conf_html = confidence_badge(0.87 if _LLM_OK else 0.72)
        _model_label = _MODELO if _LLM_OK else "Demo — Politeia Analytics"
        st.markdown(
            f'<div class="briefing-meta">'
            f'<span>Generado por {_model_label}</span>'
            f'<span>{_conf_html}</span>'
            f'<span>Actualizado: {_now_str}</span>'
            f'<span style="color:{CYAN}">{_tipo_briefing}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )

        # Export TXT inline
        st.markdown("<div style='margin-top:.8rem'></div>", unsafe_allow_html=True)
        _txt_content = (
            f"POLITEIA INTELLIGENCE — BRIEFING {_tipo_briefing.upper()}\n"
            f"Fecha: {_fecha_str} | Generado: {_now_str}\n"
            f"Modelo: {_model_label}\n"
            f"{'='*60}\n\n"
            f"{briefing_txt}\n\n"
            f"{'='*60}\n"
            f"NOTICIAS MONITORIZADAS ({len(noticias)} fuentes):\n"
            + "\n".join(f"- [{n.get('medio','')}] {n.get('titulo','')}" for n in noticias[:15])
        )
        st.download_button(
            label="Descargar Briefing (.txt)",
            data=_txt_content.encode("utf-8"),
            file_name=f"briefing_{_tipo_briefing.lower()}_{_fecha_str}.txt",
            mime="text/plain",
            use_container_width=True,
            key="dl_txt_main",
        )

        # PDF export
        if _btn_pdf:
            try:
                from reportlab.lib.pagesizes import A4
                from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
                from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                from reportlab.lib.units import cm
                from reportlab.lib import colors as rl_colors

                _buf = io.BytesIO()
                _doc = SimpleDocTemplate(
                    _buf, pagesize=A4,
                    rightMargin=2 * cm, leftMargin=2 * cm,
                    topMargin=2.5 * cm, bottomMargin=2 * cm,
                )
                _styles = getSampleStyleSheet()
                _title_style = ParagraphStyle(
                    "title", parent=_styles["Heading1"],
                    textColor=rl_colors.HexColor("#00D4FF"),
                    fontSize=16, spaceAfter=8,
                )
                _body_style = ParagraphStyle(
                    "body", parent=_styles["Normal"],
                    fontSize=9, leading=14, spaceAfter=4,
                )
                _story = [
                    Paragraph(f"Politeia Intelligence — Briefing {_tipo_briefing}", _title_style),
                    Paragraph(f"Fecha: {_fecha_str} | Generado: {_now_str} | Modelo: {_model_label}", _body_style),
                    Spacer(1, 0.4 * cm),
                ]
                for _line in briefing_txt.split("\n"):
                    if _line.strip():
                        _story.append(Paragraph(_line.strip(), _body_style))
                        _story.append(Spacer(1, 0.1 * cm))
                _doc.build(_story)
                _buf.seek(0)
                st.download_button(
                    "Descargar PDF",
                    _buf.getvalue(),
                    f"briefing_{_tipo_briefing.lower()}_{_fecha_str}.pdf",
                    "application/pdf",
                    use_container_width=True,
                    key="dl_pdf_inline",
                )
            except ImportError:
                st.info("ReportLab no instalado. Usa la exportación TXT.")

        # KPIs rapidos
        st.markdown("<div style='margin-top:1.2rem'></div>", unsafe_allow_html=True)
        section_header("INDICADORES RÁPIDOS", AMBER)
        k1, k2, k3, k4 = st.columns(4)
        _n_neg = sum(
            1 for n in noticias
            if any(k in str(n.get("sesgo", "")).lower() for k in ("neg", "critic", "malo"))
        )
        _pct_neg = round(100 * _n_neg / max(len(noticias), 1))
        _n_medios = len(set(n.get("medio", "") for n in noticias if n.get("medio")))
        with k1:
            st.markdown(kpi_card("Noticias hoy", str(len(noticias)), "últimas 24h", CYAN), unsafe_allow_html=True)
        with k2:
            st.markdown(kpi_card("BOE crítico", str(len(boe_criticos)), "items prioritarios", RED if boe_criticos else GREEN), unsafe_allow_html=True)
        with k3:
            st.markdown(kpi_card("Medios activos", str(_n_medios), "fuentes monitorizadas", BLUE), unsafe_allow_html=True)
        with k4:
            st.markdown(kpi_card("Tono negativo", f"{_pct_neg}%", "de noticias hoy", RED if _pct_neg > 50 else AMBER if _pct_neg > 30 else GREEN), unsafe_allow_html=True)

    with col_side:
        # Noticias principales
        section_header("TITULARES PRINCIPALES", BLUE)
        for _n in noticias[:6]:
            _sc = _sent_color(_n.get("sesgo", ""))
            st.markdown(
                news_card(
                    title=str(_n.get("titulo", ""))[:110],
                    source=str(_n.get("medio", "—")),
                    sentiment=str(_n.get("sesgo", "neutral")).capitalize(),
                    time_ago="Hoy",
                    url=str(_n.get("url", "#")),
                    snippet=str(_n.get("snippet", str(_n.get("titulo", ""))[:120])),
                ),
                unsafe_allow_html=True,
            )

        # Watchlist compact
        st.markdown("<div style='margin-top:.8rem'></div>", unsafe_allow_html=True)
        section_header("WATCHLIST", RED)
        st.markdown(
            f'<div class="watchlist-header">'
            f'<span>Actor</span><span>Señal</span><span>Alerta</span><span>Acción</span>'
            f'</div>',
            unsafe_allow_html=True,
        )
        for _w in _WATCHLIST_DEMO:
            _ac = _watchlist_alert_color(_w["alerta"])
            st.markdown(
                f'<div class="watchlist-row">'
                f'<span style="font-weight:700;color:{TEXT}">{_w["actor"]}</span>'
                f'<span style="color:{TEXT2};font-size:.72rem">{_w["senal"]}</span>'
                f'<span style="background:{_ac}22;color:{_ac};border-radius:5px;padding:2px 6px;'
                f'font-size:.6rem;font-weight:800;text-align:center">{_w["alerta"]}</span>'
                f'<span style="font-size:.68rem;color:{MUTED}">{_w["accion"]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

        # BOE crítico
        if boe_criticos:
            st.markdown("<div style='margin-top:.8rem'></div>", unsafe_allow_html=True)
            section_header("BOE CRÍTICO", AMBER)
            for _boe in boe_criticos[:4]:
                _bt = _html.escape(str(_boe.get("titulo", "—"))[:90])
                _bd = _html.escape(str(_boe.get("departamento", "—")))
                st.markdown(
                    signal_card(
                        title=_bt,
                        body=f"Departamento: {_bd}",
                        level="high",
                        source="BOE",
                        time_ago="Hoy",
                    ),
                    unsafe_allow_html=True,
                )

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — NOTICIAS & SENTIMIENTO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_news:
    section_header("FEED DE NOTICIAS MONITORIZADAS", BLUE)

    # Filters row
    f1, f2, f3, f4 = st.columns([2, 2, 2, 2])
    with f1:
        _medios_disp = sorted(set(n.get("medio", "") for n in noticias if n.get("medio")))
        _f_medio = st.multiselect(
            "Fuente", _medios_disp or _FUENTES_DEMO,
            key="f2_medio", placeholder="Todas las fuentes",
        )
    with f2:
        _temas_disp = sorted(set(n.get("tema", "") for n in noticias if n.get("tema")))
        _f_tema = st.multiselect(
            "Tema", _temas_disp,
            key="f2_tema", placeholder="Todos los temas",
        )
    with f3:
        _f_part = st.multiselect(
            "Partido", ["PP", "PSOE", "VOX", "SUMAR", "JUNTS", "ERC", "PNV"],
            key="f2_partido", placeholder="Todos",
        )
    with f4:
        _f_sent = st.selectbox(
            "Sentimiento", ["Todos", "Positivo", "Negativo", "Neutro"],
            key="f2_sent",
        )

    def _matches_sent_filter(n: dict, f: str) -> bool:
        s = str(n.get("sesgo", "")).lower()
        if f == "Positivo":
            return any(k in s for k in ("pos", "favor", "bueno"))
        if f == "Negativo":
            return any(k in s for k in ("neg", "critic", "malo", "advers"))
        return True

    _nf = noticias[:]
    if _f_medio:
        _nf = [n for n in _nf if n.get("medio", "") in _f_medio]
    if _f_tema:
        _nf = [n for n in _nf if n.get("tema", "") in _f_tema]
    if _f_part:
        _nf = [n for n in _nf if any(p in (n.get("partidos") or []) for p in _f_part)]
    if _f_sent != "Todos":
        _nf = [n for n in _nf if _matches_sent_filter(n, _f_sent)]

    st.caption(f"{len(_nf)} noticias · Fuentes: {', '.join(_FUENTES_DEMO)}")

    # News grid — 3 columns
    _nc1, _nc2, _nc3 = st.columns(3)
    _col_cycle = [_nc1, _nc2, _nc3]
    for _idx, _n in enumerate(_nf[:18]):
        with _col_cycle[_idx % 3]:
            st.markdown(
                news_card(
                    title=str(_n.get("titulo", ""))[:100],
                    source=str(_n.get("medio", "—")),
                    sentiment=str(_n.get("sesgo", "neutral")).capitalize(),
                    time_ago="Hoy",
                    url=str(_n.get("url", "#")),
                    snippet=str(_n.get("snippet", str(_n.get("titulo", ""))[:100])),
                ),
                unsafe_allow_html=True,
            )
    if not _nf:
        st.info("No hay noticias con los filtros seleccionados.")

    # Sentiment distribution bar chart
    st.markdown("<div style='margin-top:1rem'></div>", unsafe_allow_html=True)
    section_header("DISTRIBUCIÓN DE SENTIMIENTO", CYAN)
    _s_pos = sum(1 for n in _nf if any(k in str(n.get("sesgo","")).lower() for k in ("pos","favor","bueno")))
    _s_neg = sum(1 for n in _nf if any(k in str(n.get("sesgo","")).lower() for k in ("neg","critic","malo","advers")))
    _s_neu = max(len(_nf) - _s_pos - _s_neg, 0)

    _sc1, _sc2 = st.columns([2, 3])
    with _sc1:
        _fig_sent_dist = go.Figure(go.Bar(
            x=["Positivo", "Negativo", "Neutro"],
            y=[_s_pos, _s_neg, _s_neu],
            marker_color=[GREEN, RED, MUTED],
            marker_line_width=0,
            text=[_s_pos, _s_neg, _s_neu],
            textposition="outside",
            textfont=dict(color=TEXT2, size=11),
        ))
        apply_plotly_theme(_fig_sent_dist)
        _fig_sent_dist.update_layout(
            height=220, margin=dict(l=10, r=10, t=20, b=10),
            showlegend=False,
            xaxis=dict(gridcolor="rgba(0,0,0,0)"),
            yaxis=dict(gridcolor=BORDER),
        )
        st.plotly_chart(_fig_sent_dist, use_container_width=True)

    with _sc2:
        # Sentimiento por partido
        try:
            _sent_data = _get_sentimiento(json.dumps(noticias))
            if _sent_data:
                _parts_s = list(_sent_data.keys())
                _scores_s = []
                for _p in _parts_s:
                    _v = _sent_data[_p]
                    if isinstance(_v, (int, float)):
                        _scores_s.append(float(_v))
                    elif isinstance(_v, dict):
                        _scores_s.append(float(_v.get("score", 0)))
                    else:
                        _scores_s.append(0.0)
                _cols_s = [GREEN if s >= 0 else RED for s in _scores_s]
                _fig_sp = go.Figure(go.Bar(
                    x=_parts_s, y=_scores_s,
                    marker_color=_cols_s, marker_line_width=0,
                    text=[f"{s:+.2f}" for s in _scores_s],
                    textposition="outside",
                    textfont=dict(color=TEXT2, size=10),
                ))
                apply_plotly_theme(_fig_sp)
                _fig_sp.update_layout(
                    height=220, margin=dict(l=10, r=10, t=20, b=10),
                    title=dict(text="Sentimiento por partido", font=dict(color=TEXT2, size=11)),
                    showlegend=False,
                    yaxis=dict(gridcolor=BORDER, zeroline=True, zerolinecolor=MUTED),
                    xaxis=dict(gridcolor="rgba(0,0,0,0)"),
                )
                st.plotly_chart(_fig_sp, use_container_width=True)
            else:
                # Demo sentiment
                _demo_parts = ["PP", "PSOE", "VOX", "SUMAR", "JUNTS"]
                _demo_scores = [-0.12, 0.08, -0.31, 0.15, -0.09]
                _fig_sp_demo = go.Figure(go.Bar(
                    x=_demo_parts, y=_demo_scores,
                    marker_color=[GREEN if s >= 0 else RED for s in _demo_scores],
                    marker_line_width=0,
                    text=[f"{s:+.2f}" for s in _demo_scores],
                    textposition="outside",
                    textfont=dict(color=TEXT2, size=10),
                ))
                apply_plotly_theme(_fig_sp_demo)
                _fig_sp_demo.update_layout(
                    height=220, margin=dict(l=10, r=10, t=20, b=10),
                    title=dict(text="Sentimiento por partido (demo)", font=dict(color=TEXT2, size=11)),
                    showlegend=False,
                    yaxis=dict(gridcolor=BORDER, zeroline=True, zerolinecolor=MUTED),
                    xaxis=dict(gridcolor="rgba(0,0,0,0)"),
                )
                st.plotly_chart(_fig_sp_demo, use_container_width=True)
        except Exception:
            st.caption("Sentimiento por partido no disponible.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — NARRATIVAS & ENCUADRE
# ═══════════════════════════════════════════════════════════════════════════════
with tab_narratives:
    section_header("NARRATIVAS EN CIRCULACIÓN — TOP 8", PURPLE)

    _nr1, _nr2 = st.columns([3, 2], gap="large")

    with _nr1:
        for _idx, _nar in enumerate(_NARRATIVAS_DEMO):
            _c = _nar["color"]
            _arrow = _trend_arrow(_nar["tendencia"])
            _tcls = _trend_class(_nar["tendencia"])
            _sc_html = (
                f'<span style="background:{_sent_color(_nar["sentimiento"])}22;'
                f'color:{_sent_color(_nar["sentimiento"])};'
                f'font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;'
                f'letter-spacing:.06em">{_nar["sentimiento"].upper()}</span>'
            )
            st.markdown(
                f'<div class="narrativa-card" style="border-left:3px solid {_c}">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.3rem">'
                f'<span style="font-size:.82rem;font-weight:800;color:{TEXT};flex:1;padding-right:.5rem">'
                f'<span class="{_tcls}">{_arrow}</span> {_nar["nombre"]}</span>'
                f'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:.2rem">'
                f'{_sc_html}'
                f'<span style="font-size:.62rem;color:{MUTED}">{_nar["menciones_7d"]} menciones/7d</span>'
                f'</div>'
                f'</div>'
                f'<div style="font-size:.67rem;color:{MUTED}">{_nar["plataformas"]}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    with _nr2:
        # Narrative lifecycle chart (30 days mock)
        section_header("CICLO DE VIDA — 30 DÍAS", CYAN)
        _days = list(range(1, 31))
        import random
        random.seed(42)

        _fig_nar_life = go.Figure()
        for _nar in _NARRATIVAS_DEMO[:5]:
            _peak = random.randint(10, 25)
            _ys = []
            for _d in _days:
                if _d < _peak - 5:
                    _ys.append(round(random.uniform(5, 30), 1))
                elif _d < _peak:
                    _ys.append(round(random.uniform(30, 80) + (_d - (_peak - 5)) * 8, 1))
                elif _d == _peak:
                    _ys.append(round(random.uniform(80, 120), 1))
                else:
                    _decay = max(0, round(80 * (0.88 ** (_d - _peak)) + random.uniform(-5, 5), 1))
                    _ys.append(_decay)
            _fig_nar_life.add_trace(go.Scatter(
                x=_days, y=_ys,
                name=_nar["nombre"][:30] + "...",
                mode="lines",
                line=dict(color=_nar["color"], width=1.5),
                hovertemplate=f"<b>{_nar['nombre'][:40]}</b><br>Día %{{x}}: %{{y}} menciones<extra></extra>",
            ))
        apply_plotly_theme(_fig_nar_life)
        _fig_nar_life.update_layout(
            height=240, margin=dict(l=10, r=10, t=10, b=30),
            legend=dict(
                font=dict(size=9, color=TEXT2),
                bgcolor=BG2,
                bordercolor=BORDER,
                x=0, y=1,
            ),
            xaxis=dict(title="Días", tickfont=dict(size=9, color=MUTED), gridcolor=BORDER),
            yaxis=dict(title="Menciones", tickfont=dict(size=9, color=MUTED), gridcolor=BORDER),
        )
        st.plotly_chart(_fig_nar_life, use_container_width=True)

        # Narrative diffusion scatter
        section_header("RED DE DIFUSIÓN", BLUE)
        _party_positions = {
            "PP": (0.7, 0.6), "PSOE": (0.3, 0.6), "VOX": (0.85, 0.3),
            "SUMAR": (0.15, 0.4), "JUNTS": (0.5, 0.85),
        }
        _fig_diff = go.Figure()
        # Narrative nodes
        for _i, _nar in enumerate(_NARRATIVAS_DEMO[:5]):
            _angle = _i * (360 / 5)
            import math
            _nx = 0.5 + 0.25 * math.cos(math.radians(_angle))
            _ny = 0.5 + 0.25 * math.sin(math.radians(_angle))
            _fig_diff.add_trace(go.Scatter(
                x=[_nx], y=[_ny],
                mode="markers+text",
                marker=dict(size=10, color=_nar["color"], opacity=0.7),
                text=[str(_i + 1)],
                textposition="middle center",
                textfont=dict(size=8, color=TEXT),
                name=_nar["nombre"][:25],
                showlegend=False,
            ))
        # Party nodes
        for _pname, (_px, _py) in _party_positions.items():
            _pc = COLORES_PARTIDOS.get(_pname, CYAN)
            _fig_diff.add_trace(go.Scatter(
                x=[_px], y=[_py],
                mode="markers+text",
                marker=dict(size=14, color=_pc, symbol="square", opacity=0.9),
                text=[_pname],
                textposition="top center",
                textfont=dict(size=9, color=TEXT2),
                name=_pname,
                showlegend=False,
            ))
        apply_plotly_theme(_fig_diff)
        _fig_diff.update_layout(
            height=220, margin=dict(l=10, r=10, t=10, b=10),
            xaxis=dict(visible=False, range=[0, 1]),
            yaxis=dict(visible=False, range=[0, 1]),
        )
        st.plotly_chart(_fig_diff, use_container_width=True)
        st.caption("Nodos cuadrados = partidos · Nodos circulares = narrativas (1-5 top)")

    # Framing analysis
    st.markdown("<div style='margin-top:.5rem'></div>", unsafe_allow_html=True)
    section_header("FRAMING ANALYSIS — TOP 3 NARRATIVAS", AMBER)
    _fa1, _fa2, _fa3 = st.columns(3)
    for _col_fa, _nar_fa in zip([_fa1, _fa2, _fa3], _NARRATIVAS_DEMO[:3]):
        with _col_fa:
            st.markdown(
                f'<div style="background:{_nar_fa["color"]}11;border:1px solid {_nar_fa["color"]}33;'
                f'border-radius:10px;padding:.8rem 1rem;height:100%">'
                f'<div style="font-size:.7rem;font-weight:900;color:{_nar_fa["color"]};'
                f'margin-bottom:.5rem;line-height:1.3">{_nar_fa["nombre"]}</div>',
                unsafe_allow_html=True,
            )
            for _party, _frame in _nar_fa["framing"].items():
                _pc = COLORES_PARTIDOS.get(_party, CYAN)
                st.markdown(
                    f'<div style="margin-bottom:.4rem">'
                    f'<span style="font-size:.62rem;font-weight:800;color:{_pc};'
                    f'background:{_pc}22;border-radius:4px;padding:1px 5px">{_party}</span>'
                    f'<div style="font-size:.72rem;color:{TEXT2};margin-top:.15rem;line-height:1.4">{_frame}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
            st.markdown("</div>", unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4 — AGENDA ESTRATÉGICA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_agenda:
    section_header("AGENDA POLÍTICA — PRÓXIMOS 7 DÍAS", CYAN)

    _ag1, _ag2 = st.columns([3, 2], gap="large")

    with _ag1:
        _tipos_disponibles = sorted(set(e["tipo"] for e in _AGENDA_DEMO))
        _ag_filter = st.multiselect(
            "Filtrar por tipo",
            _tipos_disponibles,
            key="ag_tipo_filter",
            placeholder="Todos los eventos",
        )
        _prioridades_filter = st.multiselect(
            "Filtrar por prioridad",
            ["CRITICO", "IMPORTANTE", "SEGUIMIENTO"],
            key="ag_prio_filter",
            placeholder="Todas las prioridades",
        )

        _agenda_filtrada = _AGENDA_DEMO[:]
        if _ag_filter:
            _agenda_filtrada = [e for e in _agenda_filtrada if e["tipo"] in _ag_filter]
        if _prioridades_filter:
            _agenda_filtrada = [e for e in _agenda_filtrada if e["prioridad"] in _prioridades_filter]

        for _ev in _agenda_filtrada:
            _prio_badge = _priority_badge(_ev["prioridad"])
            _tipo_color = {
                "Gobierno": CYAN, "Oposición": AMBER, "Dato macro": GREEN,
                "Legislativo": BLUE, "Regulatorio": PURPLE, "Exterior": CYAN,
                "Institucional": MUTED,
            }.get(_ev["tipo"], MUTED)
            st.markdown(
                f'<div class="agenda-item">'
                f'<div class="agenda-date">'
                f'<div style="font-size:.72rem;font-weight:900;color:{CYAN}">{_ev["fecha"]}</div>'
                f'<div style="font-size:.62rem;color:{MUTED}">{_ev["hora"]}</div>'
                f'</div>'
                f'<div class="agenda-body">'
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.2rem">'
                f'{_prio_badge}'
                f'<span style="background:{_tipo_color}22;color:{_tipo_color};font-size:.6rem;'
                f'font-weight:700;padding:1px 6px;border-radius:4px">{_ev["tipo"]}</span>'
                f'</div>'
                f'<div class="agenda-title">{_ev["titulo"]}</div>'
                f'<div class="agenda-sub">{_ev["detalle"]}</div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    with _ag2:
        # Events by type donut
        section_header("DISTRIBUCIÓN POR TIPO", BLUE)
        _tipo_count: dict[str, int] = {}
        for _ev in _AGENDA_DEMO:
            _tipo_count[_ev["tipo"]] = _tipo_count.get(_ev["tipo"], 0) + 1

        _fig_tipo = go.Figure(go.Pie(
            labels=list(_tipo_count.keys()),
            values=list(_tipo_count.values()),
            hole=0.55,
            marker_colors=[CYAN, AMBER, GREEN, BLUE, PURPLE, RED, MUTED],
            textfont=dict(size=10, color=TEXT),
            textinfo="label+percent",
        ))
        apply_plotly_theme(_fig_tipo)
        _fig_tipo.update_layout(
            height=220, margin=dict(l=10, r=10, t=10, b=10),
            showlegend=False,
        )
        st.plotly_chart(_fig_tipo, use_container_width=True)

        # Priority breakdown
        section_header("PRIORIDAD", RED)
        _prio_count = {"CRITICO": 0, "IMPORTANTE": 0, "SEGUIMIENTO": 0}
        for _ev in _AGENDA_DEMO:
            _prio_count[_ev["prioridad"]] = _prio_count.get(_ev["prioridad"], 0) + 1

        for _pr, _cnt in _prio_count.items():
            _pc2 = {"CRITICO": RED, "IMPORTANTE": AMBER, "SEGUIMIENTO": BLUE}.get(_pr, MUTED)
            _pct_p = round(100 * _cnt / max(len(_AGENDA_DEMO), 1))
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">'
                f'<span style="font-size:.62rem;font-weight:800;color:{_pc2};'
                f'min-width:90px;letter-spacing:.06em">{_pr}</span>'
                f'<div style="flex:1;height:6px;background:{BORDER};border-radius:3px">'
                f'<div style="width:{_pct_p}%;height:6px;background:{_pc2};border-radius:3px"></div>'
                f'</div>'
                f'<span style="font-size:.7rem;font-weight:700;color:{_pc2};min-width:20px;text-align:right">{_cnt}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

        # BOE items
        if boe_criticos:
            st.markdown("<div style='margin-top:.6rem'></div>", unsafe_allow_html=True)
            section_header("BOE — ITEMS CRÍTICOS", AMBER)
            for _boe in boe_criticos[:4]:
                st.markdown(
                    signal_card(
                        title=str(_boe.get("titulo", "—"))[:80],
                        body=f"Departamento: {_boe.get('departamento','—')}",
                        level="high",
                        source="BOE",
                        time_ago="Hoy",
                    ),
                    unsafe_allow_html=True,
                )

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5 — PREGUNTAS CLAVE
# ═══════════════════════════════════════════════════════════════════════════════
with tab_questions:
    section_header("PREGUNTAS ESTRATÉGICAS — ANÁLISIS IA", PURPLE)

    st.markdown(
        f'<div style="background:{PURPLE}0D;border:1px solid {PURPLE}22;border-radius:8px;'
        f'padding:.7rem 1.1rem;margin-bottom:1rem;font-size:.78rem;color:{TEXT2}">'
        f'El motor de análisis Politeia ha identificado <strong style="color:{PURPLE}">'
        f'{len(_STRATEGIC_QS_DEMO)} preguntas críticas</strong> que el analista debe resolver '
        f'para comprender el escenario político actual. Cada pregunta incluye contexto, '
        f'implicación estratégica y fuentes consultadas.'
        f'</div>',
        unsafe_allow_html=True,
    )

    for _qi, _q in enumerate(_STRATEGIC_QS_DEMO, 1):
        with st.container():
            st.markdown(
                f'<div class="q-card">'
                f'<div class="q-number">PREGUNTA {_qi} DE {len(_STRATEGIC_QS_DEMO)}</div>'
                f'<div class="q-text">{_q["pregunta"]}</div>'
                f'<div class="q-context">{_q["contexto"]}</div>'
                f'<div class="q-implication">Implicación estratégica: {_q["implicacion"]}</div>'
                f'<div style="font-size:.62rem;color:{MUTED};margin-top:.3rem">'
                f'Fuentes: {_q["fuentes"]}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

            # IA analysis button per question
            _btn_q = st.button(
                f"Analizar con IA — Q{_qi}",
                key=f"btn_q_{_qi}",
                use_container_width=False,
            )
            if _btn_q:
                if _LLM_OK:
                    with st.spinner(f"Politeia Brain analizando Q{_qi}..."):
                        try:
                            from dashboard.services import llm_local as _llm_q
                            _qprompt = (
                                f"Actua como analista politico senior especializado en Espana.\n"
                                f"Analiza en profundidad la siguiente pregunta estrategica:\n\n"
                                f"{_q['pregunta']}\n\n"
                                f"Contexto: {_q['contexto']}\n\n"
                                f"Proporciona:\n"
                                f"1. Respuesta directa (2 parrafos)\n"
                                f"2. Escenarios posibles (3 escenarios con probabilidad estimada)\n"
                                f"3. Indicadores a vigilar (5 KPIs o señales clave)\n"
                                f"4. Recomendacion estrategica\n"
                            )
                            _qa_resp = _llm_q.chat(_qprompt)
                            st.info(_qa_resp)
                        except Exception as _qe:
                            st.warning(f"Error al consultar IA: {_qe}")
                else:
                    # Demo deep-dive answer
                    st.info(
                        f"ANÁLISIS DEMO — Q{_qi}\n\n"
                        f"Implicación: {_q['implicacion']}\n\n"
                        f"Escenario A (45 %): Resolución negociada con concesiones limitadas. "
                        f"El gobierno mantiene la mayoría pero a coste creciente.\n"
                        f"Escenario B (35 %): Bloqueo parlamentario con convocatoria anticipada de elecciones "
                        f"antes de Q4 2026.\n"
                        f"Escenario C (20 %): Ruptura de coalición y gobierno en minoría de facto.\n\n"
                        f"KPIs a vigilar: votaciones parlamentarias, declaraciones de socios, "
                        f"barómetros CIS mensuales, cobertura mediática.\n\n"
                        f"Activa Politeia Brain (Ollama) para obtener el análisis completo."
                    )

            st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)

# ── Bottom watchlist (full) ────────────────────────────────────────────────────
st.markdown("<div style='margin-top:1.2rem'></div>", unsafe_allow_html=True)
section_header("WATCHLIST COMPLETA — ACTORES Y SEÑALES", RED)

st.markdown(
    f'<div class="watchlist-header">'
    f'<span>Actor / Entidad</span>'
    f'<span>Señal detectada</span>'
    f'<span>Cambio</span>'
    f'<span>Alerta</span>'
    f'</div>',
    unsafe_allow_html=True,
)

for _w in _WATCHLIST_DEMO:
    _wc = _watchlist_alert_color(_w["alerta"])
    _change_color = GREEN if "+" in _w["cambio"] else RED
    st.markdown(
        f'<div class="watchlist-row" style="border-left:3px solid {_wc}">'
        f'<span style="font-weight:700;color:{TEXT}">{_w["actor"]}</span>'
        f'<span style="color:{TEXT2}">{_w["senal"]}</span>'
        f'<span style="color:{_change_color};font-weight:700">{_w["cambio"]}</span>'
        f'<span style="background:{_wc}22;color:{_wc};border-radius:5px;padding:2px 8px;'
        f'font-size:.62rem;font-weight:800;letter-spacing:.06em">{_w["alerta"]}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

# Acción recomendada expansion
with st.expander("Ver acciones recomendadas por actor", expanded=False):
    for _w in _WATCHLIST_DEMO:
        _wc2 = _watchlist_alert_color(_w["alerta"])
        st.markdown(
            f'<div style="display:flex;align-items:center;gap:.7rem;padding:.5rem .3rem;'
            f'border-bottom:1px solid {BORDER}">'
            f'<span style="font-weight:700;color:{TEXT};min-width:180px">{_w["actor"]}</span>'
            f'<span style="background:{_wc2}22;color:{_wc2};border-radius:4px;padding:1px 6px;'
            f'font-size:.62rem;font-weight:800;min-width:60px;text-align:center">{_w["alerta"]}</span>'
            f'<span style="color:{TEXT2};font-size:.78rem">{_w["accion"]}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )

# ── Brain widget integration (optional) ───────────────────────────────────────
try:
    from dashboard.components.brain_widget import brain_inline_chat as _brain_chat
    st.markdown("<div style='margin-top:1.2rem'></div>", unsafe_allow_html=True)
    section_header("CONSULTAR POLITEIA BRAIN", CYAN)
    _brain_chat(
        modulo_origen="briefings",
        placeholder="Pregunta sobre el briefing de hoy, noticias, narrativas o la agenda...",
        key_prefix="d1_brain",
        preguntas_sugeridas=[
            "¿Cuál es la noticia más relevante hoy?",
            "Analiza el riesgo legislativo actual",
            "¿Qué escenarios hay para los presupuestos 2026?",
            "Resume el estado del BOE de hoy",
        ],
    )
except Exception:
    pass
