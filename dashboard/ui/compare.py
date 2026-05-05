"""
Compare — Bloque 12.

Componentes de comparación: tabla de diferencias, before/after,
comparación de escenarios, entidades y territorios.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── _delta_color ───────────────────────────────────────────────────────────────

def _delta_color(delta: float, higher_is_better: bool = True) -> str:
    if delta == 0:
        return MUTED
    positive = delta > 0
    return (GREEN if positive else RED) if higher_is_better else (RED if positive else GREEN)


def _delta_arrow(delta: float) -> str:
    if delta > 0:
        return "▲"
    elif delta < 0:
        return "▼"
    return "—"


# ── render_comparison_table ────────────────────────────────────────────────────

def render_comparison_table(
    items: list[dict[str, Any]],
    metrics: list[str],
    label_col: str = "name",
    higher_is_better: dict[str, bool] | None = None,
    title: str | None = None,
) -> None:
    """
    Tabla de comparación de N elementos con M métricas.

    Args:
        items: Lista de dicts con {label_col, metric1, metric2, ...}.
        metrics: Métricas a comparar.
        label_col: Columna de etiqueta.
        higher_is_better: Dict {metric: bool}. Default True para todo.
        title: Título de la tabla.
    """
    if not items or not metrics:
        no_data_state("Comparación")
        return

    hib = higher_is_better or {}

    if title:
        st.markdown(
            f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:6px;'>{title}</p>",
            unsafe_allow_html=True,
        )

    try:
        import pandas as pd
        df = pd.DataFrame(items)

        # Columnas visibles
        cols_to_show = [label_col] + [m for m in metrics if m in df.columns]
        df_show = df[cols_to_show].copy()
        st.dataframe(df_show, use_container_width=True, hide_index=True)
    except Exception as exc:
        logger.debug("Error en comparison_table: %s", exc)
        for item in items:
            name = item.get(label_col, "—")
            vals = " | ".join(f"{m}: {item.get(m, '—')}" for m in metrics)
            st.text(f"{name}: {vals}")


# ── render_before_after ────────────────────────────────────────────────────────

def render_before_after(
    before: dict[str, Any],
    after: dict[str, Any],
    metrics: list[str] | None = None,
    labels: tuple[str, str] = ("Antes", "Después"),
    higher_is_better: dict[str, bool] | None = None,
    title: str | None = None,
) -> None:
    """
    Panel Before / After con columnas y deltas.

    Args:
        before: Dict con valores antes.
        after: Dict con valores después.
        metrics: Métricas a mostrar (default: todas las claves comunes).
        labels: Etiquetas (antes, después).
        higher_is_better: Dict {metric: bool}.
        title: Título.
    """
    hib = higher_is_better or {}
    common_keys = metrics or sorted(set(before.keys()) & set(after.keys()))

    if not common_keys:
        no_data_state("Before/After")
        return

    if title:
        st.markdown(
            f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
            f"⚖️ {title}</p>",
            unsafe_allow_html=True,
        )

    col_before, col_after, col_delta = st.columns([2, 2, 1])

    with col_before:
        st.markdown(
            f"<p style='color:{MUTED};font-size:11px;font-weight:600;"
            f"text-align:center;margin-bottom:4px;'>{labels[0]}</p>",
            unsafe_allow_html=True,
        )
    with col_after:
        st.markdown(
            f"<p style='color:{CYAN};font-size:11px;font-weight:600;"
            f"text-align:center;margin-bottom:4px;'>{labels[1]}</p>",
            unsafe_allow_html=True,
        )
    with col_delta:
        st.markdown(
            f"<p style='color:{TEXT2};font-size:11px;font-weight:600;"
            f"text-align:center;margin-bottom:4px;'>Δ</p>",
            unsafe_allow_html=True,
        )

    for metric in common_keys:
        val_before = before.get(metric)
        val_after = after.get(metric)

        try:
            delta_val = float(val_after) - float(val_before)
            color = _delta_color(delta_val, hib.get(metric, True))
            arrow = _delta_arrow(delta_val)
            delta_str = f"{arrow} {abs(delta_val):.2f}"
        except (TypeError, ValueError):
            color = MUTED
            delta_str = "—"

        metric_label = metric.replace("_", " ").title()

        row_html = (
            f"<div style='display:grid;grid-template-columns:2fr 2fr 1fr;"
            f"gap:4px;padding:5px 0;border-bottom:1px solid {BORDER};align-items:center;'>"
            f"  <div>"
            f"    <span style='color:{MUTED};font-size:10px;'>{metric_label}</span><br>"
            f"    <span style='color:{TEXT};font-size:13px;font-weight:600;'>{val_before}</span>"
            f"  </div>"
            f"  <div style='text-align:center;'>"
            f"    <span style='color:{TEXT2};font-size:13px;font-weight:600;'>{val_after}</span>"
            f"  </div>"
            f"  <div style='text-align:center;'>"
            f"    <span style='color:{color};font-size:12px;font-weight:600;'>{delta_str}</span>"
            f"  </div>"
            f"</div>"
        )
        st.markdown(row_html, unsafe_allow_html=True)


# ── render_scenario_comparison ─────────────────────────────────────────────────

def render_scenario_comparison(
    scenarios: list[dict[str, Any]],
    metric_col: str = "metric",
    value_col: str = "value",
    scenario_col: str = "scenario",
    title: str = "Comparación de escenarios",
) -> None:
    """
    Comparación visual de múltiples escenarios.

    Args:
        scenarios: Lista de dicts con {scenario, metric, value, ...}.
        metric_col: Campo de métrica.
        value_col: Campo de valor.
        scenario_col: Campo de escenario.
        title: Título.
    """
    if not scenarios:
        no_data_state("Comparación de escenarios")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"📊 {title}</p>",
        unsafe_allow_html=True,
    )

    try:
        import pandas as pd
        df = pd.DataFrame(scenarios)
        if metric_col in df.columns and value_col in df.columns and scenario_col in df.columns:
            pivot = df.pivot_table(
                index=metric_col, columns=scenario_col, values=value_col, aggfunc="first"
            ).reset_index()
            st.dataframe(pivot, use_container_width=True, hide_index=True)
        else:
            st.dataframe(df.head(30), use_container_width=True, hide_index=True)
    except Exception as exc:
        logger.debug("Error en scenario_comparison pivot: %s", exc)
        for sc in scenarios[:20]:
            st.text(str(sc))


# ── render_entity_comparison ───────────────────────────────────────────────────

def render_entity_comparison(
    entities: list[dict[str, Any]],
    metrics: list[str],
    name_col: str = "name",
    title: str = "Comparación de entidades",
    highlight_best: bool = True,
) -> None:
    """
    Comparación de entidades (actores, partidos, medios, territorios).

    Args:
        entities: Lista de dicts con datos de entidades.
        metrics: Métricas a comparar.
        name_col: Columna con el nombre de la entidad.
        title: Título del panel.
        highlight_best: Si True, marca el mejor valor por métrica.
    """
    if not entities or not metrics:
        no_data_state("Comparación de entidades")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🏆 {title}</p>",
        unsafe_allow_html=True,
    )

    try:
        import pandas as pd
        df = pd.DataFrame(entities)
        visible_cols = [name_col] + [m for m in metrics if m in df.columns]
        df_show = df[visible_cols].copy()

        if highlight_best:
            # Marca la fila con el valor máximo de la primera métrica disponible
            first_metric = next((m for m in metrics if m in df.columns), None)
            if first_metric:
                try:
                    best_idx = df_show[first_metric].astype(float).idxmax()
                    best_name = df_show.loc[best_idx, name_col]
                    st.caption(f"🥇 Mejor en {first_metric}: **{best_name}**")
                except Exception:
                    pass

        st.dataframe(df_show, use_container_width=True, hide_index=True)
    except Exception as exc:
        logger.debug("Error en entity_comparison: %s", exc)
        for ent in entities[:10]:
            name = ent.get(name_col, "—")
            vals = " | ".join(f"{m}: {ent.get(m, '—')}" for m in metrics)
            st.text(f"{name}: {vals}")


# ── render_territory_comparison ────────────────────────────────────────────────

def render_territory_comparison(
    territories: list[dict[str, Any]],
    metric: str,
    name_col: str = "territory",
    title: str | None = None,
    top_n: int = 10,
    ascending: bool = False,
) -> None:
    """
    Ranking de territorios por una métrica, con barra visual.

    Args:
        territories: Lista de dicts con {name_col, metric, ...}.
        metric: Métrica a rankear.
        name_col: Columna de nombre.
        title: Título.
        top_n: Número de territorios a mostrar.
        ascending: Si True, ordena ascendentemente.
    """
    if not territories:
        no_data_state("Comparación de territorios")
        return

    title_label = title or f"Ranking por {metric}"
    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🗺️ {title_label}</p>",
        unsafe_allow_html=True,
    )

    try:
        sorted_t = sorted(
            territories,
            key=lambda x: float(x.get(metric, 0)),
            reverse=not ascending,
        )[:top_n]

        max_val = max((float(t.get(metric, 0)) for t in sorted_t), default=1) or 1

        for i, t in enumerate(sorted_t, 1):
            name = t.get(name_col, "—")
            val = t.get(metric, 0)
            try:
                val_f = float(val)
                pct = val_f / max_val * 100
            except (TypeError, ValueError):
                val_f = 0
                pct = 0

            bar_color = GREEN if i == 1 else CYAN if i <= 3 else TEXT2

            st.markdown(
                f"<div style='margin:3px 0;display:flex;align-items:center;gap:8px;'>"
                f"  <span style='color:{MUTED};font-size:10px;min-width:16px;'>#{i}</span>"
                f"  <span style='color:{TEXT};font-size:12px;min-width:120px;'>{name}</span>"
                f"  <div style='flex:1;height:6px;background:{BORDER};border-radius:3px;'>"
                f"    <div style='width:{pct:.0f}%;height:100%;background:{bar_color};"
                f"border-radius:3px;'></div>"
                f"  </div>"
                f"  <span style='color:{TEXT2};font-size:12px;min-width:50px;text-align:right;'>"
                f"{val_f:.2f}</span>"
                f"</div>",
                unsafe_allow_html=True,
            )
    except Exception as exc:
        logger.debug("Error en territory_comparison: %s", exc)
        for t in territories[:top_n]:
            st.text(f"{t.get(name_col)}: {t.get(metric)}")


# ── render_diff_highlight ──────────────────────────────────────────────────────

def render_diff_highlight(
    original: str,
    modified: str,
    title: str = "Diferencias de texto",
) -> None:
    """
    Comparación simplificada de dos textos (diff visual).

    Args:
        original: Texto original.
        modified: Texto modificado.
        title: Título del panel.
    """
    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"📝 {title}</p>",
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(
            f"<p style='color:{MUTED};font-size:11px;margin-bottom:4px;'>Original</p>",
            unsafe_allow_html=True,
        )
        st.text_area("", value=original, height=200, key="diff_original", disabled=True)

    with col2:
        st.markdown(
            f"<p style='color:{CYAN};font-size:11px;margin-bottom:4px;'>Modificado</p>",
            unsafe_allow_html=True,
        )
        st.text_area("", value=modified, height=200, key="diff_modified", disabled=True)
