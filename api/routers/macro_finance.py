"""
Router /api/macro-finance — read-only macro & finance dashboard.

Endpoints (10):
  GET  /api/macro-finance/panorama?country=ES        — KPIs con deltas
  GET  /api/macro-finance/markets?days=365           — yields, spreads, EURUSD
  GET  /api/macro-finance/bis-exposures?country=ES   — BIS LBS por contraparte
  GET  /api/macro-finance/dots?reporter=ES&months=60 — IMF DOTS bilateral
  GET  /api/macro-finance/cofer?days=2190            — IMF COFER reservas
  GET  /api/macro-finance/bop?years=10               — BdE Balanza de Pagos
  GET  /api/macro-finance/hicp?countries=ES,FR,IT,DE — Eurostat HICP
  GET  /api/macro-finance/labor?countries=ES,FR,...  — Eurostat empleo
  GET  /api/macro-finance/ntl                        — World Bank NTL proxy
  GET  /api/macro-finance/yields?countries=ES,DE     — ECB long-term yields
  GET  /api/macro-finance/sources                    — salud de fuentes
  POST /api/macro-finance/ingest?only=...            — trigger orchestrator
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/macro-finance", tags=["macro-finance"])


def _core():
    from dashboard.services import macro_finance_core
    return macro_finance_core


@router.get("/panorama")
def get_panorama(country: str = Query("ES", min_length=2, max_length=2)) -> dict:
    return _core().panorama(country=country.upper())


@router.get("/markets")
def get_markets(
    days: int = Query(365, ge=30, le=3650),
    country: str = Query("ES"),
) -> dict:
    return _core().markets_timeseries(days=days, country=country.upper())


@router.get("/bis-exposures")
def get_bis(country: str = Query("ES"), n_quarters: int = Query(12, ge=1, le=40)) -> dict:
    return _core().bis_exposures(country=country.upper(), n_quarters=n_quarters)


@router.get("/dots")
def get_dots(
    reporter: str = Query("ES"),
    months:   int = Query(60, ge=12, le=240),
) -> dict:
    return _core().dots_trade(reporter=reporter.upper(), months=months)


@router.get("/cofer")
def get_cofer(days: int = Query(2190, ge=365, le=9125)) -> dict:
    return _core().cofer_reserves(days=days)


@router.get("/bop")
def get_bop(years: int = Query(10, ge=1, le=30)) -> dict:
    return _core().bop_spain(years=years)


@router.get("/hicp")
def get_hicp(
    countries: str = Query("ES,FR,IT,DE,PT"),
    days:      int = Query(365 * 3, ge=90, le=3650),
) -> dict:
    cs = [c.strip().upper() for c in countries.split(",") if c.strip()]
    return _core().hicp(countries=cs, days=days)


@router.get("/labor")
def get_labor(
    countries: str = Query("ES,FR,IT,DE,PT"),
    days:      int = Query(365 * 3, ge=90, le=3650),
) -> dict:
    cs = [c.strip().upper() for c in countries.split(",") if c.strip()]
    return _core().labor(countries=cs, days=days)


@router.get("/ntl")
def get_ntl(countries: Optional[str] = Query(None)) -> dict:
    cs = [c.strip().upper() for c in countries.split(",") if c.strip()] if countries else None
    return _core().ntl(countries=cs)


@router.get("/yields")
def get_yields(
    countries: str = Query("ES,FR,IT,DE,PT"),
    days:      int = Query(730, ge=30, le=3650),
) -> dict:
    cs = [c.strip().upper() for c in countries.split(",") if c.strip()]
    return _core().debt_yields(countries=cs, days=days)


@router.get("/sources")
def get_sources_health() -> dict:
    return {"sources": _core().sources_health()}


@router.post("/ingest")
def post_ingest(only: str = Query("", description="csv of source ids; empty = all")) -> dict:
    try:
        from etl.macro_v2.orchestrator import run_all
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"orchestrator_unavailable:{exc}")
    sources = [s.strip() for s in only.split(",") if s.strip()] or None
    return run_all(only=sources)
