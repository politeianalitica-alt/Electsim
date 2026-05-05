"""
BOE Connector — Bloque 10.

Cataloga los endpoints de datos abiertos del BOE.
NO reemplaza legislative/boe_client.py (que ingiere normas concretas).

opendata/boe_connector    = cataloga endpoints
legislative/boe_client    = ingiere normas concretas
documents/pdf_parser      = procesa PDFs
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import OpenDataset, InstitutionalAPIEndpoint

logger = logging.getLogger(__name__)

PORTAL_ID = "boe"
BASE_URL = "https://www.boe.es"

_BOE_ENDPOINTS: list[dict] = [
    {
        "name": "BOE — Sumario del día",
        "url_template": "https://www.boe.es/datosabiertos/api/boe/sumario/{date}",
        "protocol": "rest_json",
        "description": "Sumario completo del BOE para una fecha dada.",
        "applicable_modules": ["legislative", "documents"],
        "parameters_schema": {"date": {"type": "string", "format": "YYYYMMDD"}},
    },
    {
        "name": "BOE — Búsqueda full-text",
        "url_template": "https://www.boe.es/buscar/api.php?q={query}&d=BOE&p={page}",
        "protocol": "rest_xml",
        "description": "Búsqueda full-text en el BOE.",
        "applicable_modules": ["legislative", "documents"],
    },
    {
        "name": "BOE — Documento por ID",
        "url_template": "https://www.boe.es/datosabiertos/api/boe/id/{boe_id}",
        "protocol": "rest_json",
        "description": "Metadatos y contenido de un documento BOE.",
        "applicable_modules": ["legislative", "documents"],
        "parameters_schema": {"boe_id": {"type": "string", "example": "BOE-A-2024-1234"}},
    },
    {
        "name": "BOE — SPARQL endpoint",
        "url_template": "https://www.boe.es/sparql",
        "protocol": "sparql",
        "description": "SPARQL endpoint de datos enlazados del BOE.",
        "applicable_modules": ["legislative"],
    },
    {
        "name": "BOCG — Congreso Diputados",
        "url_template": "https://www.congreso.es/opendata/api/public/v1/",
        "protocol": "rest_json",
        "description": "Datos abiertos del Congreso de los Diputados.",
        "applicable_modules": ["legislative"],
    },
]


def list_boe_api_endpoints() -> list[InstitutionalAPIEndpoint]:
    """Devuelve los endpoints registrados del BOE."""
    return [
        InstitutionalAPIEndpoint(
            source_id=PORTAL_ID,
            name=ep["name"],
            description=ep.get("description"),
            url_template=ep["url_template"],
            protocol=ep["protocol"],
            applicable_modules=ep.get("applicable_modules", []),
            parameters_schema=ep.get("parameters_schema", {}),
        )
        for ep in _BOE_ENDPOINTS
    ]


def list_boe_datasets() -> list[OpenDataset]:
    """Lista los conjuntos de datos documentados del BOE."""
    return [
        OpenDataset(
            dataset_id="boe:sumario_diario",
            portal_id=PORTAL_ID,
            title="BOE — Sumario Diario",
            description="Datos estructurados del sumario diario del Boletín Oficial del Estado.",
            themes=["gobierno", "legislacion"],
            keywords=["boe", "ley", "real decreto", "normativa", "sumario"],
            publisher="Agencia Estatal Boletín Oficial del Estado",
            license_id="cc-by",
            license_title="Creative Commons Atribución",
            update_frequency="daily",
            applicable_modules=["legislative", "documents"],
        ),
        OpenDataset(
            dataset_id="boe:full_text_search",
            portal_id=PORTAL_ID,
            title="BOE — Búsqueda Full-Text",
            description="API de búsqueda en el corpus completo del BOE.",
            themes=["gobierno", "legislacion"],
            keywords=["boe", "búsqueda", "full-text"],
            publisher="Agencia Estatal BOE",
            applicable_modules=["legislative", "documents"],
        ),
    ]


def fetch_boe_sumario(date_str: str, timeout: int = 15) -> dict:
    """
    Obtiene el sumario del BOE para una fecha (YYYYMMDD).
    Devuelve dict vacío si falla.
    """
    try:
        import requests
        url = f"https://www.boe.es/datosabiertos/api/boe/sumario/{date_str}"
        resp = requests.get(url, timeout=timeout,
                            headers={"Accept": "application/json"})
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.debug("fetch_boe_sumario(%s): %s", date_str, exc)
        return {}
