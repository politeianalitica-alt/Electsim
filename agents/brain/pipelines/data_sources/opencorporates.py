"""
OpenCorporates + SABI · empresas vinculadas a personas (consejos, accionariado).

OpenCorporates (gratis con limits, OPENCORPORATES_API_KEY opcional):
  https://api.opencorporates.com/v0.4/
  · search/companies                  → buscar empresa por nombre
  · companies/{jurisdiction}/{number} → ficha completa
  · officers/{officer_id}             → vínculos de una persona

SABI (Bureau van Dijk, licencia comercial):
  Skeleton listo para plugar la API real una vez se contrate licencia.

API:
  · search_companies_by_name(nombre, juris="es") → list[empresas]
  · find_officer_companies(nombre_persona, country="es") → list[empresas que
        tienen a esta persona como officer/director/etc.]
  · fetch_company(jurisdiction, company_number) → ficha completa
  · sabi_search_officer(...) → skeleton SABI

Notas:
  · Free tier: 500 requests/mes sin key, 1000/h con key.
  · La api responde JSON con datos estructurados.
"""
from __future__ import annotations

import logging
import os
import urllib.parse
from typing import Any

from ._http import http_get_json

logger = logging.getLogger(__name__)

OC_BASE = "https://api.opencorporates.com/v0.4"


def _api_key_suffix() -> str:
    key = os.environ.get("OPENCORPORATES_API_KEY", "").strip()
    return f"&api_token={key}" if key else ""


def search_companies_by_name(
    nombre: str, *, juris: str = "es", limit: int = 10,
) -> list[dict[str, Any]]:
    """Busca empresas españolas (CIF, NIF, jurisdiction=es) por nombre."""
    if not nombre:
        return []
    q = urllib.parse.quote_plus(nombre)
    url = (
        f"{OC_BASE}/companies/search?q={q}&jurisdiction_code={juris}"
        f"&per_page={int(limit)}{_api_key_suffix()}"
    )
    data = http_get_json(url, ttl_seconds=43200)
    if not data or not isinstance(data, dict):
        return []
    results = (data.get("results") or {}).get("companies") or []
    out: list[dict[str, Any]] = []
    for r in results[:int(limit)]:
        c = (r or {}).get("company") or {}
        if not c:
            continue
        out.append({
            "nombre":            c.get("name") or "",
            "numero":            c.get("company_number") or "",
            "jurisdiction_code": c.get("jurisdiction_code") or "",
            "tipo":              c.get("company_type") or "",
            "estado":            c.get("current_status") or "",
            "fecha_constitucion": c.get("incorporation_date") or "",
            "fecha_disolucion":  c.get("dissolution_date") or "",
            "direccion":         c.get("registered_address_in_full") or "",
            "url":               c.get("opencorporates_url") or "",
        })
    return out


def find_officer_companies(
    nombre_persona: str, *, country: str = "es", limit: int = 20,
) -> list[dict[str, Any]]:
    """Devuelve las empresas donde aparece la persona como officer.

    Útil para detectar consejos de administración, fundaciones vinculadas,
    sociedades pantalla.
    """
    if not nombre_persona:
        return []
    q = urllib.parse.quote_plus(nombre_persona)
    url = (
        f"{OC_BASE}/officers/search?q={q}&jurisdiction_code={country}"
        f"&per_page={int(limit)}{_api_key_suffix()}"
    )
    data = http_get_json(url, ttl_seconds=43200)
    if not data or not isinstance(data, dict):
        return []
    results = (data.get("results") or {}).get("officers") or []
    out: list[dict[str, Any]] = []
    for r in results[:int(limit)]:
        o = (r or {}).get("officer") or {}
        if not o:
            continue
        company = o.get("company") or {}
        out.append({
            "officer_name":      o.get("name") or "",
            "rol":               o.get("position") or "",
            "fecha_inicio":      o.get("start_date") or "",
            "fecha_fin":         o.get("end_date") or "",
            "empresa_nombre":    company.get("name") or "",
            "empresa_numero":    company.get("company_number") or "",
            "empresa_jurisdiction": company.get("jurisdiction_code") or "",
            "url":               o.get("opencorporates_url") or "",
        })
    return out


def fetch_company(jurisdiction: str, number: str) -> dict[str, Any]:
    """Ficha completa de una empresa por jurisdicción + número."""
    if not jurisdiction or not number:
        return {}
    url = f"{OC_BASE}/companies/{jurisdiction}/{number}{_api_key_suffix().replace('&', '?', 1)}"
    data = http_get_json(url, ttl_seconds=86400)
    if not data:
        return {}
    return (data or {}).get("results", {}).get("company") or {}


def inferir_sectores_de_empresas(empresas: list[dict[str, Any]]) -> list[str]:
    """Inferir sectores estratégicos desde tipos de actividad de las empresas."""
    sectores_mapa = {
        "construcc":   "construcción",
        "inmobili":    "inmobiliario",
        "energ":       "energía",
        "banca":       "financiero",
        "asegurad":    "seguros",
        "farm":        "farmacéutico",
        "alimenta":    "agroalimentario",
        "agric":       "agrario",
        "tecnolog":    "tecnología",
        "software":    "tecnología",
        "consultor":   "consultoría",
        "abogad":      "legal",
        "med":         "medios",
        "comun":       "medios",
        "telecom":     "telecom",
        "transport":   "transporte",
        "turism":      "turismo",
        "hostele":     "hostelería",
        "defens":      "defensa",
        "salud":       "sanitario",
    }
    sectores: set[str] = set()
    for e in empresas:
        texto = ((e.get("nombre") or "") + " " + (e.get("empresa_nombre") or "")).lower()
        for k, v in sectores_mapa.items():
            if k in texto:
                sectores.add(v)
    return sorted(sectores)


# ─────────────────────────────────────────────────────────────────
# SABI · skeleton para licencia comercial
# ─────────────────────────────────────────────────────────────────

class SABIClient:
    """Skeleton para SABI (Bureau van Dijk).

    SABI requiere licencia comercial. Cuando se contrate:
      1. Obtener `SABI_API_KEY` y `SABI_TOKEN` del proveedor.
      2. Implementar los métodos consultando endpoints concretos.
      3. Wire en `ficha_politico_builder.py` Bloque 9.

    Por ahora cada método devuelve estructura vacía consistente para que
    el caller no se rompa.
    """

    def __init__(self, *, api_key: str | None = None, token: str | None = None):
        self.api_key = api_key or os.environ.get("SABI_API_KEY", "")
        self.token   = token   or os.environ.get("SABI_TOKEN", "")

    @property
    def configured(self) -> bool:
        return bool(self.api_key and self.token)

    def search_officer(self, nombre: str) -> list[dict[str, Any]]:
        """Buscar persona como administrador/consejero en SABI."""
        if not self.configured:
            return []
        # TODO · implementar cuando haya licencia
        logger.debug("SABI not configured · skipping search_officer")
        return []

    def company_directors(self, cif: str) -> list[dict[str, Any]]:
        """Consejo de administración de una empresa española por CIF."""
        if not self.configured:
            return []
        return []

    def company_financials(self, cif: str, *, years: int = 5) -> list[dict[str, Any]]:
        """Cuentas anuales (ingresos, beneficios, empleados) por CIF."""
        if not self.configured:
            return []
        return []


def get_sabi_client() -> SABIClient:
    return SABIClient()
