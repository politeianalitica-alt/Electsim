"""
Simulation Runner — Bloque 11.

Motor central que orquesta la ejecución de escenarios.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any, Callable

from models.simulation.schemas import (
    ScenarioAssumption,
    SimulationResult,
    SimulationRun,
)
from models.simulation.assumption_store import assumptions_to_model_inputs
from models.simulation.monte_carlo import run_monte_carlo, summarize_monte_carlo_results

logger = logging.getLogger(__name__)


class SimulationRunner:
    """
    Orquestador de simulaciones.

    Permite registrar modelos por nombre y ejecutarlos sobre un escenario.
    """

    def __init__(self, model_name: str, model_version: str = "1.0"):
        self.model_name = model_name
        self.model_version = model_version
        self._models: dict[str, Callable[[dict[str, Any]], dict[str, float]]] = {}

    def register_model(
        self,
        name: str,
        fn: Callable[[dict[str, Any]], dict[str, float]],
    ) -> None:
        """Registra una función de modelo bajo un nombre."""
        self._models[name] = fn
        logger.debug("Modelo '%s' registrado en SimulationRunner", name)

    def get_model(self, name: str) -> Callable[[dict[str, Any]], dict[str, float]] | None:
        """Recupera un modelo registrado por nombre."""
        return self._models.get(name)

    def run_scenario(
        self,
        scenario_id: str,
        assumptions: list[ScenarioAssumption],
        model_name: str | None = None,
        n_iterations: int = 500,
        seed: int | None = None,
        baseline_inputs: dict[str, Any] | None = None,
        use_monte_carlo: bool = True,
    ) -> tuple[SimulationRun, list[SimulationResult]]:
        """
        Ejecuta un escenario completo.

        Args:
            scenario_id: ID del escenario.
            assumptions: Supuestos del escenario.
            model_name: Nombre del modelo a usar. Si None, usa el primero disponible.
            n_iterations: Iteraciones Monte Carlo.
            seed: Semilla aleatoria.
            baseline_inputs: Inputs base complementarios.
            use_monte_carlo: Si True y hay distribuciones, usa Monte Carlo.

        Returns:
            Tuple (SimulationRun, list[SimulationResult]).
        """
        # Seleccionar modelo
        effective_model_name = model_name or self.model_name
        model_fn = self._models.get(effective_model_name)

        if model_fn is None and self._models:
            # Usar el primero disponible
            effective_model_name = next(iter(self._models))
            model_fn = self._models[effective_model_name]

        # Crear SimulationRun
        run = SimulationRun(
            scenario_id=scenario_id,
            model_name=effective_model_name,
            model_version=self.model_version,
            status="running",
            n_iterations=n_iterations if use_monte_carlo else 1,
            random_seed=seed,
            inputs=assumptions_to_model_inputs(assumptions),
        )

        if model_fn is None:
            logger.warning(
                "No hay modelo disponible para '%s'. Retornando run fallido.",
                effective_model_name,
            )
            run.status = "failed"
            run.warnings.append("No hay función de modelo registrada.")
            return run, []

        start = time.time()

        try:
            stochastic = [a for a in assumptions if a.distribution is not None]

            if use_monte_carlo and stochastic:
                # Monte Carlo
                base_in = dict(baseline_inputs or {})
                base_in.update(assumptions_to_model_inputs(assumptions, use_scenario_value=False))

                mc_results = run_monte_carlo(
                    model_fn=model_fn,
                    assumptions=stochastic,
                    n_iterations=n_iterations,
                    seed=seed,
                    baseline_inputs=base_in,
                )

                # Baseline puntual para calcular deltas
                try:
                    baseline_out = model_fn(base_in)
                except Exception:
                    baseline_out = {}

                results = summarize_monte_carlo_results(
                    mc_results=mc_results,
                    run_id=run.run_id,
                    baseline_values=baseline_out,
                )
                run.metrics["n_monte_carlo_iterations"] = n_iterations
            else:
                # Ejecución determinística
                inputs = dict(baseline_inputs or {})
                inputs.update(assumptions_to_model_inputs(assumptions))

                output = model_fn(inputs)
                results = [
                    SimulationResult(
                        run_id=run.run_id,
                        metric_name=metric,
                        simulated_value=float(value),
                        explanation=f"Resultado determinístico de '{effective_model_name}'.",
                    )
                    for metric, value in output.items()
                    if isinstance(value, (int, float))
                ]
                run.metrics["deterministic"] = True

            elapsed = time.time() - start
            run.status = "completed"
            run.finished_at = datetime.now(timezone.utc)
            run.duration_seconds = round(elapsed, 3)
            run.outputs = {r.metric_name: r.simulated_value for r in results if r.simulated_value is not None}
            run.confidence = _compute_run_confidence(results, assumptions)

            logger.info(
                "SimulationRun %s completado: %d métricas en %.2fs",
                run.run_id, len(results), elapsed,
            )

        except Exception as exc:
            elapsed = time.time() - start
            run.status = "failed"
            run.finished_at = datetime.now(timezone.utc)
            run.duration_seconds = round(elapsed, 3)
            run.warnings.append(f"Error en ejecución: {exc}")
            logger.error("Error en SimulationRun %s: %s", run.run_id, exc)
            results = []

        return run, results


def run_simple_simulation(
    model_fn: Callable[[dict[str, Any]], dict[str, float]],
    assumptions: list[ScenarioAssumption],
    scenario_id: str = "adhoc",
    model_name: str = "simple_model",
    n_iterations: int = 500,
    seed: int | None = None,
    baseline_inputs: dict[str, Any] | None = None,
) -> tuple[SimulationRun, list[SimulationResult]]:
    """
    Función de conveniencia para ejecutar una simulación sin instanciar el runner.

    Returns:
        Tuple (SimulationRun, list[SimulationResult]).
    """
    runner = SimulationRunner(model_name=model_name)
    runner.register_model(model_name, model_fn)
    return runner.run_scenario(
        scenario_id=scenario_id,
        assumptions=assumptions,
        model_name=model_name,
        n_iterations=n_iterations,
        seed=seed,
        baseline_inputs=baseline_inputs,
    )


def _compute_run_confidence(
    results: list[SimulationResult],
    assumptions: list[ScenarioAssumption],
) -> float:
    """Calcula una confianza global del run basada en supuestos y resultados."""
    if not assumptions:
        return 0.5

    avg_assumption_confidence = sum(a.confidence for a in assumptions) / len(assumptions)

    # Penalización si hay muchos resultados sin bounds
    results_with_bounds = sum(1 for r in results if r.lower_bound is not None)
    coverage_bonus = (results_with_bounds / len(results)) * 0.1 if results else 0.0

    return round(min(1.0, avg_assumption_confidence + coverage_bonus), 3)
