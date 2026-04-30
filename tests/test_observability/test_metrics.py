"""
Tests para observability/metrics.py (Bloque 7).
Verifica que ETLMetrics, LLMMetrics, APIMetrics y measure_ms funcionan
correctamente con el NoOp meter (OTEL_SDK_DISABLED=true en tests).
"""
from __future__ import annotations

import os
import time

import pytest


# Asegurar NoOp en todos los tests de este modulo
@pytest.fixture(autouse=True)
def _disable_otel(monkeypatch):
    monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
    # Invalida el cache del setup para que use el env var
    from observability.otel import reset_for_testing
    reset_for_testing()
    yield
    reset_for_testing()


# ---------------------------------------------------------------------------
# ETLMetrics
# ---------------------------------------------------------------------------

class TestETLMetrics:
    def test_record_step_success_no_crash(self):
        from observability.metrics import ETLMetrics
        ETLMetrics.record_step(
            source_id="boe",
            step="dedupe",
            success=True,
            duration_ms=120.5,
            market="spain",
        )

    def test_record_step_failure_no_crash(self):
        from observability.metrics import ETLMetrics
        ETLMetrics.record_step(
            source_id="boe",
            step="embedding",
            success=False,
            duration_ms=None,
            market="spain",
        )

    def test_record_step_without_duration(self):
        from observability.metrics import ETLMetrics
        ETLMetrics.record_step(
            source_id="moncloa",
            step="ner",
            success=True,
        )

    def test_items_processed_counter_exists(self):
        from observability.metrics import ETLMetrics
        assert ETLMetrics.items_processed is not None

    def test_errors_counter_exists(self):
        from observability.metrics import ETLMetrics
        assert ETLMetrics.errors is not None

    def test_pipeline_duration_histogram_exists(self):
        from observability.metrics import ETLMetrics
        assert ETLMetrics.pipeline_duration is not None


# ---------------------------------------------------------------------------
# LLMMetrics
# ---------------------------------------------------------------------------

class TestLLMMetrics:
    def test_record_call_no_crash(self):
        from observability.metrics import LLMMetrics
        LLMMetrics.record_call(
            model="electsim-fast",
            task_type="classification",
            tokens_in=120,
            tokens_out=40,
            latency_ms=350.0,
        )

    def test_record_call_with_error(self):
        from observability.metrics import LLMMetrics
        LLMMetrics.record_call(
            model="electsim-fast",
            task_type="analysis",
            latency_ms=5000.0,
            error="timeout",
        )

    def test_record_call_minimal_args(self):
        from observability.metrics import LLMMetrics
        LLMMetrics.record_call(model="electsim-fast", task_type="chat")

    def test_record_quality_no_crash(self):
        from observability.metrics import LLMMetrics
        LLMMetrics.record_quality(model="electsim-fast", eval_type="coherence", score=0.85)

    def test_record_quality_boundary_scores(self):
        from observability.metrics import LLMMetrics
        LLMMetrics.record_quality(model="electsim-fast", eval_type="factuality", score=0.0)
        LLMMetrics.record_quality(model="electsim-fast", eval_type="factuality", score=1.0)

    def test_counters_exist(self):
        from observability.metrics import LLMMetrics
        assert LLMMetrics.requests is not None
        assert LLMMetrics.tokens_in is not None
        assert LLMMetrics.tokens_out is not None
        assert LLMMetrics.errors is not None

    def test_histograms_exist(self):
        from observability.metrics import LLMMetrics
        assert LLMMetrics.latency is not None
        assert LLMMetrics.quality_score is not None


# ---------------------------------------------------------------------------
# APIMetrics
# ---------------------------------------------------------------------------

class TestAPIMetrics:
    def test_record_request_200(self):
        from observability.metrics import APIMetrics
        APIMetrics.record_request(
            route="/api/v1/briefings",
            method="GET",
            status_code=200,
            latency_ms=45.0,
            org_id="org-abc",
        )

    def test_record_request_500(self):
        from observability.metrics import APIMetrics
        APIMetrics.record_request(
            route="/api/v1/alerts",
            method="POST",
            status_code=500,
            latency_ms=200.0,
        )

    def test_record_request_default_org(self):
        from observability.metrics import APIMetrics
        APIMetrics.record_request(
            route="/health",
            method="GET",
            status_code=200,
            latency_ms=1.0,
        )


# ---------------------------------------------------------------------------
# BusinessMetrics
# ---------------------------------------------------------------------------

class TestBusinessMetrics:
    def test_record_alert(self):
        from observability.metrics import BusinessMetrics
        BusinessMetrics.record_alert(level="critical", product_code="war_room_electoral_spain")

    def test_record_briefing(self):
        from observability.metrics import BusinessMetrics
        BusinessMetrics.record_briefing(product_code="regulatory_radar_spain", client_id="org-1")

    def test_module_activations_counter_exists(self):
        from observability.metrics import BusinessMetrics
        assert BusinessMetrics.module_activations is not None


# ---------------------------------------------------------------------------
# measure_ms
# ---------------------------------------------------------------------------

class TestMeasureMs:
    def test_elapsed_greater_than_zero(self):
        from observability.metrics import measure_ms
        with measure_ms() as t:
            time.sleep(0.01)
        assert t.elapsed_ms > 0

    def test_elapsed_type_float(self):
        from observability.metrics import measure_ms
        with measure_ms() as t:
            pass
        assert isinstance(t.elapsed_ms, float)

    def test_elapsed_approximately_correct(self):
        from observability.metrics import measure_ms
        with measure_ms() as t:
            time.sleep(0.05)
        assert 20.0 < t.elapsed_ms < 200.0  # 50ms ± tolerancia amplia

    def test_elapsed_set_even_on_exception(self):
        from observability.metrics import measure_ms
        try:
            with measure_ms() as t:
                time.sleep(0.01)
                raise RuntimeError("boom")
        except RuntimeError:
            pass
        assert t.elapsed_ms > 0

    def test_nested_timers_independent(self):
        from observability.metrics import measure_ms
        with measure_ms() as outer:
            with measure_ms() as inner:
                time.sleep(0.02)
        assert inner.elapsed_ms < outer.elapsed_ms + 50
