"""SEC EDGAR Full-Text Search · https://efts.sec.gov/LATEST/search-index

Sin key, gratuito. Útil para Politeia:
  - Declaraciones regulatorias de empresas cotizadas USA con filiales españolas
  - 10-K, 10-Q, 8-K, S-1, Schedule 13D/G (>5% holdings)
  - Detectar inversiones de fondos USA en empresas españolas

Ejemplos:
  search('"Telefonica" AND "Spain"')
  search('"Inditex"', forms=['10-K', '13D'])
  company_filings('TEF', limit=10)  · Telefónica ADR
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index"
EDGAR_DATA = "https://data.sec.gov"
DEFAULT_TIMEOUT_S = 15
USER_AGENT = "Politeia-Analitica/1.0 (oscarmonte3@gmail.com)"

_cache: dict[tuple, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=6)


def is_available() -> bool:
    return True


def _cache_get(key: tuple) -> Any | None:
    e = _cache.get(key)
    if not e: return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: tuple, payload: Any) -> None:
    _cache[key] = (datetime.now(timezone.utc) + _CACHE_TTL, payload)


def search(
    query_text: str,
    forms: list[str] | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Full-text search · cualquier texto en cualquier filing.

    Args:
        query_text · ej. '"Banco Santander" AND "subsidiary"'
        forms      · lista de tipos · ['10-K', '10-Q', '8-K', 'SC 13D']
        date_from  · 'YYYY-MM-DD'
        date_to    · 'YYYY-MM-DD'
    """
    cache_key = (query_text, tuple(forms or []), date_from, date_to, limit)
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        import httpx
    except ImportError:
        return []
    params: dict[str, Any] = {"q": query_text, "from": 0, "to": limit - 1}
    if forms:
        params["forms"] = ",".join(forms)
    if date_from:
        params["dateRange"] = "custom"
        params["startdt"] = date_from
    if date_to:
        params["enddt"] = date_to
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(EDGAR_SEARCH, params=params, headers={"User-Agent": USER_AGENT})
        r.raise_for_status()
        hits = r.json().get("hits", {}).get("hits", [])
        results = [
            {
                "id": h.get("_id"),
                "form": h.get("_source", {}).get("form"),
                "company": h.get("_source", {}).get("display_names", ["?"])[0],
                "cik": h.get("_source", {}).get("ciks", [None])[0],
                "filed_at": h.get("_source", {}).get("file_date"),
                "title": h.get("_source", {}).get("forms", [None])[0],
                "doc_url": f"https://www.sec.gov/Archives/edgar/data/{h.get('_source', {}).get('ciks', [''])[0]}/{h.get('_source', {}).get('adsh', '').replace('-', '')}/{h.get('_id', '').split(':')[-1] if ':' in (h.get('_id') or '') else ''}",
            }
            for h in hits
        ]
        _cache_set(cache_key, results)
        return results
    except Exception as exc:
        logger.debug("SEC EDGAR search falló: %s", exc)
        return []


def company_filings(ticker_or_cik: str, limit: int = 20) -> list[dict[str, Any]]:
    """Filings recientes de una empresa por ticker o CIK.

    Args:
        ticker_or_cik · ej. 'TEF' (Telefónica ADR) o '0000891478' (CIK 10-digit)
    """
    try:
        import httpx
    except ImportError:
        return []
    cik = ticker_or_cik.zfill(10) if ticker_or_cik.isdigit() else None
    if not cik:
        # Resolve ticker → CIK
        try:
            with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
                r = cx.get(
                    "https://www.sec.gov/cgi-bin/browse-edgar",
                    params={"action": "getcompany", "company": ticker_or_cik,
                            "type": "", "dateb": "", "owner": "include", "count": "10"},
                    headers={"User-Agent": USER_AGENT},
                )
            # Esta página devuelve HTML; preferimos la versión JSON via tickers.json
            r2 = cx.get(
                "https://www.sec.gov/files/company_tickers.json",
                headers={"User-Agent": USER_AGENT},
            )
            r2.raise_for_status()
            tickers = r2.json()
            for k, v in tickers.items():
                if str(v.get("ticker", "")).upper() == ticker_or_cik.upper():
                    cik = str(v["cik_str"]).zfill(10)
                    break
        except Exception:
            cik = None
    if not cik:
        return []

    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(
                f"{EDGAR_DATA}/submissions/CIK{cik}.json",
                headers={"User-Agent": USER_AGENT},
            )
        r.raise_for_status()
        recent = r.json().get("filings", {}).get("recent", {})
        forms = recent.get("form", [])[:limit]
        dates = recent.get("filingDate", [])[:limit]
        accs = recent.get("accessionNumber", [])[:limit]
        return [
            {"form": f, "filed_at": d, "accession": a, "cik": cik}
            for f, d, a in zip(forms, dates, accs)
        ]
    except Exception as exc:
        logger.debug("SEC EDGAR submissions falló: %s", exc)
        return []


__all__ = ["is_available", "search", "company_filings"]
