"""Conector PLACE · Plataforma Contratación Sector Público · Sprint 10 · S10.2.

> **Sprint 10 · S10.2** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 10 · Infraestructuras`)

PLACE (https://contrataciondelestado.es) es la plataforma de contratación
pública española. Publica TODAS las licitaciones de AGE + organismos
autónomos + empresas públicas (ADIF, AENA, Adif AV, Puertos del Estado,
Renfe, Correos, ENAIRE, SEPI).

Datos abiertos vía Atom/RSS y bulk CSV:
  - Atom feed diario: https://contrataciondelestado.es/sindicacion/...
  - CSV histórico: descargas mensuales por organismo

Aquí implementamos lectura del feed Atom oficial (formato XML estable).

Falla cerrado: timeout 20s · errores → []. No requiere API key.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

# Feed Atom oficial · "licitaciones perfiles contratante todas"
_PLACE_ATOM_URL = (
    "https://contrataciondelestado.es/sindicacion/sindicacion_643/"
    "licitacionesPerfilesContratanteCompleto3.atom"
)
_TIMEOUT = 20
_USER_AGENT = "Politeia-Analitica/2.0 PLACE-Monitor (+https://politeia-analitica.es)"

# Organismos relevantes infraestructura (substrings del campo dc:publisher)
INFRA_ORGS = {
    "adif": ["ADIF", "Administrador de Infraestructuras Ferroviarias"],
    "aena": ["AENA"],
    "puertos": ["Puertos del Estado", "Autoridad Portuaria"],
    "renfe": ["RENFE", "Renfe"],
    "enaire": ["ENAIRE"],
    "carreteras": ["Dirección General de Carreteras"],
    "mitms": ["Ministerio de Transportes", "MITMA", "MITMS"],
}


class PLACEClient:
    """Cliente Atom para licitaciones PLACE."""

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "application/atom+xml, application/xml, */*",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("PLACEClient: requests no disponible · degradado")

    def fetch_licitaciones(self, atom_url: str | None = None) -> list[dict[str, Any]]:
        """Descarga feed Atom de licitaciones recientes."""
        if self._session is None:
            return []
        url = atom_url or _PLACE_ATOM_URL
        try:
            r = self._session.get(url, timeout=_TIMEOUT)
            r.raise_for_status()
            return self._parse_atom(r.text)
        except Exception as exc:
            logger.warning("PLACE feed · %s", exc)
            return []

    def filter_by_organismo(
        self,
        items: list[dict[str, Any]],
        organismo_key: str,
    ) -> list[dict[str, Any]]:
        """Filtra por organismo según INFRA_ORGS (substrings)."""
        targets = INFRA_ORGS.get(organismo_key.lower(), [])
        if not targets:
            return []
        out: list[dict[str, Any]] = []
        for it in items:
            org_field = (it.get("organismo") or "")
            if any(t.lower() in org_field.lower() for t in targets):
                out.append(it)
        return out

    @staticmethod
    def _parse_atom(xml_text: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        try:
            from xml.etree import ElementTree as ET
            root = ET.fromstring(xml_text)
            # Namespaces típicos PLACE
            ns = {
                "atom": "http://www.w3.org/2005/Atom",
                "cbc": "urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2",
                "dc": "http://purl.org/dc/elements/1.1/",
            }
            # entry directos o bajo namespace atom
            entries = list(root.iter("{http://www.w3.org/2005/Atom}entry"))
            if not entries:
                entries = list(root.iter("entry"))
            for entry in entries:
                title = _text(entry, ["{http://www.w3.org/2005/Atom}title", "title"])
                summary = _text(entry, ["{http://www.w3.org/2005/Atom}summary", "summary"])
                updated = _text(entry, ["{http://www.w3.org/2005/Atom}updated", "updated"])
                eid = _text(entry, ["{http://www.w3.org/2005/Atom}id", "id"])
                link = ""
                # primer link rel="alternate" o cualquier link
                for l in entry.iter():
                    if l.tag.endswith("link") and "href" in l.attrib:
                        link = l.attrib["href"]
                        break

                # Organismo · dc:publisher si presente
                organismo = _text(entry, [
                    "{http://purl.org/dc/elements/1.1/}publisher",
                    "publisher",
                ])

                pub_dt = _parse_iso(updated) or datetime.now(timezone.utc)
                items.append({
                    "id": eid or link,
                    "title": title,
                    "link": link,
                    "summary": summary,
                    "pub_date": pub_dt,
                    "organismo": organismo,
                })
        except Exception as exc:
            logger.debug("PLACE Atom parse · %s", exc)
        return items


def _text(node: Any, candidates: list[str]) -> str:
    """Devuelve el primer text() encontrado en la lista de tags candidatos."""
    for tag in candidates:
        el = node.find(tag) if hasattr(node, "find") else None
        if el is not None and el.text:
            return el.text.strip()
    return ""


def _parse_iso(s: str) -> datetime | None:
    if not s:
        return None
    try:
        # Acepta 'YYYY-MM-DDTHH:MM:SSZ' o con offset
        s_clean = s.replace("Z", "+00:00")
        return datetime.fromisoformat(s_clean)
    except Exception:
        return None


# ────────────────────────────────────────────────────────────────────
# Adapter · PLACE → NormalizedItem
# ────────────────────────────────────────────────────────────────────

def to_normalized_items(
    organismo: str | None = None,
    max_items: int = 100,
) -> Iterator[Any]:
    """Genera NormalizedItem desde feed PLACE, opcionalmente filtrado."""
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = PLACEClient()
    if client._session is None:
        return

    items = client.fetch_licitaciones()
    if organismo:
        items = client.filter_by_organismo(items, organismo)

    for raw in items[:max_items]:
        try:
            raw_hash = hashlib.sha256(
                f"place|{raw['id']}|{raw['title']}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",  # PLACE no está en SourceKind catálogo
                item_id=str(raw["id"])[:512],
                title=str(raw["title"])[:2000],
                body=str(raw["summary"])[:8000],
                summary=str(raw["title"])[:400],
                url=str(raw["link"]) or None,
                published_at=raw["pub_date"],
                author=str(raw.get("organismo", "PLACE"))[:200],
                language="es",
                raw_hash=raw_hash,
                categories=["place", "licitacion", "infraestructuras"],
                payload={"organismo": raw.get("organismo", "")},
            )
        except Exception as exc:
            logger.debug("PLACE NormalizedItem · %s", exc)


_CLIENT: PLACEClient | None = None


def get_place_client() -> PLACEClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = PLACEClient()
    return _CLIENT


__all__ = [
    "PLACEClient",
    "get_place_client",
    "to_normalized_items",
    "INFRA_ORGS",
]
