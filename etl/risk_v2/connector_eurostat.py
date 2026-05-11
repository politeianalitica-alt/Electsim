"""
Eurostat — tasa de paro mensual y otros indicadores macro.

REST API público: https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/

Dataset: une_rt_m (unemployment rate, monthly)
Pais: ES, FR, IT, DE, PT, GB

Métrica: unemployment_rate
"""
from __future__ import annotations

import logging
from datetime import date

from .base import RawValue, RiskV2Connector

logger = logging.getLogger(__name__)

EUROSTAT_URL = (
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
    "une_rt_m?format=JSON&lang=EN"
    "&geo={geo}&s_adj=SA&unit=PC_ACT&sex=T&age=TOTAL"
    "&lastTimePeriod=48"
)
COUNTRIES = ["ES", "FR", "IT", "DE", "PT", "GB"]


class EurostatConnector(RiskV2Connector):
    source_id = "eurostat"

    def fetch(self) -> list[RawValue]:
        try:
            import httpx
        except ImportError:
            return []
        out: list[RawValue] = []
        for iso2 in COUNTRIES:
            url = EUROSTAT_URL.format(geo=iso2)
            try:
                r = httpx.get(url, timeout=20)
                if not r.is_success:
                    continue
                j = r.json()
                # Eurostat JSON-stat: dimension.time.category.index gives month → idx
                time_cat = j["dimension"]["time"]["category"]
                idx_to_label = {v: k for k, v in time_cat["index"].items()}
                values = j["value"]  # str(idx) → float
                for idx_str, val in values.items():
                    if val is None:
                        continue
                    try:
                        label = idx_to_label[int(idx_str)]  # 'YYYY-MM'
                        ref = date.fromisoformat(label + "-01") if len(label) == 7 else date.fromisoformat(label)
                        out.append(RawValue(
                            source_id=self.source_id, country_iso2=iso2,
                            metric_name="unemployment_rate",
                            metric_value=float(val), reference_date=ref,
                        ))
                    except Exception:
                        continue
            except Exception as exc:
                logger.debug("Eurostat %s: %s", iso2, exc)
                continue
        return out
