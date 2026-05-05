"""
Experiment Registry — Bloque 11.

Registro de experimentos y tracking de runs.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from models.simulation.schemas import SimulationResult, SimulationRun

logger = logging.getLogger(__name__)

# Registros en memoria
_RUNS: dict[str, SimulationRun] = {}
_RESULTS: dict[str, list[SimulationResult]] = {}  # run_id → results
_EXPERIMENTS: dict[str, dict[str, Any]] = {}


def register_run(
    run: SimulationRun,
    results: list[SimulationResult] | None = None,
    experiment_name: str | None = None,
    tags: list[str] | None = None,
) -> str:
    """
    Registra un SimulationRun en el registry.

    Returns:
        run_id.
    """
    _RUNS[run.run_id] = run
    if results is not None:
        _RESULTS[run.run_id] = results

    if experiment_name:
        _EXPERIMENTS.setdefault(experiment_name, {
            "name": experiment_name,
            "run_ids": [],
            "tags": tags or [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        if run.run_id not in _EXPERIMENTS[experiment_name]["run_ids"]:
            _EXPERIMENTS[experiment_name]["run_ids"].append(run.run_id)

    logger.debug("Run %s registrado (experiment=%s)", run.run_id, experiment_name)
    return run.run_id


def get_run(run_id: str) -> SimulationRun | None:
    """Recupera un run por ID."""
    return _RUNS.get(run_id)


def get_results(run_id: str) -> list[SimulationResult]:
    """Recupera los resultados de un run."""
    return _RESULTS.get(run_id, [])


def list_runs(
    scenario_id: str | None = None,
    model_name: str | None = None,
    status: str | None = None,
    experiment_name: str | None = None,
    limit: int = 50,
) -> list[SimulationRun]:
    """Lista runs con filtros opcionales."""
    runs = list(_RUNS.values())

    if scenario_id:
        runs = [r for r in runs if r.scenario_id == scenario_id]
    if model_name:
        runs = [r for r in runs if r.model_name == model_name]
    if status:
        runs = [r for r in runs if r.status == status]
    if experiment_name and experiment_name in _EXPERIMENTS:
        exp_run_ids = set(_EXPERIMENTS[experiment_name]["run_ids"])
        runs = [r for r in runs if r.run_id in exp_run_ids]

    return sorted(runs, key=lambda r: r.started_at, reverse=True)[:limit]


def list_experiments() -> list[dict[str, Any]]:
    """Lista todos los experimentos registrados."""
    result = []
    for name, exp in _EXPERIMENTS.items():
        n_runs = len(exp["run_ids"])
        completed = sum(
            1 for run_id in exp["run_ids"]
            if _RUNS.get(run_id, {}) and
            getattr(_RUNS.get(run_id), "status", "") == "completed"
        )
        result.append({
            **exp,
            "n_runs": n_runs,
            "n_completed": completed,
        })
    return result


def get_best_run(
    scenario_id: str,
    metric_name: str,
    higher_is_better: bool = True,
) -> SimulationRun | None:
    """
    Recupera el run con mejor resultado en una métrica dada.

    Args:
        scenario_id: ID del escenario.
        metric_name: Métrica a optimizar.
        higher_is_better: Si True, mayor = mejor.

    Returns:
        SimulationRun con mejor resultado, o None.
    """
    runs = list_runs(scenario_id=scenario_id, status="completed")
    if not runs:
        return None

    best_run = None
    best_value = None

    for run in runs:
        results = get_results(run.run_id)
        metric_result = next(
            (r for r in results if r.metric_name == metric_name), None
        )
        if metric_result and metric_result.simulated_value is not None:
            val = metric_result.simulated_value
            if best_value is None:
                best_value = val
                best_run = run
            elif (higher_is_better and val > best_value) or (not higher_is_better and val < best_value):
                best_value = val
                best_run = run

    return best_run


def compare_runs(run_ids: list[str]) -> dict[str, Any]:
    """
    Compara múltiples runs por sus métricas de salida.

    Returns:
        Dict con comparison_table y resumen.
    """
    all_metrics: set[str] = set()
    for run_id in run_ids:
        for r in get_results(run_id):
            all_metrics.add(r.metric_name)

    table: dict[str, dict[str, float | None]] = {}
    for metric in sorted(all_metrics):
        table[metric] = {}
        for run_id in run_ids:
            results = get_results(run_id)
            metric_res = next((r for r in results if r.metric_name == metric), None)
            table[metric][run_id] = metric_res.simulated_value if metric_res else None

    return {
        "run_ids": run_ids,
        "n_metrics": len(all_metrics),
        "comparison_table": table,
    }


def clear_registry() -> None:
    """Limpia el registry en memoria (útil para tests)."""
    _RUNS.clear()
    _RESULTS.clear()
    _EXPERIMENTS.clear()
