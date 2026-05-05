"""Knowledge graph — entities and relationships."""

from __future__ import annotations

import uuid
from collections import deque
from datetime import datetime

from .schemas import KnowledgeEdge, KnowledgeNode

_NODES: dict[str, dict[str, KnowledgeNode]] = {}
_EDGES: dict[str, list[KnowledgeEdge]] = {}


def add_node(
    tenant_id: str,
    node_type: str,
    label: str,
    description: str = "",
    attributes: dict | None = None,
) -> KnowledgeNode:
    """Add a node, deduping by (node_type, label)."""

    bucket = _NODES.setdefault(tenant_id, {})
    for existing in bucket.values():
        if existing.node_type == node_type and existing.label.lower() == label.lower():
            existing.source_count += 1
            existing.last_updated = datetime.utcnow()
            if description and not existing.description:
                existing.description = description
            if attributes:
                existing.attributes.update(attributes)
            return existing

    now = datetime.utcnow()
    node = KnowledgeNode(
        id=str(uuid.uuid4()),
        node_type=node_type,
        label=label,
        description=description,
        attributes=attributes or {},
        first_seen=now,
        last_updated=now,
    )
    bucket[node.id] = node
    return node


def get_node(tenant_id: str, node_id: str) -> KnowledgeNode | None:
    """Fetch a node by id."""

    return _NODES.get(tenant_id, {}).get(node_id)


def find_nodes(
    tenant_id: str, node_type: str | None = None, label_query: str = ""
) -> list[KnowledgeNode]:
    """Find nodes by type and/or label substring."""

    bucket = _NODES.get(tenant_id, {})
    needle = label_query.lower()
    matches = []
    for node in bucket.values():
        if node_type is not None and node.node_type != node_type:
            continue
        if needle and needle not in node.label.lower():
            continue
        matches.append(node)
    return matches


def add_edge(
    tenant_id: str,
    source_id: str,
    target_id: str,
    edge_type: str,
    weight: float = 1.0,
    evidence: list[str] | None = None,
) -> KnowledgeEdge:
    """Add an edge between nodes."""

    edge = KnowledgeEdge(
        id=str(uuid.uuid4()),
        source_id=source_id,
        target_id=target_id,
        edge_type=edge_type,
        weight=weight,
        evidence=evidence or [],
        created_at=datetime.utcnow(),
    )
    _EDGES.setdefault(tenant_id, []).append(edge)
    return edge


def get_neighbors(
    tenant_id: str,
    node_id: str,
    edge_type: str | None = None,
    max_depth: int = 1,
) -> list[dict]:
    """Get neighbors up to max_depth, returning dicts {node, connecting_edge}."""

    visited: set[str] = {node_id}
    frontier: deque[tuple[str, int, KnowledgeEdge | None]] = deque([(node_id, 0, None)])
    out: list[dict] = []
    edges = _EDGES.get(tenant_id, [])
    nodes = _NODES.get(tenant_id, {})

    while frontier:
        current, depth, _ = frontier.popleft()
        if depth >= max_depth:
            continue
        for edge in edges:
            if edge_type is not None and edge.edge_type != edge_type:
                continue
            other: str | None = None
            if edge.source_id == current:
                other = edge.target_id
            elif edge.target_id == current:
                other = edge.source_id
            if other is None or other in visited:
                continue
            visited.add(other)
            other_node = nodes.get(other)
            if other_node is not None:
                out.append({"node": other_node, "connecting_edge": edge})
                frontier.append((other, depth + 1, edge))
    return out


def find_path(
    tenant_id: str, source_id: str, target_id: str, max_depth: int = 4
) -> list[str]:
    """BFS shortest path between two nodes; returns list of node ids."""

    if source_id == target_id:
        return [source_id]
    edges = _EDGES.get(tenant_id, [])
    visited: set[str] = {source_id}
    parents: dict[str, str] = {}
    frontier: deque[tuple[str, int]] = deque([(source_id, 0)])

    while frontier:
        current, depth = frontier.popleft()
        if depth >= max_depth:
            continue
        for edge in edges:
            other: str | None = None
            if edge.source_id == current:
                other = edge.target_id
            elif edge.target_id == current:
                other = edge.source_id
            if other is None or other in visited:
                continue
            visited.add(other)
            parents[other] = current
            if other == target_id:
                path = [other]
                while path[-1] != source_id:
                    path.append(parents[path[-1]])
                path.reverse()
                return path
            frontier.append((other, depth + 1))
    return []


