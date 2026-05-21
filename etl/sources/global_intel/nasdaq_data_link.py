"""Nasdaq Data Link (antes Quandl) · https://data.nasdaq.com/

Provee >100 datasets premium · stocks, commodities, macro, alternative data.
Free tier disponible con muchos datasets gratuitos (OPEC, FRED mirror,
World Bank, BIS, IMF, exchange rates, agricultural).

Use cases en Politeia:
  - Precios commodities granularidad fina (oro, petróleo, gas)
  - Macro indicators cross-country
  - Exchange rates históricos
  - Inflación BIS y CPI por país
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

NDL_BASE = "https://data.nasdaq.com/api/v3"
DEFAULT_TIMEOUT_S = 15

_cache: dict[tuple, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=6)


def is_available() -> bool:
    return bool(os.environ.get("NASDAQ_DATA_LINK_KEY"))


def _cache_get(key: tuple) -> Any | None:
    e = _cache.get(key)
    if not e: return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: tuple, payload: Any) -> None:
    _cache[key] = (datetime.now(timezone.utc) + _CACHE_TTL, payload)


def dataset(
    db_code: str,
    ds_code: str,
    rows: int = 100,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict[str, Any]]:
    """Descarga una serie temporal.

    Ejemplos:
        dataset('OPEC', 'ORB')           · OPEC reference basket oil price
        dataset('WGC', 'GOLD_DAILY_USD') · Oro spot USD/oz
        dataset('FRED', 'GDP')           · GDP USA (mirror FRED)
        dataset('BIS', 'LBS_BS_LREP')    · BIS Locational Banking Stats

    Returns: list[{date, ...columns...}] · más recientes primero.
    """
    if not is_available():
        return []
    cache_key = (db_code, ds_code, rows, start_date, end_date)
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        import httpx
    except ImportError:
        return []
    params: dict[str, Any] = {
        "api_key": os.environ["NASDAQ_DATA_LINK_KEY"],
        "rows": rows,
        "order": "desc",
    }
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{NDL_BASE}/datasets/{db_code}/{ds_code}/data.json", params=params)
        r.raise_for_status()
        data = r.json().get("dataset_data", {})
        cols = data.get("column_names", [])
        rows_data = data.get("data", [])
        out = [dict(zip(cols, row)) for row in rows_data]
        _cache_set(cache_key, out)
        return out
    except Exception as exc:
        logger.debug("Nasdaq DL %s/%s falló: %s", db_code, ds_code, exc)
        return []


# Datasets free populares pre-mapeados
POPULAR_DATASETS = {
    "opec_oil": ("OPEC", "ORB"),
    "gold_daily": ("WGC", "GOLD_DAILY_USD"),
    "silver_daily": ("LBMA", "SILVER"),
    "fred_gdp": ("FRED", "GDP"),
    "fred_unemployment": ("FRED", "UNRATE"),
    "bis_credit_gap": ("BIS", "CRDT_GAP_RAT"),
}


def popular(name: str, rows: int = 50) -> list[dict[str, Any]]:
    """Atajo para los datasets más usados."""
    if name not in POPULAR_DATASETS:
        return []
    db, ds = POPULAR_DATASETS[name]
    return dataset(db, ds, rows=rows)


__all__ = ["is_available", "dataset", "popular", "POPULAR_DATASETS"]
