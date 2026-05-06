"""Electoral Intelligence endpoints — TAB 5."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Query

from api.schemas.electoral import (
    ElectoralOverviewResponse,
    SwingSimulateRequest,
    SwingSimResult,
    ElectoralBriefingRequest,
    ElectoralBriefingResponse,
    LegacyCoalitionOverview,
)

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/electoral", tags=["electoral"])


# ── Overview ──────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=ElectoralOverviewResponse)
def get_electoral_overview() -> ElectoralOverviewResponse:
    try:
        from services.electoral.electoral_service import get_overview
        return get_overview()
    except Exception as exc:
        log.warning("electoral overview error, returning demo: %s", exc)
        from services.electoral.electoral_fixtures import get_demo_overview
        return get_demo_overview()


# ── Parties ───────────────────────────────────────────────────────────────────

@router.get("/parties")
def get_electoral_parties() -> dict:
    try:
        from services.electoral.electoral_service import get_overview
        ov = get_overview()
        return {
            "parties": [p.model_dump() for p in ov.parties],
            "total_seats": ov.total_seats,
            "majority_threshold": ov.majority_threshold,
            "mode": ov.mode,
        }
    except Exception as exc:
        log.warning("electoral parties error, returning demo: %s", exc)
        from services.electoral.electoral_fixtures import get_demo_overview
        ov = get_demo_overview()
        return {
            "parties": [p.model_dump() for p in ov.parties],
            "total_seats": ov.total_seats,
            "majority_threshold": ov.majority_threshold,
            "mode": ov.mode,
        }


# ── Coalitions ────────────────────────────────────────────────────────────────

@router.get("/coalitions")
def get_electoral_coalitions() -> dict:
    try:
        from services.electoral.electoral_service import get_overview
        ov = get_overview()
        return {"coalitions": [c.model_dump() for c in ov.coalitions], "mode": ov.mode}
    except Exception as exc:
        log.warning("electoral coalitions error, returning demo: %s", exc)
        from services.electoral.electoral_fixtures import get_demo_overview
        ov = get_demo_overview()
        return {"coalitions": [c.model_dump() for c in ov.coalitions], "mode": ov.mode}


# ── Kingmakers ────────────────────────────────────────────────────────────────

@router.get("/kingmakers")
def get_electoral_kingmakers() -> dict:
    try:
        from services.electoral.electoral_service import get_overview
        ov = get_overview()
        return {"kingmakers": [k.model_dump() for k in ov.kingmakers], "mode": ov.mode}
    except Exception as exc:
        log.warning("electoral kingmakers error, returning demo: %s", exc)
        from services.electoral.electoral_fixtures import get_demo_overview
        ov = get_demo_overview()
        return {"kingmakers": [k.model_dump() for k in ov.kingmakers], "mode": ov.mode}


# ── Voting patterns ───────────────────────────────────────────────────────────

@router.get("/voting-patterns")
def get_voting_patterns(
    category: Optional[str] = Query(default=None, description="Filter by category (e.g. 'fiscal', 'social')")
) -> dict:
    try:
        from services.electoral.electoral_service import get_overview
        ov = get_overview()
        records = ov.voting_records
        if category:
            records = [r for r in records if r.category == category]
        return {"voting_records": [r.model_dump() for r in records], "mode": ov.mode}
    except Exception as exc:
        log.warning("electoral voting-patterns error, returning demo: %s", exc)
        from services.electoral.electoral_fixtures import get_demo_overview
        ov = get_demo_overview()
        records = ov.voting_records
        if category:
            records = [r for r in records if r.category == category]
        return {"voting_records": [r.model_dump() for r in records], "mode": ov.mode}


# ── Hemicycle ─────────────────────────────────────────────────────────────────

@router.get("/hemicycle")
def get_hemicycle() -> dict:
    try:
        from services.electoral.electoral_service import get_overview
        from services.electoral.electoral_fixtures import build_hemicycle
        ov = get_overview()
        seats = build_hemicycle(ov.parties, total_seats=ov.total_seats)
        return {
            "seats": [s.model_dump() for s in seats],
            "total_seats": ov.total_seats,
            "mode": ov.mode,
        }
    except Exception as exc:
        log.warning("electoral hemicycle error, returning demo: %s", exc)
        from services.electoral.electoral_fixtures import get_demo_overview, build_hemicycle
        ov = get_demo_overview()
        seats = build_hemicycle(ov.parties, total_seats=ov.total_seats)
        return {
            "seats": [s.model_dump() for s in seats],
            "total_seats": ov.total_seats,
            "mode": ov.mode,
        }


# ── KPIs ──────────────────────────────────────────────────────────────────────

@router.get("/kpis")
def get_electoral_kpis() -> dict:
    try:
        from services.electoral.electoral_service import get_overview
        ov = get_overview()
        return {"kpis": [k.model_dump() for k in ov.kpis], "mode": ov.mode}
    except Exception as exc:
        log.warning("electoral kpis error, returning demo: %s", exc)
        from services.electoral.electoral_fixtures import get_demo_overview
        ov = get_demo_overview()
        return {"kpis": [k.model_dump() for k in ov.kpis], "mode": ov.mode}


# ── Swing simulation ──────────────────────────────────────────────────────────

@router.post("/simulate", response_model=SwingSimResult)
def simulate_electoral_swing(req: SwingSimulateRequest) -> SwingSimResult:
    try:
        from services.electoral.electoral_service import simulate_swing
        return simulate_swing(req)
    except Exception as exc:
        log.warning("electoral simulate error, returning fallback: %s", exc)
        try:
            from services.electoral.electoral_fixtures import DEMO_PARTIES
            from api.schemas.electoral import SwingSimResult
            return SwingSimResult(
                parties=DEMO_PARTIES,
                seat_changes={},
                coalition_impact=[f"Simulación no disponible (modo demo): {exc}"],
            )
        except Exception as inner_exc:
            log.error("electoral simulate fallback also failed: %s", inner_exc)
            return SwingSimResult(
                parties=[],
                seat_changes={},
                coalition_impact=["Simulación no disponible temporalmente"],
            )


# ── AI Briefing ───────────────────────────────────────────────────────────────

@router.post("/briefing", response_model=ElectoralBriefingResponse)
def get_electoral_briefing(req: ElectoralBriefingRequest) -> ElectoralBriefingResponse:
    try:
        from services.electoral.electoral_service import generate_briefing
        return generate_briefing(req)
    except Exception as exc:
        log.warning("electoral briefing error: %s", exc)
        # generate_briefing already handles its own fallback internally;
        # this outer handler catches import or unexpected errors
        return ElectoralBriefingResponse(
            briefing="## Briefing no disponible\n\nEl servicio de briefing electoral no está disponible temporalmente.",
            key_points=[],
            risk_indicators=[],
            mode="demo",
        )


# ── Legacy compatibility ───────────────────────────────────────────────────────

@router.get("/legacy-coalition", response_model=LegacyCoalitionOverview)
def get_legacy_coalition_overview() -> LegacyCoalitionOverview:
    """Backward-compatible endpoint mapping the rich overview to the v1/v2 format."""
    try:
        from services.electoral.electoral_service import get_overview
        ov = get_overview()
        return LegacyCoalitionOverview(
            parties=[
                {
                    "code": p.code,
                    "name": p.name,
                    "seats": p.seats,
                    "pct_vote": p.pct_vote,
                    "color": p.color,
                    "is_governing": p.is_governing,
                }
                for p in ov.parties
            ],
            coalitions=[
                {
                    "id": c.id,
                    "name": c.name,
                    "members": c.members,
                    "total_seats": c.total_seats,
                    "has_majority": c.has_majority,
                    "probability": c.probability,
                }
                for c in ov.coalitions
            ],
            election_date=ov.election_date,
            total_seats=ov.total_seats,
            majority_threshold=ov.majority_threshold,
            mode=ov.mode,
        )
    except Exception as exc:
        log.warning("electoral legacy-coalition error, returning demo: %s", exc)
        from services.electoral.electoral_fixtures import get_demo_overview
        ov = get_demo_overview()
        return LegacyCoalitionOverview(
            parties=[
                {
                    "code": p.code,
                    "name": p.name,
                    "seats": p.seats,
                    "pct_vote": p.pct_vote,
                    "color": p.color,
                    "is_governing": p.is_governing,
                }
                for p in ov.parties
            ],
            coalitions=[
                {
                    "id": c.id,
                    "name": c.name,
                    "members": c.members,
                    "total_seats": c.total_seats,
                    "has_majority": c.has_majority,
                    "probability": c.probability,
                }
                for c in ov.coalitions
            ],
            election_date=ov.election_date,
            total_seats=ov.total_seats,
            majority_threshold=ov.majority_threshold,
            mode=ov.mode,
        )
