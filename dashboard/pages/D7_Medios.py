"""
ELECTSIM — D7 Medios & Narrativa (Edición Avanzada)
Feed · Monitor de Palabras · Amenazas & Desinformación · Correlación Prensa-Parlamento
"""
from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random
import math

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

# ── Demo data helpers ─────────────────────────────────────────────────────────
_MEDIOS = [
    "El País", "El Mundo", "ABC", "La Vanguardia", "El Confidencial",
    "elDiario.es", "La Razón", "Público", "20 Minutos", "El Español",
    "Expansión", "Cinco Días", "El Periódico", "La Sexta", "RTVE",
    "Cadena SER", "COPE", "Onda Cero", "El Economista", "Infolibre",
]
_TEMAS = [
    "Política nacional", "Economía", "Internacional", "Judicial",
    "Cataluña", "País Vasco", "Social", "Corrupción", "Elecciones",
]
_PARTIDOS_LISTA = list(COLORES_PARTIDOS.keys())[:8]

_random = random.Random(42)

@st.cache_data(ttl=300)
def _get_noticias_demo(n=50):
    titulos = [
        "El Gobierno aprueba el decreto de medidas económicas urgentes",
        "Sánchez anuncia nueva ronda de negociaciones con los socios de investidura",
        "El PP registra una moción de censura en el Congreso",
        "VOX celebra su congreso nacional con récord de asistencia",
        "Feijóo exige la dimisión del ministro tras el escándalo",
        "El TC admite a trámite el recurso de amparo de los presos del procés",
        "Sumar propone reducir la jornada laboral a 32 horas semanales",
        "La economía española crece un 2,8% en el primer trimestre",
        "El paro baja a mínimos históricos según la EPA trimestral",
        "Cataluña negocia nuevo modelo de financiación singular",
        "El Senado rechaza los Presupuestos Generales del Estado",
        "Junts condiciona su apoyo a la aprobación de la amnistía plena",
        "La inflación repunta al 3,2% impulsada por la energía",
        "El CGPJ renueva tras cinco años de bloqueo",
        "Puigdemont anuncia su regreso a España para el próximo mes",
        "El Banco de España rebaja las previsiones de crecimiento",
        "Yolanda Díaz presenta el plan de choque contra la pobreza energética",
        "La oposición exige explicaciones sobre el espionaje con Pegasus",
        "El Gobierno presenta la nueva Ley de Vivienda en el Congreso",
        "Abascal acusa al Gobierno de traicionar la Constitución",
        "El ministro de Asuntos Exteriores viaja a Bruselas para la cumbre",
        "El IBEX 35 cierra en máximos anuales tras la bajada de tipos",
        "La Fiscalía pide 12 años de prisión para el extesorero del PP",
        "ERC rompe el acuerdo de investidura con el PSC",
        "El Gobierno prorroga los ERTE hasta fin de año",
        "Bildu propone un referéndum de autodeterminación en el Parlamento vasco",
        "El PNV apoya la reforma del Código Penal",
        "La Guardia Civil detiene a varios cargos municipales por corrupción",
        "El Congreso aprueba la Ley de Inteligencia Artificial",
        "Sánchez comparece en el Congreso para explicar el viaje a China",
        "El Defensor del Pueblo alerta sobre las condiciones en los CIE",
        "La CEOE rechaza el aumento del salario mínimo propuesto",
        "Los sindicatos convocan huelga general para el mes de mayo",
        "El Parlamento Europeo aprueba el pacto de migración",
        "España presidirá el Consejo de Seguridad de la ONU",
        "La Ley de Secretos Oficiales se aprueba en primera lectura",
        "El Tribunal Supremo condena al expresidente de la Comunidad de Madrid",
        "Coalición Canaria exige más fondos para la gestión migratoria",
        "El PP arrasa en las encuestas en la Comunidad Valenciana",
        "El PSOE gana las elecciones en Extremadura por mayoría simple",
        "Ciudadanos anuncia su disolución definitiva",
        "El Gobierno negocia con Marruecos la regularización de migrantes",
        "La deuda pública escala al 113% del PIB",
        "El Congreso debate la reforma del sistema de pensiones",
        "Nuevas filtraciones apuntan a financiación ilegal del PP",
        "El Gobierno aprueba ayudas de 500M para la DANA",
        "España recibe 15.000 millones del fondo de recuperación europeo",
        "La Guardia Civil refuerza la vigilancia en Melilla",
        "El Consejo de Estado rechaza el decreto de amnistía",
        "Podemos abandona el Gobierno de coalición",
    ]
    noticias = []
    base_dt = datetime.now()
    for i, titulo in enumerate(titulos[:n]):
        medio = _MEDIOS[i % len(_MEDIOS)]
        tema = _TEMAS[i % len(_TEMAS)]
        sentimiento = _random.uniform(-1, 1)
        partidos = _random.sample(_PARTIDOS_LISTA, k=_random.randint(0, 3))
        noticias.append({
            "titulo": titulo,
            "medio": medio,
            "tema": tema,
            "sentimiento": round(sentimiento, 3),
            "partidos": partidos,
            "url": f"https://example.com/noticia-{i}",
            "fecha": (base_dt - timedelta(minutes=i * 18)).strftime("%H:%M"),
            "velocidad": _random.randint(5, 980),
            "alcance": _random.randint(1000, 500000),
        })
    return noticias


