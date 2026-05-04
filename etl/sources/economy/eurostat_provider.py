"""
Eurostat Provider — Bloque 5.

Provider para Eurostat.
Produce MacroIndicator para indicadores comparativos España/UE.

API: https://ec.europa.eu/eurostat/web/main/data/web-services
Reutiliza lógica de etl/sources/eurostat_api.py en formato provider.
"""
from __future__ import annotations

import logging
import time
from datetime import date, datetime
from typing import Any

from .provider_base import BaseEconomicProvider
from .schemas import EconomicSeries, MacroIndicator, ProviderFetchResult, ProviderHealth

logger = logging.getLogger(__name__)

EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
HEADERS = {"User-Agent": "ElectSim/1.0 (research)"}

# Mapeo: indicator_id → (dataset_code, nombre, geographia_param, categoría, unidad, frecuencia)
_EUROSTAT_SERIES: dict[str, dict[str, Any]] = {
    "ipc_hicp": {
        "dataset": "prc_hicp_manr",
        "name": "HICP Inflación Anual",
        "category": "precios",
        "unit": "%",
        "frequency": "monthly",
        "params": {"sinceTimePeriod": "2020-01", "geo": "ES", "coicop": "CP00", "unit": "RCH_A"},
    },
    "paro_eu": {
        "dataset": "une_rt_m",
        "name": "Tasa de Paro (Eurostat)",
        "category": "laboral",
        "unit": "%",
        "frequency": "monthly",
        "params": {"sinceTimePeriod": "2020-01", "geo": "ES", "sex": "T", "age": "Y15-74", "s_adj": "SA", "unit": "PC_ACT"},
    },
    "pib_eu": {
        "dataset": "namq_10_gdp",
        "name": "PIB Trimestral (Eurostat)",
        "category": "crecimiento",
        "unit": "M EUR",
        "frequency": "quarterly",
        "params": {"sinceTimePeriod": "2020-Q1", "geo": "ES", "na_item": "B1GQ", "s_adj": "SCA", "unit": "MIO_EUR"},
    },
    "deuda_maastricht": {
        "dataset": "gov_10dd_edpt1",
        "name": "Deuda Maastricht % PIB",
        "category": "fiscal",
        "unit": "% PIB",
        "frequency": "annual",
        "params": {"sinceTimePeriod": "2015", "geo": "ES", "na_item": "GD", "unit": "PC_GDP", "sector": "S13"},
    },
    "deficit_maastricht": {
        "dataset": "gov_10dd_edpt1",
        "name": "Déficit Maastricht % PIB",
        "category": "fiscal",
        "unit": "% PIB",
        "frequency": "annual",
        "params": {"sinceTimePeriod": "2015", "geo": "ES", "na_item": "B9", "unit": "PC_GDP", "sector": "S13"},
    },
}


class EurostatProvider(BaseEconomicProvider):
    """Provider para Eurostat (comparativa España vs UE)."""

    name = "eurostat"
    source = "Eurostat"
    requires_credentials = False
    supported_geographies = ["ES", "EU27_2020", "DE", "FR", "IT", "PT"]
    supported_frequencies = ["monthly", "quarterly", "annual"]
    docs_url = "https://ec.europa.eu/eurostat/web/main/data/web-services"

    def __init__(self, timeout: int = 30) -> None:
        super().__init__()
        self.timeout = timeout

    def health_check(self) -> ProviderHealth:
        if not self._enabled:
            return self._disabled()
        try:
            import requests
            t0 = time.monotonic()
            r = requests.get(
                f"{EUROSTAT_BASE}prc_hicp_manr",
                params={"sinceTimePeriod": "2024-01", "geo": "ES",
                        "coicop": "CP00", "unit": "RCH_A", "format": "JSON"},
                timeout=10,
                headers=HEADERS,
            )
            latency = (time.monotonic() - t0) * 1000
            if r.status_code < 500:
                return self._ok(n_series=len(_EUROSTAT_SERIES), latency_ms=round(latency, 1))
            return self._error(f"HTTP {r.status_code}")
        except Exception as exc:
            return self._error(str(exc))

    def list_series(self) -> list[EconomicSeries]:
        return [
            EconomicSeries(
                source=self.source,
                provider=self.name,
                indicator_id=indicator_id,
                name=cfg["name"],
                geography="ES",
                frequency=cfg["frequency"],
                unit=cfg["unit"],
                category=cfg["category"],
                metadata={"dataset": cfg["dataset"]},
            )
            for indicator_id, cfg in _EUROSTAT_SERIES.items()
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

        cfg = _EUROSTAT_SERIES.get(indicator_id)
        if not cfg:
            return self._fail(indicator_id, f"Indicator '{indicator_id}' no en Eurostat.")

        try:
            import requests
            params = dict(cfg["params"])
            params["geo"] = geography
            params["format"] = "JSON"

            r = requests.get(
                f"{EUROSTAT_BASE}{cfg['dataset']}",
                params=params,
                timeout=self.timeout,
                headers=HEADERS,
            )
            r.raise_for_status()
            raw = r.json()
        except Exception as exc:
            return self._fail(indicator_id, f"Eurostat HTTP error: {exc}")

        indicators = _parse_eurostat_json(
            raw, indicator_id, cfg["name"],
            geography, cfg["frequency"], cfg["unit"], cfg["category"], self.name,
        )

        # Filtrar por fechas
        if start_date:
            indicators = [i for i in indicators if i.date >= start_date]
        if end_date:
            indicators = [i for i in indicators if i.date <= end_date]

        return self._success(indicator_id, indicators, geography)


def _parse_eurostat_json(
    raw: dict[str, Any],
    indicator_id: str,
    name: str,
    geography: str,
    frequency: str,
    unit: str,
    category: str,
    provider: str,
) -> list[MacroIndicator]:
    """Parsea la respuesta JSON-stat 2.0 de Eurostat."""
    indicators: list[MacroIndicator] = []

    try:
        dimension = raw.get("dimension", {})
        time_dim = dimension.get("time", {})
        time_indices = time_dim.get("category", {}).get("index", {})
        values_dict = raw.get("value", {})

        # Mapa de índice → valor
        n_geo = 1  # Asumimos 1 geografía por llamada
        n_time = len(time_indices)

        for time_label, time_idx in time_indices.items():
            try:
                flat_idx = str(time_idx)
                val = values_dict.get(flat_idx) or values_dict.get(int(flat_idx))
                if val is None:
                    continue
                d = _parse_eurostat_date(time_label, frequency)
                if d is None:
                    continue
                indicators.append(MacroIndicator(
                    source="Eurostat",
                    provider=provider,
                    indicator_id=indicator_id,
                    name=name,
                    geography=geography,
                    frequency=frequency,
                    date=d,
                    value=float(val),
                    unit=unit,
                    category=category,
                    raw_payload={"time_label": time_label},
                ))
            except Exception as exc:
                logger.debug("Eurostat parse error for %s: %s", time_label, exc)

    except Exception as exc:
        logger.debug("Eurostat JSON parse error: %s", exc)

    return indicators


def _parse_eurostat_date(label: str, frequency: str) -> date | None:
    """Parsea etiquetas de tiempo de Eurostat (2024-01, 2024-Q1, 2024, etc.)."""
    label = label.strip()
    try:
        if "-Q" in label:
            year, q = label.split("-Q")
            month = (int(q) - 1) * 3 + 1
            return date(int(year), month, 1)
        elif len(label) == 7 and "-" in label:
            return datetime.strptime(label, "%Y-%m").date()
        elif len(label) == 4:
            return date(int(label), 1, 1)
        else:
            return None
    except Exception:
        return None
