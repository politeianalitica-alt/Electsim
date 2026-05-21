"""GLEIF LEI · identificadores legales corporativos.

API pública sin auth · https://api.gleif.org/api/v1/

Usado para resolver el operador real de un buque cuando solo conocemos
el nombre comercial (Maersk Line → A. P. Møller-Mærsk A/S).

Sin caché interna · usar HTTP layer del backend si se requiere.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

GLEIF_BASE = "https://api.gleif.org/api/v1"


def _http_get(url: str, params: dict[str, Any] | None = None, timeout: float = 20.0) -> dict[str, Any] | None:
    try:
        try:
            import httpx
            with httpx.Client(timeout=timeout, follow_redirects=True) as c:
                resp = c.get(url, params=params or {}, headers={"Accept": "application/vnd.api+json"})
                resp.raise_for_status()
                return resp.json()
        except ImportError:
            import requests  # type: ignore[import-not-found]
            resp = requests.get(url, params=params or {}, timeout=timeout,
                                headers={"Accept": "application/vnd.api+json"})
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:
        logger.warning("gleif fetch failed %s: %s", url, exc)
        return None


def search_entity(name: str, limit: int = 5) -> list[dict[str, Any]]:
    """Busca empresas por nombre legal (substring match server-side)."""
    if not (name or "").strip():
        return []
    data = _http_get(
        f"{GLEIF_BASE}/lei-records",
        params={
            "filter[entity.legalName]": name,
            "page[size]": limit,
        },
    )
    if not data or not isinstance(data.get("data"), list):
        return []
    out: list[dict[str, Any]] = []
    for rec in data["data"]:
        attrs = rec.get("attributes") or {}
        entity = attrs.get("entity") or {}
        legal_name = (entity.get("legalName") or {}).get("name") or ""
        out.append({
            "lei": rec.get("id"),
            "legal_name": legal_name,
            "status": entity.get("status"),
            "jurisdiction": entity.get("jurisdiction"),
            "registration_authority_id": (entity.get("registeredAt") or {}).get("id"),
            "legal_address": entity.get("legalAddress"),
        })
    return out


def get_lei(lei: str) -> dict[str, Any] | None:
    data = _http_get(f"{GLEIF_BASE}/lei-records/{lei}")
    if not data:
        return None
    rec = data.get("data") or {}
    attrs = rec.get("attributes") or {}
    entity = attrs.get("entity") or {}
    return {
        "lei": rec.get("id"),
        "legal_name": (entity.get("legalName") or {}).get("name"),
        "status": entity.get("status"),
        "jurisdiction": entity.get("jurisdiction"),
        "legal_address": entity.get("legalAddress"),
        "registration_authority": entity.get("registeredAt"),
    }


def get_ultimate_parent(lei: str) -> dict[str, Any] | None:
    """Devuelve el ultimate parent corporativo si está declarado."""
    data = _http_get(f"{GLEIF_BASE}/lei-records/{lei}/ultimate-parent")
    if not data:
        return None
    rec = data.get("data") or {}
    if not rec:
        return None
    attrs = rec.get("attributes") or {}
    entity = attrs.get("entity") or {}
    return {
        "lei": rec.get("id"),
        "legal_name": (entity.get("legalName") or {}).get("name"),
        "jurisdiction": entity.get("jurisdiction"),
    }


def is_available() -> bool:
    """Chequeo barato · 1 petición light al endpoint root."""
    res = _http_get(f"{GLEIF_BASE}/lei-records", params={"page[size]": 1})
    return bool(res)


__all__ = ["search_entity", "get_lei", "get_ultimate_parent", "is_available", "GLEIF_BASE"]
