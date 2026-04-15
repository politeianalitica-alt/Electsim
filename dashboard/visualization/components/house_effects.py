"""Dot plot de house effects."""

from __future__ import annotations

import pandas as pd
import plotly.express as px


def create_house_effects_dotplot(house_effects: dict[str, float]):
    """Dibuja house effects por encuestadora."""
    df = pd.DataFrame([{"pollster": k, "effect": v} for k, v in house_effects.items()])
    if df.empty:
        return px.scatter()
    return px.scatter(df, x="effect", y="pollster", color="effect")

