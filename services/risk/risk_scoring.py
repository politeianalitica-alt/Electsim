# services/risk/risk_scoring.py
"""
Pure scoring functions for the Risk module.
Formula: base = 0.55*impact + 0.35*probability + velocity_bonus + confidence_adj
No DB or network dependencies.
"""
from __future__ import annotations

# Domain weights for global score (must sum to 1.0)
DOMAIN_WEIGHTS: dict[str, float] = {
    "legislative": 0.18,
    "media": 0.18,
    "actors": 0.12,
    "coalition": 0.15,
    "economic": 0.12,
    "geopolitical": 0.10,
    "territorial": 0.07,
    "system": 0.08,
}

VELOCITY_BONUS: dict[str, int] = {
    "surging": 15,
    "fast": 10,
    "moderate": 5,
    "slow": 0,
}


def score_signal(
    impact: int,
    probability: int,
    velocity: str = "slow",
    confidence: float = 1.0,
    evidence_count: int = 0,
) -> int:
    """
    Compute risk signal score 0-100.
    Formula: base = 0.55*impact + 0.35*probability
    + velocity_bonus (surging+15, fast+10, moderate+5)
    + evidence_bonus (min evidence_count//5, 5)
    * confidence
    """
    base = 0.55 * impact + 0.35 * probability
    v_bonus = VELOCITY_BONUS.get(velocity, 0)
    e_bonus = min(evidence_count // 5, 5)
    raw = (base + v_bonus + e_bonus) * confidence
    return int(round(min(max(raw, 0), 100)))


def severity_from_score(score: int) -> str:
    """Map score to severity level."""
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def global_score_from_dimensions(dimensions: dict[str, int]) -> int:
    """
    Compute weighted global risk score from domain scores.
    dimensions: {domain_name: score_0_100}
    """
    total = 0.0
    weight_used = 0.0
    for domain, score in dimensions.items():
        w = DOMAIN_WEIGHTS.get(domain, 0.0)
        total += w * score
        weight_used += w
    if weight_used <= 0:
        return 0
    # Normalize if not all domains present
    normalized = total / weight_used
    return int(round(min(max(normalized, 0), 100)))


def trend_from_delta(delta: int) -> str:
    """Convert score delta to trend label."""
    if delta > 3:
        return "rising"
    if delta < -3:
        return "falling"
    return "stable"


def indicator_status_from_score(score: int, threshold: int) -> str:
    """Determine traffic-light status for early warning indicator."""
    if score >= threshold + 20:
        return "red"
    if score >= threshold:
        return "yellow"
    if score >= threshold - 20:
        return "green"
    return "grey"
