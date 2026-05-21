"""Our World in Data API · https://ourworldindata.org/grapher/

3000+ datasets sobre desarrollo, salud, desigualdad, democracia, clima,
economía. Sin key, ilimitado.

Cada gráfico tiene un endpoint JSON directo:
  https://ourworldindata.org/grapher/{slug}.metadata.json
  https://ourworldindata.org/grapher/{slug}.csv

Datasets útiles para Politeia (ejemplos):
  - life-expectancy           · esperanza de vida país/año
  - human-development-index   · HDI completo
  - electoral-democracy       · V-Dem democracia electoral
  - gdp-per-capita-worldbank  · PIB per cápita WB
  - corruption-perception     · CPI Transparency International
  - share-of-government-spending-of-gdp
  - press-freedom-index
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

OWID_BASE = "https://ourworldindata.org/grapher"
DEFAULT_TIMEOUT_S = 15

_cache: dict[str, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=24)


def is_available() -> bool:
    return True  # endpoint público


def _cache_get(key: str) -> Any | None:
    e = _cache.get(key)
    if not e: return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: str, payload: Any) -> None:
    _cache[key] = (datetime.now(timezone.utc) + _CACHE_TTL, payload)


def chart_metadata(slug: str) -> dict[str, Any] | None:
    """Metadata del chart · title, subtitle, source, units, dimensions."""
    cached = _cache_get(f"meta:{slug}")
    if cached is not None:
        return cached
    try:
        import httpx
    except ImportError:
        return None
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{OWID_BASE}/{slug}.metadata.json")
        r.raise_for_status()
        meta = r.json()
        _cache_set(f"meta:{slug}", meta)
        return meta
    except Exception as exc:
        logger.debug("OWID meta %s falló: %s", slug, exc)
        return None


def chart_data(slug: str, country: str | None = None) -> list[dict[str, Any]]:
    """Datos del chart · CSV parseado a lista de dicts.

    country · filtra por nombre de país (ej. 'Spain', 'European Union').
    """
    cache_key = f"data:{slug}:{country or '*'}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        import httpx, csv, io
    except ImportError:
        return []
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{OWID_BASE}/{slug}.csv")
        r.raise_for_status()
        rows = list(csv.DictReader(io.StringIO(r.text)))
        if country:
            rows = [
                row for row in rows
                if row.get("Entity", "").lower() == country.lower()
            ]
        _cache_set(cache_key, rows)
        return rows
    except Exception as exc:
        logger.debug("OWID data %s falló: %s", slug, exc)
        return []


# Charts populares · slugs verificados
POPULAR_CHARTS = {
    "life_expectancy": "life-expectancy",
    "hdi": "human-development-index",
    "democracy_index": "electoral-democracy",
    "gdp_per_capita": "gdp-per-capita-worldbank",
    "corruption_perception": "corruption-perception-index",
    "press_freedom": "press-freedom-index",
    "gov_spending_gdp": "share-of-government-spending-of-gdp",
    "internet_users": "share-of-individuals-using-the-internet",
    "co2_emissions_per_capita": "co-emissions-per-capita",
    "income_inequality": "income-inequality",
}


def get_indicator(indicator: str, country: str = "Spain") -> list[dict[str, Any]]:
    """Atajo para indicadores populares · resuelve slug y filtra país."""
    slug = POPULAR_CHARTS.get(indicator, indicator)
    return chart_data(slug, country)


__all__ = ["is_available", "chart_metadata", "chart_data", "get_indicator", "POPULAR_CHARTS"]
