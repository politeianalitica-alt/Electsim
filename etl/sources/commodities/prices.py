"""Precios commodities · Yahoo Finance v2 fetcher · Sprint 14 · S14.4.

Cliente HTTP que consulta el endpoint público no documentado pero estable
de Yahoo Finance para precios spot + variación. Sin auth, sin dependencias
pesadas (no usa yfinance porque arrastra pandas/numpy).

Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/<ticker>

Falla cerrado: timeout 15s · errores → {error}.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"
_TIMEOUT = 15
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


class YahooFinanceClient:
    """Cliente HTTP ligero para Yahoo Finance chart endpoint."""

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "application/json",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("YahooFinanceClient: requests no disponible · degradado")

    def chart(
        self,
        ticker: str,
        *,
        range: str = "1mo",
        interval: str = "1d",
    ) -> dict[str, Any]:
        """Obtiene datos OHLC para un ticker.

        Args:
          ticker: símbolo Yahoo (ej. 'ZW=F').
          range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max.
          interval: 1m, 5m, 15m, 1h, 1d, 1wk, 1mo.

        Returns:
          {"ticker", "currency", "last_price", "prev_close",
           "change_pct", "ohlc": [{date, open, high, low, close, volume}]}
        """
        if self._session is None:
            return {"ticker": ticker, "ohlc": [], "error": "requests no disponible"}

        params = {"range": range, "interval": interval, "includePrePost": "false"}
        try:
            r = self._session.get(
                f"{_YF_CHART}/{ticker}",
                params=params, timeout=_TIMEOUT,
            )
            r.raise_for_status()
            data = r.json()
        except Exception as exc:
            logger.warning("YF chart %s · %s", ticker, exc)
            return {"ticker": ticker, "ohlc": [], "error": str(exc)}

        try:
            result = data["chart"]["result"][0]
            meta = result.get("meta", {})
            timestamps = result.get("timestamp") or []
            quote = (result.get("indicators", {}).get("quote") or [{}])[0]
            opens = quote.get("open") or []
            highs = quote.get("high") or []
            lows = quote.get("low") or []
            closes = quote.get("close") or []
            volumes = quote.get("volume") or []
            ohlc = []
            for i, ts in enumerate(timestamps):
                if i >= len(closes):
                    break
                if closes[i] is None:
                    continue
                ohlc.append({
                    "date": datetime.fromtimestamp(ts, timezone.utc).date().isoformat(),
                    "open": opens[i] if i < len(opens) else None,
                    "high": highs[i] if i < len(highs) else None,
                    "low": lows[i] if i < len(lows) else None,
                    "close": closes[i],
                    "volume": volumes[i] if i < len(volumes) else None,
                })
            last_price = meta.get("regularMarketPrice")
            prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")
            change_pct = (
                round((last_price - prev_close) / prev_close * 100, 3)
                if last_price is not None and prev_close
                else None
            )
            return {
                "ticker": ticker,
                "currency": meta.get("currency"),
                "exchange": meta.get("exchangeName"),
                "last_price": last_price,
                "prev_close": prev_close,
                "change_pct": change_pct,
                "n_obs": len(ohlc),
                "ohlc": ohlc,
                "error": None,
            }
        except Exception as exc:
            logger.debug("YF parse %s · %s", ticker, exc)
            return {"ticker": ticker, "ohlc": [], "error": f"parse error: {exc}"}

    def quote_snapshot(self, ticker: str) -> dict[str, Any]:
        """Snapshot rápido · solo último precio + variación."""
        data = self.chart(ticker, range="5d", interval="1d")
        if data.get("error"):
            return {"ticker": ticker, "error": data["error"]}
        return {
            "ticker": ticker,
            "currency": data.get("currency"),
            "last_price": data.get("last_price"),
            "change_pct": data.get("change_pct"),
            "prev_close": data.get("prev_close"),
            "as_of": (data["ohlc"][-1]["date"] if data.get("ohlc") else None),
            "error": None,
        }


def technical_indicators(closes: list[float]) -> dict[str, Any]:
    """Indicadores técnicos básicos sobre serie de cierres (sin dependencias).

    Implementación canónica de SMA / EMA / RSI(14) / MACD(12,26,9).
    """
    n = len(closes)
    if n < 2:
        return {"sma20": None, "sma50": None, "rsi14": None, "macd": None, "n_obs": n}

    def _sma(values: list[float], window: int) -> float | None:
        if len(values) < window:
            return None
        return round(sum(values[-window:]) / window, 4)

    def _ema(values: list[float], window: int) -> list[float]:
        if not values:
            return []
        k = 2 / (window + 1)
        ema_list = [values[0]]
        for v in values[1:]:
            ema_list.append(ema_list[-1] + k * (v - ema_list[-1]))
        return ema_list

    def _rsi(values: list[float], window: int = 14) -> float | None:
        if len(values) < window + 1:
            return None
        gains: list[float] = []
        losses: list[float] = []
        for i in range(1, window + 1):
            delta = values[i] - values[i - 1]
            gains.append(max(0.0, delta))
            losses.append(max(0.0, -delta))
        avg_gain = sum(gains) / window
        avg_loss = sum(losses) / window
        for i in range(window + 1, len(values)):
            delta = values[i] - values[i - 1]
            gain = max(0.0, delta)
            loss = max(0.0, -delta)
            avg_gain = (avg_gain * (window - 1) + gain) / window
            avg_loss = (avg_loss * (window - 1) + loss) / window
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return round(100 - (100 / (1 + rs)), 2)

    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd_value = round(ema12[-1] - ema26[-1], 4) if ema26 else None
    macd_signal: float | None = None
    if macd_value is not None:
        macd_line = [a - b for a, b in zip(ema12, ema26)]
        sig_line = _ema(macd_line, 9)
        macd_signal = round(sig_line[-1], 4) if sig_line else None

    return {
        "n_obs": n,
        "sma20": _sma(closes, 20),
        "sma50": _sma(closes, 50),
        "sma200": _sma(closes, 200),
        "rsi14": _rsi(closes, 14),
        "macd": macd_value,
        "macd_signal": macd_signal,
        "macd_histogram": (
            round(macd_value - macd_signal, 4)
            if macd_value is not None and macd_signal is not None else None
        ),
    }


_CLIENT: YahooFinanceClient | None = None


def get_yahoo_client() -> YahooFinanceClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = YahooFinanceClient()
    return _CLIENT


__all__ = ["YahooFinanceClient", "get_yahoo_client", "technical_indicators"]
