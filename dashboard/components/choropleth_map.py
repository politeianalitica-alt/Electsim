"""
Choropleth Map — Bloque 7.

Componente Streamlit para mapas coropléticos de España.
Usa Plotly Express (px.choropleth_mapbox o px.choropleth) con GeoJSON.

Si no hay geometrías disponibles, muestra una tabla como fallback.
Nunca lanza excepciones.
"""
from __future__ import annotations

import logging
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# Paletas de colores por tipo de dato
COLOR_SCALES = {
    "stress":       "Reds",
    "risk":         "OrRd",
    "opportunity":  "Greens",
    "swing":        "RdBu",
    "intensity":    "Blues",
    "priority":     "YlOrRd",
    "default":      "Viridis",
}

# Partido → color aproximado (para mapa ganador)
PARTY_COLORS = {
    "PP":     "#009DDC",
    "PSOE":   "#E4002B",
    "VOX":    "#63BE21",
    "SUMAR":  "#D4007F",
    "ERC":    "#F5A623",
    "JUNTS":  "#00A0E3",
    "PNV":    "#008000",
    "BILDU":  "#A7C536",
    "CC":     "#FFCF00",
    "BNG":    "#73C5E5",
}


def render_choropleth(
    geojson: dict,
    data: pd.DataFrame,
    territory_id_col: str = "territory_id",
    value_col: str = "value",
    label_col: str | None = None,
    title: str = "Mapa territorial",
    color_scale: str = "default",
    height: int = 500,
    center_lat: float = 40.4,
    center_lon: float = -3.7,
    zoom: int = 5,
    show_table_fallback: bool = True,
) -> None:
    """
    Renderiza un mapa coroplético en Streamlit.

    Args:
        geojson: GeoJSON FeatureCollection.
        data: DataFrame con datos a colorear.
        territory_id_col: Columna de IDs en data (debe coincidir con feature ids).
        value_col: Columna de valores para el color.
        label_col: Columna de etiquetas para el hover. Si None, usa territory_id_col.
        title: Título del mapa.
        color_scale: Nombre de paleta (stress/risk/opportunity/swing/intensity/priority/default).
        height: Altura en píxeles.
        center_lat, center_lon: Centro del mapa.
        zoom: Nivel de zoom inicial.
        show_table_fallback: Si True, muestra tabla si no hay geometrías.
    """
    import streamlit as st

    if data.empty or value_col not in data.columns:
        st.info(f"ℹ️ No hay datos para el mapa: {title}")
        return

    label = label_col or territory_id_col
    scale = COLOR_SCALES.get(color_scale, "Viridis")

    # ── Intentar Plotly choropleth ─────────────────────────────────────────────
    if geojson and geojson.get("features"):
        try:
            import plotly.express as px

            fig = px.choropleth_mapbox(
                data,
                geojson=geojson,
                locations=territory_id_col,
                color=value_col,
                color_continuous_scale=scale,
                hover_name=label if label in data.columns else territory_id_col,
                hover_data=[c for c in data.columns if c != territory_id_col],
                mapbox_style="carto-positron",
                center={"lat": center_lat, "lon": center_lon},
                zoom=zoom,
                opacity=0.75,
                title=title,
                height=height,
            )
            fig.update_layout(
                margin={"r": 0, "t": 40, "l": 0, "b": 0},
                coloraxis_colorbar={"title": value_col},
            )
            st.plotly_chart(fig, use_container_width=True)
            return
        except Exception as exc:
            logger.debug("choropleth plotly: %s", exc)

    # ── Fallback: choropleth clásico con ISO codes ────────────────────────────
    try:
        import plotly.express as px

        # Intentar extraer código ISO de territory_id (prov:28 → ES-...)
        data_plot = data.copy()
        if territory_id_col in data_plot.columns:
            data_plot["_code"] = data_plot[territory_id_col].apply(
                lambda x: x.split(":")[1] if ":" in str(x) else str(x)
            )
        else:
            data_plot["_code"] = data_plot.index.astype(str)

        fig = px.bar(
            data_plot.head(20).sort_values(value_col, ascending=True),
            x=value_col,
            y=label if label in data_plot.columns else territory_id_col,
            orientation="h",
            title=title,
            color=value_col,
            color_continuous_scale=scale,
            height=height,
        )
        fig.update_layout(margin={"r": 20, "t": 40, "l": 10, "b": 10})
        st.plotly_chart(fig, use_container_width=True)
        st.caption("⚠️ Geometrías no disponibles — mostrando gráfico de barras")
        return
    except Exception as exc:
        logger.debug("choropleth bar fallback: %s", exc)

    # ── Fallback final: tabla ─────────────────────────────────────────────────
    if show_table_fallback:
        st.subheader(title)
        display_cols = [territory_id_col, value_col]
        if label and label in data.columns and label != territory_id_col:
            display_cols.insert(1, label)
        st.dataframe(
            data[[c for c in display_cols if c in data.columns]]
            .sort_values(value_col, ascending=False)
            .head(20),
            use_container_width=True,
        )


