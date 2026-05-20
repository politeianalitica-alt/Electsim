"""Conector EDA · European Defence Agency · Sprint 11 · S11.2.

> **Sprint 11 · S11.2** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 11 · Defensa`)

EDA coordina la cooperación entre los EEMM en defensa: capabilities,
PESCO, EDF (European Defence Fund). Publica:

  - News feed RSS · https://eda.europa.eu/rss/news
  - Projects directory (PESCO + ad-hoc) · página HTML pública

Aquí leemos el RSS oficial de noticias y dejamos un placeholder para el
buscador de proyectos.

Falla cerrado: timeout 15s · errores → [].
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_EDA_NEWS_RSS = "https://eda.europa.eu/rss/news"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 EDA-Monitor (+https://politeia-analitica.es)"


class EDAClient:
    """Cliente RSS para EDA news + lookups de programas conocidos."""

    # Programas / proyectos PESCO + EDF más relevantes para España (referencia estática)
    KNOWN_PROGRAMS = {
        "pesco_euro_male": {
            "code": "EUROMALE",
            "name": "European MALE RPAS",
            "lead": "Spain",
            "consortium": ["Spain", "France", "Germany", "Italy"],
            "kind": "PESCO",
        },
        "pesco_strategic_c2": {
            "code": "STRATEGIC C2",
            "name": "Strategic Command and Control System for CSDP Missions",
            "lead": "Spain",
            "kind": "PESCO",
        },
        "edf_fcas": {
            "code": "FCAS / NGWS",
            "name": "Future Combat Air System",
            "lead": "France",
            "consortium": ["France", "Germany", "Spain"],
            "kind": "ad-hoc",
        },
        "edf_eurodrone": {
            "code": "EURODRONE",
            "name": "European MALE Unmanned Aerial System (industrial phase)",
            "lead": "Spain (OCCAR)",
            "kind": "OCCAR",
        },
    }

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
            logger.warning("EDAClient: requests no disponible · degradado")

    def fetch_news(self) -> list[dict[str, Any]]:
        """Descarga feed RSS de noticias EDA."""
        if self._session is None:
            return []
        try:
            r = self._session.get(_EDA_NEWS_RSS, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text)
        except Exception as exc:
            logger.warning("EDA feed · %s", exc)
            return []

    def list_programs(self) -> list[dict[str, Any]]:
        """Catálogo estático de programas PESCO/EDF más relevantes para ES."""
        return [{"slug": k, **v} for k, v in self.KNOWN_PROGRAMS.items()]

    def get_program(self, slug: str) -> dict[str, Any] | None:
        v = self.KNOWN_PROGRAMS.get(slug.lower())
        if v is None:
            return None
        return {"slug": slug.lower(), **v}

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
            logger.debug("EDA RSS parse · %s", exc)
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
    """Genera NormalizedItem desde EDA news."""
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = EDAClient()
    if client._session is None:
        return

    items = client.fetch_news()
    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"eda|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",
                item_id=raw["id"][:512],
                title=raw["title"][:2000],
                body=raw["description"][:8000],
                summary=raw["title"][:400],
                url=raw["link"] or None,
                published_at=raw["pub_date"],
                author="European Defence Agency",
                language="en",
                raw_hash=raw_hash,
                categories=["eda", "defensa", "pesco"],
                payload={},
            )
        except Exception as exc:
            logger.debug("EDA NormalizedItem · %s", exc)


_CLIENT: EDAClient | None = None


def get_eda_client() -> EDAClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = EDAClient()
    return _CLIENT


__all__ = ["EDAClient", "get_eda_client", "to_normalized_items"]
