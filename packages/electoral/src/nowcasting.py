"""
Nowcasting electoral — modelos de ponderacion de encuestas.

Funciones puras sin efectos secundarios.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Optional
import math


@dataclass
class Poll:
    pollster: str
    date: date
    sample_size: int
    results: Dict[str, float]  # {partido: porcentaje}
    methodology: str = "telefonica"


@dataclass
class NowcastResult:
    estimates: Dict[str, float]     # {partido: estimacion ponderada}
    uncertainty: Dict[str, float]   # {partido: margen de error}
    num_polls: int
    effective_n: float


def aggregate_polls(
    polls: List[Poll],
    days_window: int = 30,
    reference_date: Optional[date] = None,
) -> List[Poll]:
    """Filtra y normaliza encuestas dentro de la ventana temporal."""
    ref = reference_date or date.today()
    cutoff = (ref - __import__("datetime").timedelta(days=days_window)).toordinal()
    return [p for p in polls if p.date.toordinal() >= cutoff]


def nowcast(
    polls: List[Poll],
    pollster_weights: Optional[Dict[str, float]] = None,
    decay_halflife_days: int = 14,
    reference_date: Optional[date] = None,
) -> NowcastResult:
    """
    Calcula estimacion actual ponderando encuestas por recencia y fiabilidad.

    Args:
        polls:              Lista de encuestas (ya filtradas si se desea).
        pollster_weights:   Pesos por encuestadora {pollster: weight}. Default: todos 1.0.
        decay_halflife_days: Semivida temporal en dias (encuestas mas antiguas pesan menos).
        reference_date:     Fecha de referencia. Default: hoy.

    Returns:
        NowcastResult con estimaciones y margenes de incertidumbre.
    """
    if not polls:
        return NowcastResult(estimates={}, uncertainty={}, num_polls=0, effective_n=0.0)

    ref = reference_date or date.today()
    weights_by_pollster = pollster_weights or {}

    party_weighted_sum: Dict[str, float] = {}
    party_weight_total: Dict[str, float] = {}
    total_weight = 0.0

    for poll in polls:
        days_ago = (ref - poll.date).days
        temporal_weight = math.exp(-days_ago * math.log(2) / decay_halflife_days)
        size_weight = math.log(max(poll.sample_size, 100))
        pollster_weight = weights_by_pollster.get(poll.pollster, 1.0)

        w = temporal_weight * size_weight * pollster_weight
        total_weight += w

        for party, pct in poll.results.items():
            party_weighted_sum[party] = party_weighted_sum.get(party, 0.0) + pct * w
            party_weight_total[party] = party_weight_total.get(party, 0.0) + w

    estimates = {
        party: party_weighted_sum[party] / party_weight_total[party]
        for party in party_weighted_sum
        if party_weight_total[party] > 0
    }

    # Margen de error simplificado: MOE = 1.96 * sqrt(p*(1-p)/n_efectivo)
    effective_n = total_weight  # aproximacion
    uncertainty = {
        party: 1.96 * math.sqrt(max(0, est / 100 * (1 - est / 100) / max(effective_n, 1))) * 100
        for party, est in estimates.items()
    }

    return NowcastResult(
        estimates=estimates,
        uncertainty=uncertainty,
        num_polls=len(polls),
        effective_n=effective_n,
    )
