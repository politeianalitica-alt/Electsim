"""
Geospatial ETL package — Bloque 7.

Capa territorial común para Electoral, Campaña, Economía, Medios,
Legislación, Riesgo y Politeia Brain.
"""
from etl.sources.geospatial.schemas import (
    Territory,
    TerritoryGeometry,
    TerritorialSignal,
    TerritoryProfile,
    TerritorialAdjacency,
    TerritoryResolutionResult,
    SIGNAL_TYPES,
    TERRITORY_TYPES,
)

__all__ = [
    "Territory",
    "TerritoryGeometry",
    "TerritorialSignal",
    "TerritoryProfile",
    "TerritorialAdjacency",
    "TerritoryResolutionResult",
    "SIGNAL_TYPES",
    "TERRITORY_TYPES",
]
