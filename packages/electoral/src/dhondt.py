"""
D'Hondt algorithm — pure Python, no side effects.

Este modulo es la fuente canonica de D'Hondt en ElectSim.
El codigo legacy en etl/electoral_math.py delegara aqui en cuanto
se complete la migracion del Bloque 8.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class SeatAllocation:
    party: str
    seats: int
    votes: int
    vote_share: float


@dataclass
class DHondtResult:
    allocations: List[SeatAllocation]
    total_seats: int
    total_votes: int
    threshold_applied: float = 0.0

    @property
    def by_party(self) -> Dict[str, int]:
        return {a.party: a.seats for a in self.allocations}


def dhondt(
    votes: Dict[str, int],
    seats: int,
    threshold: float = 0.03,
) -> DHondtResult:
    """
    Aplica el metodo D'Hondt a un diccionario {partido: votos}.

    Args:
        votes:     Diccionario {partido: votos}. Votos deben ser enteros >= 0.
        seats:     Numero de escanos a repartir.
        threshold: Umbral minimo de voto para participar (0.03 = 3%).

    Returns:
        DHondtResult con la asignacion de escanos por partido.

    Raises:
        ValueError: si seats <= 0 o votes esta vacio.
    """
    if seats <= 0:
        raise ValueError(f"seats debe ser > 0, recibido: {seats}")
    if not votes:
        raise ValueError("votes no puede estar vacio")

    total_votes = sum(votes.values())
    if total_votes == 0:
        raise ValueError("El total de votos no puede ser 0")

    # Aplicar umbral
    eligible = {
        party: v
        for party, v in votes.items()
        if v / total_votes >= threshold
    }

    if not eligible:
        eligible = votes  # si nadie supera el umbral, incluir todos

    # Algoritmo D'Hondt
    quotients: List[tuple[float, str]] = []
    for party, party_votes in eligible.items():
        for divisor in range(1, seats + 1):
            quotients.append((party_votes / divisor, party))

    quotients.sort(key=lambda x: x[0], reverse=True)
    seat_counts: Dict[str, int] = {p: 0 for p in eligible}

    for _, party in quotients[:seats]:
        seat_counts[party] += 1

    allocations = [
        SeatAllocation(
            party=party,
            seats=seat_counts[party],
            votes=eligible[party],
            vote_share=eligible[party] / total_votes,
        )
        for party in sorted(eligible, key=lambda p: seat_counts[p], reverse=True)
    ]

    return DHondtResult(
        allocations=allocations,
        total_seats=seats,
        total_votes=total_votes,
        threshold_applied=threshold,
    )


def dhondt_by_constituency(
    constituency_votes: Dict[str, Dict[str, int]],
    constituency_seats: Dict[str, int],
    threshold: float = 0.03,
) -> Dict[str, DHondtResult]:
    """
    Aplica D'Hondt a multiples circunscripciones.

    Args:
        constituency_votes:  {circunscripcion: {partido: votos}}
        constituency_seats:  {circunscripcion: num_escanos}
        threshold:           Umbral de voto por circunscripcion.

    Returns:
        {circunscripcion: DHondtResult}
    """
    return {
        constituency: dhondt(
            votes=votes,
            seats=constituency_seats[constituency],
            threshold=threshold,
        )
        for constituency, votes in constituency_votes.items()
        if constituency in constituency_seats
    }
