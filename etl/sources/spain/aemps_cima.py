"""Conector AEMPS / CIMA · Sprint 8 · S8.1.

> **Sprint 8 · S8.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 8 · Farma`)

AEMPS (Agencia Española de Medicamentos y Productos Sanitarios) expone:

1. **CIMA REST API** (Centro de Información online de Medicamentos)
   - https://cima.aemps.es/cima/rest/
   - Endpoint `/medicamentos` · catálogo nacional de medicamentos
   - Endpoint `/medicamento` · ficha técnica individual
   - Endpoint `/problemasSuministro` · alertas de desabastecimiento

2. **Notas informativas de farmacovigilancia** (RSS)
   - Defectos de calidad, retiradas de lotes, alertas de seguridad.

Output: NormalizedItem para cada nota / problema relevante.

Falla cerrado: timeout 15s, errores → []. No requiere API key.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_CIMA_BASE = "https://cima.aemps.es/cima/rest"
_TIMEOUT = 15
_USER_AGENT = "Politeia-Analitica/2.0 AEMPS-Monitor (+https://politeia-analitica.es)"


class AEMPSCIMAClient:
    """Cliente CIMA + AEMPS · medicamentos, desabastecimientos, alertas."""

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
            logger.warning("AEMPSCIMAClient: requests no disponible · degradado")

    # ── Catálogo medicamentos ─────────────────────────────────────

    def buscar_medicamento(
        self,
        nombre: str | None = None,
        laboratorio: str | None = None,
        practiv1: str | None = None,
        page: int = 1,
        pagesize: int = 25,
    ) -> dict[str, Any]:
        """Busca medicamentos en CIMA.

        Args:
          nombre: nombre comercial (parcial OK)
          laboratorio: titular autorización
          practiv1: principio activo (ej. 'paracetamol')
          page / pagesize: paginación

        Returns:
          {"resultados": [...], "totalFilas": int, "pagina": int} o {"error": str}.
        """
        if self._session is None:
            return {"error": "requests no disponible", "resultados": []}

        params: dict[str, Any] = {"pagina": page, "tamanioPagina": pagesize}
        if nombre:
            params["nombre"] = nombre
        if laboratorio:
            params["laboratorio"] = laboratorio
        if practiv1:
            params["practiv1"] = practiv1

        try:
            r = self._session.get(f"{_CIMA_BASE}/medicamentos", params=params, timeout=_TIMEOUT)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("CIMA buscar_medicamento · %s", exc)
            return {"error": str(exc), "resultados": []}

    def ficha_medicamento(self, nregistro: str) -> dict[str, Any]:
        """Ficha completa por nº de registro AEMPS."""
        if self._session is None:
            return {"error": "requests no disponible"}
        try:
            r = self._session.get(
                f"{_CIMA_BASE}/medicamento",
                params={"nregistro": nregistro},
                timeout=_TIMEOUT,
            )
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("CIMA ficha %s · %s", nregistro, exc)
            return {"error": str(exc)}

    # ── Problemas de suministro ───────────────────────────────────

    def problemas_suministro(
        self,
        nombre: str | None = None,
        practiv1: str | None = None,
        page: int = 1,
        pagesize: int = 25,
    ) -> dict[str, Any]:
        """Alertas vivas de desabastecimiento (CIMA).

        El endpoint público es `/psuministro` · devuelve medicamentos con
        problemas de suministro activos. Crítico para detección temprana
        en sector farma.
        """
        if self._session is None:
            return {"error": "requests no disponible", "resultados": []}

        params: dict[str, Any] = {"pagina": page, "tamanioPagina": pagesize}
        if nombre:
            params["nombre"] = nombre
        if practiv1:
            params["practiv1"] = practiv1

        try:
            r = self._session.get(f"{_CIMA_BASE}/psuministro", params=params, timeout=_TIMEOUT)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("CIMA psuministro · %s", exc)
            return {"error": str(exc), "resultados": []}

    # ── Notas informativas (alertas farmacovigilancia) ───────────

    def notas_informativas(self) -> list[dict[str, Any]]:
        """Notas informativas de seguridad (placeholder · usar RSS oficial).

        AEMPS publica notas en https://www.aemps.gob.es/informa/notasInformativas
        sin endpoint JSON estable. Estrategia: el dashboard puede combinar
        problemas_suministro() + búsqueda BOE como proxy.

        Returns:
          [] de momento · pendiente scraper HTML si se prioriza.
        """
        return []


# ────────────────────────────────────────────────────────────────────
# Adapter · AEMPS → NormalizedItem
# ────────────────────────────────────────────────────────────────────

def to_normalized_items_psum(max_items: int = 100) -> Iterator[Any]:
    """Genera NormalizedItem para cada problema de suministro activo."""
    try:
        from packages.types import NormalizedItem
    except ImportError:
        return

    client = AEMPSCIMAClient()
    if client._session is None:
        return

    data = client.problemas_suministro(pagesize=max_items)
    if data.get("error"):
        return

    now = datetime.now(timezone.utc)
    for raw in data.get("resultados", [])[:max_items]:
        try:
            nregistro = str(raw.get("nregistro") or raw.get("registro") or "")
            nombre = raw.get("nombre") or raw.get("nombrePrincipioActivo") or "Medicamento"
            obs = raw.get("observ") or raw.get("observaciones") or ""
            url = (
                f"https://cima.aemps.es/cima/publico/detalle.html?nregistro={nregistro}"
                if nregistro else "https://cima.aemps.es/cima/publico/inicio.html"
            )
            raw_hash = hashlib.sha256(
                f"aemps_psum|{nregistro}|{nombre}".encode("utf-8")
            ).hexdigest()
            yield NormalizedItem(
                source="manual",  # No hay SourceKind dedicado para AEMPS
                item_id=f"aemps_psum_{nregistro or raw_hash[:12]}"[:512],
                title=f"AEMPS · Problema suministro: {nombre}"[:2000],
                body=str(obs)[:8000],
                summary=str(obs)[:400] or f"Problema de suministro · {nombre}",
                url=url,
                published_at=now,
                author="AEMPS",
                language="es",
                raw_hash=raw_hash,
                categories=["aemps", "farma", "suministro"],
                payload={
                    "nregistro": nregistro,
                    "nombre": nombre,
                    "principios_activos": raw.get("pactivos"),
                },
            )
        except Exception as exc:
            logger.debug("AEMPS NormalizedItem · %s", exc)


_CLIENT: AEMPSCIMAClient | None = None


def get_aemps_client() -> AEMPSCIMAClient:
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = AEMPSCIMAClient()
    return _CLIENT


__all__ = [
    "AEMPSCIMAClient",
    "get_aemps_client",
    "to_normalized_items_psum",
]
