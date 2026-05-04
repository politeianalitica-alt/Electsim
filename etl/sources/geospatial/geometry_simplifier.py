"""
Geometry Simplifier — Bloque 7.

Simplifica geometrías GeoJSON a tres resoluciones:
  full   → almacenamiento / análisis espacial
  medium → dashboard avanzado (~0.01° tolerancia)
  low    → mapas rápidos (~0.05° tolerancia)

Usa shapely si está instalado; si no, reducción por stride.
No simplifica de forma destructiva la geometría full.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

TOLERANCES = {
    "full":   0.0,
    "medium": 0.01,
    "low":    0.05,
}

STRIDES = {
    "full":   1,
    "medium": 2,
    "low":    5,
}


def simplify(geom: dict[str, Any], resolution: str = "medium") -> dict[str, Any]:
    """
    Simplifica una geometría GeoJSON.

    Args:
        geom: GeoJSON geometry dict.
        resolution: 'full', 'medium', 'low'.

    Returns:
        Geometría simplificada (GeoJSON dict).
    """
    if resolution == "full" or not geom:
        return geom

    # Intentar shapely
    try:
        return _simplify_shapely(geom, resolution)
    except ImportError:
        pass
    except Exception as exc:
        logger.debug("simplify shapely failed: %s", exc)

    # Fallback stride
    return _simplify_stride(geom, resolution)


def _simplify_shapely(geom: dict, resolution: str) -> dict:
    """Simplificación con shapely.simplify (Douglas-Peucker)."""
    from shapely.geometry import shape, mapping
    from shapely import simplify as shp_simplify

    tolerance = TOLERANCES[resolution]
    shp = shape(geom)
    if not shp.is_valid:
        shp = shp.buffer(0)  # Fix invalid geometries
    simplified = shp_simplify(shp, tolerance=tolerance, preserve_topology=True)
    return dict(mapping(simplified))


def _simplify_stride(geom: dict, resolution: str) -> dict:
    """Simplificación por reducción de puntos (stride)."""
    stride = STRIDES.get(resolution, 2)
    geom_type = geom.get("type", "")
    coords = geom.get("coordinates", [])

    def reduce_ring(ring: list) -> list:
        if len(ring) <= 4:
            return ring
        reduced = ring[::stride]
        if reduced[-1] != ring[-1]:
            reduced.append(ring[-1])
        return reduced

    if geom_type == "Point":
        return geom
    elif geom_type == "LineString":
        return {"type": "LineString", "coordinates": coords[::stride]}
    elif geom_type == "Polygon":
        return {"type": "Polygon", "coordinates": [reduce_ring(r) for r in coords]}
    elif geom_type == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [[reduce_ring(r) for r in poly] for poly in coords]
        }
    elif geom_type == "MultiLineString":
        return {
            "type": "MultiLineString",
            "coordinates": [ring[::stride] for ring in coords]
        }
    return geom


def simplify_batch(
    geometries: list,
    resolution: str = "medium",
) -> list:
    """
    Simplifica un lote de TerritoryGeometry.
    Devuelve lista con simplified_geometry poblado.
    """
    result = []
    for geo in geometries:
        try:
            simplified = simplify(geo.geometry, resolution)
            geo.simplified_geometry = simplified
            geo.resolution = resolution
        except Exception as exc:
            logger.debug("simplify_batch item error: %s", exc)
        result.append(geo)
    return result


def is_shapely_available() -> bool:
    """Comprueba si shapely está disponible."""
    try:
        import shapely  # noqa: F401
        return True
    except ImportError:
        return False


def estimate_complexity(geom: dict) -> int:
    """Estima el número de puntos de una geometría (útil para decidir si simplificar)."""
    total = 0

    def count(coords_any) -> int:
        if not coords_any:
            return 0
        if isinstance(coords_any[0], (int, float)):
            return 1
        return sum(count(c) for c in coords_any)

    return count(geom.get("coordinates", []))
