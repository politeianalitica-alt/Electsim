"""
Maps — Bloque 12.

Mapas coropletas, de puntos y territoriales.
Usa Plotly (coropletas simples) o PyDeck/Folium si disponibles.
Fallback a tabla/ranking si no hay geometrías.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import BG2, BORDER, CYAN, GREEN, AMBER, RED, TEXT, TEXT2, MUTED
from dashboard.ui.empty_states import no_data_state, missing_dependency_state

logger = logging.getLogger(__name__)


def _has_plotly() -> bool:
    try:
        import plotly  # noqa: F401
        return True
    except ImportError:
        return False


def _has_pydeck() -> bool:
    try:
        import pydeck  # noqa: F401
        return True
    except ImportError:
        return False


def _has_folium() -> bool:
    try:
        import folium  # noqa: F401
        import streamlit_folium  # noqa: F401
        return True
    except ImportError:
        return False


# ── render_choropleth_map ──────────────────────────────────────────────────────

def render_choropleth_map(
    geojson: dict | None,
    data: Any,
    territory_col: str = "territorio",
    value_col: str = "valor",
    label_col: str | None = None,
    title: str | None = None,
    color_scale: str = "Viridis",
    height: int = 500,
    fallback_table: bool = True,
) -> None:
    """
    Mapa coroplético.

    Si no hay GeoJSON o Plotly, muestra tabla de ranking como fallback.

    Args:
        geojson: GeoJSON con geometrías territoriales.
        data: DataFrame con datos.
        territory_col: Columna de territorio.
        value_col: Columna de valor a visualizar.
        label_col: Columna de etiqueta.
        title: Título del mapa.
        color_scale: Escala de color Plotly.
        height: Altura en píxeles.
        fallback_table: Si True, muestra tabla si no hay mapa.
    """
    if data is None or (hasattr(data, "empty") and data.empty):
        no_data_state("Mapa territorial")
        return

    if geojson is None or not _has_plotly():
        if fallback_table:
            _render_territory_ranking(data, territory_col, value_col, label_col, title)
        else:
            missing_dependency_state("plotly + geojson")
        return

    try:
        import plotly.express as px
        fig = px.choropleth(
            data,
            geojson=geojson,
            locations=territory_col,
            color=value_col,
            hover_name=label_col or territory_col,
            title=title or "",
            color_continuous_scale=color_scale,
            height=height,
        )
        fig.update_geos(fitbounds="locations", visible=False)
        fig.update_layout(
            paper_bgcolor=BG2,
            font=dict(color=TEXT2),
            margin=dict(l=0, r=0, t=40, b=0),
        )
        st.plotly_chart(fig, use_container_width=True)
    except Exception as exc:
        logger.warning("Error renderizando mapa coroplético: %s", exc)
        if fallback_table:
            _render_territory_ranking(data, territory_col, value_col, label_col, title)


def _render_territory_ranking(data: Any, territory_col: str, value_col: str,
                                label_col: str | None, title: str | None) -> None:
    """Tabla de ranking como fallback de mapa."""
    if title:
        st.markdown(f"**{title}** *(vista de tabla — sin geometrías)*")
    try:
        import pandas as pd
        if isinstance(data, pd.DataFrame) and value_col in data.columns:
            df_show = data.sort_values(value_col, ascending=False).head(20)
            cols = [c for c in [territory_col, label_col, value_col] if c and c in df_show.columns]
            st.dataframe(df_show[cols], use_container_width=True, hide_index=True)
        else:
            st.dataframe(data, use_container_width=True, hide_index=True)
    except Exception as exc:
        logger.debug("Error en fallback de mapa: %s", exc)
        st.info("No se pueden mostrar los datos territoriales.")


# ── render_point_map ───────────────────────────────────────────────────────────

def render_point_map(
    df: Any,
    lat_col: str = "lat",
    lon_col: str = "lon",
    label_col: str | None = None,
    value_col: str | None = None,
    color_col: str | None = None,
    title: str | None = None,
    height: int = 450,
) -> None:
    """
    Mapa de puntos geolocalizados.

    Usa Plotly Express scatter_map si disponible; fallback a tabla.
    """
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state("Mapa de puntos")
        return

    if not _has_plotly():
        missing_dependency_state("plotly")
        return

    try:
        import plotly.express as px
        fig = px.scatter_map(
            df,
            lat=lat_col, lon=lon_col,
            hover_name=label_col,
            size=value_col if value_col else None,
            color=color_col if color_col else None,
            title=title or "",
            height=height,
            map_style="carto-darkmatter",
        )
        fig.update_layout(paper_bgcolor=BG2, font=dict(color=TEXT2),
                           margin=dict(l=0, r=0, t=40, b=0))
        st.plotly_chart(fig, use_container_width=True)
    except Exception as exc:
        logger.debug("scatter_map no disponible: %s. Usando scatter_mapbox.", exc)
        try:
            import plotly.express as px
            fig = px.scatter_mapbox(
                df, lat=lat_col, lon=lon_col,
                hover_name=label_col, size=value_col,
                color=color_col, title=title or "",
                height=height, mapbox_style="carto-darkmatter",
                zoom=5, center=dict(lat=40.4, lon=-3.7),
            )
            fig.update_layout(paper_bgcolor=BG2, margin=dict(l=0, r=0, t=40, b=0))
            st.plotly_chart(fig, use_container_width=True)
        except Exception as exc2:
            logger.warning("Error renderizando mapa de puntos: %s", exc2)
            st.dataframe(df.head(20), use_container_width=True)


# ── render_layered_map ─────────────────────────────────────────────────────────

def render_layered_map(
    layers: list[dict[str, Any]],
    selected_layer: str | None = None,
) -> None:
    """
    Mapa con capas seleccionables.

    Args:
        layers: Lista de dicts con {name, geojson, data, value_col}.
        selected_layer: Nombre de la capa activa.
    """
    if not layers:
        no_data_state("Capas de mapa")
        return

    layer_names = [l.get("name", f"Capa {i}") for i, l in enumerate(layers)]
    selected = st.selectbox(
        "Capa activa",
        layer_names,
        index=layer_names.index(selected_layer) if selected_layer in layer_names else 0,
        key="layered_map_selector",
    )

    active = next((l for l in layers if l.get("name") == selected), layers[0])
    render_choropleth_map(
        geojson=active.get("geojson"),
        data=active.get("data"),
        territory_col=active.get("territory_col", "territorio"),
        value_col=active.get("value_col", "valor"),
        title=selected,
    )


# ── render_territory_selector ──────────────────────────────────────────────────

def render_territory_selector(
    territories_df: Any,
    name_col: str = "nombre",
    id_col: str = "id",
    multiselect: bool = False,
    key: str = "territory_selector",
) -> str | list[str] | None:
    """
    Selector de territorio con dropdown.

    Args:
        territories_df: DataFrame de territorios.
        name_col: Columna de nombre.
        id_col: Columna de ID.
        multiselect: Si True, permite selección múltiple.
        key: Clave Streamlit.

    Returns:
        ID(s) seleccionado(s).
    """
    if territories_df is None or (hasattr(territories_df, "empty") and territories_df.empty):
        st.warning("Sin territorios disponibles")
        return None

    try:
        names = territories_df[name_col].tolist()
        ids = territories_df[id_col].tolist() if id_col in territories_df.columns else names
        name_to_id = dict(zip(names, ids))

        if multiselect:
            selected_names = st.multiselect("Territorios", names, key=key)
            return [name_to_id[n] for n in selected_names]
        else:
            selected_name = st.selectbox("Territorio", names, key=key)
            return name_to_id.get(selected_name)
    except Exception as exc:
        logger.debug("Error en territory_selector: %s", exc)
        return None


# ── render_map_empty_state ─────────────────────────────────────────────────────

def render_map_empty_state(
    reason: str = "Sin datos geográficos",
    suggestion: str | None = None,
) -> None:
    """Estado vacío específico para mapas."""
    from dashboard.ui.empty_states import empty_state
    empty_state(
        title=reason,
        description=suggestion or "Activa la fuente de datos geográficos para ver el mapa.",
        icon="🗺️",
    )
