"""Cliente HTTP OpenSanctions · self-hosted yente o api publica (Sprint 4 · S4.1).

> **Sprint 4 · S4.1** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 4`)

Politeia ya tiene `opensanctions_adapter.py` para importar archivos JSONL.
Lo que faltaba: un cliente HTTP que consulta OpenSanctions en TIEMPO REAL
(self-hosted yente Docker o api.opensanctions.org publica).

Endpoint configurable vía OPENSANCTIONS_API_URL:
  - Default · self-hosted yente · http://localhost:8000/
  - Fallback · API publica · https://api.opensanctions.org/

OpenSanctions agrega 250+ listas de:
  - Sanciones (OFAC, UE, ONU, INTERPOL, FATF)
  - PEP (Politically Exposed Persons) de 50 paises
  - WB (Worldbank exclusiones)
  - Listas de deudores fiscales
  - Personas buscadas

API REST principal · documentado en https://api.opensanctions.org/docs

Endpoints clave:
  - GET /search/{dataset}?q={name}   · búsqueda lex
  - POST /match/{dataset}             · matching estructurado por entidad
  - GET /entities/{entity_id}         · detalle de una entidad

Despliegue self-hosted con Docker (decisión del usuario · Sprint 1):
  · docker run -p 8000:8000 ghcr.io/opensanctions/yente:latest
  · O usar docker-compose · ver docs/COMPLIANCE_DEPLOY.md (proximamente)

Falla cerrado: si endpoint no responde, devuelve {} o [] sin romper.
"""
from __future__ import annotations

import logging
import os
from typing import Any
from functools import lru_cache

logger = logging.getLogger(__name__)


