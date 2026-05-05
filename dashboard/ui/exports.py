"""
Exports — Bloque 12.

Exportación de tablas, gráficos y vistas desde el dashboard.
Registro de exportaciones visuales compatible con ui_state_core.
"""
from __future__ import annotations

import io
import json
import logging
from datetime import datetime
from typing import Any

import streamlit as st

from dashboard.ui.tokens import CYAN, TEXT2, MUTED

logger = logging.getLogger(__name__)


# ── export_table_csv ───────────────────────────────────────────────────────────

def export_table_csv(
    df: Any,
    filename: str = "datos.csv",
    label: str = "📊 Exportar CSV",
    key: str = "export_csv",
) -> None:
    """
    Botón de descarga de DataFrame como CSV.

    Args:
        df: DataFrame de pandas.
        filename: Nombre del archivo de descarga.
        label: Etiqueta del botón.
        key: Clave Streamlit.
    """
    try:
        csv = df.to_csv(index=False, encoding="utf-8-sig")
        st.download_button(
            label=label,
            data=csv.encode("utf-8-sig"),
            file_name=filename,
            mime="text/csv",
            key=key,
        )
    except Exception as exc:
        logger.debug("Error exportando CSV: %s", exc)
        st.warning("No se pudo exportar el CSV.")


# ── export_table_json ──────────────────────────────────────────────────────────

def export_table_json(
    data: Any,
    filename: str = "datos.json",
    label: str = "📋 Exportar JSON",
    key: str = "export_json",
) -> None:
    """
    Botón de descarga de datos como JSON.

    Args:
        data: Lista, dict o DataFrame.
        filename: Nombre del archivo.
        label: Etiqueta del botón.
        key: Clave Streamlit.
    """
    try:
        # Si es DataFrame, convertir a records
        if hasattr(data, "to_dict"):
            payload = data.to_dict(orient="records")
        elif isinstance(data, (list, dict)):
            payload = data
        else:
            payload = str(data)

        json_str = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
        st.download_button(
            label=label,
            data=json_str.encode("utf-8"),
            file_name=filename,
            mime="application/json",
            key=key,
        )
    except Exception as exc:
        logger.debug("Error exportando JSON: %s", exc)
        st.warning("No se pudo exportar el JSON.")


# ── export_view_markdown ───────────────────────────────────────────────────────

def export_view_markdown(
    content: str,
    filename: str = "vista.md",
    label: str = "📝 Exportar Markdown",
    key: str = "export_md",
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    Botón de descarga de contenido como Markdown.

    Args:
        content: Texto Markdown.
        filename: Nombre del archivo.
        label: Etiqueta del botón.
        key: Clave Streamlit.
        metadata: Metadatos opcionales como frontmatter YAML.
    """
    try:
        if metadata:
            frontmatter = "---\n"
            for k, v in metadata.items():
                frontmatter += f"{k}: {v}\n"
            frontmatter += "---\n\n"
            full_content = frontmatter + content
        else:
            full_content = content

        st.download_button(
            label=label,
            data=full_content.encode("utf-8"),
            file_name=filename,
            mime="text/markdown",
            key=key,
        )
    except Exception as exc:
        logger.debug("Error exportando Markdown: %s", exc)
        st.warning("No se pudo exportar el Markdown.")


# ── export_chart_png ───────────────────────────────────────────────────────────

def export_chart_png(
    fig: Any,
    filename: str = "grafico.png",
    label: str = "🖼️ Exportar PNG",
    key: str = "export_png",
    width: int = 1200,
    height: int = 600,
    scale: int = 2,
) -> None:
    """
    Botón de descarga de figura Plotly como PNG.

    Requiere kaleido: pip install kaleido.

    Args:
        fig: Figura Plotly.
        filename: Nombre del archivo.
        label: Etiqueta del botón.
        key: Clave Streamlit.
        width: Ancho en píxeles.
        height: Alto en píxeles.
        scale: Factor de escala (default 2x).
    """
    try:
        import plotly.io as pio
        img_bytes = pio.to_image(fig, format="png", width=width, height=height, scale=scale)
        st.download_button(
            label=label,
            data=img_bytes,
            file_name=filename,
            mime="image/png",
            key=key,
        )
    except ImportError:
        st.caption("ℹ️ Instala `kaleido` para exportar PNG: `pip install kaleido`")
    except Exception as exc:
        logger.debug("Error exportando PNG: %s", exc)
        st.warning("No se pudo exportar el gráfico.")


# ── render_export_toolbar ──────────────────────────────────────────────────────

def render_export_toolbar(
    df: Any | None = None,
    fig: Any | None = None,
    markdown_content: str | None = None,
    module_id: str = "module",
    extra_formats: list[str] | None = None,
) -> None:
    """
    Barra de exportación completa con todos los formatos disponibles.

    Args:
        df: DataFrame para exportar como CSV/JSON.
        fig: Figura Plotly para exportar como PNG.
        markdown_content: Contenido para exportar como Markdown.
        module_id: ID del módulo (usado en nombres de archivo).
        extra_formats: Formatos adicionales ["pdf", "xlsx"].
    """
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    base_name = f"electsim_{module_id}_{ts}"

    cols = []
    has_df = df is not None and hasattr(df, "to_csv")
    has_fig = fig is not None
    has_md = markdown_content is not None

    n_buttons = sum([has_df * 2, has_fig, has_md])
    if n_buttons == 0:
        return

    export_cols = st.columns(max(n_buttons, 1))
    col_idx = 0

    if has_df:
        with export_cols[col_idx]:
            export_table_csv(df, filename=f"{base_name}.csv", key=f"{module_id}_csv")
        col_idx += 1
        with export_cols[col_idx]:
            export_table_json(df, filename=f"{base_name}.json", key=f"{module_id}_json")
        col_idx += 1

    if has_fig:
        with export_cols[col_idx]:
            export_chart_png(fig, filename=f"{base_name}.png", key=f"{module_id}_png")
        col_idx += 1

    if has_md:
        with export_cols[col_idx]:
            export_view_markdown(
                markdown_content,
                filename=f"{base_name}.md",
                key=f"{module_id}_md",
            )


# ── register_visual_export ─────────────────────────────────────────────────────

def register_visual_export(
    module_id: str,
    export_type: str,
    filename: str,
    record_count: int | None = None,
) -> None:
    """
    Registra una exportación visual en ui_state_core.

    Llama al servicio si está disponible; silencia errores.

    Args:
        module_id: ID del módulo que exporta.
        export_type: Tipo (csv/json/png/md/pdf).
        filename: Nombre del archivo exportado.
        record_count: Número de registros exportados.
    """
    try:
        from dashboard.services.ui_state_core import registrar_visual_export as _reg
        _reg(
            module_id=module_id,
            export_type=export_type,
            filename=filename,
            record_count=record_count,
        )
    except Exception:
        pass
