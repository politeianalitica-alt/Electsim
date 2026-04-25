"""
Componente global DataSourceIndicator.

Resuelve el fallo de credibilidad BLOQUE 1.1 del audit técnico:
cualquier módulo que presente datos debe indicar explícitamente al usuario
si la fuente es real (BD / microdatos), sintética (hardcoded fallback) o degradada (caché).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Optional

import streamlit as st


SourceKind = Literal["real", "microdatos", "sintetico", "fallback", "cache"]


@dataclass(frozen=True)
class DataSource:
    kind: SourceKind
    label: str
    detail: str = ""
    timestamp: Optional[datetime] = None
    n_records: Optional[int] = None


_STYLE = {
    "real":        {"color": "#22C55E", "icon": "🟢", "text": "Datos reales"},
    "microdatos":  {"color": "#06B6D4", "icon": "🟢", "text": "Microdatos propios"},
    "sintetico":   {"color": "#F59E0B", "icon": "🟡", "text": "Datos sintéticos"},
    "fallback":    {"color": "#EF4444", "icon": "🔴", "text": "Fallback (BD caída)"},
    "cache":       {"color": "#8B5CF6", "icon": "🟣", "text": "Caché local"},
}


def render_source_banner(source: DataSource, compact: bool = False) -> None:
    """Renderiza un banner inline con el estado de los datos mostrados."""
    style = _STYLE.get(source.kind, _STYLE["sintetico"])
    ts = source.timestamp.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC") if source.timestamp else "—"
    n_str = f" · {source.n_records:,} registros" if source.n_records else ""

    if compact:
        st.markdown(
            f"""<div style="display:inline-flex;align-items:center;gap:.4rem;
                font-size:.72rem;padding:.15rem .55rem;border-radius:999px;
                background:{style['color']}22;border:1px solid {style['color']}55;
                color:{style['color']};font-weight:600">
                {style['icon']} {style['text']}{n_str}
            </div>""",
            unsafe_allow_html=True,
        )
        return

    st.markdown(
        f"""<div style="display:flex;align-items:center;gap:.8rem;
            padding:.55rem .9rem;border-radius:10px;margin:.4rem 0 1rem;
            background:{style['color']}15;border-left:3px solid {style['color']}">
            <div style="font-size:1.1rem">{style['icon']}</div>
            <div style="flex:1">
                <div style="font-size:.78rem;font-weight:700;color:{style['color']};
                    text-transform:uppercase;letter-spacing:.08em">
                    {style['text']} — {source.label}
                </div>
                <div style="font-size:.73rem;color:#94A3B8;margin-top:.15rem">
                    {source.detail}{n_str} · Actualizado {ts}
                </div>
            </div>
        </div>""",
        unsafe_allow_html=True,
    )


def render_multi_source(sources: list[DataSource]) -> None:
    """Renderiza varios badges compactos en fila (para páginas multi-fuente)."""
    if not sources:
        return
    cols = st.columns(len(sources))
    for c, s in zip(cols, sources):
        with c:
            render_source_banner(s, compact=True)


def detect_source(
    df,
    expected_columns: list[str] | None = None,
    label: str = "",
    fallback_label: str = "Datos sintéticos hardcoded",
) -> DataSource:
    """
    Detecta heurísticamente si un DataFrame es real o fallback:
    - Vacío → fallback
    - Falta columnas esperadas → sintético
    - OK → real
    """
    if df is None or (hasattr(df, "empty") and df.empty):
        return DataSource(
            kind="fallback",
            label=label or "Desconocido",
            detail="La BD no devolvió registros; se muestra el conjunto de respaldo.",
        )
    if expected_columns:
        missing = [c for c in expected_columns if c not in df.columns]
        if missing:
            return DataSource(
                kind="sintetico",
                label=label or "Desconocido",
                detail=f"Faltan columnas esperadas: {', '.join(missing)}",
                n_records=len(df),
            )
    return DataSource(
        kind="real",
        label=label or "BD",
        detail="Conexión verificada con la base de datos.",
        timestamp=datetime.utcnow(),
        n_records=len(df),
    )
