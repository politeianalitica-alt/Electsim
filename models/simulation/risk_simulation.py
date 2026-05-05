"""
Risk Simulation — Bloque 11.

Simulación de eventos de riesgo y contagio reputacional.
"""
from __future__ import annotations

import logging
import math
from typing import Any

from models.simulation.schemas import SimulationResult

logger = logging.getLogger(__name__)

# Tipos de riesgo y sus impactos base
_RISK_EVENT_PROFILES: dict[str, dict[str, Any]] = {
    "corruption_scandal": {
        "label": "Escándalo de corrupción",
        "vote_delta": -5.0,
        "trust_delta": -15.0,
        "coalition_stability_delta": -20.0,
        "duration_days": 30,
        "contagion_risk": 0.6,
    },
    "financial_scandal": {
        "label": "Escándalo financiero",
        "vote_delta": -3.5,
        "trust_delta": -12.0,
        "coalition_stability_delta": -10.0,
        "duration_days": 21,
        "contagion_risk": 0.4,
    },
    "policy_failure": {
        "label": "Fracaso de política pública",
        "vote_delta": -2.0,
        "trust_delta": -8.0,
        "coalition_stability_delta": -5.0,
        "duration_days": 14,
        "contagion_risk": 0.2,
    },
    "judicial_case": {
        "label": "Causa judicial",
        "vote_delta": -4.0,
        "trust_delta": -10.0,
        "coalition_stability_delta": -15.0,
        "duration_days": 60,
        "contagion_risk": 0.5,
    },
    "coalition_conflict": {
        "label": "Conflicto interno de coalición",
        "vote_delta": -2.5,
        "trust_delta": -6.0,
        "coalition_stability_delta": -25.0,
        "duration_days": 14,
        "contagion_risk": 0.3,
    },
    "economic_mismanagement": {
        "label": "Mala gestión económica",
        "vote_delta": -3.0,
        "trust_delta": -9.0,
        "coalition_stability_delta": -8.0,
        "duration_days": 30,
        "contagion_risk": 0.25,
    },
    "security_incident": {
        "label": "Incidente de seguridad",
        "vote_delta": +2.0,   # Rally around the flag effect
        "trust_delta": -2.0,
        "coalition_stability_delta": +5.0,
        "duration_days": 7,
        "contagion_risk": 0.1,
    },
}


def simulate_risk_event(
    actor_id: str,
    risk_type: str,
    severity: float = 1.0,
    current_vote_share: float = 30.0,
    current_trust: float = 40.0,
    current_coalition_stability: float = 60.0,
    run_id: str = "risk",
) -> list[SimulationResult]:
    """
    Simula el impacto de un evento de riesgo sobre un actor político.

    Args:
        actor_id: ID o nombre del actor.
        risk_type: Tipo de riesgo (ver _RISK_EVENT_PROFILES).
        severity: Multiplicador de severidad (1.0 = base, 2.0 = doble).
        current_vote_share: % de voto actual.
        current_trust: Índice de confianza actual (0-100).
        current_coalition_stability: Estabilidad de coalición (0-100).
        run_id: ID del run.

    Returns:
        Lista de SimulationResult.
    """
    profile = _RISK_EVENT_PROFILES.get(risk_type)
    if profile is None:
        logger.warning("Tipo de riesgo no reconocido: %s", risk_type)
        profile = {
            "label": risk_type,
            "vote_delta": -2.0,
            "trust_delta": -5.0,
            "coalition_stability_delta": -5.0,
            "duration_days": 14,
            "contagion_risk": 0.2,
        }

    results = []

    # 1. Impacto en voto
    vote_delta = profile["vote_delta"] * severity
    new_vote = max(0.0, current_vote_share + vote_delta)
    results.append(
        SimulationResult(
            run_id=run_id,
            metric_name=f"vote_share_{actor_id}",
            metric_label=f"Voto — {actor_id} (post-riesgo)",
            baseline_value=round(current_vote_share, 2),
            simulated_value=round(new_vote, 2),
            delta_abs=round(vote_delta, 2),
            explanation=(
                f"Riesgo '{profile['label']}' (severidad {severity:.1f}): "
                f"voto de {actor_id} cambia en {vote_delta:+.2f}pp."
            ),
        )
    )

    # 2. Impacto en confianza
    trust_delta = profile["trust_delta"] * severity
    new_trust = max(0.0, min(100.0, current_trust + trust_delta))
    results.append(
        SimulationResult(
            run_id=run_id,
            metric_name=f"trust_{actor_id}",
            metric_label=f"Confianza — {actor_id}",
            baseline_value=round(current_trust, 2),
            simulated_value=round(new_trust, 2),
            delta_abs=round(trust_delta, 2),
            explanation=f"Confianza de {actor_id}: {trust_delta:+.2f} puntos.",
        )
    )

    # 3. Impacto en estabilidad de coalición
    cs_delta = profile["coalition_stability_delta"] * severity
    new_cs = max(0.0, min(100.0, current_coalition_stability + cs_delta))
    results.append(
        SimulationResult(
            run_id=run_id,
            metric_name=f"coalition_stability_{actor_id}",
            metric_label=f"Estabilidad coalición — {actor_id}",
            baseline_value=round(current_coalition_stability, 2),
            simulated_value=round(new_cs, 2),
            delta_abs=round(cs_delta, 2),
            explanation=f"Estabilidad de coalición: {cs_delta:+.2f} puntos.",
        )
    )

    return results