_BASE_URL = os.environ.get(
    "OPENSANCTIONS_API_URL",
    "http://localhost:8000",  # self-hosted yente default
).rstrip("/")
_API_KEY = os.environ.get("OPENSANCTIONS_API_KEY", "")
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 Compliance-Screen (+https://politeia-analitica.es)"

# Datasets predefinidos · listas combinadas más usadas
DATASET_DEFAULT = "default"           # combinación de sanciones + PEP + criminal
DATASET_SANCTIONS = "sanctions"       # solo sanciones internacionales
DATASET_PEPS = "peps"                 # solo Personas Politicamente Expuestas


class OpenSanctionsClient:
    """Cliente HTTP para yente self-hosted o api.opensanctions.org publica.

    Falla cerrado: nunca lanza excepción hacia arriba.
    """

    def __init__(self, base_url: str | None = None, session: Any = None) -> None:
        self._base = (base_url or _BASE_URL).rstrip("/")
        try:
            import requests  # type: ignore
            self._session = session or requests.Session()
            headers = {
                "Accept": "application/json",
                "User-Agent": _USER_AGENT,
            }
            if _API_KEY:
                headers["Authorization"] = f"ApiKey {_API_KEY}"
            self._session.headers.update(headers)
        except ImportError:
            self._session = None
            logger.warning("OpenSanctionsClient: requests no disponible · degradado")

    # ── Búsqueda lex (search) ─────────────────────────────────────

    def search(
        self,
        query: str,
        dataset: str = DATASET_DEFAULT,
        *,
        schema: str | None = None,
        limit: int = 10,
        countries: list[str] | None = None,
    ) -> dict[str, Any]:
        """Búsqueda lex de entidades por nombre/texto.

        Args:
          query: nombre o texto a buscar
          dataset: 'default', 'sanctions', 'peps' o nombre específico
          schema: 'Person', 'Company', 'Organization' (filtro opcional)
          limit: max resultados (1-100)
          countries: ISO 3166-1 alpha-2 list (ej ['es', 'fr'])

        Returns:
          {
            "results": [{"id": "...", "caption": "...", "schema": "...", "datasets": [...], "score": 0.95}, ...],
            "total": int,
            "error": null,
          }
        """
        if self._session is None:
            return {"results": [], "total": 0, "error": "requests no disponible"}
        if not query or not query.strip():
            return {"results": [], "total": 0, "error": "query vacía"}

        params: dict[str, Any] = {
            "q": query.strip(),
            "limit": max(1, min(limit, 100)),
        }
        if schema:
            params["schema"] = schema
        if countries:
            params["countries"] = ",".join(c.lower() for c in countries)

        url = f"{self._base}/search/{dataset}"
        try:
            r = self._session.get(url, params=params, timeout=_TIMEOUT)
            if r.status_code == 404:
                return {"results": [], "total": 0, "error": f"dataset {dataset} no encontrado"}
            r.raise_for_status()
            data = r.json()
            return {
                "results": (data.get("results") or [])[:limit],
                "total": int(data.get("total", {}).get("value", 0) if isinstance(data.get("total"), dict) else data.get("total", 0)),
                "error": None,
            }
        except Exception as exc:
            logger.warning("OpenSanctions search · %s · %s", url, exc)
            return {"results": [], "total": 0, "error": str(exc)}

    # ── Match estructurado (más preciso que search) ───────────────

    def match(
        self,
        name: str,
        *,
        dataset: str = DATASET_DEFAULT,
        schema: str = "Person",
        nationality: str | None = None,
        birth_date: str | None = None,
        threshold: float = 0.6,
    ) -> dict[str, Any]:
        """Matching estructurado por entidad · mas preciso que search.

        Args:
          name: nombre canonico de la persona/entidad
          dataset: como search
          schema: 'Person', 'Company', 'Organization', 'LegalEntity'
          nationality: ISO 3166-1 alpha-2 (ej 'es')
          birth_date: 'YYYY-MM-DD' (solo Person)
          threshold: score min (0-1) para considerar match

        Returns:
          {
            "results": [{score, match, entity: {id, caption, schema, properties}}, ...],
            "error": null,
          }
        """
        if self._session is None:
            return {"results": [], "error": "requests no disponible"}
        if not name or not name.strip():
            return {"results": [], "error": "name vacío"}

        query = {
            "queries": {
                "q1": {
                    "schema": schema,
                    "properties": {
                        "name": [name.strip()],
                    },
                },
            },
        }
        if nationality:
            query["queries"]["q1"]["properties"]["nationality"] = [nationality.lower()]
        if birth_date and schema == "Person":
            query["queries"]["q1"]["properties"]["birthDate"] = [birth_date]

        url = f"{self._base}/match/{dataset}"
        try:
            r = self._session.post(
                url,
                json=query,
                params={"threshold": threshold},
                timeout=_TIMEOUT,
            )
            if r.status_code == 404:
                return {"results": [], "error": f"dataset {dataset} no encontrado"}
            r.raise_for_status()
            data = r.json()
            # yente devuelve {responses: {q1: {results: [...]}}}
            responses = data.get("responses", {})
            q1 = responses.get("q1", {}) if responses else {}
            return {
                "results": q1.get("results", []),
                "error": None,
            }
        except Exception as exc:
            logger.warning("OpenSanctions match · %s · %s", url, exc)
            return {"results": [], "error": str(exc)}

    # ── Detalle de una entidad ────────────────────────────────────

    def get_entity(self, entity_id: str) -> dict[str, Any] | None:
        """Devuelve el detalle completo de una entity de OpenSanctions."""
        if self._session is None or not entity_id:
            return None
        url = f"{self._base}/entities/{entity_id}"
        try:
            r = self._session.get(url, timeout=_TIMEOUT)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.debug("OpenSanctions get_entity · %s · %s", entity_id, exc)
            return None

    # ── Health check ───────────────────────────────────────────────

    def health(self) -> dict[str, Any]:
        """Verifica disponibilidad del servicio."""
        if self._session is None:
            return {"ok": False, "error": "requests no disponible"}
        try:
            r = self._session.get(f"{self._base}/", timeout=5)
            return {
                "ok": r.status_code == 200,
                "base_url": self._base,
                "status_code": r.status_code,
                "version": r.json().get("version", "unknown") if r.status_code == 200 else None,
            }
        except Exception as exc:
            return {"ok": False, "base_url": self._base, "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# Singleton
# ────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_opensanctions_client() -> OpenSanctionsClient:
    """Singleton del OpenSanctionsClient."""
    return OpenSanctionsClient()


__all__ = [
    "OpenSanctionsClient",
    "get_opensanctions_client",
    "DATASET_DEFAULT",
    "DATASET_SANCTIONS",
    "DATASET_PEPS",
]
