from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse, PlainTextResponse

from api.observability import build_health_payload, collect_operational_summary, render_prometheus_metrics

router = APIRouter()


@router.get("/health/live")
def health_live() -> dict[str, str]:
    return {"status": "ok", "service": "electsim-api"}


@router.get("/health/ready")
def health_ready() -> JSONResponse:
    summary = collect_operational_summary()
    payload = build_health_payload(summary)
    return JSONResponse(payload, status_code=200 if payload["status"] == "ok" else 503)


@router.get("/health")
def health() -> JSONResponse:
    summary = collect_operational_summary()
    payload = build_health_payload(summary)
    return JSONResponse(payload, status_code=200 if payload["status"] == "ok" else 503)


@router.get("/observability/summary")
def observability_summary() -> JSONResponse:
    summary = collect_operational_summary()
    status_code = 200 if summary.get("database", {}).get("ready") else 503
    return JSONResponse(summary, status_code=status_code)


@router.get("/metrics", response_class=PlainTextResponse)
def metrics() -> PlainTextResponse:
    summary = collect_operational_summary()
    content = render_prometheus_metrics(summary)
    return PlainTextResponse(content, media_type="text/plain; version=0.0.4; charset=utf-8")
