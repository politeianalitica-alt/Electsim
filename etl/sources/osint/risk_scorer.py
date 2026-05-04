"""
Risk Scorer — Bloque 4.

Calcula el risk score explicable de entidades OSINT.
Score [0, 100], con breakdown por dimensión.

Niveles:
   0–20  → LOW
  21–45  → MEDIUM
  46–70  → HIGH
  71–100 → CRITICAL
"""
from __future__ import annotations

import logging
from typing import Any

from .schemas import RiskEntity, RiskFlag, RiskRelation

logger = logging.getLogger(__name__)

# ── Jurisdicciones de alto riesgo (mismo set que opensanctions_adapter) ────────
_HIGH_RISK_JURISDICTIONS = {
    "AF", "IR", "KP", "MM", "SY", "YE",
    "AL", "BB", "BF", "CM", "CD", "GI", "HT",
    "JM", "ML", "MZ", "NG", "PA", "PH", "SN",
    "SS", "TZ", "TT", "UG", "AE", "VN",
    "RU", "BY", "VE", "CU",
}

# Pesos por tipo de flag
_FLAG_WEIGHTS: dict[str, float] = {
    "sanctioned":              70.0,
    "pep":                     25.0,
    "jurisdiction_risk":       10.0,
    "adverse_media":            5.0,
    "contracting_risk":        10.0,
    "conflict_of_interest":     8.0,
    "ownership_opacity":        6.0,
    "social_identity_unverified": 2.0,
    "osint_candidate":          3.0,
    "regulatory_exposure":      7.0,
}

# Pesos por severidad (multiplicador sobre el peso base)
_SEVERITY_MULT: dict[str, float] = {
    "CRITICAL": 1.0,
    "HIGH":     0.75,
    "MEDIUM":   0.50,
    "LOW":      0.25,
}


def risk_level(score: float) -> str:
    """Convierte score numérico a nivel textual."""
    if score <= 20:
        return "LOW"
    if score <= 45:
        return "MEDIUM"
    if score <= 70:
        return "HIGH"
    return "CRITICAL"


def _count_high_risk_jurisdictions(countries: list[str]) -> int:
    return sum(1 for c in countries if c in _HIGH_RISK_JURISDICTIONS)


def _count_flags_of_type(flags: list[RiskFlag], flag_type: str) -> int:
    return sum(1 for f in flags if f.flag_type == flag_type)


def _count_high_risk_relations(relations: list[RiskRelation], threshold: float = 0.70) -> int:
    return sum(1 for r in relations if r.confidence >= threshold)


def compute_entity_risk(
    entity: RiskEntity,
    flags: list[RiskFlag],
    relations: list[RiskRelation] | None = None,
) -> dict[str, Any]:
    """
    Calcula el risk score de una entidad con breakdown explicable.

    Args:
        entity: Entidad a evaluar.
        flags: Flags asociadas a la entidad.
        relations: Relaciones de la entidad (opcional).

    Returns:
        dict con:
          score: float [0, 100]
          level: str
          breakdown: dict[str, float]
          explanation: list[str]
    """
    relations = relations or []
    breakdown: dict[str, float] = {}
    explanation: list[str] = []

    # ── Sanciones ────────────────────────────────────────────────────────────
    if entity.sanctions_status:
        pts = 70.0
        breakdown["sanctioned"] = pts
        explanation.append(f"+{pts:.0f} Entidad sancionada")

    # ── PEP ──────────────────────────────────────────────────────────────────
    if entity.pep_status:
        pts = 25.0
        breakdown["pep"] = pts
        explanation.append(f"+{pts:.0f} Persona políticamente expuesta (PEP)")

    # ── Jurisdicciones de alto riesgo ─────────────────────────────────────────
    n_high_risk = _count_high_risk_jurisdictions(entity.countries)
    if n_high_risk:
        pts = min(10.0 * n_high_risk, 20.0)
        breakdown["jurisdiction_risk"] = pts
        explanation.append(f"+{pts:.0f} {n_high_risk} jurisdicción(es) de alto riesgo")

    # ── Flags de medios adversos ──────────────────────────────────────────────
    n_media = _count_flags_of_type(flags, "adverse_media")
    if n_media:
        pts = min(5.0 * n_media, 15.0)
        breakdown["adverse_media"] = pts
        explanation.append(f"+{pts:.0f} {n_media} flag(s) de medios adversos")

    # ── Riesgo de contratación ────────────────────────────────────────────────
    n_contract = _count_flags_of_type(flags, "contracting_risk")
    if n_contract:
        pts = min(10.0 * n_contract, 20.0)
        breakdown["contracting_risk"] = pts
        explanation.append(f"+{pts:.0f} Riesgo de contratación pública")

    # ── Conflicto de interés ──────────────────────────────────────────────────
    n_conflict = _count_flags_of_type(flags, "conflict_of_interest")
    if n_conflict:
        pts = min(8.0 * n_conflict, 16.0)
        breakdown["conflict_of_interest"] = pts
        explanation.append(f"+{pts:.0f} Conflicto de interés detectado")

    # ── Opacidad de propiedad ─────────────────────────────────────────────────
    n_opacity = _count_flags_of_type(flags, "ownership_opacity")
    if n_opacity:
        pts = min(6.0 * n_opacity, 12.0)
        breakdown["ownership_opacity"] = pts
        explanation.append(f"+{pts:.0f} Opacidad en estructura de propiedad")

    # ── Exposición regulatoria ────────────────────────────────────────────────
    n_reg = _count_flags_of_type(flags, "regulatory_exposure")
    if n_reg:
        pts = min(7.0 * n_reg, 14.0)
        breakdown["regulatory_exposure"] = pts
        explanation.append(f"+{pts:.0f} Exposición regulatoria")

    # ── Relaciones de alto riesgo ─────────────────────────────────────────────
    n_risky_rel = _count_high_risk_relations(relations)
    if n_risky_rel:
        pts = min(4.0 * n_risky_rel, 16.0)
        breakdown["high_risk_relations"] = pts
        explanation.append(f"+{pts:.0f} {n_risky_rel} relación(es) de alto riesgo")

    # ── Identidades no verificadas ────────────────────────────────────────────
    n_unver = _count_flags_of_type(flags, "social_identity_unverified")
    if n_unver:
        pts = 2.0 * n_unver
        breakdown["social_identity_unverified"] = pts
        explanation.append(f"+{pts:.0f} Identidad(es) social(es) pendiente(s) de verificar")

    # ── Score total ───────────────────────────────────────────────────────────
    score = min(sum(breakdown.values()), 100.0)
    level = risk_level(score)

    return {
        "score": round(score, 2),
        "level": level,
        "breakdown": breakdown,
        "explanation": explanation,
    }


