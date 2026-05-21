"""GIE AGSI+ · niveles de gas en almacenamiento Europa.

https://agsi.gie.eu/api · sin auth pública (requiere registro gratuito en
algunos casos, devolución JSON anónima permite consultas básicas).

Útil para tracking de seguridad energética (España, Italia, Alemania).
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

AGSI_BASE = "https://agsi.gie.eu/api"


def _http_get(params: dict[str, Any], timeout: float = 20.0) -> Any | None:
    headers: dict[str, str] = {"Accept": "application/json"}
    api_key = os.environ.get("GIE_API_KEY", "").strip()
    if api_key:
        headers["x-key"] = api_key
    try:
        try:
            import httpx
            with httpx.Client(timeout=timeout, follow_redirects=True) as c:
                resp = c.get(AGSI_BASE, params=params, headers=headers)
                resp.raise_for_status()
                return resp.json()
        except ImportError:
            import requests  # type: ignore[import-not-found]
            resp = requests.get(AGSI_BASE, params=params, timeout=timeout, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("agsi fetch failed: %s", exc)
        return None


def storage_by_country(country_iso2: str, date_iso: str | None = None) -> list[dict[str, Any]]:
    """Series gas storage por país (ej. 'ES', 'DE', 'IT')."""
    params: dict[str, Any] = {"country": country_iso2.upper()}
    if date_iso:
        params["date"] = date_iso
    data = _http_get(params)
    if not isinstance(data, dict):
        return []
    return data.get("data") or []


def eu_storage_summary() -> dict[str, Any]:
    """Snapshot agregado EU · % full por país (último dato disponible)."""
    today = datetime.now(timezone.utc).date().isoformat()
    out: list[dict[str, Any]] = []
    for iso2 in ("ES", "DE", "FR", "IT", "NL", "AT", "BE", "PL", "CZ", "PT"):
        rows = storage_by_country(iso2, date_iso=today)
        if not rows:
            continue
        row = rows[0] if isinstance(rows, list) else rows
        out.append({
            "country_iso": iso2,
            "full_pct": row.get("full") or row.get("gasInStorage"),
            "trend": row.get("trend"),
            "gas_in_storage_twh": row.get("gasInStorage"),
            "withdrawal": row.get("withdrawal"),
            "injection": row.get("injection"),
            "date": row.get("gasDayStart") or today,
        })
    return {"n_items": len(out), "items": out}


def is_available() -> bool:
    return bool(storage_by_country("ES"))


__all__ = ["storage_by_country", "eu_storage_summary", "is_available", "AGSI_BASE"]
