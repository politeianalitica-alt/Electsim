"""
Explainers — Bloque 11.

Explicabilidad de simulaciones y diferencias entre escenarios.
"""
from __future__ import annotations

import logging
from typing import Any

from models.simulation.schemas import (
    CausalEstimate,
    ScenarioAssumption,
    SensitivityResult,
    SimulationResult,
    SimulationRun,
)

logger = logging.getLogger(__name__)


def explain_simulation_run(
    run: SimulationRun,
    results: list[SimulationResult],
    assumptions: list[ScenarioAssumption] | None = None,
    sensitivity_results: list[SensitivityResult] | None = None,
    language: str = "es",
) -> dict[str, Any]:
    """
    Genera una explicación estructurada de un SimulationRun.

    Returns:
        Dict con sections: summary, key_findings, uncertainty, drivers, caveats.
    """
    assumptions = assumptions or []
    sensitivity_results = sensitivity_results or []

    # Hallazgos clave
    key_findings = _extract_key_findings(results)

    # Incertidumbre
    uncertainty = _summarize_uncertainty(results)

    # Drivers (desde sensibilidad)
    drivers = _extract_drivers(sensitivity_results)

    # Caveats
    caveats = _build_caveats(run, assumptions, results)

    # Resumen ejecutivo
    summary = _build_executive_summary(run, results, key_findings)

    return {
        "run_id": run.run_id,
        "model_name": run.model_name,
        "status": run.status,
        "summary": summary,
        "key_findings": key_findings,
        "uncertainty": uncertainty,
        "drivers": drivers,
        "caveats": caveats,
        "warnings": run.warnings,
        "confidence": run.confidence,
        "language": language,
    }


