"""
InfluenceGraphAnalyzer — Analisis de redes de influencia politica.

Construye un grafo dirigido de influencia entre actores politicos y medios:
  - Nodos: actores (partidos, lideres), medios, grupos de interes
  - Aristas: menciones, alianzas, adversidad, flujo de narrativas
  - Peso: frecuencia de interaccion, direccion de influencia

Algoritmos:
  - PageRank para ranking de influencia
  - Betweenness centrality para actores puente
  - Community detection (Louvain/Girvan-Newman)
  - SIR model para simular difusion de narrativas

Requiere: networkx (ya en requirements)
Opcional: python-louvain para community detection
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

@dataclass
class InfluenceNode:
    id: str
    type: str               # actor, medio, grupo_interes, institucion
    pagerank: float = 0.0
    betweenness: float = 0.0
    in_degree: int = 0
    out_degree: int = 0
    community: int = -1
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass
class InfluenceEdge:
    source: str
    target: str
    weight: float = 1.0
    edge_type: str = "mencion"    # mencion, alianza, adversidad, narrativa
    direction: str = "directed"


@dataclass
class InfluenceGraphResult:
    nodes: list[InfluenceNode] = field(default_factory=list)
    edges: list[InfluenceEdge] = field(default_factory=list)
    top_influencers: list[str] = field(default_factory=list)
    bridge_actors: list[str] = field(default_factory=list)
    communities: dict[int, list[str]] = field(default_factory=dict)
    is_available: bool = True
    error: str = ""

    def get_node(self, id: str) -> InfluenceNode | None:
        return next((n for n in self.nodes if n.id == id), None)

    def neighbors(self, id: str, directed: bool = True) -> list[str]:
        if directed:
            return [e.target for e in self.edges if e.source == id]
        return list({
            e.target if e.source == id else e.source
            for e in self.edges
            if e.source == id or e.target == id
        })


@dataclass
class SIRSimulationResult:
    """Resultado de la simulacion SIR de difusion de narrativa."""
    narrative: str
    initial_seed: list[str]
    time_steps: int
    susceptible_final: list[str] = field(default_factory=list)
    infected_final: list[str] = field(default_factory=list)
    recovered_final: list[str] = field(default_factory=list)
    peak_infected_count: int = 0
    peak_step: int = 0
    total_reached: int = 0


# ---------------------------------------------------------------------------
# InfluenceGraphAnalyzer
# ---------------------------------------------------------------------------

class InfluenceGraphAnalyzer:
    """
    Analiza redes de influencia politica con NetworkX.

    Uso:
        analyzer = InfluenceGraphAnalyzer()
        analyzer.add_actors(["Sanchez", "Feijoo", "Abascal"])
        analyzer.add_edge("Sanchez", "Feijoo", weight=5, edge_type="adversidad")
        analyzer.add_edge("ElPais", "Sanchez", weight=10, edge_type="mencion")
        result = analyzer.analyze()
        print(result.top_influencers[:5])
    """

    def __init__(self) -> None:
        self._G: Any = None
        self._node_types: dict[str, str] = {}
        self._node_attrs: dict[str, dict[str, Any]] = {}
        self._edges: list[dict[str, Any]] = []
        self._init_graph()

    def _init_graph(self) -> None:
        try:
            import networkx as nx
            self._G = nx.DiGraph()
        except ImportError:
            logger.warning("networkx no disponible — InfluenceGraphAnalyzer degradado")
            self._G = None

    # ------------------------------------------------------------------
    # API de construccion del grafo
    # ------------------------------------------------------------------

    def add_actor(
        self,
        name: str,
        node_type: str = "actor",
        **attrs: Any,
    ) -> None:
        self._node_types[name] = node_type
        self._node_attrs[name] = attrs
        if self._G is not None:
            self._G.add_node(name, node_type=node_type, **attrs)

    def add_actors(
        self, names: list[str], node_type: str = "actor"
    ) -> None:
        for name in names:
            self.add_actor(name, node_type)

    def add_edge(
        self,
        source: str,
        target: str,
        weight: float = 1.0,
        edge_type: str = "mencion",
    ) -> None:
        self._edges.append({
            "source": source,
            "target": target,
            "weight": weight,
            "edge_type": edge_type,
        })
        if self._G is not None:
            if not self._G.has_node(source):
                self._G.add_node(source, node_type="actor")
            if not self._G.has_node(target):
                self._G.add_node(target, node_type="actor")
            self._G.add_edge(source, target, weight=weight, edge_type=edge_type)

    def build_from_mentions(
        self,
        mention_records: list[dict[str, Any]],
    ) -> None:
        """
        Construye el grafo desde registros de menciones.

        Formato: [{"source": "actor1", "target": "actor2", "count": 5}]
        """
        for rec in mention_records:
            source = str(rec.get("source", ""))
            target = str(rec.get("target", ""))
            count = float(rec.get("count", 1))
            edge_type = str(rec.get("type", "mencion"))
            if source and target:
                self.add_edge(source, target, weight=count, edge_type=edge_type)

    # ------------------------------------------------------------------
    # Analisis principal
    # ------------------------------------------------------------------

    def analyze(self) -> InfluenceGraphResult:
        """Ejecuta el analisis completo del grafo."""
        if self._G is None:
            return InfluenceGraphResult(
                is_available=False, error="networkx no disponible"
            )

        if len(self._G.nodes) == 0:
            return InfluenceGraphResult(
                is_available=False, error="Grafo vacio"
            )

        try:
            import networkx as nx

            # PageRank
            try:
                pagerank = nx.pagerank(self._G, weight="weight")
            except Exception:
                pagerank = {n: 1.0 / len(self._G.nodes) for n in self._G.nodes}

            # Betweenness centrality
            try:
                betweenness = nx.betweenness_centrality(self._G, weight="weight")
            except Exception:
                betweenness = {n: 0.0 for n in self._G.nodes}

            # Community detection
            communities = self._detect_communities()

            # Construir nodos
            nodes = []
            for node_id in self._G.nodes:
                nodes.append(InfluenceNode(
                    id=str(node_id),
                    type=self._node_types.get(str(node_id), "actor"),
                    pagerank=round(float(pagerank.get(node_id, 0)), 6),
                    betweenness=round(float(betweenness.get(node_id, 0)), 6),
                    in_degree=int(self._G.in_degree(node_id)),
                    out_degree=int(self._G.out_degree(node_id)),
                    community=communities.get(str(node_id), -1),
                    attributes=self._node_attrs.get(str(node_id), {}),
                ))

            # Top influencers por PageRank
            top_influencers = sorted(
                nodes, key=lambda n: n.pagerank, reverse=True
            )[:10]

            # Bridge actors por betweenness
            bridge_actors = sorted(
                nodes, key=lambda n: n.betweenness, reverse=True
            )[:5]

            # Grupos por comunidad
            comm_groups: dict[int, list[str]] = {}
            for node in nodes:
                if node.community >= 0:
                    comm_groups.setdefault(node.community, []).append(node.id)

            edges = [
                InfluenceEdge(
                    source=str(e[0]),
                    target=str(e[1]),
                    weight=float(self._G.edges[e].get("weight", 1.0)),
                    edge_type=str(self._G.edges[e].get("edge_type", "mencion")),
                )
                for e in self._G.edges
            ]

            return InfluenceGraphResult(
                nodes=nodes,
                edges=edges,
                top_influencers=[n.id for n in top_influencers],
                bridge_actors=[n.id for n in bridge_actors],
                communities=comm_groups,
            )

        except Exception as exc:
            logger.warning("InfluenceGraphAnalyzer.analyze error: %s", exc)
            return InfluenceGraphResult(is_available=False, error=str(exc))

    def _detect_communities(self) -> dict[str, int]:
        """Deteccion de comunidades con Louvain o Girvan-Newman como fallback."""
        try:
            import community as community_louvain  # type: ignore[import]
            import networkx as nx
            G_undirected = self._G.to_undirected()
            partition = community_louvain.best_partition(G_undirected)
            return {str(k): v for k, v in partition.items()}
        except ImportError:
            pass

        try:
            import networkx as nx
            G_undirected = self._G.to_undirected()
            comp = nx.algorithms.community.girvan_newman(G_undirected)
            communities_iter = next(iter(comp))
            partition = {}
            for i, community in enumerate(communities_iter):
                for node in community:
                    partition[str(node)] = i
            return partition
        except Exception:
            return {}

    # ------------------------------------------------------------------
    # SIR Model
    # ------------------------------------------------------------------

    def simulate_narrative_spread(
        self,
        narrative: str,
        seed_actors: list[str],
        beta: float = 0.3,        # tasa de infeccion
        gamma: float = 0.1,       # tasa de recuperacion
        time_steps: int = 20,
    ) -> SIRSimulationResult:
        """
        Simula la difusion de una narrativa en el grafo con modelo SIR.

        Args:
            narrative: nombre de la narrativa a simular
            seed_actors: actores que adoptan la narrativa inicialmente
            beta: probabilidad de contagio por contacto
            gamma: probabilidad de recuperacion (dejar de propagar)
            time_steps: pasos de tiempo de la simulacion
        """
        if self._G is None:
            return SIRSimulationResult(
                narrative=narrative,
                initial_seed=seed_actors,
                time_steps=time_steps,
            )

        import random

        nodes = list(self._G.nodes)
        S = set(nodes) - set(seed_actors)  # Susceptibles
        I = set(n for n in seed_actors if n in self._G.nodes)  # Infectados
        R: set[str] = set()  # Recuperados

        peak_infected = len(I)
        peak_step = 0

        for step in range(time_steps):
            new_infected: set[str] = set()
            new_recovered: set[str] = set()

            for infected_node in I:
                # Intentar infectar a los vecinos
                for neighbor in self._G.neighbors(infected_node):
                    if neighbor in S:
                        weight = self._G.edges[infected_node, neighbor].get("weight", 1.0)
                        p_infect = min(1.0, beta * weight / 10.0)
                        if random.random() < p_infect:
                            new_infected.add(neighbor)

                # Recuperacion
                if random.random() < gamma:
                    new_recovered.add(infected_node)

            S -= new_infected
            I = (I | new_infected) - new_recovered
            R |= new_recovered

            if len(I) > peak_infected:
                peak_infected = len(I)
                peak_step = step + 1

        return SIRSimulationResult(
            narrative=narrative,
            initial_seed=seed_actors,
            time_steps=time_steps,
            susceptible_final=list(S),
            infected_final=list(I),
            recovered_final=list(R),
            peak_infected_count=peak_infected,
            peak_step=peak_step,
            total_reached=len(I) + len(R),
        )
