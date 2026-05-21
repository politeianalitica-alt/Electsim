"""Open Exchange Rates · FX cross-rates · https://openexchangerates.org

Free tier · 1000 req/mes con app_id en `OPEN_EXCHANGE_RATES_APP_ID`.
Fallback · sin clave usa ECB SDW (ya integrado en etl/sources/ports/ecb_client.py).

Use case · /macro y /commodities pueden mostrar USD↔EUR/GBP/CNY/JPY actuales.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

OXR_BASE = "https://openexchangerates.org/api"
DEFAULT_TIMEOUT_S = 12

_cache: dict[str, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=1)


def is_available() -> bool:
    return bool(os.environ.get("OPEN_EXCHANGE_RATES_APP_ID"))


def _cache_get(key: str) -> Any | None:
    e = _cache.get(key)
    if not e: return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: str, payload: Any) -> None:
    _cache[key] = (datetime.now(timezone.utc) + _CACHE_TTL, payload)


def latest_rates(base: str = "USD") -> dict[str, float]:
    """Tipos de cambio actuales · ~170 monedas vs USD."""
    if not is_available():
        return {}
    cache_key = f"latest:{base}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        import httpx
    except ImportError:
        return {}
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(
                f"{OXR_BASE}/latest.json",
                params={"app_id": os.environ["OPEN_EXCHANGE_RATES_APP_ID"], "base": base},
            )
        r.raise_for_status()
        rates = r.json().get("rates", {})
        _cache_set(cache_key, rates)
        return rates
    except Exception as exc:
        logger.debug("OXR latest falló: %s", exc)
        return {}


def historical_rates(date: str, base: str = "USD") -> dict[str, float]:
    """Tipos de cambio en fecha pasada · 'YYYY-MM-DD'."""
    if not is_available():
        return {}
    cache_key = f"hist:{base}:{date}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        import httpx
    except ImportError:
        return {}
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(
                f"{OXR_BASE}/historical/{date}.json",
                params={"app_id": os.environ["OPEN_EXCHANGE_RATES_APP_ID"], "base": base},
            )
        r.raise_for_status()
        rates = r.json().get("rates", {})
        _cache_set(cache_key, rates)
        return rates
    except Exception as exc:
        logger.debug("OXR historical falló: %s", exc)
        return {}


__all__ = ["is_available", "latest_rates", "historical_rates"]
