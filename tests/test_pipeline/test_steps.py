"""
Tests unitarios de los pasos del pipeline.
No requieren BD, Redis, ni modelos NLP (usan fallbacks).
"""
from __future__ import annotations

import time

import pytest

from etl.pipeline.models import (
    ClusterInfo,
    EntityAnnotation,
    IngestionEvent,
    NLPAnnotations,
    NormalizedDocument,
    PipelineResult,
    SentimentAnnotation,
    TopicAnnotation,
    VectorInfo,
)
from etl.pipeline import steps


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_result(
    raw_text: str = "",
    title: str = "Test",
    market_code: str = "test",
    source_id: str = "src",
    external_id: str = "item-001",
) -> PipelineResult:
    return PipelineResult(
        normalized=NormalizedDocument(
            market_code=market_code,
            source_id=source_id,
            external_id=external_id,
            title=title,
            raw_text=raw_text,
        ),
        nlp=NLPAnnotations(),
    )


# ---------------------------------------------------------------------------
# Paso 1: deduplicacion
# ---------------------------------------------------------------------------

class TestDeduplicate:
    def test_first_call_not_duplicate(self):
        # Usamos external_id unico para evitar colisiones entre tests
        result = _make_result(external_id=f"dedup-test-{time.time_ns()}")
        _, is_dup = steps.deduplicate(result)
        assert is_dup is False

    def test_second_call_is_duplicate(self):
        uid = f"dedup-dup-{time.time_ns()}"
        result1 = _make_result(external_id=uid)
        result2 = _make_result(external_id=uid)
        steps.deduplicate(result1)
        _, is_dup = steps.deduplicate(result2)
        assert is_dup is True

    def test_different_sources_not_duplicate(self):
        uid = f"dedup-src-{time.time_ns()}"
        r1 = _make_result(external_id=uid, source_id="src_a")
        r2 = _make_result(external_id=uid, source_id="src_b")
        steps.deduplicate(r1)
        _, is_dup = steps.deduplicate(r2)
        assert is_dup is False

    def test_step_added_to_completed(self):
        result = _make_result(external_id=f"dedup-step-{time.time_ns()}")
        result, _ = steps.deduplicate(result)
        assert "deduplicate" in result.steps_completed


# ---------------------------------------------------------------------------
# Paso 2: extraccion de texto
# ---------------------------------------------------------------------------

class TestExtractText:
    def test_plain_text_unchanged(self):
        result = _make_result(raw_text="Hola mundo. Este es un texto plano.")
        result = steps.extract_text(result)
        assert "Hola mundo" in result.normalized.raw_text
        assert "extract_text" in result.steps_completed

    def test_html_stripped(self):
        html = "<html><body><p>El <strong>PP</strong> gana las elecciones.</p></body></html>"
        result = _make_result(raw_text=html)
        result = steps.extract_text(result)
        assert "<" not in result.normalized.raw_text
        assert "PP" in result.normalized.raw_text

    def test_script_tags_removed(self):
        html = "<body><script>var x = 1;</script><p>Contenido util</p></body>"
        result = _make_result(raw_text=html)
        result = steps.extract_text(result)
        assert "var x" not in result.normalized.raw_text
        assert "Contenido util" in result.normalized.raw_text

    def test_empty_text_stays_empty(self):
        result = _make_result(raw_text="")
        result = steps.extract_text(result)
        assert result.normalized.raw_text == ""
        assert "extract_text" in result.steps_completed

    def test_content_from_metadata_fallback(self):
        result = _make_result(raw_text="")
        result.normalized.metadata["content"] = "Texto desde metadata"
        result = steps.extract_text(result)
        assert "Texto desde metadata" in result.normalized.raw_text


# ---------------------------------------------------------------------------
# Paso 3: NER
# ---------------------------------------------------------------------------

class TestAnnotateNER:
    def test_returns_entity_list(self):
        text = "Pedro Sanchez y Alberto Feijoo debaten en el Congreso."
        result = _make_result(raw_text=text)
        result = steps.annotate_ner(result)
        assert "annotate_ner" in result.steps_completed
        assert isinstance(result.nlp.entities, list)

    def test_empty_text_no_entities(self):
        result = _make_result(raw_text="")
        result = steps.annotate_ner(result)
        assert result.nlp.entities == []

    def test_entity_annotation_fields(self):
        text = "El PSOE presento su programa electoral en Madrid."
        result = _make_result(raw_text=text)
        result = steps.annotate_ner(result)
        for ent in result.nlp.entities:
            assert hasattr(ent, "text")
            assert hasattr(ent, "label")
            assert hasattr(ent, "score")


# ---------------------------------------------------------------------------
# Paso 5: clasificacion de topicos
# ---------------------------------------------------------------------------

class TestClassifyTopics:
    def test_politics_text(self):
        text = "El gobierno y el congreso debaten sobre las elecciones y el partido."
        result = _make_result(raw_text=text)
        result = steps.classify_topics(result)
        assert "classify_topics" in result.steps_completed
        assert len(result.nlp.topics) > 0
        labels = [t.label for t in result.nlp.topics]
        assert "politics" in labels

    def test_economy_text(self):
        text = "El pib crecio un 2 por ciento. La inflacion y el banco central actuan."
        result = _make_result(raw_text=text)
        result = steps.classify_topics(result)
        labels = [t.label for t in result.nlp.topics]
        assert any("economy" in l or "finance" in l for l in labels)

    def test_empty_text_returns_no_topics_or_default(self):
        result = _make_result(raw_text="")
        result = steps.classify_topics(result)
        assert "classify_topics" in result.steps_completed

    def test_topic_has_score(self):
        result = _make_result(raw_text="El partido gana las elecciones.")
        result = steps.classify_topics(result)
        for topic in result.nlp.topics:
            assert 0.0 <= topic.score <= 1.0


