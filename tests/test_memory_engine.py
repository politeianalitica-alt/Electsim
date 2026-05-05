"""Tests for memory_engine package."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from memory_engine import (
    episodic_memory,
    knowledge_graph,
    memory_service,
    semantic_memory,
    snapshot_store,
)
from memory_engine.schemas import KnowledgeEdge, KnowledgeNode, MemoryEntry, Snapshot


@pytest.fixture(autouse=True)
def _reset_state():
    episodic_memory._EPISODIC.clear()
    semantic_memory._SEMANTIC.clear()
    knowledge_graph._NODES.clear()
    knowledge_graph._EDGES.clear()
    snapshot_store._SNAPSHOTS.clear()
    yield


# ---------- Schemas ----------

def test_memory_entry_schema_validates():
    now = datetime.utcnow()
    e = MemoryEntry(
        id="x", tenant_id="t", entry_type="episodic", title="t", content="c",
        created_at=now, accessed_at=now,
    )
    assert e.importance == 0.5
    assert e.tags == []


def test_knowledge_node_schema_validates():
    now = datetime.utcnow()
    n = KnowledgeNode(id="n1", node_type="actor", label="X", first_seen=now, last_updated=now)
    assert n.confidence == 1.0


def test_knowledge_edge_schema_validates():
    e = KnowledgeEdge(id="e1", source_id="a", target_id="b", edge_type="supports", created_at=datetime.utcnow())
    assert e.weight == 1.0


def test_snapshot_schema_validates():
    s = Snapshot(id="s1", tenant_id="t", name="n", description="d", captured_at=datetime.utcnow(), captured_by="u", data={})
    assert s.tags == []


# ---------- Episodic ----------

def test_record_episode_creates_entry():
    e = episodic_memory.record_episode("t", "title", "content", entities=["X"])
    assert e.title == "title"
    assert episodic_memory.count_episodes("t") == 1


def test_recall_recent_orders_desc():
    episodic_memory.record_episode("t", "old", "x")
    episodic_memory.record_episode("t", "new", "y")
    items = episodic_memory.recall_recent("t", limit=10)
    assert items[0].title == "new"


def test_recall_recent_respects_window():
    e = episodic_memory.record_episode("t", "old", "x")
    e.created_at = datetime.utcnow() - timedelta(days=60)
    items = episodic_memory.recall_recent("t", days=30)
    assert items == []


def test_recall_by_entity_finds_match():
    episodic_memory.record_episode("t", "PSOE news", "x", entities=["PSOE"])
    episodic_memory.record_episode("t", "PP news", "x", entities=["PP"])
    matches = episodic_memory.recall_by_entity("t", "PSOE")
    assert len(matches) == 1


def test_recall_by_tag():
    episodic_memory.record_episode("t", "a", "x", tags=["sondeo"])
    episodic_memory.record_episode("t", "b", "y", tags=["legislativo"])
    matches = episodic_memory.recall_by_tag("t", "sondeo")
    assert len(matches) == 1


def test_recall_important():
    episodic_memory.record_episode("t", "low", "x", importance=0.3)
    episodic_memory.record_episode("t", "high", "y", importance=0.9)
    matches = episodic_memory.recall_important("t", min_importance=0.7)
    assert len(matches) == 1
    assert matches[0].title == "high"


def test_mark_accessed_increments():
    e = episodic_memory.record_episode("t", "a", "x")
    episodic_memory.mark_accessed(e.id)
    assert e.access_count == 1


def test_prune_expired_removes_old():
    e = episodic_memory.record_episode("t", "a", "x")
    e.expires_at = datetime.utcnow() - timedelta(seconds=1)
    removed = episodic_memory.prune_expired("t")
    assert removed == 1
    assert episodic_memory.count_episodes("t") == 0


def test_seed_demo_episodes_creates_12():
    episodic_memory._seed_demo_episodes("t")
    assert episodic_memory.count_episodes("t") == 12


# ---------- Semantic ----------

def test_learn_fact_creates():
    f = semantic_memory.learn_fact("t", "k", "content", confidence=0.8)
    assert f.title == "k"


def test_learn_fact_updates_existing():
    semantic_memory.learn_fact("t", "k", "v1")
    semantic_memory.learn_fact("t", "k", "v2")
    fact = semantic_memory.recall_fact("t", "k")
    assert fact.content == "v2"


def test_recall_fact_returns_none_when_missing():
    assert semantic_memory.recall_fact("t", "missing") is None


def test_list_facts_with_prefix():
    semantic_memory.learn_fact("t", "ccaa.madrid", "x")
    semantic_memory.learn_fact("t", "ccaa.galicia", "y")
    semantic_memory.learn_fact("t", "partidos.psoe", "z")
    items = semantic_memory.list_facts("t", prefix="ccaa.")
    assert len(items) == 2


def test_update_fact_confidence():
    semantic_memory.learn_fact("t", "k", "v", confidence=0.5)
    ok = semantic_memory.update_fact_confidence("t", "k", 0.9)
    assert ok
    fact = semantic_memory.recall_fact("t", "k")
    assert fact.metadata["confidence"] == 0.9


def test_forget_fact():
    semantic_memory.learn_fact("t", "k", "v")
    assert semantic_memory.forget_fact("t", "k") is True
    assert semantic_memory.recall_fact("t", "k") is None


def test_seed_demo_facts_creates_15():
    semantic_memory._seed_demo_facts("t")
    assert len(semantic_memory.list_facts("t")) == 15


# ---------- Knowledge graph ----------

def test_add_node_creates():
    n = knowledge_graph.add_node("t", "actor", "Pedro Sánchez")
    assert n.label == "Pedro Sánchez"


def test_add_node_dedupes_by_label():
    n1 = knowledge_graph.add_node("t", "actor", "Sánchez")
    n2 = knowledge_graph.add_node("t", "actor", "sánchez")
    assert n1.id == n2.id
    assert n1.source_count == 2


def test_find_nodes_by_type():
    knowledge_graph.add_node("t", "actor", "A")
    knowledge_graph.add_node("t", "party", "B")
    actors = knowledge_graph.find_nodes("t", node_type="actor")
    assert len(actors) == 1


def test_add_edge_creates():
    a = knowledge_graph.add_node("t", "actor", "A")
    b = knowledge_graph.add_node("t", "party", "B")
    e = knowledge_graph.add_edge("t", a.id, b.id, "member_of")
    assert e.edge_type == "member_of"


def test_get_neighbors_depth_1():
    a = knowledge_graph.add_node("t", "actor", "A")
    b = knowledge_graph.add_node("t", "actor", "B")
    knowledge_graph.add_edge("t", a.id, b.id, "supports")
    nbrs = knowledge_graph.get_neighbors("t", a.id, max_depth=1)
    assert len(nbrs) == 1
    assert nbrs[0]["node"].id == b.id


def test_find_path_simple():
    a = knowledge_graph.add_node("t", "actor", "A")
    b = knowledge_graph.add_node("t", "actor", "B")
    c = knowledge_graph.add_node("t", "actor", "C")
    knowledge_graph.add_edge("t", a.id, b.id, "supports")
    knowledge_graph.add_edge("t", b.id, c.id, "supports")
    path = knowledge_graph.find_path("t", a.id, c.id)
    assert path == [a.id, b.id, c.id]


def test_find_path_returns_empty_when_unreachable():
    a = knowledge_graph.add_node("t", "actor", "A")
    b = knowledge_graph.add_node("t", "actor", "B")
    path = knowledge_graph.find_path("t", a.id, b.id)
    assert path == []


def test_compute_centrality_counts():
    a = knowledge_graph.add_node("t", "actor", "A")
    b = knowledge_graph.add_node("t", "actor", "B")
    knowledge_graph.add_edge("t", a.id, b.id, "supports")
    knowledge_graph.add_edge("t", b.id, a.id, "supports")
    c = knowledge_graph.compute_centrality("t", a.id)
    assert c["degree"] == 2


def test_top_central_nodes():
    a = knowledge_graph.add_node("t", "actor", "A")
    b = knowledge_graph.add_node("t", "actor", "B")
    c = knowledge_graph.add_node("t", "actor", "C")
    knowledge_graph.add_edge("t", a.id, b.id, "x")
    knowledge_graph.add_edge("t", a.id, c.id, "x")
    top = knowledge_graph.top_central_nodes("t", limit=1)
    assert top[0][0].id == a.id


def test_seed_demo_graph_creates_nodes_and_edges():
    knowledge_graph._seed_demo_graph("t")
    assert len(knowledge_graph._NODES["t"]) >= 20
    assert len(knowledge_graph._EDGES["t"]) >= 30


# ---------- Snapshots ----------

def test_capture_snapshot():
    s = snapshot_store.capture_snapshot("t", "n", "d", "u", {"a": 1})
    assert s.name == "n"


def test_list_snapshots_orders_desc():
    s1 = snapshot_store.capture_snapshot("t", "n1", "", "u", {})
    s2 = snapshot_store.capture_snapshot("t", "n2", "", "u", {})
    items = snapshot_store.list_snapshots("t")
    assert items[0].id == s2.id


def test_compare_snapshots_diffs():
    a = snapshot_store.capture_snapshot("t", "a", "", "u", {"x": 1, "y": 2})
    b = snapshot_store.capture_snapshot("t", "b", "", "u", {"x": 1, "y": 99, "z": 3})
    diff = snapshot_store.compare_snapshots(a.id, b.id)
    assert "z" in diff["added"]
    assert "y" in diff["changed"]


def test_delete_snapshot():
    s = snapshot_store.capture_snapshot("t", "a", "", "u", {})
    assert snapshot_store.delete_snapshot(s.id) is True
    assert snapshot_store.get_snapshot(s.id) is None


# ---------- Service ----------

def test_unified_search_finds_across():
    episodic_memory.record_episode("t", "PSOE update", "content", entities=["PSOE"])
    semantic_memory.learn_fact("t", "psoe.leader", "Pedro Sánchez lidera el PSOE")
    knowledge_graph.add_node("t", "party", "PSOE")
    res = memory_service.unified_search("t", "PSOE")
    assert res.total_results == 3
    assert res.search_time_ms >= 0


def test_get_memory_stats_aggregates():
    episodic_memory.record_episode("t", "a", "x")
    semantic_memory.learn_fact("t", "k", "v")
    knowledge_graph.add_node("t", "actor", "X")
    snapshot_store.capture_snapshot("t", "n", "d", "u", {})
    stats = memory_service.get_memory_stats("t")
    assert stats["episodes"] == 1
    assert stats["facts"] == 1
    assert stats["graph_nodes"] == 1
    assert stats["snapshots"] == 1
    assert stats["last_activity"] is not None


def test_seed_all_demo_populates_everything():
    memory_service.seed_all_demo("t")
    stats = memory_service.get_memory_stats("t")
    assert stats["episodes"] == 12
    assert stats["facts"] == 15
    assert stats["graph_nodes"] >= 20
