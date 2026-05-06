"""
Rich Pydantic v2 schemas for the Electoral Intelligence system (TAB 5).

Backward-compatible with api.schemas.coalition (PartySeatItem, CoalitionScenario,
CoalitionOverview). New models add confidence intervals, kingmaker analysis,
swing simulation, and hemicycle seat layout.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from api.schemas.status import DataMode

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------

ElectionType = Literal["congreso", "senado", "europeas", "autonomicas", "municipales"]
CoalitionViability = Literal["viable", "possible", "unlikely", "impossible"]
SeatTrend = Literal["gaining", "stable", "losing"]
SwingDirection = Literal["left", "right", "center", "abstention"]


# ---------------------------------------------------------------------------
# Core models
# ---------------------------------------------------------------------------


class PartyProjection(BaseModel):
    """Seat and vote projection for a single party."""

    model_config = ConfigDict(populate_by_name=True)

    code: str = Field(..., description="Party acronym / siglas")
    name: str
    seats: int
    seats_low: int = Field(..., description="Lower bound of 95% confidence interval")
    seats_high: int = Field(..., description="Upper bound of 95% confidence interval")
    pct_vote: float = Field(..., description="Projected vote share (0-100)")
    pct_vote_prev: float | None = None
    seat_trend: SeatTrend = "stable"
    color: str = Field(..., description="Hex colour, e.g. '#E53935'")
    ideology_score: float = Field(
        ..., description="Left-right position (0 = far left, 10 = far right)"
    )
    is_governing: bool = False
    bloc: str | None = Field(
        default=None,
        description="Ideological bloc: 'left', 'right', 'nationalist', 'center', etc.",
    )


class ConstituencyProjection(BaseModel):
    """D'Hondt result for a single constituency / province."""

    model_config = ConfigDict(populate_by_name=True)

    constituency: str = Field(..., description="Province or constituency name")
    seats_available: int
    results: list[dict] = Field(
        default_factory=list,
        description="List of {party_code, seats, votes, pct} dicts",
    )


class CoalitionScenarioRich(BaseModel):
    """Rich coalition scenario extending the basic CoalitionScenario."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str = Field(..., description="Human-readable name, e.g. 'Gobierno de progreso'")
    members: list[str] = Field(..., description="Party codes that form this coalition")
    total_seats: int
    majority_threshold: int = 176
    has_majority: bool
    probability: int = Field(..., ge=0, le=100)
    stability_score: int = Field(..., ge=0, le=100)
    ideological_distance: int = Field(..., ge=0, le=100)
    conflicts: list[str] = Field(
        default_factory=list, description="Known friction points between members"
    )
    enablers: list[str] = Field(
        default_factory=list, description="Shared policy agreements that enable coalition"
    )
    scenario_type: str = Field(
        ...,
        description="E.g. 'minority_govt', 'grand_coalition', 'majority_coalition'",
    )
    seats_above_majority: int = Field(
        ..., description="Seats above 176; negative when below majority"
    )


class KingmakerParty(BaseModel):
    """Pivotal small party analysis — how much leverage does it have?"""

    model_config = ConfigDict(populate_by_name=True)

    code: str
    name: str
    seats: int
    color: str
    coalition_appearances: int = Field(
        ..., description="Number of viable coalitions that require this party"
    )
    leverage_score: int = Field(..., ge=0, le=100)
    key_demands: list[str] = Field(default_factory=list)
    compatible_blocs: list[str] = Field(
        default_factory=list,
        description="Blocs this party can realistically join",
    )


class VotingRecord(BaseModel):
    """A single plenary vote in the Congreso de los Diputados."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    topic: str
    date: str | None = None
    votes: dict[str, str] = Field(
        default_factory=dict,
        description="Mapping party_code -> 'S' (yes) | 'N' (no) | 'A' (abstention)",
    )
    result: str | None = Field(
        default=None, description="E.g. 'approved', 'rejected'"
    )
    category: str | None = Field(
        default=None, description="E.g. 'fiscal', 'social', 'defense'"
    )


# ---------------------------------------------------------------------------
# Swing simulator
# ---------------------------------------------------------------------------


class SwingSimInput(BaseModel):
    """A single party's hypothetical vote swing."""

    model_config = ConfigDict(populate_by_name=True)

    party_code: str
    delta_pct: float = Field(
        ..., description="Percentage point change (positive = gain, negative = loss)"
    )


