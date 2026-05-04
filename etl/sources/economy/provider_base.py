"""
Provider Base — Bloque 5.

Interfaz base para los providers económicos de ElectSim.
Inspirado en la arquitectura provider-registry de OpenBB (AGPLv3) pero
implementado de forma completamente independiente para ElectSim.

No copia código de OpenBB. Solo adopta el patrón conceptual:
  "connect once, consume everywhere"

Cada provider implementa:
  - health_check()
  - list_series()
  - fetch_series(indicator_id, geography, start_date, end_date)
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import date, datetime, timezone
from typing import Any

from .schemas import (
    EconomicSeries,
    MacroIndicator,
    ProviderFetchResult,
    ProviderHealth,
)

logger = logging.getLogger(__name__)


class BaseEconomicProvider(ABC):
    """
    Clase base para todos los providers económicos de ElectSim.

    Implementar cada fuente de datos como una subclase de esta clase.
    """

    #: Nombre único del provider
    name: str = "base"
    #: Fuente de datos original
    source: str = "unknown"
    #: Si requiere credenciales (API key, etc.)
    requires_credentials: bool = False
    #: Geografías soportadas (ISO codes)
    supported_geographies: list[str] = ["ES"]
    #: Frecuencias soportadas
    supported_frequencies: list[str] = ["monthly", "quarterly", "annual"]
    #: URL de documentación
    docs_url: str = ""

    def __init__(self, **kwargs: Any) -> None:
        self._enabled = True
        self._logger = logging.getLogger(f"economy.{self.name}")

    def enable(self) -> None:
        self._enabled = True

    def disable(self) -> None:
        self._enabled = False

    @property
    def is_enabled(self) -> bool:
        return self._enabled

    @abstractmethod
    def health_check(self) -> ProviderHealth:
        """
        Verifica que el provider está disponible y operativo.

        Returns:
            ProviderHealth con status 'ok', 'degraded', 'error' o 'disabled'.
        """
        ...

    @abstractmethod
    def list_series(self) -> list[EconomicSeries]:
        """
        Lista todas las series disponibles en este provider.

        Returns:
            Lista de EconomicSeries con metadatos (sin datos).
        """
        ...

    @abstractmethod
    def fetch_series(
        self,
        indicator_id: str,
        geography: str = "ES",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ProviderFetchResult:
        """
        Descarga una serie específica.

        Args:
            indicator_id: ID del indicador a descargar.
            geography: Código ISO del territorio.
            start_date: Inicio del rango (None = desde el principio).
            end_date: Fin del rango (None = hasta hoy).

        Returns:
            ProviderFetchResult con los MacroIndicator descargados.
        """
        ...

    def fetch_core_indicators(
        self, geography: str = "ES"
    ) -> list[ProviderFetchResult]:
        """
        Descarga todos los indicadores core del provider.
        Por defecto delega en fetch_series() para cada serie conocida.
        Sobreescribir si el provider tiene un endpoint de batch.
        """
        results = []
        for series in self.list_series():
            try:
                result = self.fetch_series(series.indicator_id, geography)
                results.append(result)
            except Exception as exc:
                self._logger.debug(
                    "fetch_core_indicators: %s error: %s", series.indicator_id, exc
                )
                results.append(
                    ProviderFetchResult(
                        provider=self.name,
                        indicator_id=series.indicator_id,
                        geography=geography,
                        success=False,
                        error=str(exc),
                    )
                )
        return results

    def _ok(self, n_series: int = 0, latency_ms: float | None = None) -> ProviderHealth:
        return ProviderHealth(
            provider=self.name,
            status="ok",
            n_series=n_series,
            latency_ms=latency_ms,
        )

    def _error(self, message: str) -> ProviderHealth:
        return ProviderHealth(
            provider=self.name,
            status="error",
            message=message,
        )

    def _disabled(self) -> ProviderHealth:
        return ProviderHealth(
            provider=self.name,
            status="disabled",
            message=f"Provider {self.name} deshabilitado.",
        )

    def _success(
        self,
        indicator_id: str,
        indicators: list[MacroIndicator],
        geography: str = "ES",
    ) -> ProviderFetchResult:
        return ProviderFetchResult(
            provider=self.name,
            indicator_id=indicator_id,
            geography=geography,
            success=True,
            n_observations=len(indicators),
            indicators=indicators,
        )

    def _fail(
        self,
        indicator_id: str,
        error: str,
        geography: str = "ES",
    ) -> ProviderFetchResult:
        self._logger.debug("fetch_series(%s) error: %s", indicator_id, error)
        return ProviderFetchResult(
            provider=self.name,
            indicator_id=indicator_id,
            geography=geography,
            success=False,
            error=error,
        )
