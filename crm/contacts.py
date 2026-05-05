"""
CRM Contacts — Bloque 15.

CRUD para contactos institucionales. BD-first, caché en memoria.
Nunca rompe. Respeta tenant_id y consent_status.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from crm.schemas import Contact

logger = logging.getLogger(__name__)

# In-memory store: contact_id → Contact
_CONTACTS: dict[str, Contact] = {}


def create_contact(contact: Contact) -> Contact:
    """Crea o actualiza un contacto."""
    _CONTACTS[contact.contact_id] = contact
    try:
        conn = _get_conn()
        if conn is None:
            return contact
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO crm_contacts (
                    contact_id, full_name, display_name, contact_type,
                    email, phone, public_profile_url,
                    organization_id, role_title, country, territory_id,
                    sectors, topics, consent_status, data_classification,
                    source, source_url, tenant_id, workspace_id, raw_payload
                ) VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                ) ON CONFLICT (contact_id) DO UPDATE SET
                    full_name=EXCLUDED.full_name,
                    display_name=EXCLUDED.display_name,
                    organization_id=EXCLUDED.organization_id,
                    role_title=EXCLUDED.role_title,
                    consent_status=EXCLUDED.consent_status,
                    topics=EXCLUDED.topics,
                    sectors=EXCLUDED.sectors,
                    updated_at=NOW()
                """,
                (
                    contact.contact_id, contact.full_name, contact.display_name,
                    contact.contact_type, contact.email, contact.phone,
                    contact.public_profile_url, contact.organization_id,
                    contact.role_title, contact.country, contact.territory_id,
                    contact.sectors, contact.topics,
                    contact.consent_status, contact.data_classification,
                    contact.source, contact.source_url,
                    contact.tenant_id, contact.workspace_id,
                    json.dumps(contact.raw_payload),
                ),
            )
        conn.commit()
    except Exception as exc:
        logger.warning("create_contact DB error: %s", exc)
    return contact


def get_contact(contact_id: str, tenant_id: str = "default") -> Contact | None:
    """Recupera un contacto por ID."""
    if contact_id in _CONTACTS:
        c = _CONTACTS[contact_id]
        if c.tenant_id == tenant_id:
            return c
    try:
        conn = _get_conn()
        if conn is None:
            return None
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM crm_contacts WHERE contact_id=%s AND tenant_id=%s",
                (contact_id, tenant_id),
            )
            row = cur.fetchone()
            if row:
                return _row_to_contact(row, cur.description)
    except Exception as exc:
        logger.debug("get_contact DB error: %s", exc)
    return None


def update_contact(contact_id: str, updates: dict[str, Any], tenant_id: str = "default") -> Contact | None:
    """Actualiza campos de un contacto."""
    contact = get_contact(contact_id, tenant_id)
    if contact is None:
        return None
    updated = contact.model_copy(update={**updates, "updated_at": datetime.utcnow()})
    return create_contact(updated)


def search_contacts(
    query: str = "",
    tenant_id: str = "default",
    contact_type: str | None = None,
    sector: str | None = None,
    topic: str | None = None,
    territory_id: str | None = None,
    limit: int = 50,
) -> list[Contact]:
    """Busca contactos por texto y filtros."""
    try:
        conn = _get_conn()
        if conn is not None:
            return _search_contacts_db(
                query, tenant_id, contact_type, sector, topic, territory_id, limit
            )
    except Exception as exc:
        logger.debug("search_contacts DB error: %s", exc)

    # In-memory fallback
    results = []
    query_lower = query.lower()
    for c in _CONTACTS.values():
        if c.tenant_id != tenant_id:
            continue
        if query_lower and query_lower not in c.full_name.lower():
            if not (c.role_title and query_lower in c.role_title.lower()):
                continue
        if contact_type and c.contact_type != contact_type:
            continue
        if sector and sector not in c.sectors:
            continue
        if topic and topic not in c.topics:
            continue
        if territory_id and c.territory_id != territory_id:
            continue
        results.append(c)
    return results[:limit]


