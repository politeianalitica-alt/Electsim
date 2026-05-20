"""Conector NATO · Sprint 11 · S11.1.

> **Sprint 11 · S11.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 11 · Defensa`)

NATO publica oportunidades de contratación pública (procurement) y noticias
oficiales. Cobertura básica:

  - NATO News & Speeches RSS · https://www.nato.int/cps/en/natohq/news_rss.xml
  - NSPA (NATO Support and Procurement Agency) · oportunidades industriales
  - Business with NATO · página de licitaciones

Aquí leemos el feed RSS oficial de noticias y exponemos un buscador básico
por palabra clave en títulos/resúmenes.

Falla cerrado: timeout 15s · errores → []. No requiere API key.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_NATO_NEWS_RSS = "https://www.nato.int/cps/en/natohq/news_rss.xml"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 NATO-Monitor (+https://politeia-analitica.es)"


class NATOClient:
    """Cliente RSS para news / procurement NATO."""

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
            logger.warning("NATOClient: requests no disponible · degradado")

    def fetch_news(self, url: str | None = None) -> list[dict[str, Any]]:
        """Descarga feed RSS de noticias NATO."""
        if self._session is None:
            return []
        feed_url = url or _NATO_NEWS_RSS
        try:
            r = self._session.get(feed_url, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text)
        except Exception as exc:
            logger.warning("NATO feed · %s", exc)
            return []

    def search(self, query: str, items: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
        """Búsqueda case-insensitive en title/description."""
        if items is None:
            items = self.fetch_news()
        if not query:
            return items
        ql = query.lower()
        return [
            it for it in items
            if ql in (it.get("title") or "").lower()
            or ql in (it.get("description") or "").lower()
        ]

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
            logger.debug("NATO RSS parse · %s", exc)
        return items


def _parse_rfc822(s: str) -> datetime | None:
    if not s:
        return None
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(s)
    except Exception:
        return None


def to_normalized_items(max_items: int = 50, query: str | None = None) -> Iterator[Any]:
    """Genera NormalizedItem desde NATO news, opcionalmente filtrado por query."""
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = NATOClient()
    if client._session is None:
        return

    items = client.fetch_news()
    if query:
        items = client.search(query, items)

    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"nato|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",
                item_id=raw["id"][:512],
                title=raw["title"][:2000],
                body=raw["description"][:8000],
                summary=raw["title"][:400],
                url=raw["link"] or None,
                published_at=raw["pub_date"],
                author="NATO",
                language="en",
                raw_hash=raw_hash,
                categories=["nato", "defensa", "geopolitica"],
                payload={},
            )
        except Exception as exc:
            logger.debug("NATO NormalizedItem · %s", exc)


_CLIENT: NATOClient | None = None


def get_nato_client() -> NATOClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = NATOClient()
    return _CLIENT


__all__ = ["NATOClient", "get_nato_client", "to_normalized_items"]
