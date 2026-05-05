"""
Economic Simulation — Bloque 11.

Simulación de shocks económicos, efecto sobre voto e ITPE.
"""
from __future__ import annotations

import logging
from typing import Any

from models.simulation.schemas import SimulationResult

logger = logging.getLogger(__name__)


# Coeficientes de impacto económico sobre voto (literatura poli-económica)
# Basados en estudios para democracias europeas
_ECON_VOTE_COEFFICIENTS: dict[str, dict[str, float]] = {
    "gdp_growth": {
        "incumbent_vote_delta_per_point": +0.4,   # +0.4pp voto incumbente por +1pp PIB
    },
    "unemployment": {
        "incumbent_vote_delta_per_point": -0.5,   # -0.5pp voto incumbente por +1pp desempleo
    },
    "inflation": {
        "incumbent_vote_delta_per_point": -0.3,   # -0.3pp voto incumbente por +1pp inflación
    },
    "consumer_confidence": {
        "incumbent_vote_delta_per_point": +0.15,  # +0.15pp por +1 punto de confianza
    },
}


def simulate_economic_shock(
    current_indicators: dict[str, float],
    shock_deltas: dict[str, float],
    run_id: str = "economic",
) -> list[SimulationResult]:
    """
    Aplica un shock económico a los indicadores actuales.

    Args:
        current_indicators: Dict indicador → valor actual.
            Keys esperadas: gdp_growth, unemployment, inflation, consumer_confidence, etc.
        shock_deltas: Cambios a aplicar (additive).
        run_id: ID del run.

    Returns:
        Lista de SimulationResult para cada indicador afectado.
    """
    results = []

    for indicator, delta in shock_deltas.items():
        baseline = current_indicators.get(indicator, 0.0)
        simulated = baseline + delta

        results.append(
            SimulationResult(
                run_id=run_id,
                metric_name=f"econ_{indicator}",
                metric_label=f"Economía — {indicator}",
                baseline_value=round(baseline, 3),
                simulated_value=round(simulated, 3),
                delta_abs=round(delta, 3),
                delta_pct=(
                    round(delta / abs(baseline) * 100, 2) if baseline != 0 else None
                ),
                explanation=(
                    f"'{indicator}' cambia de {baseline:.2f} a {simulated:.2f} "
                    f"({delta:+.2f} pp/puntos)."
                ),
            )
        )

    return results


def simulate_economic_vote_effect(
    shock_deltas: dict[str, float],
    incumbent_baseline_vote: float,
    run_id: str = "economic",
    party_label: str = "Partido en gobierno",
) -> list[SimulationResult]:
    """
    Estima el efecto electoral de un shock económico sobre el partido en gobierno.

    Usa coeficientes de la literatura poli-económica (vote function model).

    Args:
        shock_deltas: Dict indicador → delta (ej. {"gdp_growth": -2.0}).
        incumbent_baseline_vote: Porcentaje de voto actual del incumbente.
        run_id: ID del run.
        party_label: Nombre o label del partido.

    Returns:
        Lista de SimulationResult (total effect + desglose por indicador).
    """
    results = []
    total_vote_delta = 0.0
    breakdown = []

    for indicator, delta in shock_deltas.items():
        coef_info = _ECON_VOTE_COEFFICIENTS.get(indicator)
        if coef_info is None:
            logger.debug("Sin coeficiente para indicador '%s'", indicator)
            continue

        coef = coef_info["incumbent_vote_delta_per_point"]
        vote_delta = coef * delta
        total_vote_delta += vote_delta

        breakdown.append({
            "indicator": indicator,
            "economic_delta": delta,
            "vote_coefficient": coef,
            "vote_delta": round(vote_delta, 3),
        })

        results.append(
            SimulationResult(
                run_id=run_id,
                metric_name=f"vote_effect_{indicator}",
                metric_label=f"Efecto sobre voto — {indicator}",
                baseline_value=0.0,
                simulated_value=round(vote_delta, 3),
                delta_abs=round(vote_delta, 3),
                explanation=(
                    f"'{indicator}' cambia en {delta:+.2f}: efecto estimado en voto = {vote_delta:+.3f}pp."
                ),
            )
        )

    # Resultado total
    new_vote = max(0.0, incumbent_baseline_vote + total_vote_delta)
    results.insert(
        0,
        SimulationResult(
            run_id=run_id,
            metric_name=f"vote_share_{party_label.replace(' ', '_').lower()}",
            metric_label=f"Voto estimado — {party_label}",
            baseline_value=round(incumbent_baseline_vote, 2),
            simulated_value=round(new_vote, 2),
            delta_abs=round(total_vote_delta, 2),
            delta_pct=(
                round(total_vote_delta / incumbent_baseline_vote * 100, 2)
                if incumbent_baseline_vote > 0 else None
            ),
            explanation=(
                f"Efecto económico neto sobre {party_label}: {total_vote_delta:+.2f}pp. "
                f"Voto estimado: {new_vote:.1f}%."
            ),
            metadata={"breakdown": breakdown},
        ),
    )

    return results


