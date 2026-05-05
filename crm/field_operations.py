"""CRM Field Operations — Bloque 15."""
from __future__ import annotations
import logging
from typing import Any
logger = logging.getLogger(__name__)

def get_field_plan_by_territory(territory_id: str, tenant_id: str = "default") -> dict:
    """Returns a complete field plan for a territory."""
    from crm.contacts import search_contacts
    from crm.mobilization import get_events_by_territory
    from crm.stakeholders import list_priority_stakeholders
    from crm.tasks import get_due_tasks

    contacts = search_contacts(territory_id=territory_id, tenant_id=tenant_id, limit=20)
    events = get_events_by_territory(territory_id, tenant_id)
    tasks = [t for t in get_due_tasks(tenant_id=tenant_id) if True]  # filter by territory when possible
    stakeholders = [s for s in list_priority_stakeholders(tenant_id=tenant_id, limit=10)
                    if s.priority_score >= 50]

    return {
        "territory_id": territory_id,
        "contacts_count": len(contacts),
        "key_contacts": [{"id": c.contact_id, "name": c.full_name, "role": c.role_title} for c in contacts[:5]],
        "upcoming_events": [{"id": e.mobilization_id, "name": e.name, "date": str(e.start_at)} for e in events[:5]],
        "open_tasks": len(tasks),
        "priority_stakeholders": len(stakeholders),
        "mobilization_capacity": compute_mobilization_capacity(territory_id, tenant_id),
    }

def compute_mobilization_capacity(territory_id: str, tenant_id: str = "default") -> dict:
    """Estimates mobilization capacity for a territory."""
    from crm.contacts import search_contacts
    contacts = search_contacts(territory_id=territory_id, tenant_id=tenant_id, limit=500)
    consented = [c for c in contacts if c.consent_status in ("consented", "legitimate_interest")]
    by_type: dict[str, int] = {}
    for c in contacts:
        by_type[c.contact_type] = by_type.get(c.contact_type, 0) + 1
    return {
        "total_contacts": len(contacts),
        "contactable": len(consented),
        "by_type": by_type,
        "estimated_reach": len(consented),
    }

def recommend_field_actions(territory_id: str, tenant_id: str = "default") -> list[dict]:
    """Recommends field actions for a territory."""
    plan = get_field_plan_by_territory(territory_id, tenant_id)
    actions = []
    if plan["contacts_count"] == 0:
        actions.append({"action": "import_contacts", "priority": "HIGH",
                        "description": "Importar contactos para este territorio"})
    if plan["upcoming_events"] == []:
        actions.append({"action": "create_event", "priority": "MEDIUM",
                        "description": "Planificar evento de stakeholders en este territorio"})
    if plan["open_tasks"] > 10:
        actions.append({"action": "process_tasks", "priority": "HIGH",
                        "description": f"{plan['open_tasks']} tareas pendientes que atender"})
    return actions
