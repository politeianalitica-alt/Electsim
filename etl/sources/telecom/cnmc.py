"""Conector CNMC telecom · Sprint 12 · S12.1.

> **Sprint 12 · S12.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 12 · Telecom`)

CNMC (Comisión Nacional de los Mercados y la Competencia) regula telecom en
España. Publica:

  - Resoluciones + sanciones · sala de prensa
  - Notas de prensa RSS
  - Trimestral data hub · cuotas, KPIs banda ancha, móvil, fibra

Feed RSS oficial: https://www.cnmc.es/prensa/feed

Cliente sin auth, falla cerrado (timeout 15s → []).
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_CNMC_NEWS_RSS = "https://www.cnmc.es/prensa/feed"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 CNMC-Monitor (+https://politeia-analitica.es)"

# Palabras clave para filtrar el feed CNMC (que es multi-sector) hacia telecom
_TELECOM_KEYWORDS = (
    "telecom", "telefonía", "móvil", "banda ancha", "fibra",
    "5G", "espectro", "interconexión", "roaming", "espectro radioeléctrico",
    "frecuencias", "operador", "Movistar", "Vodafone", "Orange",
    "MasMovil", "MásOrange", "MásMóvil", "Digi", "DGT-N", "TUSO",
)


class CNMCTelecomClient:
    """Cliente RSS para CNMC (filtrado a telecom)."""

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "application/rss+xml, application/xml, */*",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("CNMCTelecomClient: requests no disponible · degradado")

    def fetch_news(self) -> list[dict[str, Any]]:
        """Descarga feed RSS de CNMC."""
        if self._session is None:
            return []
        try:
            r = self._session.get(_CNMC_NEWS_RSS, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text)
        except Exception as exc:
            logger.warning("CNMC feed · %s", exc)
            return []

    def filter_telecom(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Filtra items por keywords telecom."""
        kw_lower = [k.lower() for k in _TELECOM_KEYWORDS]
        out: list[dict[str, Any]] = []
        for it in items:
            blob = (it.get("title", "") + " " + it.get("description", "")).lower()
            if any(k in blob for k in kw_lower):
                out.append(it)
        return out

    @staticmethod
    def _parse_rss(xml_text: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        try:
            from xml.etree import ElementTree as ET
            root = ET.fromstring(xml_text)
            for item in root.iter("item"):
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                desc = (item.findtext("description") or "").strip()
                pub = (item.findtext("pubDate") or "").strip()
                guid = (item.findtext("guid") or link).strip()
                pub_dt = _parse_rfc822(pub) or datetime.now(timezone.utc)
                items.append({
                    "id": guid,
                    "title": title,
                    "link": link,
                    "description": desc,
                    "pub_date": pub_dt,
                })
        except Exception as exc:
            logger.debug("CNMC RSS parse · %s", exc)
        return items


def _parse_rfc822(s: str) -> datetime | None:
    if not s:
        return None
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(s)
    except Exception:
        return None


def to_normalized_items(max_items: int = 50, only_telecom: bool = True) -> Iterator[Any]:
    """Genera NormalizedItem desde CNMC, opcionalmente filtrando telecom."""
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = CNMCTelecomClient()
    if client._session is None:
        return

    items = client.fetch_news()
    if only_telecom:
        items = client.filter_telecom(items)

    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"cnmc|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",
                item_id=raw["id"][:512],
                title=raw["title"][:2000],
                body=raw["description"][:8000],
                summary=raw["title"][:400],
                url=raw["link"] or None,
                published_at=raw["pub_date"],
                author="CNMC",
                language="es",
                raw_hash=raw_hash,
                categories=["cnmc", "telecom", "regulador"],
                payload={},
            )
        except Exception as exc:
            logger.debug("CNMC NormalizedItem · %s", exc)


_CLIENT: CNMCTelecomClient | None = None


def get_cnmc_telecom_client() -> CNMCTelecomClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = CNMCTelecomClient()
    return _CLIENT


__all__ = ["CNMCTelecomClient", "get_cnmc_telecom_client", "to_normalized_items", "_TELECOM_KEYWORDS"]