# ---------------------------------------------------------------------------
# Paso 6: sentimiento
# ---------------------------------------------------------------------------

class TestComputeSentiment:
    def test_returns_global_sentiment(self):
        result = _make_result(raw_text="Gran victoria del partido en las elecciones.")
        result = steps.compute_sentiment(result)
        assert "compute_sentiment" in result.steps_completed
        global_sents = [s for s in result.nlp.sentiment if s.target == "global"]
        assert len(global_sents) == 1
        assert global_sents[0].label in ("positive", "negative", "neutral")

    def test_negative_keywords(self):
        text = "crisis grave, escandalo y fracaso absoluto del gobierno."
        result = _make_result(raw_text=text)
        result = steps.compute_sentiment(result)
        global_s = next(s for s in result.nlp.sentiment if s.target == "global")
        assert global_s.label == "negative"

    def test_positive_keywords(self):
        text = "gran exito, victoria celebrada, progreso y acuerdo historico."
        result = _make_result(raw_text=text)
        result = steps.compute_sentiment(result)
        global_s = next(s for s in result.nlp.sentiment if s.target == "global")
        assert global_s.label == "positive"

    def test_empty_text(self):
        result = _make_result(raw_text="")
        result = steps.compute_sentiment(result)
        assert "compute_sentiment" in result.steps_completed


# ---------------------------------------------------------------------------
# Paso 7: embedding
# ---------------------------------------------------------------------------

class TestComputeEmbedding:
    def test_returns_vector_info(self):
        result = _make_result(raw_text="El gobierno anuncia nuevas medidas fiscales.")
        result = steps.compute_embedding(result)
        assert "compute_embedding" in result.steps_completed
        # El hash fallback siempre produce un vector
        assert result.vector is not None
        assert isinstance(result.vector.embedding, list)
        assert result.vector.dim > 0

    def test_empty_text_no_vector(self):
        result = _make_result(raw_text="")
        result = steps.compute_embedding(result)
        assert result.vector is None

    def test_vector_has_expected_dim(self):
        result = _make_result(raw_text="Texto de prueba para embedding.")
        result = steps.compute_embedding(result)
        if result.vector:
            vec = result.vector.embedding
            # El vector debe tener dimension consistente con model_name
            assert result.vector.dim == len(vec)
            assert result.vector.dim > 0


# ---------------------------------------------------------------------------
# Paso 8: cluster update
# ---------------------------------------------------------------------------

class TestUpdateCluster:
    def test_no_vector_returns_empty_cluster(self):
        result = _make_result()
        result.vector = None
        result = steps.update_cluster(result)
        assert "update_cluster" in result.steps_completed
        assert result.cluster is not None

    def test_with_vector_returns_cluster_info(self):
        result = _make_result(raw_text="Texto para clustering.")
        result = steps.compute_embedding(result)
        result = steps.update_cluster(result)
        assert result.cluster is not None
        assert isinstance(result.cluster.is_new_cluster, bool)


# ---------------------------------------------------------------------------
# Paso 9: alertas
# ---------------------------------------------------------------------------

class TestEvaluateAlerts:
    def test_no_alerts_neutral_text(self):
        result = _make_result(raw_text="El tiempo es bueno hoy.")
        result.nlp.entities = []
        result.nlp.topics = []
        result.nlp.sentiment = [SentimentAnnotation(target="global", label="neutral", score=0.5)]
        result = steps.evaluate_alerts(result)
        assert "evaluate_alerts" in result.steps_completed
        # Puede no haber alertas
        assert isinstance(result.alerts_triggered, list)

    def test_entity_watch_trigger(self):
        result = _make_result(raw_text="sanchez habla en el congreso.")
        result.nlp.entities = [EntityAnnotation(text="sanchez", label="PER")]
        result.nlp.topics = []
        result.nlp.sentiment = [SentimentAnnotation(target="global", label="neutral", score=0.5)]
        result = steps.evaluate_alerts(
            result,
            entity_watchlist={"sanchez"},
        )
        alert_types = [a.rule_type for a in result.alerts_triggered]
        assert "entity_watch" in alert_types

    def test_sentiment_spike_trigger(self):
        result = _make_result()
        result.nlp.entities = []
        result.nlp.topics = []
        result.nlp.sentiment = [SentimentAnnotation(target="global", label="negative", score=0.92)]
        result = steps.evaluate_alerts(result)
        alert_types = [a.rule_type for a in result.alerts_triggered]
        assert "sentiment_spike" in alert_types

    def test_fimi_trigger(self):
        result = _make_result()
        result.nlp.entities = [EntityAnnotation(text="feijoo", label="PER")]
        result.nlp.topics = []
        result.nlp.sentiment = [SentimentAnnotation(target="global", label="negative", score=0.91)]
        result = steps.evaluate_alerts(
            result,
            entity_watchlist={"feijoo"},
        )
        alert_types = [a.rule_type for a in result.alerts_triggered]
        assert "fimi" in alert_types

    def test_topic_watch_trigger(self):
        result = _make_result()
        result.nlp.entities = []
        result.nlp.topics = [TopicAnnotation(label="conflict_war_peace", score=0.9)]
        result.nlp.sentiment = [SentimentAnnotation(target="global", label="neutral", score=0.5)]
        result = steps.evaluate_alerts(
            result,
            topic_watchlist={"conflict_war_peace"},
        )
        alert_types = [a.rule_type for a in result.alerts_triggered]
        assert "topic_watch" in alert_types
