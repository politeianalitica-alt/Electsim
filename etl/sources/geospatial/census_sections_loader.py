"""
Census Sections Loader — Bloque 7.

Carga secciones censales (8.131 municipios × ~36.000 secciones).

⚠️  ADVERTENCIA DE RENDIMIENTO:
    Las secciones censales son muy pesadas para el dashboard (>50MB).
    Por defecto NO se cargan en el dashboard.
    Usar solo en pipelines offline o análisis específicos.

Uso:
    python -m pipelines.territorial_core --load-census-sections

Fuente: INE — Cartografía de Secciones Censales
  https://www.ine.es/ss/Satellite?L=es_ES&c=Page&cid=1259952026632&p=1259952026632&pagename=ProductosYServicios/PYSLayout
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SECTIONS_FILE = Path(__file__).parent.parent.parent.parent / "data" / "raw" / "geospatial" / "secciones_censales.geojson"


def load_census_sections(
    path: str | Path | None = None,
    ccaa_filter: str | None = None,
    province_filter: str | None = None,
    resolution: str = "low",
    warn_size: bool = True,
) -> list:
    """
    Carga secciones censales desde GeoJSON.

    Args:
        path: Ruta al GeoJSON. Si None, usa el path por defecto.
        ccaa_filter: Código CCAA para filtrar (ej. "13" para Madrid).
        province_filter: Código provincia para filtrar (ej. "28").
        resolution: Resolución ('full', 'medium', 'low'). Default: 'low'.
        warn_size: Si True, advierte del tamaño del dataset.

    Returns:
        Lista de TerritoryGeometry.
    """
    if warn_size:
        logger.warning(
            "census_sections_loader: Las secciones censales son muy pesadas. "
            "Usa --province-filter para reducir el volumen. "
            "No cargar en dashboard sin simplificar."
        )

    path = Path(path) if path else _SECTIONS_FILE

    if not path.exists():
        logger.warning(
            "census_sections_loader: fichero no encontrado: %s\n"
            "Descarga desde: https://www.ine.es/ss/Satellite?L=es_ES&c=Page&cid=1259952026632",
            path,
        )
        return []

    from etl.sources.geospatial.geojson_loader import load_geojson

    geometries = load_geojson(
        path=path,
        territory_type="census_section",
        resolution=resolution,
    )

    # Filtrar por provincia si se especifica
    if province_filter:
        geometries = [
            g for g in geometries
            if g.territory_id.startswith(f"sec:{province_filter}")
        ]

    # Filtrar por CCAA (requiere mapeo provincia→CCAA)
    if ccaa_filter and not province_filter:
        from etl.sources.geospatial.schemas import PROVINCE_TO_CCAA
        prov_codes = {
            code for code, ccaa in PROVINCE_TO_CCAA.items() if ccaa == ccaa_filter
        }
        geometries = [
            g for g in geometries
            if any(g.territory_id.startswith(f"sec:{prov}") for prov in prov_codes)
        ]

    logger.info(
        "census_sections_loader: %d secciones censales cargadas (res=%s)",
        len(geometries), resolution
    )
    return geometries


def estimate_census_sections_size(path: str | Path | None = None) -> dict[str, Any]:
    """Estima el tamaño del fichero de secciones censales sin cargarlo completo."""
    import os
    path = Path(path) if path else _SECTIONS_FILE

    if not path.exists():
        return {"exists": False, "path": str(path)}

    size_mb = os.path.getsize(path) / 1024 / 1024
    return {
        "exists": True,
        "path": str(path),
        "size_mb": round(size_mb, 1),
        "warning": size_mb > 50,
        "recommendation": (
            "Usa load_census_sections(province_filter='28') para cargar solo una provincia."
            if size_mb > 50 else "Tamaño manejable."
        ),
    }
