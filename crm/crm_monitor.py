"""CRM Monitor — Bloque 15. Orquestador del pipeline CRM."""
from __future__ import annotations
import logging
from dataclasses import dataclass, field
from datetime import date
from typing import Any
logger = logging.getLogger(__name__)

@dataclass
class CRMRunResult:
    run_date: date = field(default_factory=date.today)
    contacts_processed: int = 0
    stakeholders_scored: int = 0
    tasks_created: int = 0
    alerts_generated: int = 0
    stale_relationships: int = 0
    errors: list[str] = field(default_factory=list)

    def summary(self) -> str:
        return (f"CRMMonitor [{self.run_date}]: {self.contacts_processed} contacts, "
                f"{self.stakeholders_scored} scored, {self.tasks_created} tasks, "
                f"{self.alerts_generated} alerts. Errors: {len(self.errors)}")

def run_full_crm_pipeline(tenant_id: str = "default") -> CRMRunResult:
    result = CRMRunResult()
    try:
        from crm.contacts import list_contacts
        contacts = list_contacts(tenant_id=tenant_id, limit=500)
        result.contacts_processed = len(contacts)
    except Exception as exc:
        result.errors.append(f"contacts: {exc}")
    try:
        from crm.stakeholders import compute_stakeholder_profile
        from crm.contacts import list_contacts
        for c in list_contacts(tenant_id=tenant_id, limit=100):
            try:
                compute_stakeholder_profile("contact", c.contact_id, tenant_id)
                result.stakeholders_scored += 1
            except Exception:
                pass
    except Exception as exc:
        result.errors.append(f"scoring: {exc}")
    try:
        from crm.crm_recommender import recommend_actions_for_all_contacts
        tasks = recommend_actions_for_all_contacts(tenant_id=tenant_id, limit=50)
        result.tasks_created = len(tasks)
        from crm.tasks import create_task
        for t in tasks:
            create_task(t)
    except Exception as exc:
        result.errors.append(f"tasks: {exc}")
    try:
        from crm.crm_recommender import generate_crm_alerts, detect_stale_relationships
        alerts = generate_crm_alerts(tenant_id)
        result.alerts_generated = len(alerts)
        stale = detect_stale_relationships(tenant_id)
        result.stale_relationships = len(stale)
    except Exception as exc:
        result.errors.append(f"alerts: {exc}")
    logger.info(result.summary())
    return result
