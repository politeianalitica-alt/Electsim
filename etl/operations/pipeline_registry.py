"""
Pipeline Registry — Bloque 8.

Registro centralizado de pipelines ETL de ElectSim.

Pipelines registrados:
  legislative_core, media_core, brain_core, osint_core,
  economy_core, electoral_core, territorial_core,
  data_ops_core, realtime_scheduler
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from etl.operations.schemas import PipelineDefinition

# ── Pipelines por defecto ──────────────────────────────────────────────────────

_DEFAULT_PIPELINES: list[PipelineDefinition] = [
    PipelineDefinition(
        pipeline_id="legislative_core",
        name="Pipeline Legislativo",
        domain="legislative",
        entrypoint="pipelines.legislative_core",
        schedule="0 6 * * *",   # 6:00 AM diario
        sources=["boe", "congreso", "senado", "eurlex", "moncloa"],
        output_tables=["legal_items", "legal_document_chunks", "agenda_gobierno"],
        retry_policy={"max_retries": 3, "backoff_seconds": 300},
    ),
    PipelineDefinition(
        pipeline_id="media_core",
        name="Pipeline de Medios",
        domain="media",
        entrypoint="pipelines.media_core",
        schedule="*/30 * * * *",  # cada 30 min
        sources=["rss_media", "fundus"],
        output_tables=["media_items", "narrative_clusters"],
        retry_policy={"max_retries": 5, "backoff_seconds": 60},
    ),
    PipelineDefinition(
        pipeline_id="brain_core",
        name="Pipeline Brain / RAG",
        domain="system",
        entrypoint="pipelines.brain_core",
        schedule="0 2 * * *",   # 2:00 AM diario
        sources=["brain_rag"],
        output_tables=["rag_documents", "rag_chunks"],
        retry_policy={"max_retries": 2, "backoff_seconds": 600},
    ),
    PipelineDefinition(
        pipeline_id="osint_core",
        name="Pipeline OSINT / Riesgo",
        domain="osint",
        entrypoint="pipelines.osint_core",
        schedule="0 4 * * *",
        sources=["opensanctions"],
        output_tables=["actores", "risk_events"],
        retry_policy={"max_retries": 2, "backoff_seconds": 600},
    ),
    PipelineDefinition(
        pipeline_id="economy_core",
        name="Pipeline Economía",
        domain="economy",
        entrypoint="pipelines.economy_core",
        schedule="0 8 * * *",
        sources=["ine", "bde", "eurostat"],
        output_tables=["macro_indicators", "economy_snapshots"],
        retry_policy={"max_retries": 3, "backoff_seconds": 300},
    ),
    PipelineDefinition(
        pipeline_id="electoral_core",
        name="Pipeline Electoral",
        domain="electoral",
        entrypoint="pipelines.electoral_core",
        schedule="0 9 * * *",
        sources=["polls_manual", "infoelectoral", "cis"],
        output_tables=["polls", "nowcast_snapshots", "coalition_scenarios"],
        retry_policy={"max_retries": 3, "backoff_seconds": 180},
    ),
    PipelineDefinition(
        pipeline_id="territorial_core",
        name="Pipeline Territorial",
        domain="geospatial",
        entrypoint="pipelines.territorial_core",
        schedule="0 3 * * *",
        sources=["geojson_provincias", "ine"],
        output_tables=["territory_geometries", "territorial_signals", "territory_profiles_cache"],
        retry_policy={"max_retries": 2, "backoff_seconds": 300},
    ),
    PipelineDefinition(
        pipeline_id="data_ops_core",
        name="Pipeline Data Operations",
        domain="system",
        entrypoint="pipelines.data_ops_core",
        schedule="0 */2 * * *",  # cada 2h
        sources=["brain_rag"],
        output_tables=["source_health", "data_quality_results"],
        retry_policy={"max_retries": 1, "backoff_seconds": 60},
    ),
    PipelineDefinition(
        pipeline_id="realtime_scheduler",
        name="Scheduler Tiempo Real (Prefect)",
        domain="system",
        entrypoint="pipelines.realtime_scheduler",
        schedule=None,   # Prefect gestiona el schedule
        sources=["rss_media", "boe", "ine"],
        output_tables=["media_items", "macro_indicators", "alertas_sistema"],
        retry_policy={"max_retries": 3, "backoff_seconds": 60},
    ),
]

# Caché en memoria
_PIPELINE_CACHE: dict[str, PipelineDefinition] = {
    p.pipeline_id: p for p in _DEFAULT_PIPELINES
}


# ── Funciones ──────────────────────────────────────────────────────────────────

def register_pipeline(pipeline: PipelineDefinition, engine: Any = None) -> None:
    """Registra un pipeline ETL."""
    _PIPELINE_CACHE[pipeline.pipeline_id] = pipeline

    if engine is None:
        return

    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO pipeline_registry (
                    pipeline_id, name, domain, entrypoint, schedule,
                    sources, output_tables, owner, active,
                    retry_policy, metadata, updated_at
                ) VALUES (
                    :pipeline_id, :name, :domain, :entrypoint, :schedule,
                    :sources, :output_tables, :owner, :active,
                    :retry_policy::jsonb, :metadata::jsonb, NOW()
                )
                ON CONFLICT (pipeline_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    domain = EXCLUDED.domain,
                    entrypoint = EXCLUDED.entrypoint,
                    schedule = EXCLUDED.schedule,
                    sources = EXCLUDED.sources,
                    output_tables = EXCLUDED.output_tables,
                    active = EXCLUDED.active,
                    retry_policy = EXCLUDED.retry_policy,
                    updated_at = NOW()
            """), {
                "pipeline_id": pipeline.pipeline_id,
                "name": pipeline.name,
                "domain": pipeline.domain,
                "entrypoint": pipeline.entrypoint,
                "schedule": pipeline.schedule,
                "sources": pipeline.sources,
                "output_tables": pipeline.output_tables,
                "owner": pipeline.owner,
                "active": pipeline.active,
                "retry_policy": json.dumps(pipeline.retry_policy),
                "metadata": json.dumps(pipeline.metadata),
            })
    except Exception as exc:
        logger.debug("register_pipeline DB: %s", exc)


