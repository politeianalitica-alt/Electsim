"""CRM Tasks — Bloque 15."""
from __future__ import annotations
import logging
from datetime import date, datetime, timedelta
from typing import Any
from crm.schemas import OutreachTask
logger = logging.getLogger(__name__)
_TASKS: dict[str, OutreachTask] = {}

def create_task(task: OutreachTask) -> OutreachTask:
    _TASKS[task.task_id] = task
    try:
        conn = _get_conn()
        if conn is None: return task
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO crm_outreach_tasks (
                    task_id, title, description, task_type, status, priority,
                    contact_id, organization_id, assigned_to, due_date,
                    related_campaign_id, related_workspace_id,
                    source_recommendation, tenant_id
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (task_id) DO UPDATE SET status=EXCLUDED.status, updated_at=NOW()
            """, (
                task.task_id, task.title, task.description, task.task_type,
                task.status, task.priority, task.contact_id, task.organization_id,
                task.assigned_to, task.due_date,
                task.related_campaign_id, task.related_workspace_id,
                task.source_recommendation, task.tenant_id,
            ))
        conn.commit()
    except Exception as exc:
        logger.warning("create_task DB error: %s", exc)
    return task

def get_due_tasks(user_id: str | None = None, days: int = 7, tenant_id: str = "default") -> list[OutreachTask]:
    cutoff = date.today() + timedelta(days=days)
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                if user_id:
                    cur.execute("""
                        SELECT * FROM crm_outreach_tasks
                        WHERE tenant_id=%s AND assigned_to=%s AND status IN ('open','in_progress')
                        AND (due_date IS NULL OR due_date <= %s)
                        ORDER BY priority DESC, due_date NULLS LAST
                    """, (tenant_id, user_id, cutoff))
                else:
                    cur.execute("""
                        SELECT * FROM crm_outreach_tasks
                        WHERE tenant_id=%s AND status IN ('open','in_progress')
                        AND (due_date IS NULL OR due_date <= %s)
                        ORDER BY priority DESC, due_date NULLS LAST
                    """, (tenant_id, cutoff))
                return [_row_to_task(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("get_due_tasks DB error: %s", exc)
    results = []
    for t in _TASKS.values():
        if t.tenant_id != tenant_id: continue
        if t.status not in ("open", "in_progress"): continue
        if user_id and t.assigned_to != user_id: continue
        if t.due_date and t.due_date > cutoff: continue
        results.append(t)
    return sorted(results, key=lambda t: ({"CRITICAL":0,"HIGH":1,"MEDIUM":2,"LOW":3}.get(t.priority,2), t.due_date or date.max))

def mark_task_done(task_id: str, outcome: str | None = None) -> None:
    if task_id in _TASKS:
        _TASKS[task_id] = _TASKS[task_id].model_copy(update={"status": "done", "updated_at": datetime.utcnow()})
    try:
        conn = _get_conn()
        if conn is None: return
        with conn.cursor() as cur:
            cur.execute("UPDATE crm_outreach_tasks SET status='done', updated_at=NOW() WHERE task_id=%s", (task_id,))
        conn.commit()
    except Exception as exc:
        logger.warning("mark_task_done DB error: %s", exc)

def create_follow_up_task(interaction_id: str, due_date: date, contact_id: str | None = None, tenant_id: str = "default") -> OutreachTask:
    task = OutreachTask(
        title=f"Seguimiento de interacción {interaction_id[:8]}",
        task_type="follow_up",
        status="open",
        priority="MEDIUM",
        contact_id=contact_id,
        due_date=due_date,
        source_recommendation=f"interaction:{interaction_id}",
        tenant_id=tenant_id,
    )
    return create_task(task)

def detect_overdue_tasks(tenant_id: str = "default") -> list[OutreachTask]:
    today = date.today()
    overdue = []
    for t in _TASKS.values():
        if t.tenant_id != tenant_id: continue
        if t.status not in ("open", "in_progress"): continue
        if t.due_date and t.due_date < today:
            overdue.append(t)
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM crm_outreach_tasks
                    WHERE tenant_id=%s AND status IN ('open','in_progress') AND due_date < NOW()
                """, (tenant_id,))
                return [_row_to_task(r, cur.description) for r in cur.fetchall()]
    except Exception:
        pass
    return overdue

def _get_conn() -> Any:
    try:
        from db.database import get_db_connection; return get_db_connection()
    except Exception: return None

def _row_to_task(row: tuple, description: Any) -> OutreachTask:
    cols = [d[0] for d in description]; d = dict(zip(cols, row))
    return OutreachTask(
        task_id=d["task_id"], title=d.get("title",""),
        description=d.get("description"), task_type=d.get("task_type","other"),
        status=d.get("status","open"), priority=d.get("priority","MEDIUM"),
        contact_id=d.get("contact_id"), organization_id=d.get("organization_id"),
        assigned_to=d.get("assigned_to"), due_date=d.get("due_date"),
        related_campaign_id=d.get("related_campaign_id"),
        related_workspace_id=d.get("related_workspace_id"),
        source_recommendation=d.get("source_recommendation"),
        tenant_id=d.get("tenant_id","default"),
    )
