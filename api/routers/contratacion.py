"""
Router /api/contratacion — contratación pública (PLACSP + adjudicaciones).

Cubre las 5 páginas huérfanas del frontend visual-oscar:
  /adjudicaciones, /contratos-vigentes, /licitaciones,
  /litigios-contratacion, /trazabilidad

Fuentes:
  - PLACSP (Plataforma de Contratación del Sector Público) vía etl/sources/.
  - Datos consolidados en `dashboard/services/contratacion_core.py` si existe.

Endpoints:
  GET /api/contratacion/kpis                → KPIs agregados (volumen, top entidades, sectores)
  GET /api/contratacion/licitaciones        → licitaciones abiertas
  GET /api/contratacion/adjudicaciones      → adjudicaciones recientes
  GET /api/contratacion/por-sector          → distribución por sector
  GET /api/contratacion/por-organo          → top órganos contratantes
  GET /api/contratacion/serie-mensual       → serie temporal volumen mensual
  GET /api/contratacion/tribunales          → resoluciones TACRC + jurisprudencia
  GET /api/contratacion/empresa/{cif}       → contratos por empresa
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/contratacion", tags=["contratacion"])


def _safe_call(fn, *args, **kwargs):
    try:
        result = fn(*args, **kwargs)
        if hasattr(result, "to_dict"):
            return result.to_dict(orient="records")
        return result
    except Exception as e:
        logger.warning("contratacion._safe_call(%s) failed: %s", fn.__name__, e)
        return None


def _try_import_contratacion_core():
    """Intenta importar el core; si no existe, devuelve None."""
    try:
        from dashboard.services import contratacion_core  # type: ignore
        return contratacion_core
    except ImportError:
        return None


def _try_import_placsp():
    """Intenta importar el connector PLACSP del ETL."""
    try:
        from etl.sources.opendata import datos_gob_connector  # type: ignore
        return datos_gob_connector
    except ImportError:
        return None


@router.get("/kpis")
def kpis():
    """KPIs agregados: volumen total, top entidades, top sectores."""
    core = _try_import_contratacion_core()
    if core and hasattr(core, "cargar_kpis_contratacion"):
        result = _safe_call(core.cargar_kpis_contratacion)
        if result is not None:
            return result if isinstance(result, dict) else {"items": result}

    # Fallback honesto: estructura vacía con warning.
    return {
        "items": [],
        "warning": "contratacion_core_not_available",
        "note": "Adjunta dashboard/services/contratacion_core.py con cargar_kpis_contratacion()",
    }


@router.get("/licitaciones")
def licitaciones(
    estado: str = Query("abierta", description="abierta|cerrada|adjudicada"),
    limit: int = Query(50, le=500),
    organo: Optional[str] = None,
    sector: Optional[str] = None,
):
    """Licitaciones recientes (PLACSP)."""
    core = _try_import_contratacion_core()
    if core and hasattr(core, "cargar_licitaciones"):
        rows = _safe_call(core.cargar_licitaciones, estado=estado, limit=limit, organo=organo, sector=sector) or []
        return {"items": rows, "total": len(rows), "filters": {"estado": estado, "organo": organo, "sector": sector}}

    # Intento secundario: vía datos.gob.es (CKAN)
    ckan = _try_import_placsp()
    if ckan and hasattr(ckan, "buscar_datasets"):
        rows = _safe_call(ckan.buscar_datasets, query="licitaciones", limit=limit) or []
        return {"items": rows, "total": len(rows), "source_hint": "datos.gob.es"}

    return {"items": [], "warning": "contratacion_core_not_available"}


@router.get("/adjudicaciones")
def adjudicaciones(
    limit: int = Query(50, le=500),
    sector: Optional[str] = None,
    organo: Optional[str] = None,
    importe_min: Optional[float] = None,
    days: int = Query(30, le=365),
):
    """Adjudicaciones de los últimos N días."""
    core = _try_import_contratacion_core()
    if core and hasattr(core, "cargar_adjudicaciones"):
        rows = _safe_call(
            core.cargar_adjudicaciones, limit=limit, sector=sector,
            organo=organo, importe_min=importe_min, days=days,
        ) or []
        return {"items": rows, "total": len(rows), "days": days}
    return {"items": [], "warning": "contratacion_core_not_available", "days": days}


@router.get("/por-sector")
def por_sector(days: int = Query(90, le=365)):
    """Distribución de adjudicaciones por sector económico."""
    core = _try_import_contratacion_core()
    if core and hasattr(core, "cargar_distribucion_sector"):
        rows = _safe_call(core.cargar_distribucion_sector, days=days) or []
        return {"items": rows, "total": len(rows), "days": days}
    return {"items": [], "warning": "contratacion_core_not_available"}


@router.get("/por-organo")
def por_organo(days: int = Query(90, le=365), limit: int = Query(20, le=200)):
    """Top órganos contratantes por volumen."""
    core = _try_import_contratacion_core()
    if core and hasattr(core, "cargar_top_organos"):
        rows = _safe_call(core.cargar_top_organos, days=days, limit=limit) or []
        return {"items": rows, "total": len(rows), "days": days}
    return {"items": [], "warning": "contratacion_core_not_available"}


@router.get("/serie-mensual")
def serie_mensual(months: int = Query(12, le=60)):
    """Volumen mensual de adjudicaciones (serie temporal)."""
    core = _try_import_contratacion_core()
    if core and hasattr(core, "cargar_serie_mensual"):
        rows = _safe_call(core.cargar_serie_mensual, months=months) or []
        return {"items": rows, "months": months}
    return {"items": [], "warning": "contratacion_core_not_available"}


@router.get("/tribunales")
def tribunales(limit: int = Query(50, le=500), tribunal: Optional[str] = None):
    """Resoluciones de Tribunales Administrativos (TACRC + autonómicos)."""
    core = _try_import_contratacion_core()
    if core and hasattr(core, "cargar_resoluciones_tribunales"):
        rows = _safe_call(core.cargar_resoluciones_tribunales, limit=limit, tribunal=tribunal) or []
        return {"items": rows, "total": len(rows)}
    return {"items": [], "warning": "tribunales_core_not_available"}


@router.get("/empresa/{cif}")
def empresa(cif: str, limit: int = Query(100, le=1000)):
    """Contratos de una empresa concreta (busca por CIF)."""
    core = _try_import_contratacion_core()
    if core and hasattr(core, "cargar_contratos_empresa"):
        rows = _safe_call(core.cargar_contratos_empresa, cif=cif, limit=limit) or []
        return {"items": rows, "total": len(rows), "cif": cif}
    return {"items": [], "warning": "contratacion_core_not_available", "cif": cif}
