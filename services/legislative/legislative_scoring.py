# services/legislative/legislative_scoring.py
"""Scoring utilities for legislative items. All functions are pure (no DB, no network)."""
from __future__ import annotations
from api.schemas.legislative import UrgencyLevel, ImpactLevel

_PROCEDURE_WEIGHT: dict[str, int] = {
    "real_decreto_ley": 10,
    "proyecto_ley": 8,
    "directiva_ue": 8,
    "reglamento_ue": 7,
    "proposicion_ley": 6,
    "real_decreto": 5,
    "orden_ministerial": 3,
    "proposicion_no_ley": 2,
    "mocion": 1,
    "interpelacion": 1,
    "pregunta_oral": 0,
    "pregunta_escrita": 0,
}

_STAGE_WEIGHT: dict[str, int] = {
    "votacion": 10,
    "pleno_debate": 9,
    "boe_publicacion": 9,
    "vigor": 8,
    "enmiendas": 7,
    "ponencia": 6,
    "comision": 5,
    "senado_revision": 5,
    "promulgacion": 4,
    "presentacion": 2,
}


def compute_urgency(
    procedure_type: str,
    current_stage: str,
    days_to_vote: int | None,
    is_government: bool,
    ue_origin: bool,
) -> UrgencyLevel:
    """Compute urgency level from procedural features."""
    score = _PROCEDURE_WEIGHT.get(procedure_type, 3)
    score += _STAGE_WEIGHT.get(current_stage, 3)
    if is_government:
        score += 3
    if ue_origin:
        score += 2
    if days_to_vote is not None:
        if days_to_vote <= 7:
            score += 8
        elif days_to_vote <= 21:
            score += 5
        elif days_to_vote <= 60:
            score += 2
    if score >= 20:
        return "critical"
    if score >= 14:
        return "high"
    if score >= 8:
        return "medium"
    return "low"


def compute_impact_score(
    urgency: UrgencyLevel,
    procedure_type: str,
    is_government: bool,
    ue_origin: bool,
    sector_count: int = 1,
) -> int:
    """Compute a 0-100 impact score."""
    base = {"critical": 75, "high": 60, "medium": 45, "low": 25}[urgency]
    base += _PROCEDURE_WEIGHT.get(procedure_type, 3) * 2
    if is_government:
        base += 5
    if ue_origin:
        base += 5
    base += min(sector_count - 1, 5) * 3
    return min(base, 100)


def urgency_to_impact(urgency: UrgencyLevel) -> ImpactLevel:
    """Map urgency level to impact level."""
    if urgency in ("critical", "high"):
        return "alto"
    if urgency == "medium":
        return "medio"
    return "bajo"


def urgency_sort_key(urgency: UrgencyLevel) -> int:
    """Return sort key so critical < high < medium < low."""
    return {"critical": 0, "high": 1, "medium": 2, "low": 3}[urgency]
