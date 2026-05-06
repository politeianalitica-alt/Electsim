# api/routers/legislative.py
from __future__ import annotations
import uuid
from datetime import date

from fastapi import APIRouter, Query, HTTPException

from api.schemas.legislative import (
    BoeResponse, InitiativesResponse, LegislativeKpis,
    BoeItem, Initiative,
    LegislativeOverviewResponse, LegislativeItemsResponse,
    LegislativeItemDetail, LegislativeAnalysisRequest,
    LegislativeAnalysisResponse, SectorImpact,
    AlertRuleRequest, AlertRuleResponse,
    CalendarItem, LegislativeHeatmapCell,
)
from services.legislative.legislative_service import (
    get_overview, get_items, get_item_detail,
    _fetch_boe, _fetch_calendar,
)
from services.legislative.legislative_fixtures import (
    DEMO_BOE, DEMO_CALENDAR, DEMO_HEATMAP, DEMO_KPIS, DEMO_ITEMS,
    get_demo_overview, get_demo_items,
)

router = APIRouter(prefix="/api/legislative", tags=["legislative"])


# ── Legacy endpoints (kept for backwards compatibility) ──────────────────────

@router.get("/boe", response_model=BoeResponse)
def get_boe(limit: int = Query(10, ge=1, le=50)) -> BoeResponse:
    try:
        from etl.institucional.boe_rss import fetch_boe_items  # type: ignore
        raw = fetch_boe_items(limit=limit)
        items = [
            BoeItem(
                boe_no=r.get("boe_no"),
                title=r.get("titulo", ""),
                section=r.get("seccion", ""),
                department=r.get("departamento", ""),
                date=r.get("fecha", date.today().isoformat()),
                url=r.get("url_html"),
                type=r.get("tipo", ""),
                relevance=r.get("relevancia", "media"),
            )
            for r in raw if r.get("titulo")
        ]
        if not items:
            return BoeResponse(items=DEMO_BOE[:limit], date=date.today().isoformat(), mode="fallback", total=len(DEMO_BOE))
        return BoeResponse(items=items[:limit], date=date.today().isoformat(), mode="real", total=len(items))
    except Exception:
        return BoeResponse(items=DEMO_BOE[:limit], date=date.today().isoformat(), mode="fallback", total=len(DEMO_BOE))


@router.get("/initiatives", response_model=InitiativesResponse)
def get_initiatives(limit: int = Query(20, ge=1, le=100)) -> InitiativesResponse:
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        all_items: list[dict] = []
        for tipo in ("proposicion-ley", "proyecto-ley"):
            all_items.extend(fetch_iniciativas(tipo, n=limit))
        if not all_items:
            return _demo_initiatives()
        items = [
            Initiative(
                id=str(r.get("id", i)),
                title=r.get("titulo", r.get("title", "Iniciativa sin título")),
                type=r.get("tipo", r.get("initiative_type", "")),
                proponent=r.get("proponent_party", r.get("proponente", "")),
                status=r.get("status", "Pendiente"),
                submitted_at=str(r.get("submitted_at", r.get("fecha", ""))),
                urgency=("high" if r.get("urgencia", 0) >= 4 else "medium" if r.get("urgencia", 0) >= 2 else "low"),
            )
            for i, r in enumerate(all_items[:limit])
        ]
        active = len([x for x in items if x.status not in ("Aprobada", "Rechazada", "Retirada")])
        critical = len([x for x in items if x.urgency == "high"])
        return InitiativesResponse(items=items, mode="real", total=len(items), active=active, critical=critical)
    except Exception:
        return _demo_initiatives()


@router.get("/kpis", response_model=LegislativeKpis)
def get_legislative_kpis() -> LegislativeKpis:
    try:
        from etl.institucional.congreso_iniciativas import fetch_iniciativas  # type: ignore
        items = fetch_iniciativas("proposicion-ley", n=100) + fetch_iniciativas("proyecto-ley", n=100)
        if not items:
            return DEMO_KPIS
        active = len([x for x in items if x.get("status") not in ("Aprobada", "Rechazada", "Retirada")])
        critical = len([x for x in items if x.get("urgencia", 0) >= 4])
        return LegislativeKpis(
            active_initiatives=active,
            approved_this_month=len([x for x in items if x.get("status") == "Aprobada"]),
            critical_tramitation=critical,
            upcoming_votes=0,
            mode="real",
        )
    except Exception:
        return DEMO_KPIS


# ── New endpoints ─────────────────────────────────────────────────────────────

@router.get("/overview", response_model=LegislativeOverviewResponse)
def get_legislative_overview() -> LegislativeOverviewResponse:
    """Complete dashboard overview: KPIs + critical items + calendar + BOE + heatmap."""
    try:
        return get_overview()
    except Exception:
        return get_demo_overview()


