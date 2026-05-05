"""CRM Mobilization — Bloque 15."""
from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Any
from crm.schemas import MobilizationEvent
logger = logging.getLogger(__name__)
_EVENTS: dict[str, MobilizationEvent] = {}

def create_mobilization_event(event: MobilizationEvent) -> MobilizationEvent:
    _EVENTS[event.mobilization_id] = event
    try:
        conn = _get_conn()
        if conn is None: return event
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO crm_mobilization_events (
                    mobilization_id, name, description, event_type,
                    start_at, end_at, territory_id, venue,
                    target_segment_id, expected_attendance, actual_attendance,
                    owner_user_id, related_campaign_id, related_scenario_id, tenant_id
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (mobilization_id) DO UPDATE SET
                    actual_attendance=EXCLUDED.actual_attendance, updated_at=NOW()
            """, (
                event.mobilization_id, event.name, event.description, event.event_type,
                event.start_at, event.end_at, event.territory_id, event.venue,
                event.target_segment_id, event.expected_attendance, event.actual_attendance,
                event.owner_user_id, event.related_campaign_id, event.related_scenario_id,
                event.tenant_id,
            ))
        conn.commit()
    except Exception as exc:
        logger.warning("create_mobilization_event DB error: %s", exc)
    return event

def assign_contacts_to_event(mobilization_id: str, contact_ids: list[str], tenant_id: str = "default") -> None:
    """Assigns contacts to a mobilization event (via segment or direct)."""
    event = _EVENTS.get(mobilization_id)
    if event is None: return
    # Store as segment static members
    try:
        from crm.segments import add_static_member
        if event.target_segment_id:
            for cid in contact_ids:
                add_static_member(event.target_segment_id, {"contact_id": cid}, tenant_id)
    except Exception as exc:
        logger.debug("assign_contacts_to_event error: %s", exc)

def get_events_by_territory(territory_id: str, tenant_id: str = "default", days: int = 30) -> list[MobilizationEvent]:
    cutoff = datetime.utcnow() + timedelta(days=days)
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM crm_mobilization_events
                    WHERE territory_id=%s AND tenant_id=%s AND start_at <= %s
                    ORDER BY start_at
                """, (territory_id, tenant_id, cutoff))
                return [_row_to_event(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("get_events_by_territory DB error: %s", exc)
    return [e for e in _EVENTS.values() if e.territory_id == territory_id and e.tenant_id == tenant_id]

def list_mobilization_events(tenant_id: str = "default", days: int = 30) -> list[MobilizationEvent]:
    cutoff = datetime.utcnow() + timedelta(days=days)
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM crm_mobilization_events
                    WHERE tenant_id=%s AND start_at <= %s
                    ORDER BY start_at
                """, (tenant_id, cutoff))
                return [_row_to_event(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("list_mobilization_events DB error: %s", exc)
    return [e for e in _EVENTS.values() if e.tenant_id == tenant_id]

def summarize_event_outcome(mobilization_id: str) -> dict:
    event = _EVENTS.get(mobilization_id)
    if event is None:
        return {"error": "Event not found"}
    attendance_rate = None
    if event.expected_attendance and event.actual_attendance:
        attendance_rate = round(event.actual_attendance / event.expected_attendance * 100, 1)
    return {
        "mobilization_id": mobilization_id,
        "name": event.name,
        "event_type": event.event_type,
        "territory": event.territory_id,
        "expected": event.expected_attendance,
        "actual": event.actual_attendance,
        "attendance_rate_pct": attendance_rate,
    }

def _get_conn() -> Any:
    try:
        from db.database import get_db_connection; return get_db_connection()
    except Exception: return None

def _row_to_event(row: tuple, description: Any) -> MobilizationEvent:
    cols = [d[0] for d in description]; d = dict(zip(cols, row))
    return MobilizationEvent(
        mobilization_id=d["mobilization_id"], name=d.get("name",""),
        description=d.get("description"), event_type=d.get("event_type","meeting"),
        start_at=d.get("start_at", datetime.utcnow()), end_at=d.get("end_at"),
        territory_id=d.get("territory_id"), venue=d.get("venue"),
        target_segment_id=d.get("target_segment_id"),
        expected_attendance=d.get("expected_attendance"),
        actual_attendance=d.get("actual_attendance"),
        owner_user_id=d.get("owner_user_id"),
        related_campaign_id=d.get("related_campaign_id"),
        related_scenario_id=d.get("related_scenario_id"),
        tenant_id=d.get("tenant_id","default"),
    )
