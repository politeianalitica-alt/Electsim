"""
OpenData Core — Dashboard Services — Bloque 10.

Funciones para el dashboard: portales, datasets, recursos, planes.
Degrada graciosamente si no hay BD o conectores disponibles.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Caches en memoria ──────────────────────────────────────────────────────────

_PORTAL_CACHE: list[dict] = []
_DATASET_CACHE: list[dict] = []


def cargar_portales_opendata(
    active_only: bool = True,
    administration_level: str | None = None,
) -> list[dict]:
    """
    Carga la lista de portales de datos abiertos.

    Returns:
        Lista de dicts con datos del portal.
    """
    try:
        from etl.sources.opendata.portal_registry import list_portals
        portals = list_portals(active_only=active_only, administration_level=administration_level)
        result = []
        for p in portals:
            result.append({
                "portal_id": p.portal_id,
                "name": p.name,
                "country": p.country,
                "region": p.region,
                "administration_level": p.administration_level,
                "portal_type": p.portal_type,
                "base_url": p.base_url,
                "api_url": p.api_url,
                "active": p.active,
                "language": p.language,
            })
        if result:
            global _PORTAL_CACHE
            _PORTAL_CACHE = result
        return result
    except Exception as exc:
        logger.debug("cargar_portales_opendata: %s", exc)
        return _PORTAL_CACHE


def cargar_datasets_recientes(
    limit: int = 50,
    portal_id: str | None = None,
    theme: str | None = None,
) -> list[dict]:
    """
    Carga datasets recientes del catálogo.

    Returns:
        Lista de dicts con datos del dataset.
    """
    try:
        from etl.sources.opendata.datos_gob_connector import search_datasets
        from etl.sources.opendata.dataset_mapper import infer_applicable_modules

        query = theme or ""
        datasets = search_datasets(query, limit=limit)

        result = []
        for ds in datasets:
            if portal_id and ds.portal_id != portal_id:
                continue
            modules = infer_applicable_modules(ds)
            result.append({
                "dataset_id": ds.dataset_id,
                "portal_id": ds.portal_id,
                "title": ds.title,
                "description": (ds.description or "")[:200],
                "themes": ds.themes or [],
                "keywords": ds.keywords[:5] if ds.keywords else [],
                "publisher": ds.publisher,
                "license_id": ds.license_id,
                "applicable_modules": modules[:3],
                "update_frequency": ds.update_frequency,
                "issued": str(ds.issued_at) if ds.issued_at else None,
                "modified": str(ds.modified_at) if ds.modified_at else None,
            })

        if result:
            global _DATASET_CACHE
            _DATASET_CACHE = result[:limit]
        return result[:limit]
    except Exception as exc:
        logger.debug("cargar_datasets_recientes: %s", exc)
        return _DATASET_CACHE[:limit]


def buscar_datasets(
    query: str,
    limit: int = 30,
    portal_id: str | None = None,
) -> list[dict]:
    """
    Busca datasets por texto en todos los portales.

    Returns:
        Lista de dicts con resultados.
    """
    if not query or not query.strip():
        return []

    results: list[dict] = []

    try:
        from etl.sources.opendata.datos_gob_connector import search_datasets
        datasets = search_datasets(query, limit=limit)
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
                "modified": str(ds.modified_at) if ds.modified_at else None,
                "score": 1.0,
            })
    except Exception as exc:
        logger.debug("buscar_datasets(datos.gob.es): %s", exc)

    # Complementar con portales autonómicos si hay pocos resultados
    if len(results) < limit // 2:
        try:
            from etl.sources.opendata.autonomous_connector import search_autonomous_datasets
            auto_ds = search_autonomous_datasets(query, limit=limit // 2)
            for ds in auto_ds:
                results.append({
                    "dataset_id": ds.dataset_id,
                    "portal_id": ds.portal_id,
                    "title": ds.title,
                    "description": (ds.description or "")[:200],
                    "publisher": ds.publisher,
                    "themes": ds.themes or [],
                    "license_id": ds.license_id,
                    "modified": str(ds.modified_at) if ds.modified_at else None,
                    "score": 0.8,
                })
        except Exception as exc:
            logger.debug("buscar_datasets(autonomico): %s", exc)

    return results[:limit]


def cargar_recursos_dataset(
    dataset_id: str,
    portal_id: str | None = None,
) -> list[dict]:
    """
    Carga los recursos de un dataset específico.

    Returns:
        Lista de dicts con datos del recurso.
    """
    try:
        from etl.sources.opendata.datos_gob_connector import fetch_resources
        resources = fetch_resources(dataset_id)
        result = []
        for r in resources:
            result.append({
                "resource_id": r.resource_id,
                "title": r.title,
                "url": r.url,
                "download_url": r.download_url,
                "format": r.format,
                "is_machine_readable": r.is_machine_readable,
                "is_tabular": r.is_tabular,
                "is_geospatial": r.is_geospatial,
                "is_document": r.is_document,
                "size_bytes": r.size_bytes,
                "modified": str(r.modified) if r.modified else None,
            })
        return result
    except Exception as exc:
        logger.debug("cargar_recursos_dataset(%s): %s", dataset_id, exc)
        return []


def cargar_ingestion_plans(
    review_status: str | None = "candidate",
    target_domain: str | None = None,
    limit: int = 50,
    engine: Any = None,
) -> list[dict]:
    """
    Carga planes de ingesta del catálogo.

    Returns:
        Lista de dicts con planes.
    """
    if engine:
        try:
            from sqlalchemy import text
            query = """
                SELECT dataset_id, portal_id, target_domain, applicable_modules,
                       applicable_sectors, transform_strategy, priority,
                       review_status, justification, suggested_by, created_at
                FROM dataset_ingestion_plans
                WHERE 1=1
            """
            params: dict[str, Any] = {}
            if review_status:
                query += " AND review_status = :review_status"
                params["review_status"] = review_status
            if target_domain:
                query += " AND target_domain = :target_domain"
                params["target_domain"] = target_domain
            query += " ORDER BY priority ASC, created_at DESC LIMIT :limit"
            params["limit"] = limit

            with engine.connect() as conn:
                rows = conn.execute(text(query), params).fetchall()
                return [dict(r._mapping) for r in rows]
        except Exception as exc:
            logger.debug("cargar_ingestion_plans DB: %s", exc)

    return []


def cargar_kpis_opendata(engine: Any = None) -> dict[str, Any]:
    """
    Carga KPIs del módulo Open Data.

    Returns:
        Dict con métricas clave.
    """
    kpis: dict[str, Any] = {
        "total_portales": 0,
        "portales_activos": 0,
        "portales_nacionales": 0,
        "portales_autonomicos": 0,
        "portales_municipales": 0,
        "total_datasets": 0,
        "datasets_con_licencia": 0,
        "datasets_libres": 0,
        "planes_candidatos": 0,
        "planes_aprobados": 0,
        "planes_rechazados": 0,
    }

    # Portales desde registry
    try:
        from etl.sources.opendata.portal_registry import list_portals
        portals = list_portals(active_only=False)
        kpis["total_portales"] = len(portals)
        kpis["portales_activos"] = sum(1 for p in portals if p.active)
        kpis["portales_nacionales"] = sum(1 for p in portals if p.administration_level == "national")
        kpis["portales_autonomicos"] = sum(1 for p in portals if p.administration_level == "autonomous")
        kpis["portales_municipales"] = sum(1 for p in portals if p.administration_level == "municipal")
    except Exception as exc:
        logger.debug("cargar_kpis_opendata portales: %s", exc)

    # Datos de BD
    if engine:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                # Datasets
                try:
                    row = conn.execute(text("SELECT COUNT(*) FROM open_data_datasets")).fetchone()
                    kpis["total_datasets"] = row[0] if row else 0
                except Exception:
                    pass

                # Planes
                try:
                    rows = conn.execute(text(
                        "SELECT review_status, COUNT(*) FROM dataset_ingestion_plans GROUP BY review_status"
                    )).fetchall()
                    for row in rows:
                        status, count = row[0], row[1]
                        if status == "candidate":
                            kpis["planes_candidatos"] = count
                        elif status == "approved":
                            kpis["planes_aprobados"] = count
                        elif status == "rejected":
                            kpis["planes_rechazados"] = count
                except Exception:
                    pass
        except Exception as exc:
            logger.debug("cargar_kpis_opendata DB: %s", exc)

    return kpis


def cargar_datasets_por_modulo(
    module: str,
    limit: int = 20,
) -> list[dict]:
    """
    Carga datasets relevantes para un módulo ElectSim.

    Args:
        module: Nombre del módulo (electoral, legislative, economy, etc.)
        limit: Máximo de resultados.

    Returns:
        Lista de datasets relevantes para el módulo.
    """
    # Términos de búsqueda por módulo
    _MODULE_QUERIES: dict[str, str] = {
        "electoral": "elecciones",
        "legislative": "legislacion boe",
        "economy": "economia pib empleo",
        "contracting": "contratacion licitacion",
        "geospatial": "sig cartografia",
        "media": "medios prensa",
        "risk": "riesgo fraude",
        "regulatory": "regulacion mercado",
        "actors": "partidos organizaciones",
        "documents": "informes publicaciones",
    }

    query = _MODULE_QUERIES.get(module, module)
    return buscar_datasets(query, limit=limit)


def cargar_datasets_candidatos(
    limit: int = 20,
    engine: Any = None,
) -> list[dict]:
    """
    Carga datasets con planes de ingesta pendientes de revisión.

    Returns:
        Lista de planes candidatos ordenados por prioridad.
    """
    return cargar_ingestion_plans(
        review_status="candidate",
        limit=limit,
        engine=engine,
    )
