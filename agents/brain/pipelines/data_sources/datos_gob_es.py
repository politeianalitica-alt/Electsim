"""
datos.gob.es · catálogo nacional de datos abiertos.

API: https://datos.gob.es/apidata
Sin clave. Indexa miles de datasets de administraciones públicas
incluyendo:
  · Presupuestos municipales (Hacienda)
  · Padrón histórico (INE)
  · Convenios y subvenciones
  · Contratación pública (PLACE)
  · Datos de calidad del aire

API de este módulo:
  · buscar_datasets(query, theme=None, publisher=None, limit=20)
  · datasets_por_municipio(cod_ine, limit=15)
  · presupuesto_municipal_url(cod_ine) → URL del CSV/JSON de presupuesto
  · subvenciones_recientes_municipio(cod_ine, limit=10)
"""
from __future__ import annotations

import logging
import urllib.parse
from typing import Any

from ._http import http_get_json

logger = logging.getLogger(__name__)

DATOS_BASE = "https://datos.gob.es/apidata/catalog"


def buscar_datasets(
    query: str, *,
    theme: str | None = None,
    publisher: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Busca datasets en datos.gob.es."""
    if not query:
        return []
    q = urllib.parse.quote_plus(query)
    url = f"{DATOS_BASE}/dataset.json?_query={q}&_pageSize={int(limit)}"
    if theme:
        url += f"&theme={urllib.parse.quote_plus(theme)}"
    if publisher:
        url += f"&publisher={urllib.parse.quote_plus(publisher)}"
    data = http_get_json(url, ttl_seconds=86400)
    if not data:
        return []
    items = (data.get("result") or {}).get("items") or []
    out: list[dict[str, Any]] = []
    for it in items[:int(limit)]:
        out.append({
            "titulo":      _l10n(it.get("title")),
            "descripcion": _l10n(it.get("description"))[:400],
            "publisher":   _l10n(it.get("publisher", {}).get("title") if isinstance(it.get("publisher"), dict) else None),
            "url":         (it.get("identifier") or it.get("@id") or "")[:300],
            "fecha":       it.get("issued", "")[:10],
            "formatos":    [r.get("format") for r in (it.get("distribution") or [])
                            if isinstance(r, dict)][:5],
        })
    return out


def datasets_por_municipio(cod_ine: str, *, limit: int = 15) -> list[dict[str, Any]]:
    """Datasets que mencionan un código INE o nombre de municipio."""
    if not cod_ine:
        return []
    return buscar_datasets(f"municipio {cod_ine}", limit=limit)


def presupuesto_municipal_url(cod_ine: str) -> str | None:
    """Busca el dataset de presupuesto municipal más reciente."""
    if not cod_ine:
        return None
    results = buscar_datasets(
        f"presupuesto municipal {cod_ine}",
        publisher="Ministerio de Hacienda",
        limit=5,
    )
    if not results:
        return None
    return results[0].get("url")


def subvenciones_recientes_municipio(
    cod_ine: str, *, limit: int = 10,
) -> list[dict[str, Any]]:
    """Subvenciones publicadas que mencionan al municipio."""
    if not cod_ine:
        return []
    return buscar_datasets(f"subvenciones {cod_ine}", limit=limit)


def _l10n(field: Any) -> str:
    """datos.gob.es devuelve campos i18n como dict {es: '...', en: '...'} o list."""
    if isinstance(field, str):
        return field
    if isinstance(field, dict):
        return str(field.get("es") or field.get("en") or "")
    if isinstance(field, list) and field:
        first = field[0]
        if isinstance(first, dict):
            return str(first.get("@value") or first.get("text") or "")
        return str(first)
    return ""
