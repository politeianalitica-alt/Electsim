"""
Municipal Connector — Bloque 10.

Conectores para portales de datos abiertos municipales.
Madrid y Barcelona primero; soporte genérico CKAN para otros.
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import OpenDataset

logger = logging.getLogger(__name__)

_MUNICIPAL_PORTALS: dict[str, dict] = {
    "madrid_open_data": {
        "name": "Ayuntamiento de Madrid",
        "municipality": "Madrid",
        "region": "Madrid",
        "api_url": "https://datos.madrid.es",
        "portal_type": "ckan",
        "themes": ["transporte", "urbanismo", "medio ambiente", "economia", "sociedad"],
    },
    "barcelona_open_data": {
        "name": "Ajuntament de Barcelona",
        "municipality": "Barcelona",
        "region": "Cataluña",
        "api_url": "https://opendata-ajuntament.barcelona.cat/data",
        "portal_type": "ckan",
        "themes": ["transporte", "urbanismo", "economia", "turismo", "sociedad"],
    },
    "valencia_city": {
        "name": "Ajuntament de València",
        "municipality": "Valencia",
        "region": "Comunidad Valenciana",
        "api_url": "https://opendata.vlci.es",
        "portal_type": "ckan",
    },
    "bilbao_open_data": {
        "name": "Bilbao Open Data",
        "municipality": "Bilbao",
        "region": "País Vasco",
        "api_url": "https://opendata.bilbao.eus",
        "portal_type": "custom_api",
    },
}


def search_municipal_datasets(
    query: str,
    municipality: str | None = None,
    limit: int = 30,
    timeout: int = 15,
) -> list[OpenDataset]:
    """
    Busca datasets en portales municipales.

    Args:
        query: Texto de búsqueda.
        municipality: Filtrar por municipio.
        limit: Máximo de resultados.
        timeout: Timeout en segundos.

    Returns:
        Lista de OpenDataset. Vacía si falla.
    """
    from etl.sources.opendata.ckan_connector import ckan_package_search

    results: list[OpenDataset] = []
    portals = list(_MUNICIPAL_PORTALS.items())
    if municipality:
        portals = [
            (k, v) for k, v in _MUNICIPAL_PORTALS.items()
            if municipality.lower() in v.get("municipality", "").lower()
        ]

    for portal_id, config in portals:
        try:
            api_url = config.get("api_url", "")
            datasets = ckan_package_search(
                api_url, query, rows=limit,
                portal_id=portal_id, timeout=timeout,
            )
            results.extend(datasets)
        except Exception as exc:
            logger.debug("search_municipal_datasets(%s): %s", portal_id, exc)

    return results[:limit]


def list_madrid_datasets(limit: int = 50, timeout: int = 15) -> list[OpenDataset]:
    """Lista los datasets más recientes del portal de Madrid."""
    from etl.sources.opendata.ckan_connector import ckan_package_search
    return ckan_package_search(
        "https://datos.madrid.es", "",
        rows=limit, portal_id="madrid_open_data", timeout=timeout,
    )


def list_barcelona_datasets(limit: int = 50, timeout: int = 15) -> list[OpenDataset]:
    """Lista los datasets más recientes del portal de Barcelona."""
    from etl.sources.opendata.ckan_connector import ckan_package_search
    return ckan_package_search(
        "https://opendata-ajuntament.barcelona.cat/data", "",
        rows=limit, portal_id="barcelona_open_data", timeout=timeout,
    )


def list_municipal_portals() -> list[dict]:
    """Lista los portales municipales registrados."""
    return [{"portal_id": pid, **cfg} for pid, cfg in _MUNICIPAL_PORTALS.items()]
