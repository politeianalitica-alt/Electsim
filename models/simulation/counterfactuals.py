"""
Counterfactuals — Bloque 11.

Construcción y comparación de escenarios contrafactuales.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from models.simulation.schemas import CounterfactualComparison

logger = logging.getLogger(__name__)


def build_counterfactual_baseline(
    base_inputs: dict[str, Any],
    counterfactual_overrides: dict[str, Any],
    model_fn: Callable[[dict[str, Any]], dict[str, float]] | None = None,
) -> dict[str, Any]:
    """
    Construye el baseline contrafactual aplicando los overrides.

    Args:
        base_inputs: Inputs del mundo observado.
        counterfactual_overrides: Variables a cambiar en el contrafactual.
        model_fn: Si se proporciona, ejecuta el modelo y añade outputs.

    Returns:
        Dict con contrafactual_inputs y opcionalmente contrafactual_outputs.
    """
    cf_inputs = {**base_inputs, **counterfactual_overrides}

    result: dict[str, Any] = {
        "counterfactual_inputs": cf_inputs,
        "overrides_applied": list(counterfactual_overrides.keys()),
        "n_overrides": len(counterfactual_overrides),
    }

    if model_fn is not None:
        try:
            cf_outputs = model_fn(cf_inputs)
            result["counterfactual_outputs"] = cf_outputs
        except Exception as exc:
            logger.warning("Error al ejecutar modelo contrafactual: %s", exc)
            result["counterfactual_outputs"] = {}

    return result


def compare_observed_vs_counterfactual(
    observed_inputs: dict[str, Any],
    counterfactual_inputs: dict[str, Any],
    observed_outputs: dict[str, float],
    counterfactual_outputs: dict[str, float],
    observed_run_id: str | None = None,
    counterfactual_run_id: str | None = None,
) -> CounterfactualComparison:
    """
    Compara el mundo observado con el contrafactual.

    Args:
        observed_inputs/outputs: Mundo real.
        counterfactual_inputs/outputs: Mundo alternativo.
        observed_run_id/counterfactual_run_id: IDs de runs opcionales.

    Returns:
        CounterfactualComparison con deltas y narrativa.
    """
    deltas: dict[str, Any] = {}

    all_metrics = set(observed_outputs) | set(counterfactual_outputs)
    for metric in all_metrics:
        obs_val = observed_outputs.get(metric)
        cf_val = counterfactual_outputs.get(metric)

        if obs_val is not None and cf_val is not None:
            delta_abs = cf_val - obs_val
            delta_pct = (delta_abs / abs(obs_val) * 100) if obs_val != 0 else None
            deltas[metric] = {
                "observed": round(obs_val, 4),
                "counterfactual": round(cf_val, 4),
                "delta_abs": round(delta_abs, 4),
                "delta_pct": round(delta_pct, 2) if delta_pct is not None else None,
                "direction": "higher" if delta_abs > 0 else "lower" if delta_abs < 0 else "unchanged",
            }
        elif obs_val is not None:
            deltas[metric] = {"observed": round(obs_val, 4), "counterfactual": None}
        elif cf_val is not None:
            deltas[metric] = {"observed": None, "counterfactual": round(cf_val, 4)}

    # Detectar cambios en inputs
    input_diffs = {
        k: {"observed": observed_inputs.get(k), "counterfactual": counterfactual_inputs.get(k)}
        for k in set(observed_inputs) | set(counterfactual_inputs)
        if observed_inputs.get(k) != counterfactual_inputs.get(k)
    }

    narrative = _build_narrative(input_diffs, deltas)

    return CounterfactualComparison(
        observed_run_id=observed_run_id,
        counterfactual_run_id=counterfactual_run_id,
        observed_inputs=observed_inputs,
        counterfactual_inputs=counterfactual_inputs,
        observed_outputs={k: v for k, v in observed_outputs.items()},
        counterfactual_outputs={k: v for k, v in counterfactual_outputs.items()},
        deltas=deltas,
        narrative=narrative,
    )


def _build_narrative(
    input_diffs: dict[str, Any],
    deltas: dict[str, Any],
) -> str:
    """Genera una narrativa en lenguaje natural de la comparación."""
    lines = []

    if input_diffs:
        changed = list(input_diffs.keys())[:5]
        lines.append(
            f"Variables modificadas en el contrafactual: {', '.join(changed)}"
            + (f" (y {len(input_diffs) - 5} más)" if len(input_diffs) > 5 else "")
            + "."
        )

    positive = [
        m for m, d in deltas.items()
        if isinstance(d, dict) and d.get("direction") == "higher"
    ]
    negative = [
        m for m, d in deltas.items()
        if isinstance(d, dict) and d.get("direction") == "lower"
    ]

    if positive:
        lines.append(
            f"En el escenario alternativo, serían mayores: {', '.join(positive[:3])}"
            + ("…" if len(positive) > 3 else "") + "."
        )
    if negative:
        lines.append(
            f"Serían menores: {', '.join(negative[:3])}"
            + ("…" if len(negative) > 3 else "") + "."
        )

    if not lines:
        lines.append("Sin diferencias significativas entre el escenario observado y el contrafactual.")

    return " ".join(lines)


def multi_counterfactual_comparison(
    observed_inputs: dict[str, Any],
    observed_outputs: dict[str, float],
    counterfactuals: list[dict[str, Any]],
    model_fn: Callable[[dict[str, Any]], dict[str, float]],
) -> list[dict[str, Any]]:
    """
    Compara múltiples contrafactuales contra el mundo observado.

    Args:
        counterfactuals: Lista de dicts con keys "name" y "overrides".
        model_fn: Función de modelo para calcular outputs.

    Returns:
        Lista de dicts con name, comparison (CounterfactualComparison), summary.
    """
    results = []

    for cf_spec in counterfactuals:
        name = cf_spec.get("name", "Contrafactual")
        overrides = cf_spec.get("overrides", {})

        cf_data = build_counterfactual_baseline(
            base_inputs=observed_inputs,
            counterfactual_overrides=overrides,
            model_fn=model_fn,
        )

        cf_outputs = cf_data.get("counterfactual_outputs", {})
        comparison = compare_observed_vs_counterfactual(
            observed_inputs=observed_inputs,
            counterfactual_inputs=cf_data["counterfactual_inputs"],
            observed_outputs=observed_outputs,
            counterfactual_outputs=cf_outputs,
        )

        # Resumen numérico
        total_impact = sum(
            abs(d.get("delta_abs", 0) or 0)
            for d in comparison.deltas.values()
            if isinstance(d, dict)
        )

        results.append({
            "name": name,
            "overrides": overrides,
            "comparison": comparison,
            "summary": {
                "n_metrics_changed": sum(
                    1 for d in comparison.deltas.values()
                    if isinstance(d, dict) and d.get("direction") != "unchanged"
                ),
                "total_impact": round(total_impact, 4),
                "narrative": comparison.narrative,
            },
        })

    return sorted(results, key=lambda x: x["summary"]["total_impact"], reverse=True)
