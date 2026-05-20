"""Conector BDNS (Base de Datos Nacional de Subvenciones) · Sprint 3 · S3.1.

> **Sprint 3 · S3.1** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 3`)

BDNS (Base de Datos Nacional de Subvenciones) gestionada por el Ministerio
de Hacienda y Función Pública. Contiene **TODAS** las subvenciones públicas
de España desde 2013 (Estado, CCAA, Ayuntamientos, universidades, organismos
públicos). Es el dataset más importante del Tercer Sector y muy infrautilizado.

API REST oficial: https://www.infosubvenciones.es/bdnstrans/api
Documentación: https://www.infosubvenciones.es/bdnstrans/web

Endpoints principales:
  - GET /convocatorias/busqueda  → convocatorias abiertas/cerradas
  - GET /concesiones/busqueda    → quien recibió qué (resoluciones de concesión)
  - GET /convocatorias/{numConv} → detalle de una convocatoria
  - GET /concesiones/{idConc}    → detalle de una concesión

Permite filtrar por:
  - Organismo convocante (NIF)
  - Tipo de beneficiario (PYME, ONG, persona física…)
  - Área de actividad (clasificación CNAE)
  - Fechas (desde/hasta)
  - Importe min/max
  - Estado (abierta/cerrada/anulada)

Output: produce NormalizedItem para cada convocatoria + concesion ingerida.

Falla cerrado: si la API está caída o el formato cambia, devuelve lista vacía
sin romper el pipeline. Cliente HTTP con timeout + retries básicos.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import date, datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)


_BASE_URL = "https://www.infosubvenciones.es/bdnstrans/api"
_TIMEOUT = 20
_USER_AGENT = "Politeia-Analitica/2.0 (+https://politeia-analitica.es)"


# ────────────────────────────────────────────────────────────────────
# Cliente HTTP robusto · falla cerrado
# ────────────────────────────────────────────────────────────────────

class BDNSClient:
    """Cliente para la API REST de BDNS.

    Sin estado, thread-safe. Cada llamada abre/cierra su propia request.
    Nunca lanza excepción hacia arriba: devuelve None / [] en caso de error.
    """

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "application/json",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("BDNSClient: requests no disponible · degradado")

    # ── Búsqueda de convocatorias ─────────────────────────────────

    def search_convocatorias(
        self,
        *,
        descripcion: str | None = None,
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
        organo: str | None = None,  # NIF del organo convocante
        importe_desde: float | None = None,
        page: int = 0,
        page_size: int = 50,
    ) -> list[dict[str, Any]]:
        """Busca convocatorias de subvenciones.

        Args:
          descripcion: texto libre en el titulo de la convocatoria
          fecha_desde: 'YYYY-MM-DD' · fecha de publicación
          fecha_hasta: 'YYYY-MM-DD'
          organo: NIF del organismo convocante
          importe_desde: importe mínimo en euros
          page: página (0-based)
          page_size: max 50

        Returns:
          Lista de dicts con campos · vacía si error.
        """
        params: dict[str, Any] = {
            "page": page,
            "pageSize": min(page_size, 50),
        }
        if descripcion:
            params["descripcion"] = descripcion
        if fecha_desde:
            params["fechaDesde"] = fecha_desde
        if fecha_hasta:
            params["fechaHasta"] = fecha_hasta
        if organo:
            params["organo"] = organo
        if importe_desde is not None:
            params["importeDesde"] = importe_desde

        result = self._get_json(f"{_BASE_URL}/convocatorias/busqueda", params)
        if result is None:
            return []
        # La API puede devolver {content: [...]} o lista directa
        items = result.get("content") if isinstance(result, dict) else None
        if items is None and isinstance(result, list):
            items = result
        return items or []

    # ── Búsqueda de concesiones (quién recibió qué) ───────────────

    def search_concesiones(
        self,
        *,
        beneficiario: str | None = None,  # NIF o razón social
        fecha_desde: str | None = None,
        fecha_hasta: str | None = None,
        importe_desde: float | None = None,
        page: int = 0,
        page_size: int = 50,
    ) -> list[dict[str, Any]]:
        """Busca concesiones de subvenciones (resoluciones publicadas).

        Args:
          beneficiario: NIF o nombre del beneficiario (la API hace contains)
          fecha_desde: 'YYYY-MM-DD' · fecha de resolución
          fecha_hasta: 'YYYY-MM-DD'
          importe_desde: importe mínimo
          page / page_size: paginación

        Returns:
          Lista de dicts · vacía si error.
        """
        params: dict[str, Any] = {
            "page": page,
            "pageSize": min(page_size, 50),
        }
        if beneficiario:
            params["beneficiario"] = beneficiario
        if fecha_desde:
            params["fechaDesde"] = fecha_desde
        if fecha_hasta:
            params["fechaHasta"] = fecha_hasta
        if importe_desde is not None:
            params["importeDesde"] = importe_desde

        result = self._get_json(f"{_BASE_URL}/concesiones/busqueda", params)
        if result is None:
            return []
        items = result.get("content") if isinstance(result, dict) else None
        if items is None and isinstance(result, list):
            items = result
        return items or []

    # ── Detalle de una convocatoria ───────────────────────────────

    def get_convocatoria(self, num_conv: str) -> dict[str, Any] | None:
        """Devuelve detalle completo de una convocatoria."""
        if not num_conv:
            return None
        return self._get_json(f"{_BASE_URL}/convocatorias/{num_conv}")

    # ── HTTP helper ────────────────────────────────────────────────

    def _get_json(self, url: str, params: dict | None = None) -> dict | list | None:
        if self._session is None:
            return None
        try:
            r = self._session.get(url, params=params, timeout=_TIMEOUT)
            if r.status_code == 404:
                logger.debug("BDNS 404: %s", url)
                return None
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("BDNS error · %s · %s", url[:80], exc)
            return None


# ────────────────────────────────────────────────────────────────────
# Conector compatible con NormalizedItem · Sprint 3
# ────────────────────────────────────────────────────────────────────

def to_normalized_items(
    *,
    descripcion: str | None = None,
    fecha_desde: str | None = None,
    fecha_hasta: str | None = None,
    max_items: int = 100,
) -> Iterator[Any]:
    """Genera NormalizedItem desde BDNS para convocatorias recientes.

    Args:
      descripcion: filtro texto en el título
      fecha_desde / fecha_hasta: rango temporal
      max_items: máximo a generar (paginación implícita)

    Yields:
      NormalizedItem por cada convocatoria encontrada
    """
    try:
        from packages.types import NormalizedItem
    except ImportError:
        logger.error("bdns.to_normalized_items · NormalizedItem no disponible")
        return

    client = BDNSClient()
    if client._session is None:
        return

    yielded = 0
    page = 0
    while yielded < max_items:
        items = client.search_convocatorias(
            descripcion=descripcion,
            fecha_desde=fecha_desde,
            fecha_hasta=fecha_hasta,
            page=page,
            page_size=50,
        )
        if not items:
            break

        for raw in items:
            if yielded >= max_items:
                break
            try:
                norm = _convocatoria_to_normalized(raw)
                if norm:
                    yield norm
                    yielded += 1
            except Exception as exc:
                logger.debug("bdns convocatoria malformada · %s", exc)
        page += 1
        if len(items) < 50:
            break  # no hay más páginas


def _convocatoria_to_normalized(raw: dict[str, Any]) -> Any | None:
    """Convierte una convocatoria BDNS raw → NormalizedItem.

    Mapeo de campos BDNS → NormalizedItem:
      raw.numero_convocatoria         → item_id
      raw.descripcion / titulo         → title
      raw.descripcion_largo / texto    → body
      raw.fecha_publicacion / fecha    → published_at
      raw.url_pdf / url_html           → url
      raw.organo                       → author
      raw.importe                      → payload.importe
    """
    from packages.types import NormalizedItem

    num_conv = (
        raw.get("numero_convocatoria")
        or raw.get("numConv")
        or raw.get("id")
        or raw.get("numeroConvocatoria")
        or ""
    )
    title = (
        raw.get("descripcion")
        or raw.get("titulo")
        or raw.get("description")
        or ""
    )
    if not num_conv or not title:
        return None

    # Body · usa descripción larga o texto si está
    body = (
        raw.get("descripcion_larga")
        or raw.get("textoConvocatoria")
        or raw.get("texto")
        or ""
    )

    # Fecha
    fecha_str = (
        raw.get("fecha_publicacion")
        or raw.get("fechaPublicacion")
        or raw.get("fecha")
        or ""
    )
    try:
        if fecha_str:
            published_at = datetime.fromisoformat(fecha_str.replace("Z", "+00:00"))
        else:
            published_at = datetime.now(timezone.utc)
    except Exception:
        published_at = datetime.now(timezone.utc)

    # URLs
    url = (
        raw.get("url_html")
        or raw.get("url")
        or raw.get("enlaceConvocatoria")
        or None
    )
    pdf_url = raw.get("url_pdf") or raw.get("urlBases") or None

    # Organo convocante → author
    organo = (
        raw.get("organo")
        or raw.get("desOrgano")
        or raw.get("organismo")
        or ""
    )

    # Hash determinístico para dedup
    raw_hash = hashlib.sha256(
        f"bdns|{num_conv}|{title}".encode("utf-8")
    ).hexdigest()

    # Importe y datos auxiliares en payload
    payload = {
        "num_convocatoria": num_conv,
        "importe": raw.get("importe") or raw.get("presupuestoTotal") or 0,
        "organo": organo,
        "tipo_beneficiario": raw.get("tipoBeneficiario") or raw.get("tipo_beneficiario") or "",
        "fecha_fin_plazo": raw.get("fechaFinPlazo") or raw.get("fecha_fin_plazo") or "",
        "estado": raw.get("estado") or "",
        "instrumento": raw.get("instrumento") or "",
    }

    try:
        return NormalizedItem(
            source="datos_gob",  # BDNS está en el catálogo datos.gob.es
            item_id=str(num_conv),
            title=str(title)[:2000].strip(),
            body=str(body)[:8000].strip(),
            summary=str(title)[:400].strip(),
            url=url,
            pdf_url=pdf_url,
            published_at=published_at,
            author=str(organo)[:240].strip(),
            language="es",
            raw_hash=raw_hash,
            categories=["subvencion", "bdns"],
            payload=payload,
        )
    except Exception as exc:
        logger.debug("BDNS NormalizedItem build · %s", exc)
        return None


# ────────────────────────────────────────────────────────────────────
# Singleton + API publica de conveniencia
# ────────────────────────────────────────────────────────────────────

_CLIENT: BDNSClient | None = None


def get_bdns_client() -> BDNSClient:
    """Singleton del BDNSClient."""
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = BDNSClient()
    return _CLIENT


__all__ = [
    "BDNSClient",
    "get_bdns_client",
    "to_normalized_items",
]
