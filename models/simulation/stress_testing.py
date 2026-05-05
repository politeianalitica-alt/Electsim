"""
Stress Testing — Bloque 11.

Escenarios de choque predefinidos y motor de stress testing.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from models.simulation.schemas import (
    ScenarioAssumption,
    SimulationResult,
    StressTestConfig,
)
from models.simulation.monte_carlo import run_monte_carlo, summarize_monte_carlo_results

logger = logging.getLogger(__name__)


# ── Shocks predefinidos ────────────────────────────────────────────────────────

_PREDEFINED_SHOCKS: dict[str, dict[str, Any]] = {
    "economic_recession": {
        "shock_type": "economic_shock",
        "name": "Recesión económica",
        "magnitude": "severe",
        "description": "Caída del PIB del -3% en 4 trimestres, desempleo +4pp",
        "parameters": {
            "gdp_growth_delta": -3.0,
            "unemployment_delta": +4.0,
            "inflation_delta": +1.5,
            "consumer_confidence_delta": -20.0,
        },
    },
    "economic_boom": {
        "shock_type": "economic_shock",
        "name": "Boom económico",
        "magnitude": "moderate",
        "description": "Crecimiento del PIB del +3.5%, desempleo -2pp",
        "parameters": {
            "gdp_growth_delta": +3.5,
            "unemployment_delta": -2.0,
            "consumer_confidence_delta": +15.0,
        },
    },
    "media_scandal": {
        "shock_type": "media_crisis",
        "name": "Escándalo mediático",
        "magnitude": "moderate",
        "description": "Cobertura negativa masiva durante 2 semanas",
        "parameters": {
            "negative_coverage_spike": 5.0,
            "duration_days": 14,
            "sentiment_delta": -0.3,
            "trust_delta": -8.0,
        },
    },
    "corruption_case": {
        "shock_type": "media_crisis",
        "name": "Caso de corrupción",
        "magnitude": "severe",
        "description": "Imputación de dirigente clave",
        "parameters": {
            "negative_coverage_spike": 8.0,
            "duration_days": 30,
            "trust_delta": -15.0,
            "vote_intention_delta": -4.0,
        },
    },
    "legal_ban": {
        "shock_type": "legal_shock",
        "name": "Inhabilitación judicial",
        "magnitude": "extreme",
        "description": "Tribunal inhabilita a candidato principal",
        "parameters": {
            "candidate_removed": True,
            "vote_intention_delta": -6.0,
            "party_unity_delta": -20.0,
        },
    },
    "coalition_collapse": {
        "shock_type": "coalition_breakdown",
        "name": "Ruptura de coalición",
        "magnitude": "severe",
        "description": "Socio de gobierno abandona la coalición",
        "parameters": {
            "coalition_seats_lost": True,
            "stability_index_delta": -30.0,
            "early_election_probability": 0.6,
        },
    },
    "turnout_collapse": {
        "shock_type": "turnout_collapse",
        "name": "Desplome de participación",
        "magnitude": "severe",
        "description": "Participación cae 12pp por desafección",
        "parameters": {
            "turnout_delta": -12.0,
            "abstention_delta": +12.0,
        },
    },
    "polling_error": {
        "shock_type": "polling_error",
        "name": "Error sistemático de encuestas",
        "magnitude": "moderate",
        "description": "Encuestas subestimaron al partido A en 5pp",
        "parameters": {
            "systematic_bias": +5.0,
            "direction": "underestimate_winner",
        },
    },
    "campaign_backfire": {
        "shock_type": "campaign_backfire",
        "name": "Campaña contraproducente",
        "magnitude": "moderate",
        "description": "Mensaje negativo que rebota en el atacante",
        "parameters": {
            "message_backfire_factor": -0.5,
            "attacker_vote_delta": -2.0,
            "target_sympathy_delta": +1.5,
        },
    },
    "geopolitical_crisis": {
        "shock_type": "geopolitical_event",
        "name": "Crisis geopolítica",
        "magnitude": "severe",
        "description": "Conflicto regional con impacto en seguridad y economía",
        "parameters": {
            "security_concern_spike": +25.0,
            "economic_uncertainty_delta": +15.0,
            "incumbent_rally_effect": +3.0,
        },
    },
}


def predefined_stress_scenarios() -> list[StressTestConfig]:
    """
    Devuelve los escenarios de stress predefinidos.

    Returns:
        Lista de StressTestConfig.
    """
    configs = []
    for key, shock in _PREDEFINED_SHOCKS.items():
        configs.append(
            StressTestConfig(
                name=shock["name"],
                shock_type=shock["shock_type"],  # type: ignore[arg-type]
                magnitude=shock["magnitude"],  # type: ignore[arg-type]
                parameters=shock["parameters"],
                description=shock.get("description"),
            )
        )
    return configs


def get_predefined_shock(shock_key: str) -> StressTestConfig | None:
    """
    Recupera un shock predefinido por su clave.

    Args:
        shock_key: Clave del shock (ej. "economic_recession").

    Returns:
        StressTestConfig o None.
    """
    shock = _PREDEFINED_SHOCKS.get(shock_key)
    if shock is None:
        return None
    return StressTestConfig(
        name=shock["name"],
        shock_type=shock["shock_type"],  # type: ignore[arg-type]
        magnitude=shock["magnitude"],  # type: ignore[arg-type]
        parameters=shock["parameters"],
        description=shock.get("description"),
    )


# ── Motor de stress ────────────────────────────────────────────────────────────

def run_stress_test(
    model_fn: Callable[[dict[str, Any]], dict[str, float]],
    base_inputs: dict[str, Any],
    stress_config: StressTestConfig,
    n_iterations: int = 500,
    seed: int | None = None,
    run_id: str = "stress",
) -> dict[str, Any]:
    """
    Ejecuta un stress test aplicando los parámetros del choque.

    Strategy:
    1. Aplica los parámetros del choque como deltas sobre base_inputs.
    2. Añade incertidumbre según la magnitud.
    3. Corre Monte Carlo con n_iterations.

    Args:
        model_fn: Función de modelo.
        base_inputs: Inputs base (sin choque).
        stress_config: Configuración del choque.
        n_iterations: Iteraciones Monte Carlo.
        seed: Semilla aleatoria.
        run_id: ID del run para los resultados.

    Returns:
        Dict con stressed_inputs, results (SimulationResult), summary.
    """
    # 1. Construir inputs estresados
    stressed_inputs = dict(base_inputs)
    for param, value in stress_config.parameters.items():
        if isinstance(value, (int, float)):
            current = stressed_inputs.get(param, 0.0)
            if isinstance(current, (int, float)):
                stressed_inputs[param] = float(current) + float(value)
            else:
                stressed_inputs[param] = float(value)
        else:
            stressed_inputs[param] = value

    # 2. Crear supuestos con incertidumbre según magnitud
    magnitude_std: dict[str, float] = {
        "mild": 0.05,
        "moderate": 0.10,
        "severe": 0.15,
        "extreme": 0.25,
    }
    std_factor = magnitude_std.get(stress_config.magnitude, 0.10)

    stochastic_assumptions: list[ScenarioAssumption] = []
    for param, value in stress_config.parameters.items():
        if isinstance(value, (int, float)) and abs(float(value)) > 0:
            std = abs(float(value)) * std_factor
            stochastic_assumptions.append(
                ScenarioAssumption(
                    scenario_id="stress",
                    variable_name=param,
                    scenario_value=float(value),
                    distribution={
                        "type": "normal",
                        "mean": float(value),
                        "std": std,
                    },
                )
            )

    # 3. Monte Carlo
    mc_results = run_monte_carlo(
        model_fn=model_fn,
        assumptions=stochastic_assumptions,
        n_iterations=n_iterations,
        seed=seed,
        baseline_inputs=stressed_inputs,
    )

    # Baseline: ejecutar modelo con inputs base (sin choque)
    try:
        baseline_output = model_fn(base_inputs)
    except Exception:
        baseline_output = {}

    simulation_results = summarize_monte_carlo_results(
        mc_results=mc_results,
        run_id=run_id,
        baseline_values=baseline_output,
    )

    # Summary
    max_impact = max(
        (abs(r.delta_abs or 0) for r in simulation_results),
        default=0.0,
    )
    affected_metrics = [
        r.metric_name
        for r in simulation_results
        if r.delta_abs is not None and abs(r.delta_abs) > 0.001
    ]

    return {
        "stress_config": stress_config.model_dump(),
        "stressed_inputs": stressed_inputs,
        "n_iterations": n_iterations,
        "results": simulation_results,
        "summary": {
            "shock_type": stress_config.shock_type,
            "magnitude": stress_config.magnitude,
            "n_metrics_affected": len(affected_metrics),
            "affected_metrics": affected_metrics,
            "max_impact": round(max_impact, 4),
            "severity": _classify_severity(max_impact, stress_config.magnitude),
        },
    }


def compare_stress_scenarios(
    model_fn: Callable[[dict[str, Any]], dict[str, float]],
    base_inputs: dict[str, Any],
    shock_keys: list[str],
    n_iterations: int = 200,
    seed: int | None = None,
) -> list[dict[str, Any]]:
    """
    Compara múltiples escenarios de stress.

    Args:
        model_fn: Función de modelo.
        base_inputs: Inputs base.
        shock_keys: Lista de claves de shocks predefinidos.
        n_iterations: Iteraciones por escenario.
        seed: Semilla.

    Returns:
        Lista de dicts con resultados por escenario.
    """
    comparisons = []
    for key in shock_keys:
        config = get_predefined_shock(key)
        if config is None:
            logger.warning("Shock no encontrado: %s", key)
            continue
        result = run_stress_test(
            model_fn=model_fn,
            base_inputs=base_inputs,
            stress_config=config,
            n_iterations=n_iterations,
            seed=seed,
            run_id=f"stress_{key}",
        )
        comparisons.append({"shock_key": key, **result})

    return sorted(
        comparisons,
        key=lambda x: x["summary"]["max_impact"],
        reverse=True,
    )


def _classify_severity(max_impact: float, magnitude: str) -> str:
    """Clasifica la severidad del impacto."""
    if magnitude == "extreme" or max_impact > 10:
        return "critical"
    elif magnitude == "severe" or max_impact > 5:
        return "high"
    elif magnitude == "moderate" or max_impact > 2:
        return "medium"
    else:
        return "low"
