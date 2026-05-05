"""Cola de acciones del workspace."""
from __future__ import annotations
import hashlib
import logging
from datetime import datetime, timezone
from workspace_intelligence.schemas import WorkspaceAction

log = logging.getLogger(__name__)
_ACTIONS: dict[str, WorkspaceAction] = {}


def add_action(workspace_id: str, title: str, action_type: str = "task",
                priority: str = "normal", issue_id: str | None = None,
                tenant_id: str = "default") -> WorkspaceAction:
    action_id = f"act_{hashlib.md5(f'{workspace_id}{title}'.encode()).hexdigest()[:10]}"
    action = WorkspaceAction(
        action_id=action_id, title=title, action_type=action_type,
        priority=priority, issue_id=issue_id, workspace_id=workspace_id,
        tenant_id=tenant_id,
    )
    _ACTIONS[action_id] = action
    return action


def list_pending_actions(workspace_id: str, tenant_id: str = "default") -> list[WorkspaceAction]:
    return [
        a for a in _ACTIONS.values()
        if a.workspace_id == workspace_id and a.tenant_id == tenant_id and a.status == "pending"
    ]


def complete_action(action_id: str) -> bool:
    action = _ACTIONS.get(action_id)
    if action:
        action.status = "done"
        return True
    return False


def get_next_best_actions(workspace_id: str, tenant_id: str = "default",
                           n: int = 3) -> list[dict]:
    """Sugiere las próximas mejores acciones para el analista."""
    pending = list_pending_actions(workspace_id, tenant_id)
    priority_order = {"critical": 0, "high": 1, "normal": 2, "low": 3}
    sorted_actions = sorted(pending, key=lambda a: priority_order.get(a.priority, 2))
    return [a.model_dump() for a in sorted_actions[:n]]
