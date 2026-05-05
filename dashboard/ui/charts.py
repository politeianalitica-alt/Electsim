"""
Charts — Bloque 12.

Wrappers Plotly con tema dark ElectSim.
Todos los gráficos aplican tokens compartidos automáticamente.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG, BG2, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)
from dashboard.ui.empty_states import no_data_state, missing_dependency_state

logger = logging.getLogger(__name__)

_PALETTE = [CYAN, BLUE, PURPLE, GREEN, AMBER, RED, "#EC4899", "#F97316", "#14B8A6"]


def _has_plotly() -> bool:
    try:
        import plotly  # noqa: F401
        return True
    except ImportError:
        return False


def _dark_layout(fig: Any, title: str | None, source: str | None) -> Any:
    """Aplica layout dark de ElectSim a una figura Plotly."""
    footer = f"<br><sup style='color:{MUTED}'>Fuente: {source}</sup>" if source else ""
    fig.update_layout(
        title=dict(
            text=(title or "") + footer,
            font=dict(color=TEXT, size=14),
            x=0,
        ),
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        font=dict(color=TEXT2, size=11),
        xaxis=dict(
            gridcolor=BORDER,
            zerolinecolor=BORDER,
            tickfont=dict(color=TEXT2),
        ),
        yaxis=dict(
            gridcolor=BORDER,
            zerolinecolor=BORDER,
            tickfont=dict(color=TEXT2),
        ),
        legend=dict(
            bgcolor=BG2,
            bordercolor=BORDER,
            font=dict(color=TEXT2),
        ),
        margin=dict(l=40, r=20, t=50, b=40),
    )
    return fig


def _show(fig: Any) -> None:
    """Muestra una figura Plotly en Streamlit."""
    st.plotly_chart(fig, use_container_width=True)


# ── line_chart_dark ────────────────────────────────────────────────────────────

def line_chart_dark(
    df: Any,
    x: str,
    y: str | list[str],
    color: str | None = None,
    title: str | None = None,
    source: str | None = None,
    height: int = 350,
    area: bool = False,
) -> Any | None:
    """
    Gráfico de líneas con tema dark.

    Returns:
        Figura Plotly o None si falta dependencia.
    """
    if not _has_plotly():
        missing_dependency_state("plotly")
        return None

    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state()
        return None

    import plotly.express as px

    y_cols = [y] if isinstance(y, str) else y
    kwargs: dict[str, Any] = dict(
        x=x, y=y_cols[0] if len(y_cols) == 1 else None,
        title=title or "",
        height=height,
        color_discrete_sequence=_PALETTE,
    )

    if len(y_cols) > 1:
        import pandas as pd
        df_m = df.melt(id_vars=[x], value_vars=y_cols, var_name="_serie", value_name="_valor")
        kwargs = dict(x=x, y="_valor", color="_serie", title=title or "", height=height,
                      color_discrete_sequence=_PALETTE)
        fig = px.area(df_m, **kwargs) if area else px.line(df_m, **kwargs)
    elif color:
        kwargs["color"] = color
        fig = px.area(df, **kwargs) if area else px.line(df, **kwargs)
    else:
        fig = px.area(df, **kwargs) if area else px.line(df, **kwargs)

    fig = _dark_layout(fig, title, source)
    _show(fig)
    return fig


def area_chart_dark(df: Any, x: str, y: str | list[str], color: str | None = None,
                     title: str | None = None, source: str | None = None, height: int = 350) -> Any | None:
    """Gráfico de área. Alias de line_chart_dark(area=True)."""
    return line_chart_dark(df, x, y, color=color, title=title, source=source, height=height, area=True)


# ── bar_chart_dark ─────────────────────────────────────────────────────────────

def bar_chart_dark(
    df: Any,
    x: str,
    y: str,
    color: str | None = None,
    title: str | None = None,
    source: str | None = None,
    height: int = 350,
    horizontal: bool = False,
    barmode: str = "group",
) -> Any | None:
    """Gráfico de barras con tema dark."""
    if not _has_plotly():
        missing_dependency_state("plotly")
        return None
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state()
        return None

    import plotly.express as px
    kwargs: dict[str, Any] = dict(
        x=y if horizontal else x,
        y=x if horizontal else y,
        color=color,
        title=title or "",
        height=height,
        barmode=barmode,
        color_discrete_sequence=_PALETTE,
        orientation="h" if horizontal else "v",
    )
    fig = px.bar(df, **kwargs)
    fig = _dark_layout(fig, title, source)
    _show(fig)
    return fig


# ── scatter_chart_dark ─────────────────────────────────────────────────────────

def scatter_chart_dark(
    df: Any,
    x: str,
    y: str,
    size: str | None = None,
    color: str | None = None,
    hover_name: str | None = None,
    title: str | None = None,
    source: str | None = None,
    height: int = 400,
) -> Any | None:
    """Gráfico de dispersión con tema dark."""
    if not _has_plotly():
        missing_dependency_state("plotly")
        return None
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state()
        return None

    import plotly.express as px
    fig = px.scatter(
        df, x=x, y=y, size=size, color=color, hover_name=hover_name,
        title=title or "", height=height, color_discrete_sequence=_PALETTE,
    )
    fig = _dark_layout(fig, title, source)
    _show(fig)
    return fig


# ── heatmap_dark ───────────────────────────────────────────────────────────────

def heatmap_dark(
    df: Any,
    x: str,
    y: str,
    value: str,
    title: str | None = None,
    source: str | None = None,
    height: int = 400,
) -> Any | None:
    """Heatmap con tema dark."""
    if not _has_plotly():
        missing_dependency_state("plotly")
        return None
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state()
        return None

    import plotly.express as px
    fig = px.density_heatmap(
        df, x=x, y=y, z=value,
        title=title or "", height=height,
        color_continuous_scale=[[0, BG2], [0.5, CYAN + "88"], [1, CYAN]],
    )
    fig = _dark_layout(fig, title, source)
    _show(fig)
    return fig


# ── sankey_dark ────────────────────────────────────────────────────────────────

def sankey_dark(
    nodes: list[str],
    sources: list[int],
    targets: list[int],
    values: list[float],
    colors: list[str] | None = None,
    title: str | None = None,
    source_label: str | None = None,
    height: int = 450,
) -> Any | None:
    """
    Diagrama Sankey con tema dark.

    Args:
        nodes: Lista de nombres de nodos.
        sources: Índices de nodos origen.
        targets: Índices de nodos destino.
        values: Flujos.
        colors: Colores de nodos (opcional).
        title: Título.
        source_label: Fuente de datos.
        height: Altura.
    """
    if not _has_plotly():
        missing_dependency_state("plotly")
        return None
    if not nodes:
        no_data_state()
        return None

    import plotly.graph_objects as go
    node_colors = colors or _PALETTE[:len(nodes)]

    fig = go.Figure(go.Sankey(
        node=dict(
            label=nodes,
            color=node_colors[:len(nodes)],
            pad=15, thickness=20,
            line=dict(color=BORDER, width=0.5),
        ),
        link=dict(
            source=sources, target=targets, value=values,
            color=[CYAN + "44"] * len(values),
        ),
    ))
    fig.update_layout(
        title=dict(text=title or "", font=dict(color=TEXT)),
        paper_bgcolor=BG2, font=dict(color=TEXT2), height=height,
        margin=dict(l=20, r=20, t=50, b=20),
    )
    _show(fig)
    return fig


# ── gauge_chart ────────────────────────────────────────────────────────────────

def gauge_chart(
    value: float,
    max_value: float = 100,
    label: str | None = None,
    status: str | None = None,
    height: int = 250,
) -> Any | None:
    """
    Gauge / velocímetro.

    Args:
        value: Valor actual.
        max_value: Valor máximo.
        label: Etiqueta central.
        status: Estado para colorear (ok/warning/error).
        height: Altura.
    """
    if not _has_plotly():
        missing_dependency_state("plotly")
        return None

    from dashboard.ui.tokens import get_status_color
    color = get_status_color(status or "info", CYAN)

    import plotly.graph_objects as go
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=value,
        domain=dict(x=[0, 1], y=[0, 1]),
        title=dict(text=label or "", font=dict(color=TEXT, size=13)),
        gauge=dict(
            axis=dict(range=[0, max_value], tickfont=dict(color=TEXT2)),
            bar=dict(color=color),
            bgcolor=BG2,
            bordercolor=BORDER,
            steps=[
                dict(range=[0, max_value * 0.4], color=BG2 + "80"),
                dict(range=[max_value * 0.4, max_value * 0.7], color=AMBER + "22"),
                dict(range=[max_value * 0.7, max_value], color=RED + "22"),
            ],
        ),
        number=dict(font=dict(color=TEXT, size=28)),
    ))
    fig.update_layout(paper_bgcolor=BG2, height=height, margin=dict(l=20, r=20, t=40, b=10))
    _show(fig)
    return fig


# ── forecast_band_chart ────────────────────────────────────────────────────────

def forecast_band_chart(
    df: Any,
    x: str,
    y_mid: str,
    y_low: str | None = None,
    y_high: str | None = None,
    color: str | None = None,
    title: str | None = None,
    source: str | None = None,
    height: int = 350,
) -> Any | None:
    """
    Gráfico de línea central con banda de incertidumbre.

    Args:
        y_mid: Serie central (predicción).
        y_low: Límite inferior del IC.
        y_high: Límite superior del IC.
    """
    if not _has_plotly():
        missing_dependency_state("plotly")
        return None
    if df is None or (hasattr(df, "empty") and df.empty):
        no_data_state()
        return None

    import plotly.graph_objects as go
    accent = color or CYAN
    fig = go.Figure()

    # Banda de incertidumbre
    if y_low and y_high and y_low in df.columns and y_high in df.columns:
        fig.add_trace(go.Scatter(
            x=list(df[x]) + list(df[x])[::-1],
            y=list(df[y_high]) + list(df[y_low])[::-1],
            fill="toself",
            fillcolor=accent + "22",
            line=dict(color="rgba(0,0,0,0)"),
            name="IC 90%",
            showlegend=True,
        ))

    # Línea central
    fig.add_trace(go.Scatter(
        x=df[x], y=df[y_mid],
        line=dict(color=accent, width=2),
        name=y_mid,
    ))

    fig = _dark_layout(fig, title, source)
    fig.update_layout(height=height)
    _show(fig)
    return fig


# ── tornado_chart ──────────────────────────────────────────────────────────────

def tornado_chart(
    variables: list[str],
    low_values: list[float],
    high_values: list[float],
    baseline: float = 0.0,
    title: str | None = None,
    source: str | None = None,
    height: int = 400,
) -> Any | None:
    """
    Tornado chart para análisis de sensibilidad.

    Args:
        variables: Nombres de variables.
        low_values: Valores con variable en mínimo.
        high_values: Valores con variable en máximo.
        baseline: Valor de referencia central.
        title: Título.
    """
    if not _has_plotly():
        missing_dependency_state("plotly")
        return None
    if not variables:
        no_data_state()
        return None

    # Ordenar por swing (high - low) descendente
    swings = [abs(h - l) for h, l in zip(high_values, low_values)]
    ordered = sorted(zip(swings, variables, low_values, high_values), reverse=True)
    swings, variables, low_values, high_values = zip(*ordered) if ordered else ([], [], [], [])

    import plotly.graph_objects as go
    fig = go.Figure()

    fig.add_trace(go.Bar(
        y=list(variables),
        x=[h - baseline for h in high_values],
        orientation="h",
        name="Escenario alto",
        marker_color=GREEN,
        base=baseline,
    ))
    fig.add_trace(go.Bar(
        y=list(variables),
        x=[l - baseline for l in low_values],
        orientation="h",
        name="Escenario bajo",
        marker_color=RED,
        base=baseline,
    ))

    fig = _dark_layout(fig, title or "Análisis de Sensibilidad (Tornado)", source)
    fig.update_layout(
        height=max(height, len(variables) * 35 + 100),
        barmode="relative",
        xaxis_title="Variación respecto al baseline",
    )
    _show(fig)
    return fig
