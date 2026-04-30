"""
Tests del runner del pipeline.
Todos los tests son mock-based, sin BD ni red.
"""
from __future__ import annotations

import time

import pytest

from etl.pipeline.models import IngestionEvent, PipelineResult
from etl.pipeline.runner import run_pipeline_for_event


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_event(
    raw_text: str = "El gobierno aprueba nuevos presupuestos.",
    market_code: str = "test",
    source_id: str = "src_test",
    extra_id: str | None = None,
) -> IngestionEvent:
    uid = extra_id or f"item-{time.time_ns()}"
    return IngestionEvent(
        market_code=market_code,
        source_id=source_id,
        payload={
            "id": uid,
            "title": "Titulo de prueba",
            "content": raw_text,
            "url": f"https://ejemplo.com/{uid}",
        },
    )


# ---------------------------------------------------------------------------
# Tests basicos del runner
# ---------------------------------------------------------------------------

class TestRunPipelineBasic:
    def test_returns_pipeline_result(self):
        event = _make_event()
        result = run_pipeline_for_event(event)
        assert isinstance(result, PipelineResult)

    def test_normalized_document_populated(self):
        event = _make_event(raw_text="Pedro Sanchez visita Barcelona.")
        result = run_pipeline_for_event(event)
        assert result.normalized.market_code == "test"
        assert result.normalized.source_id == "src_test"

    def test_steps_completed_not_empty(self):
        event = _make_event()
        result = run_pipeline_for_event(event)
        assert len(result.steps_completed) > 0

    def test_errors_list_accessible(self):
        event = _make_event()
        result = run_pipeline_for_event(event)
        assert isinstance(result.errors, list)

    def test_nlp_annotations_populated(self):
        event = _make_event(raw_text="El partido gana las elecciones en Madrid.")
        result = run_pipeline_for_event(event, skip_steps=["compute_embedding", "update_cluster"])
        assert result.nlp is not None
        assert isinstance(result.nlp.entities, list)
        assert isinstance(result.nlp.topics, list)
        assert isinstance(result.nlp.sentiment, list)

    def test_sentiment_global_present(self):
        event = _make_event(raw_text="Gran exito y victoria en las elecciones.")
        result = run_pipeline_for_event(event, skip_steps=["compute_embedding", "update_cluster"])
        global_sents = [s for s in result.nlp.sentiment if s.target == "global"]
        assert len(global_sents) == 1


# ---------------------------------------------------------------------------
# Tests de idempotencia (deduplicacion)
# ---------------------------------------------------------------------------

class TestDeduplication:
    def test_duplicate_event_skipped(self):
        uid = f"dup-runner-{time.time_ns()}"
        event1 = _make_event(extra_id=uid)
        event2 = _make_event(extra_id=uid)

        result1 = run_pipeline_for_event(event1)
        result2 = run_pipeline_for_event(event2)

        # El segundo debe ser marcado como duplicado
        assert "__skipped_duplicate__" in result2.steps_completed
        # El primero no debe serlo
        assert "__skipped_duplicate__" not in result1.steps_completed

    def test_different_sources_not_deduplicated(self):
        uid = f"diff-src-{time.time_ns()}"
        event1 = _make_event(extra_id=uid, source_id="src_a")
        event2 = _make_event(extra_id=uid, source_id="src_b")

        result1 = run_pipeline_for_event(event1)
        result2 = run_pipeline_for_event(event2)

        assert "__skipped_duplicate__" not in result1.steps_completed
        assert "__skipped_duplicate__" not in result2.steps_completed


# ---------------------------------------------------------------------------
# Tests de skip_steps
# ---------------------------------------------------------------------------

class TestSkipSteps:
    def test_skip_embedding(self):
        event = _make_event()
        result = run_pipeline_for_event(event, skip_steps=["compute_embedding"])
        assert result.vector is None
        assert "compute_embedding" not in result.steps_completed

    def test_skip_ner(self):
        event = _make_event(raw_text="Pedro Sanchez y el PP en el Congreso.")
        result = run_pipeline_for_event(event, skip_steps=["annotate_ner"])
        assert "annotate_ner" not in result.steps_completed
        assert result.nlp.entities == []

    def test_skip_all_nlp(self):
        event = _make_event()
        result = run_pipeline_for_event(
            event,
            skip_steps=["annotate_ner", "classify_topics", "compute_sentiment",
                        "compute_embedding", "update_cluster", "resolve_entities"],
        )
        assert result.nlp.entities == []
        assert result.nlp.topics == []
        assert result.nlp.sentiment == []
        assert result.vector is None


# ---------------------------------------------------------------------------
# Tests de robustez
# ---------------------------------------------------------------------------

class TestRobustness:
    def test_empty_content_no_crash(self):
        event = IngestionEvent(
            market_code="test",
            source_id="src",
            payload={"id": f"empty-{time.time_ns()}"},
        )
        result = run_pipeline_for_event(event)
        assert isinstance(result, PipelineResult)

    def test_html_content_parsed(self):
        html = "<p>El <strong>PSOE</strong> gana en <em>Madrid</em>.</p>"
        event = _make_event(raw_text=html)
        result = run_pipeline_for_event(event, skip_steps=["compute_embedding", "update_cluster"])
        # El HTML debe haberse limpiado
        assert "<" not in result.normalized.raw_text
        assert "PSOE" in result.normalized.raw_text

    def test_no_session_no_crash(self):
        """resolve_entities sin sesion no lanza excepcion."""
        event = _make_event()
        result = run_pipeline_for_event(event, session=None)
        assert isinstance(result, PipelineResult)

    def test_result_serializable(self):
        """PipelineResult debe ser serializable a JSON."""
        import json
        event = _make_event()
        result = run_pipeline_for_event(event, skip_steps=["compute_embedding"])
        dumped = result.model_dump(mode="json")
        # Debe poder serializar a string JSON sin error
        json_str = json.dumps(dumped)
        assert len(json_str) > 0

    def test_alerts_on_negative_content(self):
        text = "crisis grave, escandalo y fracaso del gobierno de sanchez."
        event = _make_event(raw_text=text)
        result = run_pipeline_for_event(
            event,
            entity_watchlist={"sanchez"},
            skip_steps=["compute_embedding", "update_cluster"],
        )
        assert isinstance(result.alerts_triggered, list)
        # Con contenido negativo sobre entidad vigilada puede haber alertas
        # (no forzamos el tipo exacto porque depende de los modelos disponibles)
