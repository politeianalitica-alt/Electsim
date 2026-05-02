"""
Tests para agents/orchestrator/router.py

Usa el runner sin LangGraph para evitar dependencia de la libreria.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from agents.orchestrator.state import initial_state
from agents.orchestrator.router import run_pipeline_without_langgraph


def make_mock_engine():
    engine = MagicMock()
    engine.is_available = AsyncMock(return_value=True)
    engine.generate = AsyncMock(return_value="Respuesta del modelo.")
    engine.extract_json = AsyncMock(return_value={})
    engine.model_for_role = MagicMock(return_value="gemma3:12b")
    engine.market_id = "ES"
    engine.sector_ids = ["PARTY"]
    engine._cb = MagicMock()
    engine._cb.allow_request = MagicMock(return_value=True)
    engine._session = MagicMock()
    return engine


class TestRunPipelineWithoutLangGraph:
    @pytest.mark.asyncio
    async def test_pipeline_runs_all_nodes(self):
        engine = make_mock_engine()
        state = initial_state(
            texts=["Sanchez anuncia reforma fiscal importante"],
            focus_actors=["Pedro Sanchez"],
        )

        result = await run_pipeline_without_langgraph(state, engine)

        assert "meta_nodes_executed" in result
        executed = result["meta_nodes_executed"]
        assert "data_collector" in executed
        assert "context_builder" in executed
        assert "analyst" in executed
        assert "critic" in executed
        assert "synthesizer" in executed
        assert "alert_trigger" in executed

    @pytest.mark.asyncio
    async def test_pipeline_returns_elapsed_time(self):
        from agents.orchestrator.router import run_graph
        engine = make_mock_engine()
        state = initial_state(texts=["texto corto"])
        result = await run_graph(state, engine)
        assert "meta_elapsed" in result
        assert result["meta_elapsed"] >= 0

    @pytest.mark.asyncio
    async def test_pipeline_increments_iteration(self):
        engine = make_mock_engine()
        state = initial_state(texts=["texto"])
        result = await run_pipeline_without_langgraph(state, engine)
        assert result.get("meta_iteration", 0) >= 1

    @pytest.mark.asyncio
    async def test_critic_does_not_require_rerun_with_assessments(self):
        """Con assessments validos, el critic no debe solicitar re-ejecucion."""
        engine = make_mock_engine()

        # Pre-poblamos con assessments para que el critic no solicite rerun
        state = initial_state(
            texts=["texto"],
            focus_actors=["Sanchez"],
        )
        state["analysis_assessments"] = [
            {
                "actor": "Sanchez",
                "position_summary": "Posicion estable",
                "trend_direction": "estable",
                "trend_confidence": 0.7,
                "risks": [],
                "opportunities": [],
                "executive_summary": "Resumen del actor Sanchez",
                "has_critical_risk": False,
            }
        ]

        result = await run_pipeline_without_langgraph(state, engine)
        # El pipeline debe completarse sin excepcion
        assert "synthesizer" in result.get("meta_nodes_executed", [])


class TestBuildGraph:
    def test_build_graph_without_langgraph(self):
        from agents.orchestrator.router import build_graph
        engine = make_mock_engine()
        # Si langgraph no esta instalado, debe retornar None sin excepcion
        graph = build_graph(engine)
        # Puede ser None o un grafo compilado
        assert graph is None or hasattr(graph, "ainvoke")
