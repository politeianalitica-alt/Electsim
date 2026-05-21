"""Brain tools · 10 conectores globales (Sprint 3).

Expone los clientes de etl/sources/global_intel/ al Brain LLM para que pueda
responder preguntas de investigación cruzando múltiples fuentes.

Tools registradas:
  wikidata_lookup(name)           · resuelve persona/empresa → QID + descripción
  wikidata_politicians(country)    · políticos vivos del país (default ES)
  wikidata_board(company_qid)      · consejo de administración
  sec_edgar_search(query)          · full-text SEC filings
  sec_edgar_company(ticker)        · filings recientes de empresa
  owid_indicator(indicator, country) · serie macro OWID
  fred_macro_snapshot()            · 10 KPIs macro USA
  alpha_vantage_quote(symbol)      · precio acción/ETF
  iati_spain_overview()            · cooperación internacional España
  bris_company(name, country)      · registro mercantil UE
  newsapi_search(q, language)      · búsqueda noticias

Todas degradan: sin key/sin red → {error: ..., items: []} sin levantar.
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Wikidata · grafo de actores
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("wikidata_lookup")
def wikidata_lookup(name: str, limit: int = 5) -> dict[str, Any]:
    """Búsqueda fuzzy de entidades en Wikidata · resuelve nombre → QID.

    Args:
        name: 'Pedro Sánchez', 'Banco Santander', 'Repsol', ...
        limit: máximo 10
    """
    try:
        from etl.sources.global_intel.wikidata_sparql import search_entity
        items = search_entity(name, limit=min(limit, 10))
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        logger.debug("wikidata_lookup falló: %s", exc)
        return {"error": str(exc), "n_items": 0, "items": []}


@ToolRegistry.register("wikidata_politicians")
def wikidata_politicians(country_qid: str = "Q29", limit: int = 50) -> dict[str, Any]:
    """Políticos vivos del país en Wikidata.

    Args:
        country_qid: 'Q29' España, 'Q142' Francia, 'Q183' Alemania, 'Q145' UK
    """
    try:
        from etl.sources.global_intel.wikidata_sparql import politicians_by_country
        items = politicians_by_country(country_qid, limit=min(limit, 200))
        return {"n_items": len(items), "country_qid": country_qid, "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


@ToolRegistry.register("wikidata_board")
def wikidata_board(company_qid: str) -> dict[str, Any]:
    """Consejo de administración de una empresa (Wikidata QID).

    Ej: Q4729345 Banco Santander, Q1378254 Repsol.
    """
    try:
        from etl.sources.global_intel.wikidata_sparql import board_members
        items = board_members(company_qid)
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


# ─────────────────────────────────────────────────────────────────
# SEC EDGAR · filings empresas USA
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("sec_edgar_search")
def sec_edgar_search(query: str, limit: int = 10) -> dict[str, Any]:
    """Full-text search en SEC EDGAR · filings USA.

    Args:
        query: ej. '"Telefonica" AND "Spain"', '"Banco Santander"'
    """
    try:
        from etl.sources.global_intel.sec_edgar import search
        items = search(query, limit=min(limit, 50))
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


@ToolRegistry.register("sec_edgar_company")
def sec_edgar_company(ticker_or_cik: str, limit: int = 10) -> dict[str, Any]:
    """Filings recientes de empresa USA por ticker o CIK."""
    try:
        from etl.sources.global_intel.sec_edgar import company_filings
        items = company_filings(ticker_or_cik, limit=min(limit, 30))
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


# ─────────────────────────────────────────────────────────────────
# OWID · 3000+ datasets desarrollo/salud/democracia
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("owid_indicator")
def owid_indicator(indicator: str = "hdi", country: str = "Spain") -> dict[str, Any]:
    """Serie temporal Our World in Data.

    Args:
        indicator: 'hdi', 'life_expectancy', 'democracy_index', 'gdp_per_capita',
                   'corruption_perception', 'press_freedom', 'gov_spending_gdp',
                   'internet_users', 'co2_emissions_per_capita', 'income_inequality'
        country: 'Spain', 'European Union', 'United States', ...
    """
    try:
        from etl.sources.global_intel.our_world_in_data import get_indicator, POPULAR_CHARTS
        rows = get_indicator(indicator, country)
        return {
            "indicator": indicator,
            "country": country,
            "n_rows": len(rows),
            "rows": rows[-20:] if len(rows) > 20 else rows,  # últimos 20
            "available_indicators": list(POPULAR_CHARTS.keys()),
        }
    except Exception as exc:
        return {"error": str(exc), "indicator": indicator, "n_rows": 0, "rows": []}


# ─────────────────────────────────────────────────────────────────
# FRED · macro USA del Fed
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("fred_macro_snapshot")
def fred_macro_snapshot() -> dict[str, Any]:
    """Snapshot 10 indicadores macro USA top (GDP, paro, Fed funds, Treasury, VIX…)."""
    try:
        from etl.sources.markets.fred_client import macro_snapshot
        items = macro_snapshot()
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


@ToolRegistry.register("fred_series")
def fred_series(series_id: str, limit: int = 50) -> dict[str, Any]:
    """Serie temporal FRED por ID · ej. 'GDP', 'CPIAUCSL', 'UNRATE', 'DGS10'."""
    try:
        from etl.sources.markets.fred_client import series_observations, series_metadata
        obs = series_observations(series_id, limit=limit, sort_order="desc")
        meta = series_metadata(series_id)
        return {
            "series_id": series_id,
            "title": meta.get("title") if meta else None,
            "units": meta.get("units_short") if meta else None,
            "frequency": meta.get("frequency_short") if meta else None,
            "n_obs": len(obs),
            "observations": obs,
        }
    except Exception as exc:
        return {"error": str(exc), "series_id": series_id, "n_obs": 0}


# ─────────────────────────────────────────────────────────────────
# Alpha Vantage · quote stocks
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("alpha_vantage_quote")
def alpha_vantage_quote(symbol: str) -> dict[str, Any]:
    """Quote actual de un ticker · stocks, ETFs, ADRs.

    Args:
        symbol: 'AAPL', 'MSFT', 'TEF' (Telefónica ADR), 'BBVA', 'IBE.MC'
    """
    try:
        from etl.sources.markets.alpha_vantage_client import quote
        q = quote(symbol)
        if q is None:
            return {"error": "no quote (rate limit o ticker desconocido)", "symbol": symbol}
        return q
    except Exception as exc:
        return {"error": str(exc), "symbol": symbol}


# ─────────────────────────────────────────────────────────────────
# IATI · cooperación internacional
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("iati_spain_orgs")
def iati_spain_orgs() -> dict[str, Any]:
    """Snapshot organizaciones españolas top en IATI (AECID, ACF, Cruz Roja…).

    Cuenta actividades de cooperación de cada ONG/agencia · datos en vivo.
    """
    try:
        from etl.sources.global_intel.iati_client import SPANISH_ORGS, _request
        out = []
        for slug, (ref, name) in SPANISH_ORGS.items():
            count_q = _request(
                "/activity/select",
                {"q": f'reporting_org_ref:"{ref}"', "rows": 0},
            )
            n = count_q.get("response", {}).get("numFound", 0)
            out.append({
                "slug": slug,
                "iati_ref": ref,
                "name": name,
                "n_activities": n,
            })
        return {"n_orgs": len(out), "orgs": out}
    except Exception as exc:
        return {"error": str(exc), "n_orgs": 0, "orgs": []}


@ToolRegistry.register("iati_country_aid")
def iati_country_aid(country_iso2: str, limit: int = 20) -> dict[str, Any]:
    """Actividades de cooperación cuyo beneficiario es un país concreto (ISO-2).

    Ej: 'UA' Ucrania, 'MA' Marruecos, 'HT' Haití, 'CO' Colombia
    """
    try:
        from etl.sources.global_intel.iati_client import activities_to_country
        items = activities_to_country(country_iso2, rows=min(limit, 50))
        return {"n_items": len(items), "country": country_iso2.upper(), "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


# ─────────────────────────────────────────────────────────────────
# BRIS · registros mercantiles UE
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("bris_company")
def bris_company(name: str, country: str | None = None, limit: int = 10) -> dict[str, Any]:
    """Búsqueda en 27 registros mercantiles UE.

    Args:
        name: razón social parcial (ej. 'Iberdrola', 'Banco Santander')
        country: ISO-2 (ES, DE, FR, ...) opcional
    """
    try:
        from etl.sources.global_intel.bris_corporate import search_company
        items = search_company(name, country=country, limit=limit)
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


# ─────────────────────────────────────────────────────────────────
# News
# ─────────────────────────────────────────────────────────────────

@ToolRegistry.register("finnhub_quote")
def finnhub_quote(symbol: str) -> dict[str, Any]:
    """Cotización actual de un ticker · US stocks + ADRs + crypto.

    Args:
        symbol: 'SAN' (Santander ADR), 'BBVA', 'TEF' (Telefónica),
                'AAPL', 'TSLA', 'BINANCE:BTCUSDT', etc.
    """
    try:
        from etl.sources.global_intel.finnhub_client import quote
        q = quote(symbol)
        if q is None:
            return {"error": "no quote", "symbol": symbol}
        return q
    except Exception as exc:
        return {"error": str(exc), "symbol": symbol}


@ToolRegistry.register("finnhub_company_profile")
def finnhub_company_profile(symbol: str) -> dict[str, Any]:
    """Perfil empresarial · sector, IPO, employees, market cap."""
    try:
        from etl.sources.global_intel.finnhub_client import profile
        p = profile(symbol)
        if p is None:
            return {"error": "no profile", "symbol": symbol}
        return p
    except Exception as exc:
        return {"error": str(exc), "symbol": symbol}


@ToolRegistry.register("finnhub_dashboard_snapshot")
def finnhub_dashboard_snapshot() -> dict[str, Any]:
    """Snapshot multi-categoría · ADRs ES (SAN, BBVA, TEF, FER) + US tech +
    EU large caps + crypto en una sola llamada agregada.
    """
    try:
        from etl.sources.global_intel.finnhub_client import dashboard_snapshot
        return dashboard_snapshot()
    except Exception as exc:
        return {"error": str(exc)}


@ToolRegistry.register("newsapi_search")
def newsapi_search(q: str, language: str = "es", limit: int = 15) -> dict[str, Any]:
    """Búsqueda full-text en NewsAPI (≤30 días de archivo)."""
    try:
        from etl.sources.news.newsapi_client import everything
        items = everything(q, language=language, page_size=limit)
        return {"n_items": len(items), "items": items}
    except Exception as exc:
        return {"error": str(exc), "n_items": 0, "items": []}


__all__ = [
    "wikidata_lookup",
    "wikidata_politicians",
    "wikidata_board",
    "sec_edgar_search",
    "sec_edgar_company",
    "owid_indicator",
    "fred_macro_snapshot",
    "fred_series",
    "alpha_vantage_quote",
    "iati_spain_orgs",
    "iati_country_aid",
    "bris_company",
    "newsapi_search",
    "finnhub_quote",
    "finnhub_company_profile",
    "finnhub_dashboard_snapshot",
]
