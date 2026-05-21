"""Finnhub · https://finnhub.io/docs/api

API de mercados · stocks USA, crypto, FX, company fundamentals, news.

Free tier (verificado live · sep 2025):
  - 60 calls/minuto
  - US stocks (NYSE, NASDAQ) · ADRs incluidos (SAN, BBVA, TEF, REPYY…)
  - Company profile + fundamentals
  - Company news (últimos meses)
  - Earnings calendar
  - Crypto via Binance (BINANCE:BTCUSDT)
  - Insider transactions, ESG ratings (limitados)

NO incluido en free tier:
  - Bolsas europeas con suffix (.MC Madrid, .PA Paris, .DE Frankfurt)
  - Indices CFD (^GSPC, ^IBEX, ^IXIC)
  - Forex rates spot

Use cases en Politeia:
  - Cotización en tiempo real de ADRs de IBEX (SAN, BBVA, TEF)
  - Big tech USA con presencia en España (AAPL, MSFT, GOOG, META)
  - Company profile + news para empresas cotizadas
  - Earnings calendar para tracking de resultados
  - Crypto para módulo geopolítica (BTC, ETH como activo refugio)
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

FINNHUB_BASE = "https://finnhub.io/api/v1"
DEFAULT_TIMEOUT_S = 12

_cache: dict[tuple, tuple[datetime, Any]] = {}


# Tickers relevantes para España + UE (ADRs en NYSE/NASDAQ + big tech)
SPANISH_ADRS = {
    "santander": "SAN",       # Banco Santander ADR
    "bbva": "BBVA",            # BBVA ADR
    "telefonica": "TEF",       # Telefónica ADR
    "ferrovial": "FER",        # Ferrovial ADR (post-2023 dual listing)
}

EU_BIG_CAPS = {
    "lvmh": "LVMUY",           # LVMH ADR
    "sap": "SAP",              # SAP ADR
    "asml": "ASML",            # ASML
    "siemens": "SIEGY",        # Siemens ADR
    "unilever": "UL",          # Unilever
    "shell": "SHEL",           # Shell
    "novartis": "NVS",         # Novartis
    "totalenergies": "TTE",    # TotalEnergies
}

US_BIG_TECH = ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "AMD", "INTC"]

DEFENSE_STOCKS = ["LMT", "RTX", "GD", "NOC", "BA", "LDOS", "PLTR"]
ENERGY_STOCKS = ["XOM", "CVX", "BP", "SHEL", "EOG", "OXY"]
CRYPTO_TOP = ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT", "BINANCE:SOLUSDT"]


def is_available() -> bool:
    return bool(os.environ.get("FINNHUB_API_KEY"))


def _cache_get(key: tuple, ttl: timedelta) -> Any | None:
    e = _cache.get(key)
    if not e:
        return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: tuple, payload: Any, ttl: timedelta) -> None:
    _cache[key] = (datetime.now(timezone.utc) + ttl, payload)


def _request(
    path: str,
    params: dict[str, Any] | None = None,
    ttl_minutes: int = 5,
) -> dict[str, Any]:
    """GET autenticado · cache + falla cerrado."""
    if not is_available():
        return {"error": "missing_key"}

    cache_key = (path, tuple(sorted((params or {}).items())))
    cached = _cache_get(cache_key, timedelta(minutes=ttl_minutes))
    if cached is not None:
        return cached

    try:
        import httpx
    except ImportError:
        return {"error": "missing_httpx"}

    full = {**(params or {}), "token": os.environ["FINNHUB_API_KEY"]}
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{FINNHUB_BASE}{path}", params=full)
        if r.status_code == 429:
            return {"error": "rate_limited"}
        r.raise_for_status()
        payload = r.json()
        if isinstance(payload, dict) and payload.get("error"):
            return {"error": payload["error"]}
        _cache_set(cache_key, payload, timedelta(minutes=ttl_minutes))
        return payload if isinstance(payload, dict) else {"data": payload}
    except Exception as exc:
        logger.debug("Finnhub %s falló: %s", path, exc)
        return {"error": str(exc)[:160]}


# ─────────────────────────────────────────────────────────────────
# Quotes + profiles
# ─────────────────────────────────────────────────────────────────

def quote(symbol: str) -> dict[str, Any] | None:
    """Cotización actual de un ticker.

    Returns: {symbol, price, change, change_percent, high, low, open,
              previous_close, timestamp} o None si falla.
    """
    payload = _request("/quote", {"symbol": symbol}, ttl_minutes=5)
    if not payload or payload.get("error") or not payload.get("c"):
        return None
    return {
        "symbol": symbol,
        "price": payload.get("c"),
        "change": payload.get("d"),
        "change_percent": payload.get("dp"),
        "high": payload.get("h"),
        "low": payload.get("l"),
        "open": payload.get("o"),
        "previous_close": payload.get("pc"),
        "timestamp": payload.get("t"),
    }


def profile(symbol: str) -> dict[str, Any] | None:
    """Perfil empresarial · sector, ipo, employees, market cap…"""
    payload = _request("/stock/profile2", {"symbol": symbol}, ttl_minutes=24 * 60)
    if not payload or payload.get("error") or not payload.get("name"):
        return None
    return payload


def company_news(
    symbol: str,
    from_date: str | None = None,
    to_date: str | None = None,
) -> list[dict[str, Any]]:
    """Noticias de empresa · últimos meses (free tier ≤ 1 año).

    Args:
        from_date · 'YYYY-MM-DD' (default: hace 30 días)
        to_date   · 'YYYY-MM-DD' (default: hoy)
    """
    now = datetime.now(timezone.utc)
    if not to_date:
        to_date = now.date().isoformat()
    if not from_date:
        from_date = (now - timedelta(days=30)).date().isoformat()
    payload = _request(
        "/company-news",
        {"symbol": symbol, "from": from_date, "to": to_date},
        ttl_minutes=120,
    )
    if isinstance(payload, dict) and payload.get("error"):
        return []
    if isinstance(payload, dict) and "data" in payload:
        return list(payload["data"])
    if isinstance(payload, list):
        return payload
    return []


def general_news(category: str = "general") -> list[dict[str, Any]]:
    """Headlines globales · 'general', 'forex', 'crypto', 'merger'."""
    payload = _request("/news", {"category": category}, ttl_minutes=30)
    if isinstance(payload, dict) and "data" in payload:
        return list(payload["data"])
    return list(payload) if isinstance(payload, list) else []


def earnings_calendar(from_date: str | None = None, to_date: str | None = None) -> list[dict[str, Any]]:
    """Calendario de earnings próximos."""
    now = datetime.now(timezone.utc)
    if not from_date:
        from_date = now.date().isoformat()
    if not to_date:
        to_date = (now + timedelta(days=14)).date().isoformat()
    payload = _request(
        "/calendar/earnings",
        {"from": from_date, "to": to_date},
        ttl_minutes=120,
    )
    return list(payload.get("earningsCalendar", [])) if isinstance(payload, dict) else []


def insider_transactions(symbol: str, limit: int = 20) -> list[dict[str, Any]]:
    """Transacciones de insiders · útil para tracking corporate governance."""
    payload = _request("/stock/insider-transactions", {"symbol": symbol}, ttl_minutes=12 * 60)
    if isinstance(payload, dict) and payload.get("data"):
        return list(payload["data"])[:limit]
    return []


# ─────────────────────────────────────────────────────────────────
# Snapshots agregados para el dashboard
# ─────────────────────────────────────────────────────────────────

def spain_market_snapshot() -> dict[str, Any]:
    """Snapshot de ADRs españoles · una sola estructura.

    Returns: {n_items, items: [{key, symbol, name, quote}, ...]}
    """
    items = []
    for key, sym in SPANISH_ADRS.items():
        q = quote(sym)
        if q:
            items.append({"key": key, "symbol": sym, "quote": q})
    return {"n_items": len(items), "items": items}


def dashboard_snapshot() -> dict[str, Any]:
    """Snapshot multi-categoría para el dashboard ejecutivo.

    Devuelve:
      - 4 ADRs españoles (SAN, BBVA, TEF, FER)
      - 5 big tech USA (AAPL, MSFT, GOOGL, AMZN, NVDA)
      - 3 EU big caps (LVMUY, SAP, ASML)
      - 2 crypto (BTC, ETH)
    """
    def _quotes(symbols: list[str]) -> list[dict[str, Any]]:
        out = []
        for s in symbols:
            q = quote(s)
            if q:
                out.append(q)
        return out

    return {
        "spain_adrs": _quotes(list(SPANISH_ADRS.values())),
        "us_big_tech": _quotes(US_BIG_TECH[:5]),
        "eu_big_caps": _quotes(list(EU_BIG_CAPS.values())[:3]),
        "crypto": _quotes(CRYPTO_TOP[:2]),
        "ts": datetime.now(timezone.utc).isoformat(),
    }


def sector_snapshot(sector: str) -> dict[str, Any]:
    """Snapshot de un sector específico.

    Args:
        sector · 'defensa', 'energia', 'tech', 'banca_es'
    """
    sector_map = {
        "defensa": DEFENSE_STOCKS,
        "energia": ENERGY_STOCKS,
        "tech": US_BIG_TECH,
        "banca_es": list(SPANISH_ADRS.values()),
    }
    symbols = sector_map.get(sector, [])
    items = []
    for s in symbols[:8]:
        q = quote(s)
        if q:
            items.append(q)
    return {"sector": sector, "n_items": len(items), "items": items}


__all__ = [
    "is_available",
    "quote",
    "profile",
    "company_news",
    "general_news",
    "earnings_calendar",
    "insider_transactions",
    "spain_market_snapshot",
    "dashboard_snapshot",
    "sector_snapshot",
    "SPANISH_ADRS",
    "EU_BIG_CAPS",
    "US_BIG_TECH",
    "DEFENSE_STOCKS",
    "ENERGY_STOCKS",
    "CRYPTO_TOP",
]
