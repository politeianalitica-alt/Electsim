"""
Tests de NarrativeTracker e ImpactAssessor.
Mock-based, sin BD ni LLM real.
"""
from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.intelligence.models import ImpactAssessment, NarrativeLabel


# ---------------------------------------------------------------------------
# NarrativeTracker
# ---------------------------------------------------------------------------

class TestNarrativeTracker:
    def _make_tracker(self, llm=None, repo=None, session=None):
        from services.intelligence.narrative_tracker import NarrativeTracker
        if llm is None:
            llm = MagicMock()
        return NarrativeTracker(llm=llm, ontology_repo=repo, db_session=session)

    def _make_mock_label(self, cluster_id: str = "42") -> NarrativeLabel:
        return NarrativeLabel(
            cluster_id=cluster_id,
            label="Desinformacion sobre el sistema electoral",
            description="Narrativa que cuestiona la fiabilidad del recuento de votos.",
            threat_level="emergente",
            supporting_examples=["Noticia 1", "Noticia 2"],
            entity_mentions=["PP", "PSOE"],
        )

    # ------------------------------------------------------------------
    # Tests de label_cluster
    # ------------------------------------------------------------------

    def test_label_cluster_returns_narrative_label(self):
        mock_label = self._make_mock_label("42")
        mock_llm = MagicMock()

        async def _fake_analyze(*args, **kwargs):
            return mock_label

        mock_llm.analyze_structured = _fake_analyze
        tracker = self._make_tracker(llm=mock_llm)

        async def _run():
            with patch.object(tracker, "_fetch_cluster_examples", new=AsyncMock(return_value=[
                {"title": "Noticia 1", "text": "Texto 1"},
                {"title": "Noticia 2", "text": "Texto 2"},
            ])), patch.object(tracker, "_fetch_cluster_entities", new=AsyncMock(return_value=["PP"])), \
                 patch.object(tracker, "_persist_label", new=AsyncMock()), \
                 patch.object(tracker, "_link_documents_to_cluster", new=AsyncMock()):
                return await tracker.label_cluster("42")

        result = asyncio.run(_run())
        assert isinstance(result, NarrativeLabel)
        assert result.cluster_id == "42"

    def test_label_cluster_uses_correct_cluster_id(self):
        """El cluster_id del resultado debe coincidir con el argumento."""
        tracker = self._make_tracker()

        async def _fake_analyze(*args, **kwargs):
            # El LLM devuelve un cluster_id diferente — debe corregirse
            return NarrativeLabel(
                cluster_id="wrong-id",
                label="Test",
                description="Test description",
                threat_level="ruido",
            )

        tracker.llm.analyze_structured = _fake_analyze

        async def _run():
            with patch.object(tracker, "_fetch_cluster_examples", new=AsyncMock(return_value=[])), \
                 patch.object(tracker, "_fetch_cluster_entities", new=AsyncMock(return_value=[])), \
                 patch.object(tracker, "_persist_label", new=AsyncMock()), \
                 patch.object(tracker, "_link_documents_to_cluster", new=AsyncMock()):
                return await tracker.label_cluster("99")

        result = asyncio.run(_run())
        # El runner debe forzar el cluster_id correcto
        assert result.cluster_id == "99"

    def test_build_label_prompt_includes_examples(self):
        tracker = self._make_tracker()
        examples = [
            {"title": "Titulo 1", "text": "Texto de ejemplo sobre politica."},
            {"title": "Titulo 2", "text": "Segundo texto sobre el partido."},
        ]
        prompt = tracker._build_label_prompt("42", examples, ["PP", "PSOE"])
        assert "Titulo 1" in prompt
        assert "Titulo 2" in prompt
        assert "PP" in prompt

    def test_build_label_prompt_includes_threat_levels(self):
        tracker = self._make_tracker()
        prompt = tracker._build_label_prompt("1", [], [])
        assert "ruido" in prompt
        assert "emergente" in prompt
        assert "crisis" in prompt

    def test_persistence_called(self):
        tracker = self._make_tracker()
        persisted: list = []

        async def _fake_analyze(*args, **kwargs):
            return self._make_mock_label("42")

        tracker.llm.analyze_structured = _fake_analyze

        async def _fake_persist(label):
            persisted.append(label)

        async def _run():
            with patch.object(tracker, "_fetch_cluster_examples", new=AsyncMock(return_value=[])), \
                 patch.object(tracker, "_fetch_cluster_entities", new=AsyncMock(return_value=[])), \
                 patch.object(tracker, "_persist_label", new=_fake_persist), \
                 patch.object(tracker, "_link_documents_to_cluster", new=AsyncMock()):
                return await tracker.label_cluster("42")

        asyncio.run(_run())
        assert len(persisted) == 1
        assert persisted[0].label == "Desinformacion sobre el sistema electoral"

    def test_threat_level_validation(self):
        with pytest.raises(Exception):
            NarrativeLabel(
                cluster_id="1",
                label="Test",
                description="Test",
                threat_level="invalido",   # no es ruido/emergente/crisis
            )

    def test_valid_threat_levels(self):
        for level in ("ruido", "emergente", "crisis"):
            label = NarrativeLabel(
                cluster_id="1", label="Test", description="Test", threat_level=level
            )
            assert label.threat_level == level


