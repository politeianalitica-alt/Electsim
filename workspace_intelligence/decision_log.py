"""Log de decisiones del workspace."""
from __future__ import annotations
import hashlib
import logging
from datetime import datetime, timezone
from workspace_intelligence.schemas import WorkspaceDecision

log = logging.getLogger(__name__)
_DECISIONS: dict[str, WorkspaceDecision] = {}


def log_decision(workspace_id: str, title: str, decision_made: str,
                  context: str = "", rationale: str = "",
                  decided_by: str = "analyst", tenant_id: str = "default") -> WorkspaceDecision:
    decision_id = f"dec_{hashlib.md5(f'{workspace_id}{title}{datetime.now().isoformat()}'.encode()).hexdigest()[:10]}"
    decision = WorkspaceDecision(
        decision_id=decision_id, title=title, decision_made=decision_made,
        context=context, rationale=rationale, decided_by=decided_by,
        workspace_id=workspace_id, tenant_id=tenant_id,
    )
    _DECISIONS[decision_id] = decision
    return decision


def list_decisions(workspace_id: str, tenant_id: str = "default",
                    limit: int = 20) -> list[WorkspaceDecision]:
    decisions = [d for d in _DECISIONS.values()
                  if d.workspace_id == workspace_id and d.tenant_id == tenant_id]
    return sorted(decisions, key=lambda d: d.decided_at, reverse=True)[:limit]
