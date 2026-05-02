"""
ELECTSIM — D7 Monitor de Medios & Narrativa (Premium Edition)
Media Intelligence Monitor: cobertura en tiempo real, sentimiento por actor,
análisis de fuentes, radar de narrativas y análisis comparativo.
"""
from __future__ import annotations

import html
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
tab_rt, tab_actor, tab_fuente, tab_narrativa, tab_comp, tab_mapa = st.tabs([
    "COBERTURA EN TIEMPO REAL",
    "SENTIMIENTO POR ACTOR",
    "COBERTURA POR FUENTE",
    "RADAR DE NARRATIVAS",
    "ANÁLISIS COMPARATIVO",
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


# ═════════════════════════════════════════════════════════════════════════════
# TAB 5: ANÁLISIS COMPARATIVO
# ═════════════════════════════════════════════════════════════════════════════
with tab_comp:
    col_framing, col_keywords = st.columns([3, 2], gap="large")

    with col_framing:
        section_header("ENCUADRE IZQUIERDA vs. DERECHA", AMBER)

        left_sources = {"elpais", "eldiario", "publico", "infolibre"}
        right_sources = {"elmundo", "abc", "larazon"}

        left_news = [n for n in noticias_main if n.get("fuente") in left_sources]
        right_news = [n for n in noticias_main if n.get("fuente") in right_sources]

        def _top_words(news_list: list[dict], n: int = 15) -> list[tuple[str, int]]:
            _STOPWORDS = {
                "para", "pero", "con", "por", "una", "las", "los", "del", "que",
                "sus", "más", "como", "entre", "este", "esta", "sobre", "ante",
                "tras", "desde", "hasta", "cuando", "donde", "aunque", "porque",
                "también", "sin", "ser", "han", "son", "hay", "está", "son",
                "sus", "todo", "puede", "durante", "según", "años", "español",
            }
            counts: dict[str, int] = {}
            for item in news_list:
                text = f"{item.get('titulo','')} {item.get('resumen','')}".lower()
                for word in text.split():
                    word = word.strip(".,;:()[]¿?¡!\"'—«»")
                    if len(word) > 5 and word not in _STOPWORDS:
                        counts[word] = counts.get(word, 0) + 1
            return sorted(counts.items(), key=lambda x: x[1], reverse=True)[:n]

        left_top = _top_words(left_news)
        right_top = _top_words(right_news)

        left_words = {w: c for w, c in left_top}
        right_words = {w: c for w, c in right_top}
        all_words = sorted(
            set(left_words) | set(right_words),
            key=lambda w: left_words.get(w, 0) + right_words.get(w, 0),
            reverse=True,
        )[:12]

        fig_comp = go.Figure()
        fig_comp.add_trace(go.Bar(
            name="Izquierda",
            x=all_words,
            y=[left_words.get(w, 0) for w in all_words],
            marker_color=RED,
            opacity=0.85,
        ))
        fig_comp.add_trace(go.Bar(
            name="Derecha",
            x=all_words,
            y=[right_words.get(w, 0) for w in all_words],
            marker_color=BLUE,
            opacity=0.85,
        ))
        fig_comp.update_layout(
            barmode="group",
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=320,
            margin=dict(l=10, r=10, t=20, b=60),
            xaxis=dict(tickangle=-30, gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
            yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
            legend=dict(bgcolor=BG3, font=dict(color=TEXT2, size=10)),
        )
        st.plotly_chart(fig_comp, use_container_width=True)

        # Agenda comparison: today vs. yesterday
        section_header("AGENDA: HOY VS. AYER", GREEN)
        all_words_today = _top_words(noticias_main, 8)
        agenda_cols = st.columns(2)
        with agenda_cols[0]:
            st.markdown(
                f'<div style="font-size:.68rem;color:{CYAN};font-weight:700;'
                f'letter-spacing:.1em;margin-bottom:.4rem">HOY (LEAD STORIES)</div>',
                unsafe_allow_html=True,
            )
            for i, (word, count) in enumerate(all_words_today[:6]):
                bar_w = int(count / max(all_words_today[0][1], 1) * 100)
                st.markdown(
                    f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
                    f'<span style="font-size:.7rem;color:{TEXT2};width:100px;flex-shrink:0">{word}</span>'
                    f'<div style="flex:1;height:4px;background:{BORDER};border-radius:2px">'
                    f'<div style="width:{bar_w}%;height:4px;background:{CYAN};border-radius:2px"></div>'
                    f'</div>'
                    f'<span style="font-size:.65rem;color:{MUTED};width:20px;text-align:right">{count}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )
        with agenda_cols[1]:
            st.markdown(
                f'<div style="font-size:.68rem;color:{MUTED};font-weight:700;'
                f'letter-spacing:.1em;margin-bottom:.4rem">AYER (COMPARATIVA)</div>',
                unsafe_allow_html=True,
            )
            # Simulate yesterday with slightly different weights
            for i, (word, count) in enumerate(all_words_today[:6]):
                count_ayer = max(0, count - (i + 1))
                bar_w = int(count_ayer / max(all_words_today[0][1], 1) * 100)
                delta = count - count_ayer
                delta_col = GREEN if delta > 0 else (RED if delta < 0 else MUTED)
                st.markdown(
                    f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
                    f'<span style="font-size:.7rem;color:{TEXT2};width:100px;flex-shrink:0">{word}</span>'
                    f'<div style="flex:1;height:4px;background:{BORDER};border-radius:2px">'
                    f'<div style="width:{bar_w}%;height:4px;background:{MUTED};border-radius:2px"></div>'
                    f'</div>'
                    f'<span style="font-size:.65rem;color:{delta_col};width:30px;text-align:right">'
                    f'{"+" if delta > 0 else ""}{delta}</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    with col_keywords:
        section_header("NUBE DE TÉRMINOS", PURPLE)

        all_top_words = _top_words(noticias_main, 20)
        if all_top_words:
            max_count = max(c for _, c in all_top_words)
            tag_colors = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316"]
            tags_html = '<div style="line-height:2.2;padding:.3rem 0">'
            for i, (word, count) in enumerate(all_top_words):
                size_rem = 0.65 + (count / max_count) * 0.85
                color = tag_colors[i % len(tag_colors)]
                tags_html += (
                    f'<span class="tag-cloud-item" '
                    f'style="background:{color}18;color:{color};'
                    f'border:1px solid {color}44;'
                    f'font-size:{size_rem:.2f}rem">'
                    f'{html.escape(word)}'
                    f'<span style="font-size:.55rem;opacity:.7;margin-left:.3rem">{count}</span>'
                    f'</span>'
                )
            tags_html += '</div>'
            st.markdown(tags_html, unsafe_allow_html=True)
        else:
            st.info("No hay suficientes datos para generar la nube de términos.")

        # ── AI bias analysis button ───────────────────────────────────────────
        section_header("ANÁLISIS IA DE SESGOS", CYAN)
        if st.button("Analizar sesgos mediáticos del día", key="d7_ai_bias", type="primary"):
            with st.spinner("Analizando sesgos con Politeia Brain..."):
                left_headlines = [n.get("titulo", "") for n in left_news[:5]]
                right_headlines = [n.get("titulo", "") for n in right_news[:5]]

                ctx = (
                    f"Titulares medios izquierda: {'; '.join(left_headlines)}\n"
                    f"Titulares medios derecha: {'; '.join(right_headlines)}\n"
                    f"Top palabras hoy: {', '.join(w for w, _ in all_top_words[:10])}"
                )
                if _LLM_OK:
                    try:
                        resp = chat(
                            f"Analiza los sesgos mediáticos de hoy basándote en estos titulares:\n{ctx}\n\n"
                            "Identifica: 1) Diferencias en encuadre, 2) Temas silenciados, "
                            "3) Palabras clave diferenciadoras, 4) Narrativa dominante.",
                            sistema=(
                                "Eres un analista experto en medios de comunicación españoles. "
                                "Eres objetivo, académico y conciso."
                            ),
                        )
                        st.session_state["d7_bias_analysis"] = resp
                    except Exception as exc:
                        st.session_state["d7_bias_analysis"] = (
                            f"Error al consultar la IA: {exc}. "
                            "Comprueba que Ollama y Politeia Brain estén activos."
                        )
                else:
                    top_left = [w for w, _ in _top_words(left_news, 5)]
                    top_right = [w for w, _ in _top_words(right_news, 5)]
                    st.session_state["d7_bias_analysis"] = (
                        f"**Análisis de sesgos (modo sin IA):**\n\n"
                        f"**Medios izquierda** enfatizan: {', '.join(top_left)}\n\n"
                        f"**Medios derecha** enfatizan: {', '.join(top_right)}\n\n"
                        f"**Narrativa dominante hoy:** {all_top_words[0][0] if all_top_words else 'N/A'}\n\n"
                        f"Activa Politeia Brain (Ollama) para un análisis completo con IA."
                    )

        if "d7_bias_analysis" in st.session_state:
            block_colors = [CYAN, BLUE, PURPLE, AMBER]
            blocks = st.session_state["d7_bias_analysis"].split("\n\n")
            for i, block in enumerate(blocks[:5]):
                if not block.strip():
                    continue
                c = block_colors[i % len(block_colors)]
                st.markdown(
                    f'<div style="background:{c}10;border-left:3px solid {c};'
                    f'border-radius:6px;padding:.7rem 1rem;margin-bottom:.4rem;'
                    f'font-size:.82rem;color:{TEXT};line-height:1.55">'
                    f'{html.escape(block)}'
                    f'</div>',
                    unsafe_allow_html=True,
                )


# =============================================================================
# TAB 6: MAPA GLOBAL DE EVENTOS
# =============================================================================
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

    # ── Country → coordinates lookup (for demo geocoding) ────────────────────
    _COUNTRY_COORDS: dict[str, tuple[float, float]] = {
        "Spain": (40.4168, -3.7038), "France": (46.2276, 2.2137),
        "Germany": (51.1657, 10.4515), "Italy": (41.8719, 12.5674),
        "UK": (55.3781, -3.4360), "USA": (37.0902, -95.7129),
        "Mexico": (23.6345, -102.5528), "Brazil": (14.2350, -51.9253),
        "Argentina": (-38.4161, -63.6167), "Colombia": (4.5709, -74.2973),
        "China": (35.8617, 104.1954), "Russia": (61.5240, 105.3188),
        "Ukraine": (48.3794, 31.1656), "Israel": (31.0461, 34.8516),
        "Iran": (32.4279, 53.6880), "Saudi Arabia": (23.8859, 45.0792),
        "Turkey": (38.9637, 35.2433), "India": (20.5937, 78.9629),
        "Japan": (36.2048, 138.2529), "South Korea": (35.9078, 127.7669),
        "Poland": (51.9194, 19.1451), "Hungary": (47.1625, 19.5033),
        "Portugal": (39.3999, -8.2245), "Belgium": (50.5039, 4.4699),
        "Netherlands": (52.1326, 5.2913), "Sweden": (60.1282, 18.6435),
        "Norway": (60.4720, 8.4689), "Switzerland": (46.8182, 8.2275),
        "Nigeria": (9.0820, 8.6753), "Kenya": (0.0236, 37.9062),
        "South Africa": (-30.5595, 22.9375), "Egypt": (26.8206, 30.8025),
        "Morocco": (31.7917, -7.0926), "Venezuela": (6.4238, -66.5897),
        "Chile": (-35.6751, -71.5430), "Peru": (-9.1900, -75.0152),
        "Cuba": (21.5218, -77.7812), "Taiwan": (23.6978, 120.9605),
        "North Korea": (40.3399, 127.5101), "Pakistan": (30.3753, 69.3451),
        "Afghanistan": (33.9391, 67.7100), "Syria": (34.8021, 38.9968),
        "Libya": (26.3351, 17.2283), "Sudan": (12.8628, 30.2176),
    }

    def _geo_coords(geo_location: str, fallback_lat: float, fallback_lon: float):
        """Resolve coordinates from ai_geo_location string."""
        if not geo_location:
            return fallback_lat, fallback_lon
        for country, coords in _COUNTRY_COORDS.items():
            if country.lower() in geo_location.lower():
                return coords
        return fallback_lat, fallback_lon

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

    # ── Demo events dataset (high-relevance only, no emojis) ─────────────────
    _DEMO_EVENTS = [
        {
            "title": "Reunión de emergencia del Consejo de Seguridad de la ONU sobre escalada en Oriente Medio",
            "source_name": "Reuters", "source_region": "north_america",
            "ai_summary": "El Consejo de Seguridad convoca sesión de emergencia tras el lanzamiento de misiles balísticos sobre territorio israelí desde suelo iraní. Los miembros permanentes no logran consenso sobre una declaración conjunta.",
            "ai_analysis": "La escalada directa entre Irán e Israel pone en riesgo la arquitectura de seguridad regional. Para España, el impacto más inmediato es energético: el estrecho de Ormuz concentra el 20% del suministro europeo de GNL.",
            "ai_sentiment": "negativo", "ai_relevance": 10, "ai_urgency": "inmediata",
            "ai_spain_impact": "alto", "ai_category": "seguridad_defensa",
            "ai_geo_location": "Israel", "ai_geo_lat": 31.0461, "ai_geo_lon": 34.8516,
            "ai_topics": ["conflicto armado", "diplomacia internacional", "energía"],
        },
        {
            "title": "La Reserva Federal mantiene tipos al 5,5% y descarta recortes antes de septiembre",
            "source_name": "Wall Street Journal", "source_region": "north_america",
            "ai_summary": "La Fed mantiene los tipos de interés en máximos de 23 años. Powell señala que los datos de inflación de los últimos tres meses no justifican un giro de política monetaria hasta disponer de evidencia sostenida.",
            "ai_analysis": "La decisión refuerza la fortaleza del dólar y presiona al BCE para retrasar su propio ciclo de bajadas. El Tesoro español verá encarecida la refinanciación de deuda a corto plazo en mercados internacionales.",
            "ai_sentiment": "negativo", "ai_relevance": 9, "ai_urgency": "semana",
            "ai_spain_impact": "medio", "ai_category": "economia",
            "ai_geo_location": "USA", "ai_geo_lat": 38.8977, "ai_geo_lon": -77.0365,
            "ai_topics": ["política monetaria", "inflación", "mercados financieros"],
        },
        {
            "title": "Tribunal Constitucional alemán bloquea el presupuesto federal de 2025 por uso indebido del fondo de deuda",
            "source_name": "Frankfurter Allgemeine", "source_region": "europe",
            "ai_summary": "El Constitucional alemán declara inconstitucional la reclasificación de 60.000 millones de euros de fondos COVID hacia inversión climática y defensa. El gobierno de coalición enfrenta una brecha presupuestaria inmediata.",
            "ai_analysis": "La parálisis fiscal alemana reduce la capacidad de Alemania para liderar la respuesta europea a la competencia industrial china. La fragmentación del modelo de coalición en Berlín puede fortalecer posiciones soberanistas en el PE.",
            "ai_sentiment": "negativo", "ai_relevance": 9, "ai_urgency": "semana",
            "ai_spain_impact": "medio", "ai_category": "economia",
            "ai_geo_location": "Germany", "ai_geo_lat": 52.5200, "ai_geo_lon": 13.4050,
            "ai_topics": ["constitucionalidad", "presupuesto federal", "política europea"],
        },
        {
            "title": "El Congreso aprueba la reforma del sistema de financiación autonómica con apoyo de Junts",
            "source_name": "El País", "source_region": "local_spain",
            "ai_summary": "La Cámara Baja vota a favor de la nueva fórmula de distribución de recursos a las comunidades autónomas por 176 votos a favor. La reforma implica una transferencia adicional anual de 3.200 millones a Cataluña.",
            "ai_analysis": "La nueva fórmula altera el equilibrio territorial del Estado. Las comunidades del arco mediterráneo ganan, mientras Castilla-La Mancha y Extremadura pierden posiciones relativas. El Senado, con mayoría PP, podría bloquear la reforma.",
            "ai_sentiment": "mixto", "ai_relevance": 9, "ai_urgency": "24h",
            "ai_spain_impact": "critico", "ai_category": "politica_interior",
            "ai_geo_location": "Spain", "ai_geo_lat": 40.4168, "ai_geo_lon": -3.7038,
            "ai_topics": ["financiación autonómica", "Cataluña", "reforma fiscal territorial"],
        },
        {
            "title": "La OTAN activa el Artículo 4 tras el ataque de misiles rusos a infraestructura civil polaca",
            "source_name": "Politico Europe", "source_region": "europe",
            "ai_summary": "Tres misiles de crucero impactan sobre un nodo ferroviario en el este de Polonia. El incidente activa las consultas formales del Artículo 4 del Tratado del Atlántico Norte. Polonia eleva su nivel de alerta militar al máximo.",
            "ai_analysis": "Es el primer ataque a infraestructura de un miembro de la OTAN desde el inicio de la guerra en Ucrania. La respuesta de la Alianza marcará el umbral de escalada. España podría verse presionada a activar compromisos defensivos adicionales.",
            "ai_sentiment": "negativo", "ai_relevance": 10, "ai_urgency": "inmediata",
            "ai_spain_impact": "alto", "ai_category": "seguridad_defensa",
            "ai_geo_location": "Poland", "ai_geo_lat": 52.2297, "ai_geo_lon": 21.0122,
            "ai_topics": ["OTAN", "escalada militar", "seguridad europea"],
        },
        {
            "title": "El Banco Central Europeo anuncia la primera bajada de tipos en cinco años",
            "source_name": "Financial Times", "source_region": "europe",
            "ai_summary": "El BCE reduce el tipo de depósito en 25 puntos básicos hasta el 3,75%. Lagarde señala que la desinflación sigue su curso pero advierte que los recortes subsiguientes dependerán de los datos.",
            "ai_analysis": "El recorte abarata la deuda española en aproximadamente 900 millones anuales sobre el coste marginal de nueva emisión. El euríbor 12 meses comenzará su descenso, aliviando a los hipotecados variables.",
            "ai_sentiment": "positivo", "ai_relevance": 8, "ai_urgency": "semana",
            "ai_spain_impact": "alto", "ai_category": "economia",
            "ai_geo_location": "Germany", "ai_geo_lat": 50.1109, "ai_geo_lon": 8.6821,
            "ai_topics": ["política monetaria", "deuda soberana", "hipotecas"],
        },
        {
            "title": "China lanza ejercicios militares de gran escala en el estrecho de Taiwán",
            "source_name": "South China Morning Post", "source_region": "asia",
            "ai_summary": "El Ejército Popular de Liberación despliega portaaviones, fragatas y bombarderos en ejercicios no anunciados. Taiwán activa sus sistemas de defensa antimisiles y convoca reunión de gabinete de emergencia.",
            "ai_analysis": "La operación responde a la venta aprobada de armamento estadounidense a Taiwán por valor de 8.000 millones de dólares. El riesgo de bloqueo naval afectaría directamente al suministro de semiconductores avanzados globales.",
            "ai_sentiment": "negativo", "ai_relevance": 9, "ai_urgency": "24h",
            "ai_spain_impact": "medio", "ai_category": "seguridad_defensa",
            "ai_geo_location": "Taiwan", "ai_geo_lat": 23.6978, "ai_geo_lon": 120.9605,
            "ai_topics": ["tensión militar", "semiconductores", "geopolítica pacífica"],
        },
        {
            "title": "El Tribunal Supremo español condena a 12 años al expresidente de la Generalitat",
            "source_name": "El Confidencial", "source_region": "local_spain",
            "ai_summary": "El Pleno de la Sala Segunda dicta sentencia condenatoria por sedición y malversación. La sentencia cierra el ciclo judicial del procés pero abre un nuevo debate sobre el futuro del indulto.",
            "ai_analysis": "La decisión judicial modifica el mapa de alianzas parlamentarias. El partido independentista reevalúa su posición de apoyo al gobierno central. Probable tensión en los próximos plenos sobre agenda legislativa.",
            "ai_sentiment": "negativo", "ai_relevance": 8, "ai_urgency": "24h",
            "ai_spain_impact": "critico", "ai_category": "justicia",
            "ai_geo_location": "Spain", "ai_geo_lat": 41.3851, "ai_geo_lon": 2.1734,
            "ai_topics": ["independentismo catalán", "sentencia judicial", "crisis política"],
        },
        {
            "title": "Argentina suspende pagos con el FMI; la deuda total supera los 380.000 millones de dólares",
            "source_name": "Infobae", "source_region": "latin_america",
            "ai_summary": "El Gobierno argentino notifica al Fondo Monetario Internacional que no puede atender el vencimiento de 2.700 millones de dólares. El peso colapsa un 18% en las primeras horas de sesión.",
            "ai_analysis": "El impago agrava el riesgo de contagio regional. Los bonos soberanos de Brasil y Colombia sufren ventas preventivas. Las empresas españolas con exposición en el Cono Sur, en particular en banca y telecomunicaciones, quedan expuestas.",
            "ai_sentiment": "negativo", "ai_relevance": 8, "ai_urgency": "inmediata",
            "ai_spain_impact": "medio", "ai_category": "economia",
            "ai_geo_location": "Argentina", "ai_geo_lat": -34.6037, "ai_geo_lon": -58.3816,
            "ai_topics": ["deuda soberana", "crisis cambiaria", "FMI"],
        },
        {
            "title": "El Parlamento Europeo aprueba el AI Act con la mayor regulación de inteligencia artificial del mundo",
            "source_name": "EURACTIV", "source_region": "europe",
            "ai_summary": "El Parlamento Europeo vota con amplia mayoría el Reglamento de Inteligencia Artificial. Los sistemas de IA de alto riesgo quedan sujetos a auditorías obligatorias. Las sanciones pueden alcanzar el 7% de la facturación global.",
            "ai_analysis": "La regulación configura un nuevo estándar de facto global para los modelos de IA. Las empresas tecnológicas españolas deberán adaptar sus sistemas en un plazo de 24 meses. El cumplimiento representa un coste significativo para las pymes del sector.",
            "ai_sentiment": "mixto", "ai_relevance": 8, "ai_urgency": "mes",
            "ai_spain_impact": "alto", "ai_category": "tecnologia",
            "ai_geo_location": "Belgium", "ai_geo_lat": 50.8503, "ai_geo_lon": 4.3517,
            "ai_topics": ["regulación IA", "compliance tecnológico", "mercado único digital"],
        },
        {
            "title": "Golpe de Estado en Níger: junta militar expulsa a las fuerzas francesas y pide apoyo a Rusia",
            "source_name": "Le Monde", "source_region": "europe",
            "ai_summary": "La guardia presidencial nigerina detiene al presidente Mohamed Bazoum y anuncia la suspensión de la constitución. La junta declara el fin de los acuerdos de cooperación militar con Francia y solicita asistencia al Grupo Wagner.",
            "ai_analysis": "El golpe consolida el corredor sahelo-ruso (Mali, Burkina Faso, Níger). Amenaza directa a las rutas migratorias que gestiona España desde el Mediterráneo occidental. La presencia militar española en el Sahel queda en cuestión.",
            "ai_sentiment": "negativo", "ai_relevance": 9, "ai_urgency": "inmediata",
            "ai_spain_impact": "alto", "ai_category": "politica_exterior",
            "ai_geo_location": "Nigeria", "ai_geo_lat": 17.6078, "ai_geo_lon": 8.0817,
            "ai_topics": ["golpe de Estado", "Sahel", "migración"],
        },
        {
            "title": "La Comisión Europea abre un procedimiento de déficit excesivo contra España",
            "source_name": "Politico Europe", "source_region": "europe",
            "ai_summary": "Bruselas notifica formalmente a España la apertura de un Procedimiento de Déficit Excesivo al constatar que el déficit estructural supera el umbral del 3% del PIB por tercer año consecutivo.",
            "ai_analysis": "El procedimiento obliga a España a presentar un plan de consolidación fiscal en 3 meses. Los márgenes para nuevas políticas de gasto quedan muy restringidos. El gobierno deberá elegir entre ajuste fiscal o conflicto abierto con Bruselas.",
            "ai_sentiment": "negativo", "ai_relevance": 8, "ai_urgency": "mes",
            "ai_spain_impact": "critico", "ai_category": "economia",
            "ai_geo_location": "Belgium", "ai_geo_lat": 50.8503, "ai_geo_lon": 4.3517,
            "ai_topics": ["déficit público", "reglas fiscales europeas", "presupuestos"],
            "geo_region": "Europa",
        },
        {
            "title": "Sudán del Sur: crisis humanitaria en expansión tras colapso del alto el fuego",
            "source_name": "Al Jazeera", "source_region": "africa",
            "ai_summary": "Los enfrentamientos entre las Fuerzas de Apoyo Rápido y el ejército regular han desplazado a 1,2 millones de personas en tres semanas. El acceso humanitario queda bloqueado en cinco estados.",
            "ai_analysis": "La crisis amplifica la presión migratoria hacia el norte de África y el Mediterráneo. Las ONG españolas con presencia en la región alertan de colapso logístico. España podría recibir peticiones adicionales de financiación en el Consejo de la UE.",
            "ai_sentiment": "negativo", "ai_relevance": 8, "ai_urgency": "inmediata",
            "ai_spain_impact": "medio", "ai_category": "politica_exterior",
            "ai_geo_location": "Sudan", "ai_geo_lat": 12.8628, "ai_geo_lon": 30.2176,
            "ai_topics": ["crisis humanitaria", "conflicto armado", "migración"],
            "geo_region": "Africa",
        },
        {
            "title": "Etiopia y Eritrea reanudan hostilidades en la región de Tigray; corte de comunicaciones",
            "source_name": "BBC Africa", "source_region": "africa",
            "ai_summary": "Fuentes militares confirman intercambios de artillería en la frontera norte de Tigray tras el colapso de las negociaciones de paz mediadas por la UA. La ciudad de Shire queda incomunicada.",
            "ai_analysis": "La inestabilidad en el Cuerno de África afecta a las rutas marítimas del Mar Rojo. El estrecho de Bab el-Mandeb concentra el 12% del comercio marítimo global, incluyendo buques con destino a puertos españoles.",
            "ai_sentiment": "negativo", "ai_relevance": 7, "ai_urgency": "24h",
            "ai_spain_impact": "bajo", "ai_category": "seguridad_defensa",
            "ai_geo_location": "Ethiopia", "ai_geo_lat": 9.1450, "ai_geo_lon": 40.4897,
            "ai_topics": ["conflicto armado", "rutas marítimas", "cuerno de África"],
            "geo_region": "Africa",
        },
        {
            "title": "Brasil anuncia acuerdo bilateral de libre comercio con India; excluye sector agropecuario",
            "source_name": "Folha de S.Paulo", "source_region": "latin_america",
            "ai_summary": "Los presidentes de Brasil e India firman un acuerdo marco de libre comercio en Brasilia que abarca tecnología, farmacéutica y energía, pero excluye productos agrícolas por presión de lobbies rurales de ambos países.",
            "ai_analysis": "El acuerdo reorienta el comercio sur-sur y reduce la dependencia de ambos países de los mercados europeos. Para España, supone mayor competencia en los mercados latinoamericanos donde empresas españolas tienen posiciones consolidadas.",
            "ai_sentiment": "mixto", "ai_relevance": 7, "ai_urgency": "semana",
            "ai_spain_impact": "medio", "ai_category": "economia",
            "ai_geo_location": "Brazil", "ai_geo_lat": -15.8267, "ai_geo_lon": -47.9218,
            "ai_topics": ["comercio internacional", "sur global", "competencia empresarial"],
            "geo_region": "America del Sur",
        },
        {
            "title": "Venezuela: PDVSA incumple pagos de deuda por tercer trimestre consecutivo",
            "source_name": "Infobae", "source_region": "latin_america",
            "ai_summary": "La estatal petrolera venezolana confirma que no puede atender los vencimientos de deuda con acreedores internacionales. La producción de crudo cae a mínimos históricos de 520.000 barriles diarios.",
            "ai_analysis": "La crisis venezolana mantiene presión migratoria sobre Colombia y Brasil con efecto en cadena hacia España. Las empresas españolas con activos congelados en Venezuela difícilmente recuperarán posiciones en el corto plazo.",
            "ai_sentiment": "negativo", "ai_relevance": 7, "ai_urgency": "semana",
            "ai_spain_impact": "medio", "ai_category": "economia",
            "ai_geo_location": "Venezuela", "ai_geo_lat": 6.4238, "ai_geo_lon": -66.5897,
            "ai_topics": ["deuda soberana", "petróleo", "migración"],
            "geo_region": "America del Sur",
        },
        {
            "title": "Canadá activa el Acta de Emergencias ante protestas masivas contra el gobierno federal",
            "source_name": "Globe and Mail", "source_region": "north_america",
            "ai_summary": "El gobierno de Trudeau invoca por segunda vez en la historia el Acta de Emergencias tras bloqueos en los puentes de Ottawa y Windsor. Las protestas demandan elecciones anticipadas y reversión del impuesto al carbono.",
            "ai_analysis": "La crisis política canadiense impacta en el comercio transfronterizo con EE.UU. en sectores clave como automóvil y energía. Para España, el riesgo es indirecto vía desestabilización de mercados de divisas del G7.",
            "ai_sentiment": "negativo", "ai_relevance": 7, "ai_urgency": "24h",
            "ai_spain_impact": "bajo", "ai_category": "politica_interior",
            "ai_geo_location": "Canada", "ai_geo_lat": 45.4215, "ai_geo_lon": -75.6972,
            "ai_topics": ["crisis política", "protestas", "comercio G7"],
            "geo_region": "America del Norte",
        },
        {
            "title": "India supera a China como mayor exportador mundial de genéricos farmacéuticos",
            "source_name": "Economic Times", "source_region": "asia",
            "ai_summary": "Datos de la Organización Mundial del Comercio confirman que India supera a China en valor de exportaciones farmacéuticas genéricas por primera vez. El sector indio factura 28.000 millones de dólares en exportaciones anuales.",
            "ai_analysis": "El cambio redefine las cadenas de suministro farmacéutico globales. Para España, el sector farmacéutico es el segundo exportador industrial. La mayor competencia india en genéricos presionará márgenes de los laboratorios españoles con presencia en mercados emergentes.",
            "ai_sentiment": "mixto", "ai_relevance": 7, "ai_urgency": "mes",
            "ai_spain_impact": "medio", "ai_category": "economia",
            "ai_geo_location": "India", "ai_geo_lat": 28.6139, "ai_geo_lon": 77.2090,
            "ai_topics": ["farmacéutica", "comercio global", "cadena de suministro"],
            "geo_region": "Asia",
        },
        {
            "title": "El Parlament de Catalunya aprueba los nuevos presupuestos de la Generalitat con apoyo de los comuns",
            "source_name": "Ara", "source_region": "regional_spain",
            "ai_summary": "El Parlament aprueba el proyecto de ley de presupuestos 2026 de la Generalitat por 68 votos a favor y 62 en contra. El gasto social sube un 8,3% y se mantienen las inversiones en infraestructura ferroviaria pendiente del Estado.",
            "ai_analysis": "La aprobación presupuestaria da estabilidad al gobierno de Salvador Illa hasta 2027. Refuerza la posición negociadora catalana ante el Estado en materia de financiación singular. Reduce tensión en las relaciones Generalitat-Congreso.",
            "ai_sentiment": "positivo", "ai_relevance": 8, "ai_urgency": "semana",
            "ai_spain_impact": "alto", "ai_category": "politica_interior",
            "ai_geo_location": "Spain", "ai_geo_lat": 41.3851, "ai_geo_lon": 2.1734,
            "ai_topics": ["presupuestos autonómicos", "Cataluña", "estabilidad política"],
            "geo_region": "España Regional",
            "ccaa": "Cataluña",
        },
        {
            "title": "El gobierno de Madrid anuncia rebaja fiscal del IRPF autonómico al mínimo legal para todos los tramos",
            "source_name": "El Mundo", "source_region": "regional_spain",
            "ai_summary": "La presidenta Díaz Ayuso anuncia una reducción del tramo autonómico del IRPF al mínimo legal permitido por la LOFCA, efectiva desde enero 2026. La medida beneficia a 3,2 millones de declarantes y supone una merma de ingresos de 1.100 millones anuales.",
            "ai_analysis": "La rebaja fiscal madrileña intensifica la competencia fiscal interterritorial. Comunidades como Cataluña y Valencia ven cómo el diferencial impositivo con Madrid se amplía, incentivando el traslado de residencia fiscal de rentas altas.",
            "ai_sentiment": "mixto", "ai_relevance": 8, "ai_urgency": "mes",
            "ai_spain_impact": "alto", "ai_category": "fiscal",
            "ai_geo_location": "Spain", "ai_geo_lat": 40.4168, "ai_geo_lon": -3.7038,
            "ai_topics": ["IRPF", "competencia fiscal territorial", "Madrid"],
            "geo_region": "España Regional",
            "ccaa": "Madrid",
        },
        {
            "title": "El Pais Vasco aprueba la Ley de Industria Avanzada con inversión de 2.400 millones hasta 2030",
            "source_name": "Deia", "source_region": "regional_spain",
            "ai_summary": "El Parlamento Vasco aprueba por unanimidad la Ley de Industria Avanzada que movilizará 2.400 millones en ayudas y deducciones fiscales para digitalizar el tejido industrial manufacturero de los tres territorios históricos.",
            "ai_analysis": "La ley refuerza el modelo de economía industrial vasca basado en tecnología de alto valor añadido. El Concierto Económico permite estructurar incentivos imposibles en el régimen común. Podría atraer inversión industrial alemana y japonesa.",
            "ai_sentiment": "positivo", "ai_relevance": 7, "ai_urgency": "mes",
            "ai_spain_impact": "medio", "ai_category": "economia",
            "ai_geo_location": "Spain", "ai_geo_lat": 43.2630, "ai_geo_lon": -2.9350,
            "ai_topics": ["industria", "inversión", "País Vasco"],
            "geo_region": "España Regional",
            "ccaa": "País Vasco",
        },
        {
            "title": "Andalucia aprueba el Plan de Vivienda regional con 80.000 nuevas unidades de promocion publica",
            "source_name": "El Correo de Andalucía", "source_region": "regional_spain",
            "ai_summary": "La Junta de Andalucía aprueba el Plan Vive Andalucía que contempla 80.000 viviendas de protección oficial en ocho años. El 40% se destinará a alquiler asequible. Presupuesto total: 4.200 millones de euros.",
            "ai_analysis": "El plan es la mayor apuesta de vivienda pública autonómica de la última década. Compite directamente con la política de vivienda del Estado, generando tensión competencial. El sector constructor andaluz recibirá un impulso significativo.",
            "ai_sentiment": "positivo", "ai_relevance": 7, "ai_urgency": "mes",
            "ai_spain_impact": "medio", "ai_category": "politica_interior",
            "ai_geo_location": "Spain", "ai_geo_lat": 37.3891, "ai_geo_lon": -5.9845,
            "ai_topics": ["vivienda", "política regional", "Andalucía"],
            "geo_region": "España Regional",
            "ccaa": "Andalucía",
        },
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
        df = pd.DataFrame(_DEMO_EVENTS)
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

        fig_world.update_geos(
            showcoastlines=True, coastlinecolor=BORDER,
            showland=True, landcolor="#0D1320",
            showocean=True, oceancolor=BG,
            showframe=False, showlakes=False,
            showrivers=False,
            projection_type="natural earth",
            bgcolor=BG,
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
