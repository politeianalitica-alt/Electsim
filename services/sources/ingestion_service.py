"""
Safe ingestion wrapper. dry_run=True by default.
Never launches mass scraping automatically.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from api.schemas.sources import IngestionRunRequest, IngestionRunResult

# Map source_id → pipeline function (if one exists)
PIPELINE_MAP: dict[str, str] = {
    "boe": "pipelines.legislative_core",
    "congreso": "pipelines.legislative_core",
    "cis_barometro": "pipelines.electoral_core",
    "interior_resultados": "pipelines.electoral_core",
    "ine": "pipelines.economy_core",
    "bde": "pipelines.economy_core",
    "eurostat": "pipelines.economy_core",
    "media_rss_nacional": "pipelines.media_core",
    "factcheck_feeds": "pipelines.media_core",
    "acled": "pipelines.geopolitics_core",
    "gdelt": "pipelines.geopolitics_core",
    "ine_padron": "pipelines.territorial_core",
}


def run_source_ingestion(
    source_id: str,
    dry_run: bool = True,
    limit: int | None = 100,
    force: bool = False,
) -> IngestionRunResult:
    """
    Attempt to run ingestion for source_id.
    Always dry_run=True unless explicitly set to False.
    Returns skipped if no pipeline registered.
    """
    started = datetime.now(timezone.utc)
    run_id = str(uuid.uuid4())[:8]

    pipeline_module = PIPELINE_MAP.get(source_id)
    if not pipeline_module:
        return IngestionRunResult(
            run_id=run_id,
            source_id=source_id,
            dry_run=dry_run,
            status="skipped",
            started_at=started,
            finished_at=datetime.now(timezone.utc),
            message=f"No hay pipeline ejecutable registrado para '{source_id}' todavía.",
            mode="fallback",
        )

    # Pipeline exists but dry_run — report what would happen
    if dry_run:
        return IngestionRunResult(
            run_id=run_id,
            source_id=source_id,
            dry_run=True,
            status="skipped",
            started_at=started,
            finished_at=datetime.now(timezone.utc),
            message=f"Dry-run: pipeline '{pipeline_module}' disponible. No se ejecutó. "
                    f"Usar force=True y dry_run=False para ejecutar.",
            mode="real",
        )

    # Actual run (not dry_run) — attempt module import and call
    try:
        import importlib
        mod = importlib.import_module(pipeline_module)
        # Most pipeline modules have a main() or run() function
        fn = getattr(mod, "main", None) or getattr(mod, "run", None)
        if fn is None:
            raise AttributeError(f"No main()/run() in {pipeline_module}")
        fn()
        return IngestionRunResult(
            run_id=run_id,
            source_id=source_id,
            dry_run=False,
            status="success",
            started_at=started,
            finished_at=datetime.now(timezone.utc),
            message=f"Pipeline {pipeline_module} ejecutado.",
            mode="real",
        )
    except Exception as exc:
        return IngestionRunResult(
            run_id=run_id,
            source_id=source_id,
            dry_run=False,
            status="error",
            started_at=started,
            finished_at=datetime.now(timezone.utc),
            error=str(exc),
            message="Error al ejecutar pipeline.",
            mode="error",
        )


def run_all_dry() -> dict:
    """
    Check which sources have pipelines and which don't. Never executes anything.
    """
    from services.sources.source_registry import list_source_definitions
    sources = list_source_definitions()
    with_pipeline = [s.id for s in sources if s.id in PIPELINE_MAP]
    without_pipeline = [s.id for s in sources if s.id not in PIPELINE_MAP]
    return {
        "mode": "real",
        "dry_run": True,
        "total": len(sources),
        "with_pipeline": len(with_pipeline),
        "without_pipeline": len(without_pipeline),
        "sources_with_pipeline": with_pipeline,
        "sources_without_pipeline": without_pipeline,
        "message": "Ningún pipeline fue ejecutado. Esto es solo un inventario.",
    }
