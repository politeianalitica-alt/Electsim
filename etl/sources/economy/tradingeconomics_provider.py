"""
TradingEconomics Provider — Bloque 5.

Provider opcional para TradingEconomics.
Requiere API key (TRADINGECONOMICS_API_KEY).

Si no está configurado, health_check devuelve 'disabled'.
"""
from __future__ import annotations

import logging
import os
from datetime import date

from .provider_base import BaseEconomicProvider
from .schemas import EconomicSeries, ProviderFetchResult, ProviderHealth

logger = logging.getLogger(__name__)


class TradingEconomicsProvider(BaseEconomicProvider):
    """Provider para TradingEconomics (requiere API key)."""

    name = "tradingeconomics"
    source = "TradingEconomics"
    requires_credentials = True
    supported_geographies = ["ES", "DE", "FR", "IT", "PT", "US", "EU"]
    supported_frequencies = ["daily", "monthly", "quarterly", "annual"]
    docs_url = "https://docs.tradingeconomics.com/"

    def __init__(self) -> None:
        super().__init__()
        self._api_key = os.environ.get("TRADINGECONOMICS_API_KEY", "")
        if not self._api_key:
            self._enabled = False
            logger.debug("TradingEconomics deshabilitado (sin API key).")

    def health_check(self) -> ProviderHealth:
        if not self._enabled or not self._api_key:
            return self._disabled()
        try:
            import tradingeconomics as te
            te.login(self._api_key)
            return self._ok(n_series=50)
        except ImportError:
            return ProviderHealth(
                provider=self.name,
                status="disabled",
                message="tradingeconomics package no instalado.",
            )
        except Exception as exc:
            return self._error(str(exc))

    def list_series(self) -> list[EconomicSeries]:
        return []

    def fetch_series(
        self,
        indicator_id: str,
        geography: str = "ES",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ProviderFetchResult:
        if not self._enabled:
            return self._fail(indicator_id, "TradingEconomics no configurado.")
        return self._fail(indicator_id, "Fetch no implementado en esta versión.")
