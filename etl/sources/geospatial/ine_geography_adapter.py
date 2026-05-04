"""
INE Geography Adapter — Bloque 7.

Envuelve etl.sources.ine_geografia para:
  - Crear IDs estables (prov:28, ccaa:13, mun:28079)
  - Devolver Territory objects
  - No duplicar tablas existentes
  - Degradar si no hay conexión o el módulo no está disponible
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from etl.sources.geospatial.schemas import (
    Territory,
    SPAIN_PROVINCES,
    SPAIN_CCAA,
    PROVINCE_TO_CCAA,
    build_territory_id,
)


# ── Carga desde tablas existentes (BD) ────────────────────────────────────────

def load_ccaa(engine: Any = None) -> list[Territory]:
    """
    Carga CCAA desde la tabla comunidades_autonomas si existe,
    o usa datos estáticos como fallback.
    """
    territories: list[Territory] = []

    if engine is not None:
        territories = _load_ccaa_from_db(engine)

    if not territories:
        territories = _load_ccaa_static()

    logger.info("ine_geography_adapter: %d CCAA cargadas", len(territories))
    return territories


def _load_ccaa_from_db(engine: Any) -> list[Territory]:
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            rows = conn.execute(sa_text("""
                SELECT codigo, nombre, poblacion
                FROM comunidades_autonomas
                ORDER BY codigo
            """)).fetchall()
        territories = []
        for row in rows:
            code = str(row[0]).zfill(2)
            territories.append(Territory(
                territory_id=build_territory_id("ccaa", code),
                ine_code=code,
                name=str(row[1]),
                territory_type="ccaa",
                population=row[2] if row[2] else None,
            ))
        return territories
    except Exception as exc:
        logger.debug("_load_ccaa_from_db: %s", exc)
        return []


def _load_ccaa_static() -> list[Territory]:
    return [
        Territory(
            territory_id=build_territory_id("ccaa", code),
            ine_code=code,
            name=name,
            territory_type="ccaa",
            parent_id="ES",
        )
        for code, name in SPAIN_CCAA.items()
    ]


def load_provinces(engine: Any = None) -> list[Territory]:
    """
    Carga provincias desde la tabla provincias si existe,
    o usa datos estáticos como fallback.
    """
    territories: list[Territory] = []

    if engine is not None:
        territories = _load_provinces_from_db(engine)

    if not territories:
        territories = _load_provinces_static()

    logger.info("ine_geography_adapter: %d provincias cargadas", len(territories))
    return territories


def _load_provinces_from_db(engine: Any) -> list[Territory]:
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            rows = conn.execute(sa_text("""
                SELECT codigo, nombre, codigo_ccaa, poblacion, area_km2, latitud, longitud
                FROM provincias
                ORDER BY codigo
            """)).fetchall()
        territories = []
        for row in rows:
            code = str(row[0]).zfill(2)
            ccaa_code = str(row[2]).zfill(2) if row[2] else PROVINCE_TO_CCAA.get(code)
            territories.append(Territory(
                territory_id=build_territory_id("province", code),
                ine_code=code,
                name=str(row[1]),
                territory_type="province",
                parent_id=build_territory_id("ccaa", ccaa_code) if ccaa_code else None,
                ccaa_code=ccaa_code,
                province_code=code,
                population=row[3] if row[3] else None,
                area_km2=float(row[4]) if row[4] else None,
                lat=float(row[5]) if row[5] else None,
                lon=float(row[6]) if row[6] else None,
            ))
        return territories
    except Exception as exc:
        logger.debug("_load_provinces_from_db: %s", exc)
        return []


def _load_provinces_static() -> list[Territory]:
    """Provincias estáticas con centros aproximados."""
    # Centroides aproximados de capitales de provincia (lat, lon)
    _centroids: dict[str, tuple[float, float]] = {
        "28": (40.416775, -3.703790),  # Madrid
        "08": (41.385064, 2.173404),   # Barcelona
        "46": (39.469907, -0.376288),  # Valencia
        "41": (37.388630, -5.982329),  # Sevilla
        "29": (36.717076, -4.419711),  # Málaga
        "48": (43.262985, -2.934985),  # Vizcaya
        "50": (41.649693, -0.887712),  # Zaragoza
        "15": (43.371700, -8.395500),  # A Coruña
        "30": (37.983716, -1.130048),  # Murcia
        "07": (39.569600, 2.650160),   # Baleares
    }

    territories = []
    for code, name in SPAIN_PROVINCES.items():
        ccaa_code = PROVINCE_TO_CCAA.get(code)
        lat, lon = _centroids.get(code, (None, None))
        territories.append(Territory(
            territory_id=build_territory_id("province", code),
            ine_code=code,
            name=name,
            territory_type="province",
            parent_id=build_territory_id("ccaa", ccaa_code) if ccaa_code else "ES",
            ccaa_code=ccaa_code,
            province_code=code,
            lat=lat,
            lon=lon,
        ))
    return territories


def load_municipalities(engine: Any = None, limit: int = 8131) -> list[Territory]:
    """
    Carga municipios desde la tabla municipios si existe.
    Sin BD devuelve lista vacía (demasiados para hardcodear).
    """
    if engine is None:
        return []

    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            rows = conn.execute(sa_text("""
                SELECT codigo, nombre, codigo_provincia, codigo_ccaa,
                       poblacion, area_km2, latitud, longitud
                FROM municipios
                ORDER BY poblacion DESC NULLS LAST
                LIMIT :limit
            """), {"limit": limit}).fetchall()

        territories = []
        for row in rows:
            code = str(row[0]).zfill(5)
            prov_code = str(row[2]).zfill(2) if row[2] else code[:2]
            ccaa_code = str(row[3]).zfill(2) if row[3] else PROVINCE_TO_CCAA.get(prov_code)
            territories.append(Territory(
                territory_id=build_territory_id("municipality", code),
                ine_code=code,
                name=str(row[1]),
                territory_type="municipality",
                parent_id=build_territory_id("province", prov_code),
                ccaa_code=ccaa_code,
                province_code=prov_code,
                municipality_code=code,
                population=row[4] if row[4] else None,
                area_km2=float(row[5]) if row[5] else None,
                lat=float(row[6]) if row[6] else None,
                lon=float(row[7]) if row[7] else None,
            ))
        logger.info("ine_geography_adapter: %d municipios cargados", len(territories))
        return territories
    except Exception as exc:
        logger.debug("load_municipalities: %s", exc)
        return []


# ── Delegación a ine_geografia.py ─────────────────────────────────────────────

def sync_ine_geography(engine: Any = None) -> dict[str, Any]:
    """
    Sincroniza geografía desde la API del INE reutilizando ine_geografia.py.
    Devuelve resumen de la sincronización.
    """
    summary: dict[str, Any] = {
        "ccaa": 0, "provinces": 0, "municipalities": 0, "errors": []
    }

    try:
        from etl.sources import ine_geografia

        # Intentar ejecutar el extractor nativo
        if hasattr(ine_geografia, "IneGeografiaExtractor"):
            extractor = ine_geografia.IneGeografiaExtractor(engine)
            result = extractor.run()
            summary.update(result or {})
        elif hasattr(ine_geografia, "sync_all"):
            result = ine_geografia.sync_all(engine)
            summary.update(result or {})
        else:
            logger.debug("sync_ine_geography: ine_geografia sin método compatible")
    except Exception as exc:
        logger.warning("sync_ine_geography: %s", exc)
        summary["errors"].append(str(exc))

    # Verificar con carga directa
    if engine and summary["provinces"] == 0:
        provinces = _load_provinces_from_db(engine)
        summary["provinces"] = len(provinces)

    return summary


# ── Búsqueda de territorios ───────────────────────────────────────────────────

def find_province_by_name(name: str) -> Territory | None:
    """Busca una provincia por nombre normalizado (búsqueda aproximada)."""
    import unicodedata

    def normalize(s: str) -> str:
        s = s.lower()
        s = unicodedata.normalize("NFD", s)
        return "".join(c for c in s if unicodedata.category(c) != "Mn")

    name_n = normalize(name)
    static = _load_provinces_static()

    # Match exacto
    for t in static:
        if t.normalized_name == name_n:
            return t

    # Match parcial
    for t in static:
        if name_n in t.normalized_name or t.normalized_name in name_n:
            return t

    return None


def find_province_by_code(code: str) -> Territory | None:
    """Busca provincia por código INE."""
    code_padded = str(code).zfill(2)
    static = _load_provinces_static()
    for t in static:
        if t.ine_code == code_padded:
            return t
    return None


def get_provinces_as_dict() -> dict[str, str]:
    """Devuelve {territory_id: name} para todas las provincias estáticas."""
    return {
        build_territory_id("province", code): name
        for code, name in SPAIN_PROVINCES.items()
    }
