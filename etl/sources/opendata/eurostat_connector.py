"""
Eurostat Connector — Bloque 10.

Descubre y cataloga datasets de Eurostat.
No reemplaza economy/ine_provider.py.

Usa la API SDMX de Eurostat para metadata,
y el catálogo JSON para búsqueda.
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import OpenDataset, OpenDatasetResource, InstitutionalAPIEndpoint

logger = logging.getLogger(__name__)

PORTAL_ID = "eurostat"
BASE_URL = "https://ec.europa.eu/eurostat"
_CATALOG_URL = "https://ec.europa.eu/eurostat/api/dissemination/catalogue/datasets"
_SDMX_BASE = "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1"


def search_eurostat_datasets(
    query: str,
    limit: int = 50,
    timeout: int = 20,
) -> list[OpenDataset]:
    """
    Busca datasets de Eurostat por texto.

    Returns:
        Lista de OpenDataset. Vacía si falla.
    """
    try:
        import requests
        # Eurostat expone un catálogo JSON con todos los datasets
        resp = requests.get(
            _CATALOG_URL,
            timeout=timeout,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        catalog = resp.json()
        datasets = catalog.get("datasets", catalog if isinstance(catalog, list) else [])
        query_lower = query.lower()
        results = []
        for ds in datasets:
            title = ds.get("title", {}).get("en") or ds.get("title") or ""
            label = ds.get("label", "")
            if query_lower in title.lower() or query_lower in label.lower():
                results.append(_normalize_eurostat(ds))
            if len(results) >= limit:
                break
        return results
    except Exception as exc:
        logger.debug("search_eurostat_datasets(%s): %s", query, exc)
        return []


def describe_eurostat_dataset(dataset_code: str, timeout: int = 15) -> dict:
    """Describe un dataset de Eurostat por su código (ej: 'nama_10_gdp')."""
    try:
        import requests
        url = f"{_SDMX_BASE}/datastructure/ESTAT/{dataset_code}"
        resp = requests.get(url, timeout=timeout,
                            headers={"Accept": "application/json"})
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.debug("describe_eurostat_dataset(%s): %s", dataset_code, exc)
        return {}


def list_eurostat_api_endpoints() -> list[InstitutionalAPIEndpoint]:
    """Endpoints institucionales de Eurostat."""
    return [
        InstitutionalAPIEndpoint(
            source_id=PORTAL_ID,
            name="Eurostat — SDMX Data",
            url_template=f"{_SDMX_BASE}/data/{{dataset_code}}",
            protocol="rest_json",
            description="Datos estadísticos de Eurostat por código de dataset.",
            applicable_modules=["economy", "geospatial"],
        ),
        InstitutionalAPIEndpoint(
            source_id=PORTAL_ID,
            name="Eurostat — Catálogo de datasets",
            url_template=_CATALOG_URL,
            protocol="rest_json",
            description="Catálogo completo de datasets de Eurostat.",
            applicable_modules=["economy"],
        ),
    ]


def _normalize_eurostat(raw: dict) -> OpenDataset:
    code = raw.get("code") or raw.get("id") or ""
    title_obj = raw.get("title") or {}
    title = (
        title_obj.get("es") or title_obj.get("en") or str(title_obj)
        if isinstance(title_obj, dict) else str(title_obj)
    ) or code

    return OpenDataset(
        dataset_id=f"{PORTAL_ID}:{code}",
        portal_id=PORTAL_ID,
        title=title,
        description=(raw.get("description") or {}).get("en"),
        themes=["economia", "estadistica"],
        keywords=["eurostat", "ue", code],
        publisher="Eurostat",
        applicable_modules=["economy", "geospatial"],
        raw_payload={"code": code},
    )
