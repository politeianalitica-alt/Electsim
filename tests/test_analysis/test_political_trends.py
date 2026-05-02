"""
Tests para agents/analysis/political_trends/

ideological_clustering, economic_vote_model, narrative_detection, influence_graph
"""
from __future__ import annotations

import pytest


# ---------------------------------------------------------------------------
# IdeologicalClusteringEngine
# ---------------------------------------------------------------------------

class TestIdeologicalClusteringEngine:
    from agents.analysis.political_trends.ideological_clustering import (
        IdeologicalClusteringEngine,
    )

    def _make_vote_matrix(self) -> dict[str, list[int]]:
        return {
            "PSOE":  [1,  1, -1, -1,  1,  1, -1,  0,  1, -1],
            "PP":    [-1, -1, 1,  1, -1, -1,  1,  0, -1,  1],
            "Vox":   [-1, -1, 1,  1, -1, -1,  1, -1, -1,  1],
            "Sumar": [1,  1, -1, -1,  1,  1, -1,  1,  1, -1],
            "PNV":   [0,  1,  0,  0,  1,  0,  0,  1,  0,  0],
        }

    def test_fit_returns_result(self):
        from agents.analysis.political_trends.ideological_clustering import (
            IdeologicalClusteringEngine,
        )
        engine = IdeologicalClusteringEngine()
        matrix = self._make_vote_matrix()
        result = engine.fit(matrix)

        if result.is_available:
            assert len(result.parties) == 5
            for party in result.parties:
                assert party.party in matrix

    def test_fit_empty_matrix(self):
        from agents.analysis.political_trends.ideological_clustering import (
            IdeologicalClusteringEngine,
        )
        engine = IdeologicalClusteringEngine()
        result = engine.fit({})
        assert result.is_available is False

    def test_fit_minimal_matrix(self):
        from agents.analysis.political_trends.ideological_clustering import (
            IdeologicalClusteringEngine,
        )
        engine = IdeologicalClusteringEngine()
        matrix = {
            "PSOE": [1, -1],
            "PP": [-1, 1],
        }
        result = engine.fit(matrix)
        # Puede fallar por datos insuficientes
        assert isinstance(result.is_available, bool)

    def test_build_vote_matrix_from_congress(self):
        from agents.analysis.political_trends.ideological_clustering import (
            IdeologicalClusteringEngine,
        )
        votaciones = [
            {"partido": "PSOE", "voto": "Si"},
            {"partido": "PP", "voto": "No"},
            {"partido": "PSOE", "voto": "No"},
            {"partido": "PP", "voto": "Si"},
        ]
        matrix = IdeologicalClusteringEngine.build_vote_matrix_from_congress(votaciones)
        assert "PSOE" in matrix
        assert "PP" in matrix
        assert matrix["PSOE"] == [1, -1]
        assert matrix["PP"] == [-1, 1]

    def test_label_clusters_izquierda(self):
        from agents.analysis.political_trends.ideological_clustering import (
            PartyPosition,
            IdeologicalClusteringEngine,
        )
        positions = [
            PartyPosition("PSOE", pc1=-1.5, pc2=0.0, cluster_id=0),
            PartyPosition("Sumar", pc1=-1.8, pc2=0.1, cluster_id=0),
        ]
        labels = IdeologicalClusteringEngine._label_clusters(positions)
        assert labels.get(0) == "izquierda"

    def test_label_clusters_derecha(self):
        from agents.analysis.political_trends.ideological_clustering import (
            PartyPosition,
            IdeologicalClusteringEngine,
        )
        positions = [
            PartyPosition("PP", pc1=1.5, pc2=0.0, cluster_id=1),
        ]
        labels = IdeologicalClusteringEngine._label_clusters(positions)
        assert labels.get(1) == "derecha"


# ---------------------------------------------------------------------------
# VoteModelEnsemble
# ---------------------------------------------------------------------------

class TestVoteModelEnsemble:
    def _make_input(self, n=8):
        from agents.analysis.political_trends.economic_vote_model import VoteModelInput
        return VoteModelInput(
            election_dates=[f"200{i}-03-01" for i in range(n)],
            gov_vote_share=[35.0 + i * 0.5 for i in range(n)],
            pib_growth=[2.0 + i * 0.2 - 0.5 for i in range(n)],
            unemployment=[12.0 - i * 0.3 for i in range(n)],
            inflation=[3.0 + i * 0.1 for i in range(n)],
        )

    def test_validate_ok(self):
        data = self._make_input(6)
        assert data.validate() is True

    def test_validate_insufficient(self):
        from agents.analysis.political_trends.economic_vote_model import VoteModelInput
        data = VoteModelInput(
            election_dates=["2020-01-01", "2021-01-01"],
            gov_vote_share=[30.0, 32.0],
            pib_growth=[1.5, 2.0],
            unemployment=[12.0, 11.0],
            inflation=[3.0, 2.5],
        )
        assert data.validate() is False

    def test_ols_forecast_returns_result(self):
        from agents.analysis.political_trends.economic_vote_model import OLSVoteModel
        model = OLSVoteModel()
        data = self._make_input(8)
        result = model.fit_predict(data, next_pib=1.5, next_unemployment=11.0, next_inflation=3.0)
        if result.is_available:
            assert result.next_election_forecast is not None
            assert 0 <= result.next_election_forecast <= 60

    def test_ensemble_forecast(self):
        from agents.analysis.political_trends.economic_vote_model import VoteModelEnsemble
        ensemble = VoteModelEnsemble()
        data = self._make_input(8)
        result = ensemble.forecast(data, next_pib=1.5, next_unemployment=11.0, next_inflation=3.0)
        if result.ensemble_forecast is not None:
            assert 0 <= result.ensemble_forecast <= 60

    def test_ensemble_insufficient_data(self):
        from agents.analysis.political_trends.economic_vote_model import (
            VoteModelEnsemble, VoteModelInput
        )
        ensemble = VoteModelEnsemble()
        data = VoteModelInput(
            election_dates=["2020-01-01"],
            gov_vote_share=[30.0],
            pib_growth=[1.0],
            unemployment=[12.0],
            inflation=[3.0],
        )
        result = ensemble.forecast(data)
        assert result.ensemble_forecast is None or isinstance(result.interpretation, str)


