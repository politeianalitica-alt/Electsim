"""
Macro Finance Tools — Brain LLM integration for /macro panel.

Tools registered in agents.tools.registry:
  - consultar_panorama_macro(country)
  - consultar_mercados_es(days)
  - consultar_inflacion_paises(countries, days)
  - consultar_paro_paises(countries, days)
  - consultar_reservas_cofer(days)
"""
from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _safe(fn_name: str, *args: Any, **kwargs: Any) -> Any:
    try:
        from dashboard.services import macro_finance_core as core
        return getattr(core, fn_name)(*args, **kwargs)
    except Exception as exc:
        logger.debug("macro_finance_tools.%s error: %s", fn_name, exc)
        return None


def consultar_panorama_macro(country: str = "ES") -> dict[str, Any]:
    """Devuelve KPIs macroeconómicos de un país: rendimiento bono 10Y, spread,
    inflación HICP, paro, vivienda, EURUSD, tipo BCE. Variación reciente incluida."""
    out = _safe("panorama", country)
    return out or {"country": country, "indicators": [], "error": "unavailable"}


def consultar_mercados_es(days: int = 365) -> dict[str, Any]:
    """Serie temporal de mercados (ECB SDMX): yields 10Y, spreads, EURUSD, tipo BCE.
    `days` puede ser 30..3650."""
    out = _safe("markets_timeseries", days, "ES")
    return out or {"days": days, "country": "ES", "series": {}}


def consultar_inflacion_paises(
    countries: Optional[list[str]] = None, days: int = 365 * 2
) -> dict[str, Any]:
    """HICP interanual mensual (Eurostat) para países especificados.
    Países por defecto: ES, FR, IT, DE, PT, EU-27."""
    cs = countries or ["ES", "FR", "IT", "DE", "PT", "EU"]
    out = _safe("hicp", cs, days)
    return out or {"countries": cs, "days": days, "series": {}}


def consultar_paro_paises(
    countries: Optional[list[str]] = None, days: int = 365 * 2
) -> dict[str, Any]:
    """Tasa de paro armonizada (Eurostat) y paro juvenil para países especificados."""
    cs = countries or ["ES", "FR", "IT", "DE", "PT", "EU"]
    out = _safe("labor", cs, days)
    return out or {"countries": cs, "days": days, "series": {}}


def consultar_reservas_cofer(days: int = 365 * 6) -> dict[str, Any]:
    """Composición de reservas oficiales globales (IMF COFER): cuota USD/EUR/CNY/GBP/JPY."""
    out = _safe("cofer_reserves", days)
    return out or {"days": days, "series": {}}


def consultar_salud_fuentes_macro() -> list[dict[str, Any]]:
    """Estado de cada fuente macro: cuántas filas en DB, último dato, error si lo hay."""
    return _safe("sources_health") or []
