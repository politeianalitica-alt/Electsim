"""Conector INE Turismo · Sprint 15 · S15.1.

> **Sprint 15 · S15.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 15 · Turismo`)

INE expone vía API TEMPUS3 las principales operaciones turísticas:

  FRONTUR (Movimientos Turísticos en Frontera) · op 24295
    - Llegadas mensuales turistas internacionales
    - Pernoctaciones extranjeros
    - País de residencia

  ETR (Encuesta Ocupación Hoteles) · op 24292
    - Plazas, viajeros, pernoctaciones por CCAA
    - Tarifa ADR, RevPAR

  EGATUR (Gasto Turístico) · op 24297
    - Gasto total, gasto medio diario, gasto medio por turista
    - Por país de residencia, motivo del viaje

Endpoint: https://servicios.ine.es/wstempus/js/ES/SERIE/<COD>

Falla cerrado: timeout 15s · errores → {error}.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_INE_TEMPUS = "https://servicios.ine.es/wstempus/js/ES"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 INE-Turismo (+https://politeia-analitica.es)"

# Series claves (códigos públicos TEMPUS3 · series mensuales nacionales)
TURISMO_SERIES: dict[str, dict[str, str]] = {
    "llegadas_internacional": {
        "code": "IUH4",
        "title": "FRONTUR · llegadas turistas internacionales · mensual",
        "unit": "personas",
    },
    "pernoctaciones_hotelero": {
        "code": "ETH2",
        "title": "ETR · pernoctaciones hoteles · total nacional · mensual",
        "unit": "noches",
    },
    "gasto_turistico": {
        "code": "EGT4",
        "title": "EGATUR · gasto total turistas internacionales · mensual",
        "unit": "EUR M",
    },
    "gasto_medio_diario": {
        "code": "EGT11",
        "title": "EGATUR · gasto medio diario por turista · mensual",
        "unit": "EUR/persona/día",
    },
    "ocupacion_plazas_pct": {
        "code": "ETH16",
        "title": "ETR · grado ocupación por plazas · mensual",
        "unit": "%",
    },
    "viajeros_residentes": {
        "code": "ETH1",
        "title": "ETR · viajeros residentes en España · mensual",
        "unit": "personas",
    },
}


class INETurismoClient:
    """Cliente INE TEMPUS para series de turismo."""

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
            logger.warning("INETurismoClient: requests no disponible · degradado")

    def get_serie(self, codigo: str, last_n: int = 24) -> dict[str, Any]:
        """Descarga serie INE turismo por código TEMPUS."""
        if self._session is None:
            return {"codigo": codigo, "data": [], "error": "requests no disponible"}
        try:
            r = self._session.get(
                f"{_INE_TEMPUS}/SERIE/{codigo}",
                params={"nult": last_n}, timeout=_TIMEOUT,
            )
            r.raise_for_status()
            data = r.json()
        except Exception as exc:
            logger.warning("INE turismo %s · %s", codigo, exc)
            return {"codigo": codigo, "data": [], "error": str(exc)}

        observations = []
        for d in data.get("Data") or []:
            observations.append({
                "fecha": d.get("Fecha"),
                "anyo": d.get("Anyo"),
                "valor": d.get("Valor"),
                "tipoDato": d.get("T3_TipoDato"),
            })
        return {
            "codigo": codigo,
            "nombre": data.get("Nombre"),
            "n_obs": len(observations),
            "data": observations,
            "error": None,
        }

    def get_indicador(self, indicator_key: str, last_n: int = 24) -> dict[str, Any]:
        """Atajo · resuelve clave en TURISMO_SERIES."""
        meta = TURISMO_SERIES.get(indicator_key)
        if meta is None:
            return {
                "indicator": indicator_key, "data": [],
                "error": f"indicador '{indicator_key}' no en TURISMO_SERIES · usa {list(TURISMO_SERIES)}",
            }
        res = self.get_serie(meta["code"], last_n=last_n)
        res["indicator"] = indicator_key
        res["unit"] = meta["unit"]
        res["title"] = meta["title"]
        return res


_CLIENT: INETurismoClient | None = None


def get_ine_turismo_client() -> INETurismoClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = INETurismoClient()
    return _CLIENT


__all__ = ["INETurismoClient", "get_ine_turismo_client", "TURISMO_SERIES"]
