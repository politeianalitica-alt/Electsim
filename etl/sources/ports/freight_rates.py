"""Freight rates · BDI + VLCC + FBX + spot containers.

Sprint P4 del módulo Puertos.

Catálogo de 6 índices de flete + spot:
  - baltic_dry        · Baltic Dry Index (granel seco)
  - baltic_capesize   · sub-índice Capesize
  - baltic_panamax    · sub-índice Panamax
  - baltic_dirty_tankers · BDTI (tanker dirty)
  - baltic_clean_tankers · BCTI (tanker clean/productos)
  - freightos_baltic  · FBX · contenedores spot global

Reusa `etl.sources.commodities.prices.YahooFinanceClient` (mismo patrón
Vesper) para tickers públicos. Sin ticker conocido → fallback sintético
con serie histórica realista (~6 meses).

Funciones:
  - list_freight_indices() -> list[dict]
  - get_index(slug) -> dict | None
  - get_price(slug, range='1y') -> dict
  - snapshot_all() -> dict
"""
from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)


# Ticker None → no hay equivalente Yahoo público, usar fallback sintético
FREIGHT_INDICES: dict[str, dict[str, Any]] = {
    "baltic_dry": {
        "slug": "baltic_dry",
        "name": "Baltic Dry Index (BDI)",
        "category": "freight_bulk",
        "yahoo_ticker": None,  # ^BDI no público estable · sintético
        "unit": "index",
        "exchange": "Baltic Exchange",
        "description": "Referencia mundial de fletes granel seco · termómetro comercio global.",
        "base_level": 1450,
    },
    "baltic_capesize": {
        "slug": "baltic_capesize",
        "name": "Baltic Capesize (BCI)",
        "category": "freight_bulk",
        "yahoo_ticker": None,
        "unit": "index",
        "exchange": "Baltic Exchange",
        "description": "Sub-índice · buques Capesize (≥150k dwt) · mineral/carbón.",
        "base_level": 2100,
    },
    "baltic_panamax": {
        "slug": "baltic_panamax",
        "name": "Baltic Panamax (BPI)",
        "category": "freight_bulk",
        "yahoo_ticker": None,
        "unit": "index",
        "exchange": "Baltic Exchange",
        "description": "Sub-índice · buques Panamax (75-85k dwt) · grano/carbón.",
        "base_level": 1280,
    },
    "baltic_dirty_tankers": {
        "slug": "baltic_dirty_tankers",
        "name": "Baltic Dirty Tanker (BDTI)",
        "category": "freight_tanker",
        "yahoo_ticker": None,
        "unit": "index",
        "exchange": "Baltic Exchange",
        "description": "Tarifas tanker dirty · crudo crude oil transport rates.",
        "base_level": 1090,
    },
    "baltic_clean_tankers": {
        "slug": "baltic_clean_tankers",
        "name": "Baltic Clean Tanker (BCTI)",
        "category": "freight_tanker",
        "yahoo_ticker": None,
        "unit": "index",
        "exchange": "Baltic Exchange",
        "description": "Tarifas tanker clean · productos refinados.",
        "base_level": 945,
    },
    "freightos_baltic": {
        "slug": "freightos_baltic",
        "name": "Freightos Baltic Index (FBX)",
        "category": "freight_container",
        "yahoo_ticker": None,
        "unit": "USD/40ft",
        "exchange": "Freightos",
        "description": "Spot global contenedor 40ft · 12 trade lanes principales.",
        "base_level": 2300,
    },
}


def list_freight_indices() -> list[dict[str, Any]]:
    return list(FREIGHT_INDICES.values())


def get_index(slug: str) -> dict[str, Any] | None:
    return FREIGHT_INDICES.get(slug.lower())


# ─────────────────────────────────────────────────────────────────
# Sintético determinista · serie 6 meses con volatilidad realista
# ─────────────────────────────────────────────────────────────────

