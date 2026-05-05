"""
Simulation Core Service — Bloque 11.

Funciones de acceso a datos de simulación para el dashboard.
Degradación graceful: sin DB → retorna datos vacíos.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Escenarios ─────────────────────────────────────────────────────────────────

def cargar_escenarios(
    domain: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Carga escenarios de simulación desde caché o DB.

    Returns:
        Lista de dicts con datos de escenario.
    """
    try:
        from models.simulation.scenario_registry import list_scenarios
        scenarios = list_scenarios(domain=domain, status=status)
        return [s.model_dump() for s in scenarios[:limit]]
    except Exception as exc:
        logger.debug("Error cargando escenarios: %s", exc)
        return []


def cargar_escenario(scenario_id: str) -> dict[str, Any] | None:
    """Carga un escenario por ID."""
    try:
        from models.simulation.scenario_registry import get_scenario
        scenario = get_scenario(scenario_id)
        return scenario.model_dump() if scenario else None
    except Exception as exc:
        logger.debug("Error cargando escenario %s: %s", scenario_id, exc)
        return None


# ── Runs y resultados ──────────────────────────────────────────────────────────

def cargar_runs(
    scenario_id: str | None = None,
    model_name: str | None = None,
    status: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Carga simulation runs con filtros opcionales.

    Returns:
        Lista de dicts con datos del run.
    """
    try:
        from models.simulation.experiment_registry import list_runs
        runs = list_runs(
            scenario_id=scenario_id,
            model_name=model_name,
            status=status,
            limit=limit,
        )
        return [r.model_dump() for r in runs]
    except Exception as exc:
        logger.debug("Error cargando runs: %s", exc)
        return []


def cargar_resultados_run(run_id: str) -> list[dict[str, Any]]:
    """Carga los resultados de un run específico."""
    try:
        from models.simulation.experiment_registry import get_results
        results = get_results(run_id)
        return [r.model_dump() for r in results]
    except Exception as exc:
        logger.debug("Error cargando resultados de run %s: %s", run_id, exc)
        return []


# ── KPIs ───────────────────────────────────────────────────────────────────────

def cargar_kpis_simulacion() -> dict[str, Any]:
    """
    Carga KPIs globales del módulo de simulación.

    Returns:
        Dict con métricas de uso del módulo.
    """
    try:
        from models.simulation.scenario_registry import list_scenarios
        from models.simulation.experiment_registry import list_runs

        all_scenarios = list_scenarios()
        all_runs = list_runs(limit=500)

        n_scenarios = len(all_scenarios)
        n_completed_runs = sum(1 for r in all_runs if r.get("status") == "completed")
        n_failed_runs = sum(1 for r in all_runs if r.get("status") == "failed")
        n_domains = len({s.get("domain") for s in all_scenarios if s.get("domain")})

        domains = {}
        for s in all_scenarios:
            d = s.get("domain", "mixed")
            domains[d] = domains.get(d, 0) + 1

        return {
            "n_scenarios": n_scenarios,
            "n_runs_total": len(all_runs),
            "n_runs_completed": n_completed_runs,
            "n_runs_failed": n_failed_runs,
            "n_domains": n_domains,
            "domains": domains,
            "n_scenarios_draft": sum(1 for s in all_scenarios if s.get("status") == "draft"),
            "n_scenarios_completed": sum(1 for s in all_scenarios if s.get("status") == "completed"),
        }
    except Exception as exc:
        logger.debug("Error cargando KPIs simulación: %s", exc)
        return {
            "n_scenarios": 0,
            "n_runs_total": 0,
            "n_runs_completed": 0,
            "n_runs_failed": 0,
            "n_domains": 0,
        }


# ── Stress testing ─────────────────────────────────────────────────────────────

def cargar_stress_templates() -> list[dict[str, Any]]:
    """
    Carga los templates de stress testing predefinidos.

    Returns:
        Lista de dicts con configuraciones de stress.
    """
    try:
        from models.simulation.stress_testing import predefined_stress_scenarios
        configs = predefined_stress_scenarios()
        return [c.model_dump() for c in configs]
    except Exception as exc:
        logger.debug("Error cargando stress templates: %s", exc)
        return []


# ── Sensibilidad ───────────────────────────────────────────────────────────────

def cargar_sensitivity_results(run_id: str) -> list[dict[str, Any]]:
    """Carga resultados de sensibilidad para un run."""
    try:
        from models.simulation.experiment_registry import get_results, get_run
        # Los sensitivity results se almacenan como SimulationResult con metadata especial
        results = get_results(run_id)
        sensitivity = [
            r.model_dump()
            for r in results
            if r.metadata.get("is_sensitivity")
        ]
        return sensitivity
    except Exception as exc:
        logger.debug("Error cargando sensitivity results: %s", exc)
        return []


# ── Comparación ────────────────────────────────────────────────────────────────

def comparar_escenarios(
    scenario_ids: list[str],
    metrics: list[str] | None = None,
) -> dict[str, Any]:
    """
    Compara múltiples escenarios y devuelve tabla de comparación.

    Returns:
        Dict con comparison_table, ranking, summary.
    """
    try:
        from models.simulation.experiment_registry import list_runs, get_results
        from models.simulation.scenario_comparison import compare_scenarios
        from models.simulation.scenario_registry import get_scenario

        scenarios_data = []
        for sid in scenario_ids:
            scenario = get_scenario(sid)
            runs = list_runs(scenario_id=sid, status="completed", limit=1)
            if runs and scenario:
                results = get_results(runs[0].run_id if hasattr(runs[0], "run_id") else runs[0]["run_id"])
                scenarios_data.append({
                    "name": scenario.name,
                    "run_id": runs[0].run_id if hasattr(runs[0], "run_id") else runs[0]["run_id"],
                    "results": results,
                })

        if not scenarios_data:
            return {"error": "No hay runs completados para los escenarios seleccionados."}

        return compare_scenarios(scenarios_data, metrics_to_compare=metrics)

    except Exception as exc:
        logger.debug("Error comparando escenarios: %s", exc)
        return {"error": str(exc)}


# ── Explicabilidad ─────────────────────────────────────────────────────────────

def explicar_run(run_id: str) -> dict[str, Any]:
    """Genera una explicación completa de un run."""
    try:
        from models.simulation.experiment_registry import get_run, get_results
        from models.simulation.explainers import explain_simulation_run

        run = get_run(run_id)
        if run is None:
            return {"error": f"Run {run_id} no encontrado."}

        results = get_results(run_id)
        return explain_simulation_run(run=run, results=results)

    except Exception as exc:
        logger.debug("Error explicando run %s: %s", run_id, exc)
        return {"error": str(exc)}
