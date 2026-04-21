"""Pipeline de ingesta diaria para el dashboard electoral.

Ejemplos:
  python -m pipelines.electoral_dashboard_ingestion --mode daily
  python -m pipelines.electoral_dashboard_ingestion --mode full
  python -m pipelines.electoral_dashboard_ingestion --mode backfill --from-date 2023-01-01 --to-date 2023-12-31
  python -m pipelines.electoral_dashboard_ingestion --deploy
"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import date
from typing import Any

from prefect import flow, task

from db.session import engine
from etl.electoral.config import load_config
from etl.electoral.runtime import ElectoralIngestionRuntime
from etl.electoral.sources import refresh_nowcasting, source_registry

logger = logging.getLogger(__name__)


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


@task(name="run_electoral_source")
def run_source_task(
    source_id: str,
    *,
    run_id: str,
    mode: str,
    since: date | None,
    until: date | None,
) -> dict[str, Any]:
    config = load_config()
    runtime = ElectoralIngestionRuntime(engine, config)
    spec = source_registry()[source_id]
    outcome = spec.runner(
        engine,
        runtime,
        config,
        run_id=run_id,
        mode=mode,
        since=since,
        until=until,
    )
    runtime.persist_source_result(
        run_id,
        source_id=spec.source_id,
        source_type=spec.source_type,
        extraction_mode=spec.refresh_strategy,
        precedence_rank=spec.precedence_rank,
        supports_incremental=spec.supports_incremental,
        outcome=outcome,
    )
    if outcome.status == "success" and outcome.watermark_after:
        runtime.update_watermark(
            spec.source_id,
            outcome.watermark_after,
            full_refresh=mode in {"full", "backfill"} and not spec.supports_incremental,
        )
    return {
        "source_id": source_id,
        "status": outcome.status,
        "records_read": outcome.records_read,
        "records_inserted": outcome.records_inserted,
        "records_updated": outcome.records_updated,
        "warnings": outcome.warnings,
        "errors": outcome.errors,
    }


@flow(name="ElectSim: Dashboard Electoral Ingestion", log_prints=True)
def electoral_dashboard_ingestion_flow(
    mode: str = "daily",
    sources: list[str] | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    triggered_by: str | None = None,
) -> dict[str, Any]:
    config = load_config()
    runtime = ElectoralIngestionRuntime(engine, config)
    since = _parse_date(from_date)
    until = _parse_date(to_date)
    selected = sources or list(config.enabled_sources)
    registry = source_registry()
    unknown = [source_id for source_id in selected if source_id not in registry]
    if unknown:
        raise ValueError(f"Fuentes no registradas: {unknown}")

    run_id = runtime.start_run(
        mode=mode,
        triggered_by=triggered_by or config.triggered_by,
        requested_from=since,
        requested_to=until,
    )

    results: list[dict[str, Any]] = []
    try:
        for source_id in selected:
            results.append(
                run_source_task(
                    source_id,
                    run_id=run_id,
                    mode=mode,
                    since=since,
                    until=until,
                )
            )
        nowcasting = {"ok": False, "skipped": True}
        if not config.skip_nowcasting:
            nowcasting = refresh_nowcasting(engine)
        runtime.finish_run(run_id, status="success")
        return {"run_id": run_id, "sources": results, "nowcasting": nowcasting}
    except Exception as exc:
        runtime.finish_run(run_id, status="failed", error_summary=str(exc))
        raise


def _deploy() -> None:
    try:
        from prefect.deployments import Deployment
        from prefect.server.schemas.schedules import CronSchedule
    except ImportError as exc:
        logger.error("No se pudieron registrar deployments Prefect: %s", exc)
        return

    config = load_config()
    Deployment.build_from_flow(
        flow=electoral_dashboard_ingestion_flow,
        name="dashboard-electoral-daily",
        parameters={"mode": "daily", "triggered_by": "prefect_schedule"},
        schedule=CronSchedule(cron=config.daily_cron, timezone=config.timezone),
        work_pool_name="electsim-pool",
        tags=["electsim", "electoral", "ingestion"],
    ).apply()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingesta diaria del dashboard electoral")
    parser.add_argument("--mode", choices=["daily", "full", "backfill"], default="daily")
    parser.add_argument("--sources", help="Lista CSV de fuentes a ejecutar")
    parser.add_argument("--from-date", dest="from_date", help="Fecha ISO inicial")
    parser.add_argument("--to-date", dest="to_date", help="Fecha ISO final")
    parser.add_argument("--triggered-by", dest="triggered_by", help="Identificador del lanzador")
    parser.add_argument("--deploy", action="store_true", help="Registrar deployment diario en Prefect")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    if args.deploy:
        _deploy()
        return

    result = electoral_dashboard_ingestion_flow(
        mode=args.mode,
        sources=[item.strip() for item in args.sources.split(",") if item.strip()] if args.sources else None,
        from_date=args.from_date,
        to_date=args.to_date,
        triggered_by=args.triggered_by,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
