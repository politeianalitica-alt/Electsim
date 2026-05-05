"""
Geopolitics Core Pipeline — Bloque 14.

CLI para ejecutar el pipeline geopolítico completo o por partes.

Uso:
    python -m pipelines.geopolitics_core --source all
    python -m pipelines.geopolitics_core --source acled --days 30
    python -m pipelines.geopolitics_core --risk
    python -m pipelines.geopolitics_core --signals
    python -m pipelines.geopolitics_core --briefing
    python -m pipelines.geopolitics_core --presence
    python -m pipelines.geopolitics_core --health
    python -m pipelines.geopolitics_core --full
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import date

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def cmd_source(source: str, days: int, countries: list[str] | None) -> None:
    """Ejecuta solo una fuente de eventos."""
    from etl.sources.geopolitics.geopolitics_monitor import run_source_only
    logger.info("Fetching source: %s (days_back=%d)", source, days)
    events = run_source_only(source=source, days_back=days, countries=countries)
    logger.info("Source %s: %d eventos", source, len(events))
    for ev in events[:5]:
        logger.info("  [%s] %s en %s (%s)", ev.event_date, ev.event_type, ev.country, ev.severity)


def cmd_risk(days: int) -> None:
    """Calcula y muestra perfiles de riesgo país."""
    from etl.sources.geopolitics.acled_client import fetch_acled_events
    from etl.sources.geopolitics.geo_risk_scorer import score_all_countries
    from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

    logger.info("Calculando perfiles de riesgo país...")
    events = fetch_acled_events()
    presence = get_spanish_presence()
    profiles = score_all_countries(events, [], presence)

    logger.info("Top 10 países por riesgo:")
    for p in profiles[:10]:
        logger.info(
            "  %s (%s): %.1f/100 | conflict=%.0f energy=%.0f migration=%.0f | trend=%s",
            p.country_name, p.country_iso3, p.total_score,
            p.conflict_risk, p.energy_risk, p.migration_risk, p.trend,
        )


def cmd_signals(days: int) -> None:
    """Detecta señales y genera alertas."""
    from etl.sources.geopolitics.acled_client import fetch_acled_events
    from etl.sources.geopolitics.geo_risk_scorer import score_all_countries
    from etl.sources.geopolitics.geo_signal_detector import detect_signals
    from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

    logger.info("Detectando señales geopolíticas...")
    events = fetch_acled_events()
    presence = get_spanish_presence()
    profiles = score_all_countries(events, [], presence)
    alerts = detect_signals(events, [], profiles, presence)

    logger.info("%d alertas generadas:", len(alerts))
    for a in sorted(alerts, key=lambda x: {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(x.severity, 0), reverse=True)[:10]:
        logger.info("  [%s] %s — %s", a.severity, a.alert_type, a.title)


def cmd_briefing(country_iso3: str | None) -> None:
    """Genera briefing geopolítico."""
    from etl.sources.geopolitics.acled_client import fetch_acled_events
    from etl.sources.geopolitics.geo_briefing_builder import build_daily_spain_digest
    from etl.sources.geopolitics.geo_risk_scorer import score_all_countries
    from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

    logger.info("Construyendo briefing geopolítico...")
    events = fetch_acled_events()
    presence = get_spanish_presence()
    profiles = score_all_countries(events, [], presence)
    briefing = build_daily_spain_digest(events, [], profiles, [], [])

    print(f"\n{'='*60}")
    print(f"BRIEFING: {briefing.titulo}")
    print(f"Fecha: {briefing.fecha}")
    print(f"\nSITUACIÓN:\n{briefing.situacion}")
    if briefing.riesgos:
        print(f"\nRIESGOS:")
        for r in briefing.riesgos:
            print(f"  • {r}")
    if briefing.recomendaciones:
        print(f"\nRECOMENDACIONES:")
        for rec in briefing.recomendaciones:
            print(f"  → {rec}")
    print(f"{'='*60}\n")


def cmd_presence() -> None:
    """Muestra presencia española en el exterior."""
    from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

    logger.info("Cargando presencia española en el exterior...")
    presence = get_spanish_presence()

    from collections import Counter
    by_cat: Counter = Counter(p.category for p in presence)
    logger.info("Total: %d registros", len(presence))
    for cat, count in by_cat.items():
        logger.info("  %s: %d", cat, count)
    for p in presence[:10]:
        logger.info("  [%s] %s — %s: %s", p.category, p.country_name, p.actor_name or "-", p.description[:60])


def cmd_health() -> None:
    """Comprueba estado de salud de las fuentes."""
    from etl.sources.geopolitics.geopolitics_monitor import get_health_status

    status = get_health_status()
    logger.info("Estado de fuentes geopolíticas:")
    for source, health in status.items():
        available = health.get("available", False)
        error = health.get("error", "")
        icon = "OK" if available else "FAIL"
        logger.info("  [%s] %s: available=%s%s", icon, source, available, f" | error={error}" if error else "")


def cmd_full(days: int, save_to_db: bool) -> None:
    """Ejecuta el pipeline completo."""
    from etl.sources.geopolitics.geopolitics_monitor import run_full_pipeline

    logger.info("Ejecutando pipeline geopolítico completo (days_back=%d, save_to_db=%s)...", days, save_to_db)
    result = run_full_pipeline(days_back=days, save_to_db=save_to_db)
    logger.info(result.summary())
    if result.errors:
        logger.warning("Errores encontrados:")
        for e in result.errors:
            logger.warning("  %s", e)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ElectSim Geopolitics Core Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--source", choices=["acled", "gdelt", "ucdp", "all"], help="Fuente de eventos")
    parser.add_argument("--days", type=int, default=7, help="Días hacia atrás (default: 7)")
    parser.add_argument("--countries", nargs="+", help="Países ISO3 (default: todos relevantes)")
    parser.add_argument("--risk", action="store_true", help="Calcular perfiles de riesgo país")
    parser.add_argument("--signals", action="store_true", help="Detectar señales y alertas")
    parser.add_argument("--briefing", action="store_true", help="Generar briefing geopolítico")
    parser.add_argument("--country", help="País ISO3 para briefing específico")
    parser.add_argument("--presence", action="store_true", help="Mostrar presencia española")
    parser.add_argument("--health", action="store_true", help="Estado de salud de fuentes")
    parser.add_argument("--full", action="store_true", help="Pipeline completo")
    parser.add_argument("--save-db", action="store_true", help="Persistir en BD")

    args = parser.parse_args()

    if args.health:
        cmd_health()
    elif args.presence:
        cmd_presence()
    elif args.source:
        sources = ["acled", "gdelt", "ucdp"] if args.source == "all" else [args.source]
        for src in sources:
            cmd_source(src, args.days, args.countries)
    elif args.risk:
        cmd_risk(args.days)
    elif args.signals:
        cmd_signals(args.days)
    elif args.briefing:
        cmd_briefing(args.country)
    elif args.full:
        cmd_full(args.days, args.save_db)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
