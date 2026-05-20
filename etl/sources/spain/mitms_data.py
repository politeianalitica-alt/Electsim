"""Conector MITMS · Sprint 10 · S10.3.

> **Sprint 10 · S10.3** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 10 · Infraestructuras`)

MITMS (Ministerio de Transportes y Movilidad Sostenible · ex MITMA) publica
sus datasets abiertos en https://www.transportes.gob.es/ministerio/datos-abiertos
y vía datos.gob.es. Para nuestro caso de uso necesitamos:

  - Inversión por organismo / programa / anualidad (PGE)
  - Obras en curso (ADIF, DGC) por tramo y estado de ejecución
  - Tráfico aéreo (AENA stats)
  - Tráfico portuario (Puertos del Estado)

Estrategia: query a datos.gob.es API filtrando publisher 'http://datos.gob.es/...
ministerio-transportes'. Si el conector de open data ya existe (Bloque 10),
lo reutilizamos.

Falla cerrado: requests timeout 20s → []. No requiere API key.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

_DATOS_GOB_API = "https://datos.gob.es/apidata/catalog/dataset"
_TIMEOUT = 20
_USER_AGENT = "Politeia-Analitica/2.0 MITMS-Open-Data (+https://politeia-analitica.es)"

# Substrings publisher MITMS en datos.gob.es
_MITMS_PUBLISHERS = [
    "ministerio-transportes",
    "MITMA",
    "MITMS",
    "Ministerio-de-Transportes",
]


class MITMSDataClient:
    """Cliente datos.gob.es filtrado al universo MITMS."""

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
            logger.warning("MITMSDataClient: requests no disponible · degradado")

    def list_datasets(
        self,
        *,
        query: str | None = None,
        page: int = 0,
        page_size: int = 25,
    ) -> dict[str, Any]:
        """Lista datasets MITMS publicados en datos.gob.es.

        Args:
          query: texto libre que se concatena con publisher MITMS.
          page / page_size: paginación.

        Returns:
          {"n_results": int, "datasets": [{title, url, publisher, ...}]}
        """
        if self._session is None:
            return {"n_results": 0, "datasets": [], "error": "requests no disponible"}

        # datos.gob.es API · endpoint dataset?_pageSize=...&_page=...&q=...
        params = {
            "_pageSize": min(page_size, 50),
            "_page": page,
            "_sort": "-modified",
        }
        if query:
            params["q"] = query

        try:
            r = self._session.get(_DATOS_GOB_API, params=params, timeout=_TIMEOUT)
            r.raise_for_status()
            data = r.json()
        except Exception as exc:
            logger.warning("MITMS datos.gob.es · %s", exc)
            return {"n_results": 0, "datasets": [], "error": str(exc)}

        # datos.gob.es devuelve {result: {items: [...], count}}
        items = (data.get("result") or {}).get("items") or []
        datasets = []
        for it in items:
            publisher = _publisher_str(it)
            if not _is_mitms(publisher):
                continue
            datasets.append({
                "id": it.get("_about") or it.get("id"),
                "title": _title_str(it),
                "publisher": publisher,
                "modified": str(it.get("modified") or "")[:10],
                "url": it.get("_about"),
                "description": _description_str(it),
            })

        return {
            "n_results": len(datasets),
            "total_page": len(items),
            "datasets": datasets,
            "error": None,
        }


def _publisher_str(item: dict[str, Any]) -> str:
    """Extrae publisher como string, sea dict o lista o str."""
    pub = item.get("publisher") or item.get("dct:publisher") or ""
    if isinstance(pub, dict):
        return str(pub.get("name") or pub.get("_about") or pub.get("@id") or "")
    if isinstance(pub, list):
        return ", ".join(_publisher_str({"publisher": p}) for p in pub if p)
    return str(pub)


def _title_str(item: dict[str, Any]) -> str:
    t = item.get("title") or item.get("dct:title") or ""
    if isinstance(t, dict):
        return str(t.get("_value") or t.get("es") or next(iter(t.values()), ""))
    if isinstance(t, list):
        for v in t:
            if isinstance(v, dict) and v.get("_value"):
                return str(v["_value"])
            if isinstance(v, str):
                return v
    return str(t)


def _description_str(item: dict[str, Any]) -> str:
    d = item.get("description") or item.get("dct:description") or ""
    if isinstance(d, list):
        for v in d:
            if isinstance(v, dict) and v.get("_value"):
                return str(v["_value"])[:1000]
            if isinstance(v, str):
                return v[:1000]
    if isinstance(d, dict):
        return str(d.get("_value") or "")[:1000]
    return str(d)[:1000]


def _is_mitms(publisher: str) -> bool:
    pl = publisher.lower()
    return any(p.lower() in pl for p in _MITMS_PUBLISHERS)


_CLIENT: MITMSDataClient | None = None


def get_mitms_client() -> MITMSDataClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = MITMSDataClient()
    return _CLIENT


__all__ = ["MITMSDataClient", "get_mitms_client", "_MITMS_PUBLISHERS"]
