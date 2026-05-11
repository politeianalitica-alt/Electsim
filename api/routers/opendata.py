"""
Router /api/opendata — expone `dashboard/services/opendata_core.py` y
`dashboard/services/simulation_core.py` como REST.

Endpoints:
  GET /api/opendata/portals       → portales (datos.gob.es, INE, BOE, …)
  GET /api/opendata/datasets      → datasets recientes
  GET /api/opendata/datasets/search → búsqueda
  GET /api/opendata/kpis          → KPIs portal/dataset/resources
  GET /api/opendata/ingestion-plans → planes ETL
  GET /api/simulation/scenarios   → escenarios disponibles
  GET /api/simulation/runs        → runs ejecutados
  GET /api/simulation/runs/{id}/results → resultados del run
  GET /api/simulation/kpis        → KPIs del módulo de simulación
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["opendata-simulation"])


def _safe_call(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        logger.warning("safe_call(%s) failed: %s", fn.__name__, e)
        return None


# ─── OpenData ────────────────────────────────────────────────────────────────


@router.get("/opendata/portals")
def opendata_portals(active_only: bool = True, administration_level: Optional[str] = None):
    try:
        from dashboard.services.opendata_core import cargar_portales_opendata
        rows = _safe_call(cargar_portales_opendata, active_only=active_only, administration_level=administration_level)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "opendata_core_not_importable"}


@router.get("/opendata/datasets")
def opendata_datasets(limit: int = Query(50, le=500), portal_id: Optional[str] = None):
    try:
        from dashboard.services.opendata_core import cargar_datasets_recientes
        rows = _safe_call(cargar_datasets_recientes, limit=limit, portal_id=portal_id)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "opendata_core_not_importable"}


@router.get("/opendata/datasets/search")
def opendata_datasets_search(q: str, limit: int = Query(50, le=500)):
    try:
        from dashboard.services.opendata_core import buscar_datasets
        rows = _safe_call(buscar_datasets, query=q, limit=limit)
        return {"items": rows or [], "query": q, "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "opendata_core_not_importable"}


@router.get("/opendata/kpis")
def opendata_kpis():
    try:
        from dashboard.services.opendata_core import cargar_kpis_opendata
        result = _safe_call(cargar_kpis_opendata)
        return result if isinstance(result, dict) else {"items": result or []}
    except ImportError:
        return {"warning": "opendata_core_not_importable"}


@router.get("/opendata/ingestion-plans")
def opendata_ingestion_plans(limit: int = Query(50, le=500)):
    try:
        from dashboard.services.opendata_core import cargar_ingestion_plans
        rows = _safe_call(cargar_ingestion_plans, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "opendata_core_not_importable"}


# ─── Simulation ──────────────────────────────────────────────────────────────


@router.get("/simulation/scenarios")
def simulation_scenarios(limit: int = Query(50, le=500), category: Optional[str] = None):
    try:
        from dashboard.services.simulation_core import cargar_escenarios
        rows = _safe_call(cargar_escenarios, limit=limit, category=category)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "simulation_core_not_importable"}


@router.get("/simulation/scenarios/{scenario_id}")
def simulation_scenario(scenario_id: str):
    try:
        from dashboard.services.simulation_core import cargar_escenario
        result = _safe_call(cargar_escenario, scenario_id=scenario_id)
        if result is None:
            return {"error": "scenario_not_found", "scenario_id": scenario_id}
        return result
    except ImportError:
        return {"warning": "simulation_core_not_importable"}


@router.get("/simulation/runs")
def simulation_runs(limit: int = Query(50, le=500), scenario_id: Optional[str] = None):
    try:
        from dashboard.services.simulation_core import cargar_runs
        rows = _safe_call(cargar_runs, limit=limit, scenario_id=scenario_id)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "simulation_core_not_importable"}


@router.get("/simulation/runs/{run_id}/results")
def simulation_results(run_id: str):
    try:
        from dashboard.services.simulation_core import cargar_resultados_run
        rows = _safe_call(cargar_resultados_run, run_id=run_id)
        return {"items": rows or [], "run_id": run_id}
    except ImportError:
        return {"items": [], "warning": "simulation_core_not_importable"}


@router.get("/simulation/runs/{run_id}/explain")
def simulation_explain(run_id: str):
    try:
        from dashboard.services.simulation_core import explicar_run
        result = _safe_call(explicar_run, run_id=run_id)
        return result if isinstance(result, dict) else {"items": result or []}
    except ImportError:
        return {"warning": "simulation_core_not_importable"}


@router.get("/simulation/kpis")
def simulation_kpis():
    try:
        from dashboard.services.simulation_core import cargar_kpis_simulacion
        result = _safe_call(cargar_kpis_simulacion)
        return result if isinstance(result, dict) else {"items": result or []}
    except ImportError:
        return {"warning": "simulation_core_not_importable"}


@router.get("/simulation/stress-templates")
def simulation_stress_templates():
    try:
        from dashboard.services.simulation_core import cargar_stress_templates
        rows = _safe_call(cargar_stress_templates)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "simulation_core_not_importable"}
