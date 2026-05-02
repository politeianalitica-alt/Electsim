"""
Tests para agents/orchestrator/state.py
"""
from __future__ import annotations

import pytest

from agents.orchestrator.state import AnalysisState, initial_state


class TestAnalysisState:
    def test_initial_state_defaults(self):
        state = initial_state(texts=["texto de prueba"])
        assert state["input_market_id"] == "ES"
        assert state["input_sector_ids"] == ["PARTY"]
        assert state["meta_iteration"] == 0
        assert state["meta_errors"] == []
        assert state["meta_is_degraded"] is False

    def test_initial_state_with_actors(self):
        state = initial_state(
            texts=["texto"],
            focus_actors=["Sanchez", "Feijoo"],
            market_id="EU",
        )
        assert state["input_focus_actors"] == ["Sanchez", "Feijoo"]
        assert state["input_market_id"] == "EU"

    def test_initial_state_poll_data(self):
        poll = {"PSOE": 28.5, "PP": 33.2}
        state = initial_state(texts=["texto"], poll_data=poll)
        assert state["input_poll_data"]["PSOE"] == 28.5

    def test_initial_state_run_deep_default_true(self):
        state = initial_state(texts=["texto"])
        assert state["input_run_deep"] is True

    def test_initial_state_briefing_type(self):
        state = initial_state(texts=["texto"], briefing_type="evening_digest")
        assert state["input_briefing_type"] == "evening_digest"

    def test_state_is_typeddict(self):
        state = initial_state(texts=["texto"])
        assert isinstance(state, dict)

    def test_state_can_be_updated(self):
        state = initial_state(texts=["texto"])
        state["meta_iteration"] = 1
        state["meta_errors"] = ["error test"]
        assert state["meta_iteration"] == 1
        assert "error test" in state["meta_errors"]

    def test_state_nodes_executed(self):
        state = initial_state(texts=["texto"])
        state["meta_nodes_executed"] = ["data_collector"]
        assert "data_collector" in state["meta_nodes_executed"]
