"""
OpenData Core Pipeline — Bloque 10.

CLI para operaciones sobre el catálogo de datos abiertos.

Acciones:
  --seed-portals         Siembra los portales por defecto en BD
  --sync-catalog         Sincroniza catalog_sources → open_data_portals
  --harvest PORTAL_ID    Cosecha datasets de un portal (o todos si 'all')
  --profile-resource RESOURCE_ID   Perfila un recurso
  --recommend-plans      Genera planes de ingesta candidatos
  --status               Muestra estado de los portales

Flags:
  --query Q              Término de búsqueda para harvest
  --limit N              Máximo de resultados (default: 50)
  --profile-resources    Perfilar primer recurso de cada dataset
  --dry-run              Sin persistir en BD
  --verbose              Logging detallado
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from typing import Any

logger = logging.getLogger(__name__)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="opendata_core",
        description="Pipeline de datos abiertos — Bloque 10",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    action_group = parser.add_mutually_exclusive_group(required=True)
    action_group.add_argument(
        "--seed-portals",
        action="store_true",
        help="Siembra portales por defecto en BD.",
    )
    action_group.add_argument(
        "--sync-catalog",
        action="store_true",
        help="Sincroniza catalog_sources → open_data_portals.",
    )
    action_group.add_argument(
        "--harvest",
        metavar="PORTAL_ID",
        help="Cosecha datasets de un portal ('all' para todos).",
    )
    action_group.add_argument(
        "--profile-resource",
        metavar="RESOURCE_URL",
        help="Perfila un recurso por URL.",
    )
    action_group.add_argument(
        "--recommend-plans",
        action="store_true",
        help="Genera planes de ingesta candidatos para datasets recientes.",
    )
    action_group.add_argument(
        "--status",
        action="store_true",
        help="Muestra estado de los portales registrados.",
    )
    action_group.add_argument(
        "--list-portals",
        action="store_true",
        help="Lista portales registrados.",
    )

    parser.add_argument("--query", default="", help="Término de búsqueda.")
    parser.add_argument("--limit", type=int, default=50, help="Máximo de resultados.")
    parser.add_argument("--profile-resources", action="store_true", help="Perfilar recursos durante harvest.")
    parser.add_argument("--dry-run", action="store_true", help="Sin persistir en BD.")
    parser.add_argument("--verbose", action="store_true", help="Logging detallado.")
    parser.add_argument("--output", default=None, help="Archivo de salida JSON (opcional).")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    # Logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s %(name)s: %(message)s")

    engine = _get_engine()

    result: Any = None

    # ── Seed portales ─────────────────────────────────────────────────────────
    if args.seed_portals:
        if args.dry_run:
            print("[DRY RUN] Seed portales omitido.")
            return 0
        if not engine:
            print("ERROR: --seed-portals requiere conexión a BD (DATABASE_URL).")
            return 1
        from etl.sources.opendata.portal_registry import seed_default_portals
        count = seed_default_portals(engine)
        print(f"Portales sembrados: {count}")
        result = {"portals_seeded": count}

    # ── Sync catalog ──────────────────────────────────────────────────────────
    elif args.sync_catalog:
        if args.dry_run:
            print("[DRY RUN] Sync catalog omitido.")
            return 0
        if not engine:
            print("WARN: Sin BD — sync omitido.")
            return 0
        from etl.sources.opendata.catalog_bridge import sync_catalog_sources_to_portals
        count = sync_catalog_sources_to_portals(engine)
        print(f"Catalog sources sincronizados: {count}")
        result = {"portals_synced": count}

    # ── Harvest ───────────────────────────────────────────────────────────────
    elif args.harvest:
        portal_ids = None if args.harvest.lower() == "all" else [args.harvest]
        from etl.sources.opendata.opendata_monitor import run_full_harvest
        summary = run_full_harvest(
            portal_ids=portal_ids,
            query=args.query,
            limit=args.limit,
            profile_resources=args.profile_resources,
            engine=engine,
            dry_run=args.dry_run,
        )
        print(json.dumps(summary.as_dict(), indent=2, ensure_ascii=False))
        result = summary.as_dict()

    # ── Profile resource ──────────────────────────────────────────────────────
    elif args.profile_resource:
        from etl.sources.opendata.dataset_profiler import profile_csv_resource, profile_json_resource
        from etl.sources.opendata.resource_downloader import detect_resource_format

        url = args.profile_resource
        fmt = detect_resource_format(url)
        print(f"Formato detectado: {fmt}")

        profile = None
        if fmt in ("CSV", "TSV"):
            profile = profile_csv_resource(url)
        elif fmt in ("JSON", "GEOJSON"):
            profile = profile_json_resource(url)
        else:
            print(f"Formato {fmt} no soportado para perfilado.")
            return 1

        if profile:
            data = {
                "row_count": profile.row_count,
                "column_count": profile.column_count,
                "null_ratio": profile.null_ratio,
                "detected_geographies": profile.detected_geographies,
                "detected_dates": profile.detected_dates,
                "detected_topics": profile.detected_topics,
                "detected_sectors": profile.detected_sectors,
                "geographic_columns": profile.geographic_columns,
                "date_columns": profile.date_columns,
                "sample_rows": profile.sample_rows[:1],
            }
            print(json.dumps(data, indent=2, ensure_ascii=False))
            result = data
        else:
            print("No se pudo perfilar el recurso.")
            return 1

    # ── Recommend plans ───────────────────────────────────────────────────────
    elif args.recommend_plans:
        from etl.sources.opendata.datos_gob_connector import search_datasets
        from etl.sources.opendata.dataset_mapper import recommend_ingestion_plan
        from etl.sources.opendata.license_classifier import classify_license

        datasets = search_datasets(args.query or "gobierno", limit=args.limit)
        plans = []
        for ds in datasets:
            plan = recommend_ingestion_plan(ds)
            assessment = classify_license(ds)
            plans.append({
                "dataset_id": ds.dataset_id,
                "title": ds.title,
                "target_domain": plan.target_domain,
                "modules": plan.applicable_modules[:3],
                "priority": plan.priority,
                "review_status": plan.review_status,
                "license_risk": assessment.risk_level,
            })

        print(json.dumps(plans, indent=2, ensure_ascii=False))
        result = plans

    # ── Status ────────────────────────────────────────────────────────────────
    elif args.status:
        from etl.sources.opendata.portal_registry import list_portals
        portals = list_portals(active_only=True)
        by_level: dict[str, list] = {}
        for p in portals:
            lvl = p.administration_level
            by_level.setdefault(lvl, []).append(p.name)
        for lvl, names in sorted(by_level.items()):
            print(f"{lvl} ({len(names)}): {', '.join(names[:5])}")
        print(f"\nTotal portales activos: {len(portals)}")
        result = {"total": len(portals), "by_level": {k: len(v) for k, v in by_level.items()}}

    # ── List portals ──────────────────────────────────────────────────────────
    elif args.list_portals:
        from etl.sources.opendata.portal_registry import list_portals
        portals = list_portals(active_only=False)
        for p in portals:
            status = "ACTIVO" if p.active else "INACTIVO"
            print(f"[{status}] {p.portal_id:30s} {p.name:40s} ({p.administration_level})")
        result = [p.portal_id for p in portals]

    # ── Guardar output ────────────────────────────────────────────────────────
    if args.output and result is not None:
        import json as _json
        with open(args.output, "w", encoding="utf-8") as f:
            _json.dump(result, f, indent=2, ensure_ascii=False, default=str)
        print(f"Resultado guardado en: {args.output}")

    return 0


def _get_engine() -> Any:
    """Obtiene el engine de SQLAlchemy desde DATABASE_URL."""
    import os
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return None
    try:
        from sqlalchemy import create_engine
        return create_engine(db_url, pool_pre_ping=True)
    except Exception as exc:
        logger.debug("_get_engine: %s", exc)
        return None


if __name__ == "__main__":
    sys.exit(main())
