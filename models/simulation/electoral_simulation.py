"""
Electoral Simulation — Bloque 11.

Simulación de transferencias de voto, participación y distribución de escaños.
Envuelve la lógica de D'Hondt de etl/electoral_math.py.
"""
from __future__ import annotations

import logging
import math
from typing import Any

from models.simulation.schemas import SimulationResult

logger = logging.getLogger(__name__)


def simulate_vote_shift(
    current_shares: dict[str, float],
    shifts: dict[str, float],
    total_votes: int | None = None,
    run_id: str = "electoral",
) -> list[SimulationResult]:
    """
    Simula cambios en el reparto de voto aplicando deltas en puntos porcentuales.

    Args:
        current_shares: Dict partido → porcentaje actual (0-100).
        shifts: Dict partido → delta en puntos porcentuales.
        total_votes: Número total de votos (opcional, para valores absolutos).
        run_id: ID del run.

    Returns:
        Lista de SimulationResult con nuevas cuotas de voto.
    """
    new_shares: dict[str, float] = {}
    for party, share in current_shares.items():
        delta = shifts.get(party, 0.0)
        new_shares[party] = max(0.0, share + delta)

    # Normalizar para que sumen 100 si era un % completo
    total = sum(current_shares.values())
    if abs(total - 100.0) < 1.0:
        new_total = sum(new_shares.values())
        if new_total > 0:
            new_shares = {p: s / new_total * 100 for p, s in new_shares.items()}

    results = []
    for party in current_shares:
        baseline = current_shares[party]
        simulated = new_shares.get(party, 0.0)
        delta_abs = simulated - baseline
        delta_pct = (delta_abs / baseline * 100) if baseline > 0 else None

        results.append(
            SimulationResult(
                run_id=run_id,
                metric_name=f"vote_share_{party}",
                metric_label=f"Intención de voto — {party}",
                baseline_value=round(baseline, 2),
                simulated_value=round(simulated, 2),
                delta_abs=round(delta_abs, 2),
                delta_pct=round(delta_pct, 2) if delta_pct is not None else None,
                explanation=f"Cambio de {delta_abs:+.2f}pp en intención de voto de {party}.",
            )
        )

    return results


def simulate_turnout_shift(
    current_turnout: float,
    delta_pp: float,
    party_turnout_sensitivity: dict[str, float] | None = None,
    current_shares: dict[str, float] | None = None,
    run_id: str = "electoral",
) -> list[SimulationResult]:
    """
    Simula el impacto de un cambio en la participación sobre las cuotas de voto.

    Args:
        current_turnout: Participación actual (0-100).
        delta_pp: Cambio en participación en puntos porcentuales.
        party_turnout_sensitivity: Dict partido → sensibilidad (cuántos pp gana/pierde
            por cada pp de cambio en participación). Default: 0.0 para todos.
        current_shares: Cuotas actuales de voto (para calcular cambio en escaños).
        run_id: ID del run.

    Returns:
        Lista de SimulationResult.
    """
    party_turnout_sensitivity = party_turnout_sensitivity or {}
    new_turnout = max(0.0, min(100.0, current_turnout + delta_pp))

    results = [
        SimulationResult(
            run_id=run_id,
            metric_name="turnout",
            metric_label="Participación electoral",
            baseline_value=round(current_turnout, 2),
            simulated_value=round(new_turnout, 2),
            delta_abs=round(delta_pp, 2),
            delta_pct=round(delta_pp / current_turnout * 100, 2) if current_turnout > 0 else None,
            explanation=f"Participación pasa de {current_turnout:.1f}% a {new_turnout:.1f}%.",
        )
    ]

    if current_shares:
        new_shares: dict[str, float] = {}
        for party, share in current_shares.items():
            sensitivity = party_turnout_sensitivity.get(party, 0.0)
            new_shares[party] = max(0.0, share + sensitivity * delta_pp)

        # Renormalizar
        new_total = sum(new_shares.values())
        if new_total > 0 and abs(sum(current_shares.values()) - 100.0) < 1.0:
            new_shares = {p: s / new_total * 100 for p, s in new_shares.items()}

        for party, baseline_share in current_shares.items():
            sim_share = new_shares.get(party, baseline_share)
            d_abs = sim_share - baseline_share
            results.append(
                SimulationResult(
                    run_id=run_id,
                    metric_name=f"vote_share_{party}",
                    metric_label=f"Voto — {party}",
                    baseline_value=round(baseline_share, 2),
                    simulated_value=round(sim_share, 2),
                    delta_abs=round(d_abs, 2),
                    explanation=(
                        f"Efecto de cambio en participación sobre {party}: {d_abs:+.2f}pp."
                    ),
                )
            )

    return results