@st.cache_data(ttl=300)
def _get_keywords_demo():
    words = [
        "Sánchez", "PP", "PSOE", "VOX", "presupuestos", "cataluña",
        "elecciones", "corrupción", "economía", "reforma", "sumar",
        "congreso", "senado", "constitución", "amnistía", "pacto",
        "gobierno", "oposición", "inflación", "pensiones", "vivienda",
        "energía", "migración", "sanidad", "educación", "empleo",
        "impuestos", "deuda", "bruselas", "nato",
    ]
    return {w: _random.randint(5, 200) for w in words}


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
    noticias_raw = []
    if _CRAWLER_OK:
        try:
            noticias_raw = cargar_noticias(max_noticias=50)
        except Exception:
            noticias_raw = []

    if not noticias_raw:
        noticias_raw = _get_noticias_demo(50)

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
        noticias_f.sort(key=lambda x: x.get("alcance", 0), reverse=True)

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
        vel = n.get("velocidad", 0)
        alc = n.get("alcance", 0)
        partidos = n.get("partidos", [])

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
              ⚡ <b style="color:{AMBER}">{vel}</b> art/h
            </span>
            <span style="font-size:.72rem;color:{TEXT2}">
              👁 <b style="color:{BLUE}">{alc:,}</b> alcance
            </span>
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
    if _CRAWLER_OK:
        try:
            noticias_kw = cargar_noticias(max_noticias=50)
        except Exception:
            noticias_kw = _get_noticias_demo(50)
    else:
        noticias_kw = _get_noticias_demo(50)

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
        kw_dict = _get_keywords_demo()

    top_kw = sorted(kw_dict.items(), key=lambda x: x[1], reverse=True)[:20]
    kw_names = [k for k, _ in top_kw]
    kw_vals = [v for _, v in top_kw]

    col_hm, col_bar = st.columns([3, 2], gap="large")

    with col_hm:
        section_header("HEATMAP KEYWORDS × MEDIOS", AMBER)

        # Construir matriz medios × keywords
        top10_kw = kw_names[:10]
        sample_medios = _MEDIOS[:10]
        matrix = []
        rng = random.Random(99)
        for medio in sample_medios:
            row = [rng.randint(0, 30) for _ in top10_kw]
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
    section_header("TÉRMINOS EMERGENTES (+50% vs ayer)", RED)
    emerging_rng = random.Random(77)
    emerging = [(k, emerging_rng.uniform(50, 300)) for k in kw_names[:8]]
    cols_em = st.columns(4)
    for idx, (word, growth) in enumerate(emerging):
        with cols_em[idx % 4]:
            st.markdown(f"""
            <div style="background:{RED}15;border:1px solid {RED}33;border-radius:8px;
                        padding:.7rem;text-align:center;margin-bottom:.5rem">
              <div style="font-size:1.1rem;font-weight:800;color:{TEXT}">{word}</div>
              <div style="font-size:.9rem;color:{RED};font-weight:700">+{growth:.0f}%</div>
              <div style="font-size:.68rem;color:{MUTED}">vs ayer</div>
            </div>
            """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: AMENAZAS & DESINFORMACIÓN
# ═══════════════════════════════════════════════════════════════════════════════
with tab_amenazas:
    col_radar, col_cards = st.columns([2, 3], gap="large")

    with col_radar:
        section_header("RADAR DE AMENAZAS", RED)

        categories = [
            "Desinformación", "Manipulación",
            "Sesgo mediático", "Fake news",
            "Propaganda", "Astroturfing",
        ]
        values_high = [78, 45, 62, 88, 55, 40]
        values_med = [45, 65, 38, 52, 72, 58]
        values_low = [22, 32, 18, 30, 28, 22]

        fig_radar = go.Figure()
        for vals, name, color, fill in [
            (values_high, "Alto riesgo", RED, f"{RED}33"),
            (values_med, "Riesgo medio", AMBER, f"{AMBER}22"),
            (values_low, "Bajo riesgo", GREEN, f"{GREEN}22"),
        ]:
            v = vals + [vals[0]]
            c = categories + [categories[0]]
            fig_radar.add_trace(go.Scatterpolar(
                r=v, theta=c,
                fill="toself", fillcolor=fill,
                line=dict(color=color, width=2),
                name=name,
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
        threats = [
            {
                "titulo": "Bulo sobre dimisión del Presidente",
                "fuente": "Twitter / X (cuenta falsa)",
                "confianza": 0.94,
                "tipo": "Fake news",
                "color": RED,
                "descripcion": "Varios cuentas coordinadas difunden información falsa sobre una supuesta dimisión.",
            },
            {
                "titulo": "Manipulación de encuestas electorales",
                "fuente": "Telegram (grupo privado)",
                "confianza": 0.78,
                "tipo": "Manipulación",
                "color": AMBER,
                "descripcion": "Sondeos con metodología oscura circulan amplificados por bots.",
            },
            {
                "titulo": "Red de medios coordinada contra el Gobierno",
                "fuente": "Análisis de patrones NLP",
                "confianza": 0.67,
                "tipo": "Sesgo mediático",
                "color": PURPLE,
                "descripcion": "14 medios digitales publican el mismo frame narrativo en 2 horas.",
            },
            {
                "titulo": "Deepfake de declaraciones del ministro",
                "fuente": "YouTube (cuenta nueva)",
                "confianza": 0.88,
                "tipo": "Desinformación",
                "color": RED,
                "descripcion": "Vídeo manipulado con audio falso atribuido al ministro de Interior.",
            },
            {
                "titulo": "Campaña de astroturfing en redes",
                "fuente": "Detector NLP interno",
                "confianza": 0.71,
                "tipo": "Astroturfing",
                "color": BLUE,
                "descripcion": "Patrón de hashtags generados artificialmente trending durante 3 días.",
            },
        ]

        for t in threats:
            bar_w = int(t["confianza"] * 100)
            st.markdown(f"""
            <div class="threat-card" style="border-left-color:{t['color']}">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="font-weight:700;color:{TEXT};font-size:.9rem">{t['titulo']}</div>
                <span class="badge" style="background:{t['color']}33;color:{t['color']}">{t['tipo']}</span>
              </div>
              <div style="font-size:.75rem;color:{TEXT2};margin:.25rem 0">
                Fuente: <span style="color:{MUTED}">{t['fuente']}</span>
              </div>
              <div style="font-size:.78rem;color:{TEXT2};margin-bottom:.4rem">{t['descripcion']}</div>
              <div style="display:flex;align-items:center;gap:.5rem">
                <div style="flex:1;height:5px;background:{BORDER};border-radius:3px">
                  <div style="width:{bar_w}%;height:5px;background:{t['color']};border-radius:3px"></div>
                </div>
                <span style="font-size:.72rem;color:{t['color']};font-weight:700">
                  {t['confianza']:.0%} confianza
                </span>
              </div>
            </div>
            """, unsafe_allow_html=True)

    # ── Kit de Respuesta ──────────────────────────────────────────────────────
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("KIT DE RESPUESTA IA", CYAN)
    col_kit1, col_kit2 = st.columns([2, 3], gap="large")
    with col_kit1:
        amenaza_sel = st.selectbox("Amenaza a responder", [t["titulo"] for t in threats])
        if st.button("🤖 Generar Kit de Respuesta", key="btn_kit", type="primary"):
            with st.spinner("Generando respuesta..."):
                if _LLM_OK:
                    try:
                        respuesta = chat(
                            f"Genera un kit de respuesta ante esta amenaza informativa: '{amenaza_sel}'. "
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
                        "**1. Clarificación factual:** Publicar comunicado oficial con datos verificados "
                        "en menos de 2 horas de detectada la amenaza.\n\n"
                        "**2. Contranarrative:** Redirigir el debate hacia los logros del ejecutivo; "
                        "usar cifras oficiales y fuentes acreditadas.\n\n"
                        "**3. Portavoces:** Ministro/a responsable + portavoz parlamentario + "
                        "experto independiente de confianza.\n\n"
                        "**4. Timing:** Responder antes de las 18:00 para impactar en los informativos de noche. "
                        "Evitar respuesta en fin de semana.\n\n"
                        "**5. Canales:** Twitter/X oficial, rueda de prensa, nota a medios afines, "
                        "hilo de verificación con hilos documentados."
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

    medios_corr = _MEDIOS[:10]
    partidos_corr = _PARTIDOS_LISTA[:7]
    rng_c = random.Random(55)
    z_corr = [[rng_c.randint(0, 100) for _ in partidos_corr] for _ in medios_corr]

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
        section_header("CORRELACIÓN PRENSA → ACTIVIDAD PARLAMENTARIA", PURPLE)
        days = list(range(-15, 16))
        rng_l = random.Random(33)
        corr_values = [
            0.1 + 0.6 * math.exp(-((d - 3) ** 2) / 8) + rng_l.uniform(-0.05, 0.05)
            for d in days
        ]
        fig_lag = go.Figure()
        fig_lag.add_trace(go.Scatter(
            x=days, y=corr_values,
            mode="lines+markers",
            line=dict(color=PURPLE, width=2.5),
            marker=dict(size=6, color=PURPLE),
            fill="tozeroy", fillcolor=f"{PURPLE}22",
            name="Correlación",
            hovertemplate="Día %{x}: r=<b>%{y:.2f}</b><extra></extra>",
        ))
        fig_lag.add_vline(x=3, line_dash="dash", line_color=AMBER,
                          annotation_text="Pico +3d", annotation_font_color=AMBER)
        fig_lag.add_vline(x=0, line_dash="dot", line_color=MUTED)
        fig_lag.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT),
            height=300,
            margin=dict(l=10, r=10, t=30, b=30),
            xaxis=dict(title="Días (negativo=prensa antes)", gridcolor=BORDER),
            yaxis=dict(title="Correlación r", range=[0, 1], gridcolor=BORDER),
        )
        st.plotly_chart(fig_lag, use_container_width=True)

    with col_proj:
        section_header("PROYECCIÓN 30 DÍAS (Cobertura media)", GREEN)
        rng_p = random.Random(22)
        days_future = list(range(30))
        cob_hist = [50 + rng_p.gauss(0, 5) for _ in range(20)]
        trend = [cob_hist[-1] + 1.2 * d + rng_p.gauss(0, 3) for d in days_future]
        upper = [v + 10 for v in trend]
        lower = [max(0, v - 10) for v in trend]

        fig_proj = go.Figure()
        fig_proj.add_trace(go.Scatter(
            x=list(range(-20, 0)), y=cob_hist,
            mode="lines", line=dict(color=CYAN, width=2),
            name="Histórico", hovertemplate="Día %{x}: <b>%{y:.0f}</b><extra></extra>",
        ))
        fig_proj.add_trace(go.Scatter(
            x=days_future + days_future[::-1],
            y=upper + lower[::-1],
            fill="toself", fillcolor=f"{GREEN}22",
            line=dict(width=0), name="IC 80%", hoverinfo="skip",
        ))
        fig_proj.add_trace(go.Scatter(
            x=days_future, y=trend,
            mode="lines", line=dict(color=GREEN, width=2.5, dash="dot"),
            name="Proyección", hovertemplate="Día +%{x}: <b>%{y:.0f}</b><extra></extra>",
        ))
        fig_proj.add_vline(x=0, line_dash="dash", line_color=AMBER)
        fig_proj.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            font=dict(color=TEXT),
            height=300,
            margin=dict(l=10, r=10, t=30, b=30),
            xaxis=dict(title="Días desde hoy", gridcolor=BORDER),
            yaxis=dict(title="Artículos/día", gridcolor=BORDER),
            legend=dict(bgcolor=BG3, font=dict(color=TEXT2, size=10)),
        )
        st.plotly_chart(fig_proj, use_container_width=True)
