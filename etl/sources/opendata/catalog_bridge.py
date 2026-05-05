"""
Catalog Bridge — Bloque 10.

Sincroniza catalog_source (Bloque 6) con el nuevo catálogo
de portales y datasets de datos abiertos.

No duplica catalog_source. Lo trata como catálogo maestro
y sincroniza en ambas direcciones cuando es posible.

catalog_source     = fuente estratégica de producto
open_data_portals  = portales de datos abiertos
open_data_datasets = datasets concretos
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import OpenDataPortal, OpenDataset

logger = logging.getLogger(__name__)

# Mapeo source_id → portal_id para sincronización
_SOURCE_TO_PORTAL_MAP: dict[str, str] = {
    "boe_opendata": "boe",
    "ine_rest": "ine",
    "eurostat": "eurostat",
    "eurlex": "eurlex",
    "datos_gob_es": "datos_gob_es",
    "bde_stats": "bde",
    "cnmv_hechos": "cnmv",
    "cnmc_datos": "cnmc",
    "place_contratacion": "place",
    "madrid_opendata": "madrid_open_data",
    "barcelona_opendata": "barcelona_open_data",
}

# Mapeo de temas de datasets a módulos de ElectSim
_THEME_TO_MODULES: dict[str, list[str]] = {
    "gobierno": ["legislative", "risk"],
    "legislacion": ["legislative"],
    "economia": ["economy"],
    "estadistica": ["economy", "electoral"],
    "presupuesto": ["economy", "risk"],
    "contratacion": ["contracting", "risk"],
    "licitacion": ["contracting", "risk"],
    "salud": ["regulatory", "risk"],
    "educacion": ["regulatory"],
    "medio_ambiente": ["regulatory", "geospatial"],
    "transporte": ["geospatial"],
    "urbanismo": ["geospatial"],
    "vivienda": ["economy", "geospatial"],
    "elecciones": ["electoral"],
    "partidos": ["electoral", "legislative"],
    "sociedad": ["economy", "electoral"],
    "ciencia": ["regulatory"],
    "agricultura": ["economy", "regulatory"],
    "energia": ["economy", "regulatory"],
}

# Mapeo de temas a sectores
_THEME_TO_SECTORS: dict[str, list[str]] = {
    "economia": ["economía", "finanzas"],
    "salud": ["sanidad"],
    "educacion": ["educación"],
    "energia": ["energía"],
    "agricultura": ["agro"],
    "transporte": ["transporte", "logística"],
    "vivienda": ["construcción", "inmobiliario"],
    "contratacion": ["administración pública"],
    "legislacion": ["administración pública"],
}


def sync_catalog_sources_to_portals(engine: Any = None) -> int:
    """
    Lee catalog_source y crea/actualiza entradas en open_data_portals.

    Returns:
        Número de portales sincronizados desde catalog_source.
    """
    if engine is None:
        logger.debug("sync_catalog_sources_to_portals: sin engine, omitiendo")
        return 0

    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            rows = conn.execute(sa_text("""
                SELECT source_id, name, source_type, base_url, api_url,
                       protocol, active, metadata
                FROM catalog_sources
                WHERE active = TRUE
                LIMIT 500
            """)).fetchall()
    except Exception as exc:
        logger.debug("sync_catalog_sources_to_portals: catalog_sources no existe: %s", exc)
        return 0

    synced = 0
    for row in rows:
        source_id = row[0]
        portal_id = _SOURCE_TO_PORTAL_MAP.get(source_id, f"cs_{source_id}")

        portal = OpenDataPortal(
            portal_id=portal_id,
            name=row[1] or source_id,
            administration_level="agency",
            base_url=row[3] or "",
            api_url=row[4],
            portal_type="custom_api",
            metadata={"synced_from_catalog_source": source_id},
        )

        from etl.sources.opendata.portal_registry import upsert_portal
        upsert_portal(portal, engine=engine)
        synced += 1

    logger.info("sync_catalog_sources_to_portals: %d sincronizados", synced)
    return synced


def create_catalog_source_from_portal(
    portal: OpenDataPortal,
    engine: Any = None,
) -> str | None:
    """
    Crea una entrada en catalog_sources para un portal dado.
    No duplica si ya existe.

    Returns:
        source_id creado, o None si catalog_sources no existe.
    """
    if engine is None:
        return None

    source_id = f"opendata_{portal.portal_id}"
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO catalog_sources (
                    source_id, name, source_type, base_url, api_url,
                    protocol, active, metadata
                ) VALUES (
                    :source_id, :name, :source_type, :base_url, :api_url,
                    :protocol, TRUE, :metadata::jsonb
                )
                ON CONFLICT (source_id) DO NOTHING
            """), {
                "source_id": source_id,
                "name": portal.name,
                "source_type": "open_data_portal",
                "base_url": portal.base_url,
                "api_url": portal.api_url,
                "protocol": portal.portal_type,
                "metadata": json.dumps({
                    "portal_id": portal.portal_id,
                    "administration_level": portal.administration_level,
                    "country": portal.country,
                }),
            })
        logger.debug("create_catalog_source_from_portal: %s", source_id)
        return source_id
    except Exception as exc:
        logger.debug("create_catalog_source_from_portal: %s", exc)
        return None


def map_dataset_to_catalog_modules(dataset: OpenDataset) -> list[str]:
    """
    Infiere módulos de ElectSim aplicables a partir de temas y keywords.

    Returns:
        Lista deduplicada de module IDs.
    """
    modules: set[str] = set()

    all_terms = (
        [t.lower() for t in dataset.themes] +
        [k.lower() for k in dataset.keywords] +
        ([dataset.title.lower()] if dataset.title else [])
    )

    for term in all_terms:
        for theme_key, module_list in _THEME_TO_MODULES.items():
            if theme_key in term:
                modules.update(module_list)

    # Reglas de keyword directo
    text = " ".join(all_terms)
    if any(w in text for w in ("contrat", "licitac", "adjudic", "compra")):
        modules.add("contracting")
        modules.add("risk")
    if any(w in text for w in ("eleccion", "vot", "partido", "escano")):
        modules.add("electoral")
        modules.add("legislative")
    if any(w in text for w in ("padron", "poblacion", "municipio", "geogr")):
        modules.add("geospatial")
    if any(w in text for w in ("boe", "ley", "real decreto", "normativ")):
        modules.add("legislative")
        modules.add("documents")
    if any(w in text for w in ("ine", "estadistic", "encuesta", "indicador")):
        modules.add("economy")

    return sorted(modules)


def map_dataset_to_catalog_sectors(dataset: OpenDataset) -> list[str]:
    """
    Infiere sectores aplicables a un dataset.

    Returns:
        Lista deduplicada de nombres de sector.
    """
    sectors: set[str] = set()
    all_terms = (
        [t.lower() for t in dataset.themes] +
        [k.lower() for k in dataset.keywords]
    )
    for term in all_terms:
        for theme_key, sector_list in _THEME_TO_SECTORS.items():
            if theme_key in term:
                sectors.update(sector_list)
    return sorted(sectors)
