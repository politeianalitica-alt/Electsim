"""Conector Catastro OVC · Sprint 13 · S13.1.

> **Sprint 13 · S13.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 13 · Inmobiliario`)

Sede Electrónica del Catastro · servicios públicos sin autenticación:

  - OVC Coordenadas → datos del inmueble en (lat, lon)
  - OVC ReferenciaCatastral → datos por RC
  - OVC Callejero → búsqueda por dirección postal

Endpoint REST público:
  https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/

Pero el endpoint REST simple (JSON) está en:
  http://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/

Aquí implementamos un wrapper minimalista sobre el endpoint JSON de
ReferenciaCatastral.

Falla cerrado: timeout 15s · errores → {}. No requiere API key.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_CATASTRO_BASE = "http://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 Catastro-Lookup (+https://politeia-analitica.es)"


class CatastroClient:
    """Cliente JSON para Sede Electrónica del Catastro (OVC)."""

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
            logger.warning("CatastroClient: requests no disponible · degradado")

    def consulta_rc(self, referencia_catastral: str) -> dict[str, Any]:
        """Consulta por Referencia Catastral (RC) · 14 o 20 caracteres.

        Devuelve la respuesta JSON del OVC tal cual, con la clave 'error' si
        algo falla.
        """
        if self._session is None:
            return {"error": "requests no disponible"}
        rc = (referencia_catastral or "").strip()
        if not rc:
            return {"error": "referencia catastral vacía"}
        params = {"RefCat": rc}
        try:
            r = self._session.get(
                f"{_CATASTRO_BASE}/Consulta_DNPRC",
                params=params, timeout=_TIMEOUT,
            )
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("Catastro consulta_rc · %s · %s", rc, exc)
            return {"error": str(exc), "rc": rc}

    def consulta_coordenadas(self, lat: float, lon: float) -> dict[str, Any]:
        """Consulta inmueble por coordenadas geográficas (EPSG:4326)."""
        if self._session is None:
            return {"error": "requests no disponible"}
        params = {"Coordenada_X": lon, "Coordenada_Y": lat, "SRS": "EPSG:4326"}
        try:
            r = self._session.get(
                f"{_CATASTRO_BASE}/Consulta_RCCOOR",
                params=params, timeout=_TIMEOUT,
            )
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("Catastro consulta_coordenadas · %s,%s · %s", lat, lon, exc)
            return {"error": str(exc)}

    def buscar_direccion(
        self,
        *,
        provincia: str,
        municipio: str,
        via: str,
        numero: str | None = None,
    ) -> dict[str, Any]:
        """Búsqueda por dirección postal (callejero OVC)."""
        if self._session is None:
            return {"error": "requests no disponible"}
        params = {
            "Provincia": provincia,
            "Municipio": municipio,
            "TipoVia": "",
            "NomVia": via,
        }
        if numero:
            params["Numero"] = numero
        try:
            r = self._session.get(
                f"{_CATASTRO_BASE}/Consulta_DNPLOC",
                params=params, timeout=_TIMEOUT,
            )
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("Catastro buscar_direccion · %s/%s · %s", provincia, via, exc)
            return {"error": str(exc)}


_CLIENT: CatastroClient | None = None


def get_catastro_client() -> CatastroClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = CatastroClient()
    return _CLIENT


__all__ = ["CatastroClient", "get_catastro_client"]
