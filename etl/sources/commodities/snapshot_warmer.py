"""Snapshot warmer · cache compartido en memoria con TTL.

Decoupling del evaluador de alertas. Antes:
  · evaluate_all() llamaba Yahoo Finance una vez por slug DENTRO del loop
  · si dos pasadas seguidas con cooldown corto → fetch dupe

Ahora:
  · warm_snapshots(slugs, ttl_seconds=300) hace UN fetch por slug y cachea
  · resolve_snapshot(slug) sirve desde cache si fresh, sino fetch on-demand
  · el cache es thread-safe (RLock) y compartido entre llamadas a evaluate_all
  · TTL configurable · default 5 min (alineado con frecuencia típica del cron)

Diseño:
  - SnapshotCache singleton via module-level dict + RLock
  - Cache entries: {slug: (snapshot, expires_at_unix)}
  - resolve_snapshot llena el cache si miss
  - clear_cache() para tests + override puntual
"""
from __future__ import annotations

import logging
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_TTL_SECS = 300  # 5 min
_CACHE: dict[str, tuple[dict[str, Any], float]] = {}
_LOCK = threading.RLock()


def _now_unix() -> float:
    return time.time()


def _fetch_snapshot_uncached(slug: str) -> dict[str, Any]:
    """Llama Yahoo Finance + calcula RSI para un slug. Falla cerrado → {}."""
    try:
        from etl.sources.commodities.catalog import get_commodity
        from etl.sources.commodities.prices import get_yahoo_client, technical_indicators
    except Exception as exc:
        logger.debug("warmer · imports · %s", exc)
        return {}

    c = get_commodity(slug)
    if not c or not c.get("yahoo_ticker"):
        return {"slug": slug, "available": False}

    client = get_yahoo_client()
    snap = client.quote_snapshot(c["yahoo_ticker"]) or {}

    # Para RSI necesitamos serie 1y · solo si la regla la pide. Por simplicidad
    # incluimos RSI siempre (un fetch extra por slug · pero el cache lo amortiza).
    rsi_14 = None
    try:
        ohlc_data = client.chart(c["yahoo_ticker"], range="6mo", interval="1d")
        closes = [
            p["close"] for p in (ohlc_data.get("ohlc") or [])
            if p.get("close") is not None
        ]
        if len(closes) >= 15:
            ind = technical_indicators(closes)
            rsi_14 = ind.get("rsi14")
    except Exception as exc:
        logger.debug("warmer · RSI %s · %s", slug, exc)

    return {
        "slug": slug,
        "name": c.get("name"),
        "last_price": snap.get("last_price"),
        "prev_close": snap.get("prev_close"),
        "change_pct": snap.get("change_pct"),
        "currency": snap.get("currency"),
        "as_of": snap.get("as_of"),
        "rsi_14": rsi_14,
        "available": snap.get("last_price") is not None,
    }


def warm_snapshots(
    slugs: list[str],
    *,
    ttl_seconds: int = _DEFAULT_TTL_SECS,
    force: bool = False,
) -> dict[str, dict[str, Any]]:
    """Pre-calienta el cache para una lista de slugs.

    Args:
      slugs: lista de slugs a cachear (deduplicados internamente)
      ttl_seconds: tiempo de vida de cada entrada en cache
      force: True ignora cache existente y refresca todo

    Returns:
      dict {slug: snapshot} con todos los pedidos (mezcla cache + fetch)
    """
    unique = list(dict.fromkeys(s.lower() for s in slugs if s))
    out: dict[str, dict[str, Any]] = {}
    now = _now_unix()
    for slug in unique:
        with _LOCK:
            entry = _CACHE.get(slug)
        if not force and entry and entry[1] > now:
            out[slug] = entry[0]
            continue
        snap = _fetch_snapshot_uncached(slug)
        with _LOCK:
            _CACHE[slug] = (snap, now + ttl_seconds)
        out[slug] = snap
    return out


def resolve_snapshot(
    slug: str,
    *,
    ttl_seconds: int = _DEFAULT_TTL_SECS,
) -> dict[str, Any] | None:
    """Devuelve snapshot · fetch on-demand si no está en cache o expiró."""
    if not slug:
        return None
    key = slug.lower()
    now = _now_unix()
    with _LOCK:
        entry = _CACHE.get(key)
    if entry and entry[1] > now:
        return entry[0]
    snap = _fetch_snapshot_uncached(key)
    with _LOCK:
        _CACHE[key] = (snap, now + ttl_seconds)
    return snap


def clear_cache() -> None:
    """Vacía el cache · útil para tests."""
    with _LOCK:
        _CACHE.clear()


def cache_stats() -> dict[str, Any]:
    """Diagnóstico · cantidad de entradas + fresh count."""
    now = _now_unix()
    with _LOCK:
        total = len(_CACHE)
        fresh = sum(1 for _, exp in _CACHE.values() if exp > now)
    return {
        "total_entries": total,
        "fresh_entries": fresh,
        "stale_entries": total - fresh,
    }


__all__ = [
    "warm_snapshots",
    "resolve_snapshot",
    "clear_cache",
    "cache_stats",
]
