"""
Pipeline Territorial Core — Bloque 7.

CLI para el pipeline de inteligencia territorial:

  python -m pipelines.territorial_core --sync-ine
  python -m pipelines.territorial_core --load-geojson --type province
  python -m pipelines.territorial_core --signals
  python -m pipelines.territorial_core --profiles
  python -m pipelines.territorial_core --run-all

Uso completo:
  python -m pipelines.territorial_core --help
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


def cmd_sync_ine(args: argparse.Namespace, engine) -> int:
    """Sincroniza territorios desde INE."""
    from etl.sources.geospatial.geo_monitor import GeoMonitor

    monitor = GeoMonitor(engine=engine, dry_run=args.dry_run)
    counts = monitor.sync_ine()
    print(json.dumps({"ine_sync": counts}, ensure_ascii=False, indent=2))
    return 0


def cmd_load_geojson(args: argparse.Namespace, engine) -> int:
    """Carga GeoJSON de territorios."""
    from etl.sources.geospatial.geo_monitor import GeoMonitor

    monitor = GeoMonitor(engine=engine, dry_run=args.dry_run)
    territory_types = args.type.split(",") if args.type else None
    counts = monitor.load_geometries(
        territory_types=territory_types,
        resolution=args.resolution,
    )
    print(json.dumps({"geometries": counts}, ensure_ascii=False, indent=2))
    return 0


def cmd_load_census_sections(args: argparse.Namespace, engine) -> int:
    """Carga secciones censales (operación pesada)."""
    from etl.sources.geospatial.census_sections_loader import (
        load_census_sections,
        estimate_census_sections_size,
    )

    path = args.geojson_path or None

    # Estimar tamaño primero
    size_info = estimate_census_sections_size(path)
    print(json.dumps({"size_estimate": size_info}, ensure_ascii=False, indent=2))

    if size_info.get("warning") and not args.force:
        print("⚠️  Fichero >50MB. Usar --force para cargar igualmente, o --province-filter XX")
        return 1

    geometries = load_census_sections(
        path=path,
        province_filter=getattr(args, "province_filter", None),
        resolution=args.resolution,
        warn_size=False,
    )
    print(json.dumps({"census_sections_loaded": len(geometries)}, ensure_ascii=False, indent=2))
    return 0


def cmd_signals(args: argparse.Namespace, engine) -> int:
    """Detecta y persiste señales territoriales."""
    from etl.sources.geospatial.geo_monitor import GeoMonitor

    monitor = GeoMonitor(engine=engine, dry_run=args.dry_run)
    signals = monitor.detect_signals(persist=not args.dry_run)
    alerts = monitor.generate_alerts(signals=signals)

    summary = {
        "signals_total": len(signals),
        "signals_high": sum(1 for s in signals if s.severity in ("HIGH", "CRITICAL")),
        "alerts_generated": len(alerts),
    }

    if args.verbose:
        summary["signals"] = [
            {
                "territory_id": s.territory_id,
                "signal_type": s.signal_type,
                "value": s.value,
                "severity": s.severity,
                "explanation": s.explanation[:80],
            }
            for s in signals
        ]

    print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))
    return 0


def cmd_profiles(args: argparse.Namespace, engine) -> int:
    """Construye perfiles de territorios."""
    from etl.sources.geospatial.geo_monitor import GeoMonitor

    monitor = GeoMonitor(engine=engine, dry_run=args.dry_run)
    profiles = monitor.build_profiles(persist=not args.dry_run)

    summary = {
        "profiles_built": len(profiles),
        "dry_run": args.dry_run,
    }

    if args.verbose and profiles:
        # Top 5 por prioridad
        ranked = sorted(
            [
                {
                    "territory_id": p.territory_id,
                    "name": p.name,
                    "campaign_priority": p.campaign_priority,
                    "economic_risk": p.economic_risk,
                }
                for p in profiles.values()
                if hasattr(p, "campaign_priority") and p.campaign_priority is not None
            ],
            key=lambda x: x["campaign_priority"] or 0,
            reverse=True,
        )[:5]
        summary["top5_priority"] = ranked

    print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))
    return 0


def cmd_run_all(args: argparse.Namespace, engine) -> int:
    """Ejecuta el pipeline completo."""
    from etl.sources.geospatial.geo_monitor import GeoMonitor

    monitor = GeoMonitor(engine=engine, dry_run=args.dry_run, geography="ES")

    territory_types = args.type.split(",") if args.type else None

    summary = monitor.run_all(
        territory_types=territory_types,
        resolution=args.resolution,
        build_all_profiles=not args.skip_profiles,
    )

    print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))
    return 0 if not summary.get("errors") else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m pipelines.territorial_core",
        description="Pipeline de inteligencia territorial — Bloque 7",
    )

    # Acciones
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument(
        "--sync-ine",
        action="store_true",
        help="Sincroniza territorios desde INE (ccaa, provincias, municipios)",
    )
    actions.add_argument(
        "--load-geojson",
        action="store_true",
        help="Carga GeoJSON de territorios y persiste en BD",
    )
    actions.add_argument(
        "--load-census-sections",
        action="store_true",
        help="Carga secciones censales (operación pesada, >50MB)",
    )
    actions.add_argument(
        "--signals",
        action="store_true",
        help="Detecta y persiste señales territoriales",
    )
    actions.add_argument(
        "--profiles",
        action="store_true",
        help="Construye perfiles de todos los territorios",
    )
    actions.add_argument(
        "--run-all",
        action="store_true",
        help="Ejecuta el pipeline completo: sync-ine + load-geojson + signals + profiles",
    )

    # Opciones
    parser.add_argument(
        "--type",
        default=None,
        help="Tipo(s) de territorio separados por coma: province,ccaa,municipality. Default: province,ccaa",
    )
    parser.add_argument(
        "--resolution",
        choices=["full", "medium", "low"],
        default="low",
        help="Resolución de geometrías (default: low)",
    )
    parser.add_argument(
        "--source",
        choices=["all", "ine", "geojson"],
        default="all",
        help="Fuente de datos (default: all)",
    )
    parser.add_argument(
        "--province-filter",
        default=None,
        metavar="CODE",
        help="Código de provincia para filtrar secciones censales (ej. 28)",
    )
    parser.add_argument(
        "--geojson-path",
        default=None,
        metavar="PATH",
        help="Ruta al fichero GeoJSON (para load-census-sections)",
    )
    parser.add_argument(
        "--skip-profiles",
        action="store_true",
        help="Omitir construcción de perfiles en --run-all",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Forzar carga aunque supere límites de tamaño",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Ejecutar sin persistir datos en BD",
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

    if args.sync_ine:
        return cmd_sync_ine(args, engine)
    elif args.load_geojson:
        return cmd_load_geojson(args, engine)
    elif args.load_census_sections:
        return cmd_load_census_sections(args, engine)
    elif args.signals:
        return cmd_signals(args, engine)
    elif args.profiles:
        return cmd_profiles(args, engine)
    elif args.run_all:
        return cmd_run_all(args, engine)

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
