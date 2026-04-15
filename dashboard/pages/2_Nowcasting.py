"""
Página: Nowcasting Electoral

Muestra la estimación agregada de voto con intervalos de confianza,
evolución temporal por partido y house effects de las encuestadoras.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav, COLORES_PARTIDOS,
    BG, BG2, BORDER, CYAN, TEXT, TEXT2, MUTED,
)

from dashboard.db import cargar_nowcasting, cargar_serie_nowcasting


def _normalizar_columnas(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    ren = {
        "estimación_pct": "estimacion_pct",
        "estimacion": "estimacion_pct",
        "fecha_estimación": "fecha_estimacion",
        "fecha_calculo": "fecha_estimacion",
        "ic95_inf": "ic_95_inf",
        "ic95_sup": "ic_95_sup",
    }
    cols = {c: ren[c] for c in df.columns if c in ren}
    return df.rename(columns=cols)

st.set_page_config(page_title="Nowcasting — ElectSim", layout="wide")

sidebar_nav()
st.title("Nowcasting Electoral")
st.markdown("Agregacion ponderada de encuestas con correccion de house effects y decay temporal.")

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Configuración")
    dias = st.slider("Ventana temporal (dias)", 30, 365, 90)
    top_n = st.slider("Numero de partidos", 4, 12, 7)

# ── Estimación actual ─────────────────────────────────────────────────────────
df_nc = cargar_nowcasting()
df_nc = _normalizar_columnas(df_nc)

if df_nc.empty or "estimacion_pct" not in df_nc.columns:
    st.info("Sin datos de nowcasting. Ejecuta `python -m pipelines.fase2_modelos` para generarlos.")
    st.stop()

st.subheader("Estimación de Voto Actual con IC 95%")
df_nc_top = df_nc.head(top_n)

# COLORES_PARTIDOS ya importado de shared

fig = go.Figure()
for _, row in df_nc_top.iterrows():
    siglas = row["partido_siglas"]
    color = COLORES_PARTIDOS.get(siglas.upper(), "#888888")
    fig.add_trace(go.Bar(
        name=siglas,
        x=[siglas],
        y=[row["estimacion_pct"]],
        marker_color=color,
        error_y=dict(
            type="data",
            symmetric=False,
            array=[max(0, row["ic_95_sup"] - row["estimacion_pct"])],
            arrayminus=[max(0, row["estimacion_pct"] - row["ic_95_inf"])],
            color="#444444",
            thickness=2,
        ),
        text=[f"{row['estimacion_pct']:.1f}%"],
        textposition="outside",
    ))

fig.update_layout(
    barmode="group",
    height=400,
    xaxis_title="Partido",
    yaxis_title="% Voto estimado",
    plot_bgcolor="rgba(0,0,0,0)",
    paper_bgcolor="rgba(0,0,0,0)",
    xaxis=dict(color=TEXT2, gridcolor=BORDER),
    yaxis=dict(color=TEXT2, gridcolor=BORDER),
    font=dict(color=TEXT2, family="Inter, sans-serif"),
    showlegend=False,
    margin=dict(t=30, b=20),
)
st.plotly_chart(fig, use_container_width=True)

# ── Metricas resumen ──────────────────────────────────────────────────────────
cols = st.columns(top_n)
for i, (_, row) in enumerate(df_nc_top.iterrows()):
    with cols[i % top_n]:
        delta = f"IC [{row['ic_95_inf']:.1f}, {row['ic_95_sup']:.1f}]"
        st.metric(
            label=row["partido_siglas"],
            value=f"{row['estimacion_pct']:.1f}%",
            help=delta,
        )

st.divider()

# ── Serie temporal ────────────────────────────────────────────────────────────
st.subheader("Evolución Temporal del Nowcasting")
partidos_disponibles = df_nc_top["partido_siglas"].tolist()
partidos_sel = st.multiselect("Partidos a mostrar", partidos_disponibles, default=partidos_disponibles[:4])

if partidos_sel:
    fig_ts = go.Figure()
    for partido in partidos_sel:
        df_serie = cargar_serie_nowcasting(partido, dias)
        df_serie = _normalizar_columnas(df_serie)
        if df_serie.empty:
            continue
        if "fecha_estimacion" not in df_serie.columns or "estimacion_pct" not in df_serie.columns:
            continue
        color = COLORES_PARTIDOS.get(partido.upper(), "#888888")
        r, g, b = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
        # Banda IC
        fig_ts.add_trace(go.Scatter(
            x=pd.concat([df_serie["fecha_estimacion"], df_serie["fecha_estimacion"].iloc[::-1]]),
            y=pd.concat([df_serie["ic_95_sup"], df_serie["ic_95_inf"].iloc[::-1]]),
            fill="toself", fillcolor=f"rgba({r},{g},{b},0.15)",
            line=dict(color="rgba(255,255,255,0)"),
            showlegend=False, hoverinfo="skip",
        ))
        # Linea central
        fig_ts.add_trace(go.Scatter(
            x=df_serie["fecha_estimacion"],
            y=df_serie["estimacion_pct"],
            name=partido,
            mode="lines+markers",
            line=dict(width=2, color=color),
            marker=dict(color=color),
        ))

    fig_ts.update_layout(
        height=420,
        xaxis_title="Fecha",
        yaxis_title="% Voto estimado",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(color=TEXT2, gridcolor=BORDER),
        yaxis=dict(color=TEXT2, gridcolor=BORDER),
        font=dict(color=TEXT2, family="Inter, sans-serif"),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color=TEXT2)),
        hovermode="x unified",
        margin=dict(t=20, b=20),
    )
    st.plotly_chart(fig_ts, use_container_width=True)
else:
    st.info("Seleccióna al menos un partido")

st.divider()

# ── Tabla de estimaciónes ─────────────────────────────────────────────────────
st.subheader("Detalle de Estimaciónes")
cols_show = ["partido_siglas", "estimacion_pct", "ic_95_inf", "ic_95_sup", "n_encuestas"]
cols_show = [c for c in cols_show if c in df_nc.columns]
st.dataframe(
    df_nc[cols_show].rename(columns={
        "partido_siglas": "Partido",
        "estimacion_pct": "Estimación (%)",
        "ic_95_inf": "IC 95% Inf",
        "ic_95_sup": "IC 95% Sup",
        "n_encuestas": "N Encuestas",
    }).round(2),
    hide_index=True,
    use_container_width=True,
)

st.caption("Nowcasting: agregacion con decay exp(-λ·dias), correccion house effects, ponderacion sqrt(N muestra)")
