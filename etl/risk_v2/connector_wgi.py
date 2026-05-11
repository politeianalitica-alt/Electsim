"""
World Bank WGI — Worldwide Governance Indicators (annual).

REST API público sin auth: https://api.worldbank.org/v2/

Indicadores:
  - PV.EST  → political_stability      (-2.5 .. +2.5)
  - RL.EST  → rule_of_law
  - GE.EST  → gov_effectiveness
  - RQ.EST  → regulatory_quality
  - CC.EST  → control_of_corruption
  - VA.EST  → voice_and_accountability

Países objetivo: ES, FR, IT, DE, GB, PT, US, MA, DZ
"""
from __future__ import annotations

import logging
from datetime import date

from .base import RawValue, RiskV2Connector

logger = logging.getLogger(__name__)

INDICATORS = {
    "GOV_WGI_PV.EST": "political_stability",
    "GOV_WGI_RL.EST": "rule_of_law",
    "GOV_WGI_GE.EST": "gov_effectiveness",
    "GOV_WGI_RQ.EST": "regulatory_quality",
    "GOV_WGI_CC.EST": "control_of_corruption",
    "GOV_WGI_VA.EST": "voice_and_accountability",
}
COUNTRIES = ["ES", "FR", "IT", "DE", "GB", "PT", "US", "MA", "DZ"]


class WGIConnector(RiskV2Connector):
    source_id = "wgi"

    def fetch(self) -> list[RawValue]:
        try:
            import httpx
        except ImportError:
            return []
        out: list[RawValue] = []
        for iso2 in COUNTRIES:
            for code, metric in INDICATORS.items():
                url = (
                    f"https://api.worldbank.org/v2/country/{iso2}/indicator/{code}"
                    "?format=json&per_page=15&date=2010:2025"
                )
                try:
                    r = httpx.get(url, timeout=15)
                    if not r.is_success:
                        continue
                    data = r.json()
                    if not isinstance(data, list) or len(data) < 2:
                        continue
                    rows = data[1] or []
                    for row in rows:
                        v = row.get("value")
                        year = row.get("date")
                        if v is None or year is None:
                            continue
                        try:
                            ref = date(int(year), 6, 30)
                            out.append(RawValue(
                                source_id=self.source_id, country_iso2=iso2,
                                metric_name=metric,
                                metric_value=float(v), reference_date=ref,
                            ))
                        except Exception:
                            continue
                except Exception as exc:
                    logger.debug("WGI %s %s: %s", iso2, code, exc)
                    continue
        return out