def simulate_itpe_change(
    current_itpe: float,
    economic_scenario: dict[str, float],
    run_id: str = "economic",
) -> list[SimulationResult]:
    """
    Simula el cambio en el Índice de Termómetro Político-Económico (ITPE).

    ITPE compuesto = f(PIB, desempleo, inflación, confianza del consumidor).
    Fórmula simplificada: ITPE = 50 + w_gdp * Δgdp - w_unemp * Δunemp - w_inf * Δinf + w_conf * Δconf

    Args:
        current_itpe: Valor actual del ITPE (0-100).
        economic_scenario: Dict con deltas de indicadores económicos.
        run_id: ID del run.

    Returns:
        Lista de SimulationResult.
    """
    weights = {
        "gdp_growth": +3.0,
        "unemployment": -4.0,
        "inflation": -2.5,
        "consumer_confidence": +0.5,
    }

    delta_itpe = 0.0
    for indicator, weight in weights.items():
        econ_delta = economic_scenario.get(indicator, 0.0)
        delta_itpe += weight * econ_delta

    new_itpe = max(0.0, min(100.0, current_itpe + delta_itpe))

    return [
        SimulationResult(
            run_id=run_id,
            metric_name="itpe",
            metric_label="Índice Termómetro Político-Económico (ITPE)",
            baseline_value=round(current_itpe, 2),
            simulated_value=round(new_itpe, 2),
            delta_abs=round(delta_itpe, 2),
            delta_pct=round(delta_itpe / current_itpe * 100, 2) if current_itpe > 0 else None,
            explanation=(
                f"ITPE cambia de {current_itpe:.1f} a {new_itpe:.1f} "
                f"({delta_itpe:+.2f} puntos) dado el escenario económico."
            ),
        )
    ]


def build_economic_scenario(
    scenario_type: str,
    base_indicators: dict[str, float] | None = None,
) -> dict[str, float]:
    """
    Construye un escenario económico predefinido.

    Args:
        scenario_type: "recession", "stagnation", "recovery", "boom", "stagflation".
        base_indicators: Indicadores base opcionales.

    Returns:
        Dict indicador → delta.
    """
    scenarios: dict[str, dict[str, float]] = {
        "recession": {
            "gdp_growth": -3.0,
            "unemployment": +4.0,
            "inflation": +0.5,
            "consumer_confidence": -20.0,
        },
        "stagnation": {
            "gdp_growth": -0.5,
            "unemployment": +1.0,
            "inflation": +1.0,
            "consumer_confidence": -5.0,
        },
        "recovery": {
            "gdp_growth": +2.5,
            "unemployment": -1.5,
            "inflation": +0.5,
            "consumer_confidence": +10.0,
        },
        "boom": {
            "gdp_growth": +4.0,
            "unemployment": -2.5,
            "inflation": +2.0,
            "consumer_confidence": +20.0,
        },
        "stagflation": {
            "gdp_growth": -1.0,
            "unemployment": +2.0,
            "inflation": +5.0,
            "consumer_confidence": -15.0,
        },
    }

    return scenarios.get(scenario_type, {})
