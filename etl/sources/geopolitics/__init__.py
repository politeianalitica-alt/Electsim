"""
Geopolitics package — Bloque 14.

Core geopolítico persistente para ElectSim:
ACLED · GDELT · UCDP · Riesgo País · Presencia Española · Impacto Doméstico.

Importaciones de uso frecuente::

    from etl.sources.geopolitics.schemas import GeoEvent, CountryRiskProfile
    from etl.sources.geopolitics.acled_client import fetch_acled_events
    from etl.sources.geopolitics.geo_risk_scorer import compute_country_risk_profile
"""
from __future__ import annotations

__all__ = [
    "schemas",
    "acled_client",
    "gdelt_client",
    "ucdp_client",
    "geo_event_adapter",
    "geo_risk_scorer",
    "geo_signal_detector",
    "geo_impact_model",
]
