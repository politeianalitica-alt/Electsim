"""Conector EIB · Banco Europeo de Inversiones · Sprint 9 · S9.3.

> **Sprint 9 · S9.3** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 9 · Tercer Sector`)

El EIB es el mayor banco multilateral del mundo. España es uno de los
principales destinatarios (~10 % de su cartera). Para tercer sector y
desarrollo es crítico monitorizar:

  - Proyectos aprobados (con país, sector, importe firma)
  - Proyectos bajo evaluación (pipeline)
  - Préstamos a ONGs / cooperación al desarrollo
  - Garantías InvestEU

El EIB publica un dataset abierto JSON-LD en https://www.eib.org/en/projects/all/
y un feed RSS reciente: https://www.eib.org/en/projects/loans/rss.htm

Aquí usamos el RSS oficial (formato estable). Cliente sin auth.

Falla cerrado: timeout 15s, errores → [].
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_EIB_RSS_URL = "https://www.eib.org/en/projects/loans/rss.htm"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 EIB-Monitor (+https://politeia-analitica.es)"


class EIBClient:
    """Cliente RSS para proyectos EIB."""

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
            logger.warning("EIBClient: requests no disponible · degradado")

    def fetch_projects(self) -> list[dict[str, Any]]:
        """Descarga el feed RSS de proyectos EIB."""
        if self._session is None:
            return []
        try:
            r = self._session.get(_EIB_RSS_URL, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text)
        except Exception as exc:
            logger.warning("EIB feed · %s", exc)
            return []

    def filter_by_country(self, items: list[dict[str, Any]], country: str) -> list[dict[str, Any]]:
        """Filtra proyectos por país (busca substring en título / descripción)."""
        if not country:
            return items
        country_lo = country.lower()
        return [
            it for it in items
            if country_lo in (it.get("title") or "").lower()
            or country_lo in (it.get("description") or "").lower()
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
                pub_date_str = (item.findtext("pubDate") or "").strip()
                guid = (item.findtext("guid") or link).strip()
                pub_dt = _parse_rfc822(pub_date_str) or datetime.now(timezone.utc)

                # Heurística: extraer país y sector si vienen entre paréntesis
                country = ""
                if " - " in title:
                    parts = title.split(" - ")
                    if len(parts) >= 2:
                        country = parts[-1].strip()[:80]

                items.append({
                    "id": guid,
                    "title": title,
                    "link": link,
                    "pub_date": pub_dt,
                    "description": desc,
                    "country_hint": country,
                })
        except Exception as exc:
            logger.debug("EIB RSS parse · %s", exc)
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
# Adapter · EIB → NormalizedItem
# ────────────────────────────────────────────────────────────────────

def to_normalized_items(max_items: int = 100) -> Iterator[Any]:
    """Genera NormalizedItem por cada proyecto EIB."""
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = EIBClient()
    if client._session is None:
        return

    items = client.fetch_projects()
    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"eib|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",
                item_id=raw["id"][:512],
                title=raw["title"][:2000],
                body=raw["description"][:8000],
                summary=raw["title"][:400],
                url=raw["link"] or None,
                published_at=raw["pub_date"],
                author="European Investment Bank",
                language="en",
                raw_hash=raw_hash,
                categories=["eib", "banca_desarrollo", "tercer_sector"],
                payload={"country_hint": raw.get("country_hint", "")},
            )
        except Exception as exc:
            logger.debug("EIB NormalizedItem · %s", exc)


_CLIENT: EIBClient | None = None


def get_eib_client() -> EIBClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = EIBClient()
    return _CLIENT


__all__ = ["EIBClient", "get_eib_client", "to_normalized_items"]
