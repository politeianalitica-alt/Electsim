"""Tests · memoria persistente sin BD (resiliente)."""
from __future__ import annotations

import pytest


# ─── Schemas ────────────────────────────────────────────────────────

def test_memory_kind_cerrado():
    from agents.memory import MemoryCreate
    # OK · todos los kinds permitidos
    for k in ["note", "brain_query", "brain_response", "investigation_event",
              "artifact_snapshot", "workflow_output", "external_doc"]:
        MemoryCreate(user_id="alice", kind=k, content="x")
    # KO
    with pytest.raises(Exception):
        MemoryCreate(user_id="alice", kind="invalid_kind", content="x")


def test_memory_create_content_required_and_limited():
    from agents.memory import MemoryCreate
    with pytest.raises(Exception):
        MemoryCreate(user_id="alice", content="")
    with pytest.raises(Exception):
        MemoryCreate(user_id="alice", content="x" * 25000)
    m = MemoryCreate(user_id="alice", content="A note")
    assert m.kind == "note"
    assert m.confidence == 1.0


def test_memory_confidence_clamping():
    from agents.memory import MemoryCreate
    with pytest.raises(Exception):
        MemoryCreate(user_id="a", content="x", confidence=1.5)
    with pytest.raises(Exception):
        MemoryCreate(user_id="a", content="x", confidence=-0.1)
    MemoryCreate(user_id="a", content="x", confidence=0.7)  # OK


# ─── Repository resiliencia (sin BD) ───────────────────────────────

def test_store_sin_bd_devuelve_none_sin_excepcion():
    from agents.memory.repository import AnalystMemoryRepository
    from agents.memory import MemoryCreate
    repo = AnalystMemoryRepository(engine=None)
    out = repo.store(MemoryCreate(user_id="alice", content="prueba"))
    assert out is None


def test_search_sin_bd_devuelve_lista_vacia():
    from agents.memory.repository import AnalystMemoryRepository
    repo = AnalystMemoryRepository(engine=None)
    results = repo.search(user_id="alice", query="X")
    assert results == []


def test_recall_for_query_sin_bd():
    from agents.memory.repository import AnalystMemoryRepository
    repo = AnalystMemoryRepository(engine=None)
    out = repo.recall_for_query(user_id="alice", prompt="prueba")
    assert out == []


def test_stats_sin_bd_devuelve_cero():
    from agents.memory.repository import AnalystMemoryRepository
    repo = AnalystMemoryRepository(engine=None)
    s = repo.stats("alice")
    assert s.user_id == "alice"
    assert s.total_memories == 0
    assert s.by_kind == {}


# ─── Wiring copilot ────────────────────────────────────────────────

def test_recall_memories_helper_no_propaga_excepcion():
    """_recall_memories en brain_copilot devuelve '' si BD no existe."""
    from api.routers.brain_copilot import _recall_memories
    out = _recall_memories("alice", "¿qué pasa?", [1, 2, 3], 99)
    assert out == ""
