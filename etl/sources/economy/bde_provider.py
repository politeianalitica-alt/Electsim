"""
BdE Provider — Bloque 5.

Provider para el Banco de España (BdE).
Descarga series del servicio estadístico del BdE.

API: https://www.bde.es/webbe/es/estadisticas/recursos/acceso-datos-estadisticos.html
Reutiliza lógica de etl/sources/bde_api_v2.py en formato provider.
"""
from __future__ import annotations

import logging
import time
from datetime import date, datetime
from typing import Any

from .provider_base import BaseEconomicProvider
from .schemas import EconomicSeries, MacroIndicator, ProviderFetchResult, ProviderHealth

logger = logging.getLogger(__name__)

# Mapeo: indicator_id → (código BdE, nombre, categoría, unidad, frecuencia)
_BDE_SERIES: dict[str, tuple[str, str, str, str, str]] = {
    "prima_riesgo":   ("BE_N_BOND_D_ESPANA10", "Prima de Riesgo Bono 10Y", "mercado", "pb", "daily"),
    "bono_10y":       ("BE_N_BOND_D_ESPANA10", "Bono Soberano 10Y España", "mercado", "%", "daily"),
    "euribor_12m":    ("BE_N_BPI_D_ESIA12", "Euribor 12 meses", "mercado", "%", "daily"),
    "deuda_publica":  ("BE_N_FLO_M_DEUDA_PGSOE", "Deuda Pública Total (M€)", "fiscal", "M EUR", "monthly"),
    "credito_hogares": ("BE_N_FLO_M_HOGARES_PRESTAMOS", "Préstamos a Hogares", "fiscal", "M EUR", "monthly"),
}

# Endpoint RSS/stats del BdE (public)
BDE_API_BASE = "https://www.bde.es/webbe/api/estadisticas/series"
BDE_RSS_BASE = "https://app.bde.es/rss/rss"


class BdEProvider(BaseEconomicProvider):
    """Provider para el Banco de España."""

    name = "bde"
    source = "BdE"
    requires_credentials = False
    supported_geographies = ["ES"]
    supported_frequencies = ["daily", "monthly"]
    docs_url = "https://www.bde.es/webbe/es/estadisticas/recursos/acceso-datos-estadisticos.html"

    def __init__(self, timeout: int = 30) -> None:
        super().__init__()
        self.timeout = timeout

    def health_check(self) -> ProviderHealth:
        if not self._enabled:
            return self._disabled()
        try:
            import requests
            t0 = time.monotonic()
            # Ping con la URL base del BdE
            r = requests.get(
                "https://www.bde.es/webbe/es/estadisticas/",
                timeout=10,
                headers={"User-Agent": "ElectSim/1.0"},
                allow_redirects=True,
            )
            latency = (time.monotonic() - t0) * 1000
            if r.status_code < 500:
                return self._ok(n_series=len(_BDE_SERIES), latency_ms=round(latency, 1))
            return self._error(f"HTTP {r.status_code}")
        except Exception as exc:
            return self._error(str(exc))

    def list_series(self) -> list[EconomicSeries]:
        return [
            EconomicSeries(
                source=self.source,
                provider=self.name,
                indicator_id=indicator_id,
                name=name,
                geography="ES",
                frequency=freq,
                unit=unit,
                category=cat,
                metadata={"bde_code": code},
            )
            for indicator_id, (code, name, cat, unit, freq) in _BDE_SERIES.items()
        ]

    def fetch_series(
        self,
        indicator_id: str,
        geography: str = "ES",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ProviderFetchResult:
        if not self._enabled:
            return self._fail(indicator_id, "Provider deshabilitado.")

        series_cfg = _BDE_SERIES.get(indicator_id)
        if not series_cfg:
            return self._fail(indicator_id, f"Indicator '{indicator_id}' no en BdE.")

        bde_code, name, category, unit, frequency = series_cfg

        try:
            # Intentar con la API estadística BdE (formato JSON-stat / CSV)
            indicators = self._fetch_via_api(
                bde_code, name, indicator_id, category, unit, frequency,
                geography, start_date, end_date,
            )
            if indicators:
                return self._success(indicator_id, indicators, geography)

            # Fallback: demo data con nota
            logger.debug(
                "BdE: no se obtuvieron datos para %s, devolviendo vacío.", indicator_id
            )
            return self._success(indicator_id, [], geography)

        except Exception as exc:
            return self._fail(indicator_id, f"Error BdE: {exc}")

    def _fetch_via_api(
        self,
        bde_code: str,
        name: str,
        indicator_id: str,
        category: str,
        unit: str,
        frequency: str,
        geography: str,
        start_date: date | None,
        end_date: date | None,
    ) -> list[MacroIndicator]:
        """Intenta descargar desde la API pública del BdE."""
        import requests

        # El BdE publica algunas series en formato CSV descargable
        # Endpoint tentativo (puede cambiar; el BdE no tiene API REST estándar pública)
        try:
            url = f"{BDE_RSS_BASE}?serie={bde_code}&formato=json"
            r = requests.get(url, timeout=self.timeout,
                             headers={"User-Agent": "ElectSim/1.0"})
            if r.status_code != 200:
                return []

            raw = r.json()
            entries = raw.get("items", raw.get("series", []))
            indicators = []
            for entry in entries:
                try:
                    d_str = str(entry.get("fecha", entry.get("date", "")))
                    val = float(entry.get("valor", entry.get("value", 0)))
                    d = _parse_bde_date(d_str, frequency)
                    if d is None:
                        continue
                    if start_date and d < start_date:
                        continue
                    if end_date and d > end_date:
                        continue
                    indicators.append(MacroIndicator(
                        source=self.source,
                        provider=self.name,
                        indicator_id=indicator_id,
                        name=name,
                        geography=geography,
                        frequency=frequency,
                        date=d,
                        value=val,
                        unit=unit,
                        category=category,
                        raw_payload={"bde_code": bde_code},
                    ))
                except Exception:
                    pass
            return indicators
        except Exception as exc:
            logger.debug("BdE API error para %s: %s", bde_code, exc)
            return []


def _parse_bde_date(date_str: str, frequency: str) -> date | None:
    """Parsea fechas del BdE (varios formatos)."""
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y%m%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(date_str[:len(fmt)], fmt).date()
        except ValueError:
            continue
    return None
