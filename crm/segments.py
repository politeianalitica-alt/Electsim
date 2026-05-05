"""CRM Segments — Bloque 15."""
from __future__ import annotations
import json, logging
from typing import Any
from crm.schemas import CRMSegment
logger = logging.getLogger(__name__)
_SEGMENTS: dict[str, CRMSegment] = {}

def create_segment(segment: CRMSegment) -> CRMSegment:
    _SEGMENTS[segment.segment_id] = segment
    try:
        conn = _get_conn()
        if conn is None: return segment
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO crm_segments (segment_id, name, description, segment_type,
                rules, static_members, allowed_use, tenant_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (segment_id) DO UPDATE SET name=EXCLUDED.name, updated_at=NOW()
            """, (segment.segment_id, segment.name, segment.description, segment.segment_type,
                  json.dumps(segment.rules), json.dumps(segment.static_members),
                  segment.allowed_use, segment.tenant_id,))
        conn.commit()
    except Exception as exc:
        logger.warning("create_segment DB error: %s", exc)
    return segment

def get_segment(segment_id: str, tenant_id: str = "default") -> CRMSegment | None:
    if segment_id in _SEGMENTS:
        s = _SEGMENTS[segment_id]
        return s if s.tenant_id == tenant_id else None
    try:
        conn = _get_conn()
        if conn is None: return None
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM crm_segments WHERE segment_id=%s AND tenant_id=%s", (segment_id, tenant_id))
            row = cur.fetchone()
            if row: return _row_to_segment(row, cur.description)
    except Exception as exc:
        logger.debug("get_segment DB error: %s", exc)
    return None

def list_segments(tenant_id: str = "default") -> list[CRMSegment]:
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM crm_segments WHERE tenant_id=%s ORDER BY name", (tenant_id,))
                return [_row_to_segment(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("list_segments DB error: %s", exc)
    return [s for s in _SEGMENTS.values() if s.tenant_id == tenant_id]

def list_segment_members(segment_id: str, tenant_id: str = "default") -> list[dict]:
    segment = get_segment(segment_id, tenant_id)
    if segment is None: return []
    members = list(segment.static_members)
    if segment.rules:
        members.extend(_evaluate_rules(segment.rules, tenant_id))
    return members

def add_static_member(segment_id: str, member: dict, tenant_id: str = "default") -> bool:
    segment = get_segment(segment_id, tenant_id)
    if segment is None: return False
    updated_members = list(segment.static_members) + [member]
    updated = segment.model_copy(update={"static_members": updated_members})
    create_segment(updated)
    return True

def remove_static_member(segment_id: str, member_id: str, tenant_id: str = "default") -> bool:
    segment = get_segment(segment_id, tenant_id)
    if segment is None: return False
    updated_members = [m for m in segment.static_members if m.get("contact_id") != member_id]
    updated = segment.model_copy(update={"static_members": updated_members})
    create_segment(updated)
    return True

def evaluate_segment_rules(segment_id: str, tenant_id: str = "default") -> list[dict]:
    segment = get_segment(segment_id, tenant_id)
    if segment is None: return []
    return _evaluate_rules(segment.rules, tenant_id)

def _evaluate_rules(rules: dict, tenant_id: str) -> list[dict]:
    """Evaluates segment rules to find matching contacts."""
    try:
        from crm.contacts import search_contacts
        contacts = search_contacts(
            query=rules.get("query", ""),
            tenant_id=tenant_id,
            contact_type=rules.get("contact_type"),
            sector=rules.get("sector"),
            topic=rules.get("topic"),
            territory_id=rules.get("territory_id"),
            limit=rules.get("limit", 100),
        )
        return [{"contact_id": c.contact_id, "full_name": c.full_name} for c in contacts]
    except Exception as exc:
        logger.debug("evaluate_rules error: %s", exc)
        return []

def _get_conn() -> Any:
    try:
        from db.database import get_db_connection; return get_db_connection()
    except Exception: return None

def _row_to_segment(row: tuple, description: Any) -> CRMSegment:
    cols = [d[0] for d in description]; d = dict(zip(cols, row))
    rules = d.get("rules") or {}
    if isinstance(rules, str): rules = json.loads(rules)
    members = d.get("static_members") or []
    if isinstance(members, str): members = json.loads(members)
    return CRMSegment(
        segment_id=d["segment_id"], name=d.get("name",""),
        description=d.get("description"), segment_type=d.get("segment_type","custom"),
        rules=rules, static_members=members,
        allowed_use=d.get("allowed_use","relationship_management"),
        tenant_id=d.get("tenant_id","default"),
    )
