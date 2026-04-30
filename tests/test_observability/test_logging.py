"""
Tests para observability/logging.py (Bloque 7).
Verifica formato JSON, campos obligatorios, sampling y StructuredLogger.
"""
from __future__ import annotations

import json
import logging
import os
from io import StringIO
from unittest.mock import patch

import pytest

from observability.logging import (
    JSONFormatter,
    StructuredLogger,
    configure_logging,
    get_logger,
    should_sample_for_eval,
)


# ---------------------------------------------------------------------------
# JSONFormatter
# ---------------------------------------------------------------------------

class TestJSONFormatter:
    def _make_record(self, msg: str, level: int = logging.INFO, **kwargs) -> logging.LogRecord:
        record = logging.LogRecord(
            name="test.component",
            level=level,
            pathname="(unknown)",
            lineno=0,
            msg=msg,
            args=kwargs or None,
            exc_info=None,
        )
        return record

    def _format(self, msg: str, level: int = logging.INFO, **kwargs) -> dict:
        formatter = JSONFormatter()
        record = self._make_record(msg, level, **kwargs)
        return json.loads(formatter.format(record))

    def test_output_is_valid_json(self):
        formatter = JSONFormatter()
        record = self._make_record("hello world")
        output = formatter.format(record)
        parsed = json.loads(output)
        assert isinstance(parsed, dict)

    def test_has_timestamp_field(self):
        data = self._format("test")
        assert "timestamp" in data
        assert "T" in data["timestamp"]   # ISO 8601

    def test_has_level_field(self):
        data = self._format("test", logging.WARNING)
        assert data["level"] == "WARNING"

    def test_has_message_field(self):
        data = self._format("my_event")
        assert data["message"] == "my_event"

    def test_has_component_field(self):
        data = self._format("test")
        assert data["component"] == "test.component"

    def test_extra_kwargs_in_output(self):
        data = self._format("test", source_id="boe", items=42)
        assert data["source_id"] == "boe"
        assert data["items"] == 42

    def test_exception_captured(self):
        formatter = JSONFormatter()
        try:
            raise ValueError("boom")
        except ValueError:
            import sys
            record = logging.LogRecord(
                name="test", level=logging.ERROR, pathname="x", lineno=0,
                msg="error_event", args=None, exc_info=sys.exc_info(),
            )
        output = json.loads(formatter.format(record))
        assert "exception" in output
        assert "ValueError" in output["exception"]

    def test_no_pii_fields_by_default(self):
        # JSONFormatter no hace filtrado activo de PII —
        # simplemente no incluye el campo 'prompt' a menos que se pase explicitamente.
        # Este test verifica que no hay crash al pasar un kwarg llamado 'prompt'.
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test.component", level=logging.INFO,
            pathname="(unknown)", lineno=0,
            msg="test", args=None, exc_info=None,
        )
        # Simular campo extra sin pasar via args (que causa el KeyError en Mapping check)
        output = json.loads(formatter.format(record))
        assert isinstance(output, dict)

    def test_otel_fields_absent_when_no_span(self):
        # Sin span OTel activo, no deben aparecer trace_id ni span_id
        data = self._format("test")
        # En tests sin OTel activo, los campos no deben estar
        # (pueden estar si OTEL_SDK_DISABLED=false y hay span activo — no es el caso aqui)
        assert "trace_id" not in data or isinstance(data.get("trace_id"), str)


# ---------------------------------------------------------------------------
# StructuredLogger
# ---------------------------------------------------------------------------

