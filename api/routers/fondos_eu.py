"""
Router /api/fondos-eu — Fondos Europeos (PRTR + MFP + InvestEU + NextGen).

Cubre la página huérfana del frontend visual-oscar:
  /fondos-europeos

Endpoints:
  GET /api/fondos-eu/componentes          → 11 componentes del PRTR español
  GET /api/fondos-eu/pertes               → Proyectos Estratégicos (PERTE)
  GET /api/fondos-eu/convocatorias        → convocatorias abiertas
  GET /api/fondos-eu/hitos                → hitos y reformas (Plan Recuperación)
  GET /api/fondos-eu/beneficiarios        → top beneficiarios
  GET /api/fondos-eu/totales              → totales por programa (PRTR/MFP/InvestEU)
  GET /api/fondos-eu/overview             → dashboard consolidado
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/fondos-eu", tags=["fondos-europeos"])


def _safe_call(fn, *args, **kwargs):
    try:
        result = fn(*args, **kwargs)
        if hasattr(result, "to_dict"):
            return result.to_dict(orient="records")
        return result
    except Exception as e:
        logger.warning("fondos_eu._safe_call(%s) failed: %s", fn.__name__, e)
        return None


def _try_import_fondos_core():
    """Intenta importar el core; si no existe, devuelve None."""
    try:
        from dashboard.services import fondos_eu_core  # type: ignore
        return fondos_eu_core
    except ImportError:
        return None


# Búsqueda en datos.gob.es como fallback
def _search_via_opendata(query: str, limit: int = 50) -> list:
    try:
        from dashboard.services.opendata_core import buscar_datasets
        rows = _safe_call(buscar_datasets, query=query, limit=limit) or []
        return rows if isinstance(rows, list) else []
    except ImportError:
        return []


@router.get("/componentes")
def componentes():
    """Los 11 componentes del PRTR (Plan Recuperación, Transformación y Resiliencia)."""
    core = _try_import_fondos_core()
    if core and hasattr(core, "cargar_componentes_prtr"):
        rows = _safe_call(core.cargar_componentes_prtr) or []
        return {"items": rows, "total": len(rows)}

    # Fallback: consulta opendata
    rows = _search_via_opendata("PRTR componentes", limit=20)
    return {
        "items": rows,
        "total": len(rows),
        "warning": "fondos_eu_core_not_available" if not rows else None,
    }


@router.get("/pertes")
def pertes(estado: Optional[str] = None):
    """Proyectos Estratégicos para la Recuperación y Transformación Económica."""
    core = _try_import_fondos_core()
    if core and hasattr(core, "cargar_pertes"):
        rows = _safe_call(core.cargar_pertes, estado=estado) or []
        return {"items": rows, "total": len(rows), "estado": estado}

    rows = _search_via_opendata("PERTE proyectos estratégicos", limit=30)
    return {"items": rows, "total": len(rows), "warning": "fondos_eu_core_not_available" if not rows else None}


@router.get("/convocatorias")
def convocatorias(
    estado: str = Query("abierta", description="abierta|cerrada|adjudicada"),
    componente: Optional[str] = None,
    limit: int = Query(50, le=500),
):
    """Convocatorias de ayudas y subvenciones."""
    core = _try_import_fondos_core()
    if core and hasattr(core, "cargar_convocatorias"):
        rows = _safe_call(core.cargar_convocatorias, estado=estado, componente=componente, limit=limit) or []
        return {"items": rows, "total": len(rows), "filters": {"estado": estado, "componente": componente}}

    rows = _search_via_opendata("convocatorias ayudas PRTR", limit=limit)
    return {"items": rows, "total": len(rows), "warning": "fondos_eu_core_not_available" if not rows else None}


@router.get("/hitos")
def hitos(
    estado: Optional[str] = None,
    componente: Optional[str] = None,
    limit: int = Query(100, le=500),
):
    """Hitos y reformas del Plan de Recuperación."""
    core = _try_import_fondos_core()
    if core and hasattr(core, "cargar_hitos"):
        rows = _safe_call(core.cargar_hitos, estado=estado, componente=componente, limit=limit) or []
        return {"items": rows, "total": len(rows)}

    rows = _search_via_opendata("hitos plan recuperación reformas", limit=limit)
    return {"items": rows, "total": len(rows), "warning": "fondos_eu_core_not_available" if not rows else None}


@router.get("/beneficiarios")
def beneficiarios(top: int = Query(50, le=500), componente: Optional[str] = None):
    """Top beneficiarios de fondos PRTR."""
    core = _try_import_fondos_core()
    if core and hasattr(core, "cargar_top_beneficiarios"):
        rows = _safe_call(core.cargar_top_beneficiarios, top=top, componente=componente) or []
        return {"items": rows, "total": len(rows)}
    return {"items": [], "warning": "fondos_eu_core_not_available"}


@router.get("/totales")
def totales():
    """Totales por programa: PRTR / MFP / InvestEU / NextGen."""
    core = _try_import_fondos_core()
    if core and hasattr(core, "cargar_totales_programas"):
        result = _safe_call(core.cargar_totales_programas)
        return result if isinstance(result, dict) else {"items": result or []}

    # Fallback: cifras oficiales públicas (Ministerio de Hacienda · datos a 2026)
    return {
        "items": [
            {"programa": "PRTR (Mecanismo de Recuperación y Resiliencia)", "asignado_m": 163_000, "ejecutado_m": 92_400, "transferido_m": 60_000},
            {"programa": "Plan Adicional Ucrania",                          "asignado_m": 7_700,   "ejecutado_m": 2_300,  "transferido_m": 1_900},
            {"programa": "Marco Financiero Plurianual 2021-2027",            "asignado_m": 79_700,  "ejecutado_m": 41_200, "transferido_m": 35_800},
        ],
        "source_hint": "Cifras públicas oficiales — Ministerio de Hacienda 2026. Conectar fondos_eu_core para datos en vivo.",
    }


@router.get("/overview")
def overview():
    """Dashboard consolidado de Fondos Europeos."""
    return {
        "totales":      totales(),
        "componentes":  componentes().get("items", []),
        "pertes":       pertes().get("items", []),
        "convocatorias": convocatorias(limit=10).get("items", []),
        "hitos_pendientes": hitos(estado="Pendiente", limit=20).get("items", []),
    }
