"""
GeoJSON Loader — Bloque 7.

Carga geometrías GeoJSON locales y las normaliza a TerritoryGeometry.
Soporta CCAA, provincias, municipios y secciones censales.

Directorio esperado:
  data/raw/geospatial/ccaa.geojson
  data/raw/geospatial/provincias.geojson
  data/raw/geospatial/municipios.geojson
  data/raw/geospatial/secciones_censales.geojson

Regla de rendimiento:
  full geometry   → almacenamiento / análisis espacial
  medium geometry → dashboard avanzado
  low geometry    → mapas rápidos (default)
"""
from __future__ import annotations

import json
import logging
import math
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Directorio raíz de geometrías
_GEO_DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "raw" / "geospatial"

# Ficheros por tipo de territorio
_GEOJSON_FILES: dict[str, str] = {
    "ccaa":           "ccaa.geojson",
    "province":       "provincias.geojson",
    "municipality":   "municipios.geojson",
    "census_section": "secciones_censales.geojson",
}

# Campos candidatos para el ID en el GeoJSON (por prioridad)
_ID_FIELD_CANDIDATES: dict[str, list[str]] = {
    "ccaa":           ["cod_ccaa", "codigo_ccaa", "codauto", "id_ccaa", "COD_CCAA"],
    "province":       ["cod_prov", "codigo", "cpro", "CPRO", "id_prov", "COD_PROV"],
    "municipality":   ["cod_mun", "codigo", "cmun", "CMUN", "CUSEC", "id_mun"],
    "census_section": ["cusec", "CUSEC", "seccion", "id_sec"],
}


def load_geojson(
    path: str | Path,
    territory_type: str,
    id_field: str | None = None,
    resolution: str = "medium",
) -> list:
    """
    Carga geometrías desde un fichero GeoJSON local.

    Args:
        path: Ruta al fichero GeoJSON.
        territory_type: Tipo de territorio ('province', 'municipality', etc.).
        id_field: Campo del GeoJSON que contiene el ID/código. Si None, auto-detecta.
        resolution: 'full', 'medium' o 'low'.

    Returns:
        Lista de TerritoryGeometry.
    """
    from etl.sources.geospatial.schemas import TerritoryGeometry, build_territory_id

    path = Path(path)
    if not path.exists():
        logger.warning("geojson_loader: fichero no encontrado: %s", path)
        return []

    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        logger.error("geojson_loader.load_geojson: %s", exc)
        return []

    features = data.get("features", [])
    if not features:
        logger.warning("geojson_loader: sin features en %s", path)
        return []

    # Auto-detectar campo ID
    if not id_field:
        id_field = _detect_id_field(features[0], territory_type)

    geometries = []
    for feat in features:
        try:
            props = feat.get("properties") or {}
            raw_id = _extract_id(props, id_field, territory_type)
            if not raw_id:
                continue

            territory_id = build_territory_id(territory_type, raw_id)
            geom = feat.get("geometry") or {}

            # Simplificar para resoluciones menores
            simplified = _simplify_geometry(geom, resolution)

            # Centroide y bbox desde geometría
            centroid = compute_centroid(feat)
            bbox = compute_bbox(feat)

            geometries.append(TerritoryGeometry(
                territory_id=territory_id,
                territory_type=territory_type,
                geometry_source=str(path.name),
                geometry_format="geojson",
                geometry=geom if resolution == "full" else simplified,
                simplified_geometry=simplified if resolution != "low" else None,
                centroid_lat=centroid[0] if centroid else None,
                centroid_lon=centroid[1] if centroid else None,
                bbox=bbox,
                resolution=resolution,
            ))
        except Exception as exc:
            logger.debug("geojson_loader feature error: %s", exc)

    logger.info(
        "geojson_loader: %d geometrías cargadas desde %s (res=%s)",
        len(geometries), path.name, resolution
    )
    return geometries


def load_default_geojson(
    territory_type: str,
    resolution: str = "low",
) -> list:
    """
    Intenta cargar el GeoJSON default para un tipo de territorio.
    Devuelve [] si el fichero no existe.
    """
    filename = _GEOJSON_FILES.get(territory_type)
    if not filename:
        return []
    path = _GEO_DATA_DIR / filename
    return load_geojson(path, territory_type, resolution=resolution)


def compute_centroid(feature: dict) -> tuple[float, float] | None:
    """
    Calcula el centroide de una feature GeoJSON.
    Aproximación simple: promedio de coordenadas del primer anillo.
    """
    try:
        geom = feature.get("geometry") or {}
        geom_type = geom.get("type", "")
        coords = geom.get("coordinates", [])

        if geom_type == "Point":
            return (coords[1], coords[0])
        elif geom_type in ("Polygon", "MultiPolygon"):
            # Extraer todos los puntos del primer anillo exterior
            if geom_type == "Polygon":
                ring = coords[0] if coords else []
            else:
                ring = coords[0][0] if coords and coords[0] else []

            if not ring:
                return None
            lons = [p[0] for p in ring if len(p) >= 2]
            lats = [p[1] for p in ring if len(p) >= 2]
            if not lons:
                return None
            return (sum(lats) / len(lats), sum(lons) / len(lons))
        elif geom_type == "LineString":
            lons = [p[0] for p in coords]
            lats = [p[1] for p in coords]
            return (sum(lats) / len(lats), sum(lons) / len(lons))
        return None
    except Exception:
        return None


