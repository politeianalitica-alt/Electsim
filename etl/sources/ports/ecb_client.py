"""ECB Statistical Data Warehouse · tipos de cambio + indicadores macro.

API pública sin auth · https://data-api.ecb.europa.eu/service/data/

Endpoint EXR mensual: M.<CURRENCY>.EUR.SP00.A → 1 EUR a CURRENCY (avg mensual)
"""
from __future__ import annotations

import csv
import io
import logging
from typing import Any

logger = logging.getLogger(__name__)

ECB_BASE = "https://data-api.ecb.europa.eu/service/data"


def _http_get_csv(url: str, params: dict[str, Any] | None = None, timeout: float = 20.0) -> str | None:
    try:
        try:
            import httpx
            with httpx.Client(timeout=timeout, follow_redirects=True) as c:
                resp = c.get(url, params=params or {}, headers={"Accept": "text/csv"})
                resp.raise_for_status()
                return resp.text
        except ImportError:
            import requests  # type: ignore[import-not-found]
            resp = requests.get(url, params=params or {}, timeout=timeout,
                                headers={"Accept": "text/csv"})
            resp.raise_for_status()
            return resp.text
    except Exception as exc:
        logger.warning("ecb fetch failed %s: %s", url, exc)
        return None


def fx_series(currency: str = "USD", freq: str = "M", last_n: int = 24) -> list[dict[str, Any]]:
    """Devuelve serie tipos de cambio EUR↔CURRENCY · format CSV."""
    cur = currency.upper()
    key = f"{freq}.{cur}.EUR.SP00.A"
    text = _http_get_csv(f"{ECB_BASE}/EXR/{key}", params={"format": "csvdata", "lastNObservations": last_n})
    if not text:
        return []
    out: list[dict[str, Any]] = []
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        period = row.get("TIME_PERIOD") or ""
        val = row.get("OBS_VALUE")
        if not period or val in (None, "", "NaN"):
            continue
        try:
            out.append({"ts": period, "value": float(val)})
        except ValueError:
            continue
    out.sort(key=lambda r: r["ts"])
    return out


def is_available() -> bool:
    return bool(fx_series("USD", last_n=1))


__all__ = ["fx_series", "is_available", "ECB_BASE"]
