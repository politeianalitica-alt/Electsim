"""
Briefing Distribution — Bloque 16.

Distribución controlada de contenidos con validación de consentimiento.
Integra con Bloque 15 CRM.
"""
from __future__ import annotations

import logging
from typing import Any

from communications.schemas import DistributionList

logger = logging.getLogger(__name__)

_LISTS: dict[str, DistributionList] = {}


def create_distribution_list(
    name: str,
    list_type: str,
    allowed_use: str,
    crm_segment_id: str | None = None,
    consent_required: bool = True,
    tenant_id: str = "default",
) -> DistributionList:
    dist = DistributionList(
        name=name,
        list_type=list_type,
        allowed_use=allowed_use,
        crm_segment_id=crm_segment_id,
        consent_required=consent_required,
        tenant_id=tenant_id,
    )
    _LISTS[dist.list_id] = dist
    _persist_list(dist)
    return dist


def get_distribution_list(list_id: str) -> DistributionList | None:
    return _LISTS.get(list_id)


def list_distribution_lists(tenant_id: str = "default") -> list[DistributionList]:
    return [l for l in _LISTS.values() if l.tenant_id == tenant_id]


def resolve_distribution_members(list_id: str) -> list[dict[str, Any]]:
    """Resuelve los miembros de una lista, filtrando sin consentimiento."""
    dist = _LISTS.get(list_id)
    if dist is None:
        return []

    members = list(dist.static_members)

    # Intentar resolver desde CRM si es un segmento
    if dist.crm_segment_id:
        try:
            from crm.contacts import search_contacts
            crm_contacts = search_contacts(tenant_id=dist.tenant_id, limit=500)
            for c in crm_contacts:
                members.append({
                    "contact_id": c.contact_id,
                    "full_name": c.full_name,
                    "email": getattr(c, "email", None),
                    "consent_status": getattr(c, "consent_status", "unknown"),
                })
        except Exception as exc:
            logger.debug("resolve_distribution_members CRM: %s", exc)

    # Filtrar sin consentimiento si es requerido
    if dist.consent_required:
        members = [m for m in members
                   if m.get("consent_status") in ("consented", "legitimate_interest")]

    return members


def validate_distribution_consent(list_id: str) -> dict[str, Any]:
    """Valida el estado de consentimiento de una lista."""
    dist = _LISTS.get(list_id)
    if dist is None:
        return {"error": "Lista no encontrada"}

    all_members = resolve_distribution_members(list_id)
    total = len(all_members)
    blocked = sum(1 for m in all_members
                  if m.get("consent_status") in ("do_not_contact", "revoked"))
    unknown = sum(1 for m in all_members if m.get("consent_status") == "unknown")
    valid = total - blocked

    return {
        "list_id": list_id,
        "total": total,
        "valid_recipients": valid,
        "blocked": blocked,
        "unknown_consent": unknown,
        "consent_required": dist.consent_required,
        "ready_to_distribute": blocked == 0 and unknown == 0,
    }


def prepare_briefing_distribution(
    asset_id: str,
    list_id: str,
    tenant_id: str = "default",
) -> dict[str, Any]:
    """Prepara la distribución de un briefing a una lista."""
    from communications.message_studio import get_asset
    asset = get_asset(asset_id)
    if asset is None:
        return {"error": f"Asset {asset_id} no encontrado"}
    if asset.status not in ("approved", "published"):
        return {"error": f"Asset no aprobado — estado actual: {asset.status}"}

    consent_report = validate_distribution_consent(list_id)
    members = resolve_distribution_members(list_id)

    return {
        "asset_id": asset_id,
        "asset_title": asset.title,
        "list_id": list_id,
        "recipients_count": len(members),
        "consent_report": consent_report,
        "ready": consent_report.get("ready_to_distribute", False),
        "warning": None if consent_report.get("ready_to_distribute") else
                   f"{consent_report.get('blocked',0)} contactos bloqueados y "
                   f"{consent_report.get('unknown_consent',0)} sin consentimiento verificado.",
    }


def _persist_list(dist: DistributionList) -> None:
    try:
        import json
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO distribution_lists
                   (list_id, name, description, list_type, crm_segment_id,
                    static_members, allowed_use, consent_required, tenant_id)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (list_id) DO UPDATE SET
                   name=EXCLUDED.name, static_members=EXCLUDED.static_members""",
                (dist.list_id, dist.name, dist.description, dist.list_type,
                 dist.crm_segment_id, json.dumps(dist.static_members),
                 dist.allowed_use, dist.consent_required, dist.tenant_id),
            )
        conn.commit()
    except Exception as exc:
        logger.debug("_persist_list: %s", exc)
