"""
ELECTSIM — D7 Medios & Narrativa (Edición Avanzada)
Feed · Monitor de Palabras · Amenazas & Desinformación · Correlación Prensa-Parlamento
"""
from __future__ import annotations
import html
import sys
from pathlib import Path
from collections import Counter

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st
import streamlit.components.v1 as components

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card, COLORES_PARTIDOS,
)
import dashboard.db as _db

try:
    from dashboard.services import git_amigos_bridge as _git_amigos
except Exception:
    _git_amigos = None  # type: ignore

st.set_page_config(
    page_title="Medios & Narrativa — ElectSim",
    page_icon="📰",
    layout="wide",
)
sidebar_nav()
mostrar_alertas_pagina("medios")

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
.stApp {{background:{BG};}}
.news-card {{
    background:{BG2};border:1px solid {BORDER};border-radius:10px;
    padding:1rem;margin-bottom:.7rem;transition:border-color .2s;
}}
.news-card:hover {{border-color:{CYAN}55;}}
.badge {{
    display:inline-block;padding:.15rem .55rem;border-radius:4px;
    font-size:.68rem;font-weight:700;margin-right:.3rem;
}}
.kpi-box {{
    background:{BG2};border:1px solid {BORDER};border-radius:10px;
    padding:.8rem 1rem;text-align:center;
}}
.threat-card {{
    background:{BG3};border-left:3px solid {RED};border-radius:8px;
    padding:.8rem 1rem;margin-bottom:.6rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.4rem">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,{AMBER},{RED});
              border-radius:12px;display:flex;align-items:center;justify-content:center;
              font-size:1.6rem;flex-shrink:0">📰</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.6rem;font-weight:900">
      Medios & Narrativa
    </h2>
    <div style="color:{TEXT2};font-size:.83rem">
      54+ fuentes · NLP en tiempo real · Detección de amenazas · Correlación parlamento
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Services ──────────────────────────────────────────────────────────────────
try:
    from dashboard.services.news_crawler import cargar_noticias, estadisticas_noticias
    _CRAWLER_OK = True
except Exception:
    _CRAWLER_OK = False

try:
    from dashboard.services.nlp_service import (
        resumen_sentimiento_partidos, extraer_keywords,
        clasificar_tema, disponible as _nlp_disp,
    )
    _NLP_OK = True
except Exception:
    _NLP_OK = False

try:
    from dashboard.services.llm_local import chat, esta_disponible, generar_insight
    _LLM_OK = esta_disponible()
except Exception:
    _LLM_OK = False
    def chat(msg, sistema=""):
        return "IA local no disponible en este momento."
    def generar_insight(tipo, datos):
        return "Insight no disponible."


_POS_WORDS = {
    "acuerdo", "aprueba", "crece", "mejora", "baja", "récord", "record",
    "respaldo", "avance", "pacto", "positivo", "lidera",
}
_NEG_WORDS = {
    "crisis", "bulo", "falso", "engañoso", "enganoso", "corrupción",
    "corrupcion", "dimisión", "dimision", "rechaza", "bloqueo", "cae",
    "tensión", "tension", "polémica", "polemica", "denuncia", "riesgo",
}


def _sentiment_score(text: str) -> float:
    low = str(text or "").lower()
    pos = sum(1 for w in _POS_WORDS if w in low)
    neg = sum(1 for w in _NEG_WORDS if w in low)
    if pos == neg:
        return 0.0
    return max(-1.0, min(1.0, (pos - neg) / max(pos + neg, 1)))


def _safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def _normalizar_noticia(item: dict) -> dict:
    titulo = str(item.get("titulo") or item.get("titular") or "Sin título")
    resumen = str(item.get("resumen") or "")
    fecha_raw = item.get("fecha") or item.get("fecha_publicacion") or ""
    dt = pd.to_datetime(fecha_raw, errors="coerce", utc=True)
    fecha = dt.strftime("%Y-%m-%d %H:%M") if not pd.isna(dt) else str(fecha_raw)[:16]
    partidos = item.get("partidos") or item.get("partidos_mencionados") or []
    if isinstance(partidos, str):
        partidos = [p.strip() for p in partidos.replace(";", ",").split(",") if p.strip()]
    sent = item.get("sentimiento")
    if sent is None:
        sent = item.get("sentimiento_score")
    try:
        sent_f = float(sent)
    except Exception:
        sent_f = _sentiment_score(f"{titulo} {resumen}")
    return {
        "titulo": titulo,
        "resumen": resumen,
        "medio": str(item.get("medio") or item.get("fuente") or "RSS"),
        "tema": str(item.get("tema") or item.get("categoria") or "General"),
        "url": str(item.get("url") or "#"),
        "fecha": fecha,
        "fecha_dt": dt if not pd.isna(dt) else None,
        "sentimiento": sent_f,
        "partidos": partidos,
        "velocidad": item.get("velocidad"),
        "alcance": item.get("alcance"),
    }


@st.cache_data(ttl=900, show_spinner=False)
def _get_noticias_live(max_noticias: int = 80) -> list[dict]:
    """Noticias reales por RSS/crawler. No devuelve datos inventados."""
    items: list[dict] = []
    if _CRAWLER_OK:
        try:
            items = cargar_noticias(max_noticias=max_noticias)
        except Exception:
            items = []
    if not items:
        try:
            from dashboard.services.rss_feeds import cargar_noticias_rss

            items = cargar_noticias_rss(max_noticias=max_noticias)
        except Exception:
            items = []
    return [_normalizar_noticia(item) for item in (items or [])[:max_noticias]]


def _factcheck_to_threat(item: dict) -> dict:
    verdict = str(item.get("verdict") or item.get("veredicto") or item.get("verdict_label") or "SIN VERIFICAR").upper()
    color = RED if "FALSO" in verdict else AMBER if "ENGA" in verdict or "MANIP" in verdict else PURPLE
    tipo = "Fake news" if "FALSO" in verdict else "Manipulación" if "ENGA" in verdict or "MANIP" in verdict else "Verificación"
    titulo = str(item.get("titular") or item.get("titulo") or "Verificación sin título")
    resumen = str(item.get("resumen") or item.get("claim_text") or "Verificación publicada por fact-checker.")
    source = str(item.get("source_id") or item.get("fuente") or "fact-checker")
    url = str(item.get("url") or "")
    return {
        "titulo": titulo[:220],
        "fuente": source,
        "confianza": 0.92 if "FALSO" in verdict else 0.78 if tipo == "Manipulación" else 0.62,
        "tipo": tipo,
        "color": color,
        "descripcion": resumen[:360],
        "url": url,
        "verdict": verdict,
    }


@st.cache_data(ttl=1800, show_spinner=False)
def _get_factcheck_threats(limit: int = 25) -> list[dict]:
    """Fact-checks reales desde BD o feeds Newtral/Maldita/EFE/AFP."""
    rows: list[dict] = []
    try:
        df_fc = _db.cargar_fact_checks(dias=30, limit=limit)
        if df_fc is not None and not df_fc.empty:
            rows = df_fc.to_dict("records")
    except Exception:
        rows = []
    if not rows:
        try:
            from etl.sources.factcheck_feeds import fetch_all_factchecks

            rows = fetch_all_factchecks(limit_per_source=max(5, limit // 4))
        except Exception:
            rows = []
    threats = [_factcheck_to_threat(row) for row in rows[:limit]]
    if _git_amigos is not None:
        try:
            for src in _git_amigos.osint_signals("news crawler rss disinformation threat narrative", limit=8):
                threats.append({
                    "titulo": str(src.get("title") or src.get("label") or "Fuente OSINT local")[:220],
                    "fuente": f"Git Amigos · {src.get('label', src.get('repo', 'repo local'))}",
                    "confianza": min(0.95, 0.60 + float(src.get("score") or 0) / 20.0),
                    "tipo": "OSINT",
                    "color": PURPLE,
                    "descripcion": str(src.get("snippet") or "")[:360],
                    "url": "",
                    "verdict": "FUENTE LOCAL",
                })
        except Exception:
            pass
    return threats[:limit]


# ── Fallback labels para ejes cuando una fuente viva viene vacía ─────────────
_MEDIOS = [
    "El País", "El Mundo", "ABC", "La Vanguardia", "El Confidencial",
    "elDiario.es", "La Razón", "Público", "20 Minutos", "El Español",
    "Expansión", "Cinco Días", "El Periódico", "La Sexta", "RTVE",
    "Cadena SER", "COPE", "Onda Cero", "El Economista", "Infolibre",
]
_PARTIDOS_LISTA = list(COLORES_PARTIDOS.keys())[:8]


# ═══════════════════════════════════════════════════════════════════════════════
# TABS
# ═══════════════════════════════════════════════════════════════════════════════
tab_feed, tab_palabras, tab_amenazas, tab_correlacion = st.tabs([
    "📰 Feed",
    "🔥 Monitor de Palabras",
    "⚠️ Amenazas & Desinformación",
    "📊 Correlación Prensa-Parlamento",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: FEED
# ═══════════════════════════════════════════════════════════════════════════════
with tab_feed:
    noticias_raw = _get_noticias_live(80)
    if not noticias_raw:
        st.warning("No se han podido cargar noticias reales por RSS/crawler en este momento. No se muestran datos simulados.")
    if _git_amigos is not None:
        try:
            srcs = _git_amigos.search_corpus("news crawler rss fundus bertopic narrative topic modeling", module="D7", limit=4)
        except Exception:
            srcs = []
        if srcs:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {CYAN}33;border-left:3px solid {CYAN};'
                f'border-radius:10px;padding:.7rem .9rem;margin-bottom:1rem">'
                f'<div style="font-size:.62rem;font-weight:900;color:{CYAN};letter-spacing:.12em;'
                f'text-transform:uppercase;margin-bottom:.25rem">INGESTA MEDIOS DESDE GIT AMIGOS</div>'
                f'<div style="font-size:.72rem;color:{TEXT2};line-height:1.45">'
                f'Patrones locales de News Crawlers, Fundus, FreshRSS y BERTopic quedan disponibles para el pipeline y el RAG de Ollama. '
                f'Fuentes activas: {", ".join(str(s.get("label")) for s in srcs[:4])}.</div></div>',
                unsafe_allow_html=True,
            )

    # ── Top bar KPIs ──────────────────────────────────────────────────────────
    total = len(noticias_raw)
    sentimientos = [n.get("sentimiento", 0) for n in noticias_raw]
    avg_sent = sum(sentimientos) / max(len(sentimientos), 1)
    medios_count = {}
    for n in noticias_raw:
        m = n.get("medio", "?")
        medios_count[m] = medios_count.get(m, 0) + 1
    top_medio = max(medios_count, key=medios_count.get) if medios_count else "N/A"

    all_keywords = {}
    for n in noticias_raw:
        titulo = n.get("titulo", "")
        for word in titulo.split():
            if len(word) > 5:
                all_keywords[word] = all_keywords.get(word, 0) + 1
    trending = max(all_keywords, key=all_keywords.get) if all_keywords else "N/A"

    c1, c2, c3, c4 = st.columns(4)
    _sent_color = GREEN if avg_sent > 0.1 else (RED if avg_sent < -0.1 else AMBER)
    with c1:
        st.markdown(f"""
        <div class="kpi-box">
          <div style="font-size:1.8rem;font-weight:900;color:{CYAN}">{total}</div>
          <div style="color:{TEXT2};font-size:.78rem">Artículos cargados</div>
        </div>""", unsafe_allow_html=True)
    with c2:
        st.markdown(f"""
        <div class="kpi-box">
          <div style="font-size:1.8rem;font-weight:900;color:{_sent_color}">{avg_sent:+.2f}</div>
          <div style="color:{TEXT2};font-size:.78rem">Sentimiento medio</div>
        </div>""", unsafe_allow_html=True)
    with c3:
        st.markdown(f"""
        <div class="kpi-box">
          <div style="font-size:1.3rem;font-weight:900;color:{AMBER}">{top_medio}</div>
          <div style="color:{TEXT2};font-size:.78rem">Medio más activo</div>
        </div>""", unsafe_allow_html=True)
    with c4:
        st.markdown(f"""
        <div class="kpi-box">
          <div style="font-size:1.3rem;font-weight:900;color:{PURPLE}">#{trending}</div>
          <div style="color:{TEXT2};font-size:.78rem">Trending topic</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Filtros ───────────────────────────────────────────────────────────────
    col_f1, col_f2, col_f3, col_f4, col_f5 = st.columns([2, 2, 2, 2, 1])
    with col_f1:
        medios_todos = sorted(set(n.get("medio", "") for n in noticias_raw))
        medios_sel = st.multiselect("Medio", medios_todos, default=[], key="d7_medios")
    with col_f2:
        temas_todos = sorted(set(n.get("tema", "") for n in noticias_raw))
        tema_sel = st.selectbox("Tema", ["Todos"] + temas_todos, key="d7_tema")
    with col_f3:
        partido_sel = st.text_input("Partido menciona", placeholder="PP, PSOE…", key="d7_partido")
    with col_f4:
        sent_range = st.slider("Sentimiento", -1.0, 1.0, (-1.0, 1.0), 0.1, key="d7_sent")
    with col_f5:
        sort_by = st.selectbox("Ordenar", ["Reciente", "Sentimiento", "Alcance"], key="d7_sort")

    # Filtrar
    noticias_f = noticias_raw.copy()
    if medios_sel:
        noticias_f = [n for n in noticias_f if n.get("medio") in medios_sel]
    if tema_sel != "Todos":
        noticias_f = [n for n in noticias_f if n.get("tema") == tema_sel]
    if partido_sel.strip():
        pq = partido_sel.strip().upper()
        noticias_f = [
            n for n in noticias_f
            if any(pq in p.upper() for p in n.get("partidos", []))
        ]
    noticias_f = [
        n for n in noticias_f
        if sent_range[0] <= n.get("sentimiento", 0) <= sent_range[1]
    ]
    if sort_by == "Sentimiento":
        noticias_f.sort(key=lambda x: x.get("sentimiento", 0))
    elif sort_by == "Alcance":
        noticias_f.sort(key=lambda x: _safe_float(x.get("alcance"), 0.0), reverse=True)

    st.markdown(f"<div style='color:{TEXT2};font-size:.8rem;margin-bottom:.5rem'>"
                f"{len(noticias_f)} artículos mostrados</div>", unsafe_allow_html=True)

    # ── Noticias ──────────────────────────────────────────────────────────────
    for n in noticias_f[:30]:
        sent = n.get("sentimiento", 0)
        dot = "🟢" if sent > 0.15 else ("🔴" if sent < -0.15 else "🟡")
        medio = n.get("medio", "—")
        tema = n.get("tema", "")
        url = n.get("url", "#")
        titulo = n.get("titulo", "Sin título")
        fecha = n.get("fecha", "")
        vel = n.get("velocidad")
        alc = n.get("alcance")
        partidos = n.get("partidos", [])
        vel_html = ""
        if vel is not None:
            vel_html = (
                f'<span style="font-size:.72rem;color:{TEXT2}">'
                f'⚡ <b style="color:{AMBER}">{html.escape(str(vel))}</b> art/h</span>'
            )
        alc_html = ""
        alc_num = _safe_float(alc, -1.0)
        if alc_num >= 0:
            alc_html = (
                f'<span style="font-size:.72rem;color:{TEXT2}">'
                f'👁 <b style="color:{BLUE}">{int(alc_num):,}</b> alcance</span>'
            )

        medio_color = CYAN
        tcolor = AMBER

        partido_chips = "".join(
            f'<span class="badge" style="background:{COLORES_PARTIDOS.get(p, MUTED)}33;'
            f'color:{COLORES_PARTIDOS.get(p, TEXT2)};border:1px solid {COLORES_PARTIDOS.get(p, MUTED)}44">'
            f'{p}</span>'
            for p in partidos
        )

        st.markdown(f"""
        <div class="news-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">
            <div style="flex:1">
              <a href="{url}" target="_blank" style="color:{TEXT};text-decoration:none;
                 font-size:.95rem;font-weight:700;line-height:1.4">{titulo}</a>
              <div style="margin-top:.35rem">
                <span class="badge" style="background:{medio_color}22;color:{medio_color}">{medio}</span>
                <span class="badge" style="background:{tcolor}22;color:{tcolor}">{tema}</span>
                {partido_chips}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:1.2rem">{dot}</div>
              <div style="font-size:.68rem;color:{MUTED}">{fecha}</div>
            </div>
          </div>
          <div style="display:flex;gap:1.5rem;margin-top:.5rem">
            <span style="font-size:.72rem;color:{TEXT2}">
              Fuente RSS/crawler en vivo
            </span>
            {vel_html}
            {alc_html}
            <span style="font-size:.72rem;color:{TEXT2}">
              Sentimiento <b style="color:{'#10B981' if sent > 0 else '#EF4444'}">{sent:+.2f}</b>
            </span>
          </div>
        </div>
        """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: MONITOR DE PALABRAS
# ═══════════════════════════════════════════════════════════════════════════════
with tab_palabras:
    noticias_kw = _get_noticias_live(100)

    # Extraer keywords
    kw_dict = {}
    if _NLP_OK:
        try:
            texto_total = " ".join(n.get("titulo", "") for n in noticias_kw)
            kws = extraer_keywords(texto_total, 30)
            kw_dict = {k: v for k, v in kws} if kws and isinstance(kws[0], (list, tuple)) else {}
        except Exception:
            kw_dict = {}

    if not kw_dict:
        texto_total = " ".join(n.get("titulo", "") for n in noticias_kw)
        words = [
            w.strip(".,;:()[]¿?¡!\"'").lower()
            for w in texto_total.split()
            if len(w.strip(".,;:()[]¿?¡!\"'")) > 5
        ]
        kw_dict = dict(Counter(words).most_common(30))
    if _git_amigos is not None:
        try:
            for src in _git_amigos.search_corpus("topic modeling narrative bertopic rss media", module="D7", limit=6):
                for word in str(src.get("label") or "").lower().split():
                    if len(word) > 5:
                        kw_dict[word] = kw_dict.get(word, 0) + 1
        except Exception:
            pass

    top_kw = sorted(kw_dict.items(), key=lambda x: x[1], reverse=True)[:20]
    kw_names = [k for k, _ in top_kw]
    kw_vals = [v for _, v in top_kw]

    col_hm, col_bar = st.columns([3, 2], gap="large")

    with col_hm:
        section_header("HEATMAP KEYWORDS × MEDIOS", AMBER)

        # Construir matriz real medios × keywords desde titulares RSS
        top10_kw = kw_names[:10]
        sample_medios = sorted({n.get("medio", "RSS") for n in noticias_kw})[:10] or _MEDIOS[:3]
        matrix = []
        for medio in sample_medios:
            docs_medio = [
                f"{n.get('titulo','')} {n.get('resumen','')}".lower()
                for n in noticias_kw
                if n.get("medio") == medio
            ]
            row = [sum(1 for doc in docs_medio if kw.lower() in doc) for kw in top10_kw]
            matrix.append(row)

        fig_hm = go.Figure(go.Heatmap(
            z=matrix,
            x=top10_kw,
            y=sample_medios,
            colorscale=[
                [0, BG2],
                [0.3, "#1E3A5F"],
                [0.7, BLUE],
                [1.0, CYAN],
            ],
            showscale=True,
            hovertemplate="%{y} × %{x}: <b>%{z}</b><extra></extra>",
        ))
        fig_hm.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=380,
            margin=dict(l=10, r=10, t=20, b=10),
            xaxis=dict(tickangle=-35, tickfont=dict(size=10)),
        )
        st.plotly_chart(fig_hm, use_container_width=True)

    with col_bar:
        section_header("TOP 20 KEYWORDS", CYAN)
        colors = [CYAN if i < 5 else (BLUE if i < 10 else MUTED) for i in range(len(kw_names))]
        fig_bar = go.Figure(go.Bar(
            x=kw_vals,
            y=kw_names,
            orientation="h",
            marker=dict(
                color=colors,
                line=dict(width=0),
            ),
            hovertemplate="%{y}: <b>%{x}</b><extra></extra>",
        ))
        fig_bar.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT, size=11),
            height=380,
            margin=dict(l=10, r=10, t=20, b=10),
            yaxis=dict(autorange="reversed"),
            xaxis=dict(gridcolor=BORDER),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    # ── Emerging terms ────────────────────────────────────────────────────────
    st.markdown(f"<br>", unsafe_allow_html=True)
    section_header("TÉRMINOS RELEVANTES EN TITULARES RECIENTES", RED)
    emerging = top_kw[:8]
    cols_em = st.columns(4)
    for idx, (word, mentions) in enumerate(emerging):
        with cols_em[idx % 4]:
            st.markdown(f"""
            <div style="background:{RED}15;border:1px solid {RED}33;border-radius:8px;
                        padding:.7rem;text-align:center;margin-bottom:.5rem">
              <div style="font-size:1.1rem;font-weight:800;color:{TEXT}">{word}</div>
              <div style="font-size:.9rem;color:{RED};font-weight:700">{mentions}</div>
              <div style="font-size:.68rem;color:{MUTED}">menciones RSS</div>
            </div>
            """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: AMENAZAS & DESINFORMACIÓN
# ═══════════════════════════════════════════════════════════════════════════════
with tab_amenazas:
    col_radar, col_cards = st.columns([2, 3], gap="large")
    threats = _get_factcheck_threats(25)

    with col_radar:
        section_header("RADAR DE AMENAZAS", RED)

        categories = [
            "Fake news", "Manipulación",
            "Verificación", "Economía",
            "Migración", "Institucional",
        ]
        type_counts = Counter(t["tipo"] for t in threats)
        text_all = " ".join(f"{t.get('titulo','')} {t.get('descripcion','')}".lower() for t in threats)
        values_live = [
            min(100, type_counts.get("Fake news", 0) * 18),
            min(100, type_counts.get("Manipulación", 0) * 18),
            min(100, type_counts.get("Verificación", 0) * 18),
            min(100, text_all.count("econom") * 12),
            min(100, text_all.count("migr") * 12),
            min(100, (text_all.count("gobierno") + text_all.count("congreso")) * 10),
        ]

        fig_radar = go.Figure()
        v = values_live + [values_live[0]]
        c = categories + [categories[0]]
        fig_radar.add_trace(go.Scatterpolar(
            r=v, theta=c,
            fill="toself",
            line=dict(color=RED if threats else MUTED, width=2),
            name="Fact-checks últimos 30 días",
            hovertemplate="%{theta}: <b>%{r}</b><extra></extra>",
        ))

        fig_radar.update_layout(
            polar=dict(
                radialaxis=dict(visible=True, range=[0, 100],
                                gridcolor=BORDER, tickfont=dict(color=MUTED, size=9)),
                angularaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2, size=10)),
            ),
            paper_bgcolor=BG2,
            plot_bgcolor=BG2,
            font=dict(color=TEXT),
            legend=dict(font=dict(color=TEXT2, size=10), bgcolor=BG3),
            height=380,
            margin=dict(l=20, r=20, t=30, b=20),
        )
        st.plotly_chart(fig_radar, use_container_width=True)

    with col_cards:
        section_header("ALERTAS DETECTADAS", RED)
        if not threats:
            st.info(
                "No hay fact-checks reales disponibles ahora mismo desde BD ni feeds. "
                "La vista ya no muestra amenazas simuladas."
            )

        for t in threats[:12]:
            bar_w = int(t["confianza"] * 100)
            title = html.escape(str(t["titulo"]))
            fuente = html.escape(str(t["fuente"]))
            desc = html.escape(str(t["descripcion"]))
            url = html.escape(str(t.get("url") or ""))
            st.markdown(f"""
            <div class="threat-card" style="border-left-color:{t['color']}">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="font-weight:700;color:{TEXT};font-size:.9rem">{title}</div>
                <span class="badge" style="background:{t['color']}33;color:{t['color']}">{t['tipo']}</span>
              </div>
              <div style="font-size:.75rem;color:{TEXT2};margin:.25rem 0">
                Fuente: <span style="color:{MUTED}">{fuente}</span>
              </div>
              <div style="font-size:.78rem;color:{TEXT2};margin-bottom:.4rem">{desc}</div>
              <div style="display:flex;align-items:center;gap:.5rem">
                <div style="flex:1;height:5px;background:{BORDER};border-radius:3px">
                  <div style="width:{bar_w}%;height:5px;background:{t['color']};border-radius:3px"></div>
                </div>
                <span style="font-size:.72rem;color:{t['color']};font-weight:700">
                  {t['confianza']:.0%} confianza
                </span>
              </div>
              {f'<a href="{url}" target="_blank" style="font-size:.7rem;color:{CYAN}">Abrir verificación</a>' if url else ''}
            </div>
            """, unsafe_allow_html=True)

    # ── Kit de Respuesta ──────────────────────────────────────────────────────
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("KIT DE RESPUESTA IA", CYAN)
    col_kit1, col_kit2 = st.columns([2, 3], gap="large")
    with col_kit1:
        amenaza_options = [t["titulo"] for t in threats] or ["Sin amenaza real seleccionable"]
        amenaza_sel = st.selectbox("Amenaza a responder", amenaza_options)
        if st.button("🤖 Generar Kit de Respuesta", key="btn_kit", type="primary", disabled=not threats):
            with st.spinner("Generando respuesta..."):
                selected_threat = next((t for t in threats if t["titulo"] == amenaza_sel), threats[0] if threats else {})
                threat_context = (
                    f"Título: {selected_threat.get('titulo', amenaza_sel)}\n"
                    f"Fuente: {selected_threat.get('fuente', 'fact-check')}\n"
                    f"Veredicto/tipo: {selected_threat.get('verdict') or selected_threat.get('tipo', '')}\n"
                    f"Descripción: {selected_threat.get('descripcion', '')}\n"
                    f"URL: {selected_threat.get('url', '')}"
                )
                if _LLM_OK:
                    try:
                        respuesta = chat(
                            f"Genera un kit de respuesta ante esta amenaza informativa verificada:\n{threat_context}\n\n"
                            "Incluye 5 bloques: 1-Clarificación factual, 2-Contranarrative, "
                            "3-Portavoces recomendados, 4-Timing óptimo, 5-Canales.",
                            sistema="Eres un experto en comunicación política y gestión de crisis.",
                        )
                    except Exception:
                        respuesta = None
                else:
                    respuesta = None

                if not respuesta:
                    respuesta = (
                        f"**1. Clarificación factual:** Responder sobre `{selected_threat.get('titulo', amenaza_sel)}` "
                        f"citando la fuente de verificación `{selected_threat.get('fuente', 'fact-check')}` "
                        "y enlazando la comprobación original.\n\n"
                        f"**2. Contexto:** Explicar el veredicto `{selected_threat.get('verdict') or selected_threat.get('tipo', '')}` "
                        "sin ampliar la afirmación falsa más de lo necesario.\n\n"
                        "**3. Portavoces:** Usar un portavoz técnico o institucional con capacidad de aportar documento, dato oficial o rectificación verificable.\n\n"
                        "**4. Timing:** Publicar una respuesta breve primero y una pieza ampliada cuando haya fuente primaria disponible.\n\n"
                        f"**5. Canales:** Web/nota oficial + redes propias + enlace directo a la verificación: {selected_threat.get('url', '') or 'sin URL disponible'}."
                    )
                st.session_state["d7_kit_resp"] = respuesta

    with col_kit2:
        if "d7_kit_resp" in st.session_state:
            blocks = st.session_state["d7_kit_resp"].split("\n\n")
            block_colors = [GREEN, BLUE, PURPLE, AMBER, CYAN]
            for i, block in enumerate(blocks[:5]):
                c = block_colors[i % len(block_colors)]
                st.markdown(f"""
                <div style="background:{c}12;border-left:3px solid {c};border-radius:6px;
                            padding:.7rem 1rem;margin-bottom:.5rem;font-size:.84rem;color:{TEXT}">
                  {block}
                </div>
                """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: CORRELACIÓN PRENSA-PARLAMENTO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_correlacion:
    section_header("MAPA DE MENCIONES PRENSA × PARTIDOS", CYAN)

    noticias_corr = _get_noticias_live(120)
    medios_corr = sorted({n.get("medio", "RSS") for n in noticias_corr})[:10]
    partidos_corr = sorted({p for n in noticias_corr for p in (n.get("partidos") or [])})[:8]
    if not medios_corr:
        medios_corr = _MEDIOS[:3]
    if not partidos_corr:
        partidos_corr = _PARTIDOS_LISTA[:4]
    z_corr = []
    for medio in medios_corr:
        row = []
        for partido in partidos_corr:
            row.append(
                sum(
                    1
                    for n in noticias_corr
                    if n.get("medio") == medio and partido in (n.get("partidos") or [])
                )
            )
        z_corr.append(row)

    fig_corr = go.Figure(go.Heatmap(
        z=z_corr,
        x=partidos_corr,
        y=medios_corr,
        colorscale=[[0, BG2], [0.2, BORDER], [0.6, BLUE], [1.0, CYAN]],
        showscale=True,
        hovertemplate="%{y} menciona a %{x}: <b>%{z} veces</b><extra></extra>",
    ))
    fig_corr.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        font=dict(color=TEXT),
        height=360,
        margin=dict(l=10, r=10, t=20, b=10),
    )
    st.plotly_chart(fig_corr, use_container_width=True)

    col_lag, col_proj = st.columns(2, gap="large")
    with col_lag:
        section_header("MENCIONES REALES POR PARTIDO", PURPLE)
        party_counts = Counter(p for n in noticias_corr for p in (n.get("partidos") or []))
        party_items = party_counts.most_common(10)
        fig_lag = go.Figure()
        fig_lag.add_trace(go.Bar(
            x=[p for p, _ in party_items],
            y=[v for _, v in party_items],
            marker_color=[COLORES_PARTIDOS.get(p, PURPLE) for p, _ in party_items],
            name="Menciones RSS",
            hovertemplate="%{x}: <b>%{y}</b> menciones<extra></extra>",
        ))
        fig_lag.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT),
            height=300,
            margin=dict(l=10, r=10, t=30, b=30),
            xaxis=dict(title="Partido", gridcolor=BORDER),
            yaxis=dict(title="Menciones", gridcolor=BORDER),
        )
        st.plotly_chart(fig_lag, use_container_width=True)

    with col_proj:
        section_header("COBERTURA RECIENTE POR FECHA", GREEN)
        counts_by_day = Counter()
        for n in noticias_corr:
            dt = n.get("fecha_dt")
            if dt is not None:
                counts_by_day[dt.strftime("%Y-%m-%d")] += 1
        dates_sorted = sorted(counts_by_day.keys())[-20:]
        cob_hist = [counts_by_day[d] for d in dates_sorted]

        fig_proj = go.Figure()
        fig_proj.add_trace(go.Scatter(
            x=dates_sorted, y=cob_hist,
            mode="lines+markers", line=dict(color=GREEN, width=2.5),
            marker=dict(color=GREEN, size=6),
            name="RSS recientes", hovertemplate="%{x}: <b>%{y:.0f}</b><extra></extra>",
        ))
        fig_proj.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT),
            height=300,
            margin=dict(l=10, r=10, t=30, b=30),
            xaxis=dict(title="Fecha", gridcolor=BORDER),
            yaxis=dict(title="Artículos/día", gridcolor=BORDER),
            legend=dict(bgcolor=BG3, font=dict(color=TEXT2, size=10)),
        )
        st.plotly_chart(fig_proj, use_container_width=True)
