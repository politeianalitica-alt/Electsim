"""Conector Eurostat en modo demo."""

from __future__ import annotations

from datetime import datetime
from typing import List


_DEMO_EU = {
    "ES": {
        "gdp_growth_eu": 1.9,
        "inflation_eu": 3.2,
        "unemployment_eu": 11.6,
    },
    "DE": {
        "gdp_growth_eu": 0.6,
        "inflation_eu": 2.4,
        "unemployment_eu": 5.7,
    },
    "FR": {
        "gdp_growth_eu": 0.8,
        "inflation_eu": 2.6,
        "unemployment_eu": 7.4,
    },
    "IT": {
        "gdp_growth_eu": 0.7,
        "inflation_eu": 1.9,
        "unemployment_eu": 7.1,
    },
    "EU": {
        "gdp_growth_eu": 1.1,
        "inflation_eu": 2.5,
        "unemployment_eu": 6.4,
    },
}


def fetch_eu_indicators(country: str = "ES") -> List[dict]:
    """Devuelve los indicadores EU clave para un país."""

    code = country.upper()
    base = _DEMO_EU.get(code, _DEMO_EU["ES"])
    eu_avg = _DEMO_EU["EU"]
    now = datetime.utcnow().isoformat()
    out: List[dict] = []
    for indicator, value in base.items():
        out.append(
            {
                "indicator": indicator,
                "country": code,
                "value": value,
                "eu_avg": eu_avg.get(indicator),
                "period": "2026-Q1",
                "source": "Eurostat",
                "updated_at": now,
            }
        )
    return out


def fetch_country_comparisons(indicator: str, countries: List[str]) -> dict:
    """Devuelve la comparación de un indicador entre países."""

    out: dict = {"indicator": indicator, "values": {}, "eu_avg": None}
    for c in countries:
        c_up = c.upper()
        out["values"][c_up] = _DEMO_EU.get(c_up, {}).get(indicator)
    out["eu_avg"] = _DEMO_EU["EU"].get(indicator)
    return out


__all__ = ["fetch_eu_indicators", "fetch_country_comparisons"]
