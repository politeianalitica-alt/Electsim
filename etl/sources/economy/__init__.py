"""
Economy ETL package — Bloque 5.

Módulo de Inteligencia Económica para ElectSim.
Exporta los modelos principales y el registry.
"""
from .schemas import (
    MacroIndicator,
    EconomicSeries,
    EconomicSignal,
    EconomicRiskScore,
    EconomicForecast,
    BudgetItem,
    ProviderHealth,
    ProviderFetchResult,
    CORE_INDICATOR_IDS,
    INDICATOR_CATEGORIES,
)

__all__ = [
    "MacroIndicator",
    "EconomicSeries",
    "EconomicSignal",
    "EconomicRiskScore",
    "EconomicForecast",
    "BudgetItem",
    "ProviderHealth",
    "ProviderFetchResult",
    "CORE_INDICATOR_IDS",
    "INDICATOR_CATEGORIES",
]
