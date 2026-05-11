"""
Router /api/legislative — expone `dashboard/services/legislative_core.py`
como REST. Cubre BOE + iniciativas Congreso + KPIs + huella legislativa.

Endpoints:
  GET /api/legislative/boe-recent            → BOE últimos N días
  GET /api/legislative/boe-today             → BOE hoy (publicado)
  GET /api/legislative/initiatives           → iniciativas parlamentarias
  GET /api/legislative/kpis                  → KPIs legislativos consolidados
  GET /api/legislative/alerts                → alertas legislativas activas
  GET /api/legislative/search                → búsqueda transversal
  GET /api/legislative/timeline/{source_id}  → timeline de una iniciativa
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/legislative", tags=["legislative-core"])


def _safe_call(fn, *args, **kwargs):
    try:
        result = fn(*args, **kwargs)
        if hasattr(result, "to_dict"):
            return result.to_dict(orient="records")
        return result
    except Exception as e:
        logger.warning("legislative_core.%s failed: %s", fn.__name__, e)
        return None


@router.get("/boe-recent")
def boe_recent(days: int = Query(7, le=90), limit: int = Query(50, le=500)):
    try:
        from dashboard.services.legislative_core import cargar_boe_reciente
        rows = _safe_call(cargar_boe_reciente, days=days, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "legislative_core_not_importable"}


@router.get("/boe-today")
def boe_today():
    try:
        from dashboard.services.legislative_core import cargar_boe_hoy
        rows = _safe_call(cargar_boe_hoy)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "legislative_core_not_importable"}


@router.get("/initiatives")
def initiatives(limit: int = Query(50, le=500), status: Optional[str] = None):
    try:
        from dashboard.services.legislative_core import cargar_iniciativas_recientes
        rows = _safe_call(cargar_iniciativas_recientes, limit=limit, status=status)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "legislative_core_not_importable"}


@router.get("/kpis")
def kpis():
    try:
        from dashboard.services.legislative_core import cargar_kpis_legislativos
        result = _safe_call(cargar_kpis_legislativos)
        return result if isinstance(result, dict) else {"items": result or []}
    except ImportError:
        return {"warning": "legislative_core_not_importable"}


@router.get("/alerts")
def alerts(limit: int = Query(20, le=200)):
    try:
        from dashboard.services.legislative_core import cargar_alertas_legislativas
        rows = _safe_call(cargar_alertas_legislativas, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "legislative_core_not_importable"}


@router.get("/search")
def search(q: str, limit: int = Query(50, le=500)):
    try:
        from dashboard.services.legislative_core import buscar_items_legislativos
        rows = _safe_call(buscar_items_legislativos, query=q, limit=limit)
        return {"items": rows or [], "query": q, "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "legislative_core_not_importable"}


@router.get("/timeline/{source_id}")
def timeline(source_id: str):
    try:
        from dashboard.services.legislative_core import cargar_timeline_iniciativa
        rows = _safe_call(cargar_timeline_iniciativa, source_id=source_id)
        return {"items": rows or [], "source_id": source_id}
    except ImportError:
        return {"items": [], "warning": "legislative_core_not_importable"}