def list_pipelines(
    domain: str | None = None,
    active_only: bool = True,
    engine: Any = None,
) -> list[PipelineDefinition]:
    """Lista pipelines registrados."""
    if engine is not None:
        try:
            import json
            import pandas as pd
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                df = pd.read_sql(sa_text("""
                    SELECT * FROM pipeline_registry
                    WHERE (:domain IS NULL OR domain = :domain)
                      AND (:active_only = FALSE OR active = TRUE)
                    ORDER BY domain, pipeline_id
                """), conn, params={"domain": domain, "active_only": active_only})
            if not df.empty:
                pipelines = []
                for _, row in df.iterrows():
                    try:
                        pipelines.append(PipelineDefinition(
                            pipeline_id=row["pipeline_id"],
                            name=row["name"],
                            domain=row["domain"],
                            entrypoint=row["entrypoint"],
                            schedule=row.get("schedule"),
                            sources=list(row.get("sources") or []),
                            output_tables=list(row.get("output_tables") or []),
                            owner=row.get("owner"),
                            active=bool(row.get("active", True)),
                        ))
                    except Exception:
                        continue
                return pipelines
        except Exception as exc:
            logger.debug("list_pipelines DB: %s", exc)

    # Fallback: caché en memoria
    pipelines = list(_PIPELINE_CACHE.values())
    if domain:
        pipelines = [p for p in pipelines if p.domain == domain]
    if active_only:
        pipelines = [p for p in pipelines if p.active]
    return sorted(pipelines, key=lambda p: (p.domain, p.pipeline_id))


def get_pipeline(pipeline_id: str, engine: Any = None) -> PipelineDefinition | None:
    """Obtiene un pipeline por su ID."""
    for p in list_pipelines(active_only=False, engine=engine):
        if p.pipeline_id == pipeline_id:
            return p
    return _PIPELINE_CACHE.get(pipeline_id)


def seed_default_pipelines(engine: Any = None) -> int:
    """Registra los pipelines por defecto de ElectSim."""
    n = 0
    for pipeline in _DEFAULT_PIPELINES:
        try:
            register_pipeline(pipeline, engine=engine)
            n += 1
        except Exception as exc:
            logger.debug("seed_default_pipelines %s: %s", pipeline.pipeline_id, exc)
    logger.info("seed_default_pipelines: %d pipelines registrados", n)
    return n
