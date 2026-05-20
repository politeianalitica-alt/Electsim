"""Conector TED (Tenders Electronic Daily · UE) · Sprint 3 · S3.2.

> **Sprint 3 · S3.2** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 3`)

TED (Tenders Electronic Daily) es el portal oficial de licitaciones públicas
de la UE. Contiene **TODAS** las licitaciones por encima de umbrales UE
(~130 000€ servicios, ~5M€ obras) en 30+ países desde 1993.

API REST oficial: https://api.ted.europa.eu/v3
Documentación: https://docs.ted.europa.eu/api/

Endpoints principales:
  - POST /notices/search          → busqueda por filtros (fields, query)
  - GET  /notices/{publication-number}  → notice individual

Filtros relevantes para Politeia:
  - place-of-performance: ESP (solo España)
  - notice-type: PIN, CN, CAN, MOD, ...
  - publication-date: YYYY-MM-DD..YYYY-MM-DD
  - classification-cpv: códigos CPV de sector
  - estimated-total-value: importe mínimo

Output: produce NormalizedItem para cada licitacion encontrada.

Falla cerrado: si API caída o rate limit, devuelve [] sin romper.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)


_BASE_URL = "https://api.ted.europa.eu/v3"
_TIMEOUT = 25
_USER_AGENT = "Politeia-Analitica/2.0 (+https://politeia-analitica.es)"


# Códigos CPV (Common Procurement Vocabulary) de sectores Politeia
# Lista parcial · expandir cuando se añadan más sectores
CPV_BY_SECTOR: dict[str, list[str]] = {
    "energia":           ["09000000", "31000000", "65000000"],   # productos energéticos · infraestructura energética
    "farma":             ["33000000", "85000000"],                # productos médicos · servicios salud
    "defensa":           ["35000000"],                            # defensa
    "infraestructuras":  ["45000000", "71000000"],                # obras + ingeniería
    "telecom":           ["64000000", "72000000"],                # telecom + servicios IT
    "transporte":        ["60000000", "63000000"],                # transporte + servicios apoyo
    "agroalimentario":   ["15000000", "03000000"],                # alimentación + agricultura
    "vivienda":          ["70000000"],                            # inmobiliario
    "educacion":         ["80000000"],                            # educación
}


# ────────────────────────────────────────────────────────────────────
# Cliente TED · falla cerrado
# ────────────────────────────────────────────────────────────────────

class TEDClient:
    """Cliente para la API REST de TED EU.

    Nunca lanza excepción hacia arriba: retorna None / [] en caso de error.
    """

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("TEDClient: requests no disponible · degradado")

    def search_notices(
        self,
        *,
        country: str = "ESP",
        date_from: str | None = None,
        date_to: str | None = None,
        cpv_codes: list[str] | None = None,
        query_text: str | None = None,
        notice_types: list[str] | None = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any] | None:
        """Busca notices (licitaciones) por filtros combinados.

        Args:
          country: ISO 3166-1 alpha-3 (ESP, FRA, DEU, ...) · default ESP
          date_from / date_to: 'YYYYMMDD' (formato TED) o 'YYYY-MM-DD'
          cpv_codes: lista de códigos CPV
          query_text: búsqueda en texto libre
          notice_types: ['PIN', 'CN', 'CAN', 'MOD']
          page: 1-based
          page_size: max 250 según API

        Returns:
          dict con {total, notices: [...], error}  o None si fallo grave
        """
        # Construir query string en lenguaje de TED Expert Search
        clauses: list[str] = []
        if country:
            clauses.append(f"place-of-performance={country}")
        if date_from and date_to:
            df = date_from.replace("-", "")
            dt = date_to.replace("-", "")
            clauses.append(f"publication-date>={df} AND publication-date<={dt}")
        elif date_from:
            df = date_from.replace("-", "")
            clauses.append(f"publication-date>={df}")
        if cpv_codes:
            cpv_clause = " OR ".join(f"classification-cpv={c}" for c in cpv_codes)
            clauses.append(f"({cpv_clause})")
        if notice_types:
            nt_clause = " OR ".join(f"notice-type={t}" for t in notice_types)
            clauses.append(f"({nt_clause})")

        query = " AND ".join(clauses) if clauses else "*"
        if query_text:
            query = f"({query}) AND \"{query_text}\""

        payload = {
            "query": query,
            "fields": [
                "publication-number",
                "notice-title",
                "buyer-name",
                "place-of-performance",
                "publication-date",
                "deadline-date-lots",
                "classification-cpv",
                "estimated-total-value",
                "links",
            ],
            "page": page,
            "limit": min(page_size, 250),
            "scope": "ACTIVE",  # solo notices vigentes
        }

        return self._post_json(f"{_BASE_URL}/notices/search", payload)

    def get_notice(self, publication_number: str) -> dict[str, Any] | None:
        """Devuelve un notice por número de publicación (ej '12345-2026')."""
        if not publication_number:
            return None
        return self._get_json(f"{_BASE_URL}/notices/{publication_number}")

    # ── HTTP helpers ──────────────────────────────────────────────

    def _post_json(self, url: str, json_body: dict) -> dict | None:
        if self._session is None:
            return None
        try:
            r = self._session.post(url, json=json_body, timeout=_TIMEOUT)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("TED POST error · %s · %s", url[:80], exc)
            return None

    def _get_json(self, url: str, params: dict | None = None) -> dict | None:
        if self._session is None:
            return None
        try:
            r = self._session.get(url, params=params, timeout=_TIMEOUT)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("TED GET error · %s · %s", url[:80], exc)
            return None


# ────────────────────────────────────────────────────────────────────
# Adapter · TED notice → NormalizedItem
# ────────────────────────────────────────────────────────────────────

def _notice_to_normalized(raw: dict[str, Any]) -> Any | None:
    """Convierte un TED notice raw → NormalizedItem.

    Mapeo de campos TED → NormalizedItem:
      raw.publication-number → item_id
      raw.notice-title.spa o .eng → title
      raw.buyer-name → author
      raw.publication-date → published_at
      raw.links.html.spa → url
      raw.estimated-total-value → payload.importe_estimado
      raw.classification-cpv → payload.cpv_codes
      raw.place-of-performance → payload.lugar_ejecucion
    """
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return None

    pub_num = raw.get("publication-number") or raw.get("publicationNumber") or ""
    if not pub_num:
        return None

    # Title · puede ser dict multilingüe {spa: '...', eng: '...'}
    title_obj = raw.get("notice-title") or raw.get("noticeTitle") or {}
    if isinstance(title_obj, dict):
        title = title_obj.get("spa") or title_obj.get("eng") or next(iter(title_obj.values()), "")
    else:
        title = str(title_obj)

    if not title:
        return None

    # Fecha
    fecha_str = raw.get("publication-date") or raw.get("publicationDate") or ""
    try:
        if fecha_str:
            # TED usa YYYYMMDD o ISO
            if len(fecha_str) == 8 and fecha_str.isdigit():
                published_at = datetime(int(fecha_str[:4]), int(fecha_str[4:6]), int(fecha_str[6:8]), tzinfo=timezone.utc)
            else:
                published_at = datetime.fromisoformat(fecha_str.replace("Z", "+00:00"))
        else:
            published_at = datetime.now(timezone.utc)
    except Exception:
        published_at = datetime.now(timezone.utc)

    # URL
    links = raw.get("links") or {}
    url_html = ""
    if isinstance(links, dict):
        html_links = links.get("html", {})
        if isinstance(html_links, dict):
            url_html = html_links.get("spa") or html_links.get("eng") or next(iter(html_links.values()), "")
        elif isinstance(html_links, list) and html_links:
            url_html = str(html_links[0])

    # Buyer
    buyer = raw.get("buyer-name") or raw.get("buyerName") or ""
    if isinstance(buyer, dict):
        buyer = buyer.get("spa") or buyer.get("eng") or next(iter(buyer.values()), "")
    elif isinstance(buyer, list) and buyer:
        buyer = str(buyer[0])

    # Hash
    raw_hash = hashlib.sha256(f"ted|{pub_num}|{title}".encode("utf-8")).hexdigest()

    payload: dict[str, Any] = {
        "publication_number": pub_num,
        "buyer": str(buyer)[:240],
        "lugar_ejecucion": raw.get("place-of-performance") or raw.get("placeOfPerformance") or "",
        "cpv_codes": raw.get("classification-cpv") or raw.get("classificationCpv") or [],
        "deadline": raw.get("deadline-date-lots") or raw.get("deadlineDate") or "",
        "importe_estimado": raw.get("estimated-total-value") or raw.get("estimatedTotalValue") or {},
    }

    try:
        return NormalizedItem(
            source="ted_eu",
            item_id=str(pub_num),
            title=str(title)[:2000].strip(),
            body="",  # TED API no devuelve cuerpo · queda para una segunda llamada get_notice
            summary=str(title)[:400].strip(),
            url=url_html or None,
            published_at=published_at,
            author=str(buyer)[:240],
            language="es",
            raw_hash=raw_hash,
            categories=["licitacion", "ted_eu"],
            payload=payload,
        )
    except Exception as exc:
        logger.debug("TED NormalizedItem build · %s", exc)
        return None


# ────────────────────────────────────────────────────────────────────
# Generador NormalizedItem
# ────────────────────────────────────────────────────────────────────

def to_normalized_items(
    *,
    country: str = "ESP",
    sector: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    max_items: int = 100,
) -> Iterator[Any]:
    """Genera NormalizedItem desde TED para licitaciones recientes.

    Args:
      country: ESP por default · ISO alpha-3
      sector: clave de CPV_BY_SECTOR para auto-filtrar por sectores Politeia
      date_from / date_to: 'YYYY-MM-DD'
      max_items: máximo a generar
    """
    client = TEDClient()
    if client._session is None:
        return

    cpv_codes = CPV_BY_SECTOR.get(sector, []) if sector else None

    yielded = 0
    page = 1
    while yielded < max_items:
        result = client.search_notices(
            country=country,
            date_from=date_from,
            date_to=date_to,
            cpv_codes=cpv_codes,
            page=page,
            page_size=50,
        )
        if not result:
            break

        notices = result.get("notices") or result.get("results") or []
        if not notices:
            break

        for raw in notices:
            if yielded >= max_items:
                break
            norm = _notice_to_normalized(raw)
            if norm:
                yield norm
                yielded += 1

        if len(notices) < 50:
            break
        page += 1


# ────────────────────────────────────────────────────────────────────
# Singleton
# ────────────────────────────────────────────────────────────────────

_CLIENT: TEDClient | None = None


def get_ted_client() -> TEDClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = TEDClient()
    return _CLIENT


__all__ = [
    "TEDClient",
    "CPV_BY_SECTOR",
    "get_ted_client",
    "to_normalized_items",
]
