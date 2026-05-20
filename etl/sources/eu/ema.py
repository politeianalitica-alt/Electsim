"""Conector EMA · European Medicines Agency · Sprint 8 · S8.2.

> **Sprint 8 · S8.2** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 8 · Farma`)

EMA (Agencia Europea del Medicamento) no ofrece API JSON pública estable
pero sí varios feeds RSS oficiales en https://www.ema.europa.eu/en/rss-feeds:

  - News & press releases
  - Medicine shortages
  - EPAR · European Public Assessment Reports (autorizaciones nuevas)
  - Referrals & safety reviews

Estrategia: fetch los RSS, parser ET + normalización a NormalizedItem.

Falla cerrado: 15s timeout, errores → [].
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

# Feeds RSS oficiales EMA · estables desde 2020
_EMA_FEEDS: dict[str, str] = {
    "news": "https://www.ema.europa.eu/en/rss/news",
    "shortages": "https://www.ema.europa.eu/en/rss/medicine-shortages",
    "epar": "https://www.ema.europa.eu/en/rss/medicines/human/news",
    "referrals": "https://www.ema.europa.eu/en/rss/human-regulatory/referrals",
}

_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 EMA-Monitor (+https://politeia-analitica.es)"


class EMAClient:
    """Cliente RSS para feeds oficiales EMA."""

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
            logger.warning("EMAClient: requests no disponible · degradado")

    def fetch_feed(self, feed_key: str) -> list[dict[str, Any]]:
        """Descarga un feed RSS por clave (news, shortages, epar, referrals)."""
        if self._session is None:
            return []
        url = _EMA_FEEDS.get(feed_key)
        if not url:
            return []
        try:
            r = self._session.get(url, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text, feed_key)
        except Exception as exc:
            logger.warning("EMA feed %s · %s", feed_key, exc)
            return []

    def fetch_shortages(self) -> list[dict[str, Any]]:
        """Atajo · alertas de desabastecimiento europeo."""
        return self.fetch_feed("shortages")

    def fetch_epar(self) -> list[dict[str, Any]]:
        """Atajo · nuevas autorizaciones EPAR."""
        return self.fetch_feed("epar")

    @staticmethod
    def _parse_rss(xml_text: str, feed_key: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        try:
            from xml.etree import ElementTree as ET
            root = ET.fromstring(xml_text)
            for item in root.iter("item"):
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                desc = (item.findtext("description") or "").strip()
                pub_date_str = (item.findtext("pubDate") or "").strip()
                guid = (item.findtext("guid") or link).strip()
                pub_dt = _parse_rfc822(pub_date_str) or datetime.now(timezone.utc)

                items.append({
                    "id": guid,
                    "title": title,
                    "link": link,
                    "pub_date": pub_dt,
                    "description": desc,
                    "feed": feed_key,
                })
        except Exception as exc:
            logger.debug("EMA RSS parse %s · %s", feed_key, exc)
        return items


def _parse_rfc822(s: str) -> datetime | None:
    if not s:
        return None
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(s)
    except Exception:
        return None


# ────────────────────────────────────────────────────────────────────
# Adapter · EMA → NormalizedItem
# ────────────────────────────────────────────────────────────────────

def to_normalized_items(feed_key: str = "shortages", max_items: int = 50) -> Iterator[Any]:
    """Genera NormalizedItem desde un feed EMA.

    Args:
      feed_key: 'news' | 'shortages' | 'epar' | 'referrals'
      max_items: tope items.
    """
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = EMAClient()
    if client._session is None:
        return

    items = client.fetch_feed(feed_key)
    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"ema|{feed_key}|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",
                item_id=raw["id"][:512],
                title=raw["title"][:2000],
                body=raw["description"][:8000],
                summary=raw["title"][:400],
                url=raw["link"] or None,
                published_at=raw["pub_date"],
                author="EMA",
                language="en",
                raw_hash=raw_hash,
                categories=["ema", "farma", feed_key],
                payload={"feed": feed_key},
            )
        except Exception as exc:
            logger.debug("EMA NormalizedItem · %s", exc)


_CLIENT: EMAClient | None = None


def get_ema_client() -> EMAClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = EMAClient()
    return _CLIENT


__all__ = ["EMAClient", "get_ema_client", "to_normalized_items", "_EMA_FEEDS"]