def _synth_series(slug: str, n_days: int = 180) -> list[dict[str, Any]]:
    """Genera OHLC sintético determinista basado en hash(slug + day)."""
    idx = get_index(slug)
    if idx is None:
        return []
    base = idx["base_level"]
    out = []
    from datetime import datetime, timedelta, timezone
    today = datetime.now(timezone.utc).date()

    # Componentes: tendencia lineal suave + estacional + ruido pseudo-aleatorio
    for i in range(n_days):
        d = today - timedelta(days=n_days - i - 1)
        seed = abs(hash(f"{slug}_{d.isoformat()}"))
        trend = 1.0 + (i - n_days / 2) / (n_days * 6)  # ±8% drift
        seasonal = 1.0 + 0.05 * math.sin(2 * math.pi * i / 30)
        noise = 1.0 + ((seed % 100) - 50) / 1500  # ±3%
        close = base * trend * seasonal * noise
        # open dentro de banda diaria · luego high/low se calculan como envoltura
        open_p = close * (1.0 + ((seed // 900) % 30 - 15) / 2000)
        # high/low envuelven max/min de open y close + margen
        high = max(open_p, close) * (1.0 + (seed % 30) / 2000)
        low = min(open_p, close) * (1.0 - ((seed // 30) % 30) / 2000)
        volume = (seed % 1000) * 1000
        out.append({
            "date": d.isoformat(),
            "open": round(open_p, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
            "volume": volume,
        })
    return out


def get_price(slug: str, range_: str = "1y") -> dict[str, Any]:
    """Serie histórica de un freight index."""
    idx = get_index(slug)
    if idx is None:
        return {"error": f"índice '{slug}' no existe"}
    n_days = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730}.get(range_, 365)
    n_days = min(n_days, 730)

    # Si hay ticker Yahoo, intentar
    if idx.get("yahoo_ticker"):
        try:
            from etl.sources.commodities.prices import YahooFinanceClient
            client = YahooFinanceClient()
            data = client.chart(idx["yahoo_ticker"], range=range_, interval="1d")
            if not data.get("error"):
                return {
                    **idx,
                    "ohlc": data.get("ohlc", []),
                    "currency": data.get("currency"),
                    "last_price": data.get("last_price"),
                    "change_pct": data.get("change_pct"),
                    "data_source": "yahoo",
                }
        except Exception as exc:
            logger.debug("Yahoo fetch fallback synth %s: %s", slug, exc)

    # Fallback sintético
    series = _synth_series(slug, n_days=n_days)
    last_price = series[-1]["close"] if series else None
    prev_close = series[-2]["close"] if len(series) >= 2 else last_price
    change_pct = (
        100.0 * (last_price - prev_close) / prev_close
        if last_price and prev_close else 0.0
    )
    return {
        **idx,
        "ohlc": series,
        "currency": "USD",
        "last_price": last_price,
        "change_pct": round(change_pct, 3),
        "data_source": "synthetic",
    }


def snapshot_all() -> dict[str, Any]:
    """Snapshot de todos los freight indices · útil para dashboard fletes."""
    items = []
    for slug in FREIGHT_INDICES:
        series = _synth_series(slug, n_days=8)
        last = series[-1]["close"] if series else None
        prev = series[-2]["close"] if len(series) >= 2 else last
        prev_7d = series[0]["close"] if series else last
        change_24h = (
            100.0 * (last - prev) / prev if last and prev else 0.0
        )
        change_7d = (
            100.0 * (last - prev_7d) / prev_7d if last and prev_7d else 0.0
        )
        idx = FREIGHT_INDICES[slug]
        items.append({
            "slug": slug,
            "name": idx["name"],
            "category": idx["category"],
            "unit": idx["unit"],
            "last_price": last,
            "change_24h_pct": round(change_24h, 3),
            "change_7d_pct": round(change_7d, 3),
            "signal": _classify_signal(change_7d),
            "data_source": "synthetic",
        })
    return {"n_items": len(items), "items": items}


def _classify_signal(change_pct: float) -> str:
    """Clasificación cualitativa para card UI."""
    if change_pct >= 8:
        return "fuerte_subida"
    if change_pct >= 2:
        return "subida"
    if change_pct <= -8:
        return "fuerte_bajada"
    if change_pct <= -2:
        return "bajada"
    return "estable"


__all__ = [
    "FREIGHT_INDICES",
    "list_freight_indices",
    "get_index",
    "get_price",
    "snapshot_all",
]
