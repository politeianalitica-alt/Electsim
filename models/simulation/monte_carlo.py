"""
Monte Carlo Engine — Bloque 11.

Simulación Monte Carlo con distribuciones normal, uniforme,
triangular y discreta. Sin dependencias externas obligatorias.
"""
from __future__ import annotations

import logging
import math
import random
from typing import Any, Callable

from models.simulation.schemas import ScenarioAssumption, SimulationResult

logger = logging.getLogger(__name__)


# ── Muestreo de distribuciones ─────────────────────────────────────────────────

def _sample_normal(mean: float, std: float, rng: random.Random) -> float:
    return rng.gauss(mean, std)


def _sample_uniform(low: float, high: float, rng: random.Random) -> float:
    return rng.uniform(low, high)


def _sample_triangular(low: float, high: float, mode: float, rng: random.Random) -> float:
    return rng.triangular(low, high, mode)


def _sample_discrete(
    values: list[Any],
    weights: list[float],
    rng: random.Random,
) -> Any:
    return rng.choices(values, weights=weights, k=1)[0]


def sample_assumption(
    assumption: ScenarioAssumption,
    rng: random.Random,
) -> Any:
    """
    Muestrea un valor de un supuesto según su distribución.

    Si no hay distribución, devuelve scenario_value (o baseline_value si es None).
    """
    if assumption.distribution is not None:
        dist_type = assumption.distribution.get("type", "")
        try:
            if dist_type == "normal":
                return _sample_normal(
                    float(assumption.distribution["mean"]),
                    float(assumption.distribution["std"]),
                    rng,
                )
            elif dist_type == "uniform":
                return _sample_uniform(
                    float(assumption.distribution["low"]),
                    float(assumption.distribution["high"]),
                    rng,
                )
            elif dist_type == "triangular":
                return _sample_triangular(
                    float(assumption.distribution["low"]),
                    float(assumption.distribution["high"]),
                    float(assumption.distribution["mode"]),
                    rng,
                )
            elif dist_type == "discrete":
                return _sample_discrete(
                    assumption.distribution["values"],
                    assumption.distribution["weights"],
                    rng,
                )
        except (KeyError, ValueError, TypeError) as exc:
            logger.warning(
                "Error muestreando distribución de '%s': %s",
                assumption.variable_name,
                exc,
            )

    # Fallback: valor puntual
    return assumption.scenario_value if assumption.scenario_value is not None else assumption.baseline_value


# ── Motor Monte Carlo ──────────────────────────────────────────────────────────

def run_monte_carlo(
    model_fn: Callable[[dict[str, Any]], dict[str, float]],
    assumptions: list[ScenarioAssumption],
    n_iterations: int = 1000,
    seed: int | None = None,
    baseline_inputs: dict[str, Any] | None = None,
) -> dict[str, list[float]]:
    """
    Ejecuta n_iterations iteraciones Monte Carlo.

    Args:
        model_fn: Función que recibe dict de inputs y devuelve dict métrica→valor.
        assumptions: Supuestos con distribuciones para muestrear.
        n_iterations: Número de iteraciones.
        seed: Semilla aleatoria para reproducibilidad.
        baseline_inputs: Inputs base (completados con muestras de assumptions).

    Returns:
        Dict métrica → lista de n_iterations valores.
    """
    rng = random.Random(seed)
    base = dict(baseline_inputs or {})
    results: dict[str, list[float]] = {}

    stochastic = [a for a in assumptions if a.distribution is not None]
    deterministic = [a for a in assumptions if a.distribution is None]

    # Inputs determinísticos fijos
    fixed_inputs: dict[str, Any] = dict(base)
    for a in deterministic:
        val = a.scenario_value if a.scenario_value is not None else a.baseline_value
        if val is not None:
            fixed_inputs[a.variable_name] = val

    for _ in range(n_iterations):
        inputs = dict(fixed_inputs)
        for a in stochastic:
            sampled = sample_assumption(a, rng)
            if sampled is not None:
                inputs[a.variable_name] = sampled

        try:
            output = model_fn(inputs)
            for metric, value in output.items():
                if isinstance(value, (int, float)) and not math.isnan(value):
                    results.setdefault(metric, []).append(float(value))
        except Exception as exc:
            logger.debug("Iteración Monte Carlo falló: %s", exc)

    return results


