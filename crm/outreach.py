"""CRM Outreach — Bloque 15. Planificación de outreach y meeting packs."""
from __future__ import annotations
import logging
from datetime import date, timedelta
from typing import Any
from crm.schemas import MeetingPack, OutreachRecommendation, OutreachTask
logger = logging.getLogger(__name__)

def recommend_outreach_actions(contact_id: str, tenant_id: str = "default", context: dict | None = None) -> list[OutreachTask]:
    """Recomienda acciones de outreach para un contacto."""
    from crm.contacts import get_contact
    from crm.consent import can_contact
    from crm.interactions import get_contact_timeline, get_last_interaction_date
    context = context or {}
    contact = get_contact(contact_id, tenant_id)
    if contact is None:
        return []
    tasks = []
    # Check if contact can be reached
    if not can_contact(contact_id, "email", tenant_id):
        return []
    last_interaction = get_last_interaction_date(contact_id)
    if last_interaction is None:
        tasks.append(OutreachTask(
            title=f"Establecer primer contacto con {contact.display_name or contact.full_name}",
            task_type="email", priority="HIGH", contact_id=contact_id,
            due_date=date.today() + timedelta(days=7),
            source_recommendation="no_prior_interaction", tenant_id=tenant_id,
        ))
    else:
        from datetime import datetime
        days_ago = (datetime.utcnow() - last_interaction).days if isinstance(last_interaction, datetime) else 999
        if days_ago > 30:
            tasks.append(OutreachTask(
                title=f"Reactivar contacto con {contact.display_name or contact.full_name}",
                task_type="call", priority="MEDIUM", contact_id=contact_id,
                due_date=date.today() + timedelta(days=5),
                source_recommendation="stale_relationship", tenant_id=tenant_id,
            ))
    # Check for active alerts related to contact's topics
    active_alerts = context.get("active_alerts", [])
    for alert in active_alerts[:2]:
        for topic in contact.topics:
            if topic in " ".join(alert.get("affected_modules", [])):
                tasks.append(OutreachTask(
                    title=f"Briefing urgente: {alert.get('title', 'Alerta activa')}",
                    task_type="send_briefing", priority="HIGH", contact_id=contact_id,
                    due_date=date.today() + timedelta(days=2),
                    source_recommendation=f"alert:{alert.get('alert_id', '')}",
                    tenant_id=tenant_id,
                ))
                break
    return tasks

def generate_briefing_for_contact(contact_id: str, tenant_id: str = "default") -> dict:
    """Genera un briefing personalizado para un contacto."""
    from crm.contacts import get_contact
    from crm.interactions import summarize_recent_interactions
    contact = get_contact(contact_id, tenant_id)
    if contact is None:
        return {"error": "Contacto no encontrado"}
    recent_summary = summarize_recent_interactions(contact_id)
    return {
        "contact_id": contact_id,
        "contact_name": contact.full_name,
        "role": contact.role_title or "",
        "topics": contact.topics,
        "sectors": contact.sectors,
        "recent_interactions": recent_summary,
        "recommended_topics": _get_relevant_topics(contact),
        "generated_at": str(date.today()),
    }

def prepare_meeting_pack(contact_id: str, topic: str | None = None, tenant_id: str = "default") -> MeetingPack:
    """Prepara un dossier de reunión para un contacto."""
    from crm.contacts import get_contact
    from crm.interactions import summarize_recent_interactions
    contact = get_contact(contact_id, tenant_id)
    pack = MeetingPack(
        contact_id=contact_id,
        contact_name=contact.full_name if contact else contact_id,
        topic=topic,
    )
    if contact is None:
        return pack
    pack.last_interaction_summary = summarize_recent_interactions(contact_id)
    pack.sensitive_topics = contact.topics[:5]
    pack.recent_legal_items = _get_legal_items_for_contact(contact)
    pack.geopolitical_exposure = _get_geo_exposure_for_contact(contact)
    pack.risks = _get_risks_for_contact(contact)
    pack.opportunities = _get_opportunities_for_contact(contact)
    pack.recommended_questions = _generate_meeting_questions(contact, topic)
    pack.recommended_actions = [
        "Confirmar posición sobre temas regulatorios recientes",
        "Explorar oportunidades de colaboración",
        "Actualizar perfil de stakeholder post-reunión",
    ]
    return pack

