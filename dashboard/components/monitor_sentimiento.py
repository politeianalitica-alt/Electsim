from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.db import (
    cargar_alertas_sentimiento,
    cargar_heatmap_fuente_partido,
    cargar_sentimiento_serie,
)
from dashboard.shared import COLORES_PARTIDOSS, MUTED, color_partido


def render_monitor_sentimiento(conn) -> None:
    st.header("▦  Monitor de Sentimiento de Prensa")

    df_serie = cargar_sentimiento_serie(conn)
    df_heatmap = cargar_heatmap_fuente_partido(conn)
    df_alertas = cargar_alertas_sentimiento(conn)

    if not df_alertas.empty:
        with st.expander("△  Alertas de cobertura negativa (últimos 7 días)", expanded=True):
            for _, row in df_alertas.iterrows():
                partido = str(row.get("partido", ""))
                color = color_partido(partido) if partido else MUTED
                try:
                    sent = float(row.get("sentimiento", 0.0))
                except Exception:
                    sent = 0.0
                n_news = int(pd.to_numeric(row.get("n_noticias"), errors="coerce") or 0)
                st.markdown(
                    f"<span style='color:{color};font-weight:700'>{partido}</span> "
                    f"— {row.get('fuente_id','desconocida')} — {row.get('fecha','')} — "
                    f"sentimiento: <strong>{sent:.2f}</strong> ({n_news} noticias)",
                    unsafe_allow_html=True,
                )

    if df_serie.empty:
        st.info("Sin datos de sentimiento en los últimos 30 días.")
        return

    partidos_disponibles = sorted(df_serie["partido"].dropna().astype(str).unique().tolist())
    if not partidos_disponibles:
        st.info("No hay partidos disponibles para graficar.")
        return

    default_sel = partidos_disponibles[: min(5, len(partidos_disponibles))]
    seleccion = st.multiselect(
        "Partidos a mostrar",
        options=partidos_disponibles,
        default=default_sel,
    )
    df_filtrado = df_serie[df_serie["partido"].astype(str).isin(seleccion)]

    if df_filtrado.empty:
        st.info("Selecciona al menos un partido para mostrar la serie temporal.")
    else:
        fig_serie = px.line(
            df_filtrado,
            x="fecha",
            y="sentimiento",
            color="partido",
            color_discrete_map=COLORES_PARTIDOS,
            title="Sentimiento diario en prensa por partido (30 días)",
            labels={"sentimiento": "Sentimiento medio", "fecha": ""},
        )
        fig_serie.add_hline(y=0, line_dash="dot", line_color="gray", opacity=0.5)
        fig_serie.update_layout(
            yaxis=dict(range=[-1, 1]),
            legend=dict(orientation="h", yanchor="bottom", y=1.02),
            height=380,
        )
        st.plotly_chart(fig_serie, use_container_width=True)

    if not df_heatmap.empty:
        st.subheader("Cobertura por medio y partido")
        pivot = df_heatmap.pivot(index="fuente_id", columns="partido", values="sentimiento")
        fig_heat = go.Figure(
            go.Heatmap(
                z=pivot.values,
                x=pivot.columns.tolist(),
                y=pivot.index.tolist(),
                colorscale=[
                    [0.0, "#c0392b"],
                    [0.4, "#e8e8e8"],
                    [0.6, "#e8e8e8"],
                    [1.0, "#27ae60"],
                ],
                zmid=0,
                text=pd.DataFrame(pivot.values).round(2).values,
                texttemplate="%{text}",
                hovertemplate="Medio: %{y}<br>Partido: %{x}<br>Sentimiento: %{z:.2f}<extra></extra>",
            )
        )
        fig_heat.update_layout(
            title="Sentimiento medio: medio × partido (30 días)",
            height=max(300, len(pivot) * 40),
        )
        st.plotly_chart(fig_heat, use_container_width=True)
