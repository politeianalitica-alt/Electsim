"""Conector BEREC · Body of European Regulators · Sprint 12 · S12.2.

> **Sprint 12 · S12.2** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 12 · Telecom`)

BEREC coordina los reguladores nacionales europeos de comunicaciones
electrónicas. Publica directrices, opiniones y decisiones sobre roaming,
neutralidad red, banda ancha, espectro y normativa CMR.

Feed RSS oficial: https://www.berec.europa.eu/en/rss-feeds

Cliente sin auth, falla cerrado (timeout 15s → []).
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_BEREC_RSS = "https://www.berec.europa.eu/en/news/rss.xml"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 BEREC-Monitor (+https://politeia-analitica.es)"


class BERECClient:
    """Cliente RSS BEREC."""

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
            logger.warning("BERECClient: requests no disponible · degradado")

    def fetch_news(self) -> list[dict[str, Any]]:
        if self._session is None:
            return []
        try:
            r = self._session.get(_BEREC_RSS, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text)
        except Exception as exc:
            logger.warning("BEREC feed · %s", exc)
            return []

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
            logger.debug("BEREC RSS parse · %s", exc)
        return items


def _parse_rfc822(s: str) -> datetime | None:
    if not s:
        return None
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(s)
    except Exception:
        return None


def to_normalized_items(max_items: int = 50) -> Iterator[Any]:
    """Genera NormalizedItem desde BEREC."""
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = BERECClient()
    if client._session is None:
        return

    items = client.fetch_news()
    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"berec|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",
                item_id=raw["id"][:512],
                title=raw["title"][:2000],
                body=raw["description"][:8000],
                summary=raw["title"][:400],
                url=raw["link"] or None,
                published_at=raw["pub_date"],
                author="BEREC",
                language="en",
                raw_hash=raw_hash,
                categories=["berec", "telecom", "regulador_eu"],
                payload={},
            )
        except Exception as exc:
            logger.debug("BEREC NormalizedItem · %s", exc)


_CLIENT: BERECClient | None = None


def get_berec_client() -> BERECClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = BERECClient()
    return _CLIENT


__all__ = ["BERECClient", "get_berec_client", "to_normalized_items"]
