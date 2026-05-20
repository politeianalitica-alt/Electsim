"""Router /api/v1/commodities — módulo Vesper-style para Visual Oscar.

Expone las Brain tools de Sprint 14 como REST consumible desde la SPA
Next.js `apps/visual-oscar/app/commodities/*`.

Endpoints:
  GET  /api/v1/commodities/catalog                  → catálogo 40+
  GET  /api/v1/commodities/{slug}                   → metadata + snapshot
  GET  /api/v1/commodities/{slug}/price             → OHLC + indicadores
  GET  /api/v1/commodities/{slug}/technical         → indicadores + signal
  GET  /api/v1/commodities/{slug}/forecast          → predicción simple
  POST /api/v1/commodities/recipe-cost              → calcula coste receta
  POST /api/v1/commodities/recipe-sensitivity       → análisis tornado
  GET  /api/v1/commodities/recipes                  → recetas guardadas
  GET  /api/v1/commodities/recipes/{slug}           → receta individual
  GET  /api/v1/commodities/snapshot-all             → snapshot dashboard

Schemas tipados 1:1 con `apps/visual-oscar/types/commodities.ts`.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/commodities", tags=["commodities"])


# ─────────────────────────────────────────────────────────────────
# Schemas request
# ─────────────────────────────────────────────────────────────────

class RecipeIngredientIn(BaseModel):
    slug: str
    name: str | None = None
    quantity: float
    unit: str | None = None


class RecipeCostRequest(BaseModel):
    ingredients: list[RecipeIngredientIn] = Field(default_factory=list)
    prices: dict[str, float] | None = None
    recipe_slug: str | None = None


class RecipeSensitivityRequest(BaseModel):
    ingredients: list[RecipeIngredientIn]
    prices: dict[str, float]
    shock_pct: float = 10.0


# ─────────────────────────────────────────────────────────────────
# Catálogo & metadata
# ─────────────────────────────────────────────────────────────────

@router.get("/catalog")
def get_catalog(category: str | None = Query(None)) -> dict[str, Any]:
    """Catálogo de commodities · filtrable por categoría."""
    try:
        from etl.sources.commodities.catalog import list_commodities, CATEGORIES
        if category and category not in CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail=f"categoría inválida · usa {list(CATEGORIES)}",
            )
        items = list_commodities(category)
        return {"category": category, "n_items": len(items), "items": items}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("catalog falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/snapshot-all")
def snapshot_all(category: str | None = Query(None), limit: int = Query(40, ge=1, le=100)) -> dict[str, Any]:
    """Snapshot live de TODOS los commodities · pintado del dashboard.

    Llama Yahoo Finance una vez por ticker · cache 30 min en Next.js (ISR).
    """
    try:
        from etl.sources.commodities.catalog import list_commodities
        from etl.sources.commodities.prices import get_yahoo_client
        items = list_commodities(category)[:limit]
        client = get_yahoo_client()
        snapshots = []
        for c in items:
            ticker = c.get("yahoo_ticker")
            if not ticker:
                snapshots.append({
                    **c,
                    "last_price": None,
                    "change_pct": None,
                    "available": False,
                })
                continue
            snap = client.quote_snapshot(ticker)
            snapshots.append({
                **c,
                "last_price": snap.get("last_price"),
                "change_pct": snap.get("change_pct"),
                "currency": snap.get("currency"),
                "as_of": snap.get("as_of"),
                "available": snap.get("error") is None and snap.get("last_price") is not None,
            })
        return {
            "n_items": len(snapshots),
            "items": snapshots,
            "fetched_at": _now_iso(),
        }
    except Exception as exc:
        logger.exception("snapshot_all falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# Individual commodity
# ─────────────────────────────────────────────────────────────────

@router.get("/{slug}")
def commodity_overview(slug: str) -> dict[str, Any]:
    """Metadata + snapshot último precio."""
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client
        c = get_commodity(slug)
        if c is None:
            raise HTTPException(status_code=404, detail=f"commodity '{slug}' no encontrada")
        ticker = c.get("yahoo_ticker")
        snap = {}
        if ticker:
            snap = get_yahoo_client().quote_snapshot(ticker) or {}
        return {**c, "snapshot": snap}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("commodity_overview falló · %s", slug)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{slug}/price")
def commodity_price(
    slug: str,
    range: str = Query("1mo"),
    interval: str = Query("1d"),
) -> dict[str, Any]:
    """OHLC + último precio."""
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client
        c = get_commodity(slug)
        if c is None:
            raise HTTPException(status_code=404, detail=f"commodity '{slug}' no encontrada")
        ticker = c.get("yahoo_ticker")
        if not ticker:
            return {"slug": slug, "name": c["name"], "ohlc": [], "available": False}
        data = get_yahoo_client().chart(ticker, range=range, interval=interval)
        return {**c, **data}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("commodity_price falló · %s", slug)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{slug}/technical")
def commodity_technical_endpoint(slug: str, range: str = Query("1y")) -> dict[str, Any]:
    """Indicadores técnicos + señal cualitativa."""
    try:
        from agents.tools import ToolRegistry
        import agents.tools.commodities_tools  # noqa: F401
        fn = ToolRegistry.get("commodity_technical")
        result = fn(slug=slug, range=range)
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("commodity_technical falló · %s", slug)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{slug}/forecast")
def commodity_forecast(
    slug: str,
    horizon: int = Query(30, ge=7, le=180),
) -> dict[str, Any]:
    """Forecast simple (último valor + drift histórico).

    NOTA: implementación stub · sustituir por Prophet/NHITS microservicio
    cuando esté disponible. Útil para mostrar UI de forecasting.
    """
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client
        c = get_commodity(slug)
        if c is None:
            raise HTTPException(status_code=404, detail=f"commodity '{slug}' no encontrada")
        ticker = c.get("yahoo_ticker")
        if not ticker:
            return {"slug": slug, "available": False, "forecast": []}
        data = get_yahoo_client().chart(ticker, range="1y", interval="1d")
        ohlc = data.get("ohlc") or []
        if len(ohlc) < 30:
            return {
                "slug": slug, "horizon": horizon, "forecast": [],
                "error": "histórico insuficiente",
            }
        closes = [p["close"] for p in ohlc if p.get("close") is not None]
        forecast = _simple_drift_forecast(closes, horizon)
        last_date = ohlc[-1]["date"]
        return {
            "slug": slug,
            "name": c.get("name"),
            "last_price": closes[-1],
            "last_date": last_date,
            "horizon": horizon,
            "model": "drift_naive_v1",
            "accuracy_disclaimer": (
                "Stub · sustituir por Prophet/NHITS microservicio para precisión real"
            ),
            "forecast": forecast,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("commodity_forecast falló · %s", slug)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# Recipe Cost
# ─────────────────────────────────────────────────────────────────

@router.post("/recipe-cost")
def recipe_cost_endpoint(req: RecipeCostRequest) -> dict[str, Any]:
    """Calcula coste de receta · acepta ingredientes directos o slug."""
    try:
        from agents.tools import ToolRegistry
        import agents.tools.commodities_tools  # noqa: F401
        fn = ToolRegistry.get("commodity_recipe_cost")
        ingredients = [i.model_dump() for i in req.ingredients] if req.ingredients else None
        return fn(
            ingredients=ingredients,
            recipe_slug=req.recipe_slug,
            prices=req.prices,
        )
    except Exception as exc:
        logger.exception("recipe_cost falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/recipe-sensitivity")
def recipe_sensitivity_endpoint(req: RecipeSensitivityRequest) -> dict[str, Any]:
    """Análisis tornado · impacto shock ±X% por commodity."""
    try:
        from agents.tools import ToolRegistry
        import agents.tools.commodities_tools  # noqa: F401
        fn = ToolRegistry.get("commodity_recipe_sensitivity")
        return fn(
            ingredients=[i.model_dump() for i in req.ingredients],
            prices=req.prices,
            shock_pct=req.shock_pct,
        )
    except Exception as exc:
        logger.exception("recipe_sensitivity falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/recipes/{slug}")
def get_recipe_endpoint(slug: str) -> dict[str, Any]:
    """Detalle de receta guardada."""
    try:
        from etl.sources.commodities.service import get_recipe
        r = get_recipe(slug)
        if r is None:
            # Fallback al seed JSON si no hay BD
            r = _load_recipe_from_seed(slug)
        if r is None:
            raise HTTPException(status_code=404, detail=f"receta '{slug}' no encontrada")
        return r
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("get_recipe falló · %s", slug)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/recipes")
def list_recipes_endpoint(sector: str | None = Query(None)) -> dict[str, Any]:
    """Lista recetas (BD + fallback seed)."""
    try:
        from etl.sources.commodities.service import list_recipes
        rows = list_recipes(sector=sector)
        if not rows:
            rows = _list_recipes_from_seed(sector)
        return {"n_items": len(rows), "items": rows}
    except Exception as exc:
        logger.exception("list_recipes falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _simple_drift_forecast(closes: list[float], horizon: int) -> list[dict[str, Any]]:
    """Forecast naive con drift + intervalos basados en stdev histórica.

    Modelo: y_t = y_{t-1} + drift, intervalo ±1.96·sigma·sqrt(t).
    Útil como placeholder hasta tener Prophet/NHITS.
    """
    from datetime import date, timedelta
    import math
    if len(closes) < 10:
        return []
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    drift = sum(deltas) / len(deltas)
    mean = sum(deltas) / len(deltas)
    var = sum((d - mean) ** 2 for d in deltas) / max(1, len(deltas) - 1)
    sigma = math.sqrt(var)
    last_value = closes[-1]
    today = date.today()
    out = []
    for t in range(1, horizon + 1):
        forecast_value = last_value + drift * t
        spread_80 = 1.28 * sigma * math.sqrt(t)
        spread_95 = 1.96 * sigma * math.sqrt(t)
        out.append({
            "date": (today + timedelta(days=t)).isoformat(),
            "value": round(forecast_value, 4),
            "lower_80": round(forecast_value - spread_80, 4),
            "upper_80": round(forecast_value + spread_80, 4),
            "lower_95": round(forecast_value - spread_95, 4),
            "upper_95": round(forecast_value + spread_95, 4),
        })
    return out


_SEED_RECIPES_CACHE: list[dict[str, Any]] | None = None


def _load_seed_recipes() -> list[dict[str, Any]]:
    global _SEED_RECIPES_CACHE
    if _SEED_RECIPES_CACHE is not None:
        return _SEED_RECIPES_CACHE
    try:
        import json
        from pathlib import Path
        p = Path(__file__).parent.parent.parent / "data" / "commodities" / "recipes_seed.json"
        if not p.exists():
            _SEED_RECIPES_CACHE = []
            return []
        _SEED_RECIPES_CACHE = json.loads(p.read_text(encoding="utf-8"))
        return _SEED_RECIPES_CACHE
    except Exception:
        _SEED_RECIPES_CACHE = []
        return []


def _load_recipe_from_seed(slug: str) -> dict[str, Any] | None:
    for r in _load_seed_recipes():
        if r.get("slug") == slug.lower():
            return r
    return None


def _list_recipes_from_seed(sector: str | None) -> list[dict[str, Any]]:
    rows = _load_seed_recipes()
    if sector:
        rows = [r for r in rows if r.get("sector") == sector.lower()]
    return [
        {
            "slug": r["slug"],
            "name": r["name"],
            "sector": r.get("sector"),
            "currency": r.get("currency", "EUR"),
            "notes": r.get("notes"),
        }
        for r in rows
    ]
