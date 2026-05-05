"""
Media Simulation — Bloque 11.

Simulación de spikes de narrativa, cambio de sentimiento y efecto media→campaña.
"""
from __future__ import annotations

import logging
import math
from typing import Any

from models.simulation.schemas import SimulationResult

logger = logging.getLogger(__name__)


def simulate_narrative_spike(
    actor_id: str,
    current_sentiment: float,
    spike_intensity: float,
    spike_duration_days: int,
    decay_factor: float = 0.15,
    run_id: str = "media",
) -> list[SimulationResult]:
    """
    Simula el impacto de un spike de cobertura mediática sobre el sentimiento de un actor.

    Modelo: sentimiento decae exponencialmente tras el pico.
    new_sentiment(t) = baseline + delta * exp(-decay_factor * t)

    Args:
        actor_id: ID o nombre del actor.
        current_sentiment: Sentimiento actual (-1 a 1 o 0-100).
        spike_intensity: Intensidad del spike (negativo = crisis).
        spike_duration_days: Duración del spike en días.
        decay_factor: Tasa de decaimiento exponencial.
        run_id: ID del run.

    Returns:
        Lista de SimulationResult (impacto inmediato + proyecciones a 7/14/30 días).
    """
    results = []
    checkpoints = [0, 7, 14, 30]

    for day in checkpoints:
        if day == 0:
            simulated = current_sentiment + spike_intensity
        else:
            simulated = current_sentiment + spike_intensity * math.exp(-decay_factor * day)

        # Clamp según rango del sentimiento
        if -1.0 <= current_sentiment <= 1.0:
            simulated = max(-1.0, min(1.0, simulated))
        else:
            simulated = max(0.0, min(100.0, simulated))

        delta = simulated - current_sentiment

        results.append(
            SimulationResult(
                run_id=run_id,
                metric_name=f"sentiment_{actor_id}_d{day}",
                metric_label=f"Sentimiento {actor_id} (día {day})",
                baseline_value=round(current_sentiment, 4),
                simulated_value=round(simulated, 4),
                delta_abs=round(delta, 4),
                delta_pct=(
                    round(delta / abs(current_sentiment) * 100, 2)
                    if current_sentiment != 0 else None
                ),
                explanation=(
                    f"Sentimiento de {actor_id} en día {day}: {simulated:.3f} "
                    f"(spike {spike_intensity:+.2f}, decay {decay_factor})."
                ),
            )
        )

    return results


def simulate_actor_sentiment_shift(
    actor_id: str,
    current_approval: float,
    media_events: list[dict[str, Any]],
    run_id: str = "media",
) -> list[SimulationResult]:
    """
    Simula el cambio de aprobación de un actor dado múltiples eventos mediáticos.

    Args:
        actor_id: ID del actor.
        current_approval: Aprobación actual (0-100).
        media_events: Lista de eventos. Cada evento: {type, intensity, duration_days}.
            type puede ser: "scandal", "achievement", "debate", "endorsement", "neutral".
        run_id: ID del run.

    Returns:
        Lista de SimulationResult.
    """
    event_type_multipliers = {
        "scandal": -1.5,
        "corruption": -2.0,
        "achievement": +0.8,
        "debate_win": +1.2,
        "debate_loss": -0.8,
        "endorsement": +0.5,
        "neutral": 0.0,
        "policy_success": +1.0,
        "gaffe": -1.0,
    }

    total_delta = 0.0
    event_impacts = []

    for event in media_events:
        event_type = event.get("type", "neutral")
        intensity = float(event.get("intensity", 1.0))
        multiplier = event_type_multipliers.get(event_type, 0.0)
        impact = multiplier * intensity
        total_delta += impact
        event_impacts.append({
            "type": event_type,
            "intensity": intensity,
            "impact": round(impact, 3),
        })

    new_approval = max(0.0, min(100.0, current_approval + total_delta))

    results = [
        SimulationResult(
            run_id=run_id,
            metric_name=f"approval_{actor_id}",
            metric_label=f"Aprobación — {actor_id}",
            baseline_value=round(current_approval, 2),
            simulated_value=round(new_approval, 2),
            delta_abs=round(total_delta, 2),
            delta_pct=(
                round(total_delta / current_approval * 100, 2)
                if current_approval > 0 else None
            ),
            explanation=(
                f"Aprobación de {actor_id}: {current_approval:.1f}% → {new_approval:.1f}% "
                f"tras {len(media_events)} eventos mediáticos (Δ={total_delta:+.2f})."
            ),
            metadata={"event_impacts": event_impacts},
        )
    ]

    return results


