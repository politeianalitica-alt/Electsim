"""
Router del LangGraph Orchestrator.

Construye el StateGraph con los nodos de analisis de inteligencia politica.

Flujo principal:
  data_collector -> context_builder -> analyst -> critic -> [rerun?] -> synthesizer -> alert_trigger -> END

Edge condicional:
  critic -> analyst si critic_requires_rerun y meta_iteration < MAX_ITERATIONS
  critic -> synthesizer en caso contrario

Nota sobre LangGraph:
  Se usa la API de LangGraph >= 0.2 (StateGraph con add_node/add_edge como metodos).
  La version exacta debe fijarse en requirements: langgraph>=0.2.0,<0.3.0

  Si LangGraph no esta instalado, se ofrece un runner alternativo
  (run_pipeline_without_langgraph) que ejecuta los nodos de forma secuencial.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from agents.orchestrator.state import AnalysisState

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 2


# ---------------------------------------------------------------------------
# Builder del grafo LangGraph
# ---------------------------------------------------------------------------

def build_graph(engine: Any) -> Any:
    """
    Construye el StateGraph de LangGraph.

    Args:
        engine: OllamaEngine ya inicializado (se inyecta en cada nodo)

    Returns:
        StateGraph compilado o None si LangGraph no esta disponible
    """
    try:
        from langgraph.graph import StateGraph, END  # type: ignore[import]
    except ImportError:
        logger.warning("langgraph no instalado — usar run_pipeline_without_langgraph()")
        return None

    from agents.orchestrator.nodes.data_collector import data_collector_node
    from agents.orchestrator.nodes.context_builder import context_builder_node
    from agents.orchestrator.nodes.analyst import analyst_node
    from agents.orchestrator.nodes.critic import critic_node
    from agents.orchestrator.nodes.synthesizer import synthesizer_node
    from agents.orchestrator.nodes.alert_trigger import alert_trigger_node

    # Wrappear nodos para inyectar engine
    async def _data_collector(state: AnalysisState) -> AnalysisState:
        return await data_collector_node(dict(state), engine)  # type: ignore[return-value]

    async def _context_builder(state: AnalysisState) -> AnalysisState:
        return await context_builder_node(dict(state), engine)  # type: ignore[return-value]

    async def _analyst(state: AnalysisState) -> AnalysisState:
        return await analyst_node(dict(state), engine)  # type: ignore[return-value]

    async def _critic(state: AnalysisState) -> AnalysisState:
        return await critic_node(dict(state), engine)  # type: ignore[return-value]

    async def _synthesizer(state: AnalysisState) -> AnalysisState:
        return await synthesizer_node(dict(state), engine)  # type: ignore[return-value]

    async def _alert_trigger(state: AnalysisState) -> AnalysisState:
        return await alert_trigger_node(dict(state), engine)  # type: ignore[return-value]

    def _should_rerun(state: AnalysisState) -> str:
        if (
            state.get("critic_requires_rerun")
            and state.get("meta_iteration", 0) < MAX_ITERATIONS
        ):
            return "analyst"
        return "synthesizer"

    # Construccion del grafo
    graph = StateGraph(AnalysisState)

    graph.add_node("data_collector", _data_collector)
    graph.add_node("context_builder", _context_builder)
    graph.add_node("analyst", _analyst)
    graph.add_node("critic", _critic)
    graph.add_node("synthesizer", _synthesizer)
    graph.add_node("alert_trigger", _alert_trigger)

    graph.set_entry_point("data_collector")

    graph.add_edge("data_collector", "context_builder")
    graph.add_edge("context_builder", "analyst")
    graph.add_edge("analyst", "critic")
    graph.add_conditional_edges("critic", _should_rerun, {
        "analyst": "analyst",
        "synthesizer": "synthesizer",
    })
    graph.add_edge("synthesizer", "alert_trigger")
    graph.add_edge("alert_trigger", END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Runner sin LangGraph (fallback secuencial)
# ---------------------------------------------------------------------------

async def run_pipeline_without_langgraph(
    state: dict[str, Any],
    engine: Any,
) -> dict[str, Any]:
    """
    Ejecuta el pipeline de forma secuencial sin LangGraph.

    Util para tests y entornos donde langgraph no esta instalado.
    """
    from agents.orchestrator.nodes.data_collector import data_collector_node
    from agents.orchestrator.nodes.context_builder import context_builder_node
    from agents.orchestrator.nodes.analyst import analyst_node
    from agents.orchestrator.nodes.critic import critic_node
    from agents.orchestrator.nodes.synthesizer import synthesizer_node
    from agents.orchestrator.nodes.alert_trigger import alert_trigger_node

    state = await data_collector_node(state, engine)
    state = await context_builder_node(state, engine)

    for _ in range(MAX_ITERATIONS):
        state = await analyst_node(state, engine)
        state = await critic_node(state, engine)
        if not state.get("critic_requires_rerun"):
            break

    state = await synthesizer_node(state, engine)
    state = await alert_trigger_node(state, engine)

    return state


async def run_graph(
    initial_state: dict[str, Any],
    engine: Any,
) -> dict[str, Any]:
    """
    Punto de entrada principal.
    Intenta usar LangGraph; si no esta disponible, usa el runner secuencial.
    """
    import time
    t = time.monotonic()

    graph = build_graph(engine)

    if graph is None:
        result = await run_pipeline_without_langgraph(initial_state, engine)
    else:
        try:
            result = await graph.ainvoke(initial_state)
        except Exception as exc:
            logger.warning("LangGraph ainvoke error: %s — fallback a secuencial", exc)
            result = await run_pipeline_without_langgraph(initial_state, engine)

    result["meta_elapsed"] = time.monotonic() - t
    logger.info(
        "Graph completado en %.1fs — nodos: %s",
        result["meta_elapsed"],
        result.get("meta_nodes_executed", []),
    )
    return result
