"""
Structured JSON logging para ElectSim (Bloque 7).

Emite logs en formato JSON con campos estandar:
  timestamp, level, message, component,
  trace_id, span_id (si OTel activo),
  org_id, workspace_id (si disponibles)

Sin PII: prompts y respuestas se excluyen por defecto.
Solo el 5-10% de traces LLM se marcan para eval (sample_for_eval).

Uso:
    from observability.logging import get_logger

    log = get_logger("etl.pipeline")
    log.info("pipeline_step_ok", step="dedupe", source_id="boe", items=42)
    log.warning("pipeline_step_failed", step="embedding", error="timeout")
"""
from __future__ import annotations

import json
import logging
import os
import random
import sys
import time
from typing import Any, Dict, Optional


# ---------------------------------------------------------------------------
# Formatter JSON
# ---------------------------------------------------------------------------

class JSONFormatter(logging.Formatter):
    """
    Formateador que emite cada record como una linea JSON.
    Incluye trace_id/span_id desde el contexto OTel activo si esta disponible.
    """

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "message": str(record.msg),   # evita %-formatting sobre un dict de kwargs
            "component": record.name,
            "logger": record.name,
        }

        # Inyectar trace/span si OTel esta activo
        try:
            from opentelemetry import trace as otel_trace
            span = otel_trace.get_current_span()
            ctx = span.get_span_context()
            if ctx and ctx.is_valid:
                payload["trace_id"] = format(ctx.trace_id, "032x")
                payload["span_id"] = format(ctx.span_id, "016x")
        except Exception:
            pass

        # Campos extra — dos fuentes posibles:
        # 1. makeRecord(extra=...) -> campos en record.__dict__ (via StructuredLogger)
        # 2. record.args como dict (compatibilidad con LogRecord creado manualmente)
        _std = {
            "name", "msg", "args", "created", "filename", "funcName", "levelname",
            "levelno", "lineno", "module", "msecs", "pathname", "process",
            "processName", "relativeCreated", "thread", "threadName", "exc_info",
            "exc_text", "stack_info", "taskName", "message", "asctime",
        }
        # Fuente 1: extra en __dict__
        for k, v in record.__dict__.items():
            if k not in _std and not k.startswith("_") and k not in payload:
                payload[k] = v
        # Fuente 2: args dict (compatibilidad)
        if record.args and isinstance(record.args, dict):
            for k, v in record.args.items():
                if k not in payload:
                    payload[k] = v

        # Excepcion
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------
# Configuracion global
# ---------------------------------------------------------------------------

_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
_LOG_FORMAT = os.getenv("LOG_FORMAT", "json").lower()  # "json" | "text"
_configured = False


def configure_logging(level: Optional[str] = None, fmt: Optional[str] = None) -> None:
    """
    Configura el logging global de la aplicacion.
    Llamar una vez al inicio (startup de FastAPI, Celery, ETL runner).
    """
    global _configured
    effective_level = level or _LOG_LEVEL
    effective_fmt = fmt or _LOG_FORMAT

    root = logging.getLogger()
    root.setLevel(effective_level)

    if root.handlers:
        root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(effective_level)

    if effective_fmt == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)s [%(name)s] %(message)s"
        ))

    root.addHandler(handler)
    _configured = True


# ---------------------------------------------------------------------------
# Logger con campos estructurados
# ---------------------------------------------------------------------------

class StructuredLogger:
    """
    Wrapper sobre logging.Logger que acepta kwargs como campos estructurados.

    Uso:
        log = get_logger("etl.pipeline")
        log.info("item_processed", source_id="boe", step="ner", items=3)
    """

    def __init__(self, name: str) -> None:
        self._logger = logging.getLogger(name)

    # Campos estandar de LogRecord — no se sobreescriben con extra
    _STANDARD_FIELDS = frozenset({
        "name", "msg", "args", "created", "filename", "funcName", "levelname",
        "levelno", "lineno", "module", "msecs", "pathname", "process",
        "processName", "relativeCreated", "thread", "threadName", "exc_info",
        "exc_text", "stack_info", "taskName", "message", "asctime",
    })

    def _emit(self, level: int, msg: str, **kwargs: Any) -> None:
        # Pasar kwargs como extra para evitar el problema de Mapping-check en
        # LogRecord.__init__ cuando args es un dict de 1 elemento (Python 3.11+).
        # JSONFormatter lee los campos extra directamente de record.__dict__.
        safe_extra = {
            k: v for k, v in kwargs.items()
            if k not in self._STANDARD_FIELDS
        }
        record = self._logger.makeRecord(
            self._logger.name, level, "(unknown)", 0, msg, None,
            None, extra=safe_extra if safe_extra else None,
        )
        self._logger.handle(record)

    def debug(self, msg: str, **kwargs: Any) -> None:
        if self._logger.isEnabledFor(logging.DEBUG):
            self._emit(logging.DEBUG, msg, **kwargs)

    def info(self, msg: str, **kwargs: Any) -> None:
        if self._logger.isEnabledFor(logging.INFO):
            self._emit(logging.INFO, msg, **kwargs)

    def warning(self, msg: str, **kwargs: Any) -> None:
        self._emit(logging.WARNING, msg, **kwargs)

    def error(self, msg: str, **kwargs: Any) -> None:
        self._emit(logging.ERROR, msg, **kwargs)

    def exception(self, msg: str, **kwargs: Any) -> None:
        kwargs["exc_info"] = True
        self._emit(logging.ERROR, msg, **kwargs)


def get_logger(name: str) -> StructuredLogger:
    """Retorna un StructuredLogger para el componente indicado."""
    return StructuredLogger(name)


# ---------------------------------------------------------------------------
# Sampling LLM para evals
# ---------------------------------------------------------------------------

_EVAL_SAMPLE_RATE = float(os.getenv("LLM_EVAL_SAMPLE_RATE", "0.05"))  # 5%


def should_sample_for_eval() -> bool:
    """
    Retorna True para el ~5% de traces LLM que deben evaluarse.
    Tasa configurable con LLM_EVAL_SAMPLE_RATE (0.0-1.0).
    """
    return random.random() < _EVAL_SAMPLE_RATE
