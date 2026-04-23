from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.db import (  # noqa: E402
    cargar_alertas_mediaticas,
    cargar_monitor_serie,
    get_conn,
)
from dashboard.shared import (  # noqa: E402
    GREEN,
    RED,
    TEXT2,
    AMBER,
    kpi_card,
    safe_numeric,
    section_header,
    semaforo_color,
    sidebar_nav,
)

st.set_page_config(page_title="Monitor Medios & RRSS", layout="wide")
sidebar_nav()

section_header("Monitor de Medios y RRSS")
st.caption("Radar operativo por objeto de seguimiento, canal y ventana temporal.")


def _cargar_opciones_objeto(tipo_objeto: str) -> list[str]:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT valor
                FROM objetos_seguimiento
                WHERE activo = true
                  AND tipo = %s
                ORDER BY valor
                """,
                (tipo_objeto,),
            )
            return [str(r[0]) for r in cur.fetchall() if r and r[0] is not None]
    except Exception:
        return []
    finally:
        try:
            conn.close()
        except Exception:
            pass


with st.sidebar:
    st.subheader("Filtro")
    tipo_objeto = st.selectbox(
        "Tipo de objeto",
        ["partido", "persona", "tema", "grupo_social", "evento", "palabra"],
        index=0,
    )
    opciones = _cargar_opciones_objeto(tipo_objeto)
    canal = st.selectbox(
        "Canal",
        [None, "rss", "x", "youtube", "newsapi"],
        format_func=lambda x: "Todos" if x is None else str(x).upper(),
    )
    ventana_dias = st.slider("Ventana (días)", min_value=7, max_value=90, value=30, step=1)

if opciones:
    col_a, col_b = st.columns([2, 1])
    with col_a:
        valor_select = st.selectbox("Objeto monitorizado", opciones)
    with col_b:
        valor_extra = st.text_input("O escribe uno", "")
    valor_objeto = valor_extra.strip() or valor_select
else:
    valor_objeto = st.text_input("Objeto monitorizado", "PP")

df = cargar_monitor_serie(
    objeto_tipo=tipo_objeto,
    objeto_valor=valor_objeto,
    canal=canal,
    ventana_dias=ventana_dias,
)

if df.empty:
    st.info(
        f"Sin datos para `{valor_objeto}` en los últimos {ventana_dias} días. "
        "Ejecuta el pipeline de monitorización y revisa objetos de seguimiento."
    )
else:
    df = safe_numeric(df, ["n_menciones", "sent_medio"])
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df = df.dropna(subset=["fecha"]).sort_values("fecha")

    total_menciones = int(df["n_menciones"].sum())
    sent_medio = float(df["sent_medio"].mean()) if not df["sent_medio"].empty else 0.0
    pico = df.sort_values("n_menciones", ascending=False).head(1)
    pico_txt = str(pico.iloc[0]["fecha"].date()) if not pico.empty else "—"

    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown(kpi_card("Menciones", f"{total_menciones:,}", f"{ventana_dias} días"), unsafe_allow_html=True)
    with c2:
        color = semaforo_color(sent_medio, thr_ok=0.15, thr_warn=-0.1, higher_is_better=True)
        st.markdown(kpi_card("Sentimiento medio", f"{sent_medio:+.2f}", color=color), unsafe_allow_html=True)
    with c3:
        st.markdown(kpi_card("Pico de actividad", pico_txt, "día con más menciones"), unsafe_allow_html=True)

    c4, c5 = st.columns([1.5, 1])
    with c4:
        fig_vol = px.bar(
            df,
            x="fecha",
            y="n_menciones",
            labels={"fecha": "Fecha", "n_menciones": "Menciones"},
            color_discrete_sequence=["#1DA1F2"],
        )
        fig_vol.update_layout(height=320, margin=dict(t=10, b=10))
        st.plotly_chart(fig_vol, use_container_width=True)

    with c5:
        fig_sent = go.Figure()
        fig_sent.add_trace(
            go.Scatter(
                x=df["fecha"],
                y=df["sent_medio"],
                mode="lines+markers",
                line=dict(color="#00D4FF", width=2),
                marker=dict(size=6),
                name="Sentimiento",
            )
        )
        fig_sent.add_hline(y=0.0, line_dash="dot", line_color="#64748b", annotation_text="Neutral")
        fig_sent.update_layout(
            height=320,
            margin=dict(t=10, b=10),
            yaxis_title="Score",
            xaxis_title="Fecha",
        )
        st.plotly_chart(fig_sent, use_container_width=True)

st.markdown("---")
section_header("Alertas mediáticas")
df_alertas = cargar_alertas_mediaticas(solo_no_leidas=True, limite=50)
if df_alertas.empty:
    st.success("Sin alertas pendientes.")
else:
    for _, row in df_alertas.iterrows():
        motivo = str(row.get("motivo", "")).strip()
        valor = str(row.get("valor", ""))
        canal_txt = str(row.get("canal", "all")).upper()
        magnitud = row.get("magnitud", 0)
        fecha = row.get("fecha")
        if motivo in {"spike_volumen", "aceleracion"}:
            color = RED
            icon = "🔴"
        elif motivo in {"caida_sentiment", "sentiment_negativo"}:
            color = AMBER
            icon = "🟠"
        else:
            color = GREEN
            icon = "🟢"
        st.markdown(
            f"<div style='border:1px solid {color};border-radius:10px;padding:.7rem .9rem;margin-bottom:.5rem'>"
            f"<div style='font-weight:700'>{icon} {motivo}</div>"
            f"<div style='font-size:.9rem;color:{TEXT2}'>objeto: <b>{valor}</b> · canal: {canal_txt} · "
            f"magnitud: {float(magnitud or 0):.2f} · fecha: {fecha}</div>"
            f"</div>",
            unsafe_allow_html=True,
        )

