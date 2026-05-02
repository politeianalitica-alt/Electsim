"""
Simulacion de escenarios electorales.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from packages.electoral.src.dhondt import DHondtResult, dhondt


@dataclass
class Scenario:
    name: str
    votes: Dict[str, int]
    seats: int
    threshold: float = 0.03


@dataclass
class SimulationResult:
    scenario: str
    dhondt: DHondtResult
    majority_threshold: int
    has_majority: Dict[str, bool]  # {partido: tiene_mayoria}


def seat_simulation(scenarios: List[Scenario]) -> List[SimulationResult]:
    """
    Simula el reparto de escanos para multiples escenarios.

    Args:
        scenarios: Lista de escenarios a simular.

    Returns:
        Lista de SimulationResult con resultados D'Hondt y analisis de mayoria.
    """
    results = []
    for scenario in scenarios:
        result = dhondt(scenario.votes, scenario.seats, scenario.threshold)
        majority = scenario.seats // 2 + 1
        results.append(SimulationResult(
            scenario=scenario.name,
            dhondt=result,
            majority_threshold=majority,
            has_majority={
                alloc.party: alloc.seats >= majority
                for alloc in result.allocations
            },
        ))
    return results