def simulate_media_to_campaign_effect(
    media_coverage_delta: float,
    sentiment_delta: float,
    current_vote_share: float,
    party_id: str,
    media_sensitivity: float = 0.3,
    sentiment_sensitivity: float = 0.5,
    run_id: str = "media",
) -> list[SimulationResult]:
    """
    Estima el efecto de la cobertura mediática sobre la intención de voto.

    Modelo lineal:
    vote_delta = media_sensitivity * coverage_delta + sentiment_sensitivity * sentiment_delta

    Args:
        media_coverage_delta: Cambio en cobertura (pp/puntos).
        sentiment_delta: Cambio en sentimiento (-1 a 1).
        current_vote_share: Cuota de voto actual (%).
        party_id: ID del partido.
        media_sensitivity: Coeficiente cobertura→voto.
        sentiment_sensitivity: Coeficiente sentimiento→voto.
        run_id: ID del run.

    Returns:
        Lista de SimulationResult.
    """
    vote_delta_from_coverage = media_sensitivity * media_coverage_delta
    vote_delta_from_sentiment = sentiment_sensitivity * sentiment_delta * 10  # escalar
    total_vote_delta = vote_delta_from_coverage + vote_delta_from_sentiment

    new_vote_share = max(0.0, current_vote_share + total_vote_delta)

    return [
        SimulationResult(
            run_id=run_id,
            metric_name=f"vote_share_{party_id}",
            metric_label=f"Voto — {party_id} (efecto media)",
            baseline_value=round(current_vote_share, 2),
            simulated_value=round(new_vote_share, 2),
            delta_abs=round(total_vote_delta, 2),
            delta_pct=(
                round(total_vote_delta / current_vote_share * 100, 2)
                if current_vote_share > 0 else None
            ),
            explanation=(
                f"Efecto mediático sobre {party_id}: "
                f"cobertura ({vote_delta_from_coverage:+.2f}pp) + "
                f"sentimiento ({vote_delta_from_sentiment:+.2f}pp) = "
                f"{total_vote_delta:+.2f}pp total."
            ),
            metadata={
                "vote_delta_from_coverage": round(vote_delta_from_coverage, 3),
                "vote_delta_from_sentiment": round(vote_delta_from_sentiment, 3),
                "media_coverage_delta": media_coverage_delta,
                "sentiment_delta": sentiment_delta,
            },
        )
    ]


def estimate_media_amplification(
    base_event_impact: float,
    media_reach: float,
    virality_score: float,
    polarization_index: float = 0.5,
) -> dict[str, float]:
    """
    Estima el efecto de amplificación mediática de un evento.

    Args:
        base_event_impact: Impacto base del evento (sin amplificación).
        media_reach: Alcance mediático (0-1).
        virality_score: Puntuación de viralidad (0-1).
        polarization_index: Índice de polarización del entorno (0-1).

    Returns:
        Dict con amplification_factor, amplified_impact, estimated_duration_days.
    """
    # Factor de amplificación compuesto
    amplification_factor = 1.0 + (
        0.5 * media_reach +
        0.3 * virality_score +
        0.2 * polarization_index
    ) * 2.0

    amplified_impact = base_event_impact * amplification_factor
    estimated_duration_days = max(1, int(7 * media_reach + 14 * virality_score))

    return {
        "amplification_factor": round(amplification_factor, 3),
        "amplified_impact": round(amplified_impact, 3),
        "estimated_duration_days": estimated_duration_days,
        "media_reach": media_reach,
        "virality_score": virality_score,
        "polarization_index": polarization_index,
    }
