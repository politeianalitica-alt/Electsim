"""Issue board del workspace."""
from __future__ import annotations
import hashlib
import logging
from datetime import datetime, timezone
from workspace_intelligence.schemas import WorkspaceIssue

log = logging.getLogger(__name__)
_ISSUES: dict[str, WorkspaceIssue] = {}


def create_issue(workspace_id: str, title: str, description: str = "",
                  severity: str = "normal", tenant_id: str = "default") -> WorkspaceIssue:
    issue_id = f"iss_{hashlib.md5(f'{workspace_id}{title}'.encode()).hexdigest()[:10]}"
    issue = WorkspaceIssue(
        issue_id=issue_id, title=title, description=description,
        severity=severity, workspace_id=workspace_id, tenant_id=tenant_id,
    )
    _ISSUES[issue_id] = issue
    _persist_issue(issue)
    return issue


def list_issues(workspace_id: str, tenant_id: str = "default",
                 status: str | None = None) -> list[WorkspaceIssue]:
    issues = [i for i in _ISSUES.values()
               if i.workspace_id == workspace_id and i.tenant_id == tenant_id]
    if status:
        issues = [i for i in issues if i.status == status]
    return sorted(issues, key=lambda i: i.created_at, reverse=True)


def get_issue(issue_id: str) -> WorkspaceIssue | None:
    return _ISSUES.get(issue_id)


def update_issue_status(issue_id: str, status: str) -> WorkspaceIssue | None:
    issue = _ISSUES.get(issue_id)
    if issue:
        issue.status = status
        issue.updated_at = datetime.now(timezone.utc).isoformat()
    return issue


def _persist_issue(issue: WorkspaceIssue) -> None:
    try:
        from db.session import get_raw_conn
        conn = get_raw_conn()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO workspace_issues
                  (issue_id, title, description, status, severity, workspace_id, tenant_id, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (issue_id) DO NOTHING
            """, (issue.issue_id, issue.title, issue.description, issue.status,
                  issue.severity, issue.workspace_id, issue.tenant_id, issue.created_at))
            conn.commit()
    except Exception:
        pass