@router.get("/items", response_model=LegislativeItemsResponse)
def list_legislative_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    urgency: str | None = Query(None),
    sector: str | None = Query(None),
    jurisdiction: str | None = Query(None),
    search: str | None = Query(None),
) -> LegislativeItemsResponse:
    """Paginated list of legislative items with optional filtering."""
    try:
        return get_items(
            page=page,
            page_size=page_size,
            urgency=urgency,
            sector=sector,
            jurisdiction=jurisdiction,
            search=search,
        )
    except Exception:
        return get_demo_items(page, page_size)


@router.get("/items/{item_id}", response_model=LegislativeItemDetail)
def get_item(item_id: str) -> LegislativeItemDetail:
    """Full detail for a single legislative item: timeline, sector impacts, actor positions."""
    try:
        detail = get_item_detail(item_id)
        if detail is None:
            raise HTTPException(status_code=404, detail=f"Legislative item {item_id!r} not found")
        return detail
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error fetching item detail")


@router.get("/calendar", response_model=list[CalendarItem])
def get_calendar(days: int = Query(7, ge=1, le=30)) -> list[CalendarItem]:
    """Parliamentary calendar for next N days."""
    try:
        cal = _fetch_calendar()
        return cal[:days]
    except Exception:
        return DEMO_CALENDAR[:days]


@router.get("/heatmap", response_model=list[LegislativeHeatmapCell])
def get_heatmap() -> list[LegislativeHeatmapCell]:
    """Sector x urgency heatmap of legislative activity."""
    try:
        return DEMO_HEATMAP
    except Exception:
        return DEMO_HEATMAP


@router.post("/analyze", response_model=LegislativeAnalysisResponse)
def analyze_item(req: LegislativeAnalysisRequest) -> LegislativeAnalysisResponse:
    """AI-powered legislative analysis for an item or a free-text query."""
    try:
        from agents.tools.document_tools import run_legislative_analysis  # type: ignore
        result = run_legislative_analysis(req.query, req.item_id, req.sector)
        return LegislativeAnalysisResponse(
            item_id=req.item_id,
            query=req.query,
            answer=result.get("answer", "Análisis no disponible"),
            risk_level=result.get("risk_level", "medium"),
            confidence=result.get("confidence", 0.7),
            model_used=result.get("model", "llm"),
            mode="real",
        )
    except Exception:
        sector_label = req.sector or "general"
        return LegislativeAnalysisResponse(
            item_id=req.item_id,
            query=req.query,
            answer=(
                f"**Análisis legislativo (modo demo)**\n\n"
                f"La consulta '{req.query}' afecta principalmente al sector {sector_label}. "
                f"Se identifican riesgos regulatorios de nivel ALTO para empresas cotizadas. "
                f"Se recomienda monitorizar las enmiendas en comisión y la posición del PP "
                f"como factor determinante del resultado final."
            ),
            sector_impacts=[
                SectorImpact(
                    sector=req.sector or "general",
                    sector_label=sector_label.replace("_", " ").title(),
                    impact_level="alto",
                    impact_score=72,
                    summary=f"Impacto regulatorio significativo en {sector_label}",
                )
            ],
            risk_level="high",
            confidence=0.6,
            model_used="demo",
            mode="demo",
        )


@router.post("/alert-rule", response_model=AlertRuleResponse)
def create_alert_rule(req: AlertRuleRequest) -> AlertRuleResponse:
    """Register a legislative alert rule (demo — no persistence yet)."""
    return AlertRuleResponse(
        id=str(uuid.uuid4()),
        name=req.name,
        active=True,
        mode="demo",
    )


# ── Private demo helpers ─────────────────────────────────────────────────────

def _demo_initiatives() -> InitiativesResponse:
    items = [
        Initiative(id="1", title="Ley de Vivienda 2026 (reforma)", type="Proyecto de Ley", proponent="Gobierno", status="Pleno", urgency="high"),
        Initiative(id="2", title="Reforma fiscal SICAV/SOCIMI", type="Proyecto de Ley", proponent="Hacienda", status="Enmiendas", urgency="high"),
        Initiative(id="3", title="Ley Memoria Democrática (modificación)", type="Proposición de Ley", proponent="PSOE-Sumar", status="Enmiendas", urgency="medium"),
        Initiative(id="4", title="Real Decreto-ley fondos UE 2026", type="Real Decreto-ley", proponent="Moncloa", status="Convalidación", urgency="high"),
        Initiative(id="5", title="Ley audiovisual (RTVE financiación)", type="Proyecto de Ley", proponent="Cultura", status="Ponencia", urgency="medium"),
        Initiative(id="6", title="Reforma reglamento Congreso", type="Proposición no de Ley", proponent="Mesa", status="Debate", urgency="low"),
    ]
    return InitiativesResponse(items=items, mode="fallback", total=6, active=6, critical=3)
