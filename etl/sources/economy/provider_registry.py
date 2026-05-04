"""
Provider Registry — Bloque 5.

Registro central de providers económicos de ElectSim.
Gestiona el ciclo de vida, health y fetch de todos los providers.

Uso:
    from etl.sources.economy.provider_registry import get_registry
    registry = get_registry()
    registry.health()
    registry.fetch_all_core_indicators("ES")
"""
from __future__ import annotations

import logging
from typing import Any

from .provider_base import BaseEconomicProvider
from .schemas import MacroIndicator, ProviderFetchResult, ProviderHealth

logger = logging.getLogger(__name__)


class EconomyProviderRegistry:
    """
    Registro central de providers económicos.

    Los providers se registran al importar sus módulos
    o explícitamente con registry.register(provider).
    """

    def __init__(self) -> None:
        self._providers: dict[str, BaseEconomicProvider] = {}

    def register(self, provider: BaseEconomicProvider) -> None:
        """Registra un provider. Sobreescribe si ya existe."""
        self._providers[provider.name] = provider
        logger.debug("Provider registrado: %s", provider.name)

    def unregister(self, name: str) -> None:
        self._providers.pop(name, None)

    def get(self, name: str) -> BaseEconomicProvider | None:
        return self._providers.get(name)

    def list_providers(self) -> list[str]:
        return list(self._providers.keys())

    def health(self) -> dict[str, ProviderHealth]:
        """Verifica el estado de todos los providers."""
        results: dict[str, ProviderHealth] = {}
        for name, provider in self._providers.items():
            try:
                results[name] = provider.health_check()
            except Exception as exc:
                results[name] = ProviderHealth(
                    provider=name,
                    status="error",
                    message=str(exc),
                )
        return results

    def fetch_indicator(
        self,
        provider_name: str,
        indicator_id: str,
        geography: str = "ES",
        **kwargs: Any,
    ) -> ProviderFetchResult:
        """Fetches un indicador de un provider específico."""
        provider = self._providers.get(provider_name)
        if not provider:
            return ProviderFetchResult(
                provider=provider_name,
                indicator_id=indicator_id,
                geography=geography,
                success=False,
                error=f"Provider '{provider_name}' no registrado.",
            )
        if not provider.is_enabled:
            return ProviderFetchResult(
                provider=provider_name,
                indicator_id=indicator_id,
                geography=geography,
                success=False,
                error=f"Provider '{provider_name}' deshabilitado.",
            )
        return provider.fetch_series(indicator_id, geography, **kwargs)

    def fetch_all_core_indicators(
        self, geography: str = "ES"
    ) -> list[MacroIndicator]:
        """
        Descarga los indicadores core de todos los providers activos.

        Maneja errores por provider sin interrumpir el pipeline.
        """
        all_indicators: list[MacroIndicator] = []

        for name, provider in self._providers.items():
            if not provider.is_enabled:
                logger.debug("Provider %s deshabilitado, omitiendo.", name)
                continue

            try:
                results = provider.fetch_core_indicators(geography)
                for result in results:
                    if result.success:
                        all_indicators.extend(result.indicators)
                    else:
                        logger.debug(
                            "Provider %s: %s error: %s",
                            name, result.indicator_id, result.error,
                        )
            except Exception as exc:
                logger.warning("Provider %s fetch_core error: %s", name, exc)

        logger.info(
            "fetch_all_core_indicators: %d indicadores de %d providers",
            len(all_indicators), len(self._providers),
        )
        return all_indicators

    def fetch_provider_indicators(
        self, provider_name: str, geography: str = "ES"
    ) -> list[MacroIndicator]:
        """Descarga todos los indicadores core de un provider específico."""
        provider = self._providers.get(provider_name)
        if not provider or not provider.is_enabled:
            return []
        indicators: list[MacroIndicator] = []
        try:
            results = provider.fetch_core_indicators(geography)
            for r in results:
                if r.success:
                    indicators.extend(r.indicators)
        except Exception as exc:
            logger.warning("Provider %s error: %s", provider_name, exc)
        return indicators


# ── Singleton global ──────────────────────────────────────────────────────────

_registry: EconomyProviderRegistry | None = None


def get_registry() -> EconomyProviderRegistry:
    """Devuelve el registry global, creándolo si no existe."""
    global _registry
    if _registry is None:
        _registry = EconomyProviderRegistry()
        _auto_register_providers()
    return _registry


def _auto_register_providers() -> None:
    """Registra automáticamente los providers disponibles."""
    global _registry
    if _registry is None:
        return

    providers_to_try = [
        ("etl.sources.economy.ine_provider", "INEProvider"),
        ("etl.sources.economy.bde_provider", "BdEProvider"),
        ("etl.sources.economy.eurostat_provider", "EurostatProvider"),
        ("etl.sources.economy.worldbank_provider", "WorldBankProvider"),
        ("etl.sources.economy.openbb_provider", "OpenBBProvider"),
    ]

    for module_path, class_name in providers_to_try:
        try:
            import importlib
            mod = importlib.import_module(module_path)
            cls = getattr(mod, class_name)
            _registry.register(cls())
            logger.debug("Provider auto-registrado: %s", class_name)
        except Exception as exc:
            logger.debug("No se pudo registrar %s: %s", class_name, exc)