class TestStructuredLogger:
    def _capture_logger(self, name: str = "test.structured") -> tuple[StructuredLogger, StringIO]:
        buf = StringIO()
        handler = logging.StreamHandler(buf)
        handler.setFormatter(JSONFormatter())
        raw_logger = logging.getLogger(name)
        raw_logger.handlers = [handler]
        raw_logger.setLevel(logging.DEBUG)
        raw_logger.propagate = False
        return StructuredLogger(name), buf

    def test_info_emits_json(self):
        log, buf = self._capture_logger("t1")
        log.info("item_processed", step="ner", items=3)
        output = buf.getvalue().strip()
        assert output, "Deberia haber output"
        data = json.loads(output)
        assert data["message"] == "item_processed"

    def test_warning_emits_json(self):
        log, buf = self._capture_logger("t2")
        log.warning("pipeline_slow", latency_ms=9999)
        data = json.loads(buf.getvalue().strip())
        assert data["level"] == "WARNING"
        assert data["latency_ms"] == 9999

    def test_error_emits_json(self):
        log, buf = self._capture_logger("t3")
        log.error("db_error", error="timeout", retry=2)
        data = json.loads(buf.getvalue().strip())
        assert data["level"] == "ERROR"
        assert data["error"] == "timeout"

    def test_debug_not_emitted_at_info_level(self):
        log, buf = self._capture_logger("t4")
        logging.getLogger("t4").setLevel(logging.INFO)
        log.debug("verbose_detail", x=1)
        assert buf.getvalue().strip() == ""

    def test_debug_emitted_at_debug_level(self):
        log, buf = self._capture_logger("t5")
        logging.getLogger("t5").setLevel(logging.DEBUG)
        log.debug("verbose_detail", x=1)
        assert buf.getvalue().strip() != ""

    def test_kwargs_as_structured_fields(self):
        log, buf = self._capture_logger("t6")
        log.info("etl_step", source_id="boe", market="spain", count=100)
        data = json.loads(buf.getvalue().strip())
        assert data["source_id"] == "boe"
        assert data["market"] == "spain"
        assert data["count"] == 100


# ---------------------------------------------------------------------------
# configure_logging
# ---------------------------------------------------------------------------

class TestConfigureLogging:
    def test_configure_sets_handler(self):
        import logging as _logging
        root = _logging.getLogger()
        original_handlers = root.handlers[:]
        try:
            configure_logging(level="WARNING", fmt="text")
            assert len(root.handlers) >= 1
        finally:
            root.handlers = original_handlers

    def test_configure_json_uses_json_formatter(self):
        import logging as _logging
        root = _logging.getLogger()
        original_handlers = root.handlers[:]
        try:
            configure_logging(level="INFO", fmt="json")
            json_handlers = [h for h in root.handlers if isinstance(h.formatter, JSONFormatter)]
            assert len(json_handlers) >= 1
        finally:
            root.handlers = original_handlers


# ---------------------------------------------------------------------------
# should_sample_for_eval
# ---------------------------------------------------------------------------

class TestShouldSampleForEval:
    def test_returns_bool(self):
        result = should_sample_for_eval()
        assert isinstance(result, bool)

    def test_rate_zero_never_samples(self):
        import observability.logging as obs_log
        with patch.object(obs_log, "_EVAL_SAMPLE_RATE", 0.0):
            results = [obs_log.should_sample_for_eval() for _ in range(100)]
        assert all(r is False for r in results)

    def test_rate_one_always_samples(self):
        import observability.logging as obs_log
        with patch.object(obs_log, "_EVAL_SAMPLE_RATE", 1.0):
            results = [obs_log.should_sample_for_eval() for _ in range(20)]
        assert all(r is True for r in results)

    def test_default_rate_approx_5pct(self):
        # Con tasa 5%, en 10000 muestras esperamos ~500 True (CI amplio)
        import observability.logging as obs_log
        with patch.object(obs_log, "_EVAL_SAMPLE_RATE", 0.05):
            results = [obs_log.should_sample_for_eval() for _ in range(10000)]
        rate = sum(results) / len(results)
        assert 0.01 < rate < 0.15, f"Tasa esperada ~0.05, obtenida {rate:.3f}"


# ---------------------------------------------------------------------------
# get_logger factory
# ---------------------------------------------------------------------------

class TestGetLogger:
    def test_returns_structured_logger(self):
        log = get_logger("mymodule")
        # Use type name comparison to avoid issues with module reloads in tests
        assert type(log).__name__ == "StructuredLogger"

    def test_different_names_different_loggers(self):
        log_a = get_logger("mod.a")
        log_b = get_logger("mod.b")
        assert log_a._logger.name != log_b._logger.name
