"""Open Contracting Data Standard · https://www.open-contracting.org

Estándar mundial para licitaciones públicas. Múltiples portales nacionales
publican en OCDS. Use cases:
  - Comparar prácticas de contratación pública entre países
  - Detectar patrones de concentración de adjudicaciones
  - Identificar empresas favorecidas en múltiples jurisdicciones

Endpoints OCDS conocidos:
  - Mexico         · https://api-publica.compranet.hacienda.gob.mx
  - UK             · https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS
  - Colombia       · https://www.colombiacompra.gov.co/transparencia/api
  - Ukraine        · https://api.prozorro.ua/api/2.5
  - EU (TED)       · ya integrado en etl/sources/contratos/ted_eu_connector.py
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

OCDS_PORTALS = {
    "uk": "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS",
    "mx": "https://api-publica.compranet.hacienda.gob.mx",
    "co": "https://www.colombiacompra.gov.co/transparencia/api",
    "ua": "https://api.prozorro.ua/api/2.5",
}
DEFAULT_TIMEOUT_S = 20

_cache: dict[tuple, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=6)


def is_available() -> bool:
    return True  # endpoints públicos OCDS


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


def list_portals() -> list[dict[str, str]]:
    """Portales OCDS soportados."""
    return [
        {"country": code.upper(), "url": url}
        for code, url in OCDS_PORTALS.items()
    ]


def releases_uk(limit: int = 50) -> list[dict[str, Any]]:
    """Notificaciones publicadas UK contractsfinder · ejemplo de fetch OCDS."""
    cache_key = ("uk", "releases", limit)
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    try:
        import httpx
    except ImportError:
        return []
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(
                f"{OCDS_PORTALS['uk']}/releases.json",
                params={"limit": limit},
                headers={"Accept": "application/json"},
            )
        r.raise_for_status()
        releases = r.json().get("releases", [])
        _cache_set(cache_key, releases)
        return releases
    except Exception as exc:
        logger.debug("OCDS UK releases falló: %s", exc)
        return []


__all__ = ["is_available", "list_portals", "releases_uk", "OCDS_PORTALS"]
