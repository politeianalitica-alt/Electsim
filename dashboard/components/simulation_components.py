"""
Simulation Components — Bloque 12.

Componentes de dominio para simulación: escenarios,
supuestos, resultados, comparación y análisis causal.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, BLUE, PURPLE, TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)
from dashboard.ui.empty_states import no_data_state

logger = logging.getLogger(__name__)


# ── render_scenario_card ───────────────────────────────────────────────────────

def render_scenario_card(
    scenario: dict[str, Any],
    show_actions: bool = False,
) -> None:
    """
    Tarjeta de escenario de simulación.

    Args:
        scenario: Dict con {nombre, dominio, estado, resumen?,
                             n_supuestos?, n_intervenciones?, created_by?, created_at?}.
        show_actions: Si True, muestra botones Run/Clone.
    """
    nombre = scenario.get("nombre", scenario.get("name", "Escenario"))
    dominio = scenario.get("dominio", scenario.get("domain", ""))
    estado = scenario.get("estado", scenario.get("status", "draft"))
    resumen = scenario.get("resumen", scenario.get("summary", ""))
    n_sup = scenario.get("n_supuestos", scenario.get("n_assumptions", 0))
    n_int = scenario.get("n_intervenciones", scenario.get("n_interventions", 0))
    created_by = scenario.get("created_by", "")
    created_at = scenario.get("created_at", "")

    status_colors = {
        "draft": MUTED, "borrador": MUTED,
        "running": AMBER, "ejecutando": AMBER,
        "complete": GREEN, "completado": GREEN,
        "error": RED, "failed": RED,
        "archived": MUTED,
    }
    status_color = status_colors.get(str(estado).lower(), CYAN)

    domain_icons = {
        "electoral": "🗳️", "economic": "📊", "economico": "📊",
        "media": "📰", "risk": "⚠️", "riesgo": "⚠️",
        "campaign": "📢", "campana": "📢",
    }
    domain_icon = domain_icons.get(str(dominio).lower(), "🧪")

    meta_parts = []
    if created_by:
        meta_parts.append(f"👤 {created_by}")
    if created_at:
        meta_parts.append(f"📅 {created_at}")
    meta_html = " &nbsp;|&nbsp; ".join(
        f"<span style='color:{MUTED};font-size:10px;'>{p}</span>" for p in meta_parts
    )

    resumen_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:6px 0;'>{resumen[:200]}</p>"
        if resumen else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:4px solid {status_color};border-radius:6px;padding:12px 14px;margin:4px 0;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:flex-start;'>"
        f"    <div>"
        f"      <span style='font-size:16px;'>{domain_icon}</span> "
        f"      <span style='color:{TEXT};font-size:14px;font-weight:700;'>{nombre}</span>"
        f"    </div>"
        f"    <span style='color:{status_color};font-size:11px;font-weight:600;'>{estado}</span>"
        f"  </div>"
        f"  <div style='margin-top:4px;'>"
        f"    <span style='color:{MUTED};font-size:10px;text-transform:uppercase;"
        f"letter-spacing:0.5px;'>{dominio}</span>"
        f"  </div>"
        f"  {resumen_html}"
        f"  <div style='display:flex;gap:12px;margin-top:6px;'>"
        f"    <span style='color:{MUTED};font-size:10px;'>📋 {n_sup} supuestos</span>"
        f"    <span style='color:{MUTED};font-size:10px;'>⚡ {n_int} intervenciones</span>"
        f"  </div>"
        f"  <div style='margin-top:4px;'>{meta_html}</div>"
        f"</div>",
        unsafe_allow_html=True,
    )


# ── render_assumptions_panel ───────────────────────────────────────────────────

def render_assumptions_panel(
    assumptions: list[dict[str, Any]],
    title: str = "Supuestos del escenario",
) -> None:
    """
    Panel de supuestos de un escenario.

    Args:
        assumptions: Lista de ScenarioAssumption (dicts con {nombre, valor_central,
                      distribucion, confianza, descripcion?}).
        title: Título.
    """
    if not assumptions:
        no_data_state("Supuestos", "No hay supuestos definidos.")
        return

    with st.expander(f"📋 {title} ({len(assumptions)})", expanded=True):
        for assumption in assumptions:
            nombre = assumption.get("nombre", assumption.get("name", "—"))
            valor = assumption.get("valor_central", assumption.get("central_value", 0))
            distribucion = assumption.get("distribucion", assumption.get("distribution", "deterministic"))
            confianza = assumption.get("confianza", assumption.get("confidence", 1.0))
            descripcion = assumption.get("descripcion", assumption.get("description", ""))

            try:
                conf_f = float(confianza)
                conf_color = GREEN if conf_f > 0.7 else AMBER if conf_f > 0.4 else RED
            except (TypeError, ValueError):
                conf_f = 1.0
                conf_color = MUTED

            dist_icon = {
                "normal": "🔔", "uniform": "⬜", "triangular": "🔺", "discrete": "🎲",
                "deterministic": "📌",
            }.get(str(distribucion).lower(), "❓")

            label = nombre.replace("_", " ").title()
            desc_html = (
                f"<p style='color:{MUTED};font-size:11px;margin:2px 0 0;'>{descripcion}</p>"
                if descripcion else ""
            )

            st.markdown(
                f"<div style='background:{BG3};border:1px solid {BORDER};"
                f"border-radius:4px;padding:8px 10px;margin:3px 0;'>"
                f"  <div style='display:flex;justify-content:space-between;'>"
                f"    <span style='color:{TEXT};font-size:12px;font-weight:600;'>"
                f"{dist_icon} {label}</span>"
                f"    <div>"
                f"      <span style='color:{TEXT2};font-size:12px;'>{valor}</span>"
                f"      <span style='color:{conf_color};font-size:10px;margin-left:8px;'>"
                f"conf:{conf_f:.0%}</span>"
                f"    </div>"
                f"  </div>"
                f"  {desc_html}"
                f"</div>",
                unsafe_allow_html=True,
            )


# ── render_simulation_result_panel ────────────────────────────────────────────

def render_simulation_result_panel(
    results: list[dict[str, Any]],
    title: str = "Resultados de simulación",
) -> None:
    """
    Panel de resultados de una ejecución de simulación.

    Args:
        results: Lista de SimulationResult (dicts con {metrica, valor,
                  intervalo_bajo?, intervalo_alto?, unidad?, descripcion?}).
        title: Título.
    """
    if not results:
        no_data_state("Resultados")
        return

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"📊 {title}</p>",
        unsafe_allow_html=True,
    )

    n_cols = min(len(results), 4)
    if n_cols == 0:
        return

    cols = st.columns(n_cols)
    for col, result in zip(cols, results[:4]):
        metrica = result.get("metrica", result.get("metric", "—"))
        valor = result.get("valor", result.get("value", "—"))
        ci_low = result.get("intervalo_bajo", result.get("lower_bound"))
        ci_high = result.get("intervalo_alto", result.get("upper_bound"))
        unidad = result.get("unidad", result.get("unit", ""))
        descripcion = result.get("descripcion", result.get("description", ""))

        label = metrica.replace("_", " ").title()

        try:
            val_f = float(valor)
            val_str = f"{val_f:.2f}{unidad}"
        except (TypeError, ValueError):
            val_str = f"{valor}{unidad}"

        ci_html = ""
        if ci_low is not None and ci_high is not None:
            try:
                ci_html = (
                    f"<p style='color:{MUTED};font-size:10px;margin:0;'>"
                    f"[{float(ci_low):.2f}, {float(ci_high):.2f}]</p>"
                )
            except (TypeError, ValueError):
                pass

        with col:
            desc_short_html = (
                f"<p style='color:{TEXT2};font-size:10px;margin:0;'>{descripcion[:60]}</p>"
                if descripcion else ""
            )
            st.markdown(
                f"<div style='background:{BG2};border:1px solid {BORDER};"
                f"border-radius:6px;padding:10px;text-align:center;'>"
                f"  <p style='color:{MUTED};font-size:9px;margin:0;"
                f"text-transform:uppercase;'>{label}</p>"
                f"  <p style='color:{TEXT};font-size:18px;font-weight:800;margin:4px 0;'>"
                f"{val_str}</p>"
                f"  {ci_html}"
                f"  {desc_short_html}"
                f"</div>",
                unsafe_allow_html=True,
            )

    # Resultados adicionales en tabla
    if len(results) > 4:
        with st.expander(f"Ver todos los resultados ({len(results)})"):
            try:
                import pandas as pd
                df = pd.DataFrame(results)
                visible = [c for c in ["metrica", "valor", "intervalo_bajo", "intervalo_alto", "unidad"]
                           if c in df.columns]
                st.dataframe(df[visible] if visible else df, use_container_width=True, hide_index=True)
            except Exception:
                for r in results[4:]:
                    st.text(f"{r.get('metrica', '—')}: {r.get('valor', '—')}")


# ── render_scenario_comparison ─────────────────────────────────────────────────

def render_scenario_comparison(
    comparison_data: dict[str, Any],
    title: str = "Comparación de escenarios",
) -> None:
    """
    Panel de comparación de múltiples escenarios de simulación.

    Args:
        comparison_data: Dict con {comparison_table, win_counts, ranking}.
        title: Título.
    """
    if not comparison_data:
        no_data_state("Comparación")
        return

    from dashboard.ui.compare import render_scenario_comparison as _base
    comparison_table = comparison_data.get("comparison_table", {})
    win_counts = comparison_data.get("win_counts", {})

    st.markdown(
        f"<p style='color:{CYAN};font-size:13px;font-weight:600;margin-bottom:8px;'>"
        f"📊 {title}</p>",
        unsafe_allow_html=True,
    )

    if win_counts:
        cols = st.columns(min(len(win_counts), 4))
        for col, (scenario, wins) in zip(cols, list(win_counts.items())[:4]):
            with col:
                st.metric(scenario[:20], f"{wins} victorias")

    if comparison_table:
        try:
            import pandas as pd
            rows = []
            for metric, scenario_vals in comparison_table.items():
                row = {"Métrica": metric}
                row.update(scenario_vals)
                rows.append(row)
            if rows:
                df = pd.DataFrame(rows)
                st.dataframe(df, use_container_width=True, hide_index=True)
        except Exception as exc:
            logger.debug("Error renderizando comparison_table: %s", exc)


# ── render_sensitivity_tornado ─────────────────────────────────────────────────

def render_sensitivity_tornado(
    tornado_data: list[dict[str, Any]],
    title: str = "Análisis de sensibilidad",
    height: int = 400,
) -> None:
    """
    Gráfico tornado de sensibilidad.

    Args:
        tornado_data: Lista de dicts con {parameter, low_output, high_output,
                                           baseline_output}.
        title: Título.
        height: Altura.
    """
    if not tornado_data:
        no_data_state("Análisis de sensibilidad")
        return

    from dashboard.ui.charts import tornado_chart
    tornado_chart(tornado_data, title=title, height=height)


# ── render_causal_estimate_card ────────────────────────────────────────────────

def render_causal_estimate_card(
    estimate: dict[str, Any],
    title: str = "Estimación causal",
) -> None:
    """
    Tarjeta de estimación de impacto causal.

    Args:
        estimate: Dict con {metodo, efecto, ci_bajo, ci_alto,
                             p_valor, significativo, descripcion?, warnings?}.
        title: Título.
    """
    if not estimate:
        no_data_state("Estimación causal")
        return

    metodo = estimate.get("metodo", estimate.get("method", "—"))
    efecto = estimate.get("efecto", estimate.get("effect", 0))
    ci_bajo = estimate.get("ci_bajo", estimate.get("ci_lower"))
    ci_alto = estimate.get("ci_alto", estimate.get("ci_upper"))
    p_valor = estimate.get("p_valor", estimate.get("p_value"))
    significativo = estimate.get("significativo", estimate.get("significant", False))
    descripcion = estimate.get("descripcion", estimate.get("description", ""))
    warnings = estimate.get("warnings", [])

    try:
        efe_f = float(efecto)
        efe_color = GREEN if efe_f > 0 else RED
        efe_str = f"{efe_f:+.3f}"
    except (TypeError, ValueError):
        efe_color = MUTED
        efe_str = str(efecto)

    sig_icon = "✅" if significativo else "❌"
    sig_label = "Significativo" if significativo else "No significativo"
    sig_color = GREEN if significativo else RED

    p_html = ""
    if p_valor is not None:
        try:
            p_f = float(p_valor)
            p_color = GREEN if p_f < 0.05 else AMBER if p_f < 0.1 else RED
            p_html = f"<span style='color:{p_color};font-size:11px;'>p={p_f:.3f}</span>"
        except (TypeError, ValueError):
            p_html = f"<span style='color:{MUTED};font-size:11px;'>p={p_valor}</span>"

    ci_html = ""
    if ci_bajo is not None and ci_alto is not None:
        try:
            ci_html = (
                f"<span style='color:{MUTED};font-size:11px;'>"
                f"IC 95%: [{float(ci_bajo):+.3f}, {float(ci_alto):+.3f}]</span>"
            )
        except (TypeError, ValueError):
            pass

    causal_desc_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:0;'>{descripcion}</p>"
        if descripcion else ""
    )

    st.markdown(
        f"<div style='background:{BG2};border:1px solid {BORDER};"
        f"border-left:4px solid {efe_color};border-radius:8px;padding:14px 16px;'>"
        f"  <div style='display:flex;justify-content:space-between;align-items:center;'>"
        f"    <span style='color:{MUTED};font-size:11px;text-transform:uppercase;'>"
        f"      {title} — {metodo}</span>"
        f"    <span style='color:{sig_color};font-size:11px;font-weight:600;'>"
        f"      {sig_icon} {sig_label}</span>"
        f"  </div>"
        f"  <div style='display:flex;align-items:baseline;gap:12px;margin:8px 0;'>"
        f"    <span style='color:{efe_color};font-size:28px;font-weight:800;'>{efe_str}</span>"
        f"    {p_html} {ci_html}"
        f"  </div>"
        f"  {causal_desc_html}"
        f"</div>",
        unsafe_allow_html=True,
    )

    for w in (warnings or [])[:3]:
        st.warning(f"⚠️ {w}", icon=None)
