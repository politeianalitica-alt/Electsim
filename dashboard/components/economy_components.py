"""
Economy Components — Bloque 12.

Componentes de dominio para indicadores económicos,
ITPE, previsiones y señales económicas.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, BLUE, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_macro_kpi_card ──────────────────────────────────────────────────────

def render_macro_kpi_card(
    label: str,
    value: float | str,
    unit: str = "%",
    delta: float | None = None,
    benchmark: float | None = None,
    source: str | None = None,
    description: str | None = None,
    higher_is_better: bool = True,
) -> None:
    """
    Tarjeta KPI macroeconómica con delta y benchmark.

    Args:
        label: Nombre del indicador (PIB, Paro, IPC...).
        value: Valor actual.
        unit: Unidad ("%", "€", "puntos"...).
        delta: Variación respecto al período anterior.
        benchmark: Valor de referencia (media histórica, objetivo).
        source: Fuente de datos.
        description: Descripción breve.
        higher_is_better: Para calcular el color del delta.
    """
    try:
        val_f = float(value)
        val_str = f"{val_f:.1f}{unit}"
    except (TypeError, ValueError):
        val_str = f"{value}{unit}"

    delta_html = ""
    if delta is not None:
        try:
            delta_f = float(delta)
            if higher_is_better:
                d_color = GREEN if delta_f > 0 else RED
            else:
                d_color = RED if delta_f > 0 else GREEN
            arrow = "▲" if delta_f > 0 else "▼"
            delta_html = (
                f"<span style='color:{d_color};font-size:11px;'>"
                f"{arrow} {abs(delta_f):.1f}{unit}</span>"
            )
        except (TypeError, ValueError):
            pass

    bench_html = ""
    if benchmark is not None:
        try:
            bench_f = float(benchmark)
            bench_html = (
                f"<span style='color:{MUTED};font-size:10px;'>"
                f"Ref: {bench_f:.1f}{unit}</span>"
            )
        except (TypeError, ValueError):
            pass

    src_html = (
        f"<span style='color:{MUTED};font-size:9px;display:block;margin-top:4px;'>"
        f"📍 {source}</span>"
        if source else ""
    )

    desc_html = (
        f"<p style='color:{TEXT2};font-size:11px;margin:4px 0 0;'>{description}</p>"
        if description else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:3px solid {CYAN};border-radius:6px;padding:12px 14px;text-align:center;'>"
        f"  <p style='color:{MUTED};font-size:10px;font-weight:600;"
        f"text-transform:uppercase;margin:0 0 4px;'>{label}</p>"
        f"  <p style='color:{TEXT};font-size:24px;font-weight:800;margin:0;'>{val_str}</p>"
        f"  <div style='display:flex;justify-content:center;gap:8px;margin-top:4px;'>"
        f"    {delta_html} {bench_html}"
        f"  </div>"
        f"  {desc_html}"
        f"  {src_html}"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_itpe_breakdown ──────────────────────────────────────────────────────

def render_itpe_breakdown(
    itpe: dict[str, Any],
    title: str = "ITPE — Índice de Temperatura Política-Económica",
) -> None:
    """
    Desglose del Índice ITPE con sus componentes.

    Args:
        itpe: Dict con {score (0-100), gdp_growth, unemployment,
                         inflation, consumer_confidence, interpretation?}.
        title: Título.
    """
    if not itpe:
        no_data_state("ITPE")
        return

    score = itpe.get("score", itpe.get("itpe", 50))
    gdp = itpe.get("gdp_growth", itpe.get("crecimiento_pib"))
    unemp = itpe.get("unemployment", itpe.get("desempleo"))
    inflation = itpe.get("inflation", itpe.get("inflacion"))
    confidence = itpe.get("consumer_confidence", itpe.get("confianza_consumidor"))
    interpretation = itpe.get("interpretation", itpe.get("interpretacion", ""))

    try:
        score_f = float(score)
        score_color = GREEN if score_f > 60 else RED if score_f < 40 else AMBER
    except (TypeError, ValueError):
        score_f = 50
        score_color = MUTED

    interp_html = (
        f"<p style='color:{TEXT2};font-size:12px;'>{interpretation}</p>"
        if interpretation else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-radius:8px;padding:16px;'>"
        f"  <p style='color:{MUTED};font-size:11px;font-weight:600;"
        f"text-transform:uppercase;margin:0 0 8px;'>{title}</p>"
        f"  <div style='display:flex;align-items:baseline;gap:8px;'>"
        f"    <span style='color:{score_color};font-size:36px;font-weight:800;'>{score_f:.0f}</span>"
        f"    <span style='color:{MUTED};font-size:14px;'>/100</span>"
        f"  </div>"
        f"  <div style='height:8px;background:{BORDER};border-radius:4px;margin:8px 0;'>"
        f"    <div style='width:{score_f:.0f}%;height:100%;background:{score_color};border-radius:4px;'></div>"
        f"  </div>"
        f"  {interp_html}"
        f"</div>",
        unsafe_allow_html=True,
    )

    # Componentes
    components = [
        ("PIB (crecimiento)", gdp, "%", True),
        ("Desempleo", unemp, "%", False),
        ("Inflación", inflation, "%", False),
        ("Confianza consumidor", confidence, "pts", True),
    ]

    cols = st.columns(4)
    for col, (name, val, unit, hib) in zip(cols, components):
        if val is None:
            continue
        with col:
            try:
                val_f = float(val)
                color = (GREEN if val_f > 0 else RED) if hib else (RED if val_f > 0 else GREEN)
                val_str = f"{val_f:+.1f}{unit}"
            except (TypeError, ValueError):
                color = MUTED
                val_str = str(val)

            st.markdown(
                f"<div style='text-align:center;'>"
                f"  <p style='color:{MUTED};font-size:9px;margin:0;'>{name}</p>"
                f"  <p style='color:{color};font-size:14px;font-weight:700;margin:0;'>{val_str}</p>"
                f"</div>",
                unsafe_allow_html=True,
            )


# ── render_forecast_band_chart ─────────────────────────────────────────────────

def render_forecast_band_chart(
    df: Any,
    x_col: str = "fecha",
    y_col: str = "valor",
    lower_col: str = "lower",
    upper_col: str = "upper",
    title: str = "Previsión",
    forecast_start: str | None = None,
) -> None:
    """
    Gráfico de previsión con banda de confianza.

    Args:
        df: DataFrame con columnas de datos.
        x_col: Columna de fecha/tiempo.
        y_col: Columna de valor central.
        lower_col: Columna de límite inferior.
        upper_col: Columna de límite superior.
        title: Título.
        forecast_start: Fecha de inicio de la previsión (línea vertical).
    """
    from dashboard.ui.charts import forecast_band_chart
    forecast_band_chart(
        df=df, x_col=x_col, y_col=y_col,
        lower_col=lower_col, upper_col=upper_col,
        title=title, forecast_start=forecast_start,
    )


# ── render_economic_signal_card ────────────────────────────────────────────────

def render_economic_signal_card(
    signal: dict[str, Any],
) -> None:
    """
    Tarjeta de señal económica (alerta, oportunidad o riesgo).

    Args:
        signal: Dict con {tipo, titulo, descripcion, indicadores?,
                           impacto_electoral?, severidad?, fecha?}.
    """
    tipo = signal.get("tipo", signal.get("type", "signal"))
    titulo = signal.get("titulo", signal.get("title", "Señal"))
    descripcion = signal.get("descripcion", signal.get("description", ""))
    indicadores = signal.get("indicadores", signal.get("indicators", []))
    impacto = signal.get("impacto_electoral", signal.get("electoral_impact"))
    severidad = signal.get("severidad", signal.get("severity", "medium"))
    fecha = signal.get("fecha", signal.get("date", ""))

    type_icons = {
        "alert": "🚨", "alerta": "🚨",
        "opportunity": "✅", "oportunidad": "✅",
        "risk": "⚠️", "riesgo": "⚠️",
        "signal": "📊",
    }
    icon = type_icons.get(tipo.lower(), "📊")

    from dashboard.ui.tokens import get_severity_color
    border_color = get_severity_color(severidad, CYAN)

    imp_html = ""
    if impacto is not None:
        try:
            imp_f = float(impacto)
            imp_color = GREEN if imp_f > 0 else RED
            imp_html = (
                f"<span style='color:{imp_color};font-size:11px;'>"
                f"⚡ Impacto electoral: {imp_f:+.1f}pp</span>"
            )
        except (TypeError, ValueError):
            imp_html = f"<span style='color:{MUTED};font-size:11px;'>⚡ {impacto}</span>"

    ind_html = ""
    if indicadores:
        ind_list = indicadores if isinstance(indicadores, list) else [str(indicadores)]
        ind_html = " ".join(
            f"<span style='background:{BG3};color:{CYAN};font-size:10px;"
            f"padding:1px 6px;border-radius:3px;'>{ind}</span>"
            for ind in ind_list[:5]
        )

    fecha_html = (
        f"<span style='color:{MUTED};font-size:10px;'>{fecha}</span>"
        if fecha else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:4px solid {border_color};border-radius:6px;padding:12px 14px;margin:4px 0;'>"
        f"  <div style='display:flex;align-items:center;gap:6px;'>"
        f"    <span style='font-size:16px;'>{icon}</span>"
        f"    <span style='color:{TEXT};font-size:13px;font-weight:700;'>{titulo}</span>"
        f"    {fecha_html}"
        f"  </div>"
        f"  <p style='color:{TEXT2};font-size:12px;margin:6px 0;'>{descripcion}</p>"
        f"  <div style='display:flex;gap:8px;align-items:center;flex-wrap:wrap;'>"
        f"    {imp_html} {ind_html}"
        f"  </div>"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_economic_vote_panel ─────────────────────────────────────────────────

def render_economic_vote_panel(
    data: dict[str, Any],
    title: str = "Impacto económico en voto",
) -> None:
    """
    Panel de correlación entre indicadores económicos y voto.

    Args:
        data: Dict con {incumbent_vote_base, indicators: {nombre: {delta, vote_impact}},
                         total_vote_shift, confidence?}.
        title: Título.
    """
    if not data:
        no_data_state("Impacto económico en voto")
        return

    base = data.get("incumbent_vote_base", data.get("base_voto", 0))
    total_shift = data.get("total_vote_shift", data.get("variacion_total", 0))
    indicators = data.get("indicators", data.get("indicadores", {}))

    try:
        base_f = float(base)
        shift_f = float(total_shift)
        final = base_f + shift_f
        shift_color = GREEN if shift_f > 0 else RED
    except (TypeError, ValueError):
        base_f = shift_f = final = 0
        shift_color = MUTED

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"🗳️ {title}</p>",
        unsafe_allow_html=True,
    )

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Base de voto", f"{base_f:.1f}%")
    with col2:
        st.metric("Variación económica", f"{shift_f:+.2f}pp", delta=f"{shift_f:+.2f}pp")
    with col3:
        st.metric("Voto proyectado", f"{final:.1f}%")

    if indicators:
        st.markdown(
            f"<p style='color:{MUTED};font-size:11px;margin-top:8px;'>Desglose por indicador:</p>",
            unsafe_allow_html=True,
        )
        for ind_name, ind_data in list(indicators.items())[:6]:
            if isinstance(ind_data, dict):
                impact = ind_data.get("vote_impact", ind_data.get("impacto_voto", 0))
            else:
                impact = float(ind_data)

            try:
                imp_f = float(impact)
                imp_color = GREEN if imp_f > 0 else RED
                imp_str = f"{imp_f:+.2f}pp"
            except (TypeError, ValueError):
                imp_color = MUTED
                imp_str = str(impact)

            label = ind_name.replace("_", " ").title()
            st.markdown(
                f"<div style='display:flex;justify-content:space-between;margin:2px 0;'>"
                f"  <span style='color:{TEXT2};font-size:12px;'>{label}</span>"
                f"  <span style='color:{imp_color};font-size:12px;font-weight:600;'>{imp_str}</span>"
                f"</div>",
                unsafe_allow_html=True,
            )
