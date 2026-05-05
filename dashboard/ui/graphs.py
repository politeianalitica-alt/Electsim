"""
Graphs — Bloque 12.

Grafos de red, actores, linaje y coaliciones.
NetworkX + Plotly como base; PyVis opcional.
"""
from __future__ import annotations

import logging
from typing import Any

import streamlit as st

from dashboard.ui.tokens import BG2, BORDER, CYAN, BLUE, PURPLE, TEXT, TEXT2, MUTED
from dashboard.ui.empty_states import no_data_state, missing_dependency_state

logger = logging.getLogger(__name__)


def _has_plotly() -> bool:
    try:
        import plotly  # noqa: F401
        return True
    except ImportError:
        return False


def _has_networkx() -> bool:
    try:
        import networkx  # noqa: F401
        return True
    except ImportError:
        return False


def _has_pyvis() -> bool:
    try:
        import pyvis  # noqa: F401
        return True
    except ImportError:
        return False


# ── render_network_graph ───────────────────────────────────────────────────────

def render_network_graph(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    layout: str = "spring",
    title: str | None = None,
    height: int = 500,
    node_color_field: str = "group",
    node_size_field: str | None = "weight",
) -> None:
    """
    Grafo de red genérico con NetworkX + Plotly.

    Args:
        nodes: Lista de dicts con {id, label, group?, weight?, ...}.
        edges: Lista de dicts con {source, target, weight?, label?}.
        layout: Algoritmo de layout ("spring", "circular", "kamada_kawai").
        title: Título del grafo.
        height: Altura.
        node_color_field: Campo para colorear nodos.
        node_size_field: Campo para tamaño de nodos.
    """
    if not nodes:
        no_data_state("Grafo de red")
        return

    if not _has_plotly() or not _has_networkx():
        _render_graph_table_fallback(nodes, edges, title)
        return

    try:
        import networkx as nx
        import plotly.graph_objects as go

        G = nx.DiGraph() if any(e.get("directed") for e in edges) else nx.Graph()
        for n in nodes:
            G.add_node(n["id"], **{k: v for k, v in n.items() if k != "id"})
        for e in edges:
            G.add_edge(e["source"], e["target"],
                       weight=e.get("weight", 1), label=e.get("label", ""))

        layouts = {
            "spring": nx.spring_layout,
            "circular": nx.circular_layout,
            "kamada_kawai": nx.kamada_kawai_layout,
            "spectral": nx.spectral_layout,
        }
        layout_fn = layouts.get(layout, nx.spring_layout)
        pos = layout_fn(G, seed=42)

        # Colores por grupo
        groups = list({n.get(node_color_field, "default") for n in nodes})
        palette = [CYAN, BLUE, PURPLE, "#10B981", "#F59E0B", "#EF4444", "#EC4899"]
        group_color = {g: palette[i % len(palette)] for i, g in enumerate(groups)}

        # Trazas de aristas
        edge_x, edge_y = [], []
        for e in G.edges():
            x0, y0 = pos[e[0]]
            x1, y1 = pos[e[1]]
            edge_x += [x0, x1, None]
            edge_y += [y0, y1, None]

        edge_trace = go.Scatter(
            x=edge_x, y=edge_y, mode="lines",
            line=dict(width=0.8, color=BORDER),
            hoverinfo="none",
        )

        # Trazas de nodos
        node_x = [pos[n][0] for n in G.nodes()]
        node_y = [pos[n][1] for n in G.nodes()]
        node_data = [G.nodes[n] for n in G.nodes()]
        node_colors = [group_color.get(nd.get(node_color_field, "default"), CYAN)
                       for nd in node_data]
        node_labels = [nd.get("label", nid) for nid, nd in zip(G.nodes(), node_data)]
        node_sizes = [max(10, min(30, float(nd.get(node_size_field, 10)) * 5))
                      if node_size_field else 12 for nd in node_data]

        node_trace = go.Scatter(
            x=node_x, y=node_y, mode="markers+text",
            marker=dict(size=node_sizes, color=node_colors, line=dict(width=1, color=BORDER)),
            text=node_labels,
            textposition="top center",
            textfont=dict(color=TEXT2, size=10),
            hoverinfo="text",
        )

        fig = go.Figure(data=[edge_trace, node_trace])
        fig.update_layout(
            title=dict(text=title or "Grafo de red", font=dict(color=TEXT, size=13)),
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            showlegend=False, height=height,
            xaxis=dict(showgrid=False, zeroline=False, visible=False),
            yaxis=dict(showgrid=False, zeroline=False, visible=False),
            margin=dict(l=10, r=10, t=50, b=10),
        )
        st.plotly_chart(fig, use_container_width=True)

    except Exception as exc:
        logger.warning("Error renderizando grafo: %s", exc)
        _render_graph_table_fallback(nodes, edges, title)


