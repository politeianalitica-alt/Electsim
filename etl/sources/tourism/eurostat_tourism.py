"""Conector Eurostat Tourism · Sprint 15 · S15.2.

> **Sprint 15 · S15.2** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 15 · Turismo`)

Eurostat publica series harmonizadas UE-27 sobre turismo:

  tour_occ_nim · noches en alojamientos turísticos · mensual
  tour_occ_arnat · llegadas a alojamientos turísticos
  tour_dem_top · viajes turísticos por motivo y país
  tour_cap_nat · capacidad alojamientos
  tour_inda_cm · indicadores turismo (Spain en contexto UE)

Endpoint REST público:
  https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/<dataset>

Falla cerrado: timeout 20s · errores → {error}.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_EUROSTAT_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"
_TIMEOUT = 20
_USER_AGENT = "Politeia-Analitica/2.0 Eurostat-Tourism (+https://politeia-analitica.es)"

TOURISM_INDICATORS: dict[str, dict[str, str]] = {
    "noches_total": {
        "code": "tour_occ_nim",
        "title": "Noches en alojamientos turísticos · mensual",
        "unit": "noches",
    },
    "llegadas_alojamientos": {
        "code": "tour_occ_arnat",
        "title": "Llegadas a alojamientos turísticos",
        "unit": "personas",
    },
    "capacidad_alojamientos": {
        "code": "tour_cap_nat",
        "title": "Capacidad alojamientos turísticos",
        "unit": "plazas",
    },
    "viajes_motivo": {
        "code": "tour_dem_top",
        "title": "Viajes turísticos por motivo · UE-27",
        "unit": "miles viajes",
    },
}


class EurostatTourismClient:
    """Cliente Eurostat tourism · sin auth."""

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
            logger.warning("EurostatTourismClient: requests no disponible · degradado")

    def get_indicator(
        self,
        indicator_key: str,
        *,
        geo: str = "ES",
        last_n: int = 24,
    ) -> dict[str, Any]:
        if self._session is None:
            return {"indicator": indicator_key, "data": [], "error": "requests no disponible"}

        meta = TOURISM_INDICATORS.get(indicator_key)
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
            logger.warning("Eurostat tourism %s · %s", code, exc)
            return {"indicator": indicator_key, "data": [], "error": str(exc)}

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
            series = series[-max(1, last_n):]
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


_CLIENT: EurostatTourismClient | None = None


def get_eurostat_tourism_client() -> EurostatTourismClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = EurostatTourismClient()
    return _CLIENT


__all__ = ["EurostatTourismClient", "get_eurostat_tourism_client", "TOURISM_INDICATORS"]