def simulate_seat_distribution(
    vote_shares: dict[str, float],
    total_seats: int,
    threshold_pct: float = 3.0,
    run_id: str = "electoral",
    baseline_seats: dict[str, int] | None = None,
) -> list[SimulationResult]:
    """
    Calcula la distribución de escaños por D'Hondt dado un reparto de voto.

    Args:
        vote_shares: Dict partido → % de voto (0-100).
        total_seats: Escaños totales a distribuir.
        threshold_pct: Umbral de entrada (%).
        run_id: ID del run.
        baseline_seats: Distribución de escaños de referencia.

    Returns:
        Lista de SimulationResult con escaños.
    """
    # Filtrar por umbral
    eligible = {p: s for p, s in vote_shares.items() if s >= threshold_pct}

    if not eligible:
        logger.warning("Ningún partido supera el umbral del %.1f%%", threshold_pct)
        return []

    # D'Hondt
    seats = _dhondt(eligible, total_seats)

    results = []
    for party in vote_shares:
        assigned = seats.get(party, 0)
        baseline = (baseline_seats or {}).get(party)
        delta = (assigned - baseline) if baseline is not None else None

        results.append(
            SimulationResult(
                run_id=run_id,
                metric_name=f"seats_{party}",
                metric_label=f"Escaños — {party}",
                baseline_value=float(baseline) if baseline is not None else None,
                simulated_value=float(assigned),
                delta_abs=float(delta) if delta is not None else None,
                explanation=(
                    f"{party}: {assigned} escaños"
                    + (f" ({delta:+d} vs baseline)" if delta is not None else "")
                    + f" con {vote_shares.get(party, 0):.1f}% del voto."
                ),
            )
        )

    return results


def _dhondt(vote_shares: dict[str, float], total_seats: int) -> dict[str, int]:
    """Algoritmo D'Hondt puro."""
    seats: dict[str, int] = {p: 0 for p in vote_shares}

    for _ in range(total_seats):
        quotients = {
            p: vote_shares[p] / (seats[p] + 1)
            for p in vote_shares
        }
        winner = max(quotients, key=lambda p: quotients[p])
        seats[winner] += 1

    return seats


def estimate_coalition_majority(
    seat_results: list[SimulationResult],
    coalition_parties: list[str],
    total_seats: int,
    majority_threshold: float = 0.5,
) -> dict[str, Any]:
    """
    Estima si una coalición alcanza mayoría.

    Args:
        seat_results: SimulationResults de simulate_seat_distribution.
        coalition_parties: Partidos que forman la coalición.
        total_seats: Total de escaños de la cámara.
        majority_threshold: Fracción necesaria (default 50%).

    Returns:
        Dict con coalition_seats, majority_seats_needed, has_majority.
    """
    majority_seats = math.ceil(total_seats * majority_threshold) + 1
    coalition_seats = sum(
        int(r.simulated_value or 0)
        for r in seat_results
        if any(party in r.metric_name for party in coalition_parties)
    )

    return {
        "coalition_parties": coalition_parties,
        "coalition_seats": coalition_seats,
        "total_seats": total_seats,
        "majority_seats_needed": majority_seats,
        "has_majority": coalition_seats >= majority_seats,
        "seats_gap": coalition_seats - majority_seats,
        "majority_pct": round(coalition_seats / total_seats * 100, 1),
    }
