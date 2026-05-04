"""
Cliente HTTP para el Congreso de los Diputados.

Fuentes:
  - Open Data oficial: https://www.congreso.es/es/opendata
  - API iniciativas:   https://www.congreso.es/es/opendata/iniciativas
  - Endpoint XML:      https://www.congreso.es/es/opendata/iniciativas?_format=json
  - Histórico:         https://datos.congreso.es/

Portado de la lógica de congreso-scrapper (Node/MongoDB) a Python.
"""
from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

_BASE_OPENDATA = "https://www.congreso.es"
_BASE_DATOS = "https://datos.congreso.es"
_TIMEOUT = 25

_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "ElectSim-España/2.0 (investigacion; +https://github.com/electsim)",
    "Accept-Language": "es-ES,es;q=0.9",
}

# Endpoints confirmados de la API Open Data del Congreso
_ENDPOINTS = {
    "legislaturas": "/opendata/legislaturas",
    "iniciativas": "/opendata/iniciativas",
    "diputados": "/opendata/diputados",
    "grupos_parlamentarios": "/opendata/grupos_parlamentarios",
    "comisiones": "/opendata/comisiones",
    "composicion_comision": "/opendata/composicion_comision",
    "votaciones": "/opendata/votaciones",
    "orden_dia": "/opendata/orden_dia",
}


class CongresoClient:
    """
    Cliente robusto para los datos abiertos del Congreso.
    Nunca propaga excepciones al caller — retorna None/[] en caso de error.
    """

    def __init__(self, session=None) -> None:
        try:
            import requests as _req
            self._session = session or _req.Session()
            self._session.headers.update(_HEADERS)
        except ImportError:
            self._session = None
            logger.warning("CongresoClient: requests no disponible")

    # ── Legislaturas ───────────────────────────────────────────────────────────

    def get_legislaturas(self) -> list[dict] | None:
        url = f"{_BASE_OPENDATA}{_ENDPOINTS['legislaturas']}"
        data = self._get_json(url)
        if data is None:
            return None
        return self._normalize_list(data)

    # ── Iniciativas ────────────────────────────────────────────────────────────

    def get_iniciativas(
        self,
        legislatura: str | int | None = None,
        tipo: str | None = None,
        pagina: int = 1,
        items_por_pagina: int = 25,
    ) -> dict[str, Any] | None:
        """
        Retorna iniciativas parlamentarias con paginación.

        Args:
            legislatura: número de legislatura (15 = actual, None = todas)
            tipo: 'PL'|'PPL'|'PNL'|'MOCI'|'INTER'|'PREG'|None
            pagina: página 1-based
            items_por_pagina: max 25 por limitación API

        Returns:
            dict con 'items' (list) y 'total' (int), o None.
        """
        params: dict[str, Any] = {"pagina": pagina, "items_por_pagina": items_por_pagina}
        if legislatura is not None:
            params["legislatura"] = str(legislatura)
        if tipo:
            params["tipo"] = tipo

        url = f"{_BASE_OPENDATA}{_ENDPOINTS['iniciativas']}"
        return self._get_json(url, params=params)

    def get_iniciativa_detalle(self, source_id: str) -> dict[str, Any] | None:
        """
        Descarga el detalle completo de una iniciativa: autores, comisiones,
        boletines, diarios de sesión y referencias BOE.

        Args:
            source_id: 'BOCG.14.B.22-1' o similar identificador del Congreso.
        """
        url = f"{_BASE_OPENDATA}{_ENDPOINTS['iniciativas']}/{source_id}"
        return self._get_json(url)

    # ── Parlamentarios ─────────────────────────────────────────────────────────

    def get_diputados(
        self,
        legislatura: str | int | None = None,
        grupo_parlamentario: str | None = None,
    ) -> list[dict] | None:
        params: dict[str, Any] = {}
        if legislatura is not None:
            params["legislatura"] = str(legislatura)
        if grupo_parlamentario:
            params["grupo_parlamentario"] = grupo_parlamentario
        url = f"{_BASE_OPENDATA}{_ENDPOINTS['diputados']}"
        data = self._get_json(url, params=params)
        if data is None:
            return None
        return self._normalize_list(data)

    # ── Grupos parlamentarios ──────────────────────────────────────────────────

    def get_grupos_parlamentarios(
        self, legislatura: str | int | None = None
    ) -> list[dict] | None:
        params: dict[str, Any] = {}
        if legislatura is not None:
            params["legislatura"] = str(legislatura)
        url = f"{_BASE_OPENDATA}{_ENDPOINTS['grupos_parlamentarios']}"
        data = self._get_json(url, params=params)
        if data is None:
            return None
        return self._normalize_list(data)

    # ── Comisiones ─────────────────────────────────────────────────────────────

    def get_comisiones(
        self, legislatura: str | int | None = None
    ) -> list[dict] | None:
        params: dict[str, Any] = {}
        if legislatura is not None:
            params["legislatura"] = str(legislatura)
        url = f"{_BASE_OPENDATA}{_ENDPOINTS['comisiones']}"
        data = self._get_json(url, params=params)
        if data is None:
            return None
        return self._normalize_list(data)

    # ── Votaciones ─────────────────────────────────────────────────────────────

    def get_votaciones(
        self,
        legislatura: str | int | None = None,
        fecha_desde: str | None = None,
        pagina: int = 1,
    ) -> dict[str, Any] | None:
        params: dict[str, Any] = {"pagina": pagina}
        if legislatura is not None:
            params["legislatura"] = str(legislatura)
        if fecha_desde:
            params["fecha_desde"] = fecha_desde
        url = f"{_BASE_OPENDATA}{_ENDPOINTS['votaciones']}"
        return self._get_json(url, params=params)

    # ── Utilidades internas ────────────────────────────────────────────────────

    def _get_json(
        self, url: str, params: dict | None = None
    ) -> Any:
        if self._session is None:
            return None
        try:
            r = self._session.get(url, params=params, timeout=_TIMEOUT)
            if r.status_code in (404, 410):
                logger.debug("CongresoClient %d: %s", r.status_code, url[:80])
                return None
            r.raise_for_status()
            ct = r.headers.get("Content-Type", "")
            if "json" in ct:
                return r.json()
            # Algunos endpoints devuelven XML — parsear si hay lxml/bs4
            if "xml" in ct:
                return self._parse_xml(r.content)
            # Intentar JSON de todas formas
            return r.json()
        except Exception as exc:
            logger.warning("CongresoClient error (%s): %s", url[:80], exc)
            return None

    @staticmethod
    def _parse_xml(content: bytes) -> dict | None:
        """Parseo básico XML → dict usando xmltodict si disponible."""
        try:
            import xmltodict
            return xmltodict.parse(content)
        except ImportError:
            pass
        try:
            from xml.etree import ElementTree as ET
            root = ET.fromstring(content)
            return {"_xml_root": root.tag, "_xml_text": root.text}
        except Exception:
            return None

    @staticmethod
    def _normalize_list(data: Any) -> list[dict]:
        """Normaliza respuesta que puede ser lista o dict con 'items'/'data'."""
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for key in ("items", "data", "results", "diputados", "grupos"):
                if key in data and isinstance(data[key], list):
                    return data[key]
        return []
