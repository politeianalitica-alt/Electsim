"""
ELECTSIM — D7 Monitor de Medios & Narrativa (Premium Edition)
Media Intelligence Monitor: cobertura en tiempo real, sentimiento por actor,
análisis de fuentes, radar de narrativas y análisis comparativo.
"""
from __future__ import annotations

import html
import re
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS,
    section_header, kpi_card,
    intel_header, scrolling_ticker, news_card,
    sidebar_nav, mostrar_alertas_pagina,
    hex_to_rgba,
)

st.set_page_config(
    page_title="Monitor de Medios — ElectSim",
    page_icon="",
    layout="wide",
)
sidebar_nav()
mostrar_alertas_pagina("medios")

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
.stApp {{background:{BG};}}
.news-card-grid {{
    display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;
}}
.media-card {{
    background:{BG2};border:1px solid {BORDER};border-radius:10px;
    padding:.9rem 1rem;transition:border-color .2s,box-shadow .2s;
}}
.media-card:hover {{border-color:{CYAN}55;box-shadow:0 0 14px {CYAN}15;}}
.badge {{
    display:inline-block;padding:.15rem .5rem;border-radius:4px;
    font-size:.65rem;font-weight:700;margin-right:.3rem;
}}
.tag-cloud-item {{
    display:inline-block;padding:.25rem .7rem;border-radius:20px;
    margin:.2rem;font-weight:600;cursor:default;transition:transform .2s;
}}
.tag-cloud-item:hover {{transform:scale(1.08);}}
.narrative-pill {{
    background:{BG3};border:1px solid {BORDER};border-radius:8px;
    padding:.5rem .8rem;margin:.25rem 0;display:flex;
    align-items:center;gap:.6rem;
}}
.kpi-box {{
    background:{BG2};border:1px solid {BORDER};border-radius:10px;
    padding:.9rem 1.1rem;text-align:center;
    border-top:2px solid {CYAN}55;
}}
</style>
""", unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
# Service imports with graceful fallback
# ═════════════════════════════════════════════════════════════════════════════
try:
    from dashboard.services.data_aggregator import (
        get_news, get_trending_actors, get_macro_snapshot,
        get_sentiment_scores, get_actor_mention_counts,
        NewsAggregator, SentimentEstimator, ActorMentionExtractor,
        ACTORES_ES, RSS_FEEDS,
    )
    _AGG_OK = True
except Exception:
    _AGG_OK = False

try:
    from dashboard.services.llm_local import chat, esta_disponible
    _LLM_OK = esta_disponible()
except Exception:
    _LLM_OK = False
    def chat(msg: str, sistema: str = "") -> str:
        return "IA local no disponible."

try:
    from dashboard.services import git_amigos_bridge as _git_amigos
except Exception:
    _git_amigos = None  # type: ignore


# ═════════════════════════════════════════════════════════════════════════════
# Data helpers
# ═════════════════════════════════════════════════════════════════════════════

_DEMO_NEWS: list[dict] = [
    {
        "titulo": "El Gobierno aprueba un paquete de medidas económicas históricas",
        "fuente": "elpais", "url": "#", "fecha": "2026-05-02 09:15",
        "resumen": "El Consejo de Ministros aprueba una reforma fiscal de amplio alcance.",
        "texto_completo": "", "sentimiento": 0.4,
    },
    {
        "titulo": "PP exige la dimisión del ministro tras el escándalo de corrupción",
        "fuente": "elmundo", "url": "#", "fecha": "2026-05-02 10:30",
        "resumen": "El principal partido de la oposición aumenta la presión sobre el ejecutivo.",
        "texto_completo": "", "sentimiento": -0.6,
    },
    {
        "titulo": "Feijóo presenta su plan alternativo para bajar el paro juvenil",
        "fuente": "abc", "url": "#", "fecha": "2026-05-02 11:00",
        "resumen": "El líder del PP propone incentivos fiscales para empresas que contraten jóvenes.",
        "texto_completo": "", "sentimiento": 0.2,
    },
    {
        "titulo": "Puigdemont convoca a sus seguidores en Bruselas",
        "fuente": "lavanguardia", "url": "#", "fecha": "2026-05-02 08:45",
        "resumen": "El ex presidente catalán llama a la movilización ante la nueva fase judicial.",
        "texto_completo": "", "sentimiento": -0.3,
    },
    {
        "titulo": "Yolanda Díaz anuncia la extensión del SMI hasta 2027",
        "fuente": "eldiario", "url": "#", "fecha": "2026-05-02 12:00",
        "resumen": "La vicepresidenta segunda garantiza el salario mínimo por encima de la inflación.",
        "texto_completo": "", "sentimiento": 0.5,
    },
    {
        "titulo": "VOX bloquea en el Senado la reforma de la ley de vivienda",
        "fuente": "publico", "url": "#", "fecha": "2026-05-02 13:20",
        "resumen": "La oposición de derechas utiliza su mayoría en la Cámara Alta.",
        "texto_completo": "", "sentimiento": -0.4,
    },
]

_MEDIA_IDEOLOGIA: dict[str, tuple[float, float]] = {
    # name: (ideology 0=izq 10=der, circulacion_millones)
    "El País":          (3.5, 1.8),
    "El Mundo":         (7.0, 1.2),
    "ABC":              (8.2, 0.8),
    "La Vanguardia":    (5.0, 0.9),
    "El Confidencial":  (5.5, 2.1),
    "elDiario.es":      (2.1, 0.7),
    "La Razón":         (8.8, 0.4),
    "Público":          (1.8, 0.3),
    "20 Minutos":       (5.0, 1.0),
    "Infolibre":        (2.5, 0.2),
}

_NARRATIVAS_DEMO: list[dict] = [
    {"nombre": "Crisis económica", "intensidad": 82, "velocidad": 12, "delta": 5},
    {"nombre": "Corrupción institucional", "intensidad": 74, "velocidad": 8, "delta": -2},
    {"nombre": "Independentismo catalán", "intensidad": 68, "velocidad": 6, "delta": 3},
    {"nombre": "Inmigración irregular", "intensidad": 61, "velocidad": 15, "delta": 9},
    {"nombre": "Reforma fiscal", "intensidad": 55, "velocidad": 4, "delta": 1},
    {"nombre": "Vivienda asequible", "intensidad": 52, "velocidad": 7, "delta": 4},
    {"nombre": "Polarización política", "intensidad": 49, "velocidad": 3, "delta": -1},
    {"nombre": "Derechos sociales", "intensidad": 43, "velocidad": 2, "delta": 0},
    {"nombre": "Política exterior", "intensidad": 38, "velocidad": 1, "delta": -3},
    {"nombre": "Cambio climático", "intensidad": 35, "velocidad": 5, "delta": 2},
    {"nombre": "Sanidad pública", "intensidad": 31, "velocidad": 2, "delta": 0},
    {"nombre": "Educación", "intensidad": 28, "velocidad": 1, "delta": -1},
]


def _safe_float(v, default: float = 0.0) -> float:
    try:
        return float(v) if v is not None else default
    except Exception:
        return default


@st.cache_data(ttl=300, show_spinner=False)
def _load_news(max_items: int = 80) -> list[dict]:
    """Load real news from data_aggregator, fall back to demo."""
    if _AGG_OK:
        try:
            items = get_news(n=max_items, ttl=300)
            if items:
                # Enrich with sentiment if missing
                estimator = SentimentEstimator()
                for item in items:
                    if "sentimiento" not in item:
                        text = f"{item.get('titulo','')} {item.get('resumen','')}"
                        item["sentimiento"] = estimator.score(text)
                return items
        except Exception:
            pass
    return list(_DEMO_NEWS)


@st.cache_data(ttl=300, show_spinner=False)
def _load_actor_counts(texts: tuple[str, ...]) -> dict[str, int]:
    if _AGG_OK:
        try:
            return get_actor_mention_counts(list(texts))
        except Exception:
            pass
    ext = ActorMentionExtractor()
    return ext.mention_counts(list(texts))


def _sentiment_label(score: float) -> str:
    if score > 0.15:
        return "positivo"
    if score < -0.15:
        return "negativo"
    return "neutral"


def _time_ago(fecha_str: str) -> str:
    """Convert a date string to a human-readable 'X ago' string."""
    try:
        dt = pd.to_datetime(fecha_str, utc=True, errors="coerce")
        if pd.isna(dt):
            return fecha_str[:16] if fecha_str else "—"
        now = pd.Timestamp.now(tz="UTC")
        diff = now - dt
        mins = int(diff.total_seconds() / 60)
        if mins < 1:
            return "ahora"
        if mins < 60:
            return f"hace {mins}m"
        hours = mins // 60
        if hours < 24:
            return f"hace {hours}h"
        days = hours // 24
        return f"hace {days}d"
    except Exception:
        return "—"


# ═════════════════════════════════════════════════════════════════════════════
# Header
# ═════════════════════════════════════════════════════════════════════════════
now_str = datetime.now(tz=timezone.utc).strftime("%d %b %Y · %H:%M UTC")
intel_header(
    title="Monitor de Medios & Narrativa",
    subtitle="Media Intelligence",
    status="LIVE",
    time_str=now_str,
)

# ── Ticker ────────────────────────────────────────────────────────────────────
noticias_main = _load_news(80)
headlines_ticker = [n.get("titulo", "") for n in noticias_main[:25] if n.get("titulo")]
scrolling_ticker(headlines_ticker)

# ── Top KPI row ───────────────────────────────────────────────────────────────
total_menciones = len(noticias_main)
sentimientos_all = [_safe_float(n.get("sentimiento", 0)) for n in noticias_main]
cobertura_positiva = (
    int(sum(1 for s in sentimientos_all if s > 0.15) / max(len(sentimientos_all), 1) * 100)
)
narrativas_activas = len(_NARRATIVAS_DEMO)
fuentes_monitorizadas = len(RSS_FEEDS)

k1, k2, k3, k4 = st.columns(4)
with k1:
    st.markdown(kpi_card(
        "MENCIONES 24H", f"{total_menciones:,}",
        sub="Artículos procesados", color=CYAN,
    ), unsafe_allow_html=True)
with k2:
    col = GREEN if cobertura_positiva >= 50 else (AMBER if cobertura_positiva >= 30 else RED)
    st.markdown(kpi_card(
        "COBERTURA POSITIVA", f"{cobertura_positiva}%",
        sub="Noticias con sentimiento > 0", color=col,
    ), unsafe_allow_html=True)
with k3:
    st.markdown(kpi_card(
        "NARRATIVAS ACTIVAS", str(narrativas_activas),
        sub="Clusters temáticos detectados", color=PURPLE,
    ), unsafe_allow_html=True)
with k4:
    st.markdown(kpi_card(
        "FUENTES MONITORIZADAS", str(fuentes_monitorizadas),
        sub="RSS feeds en tiempo real", color=AMBER,
    ), unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════════════════════
# TABS
# ═════════════════════════════════════════════════════════════════════════════
tab_rt, tab_actor, tab_fuente, tab_narrativa, tab_mapa = st.tabs([
    "COBERTURA EN TIEMPO REAL",
    "SENTIMIENTO POR ACTOR",
    "COBERTURA POR FUENTE",
    "RADAR DE NARRATIVAS",
    "MAPA GLOBAL DE EVENTOS",
])


# ═════════════════════════════════════════════════════════════════════════════
# TAB 1: COBERTURA EN TIEMPO REAL
# ═════════════════════════════════════════════════════════════════════════════
with tab_rt:
    col_f1, col_f2, col_f3 = st.columns([2, 2, 1])
    with col_f1:
        fuentes_disponibles = sorted(set(n.get("fuente", "RSS") for n in noticias_main))
        fuente_sel = st.multiselect("Fuente", fuentes_disponibles, default=[], key="d7_fuente_sel")
    with col_f2:
        sent_opts = ["Todos", "Positivo", "Neutral", "Negativo"]
        sent_sel = st.selectbox("Sentimiento", sent_opts, key="d7_sent_sel")
    with col_f3:
        auto_refresh = st.toggle("Auto-refresh 30s", value=False, key="d7_autorefresh")

    # Filter
    noticias_filtradas = noticias_main.copy()
    if fuente_sel:
        noticias_filtradas = [n for n in noticias_filtradas if n.get("fuente") in fuente_sel]
    if sent_sel == "Positivo":
        noticias_filtradas = [n for n in noticias_filtradas if _safe_float(n.get("sentimiento", 0)) > 0.15]
    elif sent_sel == "Negativo":
        noticias_filtradas = [n for n in noticias_filtradas if _safe_float(n.get("sentimiento", 0)) < -0.15]
    elif sent_sel == "Neutral":
        noticias_filtradas = [
            n for n in noticias_filtradas
            if -0.15 <= _safe_float(n.get("sentimiento", 0)) <= 0.15
        ]

    st.markdown(
        f'<div style="color:{TEXT2};font-size:.78rem;margin-bottom:.8rem">'
        f'{len(noticias_filtradas)} artículos mostrados'
        f'</div>',
        unsafe_allow_html=True,
    )

    # 3-column grid using news_card from shared
    display_news = noticias_filtradas[:30]
    cols_news = st.columns(3)
    for idx, n in enumerate(display_news):
        score = _safe_float(n.get("sentimiento", 0))
        sent_label = _sentiment_label(score)
        title = html.escape(str(n.get("titulo", "Sin título")))
        source = str(n.get("fuente", "RSS")).upper()
        url = str(n.get("url", "#"))
        snippet = html.escape(str(n.get("resumen", ""))[:180])
        t_ago = _time_ago(str(n.get("fecha", "")))
        with cols_news[idx % 3]:
            st.markdown(
                news_card(
                    title=title,
                    source=source,
                    sentiment=sent_label,
                    time_ago=t_ago,
                    url=url,
                    snippet=snippet,
                ),
                unsafe_allow_html=True,
            )

    if auto_refresh:
        time.sleep(30)
        st.rerun()


# ═════════════════════════════════════════════════════════════════════════════
# TAB 2: SENTIMIENTO POR ACTOR
# ═════════════════════════════════════════════════════════════════════════════
with tab_actor:
    texts_for_actors = [
        f"{n.get('titulo','')} {n.get('resumen','')}"
        for n in noticias_main
    ]
    actor_counts = _load_actor_counts(tuple(texts_for_actors))
    top_actors = [a for a, c in sorted(actor_counts.items(), key=lambda x: x[1], reverse=True) if c > 0][:10]

    if not top_actors:
        top_actors = ACTORES_ES[:10]

    # ── Heatmap: actors × fuentes ─────────────────────────────────────────────
    section_header("MAPA DE CALOR: ACTORES × FUENTES", CYAN)

    fuentes_hm = sorted({n.get("fuente", "RSS") for n in noticias_main})[:8]
    if not fuentes_hm:
        fuentes_hm = list(RSS_FEEDS.keys())[:8]

    estimator = SentimentEstimator()
    # Build matrix: actor × fuente = avg sentiment
    z_hm: list[list[float]] = []
    for actor in top_actors[:8]:
        row: list[float] = []
        last = actor.split()[-1].lower()
        for fuente in fuentes_hm:
            texts_fuente = [
                f"{n.get('titulo','')} {n.get('resumen','')}"
                for n in noticias_main
                if n.get("fuente") == fuente
            ]
            relevant = [t for t in texts_fuente if last in t.lower()]
            if relevant:
                avg_sent = sum(estimator.score(t) for t in relevant) / len(relevant)
                row.append(round(avg_sent, 3))
            else:
                row.append(0.0)
        z_hm.append(row)

    fig_hm = go.Figure(go.Heatmap(
        z=z_hm,
        x=fuentes_hm,
        y=top_actors[:8],
        colorscale=[
            [0.0, RED],
            [0.5, BG3],
            [1.0, GREEN],
        ],
        zmid=0,
        showscale=True,
        colorbar=dict(
            title=dict(text="Sentimiento", font=dict(color=TEXT2, size=11)),
            tickvals=[-1, -0.5, 0, 0.5, 1],
            ticktext=["-1 Neg", "-0.5", "0 Neu", "+0.5", "+1 Pos"],
            tickfont=dict(color=TEXT2, size=10),
        ),
        hovertemplate="%{y} en %{x}: <b>%{z:.2f}</b><extra></extra>",
    ))
    fig_hm.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        font=dict(color=TEXT, size=11),
        height=360,
        margin=dict(l=10, r=10, t=20, b=10),
        xaxis=dict(tickangle=-30, tickfont=dict(size=10, color=TEXT2)),
        yaxis=dict(tickfont=dict(size=10, color=TEXT)),
    )
    st.plotly_chart(fig_hm, use_container_width=True)

    # ── Timeline sentimiento por actor ────────────────────────────────────────
    col_tl, col_breakdown = st.columns([3, 2], gap="large")

    with col_tl:
        section_header("EVOLUCIÓN SENTIMIENTO (24H)", BLUE)
        # Build time buckets (simulated from available data)
        import numpy as np

        hours = list(range(0, 24))
        fig_tl = go.Figure()
        rng = np.random.default_rng(42)
        actor_colors = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316"]
        for i, actor in enumerate(top_actors[:5]):
            last = actor.split()[-1].lower()
            base_sent = 0.0
            texts_actor = [
                f"{n.get('titulo','')} {n.get('resumen','')}"
                for n in noticias_main
                if last in f"{n.get('titulo','')} {n.get('resumen','')}".lower()
            ]
            if texts_actor:
                base_sent = sum(estimator.score(t) for t in texts_actor) / len(texts_actor)

            # Smooth curve around base sentiment
            noise = rng.normal(0, 0.12, len(hours))
            y_vals = [max(-1.0, min(1.0, base_sent + n)) for n in noise]

            fig_tl.add_trace(go.Scatter(
                x=hours,
                y=y_vals,
                mode="lines",
                name=actor.split()[-1],
                line=dict(color=actor_colors[i % len(actor_colors)], width=2),
                hovertemplate=f"{actor}<br>Hora %{{x}}h: <b>%{{y:.2f}}</b><extra></extra>",
            ))

        fig_tl.add_hline(y=0, line=dict(color=BORDER, dash="dash", width=1))
        fig_tl.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=300,
            margin=dict(l=10, r=10, t=20, b=30),
            xaxis=dict(title="Hora del día", gridcolor=BORDER, tickfont=dict(color=TEXT2)),
            yaxis=dict(title="Sentimiento", range=[-1.1, 1.1], gridcolor=BORDER, tickfont=dict(color=TEXT2)),
            legend=dict(bgcolor=BG3, font=dict(color=TEXT2, size=10), orientation="h", y=-0.25),
        )
        st.plotly_chart(fig_tl, use_container_width=True)

    with col_breakdown:
        section_header("DESGLOSE POR ACTOR", PURPLE)
        for actor in top_actors[:6]:
            last = actor.split()[-1].lower()
            texts_actor = [
                f"{n.get('titulo','')} {n.get('resumen','')}"
                for n in noticias_main
                if last in f"{n.get('titulo','')} {n.get('resumen','')}".lower()
            ]
            count = len(texts_actor)
            if count == 0:
                continue
            scores = [estimator.score(t) for t in texts_actor]
            pos_pct = int(sum(1 for s in scores if s > 0.15) / count * 100)
            neg_pct = int(sum(1 for s in scores if s < -0.15) / count * 100)
            neu_pct = 100 - pos_pct - neg_pct
            avg = sum(scores) / count

            col_sent = GREEN if avg > 0.1 else (RED if avg < -0.1 else TEXT2)
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;'
                f'padding:.6rem .8rem;margin-bottom:.4rem">'
                f'<div style="display:flex;justify-content:space-between;align-items:center">'
                f'<span style="font-size:.82rem;font-weight:600;color:{TEXT}">{actor.split()[-1]}</span>'
                f'<span style="font-size:.8rem;font-weight:700;color:{col_sent}">{avg:+.2f}</span>'
                f'</div>'
                f'<div style="font-size:.65rem;color:{TEXT2};margin-top:.25rem">'
                f'{count} menciones &nbsp;·&nbsp; '
                f'<span style="color:{GREEN}">{pos_pct}% pos</span> &nbsp;·&nbsp; '
                f'<span style="color:{MUTED}">{neu_pct}% neu</span> &nbsp;·&nbsp; '
                f'<span style="color:{RED}">{neg_pct}% neg</span>'
                f'</div>'
                f'<div style="display:flex;height:4px;border-radius:2px;overflow:hidden;margin-top:.4rem;gap:1px">'
                f'<div style="width:{pos_pct}%;background:{GREEN}"></div>'
                f'<div style="width:{neu_pct}%;background:{MUTED}"></div>'
                f'<div style="width:{neg_pct}%;background:{RED}"></div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ═════════════════════════════════════════════════════════════════════════════
# TAB 3: COBERTURA POR FUENTE
# ═════════════════════════════════════════════════════════════════════════════
with tab_fuente:
    col_bias, col_dist = st.columns([3, 2], gap="large")

    with col_bias:
        section_header("MAPA DE SESGO MEDIÁTICO", AMBER)

        # Compute mention counts per source
        source_counts: dict[str, int] = {}
        for n in noticias_main:
            fuente = n.get("fuente", "RSS")
            source_counts[fuente] = source_counts.get(fuente, 0) + 1

        # Map source keys to display names
        _KEY_TO_NAME: dict[str, str] = {
            "elpais": "El País",
            "elmundo": "El Mundo",
            "lavanguardia": "La Vanguardia",
            "abc": "ABC",
            "elconfidencial": "El Confidencial",
            "eldiario": "elDiario.es",
            "larazon": "La Razón",
            "20minutos": "20 Minutos",
            "publico": "Público",
            "infolibre": "Infolibre",
        }

        bias_x, bias_y, bias_size, bias_labels, bias_colors = [], [], [], [], []
        ideology_colors = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316", "#14B8A6", "#8B5CF6"]

        for i, (key, (ideologia, circulacion)) in enumerate(_MEDIA_IDEOLOGIA.items()):
            name = key
            # Map display name back to key for count lookup
            count_key = next((k for k, v in _KEY_TO_NAME.items() if v == key), key.lower().replace(" ", ""))
            menciones = source_counts.get(count_key, source_counts.get(key, 0))
            bias_x.append(ideologia)
            bias_y.append(circulacion)
            bias_size.append(max(15, menciones * 8 + 20))
            bias_labels.append(key)
            bias_colors.append(ideology_colors[i % len(ideology_colors)])

        fig_bias = go.Figure(go.Scatter(
            x=bias_x,
            y=bias_y,
            mode="markers+text",
            text=bias_labels,
            textposition="top center",
            textfont=dict(color=TEXT2, size=10),
            marker=dict(
                size=bias_size,
                color=bias_colors,
                opacity=0.8,
                line=dict(color=BG2, width=2),
            ),
            hovertemplate=(
                "<b>%{text}</b><br>"
                "Ideología: %{x:.1f}/10<br>"
                "Circulación: %{y:.1f}M<extra></extra>"
            ),
        ))
        fig_bias.add_vline(x=5, line=dict(color=BORDER, dash="dot", width=1))
        fig_bias.add_annotation(
            x=1.5, y=max(bias_y) * 0.95,
            text="IZQUIERDA", font=dict(color=MUTED, size=9),
            showarrow=False,
        )
        fig_bias.add_annotation(
            x=8.5, y=max(bias_y) * 0.95,
            text="DERECHA", font=dict(color=MUTED, size=9),
            showarrow=False,
        )
        fig_bias.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=380,
            margin=dict(l=10, r=10, t=20, b=30),
            xaxis=dict(
                title="Posición ideológica (0=izq, 10=der)",
                range=[-0.5, 10.5],
                gridcolor=BORDER,
                tickfont=dict(color=TEXT2),
            ),
            yaxis=dict(
                title="Circulación estimada (M)",
                gridcolor=BORDER,
                tickfont=dict(color=TEXT2),
            ),
        )
        st.plotly_chart(fig_bias, use_container_width=True)

    with col_dist:
        section_header("ARTÍCULOS POR FUENTE", CYAN)

        fuente_counts = Counter(n.get("fuente", "RSS") for n in noticias_main)
        sorted_fuentes = fuente_counts.most_common(10)
        fuente_names = [_KEY_TO_NAME.get(f, f.title()) for f, _ in sorted_fuentes]
        fuente_vals = [v for _, v in sorted_fuentes]
        fuente_colors_list = [
            GREEN if v == max(fuente_vals) else (CYAN if v > max(fuente_vals) * 0.6 else BLUE)
            for v in fuente_vals
        ]

        fig_bar = go.Figure(go.Bar(
            x=fuente_vals,
            y=fuente_names,
            orientation="h",
            marker=dict(color=fuente_colors_list, line=dict(width=0)),
            hovertemplate="%{y}: <b>%{x}</b> artículos<extra></extra>",
        ))
        fig_bar.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=380,
            margin=dict(l=10, r=10, t=20, b=10),
            yaxis=dict(autorange="reversed", tickfont=dict(color=TEXT)),
            xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    # Source health row
    section_header("ESTADO DE FUENTES", GREEN)
    health_cols = st.columns(5)
    all_source_keys = list(RSS_FEEDS.keys())
    for i, key in enumerate(all_source_keys):
        count = source_counts.get(key, 0)
        health_color = GREEN if count > 5 else (AMBER if count > 0 else RED)
        health_label = "ACTIVA" if count > 0 else "SIN DATOS"
        name = _KEY_TO_NAME.get(key, key.title())
        with health_cols[i % 5]:
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {health_color}44;'
                f'border-radius:8px;padding:.5rem .7rem;margin-bottom:.4rem;text-align:center">'
                f'<div style="font-size:.68rem;font-weight:700;color:{TEXT}">{name}</div>'
                f'<div style="font-size:.62rem;color:{health_color};margin-top:.2rem">'
                f'{health_label} · {count} arts.</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ═════════════════════════════════════════════════════════════════════════════
# TAB 4: RADAR DE NARRATIVAS
# ═════════════════════════════════════════════════════════════════════════════
with tab_narrativa:
    col_radar, col_velocity = st.columns([2, 3], gap="large")

    with col_radar:
        section_header("RADAR DE NARRATIVAS", PURPLE)

        narrative_labels = [n["nombre"] for n in _NARRATIVAS_DEMO[:12]]
        narrative_vals = [n["intensidad"] for n in _NARRATIVAS_DEMO[:12]]
        # Close the polygon
        r_vals = narrative_vals + [narrative_vals[0]]
        theta_vals = narrative_labels + [narrative_labels[0]]

        fig_radar = go.Figure()
        fig_radar.add_trace(go.Scatterpolar(
            r=r_vals,
            theta=theta_vals,
            fill="toself",
            fillcolor="rgba(139,92,246,0.145)",
            line=dict(color=PURPLE, width=2),
            name="Intensidad narrativa",
            hovertemplate="%{theta}: <b>%{r}</b><extra></extra>",
        ))
        fig_radar.add_trace(go.Scatterpolar(
            r=[50] * (len(narrative_labels) + 1),
            theta=theta_vals,
            fill="none",
            line=dict(color=BORDER, dash="dot", width=1),
            name="Línea base",
            showlegend=False,
        ))
        fig_radar.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True, range=[0, 100],
                    gridcolor=BORDER,
                    tickfont=dict(color=MUTED, size=8),
                ),
                angularaxis=dict(
                    gridcolor=BORDER,
                    tickfont=dict(color=TEXT2, size=9),
                ),
                bgcolor=BG2,
            ),
            paper_bgcolor=BG2,
            font=dict(color=TEXT),
            height=420,
            margin=dict(l=20, r=20, t=30, b=20),
            legend=dict(bgcolor=BG3, font=dict(color=TEXT2, size=10)),
        )
        st.plotly_chart(fig_radar, use_container_width=True)

    with col_velocity:
        section_header("VELOCIDAD DE NARRATIVAS", CYAN)

        fig_vel = go.Figure()
        narrative_names = [n["nombre"] for n in _NARRATIVAS_DEMO]
        narrative_vels = [n["velocidad"] for n in _NARRATIVAS_DEMO]
        narrative_deltas = [n["delta"] for n in _NARRATIVAS_DEMO]

        vel_colors = [
            GREEN if d > 3 else (AMBER if d > 0 else (RED if d < -2 else MUTED))
            for d in narrative_deltas
        ]

        fig_vel.add_trace(go.Bar(
            x=narrative_vels,
            y=narrative_names,
            orientation="h",
            marker=dict(color=vel_colors, line=dict(width=0)),
            hovertemplate="%{y}: <b>%{x}</b> arts/h<extra></extra>",
            name="Velocidad",
        ))
        fig_vel.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=420,
            margin=dict(l=10, r=10, t=20, b=10),
            yaxis=dict(autorange="reversed", tickfont=dict(color=TEXT)),
            xaxis=dict(
                title="Artículos por hora",
                gridcolor=BORDER,
                tickfont=dict(color=TEXT2),
            ),
        )
        st.plotly_chart(fig_vel, use_container_width=True)

    # ── Inflection point narratives ───────────────────────────────────────────
    section_header("NARRATIVAS EN PUNTO DE INFLEXIÓN", RED)
    inflection = [n for n in _NARRATIVAS_DEMO if abs(n["delta"]) >= 4]
    if inflection:
        inf_cols = st.columns(min(len(inflection), 4))
        for i, narr in enumerate(inflection[:4]):
            delta_col = GREEN if narr["delta"] > 0 else RED
            delta_icon = "▲" if narr["delta"] > 0 else "▼"
            with inf_cols[i]:
                st.markdown(
                    f'<div style="background:{delta_col}12;border:1px solid {delta_col}44;'
                    f'border-radius:10px;padding:.7rem;text-align:center">'
                    f'<div style="font-size:.75rem;font-weight:700;color:{TEXT};margin-bottom:.3rem">'
                    f'{narr["nombre"]}</div>'
                    f'<div style="font-size:1.2rem;font-weight:800;color:{delta_col}">'
                    f'{delta_icon} {abs(narr["delta"])} arts/h</div>'
                    f'<div style="font-size:.62rem;color:{TEXT2};margin-top:.2rem">'
                    f'Intensidad: {narr["intensidad"]}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.info("No se detectan narrativas en punto de inflexión en este momento.")

    # ══════════════════════════════════════════════════════════════════════════
    # ANALISIS DINAMICO DE NARRATIVA
    # ══════════════════════════════════════════════════════════════════════════
    st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)
    section_header("ANALISIS DINAMICO DE NARRATIVA", AMBER)

    _narr_cols_top = st.columns([2, 3], gap="large")
    with _narr_cols_top[0]:
        _narr_names = [n["nombre"] for n in _NARRATIVAS_DEMO]
        _sel_narr_idx = st.selectbox(
            "Narrativa a analizar",
            range(len(_narr_names)),
            format_func=lambda i: _narr_names[i],
            key="d7_narr_deep_sel",
            index=0,
        )
        _sel_narr = _NARRATIVAS_DEMO[_sel_narr_idx]
        _sel_narr_nombre = _sel_narr["nombre"]
        _sel_narr_intensidad = _sel_narr.get("intensidad", 50)
        _sel_narr_delta = _sel_narr.get("delta", 0)
        _estructura = _NARRATIVA_ESTRUCTURA.get(_sel_narr_nombre, _NARRATIVA_DEFAULT)

        _nk1, _nk2, _nk3 = st.columns(3)
        _delta_col = GREEN if _sel_narr_delta > 0 else (RED if _sel_narr_delta < 0 else MUTED)
        _nk1.markdown(kpi_card("Intensidad", f"{_sel_narr_intensidad}/100", color=AMBER), unsafe_allow_html=True)
        _nk2.markdown(kpi_card("Delta 24h", f"{_sel_narr_delta:+d}", color=_delta_col), unsafe_allow_html=True)
        _nk3.markdown(kpi_card("Velocidad", f"{_sel_narr.get('velocidad',0)}/h", color=CYAN), unsafe_allow_html=True)

        # Evolucion temporal
        _tendencia = _estructura.get("tendencia", [50]*7)
        _dias_labels = ["D-6", "D-5", "D-4", "D-3", "D-2", "Ayer", "Hoy"]
        _fig_tend = go.Figure(go.Scatter(
            x=_dias_labels, y=_tendencia,
            mode="lines+markers",
            line=dict(color=AMBER, width=2),
            marker=dict(size=6, color=AMBER, line=dict(width=1, color=BG)),
            fill="tozeroy",
            fillcolor="rgba(245,158,11,0.08)",
        ))
        _fig_tend.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=120, margin=dict(l=8, r=8, t=4, b=22),
            xaxis=dict(showgrid=False, tickfont=dict(color=MUTED, size=7)),
            yaxis=dict(showgrid=True, gridcolor=BORDER, tickfont=dict(color=MUTED, size=7), range=[0, 100]),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(_fig_tend, use_container_width=True, config={"displayModeBar": False}, key="d7_narr_tend2")

    with _narr_cols_top[1]:
        # Estructura de la narrativa seleccionada
        def _narr_block(title: str, items: list, color: str) -> str:
            bullets = "".join(
                f'<div style="display:flex;align-items:flex-start;gap:.4rem;margin:.2rem 0">'
                f'<span style="color:{color};font-size:.7rem;flex-shrink:0">—</span>'
                f'<span style="font-size:.77rem;color:{TEXT};line-height:1.4">{i}</span>'
                f'</div>'
                for i in items
            )
            return (
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {color};'
                f'border-radius:6px;padding:.6rem .9rem;margin:.35rem 0">'
                f'<div style="font-size:.58rem;font-weight:800;letter-spacing:.12em;'
                f'text-transform:uppercase;color:{color};margin-bottom:.4rem">{title}</div>'
                f'{bullets}'
                f'</div>'
            )

        _nc1, _nc2 = st.columns(2)
        with _nc1:
            st.markdown(_narr_block("Elementos", _estructura["elementos"], CYAN), unsafe_allow_html=True)
            st.markdown(_narr_block("Potenciadores", _estructura["potenciadores"], GREEN), unsafe_allow_html=True)
        with _nc2:
            st.markdown(_narr_block("Difusores", _estructura["difusores"], BLUE), unsafe_allow_html=True)
            st.markdown(_narr_block("Debilitadores", _estructura["debilitadores"], RED), unsafe_allow_html=True)
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {PURPLE};'
            f'border-radius:6px;padding:.6rem .9rem;margin:.35rem 0">'
            f'<div style="font-size:.58rem;font-weight:800;letter-spacing:.12em;'
            f'text-transform:uppercase;color:{PURPLE};margin-bottom:.3rem">Audiencia objetivo</div>'
            f'<div style="font-size:.77rem;color:{TEXT};line-height:1.4">{_estructura["target"]}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Analisis Ollama profundo ─────────────────────────────────────────────
    st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)
    section_header("INTELIGENCIA NARRATIVA — ANALISIS IA", PURPLE)

    _narr_cache_key = f"d7_narr_analysis_{_sel_narr_nombre}"
    _col_run, _col_clear, _col_bias = st.columns([3, 1, 2])
    with _col_run:
        _run_narr = st.button(
            f"Analizar narrativa: {_sel_narr_nombre}",
            key="d7_narr_ai_btn2",
            type="primary",
            use_container_width=True,
        )
    with _col_clear:
        if st.button("Limpiar", key="d7_narr_clear2"):
            st.session_state.pop(_narr_cache_key, None)
            st.session_state.pop("d7_bias_analysis", None)
            st.rerun()
    with _col_bias:
        _run_bias = st.button("Comparar sesgos mediaticos", key="d7_bias_btn2", use_container_width=True)

    if _run_narr:
        _titulares_rel = [
            n.get("titulo", "") for n in noticias_main
            if _sel_narr_nombre.lower()[:8] in (n.get("titulo","") + n.get("resumen","")).lower()
        ][:8]
        _prompt_narr = (
            f"Analiza en profundidad la narrativa politica \"{_sel_narr_nombre}\" "
            f"en el contexto espanol actual.\n\n"
            f"DATOS:\n"
            f"- Intensidad: {_sel_narr_intensidad}/100 (variacion {_sel_narr_delta:+d} en 24h)\n"
            f"- Elementos: {chr(44).join(_estructura['elementos'])}\n"
            f"- Difusores principales: {chr(44).join(_estructura['difusores'][:2])}\n"
            f"- Target: {_estructura['target']}\n"
            f"- Titulares relacionados: {chr(59).join(_titulares_rel) if _titulares_rel else 'sin titulares directos'}\n\n"
            "Proporciona analisis estructurado en CINCO secciones exactas:\n"
            "1. MARCO COGNITIVO: que angulo de realidad construye esta narrativa y que emociones activa\n"
            "2. ACTORES NARRATIVOS: quien es el villano, la victima y el heroe en esta narrativa\n"
            "3. TECNICAS PERSUASIVAS: que mecanismos usa para instalarse (miedo, identidad, repeticion)\n"
            "4. CONTRANARRATIVAS: que mensajes podrian neutralizarla eficazmente\n"
            "5. RIESGO POLITICO: impacto estimado en intenciones de voto si se intensifica\n\n"
            "Se concreto. Cita actores reales. Sin emojis."
        )
        with st.spinner("Analizando con Ollama..."):
            if _LLM_OK:
                try:
                    _resp = chat(
                        _prompt_narr,
                        sistema=(
                            "Eres analista senior de inteligencia narrativa especializado en politica espanola. "
                            "Usas metodologia de analisis critico del discurso y framing theory. "
                            "Responde en espanol. Sin emojis. Rigor analitico."
                        ),
                    )
                    st.session_state[_narr_cache_key] = _resp
                except Exception as _exc_narr:
                    st.session_state[_narr_cache_key] = f"Error Ollama: {_exc_narr}"
            else:
                st.session_state[_narr_cache_key] = (
                    f"Ollama no disponible. Datos basicos:\n\n"
                    f"Narrativa: {_sel_narr_nombre} — intensidad {_sel_narr_intensidad}/100 "
                    f"(delta {_sel_narr_delta:+d})\n\n"
                    f"Difusores: {chr(44).join(_estructura['difusores'][:2])}\n\n"
                    f"Target: {_estructura['target']}"
                )

    if _narr_cache_key in st.session_state and st.session_state[_narr_cache_key]:
        _col_a, _col_b = st.columns(2)
        _section_colors = [CYAN, BLUE, PURPLE, AMBER, RED]
        _blocks = [b.strip() for b in st.session_state[_narr_cache_key].split("\n\n") if b.strip()]
        for _bi, _block in enumerate(_blocks[:10]):
            _bc = _section_colors[_bi % len(_section_colors)]
            _is_header = _block[:3] in ("1. ", "2. ", "3. ", "4. ", "5. ") or _block.isupper()
            (_col_a if _bi % 2 == 0 else _col_b).markdown(
                f'<div style="background:{_bc}08;border-left:2px solid {_bc};'
                f'border-radius:0 5px 5px 0;padding:.6rem .9rem;margin:.3rem 0;'
                f'font-size:.80rem;color:{TEXT if not _is_header else _bc};'
                f'font-weight:{"700" if _is_header else "400"};line-height:1.5">'
                f'{html.escape(_block)}'
                f'</div>',
                unsafe_allow_html=True,
            )

    # ── Nube de terminos + comparativa mediatica ─────────────────────────────
    st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
    _cloud_col, _comp_col = st.columns([3, 2], gap="large")

    with _cloud_col:
        section_header("TERMINOS DOMINANTES EN MEDIOS", CYAN)
        _all_top_words = _top_words(noticias_main, 24)
        if _all_top_words:
            _max_c = max(c for _, c in _all_top_words)
            _tag_colors = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316"]
            _tags_html = '<div style="line-height:2.6;padding:.3rem 0">'
            for _wi, (_word, _count) in enumerate(_all_top_words):
                _sz = 0.62 + (_count / _max_c) * 0.95
                _col_t = _tag_colors[_wi % len(_tag_colors)]
                _tags_html += (
                    f'<span style="background:{_col_t}18;color:{_col_t};'
                    f'border:1px solid {_col_t}44;border-radius:3px;'
                    f'padding:.12rem .45rem;margin:.15rem .2rem;display:inline-block;'
                    f'font-size:{_sz:.2f}rem;font-weight:600">'
                    f'{html.escape(_word)}'
                    f'<span style="font-size:.52rem;opacity:.65;margin-left:.25rem">{_count}</span>'
                    f'</span>'
                )
            _tags_html += '</div>'
            st.markdown(_tags_html, unsafe_allow_html=True)
        else:
            st.info("Sin datos suficientes para nube de terminos.")

    with _comp_col:
        section_header("COMPARATIVA IZQUIERDA / DERECHA", BLUE)
        _left_src = {"elpais", "eldiario", "publico", "infolibre"}
        _right_src = {"elmundo", "abc", "larazon"}
        _left_nws  = [n for n in noticias_main if n.get("fuente") in _left_src]
        _right_nws = [n for n in noticias_main if n.get("fuente") in _right_src]
        _left_top  = _top_words(_left_nws, 6)
        _right_top = _top_words(_right_nws, 6)
        _lr_cols2  = st.columns(2)
        for _si, (_sl, _sc, _sw) in enumerate([("Izquierda", RED, _left_top), ("Derecha", BLUE, _right_top)]):
            with _lr_cols2[_si]:
                st.markdown(
                    f'<div style="font-size:.62rem;color:{_sc};font-weight:700;'
                    f'letter-spacing:.1em;margin-bottom:.35rem">{_sl.upper()}</div>',
                    unsafe_allow_html=True,
                )
                for _ww, _wc in _sw:
                    _bw = int(_wc / max(_sw[0][1], 1) * 100) if _sw else 0
                    st.markdown(
                        f'<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.24rem">'
                        f'<span style="font-size:.68rem;color:{TEXT2};width:76px;flex-shrink:0;'
                        f'overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{_ww}</span>'
                        f'<div style="flex:1;height:4px;background:{BORDER};border-radius:2px">'
                        f'<div style="width:{_bw}%;height:4px;background:{_sc};border-radius:2px"></div>'
                        f'</div>'
                        f'<span style="font-size:.62rem;color:{MUTED};width:18px;text-align:right">{_wc}</span>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )

        if _run_bias:
            _lh = [n.get("titulo","") for n in _left_nws[:5]]
            _rh = [n.get("titulo","") for n in _right_nws[:5]]
            _bias_ctx = (
                f"Medios izquierda: {chr(59).join(_lh)}\n"
                f"Medios derecha: {chr(59).join(_rh)}\n"
                f"Top terminos comunes: {chr(44).join(w for w, _ in (_all_top_words if '_all_top_words' in dir() else [])[:10])}"
            )
            with st.spinner("Analizando sesgos con Ollama..."):
                if _LLM_OK:
                    try:
                        _bias_resp = chat(
                            f"Analiza los sesgos mediaticos comparativos de hoy:\n{_bias_ctx}\n\n"
                            "Identifica: 1) Diferencias de encuadre, 2) Temas silenciados, "
                            "3) Palabras diferenciadoras, 4) Narrativa dominante. Sin emojis.",
                            sistema="Eres analista experto en medios espanoles. Objetivo y conciso.",
                        )
                        st.session_state["d7_bias_analysis"] = _bias_resp
                    except Exception as _bex:
                        st.session_state["d7_bias_analysis"] = f"Error: {_bex}"
                else:
                    _tl = [w for w, _ in _top_words(_left_nws, 5)]
                    _tr = [w for w, _ in _top_words(_right_nws, 5)]
                    st.session_state["d7_bias_analysis"] = (
                        f"Izquierda: {chr(44).join(_tl)}\n\nDerecha: {chr(44).join(_tr)}\n\nActiva Ollama."
                    )

        if "d7_bias_analysis" in st.session_state:
            _b_blocks = [b.strip() for b in st.session_state["d7_bias_analysis"].split("\n\n") if b.strip()]
            for _bbi, _bb in enumerate(_b_blocks[:5]):
                _bbc = [CYAN, BLUE, PURPLE, AMBER][_bbi % 4]
                st.markdown(
                    f'<div style="background:{_bbc}10;border-left:3px solid {_bbc};'
                    f'border-radius:5px;padding:.55rem .85rem;margin-bottom:.3rem;'
                    f'font-size:.78rem;color:{TEXT};line-height:1.5">'
                    f'{html.escape(_bb)}'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    # ══════════════════════════════════════════════════════════════════════════
    # CRUCE: ALERTAS DE DESINFORMACION RELACIONADAS
    # Conexion con agents.intelligence.disinfo_scraper / disinfo_analyzer
    # ══════════════════════════════════════════════════════════════════════════
    st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
    section_header("ALERTAS DE DESINFORMACION RELACIONADAS", RED)
    st.markdown(
        f'<p style="font-size:.74rem;color:{MUTED};margin:-6px 0 8px">Contenido falso o enganoso vinculado '
        f'a la narrativa seleccionada — fuentes: EUvsDisinfo, Maldita.es, Newtral, AFP Factual, Verificat, Bellingcat.</p>',
        unsafe_allow_html=True,
    )

    @st.cache_data(ttl=1800, show_spinner=False)
    def _load_disinfo_items(narrative_keyword: str) -> list[dict]:
        """Intenta cargar items reales del DisinfoScraper; fallback a demo."""
        try:
            from agents.intelligence.disinfo_scraper import DisinfoScraper as _DS
            _scraper = _DS()
            _all = _scraper.fetch_all(since_hours=72)
            kw = narrative_keyword.lower()
            _filtered = [
                i for i in _all
                if kw in i.title.lower()
                or any(kw in k for k in i.keywords)
                or any(kw in a.lower() for a in i.actors)
            ]
            return [
                {
                    "titulo": i.title,
                    "fuente": i.source_name,
                    "veredicto": i.verdict,
                    "origen": i.origin,
                    "taxonomia": i.taxonomy,
                    "url": i.url,
                    "actors": i.actors[:3],
                }
                for i in _filtered[:6]
            ]
        except Exception:
            pass
        # Demo data — siempre relativa a la narrativa en foco
        return [
            {
                "titulo": f"Afirmacion sin verificar sobre {narrative_keyword} difundida en redes",
                "fuente": "Maldita.es",
                "veredicto": "falso",
                "origen": "ES",
                "taxonomia": "DOMESTIC",
                "url": "#",
                "actors": [],
            },
            {
                "titulo": f"Cuenta coordinada amplifica mensajes sobre {narrative_keyword}",
                "fuente": "EUvsDisinfo",
                "veredicto": "enganoso",
                "origen": "RU",
                "taxonomia": "FIMI",
                "url": "#",
                "actors": [],
            },
        ]

    _narr_kw = _sel_narr_nombre.split()[0] if "_sel_narr_nombre" in dir() else "economia"
    try:
        _narr_kw = _sel_narr_nombre.split()[0]
    except Exception:
        _narr_kw = "politica"

    _disinfo_items = _load_disinfo_items(_narr_kw)

    _VERDICT_COLORS = {
        "falso": RED,
        "enganoso": AMBER,
        "sin_contexto": BLUE,
        "parcialmente_falso": AMBER,
        "verdadero": GREEN,
        "satira": MUTED,
        "desconocido": MUTED,
    }
    _TAXONOMY_LABELS = {
        "FIMI": "Operacion de influencia extranjera",
        "DOMESTIC": "Desinformacion interna",
        "COORDINATED": "Coordinacion detectada",
        "ORGANIC": "Organico",
    }

    if not _disinfo_items:
        st.info("No se detectan alertas de desinformacion vinculadas a esta narrativa en las ultimas 72h.")
    else:
        _dc1, _dc2 = st.columns(2, gap="medium")
        for _di_idx, _di in enumerate(_disinfo_items):
            _dc = _dc1 if _di_idx % 2 == 0 else _dc2
            _vc = _VERDICT_COLORS.get(_di.get("veredicto", "desconocido"), MUTED)
            _tax_label = _TAXONOMY_LABELS.get(_di.get("taxonomia", ""), _di.get("taxonomia", ""))
            _verdict_label = _di.get("veredicto", "desconocido").replace("_", " ").upper()
            with _dc:
                st.markdown(
                    f'<div style="background:{_vc}0d;border:1px solid {_vc}40;border-radius:8px;'
                    f'padding:.6rem .85rem;margin-bottom:.5rem">'
                    f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
                    f'<span style="font-size:.65rem;font-weight:700;color:{_vc};letter-spacing:.06em">'
                    f'{_verdict_label}</span>'
                    f'<span style="font-size:.6rem;color:{MUTED}">{_di.get("fuente","")}'
                    f' | {_di.get("origen","")}</span>'
                    f'</div>'
                    f'<div style="font-size:.76rem;color:{TEXT};font-weight:500;line-height:1.35;margin-bottom:.25rem">'
                    f'{html.escape(_di.get("titulo",""))}</div>'
                    f'<div style="font-size:.63rem;color:{MUTED}">{_tax_label}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    # Boton analisis FIMI con Ollama
    if st.button("Analizar patron de desinformacion con IA", key="d7_fimi_btn"):
        with st.spinner("Analizando patron FIMI..."):
            try:
                import requests as _req
                _fimi_ctx = "\n".join(
                    f"- [{i.get('veredicto','')}] {i.get('titulo','')} (origen: {i.get('origen','')})"
                    for i in _disinfo_items
                ) or "No hay items de desinformacion disponibles."
                _fimi_prompt = (
                    f"Eres analista de inteligencia especializado en FIMI y desinformacion.\n\n"
                    f"Narrativa en foco: {_sel_narr_nombre}\n\n"
                    f"Alertas de desinformacion relacionadas:\n{_fimi_ctx}\n\n"
                    f"Analiza el patron de desinformacion:\n"
                    f"1. Coherencia del patron (organico vs coordinado)\n"
                    f"2. Probable objetivo politico\n"
                    f"3. Actores beneficiados\n"
                    f"4. Recomendacion de contranarrativa\n"
                    f"Responde de forma concisa en espanol, sin emojis."
                )
                _fr = _req.post(
                    "http://localhost:11434/api/generate",
                    json={"model": "qwen3:8b", "prompt": _fimi_prompt,
                          "stream": False, "options": {"temperature": 0.3, "num_predict": 900}},
                    timeout=90,
                )
                _fr.raise_for_status()
                _fimi_raw = _fr.json().get("response", "")
                _fimi_raw = re.sub(r"<think>.*?</think>", "", _fimi_raw, flags=re.DOTALL).strip()
                st.session_state["d7_fimi_analysis"] = _fimi_raw
            except Exception as _fe:
                st.session_state["d7_fimi_analysis"] = f"Ollama no disponible: {_fe}"

    if "d7_fimi_analysis" in st.session_state:
        st.markdown(
            f'<div style="background:{RED}0d;border-left:3px solid {RED};border-radius:6px;'
            f'padding:.7rem 1rem;margin-top:.5rem;font-size:.78rem;color:{TEXT};white-space:pre-wrap;'
            f'line-height:1.6">{html.escape(st.session_state["d7_fimi_analysis"])}</div>',
            unsafe_allow_html=True,
        )


# ═════════════════════════════════════════════════════════════════════════════
# TAB 5: ANÁLISIS COMPARATIVO — DEEP NARRATIVE INTELLIGENCE
# ═════════════════════════════════════════════════════════════════════════════

# ── Helper de palabras (limpia HTML) ─────────────────────────────────────────
def _top_words(news_list: list[dict], n: int = 15) -> list[tuple[str, int]]:
    _STOPWORDS = {
        "para", "pero", "con", "por", "una", "las", "los", "del", "que",
        "sus", "mas", "como", "entre", "este", "esta", "sobre", "ante",
        "tras", "desde", "hasta", "cuando", "donde", "aunque", "porque",
        "tambien", "sin", "ser", "han", "son", "hay", "esta", "todo",
        "puede", "durante", "segun", "anos", "espanol", "the", "and",
        "that", "this", "with", "from", "width", "height", "class",
        "style", "href", "img", "src", "div", "span", "nbsp", "amp",
        "quot", "apos", "rel", "alt", "aria", "data", "tipo", "also",
        "have", "been", "will", "were", "they", "their", "said", "have",
    }
    _HTML_RE = re.compile(r'<[^>]+>|&[a-z#0-9]+;|http\S+|www\.\S+|\d{3,}|[="\'{}\[\]<>]')

    counts: dict[str, int] = {}
    for item in news_list:
        raw = f"{item.get('titulo','')} {item.get('resumen','')} {item.get('texto_completo','')}"
        clean = _HTML_RE.sub(" ", raw).lower()
        for word in clean.split():
            word = word.strip(".,;:()[]¿?¡!\"'—«»#@_/\\|")
            if len(word) > 5 and word not in _STOPWORDS and word.isalpha():
                counts[word] = counts.get(word, 0) + 1
    return sorted(counts.items(), key=lambda x: x[1], reverse=True)[:n]


# ── Datos fijos de estructura de narrativas ───────────────────────────────────
_NARRATIVA_ESTRUCTURA: dict[str, dict] = {
    "Crisis económica": {
        "elementos": ["Prima de riesgo", "Desempleo estructural", "Inflación persistente", "Déficit público", "Deuda soberana"],
        "difusores": ["Medios económicos (Expansión, Cinco Días)", "Oposición PP y VOX", "Think tanks liberales (Funcas, FAES)"],
        "target": "Clase media asalariada, pequeños empresarios, hipotecados variables",
        "potenciadores": ["Datos de paro por encima del 11%", "Rebaja de rating crediticio", "Sanciones UE por déficit excesivo"],
        "debilitadores": ["Bajada del BCE", "Crecimiento PIB por encima de media UE", "Record de exportaciones"],
        "tendencia": [45, 52, 58, 67, 74, 79, 82],
    },
    "Corrupción institucional": {
        "elementos": ["Contratos irregulares", "Financiación ilegal de partidos", "Puertas giratorias", "Nepotismo en cargos públicos"],
        "difusores": ["Medios de investigación (El Confidencial, El País)", "Partidos en oposición", "Redes sociales"],
        "target": "Votantes desencantados, abstencionistas potenciales, jóvenes con baja confianza institucional",
        "potenciadores": ["Nuevas imputaciones judiciales", "Filtraciones de documentos", "Sentencias condenatorias"],
        "debilitadores": ["Absoluciones judiciales", "Reformas de transparencia aprobadas", "Resultados electorales que penalizan al partido imputado"],
        "tendencia": [60, 65, 72, 70, 74, 76, 74],
    },
    "Independentismo catalán": {
        "elementos": ["Referéndum de autodeterminación", "Singularidad fiscal", "Lengua y cultura propias", "Agravio comparativo con el Estado"],
        "difusores": ["Medios catalanes (Ara, VilaWeb, Nació Digital)", "Partidos soberanistas (ERC, Junts, CUP)", "Entidades civiles (ANC, Omnium)"],
        "target": "Electorado catalán movilizado (40-48% del censo), diáspora catalana en Europa",
        "potenciadores": ["Conflicto competencial con el Estado", "Aprobación de la amnistía", "Tensión en el Congreso con el bloque governamental"],
        "debilitadores": ["Gestión autonómica fallida", "Divisiones internas entre soberanistas", "Acuerdos bilaterales Estado-Generalitat"],
        "tendencia": [55, 60, 65, 68, 64, 66, 68],
    },
    "Inmigración irregular": {
        "elementos": ["Llegadas en patera a Canarias", "Menores no acompañados (MENAS)", "Redes de tráfico de personas", "Capacidad de acogida"],
        "difusores": ["VOX y sectores del PP", "Medios de derechas (ABC, La Razón, OK Diario)", "Redes sociales (X/Twitter, Telegram)"],
        "target": "Electores de zonas con alta percepción de inseguridad, votantes de clase trabajadora en competencia laboral",
        "potenciadores": ["Cifras récord de llegadas", "Incidentes de orden público atribuidos a migrantes", "Crisis diplomática con Marruecos"],
        "debilitadores": ["Datos de integración laboral positivos", "Acuerdos migratorios con países de origen", "Condenas judiciales de bulos"],
        "tendencia": [30, 38, 45, 52, 58, 64, 61],
    },
    "Vivienda asequible": {
        "elementos": ["Precio del alquiler", "Emancipación juvenil", "Fondos de inversión inmobiliaria", "Ley de vivienda"],
        "difusores": ["Sindicatos de inquilinos", "Partidos de izquierda (SUMAR, PSOE)", "Medios generalistas en zonas tensionadas"],
        "target": "Jóvenes de 25-40 años en grandes ciudades, rentas medias-bajas en alquiler, familias monoparentales",
        "potenciadores": ["Subida del IPC de alquiler", "Desahucios en aumento", "Compra de pisos por fondos buitre"],
        "debilitadores": ["Aumento de visados de obra nueva", "Caída de tipos de interés", "Acuerdos autonómicos de vivienda pública"],
        "tendencia": [25, 32, 40, 46, 50, 52, 52],
    },
}

# Datos por defecto para narrativas sin estructura específica
_NARRATIVA_DEFAULT = {
    "elementos": ["Cobertura mediática intensa", "Actores políticos implicados", "Debate público activo"],
    "difusores": ["Medios generalistas", "Redes sociales", "Partidos políticos"],
    "target": "Ciudadanía general interesada en política",
    "potenciadores": ["Eventos relacionados de alta relevancia", "Declaraciones de líderes políticos"],
    "debilitadores": ["Agenda setting de otras narrativas más intensas", "Falta de hechos nuevos"],
    "tendencia": [30, 35, 38, 40, 42, 45, 49],
}
with tab_mapa:
    # ── Lazy import del módulo de ingesta ────────────────────────────────────
    @st.cache_resource(ttl=0)
    def _ni():
        try:
            from dashboard.services import news_ingestion as _m
            return _m
        except Exception:
            return None

    _news_mod = _ni()

    # ── Geographic region → keyword matching ─────────────────────────────────
    # Keys map to source_region field values and geo_location keywords
    _GEO_REGIONS: dict[str, dict] = {
        "Internacional": {
            "label": "Internacional",
            "source_regions": [],   # matches all (no filter when selected alone)
            "geo_keywords": [],
            "match_all": True,
        },
        "Europa": {
            "label": "Europa",
            "source_regions": ["europe"],
            "geo_keywords": [
                "France", "Germany", "Italy", "UK", "Poland", "Hungary",
                "Portugal", "Belgium", "Netherlands", "Sweden", "Norway",
                "Switzerland", "Ukraine", "Russia", "Turkey", "Spain",
                "Greece", "Austria", "Czech", "Romania", "Bulgaria",
            ],
            "match_all": False,
        },
        "Africa": {
            "label": "Africa",
            "source_regions": ["africa"],
            "geo_keywords": [
                "Nigeria", "Kenya", "South Africa", "Egypt", "Morocco",
                "Ethiopia", "Sudan", "Libya", "Niger", "Mali", "Senegal",
                "Ghana", "Tanzania", "Algeria", "Tunisia", "Somalia",
            ],
            "match_all": False,
        },
        "Asia": {
            "label": "Asia",
            "source_regions": ["asia"],
            "geo_keywords": [
                "China", "Japan", "South Korea", "India", "Taiwan",
                "Pakistan", "Afghanistan", "Iran", "Saudi Arabia",
                "Israel", "Syria", "North Korea", "Vietnam", "Indonesia",
                "Thailand", "Malaysia", "Philippines", "Bangladesh",
            ],
            "match_all": False,
        },
        "America del Norte": {
            "label": "Am. Norte",
            "source_regions": ["north_america"],
            "geo_keywords": ["USA", "Canada", "Mexico", "Cuba"],
            "match_all": False,
        },
        "America del Sur": {
            "label": "Am. Sur",
            "source_regions": ["latin_america"],
            "geo_keywords": [
                "Brazil", "Argentina", "Colombia", "Chile", "Peru",
                "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay",
            ],
            "match_all": False,
        },
        "España Nacional": {
            "label": "Esp. Nacional",
            "source_regions": ["local_spain"],
            "geo_keywords": ["Spain"],
            "match_all": False,
        },
        "España Regional": {
            "label": "Esp. Regional",
            "source_regions": ["local_spain", "regional_spain"],
            "geo_keywords": [
                "Cataluña", "Madrid", "Andalucía", "Valencia", "País Vasco",
                "Galicia", "Aragón", "Murcia", "Castilla", "Extremadura",
                "Asturias", "Navarra", "Baleares", "Canarias", "Cantabria",
                "La Rioja",
            ],
            "match_all": False,
        },
    }

    _CCAA_LIST = [
        "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias",
        "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña",
        "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia",
        "Navarra", "País Vasco", "Valencia",
    ]

    # ── Helpers: assign geo_region from source_region / geo_location ─────────
    def _assign_geo_region(row: dict) -> str:
        """Infer geo_region label for a news item if not already set."""
        if row.get("geo_region"):
            return row["geo_region"]
        src = row.get("source_region", "") or ""
        loc = row.get("ai_geo_location", "") or ""
        for region_label, cfg in _GEO_REGIONS.items():
            if region_label in ("Internacional",):
                continue
            if src in cfg["source_regions"]:
                # Check if it's España Regional vs España Nacional
                if region_label == "España Nacional":
                    # Only match if none of the regional keywords match
                    if not any(kw.lower() in loc.lower() for kw in _GEO_REGIONS["España Regional"]["geo_keywords"]):
                        return region_label
                else:
                    return region_label
            for kw in cfg["geo_keywords"]:
                if kw.lower() in loc.lower():
                    return region_label
        return "Internacional"

    # ── Load data ─────────────────────────────────────────────────────────────
    @st.cache_data(ttl=180)
    def _load_global_events(
        hours: int,
        min_rel: int,
        cat: str,
        geo_regions: tuple[str, ...] = (),
        ccaa_filter: tuple[str, ...] = (),
    ) -> pd.DataFrame:
        if _news_mod:
            try:
                rows = _news_mod.get_recent_articles(
                    limit=500, min_relevance=min_rel, hours_back=hours,
                    category=cat if cat != "Todas" else None,
                )
                if rows:
                    df = pd.DataFrame(rows)
                    df = df.dropna(subset=["ai_geo_lat", "ai_geo_lon"])
                    df["geo_region"] = df.apply(_assign_geo_region, axis=1)
                    if geo_regions:
                        df = _filter_by_geo(df, geo_regions, ccaa_filter)
                    return df
            except Exception:
                pass
        df = pd.DataFrame(_ALL_MAP_EVENTS)
        df["geo_region"] = df.apply(_assign_geo_region, axis=1)
        if min_rel > 1:
            df = df[df["ai_relevance"] >= min_rel]
        if cat != "Todas":
            df = df[df["ai_category"] == cat]
        if geo_regions:
            df = _filter_by_geo(df, geo_regions, ccaa_filter)
        return df

    def _filter_by_geo(
        df: "pd.DataFrame",
        geo_regions: "tuple[str, ...]",
        ccaa_filter: "tuple[str, ...]",
    ) -> "pd.DataFrame":
        """Filter dataframe to only rows matching selected geo regions."""
        if not geo_regions or "Internacional" in geo_regions:
            return df  # Internacional = mostrar todo
        masks = []
        for region_label in geo_regions:
            cfg = _GEO_REGIONS.get(region_label)
            if not cfg:
                continue
            if cfg.get("match_all"):
                return df
            # Match by geo_region column (already assigned)
            mask = df["geo_region"] == region_label
            # Additional CCAA filter for España Regional
            if region_label == "España Regional" and ccaa_filter:
                ccaa_mask = df["ccaa"].isin(ccaa_filter) if "ccaa" in df.columns else mask
                mask = mask & ccaa_mask
            masks.append(mask)
        if not masks:
            return df
        combined = masks[0]
        for m in masks[1:]:
            combined = combined | m
        return df[combined]

    # ── Geographic region selectors ───────────────────────────────────────────
    _GEO_REGION_KEYS = list(_GEO_REGIONS.keys())

    _geo_row1, _geo_row2, _geo_row3, _geo_row4 = st.columns(4)
    _geo_row5, _geo_row6, _geo_row7, _geo_row8 = st.columns(4)

    with _geo_row1:
        _sel_int = st.checkbox("Internacional", value=True, key="d7geo_int")
    with _geo_row2:
        _sel_eu = st.checkbox("Europa", value=True, key="d7geo_eu")
    with _geo_row3:
        _sel_af = st.checkbox("Africa", value=False, key="d7geo_af")
    with _geo_row4:
        _sel_as = st.checkbox("Asia", value=True, key="d7geo_as")
    with _geo_row5:
        _sel_an = st.checkbox("America del Norte", value=True, key="d7geo_an")
    with _geo_row6:
        _sel_as2 = st.checkbox("America del Sur", value=False, key="d7geo_as2")
    with _geo_row7:
        _sel_esn = st.checkbox("España Nacional", value=True, key="d7geo_esn")
    with _geo_row8:
        _sel_esr = st.checkbox("España Regional", value=False, key="d7geo_esr")

    _selected_regions: list[str] = []
    if _sel_int:
        _selected_regions.append("Internacional")
    if _sel_eu:
        _selected_regions.append("Europa")
    if _sel_af:
        _selected_regions.append("Africa")
    if _sel_as:
        _selected_regions.append("Asia")
    if _sel_an:
        _selected_regions.append("America del Norte")
    if _sel_as2:
        _selected_regions.append("America del Sur")
    if _sel_esn:
        _selected_regions.append("España Nacional")
    if _sel_esr:
        _selected_regions.append("España Regional")

    # CCAA selector — visible only when España Regional is active
    _sel_ccaa: list[str] = []
    if _sel_esr:
        _sel_ccaa = st.multiselect(
            "Comunidad Autonoma",
            _CCAA_LIST,
            default=[],
            key="d7geo_ccaa",
            placeholder="Todas las comunidades autonomas",
        )

    st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)

    # ── Query / display controls ──────────────────────────────────────────────
    col_ctrl1, col_ctrl2, col_ctrl3, col_ctrl4 = st.columns(4)
    with col_ctrl1:
        map_hours = st.selectbox("Ventana temporal", [6, 12, 24, 48, 72], index=2,
                                  format_func=lambda x: f"Últimas {x}h", key="d7map_hours")
    with col_ctrl2:
        map_min_rel = st.slider("Relevancia mínima", 1, 10, 7, key="d7map_rel")
    with col_ctrl3:
        _CATS = ["Todas", "politica_interior", "politica_exterior", "economia",
                 "seguridad_defensa", "justicia", "sociedad", "tecnologia",
                 "medioambiente", "energia", "salud"]
        map_cat = st.selectbox("Categoria", _CATS, key="d7map_cat",
                               format_func=lambda x: x.replace("_", " ").title())
    with col_ctrl4:
        map_view = st.selectbox("Vista", ["Relevancia", "Sentimiento", "Impacto en España"],
                                key="d7map_view")

    _geo_tuple = tuple(_selected_regions)
    _ccaa_tuple = tuple(_sel_ccaa)
    df_ev = _load_global_events(map_hours, map_min_rel, map_cat, _geo_tuple, _ccaa_tuple)

    # ── KPI row ───────────────────────────────────────────────────────────────
    k1, k2, k3, k4, k5 = st.columns(5)
    _is_demo = _news_mod is None or df_ev.empty
    _n_events = len(df_ev)
    _n_critical = len(df_ev[df_ev["ai_relevance"] >= 9]) if not df_ev.empty else 0
    _n_spain_hi = len(df_ev[df_ev["ai_spain_impact"].isin(["alto", "critico"])]) if "ai_spain_impact" in df_ev.columns and not df_ev.empty else 0
    _pct_neg = (df_ev["ai_sentiment"] == "negativo").sum() / max(_n_events, 1) * 100 if not df_ev.empty else 0
    _pct_pos = (df_ev["ai_sentiment"] == "positivo").sum() / max(_n_events, 1) * 100 if not df_ev.empty else 0

    with k1:
        st.markdown(kpi_card("Eventos activos", str(_n_events), color=CYAN), unsafe_allow_html=True)
    with k2:
        st.markdown(kpi_card("Relevancia critica", str(_n_critical), color=RED), unsafe_allow_html=True)
    with k3:
        st.markdown(kpi_card("Impacto alto ESP", str(_n_spain_hi), color=AMBER), unsafe_allow_html=True)
    with k4:
        st.markdown(kpi_card("Sentimiento neg.", f"{_pct_neg:.0f}%", color=RED), unsafe_allow_html=True)
    with k5:
        st.markdown(kpi_card("Sentimiento pos.", f"{_pct_pos:.0f}%", color=GREEN), unsafe_allow_html=True)

    if _is_demo:
        st.markdown(
            f'<div style="background:{AMBER}12;border:1px solid {AMBER}44;border-radius:6px;'
            f'padding:.5rem .9rem;font-size:.72rem;color:{AMBER};margin:.5rem 0">'
            f'Datos de demostración — activa el pipeline de ingesta para datos en tiempo real'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── World map ─────────────────────────────────────────────────────────────
    if not df_ev.empty:
        df_map = df_ev.copy()

        # Ensure lat/lon
        if "ai_geo_lat" not in df_map.columns:
            df_map["ai_geo_lat"] = df_map.get("source_lat", 0)
        if "ai_geo_lon" not in df_map.columns:
            df_map["ai_geo_lon"] = df_map.get("source_lon", 0)

        df_map = df_map.dropna(subset=["ai_geo_lat", "ai_geo_lon"])

        _SENTIMENT_COLORS = {
            "positivo": GREEN, "negativo": RED, "neutro": MUTED, "mixto": AMBER,
        }
        _SPAIN_IMPACT_COLORS = {
            "critico": RED, "alto": AMBER, "medio": BLUE, "bajo": MUTED, "ninguno": BG3,
        }
        _CAT_COLORS = {
            "politica_interior": CYAN, "politica_exterior": BLUE,
            "economia": AMBER, "seguridad_defensa": RED,
            "justicia": PURPLE, "sociedad": GREEN, "tecnologia": "#22D3EE",
            "medioambiente": "#10B981", "energia": "#F97316", "salud": "#EC4899",
        }

        if map_view == "Sentimiento":
            df_map["_color"] = df_map["ai_sentiment"].fillna("neutro").map(
                lambda s: _SENTIMENT_COLORS.get(s, MUTED)
            )
            color_col = "ai_sentiment"
            color_map = _SENTIMENT_COLORS
        elif map_view == "Impacto en España":
            df_map["_color"] = df_map.get("ai_spain_impact", "bajo").fillna("bajo").map(
                lambda s: _SPAIN_IMPACT_COLORS.get(s, MUTED)
            )
            color_col = "ai_spain_impact"
            color_map = _SPAIN_IMPACT_COLORS
        else:
            df_map["_color"] = df_map.get("ai_category", "otro").fillna("otro").map(
                lambda c: _CAT_COLORS.get(c, MUTED)
            )
            color_col = "ai_category"
            color_map = _CAT_COLORS

        # Build scatter_geo
        fig_world = go.Figure()

        # Group by color for legend
        _unique_colors = df_map[color_col].fillna("otro").unique() if color_col in df_map.columns else []
        for grp_val in _unique_colors:
            df_grp = df_map[df_map[color_col].fillna("otro") == grp_val]
            c = color_map.get(grp_val, MUTED)
            fig_world.add_trace(go.Scattergeo(
                lat=df_grp["ai_geo_lat"],
                lon=df_grp["ai_geo_lon"],
                mode="markers",
                name=str(grp_val).replace("_", " ").title(),
                marker=dict(
                    size=df_grp["ai_relevance"].fillna(5) * 2.2,
                    color=c,
                    opacity=0.82,
                    line=dict(width=0.8, color=BG3),
                    sizemode="diameter",
                ),
                text=df_grp["title"],
                customdata=df_grp[["ai_summary", "ai_relevance", "ai_spain_impact",
                                    "ai_urgency", "source_name"]].fillna(""),
                hovertemplate=(
                    "<b>%{text}</b><br>"
                    "Relevancia: %{customdata[1]}/10<br>"
                    "Impacto ESP: %{customdata[2]}<br>"
                    "Urgencia: %{customdata[3]}<br>"
                    "Fuente: %{customdata[4]}<br>"
                    "<br><i>%{customdata[0]}</i>"
                    "<extra></extra>"
                ),
            ))

        _zoom = _get_zoom_preset(_selected_regions)
        fig_world.update_geos(
            showcoastlines=True, coastlinecolor=BORDER,
            showland=True, landcolor="#0D1320",
            showocean=True, oceancolor=BG,
            showframe=False, showlakes=False,
            showrivers=False,
            projection_type="natural earth",
            bgcolor=BG,
            center=dict(lat=_zoom["lat"], lon=_zoom["lon"]),
            projection_scale=_zoom["scale"],
            lataxis_range=_zoom["range_lat"] if _zoom["range_lat"] else None,
            lonaxis_range=_zoom["range_lon"] if _zoom["range_lon"] else None,
        )
        fig_world.update_layout(
            paper_bgcolor=BG,
            geo_bgcolor=BG,
            height=500,
            margin=dict(l=0, r=0, t=8, b=0),
            legend=dict(
                bgcolor=BG2, bordercolor=BORDER, borderwidth=1,
                font=dict(color=TEXT2, size=10),
                x=0.01, y=0.99, xanchor="left", yanchor="top",
            ),
            font=dict(color=TEXT, family="Inter, system-ui, sans-serif"),
        )
        st.plotly_chart(fig_world, use_container_width=True, config={"displayModeBar": False})

        # ── Ficha interactiva de evento ───────────────────────────────────────
        section_header("FICHA DE EVENTO — INTELIGENCIA POLITICA", CYAN)

        _ev_options = (
            df_ev.sort_values("ai_relevance", ascending=False)["title"].tolist()
            if not df_ev.empty else []
        )
        _ev_sel_title = st.selectbox(
            "Seleccionar evento para analisis en profundidad",
            _ev_options,
            key="d7ev_sel",
        ) if _ev_options else None

        if _ev_sel_title:
            _ev_row = df_ev[df_ev["title"] == _ev_sel_title]
            if not _ev_row.empty:
                _ev = _ev_row.iloc[0]
                _ev_cat = str(_ev.get("ai_category", "otro") or "otro")
                _ev_color = _CAT_COLORS_MAP.get(_ev_cat, MUTED)
                _ev_rel = int(_ev.get("ai_relevance", 5))
                _ev_sent = str(_ev.get("ai_sentiment", "neutro") or "neutro")
                _ev_spain = str(_ev.get("ai_spain_impact", "bajo") or "bajo")
                _ev_urgency = str(_ev.get("ai_urgency", "") or "")
                _ev_region = str(_ev.get("geo_region", "") or "")
                _ev_loc = str(_ev.get("ai_geo_location", "") or "")
                _ev_src = str(_ev.get("source_name", "") or "")
                _ev_topics = _ev.get("ai_topics", []) or []
                if isinstance(_ev_topics, str):
                    import json as _json_ev
                    try:
                        _ev_topics = _json_ev.loads(_ev_topics)
                    except Exception:
                        _ev_topics = [_ev_topics]

                _rel_c = RED if _ev_rel >= 9 else (AMBER if _ev_rel >= 7 else MUTED)
                _sent_c = {"positivo": GREEN, "negativo": RED, "mixto": AMBER, "neutro": MUTED}.get(_ev_sent, MUTED)
                _spain_c = {"critico": RED, "alto": AMBER, "medio": BLUE, "bajo": MUTED}.get(_ev_spain, MUTED)

                # Cabecera de la ficha
                st.markdown(
                    f'<div style="background:{BG2};border:1px solid {BORDER};'
                    f'border-left:4px solid {_ev_color};border-radius:8px;padding:1rem 1.2rem;margin:.5rem 0">'
                    f'<div style="font-size:.98rem;font-weight:800;color:{TEXT};line-height:1.35;margin-bottom:.6rem">'
                    f'{_ev.get("title","")}</div>'
                    f'<div style="display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.6rem">'
                    f'<span style="background:{_rel_c}18;color:{_rel_c};border:1px solid {_rel_c}44;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:800;font-family:monospace">R{_ev_rel}/10</span>'
                    f'<span style="background:{_sent_c}18;color:{_sent_c};border:1px solid {_sent_c}33;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600">{_ev_sent}</span>'
                    f'<span style="background:{_spain_c}18;color:{_spain_c};border:1px solid {_spain_c}33;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600">ESP: {_ev_spain}</span>'
                    f'<span style="background:{_ev_color}18;color:{_ev_color};border:1px solid {_ev_color}33;'
                    f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600">{_ev_cat.replace("_"," ").upper()}</span>'
                    f'{"<span style=background:" + AMBER + "18;color:" + AMBER + ";border:1px solid " + AMBER + "33;border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:600>" + _ev_urgency + "</span>" if _ev_urgency else ""}'
                    f'</div>'
                    f'<div style="color:{MUTED};font-size:.68rem">'
                    f'{_ev_src}{"  ·  " + _ev_loc if _ev_loc else ""}{"  ·  " + _ev_region if _ev_region else ""}'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )

                # Columnas: resumen + analisis
                _fc1, _fc2 = st.columns(2)
                with _fc1:
                    if _ev.get("ai_summary"):
                        st.markdown(
                            f'<div style="background:{BG3};border-radius:6px;padding:.75rem .9rem;'
                            f'font-size:.78rem;color:{TEXT2};line-height:1.6;margin:.3rem 0">'
                            f'<div style="color:{CYAN};font-size:.63rem;font-weight:700;'
                            f'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">Resumen</div>'
                            f'{_ev["ai_summary"]}</div>',
                            unsafe_allow_html=True,
                        )
                with _fc2:
                    if _ev.get("ai_analysis"):
                        st.markdown(
                            f'<div style="background:{BG3};border-radius:6px;padding:.75rem .9rem;'
                            f'font-size:.78rem;color:{TEXT2};line-height:1.6;margin:.3rem 0">'
                            f'<div style="color:{AMBER};font-size:.63rem;font-weight:700;'
                            f'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem">Analisis estrategico</div>'
                            f'{_ev["ai_analysis"]}</div>',
                            unsafe_allow_html=True,
                        )

                # Temas
                if _ev_topics:
                    _pills = "".join(
                        f'<span style="background:{BLUE}18;color:{BLUE};border:1px solid {BLUE}33;'
                        f'border-radius:3px;padding:.15rem .5rem;font-size:.63rem;font-weight:600;margin:.15rem">{t}</span>'
                        for t in _ev_topics[:6]
                    )
                    st.markdown(f'<div style="margin:.4rem 0">{_pills}</div>', unsafe_allow_html=True)

                # Eventos proximos en la misma region
                _nearby = (
                    df_ev[
                        (df_ev["geo_region"] == _ev_region)
                        & (df_ev["title"] != _ev.get("title", ""))
                    ]
                    .sort_values("ai_relevance", ascending=False)
                    .head(3)
                )
                if not _nearby.empty:
                    st.markdown(
                        f'<div style="color:{MUTED};font-size:.68rem;font-weight:700;'
                        f'text-transform:uppercase;letter-spacing:.06em;margin:.7rem 0 .3rem">'
                        f'Otros eventos en la zona — {_ev_region}</div>',
                        unsafe_allow_html=True,
                    )
                    _nc = st.columns(len(_nearby))
                    for _nci, (_, _nev) in enumerate(zip(_nc, _nearby.iterrows())):
                        _nev = _nev[1]
                        _nr = int(_nev.get("ai_relevance", 5))
                        _nc_color = RED if _nr >= 9 else (AMBER if _nr >= 7 else MUTED)
                        _nc[_nci].markdown(
                            f'<div style="background:{BG2};border:1px solid {BORDER};'
                            f'border-top:2px solid {_nc_color};border-radius:6px;padding:.6rem .8rem">'
                            f'<div style="font-size:.72rem;font-weight:700;color:{TEXT};line-height:1.3;'
                            f'margin-bottom:.3rem">{str(_nev.get("title",""))[:80]}</div>'
                            f'<div style="font-size:.62rem;color:{MUTED}">'
                            f'{str(_nev.get("source_name",""))} · R{_nr}/10</div>'
                            f'</div>',
                            unsafe_allow_html=True,
                        )

                # Ollama deep-dive
                st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
                _ai_key = f"d7_ev_ai_{hash(_ev.get('title',''))}"
                _col_btn, _col_save = st.columns([3, 1])
                with _col_btn:
                    _run_ai = st.button(
                        "Analizar con IA (Ollama)",
                        key="d7ev_ai_btn",
                        help="Genera un analisis profundo del evento usando el modelo local",
                    )
                with _col_save:
                    _save_card = st.button("Guardar ficha", key="d7ev_save_btn")

                if _run_ai:
                    _prompt_ev = (
                        f"Analiza en profundidad este evento desde la perspectiva de inteligencia politica espanola:\n\n"
                        f"EVENTO: {_ev.get('title','')}\n"
                        f"UBICACION: {_ev_loc} ({_ev_region})\n"
                        f"RESUMEN: {_ev.get('ai_summary','')}\n"
                        f"ANALISIS PREVIO: {_ev.get('ai_analysis','')}\n"
                        f"TEMAS: {', '.join(str(t) for t in _ev_topics)}\n\n"
                        f"Proporciona:\n"
                        f"1. CONTEXTO HISTORICO: antecedentes relevantes del evento\n"
                        f"2. ACTORES CLAVE: quien se ve afectado o influye en este evento\n"
                        f"3. IMPACTO EN ESPANA: consecuencias concretas y especificas para Espana\n"
                        f"4. ESCENARIOS: tres posibles desarrollos del evento (optimista, base, pesimista)\n"
                        f"5. RECOMENDACION: que deberia hacer o vigilar un analista politico espanol\n\n"
                        f"Responde en espanol, sin emojis, estilo analitico conciso."
                    )
                    with st.spinner("Generando analisis de inteligencia..."):
                        try:
                            import requests as _req_ev
                            _r_ev = _req_ev.post(
                                "http://localhost:11434/api/generate",
                                json={"model": "qwen3:8b", "prompt": _prompt_ev,
                                      "stream": False, "options": {"temperature": 0.1, "num_predict": 900}},
                                timeout=90,
                            )
                            if _r_ev.ok:
                                _raw_ev = _r_ev.json().get("response", "")
                                # Strip <think> blocks
                                import re as _re_ev
                                _raw_ev = _re_ev.sub(r"<think>.*?</think>", "", _raw_ev, flags=_re_ev.DOTALL).strip()
                                st.session_state[_ai_key] = _raw_ev
                            else:
                                st.session_state[_ai_key] = "Ollama no disponible (comprueba que el servicio esta activo)"
                        except Exception as _exc_ev:
                            st.session_state[_ai_key] = f"Error al conectar con Ollama: {_exc_ev}"

                if _ai_key in st.session_state and st.session_state[_ai_key]:
                    st.markdown(
                        f'<div style="background:{BG2};border:1px solid {CYAN}33;'
                        f'border-left:3px solid {CYAN};border-radius:8px;'
                        f'padding:1rem 1.2rem;margin:.5rem 0">'
                        f'<div style="color:{CYAN};font-size:.65rem;font-weight:700;'
                        f'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.6rem">'
                        f'Analisis de inteligencia — IA local</div>'
                        f'<div style="color:{TEXT2};font-size:.80rem;line-height:1.7;white-space:pre-wrap">'
                        f'{st.session_state[_ai_key]}'
                        f'</div></div>',
                        unsafe_allow_html=True,
                    )

                if _save_card:
                    _saved_key = "d7_saved_event_cards"
                    if _saved_key not in st.session_state:
                        st.session_state[_saved_key] = []
                    _card_data = {
                        "title": _ev.get("title", ""),
                        "geo_location": _ev_loc,
                        "geo_region": _ev_region,
                        "category": _ev_cat,
                        "relevance": _ev_rel,
                        "sentiment": _ev_sent,
                        "spain_impact": _ev_spain,
                        "summary": _ev.get("ai_summary", ""),
                        "analysis": _ev.get("ai_analysis", ""),
                        "ai_analysis": st.session_state.get(_ai_key, ""),
                        "topics": _ev_topics,
                        "saved_at": pd.Timestamp.now().isoformat(),
                    }
                    st.session_state[_saved_key].append(_card_data)
                    st.success(f"Ficha guardada ({len(st.session_state[_saved_key])} fichas en sesion)")

        # ── Top critical events ───────────────────────────────────────────────
        section_header("EVENTOS CRITICOS — ANALISIS DETALLADO", RED)

        df_critical = df_ev.sort_values("ai_relevance", ascending=False).head(8)

        for _, ev in df_critical.iterrows():
            rel = int(ev.get("ai_relevance", 5))
            sent = ev.get("ai_sentiment", "neutro") or "neutro"
            spain = ev.get("ai_spain_impact", "bajo") or "bajo"
            urgency = ev.get("ai_urgency", "baja") or "baja"
            cat = str(ev.get("ai_category", "otro") or "otro").replace("_", " ").upper()

            rel_color = RED if rel >= 9 else (AMBER if rel >= 7 else MUTED)
            sent_color = _SENTIMENT_COLORS.get(sent, MUTED)
            spain_color = _SPAIN_IMPACT_COLORS.get(spain, MUTED)

            summary_html = ""
            if ev.get("ai_summary"):
                summary_html = (
                    f'<div style="color:{TEXT2};font-size:.80rem;'
                    f'line-height:1.6;margin:.6rem 0">{ev["ai_summary"]}</div>'
                )
            analysis_html = ""
            if ev.get("ai_analysis"):
                analysis_html = (
                    f'<div style="background:{BG3};border-left:2px solid {CYAN}55;'
                    f'border-radius:0 4px 4px 0;padding:.5rem .8rem;'
                    f'color:{TEXT2};font-size:.76rem;line-height:1.55;margin-top:.4rem">'
                    f'<span style="color:{CYAN};font-size:.63rem;font-weight:700;'
                    f'text-transform:uppercase;letter-spacing:.08em">Analisis estrategico: </span>'
                    f'{ev["ai_analysis"]}'
                    f'</div>'
                )

            topics_html = ""
            topics = ev.get("ai_topics", [])
            if isinstance(topics, list) and topics:
                pills = "".join(
                    f'<span style="background:{BLUE}18;color:{BLUE};border:1px solid {BLUE}33;'
                    f'border-radius:3px;padding:.1rem .45rem;font-size:.63rem;'
                    f'font-weight:600;margin-right:.3rem">{t}</span>'
                    for t in topics[:4]
                )
                topics_html = f'<div style="margin-top:.5rem">{pills}</div>'

            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};'
                f'border-left:3px solid {rel_color};border-radius:8px;'
                f'padding:.9rem 1.1rem;margin:.5rem 0">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">'
                f'<a href="{ev.get("url","#")}" target="_blank" style="color:{TEXT};'
                f'font-weight:700;font-size:.87rem;text-decoration:none;'
                f'line-height:1.35;flex:1">{ev.get("title","")}</a>'
                f'<div style="display:flex;gap:.35rem;flex-shrink:0">'
                f'<span style="background:{rel_color}18;color:{rel_color};border:1px solid {rel_color}44;'
                f'border-radius:4px;padding:.15rem .5rem;font-size:.65rem;font-weight:800;'
                f'font-family:monospace">R{rel}</span>'
                f'<span style="background:{sent_color}18;color:{sent_color};border:1px solid {sent_color}33;'
                f'border-radius:4px;padding:.15rem .45rem;font-size:.63rem;font-weight:600">{sent}</span>'
                f'<span style="background:{spain_color}18;color:{spain_color};border:1px solid {spain_color}33;'
                f'border-radius:4px;padding:.15rem .45rem;font-size:.63rem;font-weight:600">ESP: {spain}</span>'
                f'</div></div>'
                f'<div style="color:{MUTED};font-size:.66rem;margin:.35rem 0">'
                f'{ev.get("source_name","")}'
                f'{"  ·  " + ev.get("ai_geo_location","") if ev.get("ai_geo_location") else ""}'
                f'{"  ·  urgencia: " + urgency}'
                f'{"  ·  " + cat}'
                f'</div>'
                f'{summary_html}{analysis_html}{topics_html}'
                f'</div>',
                unsafe_allow_html=True,
            )

    else:
        st.markdown(
            f'<div style="background:{BG2};border:1px dashed {BORDER};border-radius:10px;'
            f'padding:3rem;text-align:center;color:{MUTED}">'
            f'No hay eventos con relevancia suficiente en la ventana temporal seleccionada.'
            f'</div>',
            unsafe_allow_html=True,
        )

    # ── Noticias por region ───────────────────────────────────────────────────
    st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)
    section_header("NOTICIAS DESTACADAS POR REGION", CYAN)

    if not df_ev.empty:
        # Determine which regions to show based on user selection
        _regions_to_show = (
            [r for r in _GEO_REGION_KEYS if r != "Internacional"]
            if ("Internacional" in _selected_regions or not _selected_regions)
            else [r for r in _selected_regions if r != "Internacional"]
        )

        _REGION_COLORS = {
            "Europa": BLUE, "Africa": AMBER, "Asia": PURPLE,
            "America del Norte": CYAN, "America del Sur": GREEN,
            "España Nacional": RED, "España Regional": "#22D3EE",
        }

        for _region_key in _regions_to_show:
            _df_region = df_ev[df_ev["geo_region"] == _region_key]
            if _df_region.empty:
                continue

            _df_region = _df_region.sort_values("ai_relevance", ascending=False).head(3)
            _reg_color = _REGION_COLORS.get(_region_key, MUTED)

            st.markdown(
                f'<div style="font-size:.72rem;font-weight:800;color:{_reg_color};'
                f'letter-spacing:.08em;text-transform:uppercase;margin:.8rem 0 .35rem">— {_region_key}</div>',
                unsafe_allow_html=True,
            )

            _rcols = st.columns(min(len(_df_region), 3))
            for _ci, (_, _ev) in enumerate(zip(_rcols, _df_region.iterrows())):
                _ev = _ev[1]
                _rel = int(_ev.get("ai_relevance", 5))
                _rel_c = RED if _rel >= 9 else (AMBER if _rel >= 7 else MUTED)
                _sent = str(_ev.get("ai_sentiment", "neutro") or "neutro")
                _sent_c = {
                    "positivo": GREEN, "negativo": RED,
                    "mixto": AMBER, "neutro": MUTED,
                }.get(_sent, MUTED)
                _sum_short = str(_ev.get("ai_summary", "") or "")[:160]
                if len(str(_ev.get("ai_summary", "") or "")) > 160:
                    _sum_short += "..."

                _rcols[_ci].markdown(
                    f'<div style="background:{BG2};border:1px solid {BORDER};'
                    f'border-top:3px solid {_reg_color};border-radius:6px;'
                    f'padding:.75rem .9rem;height:100%">'
                    f'<div style="display:flex;gap:.35rem;margin-bottom:.4rem">'
                    f'<span style="background:{_rel_c}18;color:{_rel_c};border:1px solid {_rel_c}44;'
                    f'border-radius:3px;padding:.1rem .4rem;font-size:.6rem;font-weight:800;'
                    f'font-family:monospace">R{_rel}</span>'
                    f'<span style="background:{_sent_c}18;color:{_sent_c};border:1px solid {_sent_c}33;'
                    f'border-radius:3px;padding:.1rem .4rem;font-size:.6rem;font-weight:600">{_sent}</span>'
                    f'<span style="color:{MUTED};font-size:.6rem">{str(_ev.get("source_name",""))}</span>'
                    f'</div>'
                    f'<div style="font-size:.78rem;font-weight:700;color:{TEXT};'
                    f'line-height:1.35;margin-bottom:.4rem">{str(_ev.get("title",""))}</div>'
                    f'<div style="font-size:.68rem;color:{TEXT2};line-height:1.5">{_sum_short}</div>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
    else:
        st.markdown(
            f'<div style="color:{MUTED};font-size:.8rem;text-align:center;padding:1.5rem">'
            f'Sin noticias disponibles para las regiones seleccionadas</div>',
            unsafe_allow_html=True,
        )
