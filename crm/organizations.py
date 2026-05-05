"""
CRM Organizations — Bloque 15.

CRUD para organizaciones. BD-first, caché en memoria.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from crm.schemas import Organization

logger = logging.getLogger(__name__)

_ORGANIZATIONS: dict[str, Organization] = {}


def create_organization(org: Organization) -> Organization:
    _ORGANIZATIONS[org.organization_id] = org
    try:
        conn = _get_conn()
        if conn is None:
            return org
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO crm_organizations (
                    organization_id, name, organization_type,
                    country, territory_id, sectors, topics,
                    website, public_profile_url,
                    risk_entity_id, actor_graph_id,
                    tenant_id, raw_payload
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (organization_id) DO UPDATE SET
                    name=EXCLUDED.name,
                    sectors=EXCLUDED.sectors,
                    topics=EXCLUDED.topics,
                    risk_entity_id=EXCLUDED.risk_entity_id,
                    updated_at=NOW()
                """,
                (
                    org.organization_id, org.name, org.organization_type,
                    org.country, org.territory_id,
                    org.sectors, org.topics,
                    org.website, org.public_profile_url,
                    org.risk_entity_id, org.actor_graph_id,
                    org.tenant_id, json.dumps(org.raw_payload),
                ),
            )
        conn.commit()
    except Exception as exc:
        logger.warning("create_organization DB error: %s", exc)
    return org


def get_organization(organization_id: str, tenant_id: str = "default") -> Organization | None:
    if organization_id in _ORGANIZATIONS:
        o = _ORGANIZATIONS[organization_id]
        if o.tenant_id == tenant_id:
            return o
    try:
        conn = _get_conn()
        if conn is None:
            return None
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM crm_organizations WHERE organization_id=%s AND tenant_id=%s",
                (organization_id, tenant_id),
            )
            row = cur.fetchone()
            if row:
                return _row_to_org(row, cur.description)
    except Exception as exc:
        logger.debug("get_organization DB error: %s", exc)
    return None


def search_organizations(
    query: str = "",
    tenant_id: str = "default",
    organization_type: str | None = None,
    sector: str | None = None,
    limit: int = 50,
) -> list[Organization]:
    try:
        conn = _get_conn()
        if conn is not None:
            conditions = ["tenant_id = %s"]
            params: list[Any] = [tenant_id]
            if query:
                conditions.append("name ILIKE %s")
                params.append(f"%{query}%")
            if organization_type:
                conditions.append("organization_type = %s")
                params.append(organization_type)
            if sector:
                conditions.append("%s = ANY(sectors)")
                params.append(sector)
            params.append(limit)
            sql = f"SELECT * FROM crm_organizations WHERE {' AND '.join(conditions)} ORDER BY name LIMIT %s"
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return [_row_to_org(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("search_organizations DB error: %s", exc)

    results = []
    q = query.lower()
    for o in _ORGANIZATIONS.values():
        if o.tenant_id != tenant_id:
            continue
        if q and q not in o.name.lower():
            continue
        if organization_type and o.organization_type != organization_type:
            continue
        if sector and sector not in o.sectors:
            continue
        results.append(o)
    return results[:limit]


def list_organizations(tenant_id: str = "default", limit: int = 100) -> list[Organization]:
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM crm_organizations WHERE tenant_id=%s ORDER BY name LIMIT %s",
                    (tenant_id, limit),
                )
                return [_row_to_org(r, cur.description) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("list_organizations DB error: %s", exc)
    return [o for o in _ORGANIZATIONS.values() if o.tenant_id == tenant_id][:limit]


def link_organization_to_risk_entity(organization_id: str, risk_entity_id: str) -> bool:
    org = get_organization(organization_id)
    if org is None:
        return False
    updated = org.model_copy(update={"risk_entity_id": risk_entity_id})
    create_organization(updated)
    return True


def link_organization_to_actor_graph(organization_id: str, actor_graph_id: str) -> bool:
    org = get_organization(organization_id)
    if org is None:
        return False
    updated = org.model_copy(update={"actor_graph_id": actor_graph_id})
    create_organization(updated)
    return True


def _get_conn() -> Any:
    try:
        from db.database import get_db_connection
        return get_db_connection()
    except Exception:
        return None


def _row_to_org(row: tuple, description: Any) -> Organization:
    cols = [d[0] for d in description]
    d = dict(zip(cols, row))
    raw = d.get("raw_payload") or {}
    if isinstance(raw, str):
        import json as _json
        raw = _json.loads(raw)
    return Organization(
        organization_id=d["organization_id"],
        name=d.get("name", ""),
        organization_type=d.get("organization_type", "other"),
        country=d.get("country", "ES"),
        territory_id=d.get("territory_id"),
        sectors=list(d.get("sectors") or []),
        topics=list(d.get("topics") or []),
        website=d.get("website"),
        public_profile_url=d.get("public_profile_url"),
        risk_entity_id=d.get("risk_entity_id"),
        actor_graph_id=d.get("actor_graph_id"),
        tenant_id=d.get("tenant_id", "default"),
        raw_payload=raw,
    )
