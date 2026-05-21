"""FRED client · Federal Reserve Economic Data (St. Louis Fed).
https://fred.stlouisfed.org/docs/api/fred/

Free tier:
  - 120 req/min (prácticamente ilimitado para uso normal)
  - 800.000+ series macroeconómicas USA y globales
  - Datos oficiales del Fed, BLS, BEA, Treasury

Series populares (mantén estas en mente al construir dashboards):
  - GDP             · USA Gross Domestic Product (trimestral, billions USD)
  - GDPC1           · USA Real GDP (chained)
  - CPIAUCSL        · Consumer Price Index All Urban Consumers (inflación)
  - UNRATE          · Unemployment Rate (mensual %)
  - DFF             · Federal Funds Effective Rate (tipo de interés)
  - DGS10           · 10-Year Treasury yield
  - DGS2            · 2-Year Treasury yield (curva 10y-2y → recession signal)
  - DEXUSEU         · EUR/USD spot
  - DCOILWTICO      · WTI Crude Oil price
  - VIXCLS          · CBOE Volatility Index
  - PAYEMS          · Non-farm Payrolls
  - INDPRO          · Industrial Production Index

Estrategia: cache TTL 12h por defecto (datos diarios) · 30 días para
metadata de series.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

FRED_BASE = "https://api.stlouisfed.org/fred"
DEFAULT_TIMEOUT_S = 10

_cache: dict[tuple, tuple[datetime, Any]] = {}


def is_available() -> bool:
    return bool(os.environ.get("FRED_API_KEY"))


def _cache_get(key: tuple) -> Any | None:
    e = _cache.get(key)
    if not e: return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: tuple, payload: Any, ttl: timedelta) -> None:
    _cache[key] = (datetime.now(timezone.utc) + ttl, payload)


def _request(
    path: str,
    params: dict[str, Any],
    ttl_hours: int = 12,
) -> dict[str, Any]:
    """GET FRED API con cache + falla-cerrado."""
    if not is_available():
        logger.warning("FRED_API_KEY no configurada · %s", path)
        return {"status": "missing_key"}

    cache_key = (path, tuple(sorted(params.items())))
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        import httpx
    except ImportError:
        return {"status": "missing_httpx"}

    full_params = {
        **params,
        "api_key": os.environ["FRED_API_KEY"],
        "file_type": "json",
    }
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{FRED_BASE}{path}", params=full_params)
        r.raise_for_status()
        payload = r.json()
        _cache_set(cache_key, payload, timedelta(hours=ttl_hours))
        return payload
    except Exception as exc:
        logger.debug("FRED %s falló: %s", path, exc)
        return {"status": "error", "message": str(exc)[:160]}


def series_observations(
    series_id: str,
    observation_start: str | None = None,
    observation_end: str | None = None,
    limit: int = 100000,
    sort_order: str = "desc",
) -> list[dict[str, Any]]:
    """Serie temporal de un indicador.

    Args:
        series_id  · ej. 'GDP', 'CPIAUCSL', 'UNRATE', 'DFF', 'DGS10'
        observation_start · 'YYYY-MM-DD' (default: cobertura completa)
        observation_end   · 'YYYY-MM-DD' (default: hoy)
        sort_order        · 'asc' | 'desc' (default desc · más recientes primero)

    Returns: list[{date, value}] · value es str ('.' si N/A) o float convertible.
    """
    params: dict[str, Any] = {
        "series_id": series_id,
        "limit": limit,
        "sort_order": sort_order,
    }
    if observation_start:
        params["observation_start"] = observation_start
    if observation_end:
        params["observation_end"] = observation_end
    payload = _request("/series/observations", params, ttl_hours=12)
    obs = payload.get("observations") or []
    out = []
    for o in obs:
        date = o.get("date")
        val = o.get("value")
        if not date:
            continue
        try:
            val_float = float(val) if val and val != "." else None
        except ValueError:
            val_float = None
        out.append({"date": date, "value": val_float, "raw": val})
    return out


def series_metadata(series_id: str) -> dict[str, Any] | None:
    """Metadata de la serie · title, frequency, units, last_updated, notes."""
    payload = _request("/series", {"series_id": series_id}, ttl_hours=24 * 30)
    seriess = payload.get("seriess") or []
    if not seriess:
        return None
    s = seriess[0]
    return {
        "id": s.get("id"),
        "title": s.get("title"),
        "frequency": s.get("frequency"),
        "frequency_short": s.get("frequency_short"),
        "units": s.get("units"),
        "units_short": s.get("units_short"),
        "seasonal_adjustment": s.get("seasonal_adjustment"),
        "last_updated": s.get("last_updated"),
        "observation_start": s.get("observation_start"),
        "observation_end": s.get("observation_end"),
        "notes": s.get("notes"),
        "popularity": s.get("popularity"),
    }


def search_series(text: str, limit: int = 25) -> list[dict[str, Any]]:
    """Busca series por keyword."""
    payload = _request(
        "/series/search",
        {"search_text": text, "limit": limit, "order_by": "popularity"},
        ttl_hours=24,
    )
    seriess = payload.get("seriess") or []
    return [
        {
            "id": s.get("id"),
            "title": s.get("title"),
            "frequency": s.get("frequency_short"),
            "units": s.get("units_short"),
            "popularity": s.get("popularity"),
            "last_updated": s.get("last_updated"),
        }
        for s in seriess
    ]


def latest_value(series_id: str) -> dict[str, Any] | None:
    """Atajo · último valor + meta básica.

    Returns: {series_id, date, value, units, title} o None.
    """
    obs = series_observations(series_id, limit=1, sort_order="desc")
    if not obs:
        return None
    meta = series_metadata(series_id) or {}
    return {
        "series_id": series_id,
        "date": obs[0]["date"],
        "value": obs[0]["value"],
        "raw": obs[0]["raw"],
        "title": meta.get("title"),
        "units": meta.get("units_short"),
        "frequency": meta.get("frequency_short"),
    }


# ─────────────────────────────────────────────────────────────────
# Indicadores estrella · snapshot rápido para /macro
# ─────────────────────────────────────────────────────────────────

POPULAR_INDICATORS = [
    "GDPC1",        # Real GDP USA
    "CPIAUCSL",     # CPI inflación
    "UNRATE",       # paro USA
    "DFF",          # Fed Funds Rate
    "DGS10",        # 10-year Treasury
    "DGS2",         # 2-year Treasury
    "VIXCLS",       # VIX volatilidad
    "DCOILWTICO",   # WTI Crude
    "DEXUSEU",      # EUR/USD
    "PAYEMS",       # Non-farm Payrolls
]


def macro_snapshot() -> list[dict[str, Any]]:
    """Snapshot de 10 indicadores macro USA top · cacheado 12h.

    Returns: list[{series_id, title, date, value, units, frequency}]
    """
    out = []
    for sid in POPULAR_INDICATORS:
        latest = latest_value(sid)
        if latest:
            out.append(latest)
    return out


__all__ = [
    "is_available",
    "series_observations",
    "series_metadata",
    "search_series",
    "latest_value",
    "macro_snapshot",
    "POPULAR_INDICATORS",
]