# ---------------------------------------------------------------------------
# ImpactAssessor
# ---------------------------------------------------------------------------

class TestImpactAssessor:
    def _make_assessor(self, llm=None, repo=None, session=None):
        from services.intelligence.impact_assessor import ImpactAssessor
        if llm is None:
            llm = MagicMock()
        return ImpactAssessor(llm=llm, ontology_repo=repo, db_session=session)

    def _make_mock_assessment(self) -> ImpactAssessment:
        return ImpactAssessment(
            client_id="c-001",
            object_type="legislation",
            object_id="BOE-A-2026-001",
            impact_score=0.75,
            impact_dimension={
                "regulatory": 0.8,
                "media": 0.4,
                "financial": 0.6,
                "reputational": 0.3,
                "operational": 0.5,
            },
            rationale_markdown="La norma afecta al sector energetico...",
        )

    # ------------------------------------------------------------------
    # Tests de assess
    # ------------------------------------------------------------------

    def test_assess_returns_impact_assessment(self):
        mock_assessment = self._make_mock_assessment()
        mock_llm = MagicMock()

        async def _fake_analyze(*args, **kwargs):
            return mock_assessment

        mock_llm.analyze_structured = _fake_analyze
        assessor = self._make_assessor(llm=mock_llm)

        async def _run():
            with patch.object(assessor, "_fetch_object_context", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_fetch_client_profile", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_persist_assessment", new=AsyncMock()), \
                 patch.object(assessor, "_link_affects_client", new=AsyncMock()):
                return await assessor.assess("c-001", "legislation", "BOE-A-2026-001")

        result = asyncio.run(_run())
        assert isinstance(result, ImpactAssessment)
        assert result.client_id == "c-001"
        assert result.object_type == "legislation"

    def test_assess_corrects_ids(self):
        """El assessor debe corregir client_id/object_type/object_id."""
        mock_llm = MagicMock()

        async def _fake_analyze(*args, **kwargs):
            return ImpactAssessment(
                client_id="wrong",
                object_type="wrong",
                object_id="wrong",
                impact_score=0.5,
            )

        mock_llm.analyze_structured = _fake_analyze
        assessor = self._make_assessor(llm=mock_llm)

        async def _run():
            with patch.object(assessor, "_fetch_object_context", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_fetch_client_profile", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_persist_assessment", new=AsyncMock()), \
                 patch.object(assessor, "_link_affects_client", new=AsyncMock()):
                return await assessor.assess("c-001", "legislation", "BOE-001")

        result = asyncio.run(_run())
        assert result.client_id == "c-001"
        assert result.object_type == "legislation"
        assert result.object_id == "BOE-001"

    def test_high_impact_norm_gets_high_score(self):
        mock_llm = MagicMock()

        async def _fake_analyze(*args, **kwargs):
            return ImpactAssessment(
                client_id="c-001",
                object_type="legislation",
                object_id="BOE-001",
                impact_score=0.92,
                impact_dimension={
                    "regulatory": 0.95, "media": 0.7,
                    "financial": 0.9, "reputational": 0.5, "operational": 0.8,
                },
                rationale_markdown="Norma con alto impacto regulatorio.",
            )

        mock_llm.analyze_structured = _fake_analyze
        assessor = self._make_assessor(llm=mock_llm)

        async def _run():
            with patch.object(assessor, "_fetch_object_context", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_fetch_client_profile", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_persist_assessment", new=AsyncMock()), \
                 patch.object(assessor, "_link_affects_client", new=AsyncMock()):
                return await assessor.assess("c-001", "legislation", "BOE-001")

        result = asyncio.run(_run())
        assert result.impact_score > 0.8

    def test_persist_called(self):
        mock_llm = MagicMock()

        async def _fake_analyze(*args, **kwargs):
            return self._make_mock_assessment()

        mock_llm.analyze_structured = _fake_analyze
        assessor = self._make_assessor(llm=mock_llm)
        persisted: list = []

        async def _fake_persist(a):
            persisted.append(a)

        async def _run():
            with patch.object(assessor, "_fetch_object_context", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_fetch_client_profile", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_persist_assessment", new=_fake_persist), \
                 patch.object(assessor, "_link_affects_client", new=AsyncMock()):
                return await assessor.assess("c-001", "legislation", "BOE-001")

        asyncio.run(_run())
        assert len(persisted) == 1

    def test_affects_client_relation_created(self):
        """Verifica que _link_affects_client se llama tras el assess."""
        mock_llm = MagicMock()

        async def _fake_analyze(*args, **kwargs):
            return self._make_mock_assessment()

        mock_llm.analyze_structured = _fake_analyze
        assessor = self._make_assessor(llm=mock_llm)
        linked: list = []

        async def _fake_link(a):
            linked.append(a)

        async def _run():
            with patch.object(assessor, "_fetch_object_context", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_fetch_client_profile", new=AsyncMock(return_value={})), \
                 patch.object(assessor, "_persist_assessment", new=AsyncMock()), \
                 patch.object(assessor, "_link_affects_client", new=_fake_link):
                return await assessor.assess("c-001", "legislation", "BOE-001")

        asyncio.run(_run())
        assert len(linked) == 1


# ---------------------------------------------------------------------------
# Tests de modelos (validadores)
# ---------------------------------------------------------------------------

class TestImpactAssessmentModel:
    def test_impact_score_clamped_above_1(self):
        a = ImpactAssessment(
            client_id="c", object_type="t", object_id="o", impact_score=1.5
        )
        assert a.impact_score == 1.0

    def test_impact_score_clamped_below_0(self):
        a = ImpactAssessment(
            client_id="c", object_type="t", object_id="o", impact_score=-0.2
        )
        assert a.impact_score == 0.0

    def test_impact_dimension_clamped(self):
        a = ImpactAssessment(
            client_id="c", object_type="t", object_id="o",
            impact_score=0.5,
            impact_dimension={"regulatory": 2.0, "media": -0.5},
        )
        assert a.impact_dimension["regulatory"] == 1.0
        assert a.impact_dimension["media"] == 0.0

    def test_serializable(self):
        a = ImpactAssessment(
            client_id="c", object_type="legislation", object_id="BOE-001",
            impact_score=0.7,
            impact_dimension={"regulatory": 0.8},
            rationale_markdown="Texto de razon.",
        )
        dumped = a.model_dump(mode="json")
        assert json.dumps(dumped)  # no lanza excepcion
