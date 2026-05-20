"""Conector Defensa.gob (BOD + INTA) · Sprint 11 · S11.3.

> **Sprint 11 · S11.3** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 11 · Defensa`)

Ministerio de Defensa España publica:

  - BOD (Boletín Oficial del Ministerio de Defensa) · normativa militar
  - Sala de prensa · notas de prensa, comparecencias del MINISDEF
  - INTA · noticias del Instituto Nacional de Técnica Aeroespacial

Esta capa expone:
  - get_bod_ultimas() · últimas resoluciones BOD vía RSS
  - get_notas_prensa() · notas oficiales MINISDEF
  - get_inta_news() · INTA news feed

Falla cerrado: timeout 20s · errores → []. No requiere API key.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_BOD_RSS = "https://publicaciones.defensa.gob.es/rss/bod"  # placeholder oficial
_MINISDEF_NEWS_RSS = "https://www.defensa.gob.es/gabinete/notasPrensa/rss.xml"
_INTA_NEWS_RSS = "https://www.inta.es/INTA/es/noticias/rss"

_TIMEOUT = 20
_USER_AGENT = "Politeia-Analitica/2.0 MINISDEF-Monitor (+https://politeia-analitica.es)"


class DefensaGobClient:
    """Cliente RSS para Ministerio de Defensa España (BOD + prensa + INTA)."""

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
            logger.warning("DefensaGobClient: requests no disponible · degradado")

    def fetch_bod(self) -> list[dict[str, Any]]:
        """Boletín Oficial del Ministerio de Defensa."""
        return self._fetch_rss(_BOD_RSS, "bod")

    def fetch_notas_prensa(self) -> list[dict[str, Any]]:
        """Notas de prensa MINISDEF."""
        return self._fetch_rss(_MINISDEF_NEWS_RSS, "minisdef_prensa")

    def fetch_inta(self) -> list[dict[str, Any]]:
        """INTA news."""
        return self._fetch_rss(_INTA_NEWS_RSS, "inta")

    def _fetch_rss(self, url: str, tag: str) -> list[dict[str, Any]]:
        if self._session is None:
            return []
        try:
            r = self._session.get(url, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text, tag)
        except Exception as exc:
            logger.warning("Defensa.gob feed %s · %s", tag, exc)
            return []

    @staticmethod
    def _parse_rss(xml_text: str, tag: str) -> list[dict[str, Any]]:
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
                    "feed": tag,
                })
        except Exception as exc:
            logger.debug("Defensa.gob RSS parse %s · %s", tag, exc)
        return items


def _parse_rfc822(s: str) -> datetime | None:
    if not s:
        return None
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(s)
    except Exception:
        return None


def to_normalized_items(feed: str = "minisdef_prensa", max_items: int = 50) -> Iterator[Any]:
    """Genera NormalizedItem desde un feed Defensa.gob.

    Args:
      feed: 'bod' | 'minisdef_prensa' | 'inta'.
    """
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = DefensaGobClient()
    if client._session is None:
        return

    if feed == "bod":
        items = client.fetch_bod()
        author = "MINISDEF · BOD"
        cats = ["bod", "defensa", "minisdef"]
    elif feed == "inta":
        items = client.fetch_inta()
        author = "INTA"
        cats = ["inta", "defensa", "aeroespacial"]
    else:
        items = client.fetch_notas_prensa()
        author = "MINISDEF"
        cats = ["minisdef", "defensa", "prensa"]

    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"defensa_gob|{feed}|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",
                item_id=raw["id"][:512],
                title=raw["title"][:2000],
                body=raw["description"][:8000],
                summary=raw["title"][:400],
                url=raw["link"] or None,
                published_at=raw["pub_date"],
                author=author,
                language="es",
                raw_hash=raw_hash,
                categories=cats,
                payload={"feed": feed},
            )
        except Exception as exc:
            logger.debug("Defensa.gob NormalizedItem · %s", exc)


_CLIENT: DefensaGobClient | None = None


def get_defensa_gob_client() -> DefensaGobClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = DefensaGobClient()
    return _CLIENT


__all__ = ["DefensaGobClient", "get_defensa_gob_client", "to_normalized_items"]
