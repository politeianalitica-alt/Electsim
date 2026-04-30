"""
Tests del RiskScorer.
Mock-based, sin BD ni LLM real.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.intelligence.models import RiskScore


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_scorer(llm=None, repo=None, session=None):
    from services.intelligence.risk_scorer import RiskScorer
    return RiskScorer(llm=llm, ontology_repo=repo, db_session=session)


# ---------------------------------------------------------------------------
# Tests de compute_components
# ---------------------------------------------------------------------------

class TestComputeComponents:
    def test_returns_four_components(self):
        scorer = _make_scorer()

        async def _run():
            with patch.object(scorer, "_compute_coalition_stability", new=AsyncMock(return_value=0.3)), \
                 patch.object(scorer, "_compute_media_sentiment", new=AsyncMock(return_value=0.4)), \
                 patch.object(scorer, "_compute_legislative_activity", new=AsyncMock(return_value=0.2)), \
                 patch.object(scorer, "_compute_ideological_distance", new=AsyncMock(return_value=0.5)):
                return await scorer.compute_components(
                    "c-001", "spain", datetime.now(timezone.utc)
                )

        components = asyncio.run(_run())
        assert set(components.keys()) == {
            "coalition_stability", "media_sentiment",
            "legislative_activity", "ideological_distance",
        }

    def test_all_components_in_range_zero_one(self):
        scorer = _make_scorer()

        async def _run():
            with patch.object(scorer, "_compute_coalition_stability", new=AsyncMock(return_value=0.7)), \
                 patch.object(scorer, "_compute_media_sentiment", new=AsyncMock(return_value=0.8)), \
                 patch.object(scorer, "_compute_legislative_activity", new=AsyncMock(return_value=0.1)), \
                 patch.object(scorer, "_compute_ideological_distance", new=AsyncMock(return_value=0.6)):
                return await scorer.compute_components("c-001", "spain", datetime.now(timezone.utc))

        components = asyncio.run(_run())
        for k, v in components.items():
            assert 0.0 <= v <= 1.0, f"Componente {k} = {v} fuera de [0, 1]"

    def test_no_session_returns_defaults(self):
        scorer = _make_scorer(session=None)

        async def _run():
            return await scorer.compute_components("c-001", "spain", datetime.now(timezone.utc))

        components = asyncio.run(_run())
        # Con session=None todos los metodos usan valores por defecto
        assert len(components) == 4
        for v in components.values():
            assert 0.0 <= v <= 1.0


# ---------------------------------------------------------------------------
# Tests de score_client
# ---------------------------------------------------------------------------

class TestScoreClient:
    def test_risk_index_in_range_0_100(self):
        scorer = _make_scorer()

        async def _run():
            with patch.object(scorer, "compute_components", new=AsyncMock(return_value={
                "coalition_stability":  0.5,
                "media_sentiment":      0.4,
                "legislative_activity": 0.3,
                "ideological_distance": 0.6,
            })):
                with patch.object(scorer, "_persist_score", new=AsyncMock()):
                    return await scorer.score_client("c-001", "spain")

        score = asyncio.run(_run())
        assert isinstance(score, RiskScore)
        assert 0.0 <= score.risk_index <= 100.0

    def test_high_components_high_risk(self):
        scorer = _make_scorer()

        async def _run():
            with patch.object(scorer, "compute_components", new=AsyncMock(return_value={
                "coalition_stability":  0.9,
                "media_sentiment":      0.85,
                "legislative_activity": 0.8,
                "ideological_distance": 0.95,
            })):
                with patch.object(scorer, "_persist_score", new=AsyncMock()):
                    return await scorer.score_client("c-001", "spain")

        score = asyncio.run(_run())
        assert score.risk_index > 70.0, f"Riesgo alto esperado, obtenido: {score.risk_index}"

    def test_low_components_low_risk(self):
        scorer = _make_scorer()

        async def _run():
            with patch.object(scorer, "compute_components", new=AsyncMock(return_value={
                "coalition_stability":  0.1,
                "media_sentiment":      0.1,
                "legislative_activity": 0.05,
                "ideological_distance": 0.1,
            })):
                with patch.object(scorer, "_persist_score", new=AsyncMock()):
                    return await scorer.score_client("c-001", "spain")

        score = asyncio.run(_run())
        assert score.risk_index < 30.0, f"Riesgo bajo esperado, obtenido: {score.risk_index}"

    def test_components_in_result(self):
        scorer = _make_scorer()
        input_components = {
            "coalition_stability":  0.3,
            "media_sentiment":      0.5,
            "legislative_activity": 0.2,
            "ideological_distance": 0.4,
        }

        async def _run():
            with patch.object(scorer, "compute_components", new=AsyncMock(return_value=input_components)), \
                 patch.object(scorer, "_persist_score", new=AsyncMock()):
                return await scorer.score_client("c-001", "spain")

        score = asyncio.run(_run())
        assert score.components == input_components

    def test_risk_score_persisted(self):
        scorer = _make_scorer()
        persisted: list = []

        async def _fake_persist(score):
            persisted.append(score)

        async def _run():
            with patch.object(scorer, "compute_components", new=AsyncMock(return_value={
                "coalition_stability":  0.3, "media_sentiment": 0.4,
                "legislative_activity": 0.2, "ideological_distance": 0.3,
            })):
                with patch.object(scorer, "_persist_score", new=_fake_persist):
                    return await scorer.score_client("c-001", "spain")

        asyncio.run(_run())
        assert len(persisted) == 1
        assert persisted[0].client_id == "c-001"

    def test_risk_score_serializable(self):
        import json
        scorer = _make_scorer()

        async def _run():
            with patch.object(scorer, "compute_components", new=AsyncMock(return_value={
                "coalition_stability":  0.5, "media_sentiment": 0.4,
                "legislative_activity": 0.3, "ideological_distance": 0.4,
            })), patch.object(scorer, "_persist_score", new=AsyncMock()):
                return await scorer.score_client("c-001", "spain")

        score = asyncio.run(_run())
        # Debe serializable a JSON sin error
        dumped = score.model_dump(mode="json")
        json_str = json.dumps(dumped)
        assert len(json_str) > 0


# ---------------------------------------------------------------------------
# Tests de modelos (validadores)
# ---------------------------------------------------------------------------

class TestRiskScoreModel:
    def test_risk_index_clamped_above_100(self):
        score = RiskScore(client_id="c", risk_index=150.0)
        assert score.risk_index == 100.0

    def test_risk_index_clamped_below_0(self):
        score = RiskScore(client_id="c", risk_index=-10.0)
        assert score.risk_index == 0.0

    def test_components_clamped(self):
        score = RiskScore(
            client_id="c",
            risk_index=50.0,
            components={"dim_a": 1.5, "dim_b": -0.5},
        )
        assert score.components["dim_a"] == 1.0
        assert score.components["dim_b"] == 0.0
