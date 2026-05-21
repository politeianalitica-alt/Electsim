"""BRIS · Business Registers Interconnection System (EU corporate registry).

https://e-justice.europa.eu/content_business_registers-104-en.do
Mirror público vía openbris.eu/api/v1

Cubre 27 registros mercantiles UE + UK · interconectados desde 2017.
Use cases en Politeia:
  - Resolver empresas españolas vs filiales europeas
  - Identificar beneficial owners cross-border
  - Detectar incorporaciones en jurisdicciones de baja regulación
  - Complementa GLEIF + OpenCorporates
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

BRIS_BASE = "https://openbris.eu/api/v1"
DEFAULT_TIMEOUT_S = 15
USER_AGENT = "Politeia-Analitica/1.0"

_cache: dict[tuple, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=12)


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


def _get(path: str, params: dict[str, Any] | None = None) -> Any:
    cache_key = (path, tuple(sorted((params or {}).items())))
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        import httpx
    except ImportError:
        return None
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{BRIS_BASE}{path}", params=params or {},
                       headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        r.raise_for_status()
        payload = r.json()
        _cache_set(cache_key, payload)
        return payload
    except Exception as exc:
        logger.debug("BRIS %s falló: %s", path, exc)
        return None


def search_company(name: str, country: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    """Búsqueda en los 27 registros UE.

    Args:
        name    · razón social o parcial
        country · ISO2 (ES, DE, FR, ...) opcional
    """
    params: dict[str, Any] = {"q": name, "limit": limit}
    if country:
        params["country"] = country.upper()
    payload = _get("/companies/search", params)
    if not payload:
        return []
    return list(payload.get("results") or payload.get("companies") or [])


def company_detail(country: str, registry_id: str) -> dict[str, Any] | None:
    """Detalle de una empresa por (país, ID del registro mercantil)."""
    payload = _get(f"/companies/{country.upper()}/{registry_id}")
    return payload if isinstance(payload, dict) else None


__all__ = ["is_available", "search_company", "company_detail"]
