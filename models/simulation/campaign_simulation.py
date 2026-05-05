"""
Campaign Simulation — Bloque 11.

Wrapper sobre dashboard/services/campaign_simulator.py existente.
Añade interface simulación unificada sin reemplazar la lógica original.
"""
from __future__ import annotations

import logging
from typing import Any

from models.simulation.schemas import SimulationResult

logger = logging.getLogger(__name__)


# ── Wrapper sobre campaign_simulator existente ─────────────────────────────────

def _load_campaign_simulator() -> Any | None:
    """Carga el simulador de campaña existente (degradación graceful)."""
    try:
        from dashboard.services import campaign_simulator
        return campaign_simulator
    except ImportError:
        logger.debug("campaign_simulator no disponible")
    except Exception as exc:
        logger.warning("Error cargando campaign_simulator: %s", exc)
    return None


def simulate_campaign_intervention(
    party_id: str,
    intervention_type: str,
    parameters: dict[str, Any],
    baseline_vote_share: float,
    run_id: str = "campaign",
) -> list[SimulationResult]:
    """
    Simula una intervención de campaña usando el motor existente o reglas propias.

    Args:
        party_id: ID del partido.
        intervention_type: Tipo de intervención de campaña.
            Valores: "message_broadcast", "negative_ad", "ground_mobilization",
                     "debate_strategy", "endorsement_activation", "digital_push".
        parameters: Parámetros de la intervención.
        baseline_vote_share: Cuota de voto baseline.
        run_id: ID del run.

    Returns:
        Lista de SimulationResult.
    """
    # Intentar usar el motor existente
    simulator = _load_campaign_simulator()
    if simulator is not None:
        try:
            return _run_with_existing_simulator(
                simulator, party_id, intervention_type, parameters,
                baseline_vote_share, run_id,
            )
        except Exception as exc:
            logger.warning("Error en campaign_simulator existente: %s. Usando reglas propias.", exc)

    # Fallback: reglas propias
    return _run_with_rules(
        party_id, intervention_type, parameters, baseline_vote_share, run_id
    )


def _run_with_existing_simulator(
    simulator: Any,
    party_id: str,
    intervention_type: str,
    parameters: dict[str, Any],
    baseline_vote_share: float,
    run_id: str,
) -> list[SimulationResult]:
    """Delega al simulador de campaña existente."""
    # Intentar llamar a las funciones del simulador existente
    result_dict: dict[str, Any] = {}

    if hasattr(simulator, "simulate_intervention"):
        result_dict = simulator.simulate_intervention(
            party_id=party_id,
            intervention_type=intervention_type,
            parameters=parameters,
        )
    elif hasattr(simulator, "run_campaign_simulation"):
        result_dict = simulator.run_campaign_simulation(
            party=party_id,
            **parameters,
        )

    if not result_dict:
        raise ValueError("El simulador no devolvió resultados")

    results = []
    for metric, value in result_dict.items():
        if isinstance(value, (int, float)):
            results.append(
                SimulationResult(
                    run_id=run_id,
                    metric_name=f"{metric}_{party_id}",
                    baseline_value=baseline_vote_share if "vote" in metric else None,
                    simulated_value=float(value),
                    delta_abs=float(value) - baseline_vote_share if "vote" in metric else None,
                    explanation=f"Resultado de campaign_simulator para {party_id}: {metric}={value}.",
                )
            )

    return results


def _run_with_rules(
    party_id: str,
    intervention_type: str,
    parameters: dict[str, Any],
    baseline_vote_share: float,
    run_id: str,
) -> list[SimulationResult]:
    """Motor de reglas propio para intervenciones de campaña."""
    # Impactos base por tipo de intervención
    intervention_impacts: dict[str, dict[str, float]] = {
        "message_broadcast": {
            "vote_delta_direct": +0.8,
            "awareness_delta": +5.0,
        },
        "negative_ad": {
            "vote_delta_direct": +0.5,
            "opponent_vote_delta": -0.6,
            "backfire_risk": 0.25,
        },
        "ground_mobilization": {
            "turnout_delta": +3.0,
            "vote_delta_direct": +0.4,
        },
        "debate_strategy": {
            "vote_delta_direct": +1.2,
            "awareness_delta": +8.0,
        },
        "endorsement_activation": {
            "vote_delta_direct": +0.6,
            "trust_delta": +3.0,
        },
        "digital_push": {
            "vote_delta_direct": +0.5,
            "young_voter_delta": +2.0,
        },
    }

    impact = intervention_impacts.get(intervention_type, {"vote_delta_direct": 0.0})

    budget_multiplier = min(2.0, float(parameters.get("budget_multiplier", 1.0)))
    targeting_quality = float(parameters.get("targeting_quality", 0.7))
    message_resonance = float(parameters.get("message_resonance", 0.6))

    effectiveness = budget_multiplier * targeting_quality * message_resonance

    results = []

    # Voto directo
    base_vote_delta = impact.get("vote_delta_direct", 0.0)
    vote_delta = base_vote_delta * effectiveness
    new_vote = max(0.0, baseline_vote_share + vote_delta)

    results.append(
        SimulationResult(
            run_id=run_id,
            metric_name=f"vote_share_{party_id}",
            metric_label=f"Voto — {party_id} (intervención campaña)",
            baseline_value=round(baseline_vote_share, 2),
            simulated_value=round(new_vote, 2),
            delta_abs=round(vote_delta, 2),
            delta_pct=(
                round(vote_delta / baseline_vote_share * 100, 2)
                if baseline_vote_share > 0 else None
            ),
            explanation=(
                f"Intervención '{intervention_type}' en {party_id}: "
                f"voto cambia en {vote_delta:+.2f}pp (efectividad={effectiveness:.2f})."
            ),
            metadata={
                "intervention_type": intervention_type,
                "effectiveness": round(effectiveness, 3),
                "budget_multiplier": budget_multiplier,
            },
        )
    )

    # Métricas adicionales
    for metric_key, base_value in impact.items():
        if metric_key == "vote_delta_direct":
            continue
        if metric_key == "backfire_risk":
            results.append(
                SimulationResult(
                    run_id=run_id,
                    metric_name=f"backfire_risk_{party_id}",
                    metric_label=f"Riesgo de backfire — {party_id}",
                    simulated_value=round(float(base_value) * (1 - message_resonance), 3),
                    explanation=f"Riesgo de que la intervención sea contraproducente.",
                )
            )
        else:
            sim_val = base_value * effectiveness
            results.append(
                SimulationResult(
                    run_id=run_id,
                    metric_name=f"{metric_key}_{party_id}",
                    simulated_value=round(sim_val, 2),
                    explanation=f"Métrica '{metric_key}' estimada para {party_id}: {sim_val:.2f}.",
                )
            )

    return results


