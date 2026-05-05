"""CRM Exporter — Bloque 15."""
from __future__ import annotations
import logging
from pathlib import Path
from typing import Any
logger = logging.getLogger(__name__)

def export_contacts_csv(
    tenant_id: str = "default", path: str | None = None, filters: dict | None = None
) -> str:
    """Exports contacts to CSV. Returns the output path."""
    try:
        import pandas as pd
        from crm.contacts import list_contacts
        contacts = list_contacts(tenant_id=tenant_id, limit=10000)
        rows = [{"contact_id": c.contact_id, "full_name": c.full_name,
                 "email": c.email or "", "phone": c.phone or "",
                 "contact_type": c.contact_type, "role_title": c.role_title or "",
                 "organization_id": c.organization_id or "",
                 "territory_id": c.territory_id or "",
                 "sectors": ", ".join(c.sectors), "topics": ", ".join(c.topics),
                 "consent_status": c.consent_status,
                 "data_classification": c.data_classification} for c in contacts]
        df = pd.DataFrame(rows)
        out = path or f"/tmp/crm_contacts_{tenant_id}.csv"
        df.to_csv(out, index=False)
        logger.info("Exported %d contacts to %s", len(rows), out)
        return out
    except Exception as exc:
        logger.error("export_contacts_csv error: %s", exc)
        return ""

def export_tasks_csv(tenant_id: str = "default", path: str | None = None) -> str:
    """Exports outreach tasks to CSV."""
    try:
        import pandas as pd
        from crm.tasks import get_due_tasks
        tasks = get_due_tasks(tenant_id=tenant_id, days=365)
        rows = [{"task_id": t.task_id, "title": t.title, "task_type": t.task_type,
                 "status": t.status, "priority": t.priority,
                 "contact_id": t.contact_id or "", "organization_id": t.organization_id or "",
                 "assigned_to": t.assigned_to or "", "due_date": str(t.due_date or "")} for t in tasks]
        df = pd.DataFrame(rows)
        out = path or f"/tmp/crm_tasks_{tenant_id}.csv"
        df.to_csv(out, index=False)
        return out
    except Exception as exc:
        logger.error("export_tasks_csv error: %s", exc)
        return ""

def export_meeting_pack_markdown(pack: Any, path: str | None = None) -> str:
    """Exports a MeetingPack as a Markdown file."""
    try:
        lines = [
            f"# Meeting Pack: {pack.contact_name}",
            f"**Tema:** {pack.topic or 'General'}",
            f"**Generado:** {pack.generated_at.strftime('%Y-%m-%d %H:%M')}",
            "",
            "## Última interacción",
            pack.last_interaction_summary or "_Sin interacciones previas_",
            "",
        ]
        if pack.recent_legal_items:
            lines.append("## Normas recientes relevantes")
            for item in pack.recent_legal_items:
                lines.append(f"- {item.get('title','')} ({item.get('date','')})")
            lines.append("")
        if pack.risks:
            lines.append("## Riesgos")
            for r in pack.risks: lines.append(f"- {r}")
            lines.append("")
        if pack.recommended_questions:
            lines.append("## Preguntas recomendadas")
            for q in pack.recommended_questions: lines.append(f"- {q}")
            lines.append("")
        if pack.recommended_actions:
            lines.append("## Acciones post-reunión")
            for a in pack.recommended_actions: lines.append(f"- [ ] {a}")
        content = "\n".join(lines)
        out = path or f"/tmp/meeting_pack_{pack.contact_id}.md"
        Path(out).write_text(content, encoding="utf-8")
        return out
    except Exception as exc:
        logger.error("export_meeting_pack_markdown error: %s", exc)
        return ""
