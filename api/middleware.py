"""
Middleware de observabilidad para FastAPI (Bloque 7).

- RequestLoggingMiddleware : log JSON estructurado de cada request/response
- enrich_span_with_tenant  : enriquece el span OTel activo con org_id/workspace_id

Uso en main.py:
    from api.middleware import RequestLoggingMiddleware
    app.add_middleware(RequestLoggingMiddleware)
"""
from __future__ import annotations

import time
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from observability.logging import get_logger
from observability.metrics import APIMetrics

_log = get_logger("api.middleware")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware que:
    1. Mide latencia de cada HTTP request.
    2. Emite un log JSON estructurado con route, method, status_code, latency_ms.
    3. Registra metricas en APIMetrics.
    4. Enriquece el span OTel activo con atributos de tenant si estan presentes.
    """

    def __init__(self, app: ASGIApp, exclude_paths: tuple[str, ...] = ("/health", "/metrics")) -> None:
        super().__init__(app)
        self._exclude = exclude_paths

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in self._exclude:
            return await call_next(request)

        start = time.perf_counter()
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
        finally:
            latency_ms = (time.perf_counter() - start) * 1000.0
            route = request.url.path
            method = request.method

            # org_id del estado de la request (puesto por enforce_tenancy si disponible)
            org_id: str = getattr(request.state, "org_id", "unknown")

            # Registrar metrica
            APIMetrics.record_request(
                route=route,
                method=method,
                status_code=status_code,
                latency_ms=latency_ms,
                org_id=org_id,
            )

            # Log estructurado
            level = "warning" if status_code >= 400 else "info"
            getattr(_log, level)(
                "http_request",
                route=route,
                method=method,
                status_code=status_code,
                latency_ms=round(latency_ms, 2),
                org_id=org_id,
            )

            # Enriquecer span OTel activo
            _enrich_span(request, status_code, latency_ms)

        return response


def _enrich_span(request: Request, status_code: int, latency_ms: float) -> None:
    """Agrega atributos de tenant y HTTP al span OTel activo."""
    try:
        from opentelemetry import trace as otel_trace

        span = otel_trace.get_current_span()
        if not span.is_recording():
            return

        span.set_attribute("http.route", request.url.path)
        span.set_attribute("http.method", request.method)
        span.set_attribute("http.status_code", status_code)
        span.set_attribute("http.latency_ms", round(latency_ms, 2))

        org_id = getattr(request.state, "org_id", None)
        workspace_id = getattr(request.state, "workspace_id", None)
        if org_id:
            span.set_attribute("tenant.org_id", org_id)
        if workspace_id:
            span.set_attribute("tenant.workspace_id", workspace_id)
    except Exception:
        pass  # Observabilidad nunca debe romper el request


def enrich_span_with_tenant(org_id: str, workspace_id: str, user_id: str) -> None:
    """
    Enriquece el span OTel activo con datos de tenant.
    Llamar desde enforce_tenancy o endpoints que conocen el usuario.
    """
    try:
        from opentelemetry import trace as otel_trace

        span = otel_trace.get_current_span()
        if span.is_recording():
            span.set_attribute("tenant.org_id", org_id)
            span.set_attribute("tenant.workspace_id", workspace_id)
            span.set_attribute("tenant.user_id", user_id)
    except Exception:
        pass
