"""
OpenData Tools — Bloque 10.

Herramientas LLM para buscar y analizar datos abiertos oficiales.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _search_open_datasets(query: str, limit: int = 10, portal_id: str | None = None) -> dict:
    """Busca datasets en portales de datos abiertos."""
    try:
        from etl.sources.opendata.datos_gob_connector import search_datasets
        datasets = search_datasets(query, limit=limit)
        results = []
        for ds in datasets:
            if portal_id and ds.portal_id != portal_id:
                continue
            results.append({
                "dataset_id": ds.dataset_id,
                "portal_id": ds.portal_id,
                "title": ds.title,
                "description": (ds.description or "")[:200],
                "publisher": ds.publisher,
                "themes": ds.themes or [],
                "license_id": ds.license_id,
                "resource_count": len(ds.resources or []),
            })
        return {
            "query": query,
            "total": len(results),
            "datasets": results[:limit],
        }
    except Exception as exc:
        logger.debug("_search_open_datasets: %s", exc)
        return {"query": query, "total": 0, "datasets": [], "error": str(exc)}


def _get_open_dataset(dataset_id: str) -> dict:
    """Obtiene los detalles de un dataset específico."""
    try:
        from etl.sources.opendata.datos_gob_connector import fetch_dataset
        ds = fetch_dataset(dataset_id)
        if not ds:
            return {"error": f"Dataset no encontrado: {dataset_id}"}
        return {
            "dataset_id": ds.dataset_id,
            "portal_id": ds.portal_id,
            "title": ds.title,
            "description": ds.description,
            "publisher": ds.publisher,
            "themes": ds.themes,
            "keywords": ds.keywords,
            "license_id": ds.license_id,
            "license_title": ds.license_title,
            "license_url": ds.license_url,
            "update_frequency": ds.update_frequency,
            "issued": str(ds.issued) if ds.issued else None,
            "modified": str(ds.modified) if ds.modified else None,
            "resource_count": len(ds.resources or []),
        }
    except Exception as exc:
        logger.debug("_get_open_dataset(%s): %s", dataset_id, exc)
        return {"error": str(exc), "dataset_id": dataset_id}


def _get_dataset_resources(dataset_id: str) -> dict:
    """Lista los recursos (archivos) disponibles de un dataset."""
    try:
        from etl.sources.opendata.datos_gob_connector import fetch_resources
        resources = fetch_resources(dataset_id)
        result = []
        for r in resources:
            result.append({
                "resource_id": r.resource_id,
                "title": r.title,
                "format": r.format,
                "url": r.url,
                "download_url": r.download_url,
                "is_machine_readable": r.is_machine_readable,
                "is_tabular": r.is_tabular,
                "is_geospatial": r.is_geospatial,
                "size_bytes": r.size_bytes,
            })
        return {
            "dataset_id": dataset_id,
            "total_resources": len(result),
            "resources": result,
        }
    except Exception as exc:
        logger.debug("_get_dataset_resources(%s): %s", dataset_id, exc)
        return {"error": str(exc), "dataset_id": dataset_id, "resources": []}


def _recommend_datasets_for_module(module: str, limit: int = 10) -> dict:
    """Recomienda datasets de datos abiertos para un módulo ElectSim."""
    try:
        from etl.sources.opendata.dataset_mapper import infer_applicable_modules
        from etl.sources.opendata.datos_gob_connector import search_datasets

        _MODULE_QUERIES = {
            "electoral": "elecciones resultados electorales",
            "legislative": "legislacion boe disposiciones",
            "economy": "economia pib empleo estadistica",
            "contracting": "contratacion publica licitacion",
            "geospatial": "cartografia sig geometria",
            "media": "medios comunicacion prensa",
            "risk": "riesgo indicadores",
            "regulatory": "regulacion mercado competencia",
        }

        query = _MODULE_QUERIES.get(module, module)
        datasets = search_datasets(query, limit=limit * 2)

        # Filtrar por módulo
        relevant = []
        for ds in datasets:
            inferred = infer_applicable_modules(ds)
            if module in inferred or not inferred:
                relevant.append({
                    "dataset_id": ds.dataset_id,
                    "title": ds.title,
                    "publisher": ds.publisher,
                    "themes": ds.themes or [],
                    "inferred_modules": inferred[:3],
                    "resource_count": len(ds.resources or []),
                })
                if len(relevant) >= limit:
                    break

        return {
            "module": module,
            "total": len(relevant),
            "datasets": relevant,
        }
    except Exception as exc:
        logger.debug("_recommend_datasets_for_module(%s): %s", module, exc)
        return {"module": module, "total": 0, "datasets": [], "error": str(exc)}


def _recommend_ingestion_plan(dataset_id: str) -> dict:
    """
    Genera un plan de ingesta recomendado para un dataset.
    El plan queda como 'candidate' hasta aprobación humana.
    """
    try:
        from etl.sources.opendata.datos_gob_connector import fetch_dataset
        from etl.sources.opendata.dataset_mapper import recommend_ingestion_plan
        from etl.sources.opendata.license_classifier import classify_license, requires_legal_review

        ds = fetch_dataset(dataset_id)
        if not ds:
            return {"error": f"Dataset no encontrado: {dataset_id}"}

        plan = recommend_ingestion_plan(ds)
        assessment = classify_license(ds)

        return {
            "dataset_id": dataset_id,
            "title": ds.title,
            "plan": {
                "target_domain": plan.target_domain,
                "applicable_modules": plan.applicable_modules,
                "applicable_sectors": plan.applicable_sectors,
                "transform_strategy": plan.transform_strategy,
                "priority": plan.priority,
                "review_status": plan.review_status,
                "justification": plan.justification,
            },
            "license": {
                "risk_level": assessment.risk_level,
                "commercial_use_allowed": assessment.commercial_use_allowed,
                "requires_legal_review": requires_legal_review(assessment),
                "notes": assessment.notes,
            },
            "note": "El plan es candidato y requiere aprobacion humana antes de ingesta.",
        }
    except Exception as exc:
        logger.debug("_recommend_ingestion_plan(%s): %s", dataset_id, exc)
        return {"error": str(exc), "dataset_id": dataset_id}


def _get_official_sources_status() -> dict:
    """Estado de los portales oficiales de datos abiertos."""
    try:
        from etl.sources.opendata.portal_registry import list_portals
        portals = list_portals(active_only=True)
        by_level: dict[str, list] = {}
        for p in portals:
            level = p.administration_level
            if level not in by_level:
                by_level[level] = []
            by_level[level].append({
                "portal_id": p.portal_id,
                "name": p.name,
                "portal_type": p.portal_type,
                "country": p.country,
                "region": p.region,
                "last_harvested_at": str(p.last_harvested_at) if p.last_harvested_at else None,
            })
        return {
            "total_portales_activos": len(portals),
            "por_nivel": by_level,
        }
    except Exception as exc:
        logger.debug("_get_official_sources_status: %s", exc)
        return {"total_portales_activos": 0, "por_nivel": {}, "error": str(exc)}


# ── Registro de herramientas ──────────────────────────────────────────────────

OPENDATA_TOOLS: list[dict] = [
    {
        "name": "search_open_datasets",
        "description": (
            "Busca datasets en portales de datos abiertos espanoles y europeos "
            "(datos.gob.es, INE, Eurostat, etc.). Devuelve lista de datasets con "
            "titulo, editor, temas y numero de recursos."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Termino de busqueda (ej: 'elecciones', 'pib', 'contratacion').",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximo de resultados (default: 10).",
                    "default": 10,
                },
                "portal_id": {
                    "type": "string",
                    "description": "Filtrar por portal especifico (ej: 'datos_gob_es', 'ine').",
                },
            },
            "required": ["query"],
        },
        "function": _search_open_datasets,
    },
    {
        "name": "get_open_dataset",
        "description": (
            "Obtiene los detalles completos de un dataset de datos abiertos: "
            "descripcion, licencia, frecuencia de actualizacion, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {
                    "type": "string",
                    "description": "ID del dataset (ej: 'datos_gob_es:l01280796-padron-municipal').",
                },
            },
            "required": ["dataset_id"],
        },
        "function": _get_open_dataset,
    },
    {
        "name": "get_dataset_resources",
        "description": (
            "Lista los recursos (archivos descargables) de un dataset: "
            "formato, URL, si es legible por maquina, tamano, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {
                    "type": "string",
                    "description": "ID del dataset.",
                },
            },
            "required": ["dataset_id"],
        },
        "function": _get_dataset_resources,
    },
    {
        "name": "recommend_datasets_for_module",
        "description": (
            "Recomienda datasets de datos abiertos relevantes para un modulo ElectSim. "
            "Modulos disponibles: electoral, legislative, economy, contracting, "
            "geospatial, media, risk, regulatory."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "module": {
                    "type": "string",
                    "description": "Nombre del modulo ElectSim.",
                    "enum": ["electoral", "legislative", "economy", "contracting",
                             "geospatial", "media", "risk", "regulatory", "documents", "actors"],
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximo de datasets recomendados (default: 10).",
                    "default": 10,
                },
            },
            "required": ["module"],
        },
        "function": _recommend_datasets_for_module,
    },
    {
        "name": "recommend_ingestion_plan",
        "description": (
            "Genera un plan de ingesta candidato para un dataset de datos abiertos. "
            "El plan incluye dominio destino, modulos aplicables, estrategia de "
            "transformacion y evaluacion de licencia. Requiere aprobacion humana antes de ejecutar."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {
                    "type": "string",
                    "description": "ID del dataset para el que generar el plan.",
                },
            },
            "required": ["dataset_id"],
        },
        "function": _recommend_ingestion_plan,
    },
    {
        "name": "get_official_sources_status",
        "description": (
            "Devuelve el estado de los portales oficiales de datos abiertos registrados: "
            "cuantos hay activos, por nivel administrativo (nacional, autonomico, municipal, UE) "
            "y cuando fue el ultimo harvest de cada uno."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
        "function": _get_official_sources_status,
    },
]
