# api/routers/risk.py
"""Risk & Crisis Intelligence endpoints."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Query

from api.schemas.risk import (
    RiskOverviewResponse, RiskSignalsResponse,
    RiskAnalysisRequest, RiskAnalysisResponse,
    # Legacy compat
    RiskOverview,
)

router = APIRouter(prefix="/api/risk", tags=["risk"])


# ── Overview ─────────────────────────────────────────────────────
@router.get("/overview-v2", response_model=RiskOverviewResponse)
def get_risk_overview_v2() -> RiskOverviewResponse:
    from services.risk.risk_service import get_overview
    return get_overview()


# ── Dimensions ───────────────────────────────────────────────────
@router.get("/dimensions")
def get_risk_dimensions() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"dimensions": [d.model_dump() for d in ov.dimensions], "mode": ov.mode}


# ── Signals ──────────────────────────────────────────────────────
@router.get("/signals", response_model=RiskSignalsResponse)
def get_risk_signals(
    domain: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
) -> RiskSignalsResponse:
    from services.risk.risk_service import get_signals
    return get_signals(domain, severity, limit)


# ── Crisis ───────────────────────────────────────────────────────
@router.get("/crisis")
def get_crisis_signals() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"crisis_signals": [c.model_dump() for c in ov.crisis_signals], "mode": ov.mode}


# ── Early warnings ────────────────────────────────────────────────
@router.get("/early-warnings")
def get_early_warnings() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"early_warnings": [w.model_dump() for w in ov.early_warnings], "mode": ov.mode}


# ── Sparkline ────────────────────────────────────────────────────
@router.get("/spark")
def get_risk_spark() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"spark": ov.spark, "global_score": ov.global_score, "trend_delta": ov.trend_delta, "mode": ov.mode}


# ── Scenarios ────────────────────────────────────────────────────
@router.get("/scenarios")
def get_risk_scenarios() -> dict:
    from services.risk.risk_fixtures import DEMO_SCENARIOS
    return {"scenarios": [s.model_dump() for s in DEMO_SCENARIOS], "mode": "demo"}


# ── Timeline ─────────────────────────────────────────────────────
@router.get("/timeline")
def get_risk_timeline() -> dict:
    from services.risk.risk_fixtures import DEMO_TIMELINE
    return {"timeline": [t.model_dump() for t in DEMO_TIMELINE], "mode": "demo"}


# ── Heatmap ──────────────────────────────────────────────────────
@router.get("/heatmap")
def get_risk_heatmap() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    heatmap = []
    for dim in ov.dimensions:
        heatmap.append({"domain": dim.domain, "label": dim.label, "score": dim.score, "severity": dim.severity, "trend": dim.trend})
    return {"heatmap": heatmap, "mode": ov.mode}


# ── KPIs ─────────────────────────────────────────────────────────
@router.get("/kpis")
def get_risk_kpis() -> dict:
    from services.risk.risk_service import get_overview
    ov = get_overview()
    return {"kpis": [k.model_dump() for k in ov.kpis], "global_score": ov.global_score, "mode": ov.mode}


# ── Analysis ─────────────────────────────────────────────────────
@router.post("/analyze", response_model=RiskAnalysisResponse)
def analyze_risk(req: RiskAnalysisRequest) -> RiskAnalysisResponse:
    from services.risk.risk_service import analyze_risk as _analyze
    return _analyze(req)


# ── Snapshot ─────────────────────────────────────────────────────
@router.post("/snapshot")
def save_risk_snapshot() -> dict:
    import json, os, uuid
    from datetime import datetime
    from services.risk.risk_service import get_overview
    ov = get_overview()
    snapshot_id = str(uuid.uuid4())[:8]
    out_dir = "data/outputs/risk_snapshots"
    os.makedirs(out_dir, exist_ok=True)
    path = f"{out_dir}/{snapshot_id}.json"
    try:
        with open(path, "w") as f:
            json.dump({"snapshot_id": snapshot_id, "timestamp": datetime.utcnow().isoformat(), "global_score": ov.global_score, "mode": ov.mode}, f)
    except Exception:
        pass
    return {"snapshot_id": snapshot_id, "timestamp": datetime.utcnow().isoformat(), "global_score": ov.global_score, "mode": ov.mode}


# ── Legacy compat ────────────────────────────────────────────────
@router.get("/overview", response_model=RiskOverview)
def get_risk_overview_legacy() -> RiskOverview:
    """Legacy endpoint - kept for backward compatibility."""
    from services.risk.risk_service import get_overview
    from api.schemas.risk import RiskKpiItemLegacy, RiskSignalItemLegacy
    ov = get_overview()
    return RiskOverview(
        global_score=ov.global_score,
        level=ov.level,
        kpis=[RiskKpiItemLegacy(label=k.label, value=k.value, color=k.color) for k in ov.kpis],
        signals=[RiskSignalItemLegacy(title=s.title, description=s.description, probability=s.probability, impact=s.severity) for s in ov.top_signals],
        spark=ov.spark,
        trend_delta=ov.trend_delta,
        mode=ov.mode,
    )
