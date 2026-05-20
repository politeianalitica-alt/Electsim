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
    model: str = Query("auto", description="prophet | auto_arima | naive_drift | auto"),
) -> dict[str, Any]:
    """Forecast del commodity · usa µservicio Prophet/AutoARIMA si configurado.

    Si `FORECAST_SERVICE_URL` está definido, llama al microservicio Politeia
    Forecast con Prophet (o AutoARIMA si Prophet no está disponible).

    Si el µservicio no responde, cae al algoritmo naive_drift local · la SPA
    siempre obtiene un forecast con la misma estructura.
    """
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client
        from etl.sources.commodities.forecast_client import forecast as call_forecast
        from datetime import date as _date

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
        last_date_str = ohlc[-1]["date"]
        try:
            start = _date.fromisoformat(last_date_str)
        except Exception:
            start = _date.today()

        fc_result = call_forecast(
            closes,
            horizon=horizon,
            model=model,  # type: ignore[arg-type]
            start_date=start,
        )

        return {
            "slug": slug,
            "name": c.get("name"),
            "last_price": closes[-1],
            "last_date": last_date_str,
            "horizon": horizon,
            "model": fc_result.get("model", "naive_drift"),
            "model_source": fc_result.get("source", "local_fallback"),
            "accuracy_mape_30d": fc_result.get("accuracy_mape_30d"),
            "accuracy_dir_pct": fc_result.get("accuracy_dir_pct"),
            "warning": fc_result.get("warning"),
            "forecast": fc_result.get("forecast", []),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("commodity_forecast falló · %s", slug)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/forecast/health")
def forecast_health() -> dict[str, Any]:
    """Diagnóstico del µservicio forecast · muestra qué modelos están listos."""
    try:
        from etl.sources.commodities.forecast_client import health
        return health()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# Commodity alerts · CRUD + evaluador (Sprint cron)
# ─────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=120)
    commodity_slug: str = Field(..., min_length=1, max_length=80)
    kind: str = Field(..., description="price_above | price_below | change_pct")
    threshold: float
    period_days: int | None = None
    channels: list[str] = Field(default_factory=lambda: ["inapp"])
    cooldown_minutes: int = 60
    active: bool = True
    metadata: dict[str, Any] | None = None


class AlertPatch(BaseModel):
    active: bool | None = None
    threshold: float | None = None
    channels: list[str] | None = None
    cooldown_minutes: int | None = None
    period_days: int | None = None
    metadata_payload: dict[str, Any] | None = None


@router.get("/alerts")
def list_alerts_endpoint(
    user_id: str | None = Query(None),
    active_only: bool = Query(False),
) -> dict[str, Any]:
    """Lista alertas (opcionalmente filtradas por user_id)."""
    try:
        from etl.sources.commodities.alerts_service import list_alerts
        items = list_alerts(user_id=user_id, active_only=active_only)
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        logger.exception("list_alerts falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/alerts")
def create_alert_endpoint(req: AlertCreate) -> dict[str, Any]:
    """Crea una nueva alerta."""
    try:
        from etl.sources.commodities.alerts_service import create_alert
        res = create_alert(
            user_id=req.user_id,
            commodity_slug=req.commodity_slug,
            kind=req.kind,  # type: ignore[arg-type]
            threshold=req.threshold,
            channels=req.channels,  # type: ignore[arg-type]
            period_days=req.period_days,
            cooldown_minutes=req.cooldown_minutes,
            active=req.active,
            metadata=req.metadata,
        )
        if res.get("error"):
            raise HTTPException(status_code=400, detail=res["error"])
        return res
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("create_alert falló")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/alerts/{alert_id}")
def get_alert_endpoint(alert_id: str) -> dict[str, Any]:
    try:
        from etl.sources.commodities.alerts_service import get_alert
        row = get_alert(alert_id)
        if row is None:
            raise HTTPException(status_code=404, detail="alerta no encontrada")
        return row
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/alerts/{alert_id}")
def patch_alert_endpoint(alert_id: str, req: AlertPatch) -> dict[str, Any]:
    try:
        from etl.sources.commodities.alerts_service import update_alert
        patch = {k: v for k, v in req.model_dump().items() if v is not None}
        row = update_alert(alert_id, **patch)
        if row is None:
            raise HTTPException(status_code=404, detail="alerta no encontrada")
        return row
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/alerts/{alert_id}")
def delete_alert_endpoint(alert_id: str) -> dict[str, Any]:
    try:
        from etl.sources.commodities.alerts_service import delete_alert
        ok = delete_alert(alert_id)
        if not ok:
            raise HTTPException(status_code=404, detail="alerta no encontrada")
        return {"deleted": True, "id": alert_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/alerts-events/list")
def list_alert_events_endpoint(
    user_id: str | None = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    """Histórico de disparos · feed in-app de notificaciones."""
    try:
        from etl.sources.commodities.alerts_service import list_events
        items = list_events(user_id=user_id, unread_only=unread_only, limit=limit)
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/alerts-events/{event_id}/read")
def mark_event_read_endpoint(event_id: int) -> dict[str, Any]:
    try:
        from etl.sources.commodities.alerts_service import mark_event_read
        return {"ok": mark_event_read(event_id), "event_id": event_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/alerts/evaluate")
def evaluate_alerts_endpoint(dry_run: bool = Query(False)) -> dict[str, Any]:
    """Trigger manual del evaluador · útil para debug o cron externo.

    En producción, llamar este endpoint desde un cron periódico (cada 15-30 min)
    o usar el script `python -m etl.workers.commodity_alerts_worker`.
    """
    try:
        from etl.sources.commodities.alerts_service import evaluate_all
        return evaluate_all(dry_run=dry_run)
    except Exception as exc:
        logger.exception("evaluate_alerts falló")
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