def create_outreach_plan(
    segment_id: str, objective: str,
    owner_user_id: str | None = None, tenant_id: str = "default",
) -> dict:
    """Crea un plan de outreach para un segmento."""
    from crm.segments import list_segment_members
    members = list_segment_members(segment_id, tenant_id)
    tasks_created = []
    for member in members[:20]:  # Limit
        contact_id = member.get("contact_id")
        if not contact_id: continue
        task = OutreachTask(
            title=f"Outreach: {objective[:50]}",
            task_type="email", priority="MEDIUM",
            contact_id=contact_id, assigned_to=owner_user_id,
            due_date=date.today() + timedelta(days=14),
            source_recommendation=f"segment:{segment_id}",
            tenant_id=tenant_id,
        )
        tasks_created.append(task.task_id)
    return {
        "segment_id": segment_id, "objective": objective,
        "members_targeted": len(members),
        "tasks_created": len(tasks_created),
        "owner": owner_user_id,
    }

# ── Helpers privados ─────────────────────────────────────────────────────────

def _get_relevant_topics(contact: Any) -> list[str]:
    topics = list(contact.topics)
    try:
        from etl.sources.legislativo.boe_service import get_recent_items
        items = get_recent_items(limit=3)
        for item in items:
            for kw in (item.get("keywords") or []):
                if kw in contact.topics or kw in contact.sectors:
                    if kw not in topics:
                        topics.append(kw)
    except Exception:
        pass
    return topics[:8]

def _get_legal_items_for_contact(contact: Any) -> list[dict]:
    try:
        from etl.sources.legislativo.boe_service import search_boe
        if contact.topics:
            items = search_boe(query=contact.topics[0], limit=3)
            return [{"title": i.get("title", ""), "date": str(i.get("date", ""))} for i in (items or [])]
    except Exception:
        pass
    return []

def _get_geo_exposure_for_contact(contact: Any) -> list[dict]:
    try:
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence
        from etl.sources.geopolitics.acled_client import SPAIN_RELEVANCE
        if "energy" in contact.sectors:
            presence = get_spanish_presence(categories=["energy"])
            return [{"country": p.country_name, "category": p.category, "actor": p.actor_name} for p in presence[:3]]
    except Exception:
        pass
    return []

def _get_risks_for_contact(contact: Any) -> list[str]:
    risks = []
    if "energy" in contact.sectors:
        risks.append("Exposición regulatoria sector energético")
    if "defense" in contact.topics:
        risks.append("Cambios en política de defensa y misiones exteriores")
    if not risks:
        risks.append("Sin riesgos sectoriales identificados automáticamente")
    return risks

def _get_opportunities_for_contact(contact: Any) -> list[str]:
    opps = []
    if contact.contact_type in ("business_actor", "expert"):
        opps.append("Potencial alianza para análisis sectorial")
    if contact.contact_type == "journalist":
        opps.append("Canal de comunicación para mensajes estratégicos")
    if contact.contact_type == "public_official":
        opps.append("Canal para influencia regulatoria")
    return opps or ["Explorar sinergias en reunión inicial"]

def _generate_meeting_questions(contact: Any, topic: str | None) -> list[str]:
    questions = [
        f"¿Cuál es su posición sobre las últimas novedades regulatorias en {contact.topics[0] if contact.topics else 'su sector'}?",
        "¿Cuáles son sus principales preocupaciones para los próximos 6 meses?",
        "¿Existe algún proyecto de colaboración que podríamos explorar?",
    ]
    if topic:
        questions.insert(0, f"¿Cuál es su visión sobre {topic}?")
    return questions[:5]
