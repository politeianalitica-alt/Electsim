"""Panel macroeconómico 2x2."""

from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def create_economic_dashboard(macro_data: dict[str, pd.DataFrame], approval_data: pd.DataFrame | None = None) -> go.Figure:
    """Crea panel de paro, IPC, PIB y popularidad."""
    fig = make_subplots(rows=2, cols=2, subplot_titles=("Paro EPA", "IPC", "PIB", "Popularidad Gobierno"))
    if "unemployment" in macro_data and not macro_data["unemployment"].empty:
        df = macro_data["unemployment"]
        fig.add_trace(go.Scatter(x=df.iloc[:, 0], y=df.iloc[:, -1], line=dict(color="blue")), row=1, col=1)
    if "ipc" in macro_data and not macro_data["ipc"].empty:
        df = macro_data["ipc"]
        fig.add_trace(go.Scatter(x=df.iloc[:, 0], y=df.iloc[:, -1], line=dict(color="orange")), row=1, col=2)
    if "gdp" in macro_data and not macro_data["gdp"].empty:
        df = macro_data["gdp"]
        fig.add_trace(go.Bar(x=df.iloc[:, 0], y=df.iloc[:, -1], marker_color="green"), row=2, col=1)
    if approval_data is not None and not approval_data.empty:
        fig.add_trace(go.Scatter(x=approval_data["period"], y=approval_data["approval"], line=dict(color="red")), row=2, col=2)
    return fig

