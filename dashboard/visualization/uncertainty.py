"""Helpers visuales de incertidumbre."""

from __future__ import annotations

import plotly.graph_objects as go


def add_ci_band(fig: go.Figure, x, low, high, color: str, name: str) -> go.Figure:
    """Añade banda de confianza semitransparente."""
    fig.add_trace(go.Scatter(x=x, y=high, line=dict(width=0), showlegend=False, hoverinfo="skip"))
    fig.add_trace(
        go.Scatter(
            x=x,
            y=low,
            fill="tonexty",
            fillcolor=color,
            line=dict(width=0),
            name=name,
            hoverinfo="skip",
            showlegend=False,
        )
    )
    return fig

