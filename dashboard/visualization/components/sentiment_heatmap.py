"""Heatmap de sentimiento por partido y día."""

from __future__ import annotations

import pandas as pd
import plotly.express as px


def create_sentiment_heatmap(df: pd.DataFrame) -> px.imshow:
    """Construye heatmap temporal de sentimiento."""
    if df.empty:
        return px.imshow([[0]], title="Sin datos")
    pivot = df.pivot_table(index="party", columns="created_at", values="sentiment_score", aggfunc="mean")
    return px.imshow(pivot, color_continuous_scale="RdYlGn", aspect="auto")