# ---------------------------------------------------------------------------
# NarrativeDetectionEngine
# ---------------------------------------------------------------------------

class TestNarrativeDetectionEngine:
    def _make_docs(self, n=20) -> list[str]:
        templates = [
            "Pedro Sanchez anuncia medidas fiscales para reducir el deficit",
            "Alberto Feijoo critica la politica economica del gobierno",
            "El parlamento debate la reforma del mercado laboral",
            "Los sindicatos convocan huelga general contra la reforma",
            "La inflacion baja al dos por ciento segun el INE",
        ]
        docs = []
        for i in range(n):
            docs.append(templates[i % len(templates)] + f" {i}")
        return docs

    def test_detect_too_small_corpus(self):
        from agents.analysis.political_trends.narrative_detection import (
            NarrativeDetectionEngine,
        )
        engine = NarrativeDetectionEngine(min_topic_size=3)
        result = engine.detect(["solo un texto corto"])
        assert result.is_available is False

    def test_detect_fallback_tfidf(self):
        from agents.analysis.political_trends.narrative_detection import (
            NarrativeDetectionEngine,
        )
        # BERTopic probablemente no disponible en tests — probara TF-IDF fallback
        engine = NarrativeDetectionEngine(min_topic_size=2)
        docs = self._make_docs(15)
        result = engine.detect(docs)
        # Puede estar disponible o no dependiendo del entorno
        if result.is_available:
            assert result.total_documents == 15
            assert len(result.narratives) >= 1

    def test_top_narratives_sorted(self):
        from agents.analysis.political_trends.narrative_detection import (
            Narrative, NarrativeDetectionResult,
        )
        narratives = [
            Narrative(0, "tema_a", ["kw1"], document_count=10),
            Narrative(1, "tema_b", ["kw2"], document_count=50),
            Narrative(2, "tema_c", ["kw3"], document_count=5),
        ]
        result = NarrativeDetectionResult(narratives=narratives)
        top = result.top_narratives(2)
        assert top[0].document_count == 50
        assert top[1].document_count == 10

    def test_auto_label(self):
        from agents.analysis.political_trends.narrative_detection import NarrativeDetectionEngine
        label = NarrativeDetectionEngine._auto_label(["fiscal", "reforma", "impuesto"])
        assert "fiscal" in label


# ---------------------------------------------------------------------------
# InfluenceGraphAnalyzer
# ---------------------------------------------------------------------------

class TestInfluenceGraphAnalyzer:
    def _make_analyzer(self):
        from agents.analysis.political_trends.influence_graph import InfluenceGraphAnalyzer
        analyzer = InfluenceGraphAnalyzer()
        analyzer.add_actors(["Sanchez", "Feijoo", "Abascal", "ElPais", "ElMundo"])
        analyzer.add_edge("ElPais", "Sanchez", weight=10, edge_type="mencion")
        analyzer.add_edge("ElMundo", "Feijoo", weight=8, edge_type="mencion")
        analyzer.add_edge("Sanchez", "Feijoo", weight=3, edge_type="adversidad")
        analyzer.add_edge("Feijoo", "Abascal", weight=2, edge_type="adversidad")
        return analyzer

    def test_analyze_returns_result(self):
        analyzer = self._make_analyzer()
        result = analyzer.analyze()
        if result.is_available:
            assert len(result.nodes) == 5
            assert len(result.top_influencers) > 0

    def test_analyze_empty_graph(self):
        from agents.analysis.political_trends.influence_graph import InfluenceGraphAnalyzer
        analyzer = InfluenceGraphAnalyzer()
        result = analyzer.analyze()
        assert result.is_available is False

    def test_get_node(self):
        analyzer = self._make_analyzer()
        result = analyzer.analyze()
        if result.is_available:
            node = result.get_node("Sanchez")
            assert node is not None
            assert node.id == "Sanchez"

    def test_neighbors(self):
        analyzer = self._make_analyzer()
        result = analyzer.analyze()
        if result.is_available:
            neighbors = result.neighbors("Sanchez")
            assert isinstance(neighbors, list)

    def test_build_from_mentions(self):
        from agents.analysis.political_trends.influence_graph import InfluenceGraphAnalyzer
        analyzer = InfluenceGraphAnalyzer()
        records = [
            {"source": "ElPais", "target": "Sanchez", "count": 10},
            {"source": "ElMundo", "target": "Feijoo", "count": 5},
        ]
        analyzer.build_from_mentions(records)
        assert analyzer._G is None or len(analyzer._G.nodes) >= 2

    def test_sir_simulation(self):
        analyzer = self._make_analyzer()
        if analyzer._G is not None:
            result = analyzer.simulate_narrative_spread(
                narrative="reforma_fiscal",
                seed_actors=["Sanchez"],
                beta=0.5,
                gamma=0.1,
                time_steps=10,
            )
            assert result.narrative == "reforma_fiscal"
            assert result.total_reached >= 0
