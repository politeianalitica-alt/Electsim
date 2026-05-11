"""
ECB Statistical Data Warehouse — bond spreads (10y gov yields).

REST API público: https://data-api.ecb.europa.eu/service/data/

Métrica que calculamos:
  - spread_es_de_10y  (Spain 10y - Germany 10y in basis points)

Series usadas (ECB SDW codes):
  - IRS.M.ES.L.L40.CI.0000.EUR.N.Z  (Spain long-term yield, monthly)
  - IRS.M.DE.L.L40.CI.0000.EUR.N.Z  (Germany long-term yield, monthly)

Si la API ECB falla, el connector devuelve [] y queda un warning en
risk_source_catalog.last_error.
"""
from __future__ import annotations

import logging
from datetime import date

from .base import RawValue, RiskV2Connector

logger = logging.getLogger(__name__)

ECB_BASE = "https://data-api.ecb.europa.eu/service/data/IRS"
SERIES_ES = "M.ES.L.L40.CI.0000.EUR.N.Z"
SERIES_DE = "M.DE.L.L40.CI.0000.EUR.N.Z"


def _fetch_series(key: str) -> dict[date, float]:
    try:
        import httpx
    except ImportError:
        return {}
    url = f"{ECB_BASE}/{key}?format=jsondata&lastNObservations=120"
    try:
        r = httpx.get(url, timeout=20, headers={"Accept": "application/json"})
        if not r.is_success:
            return {}
        j = r.json()
    except Exception as exc:
        logger.debug("ECB %s: %s", key, exc)
        return {}

    # Parse SDMX-JSON
    try:
        data_sets = j["dataSets"][0]
        series = list(data_sets["series"].values())[0]
        observations: dict = series["observations"]
        dims = j["structure"]["dimensions"]["observation"]
        time_dim = next(d for d in dims if d["id"] == "TIME_PERIOD")
        time_values = time_dim["values"]
        out: dict[date, float] = {}
        for k, v in observations.items():
            idx = int(k.split(":")[0])
            time_str = time_values[idx]["id"]
            try:
                ref = date.fromisoformat(time_str + "-01") if len(time_str) == 7 else date.fromisoformat(time_str)
            except Exception:
                continue
            value = v[0]
            if value is None:
                continue
            out[ref] = float(value)
        return out
    except Exception as exc:
        logger.debug("ECB parse %s: %s", key, exc)
        return {}


class BCEConnector(RiskV2Connector):
    source_id = "bce_spreads"

    def fetch(self) -> list[RawValue]:
        es = _fetch_series(SERIES_ES)
        de = _fetch_series(SERIES_DE)
        if not es or not de:
            return []
        out: list[RawValue] = []
        for ref, es_v in es.items():
            de_v = de.get(ref)
            if de_v is None:
                continue
            spread_bp = (es_v - de_v) * 100  # to basis points
            out.append(RawValue(
                source_id=self.source_id, country_iso2="ES",
                metric_name="spread_es_de_10y",
                metric_value=float(spread_bp), reference_date=ref,
            ))
        return out
