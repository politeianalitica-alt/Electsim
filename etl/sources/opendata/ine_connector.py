"""
INE Connector — Bloque 10.

Descubre y cataloga series y operaciones del INE.
NO reemplaza economy/ine_provider.py (que ingiere indicadores concretos).

opendata/ine_connector = descubre y cataloga
economy/ine_provider   = ingiere indicadores concretos
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import OpenDataset, OpenDatasetResource, InstitutionalAPIEndpoint

logger = logging.getLogger(__name__)

PORTAL_ID = "ine"
BASE_URL = "https://www.ine.es"
API_BASE = "https://servicios.ine.es/wstempus/js/ES"

# Endpoints institucionales registrados
_INE_ENDPOINTS: list[dict] = [
    {
        "name": "INE — Operaciones estadísticas",
        "url_template": f"{API_BASE}/OPERACIONES_DISPONIBLES",
        "protocol": "rest_json",
        "applicable_modules": ["economy", "electoral", "geospatial"],
        "description": "Lista todas las operaciones estadísticas del INE.",
    },
    {
        "name": "INE — Series de una operación",
        "url_template": f"{API_BASE}/SERIES_OPERACION/{{operation_id}}",
        "protocol": "rest_json",
        "applicable_modules": ["economy"],
        "description": "Series estadísticas de una operación concreta.",
    },
    {
        "name": "INE — Datos de una serie",
        "url_template": f"{API_BASE}/DATOS_SERIE/{{series_id}}",
        "protocol": "rest_json",
        "applicable_modules": ["economy"],
        "description": "Datos de una serie temporal del INE.",
    },
    {
        "name": "INE — Tabla INEbase",
        "url_template": f"{API_BASE}/DATOS_TABLA/{{table_id}}",
        "protocol": "rest_json",
        "applicable_modules": ["economy", "geospatial"],
        "description": "Datos de una tabla del INEbase.",
    },
]


def list_ine_operations(timeout: int = 15) -> list[OpenDataset]:
    """
    Lista las operaciones estadísticas disponibles del INE.

    Returns:
        Lista de OpenDataset. Vacía si falla.
    """
    try:
        import requests
        resp = requests.get(f"{API_BASE}/OPERACIONES_DISPONIBLES",
                            timeout=timeout)
        resp.raise_for_status()
        ops = resp.json()
        return [_normalize_operation(op) for op in (ops or [])]
    except Exception as exc:
        logger.debug("list_ine_operations: %s", exc)
        return []


def list_ine_series(query: str, operation_id: str = "", timeout: int = 15) -> list[OpenDatasetResource]:
    """
    Lista series del INE filtrando por operación.

    Returns:
        Lista de recursos (series estadísticas).
    """
    try:
        import requests
        if not operation_id:
            return []
        url = f"{API_BASE}/SERIES_OPERACION/{operation_id}"
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        series = resp.json() or []
        return [
            OpenDatasetResource(
                resource_id=f"{PORTAL_ID}:series:{s.get('Id', '')}",
                dataset_id=f"{PORTAL_ID}:{operation_id}",
                title=s.get("Nombre") or str(s.get("Id", "")),
                url=f"{API_BASE}/DATOS_SERIE/{s.get('Id')}",
                format="JSON",
                is_machine_readable=True,
                is_tabular=True,
                raw_payload={"id": s.get("Id"), "cod": s.get("COD")},
            )
            for s in series
            if query.lower() in (s.get("Nombre") or "").lower() or not query
        ]
    except Exception as exc:
        logger.debug("list_ine_series(%s): %s", operation_id, exc)
        return []


def describe_ine_series(series_id: str, timeout: int = 10) -> dict:
    """Describe una serie estadística del INE."""
    try:
        import requests
        resp = requests.get(f"{API_BASE}/DATOS_SERIE/{series_id}",
                            timeout=timeout)
        resp.raise_for_status()
        return resp.json() or {}
    except Exception as exc:
        logger.debug("describe_ine_series(%s): %s", series_id, exc)
        return {}


def list_ine_api_endpoints() -> list[InstitutionalAPIEndpoint]:
    """Devuelve los endpoints institucionales registrados del INE."""
    endpoints = []
    for ep in _INE_ENDPOINTS:
        endpoints.append(InstitutionalAPIEndpoint(
            source_id=PORTAL_ID,
            name=ep["name"],
            description=ep.get("description"),
            url_template=ep["url_template"],
            protocol=ep["protocol"],
            applicable_modules=ep.get("applicable_modules", []),
        ))
    return endpoints


def _normalize_operation(op: dict) -> OpenDataset:
    return OpenDataset(
        dataset_id=f"{PORTAL_ID}:op:{op.get('Id') or op.get('Codigo', '')}",
        portal_id=PORTAL_ID,
        title=op.get("Nombre") or f"Operación {op.get('Id', '')}",
        description=op.get("Descripcion"),
        themes=["estadistica"],
        keywords=["ine", "estadistica"],
        publisher="INE",
        applicable_modules=["economy", "electoral", "geospatial"],
        raw_payload={"id": op.get("Id"), "codigo": op.get("Codigo")},
    )
