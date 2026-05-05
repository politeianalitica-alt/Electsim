"""
Message Testing — Bloque 16.

Evaluación editorial de variantes de contenido.
NO usar para manipulación individual — criterios editoriales transparentes.
"""
from __future__ import annotations

import logging
from typing import Any

from communications.schemas import ContentAsset

logger = logging.getLogger(__name__)

SCORING_CRITERIA = ["claridad", "evidencia", "riesgo", "tono", "brevedad", "canal"]


def score_message_clarity(content: str) -> float:
    """Puntúa la claridad del mensaje (0-1)."""
    words = content.split()
    if not words:
        return 0.0
    avg_len = sum(len(w) for w in words) / len(words)
    sentences = content.count(".") + content.count("!") + content.count("?") or 1
    words_per_sentence = len(words) / sentences
    clarity = max(0.0, 1.0 - (avg_len - 5) * 0.05 - (words_per_sentence - 20) * 0.02)
    return round(min(1.0, max(0.0, clarity)), 3)


def score_message_evidence_strength(content: str, evidence_ids: list[str]) -> float:
    """Puntúa la fortaleza evidencial (0-1)."""
    if not evidence_ids:
        return 0.0
    base = min(1.0, len(evidence_ids) * 0.25)
    bonus = 0.1 if "%" in content or any(c.isdigit() for c in content) else 0.0
    return round(min(1.0, base + bonus), 3)


def score_message_risk(content: str) -> float:
    """Puntúa el riesgo del mensaje (0=sin riesgo, 1=riesgo alto)."""
    from communications.comms_guardrails import check_content_risks
    flags = check_content_risks(content)
    risk = min(1.0, len(flags) * 0.2)
    return round(risk, 3)


def score_message_channel_fit(asset: ContentAsset) -> float:
    """Puntúa la adecuación canal/formato (0-1)."""
    fits = {
        ("linkedin_post", "linkedin"): 1.0,
        ("tweet", "twitter_x"): 1.0,
        ("thread", "twitter_x"): 1.0,
        ("newsletter", "newsletter"): 1.0,
        ("email", "email"): 1.0,
        ("press_note", "press_release"): 1.0,
        ("briefing", "briefing"): 1.0,
        ("internal_memo", "internal_memo"): 1.0,
    }
    from communications.channel_registry import get_channel
    channel = get_channel(asset.channel_id) if asset.channel_id else None
    channel_type = channel.channel_type if channel else None
    score = fits.get((asset.asset_type, channel_type), 0.5)

    # Penalizar si excede límite de caracteres
    if channel and channel.character_limit:
        if len(asset.body_markdown) > channel.character_limit:
            score *= 0.5

    return round(score, 3)


def compare_message_variants(assets: list[ContentAsset], criteria: list[str] | None = None) -> dict[str, Any]:
    """Compara variantes de contenido con criterios editoriales."""
    criteria = criteria or SCORING_CRITERIA
    results = []
    for a in assets:
        scores: dict[str, float] = {}
        if "claridad" in criteria:
            scores["claridad"] = score_message_clarity(a.body_markdown)
        if "evidencia" in criteria:
            scores["evidencia"] = score_message_evidence_strength(a.body_markdown, a.evidence_ids)
        if "riesgo" in criteria:
            scores["riesgo"] = 1.0 - score_message_risk(a.body_markdown)  # invertido: menor riesgo = mejor
        if "canal" in criteria:
            scores["canal"] = score_message_channel_fit(a)
        total = round(sum(scores.values()) / max(len(scores), 1), 3)
        results.append({"asset_id": a.asset_id, "title": a.title, "scores": scores, "total": total})

    return {"variants": results, "criteria": criteria}


def recommend_best_variant(assets: list[ContentAsset], objective: str = "balanced") -> dict[str, Any]:
    """Recomienda la mejor variante según el objetivo."""
    if not assets:
        return {"error": "Sin variantes para comparar"}
    comparison = compare_message_variants(assets)
    variants = comparison.get("variants", [])
    if not variants:
        return {"error": "Sin resultados"}

    if objective == "low_risk":
        best = max(variants, key=lambda v: v["scores"].get("riesgo", 0))
    elif objective == "evidence":
        best = max(variants, key=lambda v: v["scores"].get("evidencia", 0))
    else:
        best = max(variants, key=lambda v: v["total"])

    return {"recommended": best, "objective": objective, "all_variants": variants}
