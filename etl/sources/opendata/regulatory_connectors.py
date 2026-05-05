"""
Regulatory Connectors — Bloque 10.

Conectores para organismos reguladores:
  BdE (Banco de España), CNMV, CNMC, PLACE (contratación pública).

Cada conector cataloga endpoints y datasets disponibles.
No descarga datos completos por defecto.
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.opendata.schemas import (
    OpenDataset, OpenDatasetResource, InstitutionalAPIEndpoint,
)

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# BdE — Banco de España
# ══════════════════════════════════════════════════════════════════════════════

BDE_PORTAL_ID = "bde"
BDE_BASE = "https://www.bde.es"

_BDE_ENDPOINTS: list[dict] = [
    {
        "name": "BdE — Estadísticas: boletín estadístico",
        "url_template": "https://www.bde.es/webbe/es/estadisticas/compartido/datos/ficheros/",
        "protocol": "bulk",
        "description": "Ficheros de estadísticas del Banco de España.",
        "applicable_modules": ["economy", "risk"],
    },
    {
        "name": "BdE — Tipos de interés y tipos de cambio",
        "url_template": "https://www.bde.es/webbe/es/estadisticas/compartido/datos/api/tipo-interes",
        "protocol": "rest_json",
        "description": "Series de tipos de interés y tipos de cambio.",
        "applicable_modules": ["economy"],
    },
]

def list_bde_endpoints() -> list[InstitutionalAPIEndpoint]:
    """Endpoints institucionales del BdE."""
    return [
        InstitutionalAPIEndpoint(
            source_id=BDE_PORTAL_ID,
            name=ep["name"],
            url_template=ep["url_template"],
            protocol=ep["protocol"],
            description=ep.get("description"),
            applicable_modules=ep.get("applicable_modules", []),
        )
        for ep in _BDE_ENDPOINTS
    ]

def list_bde_datasets() -> list[OpenDataset]:
    """Lista datasets documentados del BdE."""
    return [
        OpenDataset(
            dataset_id="bde:boletin_estadistico",
            portal_id=BDE_PORTAL_ID,
            title="BdE — Boletín Estadístico",
            description="Estadísticas monetarias, bancarias y financieras del Banco de España.",
            themes=["economia", "estadistica"],
            keywords=["banco espana", "tipos interes", "credito", "depositos"],
            publisher="Banco de España",
            update_frequency="monthly",
            applicable_modules=["economy", "risk"],
            applicable_sectors=["finanzas", "banca"],
        ),
    ]


# ══════════════════════════════════════════════════════════════════════════════
# CNMV — Comisión Nacional del Mercado de Valores
# ══════════════════════════════════════════════════════════════════════════════

CNMV_PORTAL_ID = "cnmv"
CNMV_BASE = "https://www.cnmv.es"
CNMV_API = "https://www.cnmv.es/api"

_CNMV_ENDPOINTS: list[dict] = [
    {
        "name": "CNMV — Hechos relevantes",
        "url_template": f"{CNMV_API}/hechos-relevantes",
        "protocol": "rest_json",
        "description": "Listado de hechos relevantes de emisores registrados.",
        "applicable_modules": ["economy", "risk", "legislative"],
    },
    {
        "name": "CNMV — Entidades registradas",
        "url_template": f"{CNMV_API}/entidades",
        "protocol": "rest_json",
        "description": "Entidades registradas en la CNMV.",
        "applicable_modules": ["economy", "risk"],
    },
]

def list_cnmv_endpoints() -> list[InstitutionalAPIEndpoint]:
    return [
        InstitutionalAPIEndpoint(
            source_id=CNMV_PORTAL_ID,
            name=ep["name"],
            url_template=ep["url_template"],
            protocol=ep["protocol"],
            description=ep.get("description"),
            applicable_modules=ep.get("applicable_modules", []),
        )
        for ep in _CNMV_ENDPOINTS
    ]

def list_cnmv_datasets() -> list[OpenDataset]:
    return [
        OpenDataset(
            dataset_id="cnmv:hechos_relevantes",
            portal_id=CNMV_PORTAL_ID,
            title="CNMV — Hechos Relevantes",
            description="Hechos relevantes comunicados por emisores al mercado de valores.",
            themes=["economia", "gobierno"],
            keywords=["cnmv", "bolsa", "mercados", "hechos relevantes"],
            publisher="CNMV",
            update_frequency="daily",
            applicable_modules=["economy", "risk"],
        ),
    ]

def fetch_cnmv_hechos_relevantes(limit: int = 50, timeout: int = 15) -> list[dict]:
    """Obtiene hechos relevantes recientes de la CNMV."""
    try:
        import requests
        resp = requests.get(
            f"{CNMV_API}/hechos-relevantes",
            params={"pageSize": limit},
            timeout=timeout,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("items") or data if isinstance(data, list) else []
    except Exception as exc:
        logger.debug("fetch_cnmv_hechos_relevantes: %s", exc)
        return []


# ══════════════════════════════════════════════════════════════════════════════
# CNMC — Comisión Nacional de Mercados y la Competencia
# ══════════════════════════════════════════════════════════════════════════════

CNMC_PORTAL_ID = "cnmc"
CNMC_BASE = "https://www.cnmc.es"

_CNMC_ENDPOINTS: list[dict] = [
    {
        "name": "CNMC — Resoluciones",
        "url_template": "https://www.cnmc.es/api/resoluciones",
        "protocol": "rest_json",
        "description": "Resoluciones y acuerdos de la CNMC.",
        "applicable_modules": ["regulatory", "risk", "legislative"],
    },
    {
        "name": "CNMC — Indicadores de mercado",
        "url_template": "https://www.cnmc.es/api/indicadores",
        "protocol": "rest_json",
        "description": "Indicadores de mercados regulados.",
        "applicable_modules": ["economy", "regulatory"],
    },
]

def list_cnmc_endpoints() -> list[InstitutionalAPIEndpoint]:
    return [
        InstitutionalAPIEndpoint(
            source_id=CNMC_PORTAL_ID,
            name=ep["name"],
            url_template=ep["url_template"],
            protocol=ep["protocol"],
            description=ep.get("description"),
            applicable_modules=ep.get("applicable_modules", []),
        )
        for ep in _CNMC_ENDPOINTS
    ]

def list_cnmc_datasets() -> list[OpenDataset]:
    return [
        OpenDataset(
            dataset_id="cnmc:resoluciones",
            portal_id=CNMC_PORTAL_ID,
            title="CNMC — Resoluciones y expedientes",
            description="Resoluciones de la Comisión Nacional de Mercados y la Competencia.",
            themes=["gobierno", "legislacion"],
            keywords=["cnmc", "competencia", "regulacion"],
            publisher="CNMC",
            applicable_modules=["regulatory", "risk", "legislative"],
        ),
    ]


# ══════════════════════════════════════════════════════════════════════════════
# PLACE — Contratación Pública
# ══════════════════════════════════════════════════════════════════════════════

PLACE_PORTAL_ID = "place"
PLACE_BASE = "https://contrataciondelestado.es"
PLACE_SINDICACION = "https://contrataciondelestado.es/sindicacion"

_PLACE_ENDPOINTS: list[dict] = [
    {
        "name": "PLACE — Feed de licitaciones",
        "url_template": f"{PLACE_SINDICACION}/sindicacion/licitacionesPerfilesContratanteSubidos3.atom",
        "protocol": "rss",
        "description": "Feed Atom de licitaciones del sector público.",
        "applicable_modules": ["contracting", "risk", "economy"],
    },
    {
        "name": "PLACE — SPARQL de contratación",
        "url_template": "https://www.hacienda.gob.es/es-ES/CDI/Paginas/SistemadeInformacionContable/Contratacion/sparql.aspx",
        "protocol": "sparql",
        "description": "Endpoint SPARQL de datos de contratación pública.",
        "applicable_modules": ["contracting"],
    },
]

def list_place_endpoints() -> list[InstitutionalAPIEndpoint]:
    return [
        InstitutionalAPIEndpoint(
            source_id=PLACE_PORTAL_ID,
            name=ep["name"],
            url_template=ep["url_template"],
            protocol=ep["protocol"],
            description=ep.get("description"),
            applicable_modules=ep.get("applicable_modules", []),
        )
        for ep in _PLACE_ENDPOINTS
    ]

def list_place_datasets() -> list[OpenDataset]:
    return [
        OpenDataset(
            dataset_id="place:licitaciones",
            portal_id=PLACE_PORTAL_ID,
            title="PLACE — Licitaciones del Sector Público",
            description="Datos de licitaciones y contratos del sector público español.",
            themes=["gobierno", "contratacion"],
            keywords=["contratacion", "licitacion", "adjudicacion", "concurso"],
            publisher="Ministerio de Hacienda",
            update_frequency="daily",
            applicable_modules=["contracting", "risk", "economy"],
        ),
        OpenDataset(
            dataset_id="place:contratos_menores",
            portal_id=PLACE_PORTAL_ID,
            title="PLACE — Contratos Menores",
            description="Información sobre contratos menores del sector público.",
            themes=["gobierno", "contratacion"],
            keywords=["contratos menores", "transparencia"],
            publisher="Ministerio de Hacienda",
            applicable_modules=["contracting", "risk"],
        ),
    ]

def fetch_place_licitaciones_feed(timeout: int = 20) -> list[dict]:
    """Parsea el feed Atom de licitaciones de PLACE."""
    try:
        import requests
        resp = requests.get(
            f"{PLACE_SINDICACION}/sindicacion/licitacionesPerfilesContratanteSubidos3.atom",
            timeout=timeout,
        )
        resp.raise_for_status()
        # Parseo básico sin feedparser
        import xml.etree.ElementTree as ET
        root = ET.fromstring(resp.content)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = []
        for entry in root.findall("atom:entry", ns)[:50]:
            entries.append({
                "title": (entry.find("atom:title", ns) or _stub()).text,
                "id": (entry.find("atom:id", ns) or _stub()).text,
                "updated": (entry.find("atom:updated", ns) or _stub()).text,
                "link": (entry.find("atom:link", ns) or _stub()).get("href"),
            })
        return entries
    except Exception as exc:
        logger.debug("fetch_place_licitaciones_feed: %s", exc)
        return []


class _stub:
    text = None
    def get(self, k, default=None): return default


# ── API unificada ──────────────────────────────────────────────────────────────

def list_all_regulatory_datasets() -> list[OpenDataset]:
    """Lista todos los datasets de organismos reguladores."""
    return (
        list_bde_datasets() +
        list_cnmv_datasets() +
        list_cnmc_datasets() +
        list_place_datasets()
    )


def list_all_regulatory_endpoints() -> list[InstitutionalAPIEndpoint]:
    """Lista todos los endpoints de organismos reguladores."""
    return (
        list_bde_endpoints() +
        list_cnmv_endpoints() +
        list_cnmc_endpoints() +
        list_place_endpoints()
    )
