"""
D9 — Communication Intelligence & Strategy
Módulo premium para directores de comunicación, secretarios de prensa
y jefes de campaña. Narrativas en tiempo real, análisis de mensaje,
estrategia de respuesta, ciclo mediático y biblioteca de mensajes clave.
"""
from __future__ import annotations

import datetime
import random
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    AMBER, RED, GREEN, TEXT, TEXT2, MUTED,
    sidebar_nav, section_header, kpi_card,
    signal_card, news_card, intel_header, confidence_badge,
    scrolling_ticker, hex_to_rgba, apply_plotly_theme,
)

st.set_page_config(
    page_title="Communication Intelligence — ElectSim",
    page_icon="📡",
    layout="wide",
)

sidebar_nav()

# ── Estilos ───────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
body, .stApp {{ background:{BG}; color:{TEXT}; }}
.narrtrack-row {{
  display:grid;grid-template-columns:3fr 1fr 1fr 1fr 2fr 2fr;gap:.5rem;
  align-items:center;padding:.55rem .8rem;border-bottom:1px solid {BORDER};
  font-size:.78rem;
}}
.narrtrack-header {{
  display:grid;grid-template-columns:3fr 1fr 1fr 1fr 2fr 2fr;gap:.5rem;
  padding:.4rem .8rem;background:{BG3};border-radius:6px;
  font-size:.62rem;font-weight:700;letter-spacing:.08em;color:{MUTED};
  text-transform:uppercase;margin-bottom:.2rem;
}}
.quadrant-box {{
  border:1px solid {BORDER};border-radius:10px;padding:1.1rem;
  background:{BG2};min-height:140px;
}}
.talking-point {{
  background:{BG3};border-left:3px solid {CYAN};border-radius:0 6px 6px 0;
  padding:.6rem .9rem;margin:.35rem 0;font-size:.8rem;color:{TEXT2};
  line-height:1.5;
}}
.actor-msg-card {{
  background:{BG2};border:1px solid {BORDER};border-radius:10px;
  padding:1rem 1.2rem;margin-bottom:.5rem;
}}
</style>
""", unsafe_allow_html=True)

# ── LLM opcional ──────────────────────────────────────────────────────────────
_LLM_OK = False
try:
    from dashboard.services.llm_local import chat as _llm_chat, disponible as _llm_disp
    _s = _llm_disp()
    _LLM_OK = _s.get("brain", False) or _s.get("general", False)
except Exception:
    pass


def _llm_call(prompt: str, sistema: str = "Eres un estratega de comunicación política española de primer nivel.") -> str:
    if _LLM_OK:
        try:
            return _llm_chat(prompt, sistema=sistema)
        except Exception as e:
            return f"Error IA: {e}"
    return ""


# ── Demo data ─────────────────────────────────────────────────────────────────
rng = random.Random(42)

NARRATIVAS = [
    {"narrativa": "Caos gubernamental / ingobernabilidad", "menciones_24h": 48_200, "menciones_7d": 218_000, "sentimiento": -0.71, "tendencia": "up", "plataformas": "Twitter, TV", "partido_lidera": "PP", "riesgo_viral": "ALTO"},
    {"narrativa": "Crisis de vivienda sin solución", "menciones_24h": 34_100, "menciones_7d": 189_000, "sentimiento": -0.62, "tendencia": "up", "plataformas": "Instagram, Prensa", "partido_lidera": "Sumar", "riesgo_viral": "ALTO"},
    {"narrativa": "Reforma laboral en peligro", "menciones_24h": 21_400, "menciones_7d": 97_000, "sentimiento": -0.48, "tendencia": "stable", "plataformas": "Twitter, Radio", "partido_lidera": "VOX", "riesgo_viral": "MEDIO"},
    {"narrativa": "España fuera de la agenda europea", "menciones_24h": 15_700, "menciones_7d": 82_000, "sentimiento": -0.38, "tendencia": "up", "plataformas": "Prensa Digital", "partido_lidera": "PP", "riesgo_viral": "MEDIO"},
    {"narrativa": "Sánchez desconectado de la realidad", "menciones_24h": 12_300, "menciones_7d": 71_000, "sentimiento": -0.81, "tendencia": "down", "plataformas": "Twitter, WhatsApp", "partido_lidera": "VOX", "riesgo_viral": "BAJO"},
    {"narrativa": "Presupuestos bloqueados / sin gobierno", "menciones_24h": 9_800, "menciones_7d": 54_000, "sentimiento": -0.52, "tendencia": "stable", "plataformas": "TV, Radio", "partido_lidera": "PP", "riesgo_viral": "MEDIO"},
    {"narrativa": "Inflación y pérdida de poder adquisitivo", "menciones_24h": 8_400, "menciones_7d": 48_000, "sentimiento": -0.44, "tendencia": "up", "plataformas": "Twitter, Instagram", "partido_lidera": "VOX", "riesgo_viral": "MEDIO"},
    {"narrativa": "Inversión en renovables y empleo verde", "menciones_24h": 6_200, "menciones_7d": 39_000, "sentimiento": 0.55, "tendencia": "up", "plataformas": "Instagram, YouTube", "partido_lidera": "Sumar", "riesgo_viral": "BAJO"},
    {"narrativa": "Escándalo de corrupción (caso XYZ)", "menciones_24h": 5_900, "menciones_7d": 35_000, "sentimiento": -0.67, "tendencia": "down", "plataformas": "Prensa Digital", "partido_lidera": "PP", "riesgo_viral": "BAJO"},
    {"narrativa": "Sanidad pública bajo presión post-COVID", "menciones_24h": 4_100, "menciones_7d": 28_000, "sentimiento": -0.29, "tendencia": "stable", "plataformas": "Radio, TV", "partido_lidera": "PSOE", "riesgo_viral": "BAJO"},
]

MENSAJE_MATRIX = [
    {"partido": "PSOE",  "tema": "Vivienda",   "mensaje": "Ley de vivienda asequible ya en marcha", "reach": 8.2, "resonance": 6.8, "sent": 0.42},
    {"partido": "PSOE",  "tema": "Economía",   "mensaje": "Récord de empleo histórico bajo este gobierno", "reach": 7.5, "resonance": 5.9, "sent": 0.51},
    {"partido": "PSOE",  "tema": "Europa",     "mensaje": "España lidera la agenda verde en Bruselas", "reach": 5.8, "resonance": 6.2, "sent": 0.63},
    {"partido": "PP",    "tema": "Economía",   "mensaje": "Bajaremos el IRPF para las clases medias", "reach": 8.8, "resonance": 7.4, "sent": 0.58},
    {"partido": "PP",    "tema": "Seguridad",  "mensaje": "Mano dura contra la delincuencia organizada", "reach": 7.9, "resonance": 6.1, "sent": 0.44},
    {"partido": "PP",    "tema": "Vivienda",   "mensaje": "Eliminar la burocracia que frena la construcción", "reach": 6.4, "resonance": 5.5, "sent": 0.39},
    {"partido": "VOX",   "tema": "Inmigración","mensaje": "Control estricto de fronteras nacionales", "reach": 9.1, "resonance": 5.2, "sent": -0.31},
    {"partido": "VOX",   "tema": "Economía",   "mensaje": "Eliminar el impuesto de sucesiones ya", "reach": 7.2, "resonance": 4.8, "sent": -0.12},
    {"partido": "Sumar", "tema": "Vivienda",   "mensaje": "Alquileres protegidos para jóvenes menores de 35", "reach": 6.8, "resonance": 7.9, "sent": 0.71},
    {"partido": "Sumar", "tema": "Trabajo",    "mensaje": "Semana laboral de 4 días para todos", "reach": 7.4, "resonance": 8.2, "sent": 0.68},
]

AMENAZAS_NARRATIVAS = [
    {
        "narrativa": "Caos gubernamental / ingobernabilidad",
        "intensidad": "CRÍTICA",
        "tiempo_respuesta": "< 4h",
        "tono_recomendado": "Empoderador + datos",
        "canales": "Twitter, rueda de prensa, TV",
        "contramensaje": "España es el país de la UE con mayor crecimiento económico en 2025. La estabilidad se mide en hechos: 3 millones de empleos nuevos y récord de exportaciones.",
        "puntos_clave": [
            "Dato empleo: +3.1M desde 2019 (Eurostat)",
            "PIB +2.8% Q1 2025, líder en zona euro",
            "12 leyes aprobadas en los últimos 8 meses",
            "Presupuestos en tramitación con apoyo confirmado de 176 diputados",
        ],
    },
    {
        "narrativa": "Crisis de vivienda sin solución",
        "intensidad": "ALTA",
        "tiempo_respuesta": "< 12h",
        "tono_recomendado": "Empatía + propuesta concreta",
        "canales": "Instagram, medios digitales jóvenes",
        "contramensaje": "La Ley de Vivienda ya tiene 18 meses en funcionamiento con 47.000 contratos regulados. La solución es acelerar, no retroceder a la desregulación.",
        "puntos_clave": [
            "47.000 contratos bajo protección de la ley",
            "Plan de 100.000 viviendas públicas en 3 años",
            "Bono alquiler joven: 250€/mes para menores de 35",
            "Movilización de suelo público: 5.000 Ha adicionales",
        ],
    },
    {
        "narrativa": "Reforma laboral en peligro",
        "intensidad": "ALTA",
        "tiempo_respuesta": "< 8h",
        "tono_recomendado": "Firmeza + alianzas sindicales",
        "canales": "Radio, Twitter, notas de prensa",
        "contramensaje": "La reforma laboral ha creado el mercado laboral más estable de la historia democrática española. No hay marcha atrás posible.",
        "puntos_clave": [
            "Contratos indefinidos: 73% del total (récord histórico)",
            "CCOO y UGT respaldan la continuidad de la reforma",
            "Reducción de temporalidad del 26% al 16% en 3 años",
            "Apoyo de CEOE a mantener el marco regulatorio actual",
        ],
    },
]

ACTORES_MENSAJES = [
    {
        "actor": "Pedro Sánchez",
        "partido": "PSOE",
        "mensajes_core": [
            "Avanzamos hacia una España más justa y verde",
            "La política es gestión, no espectáculo",
            "Europa nos necesita fuerte y estable",
        ],
        "consistencia": 0.71,
        "desviaciones": 1,
        "sugerencia_ia": "Reforzar el eje de logros económicos con datos concretos. Evitar defensiva ante narrativa de ingobernabilidad — responder siempre con propuesta.",
        "temas_fuerza": ["Europa", "Empleo", "Clima"],
        "temas_debilidad": ["Vivienda", "Seguridad"],
    },
    {
        "actor": "Alberto Núñez Feijóo",
        "partido": "PP",
        "mensajes_core": [
            "España necesita estabilidad y un gobierno serio",
            "Bajaremos impuestos para todas las familias",
            "Ley y orden como base del progreso",
        ],
        "consistencia": 0.84,
        "desviaciones": 0,
        "sugerencia_ia": "Mensaje muy consistente. Oportunidad de ampliar a audiencias jóvenes con propuesta de vivienda más concreta y diferenciada de VOX.",
        "temas_fuerza": ["Economía", "Seguridad", "Estabilidad"],
        "temas_debilidad": ["Clima", "Igualdad"],
    },
    {
        "actor": "Yolanda Díaz",
        "partido": "Sumar",
        "mensajes_core": [
            "Los derechos laborales no son negociables",
            "Vivienda asequible es una prioridad de Estado",
            "La semana de 4 días es el futuro del trabajo",
        ],
        "consistencia": 0.88,
        "desviaciones": 0,
        "sugerencia_ia": "Alta consistencia narrativa. Foco en ampliar cobertura mediática más allá de audiencias ya convencidas. Canal TV y radio matinales infrautilizados.",
        "temas_fuerza": ["Trabajo", "Vivienda", "Igualdad"],
        "temas_debilidad": ["Seguridad", "Economía macro"],
    },
    {
        "actor": "Santiago Abascal",
        "partido": "VOX",
        "mensajes_core": [
            "España primero, antes que ningún dogma ideológico",
            "Fronteras cerradas a la inmigración ilegal",
            "Devolver el poder al pueblo, no a los partidos",
        ],
        "consistencia": 0.91,
        "desviaciones": 1,
        "sugerencia_ia": "Consistencia máxima pero riesgo de saturación de audiencia propia. Mensaje de inmigración empieza a perder tracción entre indecisos. Económico infradesarrollado.",
        "temas_fuerza": ["Inmigración", "Soberanía", "Seguridad"],
        "temas_debilidad": ["Economía", "Europa", "Vivienda"],
    },
]

# ─── Cobertura mediática por hora ─────────────────────────────────────────────
_horas = list(range(24))
_menciones_hora = [
    120, 80, 60, 45, 55, 140, 380, 620, 810, 740, 680, 590,
    640, 710, 680, 590, 640, 780, 920, 1050, 890, 710, 480, 280,
]
_PRIME_HOURS = {7, 8, 9, 13, 14, 20, 21, 22}

# ─── Header ───────────────────────────────────────────────────────────────────
intel_header(
    title="Communication Intelligence",
    subtitle="Estrategia de Mensaje",
    status="ACTIVO",
    time_str=datetime.datetime.now().strftime("%d/%m/%Y %H:%M"),
)

# ── KPI strip ────────────────────────────────────────────────────────────────
n_virales = sum(1 for n in NARRATIVAS if n["riesgo_viral"] in ("ALTO", "MEDIO"))
sent_medio = sum(n["sentimiento"] for n in NARRATIVAS) / len(NARRATIVAS)
top_narrativa = NARRATIVAS[0]["narrativa"][:38] + "…"

k1, k2, k3, k4 = st.columns(4)
with k1:
    st.markdown(kpi_card("Narrativas activas", str(len(NARRATIVAS)), sub="Top 10 monitorizadas", color=CYAN), unsafe_allow_html=True)
with k2:
    st.markdown(kpi_card("En riesgo viral", str(n_virales), sub="Requieren contraofensiva", color=RED if n_virales >= 3 else AMBER), unsafe_allow_html=True)
with k3:
    sent_color = RED if sent_medio < -0.3 else (AMBER if sent_medio < 0 else GREEN)
    st.markdown(kpi_card("Sentimiento medio", f"{sent_medio:+.2f}", sub="Escala -1 a +1", color=sent_color), unsafe_allow_html=True)
with k4:
    st.markdown(kpi_card("Menciones 24h (top)", f"{NARRATIVAS[0]['menciones_24h']:,}", sub=top_narrativa, color=PURPLE), unsafe_allow_html=True)

st.markdown("<div style='margin:.5rem 0'></div>", unsafe_allow_html=True)

# ── Imports de strategy_engine ────────────────────────────────────────────────
_SE_OK = False
try:
    from communications.strategy_engine import (
        analyze_issue_for_comms,
        build_message_triangle,
        generate_counter_narratives,
        generate_hostile_qna,
        red_team_message,
        recommend_channel_mix,
    )
    _SE_OK = True
except Exception:
    pass


def _se_call(fn_name: str, *args, **kwargs):
    """Llama a una función de strategy_engine con timeout. Retorna None si falla."""
    if not _SE_OK:
        return None
    try:
        import communications.strategy_engine as _se
        fn = getattr(_se, fn_name)
        return fn(*args, **kwargs)
    except Exception:
        return None


# ── TABS ─────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4, tab5, tabA, tabB, tabC, tabD, tabE, tabF = st.tabs([
    "MONITOR DE NARRATIVAS",
    "ANÁLISIS DE MENSAJE",
    "ESTRATEGIA DE RESPUESTA",
    "CICLO MEDIÁTICO",
    "MENSAJES CLAVE",
    "ESTRATEGIA",
    "TRIANGULO",
    "CONTRANARRATIVAS",
    "SIMULACRO PRENSA",
    "GUARDIAN MENSAJE",
    "MIX DE CANALES",
])

# ════════════════════════════════════════════════════════════════════════════
# TAB 1 — MONITOR DE NARRATIVAS
# ════════════════════════════════════════════════════════════════════════════
with tab1:
    section_header("Top 10 Narrativas en tiempo real", CYAN)

    # Table header
    st.markdown(
        f'<div class="narrtrack-header">'
        f'<span>Narrativa</span><span>24h</span><span>7d</span>'
        f'<span>Sentim.</span><span>Plataformas</span><span>Lidera / Riesgo</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

    for narr in NARRATIVAS:
        tend_icon = "▲" if narr["tendencia"] == "up" else ("▼" if narr["tendencia"] == "down" else "—")
        tend_color = RED if narr["tendencia"] == "up" else (GREEN if narr["tendencia"] == "down" else MUTED)
        sent_val = narr["sentimiento"]
        sent_color = RED if sent_val < -0.4 else (AMBER if sent_val < 0 else GREEN)
        riesgo_color = RED if narr["riesgo_viral"] == "ALTO" else (AMBER if narr["riesgo_viral"] == "MEDIO" else GREEN)

        st.markdown(
            f'<div class="narrtrack-row">'
            f'<span style="color:{TEXT};font-weight:600">{narr["narrativa"]}</span>'
            f'<span style="color:{tend_color};font-weight:700">{tend_icon} {narr["menciones_24h"]:,}</span>'
            f'<span style="color:{TEXT2}">{narr["menciones_7d"]:,}</span>'
            f'<span style="color:{sent_color};font-weight:700">{sent_val:+.2f}</span>'
            f'<span style="color:{MUTED}">{narr["plataformas"]}</span>'
            f'<span>'
            f'<span style="font-size:.65rem;font-weight:700;color:{TEXT2}">{narr["partido_lidera"]}</span> &nbsp;'
            f'<span style="background:{riesgo_color}22;color:{riesgo_color};font-size:.6rem;font-weight:700;'
            f'padding:.1rem .4rem;border-radius:4px">{narr["riesgo_viral"]}</span>'
            f'</span>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Narrative lifecycle chart ─────────────────────────────────────────────
    st.markdown("<div style='margin:1.2rem 0 .3rem'></div>", unsafe_allow_html=True)
    section_header("Ciclo de vida de narrativas (emergencia → pico → decaimiento)", BLUE)

    _days = list(range(-14, 16))
    _narrativa_sel_names = [n["narrativa"][:30] for n in NARRATIVAS[:4]]

    _lifecycle_data = {
        "Caos gubernamental / ing…": [
            max(0, 20 + i * 8 + rng.randint(-5, 5)) if i <= 5
            else max(0, 60 - (i - 5) * 4 + rng.randint(-5, 5))
            for i in range(30)
        ],
        "Crisis de vivienda sin s…": [
            max(0, 10 + i * 5 + rng.randint(-3, 3)) if i <= 8
            else max(0, 50 - (i - 8) * 3 + rng.randint(-3, 3))
            for i in range(30)
        ],
        "Reforma laboral en peligr…": [
            max(0, 30 - abs(i - 10) * 3 + rng.randint(-4, 4))
            for i in range(30)
        ],
        "España fuera de la agend…": [
            max(0, 5 + i * 3 + rng.randint(-2, 2))
            for i in range(30)
        ],
    }

    fig_lc = go.Figure()
    lc_colors = [RED, AMBER, BLUE, PURPLE]
    for idx, (name, vals) in enumerate(_lifecycle_data.items()):
        fig_lc.add_trace(go.Scatter(
            x=list(range(-14, 16)),
            y=vals,
            mode="lines",
            name=name,
            line=dict(color=lc_colors[idx], width=2),
            hovertemplate=f"<b>{name}</b><br>Día %{{x}}<br>Índice: %{{y}}<extra></extra>",
        ))
    fig_lc.add_vline(x=0, line_dash="dash", line_color=MUTED, annotation_text="Hoy", annotation_font_color=MUTED)
    fig_lc.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, height=220,
        margin=dict(l=10, r=10, t=10, b=30),
        xaxis=dict(tickfont=dict(color=MUTED, size=9), gridcolor=BORDER, color=MUTED, title="Días"),
        yaxis=dict(tickfont=dict(color=MUTED, size=9), gridcolor=BORDER, color=MUTED, title="Índice de tracción"),
        legend=dict(font=dict(color=TEXT2, size=9), bgcolor=BG3, bordercolor=BORDER, borderwidth=1),
        font=dict(color=TEXT),
    )
    st.plotly_chart(fig_lc, use_container_width=True, config={"displayModeBar": False})

    # ── Narrativas en riesgo de viralizarse ───────────────────────────────────
    st.markdown("<div style='margin:.8rem 0 .3rem'></div>", unsafe_allow_html=True)
    section_header("Narrativas en riesgo de viralizarse", RED)

    virales = [n for n in NARRATIVAS if n["riesgo_viral"] == "ALTO"]
    for narr in virales:
        card = signal_card(
            title=f"{narr['narrativa']}",
            body=(
                f'<span style="color:{RED};font-weight:700">RIESGO VIRAL ALTO</span> · '
                f'{narr["menciones_24h"]:,} menciones en 24h · '
                f'Tendencia: {"↑ Escalando" if narr["tendencia"] == "up" else "Estable"}<br>'
                f'Plataformas: {narr["plataformas"]} · Liderado por: <b>{narr["partido_lidera"]}</b>'
            ),
            level="critical",
            source="ElectSim NLP Engine",
            time_ago="En tiempo real",
        )
        st.markdown(card, unsafe_allow_html=True)


# ════════════════════════════════════════════════════════════════════════════
# TAB 2 — ANÁLISIS DE MENSAJE
# ════════════════════════════════════════════════════════════════════════════
with tab2:
    col_matrix, col_heatmap = st.columns([1, 1])

    with col_matrix:
        section_header("Matriz de efectividad: Reach × Resonance", CYAN)

        # 4-quadrant scatter
        fig_scatter = go.Figure()

        partido_colors = {"PSOE": "#E30613", "PP": "#009FDB", "VOX": "#63BE21", "Sumar": "#E4007C"}

        for partido in ["PSOE", "PP", "VOX", "Sumar"]:
            msgs_p = [m for m in MENSAJE_MATRIX if m["partido"] == partido]
            fig_scatter.add_trace(go.Scatter(
                x=[m["reach"] for m in msgs_p],
                y=[m["resonance"] for m in msgs_p],
                mode="markers+text",
                name=partido,
                marker=dict(
                    size=14,
                    color=partido_colors.get(partido, CYAN),
                    line=dict(color=BG, width=2),
                    opacity=0.85,
                ),
                text=[m["tema"] for m in msgs_p],
                textfont=dict(size=8, color=TEXT2),
                textposition="top center",
                hovertemplate=(
                    f"<b>{partido}</b><br>"
                    "%{customdata}<br>"
                    "Reach: %{x:.1f}<br>Resonance: %{y:.1f}<extra></extra>"
                ),
                customdata=[m["mensaje"] for m in msgs_p],
            ))

        # Quadrant lines
        fig_scatter.add_hline(y=6.5, line_dash="dot", line_color=BORDER)
        fig_scatter.add_vline(x=7.0, line_dash="dot", line_color=BORDER)

        # Quadrant labels — bgcolor/bordercolor usan hex_to_rgba (Plotly no acepta hex+alpha)
        for x_pos, y_pos, label, color in [
            (5.5, 8.5, "ALTO IMPACTO\nBAJO ALCANCE", GREEN),
            (8.5, 8.5, "MENSAJES ESTRELLA", CYAN),
            (5.5, 5.0, "BAJO RENDIMIENTO", MUTED),
            (8.5, 5.0, "ALTO ALCANCE\nBAJA RESONANCIA", AMBER),
        ]:
            fig_scatter.add_annotation(
                x=x_pos, y=y_pos, text=label.replace("\n", "<br>"),
                showarrow=False, font=dict(color=color, size=8),
                bgcolor=hex_to_rgba(color, 0.07),
                bordercolor=hex_to_rgba(color, 0.27),
                borderwidth=1, borderpad=4, align="center",
            )

        fig_scatter.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2, height=320,
            margin=dict(l=10, r=10, t=10, b=30),
            xaxis=dict(title="Reach (alcance)", range=[4, 10], tickfont=dict(color=MUTED, size=9), gridcolor=BORDER, color=MUTED),
            yaxis=dict(title="Resonance (resonancia)", range=[4, 10], tickfont=dict(color=MUTED, size=9), gridcolor=BORDER, color=MUTED),
            legend=dict(font=dict(color=TEXT2, size=10), bgcolor=BG3, bordercolor=BORDER, borderwidth=1),
            font=dict(color=TEXT),
        )
        st.plotly_chart(fig_scatter, use_container_width=True, config={"displayModeBar": False})

    with col_heatmap:
        section_header("Sentimiento partido × tema", PURPLE)

        partidos_h = ["PSOE", "PP", "VOX", "Sumar"]
        temas_h = ["Vivienda", "Economía", "Seguridad", "Europa", "Trabajo", "Inmigración"]

        # Build heatmap matrix
        hm_data = []
        for partido in partidos_h:
            row = []
            for tema in temas_h:
                matches = [m for m in MENSAJE_MATRIX if m["partido"] == partido and m["tema"] == tema]
                val = matches[0]["sent"] if matches else rng.uniform(-0.5, 0.6)
                row.append(round(val, 2))
            hm_data.append(row)

        fig_hm = go.Figure(go.Heatmap(
            z=hm_data,
            x=temas_h,
            y=partidos_h,
            colorscale=[[0, RED], [0.5, BG3], [1, GREEN]],
            zmid=0, zmin=-1, zmax=1,
            text=[[f"{v:+.2f}" for v in row] for row in hm_data],
            texttemplate="%{text}",
            textfont=dict(size=11, color=TEXT),
            hoverongaps=False,
            hovertemplate="<b>%{y} · %{x}</b><br>Sentimiento: %{z:+.2f}<extra></extra>",
        ))
        fig_hm.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2, height=220,
            margin=dict(l=10, r=10, t=10, b=30),
            xaxis=dict(tickfont=dict(color=TEXT2, size=10), side="bottom"),
            yaxis=dict(tickfont=dict(color=TEXT2, size=10)),
            font=dict(color=TEXT),
            coloraxis_showscale=False,
        )
        st.plotly_chart(fig_hm, use_container_width=True, config={"displayModeBar": False})

        # Comparison table
        section_header("Encuadres por partido · top 3 issues", AMBER)
        for partido in ["PSOE", "PP", "VOX", "Sumar"]:
            msgs_p = [m for m in MENSAJE_MATRIX if m["partido"] == partido][:3]
            p_color = {"PSOE": RED, "PP": BLUE, "VOX": GREEN, "Sumar": PURPLE}.get(partido, CYAN)
            items_html = "".join(
                f'<div style="font-size:.75rem;color:{TEXT2};padding:.25rem 0;border-bottom:1px solid {BORDER}">'
                f'<span style="color:{MUTED};font-size:.65rem">{m["tema"]}: </span>{m["mensaje"]}'
                f'</div>'
                for m in msgs_p
            )
            st.markdown(
                f'<div style="background:{BG2};border-left:3px solid {p_color};border-radius:0 8px 8px 0;'
                f'padding:.7rem 1rem;margin:.4rem 0">'
                f'<div style="font-size:.72rem;font-weight:800;color:{p_color};letter-spacing:.08em;margin-bottom:.3rem">{partido}</div>'
                f'{items_html}'
                f'</div>',
                unsafe_allow_html=True,
            )

        # AI gaps analysis button
        st.markdown("<div style='margin:.8rem 0 .3rem'></div>", unsafe_allow_html=True)
        if st.button("Analizar gaps en el mensaje (IA)", key="d9_gaps_ia", use_container_width=True):
            if _LLM_OK:
                with st.spinner("Analizando gaps narrativos..."):
                    resp = _llm_call(
                        "Basándote en los mensajes de PSOE, PP, VOX y Sumar sobre vivienda, economía y seguridad en España 2025, "
                        "identifica en 4-5 puntos los principales gaps narrativos: qué temas están sin explotar, "
                        "qué audiencias quedan sin interpelar y qué ventanas de oportunidad comunicacional existen. "
                        "Sé específico y estratégico.",
                    )
                    st.session_state["d9_gaps"] = resp
            else:
                st.session_state["d9_gaps"] = (
                    "**Gaps detectados (análisis demo):**\n\n"
                    "1. **Jóvenes propietarios (28-40 años):** Ningún partido ofrece mensaje de acceso real a hipoteca. "
                    "Solo Sumar toca alquiler pero no compra.\n"
                    "2. **Economía familiar real:** Los mensajes de PP se quedan en macro. Falta conexión con cesta de la compra y energía.\n"
                    "3. **Seguridad + bienestar:** VOX monopoliza seguridad con encuadre negativo. "
                    "Hay espacio para mensaje positivo de seguridad (convivencia, barrios).\n"
                    "4. **Trabajadores autónomos (3.4M):** Nicho sin dueño. PSOE los abandona a Hacienda, PP habla de empresas. "
                    "Oportunidad clara.\n"
                    "5. **Agenda rural:** 8M de españoles en municipios <10.000 hab. con cero representación narrativa en los top 10 mensajes.\n\n"
                    "_Conecta Ollama para análisis en tiempo real._"
                )

        if st.session_state.get("d9_gaps"):
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {PURPLE}44;border-radius:8px;'
                f'padding:.9rem 1rem;font-size:.78rem;color:{TEXT2};line-height:1.6;margin-top:.4rem">'
                f'{st.session_state["d9_gaps"].replace(chr(10),"<br>")}'
                f'</div>',
                unsafe_allow_html=True,
            )

# ════════════════════════════════════════════════════════════════════════════
# TAB 3 — ESTRATEGIA DE RESPUESTA
# ════════════════════════════════════════════════════════════════════════════
with tab3:
    section_header("Framework de respuesta: Detectar → Evaluar → Responder", AMBER)

    # 3-step framework
    fw1, fw2, fw3 = st.columns(3)
    with fw1:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {CYAN}44;border-top:2px solid {CYAN};'
            f'border-radius:8px;padding:1.1rem;text-align:center">'
            f'<div style="font-size:1.4rem;margin-bottom:.4rem"></div>'
            f'<div style="font-weight:700;color:{CYAN};font-size:.85rem;margin-bottom:.4rem">1. DETECTAR</div>'
            f'<div style="font-size:.75rem;color:{TEXT2};line-height:1.5">'
            f'Monitor NLP en tiempo real · Alertas automáticas por umbral · '
            f'Detección de picos de menciones en < 15 min'
            f'</div></div>',
            unsafe_allow_html=True,
        )
    with fw2:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {AMBER}44;border-top:2px solid {AMBER};'
            f'border-radius:8px;padding:1.1rem;text-align:center">'
            f'<div style="font-size:1.4rem;margin-bottom:.4rem">️</div>'
            f'<div style="font-weight:700;color:{AMBER};font-size:.85rem;margin-bottom:.4rem">2. EVALUAR</div>'
            f'<div style="font-size:.75rem;color:{TEXT2};line-height:1.5">'
            f'Score de riesgo (1-10) · Tiempo estimado de viralizacion · '
            f'Análisis de audiencia afectada · Identificar portavoces adversariales'
            f'</div></div>',
            unsafe_allow_html=True,
        )
    with fw3:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {GREEN}44;border-top:2px solid {GREEN};'
            f'border-radius:8px;padding:1.1rem;text-align:center">'
            f'<div style="font-size:1.4rem;margin-bottom:.4rem"></div>'
            f'<div style="font-weight:700;color:{GREEN};font-size:.85rem;margin-bottom:.4rem">3. RESPONDER</div>'
            f'<div style="font-size:.75rem;color:{TEXT2};line-height:1.5">'
            f'Contramensaje pre-aprobado · Puntos de referencia con datos · '
            f'Timing óptimo · Canales prioritarios · Portavoces asignados'
            f'</div></div>',
            unsafe_allow_html=True,
        )

    st.markdown("<div style='margin:1.2rem 0 .3rem'></div>", unsafe_allow_html=True)
    section_header("Amenazas activas con estrategia de respuesta", RED)

    for amenaza in AMENAZAS_NARRATIVAS:
        intens_color = RED if amenaza["intensidad"] == "CRÍTICA" else (AMBER if amenaza["intensidad"] == "ALTA" else BLUE)

        with st.expander(f"[{amenaza['intensidad']}] {amenaza['narrativa']}", expanded=(amenaza["intensidad"] == "CRÍTICA")):
            a1, a2 = st.columns([1, 1])
            with a1:
                st.markdown(
                    f'<div style="background:{BG3};border-radius:8px;padding:.9rem 1rem;margin-bottom:.5rem">'
                    f'<div style="font-size:.62rem;color:{MUTED};letter-spacing:.08em;margin-bottom:.4rem">PARÁMETROS DE RESPUESTA</div>'
                    f'<div style="display:flex;flex-direction:column;gap:.3rem">'
                    f'<div><span style="color:{MUTED};font-size:.72rem">Tiempo máx. de respuesta: </span>'
                    f'<span style="color:{intens_color};font-weight:700;font-size:.78rem">{amenaza["tiempo_respuesta"]}</span></div>'
                    f'<div><span style="color:{MUTED};font-size:.72rem">Tono recomendado: </span>'
                    f'<span style="color:{TEXT2};font-size:.78rem">{amenaza["tono_recomendado"]}</span></div>'
                    f'<div><span style="color:{MUTED};font-size:.72rem">Canales: </span>'
                    f'<span style="color:{CYAN};font-size:.78rem">{amenaza["canales"]}</span></div>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )

                st.markdown(
                    f'<div style="background:{BG3};border-left:3px solid {intens_color};'
                    f'border-radius:0 8px 8px 0;padding:.8rem 1rem">'
                    f'<div style="font-size:.62rem;color:{MUTED};letter-spacing:.08em;margin-bottom:.35rem">CONTRAMENSAJE RECOMENDADO</div>'
                    f'<div style="font-size:.82rem;color:{TEXT};line-height:1.55;font-style:italic">'
                    f'"{amenaza["contramensaje"]}"'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )

            with a2:
                st.markdown(
                    f'<div style="background:{BG3};border-radius:8px;padding:.9rem 1rem">'
                    f'<div style="font-size:.62rem;color:{MUTED};letter-spacing:.08em;margin-bottom:.5rem">TALKING POINTS — LISTO PARA COPIAR</div>',
                    unsafe_allow_html=True,
                )
                for i, punto in enumerate(amenaza["puntos_clave"], 1):
                    st.markdown(
                        f'<div class="talking-point">'
                        f'<span style="color:{CYAN};font-weight:700;margin-right:.5rem">{i}.</span>'
                        f'{punto}'
                        f'</div>',
                        unsafe_allow_html=True,
                    )
                st.markdown("</div>", unsafe_allow_html=True)

                # AI strategy button
                ai_key = f"d9_strategy_{amenaza['narrativa'][:20].replace(' ','_')}"
                if st.button(f"Generar estrategia IA completa", key=ai_key, use_container_width=True):
                    if _LLM_OK:
                        with st.spinner("Construyendo estrategia de contra-narrativa..."):
                            resp = _llm_call(
                                f"Crea una estrategia de contraofensiva comunicacional para la narrativa adversarial: "
                                f"'{amenaza['narrativa']}'. Intensidad: {amenaza['intensidad']}. "
                                f"En 4-5 pasos concretos: mensaje, timing, canales, portavoces y métricas de éxito. "
                                f"Contexto español. Muy concreto.",
                            )
                            st.session_state[ai_key] = resp
                    else:
                        st.session_state[ai_key] = (
                            f"Estrategia completa generada en modo demo. Activa Ollama para estrategia personalizada."
                        )

                if st.session_state.get(ai_key):
                    st.markdown(
                        f'<div style="background:{BG2};border:1px solid {PURPLE}44;border-radius:8px;'
                        f'padding:.8rem;font-size:.75rem;color:{TEXT2};line-height:1.5;margin-top:.4rem">'
                        f'{st.session_state[ai_key].replace(chr(10),"<br>")}'
                        f'</div>',
                        unsafe_allow_html=True,
                    )

# ════════════════════════════════════════════════════════════════════════════
# TAB 4 — CICLO MEDIÁTICO
# ════════════════════════════════════════════════════════════════════════════
with tab4:
    col_timeline, col_pie = st.columns([2, 1])

    with col_timeline:
        section_header("Cobertura mediática — últimas 24h", CYAN)

        bar_colors = [
            CYAN if h in _PRIME_HOURS else "rgba(0,212,255,0.267)"
            for h in _horas
        ]
        fig_24h = go.Figure(go.Bar(
            x=[f"{h:02d}h" for h in _horas],
            y=_menciones_hora,
            marker_color=bar_colors,
            hovertemplate="<b>%{x}</b><br>%{y:,} menciones<extra></extra>",
        ))
        fig_24h.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2, height=240,
            margin=dict(l=10, r=10, t=10, b=30),
            xaxis=dict(tickfont=dict(color=MUTED, size=9), gridcolor=BORDER, color=MUTED),
            yaxis=dict(tickfont=dict(color=MUTED, size=9), gridcolor=BORDER, color=MUTED),
            font=dict(color=TEXT),
            bargap=0.15,
        )
        fig_24h.add_annotation(
            x="21h", y=1050,
            text="Prime time",
            showarrow=True, arrowhead=2,
            arrowcolor=CYAN, font=dict(color=CYAN, size=10),
            ax=30, ay=-30,
        )
        st.plotly_chart(fig_24h, use_container_width=True, config={"displayModeBar": False})

        # Prime-time analysis
        section_header("Prime-time vs off-peak", PURPLE)
        prime_total = sum(_menciones_hora[h] for h in _horas if h in _PRIME_HOURS)
        offpeak_total = sum(_menciones_hora[h] for h in _horas if h not in _PRIME_HOURS)
        prime_pct = prime_total / (prime_total + offpeak_total) * 100

        m1, m2, m3 = st.columns(3)
        with m1:
            st.markdown(kpi_card("Prime-time", f"{prime_total:,}", sub=f"{prime_pct:.0f}% del total diario", color=CYAN), unsafe_allow_html=True)
        with m2:
            st.markdown(kpi_card("Off-peak", f"{offpeak_total:,}", sub=f"{100-prime_pct:.0f}% del total diario", color=MUTED), unsafe_allow_html=True)
        with m3:
            peak_hour = _horas[_menciones_hora.index(max(_menciones_hora))]
            st.markdown(kpi_card("Hora pico", f"{peak_hour:02d}:00", sub=f"{max(_menciones_hora):,} menciones", color=AMBER), unsafe_allow_html=True)

        # Optimal timing recommendations
        st.markdown("<div style='margin:.8rem 0 .3rem'></div>", unsafe_allow_html=True)
        section_header("Timing óptimo de publicación", GREEN)

        timing_recs = [
            {"franja": "07:30 – 08:30", "razon": "Radio matinal + apertura redes. Máxima captación medios", "audiencia": "Periodistas, profesionales", "score": 9.2},
            {"franja": "13:00 – 14:00", "razon": "Cierre de mañana. Publicaciones indexadas en telediarios", "audiencia": "Clase media, mayores", "score": 8.7},
            {"franja": "20:00 – 21:30", "razon": "Telediario + prime Twitter. Mayor viralidad documentada", "audiencia": "Todos los perfiles", "score": 9.8},
            {"franja": "22:00 – 23:00", "razon": "Segunda ola en redes. Debates nocturnos y jóvenes", "audiencia": "Jóvenes 18-35", "score": 7.9},
        ]

        for rec in timing_recs:
            score_color = CYAN if rec["score"] >= 9 else (GREEN if rec["score"] >= 8 else AMBER)
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {score_color};'
                f'border-radius:0 8px 8px 0;padding:.65rem 1rem;margin:.3rem 0;display:flex;align-items:center;gap:1rem">'
                f'<div style="min-width:110px"><span style="font-size:.82rem;font-weight:700;color:{score_color}">{rec["franja"]}</span></div>'
                f'<div style="flex:1"><div style="font-size:.75rem;color:{TEXT2}">{rec["razon"]}</div>'
                f'<div style="font-size:.65rem;color:{MUTED};margin-top:.15rem">Audiencia: {rec["audiencia"]}</div></div>'
                f'<div style="text-align:center;min-width:50px">'
                f'<div style="font-size:1.1rem;font-weight:800;color:{score_color}">{rec["score"]}</div>'
                f'<div style="font-size:.55rem;color:{MUTED}">SCORE</div>'
                f'</div></div>',
                unsafe_allow_html=True,
            )

    with col_pie:
        section_header("Distribución por fuente", AMBER)

        fuentes = ["Twitter/X", "TV", "Prensa Digital", "Radio", "Instagram", "WhatsApp", "YouTube"]
        fuente_vals = [38, 22, 17, 11, 7, 3, 2]
        fuente_colors = [CYAN, BLUE, PURPLE, AMBER, RED, GREEN, MUTED]

        fig_pie = go.Figure(go.Pie(
            labels=fuentes,
            values=fuente_vals,
            hole=0.55,
            marker=dict(colors=fuente_colors, line=dict(color=BG, width=2)),
            textfont=dict(color=TEXT, size=10),
            hovertemplate="<b>%{label}</b><br>%{value}% de menciones<extra></extra>",
        ))
        fig_pie.update_layout(
            paper_bgcolor=BG2, height=260,
            margin=dict(l=5, r=5, t=5, b=5),
            showlegend=True,
            legend=dict(font=dict(color=TEXT2, size=9), bgcolor=BG3, bordercolor=BORDER, borderwidth=1),
            font=dict(color=TEXT),
            annotations=[dict(
                text=f"<b>{sum(fuente_vals):,}</b><br>fuentes",
                x=0.5, y=0.5, font=dict(size=13, color=TEXT),
                showarrow=False,
            )],
        )
        st.plotly_chart(fig_pie, use_container_width=True, config={"displayModeBar": False})

        # Key stats
        section_header("Métricas clave", CYAN)
        stats = [
            ("Tiempo medio de respuesta mediática", "47 min"),
            ("Eco promedio por nota de prensa", "12.4 medios"),
            ("Tasa de encuadre favorable", "38%"),
            ("Menciones espontáneas vs reactivas", "61% / 39%"),
            ("Portavoces citados con nombre", "4.2/día"),
        ]
        for stat, val in stats:
            st.markdown(
                f'<div style="display:flex;justify-content:space-between;align-items:center;'
                f'padding:.4rem 0;border-bottom:1px solid {BORDER};font-size:.75rem">'
                f'<span style="color:{TEXT2}">{stat}</span>'
                f'<span style="color:{CYAN};font-weight:700">{val}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ════════════════════════════════════════════════════════════════════════════
# TAB 5 — MENSAJES CLAVE
# ════════════════════════════════════════════════════════════════════════════
with tab5:
    section_header("Biblioteca de mensajes por actor", CYAN)

    # Selector
    actor_names = [a["actor"] for a in ACTORES_MENSAJES]
    actor_sel = st.selectbox("Seleccionar actor", actor_names, key="d9_actor_sel")
    actor_data = next(a for a in ACTORES_MENSAJES if a["actor"] == actor_sel)
    p_color = {"PSOE": RED, "PP": BLUE, "VOX": GREEN, "Sumar": PURPLE}.get(actor_data["partido"], CYAN)

    col_actor, col_ia = st.columns([3, 2])

    with col_actor:
        # Actor header
        consist_pct = int(actor_data["consistencia"] * 100)
        consist_color = GREEN if consist_pct >= 80 else (AMBER if consist_pct >= 60 else RED)

        st.markdown(
            f'<div class="actor-msg-card" style="border-left:4px solid {p_color}">'
            f'<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">'
            f'<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,{p_color}44,{p_color}22);'
            f'border:2px solid {p_color}66;display:flex;align-items:center;justify-content:center;'
            f'font-size:1.1rem;font-weight:800;color:{p_color};flex-shrink:0">'
            f'{actor_data["actor"][0]}'
            f'</div>'
            f'<div>'
            f'<div style="font-size:1rem;font-weight:700;color:{TEXT}">{actor_data["actor"]}</div>'
            f'<div style="font-size:.72rem;color:{MUTED}">{actor_data["partido"]}</div>'
            f'</div>'
            f'<div style="margin-left:auto;text-align:right">'
            f'<div style="font-size:.62rem;color:{MUTED};margin-bottom:.2rem">CONSISTENCIA</div>'
            f'<div style="font-size:1.4rem;font-weight:800;color:{consist_color}">{consist_pct}%</div>'
            f'</div>'
            f'</div>'
            f'<div style="height:4px;background:{BORDER};border-radius:2px;margin-bottom:1rem">'
            f'<div style="height:4px;width:{consist_pct}%;background:{consist_color};border-radius:2px"></div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        # Core messages
        st.markdown(
            f'<div style="font-size:.62rem;color:{MUTED};letter-spacing:.1em;margin-bottom:.5rem">MENSAJES CORE</div>',
            unsafe_allow_html=True,
        )
        for msg in actor_data["mensajes_core"]:
            st.markdown(
                f'<div style="background:{BG3};border-left:2px solid {p_color};'
                f'padding:.55rem .85rem;border-radius:0 6px 6px 0;margin:.3rem 0;'
                f'font-size:.82rem;color:{TEXT2}">{msg}</div>',
                unsafe_allow_html=True,
            )

        # Themes
        col_fuerza, col_debil = st.columns(2)
        with col_fuerza:
            st.markdown(
                f'<div style="font-size:.62rem;color:{GREEN};letter-spacing:.1em;margin:.6rem 0 .3rem">TEMAS FUERZA</div>',
                unsafe_allow_html=True,
            )
            for t in actor_data["temas_fuerza"]:
                st.markdown(
                    f'<span style="background:{GREEN}18;color:{GREEN};font-size:.7rem;font-weight:600;'
                    f'padding:.2rem .6rem;border-radius:4px;margin:.2rem .2rem 0 0;display:inline-block">{t}</span>',
                    unsafe_allow_html=True,
                )
        with col_debil:
            st.markdown(
                f'<div style="font-size:.62rem;color:{AMBER};letter-spacing:.1em;margin:.6rem 0 .3rem">ÁREAS DE RIESGO</div>',
                unsafe_allow_html=True,
            )
            for t in actor_data["temas_debilidad"]:
                st.markdown(
                    f'<span style="background:{AMBER}18;color:{AMBER};font-size:.7rem;font-weight:600;'
                    f'padding:.2rem .6rem;border-radius:4px;margin:.2rem .2rem 0 0;display:inline-block">{t}</span>',
                    unsafe_allow_html=True,
                )

        st.markdown("</div>", unsafe_allow_html=True)

        # Inconsistency alert if any
        if actor_data["desviaciones"] > 0:
            st.markdown(
                f'<div style="background:{RED}11;border:1px solid {RED}44;border-radius:8px;'
                f'padding:.7rem 1rem;margin-top:.5rem">'
                f'<span style="color:{RED};font-weight:700;font-size:.78rem"> {actor_data["desviaciones"]} desviación detectada</span>'
                f'<div style="font-size:.72rem;color:{TEXT2};margin-top:.25rem">'
                f'Se ha detectado un mensaje fuera del eje narrativo habitual del actor en los últimos 7 días. '
                f'Revisar coherencia con línea editorial del partido.</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    with col_ia:
        section_header("Análisis IA del actor", PURPLE)

        # Show suggestion
        st.markdown(
            f'<div style="background:{BG3};border:1px solid {PURPLE}44;border-radius:8px;'
            f'padding:.9rem 1rem;font-size:.8rem;color:{TEXT2};line-height:1.6;margin-bottom:.8rem">'
            f'<div style="font-size:.62rem;color:{PURPLE};font-weight:700;letter-spacing:.08em;margin-bottom:.4rem">DIAGNÓSTICO IA</div>'
            f'{actor_data["sugerencia_ia"]}'
            f'</div>',
            unsafe_allow_html=True,
        )

        # Consistency score history chart
        section_header("Consistencia — 30 días", CYAN)
        _cons_days = list(range(30))
        base_cons = actor_data["consistencia"]
        _cons_vals = [
            max(0.3, min(1.0, base_cons + rng.uniform(-0.08, 0.08)))
            for _ in _cons_days
        ]

        fig_cons = go.Figure()
        fig_cons.add_trace(go.Scatter(
            x=_cons_days,
            y=_cons_vals,
            mode="lines",
            line=dict(color=p_color, width=2),
            fill="tozeroy",
            fillcolor=hex_to_rgba(p_color, 0.09),
            hovertemplate="Día %{x}<br>Consistencia: %{y:.0%}<extra></extra>",
        ))
        fig_cons.add_hline(y=0.7, line_dash="dash", line_color=AMBER, line_width=1,
                           annotation_text="Umbral 70%", annotation_font_color=AMBER, annotation_font_size=9)
        fig_cons.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2, height=150,
            margin=dict(l=10, r=10, t=5, b=20),
            xaxis=dict(tickfont=dict(color=MUTED, size=8), gridcolor=BORDER, showgrid=False),
            yaxis=dict(tickfont=dict(color=MUTED, size=8), gridcolor=BORDER, tickformat=".0%", range=[0, 1]),
            font=dict(color=TEXT),
            showlegend=False,
        )
        st.plotly_chart(fig_cons, use_container_width=True, config={"displayModeBar": False})

        # AI message suggestions
        section_header("Mensajes sugeridos por IA", GREEN)
        ai_msg_key = f"d9_ai_msgs_{actor_sel.replace(' ', '_')}"
        if st.button(f"Generar mensajes para {actor_sel.split()[0]}", key=ai_msg_key + "_btn", use_container_width=True):
            if _LLM_OK:
                with st.spinner("Generando mensajes..."):
                    resp = _llm_call(
                        f"Genera 3 mensajes políticos para {actor_sel} ({actor_data['partido']}) en España 2025. "
                        f"Sus temas fuertes son: {', '.join(actor_data['temas_fuerza'])}. "
                        f"Deben ser auténticos a su voz, directos, y conectar emocionalmente. "
                        f"Máximo 140 caracteres cada uno. Numerados.",
                    )
                    st.session_state[ai_msg_key] = resp
            else:
                temas_str = " y ".join(actor_data["temas_fuerza"][:2])
                st.session_state[ai_msg_key] = (
                    f"**Mensajes sugeridos (demo):**\n\n"
                    f"1. «La {temas_str} no es una opción de partido: es una obligación de Estado. Lo haremos.»\n\n"
                    f"2. «España no puede esperar más. Cada día sin acción es un día perdido para las familias españolas.»\n\n"
                    f"3. «Los datos no mienten: nuestras políticas funcionan. Los adversarios no tienen alternativa real.»\n\n"
                    f"_Activa Ollama para mensajes personalizados en tiempo real._"
                )

        if st.session_state.get(ai_msg_key):
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {GREEN}44;border-radius:8px;'
                f'padding:.9rem 1rem;font-size:.78rem;color:{TEXT2};line-height:1.6;margin-top:.4rem">'
                f'{st.session_state[ai_msg_key].replace(chr(10),"<br>")}'
                f'</div>',
                unsafe_allow_html=True,
            )

        # All actors consistency overview
        st.markdown("<div style='margin:.8rem 0 .3rem'></div>", unsafe_allow_html=True)
        section_header("Consistencia global actores", AMBER)
        for actor in ACTORES_MENSAJES:
            a_color = {"PSOE": RED, "PP": BLUE, "VOX": GREEN, "Sumar": PURPLE}.get(actor["partido"], CYAN)
            a_pct = int(actor["consistencia"] * 100)
            a_consist_color = GREEN if a_pct >= 80 else (AMBER if a_pct >= 60 else RED)
            inc_badge = (
                f'<span style="font-size:.6rem;color:{RED};background:{RED}18;'
                f'border-radius:4px;padding:.1rem .35rem;margin-left:.3rem"> {actor["desviaciones"]} desv.</span>'
                if actor["desviaciones"] > 0 else ""
            )
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.7rem;padding:.35rem 0;border-bottom:1px solid {BORDER}">'
                f'<span style="font-size:.75rem;color:{TEXT2};min-width:140px">{actor["actor"].split()[0]} {actor["actor"].split()[-1]}{inc_badge}</span>'
                f'<div style="flex:1;height:5px;background:{BORDER};border-radius:3px">'
                f'<div style="height:5px;width:{a_pct}%;background:{a_consist_color};border-radius:3px"></div>'
                f'</div>'
                f'<span style="font-size:.75rem;color:{a_consist_color};font-weight:700;min-width:35px;text-align:right">{a_pct}%</span>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ════════════════════════════════════════════════════════════════════════════
# TAB A — ESTRATEGIA
# ════════════════════════════════════════════════════════════════════════════
_AUDIENCES = ["Ciudadanos", "Militantes", "Medios", "Empresas", "Internacional"]

with tabA:
    section_header("Analisis estrategico de issue comunicacional", CYAN)
    st.markdown(
        f'<div style="font-size:.78rem;color:{TEXT2};margin-bottom:1rem">'
        f'Introduce el asunto o crisis y obtén un diagnóstico completo: marcos rival y propio, '
        f'mensaje central, argumentos, preguntas hostiles y canal recomendado.'
        f'</div>',
        unsafe_allow_html=True,
    )

    a_col1, a_col2 = st.columns([3, 1])
    with a_col1:
        a_issue = st.text_area(
            "Describe el asunto o crisis a gestionar",
            key="a_issue",
            height=90,
            placeholder="Ej: La oposición acusa al gobierno de no tener plan de vivienda asequible...",
        )
    with a_col2:
        a_audience = st.selectbox("Audiencia principal", _AUDIENCES, key="a_audience")

    a_context = st.text_area(
        "Contexto adicional (opcional)",
        key="a_context",
        height=60,
        placeholder="Fechas clave, actores involucrados, eventos recientes...",
    )

    if st.button("Analizar estrategia", key="a_run", use_container_width=True):
        if not a_issue.strip():
            st.warning("Introduce el asunto a analizar.")
        else:
            with st.spinner("Analizando estrategia de comunicacion... (max. 15s)"):
                ctx = {"audience": a_audience, "context": a_context}
                result = _se_call("analyze_issue_for_comms", a_issue, ctx)
                if result is None:
                    result = {
                        "rival_frame": "La oposicion encuadra el asunto como un fracaso de gestion sin precedentes.",
                        "own_frame": "Estamos tomando medidas concretas con resultados verificables.",
                        "central_message": "Actuamos, no solo prometemos — los datos lo confirman.",
                        "three_arguments": [
                            "Dato: X indicadores han mejorado desde la implementacion de la medida.",
                            "Valor: Nuestra posicion defiende a los ciudadanos frente a intereses de lobby.",
                            "Futuro: El camino que proponemos genera estabilidad a largo plazo.",
                        ],
                        "hostile_questions": [
                            "¿No llega demasiado tarde esta medida?",
                            "¿Por que no lo hicieron antes?",
                            "¿Cuanto va a costar esto a los contribuyentes?",
                        ],
                        "answers": [
                            "Las reformas estructurales requieren tiempo — lo importante es que estan funcionando.",
                            "Actuamos en cuanto tuvimos la mayoria parlamentaria necesaria.",
                            "La inversion se financia con los ahorros generados por eficiencia en otras partidas.",
                        ],
                        "recommended_channel": "twitter_x, rueda_de_prensa",
                        "do_not_say": ["Catastrofe", "Sin precedentes", "Culpa de los anteriores"],
                        "mode": "MODO DEMO",
                    }
                st.session_state["tabA_result"] = result

    if st.session_state.get("tabA_result"):
        r = st.session_state["tabA_result"]
        _mode = r.get("mode", "")
        if _mode:
            st.markdown(
                f'<span style="background:{AMBER}22;color:{AMBER};font-size:.62rem;font-weight:700;'
                f'padding:.2rem .6rem;border-radius:4px;letter-spacing:.08em">{_mode}</span>',
                unsafe_allow_html=True,
            )

        c1, c2 = st.columns(2)
        with c1:
            section_header("Marco rival", RED)
            st.markdown(
                f'<div style="background:{RED}0D;border:1px solid {RED}33;border-radius:8px;'
                f'padding:.8rem 1rem;font-size:.82rem;color:{TEXT2};line-height:1.5">'
                f'{r.get("rival_frame","—")}</div>',
                unsafe_allow_html=True,
            )
        with c2:
            section_header("Nuestro marco", GREEN)
            st.markdown(
                f'<div style="background:{GREEN}0D;border:1px solid {GREEN}33;border-radius:8px;'
                f'padding:.8rem 1rem;font-size:.82rem;color:{TEXT2};line-height:1.5">'
                f'{r.get("own_frame","—")}</div>',
                unsafe_allow_html=True,
            )

        section_header("Mensaje central", CYAN)
        st.markdown(
            f'<div style="background:{CYAN}0D;border:2px solid {CYAN}44;border-radius:8px;'
            f'padding:1rem 1.2rem;font-size:1rem;font-weight:700;color:{TEXT};text-align:center">'
            f'{r.get("central_message","—")}</div>',
            unsafe_allow_html=True,
        )

        section_header("3 argumentos clave", BLUE)
        for i, arg in enumerate(r.get("three_arguments", [])[:3], 1):
            st.markdown(
                f'<div style="background:{BG3};border-left:3px solid {BLUE};border-radius:0 8px 8px 0;'
                f'padding:.6rem .9rem;margin:.3rem 0;font-size:.8rem;color:{TEXT2}">'
                f'<span style="color:{BLUE};font-weight:700">{i}.</span> {arg}</div>',
                unsafe_allow_html=True,
            )

        hqs = r.get("hostile_questions", [])
        ans = r.get("answers", [])
        if hqs:
            section_header("Preguntas hostiles + respuestas sugeridas", AMBER)
            for q, a_text in zip(hqs, ans):
                st.markdown(
                    f'<div style="background:{AMBER}0A;border-left:3px solid {AMBER};'
                    f'border-radius:0 8px 8px 0;padding:.55rem .9rem;margin:.3rem 0;'
                    f'font-size:.8rem;color:{AMBER}"><strong>P:</strong> {q}</div>'
                    f'<div style="background:{GREEN}0A;border-left:3px solid {GREEN};'
                    f'border-radius:0 8px 8px 0;padding:.55rem .9rem;margin:.1rem 0 .5rem;'
                    f'font-size:.8rem;color:{TEXT2}"><strong>R:</strong> {a_text}</div>',
                    unsafe_allow_html=True,
                )

        c3, c4 = st.columns(2)
        with c3:
            channel = r.get("recommended_channel", "—")
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;padding:.8rem 1rem">'
                f'<div style="font-size:.6rem;color:{MUTED};letter-spacing:.1em;margin-bottom:.3rem">CANAL RECOMENDADO</div>'
                f'<div style="font-size:.9rem;font-weight:700;color:{CYAN}">{channel}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        with c4:
            dont = r.get("do_not_say", [])
            if dont:
                dont_html = " &bull; ".join(
                    f'<span style="color:{RED}">{d}</span>' for d in dont[:4]
                )
                st.markdown(
                    f'<div style="background:{RED}0A;border:1px solid {RED}22;border-radius:8px;padding:.8rem 1rem">'
                    f'<div style="font-size:.6rem;color:{MUTED};letter-spacing:.1em;margin-bottom:.3rem">NO DECIR NUNCA</div>'
                    f'<div style="font-size:.78rem">{dont_html}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )


# ════════════════════════════════════════════════════════════════════════════
# TAB B — TRIANGULO DE MENSAJE
# ════════════════════════════════════════════════════════════════════════════
with tabB:
    section_header("Triangulo de mensaje politico", CYAN)
    st.markdown(
        f'<div style="font-size:.78rem;color:{TEXT2};margin-bottom:1rem">'
        f'El triangulo de mensaje estructura la comunicacion en tres vertices: '
        f'Cabeza (intelectual), Corazon (emocional) y Manos (practico/accion).'
        f'</div>',
        unsafe_allow_html=True,
    )

    b_col1, b_col2 = st.columns([3, 1])
    with b_col1:
        b_issue = st.text_area("Issue principal", key="b_issue", height=75,
                                placeholder="Ej: Propuesta de reforma de la ley de vivienda...")
    with b_col2:
        b_audience = st.selectbox("Audiencia", _AUDIENCES, key="b_audience")

    if st.button("Construir triangulo", key="b_run", use_container_width=True):
        if not b_issue.strip():
            st.warning("Introduce el issue.")
        else:
            with st.spinner("Construyendo triangulo de mensaje... (max. 15s)"):
                result = _se_call("build_message_triangle", b_issue, b_audience)
                if result is None:
                    result = {
                        "central_message": "La vivienda asequible es un derecho, no un privilegio.",
                        "argument_1": "CABEZA: Los datos del INE muestran que el 40% de los jovenes dedican mas del 50% de su renta al alquiler.",
                        "argument_2": "CORAZON: Cada familia que no puede acceder a una vivienda digna es una promesa rota.",
                        "argument_3": "MANOS: Nuestra ley pone 50.000 viviendas protegidas en el mercado antes de 2026.",
                        "tone": "conciliador",
                        "issue": b_issue,
                        "audience": b_audience,
                        "mode": "MODO DEMO",
                    }
                st.session_state["tabB_result"] = result

    if st.session_state.get("tabB_result"):
        r = st.session_state["tabB_result"]
        if r.get("mode"):
            st.markdown(
                f'<span style="background:{AMBER}22;color:{AMBER};font-size:.62rem;font-weight:700;'
                f'padding:.2rem .6rem;border-radius:4px">{r["mode"]}</span>',
                unsafe_allow_html=True,
            )

        section_header("Mensaje central", CYAN)
        st.markdown(
            f'<div style="background:{CYAN}0D;border:2px solid {CYAN}44;border-radius:8px;'
            f'padding:1rem 1.2rem;font-size:1rem;font-weight:700;color:{TEXT};text-align:center;margin-bottom:1rem">'
            f'{r.get("central_message","—")}</div>',
            unsafe_allow_html=True,
        )

        # Visual triangle layout
        tri_html = (
            f'<div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;margin:1rem 0">'
            # Vertex top (Cabeza)
            f'<div style="background:{BLUE}18;border:1px solid {BLUE}55;border-radius:10px;'
            f'padding:1rem 1.5rem;max-width:520px;width:100%">'
            f'<div style="font-size:.62rem;font-weight:800;color:{BLUE};letter-spacing:.12em;margin-bottom:.4rem">CABEZA — INTELECTUAL</div>'
            f'<div style="font-size:.82rem;color:{TEXT2};line-height:1.5">{r.get("argument_1","—")}</div>'
            f'</div>'
            # Row with two lower vertices
            f'<div style="display:flex;gap:.5rem;width:100%;max-width:520px">'
            # Bottom-left (Corazon)
            f'<div style="background:{RED}12;border:1px solid {RED}44;border-radius:10px;'
            f'padding:1rem;flex:1">'
            f'<div style="font-size:.62rem;font-weight:800;color:{RED};letter-spacing:.12em;margin-bottom:.4rem">CORAZON — EMOCIONAL</div>'
            f'<div style="font-size:.8rem;color:{TEXT2};line-height:1.45">{r.get("argument_2","—")}</div>'
            f'</div>'
            # Bottom-right (Manos)
            f'<div style="background:{GREEN}12;border:1px solid {GREEN}44;border-radius:10px;'
            f'padding:1rem;flex:1">'
            f'<div style="font-size:.62rem;font-weight:800;color:{GREEN};letter-spacing:.12em;margin-bottom:.4rem">MANOS — PRACTICO</div>'
            f'<div style="font-size:.8rem;color:{TEXT2};line-height:1.45">{r.get("argument_3","—")}</div>'
            f'</div>'
            f'</div>'
            f'</div>'
        )
        st.markdown(tri_html, unsafe_allow_html=True)

        tone = r.get("tone", "")
        if tone:
            tone_color = {"combativo": RED, "moderado": BLUE, "conciliador": GREEN,
                          "tecnico": CYAN, "emocional": PURPLE}.get(tone, MUTED)
            st.markdown(
                f'<span style="background:{tone_color}22;color:{tone_color};font-size:.7rem;'
                f'font-weight:700;padding:.25rem .7rem;border-radius:4px;letter-spacing:.06em">'
                f'TONO: {tone.upper()}</span>',
                unsafe_allow_html=True,
            )


# ════════════════════════════════════════════════════════════════════════════
# TAB C — NARRATIVAS CONTRA
# ════════════════════════════════════════════════════════════════════════════
with tabC:
    section_header("Generador de contranarrativas", PURPLE)
    st.markdown(
        f'<div style="font-size:.78rem;color:{TEXT2};margin-bottom:1rem">'
        f'Introduce el marco narrativo adversarial y tu posicion propia para generar '
        f'contranarrativas con distintos enfoques (reframing, evidencia, reduccion al absurdo, redireccion).'
        f'</div>',
        unsafe_allow_html=True,
    )

    c_frame = st.text_area(
        "Marco narrativo rival a contrarrestar",
        key="c_frame",
        height=80,
        placeholder="Ej: El gobierno ha dejado a los jovenes sin futuro con sus politicas de vivienda...",
    )
    c_position = st.text_area(
        "Tu posicion propia (opcional)",
        key="c_position",
        height=60,
        placeholder="Ej: La ley de vivienda del gobierno ya tiene 47.000 contratos protegidos...",
    )

    if st.button("Generar contranarrativas", key="c_run", use_container_width=True):
        if not c_frame.strip():
            st.warning("Introduce el marco narrativo a contrarrestar.")
        else:
            with st.spinner("Generando contranarrativas... (max. 15s)"):
                result = _se_call("generate_counter_narratives", c_frame, c_position)
                if not result:
                    result = [
                        {
                            "counter": "El encuadre correcto no es 'gobierno sin plan' sino 'primera ley de vivienda en 30 anos'. "
                                       "Recuperemos la narrativa de los logros historicos.",
                            "approach": "reframing",
                            "channel": "Twitter, television",
                            "risk": "bajo",
                            "mode": "MODO DEMO",
                        },
                        {
                            "counter": "Los datos lo demuestran: desde 2023 se han firmado 47.000 contratos de alquiler regulado. "
                                       "No hay fracaso en los hechos, hay progreso constante.",
                            "approach": "evidence",
                            "channel": "Rueda de prensa, newsletters",
                            "risk": "bajo",
                            "mode": "MODO DEMO",
                        },
                        {
                            "counter": "Preguntemos a la oposicion: ¿cuantas viviendas construyeron en sus 8 anos de gobierno? "
                                       "Cero politica de alquiler asequible. La critica carece de credibilidad.",
                            "approach": "reductio",
                            "channel": "Debate parlamentario, redes",
                            "risk": "medio",
                            "mode": "MODO DEMO",
                        },
                    ]
                st.session_state["tabC_result"] = result

    if st.session_state.get("tabC_result"):
        results = st.session_state["tabC_result"]
        _approach_color = {
            "reframing": CYAN, "evidence": GREEN, "reductio": AMBER,
            "redirect": BLUE, "generic": MUTED,
        }
        for idx, cn in enumerate(results[:5], 1):
            approach = cn.get("approach", "generic")
            color = _approach_color.get(approach, MUTED)
            risk = cn.get("risk", "")
            risk_color = RED if risk == "alto" else (AMBER if risk == "medio" else GREEN)
            channel = cn.get("channel", "")
            mode_badge = (
                f'<span style="background:{AMBER}22;color:{AMBER};font-size:.58rem;'
                f'font-weight:700;padding:.15rem .45rem;border-radius:4px">{cn["mode"]}</span> '
                if cn.get("mode") else ""
            )
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {color};'
                f'border-radius:0 10px 10px 0;padding:1rem 1.2rem;margin:.5rem 0">'
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">'
                f'<span style="background:{color}22;color:{color};font-size:.62rem;font-weight:700;'
                f'padding:.2rem .55rem;border-radius:4px;letter-spacing:.06em">{approach.upper()}</span>'
                f'{mode_badge}'
                f'{"<span style=background:"+risk_color+"22;color:"+risk_color+";font-size:.62rem;font-weight:700;padding:.2rem .55rem;border-radius:4px>RIESGO "+risk.upper()+"</span>" if risk else ""}'
                f'<span style="font-size:.62rem;color:{MUTED};margin-left:auto">{channel}</span>'
                f'</div>'
                f'<div style="font-size:.82rem;color:{TEXT2};line-height:1.55">{cn.get("counter","—")}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ════════════════════════════════════════════════════════════════════════════
# TAB D — SIMULACRO DE PRENSA
# ════════════════════════════════════════════════════════════════════════════
_ASSET_TYPES = ["rueda_de_prensa", "entrevista", "nota_de_prensa", "debate"]

with tabD:
    section_header("Simulacro de rueda de prensa — preguntas hostiles", AMBER)
    st.markdown(
        f'<div style="font-size:.78rem;color:{TEXT2};margin-bottom:1rem">'
        f'Prepara al portavoz ante preguntas de periodistas adversariales. '
        f'El sistema genera preguntas trampa y respuestas modelo.'
        f'</div>',
        unsafe_allow_html=True,
    )

    d_col1, d_col2 = st.columns([3, 1])
    with d_col1:
        d_issue = st.text_area("Asunto de la rueda de prensa", key="d_issue", height=75,
                                placeholder="Ej: Presentacion del plan nacional de vivienda 2025-2030...")
    with d_col2:
        d_asset_type = st.selectbox("Tipo de acto", _ASSET_TYPES, key="d_asset_type")

    if st.button("Generar preguntas hostiles", key="d_run", use_container_width=True):
        if not d_issue.strip():
            st.warning("Introduce el asunto.")
        else:
            with st.spinner("Generando simulacro de prensa... (max. 15s)"):
                result = _se_call("generate_hostile_qna", d_issue, 6)
                if not result:
                    result = [
                        {"question": "¿No llega demasiado tarde este plan? Los jovenes llevan anos esperando.", "answer": "Las reformas estructurales requieren tiempo de tramitacion parlamentaria. Lo relevante es que el plan esta aprobado, financiado y en marcha.", "hostility": "alta"},
                        {"question": "¿Cuanto va a costar exactamente a los contribuyentes?", "answer": "La inversion total es de 4.200 millones de euros en 5 anos — menos que el coste de no actuar, que genera exclusion social y perdida de productividad.", "hostility": "alta"},
                        {"question": "¿Por que no lo hicieron antes? Han tenido tres anos.", "answer": "Los primeros dos anos se dedicaron a reformas urgentes de empleo y sanidad. El orden de prioridades fue validado por los ciudadanos en las urnas.", "hostility": "media"},
                        {"question": "¿No es verdad que la cifra real de viviendas es mucho menor?", "answer": "La cifra de 100.000 viviendas proviene del Ministerio de Vivienda con auditoria independiente del Banco de Espana. Publicamos los datos completos.", "hostility": "alta"},
                        {"question": "¿Que garantias tienen los ciudadanos de que no sera otro fracaso como los anteriores?", "answer": "Hemos establecido un mecanismo de seguimiento trimestral publico con indicadores verificables. El fracaso no es una opcion politicamente viable para ninguno de nosotros.", "hostility": "media"},
                        {"question": "¿Cuantos miembros de su gobierno tienen segundas residencias en alquiler?", "answer": "Esta pregunta no tiene relacion con las medidas que hemos presentado. Me centro en el plan. Si tiene una denuncia concreta, le pido que la formule con datos.", "hostility": "alta"},
                    ]
                st.session_state["tabD_result"] = result

    if st.session_state.get("tabD_result"):
        qa_list = st.session_state["tabD_result"]
        is_demo = not _SE_OK or not qa_list or qa_list[0].get("mode") == "demo"
        if is_demo or not _SE_OK:
            st.markdown(
                f'<span style="background:{AMBER}22;color:{AMBER};font-size:.62rem;font-weight:700;'
                f'padding:.2rem .6rem;border-radius:4px">MODO DEMO</span>',
                unsafe_allow_html=True,
            )
        for qa in qa_list[:6]:
            hostility = qa.get("hostility", "media")
            h_color = RED if hostility == "alta" else (AMBER if hostility == "media" else MUTED)
            st.markdown(
                f'<div style="margin:.6rem 0">'
                f'<div style="background:{AMBER}0D;border-left:4px solid {AMBER};border-radius:0 8px 0 0;'
                f'padding:.6rem .9rem">'
                f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem">'
                f'<span style="font-size:.6rem;color:{MUTED};letter-spacing:.08em">PERIODISTA</span>'
                f'<span style="background:{h_color}22;color:{h_color};font-size:.58rem;font-weight:700;'
                f'padding:.1rem .4rem;border-radius:4px">HOSTILIDAD {hostility.upper()}</span>'
                f'</div>'
                f'<div style="font-size:.85rem;font-weight:600;color:{AMBER}">{qa.get("question","—")}</div>'
                f'</div>'
                f'<div style="background:{GREEN}0D;border-left:4px solid {GREEN};border-radius:0 0 8px 0;'
                f'padding:.6rem .9rem">'
                f'<div style="font-size:.6rem;color:{MUTED};letter-spacing:.08em;margin-bottom:.25rem">RESPUESTA MODELO</div>'
                f'<div style="font-size:.82rem;color:{TEXT2};line-height:1.5">{qa.get("answer","—")}</div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ════════════════════════════════════════════════════════════════════════════
# TAB E — GUARDIAN DE MENSAJE
# ════════════════════════════════════════════════════════════════════════════
with tabE:
    section_header("Guardian de mensaje — analisis de riesgo comunicacional", RED)
    st.markdown(
        f'<div style="font-size:.78rem;color:{TEXT2};margin-bottom:1rem">'
        f'Pega un borrador de mensaje, discurso o nota de prensa para analizar sus riesgos '
        f'antes de publicarlo. El sistema detecta vulnerabilidades y sugiere mejoras.'
        f'</div>',
        unsafe_allow_html=True,
    )

    e_col1, e_col2 = st.columns([3, 1])
    with e_col1:
        e_message = st.text_area(
            "Texto a analizar",
            key="e_message",
            height=140,
            placeholder="Pega aqui el borrador del mensaje, discurso o nota de prensa...",
        )
    with e_col2:
        e_asset_type = st.selectbox("Tipo de contenido", _ASSET_TYPES, key="e_asset_type")

    if st.button("Analizar riesgos", key="e_run", use_container_width=True):
        if not e_message.strip():
            st.warning("Introduce el texto a analizar.")
        else:
            with st.spinner("Analizando riesgos comunicacionales... (max. 15s)"):
                result = _se_call("red_team_message", e_message, e_asset_type)
                if result is None:
                    result = {
                        "risk_level": "medio",
                        "weaknesses": [
                            "El mensaje usa vocabulario tecnico que puede alejar a audiencias no especializadas.",
                            "No incluye llamada a la accion clara al final.",
                        ],
                        "attack_vectors": [
                            "La oposicion puede usar el dato de costes para crear narrativa de despilfarro.",
                        ],
                        "suggested_improvements": [
                            "Sustituir 'implementacion' por 'puesta en marcha'.",
                            "Anadir una frase de cierre con beneficio concreto para el ciudadano.",
                            "Incluir fuente oficial del dato economico citado.",
                        ],
                        "do_not_say": ["Implementacion", "Parametros", "Marco normativo"],
                        "guardrail_flags": [],
                        "mode": "MODO DEMO",
                    }
                st.session_state["tabE_result"] = result

    if st.session_state.get("tabE_result"):
        r = st.session_state["tabE_result"]
        risk = r.get("risk_level", "unknown")
        risk_color = RED if risk == "alto" else (AMBER if risk == "medio" else GREEN)

        _mode = r.get("mode", "")
        if _mode:
            st.markdown(
                f'<span style="background:{AMBER}22;color:{AMBER};font-size:.62rem;font-weight:700;'
                f'padding:.2rem .6rem;border-radius:4px">{_mode}</span>',
                unsafe_allow_html=True,
            )

        # Veredicto
        if risk == "alto":
            verdict_color = RED
            verdict_label = "BLOQUEADO"
            verdict_desc = "Este mensaje presenta riesgos criticos. Revisar urgentemente antes de publicar."
        elif risk == "medio":
            verdict_color = AMBER
            verdict_label = "REQUIERE REVISION"
            verdict_desc = "El mensaje tiene puntos de mejora importantes. Revisar antes de publicar."
        else:
            verdict_color = GREEN
            verdict_label = "APROBADO"
            verdict_desc = "El mensaje supera el analisis de riesgos. Puede publicarse con las mejoras sugeridas."

        st.markdown(
            f'<div style="background:{verdict_color}18;border:2px solid {verdict_color};border-radius:10px;'
            f'padding:1rem 1.4rem;margin:1rem 0;text-align:center">'
            f'<div style="font-size:1.2rem;font-weight:900;color:{verdict_color};letter-spacing:.05em">{verdict_label}</div>'
            f'<div style="font-size:.8rem;color:{TEXT2};margin-top:.3rem">{verdict_desc}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        e_c1, e_c2 = st.columns(2)
        with e_c1:
            weaknesses = r.get("weaknesses", [])
            if weaknesses:
                section_header("Debilidades detectadas", RED)
                for w in weaknesses[:5]:
                    st.markdown(
                        f'<div style="background:{RED}0A;border-left:3px solid {RED};border-radius:0 6px 6px 0;'
                        f'padding:.5rem .8rem;margin:.3rem 0;font-size:.8rem;color:{TEXT2}">{w}</div>',
                        unsafe_allow_html=True,
                    )
        with e_c2:
            improvements = r.get("suggested_improvements", [])
            if improvements:
                section_header("Mejoras sugeridas", GREEN)
                for imp in improvements[:5]:
                    st.markdown(
                        f'<div style="background:{GREEN}0A;border-left:3px solid {GREEN};border-radius:0 6px 6px 0;'
                        f'padding:.5rem .8rem;margin:.3rem 0;font-size:.8rem;color:{TEXT2}">{imp}</div>',
                        unsafe_allow_html=True,
                    )

        flags = r.get("guardrail_flags", [])
        if flags:
            section_header("Alertas de guardrails de contenido", PURPLE)
            for flag in flags[:5]:
                if isinstance(flag, dict):
                    sev = flag.get("severity", "info")
                    desc = flag.get("description", str(flag))
                    f_color = RED if sev in {"high", "block"} else (AMBER if sev == "medium" else MUTED)
                else:
                    desc = str(flag)
                    f_color = AMBER
                st.markdown(
                    f'<div style="background:{f_color}0A;border-left:3px solid {f_color};'
                    f'border-radius:0 6px 6px 0;padding:.5rem .8rem;margin:.3rem 0;'
                    f'font-size:.78rem;color:{TEXT2}">{desc}</div>',
                    unsafe_allow_html=True,
                )


# ════════════════════════════════════════════════════════════════════════════
# TAB F — MIX DE CANALES
# ════════════════════════════════════════════════════════════════════════════
_URGENCY_OPTS = ["crisis", "alta", "normal", "baja"]

with tabF:
    section_header("Recomendador de mix de canales", CYAN)
    st.markdown(
        f'<div style="font-size:.78rem;color:{TEXT2};margin-bottom:1rem">'
        f'Introduce el issue y el nivel de urgencia para obtener una recomendacion '
        f'de canales priorizada con timing y tipo de mensaje para cada uno.'
        f'</div>',
        unsafe_allow_html=True,
    )

    f_col1, f_col2 = st.columns([3, 1])
    with f_col1:
        f_issue = st.text_area("Asunto", key="f_issue", height=75,
                                placeholder="Ej: Respuesta a acusacion de falta de gestion en sanidad...")
    with f_col2:
        f_urgency = st.selectbox("Nivel de urgencia", _URGENCY_OPTS, key="f_urgency")

    if st.button("Recomendar canales", key="f_run", use_container_width=True):
        if not f_issue.strip():
            st.warning("Introduce el asunto.")
        else:
            with st.spinner("Analizando mix optimo de canales... (max. 15s)"):
                result = _se_call("recommend_channel_mix", f_issue, f_urgency)
                if not result:
                    _demo_channels = {
                        "crisis": [
                            {"channel": "Nota de prensa urgente", "priority": 1, "reason": "Comunicado urgente para medios", "timing": "Inmediato", "message_type": "Declaracion oficial", "reach": 85},
                            {"channel": "Twitter/X", "priority": 2, "reason": "Alcance inmediato y viralidad", "timing": "< 15 min", "message_type": "Hilo de hechos", "reach": 92},
                            {"channel": "Email a stakeholders", "priority": 3, "reason": "Contacto directo con actores clave", "timing": "< 1h", "message_type": "Briefing interno", "reach": 40},
                            {"channel": "Rueda de prensa", "priority": 4, "reason": "Control de la narrativa en directo", "timing": "< 4h", "message_type": "Declaracion + Q&A", "reach": 78},
                        ],
                        "alta": [
                            {"channel": "LinkedIn", "priority": 1, "reason": "Audiencia profesional e institucional", "timing": "< 4h", "message_type": "Articulo de posicion", "reach": 65},
                            {"channel": "Newsletter", "priority": 2, "reason": "Base propia con alta tasa apertura", "timing": "< 12h", "message_type": "Informe especial", "reach": 55},
                            {"channel": "Nota de prensa", "priority": 3, "reason": "Medios tradicionales", "timing": "< 8h", "message_type": "Comunicado", "reach": 70},
                        ],
                        "normal": [
                            {"channel": "LinkedIn", "priority": 1, "reason": "Engagement profesional sostenido", "timing": "Esta semana", "message_type": "Post de opinion", "reach": 60},
                            {"channel": "Newsletter", "priority": 2, "reason": "Nurturing de base propia", "timing": "Proximo envio", "message_type": "Seccion tematica", "reach": 50},
                            {"channel": "Interno", "priority": 3, "reason": "Alineacion del equipo primero", "timing": "Hoy", "message_type": "Briefing interno", "reach": 30},
                        ],
                        "baja": [
                            {"channel": "Interno", "priority": 1, "reason": "Solo interno por ahora", "timing": "Esta semana", "message_type": "Nota informativa", "reach": 25},
                            {"channel": "Newsletter", "priority": 2, "reason": "Educacion de base a largo plazo", "timing": "Proximo mes", "message_type": "Articulo de fondo", "reach": 45},
                        ],
                    }
                    result = _demo_channels.get(f_urgency, _demo_channels["normal"])
                    for item in result:
                        item["mode"] = "MODO DEMO"
                st.session_state["tabF_result"] = {"channels": result, "urgency": f_urgency}

    if st.session_state.get("tabF_result"):
        data = st.session_state["tabF_result"]
        channels = data.get("channels", [])
        urgency_used = data.get("urgency", "normal")
        urgency_color = RED if urgency_used == "crisis" else (AMBER if urgency_used == "alta" else (BLUE if urgency_used == "normal" else MUTED))

        is_demo = channels and channels[0].get("mode")
        if is_demo:
            st.markdown(
                f'<span style="background:{AMBER}22;color:{AMBER};font-size:.62rem;font-weight:700;'
                f'padding:.2rem .6rem;border-radius:4px">MODO DEMO</span>',
                unsafe_allow_html=True,
            )

        # Urgency badge
        st.markdown(
            f'<div style="margin:.5rem 0">'
            f'<span style="background:{urgency_color}22;color:{urgency_color};font-size:.7rem;'
            f'font-weight:700;padding:.25rem .7rem;border-radius:4px;letter-spacing:.06em">'
            f'URGENCIA: {urgency_used.upper()}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )

        # Channel distribution bar
        if channels:
            total_reach = sum(c.get("reach", 50) for c in channels)
            if total_reach > 0:
                section_header("Distribucion de alcance estimado por canal", CYAN)
                bar_html = '<div style="display:flex;gap:2px;border-radius:6px;overflow:hidden;height:14px;margin:.4rem 0 1rem">'
                _bar_colors = [CYAN, BLUE, PURPLE, AMBER, GREEN, RED]
                for idx_b, c in enumerate(channels):
                    pct = c.get("reach", 50) / total_reach * 100
                    bc = _bar_colors[idx_b % len(_bar_colors)]
                    bar_html += f'<div style="width:{pct:.1f}%;background:{bc};min-width:4px" title="{c.get("channel","")}"></div>'
                bar_html += '</div>'
                st.markdown(bar_html, unsafe_allow_html=True)

        # Channel cards
        for idx_c, ch in enumerate(channels[:6]):
            prio = ch.get("priority", idx_c + 1)
            ch_color = [CYAN, BLUE, PURPLE, AMBER, GREEN, MUTED][min(prio - 1, 5)]
            timing = ch.get("timing", "—")
            msg_type = ch.get("message_type", "—")
            reason = ch.get("reason", "")
            reach = ch.get("reach", "—")

            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {ch_color};'
                f'border-radius:0 10px 10px 0;padding:.9rem 1.1rem;margin:.4rem 0">'
                f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">'
                f'<span style="background:{ch_color}22;color:{ch_color};font-size:.72rem;font-weight:800;'
                f'padding:.2rem .55rem;border-radius:4px;min-width:20px;text-align:center">{prio}</span>'
                f'<span style="font-size:.9rem;font-weight:700;color:{TEXT}">{ch.get("channel","—")}</span>'
                f'<span style="font-size:.65rem;color:{MUTED};margin-left:auto">Alcance est.: {reach}%</span>'
                f'</div>'
                f'<div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:.75rem">'
                f'<span><span style="color:{MUTED}">Timing: </span><span style="color:{ch_color};font-weight:600">{timing}</span></span>'
                f'<span><span style="color:{MUTED}">Tipo: </span><span style="color:{TEXT2}">{msg_type}</span></span>'
                f'</div>'
                f'{"<div style=font-size:.75rem;color:"+MUTED+";margin-top:.25rem>"+reason+"</div>" if reason else ""}'
                f'</div>',
                unsafe_allow_html=True,
            )
