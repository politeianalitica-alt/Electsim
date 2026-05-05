"""CRM Recommender — Bloque 15. Recomendaciones de acciones CRM."""
from __future__ import annotations
import logging
from typing import Any
from crm.schemas import OutreachRecommendation, OutreachTask
logger = logging.getLogger(__name__)

def recommend_actions_for_all_contacts(
    tenant_id: str = "default", limit: int = 50
) -> list[OutreachTask]:
    """Generates outreach tasks for contacts needing attention."""
    from crm.contacts import list_contacts
    from crm.outreach import recommend_outreach_actions
    contacts = list_contacts(tenant_id=tenant_id, limit=limit)
    all_tasks = []
    for contact in contacts:
        try:
            tasks = recommend_outreach_actions(contact.contact_id, tenant_id)
            all_tasks.extend(tasks)
        except Exception as exc:
            logger.debug("recommend_actions for %s error: %s", contact.contact_id, exc)
    return all_tasks

def detect_stale_relationships(
    tenant_id: str = "default", days_threshold: int = 60
) -> list[dict]:
    """Finds contacts with no recent interactions."""
    from crm.contacts import list_contacts
    from crm.interactions import get_last_interaction_date
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(days=days_threshold)
    stale = []
    for contact in list_contacts(tenant_id=tenant_id, limit=500):
        if contact.consent_status in ("do_not_contact", "revoked"):
            continue
        last = get_last_interaction_date(contact.contact_id)
        if last is None or last < cutoff:
            days_ago = (datetime.utcnow() - last).days if last else None
            stale.append({
                "contact_id": contact.contact_id,
                "full_name": contact.full_name,
                "last_interaction_days_ago": days_ago,
                "contact_type": contact.contact_type,
            })
    return sorted(stale, key=lambda x: (x["last_interaction_days_ago"] or 9999), reverse=True)

def generate_crm_alerts(tenant_id: str = "default") -> list[dict]:
    """Generates CRM alerts for critical situations."""
    alerts = []
    try:
        from crm.tasks import detect_overdue_tasks
        overdue = detect_overdue_tasks(tenant_id)
        for task in overdue[:5]:
            alerts.append({
                "tipo": "crm_outreach_task_overdue",
                "severidad": "WARNING",
                "titulo": f"Tarea vencida: {task.title}",
                "datos": {"task_id": task.task_id, "pagina_relevante": "operaciones"},
            })
    except Exception as exc:
        logger.debug("generate_crm_alerts tasks error: %s", exc)
    try:
        stale = detect_stale_relationships(tenant_id, days_threshold=45)
        for s in stale[:3]:
            alerts.append({
                "tipo": "crm_critical_contact_stale",
                "severidad": "INFO",
                "titulo": f"Relación sin seguimiento: {s['full_name']}",
                "datos": {"contact_id": s["contact_id"], "pagina_relevante": "actores"},
            })
    except Exception as exc:
        logger.debug("generate_crm_alerts stale error: %s", exc)
    return alerts