def simulate_campaign_portfolio(
    party_id: str,
    interventions: list[dict[str, Any]],
    baseline_vote_share: float,
    run_id: str = "campaign_portfolio",
) -> dict[str, Any]:
    """
    Simula un portfolio de intervenciones de campaña (acumulativo).

    Args:
        interventions: Lista de dicts con {type, parameters, weight (0-1)}.
        baseline_vote_share: Cuota de voto inicial.
        run_id: ID del run.

    Returns:
        Dict con results_by_intervention, total_results, portfolio_summary.
    """
    cumulative_vote = baseline_vote_share
    all_results: list[dict[str, Any]] = []

    for i, interv in enumerate(interventions):
        interv_type = interv.get("type", "message_broadcast")
        params = interv.get("parameters", {})
        weight = float(interv.get("weight", 1.0))

        results = simulate_campaign_intervention(
            party_id=party_id,
            intervention_type=interv_type,
            parameters={**params, "budget_multiplier": weight},
            baseline_vote_share=cumulative_vote,
            run_id=f"{run_id}_step{i}",
        )

        # Actualizar baseline para la siguiente intervención
        for r in results:
            if f"vote_share_{party_id}" == r.metric_name:
                cumulative_vote = r.simulated_value or cumulative_vote
                break

        all_results.append({
            "step": i,
            "intervention_type": interv_type,
            "results": results,
        })

    total_delta = cumulative_vote - baseline_vote_share

    return {
        "party_id": party_id,
        "baseline_vote_share": baseline_vote_share,
        "final_vote_share": round(cumulative_vote, 2),
        "total_vote_delta": round(total_delta, 2),
        "n_interventions": len(interventions),
        "results_by_intervention": all_results,
        "portfolio_summary": {
            "net_effect": round(total_delta, 2),
            "direction": "positive" if total_delta > 0 else "negative",
            "effectiveness_rating": (
                "high" if abs(total_delta) > 3
                else "medium" if abs(total_delta) > 1
                else "low"
            ),
        },
    }


def estimate_campaign_backfire_risk(
    intervention_type: str,
    message_negativity: float,
    target_audience_alignment: float,
    media_environment: float = 0.5,
) -> dict[str, Any]:
    """
    Estima el riesgo de que una intervención de campaña sea contraproducente.

    Args:
        intervention_type: Tipo de intervención.
        message_negativity: Negatividad del mensaje (0=neutral, 1=muy negativo).
        target_audience_alignment: Alineación con la audiencia objetivo (0-1).
        media_environment: Temperatura mediática (0=favorable, 1=hostil).

    Returns:
        Dict con backfire_probability, risk_level, recommendations.
    """
    base_risk = 0.1

    # Más negativo → más riesgo
    negativity_risk = message_negativity * 0.3

    # Menor alineación → más riesgo
    alignment_risk = (1 - target_audience_alignment) * 0.25

    # Entorno mediático hostil → más riesgo
    media_risk = media_environment * 0.2

    # Algunos tipos son inherentemente más arriesgados
    type_risk = {
        "negative_ad": 0.15,
        "debate_strategy": 0.05,
        "message_broadcast": 0.05,
        "ground_mobilization": 0.02,
        "endorsement_activation": 0.03,
        "digital_push": 0.08,
    }.get(intervention_type, 0.10)

    backfire_probability = min(0.95, base_risk + negativity_risk + alignment_risk + media_risk + type_risk)

    risk_level = (
        "critical" if backfire_probability > 0.6
        else "high" if backfire_probability > 0.4
        else "medium" if backfire_probability > 0.2
        else "low"
    )

    recommendations = []
    if message_negativity > 0.7:
        recommendations.append("Reducir la negatividad del mensaje o añadir marco constructivo.")
    if target_audience_alignment < 0.4:
        recommendations.append("Mejorar la segmentación del mensaje hacia la audiencia objetivo.")
    if media_environment > 0.7:
        recommendations.append("Considerar esperar un entorno mediático más favorable.")
    if not recommendations:
        recommendations.append("El riesgo es manejable; proceder con monitorización continua.")

    return {
        "intervention_type": intervention_type,
        "backfire_probability": round(backfire_probability, 3),
        "risk_level": risk_level,
        "risk_breakdown": {
            "base": round(base_risk, 3),
            "negativity": round(negativity_risk, 3),
            "alignment": round(alignment_risk, 3),
            "media_environment": round(media_risk, 3),
            "intervention_type": round(type_risk, 3),
        },
        "recommendations": recommendations,
    }
