"""
Comms Core Pipeline — Bloque 16.

CLI para operaciones de comunicación: recomendar, aprobar, importar métricas.

Uso:
    python -m pipelines.comms_core --recommend-from-alerts
    python -m pipelines.comms_core --generate-calendar
    python -m pipelines.comms_core --check-approvals
    python -m pipelines.comms_core --check-guardrails
    python -m pipelines.comms_core --import-performance data/raw/comms/perf.csv
    python -m pipelines.comms_core --source all
"""
from __future__ import annotations

import argparse
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def cmd_recommend_from_alerts(tenant_id: str) -> None:
    try:
        from communications.comms_recommender import recommend_content_for_alert
        from dashboard.services.geopolitics_core import cargar_alertas_geopoliticas
        alerts = cargar_alertas_geopoliticas(limit=20)
        total = 0
        for alert in alerts:
            aid = getattr(alert, "alert_id", None) or (alert.get("alert_id") if isinstance(alert, dict) else None)
            if aid:
                recs = recommend_content_for_alert(aid, tenant_id=tenant_id)
                total += len(recs)
        logger.info("✅ %d recomendaciones generadas para %d alertas", total, len(alerts))
    except Exception as exc:
        logger.error("recommend-from-alerts: %s", exc)


def cmd_generate_calendar(tenant_id: str) -> None:
    try:
        from communications.comms_recommender import recommend_calendar_slots
        slots = recommend_calendar_slots(priority="MEDIUM", tenant_id=tenant_id)
        logger.info("📅 Slots sugeridos para el calendario:")
        for s in slots:
            logger.info("  - %s", s.strftime("%Y-%m-%d %H:%M"))
    except Exception as exc:
        logger.error("generate-calendar: %s", exc)


def cmd_check_approvals(tenant_id: str) -> None:
    try:
        from communications.approval_workflow import get_pending_approvals
        pending = get_pending_approvals(tenant_id=tenant_id)
        logger.info("⏳ Aprobaciones pendientes: %d", len(pending))
        for a in pending[:10]:
            legal = "⚖️ LEGAL" if a.legal_review_required else ""
            risk = "⚠️ RIESGO" if a.risk_review_required else ""
            logger.info("  - %s %s %s", a.content_asset_id[:20], legal, risk)
    except Exception as exc:
        logger.error("check-approvals: %s", exc)


def cmd_check_guardrails(tenant_id: str) -> None:
    try:
        from communications.comms_guardrails import run_full_guardrail_check
        from communications.message_studio import list_assets
        assets = list_assets(tenant_id=tenant_id, status="review", limit=50)
        issues = 0
        for asset in assets:
            check = run_full_guardrail_check(asset)
            if check.flags:
                logger.warning("  ⚠️ %s: %s", asset.asset_id[:16], check.flags)
                issues += 1
        logger.info("✅ Guardrails: %d assets revisados, %d con flags", len(assets), issues)
    except Exception as exc:
        logger.error("check-guardrails: %s", exc)


def cmd_import_performance(file_path: str, tenant_id: str) -> None:
    try:
        from communications.performance_tracker import import_performance_csv
        result = import_performance_csv(file_path, tenant_id=tenant_id)
        logger.info("✅ Performance importada: %d registros | %d errores",
                    result.get("imported", 0), result.get("errors", 0))
    except Exception as exc:
        logger.error("import-performance: %s", exc)


def cmd_full_pipeline(tenant_id: str) -> None:
    try:
        from communications.comms_monitor import run_full_comms_pipeline
        result = run_full_comms_pipeline(tenant_id=tenant_id)
        logger.info("✅ Pipeline completo:")
        logger.info("   Alertas: %d | Recs: %d | Guardrails: %d | Errores: %d",
                    result.alerts_processed, result.recommendations_generated,
                    result.guardrail_checks_run, len(result.errors))
    except Exception as exc:
        logger.error("full-pipeline: %s", exc)


def main() -> None:
    parser = argparse.ArgumentParser(description="ElectSim Comms Core Pipeline")
    parser.add_argument("--tenant", default="default", help="Tenant ID")
    parser.add_argument("--recommend-from-alerts", action="store_true")
    parser.add_argument("--generate-calendar", action="store_true")
    parser.add_argument("--check-approvals", action="store_true")
    parser.add_argument("--check-guardrails", action="store_true")
    parser.add_argument("--import-performance", metavar="FILE")
    parser.add_argument("--source", choices=["all"])

    args = parser.parse_args()
    t = args.tenant

    if not any([args.recommend_from_alerts, args.generate_calendar, args.check_approvals,
                args.check_guardrails, args.import_performance, args.source]):
        parser.print_help()
        sys.exit(0)

    if args.recommend_from_alerts or args.source == "all":
        cmd_recommend_from_alerts(t)
    if args.generate_calendar or args.source == "all":
        cmd_generate_calendar(t)
    if args.check_approvals or args.source == "all":
        cmd_check_approvals(t)
    if args.check_guardrails or args.source == "all":
        cmd_check_guardrails(t)
    if args.import_performance:
        cmd_import_performance(args.import_performance, t)
    if args.source == "all":
        cmd_full_pipeline(t)


if __name__ == "__main__":
    main()
