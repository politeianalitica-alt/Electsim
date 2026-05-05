"""Pydantic v2 schemas for the memory engine."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MemoryEntry(BaseModel):
    """A discrete unit of memory (episodic, semantic, procedural, snapshot)."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: str
    tenant_id: str
    workspace_id: str = "default"
    user_id: str = ""
    entry_type: str
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    source_module: str = ""
    importance: float = 0.5
    created_at: datetime
    accessed_at: datetime
    access_count: int = 0
    expires_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class KnowledgeNode(BaseModel):
    """A node in the institutional knowledge graph."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: str
    node_type: str
    label: str
    description: str = ""
    attributes: dict[str, Any] = Field(default_factory=dict)
    confidence: float = 1.0
    source_count: int = 1
    first_seen: datetime
    last_updated: datetime


class KnowledgeEdge(BaseModel):
    """A relationship between two nodes in the knowledge graph."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: str
    source_id: str
    target_id: str
    edge_type: str
    weight: float = 1.0
    confidence: float = 1.0
    evidence: list[str] = Field(default_factory=list)
    created_at: datetime


class Snapshot(BaseModel):
    """A point-in-time capture of any module state."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: str
    tenant_id: str
    name: str
    description: str
    captured_at: datetime
    captured_by: str
    data: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
