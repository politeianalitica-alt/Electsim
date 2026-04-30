"""
Inicializacion de OpenTelemetry para ElectSim (Bloque 7).

Expone:
  get_tracer(name)  — devuelve un Tracer OTel para el modulo indicado
  get_meter(name)   — devuelve un Meter OTel para metricas OTLP

Configuracion por variables de entorno:
  OTEL_EXPORTER_OTLP_ENDPOINT  (default: http://otel-collector:4317)
  OTEL_SERVICE_NAME            (default: electsim)
  OTEL_SDK_DISABLED            (default: false)  — poner "true" en tests unitarios

El setup es lazy: la primera llamada a get_tracer/get_meter inicializa el SDK.
Las llamadas siguientes son baratas (cache del proveedor global).
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)

_SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "electsim")
_OTLP_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")


# ---------------------------------------------------------------------------
# Setup (llamado una sola vez)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _setup_sdk() -> bool:
    """
    Configura TracerProvider y MeterProvider globales.
    Retorna True si el SDK quedo activo, False si se usa NoOp.

    OTEL_SDK_DISABLED se lee aqui (no en el modulo) para que monkeypatch
    funcione en tests que llaman reset_for_testing() antes de invocar setup.
    """
    disabled = os.getenv("OTEL_SDK_DISABLED", "false").strip().lower() == "true"
    if disabled:
        logger.debug("OTEL_SDK_DISABLED=true — usando NoOp providers")
        return False

    try:
        from opentelemetry import trace, metrics as otel_metrics
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME

        resource = Resource.create({SERVICE_NAME: _SERVICE_NAME})

        # --- Tracer ---
        tracer_provider = TracerProvider(resource=resource)
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            exporter = OTLPSpanExporter(endpoint=_OTLP_ENDPOINT, insecure=True)
            tracer_provider.add_span_processor(BatchSpanProcessor(exporter))
        except Exception as exc:
            logger.warning("OTLP trace exporter no disponible (%s) — usando NoOp span export", exc)
        trace.set_tracer_provider(tracer_provider)

        # --- Meter ---
        try:
            from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
            reader = PeriodicExportingMetricReader(
                OTLPMetricExporter(endpoint=_OTLP_ENDPOINT, insecure=True),
                export_interval_millis=15_000,
            )
            meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
        except Exception:
            meter_provider = MeterProvider(resource=resource)
        otel_metrics.set_meter_provider(meter_provider)

        logger.info("OpenTelemetry SDK activo (service=%s endpoint=%s)", _SERVICE_NAME, _OTLP_ENDPOINT)
        return True

    except ImportError as exc:
        logger.warning("opentelemetry-sdk no disponible (%s) — observabilidad desactivada", exc)
        return False


# ---------------------------------------------------------------------------
# Factoria publica
# ---------------------------------------------------------------------------

def get_tracer(name: str):
    """
    Retorna un Tracer OTel para el modulo indicado.
    Si el SDK no esta disponible retorna el NoOp tracer global.
    """
    _setup_sdk()
    from opentelemetry import trace
    return trace.get_tracer(name, instrumenting_library_version="0.1.0")


def get_meter(name: str):
    """
    Retorna un Meter OTel para el modulo indicado.
    Si el SDK no esta disponible retorna el NoOp meter global.
    """
    _setup_sdk()
    from opentelemetry import metrics as otel_metrics
    return otel_metrics.get_meter(name, version="0.1.0")


def reset_for_testing() -> None:
    """Invalida el cache de setup (util en tests para rearmar con distintas configs)."""
    _setup_sdk.cache_clear()