def compute_bbox(feature: dict) -> list[float] | None:
    """
    Calcula el bounding box [minx, miny, maxx, maxy] de una feature.
    """
    try:
        geom = feature.get("geometry") or {}
        all_coords = _flatten_coords(geom)
        if not all_coords:
            return None
        lons = [c[0] for c in all_coords]
        lats = [c[1] for c in all_coords]
        return [min(lons), min(lats), max(lons), max(lats)]
    except Exception:
        return None


def _flatten_coords(geom: dict) -> list[list[float]]:
    """Aplana todas las coordenadas de una geometría."""
    geom_type = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if geom_type == "Point":
        return [coords] if coords else []
    elif geom_type == "LineString":
        return list(coords)
    elif geom_type == "Polygon":
        result = []
        for ring in coords:
            result.extend(ring)
        return result
    elif geom_type == "MultiPolygon":
        result = []
        for polygon in coords:
            for ring in polygon:
                result.extend(ring)
        return result
    elif geom_type == "MultiLineString":
        result = []
        for line in coords:
            result.extend(line)
        return result
    return []


def _simplify_geometry(geom: dict, resolution: str) -> dict:
    """
    Simplifica la geometría según la resolución.
    Sin geopandas/shapely, usa reducción de coordenadas por stride.
    """
    if resolution == "full":
        return geom

    # Intentar con shapely
    try:
        return _simplify_with_shapely(geom, resolution)
    except Exception:
        pass

    # Fallback: reducción por stride
    return _simplify_by_stride(geom, resolution)


def _simplify_with_shapely(geom: dict, resolution: str) -> dict:
    """Simplifica con shapely si está disponible."""
    from shapely.geometry import shape, mapping
    from shapely import simplify as shp_simplify

    tolerance = {"medium": 0.01, "low": 0.05}.get(resolution, 0.01)
    shp = shape(geom)
    simplified = shp_simplify(shp, tolerance=tolerance, preserve_topology=True)
    return dict(mapping(simplified))


def _simplify_by_stride(geom: dict, resolution: str) -> dict:
    """Simplifica reduciendo el número de puntos por stride."""
    stride = {"medium": 2, "low": 5}.get(resolution, 2)

    def reduce_ring(ring: list) -> list:
        if len(ring) <= 4:
            return ring
        reduced = ring[::stride]
        # Asegurar que el anillo cierra
        if reduced[-1] != ring[-1]:
            reduced.append(ring[-1])
        return reduced

    geom_type = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if geom_type == "Polygon":
        return {"type": "Polygon", "coordinates": [reduce_ring(r) for r in coords]}
    elif geom_type == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [[reduce_ring(r) for r in poly] for poly in coords]
        }
    return geom


def _detect_id_field(feature: dict, territory_type: str) -> str:
    """Auto-detecta el campo ID en los properties de un feature."""
    props = feature.get("properties") or {}
    candidates = _ID_FIELD_CANDIDATES.get(territory_type, ["id", "codigo"])
    for candidate in candidates:
        if candidate in props:
            return candidate
    # Fallback: buscar campos con 'cod' o 'id'
    for key in props:
        kl = key.lower()
        if "cod" in kl or kl == "id":
            return key
    return list(props.keys())[0] if props else "id"


def _extract_id(props: dict, id_field: str, territory_type: str) -> str | None:
    """Extrae y normaliza el ID de los properties."""
    val = props.get(id_field)
    if val is None:
        return None
    raw = str(val).strip().lstrip("0") or "0"
    # Para provincias: código 2 dígitos
    if territory_type == "province":
        return str(val).strip().zfill(2)
    # Para municipios: 5 dígitos (2 prov + 3 mun)
    if territory_type == "municipality":
        return str(val).strip().zfill(5)
    return raw


def save_geometries_to_db(geometries: list, engine: Any) -> int:
    """Persiste TerritoryGeometry en la tabla territory_geometries."""
    if not geometries or engine is None:
        return 0
    n = 0
    try:
        import json as _json
        from sqlalchemy import text as sa_text

        with engine.begin() as conn:
            for g in geometries:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO territory_geometries (
                            territory_id, territory_type, geometry_source,
                            geometry_format, geometry, simplified_geometry,
                            centroid_lat, centroid_lon, bbox, resolution
                        ) VALUES (
                            :territory_id, :territory_type, :geometry_source,
                            :geometry_format, :geometry::jsonb, :simplified_geometry::jsonb,
                            :centroid_lat, :centroid_lon, :bbox, :resolution
                        )
                        ON CONFLICT (territory_id, territory_type, resolution)
                        DO UPDATE SET
                            geometry = EXCLUDED.geometry,
                            simplified_geometry = EXCLUDED.simplified_geometry,
                            centroid_lat = EXCLUDED.centroid_lat,
                            centroid_lon = EXCLUDED.centroid_lon,
                            bbox = EXCLUDED.bbox,
                            updated_at = NOW()
                    """), {
                        "territory_id": g.territory_id,
                        "territory_type": g.territory_type,
                        "geometry_source": g.geometry_source,
                        "geometry_format": g.geometry_format,
                        "geometry": _json.dumps(g.geometry) if g.geometry else "{}",
                        "simplified_geometry": _json.dumps(g.simplified_geometry) if g.simplified_geometry else None,
                        "centroid_lat": g.centroid_lat,
                        "centroid_lon": g.centroid_lon,
                        "bbox": _json.dumps(g.bbox) if g.bbox else None,
                        "resolution": g.resolution,
                    })
                    n += 1
                except Exception as exc:
                    logger.debug("save_geometries_to_db item: %s", exc)
    except Exception as exc:
        logger.error("save_geometries_to_db: %s", exc)
    return n
