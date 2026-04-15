"""Visualizaciones de escaños."""

from __future__ import annotations

import math

import pandas as pd
import plotly.graph_objects as go


def create_parliament_chart(seat_distribution: dict[str, int], total_seats: int = 350, title: str = "Congreso de los Diputados") -> go.Figure:
    """Dibuja hemiciclo simplificado con puntos scatter."""
    fig = go.Figure()
    seats = []
    for party, n in seat_distribution.items():
        seats.extend([party] * n)
    for i, party in enumerate(seats):
        theta = math.pi * (i / max(len(seats), 1))
        r = 0.4 + 0.6 * ((i % 20) / 20)
        fig.add_trace(go.Scatter(x=[r * math.cos(theta)], y=[r * math.sin(theta)], mode="markers", name=party, showlegend=False))
    fig.update_layout(title=title)
    return fig


def create_seat_distribution_violin(seat_simulations: pd.DataFrame, parties: list[str] | None = None) -> go.Figure:
    """Violin horizontal de distribución de escaños simulados."""
    fig = go.Figure()
    if seat_simulations.empty:
        return fig
    cols = parties or list(seat_simulations.columns)
    for party in cols:
        fig.add_trace(go.Violin(x=seat_simulations[party], name=party, orientation="h", box_visible=True, meanline_visible=True))
    return fig

