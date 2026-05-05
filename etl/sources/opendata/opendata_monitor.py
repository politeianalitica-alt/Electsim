"""
OpenData Monitor — Bloque 10.

Orquesta el pipeline completo de datos abiertos:
  seed → sync → harvest → profile → classify → map → recommend

Diseñado para ejecución periódica (APScheduler / Celery beat).
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class HarvestSummary:
    """Resultado de un ciclo de harvest."""
    portals_seeded: int = 0
    portals_synced: int = 0
    datasets_discovered: int = 0
    datasets_profiled: int = 0
    datasets_classified: int = 0
    plans_recommended: int = 0
    errors: list[str] = field(default_factory=list)
    duration_seconds: float = 0.0

    def as_dict(self) -> dict[str, Any]:
        return {
            "portals_seeded": self.portals_seeded,
            "portals_synced": self.portals_synced,
            "datasets_discovered": self.datasets_discovered,
            "datasets_profiled": self.datasets_profiled,
            "datasets_classified": self.datasets_classified,
            "plans_recommended": self.plans_recommended,
            "errors": self.errors,
            "duration_seconds": round(self.duration_seconds, 2),
        }


def run_full_harvest(
    portal_ids: list[str] | None = None,
    query: str = "",
    limit: int = 50,
    profile_resources: bool = False,
    engine: Any = None,
    dry_run: bool = False,
    timeout: int = 15,
) -> HarvestSummary:
    """
    Ejecuta un ciclo completo de harvest de datos abiertos.

    Pasos:
    1. Seed portales por defecto en BD (si engine disponible)
    2. Sync catalog_sources → open_data_portals
    3. Harvest datasets de los portales seleccionados
    4. Clasificar licencias
    5. Inferir módulos y sectores
    6. Generar planes de ingesta candidatos
    7. (Opcional) Perfilar recursos

    Args:
        portal_ids: IDs de portales a cosechar. None = todos.
        query: Término de búsqueda para los portales.
        limit: Máximo de datasets por portal.
        profile_resources: Si se perfilará el primer recurso de cada dataset.
        engine: SQLAlchemy engine (None = operación en memoria).
        dry_run: Si True, no persiste nada en BD.
        timeout: Timeout para llamadas HTTP.

    Returns:
        HarvestSummary con estadísticas del ciclo.
    """
    t0 = time.time()
    summary = HarvestSummary()

    # ── Paso 1: Seed portales ─────────────────────────────────────────────────
    if engine and not dry_run:
        try:
            from etl.sources.opendata.portal_registry import seed_default_portals
            summary.portals_seeded = seed_default_portals(engine)
            logger.info("opendata_monitor: seeded %d portales", summary.portals_seeded)
        except Exception as exc:
            msg = f"seed_default_portals: {exc}"
            logger.debug(msg)
            summary.errors.append(msg)

    # ── Paso 2: Sync catalog_sources → open_data_portals ─────────────────────
    if engine and not dry_run:
        try:
            from etl.sources.opendata.catalog_bridge import sync_catalog_sources_to_portals
            summary.portals_synced = sync_catalog_sources_to_portals(engine)
            logger.info("opendata_monitor: synced %d catalog_sources", summary.portals_synced)
        except Exception as exc:
            msg = f"sync_catalog_sources_to_portals: {exc}"
            logger.debug(msg)
            summary.errors.append(msg)

    # ── Paso 3: Harvest datasets ──────────────────────────────────────────────
    datasets = _harvest_datasets(portal_ids=portal_ids, query=query, limit=limit, timeout=timeout, summary=summary)
    summary.datasets_discovered = len(datasets)
    logger.info("opendata_monitor: discovered %d datasets", summary.datasets_discovered)

    if not datasets:
        summary.duration_seconds = time.time() - t0
        return summary

    # ── Paso 4-6: Classify + map + recommend ─────────────────────────────────
    plans = []
    for dataset in datasets:
        try:
            # Clasificar licencia
            from etl.sources.opendata.license_classifier import classify_license
            assessment = classify_license(dataset)
            summary.datasets_classified += 1

            # Inferir módulos y sectores
            from etl.sources.opendata.dataset_mapper import recommend_ingestion_plan
            plan = recommend_ingestion_plan(dataset)
            plans.append(plan)
            summary.plans_recommended += 1
        except Exception as exc:
            summary.errors.append(f"classify/map {dataset.dataset_id}: {exc}")

    # ── Paso 7: Perfilar recursos (opcional) ──────────────────────────────────
    if profile_resources:
        for dataset in datasets[:20]:  # Máximo 20 para no saturar
            if not dataset.resources:
                continue
            resource = dataset.resources[0]
            try:
                from etl.sources.opendata.dataset_profiler import profile_resource
                profile = profile_resource(resource, timeout=timeout)
                if profile:
                    summary.datasets_profiled += 1
            except Exception as exc:
                summary.errors.append(f"profile {resource.resource_id}: {exc}")

    # ── Persistir planes en BD ────────────────────────────────────────────────
    if engine and not dry_run and plans:
        _persist_plans(plans, engine, summary)

    summary.duration_seconds = time.time() - t0
    logger.info(
        "opendata_monitor: harvest completado en %.1fs — %d datasets, %d planes, %d errores",
        summary.duration_seconds, summary.datasets_discovered, summary.plans_recommended, len(summary.errors),
    )
    return summary


def harvest_portal(
    portal_id: str,
    query: str = "",
    limit: int = 50,
    timeout: int = 15,
) -> list:
    """
    Cosecha datasets de un portal específico.

    Returns:
        Lista de OpenDataset.
    """
    from etl.sources.opendata.portal_registry import get_portal

    portal = get_portal(portal_id)
    if not portal:
        logger.debug("harvest_portal: portal no encontrado: %s", portal_id)
        return []

    return _harvest_from_portal(portal, query=query, limit=limit, timeout=timeout)


def seed_and_sync(engine: Any, dry_run: bool = False) -> dict[str, int]:
    """
    Ejecuta solo los pasos de seed y sync.

    Returns:
        Dict con portals_seeded y portals_synced.
    """
    result = {"portals_seeded": 0, "portals_synced": 0}

    if not engine:
        return result

    try:
        from etl.sources.opendata.portal_registry import seed_default_portals
        if not dry_run:
            result["portals_seeded"] = seed_default_portals(engine)
    except Exception as exc:
        logger.debug("seed_and_sync seed: %s", exc)

    try:
        from etl.sources.opendata.catalog_bridge import sync_catalog_sources_to_portals
        if not dry_run:
            result["portals_synced"] = sync_catalog_sources_to_portals(engine)
    except Exception as exc:
        logger.debug("seed_and_sync sync: %s", exc)

    return result


# ── Helpers internos ──────────────────────────────────────────────────────────

def _harvest_datasets(
    portal_ids: list[str] | None,
    query: str,
    limit: int,
    timeout: int,
    summary: HarvestSummary,
) -> list:
    """Cosecha datasets de todos los portales (o los indicados)."""
    from etl.sources.opendata.portal_registry import list_portals

    portals = list_portals(active_only=True)
    if portal_ids:
        portals = [p for p in portals if p.portal_id in portal_ids]

    all_datasets = []
    for portal in portals:
        try:
            datasets = _harvest_from_portal(portal, query=query, limit=limit, timeout=timeout)
            all_datasets.extend(datasets)
        except Exception as exc:
            summary.errors.append(f"harvest {portal.portal_id}: {exc}")

    return all_datasets


def _harvest_from_portal(portal: Any, query: str, limit: int, timeout: int) -> list:
    """Cosecha datasets de un portal según su tipo."""
    portal_type = getattr(portal, "portal_type", "unknown")
    portal_id = getattr(portal, "portal_id", "")
    api_url = getattr(portal, "api_url", "") or ""

    try:
        # datos.gob.es — connector nativo
        if portal_id == "datos_gob_es":
            from etl.sources.opendata.datos_gob_connector import search_datasets
            return search_datasets(query or "gobierno", limit=limit, timeout=timeout)

        # INE — listado de operaciones
        if portal_id == "ine":
            from etl.sources.opendata.ine_connector import list_ine_series
            return list_ine_series(query or "")

        # Portales CKAN genéricos
        if portal_type == "ckan" and api_url:
            from etl.sources.opendata.ckan_connector import ckan_package_search
            return ckan_package_search(api_url, query, rows=limit, portal_id=portal_id, timeout=timeout)

        # Portales reguladores
        if portal_id in ("bde", "cnmv", "cnmc", "place"):
            from etl.sources.opendata.regulatory_connectors import list_all_regulatory_datasets
            all_reg = list_all_regulatory_datasets()
            return [d for d in all_reg if d.portal_id == portal_id]

        # Eurostat
        if portal_id == "eurostat":
            from etl.sources.opendata.eurostat_connector import search_eurostat_datasets
            return search_eurostat_datasets(query or "spain", limit=limit, timeout=timeout)

    except Exception as exc:
        logger.debug("_harvest_from_portal(%s): %s", portal_id, exc)

    return []


def _persist_plans(plans: list, engine: Any, summary: HarvestSummary) -> None:
    """Persiste planes de ingesta en BD (tabla dataset_ingestion_plans)."""
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            for plan in plans:
                try:
                    conn.execute(text("""
                        INSERT INTO dataset_ingestion_plans
                            (dataset_id, portal_id, target_domain, applicable_modules,
                             applicable_sectors, transform_strategy, priority,
                             review_status, justification, suggested_by)
                        VALUES
                            (:dataset_id, :portal_id, :target_domain, :applicable_modules,
                             :applicable_sectors, :transform_strategy, :priority,
                             :review_status, :justification, :suggested_by)
                        ON CONFLICT (dataset_id) DO UPDATE SET
                            applicable_modules = EXCLUDED.applicable_modules,
                            applicable_sectors = EXCLUDED.applicable_sectors,
                            priority = EXCLUDED.priority,
                            updated_at = NOW()
                    """), {
                        "dataset_id": plan.dataset_id,
                        "portal_id": plan.portal_id,
                        "target_domain": plan.target_domain,
                        "applicable_modules": plan.applicable_modules,
                        "applicable_sectors": plan.applicable_sectors,
                        "transform_strategy": plan.transform_strategy,
                        "priority": plan.priority,
                        "review_status": plan.review_status,
                        "justification": plan.justification,
                        "suggested_by": plan.suggested_by,
                    })
                except Exception as exc:
                    logger.debug("_persist_plans: %s", exc)
    except Exception as exc:
        summary.errors.append(f"persist_plans: {exc}")
