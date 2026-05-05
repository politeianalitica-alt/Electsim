"""
Sensitivity Analysis — Bloque 11.

Análisis de sensibilidad one-way, ranking de importancia y elasticidad.
"""
from __future__ import annotations

import logging
import math
from typing import Any, Callable

from models.simulation.schemas import SensitivityResult

logger = logging.getLogger(__name__)


def one_way_sensitivity(
    model_fn: Callable[[dict[str, Any]], dict[str, float]],
    base_inputs: dict[str, Any],
    variable_name: str,
    tested_values: list[float],
    output_metric: str,
    run_id: str = "sensitivity",
) -> SensitivityResult:
    """
    Análisis de sensibilidad one-way: varía una variable y mide el impacto.

    Args:
        model_fn: Función de modelo.
        base_inputs: Inputs base.
        variable_name: Variable a variar.
        tested_values: Valores a probar.
        output_metric: Métrica de salida a observar.
        run_id: ID del run.

    Returns:
        SensitivityResult con valores de salida y elasticidad.
    """
    baseline_val = float(base_inputs.get(variable_name, 0.0))

    output_values: list[float] = []
    baseline_output: float | None = None

    # Baseline
    try:
        baseline_out = model_fn(base_inputs)
        baseline_output = float(baseline_out.get(output_metric, 0.0))
    except Exception as exc:
        logger.warning("Error en baseline para sensibilidad: %s", exc)

    for val in tested_values:
        inputs = dict(base_inputs)
        inputs[variable_name] = val
        try:
            out = model_fn(inputs)
            output_values.append(float(out.get(output_metric, 0.0)))
        except Exception as exc:
            logger.debug("Error en sensibilidad val=%s: %s", val, exc)
            output_values.append(float("nan"))

    # Elasticidad: %Δoutput / %Δinput en el punto medio
    elasticity: float | None = None
    if (
        baseline_output is not None
        and len(tested_values) >= 2
        and len(output_values) >= 2
    ):
        try:
            x_low, x_high = tested_values[0], tested_values[-1]
            y_low, y_high = output_values[0], output_values[-1]
            if x_high != x_low and baseline_val != 0 and baseline_output != 0:
                delta_x_pct = (x_high - x_low) / abs(baseline_val)
                delta_y_pct = (y_high - y_low) / abs(baseline_output)
                if delta_x_pct != 0:
                    elasticity = delta_y_pct / delta_x_pct
        except Exception:
            pass

    # Importance: rango de variación en output
    valid_outputs = [v for v in output_values if not math.isnan(v)]
    importance_score: float | None = None
    if valid_outputs and baseline_output is not None and baseline_output != 0:
        output_range = max(valid_outputs) - min(valid_outputs)
        importance_score = round(abs(output_range / baseline_output), 4)

    return SensitivityResult(
        run_id=run_id,
        variable_name=variable_name,
        baseline_value=baseline_val,
        tested_values=tested_values,
        output_metric=output_metric,
        output_values=[round(v, 4) if not math.isnan(v) else 0.0 for v in output_values],
        elasticity=round(elasticity, 4) if elasticity is not None else None,
        importance_score=importance_score,
        explanation=(
            f"Sensibilidad de '{output_metric}' ante variación de '{variable_name}' "
            f"({len(tested_values)} puntos). "
            + (f"Elasticidad: {elasticity:.3f}." if elasticity is not None else "")
        ),
    )


def multi_variable_sensitivity(
    model_fn: Callable[[dict[str, Any]], dict[str, float]],
    base_inputs: dict[str, Any],
    variables: dict[str, list[float]],
    output_metric: str,
    run_id: str = "sensitivity",
) -> list[SensitivityResult]:
    """
    Análisis de sensibilidad para múltiples variables.

    Args:
        variables: Dict variable_name → lista de valores a probar.

    Returns:
        Lista de SensitivityResult (uno por variable).
    """
    results = []
    for var_name, values in variables.items():
        result = one_way_sensitivity(
            model_fn=model_fn,
            base_inputs=base_inputs,
            variable_name=var_name,
            tested_values=values,
            output_metric=output_metric,
            run_id=run_id,
        )
        results.append(result)
    return results


def rank_variable_importance(
    sensitivity_results: list[SensitivityResult],
) -> list[dict[str, Any]]:
    """
    Rankea variables por importancia (importance_score).

    Returns:
        Lista ordenada de dicts con variable_name, importance_score, elasticity, rank.
    """
    ranked = []
    for r in sensitivity_results:
        ranked.append({
            "variable_name": r.variable_name,
            "output_metric": r.output_metric,
            "importance_score": r.importance_score or 0.0,
            "elasticity": r.elasticity,
            "output_range": (
                max(r.output_values) - min(r.output_values)
                if r.output_values else 0.0
            ),
        })

    ranked.sort(key=lambda x: x["importance_score"], reverse=True)
    for i, item in enumerate(ranked, 1):
        item["rank"] = i

    return ranked


def tornado_chart_data(
    model_fn: Callable[[dict[str, Any]], dict[str, float]],
    base_inputs: dict[str, Any],
    variables: dict[str, tuple[float, float]],
    output_metric: str,
) -> list[dict[str, Any]]:
    """
    Genera datos para un tornado chart.

    Args:
        variables: Dict variable_name → (low_value, high_value).
        output_metric: Métrica de salida.

    Returns:
        Lista de dicts con variable, low_output, high_output, swing, ordenada por swing desc.
    """
    # Baseline output
    try:
        baseline_out = model_fn(base_inputs)
        baseline_output = float(baseline_out.get(output_metric, 0.0))
    except Exception:
        baseline_output = 0.0

    items = []
    for var_name, (low_val, high_val) in variables.items():
        try:
            low_inputs = {**base_inputs, var_name: low_val}
            high_inputs = {**base_inputs, var_name: high_val}
            low_output = float(model_fn(low_inputs).get(output_metric, baseline_output))
            high_output = float(model_fn(high_inputs).get(output_metric, baseline_output))
            swing = abs(high_output - low_output)
        except Exception as exc:
            logger.debug("Error tornado %s: %s", var_name, exc)
            low_output = high_output = baseline_output
            swing = 0.0

        items.append({
            "variable_name": var_name,
            "low_value": low_val,
            "high_value": high_val,
            "low_output": round(low_output, 4),
            "high_output": round(high_output, 4),
            "baseline_output": round(baseline_output, 4),
            "swing": round(swing, 4),
        })

    return sorted(items, key=lambda x: x["swing"], reverse=True)


def auto_sensitivity_ranges(
    base_inputs: dict[str, Any],
    variables: list[str],
    n_points: int = 5,
    range_factor: float = 0.2,
) -> dict[str, list[float]]:
    """
    Genera rangos automáticos de sensibilidad para variables numéricas.

    Args:
        base_inputs: Inputs base.
        variables: Variables a analizar.
        n_points: Número de puntos de prueba.
        range_factor: Variación porcentual desde el valor base (default ±20%).

    Returns:
        Dict variable_name → lista de n_points valores.
    """
    ranges: dict[str, list[float]] = {}

    for var in variables:
        base_val = base_inputs.get(var)
        if not isinstance(base_val, (int, float)):
            continue

        base_float = float(base_val)
        if base_float == 0:
            low = -range_factor
            high = range_factor
        else:
            low = base_float * (1 - range_factor)
            high = base_float * (1 + range_factor)

        step = (high - low) / max(1, n_points - 1)
        ranges[var] = [round(low + step * i, 6) for i in range(n_points)]

    return ranges
