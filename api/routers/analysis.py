"""
Analysis Hub API router (Sprint 2).
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Query

router = APIRouter(tags=["analysis"])


@router.get("/api/analysis/hub")
async def analysis_hub(
    period: str = Query(default="24h"),
    workspace_id: str = Query(default="default"),
):
    try:
        from services.analysis.analysis_hub import build_analysis_hub
        result = build_analysis_hub(period=period, workspace_id=workspace_id)
        return result.model_dump(mode="json")
    except Exception as exc:
        return {
            "mode": "error",
            "meta": {"mode": "error", "source": "analysis_hub", "message": str(exc)},
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "period": period,
            "executive_summary": "Error al generar análisis.",
            "top_signals": [],
            "changed_24h": [],
            "risks": [],
            "opportunities": [],
            "source_health_summary": {},
            "recommended_next_actions": [],
        }


@router.get("/api/analysis/signals")
async def analysis_signals(
    domain: str | None = None,
    severity: str | None = None,
    period: str = Query(default="24h"),
    limit: int = Query(default=50, le=200),
):
    try:
        from services.analysis.analysis_hub import collect_cross_domain_signals
        signals = collect_cross_domain_signals(period=period)
        if domain:
            signals = [s for s in signals if s.domain == domain]
        if severity:
            signals = [s for s in signals if s.severity == severity]
        signals = signals[:limit]
        mode = "real" if any(s.mode == "real" for s in signals) else "fallback"
        return {
            "mode": mode,
            "meta": {"generated_at": datetime.now(timezone.utc).isoformat()},
            "items": [s.model_dump(mode="json") for s in signals],
            "total": len(signals),
        }
    except Exception as exc:
        return {"mode": "error", "error": str(exc), "items": []}


@router.post("/api/analysis/refresh")
async def analysis_refresh(body: dict):
    period = body.get("period", "24h")
    workspace_id = body.get("workspace_id", "default")
    try:
        from services.analysis.analysis_hub import build_analysis_hub
        result = build_analysis_hub(period=period, workspace_id=workspace_id)
        return result.model_dump(mode="json")
    except Exception as exc:
        return {"mode": "error", "error": str(exc)}
