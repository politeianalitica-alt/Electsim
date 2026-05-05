"""
Comms Monitor — Bloque 16.

Pipeline completo de comunicación: de señales a contenidos a calendario.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class CommsRunResult:
    tenant_id: str
    run_at: datetime = field(default_factory=datetime.utcnow)
    alerts_processed: int = 0
    recommendations_generated: int = 0
    assets_created: int = 0
    calendar_items_created: int = 0
    guardrail_checks_run: int = 0
    approvals_requested: int = 0
    errors: list[str] = field(default_factory=list)


def run_full_comms_pipeline(tenant_id: str = "default") -> CommsRunResult:
    """Ejecuta el pipeline completo de comunicación."""
    result = CommsRunResult(tenant_id=tenant_id)

    # 1. Recomendaciones desde alertas
    try:
        from communications.comms_recommender import recommend_content_for_alert
        from dashboard.services.geopolitics_core import cargar_alertas_geopoliticas
        alerts = cargar_alertas_geopoliticas(limit=10)
        for alert in alerts:
            aid = getattr(alert, "alert_id", None) or (alert.get("alert_id") if isinstance(alert, dict) else None)
            if aid:
                recs = recommend_content_for_alert(aid, tenant_id=tenant_id)
                result.recommendations_generated += len(recs)
        result.alerts_processed = len(alerts)
    except Exception as exc:
        result.errors.append(f"recommendations: {exc}")

    # 2. Guardrails en assets en revisión
    try:
        from communications.comms_guardrails import run_full_guardrail_check
        from communications.message_studio import list_assets
        review_assets = list_assets(tenant_id=tenant_id, status="review")
        for asset in review_assets:
            run_full_guardrail_check(asset)
            result.guardrail_checks_run += 1
    except Exception as exc:
        result.errors.append(f"guardrails: {exc}")

    # 3. Alertas de comunicación al sistema
    try:
        from communications.comms_recommender import generate_comms_alerts
        comms_alerts = generate_comms_alerts(tenant_id=tenant_id)
        logger.info("CommsMonitor: %d alertas de comunicación generadas", len(comms_alerts))
    except Exception as exc:
        result.errors.append(f"comms_alerts: {exc}")

    logger.info(
        "CommsMonitor: alertas=%d recs=%d guardrails=%d errors=%d",
        result.alerts_processed, result.recommendations_generated,
        result.guardrail_checks_run, len(result.errors),
    )
    return result


def get_comms_health(tenant_id: str = "default") -> dict[str, Any]:
    """Estado del sistema de comunicación."""
    from communications.message_studio import list_assets
    from communications.approval_workflow import get_pending_approvals
    from communications.publication_queue import get_publication_queue
    from communications.content_calendar import get_calendar_items, get_overdue_items

    assets = list_assets(tenant_id=tenant_id, limit=9999)
    pending = get_pending_approvals(tenant_id=tenant_id)
    queue = get_publication_queue(tenant_id=tenant_id)
    calendar = get_calendar_items(tenant_id=tenant_id, days=30)
    overdue = get_overdue_items(tenant_id=tenant_id)

    return {
        "total_assets": len(assets),
        "draft": sum(1 for a in assets if a.status == "draft"),
        "review": sum(1 for a in assets if a.status == "review"),
        "approved": sum(1 for a in assets if a.status == "approved"),
        "published": sum(1 for a in assets if a.status == "published"),
        "pending_approvals": len(pending),
        "publication_queue": len(queue),
        "calendar_items_30d": len(calendar),
        "overdue_calendar_items": len(overdue),
    }
