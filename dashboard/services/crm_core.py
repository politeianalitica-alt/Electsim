"""
CRM Core Service — Bloque 15.

Funciones de carga para el dashboard de CRM.
Todas con caché, fallback a vacío, nunca rompen.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# ── Cache simple ───────────────────────────────────────────────────────────────
_cache_store: dict[str, tuple[Any, datetime]] = {}


def _cache(ttl: int = 60):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            key = f"{fn.__name__}:{args}:{sorted(kwargs.items())}"
            if key in _cache_store:
                val, exp = _cache_store[key]
                if datetime.utcnow() < exp:
                    return val
            result = fn(*args, **kwargs)
            _cache_store[key] = (result, datetime.utcnow() + timedelta(seconds=ttl))
            return result
        return wrapper
    return decorator


# ── Imports CRM ───────────────────────────────────────────────────────────────
try:
    from crm.contacts import search_contacts, get_contact
    from crm.organizations import search_organizations, get_organization
    from crm.stakeholders import list_priority_stakeholders
    from crm.interactions import get_contact_timeline
    from crm.relationships import get_relationship_graph
    from crm.tasks import get_due_tasks, detect_overdue_tasks
    from crm.mobilization import list_mobilization_events
    from crm.segments import list_segments
    from crm.crm_recommender import generate_crm_alerts
    _crm_available = True
except Exception as exc:
    logger.warning("CRM no disponible: %s", exc)
    _crm_available = False


def _empty_df(*cols):
    try:
        import pandas as pd
        return pd.DataFrame(columns=list(cols))
    except Exception:
        return []


@_cache(ttl=120)
def cargar_crm_kpis(tenant_id: str = "default") -> dict:
    """KPIs resumen del CRM."""
    try:
        if not _crm_available:
            return {}
        contacts = search_contacts(tenant_id=tenant_id, limit=9999)
        orgs = search_organizations(tenant_id=tenant_id, limit=9999)
        stakeholders = list_priority_stakeholders(tenant_id=tenant_id, min_priority=0, limit=9999)
        tasks_due = get_due_tasks(tenant_id=tenant_id, days=7)
        tasks_overdue = detect_overdue_tasks(tenant_id=tenant_id)
        events = list_mobilization_events(tenant_id=tenant_id, days=30)

        consented = sum(1 for c in contacts if getattr(c, "consent_status", "") in ("consented", "legitimate_interest"))
        return {
            "total_contactos": len(contacts),
            "total_organizaciones": len(orgs),
            "total_stakeholders": len(stakeholders),
            "tareas_proximas_7d": len(tasks_due),
            "tareas_vencidas": len(tasks_overdue),
            "eventos_proximos_30d": len(events),
            "contactos_con_consentimiento": consented,
            "pct_consentimiento": round(100 * consented / max(len(contacts), 1), 1),
        }
    except Exception as exc:
        logger.warning("cargar_crm_kpis: %s", exc)
        return {}


@_cache(ttl=60)
def cargar_contactos(tenant_id: str = "default", limit: int = 100, filters: dict | None = None) -> list:
    """Lista de contactos."""
    try:
        if not _crm_available:
            return []
        return search_contacts(tenant_id=tenant_id, limit=limit, **(filters or {}))
    except Exception as exc:
        logger.warning("cargar_contactos: %s", exc)
        return []


@_cache(ttl=60)
def cargar_organizaciones(tenant_id: str = "default", limit: int = 100) -> list:
    """Lista de organizaciones."""
    try:
        if not _crm_available:
            return []
        return search_organizations(tenant_id=tenant_id, limit=limit)
    except Exception as exc:
        logger.warning("cargar_organizaciones: %s", exc)
        return []


@_cache(ttl=90)
def cargar_stakeholders_prioritarios(tenant_id: str = "default", min_priority: float = 50.0, limit: int = 50) -> list:
    """Stakeholders de mayor prioridad."""
    try:
        if not _crm_available:
            return []
        return list_priority_stakeholders(tenant_id=tenant_id, min_priority=min_priority, limit=limit)
    except Exception as exc:
        logger.warning("cargar_stakeholders_prioritarios: %s", exc)
        return []


def cargar_contacto(contact_id: str) -> Any | None:
    """Contacto individual."""
    try:
        if not _crm_available:
            return None
        return get_contact(contact_id)
    except Exception as exc:
        logger.warning("cargar_contacto: %s", exc)
        return None


def cargar_organizacion(org_id: str) -> Any | None:
    """Organización individual."""
    try:
        if not _crm_available:
            return None
        return get_organization(org_id)
    except Exception as exc:
        logger.warning("cargar_organizacion: %s", exc)
        return None


@_cache(ttl=60)
def cargar_timeline_contacto(contact_id: str, limit: int = 20) -> list:
    """Timeline de interacciones de un contacto."""
    try:
        if not _crm_available:
            return []
        return get_contact_timeline(contact_id, limit=limit)
    except Exception as exc:
        logger.warning("cargar_timeline_contacto: %s", exc)
        return []


def cargar_relationship_graph(object_type: str, object_id: str, depth: int = 2) -> dict:
    """Grafo de relaciones de un nodo."""
    try:
        if not _crm_available:
            return {"nodes": [], "edges": []}
        return get_relationship_graph(object_type, object_id, depth=depth)
    except Exception as exc:
        logger.warning("cargar_relationship_graph: %s", exc)
        return {"nodes": [], "edges": []}


@_cache(ttl=60)
def cargar_tareas_pendientes(tenant_id: str = "default", days: int = 14) -> list:
    """Tareas pendientes próximas."""
    try:
        if not _crm_available:
            return []
        return get_due_tasks(tenant_id=tenant_id, days=days)
    except Exception as exc:
        logger.warning("cargar_tareas_pendientes: %s", exc)
        return []


@_cache(ttl=120)
def cargar_eventos_movilizacion(tenant_id: str = "default", days: int = 60) -> list:
    """Eventos de movilización próximos."""
    try:
        if not _crm_available:
            return []
        return list_mobilization_events(tenant_id=tenant_id, days=days)
    except Exception as exc:
        logger.warning("cargar_eventos_movilizacion: %s", exc)
        return []


@_cache(ttl=180)
def cargar_segmentos_crm(tenant_id: str = "default") -> list:
    """Segmentos de contactos."""
    try:
        if not _crm_available:
            return []
        return list_segments(tenant_id=tenant_id)
    except Exception as exc:
        logger.warning("cargar_segmentos_crm: %s", exc)
        return []


@_cache(ttl=300)
def cargar_alertas_crm(tenant_id: str = "default") -> list[dict]:
    """Alertas generadas por el CRM (tareas vencidas, relaciones estancadas)."""
    try:
        if not _crm_available:
            return []
        return generate_crm_alerts(tenant_id=tenant_id)
    except Exception as exc:
        logger.warning("cargar_alertas_crm: %s", exc)
        return []
