"""Conector CNMV (Comisión Nacional del Mercado de Valores) · Sprint 7 · S7.1.

> **Sprint 7 · S7.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 7 · Banca`)

CNMV publica "hechos relevantes" en feed RSS oficial · cambios accionariales,
OPAs, sanciones, registros de productos financieros. Es la fuente más viva
para clientes del sector financiero (Santander, BBVA, CaixaBank, Sabadell,
Bankinter, Unicaja, Ibercaja + 31 sociedades cotizadas IBEX).

Feed RSS oficial: https://www.cnmv.es/portal/RSS/HechosRelevantes
Búsqueda histórica: https://www.cnmv.es/Portal/HR/ResultadoBusquedaHR.aspx

Output: produce NormalizedItem para cada hecho relevante.

Falla cerrado: timeout 15s, errores → [], no rompe pipeline.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)


_CNMV_RSS_URL = "https://www.cnmv.es/portal/RSS/HechosRelevantes.aspx"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 CNMV-Monitor (+https://politeia-analitica.es)"


class CNMVClient:
    """Cliente para feed RSS de hechos relevantes de CNMV."""

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
            logger.warning("CNMVClient: requests no disponible · degradado")

    def fetch_hechos_relevantes(self) -> list[dict[str, Any]]:
        """Descarga el feed RSS de hechos relevantes · devuelve lista normalizada.

        Returns:
          Lista de dicts con: id, title, link, pub_date, description, company.
          Vacía si error o requests no disponible.
        """
        if self._session is None:
            return []
        try:
            r = self._session.get(_CNMV_RSS_URL, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_rss(r.text)
        except Exception as exc:
            logger.warning("CNMV feed · %s", exc)
            return []

    @staticmethod
    def _parse_rss(xml_text: str) -> list[dict[str, Any]]:
        """Parser RSS simple sin feedparser para evitar dep."""
        items: list[dict[str, Any]] = []
        try:
            from xml.etree import ElementTree as ET
            root = ET.fromstring(xml_text)
            # RSS 2.0 · channel/item
            for item in root.iter("item"):
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                desc = (item.findtext("description") or "").strip()
                pub_date_str = (item.findtext("pubDate") or "").strip()
                guid = (item.findtext("guid") or link).strip()

                # Parsear pubDate · típico RFC 822: 'Mon, 19 May 2026 12:34:56 GMT'
                pub_dt = _parse_rfc822(pub_date_str) or datetime.now(timezone.utc)

                # Empresa · intentar extraer del título (formato común: "EMPRESA: Hecho ...")
                company = ""
                if ":" in title:
                    company = title.split(":", 1)[0].strip()[:120]

                items.append({
                    "id": guid,
                    "title": title,
                    "link": link,
                    "pub_date": pub_dt,
                    "description": desc,
                    "company": company,
                })
        except Exception as exc:
            logger.debug("CNMV RSS parse · %s", exc)
        return items


def _parse_rfc822(s: str) -> datetime | None:
    """Parsea fecha RFC 822 (formato RSS estándar)."""
    if not s:
        return None
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(s)
    except Exception:
        return None


# ────────────────────────────────────────────────────────────────────
# Adapter · CNMV → NormalizedItem
# ────────────────────────────────────────────────────────────────────

def to_normalized_items(max_items: int = 50) -> Iterator[Any]:
    """Genera NormalizedItem desde feed CNMV.

    Yields:
      NormalizedItem por cada hecho relevante.
    """
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = CNMVClient()
    if client._session is None:
        return

    items = client.fetch_hechos_relevantes()
    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"cnmv|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",  # CNMV no está en el catálogo SourceKind · usamos manual
                item_id=raw["id"][:512],
                title=raw["title"][:2000],
                body=raw["description"][:8000],
                summary=raw["title"][:400],
                url=raw["link"] or None,
                published_at=raw["pub_date"],
                author="CNMV",
                language="es",
                raw_hash=raw_hash,
                categories=["cnmv", "hecho_relevante", "banca"],
                payload={"company": raw["company"]},
            )
        except Exception as exc:
            logger.debug("CNMV NormalizedItem · %s", exc)


_CLIENT: CNMVClient | None = None


def get_cnmv_client() -> CNMVClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = CNMVClient()
    return _CLIENT


__all__ = ["CNMVClient", "get_cnmv_client", "to_normalized_items"]
