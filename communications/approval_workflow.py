"""
Approval Workflow — Bloque 16.

Nada sensible se publica sin aprobación humana.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from communications.schemas import ContentApproval

logger = logging.getLogger(__name__)

_APPROVALS: dict[str, ContentApproval] = {}

HIGH_RISK_ASSET_TYPES = {"press_note", "speech", "thread"}
SENSITIVE_FLAGS = {
    "personal_data", "defamatory_language", "unverified_accusation",
    "sensitive_political_targeting", "osint_sensitive_reference",
    "client_confidential_leak",
}


def request_approval(
    content_asset_id: str,
    requested_by: str | None = None,
    approver_user_id: str | None = None,
    tenant_id: str = "default",
) -> ContentApproval:
    review = requires_legal_or_risk_review(content_asset_id)
    approval = ContentApproval(
        content_asset_id=content_asset_id,
        requested_by=requested_by,
        approver_user_id=approver_user_id,
        risk_review_required=review.get("risk_review", False),
        legal_review_required=review.get("legal_review", False),
        tenant_id=tenant_id,
    )
    _APPROVALS[approval.approval_id] = approval
    _persist_approval(approval)
    _update_asset_status(content_asset_id, "review")
    _log_audit("approval_requested", content_asset_id, requested_by, tenant_id)
    return approval


def approve_content(approval_id: str, comments: str | None = None, approved_by: str | None = None) -> None:
    approval = _APPROVALS.get(approval_id)
    if approval is None:
        return
    updated = approval.model_copy(update={
        "approval_status": "approved",
        "comments": comments,
        "decided_at": datetime.utcnow(),
    })
    _APPROVALS[approval_id] = updated
    _update_asset_status(approval.content_asset_id, "approved")
    _persist_approval(updated)
    _log_audit("content_approved", approval.content_asset_id, approved_by, approval.tenant_id)


def request_changes(approval_id: str, comments: str, requested_by: str | None = None) -> None:
    approval = _APPROVALS.get(approval_id)
    if approval is None:
        return
    updated = approval.model_copy(update={
        "approval_status": "changes_requested",
        "comments": comments,
        "decided_at": datetime.utcnow(),
    })
    _APPROVALS[approval_id] = updated
    _update_asset_status(approval.content_asset_id, "draft")
    _persist_approval(updated)
    _log_audit("changes_requested", approval.content_asset_id, requested_by, approval.tenant_id)


def reject_content(approval_id: str, comments: str | None = None, rejected_by: str | None = None) -> None:
    approval = _APPROVALS.get(approval_id)
    if approval is None:
        return
    updated = approval.model_copy(update={
        "approval_status": "rejected",
        "comments": comments,
        "decided_at": datetime.utcnow(),
    })
    _APPROVALS[approval_id] = updated
    _update_asset_status(approval.content_asset_id, "rejected")
    _persist_approval(updated)
    _log_audit("content_rejected", approval.content_asset_id, rejected_by, approval.tenant_id)


def get_pending_approvals(tenant_id: str = "default") -> list[ContentApproval]:
    return [a for a in _APPROVALS.values()
            if a.tenant_id == tenant_id and a.approval_status == "pending"]


def requires_legal_or_risk_review(content_asset_id: str) -> dict[str, bool]:
    """Determina si el contenido necesita revisión legal o de riesgo."""
    from communications.comms_guardrails import check_content_risks
    from communications.message_studio import get_asset
    asset = get_asset(content_asset_id)
    if asset is None:
        return {"risk_review": False, "legal_review": False}
    flags = check_content_risks(asset.body_markdown)
    legal = any(f in flags for f in ("defamatory_language", "personal_data", "unverified_accusation"))
    risk = any(f in flags for f in SENSITIVE_FLAGS) or asset.asset_type in HIGH_RISK_ASSET_TYPES
    return {"risk_review": risk, "legal_review": legal, "flags": flags}


def _update_asset_status(asset_id: str, status: str) -> None:
    try:
        from communications.content_assets import update_asset_status
        update_asset_status(asset_id, status)
    except Exception as exc:
        logger.debug("_update_asset_status: %s", exc)


def _persist_approval(a: ContentApproval) -> None:
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO content_approvals
                   (approval_id, content_asset_id, requested_by, approver_user_id,
                    approval_status, comments, risk_review_required, legal_review_required,
                    tenant_id, decided_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (approval_id) DO UPDATE SET
                   approval_status=EXCLUDED.approval_status,
                   comments=EXCLUDED.comments, decided_at=EXCLUDED.decided_at""",
                (a.approval_id, a.content_asset_id, a.requested_by, a.approver_user_id,
                 a.approval_status, a.comments, a.risk_review_required,
                 a.legal_review_required, a.tenant_id, a.decided_at),
            )
        conn.commit()
    except Exception as exc:
        logger.debug("_persist_approval: %s", exc)


def _log_audit(action: str, asset_id: str, user: str | None, tenant_id: str) -> None:
    try:
        from security.audit import log_audit_event
        log_audit_event(action=action, resource_type="content_asset", resource_id=asset_id,
                        user_id=user or "system", tenant_id=tenant_id)
    except Exception:
        pass
