"""
Spatial Joiner — Bloque 7.

Une señales de otros módulos a territorios:
  - resolve_territory_from_text    → texto → territory_id(s)
  - resolve_territory_from_coords  → lat/lon → territory_id
  - attach_territory_to_object     → objeto → territory_ids
  - spatial_join_points            → DataFrame de puntos → territorios

Si no hay geometrías, usa matching por nombres normalizados.
"""
from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

from etl.sources.geospatial.schemas import (
    SPAIN_PROVINCES,
    SPAIN_CCAA,
    TerritoryResolutionResult,
    build_territory_id,
)


# ── Nombres normalizados ───────────────────────────────────────────────────────

def _normalize(s: str) -> str:
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.strip()


# Cache de nombres → territory_id
_PROVINCE_NAME_MAP: dict[str, str] | None = None
_CCAA_NAME_MAP: dict[str, str] | None = None


def _get_province_map() -> dict[str, str]:
    global _PROVINCE_NAME_MAP
    if _PROVINCE_NAME_MAP is None:
        _PROVINCE_NAME_MAP = {
            _normalize(name): build_territory_id("province", code)
            for code, name in SPAIN_PROVINCES.items()
        }
    return _PROVINCE_NAME_MAP


def _get_ccaa_map() -> dict[str, str]:
    global _CCAA_NAME_MAP
    if _CCAA_NAME_MAP is None:
        _CCAA_NAME_MAP = {
            _normalize(name): build_territory_id("ccaa", code)
            for code, name in SPAIN_CCAA.items()
        }
    return _CCAA_NAME_MAP


# ── Resolución desde texto ────────────────────────────────────────────────────

def resolve_territory_from_text(
    text: str,
    territory_types: list[str] | None = None,
    max_results: int = 5,
) -> TerritoryResolutionResult:
    """
    Resuelve un texto a territory_id(s) usando NER y matching de nombres.

    Args:
        text: Texto que puede mencionar territorios.
        territory_types: Tipos a buscar ['province', 'ccaa', 'municipality'].
        max_results: Máximo de territorios a devolver.

    Returns:
        TerritoryResolutionResult con los territorios encontrados.
    """
    types = territory_types or ["province", "ccaa"]
    text_n = _normalize(text)

    found_ids: list[str] = []
    found_names: list[str] = []
    found_types: list[str] = []
    confidence = 0.0

    # Buscar provincias
    if "province" in types:
        prov_map = _get_province_map()
        for norm_name, tid in prov_map.items():
            if norm_name in text_n:
                if tid not in found_ids:
                    found_ids.append(tid)
                    found_names.append(SPAIN_PROVINCES[tid.split(":")[1]])
                    found_types.append("province")
                    confidence = max(confidence, 0.85)

    # Buscar CCAA
    if "ccaa" in types:
        ccaa_map = _get_ccaa_map()
        for norm_name, tid in ccaa_map.items():
            if norm_name in text_n:
                if tid not in found_ids:
                    found_ids.append(tid)
                    found_names.append(SPAIN_CCAA[tid.split(":")[1]])
                    found_types.append("ccaa")
                    confidence = max(confidence, 0.75)

    # Municipios capital de provincia (simplificado)
    if "municipality" in types:
        capitals = _resolve_capital_cities(text_n)
        for cap_id, cap_name in capitals:
            if cap_id not in found_ids:
                found_ids.append(cap_id)
                found_names.append(cap_name)
                found_types.append("municipality")
                confidence = max(confidence, 0.70)

    return TerritoryResolutionResult(
        query=text[:200],
        territory_ids=found_ids[:max_results],
        territory_names=found_names[:max_results],
        territory_types=found_types[:max_results],
        confidence=round(confidence, 3),
        method="text_match",
    )


def _resolve_capital_cities(text_n: str) -> list[tuple[str, str]]:
    """Detecta capitales de provincia conocidas en el texto."""
    # Simplificado: capitales que coinciden con el nombre de la provincia
    # Madrid, Barcelona, Valencia, Sevilla, Málaga son muy frecuentes
    _capitals = {
        "madrid": "mun:28079",
        "barcelona": "mun:08019",
        "valencia": "mun:46250",
        "sevilla": "mun:41091",
        "malaga": "mun:29067",
        "zaragoza": "mun:50297",
        "bilbao": "mun:48020",
        "murcia": "mun:30030",
        "palma": "mun:07040",
        "alicante": "mun:03014",
        "cordoba": "mun:14021",
        "granada": "mun:18087",
        "valladolid": "mun:47186",
        "pamplona": "mun:31201",
        "san sebastian": "mun:20069",
        "donostia": "mun:20069",
        "vitoria": "mun:01059",
    }
    result = []
    for name, tid in _capitals.items():
        if name in text_n:
            result.append((tid, name.title()))
    return result


