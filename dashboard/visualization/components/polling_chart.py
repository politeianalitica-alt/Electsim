"""Gráficas de tendencia de encuestas."""

from __future__ import annotations

from datetime import date

import pandas as pd
import plotly.graph_objects as go

PARTY_COLORS = {
    "PP": "#0096D9",
    "PSOE": "#E4032E",
    "VOX": "#63BE21",
    "SUMAR": "#C23078",
    "CS": "#FF7500",
    "JUNTS": "#0060A8",
    "ERC": "#F4B301",
    "PNV": "#009944",
    "BILDU": "#B5CF18",
    "BNG": "#6B8F4E",
}


def create_polling_trend_chart(
    polling_average_df: pd.DataFrame,
    show_individual_polls: bool = True,
    polls_df: pd.DataFrame | None = None,
    height: int = 500,
) -> go.Figure:
    """Crea línea de tendencia con IC por partido."""
    fig = go.Figure()
    if polling_average_df.empty:
        return fig
    for party, g in polling_average_df.groupby("party"):
        col = PARTY_COLORS.get(party, "#999999")
        fig.add_trace(go.Scatter(x=g["date"], y=g["estimate"], mode="lines", name=party, line=dict(color=col)))
        fig.add_trace(go.Scatter(x=g["date"], y=g["ci_high"], mode="lines", line=dict(width=0), showlegend=False))
        fig.add_trace(
            go.Scatter(
                x=g["date"],
                y=g["ci_low"],
                mode="lines",
                fill="tonexty",
                fillcolor=col + "26",
                line=dict(width=0),
                showlegend=False,
            )
        )
    fig.update_layout(height=height, title="Intención de voto — Medias ponderadas", yaxis_range=[0, 50])
    return fig


def create_uncertainty_fan_chart(forecast_df: pd.DataFrame, target_date: date, party: str) -> go.Figure:
    """Crea fan chart de incertidumbre de forecast electoral."""
    fig = go.Figure()
    if forecast_df.empty:
        return fig
    g = forecast_df[forecast_df["party"] == party]
    fig.add_trace(go.Scatter(x=g["date"], y=g["p50"], mode="lines", name=f"{party} mediana"))
    fig.add_trace(go.Scatter(x=g["date"], y=g["p95"], mode="lines", line=dict(width=0), showlegend=False))
    fig.add_trace(go.Scatter(x=g["date"], y=g["p05"], mode="lines", fill="tonexty", line=dict(width=0), showlegend=False))
    return fig

