"""
Pipeline CLI — Core Medios & Narrativa.

Uso:
    python -m pipelines.media_core --source rss --hours 6
    python -m pipelines.media_core --source rss --region local_spain --cluster
    python -m pipelines.media_core --dry-run
"""
from __future__ import annotations

import argparse
import logging
import sys
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger("pipelines.media_core")


# ── Helpers de BD ─────────────────────────────────────────────────────────────

def _get_engine() -> Any:
    try:
        from db.database import get_engine
        return get_engine()
    except Exception:
        try:
            from database import get_engine  # type: ignore
            return get_engine()
        except Exception:
            logger.warning("No se pudo obtener engine de BD — operando sin persistencia")
            return None


# ── Pipeline RSS ──────────────────────────────────────────────────────────────

def run_rss_pipeline(
    engine: Any,
    max_per_source: int = 20,
    region_filter: str | None = None,
    language_filter: str | None = None,
    run_clustering: bool = True,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Ejecuta el pipeline completo de RSS media."""
    from etl.sources.media.media_monitor import MediaMonitor
    monitor = MediaMonitor(engine=engine, dry_run=dry_run)
    stats = monitor.run(
        max_per_source=max_per_source,
        region_filter=region_filter,
        language_filter=language_filter,
        run_clustering=run_clustering,
    )
    logger.info("RSS pipeline: %s", stats)
    return stats


# ── Actualizar clusters ───────────────────────────────────────────────────────

def run_cluster_update(engine: Any, hours: int = 24) -> dict[str, Any]:
    """
    Actualiza NarrativeCluster con estadísticas de volumen/crecimiento
    de las últimas `hours` horas.
    """
    stats: dict[str, Any] = {"n_clusters_updated": 0}
    if engine is None:
        return stats
    try:
        from dashboard.services.media_core import cargar_narrativas_activas
        df = cargar_narrativas_activas(hours=hours)
        if df.empty:
            logger.info("run_cluster_update: no hay narrativas activas")
            return stats

        from sqlalchemy import text as sa_text
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)

        with engine.begin() as conn:
            for _, row in df.iterrows():
                conn.execute(sa_text("""
                    INSERT INTO narrative_clusters (id, label, frame, tension, volume_24h, sentiment_avg, updated_at)
                    VALUES (:id, :label, :frame, :tension, :volume, :sentiment, :now)
                    ON CONFLICT (id) DO UPDATE
                        SET volume_24h = EXCLUDED.volume_24h,
                            sentiment_avg = EXCLUDED.sentiment_avg,
                            last_seen = :now,
                            updated_at = :now
                """), {
                    "id": row["cluster_id"],
                    "label": row.get("nombre", row["cluster_id"]),
                    "frame": row.get("marco", ""),
                    "tension": row.get("tension", "baja"),
                    "volume": int(row.get("volume", 0)),
                    "sentiment": float(row.get("sentiment_avg") or 0),
                    "now": now,
                })
                stats["n_clusters_updated"] += 1

        logger.info("run_cluster_update: %d clusters actualizados", stats["n_clusters_updated"])
    except Exception as exc:
        logger.error("run_cluster_update error: %s", exc)
    return stats


# ── CLI ───────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m pipelines.media_core",
        description="Pipeline de Medios & Narrativa",
    )
    p.add_argument(
        "--source", choices=["rss", "cluster", "all"], default="all",
        help="Fuente a procesar: rss (feeds), cluster (actualizar clusters), all",
    )
    p.add_argument("--max-per-source", type=int, default=20, help="Artículos por fuente RSS")
    p.add_argument("--region", default=None, help="Filtrar por región (ej: local_spain, europe)")
    p.add_argument("--lang", default=None, help="Filtrar por idioma (ej: es, en)")
    p.add_argument("--hours", type=int, default=24, help="Ventana temporal para cluster update")
    p.add_argument("--no-cluster", action="store_true", help="Desactivar clustering narrativo en RSS")
    p.add_argument("--dry-run", action="store_true", help="No persiste datos en BD")
    return p


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    engine = _get_engine()
    exit_code = 0

    try:
        if args.source in ("rss", "all"):
            stats = run_rss_pipeline(
                engine=engine,
                max_per_source=args.max_per_source,
                region_filter=args.region,
                language_filter=args.lang,
                run_clustering=not args.no_cluster,
                dry_run=args.dry_run,
            )
            if stats.get("n_errors", 0) > stats.get("n_new", 0) * 0.5:
                logger.warning("Muchos errores en pipeline RSS: %s", stats)

        if args.source in ("cluster", "all") and not args.dry_run:
            run_cluster_update(engine=engine, hours=args.hours)

    except Exception as exc:
        logger.error("Pipeline media_core falló: %s", exc)
        exit_code = 1

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