def resolve_territory_from_coordinates(
    lat: float,
    lon: float,
    territory_type: str = "province",
) -> str | None:
    """
    Resuelve coordenadas a territory_id usando containment en geometrías.
    Si no hay geometrías, usa los centroides estáticos de provincias.

    Args:
        lat: Latitud.
        lon: Longitud.
        territory_type: Tipo de territorio objetivo.

    Returns:
        territory_id o None si no se puede determinar.
    """
    # Intentar con shapely y geometrías en memoria
    try:
        return _resolve_coords_with_shapely(lat, lon, territory_type)
    except Exception:
        pass

    # Fallback: distancia al centroide más cercano
    return _resolve_coords_by_centroid(lat, lon, territory_type)


def _resolve_coords_with_shapely(lat: float, lon: float, territory_type: str) -> str | None:
    """Usa shapely para containment si las geometrías están cargadas."""
    from etl.sources.geospatial.geojson_loader import load_default_geojson
    from shapely.geometry import Point, shape

    geometries = load_default_geojson(territory_type, resolution="low")
    if not geometries:
        raise RuntimeError("No geometries")

    point = Point(lon, lat)
    for geo in geometries:
        try:
            geom_dict = geo.geometry if isinstance(geo.geometry, dict) else {}
            if geom_dict:
                shp = shape(geom_dict)
                if shp.contains(point):
                    return geo.territory_id
        except Exception:
            continue
    return None


def _resolve_coords_by_centroid(lat: float, lon: float, territory_type: str) -> str | None:
    """Fallback: centroide más cercano de provincias estáticas."""
    if territory_type not in ("province",):
        return None

    from etl.sources.geospatial.ine_geography_adapter import _load_provinces_static

    provinces = _load_provinces_static()
    best_id = None
    best_dist = float("inf")

    for prov in provinces:
        if prov.lat is None or prov.lon is None:
            continue
        dist = (prov.lat - lat) ** 2 + (prov.lon - lon) ** 2
        if dist < best_dist:
            best_dist = dist
            best_id = prov.territory_id

    return best_id


def attach_territory_to_object(
    object_type: str,
    object_id: str,
    text: str,
    lat: float | None = None,
    lon: float | None = None,
) -> list[str]:
    """
    Resuelve territory_ids para un objeto de otro módulo.

    Args:
        object_type: Tipo de objeto ('media_item', 'legal_item', etc.).
        object_id: ID del objeto.
        text: Texto del objeto (para NER).
        lat, lon: Coordenadas opcionales.

    Returns:
        Lista de territory_ids.
    """
    ids: list[str] = []

    # Por coordenadas si están disponibles
    if lat is not None and lon is not None:
        tid = resolve_territory_from_coordinates(lat, lon)
        if tid:
            ids.append(tid)

    # Por texto
    if not ids:
        result = resolve_territory_from_text(text)
        ids.extend(result.territory_ids)

    return list(dict.fromkeys(ids))  # dedup preservando orden


def spatial_join_points_to_territories(
    points: pd.DataFrame,
    territory_type: str = "province",
    lat_col: str = "lat",
    lon_col: str = "lon",
    text_col: str | None = None,
) -> pd.DataFrame:
    """
    Une un DataFrame de puntos a territorios.

    Args:
        points: DataFrame con columnas de lat/lon o texto.
        territory_type: Tipo de territorio objetivo.
        lat_col, lon_col: Columnas de coordenadas.
        text_col: Columna de texto alternativa.

    Returns:
        DataFrame con columna adicional 'territory_id'.
    """
    if points.empty:
        return points.copy()

    result = points.copy()
    territory_ids = []

    for _, row in result.iterrows():
        tid = None

        # Por coordenadas
        if lat_col in row and lon_col in row:
            try:
                lat = float(row[lat_col])
                lon = float(row[lon_col])
                if not (pd.isna(lat) or pd.isna(lon)):
                    tid = resolve_territory_from_coordinates(lat, lon, territory_type)
            except (ValueError, TypeError):
                pass

        # Por texto
        if tid is None and text_col and text_col in row:
            try:
                res = resolve_territory_from_text(str(row[text_col]))
                if res.territory_ids:
                    tid = res.territory_ids[0]
            except Exception:
                pass

        territory_ids.append(tid)

    result["territory_id"] = territory_ids
    return result
