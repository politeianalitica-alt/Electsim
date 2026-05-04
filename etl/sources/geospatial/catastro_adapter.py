"""
Catastro Adapter — Bloque 7.

Stub para integración futura con la Sede Electrónica del Catastro (SEC).
Por ahora devuelve datos vacíos sin hacer scraping ni peticiones.

Catastro útil para:
  - Valoración de inmuebles por municipio
  - Densidad de activos inmobiliarios
  - Indicadores de riqueza territorial

NO hace peticiones en esta versión. Implementar cuando se añada el conector
ETL correspondiente en apps/workers/connectors/catastro/.

Documentación futura:
  https://www.sedecatastro.gob.es/
  OGC WMS: https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def load_catastro_summary(
    province_code: str | None = None,
    municipality_code: str | None = None,
    engine: Any = None,
) -> dict[str, Any]:
    """
    Carga resumen catastral de un territorio.

    Stub — devuelve dict vacío hasta implementar el conector ETL.

    Args:
        province_code: Código INE de provincia (ej. "28").
        municipality_code: Código INE de municipio (ej. "28079").
        engine: SQLAlchemy engine (no usado en este stub).

    Returns:
        Dict con datos catastrales o vacío si no disponible.
    """
    logger.debug(
        "catastro_adapter: stub invocado (prov=%s, mun=%s). "
        "Implementar conector ETL en apps/workers/connectors/catastro/",
        province_code, municipality_code
    )
    return {}


def load_catastro_by_territory(
    territory_id: str,
    engine: Any = None,
) -> dict[str, Any]:
    """
    Carga datos catastrales para un territory_id estable.

    Stub — devuelve dict vacío.

    Args:
        territory_id: ID estable del territorio (ej. "prov:28", "mun:28079").
        engine: SQLAlchemy engine (no usado).

    Returns:
        Dict con datos catastrales o vacío.
    """
    logger.debug("catastro_adapter: stub invocado para %s", territory_id)
    return {
        "territory_id": territory_id,
        "available": False,
        "note": "Catastro adapter no implementado. Ver apps/workers/connectors/catastro/",
    }


def get_property_density_by_province(engine: Any = None) -> dict[str, float]:
    """
    Devuelve densidad de inmuebles por provincia (proxy de riqueza inmobiliaria).

    Stub — retorna dict vacío.

    Returns:
        Dict territory_id → densidad (inmuebles/km²).
    """
    logger.debug("catastro_adapter.get_property_density_by_province: stub")
    return {}


def is_catastro_available(engine: Any = None) -> bool:
    """Comprueba si hay datos catastrales disponibles."""
    return False
