"""
Precio de la vivienda · alternativas a Idealista (sin licencia comercial).

Fuentes públicas disponibles SIN PAGAR:
  · INE Tabla 25171: Índice de precios de vivienda por provincia
       https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/25171
  · Ministerio de Transportes (MITMA): valor catastral medio
       https://transparencia.mitma.gob.es
  · IDEALISTA API: requiere licencia comercial (no implementado aquí)

Para precios por municipio finos hay que pagar Idealista/Fotocasa. Aquí
proveemos lo público gratis y dejamos skeleton para Idealista cuando se
contrate licencia.

API:
  · fetch_precio_provincia(cod_provincia) → {precio_m2, anio}
  · fetch_evolucion_precio_provincia(cod_provincia, anios=5)
  · IdealistaClient (skeleton)
"""
from __future__ import annotations

import logging
import os
from typing import Any

from ._http import http_get_json

logger = logging.getLogger(__name__)

INE_BASE = "https://servicios.ine.es/wstempus/js/ES"


def fetch_precio_provincia(cod_provincia: str) -> dict[str, Any]:
    """Precio medio €/m² por provincia (último periodo INE 25171)."""
    if not cod_provincia:
        return {"ok": False}
    url = f"{INE_BASE}/DATOS_TABLA/25171"
    params = {"tip": "AM", "nult": "1", "Prov": str(cod_provincia).zfill(2)}
    data = http_get_json(url, params=params, ttl_seconds=86400)
    if not data or not isinstance(data, list):
        return {"ok": False, "error": "INE no responde"}
    for item in data:
        nombre = str(item.get("Nombre") or "").lower()
        if "general" not in nombre and "vivienda" not in nombre:
            continue
        arr = item.get("Data") or []
        if not arr:
            continue
        return {
            "ok": True,
            "precio_m2": arr[0].get("Valor"),
            "periodo": arr[0].get("Anyo"),
            "trimestre": arr[0].get("FK_Periodo"),
        }
    return {"ok": False}


def fetch_evolucion_precio_provincia(
    cod_provincia: str, *, periodos: int = 20,
) -> list[dict[str, Any]]:
    """Serie histórica del índice de precios vivienda por provincia."""
    if not cod_provincia:
        return []
    url = f"{INE_BASE}/DATOS_TABLA/25171"
    params = {"tip": "AM", "nult": str(int(periodos)), "Prov": str(cod_provincia).zfill(2)}
    data = http_get_json(url, params=params, ttl_seconds=86400)
    if not data or not isinstance(data, list):
        return []
    for item in data:
        nombre = str(item.get("Nombre") or "").lower()
        if "general" not in nombre and "vivienda" not in nombre:
            continue
        arr = item.get("Data") or []
        return [
            {"anio": d.get("Anyo"), "trimestre": d.get("FK_Periodo"),
             "valor": d.get("Valor")}
            for d in arr if d.get("Valor") is not None
        ]
    return []


# ─────────────────────────────────────────────────────────────────
# IDEALISTA · skeleton para licencia comercial
# ─────────────────────────────────────────────────────────────────

class IdealistaClient:
    """Skeleton para Idealista API · requiere licencia comercial.

    Una vez se contrate:
      1. Obtener IDEALISTA_API_KEY desde el dashboard de Idealista
      2. Implementar OAuth 2.0 con `IDEALISTA_SECRET`
      3. Endpoints: /search.json con location_id por municipio
    """

    def __init__(self):
        self.api_key = os.environ.get("IDEALISTA_API_KEY", "").strip()
        self.secret = os.environ.get("IDEALISTA_SECRET", "").strip()

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.secret)

    def precio_municipio(self, cod_ine: str) -> dict[str, Any]:
        if not self.configured:
            return {"ok": False, "error": "Idealista no configurado · usa fetch_precio_provincia"}
        # TODO · implementar cuando haya licencia
        return {"ok": False, "error": "Idealista TODO"}


def get_idealista_client() -> IdealistaClient:
    return IdealistaClient()
