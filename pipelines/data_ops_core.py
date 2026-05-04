"""
Pipeline Data Ops Core — Bloque 8.

CLI para operaciones de datos:

  python -m pipelines.data_ops_core --seed-sources
  python -m pipelines.data_ops_core --seed-pipelines
  python -m pipelines.data_ops_core --seed-quality-checks
  python -m pipelines.data_ops_core --health
  python -m pipelines.data_ops_core --quality
  python -m pipelines.data_ops_core --freshness
  python -m pipelines.data_ops_core --purge-cache --source INE_SONDEOS
  python -m pipelines.data_ops_core --alerts
  python -m pipelines.data_ops_core --run-all

Uso completo:
  python -m pipelines.data_ops_core --help
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)


def _get_engine():
    """Obtiene el engine de BD desde las variables de entorno."""
    try:
        import os
        from sqlalchemy import create_engine
        url = os.getenv("DATABASE_URL")
        if not url:
            logger.warning("DATABASE_URL no configurada — modo sin BD")
            return None
        return create_engine(url, pool_pre_ping=True)
    except Exception as exc:
        logger.warning("No se pudo conectar a BD: %s", exc)
        return None


def _setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


# ── Comandos ───────────────────────────────────────────────────────────────────

def cmd_seed_sources(args: argparse.Namespace, engine) -> int:
    """Registra las fuentes de datos por defecto en la BD."""
    from etl.operations.source_registry import seed_default_sources
    sources = seed_default_sources(engine=engine)
    print(json.dumps({
        "action": "seed_sources",
        "registered": len(sources),
        "sources": [s.source_id for s in sources],
    }, ensure_ascii=False, indent=2))
    return 0


def cmd_seed_pipelines(args: argparse.Namespace, engine) -> int:
    """Registra los pipelines por defecto en la BD."""
    from etl.operations.pipeline_registry import seed_default_pipelines
    pipelines = seed_default_pipelines(engine=engine)
    print(json.dumps({
        "action": "seed_pipelines",
        "registered": len(pipelines),
        "pipelines": [p.pipeline_id for p in pipelines],
    }, ensure_ascii=False, indent=2))
    return 0


def cmd_seed_quality_checks(args: argparse.Namespace, engine) -> int:
    """Registra los checks de calidad por defecto en la BD."""
    from etl.operations.quality_checks import seed_default_checks
    checks = seed_default_checks(engine=engine)
    print(json.dumps({
        "action": "seed_quality_checks",
        "registered": len(checks),
        "checks": [c.check_id for c in checks],
    }, ensure_ascii=False, indent=2))
    return 0


def cmd_health(args: argparse.Namespace, engine) -> int:
    """Computa y muestra el estado de salud global del sistema."""
    from etl.operations.health_monitor import compute_global_data_health
    health = compute_global_data_health(engine=engine)
    print(json.dumps(health, ensure_ascii=False, indent=2, default=str))
    return 0 if health.get("overall_status") in ("healthy", "warning", "unknown") else 1


def cmd_quality(args: argparse.Namespace, engine) -> int:
    """Ejecuta todos los checks de calidad y muestra el resumen."""
    from etl.operations.quality_checks import run_all_checks, get_quality_summary
    persist = not args.dry_run

    results = run_all_checks(engine=engine, persist=persist)
    summary = get_quality_summary(results)

    output = {
        "action": "quality_checks",
        "dry_run": args.dry_run,
        "summary": summary,
    }

    if args.verbose:
        output["results"] = [
            {
                "check_id": r.check_id,
                "status": r.status,
                "metric_value": r.metric_value,
                "records_failed": r.records_failed,
            }
            for r in results
        ]

    print(json.dumps(output, ensure_ascii=False, indent=2, default=str))
    return 0 if summary.get("failed", 0) == 0 else 1


def cmd_freshness(args: argparse.Namespace, engine) -> int:
    """Calcula y muestra la frescura de datos por módulo."""
    from etl.operations.freshness import compute_all_freshness
    data = compute_all_freshness(engine=engine)

    stale = [d for d in data if d.get("status") in ("degraded", "down")]
    output = {
        "action": "freshness",
        "total_modules": len(data),
        "stale_modules": len(stale),
        "freshness": data,
    }

    print(json.dumps(output, ensure_ascii=False, indent=2, default=str))
    return 0 if not stale else 1


def cmd_purge_cache(args: argparse.Namespace, engine) -> int:
    """Purga la caché HTTP para una fuente específica."""
    source_id = args.source
    if not source_id:
        print("ERROR: --source es obligatorio para --purge-cache", file=sys.stderr)
        return 1

    from etl.operations.cache_manager import purge_source_cache
    result = purge_source_cache(source_id=source_id, engine=engine)
    print(json.dumps({
        "action": "purge_cache",
        "source_id": source_id,
        **result,
    }, ensure_ascii=False, indent=2))
    return 0


def cmd_alerts(args: argparse.Namespace, engine) -> int:
    """Crea alertas operativas basadas en el estado actual del sistema."""
    from etl.operations.health_monitor import create_data_ops_alerts
    alerts = create_data_ops_alerts(engine=engine)
    print(json.dumps({
        "action": "create_alerts",
        "alerts_created": len(alerts),
        "alerts": alerts,
    }, ensure_ascii=False, indent=2, default=str))
    return 0


def cmd_run_all(args: argparse.Namespace, engine) -> int:
    """Ejecuta el pipeline completo de Data Ops."""
    import datetime

    summary = {
        "date": datetime.date.today().isoformat(),
        "dry_run": args.dry_run,
        "seed_sources": None,
        "seed_pipelines": None,
        "seed_quality_checks": None,
        "health": None,
        "quality": None,
        "freshness": None,
        "alerts": None,
        "errors": [],
    }

    # 1. Seed
    try:
        from etl.operations.source_registry import seed_default_sources
        srcs = seed_default_sources(engine=engine)
        summary["seed_sources"] = len(srcs)
    except Exception as exc:
        summary["errors"].append(f"seed_sources: {exc}")

    try:
        from etl.operations.pipeline_registry import seed_default_pipelines
        pipes = seed_default_pipelines(engine=engine)
        summary["seed_pipelines"] = len(pipes)
    except Exception as exc:
        summary["errors"].append(f"seed_pipelines: {exc}")

    try:
        from etl.operations.quality_checks import seed_default_checks
        checks = seed_default_checks(engine=engine)
        summary["seed_quality_checks"] = len(checks)
    except Exception as exc:
        summary["errors"].append(f"seed_quality_checks: {exc}")

    # 2. Health
    try:
        from etl.operations.health_monitor import compute_global_data_health
        health = compute_global_data_health(engine=engine)
        summary["health"] = health.get("overall_status")
    except Exception as exc:
        summary["errors"].append(f"health: {exc}")

    # 3. Quality
    try:
        from etl.operations.quality_checks import run_all_checks, get_quality_summary
        results = run_all_checks(engine=engine, persist=not args.dry_run)
        q_summary = get_quality_summary(results)
        summary["quality"] = q_summary
    except Exception as exc:
        summary["errors"].append(f"quality: {exc}")

    # 4. Freshness
    try:
        from etl.operations.freshness import compute_all_freshness
        freshness_data = compute_all_freshness(engine=engine)
        stale_count = sum(
            1 for d in freshness_data
            if d.get("status") in ("degraded", "down")
        )
        summary["freshness"] = {
            "total": len(freshness_data),
            "stale": stale_count,
        }
    except Exception as exc:
        summary["errors"].append(f"freshness: {exc}")

    # 5. Alerts
    try:
        from etl.operations.health_monitor import create_data_ops_alerts
        alerts = create_data_ops_alerts(engine=engine)
        summary["alerts"] = len(alerts)
    except Exception as exc:
        summary["errors"].append(f"alerts: {exc}")

    print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))
    return 0 if not summary["errors"] else 1


# ── Parser ─────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m pipelines.data_ops_core",
        description="Pipeline de operaciones de datos — Bloque 8",
    )

    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument(
        "--seed-sources",
        action="store_true",
        help="Registra las fuentes de datos por defecto en la BD",
    )
    actions.add_argument(
        "--seed-pipelines",
        action="store_true",
        help="Registra los pipelines por defecto en la BD",
    )
    actions.add_argument(
        "--seed-quality-checks",
        action="store_true",
        help="Registra los checks de calidad por defecto en la BD",
    )
    actions.add_argument(
        "--health",
        action="store_true",
        help="Computa el estado de salud global del sistema",
    )
    actions.add_argument(
        "--quality",
        action="store_true",
        help="Ejecuta todos los checks de calidad de datos",
    )
    actions.add_argument(
        "--freshness",
        action="store_true",
        help="Calcula la frescura de datos por módulo",
    )
    actions.add_argument(
        "--purge-cache",
        action="store_true",
        help="Purga la caché HTTP para --source SOURCE_ID",
    )
    actions.add_argument(
        "--alerts",
        action="store_true",
        help="Crea alertas operativas basadas en el estado del sistema",
    )
    actions.add_argument(
        "--run-all",
        action="store_true",
        help="Ejecuta el pipeline completo: seed + health + quality + freshness + alerts",
    )

    parser.add_argument(
        "--source",
        default=None,
        metavar="SOURCE_ID",
        help="ID de fuente para --purge-cache",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="No persistir resultados en BD",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Logging detallado",
    )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    _setup_logging(args.verbose)
    engine = _get_engine()

    if args.seed_sources:
        return cmd_seed_sources(args, engine)
    elif args.seed_pipelines:
        return cmd_seed_pipelines(args, engine)
    elif args.seed_quality_checks:
        return cmd_seed_quality_checks(args, engine)
    elif args.health:
        return cmd_health(args, engine)
    elif args.quality:
        return cmd_quality(args, engine)
    elif args.freshness:
        return cmd_freshness(args, engine)
    elif args.purge_cache:
        return cmd_purge_cache(args, engine)
    elif args.alerts:
        return cmd_alerts(args, engine)
    elif args.run_all:
        return cmd_run_all(args, engine)

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
