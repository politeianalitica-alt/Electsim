"""
Router /api/economy + /api/macro — expone `dashboard/services/economy_core.py`
como REST. Antes esta lógica solo era accesible desde Streamlit.

Endpoints:
  GET /api/macro/kpis            → KPIs macro (IBEX, Bono10Y, IPC, paro, …)
  GET /api/macro/indicators      → últimos valores por indicador
  GET /api/macro/series          → series temporales de un indicador
  GET /api/macro/forecasts       → forecasts ETS/ARIMA (BdE + INE)
  GET /api/macro/signals         → señales económicas con impacto político
  GET /api/economy/itpe          → ITPE Económico (Indice de Tensión Política)
  GET /api/economy/sectorial-risk → riesgo sectorial agregado
  GET /api/economy/summary       → resumen consolidado para dashboard
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["economy"])


def _safe_call(fn_name: str, fn, *args, **kwargs):
    """Llama a una función del core y degrada graciosamente a {items: []}."""
    try:
        result = fn(*args, **kwargs)
        # Pandas DataFrame → lista de dicts
        if hasattr(result, "to_dict"):
            return result.to_dict(orient="records")
        return result
    except Exception as e:
        logger.warning("economy_core.%s failed: %s", fn_name, e)
        return None


# ─────────────────────────────────────────────────────────────────────────────
#  Macro
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/macro/kpis")
def macro_kpis(geography: str = "ES"):
    try:
        from dashboard.services.economy_core import cargar_kpis_economia
        data = _safe_call("cargar_kpis_economia", cargar_kpis_economia, geography=geography)
        if data is None:
            return {"items": [], "warning": "economy_core_unavailable"}
        return {"items": data if isinstance(data, list) else [data], "geography": geography}
    except ImportError:
        return {"items": [], "warning": "economy_core_not_importable"}


@router.get("/macro/indicators")
def macro_indicators(geography: str = "ES", limit: int = Query(50, le=200)):
    try:
        from dashboard.services.economy_core import cargar_indicadores_macro_recientes
        rows = _safe_call(
            "cargar_indicadores_macro_recientes",
            cargar_indicadores_macro_recientes,
            geography=geography,
            limit=limit,
        )
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "economy_core_not_importable"}


@router.get("/macro/series")
def macro_series(indicator: str, geography: str = "ES", days: int = Query(365, le=3650)):
    try:
        from dashboard.services.economy_core import cargar_series_macro
        rows = _safe_call(
            "cargar_series_macro",
            cargar_series_macro,
            indicator_code=indicator,
            geography=geography,
            days=days,
        )
        return {"items": rows or [], "indicator": indicator, "geography": geography, "days": days}
    except ImportError:
        return {"items": [], "warning": "economy_core_not_importable"}


@router.get("/macro/forecasts")
def macro_forecasts(geography: str = "ES"):
    try:
        from dashboard.services.economy_core import cargar_forecasts
        rows = _safe_call("cargar_forecasts", cargar_forecasts, geography=geography)
        return {"items": rows or []}
    except ImportError:
        return {"items": [], "warning": "economy_core_not_importable"}


@router.get("/macro/signals")
def macro_signals(min_relevance: float = Query(0.3, ge=0, le=1), limit: int = Query(20, le=200)):
    try:
        from dashboard.services.economy_core import cargar_economic_signals
        rows = _safe_call("cargar_economic_signals", cargar_economic_signals, min_relevance=min_relevance, limit=limit)
        return {"items": rows or [], "total": len(rows or [])}
    except ImportError:
        return {"items": [], "warning": "economy_core_not_importable"}


# ─────────────────────────────────────────────────────────────────────────────
#  Economy (consolidado)
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/economy/itpe")
def economy_itpe(geography: str = "ES"):
    try:
        from dashboard.services.economy_core import cargar_itpe_economico
        result = _safe_call("cargar_itpe_economico", cargar_itpe_economico, geography=geography)
        if result is None:
            return {"score": None, "warning": "economy_core_unavailable"}
        return result if isinstance(result, dict) else {"score": result}
    except ImportError:
        return {"score": None, "warning": "economy_core_not_importable"}


@router.get("/economy/sectorial-risk")
def economy_sectorial_risk():
    try:
        from dashboard.services.economy_core import cargar_sectorial_risk
        rows = _safe_call("cargar_sectorial_risk", cargar_sectorial_risk)
        return {"items": rows or []}
    except ImportError:
        return {"items": [], "warning": "economy_core_not_importable"}


@router.get("/economy/summary")
def economy_summary(geography: str = "ES"):
    try:
        from dashboard.services.economy_core import cargar_economic_summary
        return cargar_economic_summary(geography=geography)
    except ImportError:
        return {"error": "economy_core_not_importable"}
    except Exception as e:
        logger.warning("economy_summary failed: %s", e)
        return {"error": str(e)}
