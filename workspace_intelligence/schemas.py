"""Schemas del workspace de analista político."""
from __future__ import annotations
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field


class WorkspaceIssue(BaseModel):
    model_config = ConfigDict(extra="allow")
    issue_id: str
    title: str
    description: str = ""
    status: str = "open"  # open|monitoring|resolved|archived
    severity: str = "normal"  # critical|high|normal|low
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    workspace_id: str
    tenant_id: str = "default"
    tags: list[str] = Field(default_factory=list)
    related_narratives: list[str] = Field(default_factory=list)
    related_actors: list[str] = Field(default_factory=list)


class WorkspaceEvidence(BaseModel):
    model_config = ConfigDict(extra="allow")
    evidence_id: str
    issue_id: str
    title: str
    source_url: str = ""
    source_name: str = ""
    evidence_type: str = "article"  # article|document|data|expert_quote|official_statement
    summary: str = ""
    added_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    workspace_id: str
    tenant_id: str = "default"
    relevance_score: float = 0.5


class WorkspaceAction(BaseModel):
    model_config = ConfigDict(extra="allow")
    action_id: str
    issue_id: str | None = None
    title: str
    description: str = ""
    action_type: str = "task"  # task|communication|briefing|meeting|analysis
    status: str = "pending"  # pending|in_progress|done|cancelled
    priority: str = "normal"  # critical|high|normal|low
    due_date: str | None = None
    assigned_to: str | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    workspace_id: str
    tenant_id: str = "default"


class WorkspaceDecision(BaseModel):
    model_config = ConfigDict(extra="allow")
    decision_id: str
    issue_id: str | None = None
    title: str
    context: str = ""
    decision_made: str = ""
    rationale: str = ""
    decided_by: str = ""
    decided_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    workspace_id: str
    tenant_id: str = "default"
    tags: list[str] = Field(default_factory=list)


class WorkspaceOverview(BaseModel):
    model_config = ConfigDict(extra="allow")
    workspace_id: str
    workspace_name: str = ""
    open_issues: int = 0
    critical_signals: int = 0
    pending_actions: int = 0
    relevant_news_count: int = 0
    active_narratives: int = 0
    top_news: list[dict] = Field(default_factory=list)
    narratives: list[dict] = Field(default_factory=list)
    pending_actions_list: list[dict] = Field(default_factory=list)
    mode: str = "demo"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
