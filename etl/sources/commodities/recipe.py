"""Recipe Cost Calculator · Sprint 14 · S14.4.

Inspirado en el módulo Recipe Cost de Vesper. Calcula el coste de un
producto compuesto por múltiples ingredientes (commodities) con sus
cantidades y precios actuales.

Esta capa no requiere BD · todo se pasa por parámetro. La persistencia
de recetas guardadas se gestiona desde el frontend / api.routers cuando
exista la migración correspondiente (a futuro).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def compute_recipe_cost(
    ingredients: list[dict[str, Any]],
    prices: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Calcula coste total de una receta.

    Args:
      ingredients: lista de ingredientes, cada uno con:
        {
          "slug": str,             # commodity slug (catalog.COMMODITIES)
          "name": str,             # nombre (opcional, fallback al catálogo)
          "quantity": float,       # cantidad en la unidad de medida del precio
          "unit": str,             # unidad legible (kg, ton, etc.)
        }
      prices: dict opcional {slug: price}. Si falta uno, se intenta fetch live.

    Returns:
      {
        "total_cost": float,
        "currency": "EUR" (homogeneizado · stub),
        "breakdown": [{slug, quantity, unit_price, line_cost, pct_of_total}],
        "missing_prices": [slug, ...],
        "error": str | None,
      }
    """
    if not ingredients:
        return {"total_cost": 0.0, "breakdown": [], "missing_prices": [], "error": "sin ingredientes"}

    if prices is None:
        prices = _fetch_live_prices([i["slug"] for i in ingredients])

    breakdown: list[dict[str, Any]] = []
    missing: list[str] = []
    total = 0.0

    for ing in ingredients:
        slug = ing.get("slug")
        qty = float(ing.get("quantity") or 0.0)
        if not slug:
            continue
        price = prices.get(slug)
        if price is None:
            missing.append(slug)
            breakdown.append({
                "slug": slug,
                "name": ing.get("name") or slug,
                "quantity": qty,
                "unit": ing.get("unit"),
                "unit_price": None,
                "line_cost": None,
            })
            continue
        line_cost = round(qty * float(price), 4)
        total += line_cost
        breakdown.append({
            "slug": slug,
            "name": ing.get("name") or slug,
            "quantity": qty,
            "unit": ing.get("unit"),
            "unit_price": float(price),
            "line_cost": line_cost,
        })

    # % del total para cada línea
    for line in breakdown:
        lc = line.get("line_cost")
        line["pct_of_total"] = (
            round(lc / total * 100, 2) if lc is not None and total > 0 else None
        )

    return {
        "total_cost": round(total, 4),
        "n_ingredients": len(breakdown),
        "breakdown": breakdown,
        "missing_prices": missing,
        "error": None if not missing else f"{len(missing)} ingrediente(s) sin precio",
    }


def sensitivity_analysis(
    ingredients: list[dict[str, Any]],
    prices: dict[str, float],
    *,
    shock_pct: float = 10.0,
) -> dict[str, Any]:
    """Análisis tornado · impacto en coste total si cada commodity sube X%.

    Args:
      shock_pct: shock simétrico (10 = ±10%).
    """
    base = compute_recipe_cost(ingredients, prices)
    base_total = base["total_cost"]
    if base_total <= 0:
        return {"base_cost": 0.0, "shocks": [], "error": "coste base 0"}

    shocks = []
    for ing in ingredients:
        slug = ing.get("slug")
        if not slug or slug not in prices:
            continue
        original = prices[slug]
        prices_up = {**prices, slug: original * (1 + shock_pct / 100)}
        prices_dn = {**prices, slug: original * (1 - shock_pct / 100)}
        up = compute_recipe_cost(ingredients, prices_up)["total_cost"]
        dn = compute_recipe_cost(ingredients, prices_dn)["total_cost"]
        impact_up_pct = round((up - base_total) / base_total * 100, 2)
        impact_dn_pct = round((dn - base_total) / base_total * 100, 2)
        shocks.append({
            "slug": slug,
            "base_unit_price": float(original),
            "impact_up_pct": impact_up_pct,
            "impact_down_pct": impact_dn_pct,
            "range_pct": round(abs(impact_up_pct) + abs(impact_dn_pct), 2),
        })
    shocks.sort(key=lambda s: s["range_pct"], reverse=True)
    return {
        "base_cost": base_total,
        "shock_pct": shock_pct,
        "shocks": shocks,
        "error": None,
    }


def _fetch_live_prices(slugs: list[str]) -> dict[str, float]:
    """Intenta resolver precios live via Yahoo Finance · falla cerrado."""
    out: dict[str, float] = {}
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client
    except Exception:
        return out

    client = get_yahoo_client()
    if getattr(client, "_session", None) is None:
        return out

    for slug in slugs:
        meta = get_commodity(slug)
        if meta is None or not meta.get("yahoo_ticker"):
            continue
        snap = client.quote_snapshot(meta["yahoo_ticker"])
        if snap.get("last_price") is not None:
            try:
                out[slug] = float(snap["last_price"])
            except Exception:
                pass
    return out


__all__ = ["compute_recipe_cost", "sensitivity_analysis"]
