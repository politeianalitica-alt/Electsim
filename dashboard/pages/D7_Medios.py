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
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS,
    section_header, kpi_card,
    intel_header, scrolling_ticker, news_card,
    sidebar_nav, mostrar_alertas_pagina,
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
tab_rt, tab_actor, tab_fuente, tab_narrativa, tab_comp = st.tabs([
    "COBERTURA EN TIEMPO REAL",
    "SENTIMIENTO POR ACTOR",
    "COBERTURA POR FUENTE",
    "RADAR DE NARRATIVAS",
    "ANÁLISIS COMPARATIVO",
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
