"""CRM Interactions — Bloque 15."""
from __future__ import annotations
import json, logging
from datetime import datetime
from typing import Any
from crm.schemas import Interaction
logger = logging.getLogger(__name__)
_INTERACTIONS: dict[str, Interaction] = {}

def log_interaction(interaction: Interaction) -> Interaction:
    _INTERACTIONS[interaction.interaction_id] = interaction
    try:
        conn = _get_conn()
        if conn is None: return interaction
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO crm_interactions (
                    interaction_id, contact_id, organization_id,
                    interaction_type, title, summary, interaction_date,
                    owner_user_id, participants, related_modules, related_objects,
                    sentiment, outcome, next_action, follow_up_date,
                    tenant_id, workspace_id, raw_payload
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (interaction_id) DO NOTHING
            """, (
                interaction.interaction_id, interaction.contact_id, interaction.organization_id,
                interaction.interaction_type, interaction.title, interaction.summary,
                interaction.interaction_date, interaction.owner_user_id,
                interaction.participants, json.dumps(interaction.related_objects),
                interaction.related_modules, json.dumps(interaction.related_objects),
                interaction.sentiment, interaction.outcome,
                interaction.next_action, interaction.follow_up_date,
                interaction.tenant_id, interaction.workspace_id,
                json.dumps(interaction.raw_payload),
            ))
        conn.commit()
    except Exception as exc:
        logger.warning("log_interaction DB error: %s", exc)
    return interaction

def get_contact_timeline(contact_id: str, tenant_id: str = "default", limit: int = 50) -> list[Interaction]:
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM crm_interactions
                    WHERE contact_id=%s AND tenant_id=%s
                    ORDER BY interaction_date DESC LIMIT %s
                """, (contact_id, tenant_id, limit))
                return [_row_to_interaction(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("get_contact_timeline DB error: %s", exc)
    return sorted(
        [i for i in _INTERACTIONS.values() if i.contact_id == contact_id and i.tenant_id == tenant_id],
        key=lambda i: i.interaction_date, reverse=True,
    )[:limit]

def get_organization_timeline(organization_id: str, tenant_id: str = "default", limit: int = 50) -> list[Interaction]:
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT * FROM crm_interactions WHERE organization_id=%s AND tenant_id=%s
                    ORDER BY interaction_date DESC LIMIT %s
                """, (organization_id, tenant_id, limit))
                return [_row_to_interaction(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("get_organization_timeline DB error: %s", exc)
    return sorted(
        [i for i in _INTERACTIONS.values() if i.organization_id == organization_id and i.tenant_id == tenant_id],
        key=lambda i: i.interaction_date, reverse=True,
    )[:limit]

def summarize_recent_interactions(contact_id: str, n: int = 5) -> str:
    timeline = get_contact_timeline(contact_id, limit=n)
    if not timeline:
        return "Sin interacciones registradas."
    lines = []
    for i in timeline:
        date_str = i.interaction_date.strftime("%d/%m/%Y") if hasattr(i.interaction_date, 'strftime') else str(i.interaction_date)
        lines.append(f"[{date_str}] {i.interaction_type}: {i.title} ({i.sentiment})")
    return "\n".join(lines)

def get_last_interaction_date(contact_id: str) -> datetime | None:
    timeline = get_contact_timeline(contact_id, limit=1)
    if timeline:
        d = timeline[0].interaction_date
        return d if isinstance(d, datetime) else datetime.combine(d, datetime.min.time())
    return None

def _get_conn() -> Any:
    try:
        from db.database import get_db_connection; return get_db_connection()
    except Exception: return None

def _row_to_interaction(row: tuple, description: Any) -> Interaction:
    cols = [d[0] for d in description]; d = dict(zip(cols, row))
    ro = d.get("related_objects") or []
    if isinstance(ro, str): ro = json.loads(ro)
    return Interaction(
        interaction_id=d["interaction_id"],
        contact_id=d.get("contact_id"),
        organization_id=d.get("organization_id"),
        interaction_type=d.get("interaction_type", "note"),
        title=d.get("title", ""),
        summary=d.get("summary"),
        interaction_date=d.get("interaction_date", datetime.utcnow()),
        owner_user_id=d.get("owner_user_id"),
        participants=list(d.get("participants") or []),
        related_modules=list(d.get("related_modules") or []),
        related_objects=ro,
        sentiment=d.get("sentiment", "unknown"),
        outcome=d.get("outcome"),
        next_action=d.get("next_action"),
        follow_up_date=d.get("follow_up_date"),
        tenant_id=d.get("tenant_id", "default"),
        workspace_id=d.get("workspace_id"),
    )
