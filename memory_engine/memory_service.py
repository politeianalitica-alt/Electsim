"""Unified memory service — single entry point across all memory subsystems."""

from __future__ import annotations

import time
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from . import episodic_memory, knowledge_graph, semantic_memory, snapshot_store
from .schemas import KnowledgeNode, MemoryEntry


class MemorySearchResult(BaseModel):
    """Result of a unified memory search."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    entries: list[MemoryEntry] = Field(default_factory=list)
    facts: list[MemoryEntry] = Field(default_factory=list)
    nodes: list[KnowledgeNode] = Field(default_factory=list)
    total_results: int = 0
    search_time_ms: int = 0


def unified_search(tenant_id: str, query: str, limit: int = 20) -> MemorySearchResult:
    """Search across episodic, semantic, and graph memory."""

    start = time.time()
    needle = query.lower().strip()

    entries: list[MemoryEntry] = []
    if needle:
        for entry in episodic_memory._EPISODIC.get(tenant_id, []):
            haystack = " ".join(
                [entry.title, entry.content, " ".join(entry.entities), " ".join(entry.tags)]
            ).lower()
            if needle in haystack:
                entries.append(entry)
    entries.sort(key=lambda e: e.created_at, reverse=True)
    entries = entries[:limit]

    facts: list[MemoryEntry] = []
    if needle:
        for fact in semantic_memory._SEMANTIC.get(tenant_id, {}).values():
            if needle in fact.title.lower() or needle in fact.content.lower():
                facts.append(fact)
    facts = facts[:limit]

    nodes: list[KnowledgeNode] = []
    if needle:
        for node in knowledge_graph._NODES.get(tenant_id, {}).values():
            if (
                needle in node.label.lower()
                or needle in node.description.lower()
                or needle in node.node_type.lower()
            ):
                nodes.append(node)
    nodes = nodes[:limit]

    elapsed_ms = int((time.time() - start) * 1000)
    return MemorySearchResult(
        entries=entries,
        facts=facts,
        nodes=nodes,
        total_results=len(entries) + len(facts) + len(nodes),
        search_time_ms=elapsed_ms,
    )


def get_memory_stats(tenant_id: str) -> dict:
    """Return aggregate stats for the memory subsystem."""

    episodes = episodic_memory._EPISODIC.get(tenant_id, [])
    facts = semantic_memory._SEMANTIC.get(tenant_id, {})
    nodes = knowledge_graph._NODES.get(tenant_id, {})
    edges = knowledge_graph._EDGES.get(tenant_id, [])
    snaps = snapshot_store._SNAPSHOTS.get(tenant_id, [])

    last_activity: datetime | None = None
    candidates: list[datetime] = []
    candidates.extend(e.created_at for e in episodes)
    candidates.extend(f.accessed_at for f in facts.values())
    candidates.extend(s.captured_at for s in snaps)
    if candidates:
        last_activity = max(candidates)

    return {
        "episodes": len(episodes),
        "facts": len(facts),
        "graph_nodes": len(nodes),
        "graph_edges": len(edges),
        "snapshots": len(snaps),
        "last_activity": last_activity,
    }


def seed_all_demo(tenant_id: str) -> None:
    """Seed all demo data for a tenant."""

    episodic_memory._seed_demo_episodes(tenant_id)
    semantic_memory._seed_demo_facts(tenant_id)
    knowledge_graph._seed_demo_graph(tenant_id)
