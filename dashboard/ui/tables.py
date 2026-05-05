"""
Tables — Bloque 12.

Tablas reutilizables con fallback gracioso si AgGrid no está disponible.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

try:
    import pandas as pd
    _HAS_PANDAS = True
except ImportError:
    _HAS_PANDAS = False

from dashboard.ui.tokens import BG2, BORDER, CYAN, TEXT, TEXT2, MUTED, GREEN, AMBER, RED
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)

# ── AgGrid opcional ────────────────────────────────────────────────────────────

def _try_aggrid(df: "pd.DataFrame", height: int, **kwargs) -> bool:
    """Intenta usar AgGrid; devuelve True si lo consiguió."""
    try:
        from st_aggrid import AgGrid, GridOptionsBuilder  # type: ignore
        gb = GridOptionsBuilder.from_dataframe(df)
        gb.configure_pagination(paginationAutoPageSize=True)
        gb.configure_side_bar()
        gb.configure_default_column(filterable=True, sortable=True, resizable=True)
        for k, v in kwargs.items():
            if k == "selectable" and v:
                gb.configure_selection("multiple")
        grid_options = gb.build()
        AgGrid(df, gridOptions=grid_options, height=height, theme="streamlit")
        return True
    except ImportError:
        return False
    except Exception as exc:
        logger.debug("AgGrid error: %s", exc)
        return False


# ── render_data_table ──────────────────────────────────────────────────────────

def render_data_table(
    df: "pd.DataFrame",
    height: int = 400,
    searchable: bool = True,
    selectable: bool = False,
    use_aggrid: bool = True,
    hide_index: bool = True,
) -> None:
    """
    Tabla de datos estándar.

    Usa AgGrid si está disponible; fallback a st.dataframe.

    Args:
        df: DataFrame a mostrar.
        height: Altura en píxeles.
        searchable: Permitir búsqueda (AgGrid).
        selectable: Permitir selección de filas.
        use_aggrid: Intentar AgGrid primero.
        hide_index: Ocultar índice.
    """
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state()
        return

    if use_aggrid and _try_aggrid(df, height, selectable=selectable):
        return

    # Fallback: st.dataframe nativo
    st.dataframe(df, height=height, use_container_width=True, hide_index=hide_index)


# ── render_ranked_table ────────────────────────────────────────────────────────

def render_ranked_table(
    df: "pd.DataFrame",
    rank_col: str | None = None,
    value_col: str | None = None,
    label_col: str | None = None,
    ascending: bool = False,
    top_n: int = 10,
    color_value: bool = True,
) -> None:
    """
    Tabla con ranking automático.

    Args:
        df: DataFrame fuente.
        rank_col: Columna de ranking (si ya existe).
        value_col: Columna de valor para ordenar.
        label_col: Columna de etiqueta.
        ascending: Orden ascendente o descendente.
        top_n: Número de filas a mostrar.
        color_value: Colorear valores según magnitud.
    """
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state()
        return

    if _HAS_PANDAS:
        df = df.copy()
        if value_col and value_col in df.columns:
            df = df.sort_values(value_col, ascending=ascending).head(top_n)
        elif top_n:
            df = df.head(top_n)

        if rank_col and rank_col not in df.columns:
            df.insert(0, "#", range(1, len(df) + 1))

    st.dataframe(df, use_container_width=True, hide_index=True)


# ── render_entity_table ────────────────────────────────────────────────────────

def render_entity_table(
    df: "pd.DataFrame",
    name_col: str = "nombre",
    type_col: str | None = None,
    score_col: str | None = None,
    height: int = 350,
) -> None:
    """
    Tabla de entidades (actores, partidos, organizaciones).

    Args:
        df: DataFrame de entidades.
        name_col: Columna de nombre.
        type_col: Columna de tipo (opcional).
        score_col: Columna de puntuación (opcional).
        height: Altura.
    """
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state(source="Entidades")
        return

    display_df = df.copy()

    # Reordenar columnas si existen
    priority_cols = [c for c in [name_col, type_col, score_col] if c and c in display_df.columns]
    other_cols = [c for c in display_df.columns if c not in priority_cols]
    display_df = display_df[priority_cols + other_cols]

    render_data_table(display_df, height=height)


# ── render_alert_table ─────────────────────────────────────────────────────────

def render_alert_table(
    df: "pd.DataFrame",
    severity_col: str = "severity",
    title_col: str = "title",
    time_col: str | None = None,
) -> None:
    """
    Tabla de alertas con coloración por severidad.

    Args:
        df: DataFrame de alertas.
        severity_col: Columna de severidad.
        title_col: Columna de título.
        time_col: Columna de tiempo.
    """
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state(source="Alertas")
        return

    # Añadir emoji de severidad si la columna existe
    if _HAS_PANDAS and severity_col in df.columns:
        emoji_map = {
            "critical": "🔴",
            "high": "🟠",
            "alto": "🟠",
            "medium": "🟡",
            "medio": "🟡",
            "low": "🟢",
            "bajo": "🟢",
        }
        df = df.copy()
        df[severity_col] = df[severity_col].apply(
            lambda s: f"{emoji_map.get(str(s).lower(), '⚪')} {str(s).upper()}"
        )

    priority_cols = [c for c in [severity_col, title_col, time_col] if c and c in df.columns]
    other_cols = [c for c in df.columns if c not in priority_cols]
    display_df = df[priority_cols + other_cols]
    render_data_table(display_df, height=300)


# ── render_source_table ────────────────────────────────────────────────────────

def render_source_table(
    df: "pd.DataFrame",
    name_col: str = "nombre",
    status_col: str | None = "status",
    last_update_col: str | None = None,
) -> None:
    """
    Tabla de fuentes de datos con estado de conectividad.

    Args:
        df: DataFrame de fuentes.
        name_col: Columna de nombre.
        status_col: Columna de estado.
        last_update_col: Columna de última actualización.
    """
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state(source="Fuentes")
        return

    if _HAS_PANDAS and status_col and status_col in df.columns:
        df = df.copy()
        status_emoji = {
            "ok": "🟢 OK",
            "error": "🔴 ERROR",
            "warning": "🟡 AVISO",
            "unknown": "⚪ DESCONOCIDO",
            "demo": "🎭 DEMO",
        }
        df[status_col] = df[status_col].apply(
            lambda s: status_emoji.get(str(s).lower(), str(s))
        )

    render_data_table(df, height=300)


# ── render_quality_table ───────────────────────────────────────────────────────

def render_quality_table(
    df: "pd.DataFrame",
    quality_col: str = "quality_score",
    name_col: str = "source",
) -> None:
    """
    Tabla de calidad de datos ordenada por puntuación.

    Args:
        df: DataFrame con puntuaciones de calidad.
        quality_col: Columna de calidad.
        name_col: Columna de nombre/fuente.
    """
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state()
        return

    render_ranked_table(
        df,
        value_col=quality_col,
        label_col=name_col,
        ascending=False,
    )
