"""
INE Provider — Bloque 5.

Provider para el Instituto Nacional de Estadística (INE).
Produce MacroIndicator desde la API pública de INE (JSON).

API: https://www.ine.es/dyngs/DataLab/manual.html?cid=45
Reutiliza la lógica de etl/sources/ine_api_v2.py en formato provider.
"""
from __future__ import annotations

import logging
import time
from datetime import date, datetime, timezone
from typing import Any

from .provider_base import BaseEconomicProvider
from .schemas import EconomicSeries, MacroIndicator, ProviderFetchResult, ProviderHealth

logger = logging.getLogger(__name__)

# Mapeo tabla INE -> (indicator_id, nombre, categoría, unidad, frecuencia)
_INE_SERIES: dict[str, tuple[str, str, str, str, str]] = {
    "50902": ("ipc", "IPC General", "precios", "%", "monthly"),
    "50903": ("ipc_subyacente", "IPC Subyacente", "precios", "%", "monthly"),
    "4247":  ("paro_epa", "Tasa de Paro EPA", "laboral", "%", "quarterly"),
    "3996":  ("pib_qoq", "PIB Trimestral (QoQ)", "crecimiento", "%", "quarterly"),
    "25424": ("confianza_consumidor", "Índice de Confianza del Consumidor", "confianza", "índice", "monthly"),
    "10748": ("arope", "Tasa Riesgo de Pobreza AROPE", "social", "%", "annual"),
    "29991": ("ipi", "Índice de Producción Industrial", "crecimiento", "índice", "monthly"),
    "2077":  ("coste_laboral", "Coste Laboral Medio Mensual", "laboral", "EUR", "quarterly"),
    "2948":  ("precio_vivienda", "Índice Precio de Vivienda (IPV)", "vivienda", "índice", "quarterly"),
}

INE_BASE = "https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA"


class INEProvider(BaseEconomicProvider):
    """Provider para el Instituto Nacional de Estadística."""

    name = "ine"
    source = "INE"
    requires_credentials = False
    supported_geographies = ["ES"]
    supported_frequencies = ["monthly", "quarterly", "annual"]
    docs_url = "https://www.ine.es/dyngs/DataLab/manual.html?cid=45"

    def __init__(self, n_periodos: int = 24, timeout: int = 30) -> None:
        super().__init__()
        self.n_periodos = n_periodos
        self.timeout = timeout

    def health_check(self) -> ProviderHealth:
        """Ping rápido a un endpoint del INE."""
        if not self._enabled:
            return self._disabled()
        try:
            import requests
            t0 = time.monotonic()
            r = requests.get(
                f"{INE_BASE}/50902",
                params={"nult": 1},
                timeout=10,
                headers={"User-Agent": "ElectSim/1.0"},
            )
            latency = (time.monotonic() - t0) * 1000
            r.raise_for_status()
            return self._ok(n_series=len(_INE_SERIES), latency_ms=round(latency, 1))
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
                metadata={"tabla_id": tabla_id},
            )
            for tabla_id, (indicator_id, name, cat, unit, freq) in _INE_SERIES.items()
        ]

    def fetch_series(
        self,
        indicator_id: str,
        geography: str = "ES",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ProviderFetchResult:
        """Descarga una serie INE por indicator_id."""
        if not self._enabled:
            return self._fail(indicator_id, "Provider deshabilitado.")

        # Buscar tabla INE para este indicator_id
        tabla_id = next(
            (tid for tid, (iid, *_) in _INE_SERIES.items() if iid == indicator_id),
            None,
        )
        if not tabla_id:
            return self._fail(indicator_id, f"Indicator '{indicator_id}' no configurado en INE.")

        _, name, category, unit, frequency = _INE_SERIES[tabla_id]

        try:
            import requests
            params: dict[str, Any] = {"nult": self.n_periodos, "det": 0}
            r = requests.get(
                f"{INE_BASE}/{tabla_id}",
                params=params,
                timeout=self.timeout,
                headers={"User-Agent": "ElectSim/1.0"},
            )
            r.raise_for_status()
            raw = r.json()
        except Exception as exc:
            return self._fail(indicator_id, f"HTTP error: {exc}")

        indicators = []
        raw_list = raw if isinstance(raw, list) else []

        for serie in raw_list:
            try:
                datos = serie.get("Data", [])
                for punto in datos:
                    anyo = int(punto.get("Anyo", 0))
                    periodo_str = str(punto.get("T3_Periodo", "M01"))
                    valor = float(punto.get("Valor") or 0)

                    d = _parse_ine_date(anyo, periodo_str, frequency)
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
                        value=valor,
                        unit=unit,
                        category=category,
                        raw_payload={"tabla_id": tabla_id, "periodo": periodo_str},
                    ))
            except Exception as exc:
                logger.debug("INE parse error for %s: %s", indicator_id, exc)

        return self._success(indicator_id, indicators, geography)

    def fetch_core_indicators(self, geography: str = "ES") -> list[ProviderFetchResult]:
        """Descarga los indicadores core del INE."""
        results = []
        for tabla_id, (indicator_id, *_) in _INE_SERIES.items():
            result = self.fetch_series(indicator_id, geography)
            results.append(result)
        return results


def _parse_ine_date(anyo: int, periodo_str: str, frequency: str) -> date | None:
    """Convierte año + período INE en objeto date."""
    try:
        if frequency == "monthly":
            # M01 → enero, M12 → diciembre
            mes = int(periodo_str.replace("M", "")) if "M" in periodo_str else 1
            return date(anyo, mes, 1)
        elif frequency in ("quarterly", "annual"):
            # T1→Q1, etc.
            if "T" in periodo_str:
                trimestre = int(periodo_str.replace("T", ""))
                mes = (trimestre - 1) * 3 + 1
                return date(anyo, mes, 1)
            return date(anyo, 1, 1)
        else:
            return date(anyo, 1, 1)
    except Exception:
        return None