class SwingSimResult(BaseModel):
    """Output of the swing simulator endpoint."""

    model_config = ConfigDict(populate_by_name=True)

    parties: list[PartyProjection] = Field(
        ..., description="Updated projections after applying the swings"
    )
    seat_changes: dict[str, int] = Field(
        default_factory=dict,
        description="party_code -> seat delta (positive = gained seats)",
    )
    coalition_impact: list[str] = Field(
        default_factory=list,
        description="Human-readable notes on which coalitions gained/lost viability",
    )


# ---------------------------------------------------------------------------
# KPI & scenario wrappers
# ---------------------------------------------------------------------------


class ElectoralKpiItem(BaseModel):
    """A single KPI tile for the electoral dashboard header."""

    model_config = ConfigDict(populate_by_name=True)

    label: str
    value: int | float | str
    unit: str | None = None
    color: str | None = Field(
        default=None, description="Tailwind class, e.g. 'text-cyan1'"
    )
    trend: str | None = Field(
        default=None, description="E.g. '+2', '-1', 'stable'"
    )


class ElectoralScenario(BaseModel):
    """Top-level scenario combining party projections and a leading coalition."""

    model_config = ConfigDict(populate_by_name=True)

    scenario_id: str
    scenario_name: str
    description: str
    probability: int = Field(..., ge=0, le=100)
    parties: list[PartyProjection]
    leading_coalition: CoalitionScenarioRich | None = None
    risk_level: str = Field(..., description="'low' | 'medium' | 'high'")


# ---------------------------------------------------------------------------
# Hemicycle seat layout
# ---------------------------------------------------------------------------


class HemicycleSeat(BaseModel):
    """A single seat in the SVG hemicycle visualisation."""

    model_config = ConfigDict(populate_by_name=True)

    idx: int = Field(..., description="Global seat index (0-based)")
    ring: int = Field(..., description="Concentric ring from the centre outward")
    position: int = Field(..., description="Seat position within the ring")
    party_code: str
    color: str
    x: float = Field(..., description="SVG x coordinate")
    y: float = Field(..., description="SVG y coordinate")


# ---------------------------------------------------------------------------
# Briefing request / response
# ---------------------------------------------------------------------------


class ElectoralBriefingRequest(BaseModel):
    """Request payload for an AI-generated electoral briefing."""

    model_config = ConfigDict(populate_by_name=True)

    focus: str = Field(
        ...,
        description="E.g. 'coalition_risk', 'seat_changes', 'kingmaker'",
    )
    workspace_id: str | None = None
    extra_context: str | None = None


class ElectoralBriefingResponse(BaseModel):
    """Response from the electoral briefing endpoint."""

    model_config = ConfigDict(populate_by_name=True)

    briefing: str = Field(..., description="Markdown-formatted briefing text")
    key_points: list[str] = Field(default_factory=list)
    risk_indicators: list[str] = Field(default_factory=list)
    mode: DataMode


# ---------------------------------------------------------------------------
# Main API response
# ---------------------------------------------------------------------------


class ElectoralOverviewResponse(BaseModel):
    """Primary response model for GET /api/electoral/overview."""

    model_config = ConfigDict(populate_by_name=True)

    parties: list[PartyProjection] = Field(default_factory=list)
    coalitions: list[CoalitionScenarioRich] = Field(default_factory=list)
    kingmakers: list[KingmakerParty] = Field(default_factory=list)
    voting_records: list[VotingRecord] = Field(default_factory=list)
    kpis: list[ElectoralKpiItem] = Field(default_factory=list)
    total_seats: int = 350
    majority_threshold: int = 176
    election_date: str | None = None
    election_type: ElectionType = "congreso"
    governing_parties: list[str] = Field(default_factory=list)
    mode: DataMode


# ---------------------------------------------------------------------------
# Swing simulate request
# ---------------------------------------------------------------------------


class SwingSimulateRequest(BaseModel):
    """Request payload for the swing simulation endpoint."""

    model_config = ConfigDict(populate_by_name=True)

    swings: list[SwingSimInput]
    base_parties: list[PartyProjection] | None = Field(
        default=None,
        description="If omitted, the current projection is fetched from the DB",
    )


# ---------------------------------------------------------------------------
# Backward-compat alias
# ---------------------------------------------------------------------------


class LegacyCoalitionOverview(BaseModel):
    """Simplified response kept for v1/v2 backward compatibility."""

    model_config = ConfigDict(populate_by_name=True)

    parties: list[dict] = Field(default_factory=list)
    coalitions: list[dict] = Field(default_factory=list)
    election_date: str | None = None
    total_seats: int = 350
    majority_threshold: int = 176
    mode: DataMode
