"""
ELECTSIM — Medios & Narrativa
Mega-página: Noticias + NLP/Sentiment + BERTopic + Narrativas + RRSS
Integra:
  - news_crawler: fundus (El País, El Mundo, ABC, La Vanguardia...) + feedparser fallback
  - nlp_service: pysentimiento sentiment + YAKE keywords + topic detection
  - BERTopic: topic modeling dinámico
  - IPTC classification
"""
from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS, kpi_card, section_header,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Medios & Narrativa — ElectSim",
    page_icon="📰",
    layout="wide",
)
sidebar_nav()
mostrar_alertas_pagina("medios")

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;background:linear-gradient(135deg,{AMBER},{RED});
              border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-size:1.4rem;flex-shrink:0">📰</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Medios & Narrativa</h2>
    <div style="color:{TEXT2};font-size:.82rem">
      Noticias en tiempo real · Análisis NLP · Sentimiento · Temas
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Carga de noticias ─────────────────────────────────────────────────────────
try:
    from dashboard.services.news_crawler import (
        cargar_noticias, medios_disponibles, temas_disponibles,
        estadisticas_noticias, disponible as _crawler_disp
    )
    _CRAWLER_OK = True
    _crawler_caps = _crawler_disp()
except Exception:
    _CRAWLER_OK = False
    _crawler_caps = {}

try:
    from dashboard.services.nlp_service import (
        analizar_batch, resumen_sentimiento_partidos,
        extraer_keywords, clasificar_tema, disponible as _nlp_disp
    )
    _NLP_OK = True
except Exception:
    _NLP_OK = False

