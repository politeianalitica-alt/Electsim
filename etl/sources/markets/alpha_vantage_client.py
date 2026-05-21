"""Alpha Vantage client · https://www.alphavantage.co

Free tier:
  - 25 requests / día (intentar minimizar · cache TTL agresivo)
  - 5 req/min limite ráfaga
  - Tipos cubiertos: stocks, forex, commodities, crypto, sectoriales

Uso en Politeia:
  - Quote actual de cualquier ticker · `quote(symbol)` → precio + change %
  - Serie intraday 1/5/15/30/60 min (últimos 1-2 meses · 30 días free)
  - Serie diaria histórica (20 años)
  - Indicadores técnicos pre-calculados (RSI, MACD, SMA, EMA, BBANDS…)
  - Listings de sectores / industries

Complementa pero NO reemplaza:
  - Yahoo Finance (`etl/sources/commodities/prices.py`) · sigue siendo el
    cliente preferido para series largas y consultas frecuentes (gratis,
    ilimitado). Alpha Vantage entra cuando necesitas indicadores técnicos
    listos (RSI/MACD) o algún ticker no listado en Yahoo.

Cache TTL 1h por defecto (intraday) · 24h para series diarias/macro.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

AV_BASE = "https://www.alphavantage.co/query"
DEFAULT_TIMEOUT_S = 15

_cache: dict[tuple, tuple[datetime, Any]] = {}


def _cache_get(key: tuple, ttl: timedelta) -> Any | None:
    e = _cache.get(key)
    if not e: return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: tuple, payload: Any, ttl: timedelta) -> None:
    _cache[key] = (datetime.now(timezone.utc) + ttl, payload)


def is_available() -> bool:
    return bool(os.environ.get("ALPHA_VANTAGE_KEY"))


def _request(params: dict[str, Any], ttl_minutes: int = 60) -> dict[str, Any]:
    """GET autenticado con cache + falla-cerrado.

    Alpha Vantage tiene 25 req/día gratuitos. La cache TTL >= 1h es crítica
    para no agotar el rate limit en pruebas/tests.
    """
    if not is_available():
        logger.warning("ALPHA_VANTAGE_KEY no configurada · función=%s", params.get("function"))
        return {"status": "missing_key"}

    cache_key = tuple(sorted(params.items()))
    cached = _cache_get(cache_key, timedelta(minutes=ttl_minutes))
    if cached is not None:
        return cached

    try:
        import httpx
    except ImportError:
        return {"status": "missing_httpx"}

    params = {**params, "apikey": os.environ["ALPHA_VANTAGE_KEY"]}
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(AV_BASE, params=params)
        r.raise_for_status()
        payload = r.json()

        # Alpha Vantage responde 200 con mensaje de error en JSON
        if "Error Message" in payload:
            logger.warning("AV error · %s", payload["Error Message"][:160])
            return {"status": "error", "message": payload["Error Message"]}
        if "Note" in payload:  # rate limit exceeded
            logger.warning("AV rate limited · %s", payload["Note"][:120])
            return {"status": "rate_limited", "message": payload["Note"]}

        _cache_set(cache_key, payload, timedelta(minutes=ttl_minutes))
        return payload
    except Exception as exc:
        logger.debug("AV request falló: %s", exc)
        return {"status": "error", "message": str(exc)[:160]}


def quote(symbol: str) -> dict[str, Any] | None:
    """GLOBAL_QUOTE · precio + change% en una llamada.

    Returns:
        {symbol, price, change, change_percent, volume, open, high, low,
         previous_close, latest_trading_day} o None si falla.
    """
    payload = _request({"function": "GLOBAL_QUOTE", "symbol": symbol}, ttl_minutes=15)
    q = payload.get("Global Quote") or {}
    if not q.get("05. price"):
        return None
    try:
        return {
            "symbol": q.get("01. symbol", symbol),
            "price": float(q["05. price"]),
            "change": float(q.get("09. change") or 0),
            "change_percent": q.get("10. change percent", "0%"),
            "volume": int(q.get("06. volume") or 0),
            "open": float(q.get("02. open") or 0),
            "high": float(q.get("03. high") or 0),
            "low": float(q.get("04. low") or 0),
            "previous_close": float(q.get("08. previous close") or 0),
            "latest_trading_day": q.get("07. latest trading day"),
        }
    except (ValueError, KeyError) as exc:
        logger.debug("quote parse error %s: %s", symbol, exc)
        return None


def daily_series(symbol: str, output_size: str = "compact") -> list[dict[str, Any]]:
    """TIME_SERIES_DAILY · serie diaria OHLC + volumen.

    output_size · 'compact' (100 días) | 'full' (20 años, ~600KB JSON)

    Returns: list[{date, open, high, low, close, volume}] ordenado DESC.
    """
    payload = _request(
        {"function": "TIME_SERIES_DAILY", "symbol": symbol, "outputsize": output_size},
        ttl_minutes=24 * 60,  # series diarias · cache 24h
    )
    series = payload.get("Time Series (Daily)") or {}
    out = []
    for date, vals in sorted(series.items(), reverse=True):
        try:
            out.append({
                "date": date,
                "open": float(vals["1. open"]),
                "high": float(vals["2. high"]),
                "low": float(vals["3. low"]),
                "close": float(vals["4. close"]),
                "volume": int(float(vals["5. volume"])),
            })
        except (KeyError, ValueError):
            continue
    return out


def intraday_series(
    symbol: str,
    interval: str = "5min",
    output_size: str = "compact",
) -> list[dict[str, Any]]:
    """TIME_SERIES_INTRADAY · serie intraday.

    interval · '1min' | '5min' | '15min' | '30min' | '60min'
    """
    payload = _request(
        {
            "function": "TIME_SERIES_INTRADAY",
            "symbol": symbol,
            "interval": interval,
            "outputsize": output_size,
        },
        ttl_minutes=15,
    )
    key = f"Time Series ({interval})"
    series = payload.get(key) or {}
    out = []
    for ts, vals in sorted(series.items(), reverse=True):
        try:
            out.append({
                "ts": ts,
                "open": float(vals["1. open"]),
                "high": float(vals["2. high"]),
                "low": float(vals["3. low"]),
                "close": float(vals["4. close"]),
                "volume": int(float(vals["5. volume"])),
            })
        except (KeyError, ValueError):
            continue
    return out


def rsi(symbol: str, interval: str = "daily", time_period: int = 14) -> list[dict[str, Any]]:
    """RSI · Relative Strength Index pre-calculado por Alpha Vantage.

    Ahorra recalcular en cliente con pandas/numpy.
    Returns: list[{date, rsi}] ordenado DESC.
    """
    payload = _request(
        {
            "function": "RSI",
            "symbol": symbol,
            "interval": interval,
            "time_period": time_period,
            "series_type": "close",
        },
        ttl_minutes=24 * 60,
    )
    series = payload.get("Technical Analysis: RSI") or {}
    out = []
    for date, vals in sorted(series.items(), reverse=True):
        try:
            out.append({"date": date, "rsi": float(vals["RSI"])})
        except (KeyError, ValueError):
            continue
    return out


def macd(symbol: str, interval: str = "daily") -> list[dict[str, Any]]:
    """MACD · Moving Average Convergence Divergence.

    Returns: list[{date, macd, signal, histogram}] ordenado DESC.
    """
    payload = _request(
        {
            "function": "MACD",
            "symbol": symbol,
            "interval": interval,
            "series_type": "close",
        },
        ttl_minutes=24 * 60,
    )
    series = payload.get("Technical Analysis: MACD") or {}
    out = []
    for date, vals in sorted(series.items(), reverse=True):
        try:
            out.append({
                "date": date,
                "macd": float(vals["MACD"]),
                "signal": float(vals["MACD_Signal"]),
                "histogram": float(vals["MACD_Hist"]),
            })
        except (KeyError, ValueError):
            continue
    return out


def fx_rate(from_currency: str, to_currency: str) -> dict[str, Any] | None:
    """CURRENCY_EXCHANGE_RATE · spot FX rate.

    Returns: {from, to, rate, last_refreshed, bid, ask} o None.
    """
    payload = _request(
        {
            "function": "CURRENCY_EXCHANGE_RATE",
            "from_currency": from_currency,
            "to_currency": to_currency,
        },
        ttl_minutes=15,
    )
    q = payload.get("Realtime Currency Exchange Rate") or {}
    if not q.get("5. Exchange Rate"):
        return None
    try:
        return {
            "from": q.get("1. From_Currency Code", from_currency),
            "to": q.get("3. To_Currency Code", to_currency),
            "rate": float(q["5. Exchange Rate"]),
            "last_refreshed": q.get("6. Last Refreshed"),
            "bid": float(q.get("8. Bid Price") or 0),
            "ask": float(q.get("9. Ask Price") or 0),
        }
    except (ValueError, KeyError):
        return None


__all__ = [
    "is_available",
    "quote",
    "daily_series",
    "intraday_series",
    "rsi",
    "macd",
    "fx_rate",
]