def _render_graph_table_fallback(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    title: str | None,
) -> None:
    """Fallback: muestra tabla de nodos y aristas."""
    if title:
        st.markdown(f"**{title}** *(vista de tabla — sin librería de grafos)*")
    col1, col2 = st.columns(2)
    with col1:
        st.caption(f"Nodos ({len(nodes)})")
        try:
            import pandas as pd
            st.dataframe(pd.DataFrame(nodes).head(20), use_container_width=True, hide_index=True)
        except Exception:
            st.json(nodes[:5])
    with col2:
        st.caption(f"Aristas ({len(edges)})")
        try:
            import pandas as pd
            st.dataframe(pd.DataFrame(edges).head(20), use_container_width=True, hide_index=True)
        except Exception:
            st.json(edges[:5])


# ── render_actor_graph ─────────────────────────────────────────────────────────

def render_actor_graph(
    graph_data: dict[str, Any],
    title: str = "Mapa de Actores",
    height: int = 500,
) -> None:
    """
    Grafo de actores y sus relaciones.

    Args:
        graph_data: Dict con {nodes: [...], edges: [...]} donde cada node tiene
            {id, label, type (partido/actor/org), risk_score?, party?}.
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    # Colorear por tipo de actor
    for n in nodes:
        if not n.get("group"):
            n["group"] = n.get("type", "actor")

    render_network_graph(
        nodes=nodes,
        edges=edges,
        layout="spring",
        title=title,
        height=height,
        node_color_field="group",
        node_size_field="risk_score",
    )


# ── render_lineage_graph ───────────────────────────────────────────────────────

def render_lineage_graph(
    graph_data: dict[str, Any],
    title: str = "Linaje de datos",
    height: int = 400,
) -> None:
    """
    Grafo de linaje de datos (fuentes → transformaciones → outputs).

    Args:
        graph_data: Dict con {nodes: [...], edges: [...]}.
    """
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    # Asignar grupos por tipo
    for n in nodes:
        node_type = n.get("type", "transform")
        n["group"] = node_type

    render_network_graph(
        nodes=nodes,
        edges=edges,
        layout="kamada_kawai",
        title=title,
        height=height,
        node_color_field="group",
    )


# ── render_coalition_graph ─────────────────────────────────────────────────────

def render_coalition_graph(
    coalitions: list[dict[str, Any]],
    title: str = "Mapa de Coaliciones",
    height: int = 450,
) -> None:
    """
    Grafo de coaliciones políticas.

    Args:
        coalitions: Lista de dicts con {parties: [...], name, seats, viable}.
    """
    if not coalitions:
        no_data_state("Coaliciones")
        return

    # Construir nodos y aristas desde coaliciones
    party_nodes: dict[str, dict] = {}
    edges: list[dict] = []

    for coalition in coalitions:
        parties = coalition.get("parties", [])
        coalition_name = coalition.get("name", "Coalición")
        seats = coalition.get("seats", 0)
        viable = coalition.get("viable", True)

        for party in parties:
            if party not in party_nodes:
                from dashboard.ui.tokens import get_party_color
                party_nodes[party] = {
                    "id": party,
                    "label": party,
                    "group": "party",
                    "color": get_party_color(party),
                }

        # Crear aristas entre todos los partidos de la coalición
        for i, p1 in enumerate(parties):
            for p2 in parties[i + 1:]:
                edges.append({
                    "source": p1,
                    "target": p2,
                    "weight": seats / 100 if seats else 1,
                    "label": coalition_name,
                    "viable": viable,
                })

    render_network_graph(
        nodes=list(party_nodes.values()),
        edges=edges,
        layout="circular",
        title=title,
        height=height,
        node_color_field="group",
    )