# Tabs
tab_noticias, tab_sent, tab_temas, tab_narrativas, tab_rrss = st.tabs([
    "📡 Noticias en Vivo",
    "😊 Sentimiento",
    "🏷️ Temas",
    "📊 Narrativas",
    "📱 RRSS Monitor",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: NOTICIAS EN VIVO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_noticias:
    # Sidebar de filtros
    col_filtros, col_news = st.columns([1, 3], gap="large")

    with col_filtros:
        section_header("FILTROS", CYAN)

        # Status del crawler
        fuente_label = "fundus + RSS" if _crawler_caps.get("fundus") else ("RSS" if _crawler_caps.get("feedparser") else "Sin fuente")
        st.markdown(f"""
        <div style="background:{GREEN if _CRAWLER_OK else RED}12;border:1px solid {GREEN if _CRAWLER_OK else RED}33;
                    border-radius:8px;padding:.5rem .8rem;font-size:.72rem;color:{GREEN if _CRAWLER_OK else RED};
                    margin-bottom:.8rem">
          {'✅' if _CRAWLER_OK else '❌'} Fuente: {fuente_label}
        </div>
        """, unsafe_allow_html=True)

        if _CRAWLER_OK:
            _todos_medios = medios_disponibles()
            medios_sel = st.multiselect(
                "Medios", _todos_medios,
                default=_todos_medios[:6],
                key="news_medios",
            )
            tema_f = st.selectbox("Tema", temas_disponibles(), key="news_tema")
            partido_f = st.text_input("Partido", placeholder="PP, PSOE, VOX...", key="news_partido")
            max_news = st.slider("Máximo noticias", 10, 100, 40, 5, key="news_max")
            usar_fundus = st.checkbox(
                "Usar fundus (texto completo)",
                value=bool(_crawler_caps.get("fundus")),
                help="fundus extrae el texto completo del artículo. Más lento.",
                key="news_fundus",
            )

            refresh = st.button("🔄 Actualizar noticias", type="primary", key="btn_refresh_news")
        else:
            st.warning("Sin crawler disponible. Instala `feedparser` o `fundus`.")
            medios_sel, tema_f, partido_f, max_news, usar_fundus, refresh = [], "Todos", "", 40, False, False

    with col_news:
        @st.cache_data(ttl=600, show_spinner="Cargando noticias...")
        def _get_noticias(medios, tema, partido, max_n, fundus):
            if not _CRAWLER_OK:
                return []
            return cargar_noticias(
                medios=medios or None,
                max_noticias=max_n,
                partido_filtro=partido if partido else None,
                tema_filtro=tema if tema != "Todos" else None,
                usar_fundus=fundus,
            )

        if refresh:
            st.cache_data.clear()

        noticias = _get_noticias(
            tuple(medios_sel), tema_f, partido_f, max_news, usar_fundus
        )

        if noticias:
            stats = estadisticas_noticias(noticias)

            # KPIs
            k1, k2, k3, k4 = st.columns(4)
            k1.metric("Titulares", stats["total"])
            k2.metric("Partido más citado", stats.get("mas_citado", "—"))
            if stats.get("por_tema"):
                top_tema = next(iter(stats["por_tema"]))
                k3.metric("Tema dominante", top_tema)
            if stats.get("por_medio"):
                top_medio = next(iter(stats["por_medio"]))
                k4.metric("Medio más activo", top_medio[:15])

            st.markdown("<br>", unsafe_allow_html=True)

            # Lista de noticias
            for i, n in enumerate(noticias[:30]):
                titulo = n.get("titulo", "Sin título")
                medio = n.get("medio", "—")
                tema = n.get("tema", "")
                partidos = n.get("partidos", [])
                url = n.get("url", "#")
                resumen = n.get("resumen", "")[:200]
                sesgo = n.get("sesgo", "")
                fecha = n.get("fecha", "")[:10] if n.get("fecha") else "—"

                # Sentimiento rápido
                sent_badge = ""
                if _NLP_OK and resumen:
                    try:
                        from dashboard.services.nlp_service import analizar_sentimiento
                        sent = analizar_sentimiento(f"{titulo} {resumen[:200]}")
                        sent_badge = f'<span style="background:{sent["color"]}22;color:{sent["color"]};border-radius:4px;padding:.05rem .35rem;font-size:.6rem;font-weight:700">{sent["emoji"]}{sent["label"]}</span>'
                    except Exception:
                        pass

                tema_colors = {
                    "Economía": AMBER, "Vivienda": GREEN, "Sanidad": RED,
                    "Cataluña": PURPLE, "Exterior": BLUE, "Corrupción": "#DC2626",
                }
                tema_color = tema_colors.get(tema, MUTED)
                sesgo_colors = {"izquierda": "#E30613", "derecha": "#009FDB", "centro": TEXT2, "liberal": AMBER}
                sesgo_color = sesgo_colors.get(sesgo, MUTED)

                partidos_html = ""
                if partidos:
                    chips = "".join(
                        f'<span style="background:{COLORES_PARTIDOS.get(p,"#444")}22;color:{COLORES_PARTIDOS.get(p,"#aaa")};border:1px solid {COLORES_PARTIDOS.get(p,"#444")}33;border-radius:3px;padding:.05rem .35rem;font-size:.6rem;font-weight:700">{p}</span>'
                        for p in partidos[:3]
                    )
                    partidos_html = f'<div style="display:flex;gap:.25rem;flex-wrap:wrap;margin-top:.3rem">{chips}</div>'

                with st.expander(f"**{medio}** — {titulo[:80]}", expanded=False):
                    st.markdown(f"""
                    <div style="padding:.3rem 0">
                      <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;flex-wrap:wrap;gap:.3rem">
                        <div style="display:flex;gap:.4rem;flex-wrap:wrap;align-items:center">
                          <span style="background:{tema_color}22;color:{tema_color};border-radius:4px;
                                       padding:.1rem .4rem;font-size:.65rem;font-weight:700">{tema}</span>
                          <span style="font-size:.65rem;color:{sesgo_color}">{sesgo}</span>
                          {sent_badge}
                        </div>
                        <span style="font-size:.65rem;color:{MUTED}">{fecha}</span>
                      </div>
                      <div style="font-size:.82rem;color:{TEXT2};line-height:1.5;margin-bottom:.4rem">{resumen}...</div>
                      {partidos_html}
                      <div style="margin-top:.5rem">
                        <a href="{url}" target="_blank" style="color:{CYAN};font-size:.72rem;font-weight:600">
                          🔗 Leer artículo completo →
                        </a>
                      </div>
                    </div>
                    """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div style="background:{BG3};border:1px dashed {BORDER};border-radius:12px;
                        padding:2.5rem;text-align:center">
              <div style="font-size:2rem;margin-bottom:.5rem">📰</div>
              <div style="color:{TEXT2}">Sin noticias cargadas</div>
              <div style="color:{MUTED};font-size:.75rem;margin-top:.3rem">
                {'Pulsa "Actualizar noticias" para cargar' if _CRAWLER_OK else 'Instala feedparser: pip install feedparser'}
              </div>
            </div>
            """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: SENTIMIENTO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_sent:
    section_header("ANÁLISIS DE SENTIMIENTO EN MEDIOS", GREEN)

    @st.cache_data(ttl=600, show_spinner="Analizando sentimiento...")
    def _get_sentiment_data():
        if not _CRAWLER_OK or not _NLP_OK:
            return [], {}
        noticias_sent = cargar_noticias(max_noticias=50)
        sent_map = resumen_sentimiento_partidos(noticias_sent)
        return noticias_sent, sent_map

    noticias_sent, sent_map = _get_sentiment_data()

    if sent_map:
        # Gráfico de sentimiento por partido
        col_sa, col_sb = st.columns([2, 1])

        with col_sa:
            # Stacked bar chart
            partidos_s = list(sent_map.keys())
            pos_vals = [sent_map[p]["positivo"] for p in partidos_s]
            neu_vals = [sent_map[p]["neutral"] for p in partidos_s]
            neg_vals = [sent_map[p]["negativo"] for p in partidos_s]

            fig_sent = go.Figure()
            fig_sent.add_trace(go.Bar(
                name="Positivo", x=partidos_s, y=pos_vals,
                marker_color=GREEN, hovertemplate="%{x}: %{y:.1f}% positivo<extra></extra>",
            ))
            fig_sent.add_trace(go.Bar(
                name="Neutral", x=partidos_s, y=neu_vals,
                marker_color=MUTED + "88", hovertemplate="%{x}: %{y:.1f}% neutral<extra></extra>",
            ))
            fig_sent.add_trace(go.Bar(
                name="Negativo", x=partidos_s, y=neg_vals,
                marker_color=RED, hovertemplate="%{x}: %{y:.1f}% negativo<extra></extra>",
            ))
            fig_sent.update_layout(
                barmode="stack", height=280,
                paper_bgcolor=BG2, plot_bgcolor=BG2,
                margin=dict(t=10, b=10, l=10, r=10),
                xaxis=dict(color=TEXT, tickfont=dict(size=11)),
                yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%", range=[0, 100]),
                legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.25,
                            font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
            )
            st.plotly_chart(fig_sent, use_container_width=True, config={"displayModeBar": False})

        with col_sb:
            section_header("ÍNDICE DE FAVORABILIDAD", CYAN)
            for partido, stats in sorted(sent_map.items(),
                                          key=lambda x: x[1]["positivo"] - x[1]["negativo"],
                                          reverse=True):
                favor_idx = stats["positivo"] - stats["negativo"]
                color_f = GREEN if favor_idx > 0 else RED
                color_p = COLORES_PARTIDOS.get(partido, CYAN)
                st.markdown(f"""
                <div style="display:flex;justify-content:space-between;align-items:center;
                            padding:.4rem .7rem;border-radius:8px;border:1px solid {BORDER};
                            background:{BG2};margin-bottom:.3rem">
                  <span style="font-size:.82rem;font-weight:700;color:{color_p}">{partido}</span>
                  <div style="text-align:right">
                    <span style="font-size:.9rem;font-weight:900;color:{color_f};font-family:monospace">
                      {favor_idx:+.0f}pp
                    </span>
                    <div style="font-size:.62rem;color:{MUTED}">{stats['total']} menciones</div>
                  </div>
                </div>
                """, unsafe_allow_html=True)

        # Timeline de sentimiento (si hay fechas)
        section_header("EVOLUCIÓN TEMPORAL", PURPLE)
        if noticias_sent:
            df_timeline = pd.DataFrame([{
                "fecha": n.get("fecha", "")[:10],
                "partido": n.get("partidos", ["—"])[0] if n.get("partidos") else "—",
            } for n in noticias_sent if n.get("fecha")])
            if not df_timeline.empty:
                df_timeline["fecha"] = pd.to_datetime(df_timeline["fecha"], errors="coerce")
                df_count = df_timeline.groupby(["fecha", "partido"]).size().reset_index(name="menciones")
                fig_tl = px.line(
                    df_count, x="fecha", y="menciones", color="partido",
                    color_discrete_map={p: COLORES_PARTIDOS.get(p, "#555") for p in df_count["partido"].unique()},
                    height=250,
                )
                fig_tl.update_layout(
                    paper_bgcolor=BG2, plot_bgcolor=BG2,
                    margin=dict(t=10, b=10, l=10, r=10),
                    xaxis=dict(color=TEXT2, gridcolor=BORDER),
                    yaxis=dict(color=TEXT2, gridcolor=BORDER, title="Menciones"),
                    legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.25,
                                font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
                    hovermode="x unified",
                )
                st.plotly_chart(fig_tl, use_container_width=True, config={"displayModeBar": False})
    else:
        st.info("Carga noticias en la pestaña anterior para ver el análisis de sentimiento.")
        if not _NLP_OK:
            st.code("pip install pysentimiento yake", language="bash")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: TEMAS
# ═══════════════════════════════════════════════════════════════════════════════
with tab_temas:
    section_header("ANÁLISIS TEMÁTICO — DISTRIBUCIÓN DE TEMAS EN MEDIOS", AMBER)

    @st.cache_data(ttl=600)
    def _get_topic_data():
        if not _CRAWLER_OK:
            return []
        return cargar_noticias(max_noticias=80)

    noticias_temas = _get_topic_data()

    if noticias_temas:
        # Distribución por tema
        temas_count: dict[str, int] = {}
        for n in noticias_temas:
            t = n.get("tema", "General")
            temas_count[t] = temas_count.get(t, 0) + 1

        col_ta, col_tb = st.columns([1, 1])

        with col_ta:
            section_header("DISTRIBUCIÓN POR TEMA", CYAN)
            df_temas = pd.DataFrame(
                sorted(temas_count.items(), key=lambda x: x[1], reverse=True),
                columns=["Tema", "Noticias"]
            )
            _TOPIC_COLORS = {
                "Economía": AMBER, "Vivienda": GREEN, "Sanidad": RED,
                "Cataluña": PURPLE, "Exterior": BLUE, "Corrupción": "#DC2626",
                "Seguridad": "#3B82F6", "Educación": CYAN, "Migración": "#F97316",
                "General": MUTED,
            }
            fig_temas = go.Figure(go.Bar(
                x=df_temas["Noticias"], y=df_temas["Tema"],
                orientation="h",
                marker_color=[_TOPIC_COLORS.get(t, MUTED) for t in df_temas["Tema"]],
                text=df_temas["Noticias"],
                textposition="outside",
                textfont=dict(color=TEXT, size=10),
                hovertemplate="<b>%{y}</b><br>%{x} noticias<extra></extra>",
            ))
            fig_temas.update_layout(
                height=350, margin=dict(t=10, b=10, l=10, r=40),
                paper_bgcolor=BG2, plot_bgcolor=BG2,
                xaxis=dict(color=TEXT2, gridcolor=BORDER),
                yaxis=dict(color=TEXT, tickfont=dict(size=11), categoryorder="total ascending"),
                showlegend=False,
            )
            st.plotly_chart(fig_temas, use_container_width=True, config={"displayModeBar": False})

        with col_tb:
            section_header("TEMAS POR PARTIDO", PURPLE)
            tema_partido: dict[str, dict[str, int]] = {}
            for n in noticias_temas:
                t = n.get("tema", "General")
                for p in n.get("partidos", []):
                    if p not in tema_partido:
                        tema_partido[p] = {}
                    tema_partido[p][t] = tema_partido[p].get(t, 0) + 1

            if tema_partido:
                all_temas = list({t for ts in tema_partido.values() for t in ts})
                df_heat = pd.DataFrame(tema_partido).T.fillna(0)
                df_heat = df_heat[[c for c in all_temas if c in df_heat.columns]]

                fig_heat = go.Figure(go.Heatmap(
                    z=df_heat.values,
                    x=df_heat.columns.tolist(),
                    y=df_heat.index.tolist(),
                    colorscale=[[0, BG3], [0.5, CYAN + "66"], [1, CYAN]],
                    hovertemplate="<b>%{y}</b> × <b>%{x}</b><br>%{z} menciones<extra></extra>",
                    showscale=False,
                ))
                fig_heat.update_layout(
                    height=350, margin=dict(t=10, b=10, l=10, r=10),
                    paper_bgcolor=BG2, plot_bgcolor=BG2,
                    xaxis=dict(color=TEXT, tickfont=dict(size=9), tickangle=-30),
                    yaxis=dict(color=TEXT, tickfont=dict(size=11)),
                )
                st.plotly_chart(fig_heat, use_container_width=True, config={"displayModeBar": False})

        # Keywords por tema
        section_header("KEYWORDS POR TEMA (YAKE)", GREEN)
        if _NLP_OK:
            # Agrupar textos por tema
            textos_por_tema: dict[str, list[str]] = {}
            for n in noticias_temas:
                t = n.get("tema", "General")
                txt = (n.get("titulo", "") + " " + n.get("resumen", ""))[:300]
                if txt.strip():
                    textos_por_tema.setdefault(t, []).append(txt)

            cols_kw = st.columns(3)
            for i, (tema_kw, textos) in enumerate(list(textos_por_tema.items())[:6]):
                texto_combinado = " ".join(textos[:5])
                try:
                    kws = extraer_keywords(texto_combinado, n_keywords=6)
                    kw_chips = "".join(
                        f'<span style="background:{BORDER};color:{TEXT2};border-radius:4px;'
                        f'padding:.1rem .4rem;font-size:.68rem;margin:.1rem">{kw}</span>'
                        for kw, _ in kws
                    )
                    tema_col = _TOPIC_COLORS.get(tema_kw, MUTED)
                    with cols_kw[i % 3]:
                        st.markdown(f"""
                        <div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {tema_col};
                                    border-radius:8px;padding:.7rem .9rem;margin-bottom:.5rem">
                          <div style="font-size:.72rem;font-weight:800;color:{tema_col};margin-bottom:.4rem">{tema_kw}</div>
                          <div style="display:flex;flex-wrap:wrap;gap:.2rem">{kw_chips}</div>
                        </div>
                        """, unsafe_allow_html=True)
                except Exception:
                    pass
    else:
        st.info("Carga noticias en la primera pestaña para ver el análisis temático.")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: NARRATIVAS
# ═══════════════════════════════════════════════════════════════════════════════
with tab_narrativas:
    section_header("TRACKER DE NARRATIVAS POLÍTICAS", PURPLE)

    try:
        from pages.N5_Campana import _render_narrativas
    except ImportError:
        pass

    # Cargar narrativas de BD + análisis en tiempo real
    @st.cache_data(ttl=300)
    def _cargar_narrativas_db():
        try:
            import dashboard.db as db
            conn = db.get_conn()
            return pd.read_sql(
                "SELECT * FROM narrativas ORDER BY fecha_deteccion DESC LIMIT 30",
                conn
            )
        except Exception:
            return pd.DataFrame()

    df_narr = _cargar_narrativas_db()

    if not df_narr.empty:
        for _, row in df_narr.head(8).iterrows():
            titulo = str(row.get("titulo", "—"))
            descripcion = str(row.get("descripcion", ""))[:300]
            partido = str(row.get("partido_origen", "—"))
            intensidad = float(row.get("intensidad", 0) or 0)
            fecha = str(row.get("fecha_deteccion", ""))[:10]
            color_p = COLORES_PARTIDOS.get(partido, CYAN)

            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.9rem 1.1rem;margin-bottom:.6rem;border-left:3px solid {color_p}">
              <div style="display:flex;justify-content:space-between;margin-bottom:.4rem">
                <span style="font-size:.88rem;font-weight:800;color:{TEXT}">{titulo}</span>
                <div>
                  <span style="background:{color_p}22;color:{color_p};border-radius:4px;
                               padding:.1rem .5rem;font-size:.7rem;font-weight:700">{partido}</span>
                  <span style="font-size:.65rem;color:{MUTED};margin-left:.5rem">{fecha}</span>
                </div>
              </div>
              <div style="font-size:.8rem;color:{TEXT2};margin-bottom:.4rem">{descripcion}</div>
              <div style="height:4px;background:{BORDER};border-radius:2px;overflow:hidden">
                <div style="width:{min(100, intensidad)}%;height:100%;background:{color_p}"></div>
              </div>
              <div style="font-size:.62rem;color:{MUTED};margin-top:.2rem">Intensidad: {intensidad:.0f}/100</div>
            </div>
            """, unsafe_allow_html=True)
    else:
        # Demo narrativas
        st.info("Sin narrativas en BD. Accede a Tracker Narrativas (v1) para más opciones.")
        _demo_narrativas = [
            {"titulo": "Crisis del alquiler como fracaso del gobierno", "partido": "PP", "intensidad": 78},
            {"titulo": "España motor económico de Europa", "partido": "PSOE", "intensidad": 65},
            {"titulo": "Inseguridad y pérdida de control fronterizo", "partido": "VOX", "intensidad": 72},
            {"titulo": "La ultraderecha amenaza los derechos conquistados", "partido": "SUMAR", "intensidad": 61},
        ]
        for n in _demo_narrativas:
            color_p = COLORES_PARTIDOS.get(n["partido"], CYAN)
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.9rem 1.1rem;margin-bottom:.5rem;border-left:3px solid {color_p}">
              <div style="display:flex;justify-content:space-between">
                <span style="font-size:.85rem;font-weight:700;color:{TEXT}">{n['titulo']}</span>
                <span style="background:{color_p}22;color:{color_p};border-radius:4px;
                             padding:.1rem .4rem;font-size:.7rem;font-weight:700">{n['partido']}</span>
              </div>
              <div style="height:4px;background:{BORDER};border-radius:2px;overflow:hidden;margin-top:.5rem">
                <div style="width:{n['intensidad']}%;height:100%;background:{color_p}"></div>
              </div>
            </div>
            """, unsafe_allow_html=True)

    st.page_link("pages/24_Tracker_Narrativas.py", label="→ Ver Tracker Narrativas completo (v1)")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5: RRSS MONITOR
# ═══════════════════════════════════════════════════════════════════════════════
with tab_rrss:
    section_header("MONITOR DE REDES SOCIALES", BLUE)

    # Monitor sentimiento desde BD
    @st.cache_data(ttl=300)
    def _cargar_rrss():
        try:
            conn = _db.get_conn()
            return pd.read_sql(
                "SELECT partido_siglas, sentimiento_promedio, volumen, fecha "
                "FROM monitor_sentimiento ORDER BY fecha DESC LIMIT 100",
                conn
            )
        except Exception:
            return pd.DataFrame()

    df_rrss = _cargar_rrss()

    if df_rrss.empty:
        st.info("Sin datos de RRSS en base de datos.")

        # Demo chart
        _demo_rrss = {
            "PP":    [0.65, 0.62, 0.68, 0.71, 0.69, 0.72, 0.70],
            "PSOE":  [0.58, 0.55, 0.60, 0.57, 0.62, 0.59, 0.63],
            "VOX":   [0.42, 0.38, 0.45, 0.41, 0.39, 0.43, 0.40],
            "SUMAR": [0.52, 0.55, 0.50, 0.53, 0.57, 0.54, 0.56],
        }
        dates_demo = pd.date_range(end=pd.Timestamp.today(), periods=7, freq="D")
        fig_rrss_demo = go.Figure()
        for partido, vals in _demo_rrss.items():
            color = COLORES_PARTIDOS.get(partido, "#555")
            fig_rrss_demo.add_trace(go.Scatter(
                x=dates_demo, y=vals, name=partido,
                line=dict(color=color, width=2.5),
                mode="lines+markers",
                marker=dict(size=6),
                hovertemplate=f"<b>{partido}</b><br>%{{y:.2f}}<extra></extra>",
            ))
        fig_rrss_demo.update_layout(
            height=300, title=dict(text="Sentimiento RRSS (demo)", font=dict(size=12, color=TEXT), x=0.5),
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=35, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER),
            yaxis=dict(color=TEXT2, gridcolor=BORDER, range=[0, 1], title="Sentimiento"),
            legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.2,
                        font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_rrss_demo, use_container_width=True, config={"displayModeBar": False})
        st.caption("📊 Datos demo — conecta fuentes de RRSS para datos reales")
    else:
        # Datos reales
        if "partido_siglas" in df_rrss.columns and "sentimiento_promedio" in df_rrss.columns:
            fig_rrss = px.line(
                df_rrss, x="fecha", y="sentimiento_promedio", color="partido_siglas",
                color_discrete_map={p: COLORES_PARTIDOS.get(p, "#555") for p in df_rrss["partido_siglas"].unique()},
            )
            fig_rrss.update_layout(
                height=300, paper_bgcolor=BG2, plot_bgcolor=BG2,
                margin=dict(t=10, b=10, l=10, r=10),
            )
            st.plotly_chart(fig_rrss, use_container_width=True, config={"displayModeBar": False})

    st.page_link("pages/14_Monitor_Sentimiento.py", label="→ Monitor Sentimiento completo (v1)")
    st.page_link("pages/20_Monitor_Medios_RRSS.py", label="→ Monitor Medios RRSS (v1)")
