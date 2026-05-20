"""Conector EU CAP · DG AGRI · Sprint 14 · S14.2.

> **Sprint 14 · S14.2** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 14 · Agro`)

Indicadores principales de la Política Agraria Común (CAP/PAC) a nivel UE:

  - DG AGRI Dashboards · Excel/JSON oficial
  - Eurostat Statistics Explorer · series temporales agro (apro_*, ag_*)
  - DG AGRI Market Observatories · precios, balances commodities

Estrategia: cliente Eurostat REST API + catálogo de indicadores
EU-CAP relevantes para España. Sin auth.

Falla cerrado: timeout 20s · errores → {error}.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"
_TIMEOUT = 20
_USER_AGENT = "Politeia-Analitica/2.0 EU-CAP-Monitor (+https://politeia-analitica.es)"

# Indicadores Eurostat más relevantes para España agricultura
EU_CAP_INDICATORS: dict[str, dict[str, str]] = {
    "agricultural_income": {
        "code": "aact_eaa01",
        "title": "Renta agraria · Cuenta económica de la agricultura",
        "unit": "EUR M",
    },
    "agricultural_output": {
        "code": "aact_eaa05",
        "title": "Producción rama agraria",
        "unit": "EUR M",
    },
    "farm_structure": {
        "code": "ef_m_farmleg",
        "title": "Estructura explotaciones · Forma jurídica",
        "unit": "N",
    },
    "land_use": {
        "code": "apro_cpsh1",
        "title": "Superficie cultivada por cultivo",
        "unit": "ha",
    },
    "agricultural_prices": {
        "code": "apri_pi15_outm",
        "title": "Índice precios productos agrarios · mensual",
        "unit": "Index",
    },
}


class EUCAPClient:
    """Cliente Eurostat REST API para indicadores CAP."""

    def __init__(self, session: Any = None) -> None:
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            self._session.headers.update({
                "Accept": "application/json",
                "User-Agent": _USER_AGENT,
            })
        except ImportError:
            self._session = None
            logger.warning("EUCAPClient: requests no disponible · degradado")

    def get_indicator(
        self,
        indicator_key: str,
        *,
        geo: str = "ES",
        last_n_years: int = 10,
    ) -> dict[str, Any]:
        """Descarga datos de un indicador Eurostat para un país.

        Args:
          indicator_key: clave en EU_CAP_INDICATORS o código directo Eurostat.
          geo: ISO alpha-2 (ES, FR, DE...).
          last_n_years: ventana temporal.
        """
        if self._session is None:
            return {"indicator": indicator_key, "data": [], "error": "requests no disponible"}

        meta = EU_CAP_INDICATORS.get(indicator_key)
        code = meta["code"] if meta else indicator_key

        params = {
            "format": "JSON",
            "geo": geo,
            "lang": "EN",
        }
        try:
            r = self._session.get(
                f"{_EUROSTAT_BASE}/{code}",
                params=params, timeout=_TIMEOUT,
            )
            r.raise_for_status()
            raw = r.json()
        except Exception as exc:
            logger.warning("Eurostat %s · %s", code, exc)
            return {"indicator": indicator_key, "data": [], "error": str(exc)}

        # Eurostat JSON-stat 2 · dimension['time']['category']['index']
        try:
            time_idx = raw["dimension"]["time"]["category"]["index"]
            time_labels = raw["dimension"]["time"]["category"]["label"]
            values = raw.get("value") or {}
            series = []
            for t_label, t_pos in time_idx.items():
                val = values.get(str(t_pos))
                if val is None:
                    continue
                series.append({
                    "period": time_labels.get(t_label, t_label),
                    "value": val,
                })
            series.sort(key=lambda s: s["period"])
            series = series[-max(1, last_n_years):]
        except Exception as exc:
            logger.debug("Eurostat parse %s · %s", code, exc)
            series = []

        return {
            "indicator": indicator_key,
            "code": code,
            "title": (meta or {}).get("title"),
            "unit": (meta or {}).get("unit"),
            "geo": geo,
            "n_obs": len(series),
            "data": series,
            "error": None,
        }


_CLIENT: EUCAPClient | None = None


def get_eu_cap_client() -> EUCAPClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = EUCAPClient()
    return _CLIENT


__all__ = ["EUCAPClient", "get_eu_cap_client", "EU_CAP_INDICATORS"]
