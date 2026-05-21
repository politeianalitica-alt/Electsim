"""World Bank Commodity Prices · API pública sin auth.

https://api.worldbank.org/v2/en/indicator/<series>?format=json

Series usadas:
  · PNRG_INDEX     · Energy commodity price index
  · PFOOD_INDEX    · Food price index (FAO via WB)
  · PMETA_INDEX    · Metals & minerals price index
  · PRAWM_INDEX    · Agricultural raw materials index
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

WB_BASE = "https://api.worldbank.org/v2/en/indicator"


def _http_get(url: str, params: dict[str, Any] | None = None, timeout: float = 20.0) -> Any | None:
    try:
        try:
            import httpx
            with httpx.Client(timeout=timeout, follow_redirects=True) as c:
                resp = c.get(url, params=params or {})
                resp.raise_for_status()
                return resp.json()
        except ImportError:
            import requests  # type: ignore[import-not-found]
            resp = requests.get(url, params=params or {}, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("world bank fetch failed %s: %s", url, exc)
        return None


INDICATORS: dict[str, dict[str, Any]] = {
    "energy_index": {
        "slug": "energy_index",
        "wb_code": "PNRG_INDEX",
        "name": "Energy Commodity Index (WB)",
        "category": "energy",
        "unit": "index 2010=100",
    },
    "food_index": {
        "slug": "food_index",
        "wb_code": "PFOOD_INDEX",
        "name": "Food Price Index (WB / FAO)",
        "category": "food",
        "unit": "index 2010=100",
    },
    "metals_index": {
        "slug": "metals_index",
        "wb_code": "PMETA_INDEX",
        "name": "Metals & Minerals Index (WB)",
        "category": "metals",
        "unit": "index 2010=100",
    },
    "agriraw_index": {
        "slug": "agriraw_index",
        "wb_code": "PRAWM_INDEX",
        "name": "Agricultural Raw Materials Index (WB)",
        "category": "agri",
        "unit": "index 2010=100",
    },
}


def fetch_series(slug: str, per_page: int = 60) -> list[dict[str, Any]]:
    """Devuelve serie mensual: [{date: 'YYYYMM', value: float}]."""
    cfg = INDICATORS.get(slug)
    if cfg is None:
        return []
    data = _http_get(
        f"{WB_BASE}/{cfg['wb_code']}",
        params={"format": "json", "per_page": per_page},
    )
    if not isinstance(data, list) or len(data) < 2 or not isinstance(data[1], list):
        return []
    out: list[dict[str, Any]] = []
    for row in data[1]:
        v = row.get("value")
        if v is None:
            continue
        out.append({
            "ts": row.get("date"),
            "value": float(v),
        })
    out.sort(key=lambda r: r["ts"])
    return out


def list_indicators() -> list[dict[str, Any]]:
    return list(INDICATORS.values())


def snapshot_all() -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    for slug, cfg in INDICATORS.items():
        series = fetch_series(slug, per_page=24)
        if not series:
            items.append({**cfg, "last_value": None, "change_pct": None, "data_source": "unavailable"})
            continue
        last = series[-1]
        prev = series[-2] if len(series) >= 2 else None
        change_pct = (
            (last["value"] / prev["value"] - 1.0) * 100.0 if prev and prev["value"] else None
        )
        items.append({
            **cfg,
            "last_value": last["value"],
            "last_ts": last["ts"],
            "change_pct": round(change_pct, 2) if change_pct is not None else None,
            "data_source": "world_bank",
        })
    return {"n_items": len(items), "items": items, "data_source": "world_bank"}


def is_available() -> bool:
    return bool(fetch_series("energy_index", per_page=2))


__all__ = ["fetch_series", "list_indicators", "snapshot_all", "is_available", "INDICATORS"]
