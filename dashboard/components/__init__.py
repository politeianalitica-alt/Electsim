"""Componentes transversales del dashboard."""

from dashboard.components.data_source_indicator import (
    DataSource,
    detect_source,
    render_multi_source,
    render_source_banner,
)

__all__ = [
    "DataSource",
    "detect_source",
    "render_multi_source",
    "render_source_banner",
]
