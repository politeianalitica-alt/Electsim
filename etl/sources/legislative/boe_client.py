"""
Cliente HTTP para la API pública del BOE (Boletín Oficial del Estado).

Fuentes oficiales:
  - API datos abiertos: https://www.boe.es/datosabiertos/api/
  - Sumario diario:     GET /boe/dias/{YYYY}/{MM}/{DD}
  - Documento:          GET /boe/id/{BOE-A-YYYY-XXXXX}
  - Búsqueda consolidada: GET /legislacion-consolidada/buscar?q=...&pagina=N

La API devuelve XML o JSON según cabecera Accept.
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)

_BASE = "https://www.boe.es/datosabiertos/api"
_HEADERS_JSON = {
    "Accept": "application/json",
    "User-Agent": "ElectSim-España/2.0 (investigacion; +https://github.com/electsim)",
}
_TIMEOUT = 20


class BOEClient:
    """
    Cliente robusto para la API del BOE.
    Nunca lanza excepciones hacia arriba: retorna None o [] en caso de error.
    """

    def __init__(self, session=None) -> None:
        try:
            import requests as _req
            self._session = session or _req.Session()
            self._session.headers.update(_HEADERS_JSON)
        except ImportError:
            self._session = None
            logger.warning("BOEClient: requests no disponible — operación degradada")

    # ── Métodos públicos ───────────────────────────────────────────────────────

    def get_sumario(self, fecha: date | str | None = None) -> dict[str, Any] | None:
        """
        Descarga el sumario BOE de una fecha.

        Args:
            fecha: date, 'YYYY-MM-DD' o None (=hoy).

        Returns:
            dict JSON con estructura del sumario, o None si falla.
        """
        if fecha is None:
            fecha = date.today()
        if isinstance(fecha, str):
            from datetime import datetime
            fecha = datetime.fromisoformat(fecha).date()

        path = f"{_BASE}/boe/dias/{fecha.year}/{fecha.month:02d}/{fecha.day:02d}"
        return self._get_json(path)

    def get_documento(self, doc_id: str) -> dict[str, Any] | None:
        """
        Descarga metadatos de un documento BOE específico.

        Args:
            doc_id: identificador BOE, ej. 'BOE-A-2026-1823'.

        Returns:
            dict JSON del documento o None.
        """
        path = f"{_BASE}/boe/id/{doc_id}"
        return self._get_json(path)

    def search_consolidated(
        self,
        query: str,
        pagina: int = 1,
        limit: int = 20,
    ) -> dict[str, Any] | None:
        """
        Busca en la legislación consolidada (>50.000 normas).

        Args:
            query: texto libre.
            pagina: número de página (1-based).
            limit: resultados por página (máx 20 en la API).

        Returns:
            dict con 'items' y 'total' o None.
        """
        params = {"q": query, "pagina": pagina}
        path = f"{_BASE}/legislacion-consolidada/buscar"
        return self._get_json(path, params=params)

    def get_consolidated_law(self, law_id: str) -> dict[str, Any] | None:
        """
        Descarga el texto de una ley consolidada.

        Args:
            law_id: identificador de legislación consolidada.
        """
        path = f"{_BASE}/legislacion-consolidada/{law_id}"
        return self._get_json(path)

    # ── Utilidades internas ────────────────────────────────────────────────────

    def _get_json(
        self,
        url: str,
        params: dict | None = None,
    ) -> dict[str, Any] | None:
        if self._session is None:
            return None
        try:
            r = self._session.get(url, params=params, timeout=_TIMEOUT)
            if r.status_code == 404:
                logger.debug("BOEClient 404: %s", url)
                return None
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("BOEClient error (%s): %s", url[:80], exc)
            return None

    # ── Helpers de parseo del sumario ─────────────────────────────────────────

    @staticmethod
    def extract_items_from_sumario(sumario: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Extrae la lista plana de disposiciones del sumario BOE.

        La API del BOE estructura el sumario como:
          {
            "boe": {
              "sumario": {
                "diario": {
                  "seccion": [ {"@id": "I", "departamento": [...]} ]
                }
              }
            }
          }
        """
        items: list[dict[str, Any]] = []
        try:
            diario = (
                sumario
                .get("boe", {})
                .get("sumario", {})
                .get("diario", {})
            )
            secciones = diario.get("seccion", [])
            if isinstance(secciones, dict):
                secciones = [secciones]

            for sec in secciones:
                sec_id = sec.get("@id", "")
                departamentos = sec.get("departamento", [])
                if isinstance(departamentos, dict):
                    departamentos = [departamentos]

                for dept in departamentos:
                    dept_name = dept.get("@nombre", "")
                    epigrafe = dept.get("epigrafe", [])
                    if isinstance(epigrafe, dict):
                        epigrafe = [epigrafe]

                    for epig in epigrafe:
                        epig_name = epig.get("@nombre", "")
                        items_raw = epig.get("item", [])
                        if isinstance(items_raw, dict):
                            items_raw = [items_raw]
                        for item in items_raw:
                            items.append({
                                "id": item.get("identificador", ""),
                                "titulo": item.get("titulo", ""),
                                "seccion": sec_id,
                                "departamento": dept_name,
                                "epigrafe": epig_name,
                                "url_html": item.get("urlHtml", item.get("url_html", "")),
                                "url_pdf": item.get("urlPdf", item.get("url_pdf", "")),
                                "fecha_publicacion": diario.get("@fechaPublicacion", ""),
                            })
        except Exception as exc:
            logger.warning("BOEClient.extract_items_from_sumario: %s", exc)

        return items
