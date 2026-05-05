"""
Content Calendar — Bloque 16.

Gestión del calendario editorial.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from communications.schemas import EditorialCalendarItem

logger = logging.getLogger(__name__)

_CALENDAR: dict[str, EditorialCalendarItem] = {}


def create_calendar_item(
    title: str,
    planned_at: datetime,
    content_asset_id: str | None = None,
    channel_id: str | None = None,
    priority: str = "MEDIUM",
    tenant_id: str = "default",
    **kwargs: Any,
) -> EditorialCalendarItem:
    item = EditorialCalendarItem(
        title=title,
        planned_at=planned_at,
        content_asset_id=content_asset_id,
        channel_id=channel_id,
        priority=priority,
        tenant_id=tenant_id,
        **kwargs,
    )
    _CALENDAR[item.calendar_item_id] = item
    _persist_item(item)
    return item


def get_calendar_items(
    tenant_id: str = "default",
    days: int = 30,
    status: str | None = None,
) -> list[EditorialCalendarItem]:
    now = datetime.utcnow()
    cutoff = now + timedelta(days=days)
    results = [
        i for i in _CALENDAR.values()
        if i.tenant_id == tenant_id and i.planned_at <= cutoff
    ]
    if status:
        results = [i for i in results if i.status == status]
    return sorted(results, key=lambda i: i.planned_at)


def update_calendar_item_status(item_id: str, status: str) -> EditorialCalendarItem | None:
    item = _CALENDAR.get(item_id)
    if item is None:
        return None
    updated = item.model_copy(update={"status": status})
    _CALENDAR[item_id] = updated
    return updated


def get_overdue_items(tenant_id: str = "default") -> list[EditorialCalendarItem]:
    now = datetime.utcnow()
    return [
        i for i in _CALENDAR.values()
        if i.tenant_id == tenant_id and i.deadline_at and i.deadline_at < now
        and i.status not in ("published", "cancelled")
    ]


def suggest_calendar_slots(
    priority: str,
    channel_id: str | None = None,
    n: int = 5,
    tenant_id: str = "default",
) -> list[datetime]:
    """Sugiere slots libres en el calendario para el nivel de prioridad dado."""
    now = datetime.utcnow()
    busy = {i.planned_at.replace(second=0, microsecond=0)
            for i in _CALENDAR.values() if i.tenant_id == tenant_id}

    offset_map = {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 4, "LOW": 7}
    start_offset = offset_map.get(priority, 3)
    slots = []
    candidate = now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=start_offset)

    while len(slots) < n:
        if candidate.weekday() < 5 and candidate not in busy:
            slots.append(candidate)
        candidate += timedelta(hours=6)

    return slots


def _persist_item(item: EditorialCalendarItem) -> None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO editorial_calendar
                   (calendar_item_id, title, content_asset_id, channel_id,
                    planned_at, deadline_at, status, campaign_id, related_alert_id,
                    owner_user_id, approver_user_id, priority, tenant_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (calendar_item_id) DO UPDATE SET
                   status=EXCLUDED.status, planned_at=EXCLUDED.planned_at,
                   updated_at=NOW()""",
                (item.calendar_item_id, item.title, item.content_asset_id, item.channel_id,
                 item.planned_at, item.deadline_at, item.status, item.campaign_id,
                 item.related_alert_id, item.owner_user_id, item.approver_user_id,
                 item.priority, item.tenant_id),
            )
        conn.commit()
    except Exception as exc:
        logger.debug("_persist_item: %s", exc)
