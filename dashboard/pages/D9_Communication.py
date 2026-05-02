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
    scrolling_ticker,
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

# ── TABS ─────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "MONITOR DE NARRATIVAS",
    "ANÁLISIS DE MENSAJE",
    "ESTRATEGIA DE RESPUESTA",
    "CICLO MEDIÁTICO",
    "MENSAJES CLAVE",
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

        # Quadrant labels
        for x_pos, y_pos, label, color in [
            (5.5, 8.5, "ALTO IMPACTO\nBAJO ALCANCE", GREEN),
            (8.5, 8.5, "MENSAJES ESTRELLA", CYAN),
            (5.5, 5.0, "BAJO RENDIMIENTO", MUTED),
            (8.5, 5.0, "ALTO ALCANCE\nBAJA RESONANCIA", AMBER),
        ]:
            fig_scatter.add_annotation(
                x=x_pos, y=y_pos, text=label.replace("\n", "<br>"),
                showarrow=False, font=dict(color=color, size=8),
                bgcolor=f"{color}11", bordercolor=f"{color}44",
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
            f'<div style="font-size:1.4rem;margin-bottom:.4rem">🔍</div>'
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
            f'<div style="font-size:1.4rem;margin-bottom:.4rem">⚖️</div>'
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
            f'<div style="font-size:1.4rem;margin-bottom:.4rem">📢</div>'
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
            CYAN if h in _PRIME_HOURS else f"{CYAN}44"
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
                f'<span style="color:{RED};font-weight:700;font-size:.78rem">⚠ {actor_data["desviaciones"]} desviación detectada</span>'
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
            fillcolor=f"{p_color}18",
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
                f'border-radius:4px;padding:.1rem .35rem;margin-left:.3rem">⚠ {actor["desviaciones"]} desv.</span>'
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
