"""
World Bank Provider — Bloque 5.

Provider para World Bank / World Development Indicators (WDI).
Produce MacroIndicator para indicadores comparativos internacionales.

API: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
"""
from __future__ import annotations

import logging
import time
from datetime import date
from typing import Any

from .provider_base import BaseEconomicProvider
from .schemas import EconomicSeries, MacroIndicator, ProviderFetchResult, ProviderHealth

logger = logging.getLogger(__name__)

WB_BASE = "https://api.worldbank.org/v2"
HEADERS = {"User-Agent": "ElectSim/1.0 (research)"}

# Mapeo: indicator_id → (wb_code, nombre, categoría, unidad, frecuencia)
_WB_SERIES: dict[str, tuple[str, str, str, str, str]] = {
    "pib_pc_ppp":     ("NY.GDP.PCAP.PP.CD", "PIB per cápita PPP (USD)", "crecimiento", "USD", "annual"),
    "pib_yoy_wb":     ("NY.GDP.MKTP.KD.ZG", "PIB Crecimiento Anual %", "crecimiento", "%", "annual"),
    "paro_wb":        ("SL.UEM.TOTL.ZS", "Tasa de Paro % (WB)", "laboral", "%", "annual"),
    "inflacion_wb":   ("FP.CPI.TOTL.ZG", "Inflación CPI Anual %", "precios", "%", "annual"),
    "deuda_wb":       ("GC.DOD.TOTL.GD.ZS", "Deuda pública % PIB (WB)", "fiscal", "% PIB", "annual"),
    "gasto_educacion": ("SE.XPD.TOTL.GD.ZS", "Gasto Educación % PIB", "social", "% PIB", "annual"),
    "gasto_salud":    ("SH.XPD.CHEX.GD.ZS", "Gasto Salud % PIB", "social", "% PIB", "annual"),
    "exportaciones":  ("NE.EXP.GNFS.ZS", "Exportaciones % PIB", "comercio", "% PIB", "annual"),
    "importaciones":  ("NE.IMP.GNFS.ZS", "Importaciones % PIB", "comercio", "% PIB", "annual"),
}


class WorldBankProvider(BaseEconomicProvider):
    """Provider para World Bank WDI."""

    name = "worldbank"
    source = "WorldBank"
    requires_credentials = False
    supported_geographies = ["ES", "EU", "DE", "FR", "IT", "PT", "US", "WORLD"]
    supported_frequencies = ["annual"]
    docs_url = "https://datahelpdesk.worldbank.org/knowledgebase/articles/889392"

    def __init__(self, start_year: int = 2010, timeout: int = 30) -> None:
        super().__init__()
        self.start_year = start_year
        self.timeout = timeout

    def health_check(self) -> ProviderHealth:
        if not self._enabled:
            return self._disabled()
        try:
            import requests
            t0 = time.monotonic()
            r = requests.get(
                f"{WB_BASE}/country/ES/indicator/NY.GDP.MKTP.KD.ZG",
                params={"format": "json", "per_page": 1},
                timeout=10,
                headers=HEADERS,
            )
            latency = (time.monotonic() - t0) * 1000
            if r.status_code < 500:
                return self._ok(n_series=len(_WB_SERIES), latency_ms=round(latency, 1))
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
                metadata={"wb_code": wb_code},
            )
            for indicator_id, (wb_code, name, cat, unit, freq) in _WB_SERIES.items()
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

        cfg = _WB_SERIES.get(indicator_id)
        if not cfg:
            return self._fail(indicator_id, f"Indicator '{indicator_id}' no en WorldBank.")

        wb_code, name, category, unit, frequency = cfg

        # Normalizar código de geografía para WB
        wb_geo = _normalize_geo(geography)

        start_year = start_date.year if start_date else self.start_year
        end_year = end_date.year if end_date else 2025

        try:
            import requests
            r = requests.get(
                f"{WB_BASE}/country/{wb_geo}/indicator/{wb_code}",
                params={
                    "format": "json",
                    "per_page": 100,
                    "date": f"{start_year}:{end_year}",
                },
                timeout=self.timeout,
                headers=HEADERS,
            )
            r.raise_for_status()
            payload = r.json()
        except Exception as exc:
            return self._fail(indicator_id, f"WorldBank HTTP error: {exc}")

        indicators = _parse_wb_json(
            payload, indicator_id, name, geography, frequency, unit, category, self.name
        )
        return self._success(indicator_id, indicators, geography)


def _parse_wb_json(
    payload: Any,
    indicator_id: str,
    name: str,
    geography: str,
    frequency: str,
    unit: str,
    category: str,
    provider: str,
) -> list[MacroIndicator]:
    """Parsea respuesta de WB API v2."""
    indicators: list[MacroIndicator] = []

    if not isinstance(payload, list) or len(payload) < 2:
        return indicators

    data = payload[1] or []
    for row in data:
        try:
            val = row.get("value")
            if val is None:
                continue
            year = int(row.get("date", "0")[:4])
            if year < 2000:
                continue
            d = date(year, 1, 1)
            indicators.append(MacroIndicator(
                source="WorldBank",
                provider=provider,
                indicator_id=indicator_id,
                name=name,
                geography=geography,
                frequency=frequency,
                date=d,
                value=float(val),
                unit=unit,
                category=category,
                raw_payload={"wb_country": row.get("country", {}).get("value", "")},
            ))
        except Exception:
            pass

    return indicators


def _normalize_geo(geography: str) -> str:
    """Normaliza código de geografía al formato World Bank."""
    mapping = {
        "EU27_2020": "EUU",
        "EU": "EUU",
        "WORLD": "WLD",
        "GLOBAL": "WLD",
    }
    return mapping.get(geography.upper(), geography)
