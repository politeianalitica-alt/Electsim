"""
Tests para ontology/actor_graph.py — Actor Graph Ontology.
20 tests cubriendo modelos, stores, consultas y funciones clave.
"""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import pytest

# Asegurar que el root del proyecto esta en el path
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from ontology.actor_graph import (
    ActorAttribute,
    ActorEvent,
    ActorRelationship,
    ActorStatus,
    ActorType,
    PoliticalActor,
    RelationshipType,
    _ACTORS,
    _EVENTS,
    _RELATIONSHIPS,
    add_actor_event,
    get_actor,
    get_actor_events,
    get_actor_network,
    get_actor_relationships,
    get_actor_summary,
    get_relationship_matrix,
    get_top_actors_by_influence,
    list_all_actors,
    search_actors,
    update_actor_scores,
)


# ─────────────────────────────────────────────────────────────────────────────
# Tests de inicializacion
# ─────────────────────────────────────────────────────────────────────────────

def test_demo_actors_initialized():
    """Se deben cargar al menos 15 actores de demo al importar."""
    actors = list_all_actors("demo")
    assert len(actors) >= 15, f"Se esperaban al menos 15 actores, hay {len(actors)}"


def test_get_actor_by_id():
    """get_actor debe devolver el actor correcto dado su ID."""
    actor = get_actor("sanchez")
    assert actor is not None
    assert actor.id == "sanchez"
    assert "Sánchez" in actor.name or "Sanchez" in actor.name


def test_get_actor_by_id_not_found():
    """get_actor debe devolver None si el ID no existe."""
    result = get_actor("actor_que_no_existe_xyz")
    assert result is None


# ─────────────────────────────────────────────────────────────────────────────
# Tests de busqueda
# ─────────────────────────────────────────────────────────────────────────────

def test_search_actors_by_name():
    """search_actors debe encontrar actores por nombre."""
    results = search_actors("Pedro")
    names = [a.name for a in results]
    assert any("Pedro" in n for n in names), f"No se encontro Pedro en {names}"


def test_search_actors_by_type():
    """search_actors con filtro de tipo debe devolver solo actores de ese tipo."""
    results = search_actors("", actor_type=ActorType.party)
    for actor in results:
        assert actor.actor_type == ActorType.party

    # Debe haber al menos 4 partidos (PSOE, PP, VOX, SUMAR, JUNTS)
    assert len(results) >= 4


def test_search_actors_alias_match():
    """search_actors debe encontrar actores por alias."""
    results = search_actors("Populares")
    assert len(results) > 0, "No se encontro el alias 'Populares'"
    names = [a.name for a in results]
    assert any("PP" in n for n in names)


# ─────────────────────────────────────────────────────────────────────────────
# Tests de relaciones
# ─────────────────────────────────────────────────────────────────────────────

def test_get_actor_relationships_out():
    """direction='out' debe devolver relaciones donde el actor es origen."""
    rels = get_actor_relationships("sanchez", direction="out")
    assert len(rels) > 0
    for rel in rels:
        assert rel.from_actor_id == "sanchez"


def test_get_actor_relationships_in():
    """direction='in' debe devolver relaciones donde el actor es destino."""
    rels = get_actor_relationships("psoe", direction="in")
    assert len(rels) > 0
    for rel in rels:
        assert rel.to_actor_id == "psoe"


def test_get_actor_relationships_both():
    """direction='both' debe incluir relaciones de entrada y salida."""
    rels = get_actor_relationships("sanchez", direction="both")
    assert len(rels) > 0
    actor_ids = {rel.from_actor_id for rel in rels} | {rel.to_actor_id for rel in rels}
    assert "sanchez" in actor_ids


# ─────────────────────────────────────────────────────────────────────────────
# Tests de red / grafo
# ─────────────────────────────────────────────────────────────────────────────

def test_get_actor_network_returns_dict():
    """get_actor_network debe devolver un diccionario."""
    result = get_actor_network("sanchez", depth=1)
    assert isinstance(result, dict)


def test_get_actor_network_has_nodes_edges():
    """get_actor_network debe incluir claves 'nodes' y 'edges'."""
    result = get_actor_network("sanchez", depth=2)
    assert "nodes" in result
    assert "edges" in result
    assert isinstance(result["nodes"], list)
    assert isinstance(result["edges"], list)


def test_get_actor_network_center_included():
    """El nodo central debe aparecer en la lista de nodos."""
    result = get_actor_network("feijoo", depth=1)
    node_ids = [n["id"] for n in result["nodes"]]
    assert "feijoo" in node_ids, f"feijoo no esta en los nodos: {node_ids}"


def test_get_actor_network_depth_limit():
    """La profundidad maxima debe respetarse (max 2)."""
    result = get_actor_network("sanchez", depth=5)
    depths = result.get("depths", {})
    # Todos los depth values deben ser <= 2
    for nid, d in depths.items():
        assert d <= 2, f"Nodo {nid} tiene depth {d} > 2"


# ─────────────────────────────────────────────────────────────────────────────
# Tests de actualizacion de scores
# ─────────────────────────────────────────────────────────────────────────────

