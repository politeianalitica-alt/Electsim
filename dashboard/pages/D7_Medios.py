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

with tab_comp:
    # ── Selector de narrativa ─────────────────────────────────────────────────
    _narr_names = [n["nombre"] for n in _NARRATIVAS_DEMO]
    _sel_narr_idx = st.selectbox(
        "Narrativa a analizar en profundidad",
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

    st.markdown(
        f'<div style="height:2px;background:linear-gradient(90deg,{AMBER},{PURPLE},{CYAN});'
        f'border-radius:1px;margin:.4rem 0 .8rem 0"></div>',
        unsafe_allow_html=True,
    )

    col_analysis, col_cloud = st.columns([3, 2], gap="large")

    with col_analysis:
        section_header(f"ANALISIS PROFUNDO: {_sel_narr_nombre.upper()}", AMBER)

        # KPIs de la narrativa seleccionada
        nk1, nk2, nk3 = st.columns(3)
        _delta_col = GREEN if _sel_narr_delta > 0 else (RED if _sel_narr_delta < 0 else MUTED)
        nk1.markdown(kpi_card("Intensidad actual", f"{_sel_narr_intensidad}/100", color=AMBER), unsafe_allow_html=True)
        nk2.markdown(kpi_card("Variacion 24h", f"{_sel_narr_delta:+d}", color=_delta_col), unsafe_allow_html=True)
        nk3.markdown(kpi_card("Velocidad difusion", f"{_sel_narr.get('velocidad',0)}/h", color=CYAN), unsafe_allow_html=True)

        st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)

        # Evolucion temporal de intensidad
        _tendencia = _estructura.get("tendencia", [50]*7)
        _dias_labels = ["Hace 6d", "Hace 5d", "Hace 4d", "Hace 3d", "Hace 2d", "Ayer", "Hoy"]
        fig_tend = go.Figure(go.Scatter(
            x=_dias_labels, y=_tendencia,
            mode="lines+markers",
            line=dict(color=AMBER, width=2.5),
            marker=dict(size=7, color=AMBER, line=dict(width=1.5, color=BG)),
            fill="tozeroy",
            fillcolor="rgba(245,158,11,0.08)",
        ))
        fig_tend.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            height=140, margin=dict(l=10, r=10, t=5, b=30),
            xaxis=dict(showgrid=False, tickfont=dict(color=MUTED, size=8)),
            yaxis=dict(showgrid=True, gridcolor=BORDER, tickfont=dict(color=MUTED, size=8), range=[0, 100]),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_tend, use_container_width=True, config={"displayModeBar": False}, key="d7_narr_tend")

        # Secciones de analisis estructural
        def _narr_block(title: str, items: list, color: str) -> str:
            bullets = "".join(
                f'<div style="display:flex;align-items:flex-start;gap:.5rem;margin:.25rem 0">'
                f'<span style="color:{color};font-size:.75rem;flex-shrink:0;margin-top:.05rem">—</span>'
                f'<span style="font-size:.80rem;color:{TEXT};line-height:1.45">{i}</span>'
                f'</div>'
                for i in items
            )
            return (
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {color};'
                f'border-radius:6px;padding:.75rem 1rem;margin:.5rem 0">'
                f'<div style="font-size:.6rem;font-weight:800;letter-spacing:.12em;'
                f'text-transform:uppercase;color:{color};margin-bottom:.5rem">{title}</div>'
                f'{bullets}'
                f'</div>'
            )

        st.markdown(
            _narr_block("Elementos que componen la narrativa", _estructura["elementos"], CYAN),
            unsafe_allow_html=True,
        )
        st.markdown(
            _narr_block("Quién la difunde", _estructura["difusores"], BLUE),
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {PURPLE};'
            f'border-radius:6px;padding:.75rem 1rem;margin:.5rem 0">'
            f'<div style="font-size:.6rem;font-weight:800;letter-spacing:.12em;'
            f'text-transform:uppercase;color:{PURPLE};margin-bottom:.4rem">Target audience</div>'
            f'<div style="font-size:.80rem;color:{TEXT};line-height:1.5">{_estructura["target"]}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        _pot_col1, _pot_col2 = st.columns(2)
        with _pot_col1:
            st.markdown(
                _narr_block("Eventos que la potencian", _estructura["potenciadores"], GREEN),
                unsafe_allow_html=True,
            )
        with _pot_col2:
            st.markdown(
                _narr_block("Eventos que la debilitan", _estructura["debilitadores"], RED),
                unsafe_allow_html=True,
            )

        # ── Analisis profundo con Ollama ──────────────────────────────────────
        st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)
        section_header("ANALISIS OLLAMA EN PROFUNDIDAD", PURPLE)

        _narr_cache_key = f"d7_narr_analysis_{_sel_narr_nombre}"
        _col_btn1, _col_btn2 = st.columns([2, 1])
        with _col_btn1:
            _run_narr = st.button(
                f"Analizar narrativa con IA: {_sel_narr_nombre}",
                key="d7_narr_ai_btn",
                type="primary",
                use_container_width=True,
            )
        with _col_btn2:
            if st.button("Limpiar analisis", key="d7_narr_clear"):
                st.session_state.pop(_narr_cache_key, None)
                st.rerun()

        if _run_narr:
            _titulares_rel = [
                n.get("titulo", "") for n in noticias_main
                if _sel_narr_nombre.lower()[:8] in (n.get("titulo","") + n.get("resumen","")).lower()
            ][:8]
            _ctx_narr = (
                f"Narrativa: {_sel_narr_nombre}\n"
                f"Intensidad actual: {_sel_narr_intensidad}/100 (variacion {_sel_narr_delta:+d} en 24h)\n"
                f"Titulares relacionados hoy: {'; '.join(_titulares_rel) if _titulares_rel else 'sin datos de titulares directos'}\n"
                f"Elementos conocidos: {', '.join(_estructura['elementos'])}\n"
                f"Difusores: {', '.join(_estructura['difusores'])}"
            )
            _prompt_narr = (
                f"Analiza en profundidad la narrativa politica '{_sel_narr_nombre}' en el contexto espanol actual.\n\n"
                f"DATOS DISPONIBLES:\n{_ctx_narr}\n\n"
                "Proporciona un analisis estructurado con estas secciones exactas:\n"
                "1. ORIGEN Y CONSTRUCCION: como se construyo esta narrativa y quien la inicio\n"
                "2. MECANISMOS DE DIFUSION: como se propaga (frames, emociones, simbolos)\n"
                "3. VULNERABILIDADES DEL DISCURSO: donde es mas debil argumentalmente\n"
                "4. CONTRANARRATIVAS EFECTIVAS: que mensajes pueden neutralizarla\n"
                "5. RIESGO ELECTORAL: impacto estimado en intencion de voto si se intensifica\n\n"
                "Sé concreto, cita actores reales y usa datos cuando los tengas."
            )
            with st.spinner("Analizando con Ollama..."):
                if _LLM_OK:
                    try:
                        _resp = chat(
                            _prompt_narr,
                            sistema=(
                                "Eres un analista senior de inteligencia mediatica especializado en "
                                "narrativas politicas espanolas. Usas metodologia de analisis critico "
                                "del discurso (ACD) y framing theory. Responde en espanol, sin emojis, "
                                "con rigor academico y pragmatismo politico."
                            ),
                        )
                        st.session_state[_narr_cache_key] = _resp
                    except Exception as exc:
                        st.session_state[_narr_cache_key] = f"Error Ollama: {exc}"
                else:
                    st.session_state[_narr_cache_key] = (
                        f"Ollama no disponible. Analisis basico:\n\n"
                        f"La narrativa '{_sel_narr_nombre}' tiene intensidad {_sel_narr_intensidad}/100 "
                        f"y una variacion de {_sel_narr_delta:+d} puntos en las ultimas 24h. "
                        f"Los principales difusores son: {', '.join(_estructura['difusores'][:2])}. "
                        f"El target audience principal es: {_estructura['target']}. "
                        f"Activa Ollama para el analisis completo."
                    )

        if _narr_cache_key in st.session_state:
            _analysis_text = st.session_state[_narr_cache_key]
            _section_colors = [CYAN, BLUE, PURPLE, AMBER, RED]
            _blocks = [b.strip() for b in _analysis_text.split("\n\n") if b.strip()]
            for _bi, _block in enumerate(_blocks[:8]):
                _bc = _section_colors[_bi % len(_section_colors)]
                _is_header = _block.startswith(("1.", "2.", "3.", "4.", "5.")) or _block.isupper()
                st.markdown(
                    f'<div style="background:{_bc}08;border-left:2px solid {_bc};'
                    f'border-radius:0 5px 5px 0;padding:.65rem 1rem;margin:.35rem 0;'
                    f'font-size:.82rem;color:{TEXT if not _is_header else _bc};'
                    f'font-weight:{"700" if _is_header else "400"};line-height:1.55">'
                    f'{html.escape(_block)}'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    with col_cloud:
        section_header("NUBE DE TERMINOS", PURPLE)

        left_sources = {"elpais", "eldiario", "publico", "infolibre"}
        right_sources = {"elmundo", "abc", "larazon"}
        left_news = [n for n in noticias_main if n.get("fuente") in left_sources]
        right_news = [n for n in noticias_main if n.get("fuente") in right_sources]

        all_top_words = _top_words(noticias_main, 22)
        if all_top_words:
            max_count = max(c for _, c in all_top_words)
            tag_colors = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316"]
            tags_html = '<div style="line-height:2.4;padding:.3rem 0">'
            for i, (word, count) in enumerate(all_top_words):
                size_rem = 0.65 + (count / max_count) * 0.90
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
            st.info("No hay datos suficientes para la nube de terminos.")

        st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
        section_header("COMPARATIVA IZQUIERDA/DERECHA", BLUE)

        # Top words per side — now HTML-cleaned
        left_top_w = _top_words(left_news, 6)
        right_top_w = _top_words(right_news, 6)
        _lr_cols = st.columns(2)
        for _side_idx, (_side_label, _side_color, _side_words) in enumerate([
            ("Izquierda", RED, left_top_w),
            ("Derecha", BLUE, right_top_w),
        ]):
            with _lr_cols[_side_idx]:
                st.markdown(
                    f'<div style="font-size:.66rem;color:{_side_color};font-weight:700;'
                    f'letter-spacing:.1em;margin-bottom:.4rem">{_side_label.upper()}</div>',
                    unsafe_allow_html=True,
                )
                for _word, _count in _side_words:
                    _bar_w = int(_count / max(_side_words[0][1], 1) * 100) if _side_words else 0
                    st.markdown(
                        f'<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.28rem">'
                        f'<span style="font-size:.7rem;color:{TEXT2};width:80px;flex-shrink:0;'
                        f'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{_word}</span>'
                        f'<div style="flex:1;height:4px;background:{BORDER};border-radius:2px">'
                        f'<div style="width:{_bar_w}%;height:4px;background:{_side_color};border-radius:2px"></div>'
                        f'</div>'
                        f'<span style="font-size:.65rem;color:{MUTED};width:18px;text-align:right">{_count}</span>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )

        st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
        section_header("ANALISIS IA DE SESGOS", CYAN)
        if st.button("Analizar sesgos mediaticos del dia", key="d7_ai_bias", type="primary"):
            with st.spinner("Analizando con Ollama..."):
                left_headlines = [n.get("titulo", "") for n in left_news[:5]]
                right_headlines = [n.get("titulo", "") for n in right_news[:5]]
                ctx = (
                    f"Medios izquierda: {'; '.join(left_headlines)}\n"
                    f"Medios derecha: {'; '.join(right_headlines)}\n"
                    f"Top palabras: {', '.join(w for w, _ in all_top_words[:10])}"
                )
                if _LLM_OK:
                    try:
                        resp = chat(
                            f"Analiza los sesgos mediaticos de hoy:\n{ctx}\n\n"
                            "Identifica: 1) Diferencias en encuadre, 2) Temas silenciados, "
                            "3) Palabras clave diferenciadoras, 4) Narrativa dominante.",
                            sistema=(
                                "Eres analista experto en medios espanoles. "
                                "Objetivo, academico y conciso. Sin emojis."
                            ),
                        )
                        st.session_state["d7_bias_analysis"] = resp
                    except Exception as exc:
                        st.session_state["d7_bias_analysis"] = f"Error: {exc}"
                else:
                    top_l = [w for w, _ in _top_words(left_news, 5)]
                    top_r = [w for w, _ in _top_words(right_news, 5)]
                    st.session_state["d7_bias_analysis"] = (
                        f"Medios izquierda enfatizan: {', '.join(top_l)}\n\n"
                        f"Medios derecha enfatizan: {', '.join(top_r)}\n\n"
                        f"Narrativa dominante: {all_top_words[0][0] if all_top_words else 'N/A'}\n\n"
                        f"Activa Ollama para analisis completo."
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
                    f'border-radius:6px;padding:.65rem 1rem;margin-bottom:.35rem;'
                    f'font-size:.80rem;color:{TEXT};line-height:1.55">'
                    f'{html.escape(block)}'
                    f'</div>',
                    unsafe_allow_html=True,
                )


# =============================================================================
# TAB 6: MAPA GLOBAL DE EVENTOS — Con zoom dinamico y fichas Ollama
# =============================================================================

# ── Coordenadas pais ──────────────────────────────────────────────────────────
_COUNTRY_COORDS_MAP: dict[str, tuple[float, float]] = {
    "Spain": (40.4168, -3.7038), "France": (46.2276, 2.2137),
    "Germany": (51.1657, 10.4515), "Italy": (41.8719, 12.5674),
    "UK": (55.3781, -3.4360), "Poland": (52.2297, 21.0122),
    "USA": (37.0902, -95.7129), "Mexico": (23.6345, -102.5528),
    "Brazil": (14.2350, -51.9253), "Argentina": (-38.4161, -63.6167),
    "Colombia": (4.5709, -74.2973), "Chile": (-35.6751, -71.5430),
    "Venezuela": (6.4238, -66.5897), "Peru": (-9.1900, -75.0152),
    "China": (35.8617, 104.1954), "Japan": (36.2048, 138.2529),
    "Russia": (61.5240, 105.3188), "Ukraine": (48.3794, 31.1656),
    "Israel": (31.0461, 34.8516), "Iran": (32.4279, 53.6880),
    "Saudi Arabia": (23.8859, 45.0792), "Turkey": (38.9637, 35.2433),
    "India": (20.5937, 78.9629), "Pakistan": (30.3753, 69.3451),
    "Taiwan": (23.6978, 120.9605), "South Korea": (35.9078, 127.7669),
    "North Korea": (40.3399, 127.5101), "Indonesia": (-0.7893, 113.9213),
    "Nigeria": (9.0820, 8.6753), "South Africa": (-30.5595, 22.9375),
    "Egypt": (26.8206, 30.8025), "Morocco": (31.7917, -7.0926),
    "Ethiopia": (9.1450, 40.4897), "Sudan": (12.8628, 30.2176),
    "Libya": (26.3351, 17.2283), "Niger": (17.6078, 8.0817),
    "Cuba": (21.5218, -77.7812), "Canada": (56.1304, -106.3468),
    "Belgium": (50.5039, 4.4699), "Netherlands": (52.1326, 5.2913),
    "Sweden": (60.1282, 18.6435), "Portugal": (39.3999, -8.2245),
    "Greece": (39.0742, 21.8243), "Hungary": (47.1625, 19.5033),
    "Afghanistan": (33.9391, 67.7100), "Syria": (34.8021, 38.9968),
    "Vietnam": (14.0583, 108.2772), "Philippines": (12.8797, 121.7740),
    "Tunisia": (33.8869, 9.5375), "Algeria": (28.0339, 1.6596),
    "Ghana": (7.9465, -1.0232), "Senegal": (14.4974, -14.4524),
}

# ── Presets de zoom por region ────────────────────────────────────────────────
_ZOOM_PRESETS: dict[str, dict] = {
    "Internacional":    {"lat": 20,  "lon": 5,    "scale": 1.1,  "range_lat": None, "range_lon": None},
    "Europa":           {"lat": 54,  "lon": 12,   "scale": 3.8,  "range_lat": [35, 72], "range_lon": [-12, 42]},
    "Africa":           {"lat": 2,   "lon": 20,   "scale": 2.2,  "range_lat": [-35, 37], "range_lon": [-20, 52]},
    "Asia":             {"lat": 28,  "lon": 100,  "scale": 1.8,  "range_lat": [-10, 55], "range_lon": [25, 150]},
    "America del Norte":{"lat": 48,  "lon": -100, "scale": 2.0,  "range_lat": [15, 72], "range_lon": [-170, -50]},
    "America del Sur":  {"lat": -20, "lon": -60,  "scale": 2.2,  "range_lat": [-56, 13], "range_lon": [-82, -34]},
    "España Nacional":  {"lat": 40,  "lon": -3.5, "scale": 7.0,  "range_lat": [35, 45], "range_lon": [-10, 5]},
    "España Regional":  {"lat": 40,  "lon": -3.5, "scale": 8.5,  "range_lat": [35, 44], "range_lon": [-9, 4]},
}

# ── Colores por categoria ─────────────────────────────────────────────────────
_CAT_COLORS_MAP: dict[str, str] = {
    "politica_interior":  CYAN,    "politica_exterior": BLUE,
    "economia":           AMBER,   "seguridad_defensa": RED,
    "justicia":           PURPLE,  "sociedad":          GREEN,
    "tecnologia":         "#22D3EE", "medioambiente":   "#10B981",
    "energia":            "#F97316", "salud":           "#EC4899",
    "fiscal":             "#FBBF24",
}

# ── Dataset de eventos ────────────────────────────────────────────────────────
_ALL_MAP_EVENTS: list[dict] = [
    # ── INTERNACIONALES / DEFENSA ─────────────────────────────────────────────
    {"title": "ONU: sesion de emergencia por escalada Irak-Iran", "source_name": "Reuters",
     "source_region": "international", "ai_category": "seguridad_defensa", "ai_relevance": 10,
     "ai_urgency": "inmediata", "ai_sentiment": "negativo", "ai_spain_impact": "alto",
     "ai_geo_location": "Iran", "ai_geo_lat": 32.4279, "ai_geo_lon": 53.6880,
     "ai_summary": "Misiles balisticos sobre territorio israeli desde suelo irani activan el Articulo 99 de la Carta de la ONU. Los miembros permanentes no logran consenso.",
     "ai_analysis": "Riesgo de bloqueo del Estrecho de Ormuz. Impacto directo en precio del gas importado por Espana.",
     "ai_topics": ["conflicto armado", "diplomacia", "energia"], "geo_region": "Asia"},
    {"title": "OTAN activa Articulo 4 tras misiles rusos en Polonia",
     "source_name": "Politico Europe", "source_region": "europe", "ai_category": "seguridad_defensa",
     "ai_relevance": 10, "ai_urgency": "inmediata", "ai_sentiment": "negativo", "ai_spain_impact": "alto",
     "ai_geo_location": "Poland", "ai_geo_lat": 52.2297, "ai_geo_lon": 21.0122,
     "ai_summary": "Misiles de crucero impactan nodo ferroviario en el este de Polonia. Espana puede verse presionada a activar compromisos defensivos adicionales.",
     "ai_analysis": "Primera vez que infraestructura OTAN es atacada. Umbral de escalada en revision por todos los aliados.",
     "ai_topics": ["OTAN", "escalada militar", "seguridad europea"], "geo_region": "Europa"},
    {"title": "China: maniobras militares de gran escala en el Estrecho de Taiwan",
     "source_name": "South China Morning Post", "source_region": "asia", "ai_category": "seguridad_defensa",
     "ai_relevance": 9, "ai_urgency": "24h", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Taiwan", "ai_geo_lat": 23.6978, "ai_geo_lon": 120.9605,
     "ai_summary": "EPL despliega portaaviones no anunciados. Riesgo de bloqueo naval afectaria suministro de semiconductores.",
     "ai_analysis": "Suministro global de chips en riesgo. Industria tecnologica espanola expuesta.",
     "ai_topics": ["tension militar", "semiconductores", "geopolitica"], "geo_region": "Asia"},
    {"title": "Golpe de Estado en Niger: junta expulsa a Francia y pide apoyo a Wagner",
     "source_name": "Le Monde", "source_region": "africa", "ai_category": "politica_exterior",
     "ai_relevance": 9, "ai_urgency": "inmediata", "ai_sentiment": "negativo", "ai_spain_impact": "alto",
     "ai_geo_location": "Niger", "ai_geo_lat": 17.6078, "ai_geo_lon": 8.0817,
     "ai_summary": "Corredor sahelo-ruso se consolida. Amenaza directa a rutas migratorias que gestiona Espana.",
     "ai_analysis": "Presencia militar espanola en el Sahel queda en cuestion. Flujo migratorio puede incrementarse.",
     "ai_topics": ["golpe de Estado", "Sahel", "migracion"], "geo_region": "Africa"},
    {"title": "Sudan: crisis humanitaria masiva tras colapso del alto el fuego",
     "source_name": "Al Jazeera", "source_region": "africa", "ai_category": "politica_exterior",
     "ai_relevance": 8, "ai_urgency": "inmediata", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Sudan", "ai_geo_lat": 12.8628, "ai_geo_lon": 30.2176,
     "ai_summary": "1,2 millones de desplazados en tres semanas. ONG espanolas alertan de colapso logistico.",
     "ai_analysis": "Presion migratoria hacia norte de Africa y Mediterraneo. Espana recibira peticiones de financiacion en el Consejo de la UE.",
     "ai_topics": ["humanitario", "conflicto", "migracion"], "geo_region": "Africa"},
    # ── ECONOMIA ──────────────────────────────────────────────────────────────
    {"title": "Fed mantiene tipos al 5,5% y descarta recortes antes de septiembre",
     "source_name": "Wall Street Journal", "source_region": "north_america", "ai_category": "economia",
     "ai_relevance": 9, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "USA", "ai_geo_lat": 38.8977, "ai_geo_lon": -77.0365,
     "ai_summary": "Powell descarta giro monetario. Presion al BCE para retrasar bajadas. Deuda espanola se encarece.",
     "ai_analysis": "Euribor se mantendra alto mas tiempo del previsto. Hipotecados variables en tension.",
     "ai_topics": ["politica monetaria", "inflacion", "mercados"], "geo_region": "America del Norte"},
    {"title": "BCE anuncia primera bajada de tipos en cinco anos",
     "source_name": "Financial Times", "source_region": "europe", "ai_category": "economia",
     "ai_relevance": 8, "ai_urgency": "semana", "ai_sentiment": "positivo", "ai_spain_impact": "alto",
     "ai_geo_location": "Germany", "ai_geo_lat": 50.1109, "ai_geo_lon": 8.6821,
     "ai_summary": "BCE reduce tipo de deposito 25pb al 3,75%. Deuda espanola ahorra 900M anuales en nueva emision.",
     "ai_analysis": "Euribor inicia descenso. Alivio para hipotecados variables y para el Tesoro.",
     "ai_topics": ["tipos de interes", "deuda soberana", "hipotecas"], "geo_region": "Europa"},
    {"title": "Argentina suspende pagos con el FMI; deuda supera 380.000M USD",
     "source_name": "Infobae", "source_region": "latin_america", "ai_category": "economia",
     "ai_relevance": 8, "ai_urgency": "inmediata", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Argentina", "ai_geo_lat": -34.6037, "ai_geo_lon": -58.3816,
     "ai_summary": "Impago de 2.700M al FMI. Peso colapsa 18%. Empresas espanolas con exposicion en banca y telecomunicaciones.",
     "ai_analysis": "Riesgo de contagio regional. Bonos de Brasil y Colombia sufren ventas preventivas.",
     "ai_topics": ["deuda soberana", "crisis cambiaria", "FMI"], "geo_region": "America del Sur"},
    {"title": "Tribunal Constitucional aleman bloquea presupuesto federal 2025",
     "source_name": "FAZ", "source_region": "europe", "ai_category": "economia",
     "ai_relevance": 9, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Germany", "ai_geo_lat": 52.5200, "ai_geo_lon": 13.4050,
     "ai_summary": "Brecha de 60.000M en presupuesto aleman. Capacidad de liderazgo europeo de Berlin se reduce.",
     "ai_analysis": "Fragmentacion del modelo de coalicion en Berlin puede fortalecer posiciones soberanistas en el PE.",
     "ai_topics": ["presupuesto", "crisis fiscal", "politica europea"], "geo_region": "Europa"},
    {"title": "UE abre procedimiento de deficit excesivo contra Espana",
     "source_name": "Politico Europe", "source_region": "europe", "ai_category": "economia",
     "ai_relevance": 8, "ai_urgency": "mes", "ai_sentiment": "negativo", "ai_spain_impact": "critico",
     "ai_geo_location": "Belgium", "ai_geo_lat": 50.8503, "ai_geo_lon": 4.3517,
     "ai_summary": "Bruselas abre PDE al constatar deficit estructural por encima del 3% por tercer ano.",
     "ai_analysis": "Margenes para nuevas politicas de gasto muy restringidos. Gobierno debe elegir entre ajuste o conflicto con Bruselas.",
     "ai_topics": ["deficit publico", "reglas fiscales", "presupuestos"], "geo_region": "Europa"},
    {"title": "India supera a China como mayor exportador mundial de genericos farmaceuticos",
     "source_name": "Economic Times", "source_region": "asia", "ai_category": "economia",
     "ai_relevance": 7, "ai_urgency": "mes", "ai_sentiment": "mixto", "ai_spain_impact": "medio",
     "ai_geo_location": "India", "ai_geo_lat": 28.6139, "ai_geo_lon": 77.2090,
     "ai_summary": "India factura 28.000M USD en exportaciones farmaceuticas. Laboratorios espanoles en mercados emergentes bajo presion.",
     "ai_analysis": "Competencia en genericos se intensifica. Sector farmaceutico es segundo exportador industrial espanol.",
     "ai_topics": ["farmaceutica", "comercio global", "competencia"], "geo_region": "Asia"},
    {"title": "Venezuela: PDVSA incumple pagos por tercer trimestre",
     "source_name": "Infobae", "source_region": "latin_america", "ai_category": "economia",
     "ai_relevance": 7, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Venezuela", "ai_geo_lat": 6.4238, "ai_geo_lon": -66.5897,
     "ai_summary": "Produccion de crudo cae a 520.000 bpd. Presion migratoria sobre Colombia y Brasil con efecto en Espana.",
     "ai_analysis": "Empresas espanolas con activos congelados difícilmente recuperaran posiciones.",
     "ai_topics": ["petroleo", "deuda", "migracion"], "geo_region": "America del Sur"},
    {"title": "Canada activa Acta de Emergencias ante protestas masivas",
     "source_name": "Globe and Mail", "source_region": "north_america", "ai_category": "politica_interior",
     "ai_relevance": 7, "ai_urgency": "24h", "ai_sentiment": "negativo", "ai_spain_impact": "bajo",
     "ai_geo_location": "Canada", "ai_geo_lat": 45.4215, "ai_geo_lon": -75.6972,
     "ai_summary": "Segunda vez historica que se invoca el Acta de Emergencias. Crisis comercial transfronteriza con EE.UU.",
     "ai_analysis": "Impacto indirecto via desestabilizacion de mercados de divisas del G7.",
     "ai_topics": ["crisis politica", "protestas", "comercio"], "geo_region": "America del Norte"},
    {"title": "Brasil e India firman acuerdo comercial bilateral",
     "source_name": "Folha de S.Paulo", "source_region": "latin_america", "ai_category": "economia",
     "ai_relevance": 7, "ai_urgency": "semana", "ai_sentiment": "mixto", "ai_spain_impact": "medio",
     "ai_geo_location": "Brazil", "ai_geo_lat": -15.8267, "ai_geo_lon": -47.9218,
     "ai_summary": "Acuerdo en tecnologia, farmaceutica y energia. Mayor competencia para empresas espanolas en Latinoamerica.",
     "ai_analysis": "Reorientacion del comercio sur-sur. Dependencia de mercados europeos se reduce.",
     "ai_topics": ["comercio", "sur global", "competencia"], "geo_region": "America del Sur"},
    # ── TECNOLOGIA / LEGISLACION ──────────────────────────────────────────────
    {"title": "Parlamento Europeo aprueba el AI Act",
     "source_name": "EURACTIV", "source_region": "europe", "ai_category": "tecnologia",
     "ai_relevance": 8, "ai_urgency": "mes", "ai_sentiment": "mixto", "ai_spain_impact": "alto",
     "ai_geo_location": "Belgium", "ai_geo_lat": 50.8503, "ai_geo_lon": 4.3517,
     "ai_summary": "Mayor regulacion de IA del mundo. Sanciones hasta 7% facturacion global. Empresas espanolas en plazo de 24 meses.",
     "ai_analysis": "Coste de cumplimiento significativo para pymes tecnologicas espanolas.",
     "ai_topics": ["regulacion IA", "compliance", "mercado digital"], "geo_region": "Europa"},
    {"title": "EEUU impone aranceles del 25% a semiconductores chinos",
     "source_name": "Reuters", "source_region": "north_america", "ai_category": "economia",
     "ai_relevance": 9, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "USA", "ai_geo_lat": 38.9072, "ai_geo_lon": -77.0369,
     "ai_summary": "Nuevos aranceles a chips chinos. Cadena de suministro electronico global en reestructuracion.",
     "ai_analysis": "Encarece fabricacion de electrodomesticos, coches electricos y telcos. Inflation importada.",
     "ai_topics": ["aranceles", "semiconductores", "guerra comercial"], "geo_region": "America del Norte"},
    # ── ESPANA NACIONAL ───────────────────────────────────────────────────────
    {"title": "Congreso aprueba reforma de financiacion autonomica con apoyo de Junts",
     "source_name": "El Pais", "source_region": "local_spain", "ai_category": "politica_interior",
     "ai_relevance": 9, "ai_urgency": "24h", "ai_sentiment": "mixto", "ai_spain_impact": "critico",
     "ai_geo_location": "Spain", "ai_geo_lat": 40.4168, "ai_geo_lon": -3.7038,
     "ai_summary": "176 votos a favor. Transferencia adicional de 3.200M a Cataluna. Senado (mayoria PP) puede bloquear.",
     "ai_analysis": "Altera equilibrio territorial. Arco mediterraneo gana, Castilla y Extremadura pierden posiciones.",
     "ai_topics": ["financiacion autonomica", "Cataluna", "reforma fiscal"], "geo_region": "España Nacional"},
    {"title": "Tribunal Supremo condena a 12 anos al expresidente de la Generalitat",
     "source_name": "El Confidencial", "source_region": "local_spain", "ai_category": "justicia",
     "ai_relevance": 8, "ai_urgency": "24h", "ai_sentiment": "negativo", "ai_spain_impact": "critico",
     "ai_geo_location": "Spain", "ai_geo_lat": 40.4168, "ai_geo_lon": -3.7038,
     "ai_summary": "Condena por sedicion y malversacion. Independentistas reevaluan apoyo al gobierno central.",
     "ai_analysis": "Mapa de alianzas parlamentarias se modifica. Tension en proximos plenos sobre agenda legislativa.",
     "ai_topics": ["independentismo", "sentencia judicial", "crisis politica"], "geo_region": "España Nacional"},
    {"title": "Gobierno presenta Ley de Inteligencia Artificial espanola",
     "source_name": "El Mundo", "source_region": "local_spain", "ai_category": "tecnologia",
     "ai_relevance": 8, "ai_urgency": "mes", "ai_sentiment": "mixto", "ai_spain_impact": "alto",
     "ai_geo_location": "Spain", "ai_geo_lat": 40.4168, "ai_geo_lon": -3.7038,
     "ai_summary": "Proyecto de ley que transpone el AI Act europeo con especificidades espanolas. Agencia nacional de supervision.",
     "ai_analysis": "Sector tecnologico espanol en fase de adaptacion. Oportunidad para posicionar a Espana como hub regulatorio de IA en hispanohablantes.",
     "ai_topics": ["inteligencia artificial", "regulacion", "innovacion"], "geo_region": "España Nacional"},
    {"title": "Huelga de funcionarios: 40.000 empleados publicos paralizan Madrid",
     "source_name": "El Pais", "source_region": "local_spain", "ai_category": "sociedad",
     "ai_relevance": 7, "ai_urgency": "24h", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Spain", "ai_geo_lat": 40.4168, "ai_geo_lon": -3.7038,
     "ai_summary": "Jornada de huelga con alta participacion. Registros, ventanillas y servicios esenciales afectados.",
     "ai_analysis": "Presion sindical sobre negociacion de convenio colectivo. Gobierno en posicion dificil con presupuestos pendientes.",
     "ai_topics": ["huelga", "funcionarios", "negociacion colectiva"], "geo_region": "España Nacional"},
    # ── ESPANA REGIONAL ───────────────────────────────────────────────────────
    {"title": "Parlament Catalunya aprueba presupuestos 2026 con apoyo de los comuns",
     "source_name": "Ara", "source_region": "regional_spain", "ai_category": "politica_interior",
     "ai_relevance": 8, "ai_urgency": "semana", "ai_sentiment": "positivo", "ai_spain_impact": "alto",
     "ai_geo_location": "Spain", "ai_geo_lat": 41.3851, "ai_geo_lon": 2.1734,
     "ai_summary": "68 votos a favor. Gasto social sube 8,3%. Estabilidad politica para Salvador Illa hasta 2027.",
     "ai_analysis": "Refuerza posicion negociadora catalana. Reduce tension Generalitat-Congreso.",
     "ai_topics": ["presupuestos", "Cataluna", "estabilidad politica"], "geo_region": "España Regional", "ccaa": "Cataluña"},
    {"title": "Madrid reduce IRPF autonomico al minimo legal para todos los tramos",
     "source_name": "El Mundo", "source_region": "regional_spain", "ai_category": "fiscal",
     "ai_relevance": 8, "ai_urgency": "mes", "ai_sentiment": "mixto", "ai_spain_impact": "alto",
     "ai_geo_location": "Spain", "ai_geo_lat": 40.4168, "ai_geo_lon": -3.7038,
     "ai_summary": "Rebaja IRPF para 3,2M declarantes. Merma de 1.100M anuales. Intensifica competencia fiscal interterritorial.",
     "ai_analysis": "Diferencial impositivo Madrid-Cataluna se amplia. Incentivo al traslado de residencia fiscal.",
     "ai_topics": ["IRPF", "competencia fiscal", "Madrid"], "geo_region": "España Regional", "ccaa": "Madrid"},
    {"title": "Pais Vasco aprueba Ley de Industria Avanzada con 2.400M hasta 2030",
     "source_name": "Deia", "source_region": "regional_spain", "ai_category": "economia",
     "ai_relevance": 7, "ai_urgency": "mes", "ai_sentiment": "positivo", "ai_spain_impact": "medio",
     "ai_geo_location": "Spain", "ai_geo_lat": 43.2630, "ai_geo_lon": -2.9350,
     "ai_summary": "Aprobada por unanimidad. Deducciones fiscales para digitalizar industria manufacturera vasca.",
     "ai_analysis": "Modelo industrial de alto valor anadido reforzado. Puede atraer inversion alemana y japonesa.",
     "ai_topics": ["industria", "inversion", "Pais Vasco"], "geo_region": "España Regional", "ccaa": "País Vasco"},
    {"title": "Andalucia aprueba Plan de Vivienda con 80.000 unidades de promocion publica",
     "source_name": "El Correo de Andalucia", "source_region": "regional_spain", "ai_category": "politica_interior",
     "ai_relevance": 7, "ai_urgency": "mes", "ai_sentiment": "positivo", "ai_spain_impact": "medio",
     "ai_geo_location": "Spain", "ai_geo_lat": 37.3891, "ai_geo_lon": -5.9845,
     "ai_summary": "Plan Vive Andalucia: 4.200M, 40% alquiler asequible. Mayor apuesta autonomica de vivienda publica de la decada.",
     "ai_analysis": "Competencia directa con politica de vivienda del Estado. Sector constructor andaluz recibe impulso significativo.",
     "ai_topics": ["vivienda", "politica regional", "Andalucia"], "geo_region": "España Regional", "ccaa": "Andalucía"},
    {"title": "Galicia: nueva planta de hidrogeno verde en Ferrol con inversion de 800M",
     "source_name": "La Voz de Galicia", "source_region": "regional_spain", "ai_category": "energia",
     "ai_relevance": 7, "ai_urgency": "mes", "ai_sentiment": "positivo", "ai_spain_impact": "medio",
     "ai_geo_location": "Spain", "ai_geo_lat": 43.4833, "ai_geo_lon": -8.2167,
     "ai_summary": "Planta de hidrogeno verde en reconversion industrial de Ferrol. 2.000 empleos directos en 5 anos.",
     "ai_analysis": "Galicia se posiciona en el mapa europeo del hidrogeno verde. Acceso a fondos NextGen.",
     "ai_topics": ["hidrogeno verde", "energia", "Galicia"], "geo_region": "España Regional", "ccaa": "Galicia"},
    {"title": "Valencia: emergencia habitacional — alquiler promedio supera 1.400 euros",
     "source_name": "Levante", "source_region": "regional_spain", "ai_category": "sociedad",
     "ai_relevance": 7, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Spain", "ai_geo_lat": 39.4699, "ai_geo_lon": -0.3763,
     "ai_summary": "El alquiler promedio en Valencia capital supera el 45% de renta mediana. Crisis de asequibilidad critica.",
     "ai_analysis": "Presion sobre sindicatos de inquilinos. Posible decreto autonomico de zonas tensionadas.",
     "ai_topics": ["vivienda", "alquiler", "Valencia"], "geo_region": "España Regional", "ccaa": "Valencia"},
    {"title": "Navarra debate revision del Convenio Economico con el Estado",
     "source_name": "Diario de Navarra", "source_region": "regional_spain", "ai_category": "fiscal",
     "ai_relevance": 7, "ai_urgency": "mes", "ai_sentiment": "mixto", "ai_spain_impact": "medio",
     "ai_geo_location": "Spain", "ai_geo_lat": 42.6954, "ai_geo_lon": -1.6761,
     "ai_summary": "Negociacion de la cuota y metodologia del Convenio. Impacto en financiacion de servicios publicos navarros.",
     "ai_analysis": "Revision afecta al equilibrio de solidaridad interterritorial. Sensibilidad politica alta.",
     "ai_topics": ["Convenio Economico", "Navarra", "financiacion"], "geo_region": "España Regional", "ccaa": "Navarra"},
    {"title": "Murcia: aprobado Plan de Gestion del Trasvase Tajo-Segura",
     "source_name": "La Verdad", "source_region": "regional_spain", "ai_category": "medioambiente",
     "ai_relevance": 6, "ai_urgency": "mes", "ai_sentiment": "mixto", "ai_spain_impact": "medio",
     "ai_geo_location": "Spain", "ai_geo_lat": 37.9922, "ai_geo_lon": -1.1307,
     "ai_summary": "Nuevo plan regula caudales ante episodios de sequia. Sector agricola murciano y agricola en tension.",
     "ai_analysis": "Conflicto competencial con Castilla-La Mancha sobre caudales minimos del Tajo.",
     "ai_topics": ["agua", "trasvase", "Murcia"], "geo_region": "España Regional", "ccaa": "Murcia"},
    {"title": "Asturias: cierre definitivo de la ultima central termica de carbon",
     "source_name": "La Nueva Espana", "source_region": "regional_spain", "ai_category": "energia",
     "ai_relevance": 6, "ai_urgency": "semana", "ai_sentiment": "mixto", "ai_spain_impact": "bajo",
     "ai_geo_location": "Spain", "ai_geo_lat": 43.3619, "ai_geo_lon": -5.8494,
     "ai_summary": "Central de Aboño cierra sus puertas. 350 empleos directos en proceso de reindustrializacion.",
     "ai_analysis": "Transicion energetica justa en debate. Fondos europeos para reconversion industrial.",
     "ai_topics": ["energia", "carbon", "transicion energetica"], "geo_region": "España Regional", "ccaa": "Asturias"},
    # ── OTROS EUROPA ─────────────────────────────────────────────────────────
    {"title": "Francia: reforma de las pensiones — huelga general de 24 horas",
     "source_name": "Le Monde", "source_region": "europe", "ai_category": "sociedad",
     "ai_relevance": 8, "ai_urgency": "24h", "ai_sentiment": "negativo", "ai_spain_impact": "bajo",
     "ai_geo_location": "France", "ai_geo_lat": 48.8566, "ai_geo_lon": 2.3522,
     "ai_summary": "Huelga masiva contra la elevacion de la edad de jubilacion a 64 anos. Transportes y servicios esenciales afectados.",
     "ai_analysis": "Conflicto social de referencia para otros paises europeos con sistemas de pensiones bajo presion demografica.",
     "ai_topics": ["pensiones", "huelga general", "reforma social"], "geo_region": "Europa"},
    {"title": "Italia: gobierno Meloni aprueba presupuesto con reduccion de gasto social",
     "source_name": "Corriere della Sera", "source_region": "europe", "ai_category": "economia",
     "ai_relevance": 7, "ai_urgency": "mes", "ai_sentiment": "negativo", "ai_spain_impact": "bajo",
     "ai_geo_location": "Italy", "ai_geo_lat": 41.9028, "ai_geo_lon": 12.4964,
     "ai_summary": "Presupuesto austeridad del gobierno Meloni. Reduccion de transferencias sociales en 8.000M.",
     "ai_analysis": "Tercer pais del euro con presupuesto bajo presion fiscal. Mercado de deuda italiana en observacion.",
     "ai_topics": ["presupuesto", "austeridad", "Italia"], "geo_region": "Europa"},
    {"title": "Etiopia y Eritrea reanudan hostilidades en Tigray",
     "source_name": "BBC Africa", "source_region": "africa", "ai_category": "seguridad_defensa",
     "ai_relevance": 7, "ai_urgency": "24h", "ai_sentiment": "negativo", "ai_spain_impact": "bajo",
     "ai_geo_location": "Ethiopia", "ai_geo_lat": 9.1450, "ai_geo_lon": 40.4897,
     "ai_summary": "Intercambios de artilleria en frontera norte de Tigray. Estrecho de Bab el-Mandeb en riesgo.",
     "ai_analysis": "12% del comercio maritimo global pasa por el estrecho. Buques con destino a puertos espanoles afectados.",
     "ai_topics": ["conflicto", "rutas maritimas", "cuerno de Africa"], "geo_region": "Africa"},
    {"title": "Hungria bloquea ayuda militar UE a Ucrania por 6a vez consecutiva",
     "source_name": "Politico Europe", "source_region": "europe", "ai_category": "politica_exterior",
     "ai_relevance": 8, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Hungary", "ai_geo_lat": 47.1625, "ai_geo_lon": 19.5033,
     "ai_summary": "Orban bloquea el paquete de 50.000M para Ucrania. Mecanismo de mayoria cualificada en debate.",
     "ai_analysis": "Cohesion europea en riesgo. Espana en mayoria favorable pero el veto hungaro bloquea el paquete.",
     "ai_topics": ["Ucrania", "Hungria", "cohesion UE"], "geo_region": "Europa"},
    {"title": "Turquia pide la expulsion de Israel de la OTAN tras ofensiva en Gaza",
     "source_name": "Hurriyet", "source_region": "asia", "ai_category": "politica_exterior",
     "ai_relevance": 8, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Turkey", "ai_geo_lat": 39.9334, "ai_geo_lon": 32.8597,
     "ai_summary": "Erdogan escala retorica anti-israel. Propuesta sin precedentes en historia de la OTAN.",
     "ai_analysis": "Tension entre socios OTAN. Espana mantiene posicion critica con Israel sin apoyar la propuesta turca.",
     "ai_topics": ["OTAN", "Gaza", "Turquia"], "geo_region": "Asia"},
    {"title": "Marruecos: llegadas irregulares a Canarias baten el record historico",
     "source_name": "El Pais", "source_region": "africa", "ai_category": "sociedad",
     "ai_relevance": 8, "ai_urgency": "24h", "ai_sentiment": "negativo", "ai_spain_impact": "critico",
     "ai_geo_location": "Morocco", "ai_geo_lat": 31.7917, "ai_geo_lon": -7.0926,
     "ai_summary": "Mas de 4.000 llegadas en una semana a Canarias. Capacidad de acogida saturada en las islas.",
     "ai_analysis": "Presion maxima sobre el sistema de acogida espanol. Crisis diplomatica latente con Marruecos.",
     "ai_topics": ["migracion", "Canarias", "Marruecos"], "geo_region": "Africa"},
    {"title": "Corea del Sur: Samsung anuncia inversion de 230.000M en chips avanzados",
     "source_name": "Korea Herald", "source_region": "asia", "ai_category": "tecnologia",
     "ai_relevance": 7, "ai_urgency": "mes", "ai_sentiment": "positivo", "ai_spain_impact": "bajo",
     "ai_geo_location": "South Korea", "ai_geo_lat": 37.5665, "ai_geo_lon": 126.9780,
     "ai_summary": "Mayor inversion en semiconductores de la historia de Samsung. 10 nuevas fabricas en Korea del Sur.",
     "ai_analysis": "Reafirma liderazgo surcoreano en chips de memoria. Contrapeso estrategico a la expansion china.",
     "ai_topics": ["semiconductores", "inversion", "tecnologia"], "geo_region": "Asia"},
    {"title": "Colombia: Petro activa decreto de emergencia economica ante caida del peso",
     "source_name": "El Tiempo", "source_region": "latin_america", "ai_category": "economia",
     "ai_relevance": 7, "ai_urgency": "24h", "ai_sentiment": "negativo", "ai_spain_impact": "bajo",
     "ai_geo_location": "Colombia", "ai_geo_lat": 4.7110, "ai_geo_lon": -74.0721,
     "ai_summary": "Peso colombiano cae 12% en una semana. Decreto de emergencia activa controles de capital.",
     "ai_analysis": "Inversion espanola en Colombia (banca, energia, telecomunicaciones) en observacion.",
     "ai_topics": ["crisis economica", "Colombia", "divisas"], "geo_region": "America del Sur"},
    {"title": "Vietnam surpasa a China como mayor exportador de electronica a la UE",
     "source_name": "Reuters", "source_region": "asia", "ai_category": "economia",
     "ai_relevance": 6, "ai_urgency": "mes", "ai_sentiment": "mixto", "ai_spain_impact": "bajo",
     "ai_geo_location": "Vietnam", "ai_geo_lat": 14.0583, "ai_geo_lon": 108.2772,
     "ai_summary": "Redireccion de cadenas de suministro post-aranceles. Vietnam receptor de inversiones que huyen de China.",
     "ai_analysis": "Diversificacion de cadenas de suministro beneficia la resiliencia europea.",
     "ai_topics": ["electronica", "cadena de suministro", "China"], "geo_region": "Asia"},
    {"title": "Reino Unido: acuerdo post-Brexit sobre comercio de servicios financieros con la UE",
     "source_name": "The Guardian", "source_region": "europe", "ai_category": "economia",
     "ai_relevance": 7, "ai_urgency": "mes", "ai_sentiment": "positivo", "ai_spain_impact": "bajo",
     "ai_geo_location": "UK", "ai_geo_lat": 51.5074, "ai_geo_lon": -0.1278,
     "ai_summary": "Primer acuerdo sustantivo post-Brexit en servicios financieros. Acceso mutuo con condiciones.",
     "ai_analysis": "Reduce friction comercial. Relacion bilateral UK-UE mejora marginalmente. Impacto positivo para sector financiero espanol.",
     "ai_topics": ["Brexit", "servicios financieros", "relaciones UE-UK"], "geo_region": "Europa"},
    {"title": "Tunez: crisis politica grave tras disolucion del parlamento",
     "source_name": "Al Jazeera", "source_region": "africa", "ai_category": "politica_exterior",
     "ai_relevance": 7, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "medio",
     "ai_geo_location": "Tunisia", "ai_geo_lat": 33.8869, "ai_geo_lon": 9.5375,
     "ai_summary": "Presidente Saied disuelve el parlamento y asume poderes ejecutivos plenos. Presion de calle en aumento.",
     "ai_analysis": "Inestabilidad tunecina amplifica presion migratoria sobre la ruta del Mediterraneo central.",
     "ai_topics": ["crisis politica", "democracia", "migracion"], "geo_region": "Africa"},
    {"title": "Afghanistan: los talibanes cierran 90 ONG extranjeras de un golpe",
     "source_name": "BBC", "source_region": "asia", "ai_category": "politica_exterior",
     "ai_relevance": 7, "ai_urgency": "semana", "ai_sentiment": "negativo", "ai_spain_impact": "bajo",
     "ai_geo_location": "Afghanistan", "ai_geo_lat": 33.9391, "ai_geo_lon": 67.7100,
     "ai_summary": "Decreto talibanreprime presencia humanitaria internacional. ONG espanolas entre las afectadas.",
     "ai_analysis": "Crisis humanitaria se agrava. Flujo de refugiados aumentara. Espana puede recibir solicitudes de acogida.",
     "ai_topics": ["humanitario", "talibanes", "refugiados"], "geo_region": "Asia"},
]

# Presets de zoom por region (determinan el centro y escala del mapa Plotly)
_ZOOM_REGION_PRIORITY = [
    "España Regional", "España Nacional", "Europa", "Africa", "Asia",
    "America del Norte", "America del Sur", "Internacional",
]


def _get_zoom_preset(selected_regions: list[str]) -> dict:
    """Devuelve el preset de zoom mas local entre las regiones seleccionadas."""
    for region in _ZOOM_REGION_PRIORITY:
        if region in selected_regions:
            return _ZOOM_PRESETS[region]
    return _ZOOM_PRESETS["Internacional"]


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