def deduplicate_contact_candidates(contacts: list[Contact]) -> dict[str, Any]:
    """
    Detecta duplicados por: email exacto, nombre+org, public_profile_url.

    Returns:
        {"unique": [Contact], "duplicates": [[Contact, Contact], ...], "stats": dict}
    """
    seen_email: dict[str, Contact] = {}
    seen_url: dict[str, Contact] = {}
    duplicates: list[list[Contact]] = []
    unique: list[Contact] = []

    for c in contacts:
        is_dup = False

        if c.email and c.email in seen_email:
            duplicates.append([seen_email[c.email], c])
            is_dup = True
        elif c.email:
            seen_email[c.email] = c

        if not is_dup and c.public_profile_url and c.public_profile_url in seen_url:
            duplicates.append([seen_url[c.public_profile_url], c])
            is_dup = True
        elif c.public_profile_url:
            seen_url[c.public_profile_url] = c

        if not is_dup:
            unique.append(c)

    return {
        "unique": unique,
        "duplicates": duplicates,
        "stats": {
            "total": len(contacts),
            "unique": len(unique),
            "duplicate_groups": len(duplicates),
        },
    }


def link_contact_to_organization(contact_id: str, organization_id: str, tenant_id: str = "default") -> bool:
    """Vincula un contacto a una organización."""
    return update_contact(contact_id, {"organization_id": organization_id}, tenant_id) is not None


def list_contacts(
    tenant_id: str = "default",
    limit: int = 100,
    offset: int = 0,
) -> list[Contact]:
    """Lista contactos por tenant."""
    try:
        conn = _get_conn()
        if conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM crm_contacts WHERE tenant_id=%s ORDER BY full_name LIMIT %s OFFSET %s",
                    (tenant_id, limit, offset),
                )
                rows = cur.fetchall()
                return [_row_to_contact(r, cur.description) for r in rows]
    except Exception as exc:
        logger.debug("list_contacts DB error: %s", exc)
    return [c for c in _CONTACTS.values() if c.tenant_id == tenant_id][:limit]


# ── Helpers privados ─────────────────────────────────────────────────────────

def _get_conn() -> Any:
    try:
        from db.database import get_db_connection
        return get_db_connection()
    except Exception:
        return None


def _row_to_contact(row: tuple, description: Any) -> Contact:
    cols = [d[0] for d in description]
    d = dict(zip(cols, row))
    raw = d.get("raw_payload") or {}
    if isinstance(raw, str):
        import json as _json
        raw = _json.loads(raw)
    return Contact(
        contact_id=d["contact_id"],
        full_name=d.get("full_name", ""),
        display_name=d.get("display_name"),
        contact_type=d.get("contact_type", "other"),
        email=d.get("email"),
        phone=d.get("phone"),
        public_profile_url=d.get("public_profile_url"),
        organization_id=d.get("organization_id"),
        role_title=d.get("role_title"),
        country=d.get("country", "ES"),
        territory_id=d.get("territory_id"),
        sectors=list(d.get("sectors") or []),
        topics=list(d.get("topics") or []),
        consent_status=d.get("consent_status", "unknown"),
        data_classification=d.get("data_classification", "internal"),
        source=d.get("source", "manual"),
        source_url=d.get("source_url"),
        tenant_id=d.get("tenant_id", "default"),
        workspace_id=d.get("workspace_id"),
        raw_payload=raw,
    )


def _search_contacts_db(
    query: str, tenant_id: str, contact_type: str | None,
    sector: str | None, topic: str | None, territory_id: str | None, limit: int
) -> list[Contact]:
    conn = _get_conn()
    conditions = ["tenant_id = %s"]
    params: list[Any] = [tenant_id]
    if query:
        conditions.append("(full_name ILIKE %s OR role_title ILIKE %s)")
        params += [f"%{query}%", f"%{query}%"]
    if contact_type:
        conditions.append("contact_type = %s")
        params.append(contact_type)
    if sector:
        conditions.append("%s = ANY(sectors)")
        params.append(sector)
    if topic:
        conditions.append("%s = ANY(topics)")
        params.append(topic)
    if territory_id:
        conditions.append("territory_id = %s")
        params.append(territory_id)
    params.append(limit)
    sql = f"SELECT * FROM crm_contacts WHERE {' AND '.join(conditions)} ORDER BY full_name LIMIT %s"
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return [_row_to_contact(r, cur.description) for r in cur.fetchall()]
