"""
Electoral ETL package — Bloque 6.

Módulo de Inteligencia Electoral y Campaña para ElectSim.
"""
from .schemas import (
    Election,
    Party,
    ElectionResult,
    Poll,
    PollEstimate,
    PollQualityScore,
    NowcastSnapshot,
    CoalitionScenario,
    VoterSegment,
    SoftVoteEstimate,
    PartyManifesto,
    CampaignMessage,
    CampaignSimulation,
    ElectoralAlert,
    TOTAL_ESCANOS_CONGRESO,
    MAYORIA_ABSOLUTA,
    PARTY_COLORS,
    IDEOLOGY_SCORES,
    PARTY_ALIASES,
    ELECTORAL_ALERT_TYPES,
)

__all__ = [
    "Election",
    "Party",
    "ElectionResult",
    "Poll",
    "PollEstimate",
    "PollQualityScore",
    "NowcastSnapshot",
    "CoalitionScenario",
    "VoterSegment",
    "SoftVoteEstimate",
    "PartyManifesto",
    "CampaignMessage",
    "CampaignSimulation",
    "ElectoralAlert",
    "TOTAL_ESCANOS_CONGRESO",
    "MAYORIA_ABSOLUTA",
    "PARTY_COLORS",
    "IDEOLOGY_SCORES",
    "PARTY_ALIASES",
    "ELECTORAL_ALERT_TYPES",
]
