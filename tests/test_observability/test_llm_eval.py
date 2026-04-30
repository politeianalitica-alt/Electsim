"""
Tests para services/llm_eval.py (Bloque 7).
Mock-based: session SQLAlchemy simulada con MagicMock.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.llm_eval import LLMEvalService, _JUDGE_MODEL


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _disable_otel(monkeypatch):
    monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
    from observability.otel import reset_for_testing
    reset_for_testing()
    yield
    reset_for_testing()


def _make_session() -> MagicMock:
    session = MagicMock()
    session.execute = MagicMock(return_value=MagicMock(fetchone=MagicMock(return_value=None)))
    return session


# ---------------------------------------------------------------------------
# log_trace
# ---------------------------------------------------------------------------

class TestLogTrace:
    def test_returns_uuid(self):
        svc = LLMEvalService(_make_session())
        result = svc.log_trace(model="electsim-fast", task_type="classification", latency_ms=100.0)
        assert isinstance(result, uuid.UUID)

    def test_execute_called(self):
        session = _make_session()
        svc = LLMEvalService(session)
        svc.log_trace(model="electsim-fast", task_type="analysis", latency_ms=500.0)
        session.execute.assert_called()

    def test_with_org_and_workspace(self):
        session = _make_session()
        svc = LLMEvalService(session)
        svc.log_trace(
            model="electsim-analysis",
            task_type="summary",
            tokens_in=200,
            tokens_out=80,
            latency_ms=1200.0,
            org_id="org-1",
            workspace_id="ws-1",
        )
        call_params = session.execute.call_args_list[0][0][1]
        assert call_params["org_id"] == "org-1"
        assert call_params["workspace_id"] == "ws-1"

    def test_with_error(self):
        session = _make_session()
        svc = LLMEvalService(session)
        svc.log_trace(
            model="electsim-fast",
            task_type="classification",
            latency_ms=50.0,
            error="timeout",
        )
        call_params = session.execute.call_args_list[0][0][1]
        assert call_params["error"] == "timeout"

    def test_sample_for_eval_is_bool(self):
        session = _make_session()
        svc = LLMEvalService(session)
        svc.log_trace(model="electsim-fast", task_type="chat", latency_ms=300.0)
        call_params = session.execute.call_args_list[0][0][1]
        assert isinstance(call_params["sample_for_eval"], bool)

    def test_trace_id_and_span_id_stored(self):
        session = _make_session()
        svc = LLMEvalService(session)
        svc.log_trace(
            model="electsim-fast",
            task_type="analysis",
            latency_ms=600.0,
            trace_id="abc123",
            span_id="def456",
        )
        call_params = session.execute.call_args_list[0][0][1]
        assert call_params["trace_id"] == "abc123"
        assert call_params["span_id"] == "def456"


# ---------------------------------------------------------------------------
# should_eval
# ---------------------------------------------------------------------------

class TestShouldEval:
    def test_returns_false_when_not_sampled(self):
        session = MagicMock()
        row = MagicMock()
        row.__getitem__ = lambda s, i: False
        session.execute.return_value.fetchone.return_value = (False,)
        svc = LLMEvalService(session)
        assert svc.should_eval(uuid.uuid4()) is False

    def test_returns_true_when_sampled(self):
        session = MagicMock()
        session.execute.return_value.fetchone.return_value = (True,)
        svc = LLMEvalService(session)
        assert svc.should_eval(uuid.uuid4()) is True

    def test_returns_false_when_not_found(self):
        session = MagicMock()
        session.execute.return_value.fetchone.return_value = None
        svc = LLMEvalService(session)
        assert svc.should_eval(uuid.uuid4()) is False


# ---------------------------------------------------------------------------
# run_eval
# ---------------------------------------------------------------------------

class TestRunEval:
    @pytest.mark.anyio
    async def test_run_eval_stores_results(self):
        from pydantic import BaseModel, Field

        session = _make_session()
        svc = LLMEvalService(session)
        trace_id = uuid.uuid4()

        from services.llm_eval import _JudgeScore

        mock_client = MagicMock()
        mock_client.analyze_structured = AsyncMock(
            return_value=_JudgeScore(score=0.85, reasoning="good")
        )

        with patch("services.llm_eval.get_llm_client", return_value=mock_client):
            eval_ids = await svc.run_eval(
                trace_id,
                prompt="Analiza el riesgo regulatorio del BOE",
                response="El BOE publicó nueva normativa...",
                eval_types=("coherence",),
            )

        assert len(eval_ids) == 1
        assert isinstance(eval_ids[0], uuid.UUID)

    @pytest.mark.anyio
    async def test_run_eval_calls_execute_for_each_type(self):
        session = _make_session()
        svc = LLMEvalService(session)
        trace_id = uuid.uuid4()

        from services.llm_eval import _JudgeScore

        mock_client = MagicMock()
        mock_client.analyze_structured = AsyncMock(
            return_value=_JudgeScore(score=0.75, reasoning="ok")
        )

        with patch("services.llm_eval.get_llm_client", return_value=mock_client):
            eval_ids = await svc.run_eval(
                trace_id,
                prompt="test prompt",
                response="test response",
                eval_types=("coherence", "relevance"),
            )

        assert len(eval_ids) == 2
        # Se debe haber llamado execute 2 veces (una por cada eval_type)
        assert session.execute.call_count >= 2

    @pytest.mark.anyio
    async def test_run_eval_handles_judge_error_gracefully(self):
        session = _make_session()
        svc = LLMEvalService(session)
        trace_id = uuid.uuid4()

        mock_client = MagicMock()
        mock_client.analyze_structured = AsyncMock(side_effect=RuntimeError("model unavailable"))

        with patch("services.llm_eval.get_llm_client", return_value=mock_client):
            # No debe lanzar excepcion — debe guardar score 0.0
            eval_ids = await svc.run_eval(
                trace_id,
                prompt="test",
                response="test",
                eval_types=("coherence",),
            )

        assert len(eval_ids) == 1
        # El INSERT se llama con score 0.0
        call_params = session.execute.call_args_list[-1][0][1]
        assert call_params["score"] == 0.0

    @pytest.mark.anyio
    async def test_run_eval_records_quality_metric(self):
        session = _make_session()
        svc = LLMEvalService(session)
        trace_id = uuid.uuid4()

        from services.llm_eval import _JudgeScore

        mock_client = MagicMock()
        mock_client.analyze_structured = AsyncMock(
            return_value=_JudgeScore(score=0.9, reasoning="excellent")
        )

        with patch("services.llm_eval.get_llm_client", return_value=mock_client), \
             patch("services.llm_eval.LLMMetrics") as mock_metrics:
            await svc.run_eval(
                trace_id,
                prompt="test",
                response="test",
                eval_types=("factuality",),
            )
            mock_metrics.record_quality.assert_called_once_with(
                model=_JUDGE_MODEL,
                eval_type="factuality",
                score=0.9,
            )


# ---------------------------------------------------------------------------
# get_recent_scores
# ---------------------------------------------------------------------------

class TestGetRecentScores:
    def test_returns_list(self):
        session = MagicMock()
        session.execute.return_value.fetchall.return_value = []
        svc = LLMEvalService(session)
        result = svc.get_recent_scores(eval_type="coherence", limit=10)
        assert isinstance(result, list)

    def test_maps_rows_correctly(self):
        from datetime import datetime, timezone

        session = MagicMock()
        now = datetime.now(timezone.utc)
        session.execute.return_value.fetchall.return_value = [
            (0.85, "coherence", "electsim-fast", now, "electsim-fast", "analysis", None)
        ]
        svc = LLMEvalService(session)
        result = svc.get_recent_scores(eval_type="coherence")
        assert len(result) == 1
        assert result[0]["score"] == 0.85
        assert result[0]["eval_type"] == "coherence"
        assert result[0]["judge_model"] == "electsim-fast"
