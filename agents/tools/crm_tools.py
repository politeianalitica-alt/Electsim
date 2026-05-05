"""
CRM Brain Tools — Bloque 15.

8 herramientas para que el Brain LLM interactúe con el CRM.
Registro centralizado compatible con llm_tools_registry.py.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

CRM_TOOLS: list[dict] = []


def _register(name: str, description: str, parameters: dict):
    def decorator(fn):
        CRM_TOOLS.append({
            "name": name,
            "description": description,
            "input_schema": {"type": "object", "properties": parameters, "required": []},
            "function": fn,
        })
        return fn
    return decorator


@_register(
    "search_contacts",
    "Busca contactos en el CRM institucional. Filtra por nombre, tipo, territorio, sector o temas.",
    {
        "query": {"type": "string", "description": "Texto libre para buscar"},
        "contact_type": {"type": "string", "description": "Tipo: public_official, political_actor, journalist, business_actor, civil_society, academic, other"},
        "territory": {"type": "string", "description": "Territorio o municipio"},
        "limit": {"type": "integer", "description": "Máximo de resultados (default 20)"},
        "tenant_id": {"type": "string", "description": "ID del tenant (default: default)"},
    },
)
def search_contacts(query: str = "", contact_type: str = "", territory: str = "", limit: int = 20, tenant_id: str = "default") -> dict:
    try:
        from crm.contacts import search_contacts as _search
        filters: dict[str, Any] = {}
        if contact_type:
            filters["contact_type"] = contact_type
        if territory:
            filters["territory"] = territory
        contacts = _search(tenant_id=tenant_id, limit=limit, **filters)
        if query:
            q = query.lower()
            contacts = [c for c in contacts if q in getattr(c, "full_name", "").lower()
                        or q in (getattr(c, "position", "") or "").lower()]
        return {
            "contacts": [
                {
                    "contact_id": c.contact_id,
                    "full_name": c.full_name,
                    "contact_type": c.contact_type,
                    "position": c.position,
                    "territory": c.territory,
                    "consent_status": c.consent_status,
                    "email": c.email,
                }
                for c in contacts
            ],
            "total": len(contacts),
        }
    except Exception as exc:
        logger.warning("search_contacts tool: %s", exc)
        return {"error": str(exc)}


@_register(
    "get_contact_profile",
    "Obtiene el perfil completo de un contacto del CRM, incluyendo interacciones recientes y score de stakeholder.",
    {
        "contact_id": {"type": "string", "description": "ID del contacto"},
    },
)
def get_contact_profile(contact_id: str) -> dict:
    try:
        from crm.contacts import get_contact
        from crm.interactions import get_contact_timeline, summarize_recent_interactions
        from crm.stakeholders import get_stakeholder_profile

        contact = get_contact(contact_id)
        if not contact:
            return {"error": f"Contacto {contact_id} no encontrado"}

        timeline = get_contact_timeline(contact_id, limit=5)
        summary = summarize_recent_interactions(contact_id, n=5)
        profile = get_stakeholder_profile("contact", contact_id)

        return {
            "contact": {
                "contact_id": contact.contact_id,
                "full_name": contact.full_name,
                "contact_type": contact.contact_type,
                "position": contact.position,
                "territory": contact.territory,
                "topics": contact.topics,
                "consent_status": contact.consent_status,
                "notes": contact.notes,
            },
            "recent_interactions_summary": summary,
            "interaction_count": len(timeline),
            "priority_score": profile.priority_score if profile else None,
            "priority_label": profile.priority_label if profile else None,
        }
    except Exception as exc:
        logger.warning("get_contact_profile tool: %s", exc)
        return {"error": str(exc)}


@_register(
    "get_organization_profile",
    "Obtiene el perfil de una organización del CRM, incluyendo contactos vinculados.",
    {
        "org_id": {"type": "string", "description": "ID de la organización"},
    },
)
def get_organization_profile(org_id: str) -> dict:
    try:
        from crm.organizations import get_organization
        from crm.contacts import search_contacts

        org = get_organization(org_id)
        if not org:
            return {"error": f"Organización {org_id} no encontrada"}

        contacts = search_contacts(organization_id=org_id, limit=20)

        return {
            "org": {
                "org_id": org.org_id,
                "name": org.name,
                "org_type": org.org_type,
                "sector": org.sector,
                "territory": org.territory,
                "topics": org.topics,
                "website": org.website,
            },
            "contacts_count": len(contacts),
            "top_contacts": [
                {"contact_id": c.contact_id, "full_name": c.full_name, "position": c.position}
                for c in contacts[:5]
            ],
        }
    except Exception as exc:
        logger.warning("get_organization_profile tool: %s", exc)
        return {"error": str(exc)}


@_register(
    "get_stakeholder_priorities",
    "Lista los stakeholders de mayor prioridad para el tenant. Útil para planificar agenda de relaciones institucionales.",
    {
        "min_priority": {"type": "number", "description": "Score mínimo de prioridad (0-100, default 50)"},
        "limit": {"type": "integer", "description": "Máximo de resultados (default 20)"},
        "tenant_id": {"type": "string", "description": "ID del tenant"},
    },
)
def get_stakeholder_priorities(min_priority: float = 50.0, limit: int = 20, tenant_id: str = "default") -> dict:
    try:
        from crm.stakeholders import list_priority_stakeholders

        profiles = list_priority_stakeholders(tenant_id=tenant_id, min_priority=min_priority, limit=limit)
        return {
            "stakeholders": [
                {
                    "profile_id": p.profile_id,
                    "object_type": p.object_type,
                    "object_id": p.object_id,
                    "priority_score": p.priority_score,
                    "priority_label": p.priority_label,
                    "recommended_actions": p.recommended_actions[:3],
                }
                for p in profiles
            ],
            "total": len(profiles),
        }
    except Exception as exc:
        logger.warning("get_stakeholder_priorities tool: %s", exc)
        return {"error": str(exc)}


@_register(
    "recommend_outreach_actions",
    "Genera acciones de outreach recomendadas para un contacto, respetando el consentimiento.",
    {
        "contact_id": {"type": "string", "description": "ID del contacto"},
        "tenant_id": {"type": "string", "description": "ID del tenant"},
    },
)
def recommend_outreach_actions(contact_id: str, tenant_id: str = "default") -> dict:
    try:
        from crm.outreach import recommend_outreach_actions as _recommend

        tasks = _recommend(contact_id=contact_id, tenant_id=tenant_id)
        return {
            "tasks_created": len(tasks),
            "tasks": [
                {
                    "task_id": t.task_id,
                    "task_type": t.task_type,
                    "title": t.title,
                    "priority": t.priority,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                }
                for t in tasks
            ],
        }
    except Exception as exc:
        logger.warning("recommend_outreach_actions tool: %s", exc)
        return {"error": str(exc)}


@_register(
    "prepare_meeting_pack",
    "Prepara un dossier pre-reunión con historial, temas legales, exposición geopolítica, riesgos y preguntas sugeridas.",
    {
        "contact_id": {"type": "string", "description": "ID del contacto"},
        "meeting_time": {"type": "string", "description": "Fecha/hora de la reunión (ISO 8601, opcional)"},
    },
)
def prepare_meeting_pack(contact_id: str, meeting_time: str | None = None) -> dict:
    try:
        from crm.outreach import prepare_meeting_pack as _pack
        from datetime import datetime

        mt = None
        if meeting_time:
            try:
                mt = datetime.fromisoformat(meeting_time)
            except ValueError:
                pass

        pack = _pack(contact_id=contact_id, meeting_time=mt)
        if pack is None:
            return {"error": "No se pudo preparar el meeting pack"}

        return {
            "contact_name": pack.contact_name,
            "meeting_time": pack.meeting_time.isoformat() if pack.meeting_time else None,
            "last_interaction_summary": pack.last_interaction_summary,
            "legal_items_to_watch": pack.legal_items_to_watch,
            "geo_exposure": pack.geo_exposure,
            "risk_alerts": pack.risk_alerts,
            "suggested_questions": pack.suggested_questions,
            "recommended_actions": pack.recommended_actions,
        }
    except Exception as exc:
        logger.warning("prepare_meeting_pack tool: %s", exc)
        return {"error": str(exc)}


@_register(
    "get_due_crm_tasks",
    "Lista tareas CRM pendientes próximas, opcionalmente filtradas por usuario.",
    {
        "days": {"type": "integer", "description": "Horizonte en días (default 7)"},
        "user_id": {"type": "string", "description": "ID del usuario asignado (opcional)"},
        "tenant_id": {"type": "string", "description": "ID del tenant"},
    },
)
def get_due_crm_tasks(days: int = 7, user_id: str | None = None, tenant_id: str = "default") -> dict:
    try:
        from crm.tasks import get_due_tasks, detect_overdue_tasks

        due = get_due_tasks(user_id=user_id, days=days, tenant_id=tenant_id)
        overdue = detect_overdue_tasks(user_id=user_id, tenant_id=tenant_id)
        return {
            "due_tasks": [
                {
                    "task_id": t.task_id,
                    "title": t.title,
                    "task_type": t.task_type,
                    "priority": t.priority,
                    "due_date": t.due_date.isoformat() if t.due_date else None,
                    "contact_id": t.contact_id,
                }
                for t in due
            ],
            "overdue_tasks": len(overdue),
            "total_due": len(due),
        }
    except Exception as exc:
        logger.warning("get_due_crm_tasks tool: %s", exc)
        return {"error": str(exc)}


@_register(
    "get_field_plan_by_territory",
    "Obtiene el plan de campo (contactos, eventos, tareas, capacidad de movilización) para un territorio.",
    {
        "territory": {"type": "string", "description": "Nombre del territorio, municipio o provincia"},
        "tenant_id": {"type": "string", "description": "ID del tenant"},
    },
)
def get_field_plan_by_territory(territory: str, tenant_id: str = "default") -> dict:
    try:
        from crm.field_operations import get_field_plan_by_territory as _plan

        plan = _plan(territory=territory, tenant_id=tenant_id)
        return plan
    except Exception as exc:
        logger.warning("get_field_plan_by_territory tool: %s", exc)
        return {"error": str(exc)}