def test_update_actor_scores():
    """update_actor_scores debe actualizar los scores del actor."""
    original = get_actor("feijoo")
    assert original is not None
    original_influence = original.influence_score

    success = update_actor_scores("feijoo", influence=0.50, sentiment=0.10)
    assert success is True

    updated = get_actor("feijoo")
    assert updated is not None
    assert abs(updated.influence_score - 0.50) < 1e-6
    assert abs(updated.sentiment_score - 0.10) < 1e-6

    # Restaurar valor original
    update_actor_scores("feijoo", influence=original_influence)


def test_update_actor_scores_not_found():
    """update_actor_scores debe devolver False para ID inexistente."""
    result = update_actor_scores("actor_inexistente_abc", influence=0.5)
    assert result is False


# ─────────────────────────────────────────────────────────────────────────────
# Tests de top actores
# ─────────────────────────────────────────────────────────────────────────────

def test_get_top_actors_by_influence():
    """get_top_actors_by_influence debe devolver actores ordenados descendentemente."""
    top = get_top_actors_by_influence(n=5)
    assert len(top) <= 5
    scores = [a.influence_score for a in top]
    assert scores == sorted(scores, reverse=True)


# ─────────────────────────────────────────────────────────────────────────────
# Tests de eventos
# ─────────────────────────────────────────────────────────────────────────────

def test_add_actor_event():
    """add_actor_event debe registrar el evento y devolverlo."""
    evt = add_actor_event(
        actor_id="sanchez",
        event_type="test_evento",
        description="Evento de prueba para test.",
        source="pytest",
        impact_score=0.55,
    )
    assert evt is not None
    assert evt.actor_id == "sanchez"
    assert evt.event_type == "test_evento"
    assert abs(evt.impact_score - 0.55) < 1e-6


def test_get_actor_events():
    """get_actor_events debe devolver eventos ordenados por fecha descendente."""
    events = get_actor_events("sanchez", limit=10)
    assert isinstance(events, list)
    if len(events) >= 2:
        dates = [e.date for e in events]
        assert dates == sorted(dates, reverse=True)


# ─────────────────────────────────────────────────────────────────────────────
# Tests de matriz de relaciones
# ─────────────────────────────────────────────────────────────────────────────

def test_get_relationship_matrix():
    """get_relationship_matrix debe devolver adjacencia entre los actores dados."""
    matrix = get_relationship_matrix(["sanchez", "psoe", "pp"])
    assert isinstance(matrix, dict)
    assert "sanchez" in matrix
    assert "psoe" in matrix
    assert "pp" in matrix
    # Sanchez debe tener relacion con psoe
    assert "psoe" in matrix["sanchez"], f"Sanchez->PSOE no en matrix: {matrix['sanchez']}"


# ─────────────────────────────────────────────────────────────────────────────
# Tests de listado
# ─────────────────────────────────────────────────────────────────────────────

def test_list_all_actors():
    """list_all_actors debe devolver lista de PoliticalActor."""
    actors = list_all_actors("demo")
    assert len(actors) >= 15
    for actor in actors:
        assert isinstance(actor, PoliticalActor)
        assert actor.tenant_id == "demo"


# ─────────────────────────────────────────────────────────────────────────────
# Tests de resumen
# ─────────────────────────────────────────────────────────────────────────────

def test_get_actor_summary_structure():
    """get_actor_summary debe devolver las claves esperadas."""
    summary = get_actor_summary("sanchez")
    required_keys = [
        "id", "name", "actor_type", "influence_score",
        "relationship_count", "recent_events", "connected_parties",
    ]
    for key in required_keys:
        assert key in summary, f"Clave '{key}' no encontrada en el resumen"
    assert summary["id"] == "sanchez"
    assert summary["relationship_count"] >= 0
    assert isinstance(summary["recent_events"], list)
    assert isinstance(summary["connected_parties"], list)


def test_get_actor_summary_not_found():
    """get_actor_summary debe devolver dict vacio si el actor no existe."""
    result = get_actor_summary("actor_inexistente_xyz")
    assert result == {}


# ─────────────────────────────────────────────────────────────────────────────
# Tests de modelos Pydantic
# ─────────────────────────────────────────────────────────────────────────────

def test_political_actor_model_valid():
    """PoliticalActor debe instanciarse correctamente con campos requeridos."""
    actor = PoliticalActor(
        id="test_actor",
        name="Actor de Prueba",
        actor_type=ActorType.politician,
        influence_score=0.75,
        sentiment_score=-0.2,
    )
    assert actor.id == "test_actor"
    assert actor.name == "Actor de Prueba"
    assert actor.actor_type == ActorType.politician
    assert actor.status == ActorStatus.active
    assert actor.tenant_id == "demo"
    assert isinstance(actor.created_at, datetime)


def test_actor_relationship_model_valid():
    """ActorRelationship debe instanciarse con valores por defecto correctos."""
    rel = ActorRelationship(
        from_actor_id="a1",
        to_actor_id="a2",
        relationship_type=RelationshipType.allied_with,
        weight=0.7,
    )
    assert rel.from_actor_id == "a1"
    assert rel.to_actor_id == "a2"
    assert rel.relationship_type == RelationshipType.allied_with
    assert abs(rel.weight - 0.7) < 1e-6
    assert rel.active is True
    assert rel.id.startswith("rel_")
