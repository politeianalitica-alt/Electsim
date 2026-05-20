"""Brain tools Commodities (Vesper-style) · Sprint 14 · S14.6.

Expone:
  - Catálogo 40+ commodities (grains, oils, dairy, softs, meat, energy, metals, freight)
  - Precios spot + OHLC + indicadores técnicos via Yahoo Finance
  - Recipe cost calculator + análisis de sensibilidad
  - Persistencia recetas + snapshots histórico
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# Catálogo
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("commodity_catalog")
def commodity_catalog(category: str | None = None) -> dict[str, Any]:
    """Lista catálogo de commodities (40+).

    Args:
      category: 'grains', 'oils', 'dairy', 'softs', 'meat', 'energy',
                'metals', 'freight'. None = todas.
    """
    try:
        from etl.sources.commodities.catalog import list_commodities, CATEGORIES
        if category and category not in CATEGORIES:
            return {
                "n_items": 0, "items": [],
                "error": f"categoría '{category}' no válida · usa {list(CATEGORIES)}",
            }
        items = list_commodities(category)
        return {"category": category, "n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("commodity_metadata")
def commodity_metadata(slug: str) -> dict[str, Any]:
    """Metadata de un commodity por slug."""
    try:
        from etl.sources.commodities.catalog import get_commodity
        c = get_commodity(slug)
        if c is None:
            return {"error": f"commodity '{slug}' no encontrada", "slug": slug}
        return {**c, "error": None}
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


# ────────────────────────────────────────────────────────────────────
# Precios
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("commodity_price")
def commodity_price(slug: str, range: str = "1mo", interval: str = "1d") -> dict[str, Any]:
    """Precio actual + serie OHLC para un commodity.

    Args:
      slug: commodity slug del catálogo.
      range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max.
      interval: 1d, 1wk, 1mo.
    """
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client
        c = get_commodity(slug)
        if c is None:
            return {"error": f"commodity '{slug}' no encontrada", "slug": slug}
        ticker = c.get("yahoo_ticker")
        if not ticker:
            return {
                "slug": slug, "name": c.get("name"),
                "error": "sin ticker Yahoo Finance · usa IMF / fuente alternativa",
            }
        client = get_yahoo_client()
        data = client.chart(ticker, range=range, interval=interval)
        return {
            "slug": slug,
            "name": c.get("name"),
            "unit": c.get("unit"),
            "exchange": c.get("exchange"),
            **data,
        }
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("commodity_snapshot")
def commodity_snapshot(slug: str) -> dict[str, Any]:
    """Snapshot rápido · solo último precio + variación (5d de contexto)."""
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client
        c = get_commodity(slug)
        if c is None:
            return {"error": f"commodity '{slug}' no encontrada", "slug": slug}
        ticker = c.get("yahoo_ticker")
        if not ticker:
            return {"slug": slug, "error": "sin ticker Yahoo"}
        snap = get_yahoo_client().quote_snapshot(ticker)
        return {
            "slug": slug,
            "name": c.get("name"),
            "unit": c.get("unit"),
            **snap,
        }
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("commodity_technical")
def commodity_technical(slug: str, range: str = "1y", interval: str = "1d") -> dict[str, Any]:
    """Indicadores técnicos (SMA, RSI, MACD) para un commodity."""
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client, technical_indicators
        c = get_commodity(slug)
        if c is None:
            return {"error": f"commodity '{slug}' no encontrada", "slug": slug}
        ticker = c.get("yahoo_ticker")
        if not ticker:
            return {"slug": slug, "error": "sin ticker Yahoo"}
        data = get_yahoo_client().chart(ticker, range=range, interval=interval)
        if data.get("error"):
            return {"slug": slug, "error": data["error"]}
        closes = [pt["close"] for pt in data.get("ohlc", []) if pt.get("close") is not None]
        ind = technical_indicators(closes)
        # Señal sencilla basada en RSI + MACD
        signal = _derive_signal(ind, data.get("last_price"))
        return {
            "slug": slug,
            "name": c.get("name"),
            "last_price": data.get("last_price"),
            "indicators": ind,
            "signal": signal,
            "error": None,
        }
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


def _derive_signal(ind: dict[str, Any], last_price: float | None) -> str:
    """Señal cualitativa (RSI + MACD + SMA50)."""
    if last_price is None:
        return "neutro"
    rsi = ind.get("rsi14")
    macd_hist = ind.get("macd_histogram")
    sma50 = ind.get("sma50")
    score = 0
    if rsi is not None:
        if rsi >= 70:
            score -= 2  # sobrecomprado
        elif rsi <= 30:
            score += 2  # sobrevendido
        elif rsi >= 55:
            score -= 1
        elif rsi <= 45:
            score += 1
    if macd_hist is not None:
        if macd_hist > 0:
            score += 1
        elif macd_hist < 0:
            score -= 1
    if sma50 is not None:
        score += 1 if last_price > sma50 else -1
    if score >= 3:
        return "compra_fuerte"
    if score >= 1:
        return "compra"
    if score <= -3:
        return "venta_fuerte"
    if score <= -1:
        return "venta"
    return "neutro"


# ────────────────────────────────────────────────────────────────────
# Recipe Cost (Vesper)
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("commodity_recipe_cost")
def commodity_recipe_cost(
    ingredients: list[dict[str, Any]] | None = None,
    recipe_slug: str | None = None,
    prices: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Calcula coste de una receta de commodities.

    Acepta dos modos:
      1) ingredients directos · lista [{slug, name, quantity, unit}]
      2) recipe_slug · resuelve la receta del catálogo + seed

    prices opcional · si no se pasan, se intentan fetch live via Yahoo.

    Returns:
      {total_cost, currency, breakdown:[{slug, line_cost, pct_of_total}],
       missing_prices, error}
    """
    try:
        from etl.sources.commodities.recipe import compute_recipe_cost
        if not ingredients and recipe_slug:
            from etl.sources.commodities.service import get_recipe
            recipe = get_recipe(recipe_slug)
            if recipe is None:
                return {
                    "total_cost": 0.0, "breakdown": [],
                    "error": f"receta '{recipe_slug}' no encontrada",
                }
            ingredients = recipe.get("ingredients") or []
        return compute_recipe_cost(ingredients or [], prices)
    except Exception as exc:
        return {"total_cost": 0.0, "breakdown": [], "error": str(exc)}


