"""
Metricas de negocio y sistema para ElectSim (Bloque 7).

Usa el MeterProvider de OTel; si el SDK no esta disponible las llamadas
son no-op (el NoOp meter acepta las mismas llamadas sin hacer nada).

Convenciones de nombres:
  electsim.api.*       — peticiones HTTP, latencias
  electsim.etl.*       — items procesados, errores por fuente
  electsim.llm.*       — tokens, latencias, calidad de modelos
  electsim.alerts.*    — alertas generadas por nivel/producto
  electsim.briefings.* — briefings generados

Uso:
    from observability.metrics import ETLMetrics, LLMMetrics, APIMetrics

    ETLMetrics.items_processed.add(42, {"source_id": "boe", "market": "spain"})
    LLMMetrics.record_call(model="electsim-fast", tokens_in=120, tokens_out=80, latency_ms=450.0)
"""
from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Dict, Optional

from observability.otel import get_meter

_meter = get_meter("electsim.metrics")


# ---------------------------------------------------------------------------
# ETL
# ---------------------------------------------------------------------------

class ETLMetrics:
    items_processed = _meter.create_counter(
        "electsim.etl.items_processed",
        unit="items",
        description="Items procesados por fuente y paso de pipeline",
    )
    errors = _meter.create_counter(
        "electsim.etl.errors",
        unit="errors",
        description="Errores por fuente y paso de pipeline",
    )
    duplicates = _meter.create_counter(
        "electsim.etl.duplicates",
        unit="items",
        description="Items duplicados descartados por deduplicacion",
    )
    pipeline_duration = _meter.create_histogram(
        "electsim.etl.pipeline_duration_ms",
        unit="ms",
        description="Duracion del pipeline completo por item",
    )

    @classmethod
    def record_step(
        cls,
        *,
        source_id: str,
        step: str,
        success: bool,
        duration_ms: Optional[float] = None,
        market: str = "unknown",
    ) -> None:
        attrs = {"source_id": source_id, "step": step, "market": market}
        if success:
            cls.items_processed.add(1, attrs)
        else:
            cls.errors.add(1, attrs)
        if duration_ms is not None:
            cls.pipeline_duration.record(duration_ms, attrs)


# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------

class LLMMetrics:
    requests = _meter.create_counter(
        "electsim.llm.requests",
        unit="requests",
        description="Peticiones LLM por modelo y tipo de tarea",
    )
    tokens_in = _meter.create_counter(
        "electsim.llm.tokens_in",
        unit="tokens",
        description="Tokens de entrada consumidos",
    )
    tokens_out = _meter.create_counter(
        "electsim.llm.tokens_out",
        unit="tokens",
        description="Tokens de salida generados",
    )
    errors = _meter.create_counter(
        "electsim.llm.errors",
        unit="errors",
        description="Errores LLM por modelo y tipo de error",
    )
    latency = _meter.create_histogram(
        "electsim.llm.latency_ms",
        unit="ms",
        description="Latencia de llamadas LLM en ms",
    )
    quality_score = _meter.create_histogram(
        "electsim.llm.quality_score",
        unit="score",
        description="Score de calidad de outputs LLM (0-1) por tipo de eval",
    )

    @classmethod
    def record_call(
        cls,
        *,
        model: str,
        task_type: str = "unknown",
        tokens_in: int = 0,
        tokens_out: int = 0,
        latency_ms: float = 0.0,
        error: Optional[str] = None,
    ) -> None:
        attrs = {"model": model, "task_type": task_type}
        cls.requests.add(1, attrs)
        if tokens_in:
            cls.tokens_in.add(tokens_in, attrs)
        if tokens_out:
            cls.tokens_out.add(tokens_out, attrs)
        cls.latency.record(latency_ms, attrs)
        if error:
            cls.errors.add(1, {**attrs, "error_type": error})

    @classmethod
    def record_quality(cls, *, model: str, eval_type: str, score: float) -> None:
        cls.quality_score.record(score, {"model": model, "eval_type": eval_type})


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

class APIMetrics:
    requests = _meter.create_counter(
        "electsim.api.requests",
        unit="requests",
        description="Peticiones HTTP por ruta y status",
    )
    latency = _meter.create_histogram(
        "electsim.api.latency_ms",
        unit="ms",
        description="Latencia de requests API en ms",
    )

    @classmethod
    def record_request(
        cls,
        *,
        route: str,
        method: str,
        status_code: int,
        latency_ms: float,
        org_id: str = "unknown",
    ) -> None:
        attrs = {
            "route": route,
            "method": method,
            "status": str(status_code),
            "org_id": org_id,
        }
        cls.requests.add(1, attrs)
        cls.latency.record(latency_ms, attrs)


# ---------------------------------------------------------------------------
# Alertas y briefings (metricas de negocio)
# ---------------------------------------------------------------------------

class BusinessMetrics:
    alerts_triggered = _meter.create_counter(
        "electsim.alerts.triggered",
        unit="alerts",
        description="Alertas disparadas por nivel y producto",
    )
    briefings_generated = _meter.create_counter(
        "electsim.briefings.generated",
        unit="briefings",
        description="Briefings generados por producto",
    )
    module_activations = _meter.create_counter(
        "electsim.modules.activations",
        unit="activations",
        description="Activaciones de modulo por workspace",
    )

    @classmethod
    def record_alert(cls, *, level: str, product_code: str) -> None:
        cls.alerts_triggered.add(1, {"level": level, "product_code": product_code})

    @classmethod
    def record_briefing(cls, *, product_code: str, client_id: str) -> None:
        cls.briefings_generated.add(1, {"product_code": product_code})


# ---------------------------------------------------------------------------
# Context manager de medicion de tiempo
# ---------------------------------------------------------------------------

@contextmanager
def measure_ms():
    """
    Context manager que mide el tiempo transcurrido en ms.

    Uso:
        with measure_ms() as t:
            do_work()
        print(t.elapsed_ms)
    """
    class _Timer:
        elapsed_ms: float = 0.0

    timer = _Timer()
    start = time.perf_counter()
    try:
        yield timer
    finally:
        timer.elapsed_ms = (time.perf_counter() - start) * 1000.0
