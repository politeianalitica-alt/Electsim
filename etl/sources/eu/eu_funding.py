"""Conector EU Funding & Tenders Portal · Sprint 9 · S9.2.

> **Sprint 9 · S9.2** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 9 · Tercer Sector`)

EU Funding & Tenders Portal expone convocatorias activas de financiación
europea: Horizon Europe, Erasmus+, CEF, LIFE, Digital Europe, ESF+, etc.

Endpoint público (sin auth):
  https://api.tech.ec.europa.eu/search-api/prod/rest/search

Estrategia: hacer query estructurada filtrando por estado='open' + año.
Si el endpoint cambia formato o no responde → vacío con error explícito.

Falla cerrado: timeout 20s, errores → {error, calls: []}.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://api.tech.ec.europa.eu/search-api/prod/rest/search"
_API_KEY = "SEDIA"  # constante pública del Portal F&T
_TIMEOUT = 20
_USER_AGENT = "Politeia-Analitica/2.0 EU-Funding-Monitor (+https://politeia-analitica.es)"


class EUFundingClient:
    """Cliente HTTP para el Funding & Tenders Portal."""

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "application/json",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("EUFundingClient: requests no disponible · degradado")

    def search_calls(
        self,
        *,
        query: str | None = None,
        programme: str | None = None,
        status: str = "31094501",  # cod F&T para "Open"
        page_size: int = 25,
        page_number: int = 1,
    ) -> dict[str, Any]:
        """Busca calls / topics en el portal F&T.

        Args:
          query: texto libre (acrónimo, título, palabra clave).
          programme: filtro programa (ej. 'HORIZON', 'ERASMUS', 'CERV').
          status: código F&T del estado · default "Open".
          page_size / page_number: paginación.

        Returns:
          {"n_results": int, "total": int, "calls": [...], "error": str | None}
        """
        if self._session is None:
            return {"n_results": 0, "calls": [], "error": "requests no disponible"}

        params = {
            "apiKey": _API_KEY,
            "text": query or "*",
            "pageSize": min(page_size, 100),
            "pageNumber": max(1, page_number),
        }
        # Filtro avanzado tipo "Lucene" sobre type=Call y status=Open
        query_parts = ["type='1'"]  # 1 = call/topic
        if status:
            query_parts.append(f"status='{status}'")
        if programme:
            query_parts.append(f"frameworkProgramme='{programme}'")
        params["query"] = " AND ".join(query_parts)

        try:
            r = self._session.get(_SEARCH_URL, params=params, timeout=_TIMEOUT)
            r.raise_for_status()
            data = r.json()
        except Exception as exc:
            logger.warning("EU Funding search · %s", exc)
            return {"n_results": 0, "calls": [], "error": str(exc)}

        results = data.get("results") or []
        calls = [_extract_call(item) for item in results]
        return {
            "n_results": len(calls),
            "total": data.get("totalResults", len(calls)),
            "calls": [c for c in calls if c is not None],
            "error": None,
        }


def _extract_call(item: dict[str, Any]) -> dict[str, Any] | None:
    """Extrae campos relevantes de un resultado F&T."""
    try:
        meta = item.get("metadata") or {}
        get1 = lambda k: (meta.get(k) or [None])[0] if isinstance(meta.get(k), list) else meta.get(k)
        return {
            "id": item.get("reference") or get1("identifier"),
            "title": item.get("title") or get1("title"),
            "programme": get1("frameworkProgramme") or get1("programmePeriod"),
            "topic": get1("topic"),
            "status": get1("status"),
            "deadline": get1("deadlineDate"),
            "budget": get1("budgetTotalAmount"),
            "url": item.get("url"),
            "summary": (item.get("summary") or "")[:1000],
        }
    except Exception as exc:
        logger.debug("EU Funding parse call · %s", exc)
        return None


# ────────────────────────────────────────────────────────────────────
# Adapter · EU Funding → NormalizedItem
# ────────────────────────────────────────────────────────────────────

def to_normalized_items(query: str | None = None, max_items: int = 50) -> Iterator[Any]:
    """Genera NormalizedItem por cada call abierta en F&T."""
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = EUFundingClient()
    if client._session is None:
        return

    page = 1
    yielded = 0
    while yielded < max_items:
        data = client.search_calls(query=query, page_number=page, page_size=25)
        calls = data.get("calls", []) or []
        if not calls:
            break
        now = datetime.now(timezone.utc)
        for raw in calls:
            if yielded >= max_items:
                break
            try:
                raw_hash = hashlib.sha256(
                    f"eu_funding|{raw.get('id')}|{raw.get('title')}".encode("utf-8")
                ).hexdigest()
                yield NormalizedItem(
                    source="manual",  # no SourceKind dedicado para F&T
                    item_id=str(raw.get("id") or raw_hash[:16])[:512],
                    title=str(raw.get("title") or "")[:2000],
                    body=str(raw.get("summary") or "")[:8000],
                    summary=str(raw.get("summary") or raw.get("title") or "")[:400],
                    url=str(raw.get("url") or "") or None,
                    published_at=now,
                    author="EU Funding & Tenders Portal",
                    language="en",
                    raw_hash=raw_hash,
                    categories=["eu_funding", "fondos_eu", str(raw.get("programme") or "").lower()],
                    payload={
                        "programme": raw.get("programme"),
                        "topic": raw.get("topic"),
                        "deadline": raw.get("deadline"),
                        "budget": raw.get("budget"),
                    },
                )
                yielded += 1
            except Exception as exc:
                logger.debug("EU Funding NormalizedItem · %s", exc)
        page += 1


_CLIENT: EUFundingClient | None = None


def get_eu_funding_client() -> EUFundingClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = EUFundingClient()
    return _CLIENT


__all__ = ["EUFundingClient", "get_eu_funding_client", "to_normalized_items"]
