from __future__ import annotations
from pydantic import BaseModel


class PartySeatItem(BaseModel):
    code: str          # siglas, e.g. "PP"
    name: str          # nombre_completo
    seats: int
    color: str         # hex color
    pct_vote: float = 0.0


class CoalitionScenario(BaseModel):
    members: list[str]          # party codes
    total: int                  # total seats
    majority: bool              # total >= majority_threshold
    distance: int               # 0-100 ideological distance
    probability: int            # 0-100 viability score
    conflicts: list[str]        # known friction points


class CoalitionOverview(BaseModel):
    parties: list[PartySeatItem]
    coalitions: list[CoalitionScenario]
    election_date: str | None = None    # ISO date if from DB
    total_seats: int = 350
    majority_threshold: int = 176
    mode: str                           # "real" | "fallback" | "demo"
