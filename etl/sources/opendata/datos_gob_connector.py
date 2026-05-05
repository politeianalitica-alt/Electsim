"""
datos.gob.es Connector — Bloque 10.

Conector para el portal nacional de datos abiertos de España.
Usa la API CKAN estándar de datos.gob.es.

No descarga recursos completos por defecto.
Solo cataloga datasets y recursos.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from etl.sources.opendata.schemas import OpenDataset, OpenDatasetResource
from etl.sources.opendata.ckan_connector import (
    ckan_package_search, ckan_package_show, ckan_list_resources,
    ckan_dataset_normalize,
)

logger = logging.getLogger(__name__)

PORTAL_ID = "datos_gob_es"
BASE_URL = "https://datos.gob.es"
API_URL = "https://datos.gob.es/apidata"

# La API real de datos.gob.es usa un endpoint propio
_DATOS_GOB_SEARCH_URL = "https://datos.gob.es/apidata/catalog/dataset"
_DATOS_GOB_DATASET_URL = "https://datos.gob.es/apidata/catalog/dataset/{id}"


def search_datasets(
    query: str,
    limit: int = 50,
    theme: str | None = None,
    administration: str | None = None,
    timeout: int = 15,
) -> list[OpenDataset]:
    """
    Busca datasets en datos.gob.es.

    Args:
        query: Texto de búsqueda.
        limit: Máximo de resultados.
        theme: Filtro de tema DCAT.
        administration: Filtro de administración.
        timeout: Timeout en segundos.

    Returns:
        Lista de OpenDataset. Vacía si falla.
    """
    # Intentar API nativa primero, luego CKAN
    results = _search_native(query, limit, theme, administration, timeout)
    if results:
        return results
    # Fallback CKAN estándar
    return ckan_package_search(BASE_URL, query, rows=limit,
                                portal_id=PORTAL_ID, timeout=timeout)


def harvest_recent_datasets(
    days: int = 30,
    limit: int = 100,
    timeout: int = 15,
) -> list[OpenDataset]:
    """
    Obtiene datasets modificados recientemente en datos.gob.es.

    Returns:
        Lista de OpenDataset recientes.
    """
    try:
        import requests
        from_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime(
            "%Y-%m-%dT00:00:00"
        )
        resp = requests.get(
            _DATOS_GOB_SEARCH_URL,
            params={
                "_sort": "modified",
                "_pageSize": limit,
                "modified[gte]": from_date,
            },
            timeout=timeout,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("result", {}).get("items", []) or data.get("items", [])
        return [_normalize_native(item) for item in items[:limit]]
    except Exception as exc:
        logger.debug("harvest_recent_datasets: %s", exc)
        return []


def fetch_dataset(
    dataset_id: str,
    timeout: int = 15,
) -> OpenDataset | None:
    """Recupera un dataset concreto de datos.gob.es por su ID."""
    # Intentar API nativa
    try:
        import requests
        url = _DATOS_GOB_DATASET_URL.format(id=dataset_id)
        resp = requests.get(url, timeout=timeout,
                            headers={"Accept": "application/json"})
        resp.raise_for_status()
        data = resp.json()
        item = data.get("result", {}) or data
        if item:
            return _normalize_native(item)
    except Exception as exc:
        logger.debug("fetch_dataset native(%s): %s", dataset_id, exc)

    # Fallback CKAN
    return ckan_package_show(BASE_URL, dataset_id,
                              portal_id=PORTAL_ID, timeout=timeout)


def fetch_resources(
    dataset_id: str,
    timeout: int = 15,
) -> list[OpenDatasetResource]:
    """Lista los recursos de un dataset de datos.gob.es."""
    try:
        import requests
        url = _DATOS_GOB_DATASET_URL.format(id=dataset_id)
        resp = requests.get(url, timeout=timeout,
                            headers={"Accept": "application/json"})
        resp.raise_for_status()
        data = resp.json()
        item = data.get("result", {}) or data
        distributions = item.get("distribution", [])
        return [_normalize_distribution(d, dataset_id) for d in distributions]
    except Exception as exc:
        logger.debug("fetch_resources(%s): %s", dataset_id, exc)

    return ckan_list_resources(BASE_URL, dataset_id,
                               portal_id=PORTAL_ID, timeout=timeout)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _search_native(
    query: str, limit: int, theme: str | None, administration: str | None,
    timeout: int,
) -> list[OpenDataset]:
    """Búsqueda nativa en la API de datos.gob.es."""
    try:
        import requests
        params: dict = {"q": query, "_pageSize": limit, "_sort": "modified"}
        if theme:
            params["theme"] = theme
        if administration:
            params["publisher.code"] = administration
        resp = requests.get(
            _DATOS_GOB_SEARCH_URL,
            params=params,
            timeout=timeout,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("result", {}).get("items", []) or data.get("items", [])
        return [_normalize_native(item) for item in items[:limit]]
    except Exception as exc:
        logger.debug("_search_native: %s", exc)
        return []


def _normalize_native(item: dict) -> OpenDataset:
    """Normaliza un item de la API nativa de datos.gob.es a OpenDataset."""
    from ckan_connector import _parse_date
    ds_id = item.get("identifier") or item.get("id") or item.get("_id") or ""
    themes_raw = item.get("theme", [])
    if isinstance(themes_raw, str):
        themes_raw = [themes_raw]
    themes = [
        (t.get("prefLabel", [{}])[0].get("_value") or str(t))
        if isinstance(t, dict) else str(t)
        for t in themes_raw
    ]

    keywords_raw = item.get("keyword", [])
    if isinstance(keywords_raw, str):
        keywords_raw = [keywords_raw]
    keywords = [
        (k.get("_value") or str(k)) if isinstance(k, dict) else str(k)
        for k in keywords_raw
    ]

    publisher_raw = item.get("publisher", {})
    publisher = (
        publisher_raw.get("name") or publisher_raw.get("title")
        if isinstance(publisher_raw, dict) else str(publisher_raw)
    ) or None

    return OpenDataset(
        dataset_id=f"{PORTAL_ID}:{ds_id}" if ds_id else f"{PORTAL_ID}:{__import__('uuid').uuid4()}",
        portal_id=PORTAL_ID,
        title=_extract_label(item.get("title")) or ds_id or "Sin título",
        description=_extract_label(item.get("description")),
        themes=[t for t in themes if t],
        keywords=[k for k in keywords if k],
        publisher=publisher,
        license_id=item.get("license"),
        landing_page=item.get("landingPage"),
        issued_at=_parse_date(item.get("issued")),
        modified_at=_parse_date(item.get("modified")),
        update_frequency=_extract_label(item.get("accrualPeriodicity")),
        raw_payload={"id": ds_id, "num_resources": len(item.get("distribution", []))},
    )


def _extract_label(value: Any) -> str | None:
    """Extrae texto de campos multiidioma tipo [{_lang: es, _value: texto}]."""
    if not value:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        # Preferir español, luego cualquier idioma
        for item in value:
            if isinstance(item, dict) and item.get("_lang") in ("es", "spa"):
                return item.get("_value")
        for item in value:
            if isinstance(item, dict):
                return item.get("_value")
    if isinstance(value, dict):
        return value.get("_value") or value.get("es") or value.get("en")
    return str(value)


def _normalize_distribution(d: dict, dataset_id: str) -> OpenDatasetResource:
    """Normaliza una distribución DCAT a OpenDatasetResource."""
    from ckan_connector import _parse_date
    url = d.get("accessURL") or d.get("downloadURL") or ""
    fmt_raw = d.get("format", {})
    fmt = (
        fmt_raw.get("notation") or fmt_raw.get("prefLabel", [{}])[0].get("_value") or ""
        if isinstance(fmt_raw, dict) else str(fmt_raw)
    ).upper().strip()

    is_tabular = fmt in ("CSV", "XLSX", "XLS", "JSON", "XML", "ODS")
    is_document = fmt in ("PDF", "DOC", "DOCX")
    is_geospatial = fmt in ("GEOJSON", "KML", "SHP", "WMS", "WFS")

    return OpenDatasetResource(
        resource_id=f"{dataset_id}:{d.get('identifier') or __import__('uuid').uuid4()}",
        dataset_id=dataset_id,
        title=_extract_label(d.get("title")),
        url=url,
        download_url=d.get("downloadURL") or url,
        format=fmt or None,
        mime_type=d.get("mediaType"),
        size_bytes=_safe_bytes(d.get("byteSize")),
        last_modified=_parse_date(d.get("modified")),
        is_machine_readable=is_tabular or is_geospatial,
        is_geospatial=is_geospatial,
        is_tabular=is_tabular,
        is_document=is_document,
    )


def _safe_bytes(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
