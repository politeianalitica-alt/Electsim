"""
Scenario Comparison — Bloque 11.

Comparación estructurada de múltiples escenarios y runs.
"""
from __future__ import annotations

import logging
from typing import Any

from models.simulation.schemas import SimulationResult

logger = logging.getLogger(__name__)


def compare_scenarios(
    scenarios: list[dict[str, Any]],
    metrics_to_compare: list[str] | None = None,
) -> dict[str, Any]:
    """
    Compara múltiples escenarios de simulación.

    Args:
        scenarios: Lista de dicts con {name, run_id, results: list[SimulationResult]}.
        metrics_to_compare: Lista de métricas a incluir. None = todas.

    Returns:
        Dict con comparison_table, ranking, best_worst_by_metric, summary.
    """
    if not scenarios:
        return {"error": "No se proporcionaron escenarios para comparar."}

    # Construir tabla de comparación
    all_metrics: set[str] = set()
    for scenario in scenarios:
        results: list[SimulationResult] = scenario.get("results", [])
        for r in results:
            if metrics_to_compare is None or r.metric_name in metrics_to_compare:
                all_metrics.add(r.metric_name)

    comparison_table: dict[str, dict[str, float | None]] = {}
    for metric in sorted(all_metrics):
        comparison_table[metric] = {}
        for scenario in scenarios:
            name = scenario.get("name", "?")
            results = scenario.get("results", [])
            metric_result = next(
                (r for r in results if r.metric_name == metric), None
            )
            comparison_table[metric][name] = (
                metric_result.simulated_value if metric_result else None
            )

    # Ranking por métrica (mayor = mejor por defecto)
    best_by_metric: dict[str, str] = {}
    worst_by_metric: dict[str, str] = {}
    for metric, values in comparison_table.items():
        valid = {k: v for k, v in values.items() if v is not None}
        if valid:
            best_by_metric[metric] = max(valid, key=lambda k: valid[k])
            worst_by_metric[metric] = min(valid, key=lambda k: valid[k])

    # Ranking global (conteo de "mejores")
    win_counts: dict[str, int] = {s.get("name", "?"): 0 for s in scenarios}
    for metric_best in best_by_metric.values():
        if metric_best in win_counts:
            win_counts[metric_best] += 1

    ranking = sorted(win_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "n_scenarios": len(scenarios),
        "n_metrics": len(all_metrics),
        "scenario_names": [s.get("name", "?") for s in scenarios],
        "comparison_table": comparison_table,
        "best_by_metric": best_by_metric,
        "worst_by_metric": worst_by_metric,
        "ranking": [
            {"scenario": name, "metrics_won": count, "rank": i + 1}
            for i, (name, count) in enumerate(ranking)
        ],
        "winner": ranking[0][0] if ranking else None,
        "summary": _build_comparison_summary(scenarios, comparison_table, ranking),
    }


def sensitivity_across_scenarios(
    scenarios: list[dict[str, Any]],
    target_metric: str,
) -> dict[str, Any]:
    """
    Analiza cuánto varía una métrica específica entre escenarios.

    Returns:
        Dict con values_by_scenario, range, std_dev, coefficient_of_variation.
    """
    values: dict[str, float] = {}
    for scenario in scenarios:
        name = scenario.get("name", "?")
        results: list[SimulationResult] = scenario.get("results", [])
        metric_result = next(
            (r for r in results if r.metric_name == target_metric), None
        )
        if metric_result and metric_result.simulated_value is not None:
            values[name] = metric_result.simulated_value

    if not values:
        return {
            "target_metric": target_metric,
            "error": "Métrica no encontrada en los escenarios.",
        }

    vals = list(values.values())
    mean_val = sum(vals) / len(vals)
    variance = sum((v - mean_val) ** 2 for v in vals) / max(1, len(vals) - 1)
    std_dev = variance ** 0.5
    cv = std_dev / abs(mean_val) if mean_val != 0 else None

    return {
        "target_metric": target_metric,
        "values_by_scenario": {k: round(v, 4) for k, v in values.items()},
        "min": round(min(vals), 4),
        "max": round(max(vals), 4),
        "range": round(max(vals) - min(vals), 4),
        "mean": round(mean_val, 4),
        "std_dev": round(std_dev, 4),
        "coefficient_of_variation": round(cv, 4) if cv is not None else None,
        "most_optimistic_scenario": max(values, key=lambda k: values[k]),
        "most_pessimistic_scenario": min(values, key=lambda k: values[k]),
    }


def _build_comparison_summary(
    scenarios: list[dict[str, Any]],
    comparison_table: dict[str, dict[str, float | None]],
    ranking: list[tuple[str, int]],
) -> str:
    """Genera un resumen narrativo de la comparación."""
    n_scen = len(scenarios)
    n_metrics = len(comparison_table)

    winner = ranking[0][0] if ranking else "ninguno"
    winner_wins = ranking[0][1] if ranking else 0

    return (
        f"Comparación de {n_scen} escenarios en {n_metrics} métricas. "
        f"El escenario con mejores resultados globales es '{winner}' "
        f"(mejor en {winner_wins} de {n_metrics} métricas)."
    )
