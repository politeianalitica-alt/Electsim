"""
CRM Scoring — Bloque 15.

Calcula priority_score para stakeholders.

priority_score =
  0.25 × influence_score
  0.20 × proximity_score
  0.15 × topic_urgency
  0.15 × risk_exposure
  0.10 × responsiveness_score
  0.10 × territorial_relevance
  0.05 × relationship_freshness
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from crm.schemas import Contact, Organization, StakeholderProfile

logger = logging.getLogger(__name__)

WEIGHTS = {
    "influence": 0.25,
    "proximity": 0.20,
    "topic_urgency": 0.15,
    "risk_exposure": 0.15,
    "responsiveness": 0.10,
    "territorial_relevance": 0.10,
    "relationship_freshness": 0.05,
}

# Interpretación
PRIORITY_LABELS = {
    (76, 100): "CRÍTICA",
    (51, 75): "ALTA",
    (26, 50): "NORMAL",
    (0, 25): "BAJA",
}


def compute_influence_score(obj: Contact | Organization | dict) -> float:
    """
    Estima influencia de un contacto u organización.

    Factores: tipo de contacto, cargo, organización conocida.
    """
    if isinstance(obj, dict):
        contact_type = obj.get("contact_type", "other")
        role = (obj.get("role_title") or "").lower()
        org_type = obj.get("organization_type", "other")
    elif isinstance(obj, Contact):
        contact_type = obj.contact_type
        role = (obj.role_title or "").lower()
        org_type = None
    else:
        contact_type = "other"
        role = ""
        org_type = obj.organization_type

    # Base score por tipo
    type_scores = {
        "public_official": 80.0,
        "political_actor": 85.0,
        "journalist": 65.0,
        "expert": 60.0,
        "business_actor": 70.0,
        "civil_society": 55.0,
        "campaign_contact": 50.0,
        "client_contact": 60.0,
        # organization types
        "political_party": 85.0,
        "public_institution": 80.0,
        "media": 70.0,
        "company": 65.0,
        "think_tank": 65.0,
        "ngo": 55.0,
    }
    score = type_scores.get(contact_type or org_type or "other", 40.0)

    # Bonus por cargo
    senior_keywords = {"director", "ministro", "presidente", "secretario", "ceo", "jefe", "director general"}
    if any(kw in role for kw in senior_keywords):
        score = min(100.0, score + 10.0)

    return score


def compute_proximity_score(interactions: list[dict]) -> float:
    """
    Calcula proximidad basada en número e intensidad de interacciones.

    Args:
        interactions: Lista de dicts con 'interaction_type', 'sentiment'.
    """
    if not interactions:
        return 10.0

    n = len(interactions)
    base = min(60.0, n * 8.0)

    # Bonus por tipo
    meeting_count = sum(1 for i in interactions if i.get("interaction_type") in ("meeting", "briefing_sent"))
    positive_count = sum(1 for i in interactions if i.get("sentiment") == "positive")

    bonus = min(30.0, meeting_count * 5.0 + positive_count * 3.0)
    return min(100.0, base + bonus + 10.0)


def compute_relationship_freshness(last_interaction_at: datetime | None) -> float:
    """
    Calcula frescura de la relación. 100 = interacción reciente, 0 = estancada.

    Decae linealmente de 100 a 0 en 180 días.
    """
    if last_interaction_at is None:
        return 0.0

    now = datetime.utcnow()
    if last_interaction_at.tzinfo is not None:
        now = now.replace(tzinfo=timezone.utc)

    days_ago = (now - last_interaction_at).days
    if days_ago <= 0:
        return 100.0
    if days_ago >= 180:
        return 0.0
    return max(0.0, 100.0 - (days_ago / 180.0) * 100.0)


def compute_topic_urgency(
    contact_or_org: Contact | Organization | dict,
    active_alerts: list[dict] | None = None,
) -> float:
    """
    Urgencia temática: mayor si el contacto está relacionado con alertas activas.
    """
    if not active_alerts:
        return 20.0

    if isinstance(contact_or_org, dict):
        topics = contact_or_org.get("topics", [])
        sectors = contact_or_org.get("sectors", [])
    else:
        topics = list(contact_or_org.topics)
        sectors = list(contact_or_org.sectors)

    urgent_topics = set()
    for alert in active_alerts:
        urgent_topics.update(alert.get("affected_modules", []))

    overlap = len(set(topics + sectors) & urgent_topics)
    return min(100.0, 20.0 + overlap * 20.0)


def compute_risk_exposure(
    contact_or_org: Contact | Organization | dict,
    risk_profiles: list[dict] | None = None,
) -> float:
    """
    Exposición a riesgo: mayor si el contacto está vinculado a países/entidades de alto riesgo.
    """
    if not risk_profiles:
        return 10.0

    if isinstance(contact_or_org, dict):
        org_id = contact_or_org.get("organization_id") or contact_or_org.get("risk_entity_id")
    elif isinstance(contact_or_org, Contact):
        org_id = contact_or_org.organization_id
    else:
        org_id = contact_or_org.risk_entity_id

    if not org_id:
        return 10.0

    for profile in risk_profiles:
        if profile.get("object_id") == org_id:
            return min(100.0, float(profile.get("total_score", 10.0)))

    return 10.0


def compute_stakeholder_priority(
    object_type: str,
    object_id: str,
    tenant_id: str = "default",
    context: dict | None = None,
) -> StakeholderProfile:
    """
    Calcula el perfil de prioridad de un stakeholder.

    Args:
        object_type: "contact" o "organization"
        object_id: ID del contacto u organización
        tenant_id: ID del tenant
        context: dict con 'active_alerts', 'risk_profiles', 'interactions'

    Returns:
        StakeholderProfile calculado.
    """
    context = context or {}
    active_alerts = context.get("active_alerts", [])
    risk_profiles = context.get("risk_profiles", [])
    interactions = context.get("interactions", [])
    last_interaction_at = context.get("last_interaction_at")

    # Load object
    obj: Contact | Organization | dict = {}
    try:
        if object_type == "contact":
            from crm.contacts import get_contact
            obj = get_contact(object_id, tenant_id) or {}
        else:
            from crm.organizations import get_organization
            obj = get_organization(object_id, tenant_id) or {}
    except Exception as exc:
        logger.debug("compute_stakeholder_priority load error: %s", exc)

    # Component scores
    influence = compute_influence_score(obj)
    proximity = compute_proximity_score(interactions)
    topic_urgency = compute_topic_urgency(obj, active_alerts)
    risk_exposure = compute_risk_exposure(obj, risk_profiles)
    responsiveness = min(100.0, 30.0 + len(interactions) * 5.0)
    territorial_relevance = 40.0  # default; could be computed from territory match
    freshness = compute_relationship_freshness(last_interaction_at)

    # Weighted score
    priority_score = (
        WEIGHTS["influence"] * influence
        + WEIGHTS["proximity"] * proximity
        + WEIGHTS["topic_urgency"] * topic_urgency
        + WEIGHTS["risk_exposure"] * risk_exposure
        + WEIGHTS["responsiveness"] * responsiveness
        + WEIGHTS["territorial_relevance"] * territorial_relevance
        + WEIGHTS["relationship_freshness"] * freshness
    )

    # Recommended actions based on score
    recommended_actions = []
    if priority_score >= 75:
        recommended_actions.append("Reunión urgente o llamada prioritaria")
    elif priority_score >= 50:
        recommended_actions.append("Enviar briefing y planificar seguimiento")
    else:
        recommended_actions.append("Mantener en watchlist")

    if freshness < 20:
        recommended_actions.append("Relación estancada: reactivar contacto")
    if topic_urgency >= 60:
        recommended_actions.append("Contacto afectado por alerta activa: acción inmediata")

    return StakeholderProfile(
        object_type=object_type,
        object_id=object_id,
        influence_score=influence,
        proximity_score=proximity,
        trust_score=responsiveness,
        responsiveness_score=responsiveness,
        risk_score=risk_exposure,
        priority_score=round(priority_score, 2),
        recommended_actions=recommended_actions,
        tenant_id=tenant_id,
    )


def get_priority_label(score: float) -> str:
    """Devuelve etiqueta de prioridad para un score."""
    for (low, high), label in PRIORITY_LABELS.items():
        if low <= score <= high:
            return label
    return "BAJA"