def compute_relation_risk(relation: RiskRelation) -> float:
    """
    Calcula el riesgo de una relación individual.
    Basado en tipo + confianza.
    """
    high_risk_types = {
        "SANCTION", "OWNERSHIP", "DIRECTORSHIP",
        "ENTITY_SANCTIONED_BY", "ENTITY_HAS_RISK_FLAG",
    }
    base = 30.0 if relation.relation_type in high_risk_types else 10.0
    return min(base * relation.confidence, 50.0)


def explain_risk_score(
    entity: RiskEntity,
    flags: list[RiskFlag],
    relations: list[RiskRelation] | None = None,
) -> str:
    """
    Genera una explicación en texto legible del score de riesgo.

    Returns:
        String Markdown con el breakdown del score.
    """
    result = compute_entity_risk(entity, flags, relations or [])
    score = result["score"]
    level = result["level"]
    explanation = result["explanation"]

    level_emoji = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🟠", "CRITICAL": "🔴"}.get(level, "⚪")

    lines = [
        f"## Riesgo {level_emoji} {level} — {score:.0f}/100",
        f"**Entidad**: {entity.name} ({entity.entity_type})",
        "",
        "### Breakdown",
    ]
    if explanation:
        lines.extend(f"  {e}" for e in explanation)
    else:
        lines.append("  Sin factores de riesgo detectados.")

    lines += [
        "",
        f"**Flags activas**: {len(flags)}",
        f"**Relaciones**: {len(relations or [])}",
    ]

    if entity.pep_status:
        lines.append("_PEP — Persona Políticamente Expuesta_")
    if entity.sanctions_status:
        lines.append("_⚠ ENTIDAD SANCIONADA_")

    return "\n".join(lines)


def batch_score(
    entities: list[RiskEntity],
    flags_by_entity: dict[str, list[RiskFlag]],
    relations_by_entity: dict[str, list[RiskRelation]] | None = None,
) -> list[tuple[RiskEntity, dict[str, Any]]]:
    """
    Calcula el score para un batch de entidades.

    Args:
        entities: Lista de entidades.
        flags_by_entity: entity.id → lista de RiskFlag.
        relations_by_entity: entity.id → lista de RiskRelation.

    Returns:
        Lista de (entity, score_result) con el score actualizado en entity.risk_score.
    """
    relations_by_entity = relations_by_entity or {}
    results = []

    for entity in entities:
        flags = flags_by_entity.get(entity.id, [])
        relations = relations_by_entity.get(entity.id, [])
        score_result = compute_entity_risk(entity, flags, relations)

        entity.risk_score = score_result["score"]
        entity.risk_flags = list(score_result["breakdown"].keys())
        results.append((entity, score_result))

    return results