def compute_centrality(tenant_id: str, node_id: str) -> dict:
    """Compute simple degree metrics."""

    edges = _EDGES.get(tenant_id, [])
    in_deg = sum(1 for e in edges if e.target_id == node_id)
    out_deg = sum(1 for e in edges if e.source_id == node_id)
    return {"degree": in_deg + out_deg, "in_degree": in_deg, "out_degree": out_deg}


def top_central_nodes(tenant_id: str, limit: int = 10) -> list[tuple[KnowledgeNode, int]]:
    """Top nodes by degree centrality."""

    nodes = _NODES.get(tenant_id, {})
    scored: list[tuple[KnowledgeNode, int]] = []
    for node in nodes.values():
        scored.append((node, compute_centrality(tenant_id, node.id)["degree"]))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:limit]


def _seed_demo_graph(tenant_id: str) -> None:
    """Seed 20 nodes + 35 edges of Spanish political ecosystem."""

    parties = [
        ("PSOE", "Partido Socialista Obrero Español"),
        ("PP", "Partido Popular"),
        ("VOX", "Partido VOX"),
        ("Sumar", "Coalición Sumar"),
        ("Junts", "Junts per Catalunya"),
        ("ERC", "Esquerra Republicana de Catalunya"),
        ("PNV", "Partido Nacionalista Vasco"),
        ("EH Bildu", "EH Bildu"),
    ]
    leaders = [
        ("Pedro Sánchez", "PSOE"),
        ("Alberto Núñez Feijóo", "PP"),
        ("Santiago Abascal", "VOX"),
        ("Yolanda Díaz", "Sumar"),
        ("Carles Puigdemont", "Junts"),
        ("Oriol Junqueras", "ERC"),
    ]
    institutions = [
        ("Congreso de los Diputados", "Cámara baja"),
        ("Senado", "Cámara alta"),
        ("Moncloa", "Sede del Gobierno"),
        ("Tribunal Constitucional", "Órgano de garantías constitucionales"),
        ("Casa Real", "Jefatura del Estado"),
        ("Unión Europea", "Organización supranacional"),
    ]

    party_nodes = {label: add_node(tenant_id, "party", label, desc) for label, desc in parties}
    leader_nodes = {name: add_node(tenant_id, "actor", name) for name, _ in leaders}
    inst_nodes = {label: add_node(tenant_id, "institution", label, desc) for label, desc in institutions}

    # Edges: leader member_of party
    for name, party in leaders:
        add_edge(tenant_id, leader_nodes[name].id, party_nodes[party].id, "member_of", weight=1.0)

    # Coalition: PSOE-Sumar
    add_edge(tenant_id, party_nodes["PSOE"].id, party_nodes["Sumar"].id, "coalition_with", weight=0.9)
    add_edge(tenant_id, party_nodes["Sumar"].id, party_nodes["PSOE"].id, "coalition_with", weight=0.9)

    # Opposes
    add_edge(tenant_id, party_nodes["PP"].id, party_nodes["PSOE"].id, "opposes", weight=0.95)
    add_edge(tenant_id, party_nodes["VOX"].id, party_nodes["PSOE"].id, "opposes", weight=1.0)
    add_edge(tenant_id, party_nodes["VOX"].id, party_nodes["Sumar"].id, "opposes", weight=1.0)
    add_edge(tenant_id, party_nodes["ERC"].id, party_nodes["VOX"].id, "opposes", weight=0.9)
    add_edge(tenant_id, party_nodes["Junts"].id, party_nodes["VOX"].id, "opposes", weight=0.9)

    # Supports investidura
    add_edge(tenant_id, party_nodes["ERC"].id, party_nodes["PSOE"].id, "supports", weight=0.7)
    add_edge(tenant_id, party_nodes["Junts"].id, party_nodes["PSOE"].id, "supports", weight=0.55)
    add_edge(tenant_id, party_nodes["PNV"].id, party_nodes["PSOE"].id, "supports", weight=0.7)
    add_edge(tenant_id, party_nodes["EH Bildu"].id, party_nodes["PSOE"].id, "supports", weight=0.6)

    # Coalitions on the right
    add_edge(tenant_id, party_nodes["PP"].id, party_nodes["VOX"].id, "coalition_with", weight=0.7)
    add_edge(tenant_id, party_nodes["VOX"].id, party_nodes["PP"].id, "coalition_with", weight=0.7)

    # Leaders linked to institutions
    add_edge(tenant_id, leader_nodes["Pedro Sánchez"].id, inst_nodes["Moncloa"].id, "member_of", weight=1.0)
    add_edge(tenant_id, leader_nodes["Pedro Sánchez"].id, inst_nodes["Congreso de los Diputados"].id, "member_of", weight=1.0)
    add_edge(tenant_id, leader_nodes["Alberto Núñez Feijóo"].id, inst_nodes["Congreso de los Diputados"].id, "member_of", weight=1.0)
    add_edge(tenant_id, leader_nodes["Santiago Abascal"].id, inst_nodes["Congreso de los Diputados"].id, "member_of", weight=1.0)
    add_edge(tenant_id, leader_nodes["Yolanda Díaz"].id, inst_nodes["Congreso de los Diputados"].id, "member_of", weight=1.0)

    # Mentions / influences between leaders
    add_edge(tenant_id, leader_nodes["Alberto Núñez Feijóo"].id, leader_nodes["Pedro Sánchez"].id, "opposes", weight=0.95)
    add_edge(tenant_id, leader_nodes["Santiago Abascal"].id, leader_nodes["Pedro Sánchez"].id, "opposes", weight=1.0)
    add_edge(tenant_id, leader_nodes["Pedro Sánchez"].id, leader_nodes["Yolanda Díaz"].id, "coalition_with", weight=0.85)
    add_edge(tenant_id, leader_nodes["Carles Puigdemont"].id, leader_nodes["Pedro Sánchez"].id, "influences", weight=0.7)
    add_edge(tenant_id, leader_nodes["Oriol Junqueras"].id, leader_nodes["Pedro Sánchez"].id, "influences", weight=0.6)

    # Institutional links
    add_edge(tenant_id, inst_nodes["Congreso de los Diputados"].id, inst_nodes["Senado"].id, "mentioned_with", weight=0.9)
    add_edge(tenant_id, inst_nodes["Moncloa"].id, inst_nodes["Congreso de los Diputados"].id, "influences", weight=0.95)
    add_edge(tenant_id, inst_nodes["Tribunal Constitucional"].id, inst_nodes["Congreso de los Diputados"].id, "influences", weight=0.7)
    add_edge(tenant_id, inst_nodes["Casa Real"].id, inst_nodes["Moncloa"].id, "mentioned_with", weight=0.6)
    add_edge(tenant_id, inst_nodes["Unión Europea"].id, inst_nodes["Moncloa"].id, "influences", weight=0.85)

    # Voted with
    add_edge(tenant_id, party_nodes["PNV"].id, party_nodes["Sumar"].id, "voted_with", weight=0.6)
    add_edge(tenant_id, party_nodes["ERC"].id, party_nodes["Sumar"].id, "voted_with", weight=0.7)
    add_edge(tenant_id, party_nodes["PP"].id, party_nodes["Junts"].id, "voted_with", weight=0.4)

    # Cites / contradicts examples
    add_edge(tenant_id, party_nodes["PP"].id, party_nodes["VOX"].id, "contradicts", weight=0.5)
    add_edge(tenant_id, party_nodes["Sumar"].id, party_nodes["PSOE"].id, "contradicts", weight=0.4)