def explain_scenario_difference(
    scenario_a_results: list[SimulationResult],
    scenario_b_results: list[SimulationResult],
    scenario_a_name: str = "Escenario A",
    scenario_b_name: str = "Escenario B",
    assumption_differences: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Explica las diferencias entre dos escenarios de simulación.

    Returns:
        Dict con differentials, attribution, narrative.
    """
    assumption_differences = assumption_differences or []

    # Construir mapa de resultados por métrica
    map_a = {r.metric_name: r for r in scenario_a_results}
    map_b = {r.metric_name: r for r in scenario_b_results}
    all_metrics = set(map_a) | set(map_b)

    differentials = []
    for metric in sorted(all_metrics):
        res_a = map_a.get(metric)
        res_b = map_b.get(metric)

        val_a = res_a.simulated_value if res_a else None
        val_b = res_b.simulated_value if res_b else None

        if val_a is not None and val_b is not None:
            delta = val_b - val_a
            delta_pct = (delta / abs(val_a) * 100) if val_a != 0 else None
            differentials.append({
                "metric": metric,
                "value_a": round(val_a, 4),
                "value_b": round(val_b, 4),
                "delta": round(delta, 4),
                "delta_pct": round(delta_pct, 2) if delta_pct is not None else None,
                "direction": "B_higher" if delta > 0 else "A_higher" if delta < 0 else "equal",
                "magnitude": _classify_magnitude(abs(delta)),
            })
        elif val_a is not None:
            differentials.append({"metric": metric, "value_a": val_a, "value_b": None})
        elif val_b is not None:
            differentials.append({"metric": metric, "value_a": None, "value_b": val_b})

    # Ordenar por magnitud del delta
    differentials.sort(
        key=lambda x: abs(x.get("delta", 0) or 0),
        reverse=True,
    )

    # Atribución a supuestos diferentes
    attribution = _attribute_differences_to_assumptions(
        differentials, assumption_differences
    )

    narrative = _build_comparison_narrative(
        scenario_a_name, scenario_b_name, differentials, assumption_differences
    )

    return {
        "scenario_a": scenario_a_name,
        "scenario_b": scenario_b_name,
        "n_metrics_compared": len(differentials),
        "n_metrics_diverging": sum(1 for d in differentials if d.get("direction") not in ("equal", None)),
        "differentials": differentials,
        "top_divergences": differentials[:5],
        "attribution": attribution,
        "assumption_differences": assumption_differences,
        "narrative": narrative,
    }


def explain_causal_estimate(estimate: CausalEstimate) -> str:
    """
    Genera una explicación en lenguaje natural de un CausalEstimate.

    Returns:
        Texto explicativo.
    """
    method_labels = {
        "before_after": "comparación antes/después",
        "difference_in_differences": "diferencias en diferencias (DiD)",
        "regression_adjustment": "regresión con ajuste por covariables",
        "matching": "emparejamiento estadístico",
        "instrumental_variable": "variable instrumental",
        "synthetic_control": "control sintético",
        "bayesian": "inferencia bayesiana",
        "custom": "método personalizado",
    }
    method_label = method_labels.get(estimate.method, estimate.method)

    sig_text = ""
    if estimate.p_value is not None:
        if estimate.p_value < 0.05:
            sig_text = " El resultado es estadísticamente significativo (p<0.05)."
        elif estimate.p_value < 0.10:
            sig_text = " El resultado es marginalmente significativo (p<0.10)."
        else:
            sig_text = " El resultado no alcanza significancia estadística convencional."

    ci_text = ""
    if estimate.lower_bound is not None and estimate.upper_bound is not None:
        ci_text = f" IC 95%: [{estimate.lower_bound:.3f}, {estimate.upper_bound:.3f}]."

    assumptions_text = ""
    if estimate.assumptions:
        assumptions_text = (
            f" Supuestos clave: {'; '.join(estimate.assumptions[:3])}."
        )

    return (
        f"Usando {method_label}, se estima que '{estimate.treatment}' "
        f"{'incrementa' if estimate.effect_estimate > 0 else 'reduce'} "
        f"'{estimate.outcome}' en {abs(estimate.effect_estimate):.3f} unidades"
        + (f" sobre la población '{estimate.population}'" if estimate.population else "")
        + f".{ci_text}{sig_text}"
        + (f" Confianza en el diseño: {estimate.confidence:.0%}." if estimate.confidence else "")
        + assumptions_text
    )


def generate_scenario_report(
    scenario_name: str,
    run: SimulationRun,
    results: list[SimulationResult],
    causal_estimates: list[CausalEstimate] | None = None,
    sensitivity_results: list[SensitivityResult] | None = None,
    assumptions: list[ScenarioAssumption] | None = None,
    format: str = "dict",
) -> dict[str, Any]:
    """
    Genera un reporte completo de un escenario de simulación.

    Args:
        format: "dict" (default) o "markdown".

    Returns:
        Dict estructurado con el reporte.
    """
    causal_estimates = causal_estimates or []
    sensitivity_results = sensitivity_results or []
    assumptions = assumptions or []

    explanation = explain_simulation_run(
        run=run,
        results=results,
        assumptions=assumptions,
        sensitivity_results=sensitivity_results,
    )

    causal_section = [
        {
            "treatment": e.treatment,
            "outcome": e.outcome,
            "effect": e.effect_estimate,
            "p_value": e.p_value,
            "interpretation": e.interpretation,
            "explanation": explain_causal_estimate(e),
        }
        for e in causal_estimates
    ]

    report = {
        "scenario_name": scenario_name,
        "run_id": run.run_id,
        "model": run.model_name,
        "status": run.status,
        "n_results": len(results),
        "n_causal_estimates": len(causal_estimates),
        "simulation_explanation": explanation,
        "causal_estimates": causal_section,
        "top_sensitive_variables": (
            [
                {
                    "variable": r.variable_name,
                    "importance": r.importance_score,
                    "elasticity": r.elasticity,
                }
                for r in sorted(
                    sensitivity_results,
                    key=lambda x: x.importance_score or 0,
                    reverse=True,
                )[:5]
            ]
        ),
    }

    return report


# ── Privadas ───────────────────────────────────────────────────────────────────

def _extract_key_findings(results: list[SimulationResult]) -> list[dict[str, Any]]:
    """Extrae los hallazgos más relevantes (mayor delta absoluto)."""
    sorted_results = sorted(
        results,
        key=lambda r: abs(r.delta_abs or 0),
        reverse=True,
    )
    findings = []
    for r in sorted_results[:5]:
        if r.delta_abs is not None and abs(r.delta_abs) > 0:
            findings.append({
                "metric": r.metric_name,
                "baseline": r.baseline_value,
                "simulated": r.simulated_value,
                "delta_abs": r.delta_abs,
                "delta_pct": r.delta_pct,
                "direction": "increase" if (r.delta_abs or 0) > 0 else "decrease",
                "explanation": r.explanation,
            })
    return findings


def _summarize_uncertainty(results: list[SimulationResult]) -> dict[str, Any]:
    """Resume la incertidumbre global de los resultados."""
    results_with_bounds = [r for r in results if r.lower_bound is not None]
    if not results_with_bounds:
        return {"has_uncertainty_bounds": False, "n_metrics": len(results)}

    avg_width = sum(
        (r.upper_bound or 0) - (r.lower_bound or 0)
        for r in results_with_bounds
    ) / len(results_with_bounds)

    high_uncertainty = [
        r.metric_name
        for r in results_with_bounds
        if r.simulated_value and (
            (r.upper_bound or 0) - (r.lower_bound or 0)
        ) > abs(r.simulated_value) * 0.5
    ]

    return {
        "has_uncertainty_bounds": True,
        "n_metrics": len(results),
        "n_metrics_with_bounds": len(results_with_bounds),
        "avg_interval_width": round(avg_width, 4),
        "high_uncertainty_metrics": high_uncertainty,
    }


def _extract_drivers(sensitivity_results: list[SensitivityResult]) -> list[dict[str, Any]]:
    """Extrae los principales drivers desde sensibilidad."""
    return [
        {
            "variable": r.variable_name,
            "importance_score": r.importance_score,
            "elasticity": r.elasticity,
            "output_metric": r.output_metric,
        }
        for r in sorted(
            sensitivity_results,
            key=lambda x: x.importance_score or 0,
            reverse=True,
        )[:5]
    ]


def _build_caveats(
    run: SimulationRun,
    assumptions: list[ScenarioAssumption],
    results: list[SimulationResult],
) -> list[str]:
    """Genera advertencias y limitaciones."""
    caveats = []

    if run.status == "partial":
        caveats.append("La simulación finalizó parcialmente; algunos resultados pueden ser incompletos.")

    low_confidence = [a for a in assumptions if a.confidence < 0.4]
    if low_confidence:
        vars_str = ", ".join(a.variable_name for a in low_confidence[:3])
        caveats.append(
            f"Supuestos con confianza baja (<40%): {vars_str}. Interpretar con precaución."
        )

    results_no_baseline = [r for r in results if r.baseline_value is None]
    if results_no_baseline:
        caveats.append("Algunas métricas no tienen valor baseline; los deltas son orientativos.")

    if run.warnings:
        caveats.extend(run.warnings[:3])

    return caveats


def _build_executive_summary(
    run: SimulationRun,
    results: list[SimulationResult],
    key_findings: list[dict[str, Any]],
) -> str:
    """Genera el resumen ejecutivo."""
    n_pos = sum(1 for r in results if (r.delta_abs or 0) > 0)
    n_neg = sum(1 for r in results if (r.delta_abs or 0) < 0)

    balance = "mayoritariamente positivo" if n_pos > n_neg else (
        "mayoritariamente negativo" if n_neg > n_pos else "mixto"
    )

    top = key_findings[0] if key_findings else None
    top_text = ""
    if top:
        dir_text = "incremento" if top["direction"] == "increase" else "reducción"
        top_text = (
            f" El mayor impacto es un {dir_text} de {abs(top.get('delta_abs', 0) or 0):.3f} "
            f"en '{top['metric']}'."
        )

    return (
        f"Simulación '{run.model_name}' completada con {len(results)} métricas analizadas. "
        f"El impacto global es {balance} ({n_pos} métricas mejoran, {n_neg} empeoran)."
        + top_text
    )


def _classify_magnitude(abs_delta: float) -> str:
    if abs_delta > 10:
        return "very_large"
    elif abs_delta > 5:
        return "large"
    elif abs_delta > 1:
        return "medium"
    elif abs_delta > 0.1:
        return "small"
    else:
        return "negligible"


def _attribute_differences_to_assumptions(
    differentials: list[dict[str, Any]],
    assumption_differences: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Atribuye diferencias en outputs a supuestos diferentes."""
    if not assumption_differences or not differentials:
        return []

    # Heurística: si hay delta grande y hay supuestos distintos, vincularlos
    top_diffs = [d for d in differentials if abs(d.get("delta", 0) or 0) > 0][:3]
    attributions = []

    for i, td in enumerate(top_diffs):
        if i < len(assumption_differences):
            attr = assumption_differences[i]
            attributions.append({
                "metric": td["metric"],
                "delta": td.get("delta"),
                "attributed_to": attr.get("variable_name", "desconocido"),
                "assumption_delta": (
                    (attr.get("value_b") or 0) - (attr.get("value_a") or 0)
                    if attr.get("value_a") is not None and attr.get("value_b") is not None
                    else None
                ),
            })

    return attributions


def _build_comparison_narrative(
    name_a: str,
    name_b: str,
    differentials: list[dict[str, Any]],
    assumption_differences: list[dict[str, Any]],
) -> str:
    """Narrativa de comparación."""
    n_total = len(differentials)
    n_b_higher = sum(1 for d in differentials if d.get("direction") == "B_higher")
    n_a_higher = sum(1 for d in differentials if d.get("direction") == "A_higher")

    winner = (
        name_b if n_b_higher > n_a_higher else
        name_a if n_a_higher > n_b_higher else
        "Ninguno"
    )

    top = differentials[0] if differentials else None
    top_text = ""
    if top and top.get("delta") is not None:
        direction = "mayor" if top.get("direction") == "B_higher" else "menor"
        top_text = (
            f" La mayor divergencia es en '{top['metric']}': "
            f"{name_b} es {abs(top['delta']):.3f} unidades {direction} que {name_a}."
        )

    assumption_text = ""
    if assumption_differences:
        vars_diff = [a.get("variable_name", "?") for a in assumption_differences[:3]]
        assumption_text = (
            f" Las principales diferencias en supuestos son: {', '.join(vars_diff)}."
        )

    return (
        f"Comparando {name_a} vs {name_b} en {n_total} métricas: "
        f"{name_b} obtiene mejores resultados en {n_b_higher} y peores en {n_a_higher}. "
        f"Favorece: {winner}."
        + top_text
        + assumption_text
    )