def simulate_reputational_contagion(
    source_actor: str,
    connected_actors: list[dict[str, Any]],
    base_event_impact: float,
    contagion_probability: float = 0.3,
    run_id: str = "risk",
) -> list[SimulationResult]:
    """
    Simula el contagio reputacional desde un actor central a actores conectados.

    Args:
        source_actor: Actor origen del riesgo.
        connected_actors: Lista de dicts con {actor_id, connection_strength (0-1),
            current_vote_share, current_trust}.
        base_event_impact: Magnitud del impacto en el actor fuente.
        contagion_probability: Probabilidad base de contagio (0-1).
        run_id: ID del run.

    Returns:
        Lista de SimulationResult por actor contagiado.
    """
    results = []

    for actor_info in connected_actors:
        actor_id = actor_info.get("actor_id", "actor")
        connection_strength = float(actor_info.get("connection_strength", 0.5))

        # Intensidad del contagio = impacto_base * conexión * prob_contagio
        contagion_intensity = base_event_impact * connection_strength * contagion_probability

        if abs(contagion_intensity) < 0.1:
            continue  # Sin impacto significativo

        current_vote = float(actor_info.get("current_vote_share", 30.0))
        current_trust = float(actor_info.get("current_trust", 40.0))

        new_vote = max(0.0, current_vote + contagion_intensity)
        new_trust = max(0.0, min(100.0, current_trust + contagion_intensity * 2))

        results.append(
            SimulationResult(
                run_id=run_id,
                metric_name=f"vote_share_{actor_id}_contagion",
                metric_label=f"Voto — {actor_id} (contagio de {source_actor})",
                baseline_value=round(current_vote, 2),
                simulated_value=round(new_vote, 2),
                delta_abs=round(contagion_intensity, 2),
                explanation=(
                    f"Contagio reputacional desde {source_actor} a {actor_id} "
                    f"(fuerza conexión={connection_strength:.2f}): "
                    f"voto cambia en {contagion_intensity:+.2f}pp."
                ),
                metadata={
                    "source_actor": source_actor,
                    "connection_strength": connection_strength,
                    "contagion_probability": contagion_probability,
                },
            )
        )

        results.append(
            SimulationResult(
                run_id=run_id,
                metric_name=f"trust_{actor_id}_contagion",
                metric_label=f"Confianza — {actor_id} (contagio)",
                baseline_value=round(current_trust, 2),
                simulated_value=round(new_trust, 2),
                delta_abs=round(contagion_intensity * 2, 2),
                explanation=f"Confianza de {actor_id} afectada por contagio: {contagion_intensity * 2:+.2f}.",
            )
        )

    return results


def estimate_crisis_recovery_time(
    event_impact: float,
    actor_resilience: float = 0.5,
    media_pressure: float = 0.5,
) -> dict[str, Any]:
    """
    Estima el tiempo de recuperación tras una crisis.

    Args:
        event_impact: Magnitud del impacto (absoluto).
        actor_resilience: Resiliencia del actor (0-1). Mayor = más rápido.
        media_pressure: Presión mediática (0-1). Mayor = más lento.

    Returns:
        Dict con estimated_days_to_recover, recovery_pct_per_week, full_recovery_likely.
    """
    # Días de recuperación base
    base_days = abs(event_impact) * 10
    resilience_factor = 1 - (actor_resilience * 0.5)
    media_factor = 1 + (media_pressure * 0.8)
    estimated_days = base_days * resilience_factor * media_factor

    weekly_recovery_pct = min(100.0, (actor_resilience * 20) / max(1, media_pressure * 2))
    full_recovery_likely = actor_resilience > 0.6 and media_pressure < 0.7

    return {
        "estimated_days_to_recover": round(estimated_days),
        "recovery_pct_per_week": round(weekly_recovery_pct, 1),
        "full_recovery_likely": full_recovery_likely,
        "actor_resilience": actor_resilience,
        "media_pressure": media_pressure,
        "prognosis": (
            "favorable" if full_recovery_likely and estimated_days < 30
            else "uncertain" if estimated_days < 60
            else "challenging"
        ),
    }


def list_risk_event_types() -> list[dict[str, Any]]:
    """Devuelve los tipos de riesgo disponibles con sus perfiles."""
    return [
        {
            "risk_type": key,
            "label": profile["label"],
            "vote_impact_base": profile["vote_delta"],
            "trust_impact_base": profile["trust_delta"],
            "duration_days": profile["duration_days"],
            "contagion_risk": profile["contagion_risk"],
        }
        for key, profile in _RISK_EVENT_PROFILES.items()
    ]
