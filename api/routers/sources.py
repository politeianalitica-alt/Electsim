"""
Sources & Ingestion API router (Sprint 2).
Prefix: /api/sources
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Query
from api.schemas.sources import IngestionRunRequest

router = APIRouter(tags=["sources"])


@router.get("/api/sources/catalog")
async def sources_catalog(domain: str | None = None, include_disabled: bool = False):
    try:
        from services.sources.source_registry import list_source_definitions
        sources = list_source_definitions(domain=domain, enabled_only=not include_disabled)
        return {
            "mode": "real",
            "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
            "sources": [s.model_dump() for s in sources],
            "total": len(sources),
        }
    except Exception as exc:
        return {"mode": "error", "error": str(exc), "sources": []}


@router.get("/api/sources/health")
async def sources_health(
    domain: str | None = None,
    status: str | None = None,
    include_disabled: bool = False,
):
    try:
        from services.sources.source_registry import get_sources_with_health
        items = get_sources_with_health()
        if domain:
            items = [i for i in items if i.definition.domain == domain]
        if status:
            items = [i for i in items if i.health.status == status]
        if not include_disabled:
            items = [i for i in items if i.definition.enabled]
        from collections import Counter
        status_counts = Counter(i.health.status for i in items)
        return {
            "mode": "real" if items else "fallback",
            "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
            "items": [i.model_dump() for i in items],
            "summary": {
                "total": len(items),
                "active": status_counts.get("active", 0),
                "degraded": status_counts.get("degraded", 0),
                "down": status_counts.get("down", 0),
                "unknown": status_counts.get("unknown", 0),
                "disabled": status_counts.get("disabled", 0),
            },
        }
    except Exception as exc:
        return {"mode": "error", "error": str(exc), "items": [], "summary": {}}


@router.get("/api/sources/coverage")
async def sources_coverage():
    try:
        from services.sources.source_registry import get_source_coverage_summary
        domains = get_source_coverage_summary()
        return {
            "mode": "real",
            "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
            "domains": domains,
        }
    except Exception as exc:
        return {"mode": "error", "error": str(exc), "domains": []}


@router.get("/api/sources/runs")
async def sources_runs(limit: int = Query(default=50, le=200)):
    try:
        from services.sources.source_registry import list_recent_ingestion_runs
        runs = list_recent_ingestion_runs(limit=limit)
        return {
            "mode": "real" if runs else "fallback",
            "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
            "items": [r.model_dump() for r in runs],
            "total": len(runs),
        }
    except Exception as exc:
        return {"mode": "error", "error": str(exc), "items": []}


@router.post("/api/sources/run")
async def sources_run(body: IngestionRunRequest):
    from services.sources.ingestion_service import run_source_ingestion
    result = run_source_ingestion(
        source_id=body.source_id,
        dry_run=body.dry_run,
        limit=body.limit,
        force=body.force,
    )
    return result.model_dump()


@router.post("/api/sources/run-all-dry")
async def sources_run_all_dry():
    from services.sources.ingestion_service import run_all_dry
    return run_all_dry()


@router.post("/api/sources/health-sync")
async def sources_health_sync():
    """
    Pings all registered RSS sources and writes results to media_source_health.
    Returns sync summary.
    """
    try:
        from services.sources.health_writer import sync_all_sources  # type: ignore
        summary = sync_all_sources()
        return {"ok": True, "summary": summary, "mode": "real"}
    except Exception as exc:
        return {"ok": False, "error": str(exc), "mode": "error"}