def summarize_monte_carlo_results(
    mc_results: dict[str, list[float]],
    run_id: str,
    baseline_values: dict[str, float] | None = None,
    confidence_level: float = 0.9,
) -> list[SimulationResult]:
    """
    Convierte resultados brutos de Monte Carlo en SimulationResult estructurados.

    Args:
        mc_results: Salida de run_monte_carlo().
        run_id: ID del SimulationRun asociado.
        baseline_values: Valores de referencia por métrica.
        confidence_level: Intervalo de confianza (default 90%).

    Returns:
        Lista de SimulationResult.
    """
    baseline_values = baseline_values or {}
    alpha = (1 - confidence_level) / 2
    results: list[SimulationResult] = []

    for metric, values in mc_results.items():
        if not values:
            continue

        sorted_vals = sorted(values)
        n = len(sorted_vals)
        mean_val = sum(values) / n
        lower_idx = max(0, int(alpha * n))
        upper_idx = min(n - 1, int((1 - alpha) * n))

        baseline = baseline_values.get(metric)
        delta_abs = (mean_val - baseline) if baseline is not None else None
        delta_pct = (delta_abs / abs(baseline) * 100) if (baseline and delta_abs is not None) else None

        prob_positive = sum(1 for v in values if v > (baseline or 0)) / n
        prob_negative = 1.0 - prob_positive

        results.append(
            SimulationResult(
                run_id=run_id,
                metric_name=metric,
                baseline_value=baseline,
                simulated_value=round(mean_val, 4),
                delta_abs=round(delta_abs, 4) if delta_abs is not None else None,
                delta_pct=round(delta_pct, 2) if delta_pct is not None else None,
                lower_bound=round(sorted_vals[lower_idx], 4),
                upper_bound=round(sorted_vals[upper_idx], 4),
                probability_positive=round(prob_positive, 3),
                probability_negative=round(prob_negative, 3),
                explanation=(
                    f"Monte Carlo ({n} iteraciones, IC {confidence_level:.0%}): "
                    f"media={mean_val:.3f}, rango=[{sorted_vals[lower_idx]:.3f}, {sorted_vals[upper_idx]:.3f}]"
                ),
            )
        )

    return results


def compute_probability_metric(
    values: list[float],
    threshold: float,
    direction: str = "above",
) -> float:
    """
    Calcula la probabilidad de que una métrica supere/baje un umbral.

    Args:
        values: Lista de valores de la distribución posterior.
        threshold: Umbral de referencia.
        direction: "above" (P(X > threshold)) o "below" (P(X < threshold)).

    Returns:
        Probabilidad entre 0 y 1.
    """
    if not values:
        return 0.0

    if direction == "above":
        return sum(1 for v in values if v > threshold) / len(values)
    elif direction == "below":
        return sum(1 for v in values if v < threshold) / len(values)
    else:
        raise ValueError(f"direction debe ser 'above' o 'below', no '{direction}'")


def compute_percentiles(
    values: list[float],
    percentiles: list[float] | None = None,
) -> dict[str, float]:
    """
    Calcula percentiles de una distribución.

    Args:
        values: Lista de valores.
        percentiles: Lista de percentiles (0-100). Default: [5, 25, 50, 75, 95].

    Returns:
        Dict "pXX" → valor.
    """
    if not values:
        return {}

    percentiles = percentiles or [5, 25, 50, 75, 95]
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    result = {}

    for p in percentiles:
        idx = max(0, min(n - 1, int(p / 100 * n)))
        result[f"p{int(p)}"] = round(sorted_vals[idx], 4)

    return result
