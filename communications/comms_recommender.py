"""
Comms Recommender — Bloque 16.

Convierte alertas, narrativas y señales en recomendaciones de contenido.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from communications.schemas import ContentRecommendation

logger = logging.getLogger(__name__)

_RECOMMENDATIONS: dict[str, ContentRecommendation] = {}

# Mapeo señal → tipos de contenido recomendados
_ALERT_CONTENT_MAP: dict[str, list[str]] = {
    "energy_security": ["briefing", "linkedin_post", "talking_points", "qa"],
    "migration_pressure": ["briefing", "press_note", "qa", "linkedin_post"],
    "country_risk_spike": ["briefing", "internal_memo", "linkedin_post"],
    "conflict_escalation": ["briefing", "press_note", "qa"],
    "narrative_spike": ["linkedin_post", "tweet", "thread", "qa"],
    "domestic_political_impact": ["talking_points", "briefing", "linkedin_post"],
    "legislative": ["linkedin_post", "stakeholder_update_email", "briefing", "qa"],
    "economic": ["linkedin_post", "newsletter", "briefing", "tweet"],
    "default": ["briefing", "linkedin_post", "qa"],
}


def recommend_content_for_alert(alert_id: str, tenant_id: str = "default") -> list[dict[str, Any]]:
    """Genera recomendaciones de contenido para una alerta geopolítica o del sistema."""
    try:
        from dashboard.services.geopolitics_core import cargar_alertas_geopoliticas
        alerts = cargar_alertas_geopoliticas(limit=100)
        alert = next((a for a in alerts if getattr(a, "alert_id", None) == alert_id or
                      (isinstance(a, dict) and a.get("alert_id") == alert_id)), None)
        if alert:
            alert_type = getattr(alert, "alert_type", "") or (alert.get("alert_type") if isinstance(alert, dict) else "")
            return _build_recommendations_for_type(alert_type, alert_id, "geo_alert", tenant_id)
    except Exception as exc:
        logger.debug("recommend_content_for_alert geo: %s", exc)

    return _build_recommendations_for_type("default", alert_id, "alert", tenant_id)


def recommend_content_for_narrative(cluster_id: str, tenant_id: str = "default") -> list[dict[str, Any]]:
    """Genera recomendaciones para una narrativa mediática."""
    return _build_recommendations_for_type("narrative_spike", cluster_id, "narrative", tenant_id)


def recommend_content_for_legal_item(legal_item_id: str, tenant_id: str = "default") -> list[dict[str, Any]]:
    """Genera recomendaciones para un elemento legislativo."""
    return _build_recommendations_for_type("legislative", legal_item_id, "legal_item", tenant_id)


def recommend_content_for_stakeholder(contact_id: str, tenant_id: str = "default") -> list[dict[str, Any]]:
    """Genera recomendaciones de contenido personalizadas para un stakeholder."""
    try:
        from crm.contacts import get_contact
        contact = get_contact(contact_id, tenant_id)
        topics = getattr(contact, "topics", []) if contact else []
        source_type = "economic" if "economía" in topics else "default"
        return _build_recommendations_for_type(source_type, contact_id, "contact", tenant_id)
    except Exception as exc:
        logger.debug("recommend_content_for_stakeholder: %s", exc)
        return _build_recommendations_for_type("default", contact_id, "contact", tenant_id)


def recommend_calendar_slots(
    priority: str,
    channel_id: str | None = None,
    tenant_id: str = "default",
) -> list[datetime]:
    """Recomienda slots en el calendario editorial."""
    from communications.content_calendar import suggest_calendar_slots
    return suggest_calendar_slots(priority=priority, channel_id=channel_id, n=5, tenant_id=tenant_id)


def generate_comms_alerts(tenant_id: str = "default") -> list[dict[str, Any]]:
    """Genera alertas del sistema de comunicación."""
    alerts = []
    try:
        from communications.approval_workflow import get_pending_approvals
        pending = get_pending_approvals(tenant_id=tenant_id)
        if pending:
            alerts.append({
                "tipo": "comms_content_approval_pending",
                "severidad": "WARNING",
                "titulo": f"{len(pending)} contenidos pendientes de aprobación",
                "datos": {"count": len(pending)},
            })
    except Exception as exc:
        logger.debug("generate_comms_alerts approvals: %s", exc)

    try:
        from communications.content_calendar import get_overdue_items
        overdue = get_overdue_items(tenant_id=tenant_id)
        if overdue:
            alerts.append({
                "tipo": "comms_calendar_deadline_due",
                "severidad": "HIGH",
                "titulo": f"{len(overdue)} elementos del calendario vencidos",
                "datos": {"count": len(overdue)},
            })
    except Exception as exc:
        logger.debug("generate_comms_alerts calendar: %s", exc)

    return alerts


def _build_recommendations_for_type(
    source_type: str,
    source_id: str,
    object_type: str,
    tenant_id: str,
) -> list[dict[str, Any]]:
    asset_types = _ALERT_CONTENT_MAP.get(source_type, _ALERT_CONTENT_MAP["default"])
    results = []
    for at in asset_types:
        rec = ContentRecommendation(
            source_type=object_type,
            source_id=source_id,
            asset_type=at,
            rationale=f"Recomendado para señal de tipo '{source_type}'",
            priority="HIGH" if source_type in ("conflict_escalation", "energy_security") else "MEDIUM",
            suggested_channels=_channels_for_type(at),
            tenant_id=tenant_id,
        )
        _RECOMMENDATIONS[rec.recommendation_id] = rec
        results.append({
            "recommendation_id": rec.recommendation_id,
            "asset_type": at,
            "rationale": rec.rationale,
            "priority": rec.priority,
            "suggested_channels": rec.suggested_channels,
        })
    return results


def _channels_for_type(asset_type: str) -> list[str]:
    return {
        "linkedin_post": ["linkedin"],
        "tweet": ["twitter_x"],
        "thread": ["twitter_x"],
        "newsletter": ["newsletter"],
        "email": ["email"],
        "press_note": ["press_release"],
        "briefing": ["briefing"],
        "talking_points": ["internal_memo"],
        "qa": ["internal_memo"],
        "internal_memo": ["internal_memo"],
    }.get(asset_type, ["other"])