@ToolRegistry.register("commodity_recipe_sensitivity")
def commodity_recipe_sensitivity(
    ingredients: list[dict[str, Any]],
    prices: dict[str, float],
    shock_pct: float = 10.0,
) -> dict[str, Any]:
    """Análisis tornado · impacto de shock ±X% por commodity en coste total."""
    try:
        from etl.sources.commodities.recipe import sensitivity_analysis
        return sensitivity_analysis(ingredients, prices, shock_pct=shock_pct)
    except Exception as exc:
        return {"base_cost": 0.0, "shocks": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# Persistencia recetas
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("commodity_recipe")
def commodity_recipe(slug: str) -> dict[str, Any]:
    """Detalle de una receta guardada en BD.

    Slugs seed: pan_blanco_industrial, galleta_maria_industrial,
    chocolate_negro_70, pienso_vacuno, cerveza_lager_hl, yogur_natural_industrial.
    """
    try:
        from etl.sources.commodities.service import get_recipe
        r = get_recipe(slug)
        if r is None:
            return {"error": f"receta '{slug}' no encontrada", "slug": slug}
        r["error"] = None
        return r
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("list_commodity_recipes")
def list_commodity_recipes(sector: str | None = None, limit: int = 50) -> dict[str, Any]:
    """Lista recetas guardadas."""
    try:
        from etl.sources.commodities.service import list_recipes
        rows = list_recipes(sector=sector, limit=limit)
        return {"n_items": len(rows), "items": rows, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


__all__ = [
    "commodity_catalog",
    "commodity_metadata",
    "commodity_price",
    "commodity_snapshot",
    "commodity_technical",
    "commodity_recipe_cost",
    "commodity_recipe_sensitivity",
    "commodity_recipe",
    "list_commodity_recipes",
]
