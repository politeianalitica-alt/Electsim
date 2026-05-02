"""
packages.electoral — Algoritmos electorales puros para ElectSim.

Expone:
    dhondt(votes, seats)           → reparto D'Hondt
    dhondt_by_constituency(...)    → D'Hondt por circunscripción
    nowcast(polls, weights)        → nowcasting ponderado
    seat_simulation(scenarios)     → simulación de escenarios

Sin dependencias de apps/, observability/ ni servicios LLM.
Solo: stdlib, numpy, pandas.
"""
from packages.electoral.src.dhondt import dhondt, dhondt_by_constituency
from packages.electoral.src.nowcasting import nowcast, aggregate_polls
from packages.electoral.src.simulation import seat_simulation

__all__ = [
    "dhondt",
    "dhondt_by_constituency",
    "nowcast",
    "aggregate_polls",
    "seat_simulation",
]
