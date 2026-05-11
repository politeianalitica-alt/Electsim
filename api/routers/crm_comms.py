"""
Router /api/crm + /api/comms — expone los servicios CRM y Comms (Bloques
15 y 16) como REST. El frontend visual-oscar consume estos endpoints
desde `app/team`, `app/watchlists`, `app/communication-intel`, `app/competidores`.

Endpoints CRM:
  GET /api/crm/kpis
  GET /api/crm/contacts
  GET /api/crm/organizations
  GET /api/crm/stakeholders
  GET /api/crm/alerts
  GET /api/crm/tasks
  GET /api/crm/relationship-graph/{type}/{id}
  GET /api/crm/timeline/{contact_id}

Endpoints Comms:
  GET /api/comms/kpis
  GET /api/comms/calendar
  GET /api/comms/assets
  GET /api/comms/queue
  GET /api/comms/approvals
  GET /api/comms/performance
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["crm-comms"])


def _safe_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        logger.warning("safe_call(%s) failed: %s", fn.__name__, e)
        return None


# ─── CRM ─────────────────────────────────────────────────────────────────────


@router.get("/crm/kpis")
def crm_kpis(tenant_id: str = "default"):
    try:
        from dashboard.services.crm_core import cargar_crm_kpis
        result = _safe_call(cargar_crm_kpis, tenant_id=tenant_id)
        return result if isinstance(result, dict) else {"items": result or []}
    except ImportError:
        return {"warning": "crm_core_not_importable"}


@router.get("/crm/contacts")
def crm_contacts(tenant_id: str = "default", limit: int = Query(100, le=1000)):
    try:
        from dashboard.services.crm_core import cargar_contactos
        rows = _safe_call(cargar_contactos, tenant_id=tenant_id, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "crm_core_not_importable"}


@router.get("/crm/contacts/{contact_id}")
def crm_contact(contact_id: str):
    try:
        from dashboard.services.crm_core import cargar_contacto
        result = _safe_call(cargar_contacto, contact_id=contact_id)
        if result is None:
            return {"error": "contact_not_found", "contact_id": contact_id}
        return result
    except ImportError:
        return {"warning": "crm_core_not_importable"}


@router.get("/crm/organizations")
def crm_orgs(tenant_id: str = "default", limit: int = Query(100, le=1000)):
    try:
        from dashboard.services.crm_core import cargar_organizaciones
        rows = _safe_call(cargar_organizaciones, tenant_id=tenant_id, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "crm_core_not_importable"}


@router.get("/crm/stakeholders")
def crm_stakeholders(
    tenant_id: str = "default",
    min_priority: float = Query(50.0, ge=0, le=100),
    limit: int = Query(50, le=500),
):
    try:
        from dashboard.services.crm_core import cargar_stakeholders_prioritarios
        rows = _safe_call(cargar_stakeholders_prioritarios, tenant_id=tenant_id, min_priority=min_priority, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "crm_core_not_importable"}


@router.get("/crm/alerts")
def crm_alerts(tenant_id: str = "default"):
    try:
        from dashboard.services.crm_core import cargar_alertas_crm
        rows = _safe_call(cargar_alertas_crm, tenant_id=tenant_id)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "crm_core_not_importable"}


@router.get("/crm/tasks")
def crm_tasks(tenant_id: str = "default", days: int = Query(14, le=180)):
    try:
        from dashboard.services.crm_core import cargar_tareas_pendientes
        rows = _safe_call(cargar_tareas_pendientes, tenant_id=tenant_id, days=days)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "crm_core_not_importable"}


@router.get("/crm/relationship-graph/{object_type}/{object_id}")
def crm_graph(object_type: str, object_id: str, depth: int = Query(2, ge=1, le=4)):
    try:
        from dashboard.services.crm_core import cargar_relationship_graph
        result = _safe_call(cargar_relationship_graph, object_type=object_type, object_id=object_id, depth=depth)
        return result if isinstance(result, dict) else {"nodes": [], "edges": []}
    except ImportError:
        return {"nodes": [], "edges": [], "warning": "crm_core_not_importable"}


@router.get("/crm/timeline/{contact_id}")
def crm_timeline(contact_id: str, limit: int = Query(20, le=200)):
    try:
        from dashboard.services.crm_core import cargar_timeline_contacto
        rows = _safe_call(cargar_timeline_contacto, contact_id=contact_id, limit=limit)
        return {"items": rows or [], "contact_id": contact_id}
    except ImportError:
        return {"items": [], "warning": "crm_core_not_importable"}


# ─── Comms ───────────────────────────────────────────────────────────────────


@router.get("/comms/kpis")
def comms_kpis(tenant_id: str = "default"):
    try:
        from dashboard.services.comms_core import cargar_comms_kpis
        result = _safe_call(cargar_comms_kpis, tenant_id=tenant_id)
        return result if isinstance(result, dict) else {"items": result or []}
    except ImportError:
        return {"warning": "comms_core_not_importable"}


@router.get("/comms/calendar")
def comms_calendar(tenant_id: str = "default", days: int = Query(30, le=180)):
    try:
        from dashboard.services.comms_core import cargar_editorial_calendar
        rows = _safe_call(cargar_editorial_calendar, tenant_id=tenant_id, days=days)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "comms_core_not_importable"}


@router.get("/comms/assets")
def comms_assets(tenant_id: str = "default", limit: int = Query(50, le=500), kind: Optional[str] = None):
    try:
        from dashboard.services.comms_core import cargar_content_assets
        rows = _safe_call(cargar_content_assets, tenant_id=tenant_id, limit=limit, kind=kind)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "comms_core_not_importable"}


@router.get("/comms/queue")
def comms_queue(tenant_id: str = "default", status: Optional[str] = None):
    try:
        from dashboard.services.comms_core import cargar_publication_queue
        rows = _safe_call(cargar_publication_queue, tenant_id=tenant_id, status=status)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "comms_core_not_importable"}


@router.get("/comms/approvals")
def comms_approvals(tenant_id: str = "default", limit: int = Query(50, le=500)):
    try:
        from dashboard.services.comms_core import cargar_pending_approvals
        rows = _safe_call(cargar_pending_approvals, tenant_id=tenant_id, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "comms_core_not_importable"}


@router.get("/comms/performance")
def comms_performance(tenant_id: str = "default", days: int = Query(30, le=180)):
    try:
        from dashboard.services.comms_core import cargar_content_performance
        rows = _safe_call(cargar_content_performance, tenant_id=tenant_id, days=days)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "comms_core_not_importable"}


@router.get("/comms/recommendations")
def comms_recommendations(tenant_id: str = "default", limit: int = Query(20, le=200)):
    try:
        from dashboard.services.comms_core import cargar_recommended_content
        rows = _safe_call(cargar_recommended_content, tenant_id=tenant_id, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "comms_core_not_importable"}
