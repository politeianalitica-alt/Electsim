"""Parltrack · Tracking Parlamento Europeo · vía data.europa.eu

Bulk datasets sobre MEPs, votaciones, dossiers, comisiones, comités.
Mirror oficial · https://parltrack.org · CC-BY 4.0.

Use cases:
  - Histórico de votaciones de eurodiputados españoles
  - Tracking de dossiers legislativos UE
  - Posición de MEPs en topics clave (Green Deal, AI Act, Defensa)
  - Relaciones con grupos de interés (lobby register transparency)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

PARLTRACK_BASE = "https://parltrack.org"
DATA_EUROPA = "https://data.europa.eu/api/hub"
DEFAULT_TIMEOUT_S = 20

_cache: dict[tuple, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=12)


# Datasets bulk publicados por Parltrack
DATASETS = {
    "meps": "https://parltrack.org/dumps/ep_meps.json.lz",
    "votes": "https://parltrack.org/dumps/ep_votes.json.lz",
    "dossiers": "https://parltrack.org/dumps/ep_dossiers.json.lz",
    "amendments": "https://parltrack.org/dumps/ep_amendments.json.lz",
    "committee_amendments": "https://parltrack.org/dumps/ep_com_amendments.json.lz",
}


def is_available() -> bool:
    return True  # endpoints públicos


def list_datasets() -> list[dict[str, str]]:
    """Bulk datasets de Parltrack."""
    return [
        {"name": k, "url": v, "format": "json.lz", "license": "CC-BY 4.0"}
        for k, v in DATASETS.items()
    ]


def search_data_europa(query: str, limit: int = 10) -> list[dict[str, Any]]:
    """Búsqueda en el catálogo data.europa.eu (incluye Parltrack y más).

    Endpoint público · https://data.europa.eu/api/hub/search/
    """
    cache_key = ("data_europa", query, limit)
    if cache_key in _cache:
        exp, payload = _cache[cache_key]
        if datetime.now(timezone.utc) < exp:
            return payload
    try:
        import httpx
    except ImportError:
        return []
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(
                f"{DATA_EUROPA}/search/datasets",
                params={"q": query, "limit": limit, "facets": "[]"},
                headers={"Accept": "application/json"},
            )
        r.raise_for_status()
        items = r.json().get("result", {}).get("results", [])
        out = [
            {
                "id": it.get("id"),
                "title": (it.get("title") or {}).get("en", "") or it.get("name"),
                "description": ((it.get("description") or {}).get("en") or "")[:300],
                "publisher": ((it.get("publisher") or {}).get("name") or {}).get("en", ""),
                "url": it.get("landing_page"),
            }
            for it in items
        ]
        _cache[cache_key] = (datetime.now(timezone.utc) + _CACHE_TTL, out)
        return out
    except Exception as exc:
        logger.debug("data.europa search falló: %s", exc)
        return []


def parltrack_url(slug: str) -> str | None:
    """Resolver URL bulk de un dataset por slug."""
    return DATASETS.get(slug)


__all__ = ["is_available", "list_datasets", "search_data_europa", "parltrack_url", "DATASETS"]
