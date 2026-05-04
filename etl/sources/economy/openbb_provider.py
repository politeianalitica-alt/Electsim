"""
OpenBB Provider — Bloque 5.

Provider OPCIONAL para OpenBB Platform.

⚠️ NOTA DE LICENCIA:
OpenBB tiene licencia AGPLv3.
Este archivo NO copia código de OpenBB.
Solo define un adaptador que llama a la OpenBB Platform si está instalada.
ElectSim puede usar OpenBB como proveedor de datos de mercado sin incorporar
código bajo AGPLv3 en su codebase.

Referencia arquitectónica: https://openbb.co/blog/openbb-platform-v4

Para activar:
  1. pip install openbb
  2. Configurar credenciales en ~/.openbb/user_settings.json
  3. ELECTSIM_ECON_USE_OPENBB=true

Por defecto DESHABILITADO.
"""
from __future__ import annotations

import logging
import os
from datetime import date

from .provider_base import BaseEconomicProvider
from .schemas import EconomicSeries, MacroIndicator, ProviderFetchResult, ProviderHealth

logger = logging.getLogger(__name__)

_USE_OPENBB = os.environ.get("ELECTSIM_ECON_USE_OPENBB", "false").lower() == "true"


class OpenBBProvider(BaseEconomicProvider):
    """
    Provider opcional para OpenBB Platform.

    Activa con: ELECTSIM_ECON_USE_OPENBB=true
    Requiere: pip install openbb
    """

    name = "openbb"
    source = "OpenBB"
    requires_credentials = True
    supported_geographies = ["ES", "US", "DE", "FR", "EU"]
    supported_frequencies = ["daily", "weekly", "monthly", "quarterly", "annual"]
    docs_url = "https://docs.openbb.co/"

    def __init__(self) -> None:
        super().__init__()
        if not _USE_OPENBB:
            self._enabled = False
            logger.debug("OpenBB deshabilitado (ELECTSIM_ECON_USE_OPENBB=false).")

    def health_check(self) -> ProviderHealth:
        if not self._enabled:
            return self._disabled()
        try:
            # No copiamos código de OpenBB — solo lo importamos
            import openbb  # type: ignore  # noqa: F401
            return self._ok(n_series=0, latency_ms=None)
        except ImportError:
            return ProviderHealth(
                provider=self.name,
                status="disabled",
                message="openbb package no instalado. Ejecuta: pip install openbb",
            )
        except Exception as exc:
            return self._error(str(exc))

    def list_series(self) -> list[EconomicSeries]:
        """OpenBB tiene miles de series; retornamos solo las que usamos en ElectSim."""
        if not self._enabled:
            return []
        return [
            EconomicSeries(
                source=self.source,
                provider=self.name,
                indicator_id=iid,
                name=name,
                frequency=freq,
                category=cat,
            )
            for iid, name, cat, freq in [
                ("prima_riesgo_live", "Prima de Riesgo (live)", "mercado", "daily"),
                ("bono_10y_live", "Bono 10Y España (live)", "mercado", "daily"),
                ("ibex35", "IBEX 35", "mercado", "daily"),
                ("energia_precio_live", "Precio Electricidad (ESIOS)", "energia", "daily"),
            ]
        ]

    def fetch_series(
        self,
        indicator_id: str,
        geography: str = "ES",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ProviderFetchResult:
        if not self._enabled:
            return self._fail(indicator_id, "OpenBB no habilitado.")
        try:
            # Llamar a OpenBB Platform — no incorporamos su código, solo lo invocamos
            from openbb import obb  # type: ignore
            # Los endpoints varían por versión de OpenBB; esto es un ejemplo
            if indicator_id == "bono_10y_live":
                df = obb.fixedincome.government.yield_curve(
                    country="spain", start_date=str(start_date or "2020-01-01")
                ).to_dataframe()
                indicators = _openbb_df_to_indicators(
                    df, indicator_id, "Bono 10Y España", geography, "daily", "%", "mercado", self.name
                )
                return self._success(indicator_id, indicators, geography)
        except ImportError:
            return self._fail(indicator_id, "openbb package no instalado.")
        except Exception as exc:
            return self._fail(indicator_id, f"OpenBB error: {exc}")

        return self._fail(indicator_id, f"Indicator '{indicator_id}' no soportado en OpenBB provider.")


def _openbb_df_to_indicators(
    df: "pd.DataFrame",
    indicator_id: str,
    name: str,
    geography: str,
    frequency: str,
    unit: str,
    category: str,
    provider: str,
) -> list[MacroIndicator]:
    """Convierte DataFrame de OpenBB a lista de MacroIndicator."""
    indicators: list[MacroIndicator] = []
    try:
        import pandas as pd
        for _, row in df.iterrows():
            try:
                d = pd.to_datetime(row.get("date", row.name)).date()
                val = float(row.get("rate", row.get("value", 0)))
                indicators.append(MacroIndicator(
                    source="OpenBB",
                    provider=provider,
                    indicator_id=indicator_id,
                    name=name,
                    geography=geography,
                    frequency=frequency,
                    date=d,
                    value=val,
                    unit=unit,
                    category=category,
                ))
            except Exception:
                pass
    except Exception as exc:
        logger.debug("OpenBB DF conversion error: %s", exc)
    return indicators
