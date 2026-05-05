"""
CKAN Connector — Bloque 10.

Conector genérico para portales CKAN (datos.gob.es, autonómicos, etc.).
CKAN expone una API REST estándar en /api/3/action/*.

Funciones:
  ckan_package_search, ckan_package_show,
  ckan_resource_normalize, ckan_dataset_normalize.
"""
from __future__ import annotations

import logging
from typing import Any
from datetime import datetime, timezone

from etl.sources.opendata.schemas import OpenDataset, OpenDatasetResource

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = 15
_DEFAULT_ROWS = 50


def ckan_package_search(
    api_url: str,
    query: str,
    rows: int = _DEFAULT_ROWS,
    portal_id: str = "unknown",
    timeout: int = _DEFAULT_TIMEOUT,
) -> list[OpenDataset]:
    """
    Busca datasets en un portal CKAN.

    Args:
        api_url: URL base del portal (ej: https://datos.gob.es).
        query: Texto de búsqueda.
        rows: Número máximo de resultados.
        portal_id: ID del portal para mapear datasets.
        timeout: Timeout en segundos.

    Returns:
        Lista de OpenDataset normalizados. Vacía si falla.
    """
    try:
        import requests
        endpoint = f"{api_url.rstrip('/')}/api/3/action/package_search"
        resp = requests.get(
            endpoint,
            params={"q": query, "rows": rows},
            timeout=timeout,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        packages = data.get("result", {}).get("results", [])
        return [ckan_dataset_normalize(p, portal_id) for p in packages]
    except Exception as exc:
        logger.debug("ckan_package_search(%s, %s): %s", api_url, query, exc)
        return []


def ckan_package_show(
    api_url: str,
    dataset_id: str,
    portal_id: str = "unknown",
    timeout: int = _DEFAULT_TIMEOUT,
) -> OpenDataset | None:
    """Recupera un dataset CKAN por su ID/slug."""
    try:
        import requests
        endpoint = f"{api_url.rstrip('/')}/api/3/action/package_show"
        resp = requests.get(
            endpoint,
            params={"id": dataset_id},
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        pkg = data.get("result", {})
        if pkg:
            return ckan_dataset_normalize(pkg, portal_id)
    except Exception as exc:
        logger.debug("ckan_package_show(%s, %s): %s", api_url, dataset_id, exc)
    return None


def ckan_dataset_normalize(raw: dict, portal_id: str) -> OpenDataset:
    """
    Normaliza un paquete CKAN a OpenDataset.
    """
    # Fechas
    issued_at = _parse_date(raw.get("metadata_created") or raw.get("issued"))
    modified_at = _parse_date(raw.get("metadata_modified") or raw.get("modified"))

    # Temas y keywords
    themes: list[str] = []
    for group in raw.get("groups", []):
        name = group.get("display_name") or group.get("name") or ""
        if name:
            themes.append(name)
    for extra in raw.get("extras", []):
        if extra.get("key") == "theme":
            themes.extend((extra.get("value") or "").split(","))

    keywords: list[str] = [
        t.get("name") or t.get("display_name", "") or ""
        for t in raw.get("tags", [])
    ]
    keywords = [k for k in keywords if k]

    # Licencia
    license_id = raw.get("license_id")
    license_title = raw.get("license_title")
    license_url = raw.get("license_url")

    return OpenDataset(
        dataset_id=f"{portal_id}:{raw.get('id') or raw.get('name', _uuid())}",
        portal_id=portal_id,
        title=raw.get("title") or raw.get("name") or "Sin título",
        description=raw.get("notes") or raw.get("description"),
        themes=[t.strip() for t in themes if t.strip()],
        keywords=[k.strip() for k in keywords if k.strip()],
        publisher=(raw.get("organization") or {}).get("title"),
        organization=(raw.get("organization") or {}).get("name"),
        license_id=license_id,
        license_title=license_title,
        license_url=license_url,
        landing_page=raw.get("url") or raw.get("landing_page"),
        issued_at=issued_at,
        modified_at=modified_at,
        update_frequency=raw.get("frequency") or raw.get("accrualPeriodicity"),
        raw_payload={
            "id": raw.get("id"),
            "name": raw.get("name"),
            "num_resources": raw.get("num_resources", 0),
        },
    )


def ckan_resource_normalize(resource: dict, dataset_id: str) -> OpenDatasetResource:
    """Normaliza un recurso CKAN a OpenDatasetResource."""
    fmt = (resource.get("format") or "").upper().strip()
    url = resource.get("url") or resource.get("download_url") or ""

    is_tabular = fmt in ("CSV", "XLSX", "XLS", "JSON", "GEOJSON", "XML", "ODS")
    is_document = fmt in ("PDF", "DOC", "DOCX", "HTML", "HTM")
    is_geospatial = fmt in ("GEOJSON", "KML", "SHP", "SHAPEFILE", "WMS", "WFS")
    is_machine_readable = is_tabular or is_geospatial or fmt in (
        "JSON", "XML", "RDF", "SPARQL"
    )

    return OpenDatasetResource(
        resource_id=f"{dataset_id}:{resource.get('id') or _uuid()}",
        dataset_id=dataset_id,
        title=resource.get("name") or resource.get("description"),
        description=resource.get("description"),
        url=url,
        format=fmt or None,
        mime_type=resource.get("mimetype") or resource.get("mime_type"),
        size_bytes=_safe_int(resource.get("size")),
        download_url=url,
        last_modified=_parse_date(resource.get("last_modified")),
        is_machine_readable=is_machine_readable,
        is_geospatial=is_geospatial,
        is_tabular=is_tabular,
        is_document=is_document,
        raw_payload={"id": resource.get("id")},
    )


def ckan_list_resources(
    api_url: str,
    dataset_id: str,
    portal_id: str = "unknown",
    timeout: int = _DEFAULT_TIMEOUT,
) -> list[OpenDatasetResource]:
    """Lista recursos de un dataset CKAN."""
    ds = ckan_package_show(api_url, dataset_id, portal_id=portal_id, timeout=timeout)
    if not ds:
        return []
    raw_ds = ds.raw_payload
    # Si el resultado tiene resources directamente
    try:
        import requests
        endpoint = f"{api_url.rstrip('/')}/api/3/action/package_show"
        resp = requests.get(endpoint, params={"id": dataset_id}, timeout=timeout)
        resp.raise_for_status()
        pkg = resp.json().get("result", {})
        return [
            ckan_resource_normalize(r, ds.dataset_id)
            for r in pkg.get("resources", [])
        ]
    except Exception as exc:
        logger.debug("ckan_list_resources: %s", exc)
        return []


# ── Helpers ────────────────────────────────────────────────────────────────────

def _parse_date(value: Any) -> datetime | None:
    """Parsea fechas de formato ISO o timestamp."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        from dateutil import parser as dp
        return dp.parse(str(value))
    except Exception:
        pass
    try:
        # Formato simple
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(str(value)[:19], fmt).replace(
                    tzinfo=timezone.utc
                )
            except ValueError:
                continue
    except Exception:
        pass
    return None


def _safe_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _uuid() -> str:
    import uuid
    return str(uuid.uuid4())
