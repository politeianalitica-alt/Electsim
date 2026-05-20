"""Conector INE vivienda · Sprint 13 · S13.3.

> **Sprint 13 · S13.3** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 13 · Inmobiliario`)

INE expone series de vivienda vía API TEMPUS3 (JSON):

  - Índice Precio Vivienda (IPV) · trimestral · operación 25171
  - Índice Vivienda Usada (IVU)
  - Estadística de Hipotecas · mensual · operación 25172
  - Transmisiones de derechos de propiedad · operación 25173

Endpoint público:
  https://servicios.ine.es/wstempus/js/ES/SERIE/<COD_SERIE>?nult=N

Identificadores típicos:
  IPV nacional general:           IPV31886 (índice general España)
  IPV vivienda nueva:             IPV31887
  IPV vivienda usada:             IPV31888

Cliente sin auth, falla cerrado (timeout 15s → {error}).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_INE_TEMPUS = "https://servicios.ine.es/wstempus/js/ES"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 INE-Vivienda (+https://politeia-analitica.es)"

# Series IPV principales (códigos públicos INE TEMPUS3)
IPV_SERIES: dict[str, dict[str, str]] = {
    "general": {
        "code": "IPV31886",
        "title": "Índice de Precios de Vivienda · General Nacional",
    },
    "nueva": {
        "code": "IPV31887",
        "title": "Índice de Precios de Vivienda · Nueva Nacional",
    },
    "usada": {
        "code": "IPV31888",
        "title": "Índice de Precios de Vivienda · Usada Nacional",
    },
}


class INEViviendaClient:
    """Cliente INE TEMPUS para series de vivienda."""

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
            logger.warning("INEViviendaClient: requests no disponible · degradado")

    def get_serie(self, codigo: str, last_n: int = 20) -> dict[str, Any]:
        """Descarga una serie INE por código TEMPUS."""
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
            logger.warning("INE serie %s · %s", codigo, exc)
            return {"codigo": codigo, "data": [], "error": str(exc)}

        # data["Data"] es la lista de observaciones
        observations = []
        for d in data.get("Data") or []:
            observations.append({
                "fecha": d.get("Fecha"),
                "anyo": d.get("Anyo"),
                "valor": d.get("Valor"),
                "secreto": d.get("Secreto"),
                "tipoDato": d.get("T3_TipoDato"),
            })
        return {
            "codigo": codigo,
            "nombre": data.get("Nombre"),
            "frecuencia": (data.get("FK_Periodicidad") or {}).get("Codigo")
                if isinstance(data.get("FK_Periodicidad"), dict) else None,
            "n_obs": len(observations),
            "data": observations,
            "error": None,
        }

    def ipv_general(self, last_n: int = 20) -> dict[str, Any]:
        """Atajo · IPV general nacional."""
        return self.get_serie(IPV_SERIES["general"]["code"], last_n=last_n)

    def ipv_usada(self, last_n: int = 20) -> dict[str, Any]:
        return self.get_serie(IPV_SERIES["usada"]["code"], last_n=last_n)

    def ipv_nueva(self, last_n: int = 20) -> dict[str, Any]:
        return self.get_serie(IPV_SERIES["nueva"]["code"], last_n=last_n)


_CLIENT: INEViviendaClient | None = None


def get_ine_vivienda_client() -> INEViviendaClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = INEViviendaClient()
    return _CLIENT


__all__ = ["INEViviendaClient", "get_ine_vivienda_client", "IPV_SERIES"]
