"""
Tests para observability/otel.py (Bloque 7).
Verifica setup lazy, NoOp fallback, y factoria de tracers/meters.
"""
from __future__ import annotations

import os

import pytest


@pytest.fixture(autouse=True)
def _reset_otel():
    """Resetea el cache del SDK entre tests para aislar configuraciones."""
    from observability.otel import reset_for_testing
    reset_for_testing()
    yield
    reset_for_testing()


class TestOtelSetup:
    def test_get_tracer_returns_object(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import get_tracer, reset_for_testing
        reset_for_testing()
        tracer = get_tracer("test.module")
        assert tracer is not None

    def test_get_meter_returns_object(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import get_meter, reset_for_testing
        reset_for_testing()
        meter = get_meter("test.module")
        assert meter is not None

    def test_disabled_sdk_no_network(self, monkeypatch):
        """Con OTEL_SDK_DISABLED=true no deberia haber ningun intento de conexion."""
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import _setup_sdk, reset_for_testing
        reset_for_testing()
        result = _setup_sdk()
        assert result is False

    def test_tracer_can_start_span(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import get_tracer, reset_for_testing
        reset_for_testing()
        tracer = get_tracer("test.spans")
        # NoOp tracer acepta start_as_current_span sin crash
        with tracer.start_as_current_span("test_span") as span:
            assert span is not None

    def test_span_set_attribute_no_crash(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import get_tracer, reset_for_testing
        reset_for_testing()
        tracer = get_tracer("test.attrs")
        with tracer.start_as_current_span("test_span") as span:
            # NoOp span acepta set_attribute sin crash
            span.set_attribute("llm.model", "electsim-fast")
            span.set_attribute("llm.latency_ms", 350.0)

    def test_meter_can_create_counter(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import get_meter, reset_for_testing
        reset_for_testing()
        meter = get_meter("test.counters")
        counter = meter.create_counter("test_counter", unit="items")
        assert counter is not None

    def test_meter_counter_add_no_crash(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import get_meter, reset_for_testing
        reset_for_testing()
        meter = get_meter("test.counters2")
        counter = meter.create_counter("test_add_counter")
        counter.add(1, {"label": "value"})

    def test_meter_histogram_record_no_crash(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import get_meter, reset_for_testing
        reset_for_testing()
        meter = get_meter("test.histograms")
        hist = meter.create_histogram("test_histogram", unit="ms")
        hist.record(123.4, {"model": "fast"})

    def test_reset_for_testing_clears_cache(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import _setup_sdk, reset_for_testing
        reset_for_testing()
        _setup_sdk()
        info = _setup_sdk.cache_info()
        assert info.currsize == 1
        reset_for_testing()
        info2 = _setup_sdk.cache_info()
        assert info2.currsize == 0

    def test_multiple_tracers_independent_names(self, monkeypatch):
        monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
        from observability.otel import get_tracer, reset_for_testing
        reset_for_testing()
        t1 = get_tracer("mod.a")
        t2 = get_tracer("mod.b")
        # Objetos distintos (o al menos no crashean)
        assert t1 is not None
        assert t2 is not None
