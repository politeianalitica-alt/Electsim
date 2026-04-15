"""Mapa electoral de España."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import plotly.express as px


def create_spain_choropleth(
    data: pd.DataFrame,
    value_col: str = "estimate",
    color_scale: str = "RdBu",
    title: str = "",
    geojson_path: str = "./data/static/spain_provinces.geojson",
):
    """Crea choropleth provincial/CCAA usando GeoJSON local."""
    if data.empty:
        return px.choropleth()
    if not Path(geojson_path).exists():
        return px.choropleth()
    fig = px.choropleth(
        data_frame=data,
        geojson=geojson_path,
        locations="territory_code",
        color=value_col,
        color_continuous_scale=color_scale,
        featureidkey="properties.code",
        hover_name="label" if "label" in data.columns else None,
        title=title,
    )
    fig.update_geos(fitbounds="locations", visible=False)
    return fig