def render_winner_map(
    geojson: dict,
    data: pd.DataFrame,
    territory_id_col: str = "territory_id",
    party_col: str = "leading_party",
    label_col: str | None = None,
    title: str = "Mapa de ganadores electorales",
    height: int = 500,
) -> None:
    """
    Renderiza mapa de ganadores por territorio (partido más votado).

    Args:
        geojson: GeoJSON FeatureCollection.
        data: DataFrame con partido ganador por territorio.
        territory_id_col: Columna de IDs.
        party_col: Columna con nombre del partido ganador.
        label_col: Columna de etiquetas hover.
        title: Título del mapa.
        height: Altura en píxeles.
    """
    import streamlit as st

    if data.empty or party_col not in data.columns:
        st.info(f"ℹ️ No hay datos de ganadores para: {title}")
        return

    # Asignar color numérico para plotly
    parties = data[party_col].dropna().unique().tolist()
    party_to_num = {p: i for i, p in enumerate(parties)}
    data_plot = data.copy()
    data_plot["_party_num"] = data_plot[party_col].map(party_to_num).fillna(-1)

    label = label_col or territory_id_col

    if geojson and geojson.get("features"):
        try:
            import plotly.express as px

            color_map = {
                p: PARTY_COLORS.get(p, "#AAAAAA")
                for p in parties
            }
            fig = px.choropleth_mapbox(
                data_plot,
                geojson=geojson,
                locations=territory_id_col,
                color=party_col,
                color_discrete_map=color_map,
                hover_name=label if label in data_plot.columns else territory_id_col,
                mapbox_style="carto-positron",
                center={"lat": 40.4, "lon": -3.7},
                zoom=5,
                opacity=0.75,
                title=title,
                height=height,
            )
            fig.update_layout(margin={"r": 0, "t": 40, "l": 0, "b": 0})
            st.plotly_chart(fig, use_container_width=True)
            return
        except Exception as exc:
            logger.debug("render_winner_map plotly: %s", exc)

    # Fallback: tabla
    st.subheader(title)
    display = [territory_id_col, party_col]
    if label and label in data.columns and label != territory_id_col:
        display.insert(1, label)
    st.dataframe(
        data[[c for c in display if c in data.columns]].head(20),
        use_container_width=True,
    )


def render_bubble_map(
    data: pd.DataFrame,
    lat_col: str = "lat",
    lon_col: str = "lon",
    size_col: str = "value",
    color_col: str | None = None,
    label_col: str = "name",
    title: str = "Mapa de burbujas",
    height: int = 500,
) -> None:
    """
    Renderiza mapa de burbujas proporcionales (scatter_mapbox).

    Útil para señales puntuales o municipios sin geometrías de polígono.
    """
    import streamlit as st

    if data.empty or lat_col not in data.columns or lon_col not in data.columns:
        st.info(f"ℹ️ No hay datos de coordenadas para: {title}")
        return

    data_plot = data.dropna(subset=[lat_col, lon_col]).copy()
    if data_plot.empty:
        st.info("ℹ️ Sin coordenadas válidas.")
        return

    try:
        import plotly.express as px

        fig = px.scatter_mapbox(
            data_plot,
            lat=lat_col,
            lon=lon_col,
            size=size_col if size_col in data_plot.columns else None,
            color=color_col if color_col and color_col in data_plot.columns else None,
            hover_name=label_col if label_col in data_plot.columns else None,
            mapbox_style="carto-positron",
            center={"lat": 40.4, "lon": -3.7},
            zoom=5,
            title=title,
            height=height,
            size_max=30,
        )
        fig.update_layout(margin={"r": 0, "t": 40, "l": 0, "b": 0})
        st.plotly_chart(fig, use_container_width=True)
    except Exception as exc:
        logger.debug("render_bubble_map: %s", exc)
        st.dataframe(data_plot.head(20), use_container_width=True)
