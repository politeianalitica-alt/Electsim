"""NewsAPI client · https://newsapi.org

Free tier:
  - 100 requests / día
  - Histórico limitado (≤ 30 días en developer tier)
  - top-headlines, everything, sources

Uso en Politeia:
  - Complemento a RSS feeds curados (etl/sources/media/rss_client.py) ·
    cubre medios anglosajones top, finance, business.
  - Input para detección de narrativas en `/ataques-narrativos` y
    `/medios-narrativa` cuando el sector tracking no tiene RSS propio.
  - Brain tool `news_global_search(query, lang)` para investigaciones.

Estrategia falla-cerrado:
  - Sin `NEWSAPI_KEY` → devuelve [] y loguea warning · no rompe pipelines.
  - HTTP 429 (rate limit) → cache TTL 1h evita martillarlo.
  - Errores de red → catch + log debug, devuelve [].
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

NEWSAPI_BASE = "https://newsapi.org/v2"
DEFAULT_TIMEOUT_S = 12

# Cache en memoria · (path, params_tuple) → (expires_at, payload)
_cache: dict[tuple, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=1)


def is_available() -> bool:
    """¿Hay NEWSAPI_KEY configurada?"""
    return bool(os.environ.get("NEWSAPI_KEY"))


def _cache_get(key: tuple) -> Any | None:
    entry = _cache.get(key)
    if not entry:
        return None
    expires_at, payload = entry
    if datetime.now(timezone.utc) >= expires_at:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: tuple, payload: Any) -> None:
    _cache[key] = (datetime.now(timezone.utc) + _CACHE_TTL, payload)


def _request(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """GET autenticado a NewsAPI con cache + falla-cerrado."""
    if not is_available():
        logger.warning("NEWSAPI_KEY no configurada · saltando %s", path)
        return {"status": "missing_key", "articles": [], "totalResults": 0}

    cache_key = (path, tuple(sorted(params.items())))
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        import httpx
    except ImportError:
        return {"status": "missing_httpx", "articles": [], "totalResults": 0}

    try:
        # Header `X-Api-Key` es más limpio que `?apiKey=` (no aparece en logs)
        headers = {"X-Api-Key": os.environ["NEWSAPI_KEY"]}
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{NEWSAPI_BASE}{path}", params=params, headers=headers)
        if r.status_code == 429:
            logger.warning("NewsAPI rate-limited (429) · usa cache 1h o reduce req")
            return {"status": "rate_limited", "articles": [], "totalResults": 0}
        r.raise_for_status()
        payload = r.json()
        _cache_set(cache_key, payload)
        return payload
    except Exception as exc:
        logger.debug("NewsAPI %s falló: %s", path, exc)
        return {"status": "error", "articles": [], "totalResults": 0,
                "error": str(exc)[:160]}


def top_headlines(
    country: str | None = None,
    category: str | None = None,
    sources: str | None = None,
    q: str | None = None,
    page_size: int = 20,
) -> list[dict[str, Any]]:
    """Headlines top en tiempo casi-real (15 min lag típico).

    Params (NewsAPI):
      country  · ISO2 ('es','us','gb',...). Mutex con `sources`.
      category · business|entertainment|general|health|science|sports|technology
      sources  · csv de source IDs (mutex con country+category)
      q        · keyword en título
    """
    params: dict[str, Any] = {"pageSize": page_size}
    if sources:
        params["sources"] = sources
    else:
        if country:
            params["country"] = country
        if category:
            params["category"] = category
    if q:
        params["q"] = q
    payload = _request("/top-headlines", params)
    return list(payload.get("articles", []))


def everything(
    q: str,
    language: str = "es",
    from_: str | None = None,
    to: str | None = None,
    sort_by: str = "publishedAt",
    page_size: int = 20,
    domains: str | None = None,
) -> list[dict[str, Any]]:
    """Búsqueda full-text en archivo (≤ 30 días en developer).

    sort_by ∈ {'relevancy', 'popularity', 'publishedAt'}
    """
    params: dict[str, Any] = {
        "q": q,
        "language": language,
        "sortBy": sort_by,
        "pageSize": page_size,
    }
    if from_:
        params["from"] = from_
    if to:
        params["to"] = to
    if domains:
        params["domains"] = domains
    payload = _request("/everything", params)
    return list(payload.get("articles", []))


def list_sources(category: str | None = None, country: str | None = None) -> list[dict[str, Any]]:
    """Catálogo de fuentes disponibles · útil para configurar sources= en top_headlines."""
    params: dict[str, Any] = {}
    if category:
        params["category"] = category
    if country:
        params["country"] = country
    payload = _request("/top-headlines/sources", params)
    return list(payload.get("sources", []))


__all__ = ["is_available", "top_headlines", "everything", "list_sources"]
