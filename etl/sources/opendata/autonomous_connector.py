"""
Autonomous Community Connector — Bloque 10.

Catálogo básico de portales autonómicos y búsqueda de datasets.
Usa CKAN cuando el portal lo soporta, fallback manual si no.
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import OpenDataset

logger = logging.getLogger(__name__)

# Portales autonómicos con configuración básica
_AUTONOMOUS_PORTALS: dict[str, dict] = {
    "andalucia_open_data": {
        "name": "Junta de Andalucía",
        "region": "Andalucía",
        "api_url": "https://www.juntadeandalucia.es/datosabiertos",
        "portal_type": "ckan",
    },
    "catalunya_open_data": {
        "name": "Generalitat de Catalunya",
        "region": "Cataluña",
        "api_url": "https://analisi.transparenciacatalunya.cat",
        "portal_type": "socrata",
    },
    "euskadi_open_data": {
        "name": "Gobierno Vasco",
        "region": "País Vasco",
        "api_url": "https://opendata.euskadi.eus",
        "portal_type": "custom_api",
    },
    "valencia_open_data": {
        "name": "Generalitat Valenciana",
        "region": "Comunidad Valenciana",
        "api_url": "https://dadesobertes.gva.es",
        "portal_type": "ckan",
    },
    "galicia_open_data": {
        "name": "Xunta de Galicia",
        "region": "Galicia",
        "api_url": "https://abertos.xunta.gal",
        "portal_type": "ckan",
    },
}


def search_autonomous_datasets(
    query: str,
    region: str | None = None,
    limit: int = 30,
    timeout: int = 15,
) -> list[OpenDataset]:
    """
    Busca datasets en portales autonómicos.

    Args:
        query: Texto de búsqueda.
        region: Filtrar por comunidad autónoma.
        limit: Máximo de resultados por portal.
        timeout: Timeout en segundos.

    Returns:
        Lista de OpenDataset de todos los portales buscados.
    """
    from etl.sources.opendata.ckan_connector import ckan_package_search

    results: list[OpenDataset] = []
    portals = _AUTONOMOUS_PORTALS.items()
    if region:
        portals = [
            (k, v) for k, v in _AUTONOMOUS_PORTALS.items()
            if region.lower() in v.get("region", "").lower()
        ]

    for portal_id, config in portals:
        api_url = config.get("api_url", "")
        portal_type = config.get("portal_type", "unknown")

        try:
            if portal_type == "ckan":
                datasets = ckan_package_search(
                    api_url, query, rows=limit,
                    portal_id=portal_id, timeout=timeout,
                )
                results.extend(datasets)
            else:
                # Fallback: buscar por título en datos.gob.es con filtro de organismo
                from etl.sources.opendata.datos_gob_connector import search_datasets
                datasets = search_datasets(
                    f"{query} {config.get('region', '')}",
                    limit=limit // 2,
                    timeout=timeout,
                )
                # Marcar como procedentes del portal autonómico si aplica
                for ds in datasets:
                    if config.get("region", "").lower() in (ds.title or "").lower():
                        results.append(ds)
        except Exception as exc:
            logger.debug("search_autonomous_datasets(%s, %s): %s", portal_id, query, exc)

    return results[:limit]


def list_autonomous_portals() -> list[dict]:
    """Lista los portales autonómicos registrados."""
    return [
        {"portal_id": pid, **cfg}
        for pid, cfg in _AUTONOMOUS_PORTALS.items()
    ]


def get_autonomous_portal(portal_id: str) -> dict | None:
    """Devuelve configuración de un portal autonómico."""
    return _AUTONOMOUS_PORTALS.get(portal_id)
