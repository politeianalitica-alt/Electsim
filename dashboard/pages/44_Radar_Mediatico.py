"""
Dashboard Radar Mediatico — Pagina 44
Tres paneles:
  1. Bubble chart de topics (BERTopic) por volumen y sesgo
  2. Mapa ideologico de medios (eje sesgo vs credibilidad)
  3. Framing narrativo + alertas FIMI

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

# ---------------------------------------------------------------------------
# Config pagina
# ---------------------------------------------------------------------------

st.set_page_config(
    page_title="Radar Mediatico | ElectSim",
    page_icon="[media]",
    layout="wide",
)

# ---------------------------------------------------------------------------
# CSS
# ---------------------------------------------------------------------------

st.markdown("""
<style>
.alerta-card {
    background: #1e1e2e;
    border-left: 4px solid #f38ba8;
    padding: 1rem 1.2rem;
    border-radius: 4px;
    margin-bottom: 0.8rem;
}
.alerta-card.fimi { border-left-color: #fab387; }
.alerta-card.hate { border-left-color: #f38ba8; }
.alerta-card.spike { border-left-color: #a6e3a1; }
.metric-tile {
    background: #1e1e2e;
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
}
.medio-tag {
    display: inline-block;
    background: #313244;
    border-radius: 4px;
    padding: 2px 8px;
    margin: 2px;
    font-size: 0.8rem;
}
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Carga de datos (cache 15 min)
# ---------------------------------------------------------------------------

DB_URL = os.getenv("DATABASE_URL", "")


@st.cache_data(ttl=900)
def cargar_articulos_recientes(horas: int = 24) -> pd.DataFrame:
    """Carga articulos de las ultimas N horas desde PostgreSQL."""
    if not DB_URL:
        return _demo_articulos()
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT url_hash, titulo, medio, fecha_pub,
                           categoria_iptc, score_sentimiento, score_sesgo,
                           score_credibilidad, frame_dominante, fimi_score,
                           topic_id, sentimiento_label
                    FROM articulos_prensa
                    WHERE creado_en >= NOW() - INTERVAL ':horas hours'
                    ORDER BY fecha_pub DESC
                    LIMIT 2000
                """.replace(":horas hours", f"{horas} hours"))
            )
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
        return df
    except Exception as exc:
        st.warning(f"DB no disponible: {exc} — mostrando demo")
        return _demo_articulos()


@st.cache_data(ttl=900)
def cargar_metricas_por_medio() -> pd.DataFrame:
    """Carga metricas agregadas por medio desde articulos_prensa."""
    if not DB_URL:
        return _demo_metricas_medio()
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT
                        ap.medio,
                        m.tendencia,
                        m.credibilidad,
                        COUNT(*) AS n_articulos,
                        AVG(ap.score_sesgo) AS sesgo_medio,
                        AVG(ap.score_sentimiento) AS sentimiento_medio,
                        SUM(CASE WHEN ap.fimi_score > 0 THEN 1 ELSE 0 END)::float / COUNT(*) AS pct_fimi
                    FROM articulos_prensa ap
                    LEFT JOIN medios_config m ON m.clave = ap.medio
                    WHERE ap.creado_en >= NOW() - INTERVAL '7 days'
                    GROUP BY ap.medio, m.tendencia, m.credibilidad
                    ORDER BY n_articulos DESC
                """)
            )
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
        return df
    except Exception:
        return _demo_metricas_medio()


@st.cache_data(ttl=900)
def cargar_topics_dashboard() -> pd.DataFrame:
    """Carga topics BERTopic con frecuencia."""
    if not DB_URL:
        return _demo_topics()
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(DB_URL)
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT
                        topic_id,
                        COUNT(*) AS n_articulos,
                        AVG(score_sesgo) AS sesgo_medio,
                        AVG(score_sentimiento) AS sentimiento_medio,
                        mode() WITHIN GROUP (ORDER BY frame_dominante) AS frame_top
                    FROM articulos_prensa
                    WHERE topic_id >= 0
                      AND creado_en >= NOW() - INTERVAL '48 hours'
                    GROUP BY topic_id
                    ORDER BY n_articulos DESC
                    LIMIT 20
                """)
            )
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
        return df
    except Exception:
        return _demo_topics()


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------

def _demo_articulos() -> pd.DataFrame:
    import random
    medios = ["elpais", "elmundo", "abc", "eldiario", "elconfidencial",
              "elespanol", "publico", "expansion", "larazon", "lavanguardia"]
    categorias = ["politics", "economy_business_finance", "conflict_war_peace",
                  "crime_law_justice", "society", "environment"]
    frames = ["POLICY", "ECONOMIC", "SECURITY", "IDENTITY", "FEAR", "PROGRESS"]
    sentimientos = ["positivo", "negativo", "neutral"]
    rows = []
    base_time = datetime.now(timezone.utc)
    for i in range(200):
        medio = random.choice(medios)
        rows.append({
            "url_hash": f"demo_{i:04d}",
            "titulo": f"Articulo de prueba {i+1} sobre politica espanola y economia",
            "medio": medio,
            "fecha_pub": (base_time - timedelta(hours=random.randint(0, 23))).isoformat(),
            "categoria_iptc": random.choice(categorias),
            "score_sentimiento": round(random.uniform(0.4, 0.95), 3),
            "score_sesgo": round(random.uniform(-0.8, 0.8), 3),
            "score_credibilidad": round(random.uniform(0.6, 0.9), 3),
            "frame_dominante": random.choice(frames),
            "fimi_score": round(random.uniform(0, 0.3) if random.random() < 0.1 else 0.0, 3),
            "topic_id": random.randint(0, 9),
            "sentimiento_label": random.choice(sentimientos),
        })
    return pd.DataFrame(rows)


def _demo_metricas_medio() -> pd.DataFrame:
    from etl.sources.prensa.fundus_client import MEDIOS_ESPANA
    import random
    rows = []
    for key, cfg in MEDIOS_ESPANA.items():
        sesgo = {
            "izquierda": -0.7, "centro_izquierda": -0.35,
            "centro": 0.0, "centro_derecha": 0.35,
            "derecha": 0.7, "economico": 0.1, "regional": 0.0,
        }.get(cfg.tendencia, 0.0) + random.uniform(-0.1, 0.1)
        rows.append({
            "medio": key,
            "nombre": cfg.nombre,
            "tendencia": cfg.tendencia,
            "credibilidad": cfg.credibilidad,
            "n_articulos": random.randint(10, 80),
            "sesgo_medio": round(sesgo, 3),
            "sentimiento_medio": round(random.uniform(0.4, 0.7), 3),
            "pct_fimi": round(random.uniform(0, 0.05), 3),
        })
    return pd.DataFrame(rows)


def _demo_topics() -> pd.DataFrame:
    import random
    seed_labels = [
        "economia_presupuesto", "politica_interior", "elecciones_voto",
        "territorial_cataluna", "seguridad_defensa", "exterior_ue",
        "energia_clima", "corrupcion_justicia", "vivienda_sociedad", "sanidad_pensiones",
    ]
    rows = []
    for i, label in enumerate(seed_labels):
        rows.append({
            "topic_id": i,
            "label": label,
            "n_articulos": random.randint(15, 120),
            "sesgo_medio": round(random.uniform(-0.5, 0.5), 3),
            "sentimiento_medio": round(random.uniform(0.4, 0.8), 3),
            "frame_top": random.choice(["POLICY", "ECONOMIC", "SECURITY", "IDENTITY"]),
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# UI
# ---------------------------------------------------------------------------

st.title("Radar Mediatico")
st.caption("Analisis de cobertura, sesgo y narrativas en prensa espanola — actualizado cada hora")

# Sidebar
with st.sidebar:
    st.subheader("Filtros")
    horas_ventana = st.slider("Ventana temporal (horas)", 6, 72, 24, step=6)
    medios_disponibles = list(pd.concat([
        cargar_metricas_por_medio()["medio"]
    ]).unique())
    medios_sel = st.multiselect("Medios", medios_disponibles, default=[])
    categorias_disponibles = [
        "politics", "economy_business_finance", "conflict_war_peace",
        "crime_law_justice", "society", "environment", "security",
    ]
    cat_sel = st.multiselect("Categorias IPTC", categorias_disponibles, default=[])
    solo_fimi = st.checkbox("Solo articulos con FIMI")
    st.divider()
    st.caption("Actualizado: " + datetime.now(timezone.utc).strftime("%H:%M UTC"))

# Carga de datos
df_arts = cargar_articulos_recientes(horas=horas_ventana)
df_medios = cargar_metricas_por_medio()
df_topics = cargar_topics_dashboard()

# Aplicar filtros
if medios_sel:
    df_arts = df_arts[df_arts["medio"].isin(medios_sel)]
if cat_sel:
    df_arts = df_arts[df_arts["categoria_iptc"].isin(cat_sel)]
if solo_fimi:
    df_arts = df_arts[df_arts["fimi_score"] > 0]

# ---------------------------------------------------------------------------
# KPIs
# ---------------------------------------------------------------------------

col1, col2, col3, col4, col5, col6 = st.columns(6)
n_total = len(df_arts)
n_medios_activos = df_arts["medio"].nunique() if not df_arts.empty else 0
n_fimi = int((df_arts["fimi_score"] > 0).sum()) if not df_arts.empty else 0
sesgo_medio = round(df_arts["score_sesgo"].mean(), 3) if not df_arts.empty else 0.0
pct_negativo = round(
    (df_arts["sentimiento_label"] == "negativo").sum() / max(n_total, 1) * 100, 1
) if not df_arts.empty else 0.0
n_topics_activos = df_arts["topic_id"].nunique() if not df_arts.empty else 0

col1.metric("Articulos", n_total)
col2.metric("Medios activos", n_medios_activos)
col3.metric("Alertas FIMI", n_fimi, delta=None)
col4.metric("Sesgo medio", f"{sesgo_medio:+.2f}")
col5.metric("Negatividad", f"{pct_negativo:.1f}%")
col6.metric("Topics activos", n_topics_activos)

st.divider()

# ---------------------------------------------------------------------------
# 3 paneles
# ---------------------------------------------------------------------------

tab1, tab2, tab3 = st.tabs(["Topics BERTopic", "Mapa Ideologico Medios", "Framing y FIMI"])

# ------------------------------------------------------------------
# Tab 1: Bubble chart de topics
# ------------------------------------------------------------------
with tab1:
    st.subheader("Temas dominantes en prensa (ultimas horas)")

    if df_topics.empty:
        st.info("Sin datos de topics disponibles.")
    else:
        # Merge con label si disponible
        fig_bubble = px.scatter(
            df_topics,
            x="sesgo_medio",
            y="sentimiento_medio",
            size="n_articulos",
            color="frame_top",
            hover_name="label" if "label" in df_topics.columns else "topic_id",
            hover_data={"n_articulos": True, "sesgo_medio": ":.2f", "sentimiento_medio": ":.2f"},
            labels={
                "sesgo_medio": "Sesgo (izq -1 / der +1)",
                "sentimiento_medio": "Positividad",
                "n_articulos": "Articulos",
                "frame_top": "Frame dominante",
            },
            title="Topics: volumen vs sesgo vs positividad",
            size_max=60,
            color_discrete_sequence=px.colors.qualitative.Set3,
        )
        fig_bubble.add_vline(x=0, line_dash="dot", line_color="gray")
        fig_bubble.add_hline(y=0.5, line_dash="dot", line_color="gray")
        fig_bubble.update_layout(
            paper_bgcolor="#1e1e2e",
            plot_bgcolor="#1e1e2e",
            font_color="#cdd6f4",
            height=500,
        )
        st.plotly_chart(fig_bubble, use_container_width=True)

    # Timeline de volumen por categoria
    if not df_arts.empty and "fecha_pub" in df_arts.columns:
        st.subheader("Volumen de articulos por categoria (ultimas 24h)")
        df_timeline = df_arts.copy()
        df_timeline["hora"] = pd.to_datetime(df_timeline["fecha_pub"]).dt.floor("h")
        timeline_pivot = df_timeline.groupby(["hora", "categoria_iptc"]).size().reset_index(name="n")
        fig_timeline = px.area(
            timeline_pivot,
            x="hora",
            y="n",
            color="categoria_iptc",
            labels={"hora": "Hora", "n": "Articulos", "categoria_iptc": "Categoria"},
        )
        fig_timeline.update_layout(
            paper_bgcolor="#1e1e2e",
            plot_bgcolor="#1e1e2e",
            font_color="#cdd6f4",
            height=350,
        )
        st.plotly_chart(fig_timeline, use_container_width=True)

# ------------------------------------------------------------------
# Tab 2: Mapa ideologico de medios
# ------------------------------------------------------------------
with tab2:
    st.subheader("Posicionamiento ideologico de medios")
    st.caption("Eje X: sesgo izquierda/derecha | Eje Y: credibilidad | Tamano: volumen")

    if df_medios.empty:
        st.info("Sin datos de medios disponibles.")
    else:
        # Añadir nombre legible si existe
        df_plot = df_medios.copy()
        if "nombre" not in df_plot.columns:
            df_plot["nombre"] = df_plot["medio"]

        color_tendencia = {
            "izquierda": "#f38ba8",
            "centro_izquierda": "#fab387",
            "centro": "#a6e3a1",
            "centro_derecha": "#89b4fa",
            "derecha": "#cba6f7",
            "economico": "#f9e2af",
            "regional": "#89dceb",
        }

        fig_mapa = px.scatter(
            df_plot,
            x="sesgo_medio",
            y="credibilidad",
            size="n_articulos",
            color="tendencia",
            text="nombre",
            hover_data={"n_articulos": True, "pct_fimi": ":.1%"},
            labels={
                "sesgo_medio": "Sesgo politico (izq -1 / der +1)",
                "credibilidad": "Credibilidad (MBFC)",
                "n_articulos": "Articulos (7 dias)",
                "tendencia": "Tendencia",
            },
            title="Mapa ideologico de medios espanoles",
            size_max=50,
            color_discrete_map=color_tendencia,
        )
        fig_mapa.update_traces(textposition="top center", textfont_size=9)
        fig_mapa.add_vline(x=0, line_dash="dash", line_color="gray")
        fig_mapa.add_hrect(y0=0.8, y1=1.0, fillcolor="green", opacity=0.05,
                           annotation_text="Alta credibilidad")
        fig_mapa.update_layout(
            paper_bgcolor="#1e1e2e",
            plot_bgcolor="#1e1e2e",
            font_color="#cdd6f4",
            height=500,
            xaxis={"range": [-1.1, 1.1]},
            yaxis={"range": [0.5, 1.0]},
        )
        st.plotly_chart(fig_mapa, use_container_width=True)

    # Tabla de medios
    if not df_medios.empty:
        st.subheader("Detalle por medio")
        cols_mostrar = [c for c in ["nombre", "medio", "tendencia", "credibilidad",
                                     "n_articulos", "sesgo_medio", "pct_fimi"]
                        if c in df_medios.columns]
        df_tabla = df_medios[cols_mostrar].sort_values("n_articulos", ascending=False)
        st.dataframe(
            df_tabla,
            use_container_width=True,
            column_config={
                "credibilidad": st.column_config.ProgressColumn("Credibilidad", min_value=0, max_value=1),
                "sesgo_medio": st.column_config.NumberColumn("Sesgo", format="%.2f"),
                "pct_fimi": st.column_config.NumberColumn("% FIMI", format="%.1%%"),
            },
        )

# ------------------------------------------------------------------
# Tab 3: Framing y FIMI
# ------------------------------------------------------------------
with tab3:
    st.subheader("Frames narrativos dominantes")

    if not df_arts.empty and "frame_dominante" in df_arts.columns:
        frame_counts = df_arts["frame_dominante"].value_counts().reset_index()
        frame_counts.columns = ["frame", "count"]

        fig_frames = px.bar(
            frame_counts,
            x="count",
            y="frame",
            orientation="h",
            color="count",
            color_continuous_scale="Blues",
            labels={"count": "Articulos", "frame": "Frame CAMEO"},
            title="Distribucion de frames narrativos",
        )
        fig_frames.update_layout(
            paper_bgcolor="#1e1e2e",
            plot_bgcolor="#1e1e2e",
            font_color="#cdd6f4",
            height=350,
            showlegend=False,
        )
        st.plotly_chart(fig_frames, use_container_width=True)

        # Framing por partido
        st.subheader("Framing segun partido mencionado")
        partidos = ["psoe", "pp", "vox", "podemos", "sumar"]
        data_partidos = []
        for partido in partidos:
            mask = df_arts["titulo"].str.lower().str.contains(partido, na=False)
            arts_partido = df_arts[mask]
            if not arts_partido.empty:
                frame_top = arts_partido["frame_dominante"].value_counts().index[0]
                sesgo = arts_partido["score_sesgo"].mean()
                data_partidos.append({
                    "partido": partido.upper(),
                    "n_articulos": len(arts_partido),
                    "frame_dominante": frame_top,
                    "sesgo_cobertura": round(float(sesgo), 3),
                    "pct_negativo": round((arts_partido["sentimiento_label"] == "negativo").mean() * 100, 1),
                })

        if data_partidos:
            df_partidos = pd.DataFrame(data_partidos)
            st.dataframe(df_partidos, use_container_width=True)

    # Alertas FIMI
    st.subheader("Alertas FIMI activas")
    if not df_arts.empty:
        arts_fimi = df_arts[df_arts["fimi_score"] > 0].head(10)
        if arts_fimi.empty:
            st.success("Sin alertas FIMI en el periodo seleccionado.")
        else:
            for _, row in arts_fimi.iterrows():
                severidad_color = "fimi" if row["fimi_score"] < 0.7 else "hate"
                st.markdown(
                    f'<div class="alerta-card {severidad_color}">'
                    f'<strong>{row.get("titulo", "")[:100]}</strong><br>'
                    f'Medio: {row.get("medio", "")} | '
                    f'Score FIMI: {row.get("fimi_score", 0):.2f} | '
                    f'Frame: {row.get("frame_dominante", "")}'
                    f'</div>',
                    unsafe_allow_html=True,
                )

    # Distribucion de sentimiento
    st.subheader("Distribucion de sentimiento por medio (top 10)")
    if not df_arts.empty and "sentimiento_label" in df_arts.columns:
        top_medios = df_arts["medio"].value_counts().head(10).index
        df_sent = df_arts[df_arts["medio"].isin(top_medios)]
        df_sent_pivot = df_sent.groupby(["medio", "sentimiento_label"]).size().reset_index(name="n")
        fig_sent = px.bar(
            df_sent_pivot,
            x="medio",
            y="n",
            color="sentimiento_label",
            barmode="stack",
            color_discrete_map={
                "positivo": "#a6e3a1",
                "neutral": "#9399b2",
                "negativo": "#f38ba8",
            },
            labels={"n": "Articulos", "medio": "Medio", "sentimiento_label": "Sentimiento"},
        )
        fig_sent.update_layout(
            paper_bgcolor="#1e1e2e",
            plot_bgcolor="#1e1e2e",
            font_color="#cdd6f4",
            height=350,
        )
        st.plotly_chart(fig_sent, use_container_width=True)
