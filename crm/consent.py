"""CRM Consent — Bloque 15. Gestión de consentimiento y privacidad."""
from __future__ import annotations
import logging
from datetime import datetime
from typing import Any
from crm.schemas import ConsentEvent
logger = logging.getLogger(__name__)
_CONSENT_LOG: list[ConsentEvent] = []
# Channels that require explicit consent
_CONSENT_REQUIRED_CHANNELS = {"email", "phone", "sms", "whatsapp"}
_BLOCKED_STATUSES = {"do_not_contact", "revoked"}
_ALLOWED_STATUSES = {"consented", "legitimate_interest"}

def update_consent_status(
    contact_id: str, status: str, source: str | None = None,
    changed_by: str | None = None, reason: str | None = None, tenant_id: str = "default",
) -> None:
    """Updates consent status and logs the change."""
    from crm.contacts import get_contact, update_contact
    contact = get_contact(contact_id, tenant_id)
    previous = contact.consent_status if contact else "unknown"
    event = ConsentEvent(
        contact_id=contact_id, previous_status=previous, new_status=status,
        changed_by=changed_by, source=source or "manual", reason=reason, tenant_id=tenant_id,
    )
    _CONSENT_LOG.append(event)
    update_contact(contact_id, {"consent_status": status}, tenant_id)
    _log_audit(contact_id, previous, status, changed_by, tenant_id)

def can_contact(contact_id: str, channel: str = "email", tenant_id: str = "default") -> bool:
    """Returns True if contacting this person on this channel is permitted."""
    from crm.contacts import get_contact
    contact = get_contact(contact_id, tenant_id)
    if contact is None:
        return False
    if contact.consent_status in _BLOCKED_STATUSES:
        return False
    if channel in _CONSENT_REQUIRED_CHANNELS:
        return contact.consent_status in _ALLOWED_STATUSES
    return contact.consent_status != "do_not_contact"

def mark_do_not_contact(contact_id: str, reason: str | None = None, tenant_id: str = "default") -> None:
    update_consent_status(contact_id, "do_not_contact", reason=reason, tenant_id=tenant_id)

def consent_audit(contact_id: str) -> list[dict]:
    """Returns the consent change history for a contact."""
    return [
        {
            "event_id": e.consent_event_id, "previous": e.previous_status,
            "new": e.new_status, "source": e.source,
            "changed_by": e.changed_by, "reason": e.reason,
            "at": str(e.created_at),
        }
        for e in _CONSENT_LOG if e.contact_id == contact_id
    ]

def _log_audit(contact_id: str, prev: str, new: str, user: str | None, tenant_id: str) -> None:
    try:
        from security.audit import log_audit_event
        log_audit_event(
            action="consent_status_change",
            resource_type="contact", resource_id=contact_id,
            user_id=user or "system", tenant_id=tenant_id,
            details={"previous": prev, "new": new},
        )
    except Exception:
        pass
