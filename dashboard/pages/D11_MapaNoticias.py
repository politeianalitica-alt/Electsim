"""D11 — Mapa Mundial de Noticias con análisis Ollama.

350 fuentes internacionales → RSS → Ollama → PostgreSQL → Mapa interactivo.

Pestañas:
  Mapa Global      — scatter_geo con 3 modos de visualización
  Análisis         — sentimiento, categorías, temas trending
   Últimas Noticias — tabla filtrable con resúmenes AI
  ️ Ingesta          — estado del pipeline y control manual
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    BG, BG2, BG3, BORDER, CYAN, CYAN2, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
    hex_to_rgba, kpi_card, section_header, aplicar_estilos,
    PLOTLY_THEME,
)
from dashboard.services.media_sources import ALL_SOURCES, MEDIA_SOURCES, REGIONS

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Mapa de Noticias | ElectSim",
    page_icon="🌍",
    layout="wide",
)
aplicar_estilos()

# ── Lazy imports (evitar crash si Ollama/DB no disponibles) ───────────────────
@st.cache_resource(ttl=0)
def _get_ingestion_module():
    try:
        from dashboard.services import news_ingestion as ni
        return ni
    except Exception:
        return None

ni = _get_ingestion_module()

# ── Colores por región ────────────────────────────────────────────────────────
REGION_COLORS = {
    "local_spain":    CYAN,
    "regional_spain": CYAN2,
    "europe":         BLUE,
    "north_america":  "#F59E0B",
    "latin_america":  GREEN,
    "africa":         "#FF6B35",
    "asia":           PURPLE,
}

REGION_LABELS = {
    "local_spain":    "España Local",
    "regional_spain": "España Regional",
    "europe":         "Europa",
    "north_america":  "Norteamérica",
    "latin_america":  "Latinoamérica",
    "africa":         "África",
    "asia":           "Asia/Oceanía",
}

SENTIMENT_COLORS = {
    "positivo": GREEN,
    "negativo": RED,
    "neutro":   MUTED,
    "mixto":    AMBER,
}

CATEGORY_ICONS = {
    "politica": "️",
    "economia": "~",
    "seguridad": "*",
    "sociedad": "",
    "tecnologia": "",
    "medioambiente": "",
    "salud": "",
    "cultura": "",
    "deportes": "",
    "otro": "",
}

# ── Demo data (cuando DB no disponible) ──────────────────────────────────────
@st.cache_data(ttl=300)
def _demo_articles() -> pd.DataFrame:
    import random, hashlib
    from datetime import datetime, timedelta

    random.seed(42)
    rows = []
    sentiments = ["positivo", "negativo", "neutro", "mixto"]
    categories = list(CATEGORY_ICONS.keys())

    for src in ALL_SOURCES:
        # 1-3 artículos demo por fuente
        n = random.randint(1, 3)
        for i in range(n):
            rows.append({
                "title": f"Noticia demo de {src['name']} #{i+1}",
                "url": src["url"],
                "source_name": src["name"],
                "source_region": src["region"],
                "source_country": src["country"],
                "source_lat": src["lat"] + random.uniform(-0.5, 0.5),
                "source_lon": src["lon"] + random.uniform(-0.5, 0.5),
                "ai_sentiment": random.choice(sentiments),
                "ai_relevance": random.randint(3, 10),
                "ai_category": random.choice(categories),
                "ai_summary": f"Resumen automático de prueba para {src['name']}. Esta noticia trata sobre temas relevantes en {src['country']}.",
                "ai_topics": ["política", "economía", "internacional"][:random.randint(1, 3)],
                "ai_geo_location": src["country"],
                "ai_language": "es" if src["region"] in ("local_spain", "regional_spain", "latin_america") else "en",
                "scraped_at": datetime.now() - timedelta(minutes=random.randint(5, 240)),
            })
    return pd.DataFrame(rows)


@st.cache_data(ttl=120)
def load_articles(
    hours_back: int = 24,
    region: str | None = None,
    category: str | None = None,
    min_relevance: int = 1,
) -> pd.DataFrame:
    """Carga artículos de DB o usa demo si DB no disponible."""
    if ni:
        try:
            rows = ni.get_recent_articles(
                limit=2000,
                region=region,
                category=category,
                min_relevance=min_relevance,
                hours_back=hours_back,
            )
            if rows:
                return pd.DataFrame(rows)
        except Exception:
            pass
    # Fallback demo
    df = _demo_articles()
    if region:
        df = df[df["source_region"] == region]
    if category:
        df = df[df["ai_category"] == category]
    df = df[df["ai_relevance"] >= min_relevance]
    return df


@st.cache_data(ttl=60)
def load_ingestion_stats() -> dict:
    if ni:
        try:
            return ni.get_ingestion_stats()
        except Exception:
            pass
    return {
        "total_articles": len(_demo_articles()),
        "last_hour": 42,
        "last_24h": 980,
        "sources_active": len(ALL_SOURCES),
        "regions_active": len(REGIONS),
        "avg_relevance": 6.4,
        "last_scraped": "demo",
    }


# ── Header ────────────────────────────────────────────────────────────────────
section_header("Mapa Mundial de Noticias")
st.caption("350 fuentes internacionales · análisis Ollama en tiempo real")

# ── Sidebar filters ───────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### Filtros")
    region_filter = st.selectbox(
        "Región",
        options=["Todas"] + REGIONS,
        format_func=lambda x: REGION_LABELS.get(x, x),
    )
    category_filter = st.selectbox(
        "Categoría",
        options=["Todas"] + list(CATEGORY_ICONS.keys()),
        format_func=lambda x: f"{CATEGORY_ICONS.get(x,'')} {x}" if x != "Todas" else "Todas",
    )
    min_relevance = st.slider("Relevancia mínima", 1, 10, 4)
    hours_back = st.selectbox("Período", [6, 12, 24, 48, 72], index=2, format_func=lambda x: f"Últimas {x}h")
    view_mode = st.radio("Modo de vista", ["Por región", "Por sentimiento", "Densidad"])

    st.markdown("---")
    st.markdown("**Fuentes activas**")
    for reg in REGIONS:
        n = len(MEDIA_SOURCES[reg])
        color = REGION_COLORS[reg]
        st.markdown(
            f'<div style="display:flex;justify-content:space-between;margin:2px 0">'
            f'<span style="color:{TEXT2};font-size:0.75rem">{REGION_LABELS[reg]}</span>'
            f'<span style="color:{color};font-weight:700;font-size:0.75rem">{n}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )

# ── Load data ─────────────────────────────────────────────────────────────────
_region_arg = None if region_filter == "Todas" else region_filter
_cat_arg = None if category_filter == "Todas" else category_filter
df = load_articles(hours_back=hours_back, region=_region_arg, category=_cat_arg, min_relevance=min_relevance)

# ── KPI Row ───────────────────────────────────────────────────────────────────
stats = load_ingestion_stats()
c1, c2, c3, c4, c5 = st.columns(5)
pos_pct = (df["ai_sentiment"] == "positivo").sum() / max(len(df), 1) * 100
neg_pct = (df["ai_sentiment"] == "negativo").sum() / max(len(df), 1) * 100
with c1:
    st.markdown(kpi_card("Artículos (24h)", str(stats.get("last_24h", len(df))), color=CYAN), unsafe_allow_html=True)
with c2:
    st.markdown(kpi_card("Fuentes activas", str(stats.get("sources_active", len(ALL_SOURCES))), color=BLUE), unsafe_allow_html=True)
with c3:
    st.markdown(kpi_card("Regiones", str(stats.get("regions_active", len(REGIONS))), color=PURPLE), unsafe_allow_html=True)
with c4:
    st.markdown(kpi_card("Sentimiento +", f"{pos_pct:.0f}%", color=GREEN), unsafe_allow_html=True)
with c5:
    st.markdown(kpi_card("Sentimiento −", f"{neg_pct:.0f}%", color=RED), unsafe_allow_html=True)

st.markdown("---")

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_map, tab_analysis, tab_news, tab_ingest = st.tabs([
    "Mapa Global", "Análisis", " Últimas Noticias", "️ Ingesta"
])

# ════════════════════════════════════════════════════════════════════════════════
# TAB 1 — MAPA GLOBAL
# ════════════════════════════════════════════════════════════════════════════════
with tab_map:
    if df.empty:
        st.info("No hay artículos para los filtros seleccionados.")
    else:
        df_map = df.dropna(subset=["source_lat", "source_lon"]).copy()

        if view_mode == "Por región":
            df_map["color_key"] = df_map["source_region"]
            color_discrete_map = {k: v for k, v in REGION_COLORS.items()}
            df_map["label"] = df_map["source_region"].map(REGION_LABELS).fillna(df_map["source_region"])

            fig = px.scatter_geo(
                df_map,
                lat="source_lat",
                lon="source_lon",
                color="label",
                size="ai_relevance",
                size_max=18,
                hover_name="source_name",
                hover_data={
                    "title": True,
                    "ai_sentiment": True,
                    "ai_category": True,
                    "ai_relevance": True,
                    "source_lat": False,
                    "source_lon": False,
                    "label": False,
                },
                color_discrete_map={REGION_LABELS.get(k, k): v for k, v in REGION_COLORS.items()},
                title="Distribución geográfica por región",
                template="plotly_dark",
            )

        elif view_mode == "Por sentimiento":
            df_map["color_key"] = df_map["ai_sentiment"].fillna("neutro")
            fig = px.scatter_geo(
                df_map,
                lat="source_lat",
                lon="source_lon",
                color="color_key",
                size="ai_relevance",
                size_max=18,
                hover_name="source_name",
                hover_data={"title": True, "ai_summary": True, "ai_relevance": True,
                             "source_lat": False, "source_lon": False, "color_key": False},
                color_discrete_map=SENTIMENT_COLORS,
                title="Mapa de sentimiento global",
                template="plotly_dark",
                labels={"color_key": "Sentimiento"},
            )

        else:  # Densidad
            fig = px.density_mapbox(
                df_map,
                lat="source_lat",
                lon="source_lon",
                z="ai_relevance",
                radius=25,
                center={"lat": 20, "lon": 0},
                zoom=1,
                mapbox_style="carto-darkmatter",
                color_continuous_scale=[[0, BG3], [0.5, hex_to_rgba(CYAN, 0.5)], [1, CYAN]],
                title="Densidad de cobertura mediática",
                template="plotly_dark",
            )
            fig.update_layout(
                paper_bgcolor=BG,
                plot_bgcolor=BG2,
                height=580,
                margin=dict(l=0, r=0, t=40, b=0),
            )
            st.plotly_chart(fig, use_container_width=True)
            st.stop()

        fig.update_geos(
            showcoastlines=True, coastlinecolor=BORDER,
            showland=True, landcolor=BG3,
            showocean=True, oceancolor=BG,
            showframe=False,
            bgcolor=BG,
        )
        fig.update_layout(
            paper_bgcolor=BG,
            geo_bgcolor=BG,
            height=560,
            margin=dict(l=0, r=0, t=40, b=0),
            legend=dict(
                bgcolor=BG2,
                bordercolor=BORDER,
                font=dict(color=TEXT2, size=11),
            ),
            font=dict(color=TEXT),
            **{k: v for k, v in PLOTLY_THEME.items() if k in ("font",)},
        )
        st.plotly_chart(fig, use_container_width=True)

        # Mini resumen por región
        st.markdown("#### Distribución por región")
        reg_counts = df.groupby("source_region").agg(
            artículos=("title", "count"),
            relevancia_media=("ai_relevance", "mean"),
        ).reset_index()
        reg_counts["región"] = reg_counts["source_region"].map(REGION_LABELS)
        reg_counts["relevancia_media"] = reg_counts["relevancia_media"].round(1)

        fig_bar = px.bar(
            reg_counts.sort_values("artículos", ascending=True),
            x="artículos", y="región",
            color="artículos",
            color_continuous_scale=[[0, BG3], [1, CYAN]],
            orientation="h",
            template="plotly_dark",
            text="artículos",
        )
        fig_bar.update_layout(
            paper_bgcolor=BG, plot_bgcolor=BG2, height=280,
            margin=dict(l=0, r=0, t=10, b=0),
            coloraxis_showscale=False,
            font=dict(color=TEXT, size=11),
            xaxis=dict(gridcolor=BORDER),
            yaxis=dict(gridcolor="rgba(0,0,0,0)"),
        )
        fig_bar.update_traces(textposition="outside", textfont_color=TEXT2)
        st.plotly_chart(fig_bar, use_container_width=True)


# ════════════════════════════════════════════════════════════════════════════════
# TAB 2 — ANÁLISIS
# ════════════════════════════════════════════════════════════════════════════════
with tab_analysis:
    if df.empty:
        st.info("Sin datos para analizar.")
    else:
        col_sent, col_cat = st.columns(2)

        # Sentimiento
        with col_sent:
            st.markdown("####  Distribución de sentimiento")
            sent_counts = df["ai_sentiment"].fillna("neutro").value_counts().reset_index()
            sent_counts.columns = ["sentimiento", "count"]
            colors_sent = [SENTIMENT_COLORS.get(s, MUTED) for s in sent_counts["sentimiento"]]
            fig_sent = go.Figure(go.Pie(
                labels=sent_counts["sentimiento"],
                values=sent_counts["count"],
                marker_colors=colors_sent,
                hole=0.55,
                textinfo="label+percent",
                textfont=dict(color=TEXT, size=12),
            ))
            fig_sent.update_layout(
                paper_bgcolor=BG2, height=280,
                margin=dict(l=10, r=10, t=10, b=10),
                showlegend=False,
                font=dict(color=TEXT),
            )
            st.plotly_chart(fig_sent, use_container_width=True)

        # Categorías
        with col_cat:
            st.markdown("#### ️ Distribución por categoría")
            cat_counts = df["ai_category"].fillna("otro").value_counts().head(10).reset_index()
            cat_counts.columns = ["categoría", "count"]
            cat_counts["icon"] = cat_counts["categoría"].map(CATEGORY_ICONS).fillna("")
            cat_counts["label"] = cat_counts["icon"] + " " + cat_counts["categoría"]

            fig_cat = px.bar(
                cat_counts,
                x="count", y="label",
                orientation="h",
                color="count",
                color_continuous_scale=[[0, BG3], [1, PURPLE]],
                template="plotly_dark",
                text="count",
            )
            fig_cat.update_layout(
                paper_bgcolor=BG2, plot_bgcolor=BG2, height=280,
                margin=dict(l=0, r=0, t=10, b=0),
                coloraxis_showscale=False,
                font=dict(color=TEXT, size=11),
                xaxis=dict(gridcolor=BORDER, title=""),
                yaxis=dict(gridcolor="rgba(0,0,0,0)", title=""),
            )
            fig_cat.update_traces(textposition="outside", textfont_color=TEXT2)
            st.plotly_chart(fig_cat, use_container_width=True)

        # Relevancia por región
        st.markdown("#### Relevancia media por región y sentimiento")
        heat_data = df.groupby(["source_region", "ai_sentiment"]).agg(
            count=("title", "count"),
            relevancia=("ai_relevance", "mean"),
        ).reset_index()
        heat_data["región"] = heat_data["source_region"].map(REGION_LABELS)
        heat_data["relevancia"] = heat_data["relevancia"].round(1)

        fig_heat = px.density_heatmap(
            heat_data,
            x="ai_sentiment",
            y="región",
            z="relevancia",
            color_continuous_scale=[[0, BG3], [0.5, hex_to_rgba(BLUE, 0.7)], [1, CYAN]],
            template="plotly_dark",
            text_auto=True,
        )
        fig_heat.update_layout(
            paper_bgcolor=BG, plot_bgcolor=BG2, height=320,
            margin=dict(l=0, r=0, t=10, b=0),
            font=dict(color=TEXT, size=11),
            xaxis=dict(title="Sentimiento"),
            yaxis=dict(title=""),
            coloraxis_colorbar=dict(title="Relevancia", tickfont=dict(color=TEXT2)),
        )
        st.plotly_chart(fig_heat, use_container_width=True)

        # Top topics
        st.markdown("####  Temas más frecuentes")
        if ni:
            try:
                topics_data = ni.get_top_topics(hours_back=hours_back)
                topics_df = pd.DataFrame(topics_data)
            except Exception:
                topics_df = pd.DataFrame()
        else:
            topics_df = pd.DataFrame()

        if topics_df.empty:
            # Extraer de demo
            if "ai_topics" in df.columns:
                all_topics: list[str] = []
                for t in df["ai_topics"].dropna():
                    if isinstance(t, list):
                        all_topics.extend(t)
                    elif isinstance(t, str):
                        all_topics.extend(t.split(","))
                from collections import Counter
                top_topics = Counter(all_topics).most_common(20)
                topics_df = pd.DataFrame(top_topics, columns=["topic", "cnt"])

        if not topics_df.empty:
            fig_topics = px.bar(
                topics_df.head(15),
                x="cnt", y="topic",
                orientation="h",
                color="cnt",
                color_continuous_scale=[[0, BG3], [1, AMBER]],
                template="plotly_dark",
            )
            fig_topics.update_layout(
                paper_bgcolor=BG, plot_bgcolor=BG2, height=360,
                margin=dict(l=0, r=0, t=10, b=0),
                coloraxis_showscale=False,
                font=dict(color=TEXT, size=11),
                xaxis=dict(gridcolor=BORDER, title="Menciones"),
                yaxis=dict(gridcolor="rgba(0,0,0,0)", title=""),
            )
            st.plotly_chart(fig_topics, use_container_width=True)


# ════════════════════════════════════════════════════════════════════════════════
# TAB 3 — ÚLTIMAS NOTICIAS
# ════════════════════════════════════════════════════════════════════════════════
with tab_news:
    if df.empty:
        st.info("No hay noticias para los filtros seleccionados.")
    else:
        # Buscador
        search = st.text_input(" Buscar en títulos y resúmenes", placeholder="ej: elecciones, economía, Sánchez…")
        col_s1, col_s2 = st.columns([1, 4])
        with col_s1:
            sort_by = st.selectbox("Ordenar por", ["scraped_at", "ai_relevance"])

        df_news = df.copy()
        if search:
            mask = (
                df_news["title"].str.contains(search, case=False, na=False)
                | df_news.get("ai_summary", pd.Series(dtype=str)).str.contains(search, case=False, na=False)
            )
            df_news = df_news[mask]

        df_news = df_news.sort_values(sort_by, ascending=False).head(200)

        st.markdown(f"**{len(df_news)} artículos**")

        for _, row in df_news.head(50).iterrows():
            sentiment = row.get("ai_sentiment", "neutro") or "neutro"
            s_color = SENTIMENT_COLORS.get(sentiment, MUTED)
            cat = row.get("ai_category", "otro") or "otro"
            icon = CATEGORY_ICONS.get(cat, "")
            relevance = row.get("ai_relevance", 5) or 5
            region_label = REGION_LABELS.get(row.get("source_region", ""), row.get("source_region", ""))

            summary_html = ""
            if row.get("ai_summary"):
                summary_html = f'<p style="color:{TEXT2};font-size:0.82rem;margin:4px 0 0 0">{row["ai_summary"]}</p>'

            st.markdown(
                f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {s_color};
                            border-radius:6px;padding:10px 14px;margin:6px 0">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <a href="{row.get('url','#')}" target="_blank"
                       style="color:{TEXT};font-weight:600;font-size:0.88rem;text-decoration:none;flex:1">
                      {row.get('title','Sin título')}
                    </a>
                    <span style="color:{CYAN};font-size:0.75rem;margin-left:12px;white-space:nowrap">
                      {relevance}
                    </span>
                  </div>
                  {summary_html}
                  <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
                    <span style="background:{BG3};color:{TEXT2};font-size:0.72rem;padding:2px 8px;border-radius:10px">
                       {row.get('source_name','')}
                    </span>
                    <span style="background:{BG3};color:{TEXT2};font-size:0.72rem;padding:2px 8px;border-radius:10px">
                      {region_label}
                    </span>
                    <span style="background:{BG3};color:{s_color};font-size:0.72rem;padding:2px 8px;border-radius:10px">
                      {sentiment}
                    </span>
                    <span style="background:{BG3};color:{TEXT2};font-size:0.72rem;padding:2px 8px;border-radius:10px">
                      {icon} {cat}
                    </span>
                  </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

        if len(df_news) > 50:
            st.caption(f"Mostrando 50 de {len(df_news)} artículos. Aplica filtros para reducir.")


# ════════════════════════════════════════════════════════════════════════════════
# TAB 4 — INGESTA / PIPELINE STATUS
# ════════════════════════════════════════════════════════════════════════════════
with tab_ingest:
    st.markdown("#### ️ Estado del pipeline de ingesta")

    col_i1, col_i2, col_i3 = st.columns(3)
    with col_i1:
        st.markdown(
            f"""<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;padding:16px">
            <div style="color:{TEXT2};font-size:0.78rem;margin-bottom:4px">TOTAL ARTÍCULOS</div>
            <div style="color:{CYAN};font-size:2rem;font-weight:700">{stats.get('total_articles','—')}</div>
            </div>""",
            unsafe_allow_html=True,
        )
    with col_i2:
        st.markdown(
            f"""<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;padding:16px">
            <div style="color:{TEXT2};font-size:0.78rem;margin-bottom:4px">ÚLTIMA HORA</div>
            <div style="color:{GREEN};font-size:2rem;font-weight:700">{stats.get('last_hour','—')}</div>
            </div>""",
            unsafe_allow_html=True,
        )
    with col_i3:
        last_scraped = stats.get("last_scraped", "—")
        st.markdown(
            f"""<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;padding:16px">
            <div style="color:{TEXT2};font-size:0.78rem;margin-bottom:4px">ÚLTIMA INGESTA</div>
            <div style="color:{AMBER};font-size:1rem;font-weight:600;margin-top:8px">{str(last_scraped)[:19]}</div>
            </div>""",
            unsafe_allow_html=True,
        )

    st.markdown("---")
    st.markdown("####  Fuentes configuradas (350)")

    # Tabla de fuentes
    sources_df = pd.DataFrame(ALL_SOURCES)[["name", "region", "country", "url"]]
    sources_df["region"] = sources_df["region"].map(REGION_LABELS)

    region_sel = st.selectbox(
        "Filtrar por región",
        ["Todas"] + list(REGION_LABELS.values()),
        key="ingest_region_filter",
    )
    if region_sel != "Todas":
        sources_df = sources_df[sources_df["region"] == region_sel]

    st.dataframe(
        sources_df.rename(columns={"name": "Medio", "region": "Región", "country": "País", "url": "URL"}),
        use_container_width=True,
        hide_index=True,
        height=400,
    )

    st.markdown("---")
    st.markdown("####  Control manual de ingesta")

    db_ok = ni is not None

    if not db_ok:
        st.warning(
            "️ Módulo de ingesta no disponible. "
            "Asegúrate de que PostgreSQL y las dependencias están instaladas: "
            "`pip install feedparser httpx psycopg2-binary apscheduler`"
        )

    c_init, c_prio, c_full = st.columns(3)

    with c_init:
        if st.button("️ Inicializar BD", disabled=not db_ok, use_container_width=True):
            with st.spinner("Creando tablas..."):
                ni.init_db()
            st.success("Esquema news_articles creado")

    with c_prio:
        if st.button("Ingestar prioritarias (ES+EU)", disabled=not db_ok, use_container_width=True):
            with st.spinner("Ingesta prioritaria en curso (~150 fuentes)..."):
                result = ni.ingest_priority(use_ollama=True)
            st.success(
                f"Completado: {result['inserted']} nuevos, "
                f"{result['skipped']} omitidos, {result['errors']} errores"
            )
            st.cache_data.clear()

    with c_full:
        if st.button("Ingestar todas (350 fuentes)", disabled=not db_ok, use_container_width=True):
            with st.spinner("Ingesta completa en curso (~350 fuentes, puede tardar varios minutos)..."):
                result = ni.ingest_all_sources(use_ollama=True)
            st.success(
                f"Completado: {result['inserted']} nuevos, "
                f"{result['skipped']} omitidos, {result['errors']} errores"
            )
            st.cache_data.clear()

    st.markdown("---")
    st.markdown("####  Comandos del scheduler")
    st.code(
        "# Iniciar scheduler daemon (corre en segundo plano)\n"
        "python -m dashboard.workers.news_scheduler\n\n"
        "# Una sola ingesta prioritaria y sale\n"
        "python -m dashboard.workers.news_scheduler --once --priority-only\n\n"
        "# Ingesta completa única (sin Ollama, más rápido)\n"
        "python -m dashboard.workers.news_scheduler --once --no-ollama\n\n"
        "# Variables de entorno\n"
        "NEWS_PRIORITY_INTERVAL_MIN=30   # cada cuántos minutos fuentes ES+EU\n"
        "NEWS_FULL_INTERVAL_HOURS=2      # cada cuántas horas todo el mundo\n"
        "NEWS_OLLAMA_ENABLED=true        # activar análisis AI\n"
        "OLLAMA_MODEL=llama3.2           # modelo Ollama a usar\n"
        "OLLAMA_BASE_URL=http://localhost:11434",
        language="bash",
    )
